import { redactOfferHistory } from "./offer-history";
import prisma from "../../config/database";
import { notificationService } from "../notifications/notification.service";
import { Role, Prisma, RequisitionStatus } from "@prisma/client";
import { getModuleScope } from "../../utils/authorization";
import { permissionService } from "../permissions/permission.service";
import { candidateStages } from "./recruitment.schema";
import { assertStageTransition } from "./candidate-stage";
import { previousRoundFeedback } from "./previous-round-feedback";

interface CurrentUser {
  id: string;
  userId: string;
  email: string;
  role: string;
  employeeId?: string | null;
}

export class RecruitmentService {
  private async addPreviousRoundFeedback(rows: any[]) {
    const reviewerIds = [...new Set<string>(rows.flatMap(row => (row.interviews || [])
      .filter((item: any) => item.feedbackSubmittedAt && item.feedbackSubmittedById)
      .map((item: any) => item.feedbackSubmittedById)))];
    const reviewers = reviewerIds.length ? await prisma.user.findMany({
      where: { id: { in: reviewerIds } },
      select: { id: true, employee: { select: { firstName: true, lastName: true } } },
    }) : [];
    const names = new Map(reviewers.map(user => [user.id, user.employee ? `${user.employee.firstName} ${user.employee.lastName}`.trim() : "Reviewer unavailable"]));
    return rows.map(row => {
      const interviews = (row.interviews || []).map((item: any) => ({ ...item,
        reviewerName: item.feedbackSubmittedAt ? names.get(item.feedbackSubmittedById) || "Reviewer unavailable" : null,
      }));
      return { ...row, interviews: interviews.map((item: any) => ({ ...item,
        previousRoundFeedback: previousRoundFeedback(row.id, item.round, interviews),
      })) };
    });
  }
  private async setCandidateStage(tx: Prisma.TransactionClient, candidate: any, stage: string, userId: string, reason?: string) {
    if (candidate.currentStage === stage) return;
    const enteredAt = new Date();
    await tx.candidate.update({ where: { id: candidate.id }, data: { currentStage: stage, stageEnteredAt: enteredAt } });
    await tx.candidateStageHistory.create({ data: { candidateId: candidate.id, fromStage: candidate.currentStage, toStage: stage, actorId: userId, reason, createdAt: enteredAt } });
  }

  private async validateStageMove(tx: Prisma.TransactionClient, candidate: any, stage: string, reason?: string) {
    const currentStage = candidate.currentStage === "SCREENING" ? "TELEPHONIC" : candidate.currentStage;
    const fromIndex = candidateStages.indexOf(currentStage as typeof candidateStages[number]);
    const toIndex = candidateStages.indexOf(stage as typeof candidateStages[number]);
    const feedback = await tx.interview.findFirst({ where: {
      candidateId: candidate.id, round: currentStage, status: "COMPLETED", feedbackSubmittedAt: { not: null },
    }, select: { id: true } });
    const priorInterviewRounds = candidateStages.slice(0, 4).filter((_, index) => index >= toIndex && index < fromIndex);
    const priorFeedback = fromIndex > toIndex && priorInterviewRounds.length
      ? await tx.interview.findFirst({ where: {
          candidateId: candidate.id, round: { in: priorInterviewRounds }, status: "COMPLETED", feedbackSubmittedAt: { not: null },
        }, select: { id: true } })
      : null;
    assertStageTransition({ ...candidate, currentStage }, stage, reason, !!feedback, !!priorFeedback);
  }

