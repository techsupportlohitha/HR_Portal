// Regression: recruitment lifecycle, validation, and scheduling contracts.
// Found by /qa on 2026-10-10.
// Report: .gstack/qa-reports/recruitment-20261010/report.md
import request from "supertest";
import bcrypt from "bcryptjs";
import prisma from "../src/config/database";
import app from "../src/app";

const databaseUrl = new URL(
  process.env.DATABASE_URL || "postgresql://localhost/disabled",
);
const enabled =
  ["localhost", "127.0.0.1"].includes(databaseUrl.hostname) &&
  databaseUrl.pathname.startsWith("/hr_recruitment_qa_");
const suite = enabled ? describe : describe.skip;

suite(
  "Recruitment API journey with isolated HR and management identities",
  () => {
    jest.setTimeout(30000);
    const tokens: Record<string, string> = {};
    let departmentId: string;
    let interviewerId: string;
    const api = (role: string) => ({
      post: (path: string, body: any) =>
        request(app)
          .post("/api/recruitment" + path)
          .set("Authorization", `Bearer ${tokens[role]}`)
          .send(body),
      put: (path: string, body: any) =>
        request(app)
          .put("/api/recruitment" + path)
          .set("Authorization", `Bearer ${tokens[role]}`)
          .send(body),
      get: (path: string) =>
        request(app)
          .get("/api/recruitment" + path)
          .set("Authorization", `Bearer ${tokens[role]}`),
    });
    beforeAll(async () => {
      // Only this explicitly guarded, disposable database is reset between replays.
      await prisma.$executeRawUnsafe(
        'TRUNCATE TABLE "users", "employees", "departments", "requisitions", "candidates" CASCADE',
      );
      departmentId = (
        await prisma.department.create({ data: { name: "Recruitment QA" } })
      ).id;
      const password = "Disposable-QA-" + Date.now();
      for (const role of ["HR", "MANAGER", "EMPLOYEE"] as const) {
        const employee = await prisma.employee.create({
          data: {
            employeeCode: "QA-" + role,
            firstName: "QA",
            lastName: role,
            email: `${role.toLowerCase()}@recruitment.test`,
            designation: role,
            joiningDate: new Date(),
            departmentId,
          },
        });
        await prisma.user.create({
          data: {
            email: employee.email,
            role,
            employeeId: employee.id,
            password: await bcrypt.hash(password, 4),
          },
        });
        if (role === "MANAGER") interviewerId = employee.id;
        const login = await request(app)
          .post("/api/auth/login")
          .send({ email: employee.email, password });
        expect(login.status).toBe(200);
        tokens[role] = login.body.data.token;
      }
    });
    afterAll(async () => {
      await prisma.$disconnect();
    });

    it("enforces a management read-only override at the API", async () => {
      const reqId = await opening();
      const id = await schedule(reqId);
      const where = {
        role_module: { role: "MANAGER" as const, module: "recruitment" },
      };
      const previousPermission = await prisma.modulePermission.findUniqueOrThrow({where});
      await prisma.modulePermission.update({ where, data: { canEdit: false, canViewRestricted: false } });
      try {
        expect((await api("MANAGER").get("/interviews")).status).toBe(200);
        expect((await api("MANAGER").put(`/candidates/${id}/stage`, {stage: "HR_INTERVIEW", expectedStage: "TELEPHONIC"})).status).toBe(403);
        const pipeline = await api("MANAGER").get(`/pipeline?requisitionId=${reqId}`);
        expect(pipeline.status).toBe(200);
        const pipelineCandidate = pipeline.body.data.columns.flatMap((column: any) => column.items).find((candidate: any) => candidate.id === id);
        expect(pipelineCandidate).toBeDefined();
        for (const field of ["currentSalary", "expectedSalary", "offeredSalary", "recruitmentCost"])
          expect(pipelineCandidate).not.toHaveProperty(field);
        expect(
          (
            await api("MANAGER").put(`/candidates/${id}/interview`, {
              selectionStatus: "SELECTED",
            })
          ).status,
        ).toBe(403);
        expect(
          (await prisma.candidate.findUniqueOrThrow({ where: { id } }))
            .selectionStatus,
        ).toBeNull();
      } finally {
        await prisma.modulePermission.update({
          where,
          data: { canEdit: previousPermission.canEdit, canViewRestricted: previousPermission.canViewRestricted },
        });
      }
    });

    it("rejects invalid dates without changing a scheduled interview", async () => {
      const id = await schedule(await opening());
      const before = await prisma.candidate.findUniqueOrThrow({
        where: { id },
      });
      expect(
        (
          await api("HR").put(`/candidates/${id}/interview`, {
            interviewDate: "not-a-date",
          })
        ).status,
      ).toBe(400);
      expect(
        (await prisma.candidate.findUniqueOrThrow({ where: { id } }))
          .interviewDate,
      ).toEqual(before.interviewDate);
    });

    it("removes the screening endpoint without changing the candidate", async () => {
      const id = await schedule(await opening());
      const before = await prisma.candidate.findUniqueOrThrow({ where: { id } });
      expect(
        (
          await api("HR").put(`/candidates/${id}/screen`, {
            screeningStatus: "SCREENING_REJECTED",
            screeningNotes: "QA screen",
          })
        ).status,
      ).toBe(404);
      expect(
        (
          await api("HR").put(`/candidates/${id}/screen`, {
            screeningStatus: "SHORTLISTED",
          })
        ).status,
      ).toBe(404);
      const candidate = await prisma.candidate.findUniqueOrThrow({
        where: { id },
      });
      expect(candidate).toEqual(before);
    });

    it("reopens automatically filled vacancies when capacity increases and refuses capacity below selections", async () => {
      const reqId = await opening(1);
      const id = await schedule(reqId);
      expect(
        (
          await api("MANAGER").put(`/candidates/${id}/interview`, {
            selectionStatus: "SELECTED",
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await api("HR").put(`/requisitions/${reqId}`, {
            numberOfVacancies: 2,
          })
        ).status,
      ).toBe(200);
      expect(
        (await prisma.requisition.findUniqueOrThrow({ where: { id: reqId } }))
          .status,
      ).toBe("REQUIREMENT");
      const second = await schedule(reqId);
      expect(
        (
          await api("MANAGER").put(`/candidates/${second}/interview`, {
            selectionStatus: "SELECTED",
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await api("HR").put(`/requisitions/${reqId}`, {
            numberOfVacancies: 1,
          })
        ).status,
      ).toBe(400);
      expect(
        (await prisma.requisition.findUniqueOrThrow({ where: { id: reqId } }))
          .numberOfVacancies,
      ).toBe(2);
    });

    const opening = async (count = 1) => {
      const res = await api("HR").post("/requisitions", {
        positionTitle: "QA Developer",
        location: "QA Office",
        departmentId,
        numberOfVacancies: count,
      });
      expect(res.status).toBe(200);
      return res.body.data.id;
    };
    let scheduleSequence = 0;
    test("stage API persists history, rejects stale edits, and scopes pipeline counts", async () => {
      const reqId = await opening(2);
      const creation = await api("HR").post("/candidates", {candidateName: "Pipeline QA", requisitionId: reqId});
      expect(creation.status).toBe(200);
      const id = creation.body.data.id;
      expect(creation.body.data.currentStage).toBe("TELEPHONIC");
      expect((await api("HR").get("/requisitions")).body.data.find((opening: any) => opening.id === reqId).newApplicationCount).toBe(1);
      expect((await api("HR").put(`/candidates/${id}/stage`, {stage: "TELEPHONIC", expectedStage: "SCREENING"})).status).toBe(400);
      const transitions = await Promise.all([
        api("HR").put(`/candidates/${id}/stage`, {stage: "HR_INTERVIEW", expectedStage: "TELEPHONIC"}),
        api("HR").put(`/candidates/${id}/stage`, {stage: "HR_INTERVIEW", expectedStage: "TELEPHONIC"}),
      ]);
      expect(transitions.map(result => result.status).sort()).toEqual([200, 409]);
      const candidate = await prisma.candidate.findUniqueOrThrow({where: {id}, include: {stageHistory: true}});
      expect(candidate.stageHistory).toHaveLength(1);
      expect(candidate.currentStage).toBe("HR_INTERVIEW");
      expect(candidate.stageHistory[0]).toMatchObject({fromStage: "TELEPHONIC", toStage: "HR_INTERVIEW"});
      expect((await api("HR").get("/requisitions")).body.data.find((opening: any) => opening.id === reqId).newApplicationCount).toBe(0);
      expect((await api("HR").put(`/candidates/${id}/stage`, {stage: "MANAGEMENT", expectedStage: candidate.currentStage, reason: "Skip assessment"})).status).toBe(400);
      const pipeline = await api("HR").get(`/pipeline?requisitionId=${reqId}`);
      expect(pipeline.status).toBe(200);
      expect(pipeline.body.data.columns.reduce((sum: number, column: any) => sum + column.total, 0)).toBe(1);
      expect(pipeline.body.data.columns.find((column: any) => column.stage === candidate.currentStage).items[0].id).toBe(id);
      const detail = await api("HR").get(`/requisitions/${reqId}/candidates`);
      expect(detail.body.data[0].stageHistory).toHaveLength(1);
      expect((await api("EMPLOYEE").put(`/candidates/${id}/stage`, {stage: "TELEPHONIC", expectedStage: candidate.currentStage, reason: "Invalid access"})).status).toBe(403);
    });
    const submitCurrentFeedback = async (candidateId: string) => {
      const candidate = await prisma.candidate.findUniqueOrThrow({where: {id: candidateId}});
      const appointment = await prisma.interview.findFirst({where: {candidateId, round: candidate.currentStage, status: {not: "CANCELLED"}}, orderBy: {createdAt: "desc"}});
      // Legacy round changes can precede appointment creation; add the same-round
      // appointment so the journey exercises the submitted evaluation contract.
      const interview = appointment || (await api("HR").post(`/candidates/${candidateId}/interviews`, {
        round: candidate.currentStage, startsAt: new Date(Date.UTC(2028, 0, 1 + scheduleSequence++, 9)).toISOString(),
        endsAt: new Date(Date.UTC(2028, 0, scheduleSequence, 10)).toISOString(),
      })).body.data;
      expect((await api("HR").put(`/interviews/${interview.id}/status`, {status: "COMPLETED"})).status).toBe(200);
      expect((await api("HR").put(`/interviews/${interview.id}/feedback`, {feedback: "QA submitted evaluation", score: 8, recommendation: "YES"})).status).toBe(200);
    };
    const schedule = async (id: string) => {
      const interviewDate = new Date(
        Date.UTC(2027, 0, 1 + scheduleSequence++, 9),
      ).toISOString();
      const res = await api("HR").post("/candidates", {
        candidateName: "Synthetic Candidate",
        email: "candidate@recruitment.test",
        requisitionId: id,
        interviewDate,
        interviewRound: "HR_INTERVIEW",
        interviewerId,
        interviewLocation: "QA Meeting",
      });
      expect(res.status).toBe(200);
      expect(res.body.data.currentStage).toBe("HR_INTERVIEW");
      return res.body.data.id;
    };
    test("telephonic intake cannot create an interview appointment", async () => {
      const reqId = await opening(2);
      const startsAt = "2029-01-01T09:00:00.000Z";
      const endsAt = "2029-01-01T10:00:00.000Z";
      const scheduledApplication = await api("HR").post("/candidates", {
        candidateName: "Blocked telephonic appointment",
        requisitionId: reqId,
        interviewRound: "TELEPHONIC",
        interviewDate: startsAt,
      });
      expect(scheduledApplication.status).toBe(400);
      expect(await prisma.candidate.count({ where: { requisitionId: reqId } })).toBe(0);

      const creation = await api("HR").post("/candidates", {
        candidateName: "Telephonic intake",
        requisitionId: reqId,
      });
      expect(creation.status).toBe(200);
      const id = creation.body.data.id;
      expect(creation.body.data.currentStage).toBe("TELEPHONIC");
      expect((await api("HR").post(`/candidates/${id}/interviews`, {
        round: "TELEPHONIC", startsAt, endsAt,
      })).status).toBe(400);
      expect(await prisma.interview.count({ where: { candidateId: id } })).toBe(0);
      expect((await prisma.candidate.findUniqueOrThrow({ where: { id } })).currentStage).toBe("TELEPHONIC");
    });
    test("HR schedules, management progresses rounds, selection fills the vacancy and updates dashboard", async () => {
      const reqId = await opening();
      const id = await schedule(reqId);
      const beforeDashboard = await request(app)
        .get("/api/dashboard/stats")
        .set("Authorization", `Bearer ${tokens.MANAGER}`);
      for (const interviewRound of [
        "TECHNICAL",
        "MANAGEMENT",
      ]) {
        await submitCurrentFeedback(id);
        const result = await api("MANAGER").put(`/candidates/${id}/interview`, {
          interviewRound,
        });
        expect(result.status).toBe(200);
      }
      expect(
        (
          await api("MANAGER").put(`/candidates/${id}/interview`, {
            selectionStatus: "SELECTED",
          })
        ).status,
      ).toBe(200);
      expect(
        (await prisma.requisition.findUniqueOrThrow({ where: { id: reqId } }))
          .status,
      ).toBe("CLOSED");
      const list = await api("HR").get("/requisitions");
      expect(list.body.data.find((r: any) => r.id === reqId)).toMatchObject({
        status: "CLOSED",
        selectedCount: 1,
      });
      const dashboard = await request(app)
        .get("/api/dashboard/stats")
        .set("Authorization", `Bearer ${tokens.MANAGER}`);
      expect(dashboard.status).toBe(200);
      expect(dashboard.body.data.headline.openVacancies).toBe(
        beforeDashboard.body.data.headline.openVacancies - 1,
      );
    });
    test("one offer does not close an opening with two vacancies", async () => {
      const reqId = await opening(2);
      const id = await schedule(reqId);
      await submitCurrentFeedback(id);
      expect(
        (
          await api("MANAGER").put(`/candidates/${id}/interview`, {
            selectionStatus: "SELECTED",
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await api("HR").put(`/candidates/${id}/offer`, {
            offerStatus: "RELEASED",
          })
        ).status,
      ).toBe(200);
      expect(
        (await prisma.requisition.findUniqueOrThrow({ where: { id: reqId } }))
          .status,
      ).not.toBe("CLOSED");
    });
    test("rescheduling updates the date, panel and venue without creating another candidate", async () => {
      const reqId = await opening();
      const id = await schedule(reqId);
      const res = await api("HR").put(`/candidates/${id}/interview`, {
        interviewDate: "2026-11-02T10:30:00.000Z",
        interviewLocation: "QA Rescheduled",
      });
      expect(res.status).toBe(200);
      const stored = await prisma.candidate.findUniqueOrThrow({
        where: { id },
      });
      expect(stored.interviewDate?.toISOString()).toBe(
        "2026-11-02T10:30:00.000Z",
      );
      expect(stored.interviewLocation).toBe("QA Rescheduled");
      expect(
        await prisma.candidate.count({ where: { requisitionId: reqId } }),
      ).toBe(1);
    });
    test("creates a separate interview appointment, protects salary in register results, and preserves reschedule history", async () => {
      const reqId = await opening();
      const candidateId = await schedule(reqId);
      const initialNotice = await prisma.notification.findFirst({ where: { recipientId: interviewerId, triggerEvent: `interview-scheduled:${candidateId}` } });
      expect(initialNotice?.message).toContain("Synthetic Candidate");
      await submitCurrentFeedback(candidateId);
      const create = await api("HR").post(
        `/candidates/${candidateId}/interviews`,
        {
          round: "TECHNICAL",
          reason: "Technical assessment follows HR interview for this role",
          startsAt: "2026-11-04T09:00:00.000Z",
          endsAt: "2026-11-04T10:00:00.000Z",
          timezone: "Asia/Kolkata",
          mode: "VIDEO",
          interviewerId,
          location: "Video call",
        },
      );
      expect(create.status).toBe(200);
      const interviewId = create.body.data.id;
      const roundNotice = await prisma.notification.findFirst({ where: { recipientId: interviewerId, triggerEvent: `interview-scheduled:${interviewId}` } });
      expect(roundNotice?.message).toContain("TECHNICAL interview scheduled");
      expect(
        (
          await prisma.interview.findUniqueOrThrow({
            where: { id: interviewId },
          })
        ).round,
      ).toBe("TECHNICAL");

      const permissionKey = {
        role_module: { role: "MANAGER" as const, module: "recruitment" },
      };
      const permission = await prisma.modulePermission.findUniqueOrThrow({
        where: permissionKey,
      });
      await prisma.modulePermission.update({
        where: permissionKey,
        data: { canViewRestricted: false },
      });
      try {
        const managerCandidates = await api("MANAGER").get("/candidates");
        expect(managerCandidates.status).toBe(200);
        expect(
          managerCandidates.body.data.items.find(
            (candidate: any) => candidate.id === candidateId,
          ),
        ).not.toHaveProperty("expectedSalary");
      } finally {
        await prisma.modulePermission.update({
          where: permissionKey,
          data: { canViewRestricted: permission.canViewRestricted },
        });
      }

      const reschedule = await api("HR").put(`/interviews/${interviewId}/schedule`, {
            round: "TECHNICAL",
            startsAt: "2026-11-04T11:00:00.000Z",
            endsAt: "2026-11-04T12:30:00.000Z",
            timezone: "Asia/Kolkata",
            mode: "VIDEO",
            interviewerId,
            location: "New video link",
            reason: "Panel availability",
          });
      expect(reschedule.status).toBe(200);
      const rescheduleNotice = await prisma.notification.findFirst({ where: { recipientId: interviewerId, triggerEvent: `interview-rescheduled:${reschedule.body.data.id}` } });
      expect(rescheduleNotice?.message).toContain("interview rescheduled");
      const history = await api("HR").get(
        "/requisitions/" + reqId + "/candidates",
      );
      const rescheduleLog = history.body.data.find((candidate: any) => candidate.id === candidateId).activity.find((event: any) => event.actionPerformed === "RESCHEDULE_INTERVIEW");
      expect(JSON.parse(rescheduleLog.oldValue)).toMatchObject({ round: "TECHNICAL", startsAt: "2026-11-04T09:00:00.000Z" });
      expect(JSON.parse(rescheduleLog.newValue)).toMatchObject({ round: "TECHNICAL", startsAt: "2026-11-04T11:00:00.000Z", reason: "Panel availability" });
      expect(
        history.body.data.find((candidate: any) => candidate.id === candidateId)
          .interviews,
      ).toHaveLength(3);
      expect(
        (
          await prisma.interview.findUniqueOrThrow({
            where: { id: interviewId },
          })
        ).status,
      ).toBe("CANCELLED");
    });
    test("rejects interviewer conflicts and records completion feedback", async () => {
      const reqId = await opening(2);
      const first = await schedule(reqId);
      const second = await schedule(reqId);
      await submitCurrentFeedback(first);
      await submitCurrentFeedback(second);
      const make = (candidateId: string) =>
        api("HR").post(`/candidates/${candidateId}/interviews`, {
          round: "HR_INTERVIEW",
          startsAt: "2026-11-05T09:00:00.000Z",
          endsAt: "2026-11-05T10:00:00.000Z",
          interviewerId,
        });
      const scheduled = await make(first);
      expect(scheduled.status).toBe(200);
      expect((await make(second)).status).toBe(400);
      const interviewId = scheduled.body.data.id;
      expect(
        (
          await api("HR").put(`/interviews/${interviewId}/status`, {
            status: "COMPLETED",
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await api("MANAGER").put(`/interviews/${interviewId}/feedback`, {
            feedback: "Strong technical fundamentals",
            score: 9,
            recommendation: "YES",
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await prisma.interview.findUniqueOrThrow({
            where: { id: interviewId },
          })
        ).score,
      ).toBe(9);
    });
    test.each([0, -1, 1.5])(
      "invalid vacancy count %s is rejected for editing without state change",
      async (numberOfVacancies) => {
        const id = await opening();
        expect(
          (await api("HR").put(`/requisitions/${id}`, { numberOfVacancies }))
            .status,
        ).toBe(400);
        expect(
          (await prisma.requisition.findUniqueOrThrow({ where: { id } }))
            .numberOfVacancies,
        ).toBe(1);
      },
    );
    test("reject and restore in-progress preserve a valid candidate record", async () => {
      const reqId = await opening();
      const id = await schedule(reqId);
      expect(
        (
          await api("MANAGER").put(`/candidates/${id}/interview`, {
            selectionStatus: "SELECTION_REJECTED",
          })
        ).status,
      ).toBe(200);
      expect(
        (await prisma.candidate.findUniqueOrThrow({ where: { id } }))
          .selectionStatus,
      ).toBe("SELECTION_REJECTED");
      expect(
        (
          await api("MANAGER").put(`/candidates/${id}/interview`, {
            selectionStatus: null,
          })
        ).status,
      ).toBe(200);
      expect(
        (await prisma.candidate.findUniqueOrThrow({ where: { id } }))
          .selectionStatus,
      ).toBeNull();
    });
    test("invalid interview round is rejected without changing the round", async () => {
      const id = await schedule(await opening());
      expect(
        (
          await api("HR").put(`/candidates/${id}/interview`, {
            interviewRound: "INVALID_ROUND",
          })
        ).status,
      ).toBe(400);
      expect(
        (await prisma.candidate.findUniqueOrThrow({ where: { id } }))
          .interviewRound,
      ).toBe("HR_INTERVIEW");
    });
    test("closed requisitions cannot receive new scheduled candidates", async () => {
      const reqId = await opening();
      expect(
        (
          await api("HR").put(`/requisitions/${reqId}/status`, {
            status: "CLOSED",
          })
        ).status,
      ).toBe(200);
      const res = await api("HR").post("/candidates", {
        candidateName: "Blocked QA",
        requisitionId: reqId,
      });
      expect(res.status).toBe(400);
      expect(
        await prisma.candidate.count({ where: { requisitionId: reqId } }),
      ).toBe(0);
    });
    test("missing identity and employee access are denied", async () => {
      expect(
        (await request(app).get("/api/recruitment/interviews")).status,
      ).toBe(401);
      expect((await api("EMPLOYEE").get("/interviews")).status).toBe(403);
      expect(
        (
          await api("EMPLOYEE").post("/requisitions", {
            positionTitle: "Denied",
            location: "QA",
            departmentId,
            numberOfVacancies: 1,
          })
        ).status,
      ).toBe(403);
    });
    test("concurrent management edits preserve both feedback and rescheduling", async () => {
      const id = await schedule(await opening());
      const results = await Promise.all([
        api("MANAGER").put(`/candidates/${id}/interview`, {
          interviewFeedback: "QA panel feedback",
        }),
        api("HR").put(`/candidates/${id}/interview`, {
          interviewDate: "2026-11-03T09:00:00.000Z",
        }),
      ]);
      expect(results.map((result) => result.status)).toEqual([200, 200]);
      const saved = await prisma.candidate.findUniqueOrThrow({ where: { id } });
      expect(saved.interviewFeedback).toBe("QA panel feedback");
      expect(saved.interviewDate?.toISOString()).toBe(
        "2026-11-03T09:00:00.000Z",
      );
    });
    test("concurrent selections cannot overfill a single vacancy", async () => {
      const reqId = await opening();
      const ids = [await schedule(reqId), await schedule(reqId)];
      const results = await Promise.all(
        ids.map((id) =>
          api("MANAGER").put(`/candidates/${id}/interview`, {
            selectionStatus: "SELECTED",
          }),
        ),
      );
      expect(results.map((result) => result.status).sort()).toEqual([200, 400]);
      expect(
        await prisma.candidate.count({
          where: { requisitionId: reqId, selectionStatus: "SELECTED" },
        }),
      ).toBe(1);
    });
    test("declining releases reserved capacity and re-releasing a fresh offer reserves it again", async () => {
      const reqId = await opening();
      const id = await schedule(reqId);
      await submitCurrentFeedback(id);
      expect(
        (
          await api("MANAGER").put(`/candidates/${id}/interview`, {
            selectionStatus: "SELECTED",
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await api("MANAGER").put(`/candidates/${id}/offer`, {
            offerStatus: "RELEASED",
            offeredSalary: 50000,
            offerDate: "2026-11-01T00:00:00Z",
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await api("MANAGER").put(`/candidates/${id}/offer`, {
            offerStatus: "OFFER_ACCEPTED",
            joiningDate: "2026-11-10T00:00:00Z",
          })
        ).status,
      ).toBe(200);
      const accepted = await prisma.candidate.findUniqueOrThrow({
        where: { id },
      });
      expect(accepted.offeredSalary?.toString()).toBe("50000");
      expect(accepted.joiningDate?.toISOString()).toBe(
        "2026-11-10T00:00:00.000Z",
      );
      const offerHistory = await api("HR").get(`/requisitions/${reqId}/candidates`);
      const offerChanges = offerHistory.body.data.find((row: any) => row.id === id).activity.filter((event: any) => event.actionPerformed === "OFFER_CANDIDATE");
      expect(offerChanges).toHaveLength(2);
      expect(offerChanges.map((event: any) => JSON.parse(event.newValue).offerStatus)).toContain("OFFER_ACCEPTED");
      expect(offerChanges.every((event: any) => !event.newValue.includes("50000"))).toBe(true);
      expect(
        (
          await api("HR").put(`/candidates/${id}/offer`, {
            offerStatus: "OFFER_DECLINED",
          })
        ).status,
      ).toBe(200);
      expect(
        (await prisma.requisition.findUniqueOrThrow({ where: { id: reqId } }))
          .status,
      ).not.toBe("CLOSED");
      const list = await api("HR").get("/requisitions");
      expect(
        list.body.data.find((r: any) => r.id === reqId).selectedCount,
      ).toBe(0);
      expect((await api("HR").put(`/candidates/${id}/offer`, {offerStatus: "OFFER_ACCEPTED"})).status).toBe(400);
      expect((await api("HR").put(`/candidates/${id}/offer`, {offerStatus: "RELEASED"})).status).toBe(200);
      expect((await prisma.requisition.findUniqueOrThrow({where: {id: reqId}})).status).toBe("CLOSED");
      expect((await prisma.candidate.findUniqueOrThrow({where: {id}})).currentStage).toBe("OFFER");
    });
    test("a manually closed requisition stays closed when a candidate is put on hold", async () => {
      const reqId = await opening();
      const id = await schedule(reqId);
      expect(
        (
          await api("HR").put(`/requisitions/${reqId}/status`, {
            status: "CLOSED",
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await api("MANAGER").put(`/candidates/${id}/interview`, {
            selectionStatus: "SELECTION_ON_HOLD",
          })
        ).status,
      ).toBe(200);
      expect(
        (await prisma.requisition.findUniqueOrThrow({ where: { id: reqId } }))
          .status,
      ).toBe("CLOSED");
    });
    test("draft feedback stays distinct from submitted evaluation and corrections preserve an audit revision", async () => {
      const id = await schedule(await opening());
      const interview = await prisma.interview.findFirstOrThrow({
        where: { candidateId: id },
      });
      expect(
        (
          await api("HR").put(`/interviews/${interview.id}/status`, {
            status: "COMPLETED",
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await api("HR").put(`/interviews/${interview.id}/feedback`, {
            feedback: "Draft evaluation",
            score: 7,
            draft: true,
          })
        ).status,
      ).toBe(200);
      const draft = await prisma.interview.findUniqueOrThrow({
        where: { id: interview.id },
      });
      expect(draft.feedback).toBeNull();
      expect(draft.draftFeedback).toBe("Draft evaluation");
      expect(
        (
          await api("HR").put(`/interviews/${interview.id}/feedback`, {
            feedback: "Submitted evaluation",
            score: 8,
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await api("HR").put(`/interviews/${interview.id}/feedback`, {
            feedback: "Changed evaluation",
            score: 9,
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await api("HR").put(`/interviews/${interview.id}/feedback`, {
            feedback: "Changed evaluation",
            score: 9,
            revisionReason: "Corrected interview notes",
          })
        ).status,
      ).toBe(200);
      const saved = await prisma.interview.findUniqueOrThrow({
        where: { id: interview.id },
      });
      expect(saved.draftFeedback).toBeNull();
      expect(saved.feedbackSubmittedAt).not.toBeNull();
      const audit = await prisma.auditLog.findMany({
        where: {
          recordIdAffected: id,
          actionPerformed: "SUBMIT_INTERVIEW_FEEDBACK",
        },
        orderBy: { createdAt: "desc" },
      });
      expect(JSON.parse(audit[0].oldValue!).feedback).toBe(
        "Submitted evaluation",
      );
    });
    test("joining requires acceptance and records the actual date; joined outcome cannot be reverted", async () => {
      const reqId = await opening();
      const id = await schedule(reqId);
      await submitCurrentFeedback(id);
      expect(
        (
          await api("HR").put(`/candidates/${id}/offer`, {
            offerStatus: "OFFER_ACCEPTED",
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await api("MANAGER").put(`/candidates/${id}/interview`, {
            selectionStatus: "SELECTED",
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await api("HR").put(`/candidates/${id}/offer`, {
            offerStatus: "RELEASED",
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await api("HR").put(`/candidates/${id}/offer`, {
            offerStatus: "OFFER_ACCEPTED",
            joiningStatus: "JOINED",
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await api("HR").put(`/candidates/${id}/offer`, {
            offerStatus: "OFFER_ACCEPTED",
            joiningStatus: "JOINED",
            actualJoiningDate: "2026-12-01T00:00:00Z",
          })
        ).status,
      ).toBe(200);
      expect(
        (await prisma.candidate.findUniqueOrThrow({ where: { id } }))
          .joiningStatus,
      ).toBe("JOINED");
      expect(
        (
          await api("HR").put(`/candidates/${id}/offer`, {
            offerStatus: "OFFER_ACCEPTED",
            joiningStatus: "NOT_JOINED",
          })
        ).status,
      ).toBe(400);
      expect(
        (await prisma.requisition.findUniqueOrThrow({ where: { id: reqId } }))
          .status,
      ).toBe("CLOSED");
    });
    test("failure to join releases capacity before joining is recorded", async () => {
      const reqId = await opening();
      const id = await schedule(reqId);
      await submitCurrentFeedback(id);
      expect((await api("MANAGER").put(`/candidates/${id}/interview`, {selectionStatus: "SELECTED"})).status).toBe(200);
      expect((await api("HR").put(`/candidates/${id}/offer`, {offerStatus: "RELEASED"})).status).toBe(200);
      expect((await api("HR").put(`/candidates/${id}/offer`, {offerStatus: "OFFER_ACCEPTED", joiningStatus: "NOT_JOINED"})).status).toBe(200);
      expect((await prisma.requisition.findUniqueOrThrow({where: {id: reqId}})).status).not.toBe("CLOSED");
      expect((await prisma.candidate.findUniqueOrThrow({where: {id}})).currentStage).toBe("OFFER");
    });
    test("first appointment conflicts are rejected and cancellation requires a reason", async () => {
      const reqId = await opening(2);
      const id = await schedule(reqId);
      const appointment = await prisma.interview.findFirstOrThrow({
        where: { candidateId: id },
      });
      expect(
        (
          await api("HR").post("/candidates", {
            candidateName: "Conflicting synthetic candidate",
            requisitionId: reqId,
            interviewDate: appointment.startsAt.toISOString(),
            interviewerId,
            interviewRound: "HR_INTERVIEW",
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await api("HR").put(`/interviews/${appointment.id}/status`, {
            status: "CANCELLED",
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await api("HR").put(`/interviews/${appointment.id}/status`, {
            status: "CANCELLED",
            reason: "Synthetic QA cancellation",
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await api("HR").put(`/interviews/${appointment.id}/status`, {
            status: "SCHEDULED",
          })
        ).status,
      ).toBe(400);
      expect(
        (await prisma.candidate.findUniqueOrThrow({ where: { id } }))
          .selectionStatus,
      ).toBeNull();
    });
  },
);
