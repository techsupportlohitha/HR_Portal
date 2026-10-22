import { Role } from "@prisma/client";
import { permissionService } from "../permissions/permission.service";
import { sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/auth.middleware";
import { Router } from "express";
import { recruitmentController } from "./recruitment.controller";
import {
  authenticate,
  requirePermission,
} from "../../middleware/auth.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import {
  candidateStageSchema,
  createRequisitionSchema,
  updateRequisitionSchema,
  updateRequisitionStatusSchema,
  createCandidateSchema,
  interviewCandidateSchema,
  offerCandidateSchema,
  createInterviewSchema,
  updateInterviewStatusSchema,
  interviewFeedbackSchema,
  updateInterviewScheduleSchema,
} from "./recruitment.schema";

const router = Router();

router.use(authenticate);
router.use(async (req: AuthRequest, res, next) => {
  try {
    const sensitive = [
      "currentSalary",
      "expectedSalary",
      "offeredSalary",
      "recruitmentCost",
    ];
    if (
      sensitive.some((field) =>
        Object.prototype.hasOwnProperty.call(req.body || {}, field),
      ) &&
      !(await permissionService.canViewRestricted(
        req.user!.role as Role,
        "recruitment",
      ))
    ) {
      return sendError(
        res,
        "You do not have permission to edit compensation.",
        403,
      );
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Requisitions
router.post(
  "/requisitions",
  requirePermission("recruitment", "add"),
  validateRequest({ body: createRequisitionSchema }),
  (req, res) => recruitmentController.createRequisition(req, res),
);
router.get(
  "/requisitions",
  requirePermission("recruitment", "view"),
  (req, res) => recruitmentController.getRequisitions(req, res),
);
router.put(
  "/requisitions/:id",
  requirePermission("recruitment", "edit"),
  validateRequest({ body: updateRequisitionSchema }),
  (req, res) => recruitmentController.updateRequisition(req, res),
);
router.put(
  "/requisitions/:id/status",
  requirePermission("recruitment", "edit"),
  validateRequest({ body: updateRequisitionStatusSchema }),
  (req, res) => recruitmentController.updateRequisitionStatus(req, res),
);
router.delete("/requisitions/:id", requirePermission("recruitment", "delete"), (req, res) => recruitmentController.deleteRequisition(req, res));

// Interviews
router.get("/pipeline", requirePermission("recruitment", "view"), (req, res) => recruitmentController.getPipeline(req, res));
router.put("/candidates/:id/stage", requirePermission("recruitment", "edit"), validateRequest({body: candidateStageSchema}), (req, res) => recruitmentController.transitionCandidateStage(req, res));
router.get(
  "/interviews",
  requirePermission("recruitment", "view"),
  (req, res) => recruitmentController.getAllInterviews(req, res),
);
router.get(
  "/candidates",
  requirePermission("recruitment", "view"),
  (req, res) => recruitmentController.getCandidates(req, res),
);
router.post(
  "/candidates/:id/interviews",
  requirePermission("recruitment", "add"),
  validateRequest({ body: createInterviewSchema }),
  (req, res) => recruitmentController.createInterview(req, res),
);
router.put(
  "/interviews/:interviewId/schedule",
  requirePermission("recruitment", "edit"),
  validateRequest({ body: updateInterviewScheduleSchema }),
  (req, res) => recruitmentController.rescheduleInterview(req, res),
);
router.put(
  "/interviews/:interviewId/status",
  requirePermission("recruitment", "edit"),
  validateRequest({ body: updateInterviewStatusSchema }),
  (req, res) => recruitmentController.updateInterviewStatus(req, res),
);
router.put(
  "/interviews/:interviewId/feedback",
  requirePermission("recruitment", "edit"),
  validateRequest({ body: interviewFeedbackSchema }),
  (req, res) => recruitmentController.submitInterviewFeedback(req, res),
);

// Candidates
router.post(
  "/candidates",
  requirePermission("recruitment", "add"),
  validateRequest({ body: createCandidateSchema }),
  (req, res) => recruitmentController.createCandidate(req, res),
);
router.get(
  "/requisitions/:reqId/candidates",
  requirePermission("recruitment", "view"),
  (req, res) => recruitmentController.getCandidatesByRequisition(req, res),
);
router.put(
  "/candidates/:id/interview",
  requirePermission("recruitment", "edit"),
  validateRequest({ body: interviewCandidateSchema }),
  (req, res) => recruitmentController.interviewCandidate(req, res),
);
router.put(
  "/candidates/:id/offer",
  requirePermission("recruitment", "edit"),
  validateRequest({ body: offerCandidateSchema }),
  (req, res) => recruitmentController.offerCandidate(req, res),
);
router.delete("/candidates/:id", requirePermission("recruitment", "delete"), (req, res) => recruitmentController.deleteCandidate(req, res));

export default router;
