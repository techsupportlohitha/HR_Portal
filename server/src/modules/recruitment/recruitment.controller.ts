import { Request, Response } from "express";
import { recruitmentService } from "./recruitment.service";
import { sendSuccess, sendError } from "../../utils/response";
import { Role } from "@prisma/client";
import { AuthRequest } from "../../middleware/auth.middleware";

export class RecruitmentController {
  async getPipeline(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await recruitmentService.getPipeline(req.user!, req.query), "Pipeline retrieved"); }
    catch (error: any) { return sendError(res, error.message, 400); }
  }
  async transitionCandidateStage(req: AuthRequest, res: Response) {
    try {
      const result = await recruitmentService.transitionCandidateStage(req.params.id as string, req.body, req.user!.userId, {ipAddress: req.ip});
      return sendSuccess(res, (await recruitmentService.protectCandidateCompensation([result], req.user!.role as Role))[0], "Candidate stage updated");
    } catch (error: any) { return sendError(res, error.message, error.message.includes("stage changed") ? 409 : 400); }
  }
  async createRequisition(req: AuthRequest, res: Response) {
    try {
      const result = await recruitmentService.createRequisition(
        req.body,
        req.user!.employeeId!,
        req.user!.userId,
        { ipAddress: req.ip },
      );
      return sendSuccess(res, result, "Requisition created successfully");
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateRequisition(req: AuthRequest, res: Response) {
    try {
      const result = await recruitmentService.updateRequisition(
        req.params.id as string,
        req.body,
        req.user!.userId,
        { ipAddress: req.ip },
      );
      return sendSuccess(res, result, "Requisition updated successfully");
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getRequisitions(req: AuthRequest, res: Response) {
    try {
      const result = await recruitmentService.getRequisitions(
        req.user!,
        req.query,
      );
      return sendSuccess(res, result, "Requisitions retrieved successfully");
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  async updateRequisitionStatus(req: AuthRequest, res: Response) {
    try {
      const result = await recruitmentService.updateRequisitionStatus(
        req.params.id as string,
        req.body,
        req.user!.userId,
        { ipAddress: req.ip },
      );
      return sendSuccess(res, result, "Requisition status updated");
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async deleteRequisition(req: AuthRequest, res: Response) {
    try {
      const result = await recruitmentService.deleteRequisition(req.params.id as string, req.user!.userId, { ipAddress: req.ip });
      return sendSuccess(res, result, "Opening and its candidates deleted");
    } catch (error: any) {
      const status = error.message === "Requisition not found." ? 404 : error.message.includes("Unauthorized") ? 403 : 400;
      return sendError(res, error.message, status);
    }
  }

  async deleteCandidate(req: AuthRequest, res: Response) {
    try {
      const result = await recruitmentService.deleteCandidate(req.params.id as string, req.user!.userId, { ipAddress: req.ip });
      return sendSuccess(res, result, "Candidate deleted");
    } catch (error: any) {
      const status = error.message === "Candidate not found." ? 404 : error.message.includes("Unauthorized") ? 403 : 400;
      return sendError(res, error.message, status);
    }
  }

  async createCandidate(req: AuthRequest, res: Response) {
    try {
      const result = await recruitmentService.createCandidate(
        req.body,
        req.user!.userId,
        { ipAddress: req.ip },
      );
      return sendSuccess(
        res,
        (
          await recruitmentService.protectCandidateCompensation(
            [result],
            req.user!.role as Role,
          )
        )[0],
        "Candidate created successfully",
      );
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getAllInterviews(req: AuthRequest, res: Response) {
    try {
      const data = await recruitmentService.getAllInterviews(req.user!);
      return sendSuccess(res, data, "Interviews retrieved successfully");
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getCandidates(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(
        res,
        await recruitmentService.getCandidates(req.user!, req.query),
        "Candidates retrieved successfully",
      );
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async createInterview(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(
        res,
        await recruitmentService.createInterview(
          req.params.id as string,
          req.body,
          req.user!.userId,
          { ipAddress: req.ip },
        ),
        "Interview scheduled",
      );
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async rescheduleInterview(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(
        res,
        await recruitmentService.rescheduleInterview(
          req.params.interviewId as string,
          req.body,
          req.user!.userId,
          { ipAddress: req.ip },
        ),
        "Interview rescheduled",
      );
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateInterviewStatus(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(
        res,
        await recruitmentService.updateInterviewStatus(
          req.params.interviewId as string,
          req.body,
          req.user!.userId,
          { ipAddress: req.ip },
        ),
        "Interview status updated",
      );
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async submitInterviewFeedback(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(
        res,
        await recruitmentService.submitInterviewFeedback(
          req.params.interviewId as string,
          req.body,
          req.user!.userId,
          { ipAddress: req.ip },
        ),
        "Interview feedback submitted",
      );
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getCandidatesByRequisition(req: AuthRequest, res: Response) {
    try {
      const result = await recruitmentService.getCandidatesByRequisition(
        req.params.reqId as string,
        req.user!,
      );
      return sendSuccess(res, result, "Candidates retrieved successfully");
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  async interviewCandidate(req: AuthRequest, res: Response) {
    try {
      const result = await recruitmentService.interviewCandidate(
        req.params.id as string,
        req.body,
        req.user!.userId,
        { ipAddress: req.ip },
      );
      return sendSuccess(
        res,
        (
          await recruitmentService.protectCandidateCompensation(
            [result],
            req.user!.role as Role,
          )
        )[0],
        "Candidate interviewed successfully",
      );
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async offerCandidate(req: AuthRequest, res: Response) {
    try {
      const result = await recruitmentService.offerCandidate(
        req.params.id as string,
        req.body,
        req.user!.userId,
        { ipAddress: req.ip },
      );
      return sendSuccess(
        res,
        (
          await recruitmentService.protectCandidateCompensation(
            [result],
            req.user!.role as Role,
          )
        )[0],
        "Candidate offer status updated successfully",
      );
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}

export const recruitmentController = new RecruitmentController();