  async transitionCandidateStage(id: string, data: {stage: string; expectedStage: string; reason?: string}, userId: string, reqContext: {ipAddress?: string} = {}) {
    await this.assertCandidateAccess(id, userId);
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "candidates" WHERE "id" = ${id} FOR UPDATE`;
      const candidate = await tx.candidate.findUniqueOrThrow({ where: { id } });
      const normalizedCurrentStage = candidate.currentStage === "SCREENING" ? "TELEPHONIC" : candidate.currentStage;
      if (normalizedCurrentStage !== data.expectedStage) throw new Error("This candidate stage changed. Refresh and try again.");
      await this.validateStageMove(tx, candidate, data.stage, data.reason);
      await this.setCandidateStage(tx, candidate, data.stage, userId, data.reason);
      if (candidate.currentStage !== data.stage) await tx.auditLog.create({ data: { actionPerformed: "MOVE_CANDIDATE_STAGE", moduleAffected: "recruitment", recordIdAffected: id, userId, ipAddress: reqContext.ipAddress, oldValue: JSON.stringify({stage: candidate.currentStage}), newValue: JSON.stringify({stage: data.stage, reason: data.reason}) } });
      return tx.candidate.findUniqueOrThrow({where: {id}, include: {stageHistory: {orderBy: {createdAt: "desc"}}}});
    });
  }

  async getPipeline(currentUser: CurrentUser, filters: any = {}) {
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(String(filters.pageSize || "25"), 10) || 25));
    let requestedPages: Record<string, number> = {};
    try {
      const parsed = JSON.parse(String(filters.pages || "{}"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) requestedPages = parsed;
    } catch {
      requestedPages = {};
    }
    const columns = await Promise.all(candidateStages.map(async stage => {
      const page = Math.max(1, Number.parseInt(String(requestedPages[stage] || "1"), 10) || 1);
      const result = await this.getCandidates(currentUser, {...filters, stage, page, pageSize, pipeline: true});
      return {stage, ...result};
    }));
    return {columns, pageSize};
  }
  async protectCandidateCompensation<T extends Record<string, any>>(
    rows: T[],
    role: Role,
  ): Promise<T[]> {
    if (await permissionService.canViewRestricted(role, "recruitment"))
      return rows;
    return rows.map((row) => {
      const {
        currentSalary,
        expectedSalary,
        offeredSalary,
        recruitmentCost,
        ...safe
      } = row;
      return { ...safe, ...(Array.isArray(safe.activity) ? { activity: redactOfferHistory(safe.activity) } : {}) } as T;
    });
  }

  private async assertCandidateAccess(candidateId: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { requisition: true },
    });
    if (!user || !candidate) throw new Error("Candidate not found.");
    const scope = getModuleScope(user.role, "recruitment");
    const employee = scope === "TEAM" && user.employeeId
      ? await prisma.employee.findUnique({where: {id: user.employeeId}, select: {departmentId: true}})
      : null;
    if (
      scope !== "ORG" &&
      (!user.employeeId || (scope === "TEAM" ? !employee?.departmentId || candidate.requisition.departmentId !== employee.departmentId : candidate.requisition.raisedById !== user.employeeId))
    ) {
      throw new Error("Unauthorized to access this candidate.");
    }
  }

  private async assertRequisitionAccess(requisitionId: string, userId: string) {
    const [user, requisition] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.requisition.findUnique({ where: { id: requisitionId } }),
    ]);
    if (!user || !requisition) throw new Error("Requisition not found.");
    const scope = getModuleScope(user.role, "recruitment");
    if (scope === "ORG") return;
    if (!user.employeeId) throw new Error("Unauthorized to access this opening.");
    if (scope === "SELF" && requisition.raisedById !== user.employeeId) throw new Error("Unauthorized to access this opening.");
    if (scope === "TEAM") {
      const employee = await prisma.employee.findUnique({ where: { id: user.employeeId }, select: { departmentId: true } });
      if (!employee?.departmentId || requisition.departmentId !== employee.departmentId) throw new Error("Unauthorized to access this opening.");
    }
  }

  async deleteCandidate(candidateId: string, userId: string, reqContext: { ipAddress?: string } = {}) {
    await this.assertCandidateAccess(candidateId, userId);
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "candidates" WHERE "id" = ${candidateId} FOR UPDATE`;
      const candidate = await tx.candidate.findUnique({ where: { id: candidateId }, include: { requisition: { select: { positionTitle: true } } } });
      if (!candidate) throw new Error("Candidate not found.");
      await tx.auditLog.create({
        data: {
          actionPerformed: "DELETE_CANDIDATE",
          moduleAffected: "recruitment",
          recordIdAffected: candidate.id,
          userId,
          ipAddress: reqContext.ipAddress,
          oldValue: JSON.stringify({ candidateName: candidate.candidateName, requisitionId: candidate.requisitionId, positionTitle: candidate.requisition.positionTitle }),
        },
      });
      await tx.candidate.delete({ where: { id: candidate.id } });
      return { id: candidate.id, requisitionId: candidate.requisitionId, candidateName: candidate.candidateName };
    });
  }

  async deleteRequisition(requisitionId: string, userId: string, reqContext: { ipAddress?: string } = {}) {
    await this.assertRequisitionAccess(requisitionId, userId);
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "requisitions" WHERE "id" = ${requisitionId} FOR UPDATE`;
      const requisition = await tx.requisition.findUnique({ where: { id: requisitionId }, include: { _count: { select: { candidates: true } } } });
      if (!requisition) throw new Error("Requisition not found.");
      const candidateCount = requisition._count.candidates;
      await tx.auditLog.create({
        data: {
          actionPerformed: "DELETE_REQUISITION",
          moduleAffected: "recruitment",
          recordIdAffected: requisition.id,
          userId,
          ipAddress: reqContext.ipAddress,
          oldValue: JSON.stringify({ positionTitle: requisition.positionTitle, candidateCount }),
        },
      });
      await tx.candidate.deleteMany({ where: { requisitionId: requisition.id } });
      await tx.requisition.delete({ where: { id: requisition.id } });
      return { id: requisition.id, candidateCount, positionTitle: requisition.positionTitle };
    });
  }

  private async closeFilledRequisition(
    tx: Prisma.TransactionClient,
    requisitionId: string,
    userId: string,
    ipAddress?: string,
  ) {
    const requisition = await tx.requisition.findUniqueOrThrow({
      where: { id: requisitionId },
    });
    const selectedCount = await tx.candidate.count({
      where: {
        requisitionId,
        selectionStatus: "SELECTED",
        OR: [{ offerStatus: null }, { offerStatus: { not: "OFFER_DECLINED" } }],
      },
    });
    if (selectedCount > requisition.numberOfVacancies)
      throw new Error(
        "All vacancies are already filled. Increase the vacancy count before selecting another candidate.",
      );
    if (selectedCount < requisition.numberOfVacancies) {
      if (requisition.status === "CLOSED") {
        const lastClosure = await tx.auditLog.findFirst({
          where: {
            moduleAffected: "recruitment",
            recordIdAffected: requisitionId,
            actionPerformed: {
              in: ["CLOSE_FILLED_REQUISITION", "UPDATE_REQUISITION_STATUS"],
            },
          },
          orderBy: { createdAt: "desc" },
        });
        if (
          requisition.closureSource === "AUTO_FILLED" ||
          (!requisition.closureSource &&
            lastClosure?.actionPerformed === "CLOSE_FILLED_REQUISITION")
        ) {
          let previousStatus: string | undefined;
          try {
            previousStatus = JSON.parse(lastClosure?.oldValue || "{}").status;
          } catch {
            /* Legacy audit data falls back to REQUIREMENT. */
          }
          const restoredStatus =
            previousStatus &&
            Object.values(RequisitionStatus).includes(
              previousStatus as RequisitionStatus,
            ) &&
            !["CLOSED", "JOINED_REJECTED"].includes(previousStatus)
              ? (previousStatus as RequisitionStatus)
              : "REQUIREMENT";
          await tx.requisition.update({
            where: { id: requisitionId },
            data: {
              status: restoredStatus,
              stageUpdatedAt: new Date(),
              closureSource: null,
              closureReason: null,
            },
          });
          await tx.auditLog.create({
            data: {
              actionPerformed: "REOPEN_UNFILLED_REQUISITION",
              moduleAffected: "recruitment",
              recordIdAffected: requisitionId,
              userId,
              ipAddress,
            },
          });
        }
      }
      return;
    }
    const { count: closedCount } = await tx.requisition.updateMany({
      where: {
        id: requisitionId,
        status: { notIn: ["CLOSED", "JOINED_REJECTED"] },
      },
      data: {
        status: "CLOSED",
        stageUpdatedAt: new Date(),
        closureSource: "AUTO_FILLED",
        closureReason: "All vacancies are reserved by selected candidates.",
      },
    });
    if (!closedCount) return;

    await tx.auditLog.create({
      data: {
        actionPerformed: "CLOSE_FILLED_REQUISITION",
        oldValue: JSON.stringify({ status: requisition.status }),
        moduleAffected: "recruitment",
        recordIdAffected: requisitionId,
        userId,
        ipAddress,
      },
    });
  }

  async createRequisition(
    data: any,
    raisedByEmployeeId: string,
    userId: string,
    reqContext: { ipAddress?: string } = {},
  ) {
    const department = await prisma.department.findUnique({
      where: { id: data.departmentId },
      select: { id: true },
    });
    if (!department) throw new Error("Department not found.");

    return prisma.$transaction(async (tx) => {
      const req = await tx.requisition.create({
        data: {
          ...data,
          raisedById: raisedByEmployeeId,
          status: "REQUIREMENT",
        },
      });
      await tx.auditLog.create({
        data: {
          actionPerformed: "CREATE_REQUISITION",
          moduleAffected: "recruitment",
          recordIdAffected: req.id,
          userId,
          ipAddress: reqContext.ipAddress,
        },
      });
      return req;
    });
  }

  async updateRequisition(
    id: string,
    data: any,
    userId: string,
    reqContext: { ipAddress?: string } = {},
  ) {
    const req = await prisma.requisition.findUnique({ where: { id } });
    if (!req) throw new Error("Requisition not found.");

    if (data.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: data.departmentId },
        select: { id: true },
      });
      if (!department) throw new Error("Department not found.");
    }

    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM requisitions WHERE id = ${id} FOR UPDATE`;
      const updated = await tx.requisition.update({
        where: { id },
        data: {
          positionTitle: data.positionTitle,
          departmentId: data.departmentId,
          location: data.location,
          numberOfVacancies: data.numberOfVacancies,
        },
      });
      await tx.auditLog.create({
        data: {
          actionPerformed: "UPDATE_REQUISITION",
          moduleAffected: "recruitment",
          recordIdAffected: id,
          userId,
          ipAddress: reqContext.ipAddress,
        },
      });
      if (data.numberOfVacancies !== undefined) {
        await this.closeFilledRequisition(tx, id, userId, reqContext.ipAddress);
        return tx.requisition.findUniqueOrThrow({ where: { id } });
      }
      return updated;
    });
  }

  async getRequisitions(currentUser: CurrentUser, filters: any = {}) {
    const scope = getModuleScope(currentUser.role as Role, "recruitment");
    if (scope !== "ORG" && !currentUser.employeeId) return [];

    let scopeQuery: Prisma.RequisitionWhereInput = {};
    if (scope === "SELF") {
      scopeQuery = {
        OR: [
          { raisedById: currentUser.employeeId! },
          { status: { not: "JOINED_REJECTED" } },
        ],
      };
    } else if (scope === "TEAM") {
      const emp = await prisma.employee.findUnique({
        where: { id: currentUser.employeeId! },
        select: { departmentId: true },
      });
      scopeQuery = {
        OR: [
          { departmentId: emp?.departmentId || undefined },
          { status: { not: "JOINED_REJECTED" } },
        ],
      };
    }

    const requisitions = await prisma.requisition.findMany({
      where: { ...filters, ...scopeQuery },
      include: {
        department: true,
        raisedBy: { select: { id: true, firstName: true, lastName: true } },
        candidates: {
          select: {
            selectionStatus: true,
            currentStage: true,
            stageEnteredAt: true,
            joiningStatus: true,
            interviewRound: true,
            offerStatus: true,
            updatedAt: true,
          },
        },
        _count: { select: { candidates: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return requisitions.map(({ candidates, ...requisition }) => ({
      ...requisition,
      candidates,
      newApplicationCount: candidates.filter((candidate) => ["TELEPHONIC", "SCREENING"].includes(candidate.currentStage) && candidate.selectionStatus !== "SELECTION_REJECTED").length,
      selectedCount: candidates.filter(
        (candidate) =>
          candidate.selectionStatus === "SELECTED" &&
          candidate.offerStatus !== "OFFER_DECLINED",
      ).length,
      filledCount: candidates.filter(
        (candidate) =>
          candidate.selectionStatus === "SELECTED" &&
          candidate.offerStatus !== "OFFER_DECLINED",
      ).length,
      remainingCount: Math.max(
        0,
        requisition.numberOfVacancies -
          candidates.filter(
            (candidate) =>
              candidate.selectionStatus === "SELECTED" &&
              candidate.offerStatus !== "OFFER_DECLINED",
          ).length,
      ),
      offerCount: candidates.filter(
        (candidate) =>
          candidate.interviewRound
            ?.trim()
            .toUpperCase()
            .replace(/[\s-]+/g, "_") === "OFFER" ||
          candidate.offerStatus === "RELEASED" ||
          candidate.offerStatus === "OFFER_ACCEPTED",
      ).length,
    }));
  }

  async updateRequisitionStatus(
    id: string,
    data: any,
    userId: string,
    reqContext: { ipAddress?: string } = {},
  ) {
    const req = await prisma.requisition.findUnique({ where: { id } });
    if (!req) throw new Error("Requisition not found.");
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "requisitions" WHERE "id" = ${id} FOR UPDATE`;
      const locked = await tx.requisition.findUniqueOrThrow({ where: { id } });
      if (
        ["CLOSED", "JOINED_REJECTED"].includes(locked.status) &&
        !["CLOSED", "JOINED_REJECTED"].includes(data.status)
      ) {
        const filled = await tx.candidate.count({
          where: {
            requisitionId: id,
            selectionStatus: "SELECTED",
            OR: [
              { offerStatus: null },
              { offerStatus: { not: "OFFER_DECLINED" } },
            ],
          },
        });
        if (filled >= locked.numberOfVacancies)
          throw new Error(
            "All vacancies are reserved. Increase capacity before reopening.",
          );
      }

      const updated = await tx.requisition.update({
        where: { id },
        data: {
          status: data.status,
          stageUpdatedAt: new Date(),
          closureSource: ["CLOSED", "JOINED_REJECTED"].includes(data.status)
            ? "MANUAL"
            : null,
          closureReason: data.reason || null,
        },
      });
      await tx.auditLog.create({
        data: {
          actionPerformed: "UPDATE_REQUISITION_STATUS",
          moduleAffected: "recruitment",
          recordIdAffected: id,
          userId,
          ipAddress: reqContext.ipAddress,
        },
      });
      return updated;
    });
  }

  async createCandidate(
    data: any,
    userId: string,
    reqContext: { ipAddress?: string } = {},
  ) {
    const created = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "requisitions" WHERE "id" = ${data.requisitionId} FOR UPDATE`;
      const requisition = await tx.requisition.findUnique({
        where: { id: data.requisitionId },
      });
      if (!requisition) throw new Error("Requisition not found.");
      if (["CLOSED", "JOINED_REJECTED"].includes(requisition.status))
        throw new Error(
          "This requisition is closed. Reopen it before scheduling a candidate.",
        );
      const {
        interviewDurationMinutes = 60,
        interviewMode = "IN_PERSON",
        ...candidateData
      } = data;
      const candidate = await tx.candidate.create({ data: {
        ...candidateData,
        currentStage: candidateData.interviewDate ? candidateData.interviewRound || "HR_INTERVIEW" : "TELEPHONIC",
        screeningStatus: "SHORTLISTED",
      } });
      if (candidate.interviewDate) {
        const endsAt = new Date(
          candidate.interviewDate.getTime() + interviewDurationMinutes * 60000,
        );
        if (candidate.interviewerId) {
          await tx.$queryRaw`SELECT "id" FROM "employees" WHERE "id" = ${candidate.interviewerId} FOR UPDATE`;
          const conflict = await tx.interview.findFirst({
            where: {
              interviewerId: candidate.interviewerId,
              status: "SCHEDULED",
              startsAt: { lt: endsAt },
              endsAt: { gt: candidate.interviewDate },
            },
          });
          if (conflict)
            throw new Error(
              "This interviewer already has an interview during that time.",
            );
        }
        await tx.interview.create({
          data: {
            candidateId: candidate.id,
            round: candidate.interviewRound || "HR_INTERVIEW",
            startsAt: candidate.interviewDate,
            endsAt: new Date(
              candidate.interviewDate.getTime() +
                interviewDurationMinutes * 60 * 1000,
            ),
            mode: interviewMode,
            location: candidate.interviewLocation,
            interviewerId: candidate.interviewerId,
            createdById: userId,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actionPerformed: "CREATE_CANDIDATE",
          moduleAffected: "recruitment",
          recordIdAffected: candidate.id,
          userId,
          ipAddress: reqContext.ipAddress,
        },
      });
      return candidate;
    });
    if (created.interviewDate && created.interviewerId) {
      const requisition = await prisma.requisition.findUnique({ where: { id: created.requisitionId }, select: { positionTitle: true } });
      await notificationService.createNotification({
        notificationType: "INTERVIEW",
        recipientId: created.interviewerId,
        triggerEvent: `interview-scheduled:${created.id}`,
        message: `${created.candidateName} · ${requisition?.positionTitle || "Recruitment"} · ${(created.interviewRound || "HR_INTERVIEW").replace(/_/g, " ")} interview scheduled for ${created.interviewDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} (Asia/Kolkata).`,
      }).catch(error => console.error("Could not notify interviewer of scheduled interview", error));
    }
    return created;
  }

  async getAllInterviews(currentUser: CurrentUser) {
    const scope = getModuleScope(currentUser.role as Role, "recruitment");
    if (scope !== "ORG" && !currentUser.employeeId) return [];
    const whereClause: any = {
      OR: [
        { interviewDate: { not: null } },
        { interviewRound: "OFFER" },
        {
          offerStatus: { in: ["RELEASED", "OFFER_ACCEPTED", "OFFER_DECLINED"] },
        },
      ],
    };

    let requisitionScope: any = {};
    if (scope === "SELF") {
      requisitionScope = { raisedById: currentUser.employeeId };
    } else if (scope === "TEAM") {
      const emp = await prisma.employee.findUnique({
        where: { id: currentUser.employeeId! },
        select: { departmentId: true },
      });
      requisitionScope = { departmentId: emp?.departmentId };
    }

    const candidates = await prisma.candidate.findMany({
      where: Object.keys(requisitionScope).length
        ? { requisition: requisitionScope }
        : {},
      include: {
        interviews: {
          include: {
            interviewer: { select: { firstName: true, lastName: true } },
          },
          orderBy: { startsAt: "asc" },
        },
        requisition: { select: { positionTitle: true } },
        interviewer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { interviewDate: "asc" },
    });
    const rescheduleEvents = candidates.length ? await prisma.auditLog.findMany({
      where: { moduleAffected: "recruitment", actionPerformed: "RESCHEDULE_INTERVIEW", recordIdAffected: { in: candidates.map(candidate => candidate.id) } },
      select: { id: true, recordIdAffected: true, oldValue: true, newValue: true, createdAt: true, user: { select: { email: true, employee: { select: { firstName: true, lastName: true } } } } },
      orderBy: { createdAt: "desc" },
    }) : [];
    const enrichedCandidates = await this.addPreviousRoundFeedback(candidates.map(candidate => ({
      ...candidate,
      activity: rescheduleEvents.filter(event => event.recordIdAffected === candidate.id).map(event => ({ ...event, actionPerformed: "RESCHEDULE_INTERVIEW" })),
    })));
    const historical = enrichedCandidates.flatMap((candidate) =>
      candidate.interviews.map((interview: any) => ({
        ...candidate,
        ...interview,
        candidateId: candidate.id,
        id: candidate.id,
        interviewId: interview.id,
        interviewDate: interview.startsAt,
        interviewRound: interview.round,
        interviewLocation: interview.location,
        interviewFeedback: interview.feedback,
        interviewScore: interview.score,
        interviewer: interview.interviewer,
        interviews: undefined,
      })),
    );
    const legacy = await prisma.candidate.findMany({
      where: {
        ...whereClause,
        ...(Object.keys(requisitionScope).length
          ? { requisition: requisitionScope }
          : {}),
        interviews: { none: {} },
      },
      include: {
        requisition: { select: { positionTitle: true } },
        interviewer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { interviewDate: "asc" },
    });
    const allRows = [
      ...historical,
      ...legacy.map((candidate) => ({
        ...candidate,
        interviewId: null,
        status:
          candidate.interviewFeedback === "Finished"
            ? "COMPLETED"
            : "SCHEDULED",
      })),
    ].sort(
      (a, b) =>
        new Date(a.interviewDate || 0).getTime() -
        new Date(b.interviewDate || 0).getTime(),
    );
    return this.protectCandidateCompensation(allRows, currentUser.role as Role);
  }

  async getCandidates(currentUser: CurrentUser, filters: any = {}) {
    const role = currentUser.role as Role;
    const scope = getModuleScope(role, "recruitment");
    if (scope === "NONE" || (scope !== "ORG" && !currentUser.employeeId))
      return { items: [], total: 0, page: 1, pageSize: 50 };
    const departmentId =
      scope === "TEAM"
        ? (
            await prisma.employee.findUnique({
              where: { id: currentUser.employeeId! },
              select: { departmentId: true },
            })
          )?.departmentId
        : undefined;
    const page = Math.max(
      1,
      Number.parseInt(String(filters.page || "1"), 10) || 1,
    );
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(String(filters.pageSize || "50"), 10) || 50),
    );
    const query = String(filters.search || "").trim();
    const where: Prisma.CandidateWhereInput = {
      ...(scope === "SELF"
        ? { requisition: { raisedById: currentUser.employeeId! } }
        : scope === "TEAM"
          ? { requisition: { departmentId: departmentId || "__no_department__" } }
          : {}),
      ...(filters.requisitionId
        ? { requisitionId: String(filters.requisitionId) }
        : {}),
      ...(filters.stage === "TELEPHONIC"
        ? { currentStage: { in: ["TELEPHONIC", "SCREENING"] } }
        : filters.stage ? { currentStage: String(filters.stage) } : {}),
      ...(filters.screeningStatus ? { screeningStatus: String(filters.screeningStatus) as any } : {}),
      ...(filters.outcome === "IN_PROGRESS"
        ? { selectionStatus: null }
        : filters.outcome
          ? { selectionStatus: String(filters.outcome) as any }
          : {}),
      ...(query
        ? {
            OR: [
              { candidateName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, rows] = await prisma.$transaction([
      prisma.candidate.count({ where }),
      prisma.candidate.findMany({
        where,
        include: {
          requisition: {
            select: { id: true, positionTitle: true, location: true },
          },
          interviewer: {
            select: { id: true, firstName: true, lastName: true },
          },
          interviews: {
            where: filters.pipeline ? {} : { status: "SCHEDULED" },
            orderBy: { startsAt: "asc" },
            ...(filters.pipeline ? {} : {take: 1}),
            include: {interviewer: {select: {id: true, firstName: true, lastName: true}}},
          },
        },
        orderBy: filters.pipeline ? {stageEnteredAt: "asc"} : { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    const activity = rows.length ? await prisma.auditLog.findMany({
      where: { moduleAffected: "recruitment", recordIdAffected: { in: rows.map(row => row.id) } },
      select: { id: true, recordIdAffected: true, actionPerformed: true, oldValue: true, newValue: true, createdAt: true, user: { select: { email: true, employee: { select: { firstName: true, lastName: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    }) : [];
    const safeRows = await this.protectCandidateCompensation(rows.map((row) => ({
      ...row,
      currentStage: row.currentStage === "SCREENING" ? "TELEPHONIC" : row.currentStage,
      activity: activity.filter(event => event.recordIdAffected === row.id).map(event => {
        if (event.actionPerformed === "OFFER_CANDIDATE" || event.actionPerformed === "RESCHEDULE_INTERVIEW") return event;
        const { oldValue: _oldValue, newValue: _newValue, ...safeEvent } = event;
        return safeEvent;
      }),
    })), role);
    return { items: safeRows, total, page, pageSize };
  }

  async getCandidatesByRequisition(
    requisitionId: string,
    currentUser: CurrentUser,
  ) {
    const scope = getModuleScope(currentUser.role as Role, "recruitment");
    const req = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    });

    if (scope === "SELF") {
      if (req?.raisedById !== currentUser.employeeId)
        throw new Error("Unauthorized to view candidates for this requisition");
    } else if (scope === "TEAM") {
      const emp = await prisma.employee.findUnique({
        where: { id: currentUser.employeeId! },
        select: { departmentId: true },
      });
      if (req?.departmentId !== emp?.departmentId)
        throw new Error("Unauthorized to view candidates for this requisition");
    }

    const rows = await prisma.candidate.findMany({
      where: { requisitionId },
      include: {
        stageHistory: { orderBy: { createdAt: "desc" } },
        interviewer: { select: { id: true, firstName: true, lastName: true } },
        requisition: { select: { id: true, positionTitle: true } },
        interviews: {
          orderBy: { startsAt: "asc" },
          include: {
            interviewer: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const activity = await prisma.auditLog.findMany({
      where: {
        moduleAffected: "recruitment",
        recordIdAffected: { in: rows.map((row) => row.id) },
      },
      select: {
        id: true,
        recordIdAffected: true,
        actionPerformed: true,
        oldValue: true,
        newValue: true,
        createdAt: true,
        user: { select: { email: true, employee: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return this.protectCandidateCompensation(
      (await this.addPreviousRoundFeedback(rows)).map((row) => ({
        ...row,
        currentStage: row.currentStage === "SCREENING" ? "TELEPHONIC" : row.currentStage,
        activity: activity.filter((event) => event.recordIdAffected === row.id).map(event => {
          if (event.actionPerformed === "OFFER_CANDIDATE" || event.actionPerformed === "RESCHEDULE_INTERVIEW") return event;
          const { oldValue: _oldValue, newValue: _newValue, ...safeEvent } = event;
          return safeEvent;
        }),
      })),
      currentUser.role as Role,
    );
  }

  async createInterview(
    candidateId: string,
    data: any,
    userId: string,
    reqContext: { ipAddress?: string } = {},
  ) {
    await this.assertCandidateAccess(candidateId, userId);
    const created = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "candidates" WHERE "id" = ${candidateId} FOR UPDATE`;
      const candidate = await tx.candidate.findUnique({
        where: { id: candidateId },
      });
      if (!candidate) throw new Error("Candidate not found.");
      if (candidate.selectionStatus === "SELECTION_REJECTED" || candidate.selectionStatus === "SELECTION_ON_HOLD" || candidate.offerStatus === "OFFER_DECLINED" || candidate.joiningStatus === "NOT_JOINED")
        throw new Error("Restore the candidate's decision before scheduling an interview.");
      await this.validateStageMove(tx, candidate, data.round, data.reason);
      if (data.interviewerId) {
        await tx.$queryRaw`SELECT "id" FROM "employees" WHERE "id" = ${data.interviewerId} FOR UPDATE`;
        const conflict = await tx.interview.findFirst({
          where: {
            interviewerId: data.interviewerId,
            status: "SCHEDULED",
            startsAt: { lt: new Date(data.endsAt) },
            endsAt: { gt: new Date(data.startsAt) },
          },
        });
        if (conflict)
          throw new Error(
            "This interviewer already has an interview during that time.",
          );
      }
      const overlap = await tx.interview.findFirst({
        where: {
          candidateId,
          status: "SCHEDULED",
          startsAt: { lt: new Date(data.endsAt) },
          endsAt: { gt: new Date(data.startsAt) },
        },
      });
      if (overlap)
        throw new Error(
          "This candidate already has an interview during that time.",
        );
      const { reason: _reason, ...schedule } = data;
      const interview = await tx.interview.create({
        data: { ...schedule, candidateId, createdById: userId },
      });
      await tx.auditLog.create({
        data: {
          actionPerformed: "SCHEDULE_INTERVIEW",
          moduleAffected: "recruitment",
          recordIdAffected: candidateId,
          userId,
          ipAddress: reqContext.ipAddress,
        },
      });
      await tx.candidate.update({
        where: { id: candidateId },
        data: {
          interviewDate: new Date(data.startsAt),
          interviewRound: data.round,
          interviewLocation: data.location || null,
          interviewerId: data.interviewerId || null,
        },
      });
      await this.setCandidateStage(tx, candidate, data.round, userId, data.reason || "Interview scheduled");
      return interview;
    });
    if (created.interviewerId) {
      const candidate = await prisma.candidate.findUnique({ where: { id: candidateId }, include: { requisition: { select: { positionTitle: true } } } });
      await notificationService.createNotification({
        notificationType: "INTERVIEW",
        recipientId: created.interviewerId,
        triggerEvent: `interview-scheduled:${created.id}`,
        message: `${candidate?.candidateName || "A candidate"} · ${candidate?.requisition.positionTitle || "Recruitment"} · ${created.round.replace(/_/g, " ")} interview scheduled for ${created.startsAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} (Asia/Kolkata).`,
      }).catch(error => console.error("Could not notify interviewer of scheduled interview", error));
    }
    return created;
  }

  async rescheduleInterview(
    interviewId: string,
    data: any,
    userId: string,
    reqContext: { ipAddress?: string } = {},
  ) {
    const appointment = await prisma.interview.findUnique({
      where: { id: interviewId },
    });
    if (!appointment) throw new Error("Interview not found.");
    await this.assertCandidateAccess(appointment.candidateId, userId);
    const replacement = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "candidates" WHERE "id" = ${appointment.candidateId} FOR UPDATE`;
      const existing = await tx.interview.findUnique({
        where: { id: interviewId },
      });
      if (!existing || existing.status !== "SCHEDULED")
        throw new Error("Only a scheduled interview can be rescheduled.");
      const candidate = await tx.candidate.findUniqueOrThrow({where: {id: existing.candidateId}});
      await this.validateStageMove(tx, candidate, data.round, data.reason);
      if (data.interviewerId) {
        await tx.$queryRaw`SELECT "id" FROM "employees" WHERE "id" = ${data.interviewerId} FOR UPDATE`;
        const conflict = await tx.interview.findFirst({
          where: {
            id: { not: interviewId },
            interviewerId: data.interviewerId,
            status: "SCHEDULED",
            startsAt: { lt: new Date(data.endsAt) },
            endsAt: { gt: new Date(data.startsAt) },
          },
        });
        if (conflict)
          throw new Error(
            "This interviewer already has an interview during that time.",
          );
      }
      const overlap = await tx.interview.findFirst({
        where: {
          id: { not: interviewId },
          candidateId: appointment.candidateId,
          status: "SCHEDULED",
          startsAt: { lt: new Date(data.endsAt) },
          endsAt: { gt: new Date(data.startsAt) },
        },
      });
      if (overlap)
        throw new Error(
          "This candidate already has an interview during that time.",
        );
      const { reason, ...schedule } = data;
      const { count } = await tx.interview.updateMany({
        where: { id: interviewId, status: "SCHEDULED" },
        data: { status: "CANCELLED" },
      });
      if (!count)
        throw new Error(
          "This interview was updated by someone else. Refresh and try again.",
        );
      const replacement = await tx.interview.create({
        data: {
          ...schedule,
          candidateId: existing.candidateId,
          createdById: userId,
        },
      });
      await this.setCandidateStage(tx, candidate, data.round, userId, data.reason);
      await tx.candidate.update({
        where: { id: existing.candidateId },
        data: {
          interviewDate: replacement.startsAt,
          interviewRound: replacement.round,
          interviewLocation: replacement.location,
          interviewerId: replacement.interviewerId,
        },
      });
      await tx.auditLog.create({
        data: {
          actionPerformed: "RESCHEDULE_INTERVIEW",
          oldValue: JSON.stringify({
            startsAt: existing.startsAt,
            endsAt: existing.endsAt,
            round: existing.round,
            interviewerId: existing.interviewerId,
            location: existing.location,
            reason,
          }),
          newValue: JSON.stringify({
            startsAt: replacement.startsAt,
            endsAt: replacement.endsAt,
            round: replacement.round,
            interviewerId: replacement.interviewerId,
            location: replacement.location,
            reason,
          }),
          moduleAffected: "recruitment",
          recordIdAffected: existing.candidateId,
          userId,
          ipAddress: reqContext.ipAddress,
        },
      });
      return replacement;
    });
    if (replacement.interviewerId) {
      const candidate = await prisma.candidate.findUnique({ where: { id: replacement.candidateId }, include: { requisition: { select: { positionTitle: true } } } });
      await notificationService.createNotification({
        notificationType: "INTERVIEW",
        recipientId: replacement.interviewerId,
        triggerEvent: `interview-rescheduled:${replacement.id}`,
        message: `${candidate?.candidateName || "A candidate"} · ${candidate?.requisition.positionTitle || "Recruitment"} · ${replacement.round.replace(/_/g, " ")} interview rescheduled to ${replacement.startsAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} (Asia/Kolkata).`,
      }).catch(error => console.error("Could not notify interviewer of rescheduled interview", error));
    }
    return replacement;
  }

  async updateInterviewStatus(
    interviewId: string,
    data: any,
    userId: string,
    reqContext: { ipAddress?: string } = {},
  ) {
    const appointment = await prisma.interview.findUnique({
      where: { id: interviewId },
    });
    if (!appointment) throw new Error("Interview not found.");
    await this.assertCandidateAccess(appointment.candidateId, userId);
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });
    if (!interview) throw new Error("Interview not found.");
    if (interview.status !== "SCHEDULED")
      throw new Error(
        "Only scheduled interviews can change appointment status.",
      );
    if (data.status === "SCHEDULED")
      throw new Error("Use reschedule to change an interview time.");
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.interview.updateMany({
        where: { id: interviewId, status: interview.status },
        data: { status: data.status },
      });
      if (!count)
        throw new Error(
          "This interview was updated by someone else. Refresh and try again.",
        );
      const updated = await tx.interview.findUniqueOrThrow({
        where: { id: interviewId },
      });
      if (data.status === "CANCELLED" || data.status === "NO_SHOW") {
        const next = await tx.interview.findFirst({
          where: { candidateId: interview.candidateId, status: "SCHEDULED" },
          orderBy: { startsAt: "asc" },
        });
        await tx.candidate.update({
          where: { id: interview.candidateId },
          data: {
            interviewDate: next?.startsAt || null,
            interviewRound: next?.round || null,
            interviewLocation: next?.location || null,
            interviewerId: next?.interviewerId || null,
          },
        });
      } else if (data.status === "SCHEDULED") {
        await tx.candidate.update({
          where: { id: interview.candidateId },
          data: {
            interviewDate: interview.startsAt,
            interviewRound: interview.round,
            interviewLocation: interview.location,
            interviewerId: interview.interviewerId,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actionPerformed: `INTERVIEW_${data.status}`,
          oldValue: data.reason || null,
          moduleAffected: "recruitment",
          recordIdAffected: interview.candidateId,
          userId,
          ipAddress: reqContext.ipAddress,
        },
      });
      return updated;
    });
  }

  async submitInterviewFeedback(
    interviewId: string,
    data: any,
    userId: string,
    reqContext: { ipAddress?: string } = {},
  ) {
    const appointment = await prisma.interview.findUnique({
      where: { id: interviewId },
    });
    if (!appointment) throw new Error("Interview not found.");
    await this.assertCandidateAccess(appointment.candidateId, userId);
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "recruitment_interviews" WHERE "id" = ${interviewId} FOR UPDATE`;
      const interview = await tx.interview.findUnique({ where: { id: interviewId } });
      if (!interview) throw new Error("Interview not found.");
      if (interview.status !== "COMPLETED")
        throw new Error("Complete the interview before submitting feedback.");
      if (!data.draft && interview.feedback && !data.revisionReason)
        throw new Error("A reason is required to revise submitted feedback.");
      const updated = await tx.interview.update({
        where: { id: interviewId },
        data: data.draft
          ? {
              draftFeedback: data.feedback,
              draftScore: data.score ?? null,
              draftRecommendation: data.recommendation ?? null,
            }
          : {
              feedback: data.feedback,
              score: data.score ?? null,
              recommendation: data.recommendation ?? null,
              feedbackSubmittedAt: new Date(),
              feedbackSubmittedById: userId,
              draftFeedback: null,
              draftScore: null,
              draftRecommendation: null,
            },
      });
      if (!data.draft)
        await tx.candidate.update({
          where: { id: interview.candidateId },
          data: {
            interviewFeedback: data.feedback,
            interviewScore: data.score,
          },
        });
      await tx.auditLog.create({
        data: {
          actionPerformed: data.draft
            ? "SAVE_INTERVIEW_FEEDBACK_DRAFT"
            : "SUBMIT_INTERVIEW_FEEDBACK",
          oldValue: JSON.stringify({
            interviewId,
            revisionReason: data.revisionReason,
            feedback: interview.feedback,
            score: interview.score,
            recommendation: interview.recommendation,
          }),
          moduleAffected: "recruitment",
          recordIdAffected: interview.candidateId,
          userId,
          ipAddress: reqContext.ipAddress,
        },
      });
      return updated;
    });
  }

  async interviewCandidate(
    id: string,
    data: any,
    userId: string,
    reqContext: { ipAddress?: string } = {},
  ) {
    await this.assertCandidateAccess(id, userId);
    const candidate = await prisma.candidate.findUnique({ where: { id } });
    if (!candidate) throw new Error("Candidate not found.");

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "requisitions" WHERE "id" = ${candidate.requisitionId} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "candidates" WHERE "id" = ${id} FOR UPDATE`;
      const current = await tx.candidate.findUniqueOrThrow({ where: { id } });
      if (data.interviewRound && data.interviewRound !== current.currentStage) {
        await this.validateStageMove(tx, current, data.interviewRound, data.reason);
        await this.setCandidateStage(tx, current, data.interviewRound, userId, data.reason || "Interview round updated");
      }
      const updated = await tx.candidate.update({
        where: { id },
        data: {
          interviewRound: data.interviewRound ?? current.interviewRound,
          interviewDate: data.interviewDate
            ? new Date(data.interviewDate)
            : current.interviewDate,
          interviewLocation:
            data.interviewLocation ?? current.interviewLocation,
          interviewFeedback:
            data.interviewFeedback ?? current.interviewFeedback,
          interviewScore: data.interviewScore ?? current.interviewScore,
          selectionStatus: Object.prototype.hasOwnProperty.call(
            data,
            "selectionStatus",
          )
            ? data.selectionStatus
            : current.selectionStatus,
          interviewerId: data.interviewerId ?? current.interviewerId,
        },
      });
      // Legacy callers can still reschedule, but must preserve appointment history.
      if (
        data.interviewDate &&
        new Date(data.interviewDate).getTime() !==
          current.interviewDate?.getTime()
      ) {
        const oldAppointment = await tx.interview.findFirst({
          where: {
            candidateId: id,
            status: "SCHEDULED",
            startsAt: current.interviewDate || undefined,
          },
          orderBy: { startsAt: "desc" },
        });
        const startsAt = new Date(data.interviewDate);
        const endsAt = new Date(
          startsAt.getTime() +
            (oldAppointment
              ? oldAppointment.endsAt.getTime() -
                oldAppointment.startsAt.getTime()
              : 3600000),
        );
        const panel = data.interviewerId ?? current.interviewerId;
        if (panel) {
          await tx.$queryRaw`SELECT "id" FROM "employees" WHERE "id" = ${panel} FOR UPDATE`;
          const conflict = await tx.interview.findFirst({
            where: {
              id: { not: oldAppointment?.id },
              interviewerId: panel,
              status: "SCHEDULED",
              startsAt: { lt: endsAt },
              endsAt: { gt: startsAt },
            },
          });
          if (conflict)
            throw new Error(
              "This interviewer already has an interview during that time.",
            );
        }
        if (oldAppointment)
          await tx.interview.update({
            where: { id: oldAppointment.id },
            data: { status: "CANCELLED" },
          });
        await tx.interview.create({
          data: {
            candidateId: id,
            round:
              data.interviewRound || current.interviewRound || "TELEPHONIC",
            startsAt,
            endsAt,
            mode: oldAppointment?.mode || "IN_PERSON",
            location: data.interviewLocation ?? current.interviewLocation,
            interviewerId: panel,
            createdById: userId,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actionPerformed: "INTERVIEW_CANDIDATE",
          moduleAffected: "recruitment",
          recordIdAffected: id,
          userId,
          ipAddress: reqContext.ipAddress,
        },
      });
      await this.closeFilledRequisition(
        tx,
        candidate.requisitionId,
        userId,
        reqContext.ipAddress,
      );
      return tx.candidate.findUniqueOrThrow({where: {id}});
    });
    return updated;
  }

  async offerCandidate(
    id: string,
    data: any,
    userId: string,
    reqContext: { ipAddress?: string } = {},
  ) {
    await this.assertCandidateAccess(id, userId);
    const updated = await prisma.$transaction(async (tx) => {
      const candidate = await tx.candidate.findUnique({ where: { id } });
      if (!candidate) throw new Error("Candidate not found.");
      await tx.$queryRaw`SELECT "id" FROM "requisitions" WHERE "id" = ${candidate.requisitionId} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "candidates" WHERE "id" = ${id} FOR UPDATE`;
      const current = await tx.candidate.findUniqueOrThrow({ where: { id } });
      if (
        ["RELEASED", "OFFER_ACCEPTED", "OFFER_DECLINED"].includes(
          data.offerStatus,
        ) &&
        current.selectionStatus !== "SELECTED" &&
        !["RELEASED", "OFFER_ACCEPTED", "OFFER_DECLINED"].includes(
          current.offerStatus || "",
        )
      ) {
        throw new Error("Select the candidate before creating an offer.");
      }
      if (current.currentStage === "JOINED" && (data.offerStatus !== "OFFER_ACCEPTED" || (data.joiningStatus && data.joiningStatus !== "JOINED")))
        throw new Error("A joined candidate's accepted offer and joining outcome cannot be reverted.");
      if (data.offerStatus !== "NOT_RELEASED" && current.currentStage !== "JOINED") {
        // Releasing a fresh offer explicitly restores a declined offer. The
        // requisition lock and closeFilledRequisition recheck available capacity.
        const restored = {
          ...current,
          offerStatus: current.offerStatus === "OFFER_DECLINED" && data.offerStatus === "RELEASED" ? "NOT_RELEASED" : current.offerStatus,
          joiningStatus: data.joiningStatus === "PENDING" ? "PENDING" : current.joiningStatus,
        };
        await this.validateStageMove(tx, restored, "OFFER", "Offer workflow updated");
      }
      if (data.offerStatus === "OFFER_ACCEPTED" && current.offerStatus === "OFFER_DECLINED")
        throw new Error("Release a new offer before recording acceptance of a previously declined offer.");
      if (
        ["OFFER_ACCEPTED", "OFFER_DECLINED"].includes(data.offerStatus) &&
        !["RELEASED", "OFFER_ACCEPTED", "OFFER_DECLINED"].includes(
          current.offerStatus || "",
        )
      )
        throw new Error(
          "Release the offer before recording acceptance or decline.",
        );
      if (
        data.joiningStatus === "JOINED" &&
        (data.offerStatus !== "OFFER_ACCEPTED" || !data.actualJoiningDate)
      )
        throw new Error(
          "An accepted offer and actual joining date are required to mark joined.",
        );
      const updated = await tx.candidate.update({
        where: { id },
        data: {
          screeningStatus: "SHORTLISTED",
          interviewRound:
            data.offerStatus === "NOT_RELEASED"
              ? current.interviewRound
              : "OFFER",
          offerStatus: data.offerStatus,
          offerDate: data.offerDate
            ? new Date(data.offerDate)
            : current.offerDate,
          offeredSalary: data.offeredSalary ?? current.offeredSalary,
          joiningDate: data.joiningDate
            ? new Date(data.joiningDate)
            : current.joiningDate,
          joiningStatus: data.joiningStatus ?? current.joiningStatus,
          selectionStatus:
            data.joiningStatus === "NOT_JOINED"
              ? null
              : current.selectionStatus,
          actualJoiningDate: data.actualJoiningDate
            ? new Date(data.actualJoiningDate)
            : current.actualJoiningDate,
        },
      });
      if (data.joiningStatus === "JOINED") {
        await this.setCandidateStage(tx, current, "JOINED", userId, "Accepted offer and actual joining recorded");
      } else if (data.offerStatus !== "NOT_RELEASED" && current.currentStage !== "JOINED") {
        await this.setCandidateStage(tx, current, "OFFER", userId, "Offer workflow updated");
      }
      await tx.auditLog.create({
        data: {
          actionPerformed: "OFFER_CANDIDATE",
          oldValue: JSON.stringify({ offerStatus: current.offerStatus, offeredSalary: current.offeredSalary, offerDate: current.offerDate, joiningDate: current.joiningDate, joiningStatus: current.joiningStatus, actualJoiningDate: current.actualJoiningDate }),
          newValue: JSON.stringify({ offerStatus: updated.offerStatus, offeredSalary: updated.offeredSalary, offerDate: updated.offerDate, joiningDate: updated.joiningDate, joiningStatus: updated.joiningStatus, actualJoiningDate: updated.actualJoiningDate }),
          moduleAffected: "recruitment",
          recordIdAffected: id,
          userId,
          ipAddress: reqContext.ipAddress,
        },
      });
      await this.closeFilledRequisition(
        tx,
        candidate.requisitionId,
        userId,
        reqContext.ipAddress,
      );
      return tx.candidate.findUniqueOrThrow({where: {id}});
    });
    return updated;
  }
}

export const recruitmentService = new RecruitmentService();
