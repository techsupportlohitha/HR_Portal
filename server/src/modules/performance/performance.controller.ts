import { Request, Response } from 'express';
import { performanceService } from './performance.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export class PerformanceController {
  getMyReviews = async (req: AuthRequest, res: Response) => {
    try {
      const result = await performanceService.getMyReviews(req.user!.employeeId!);
      return sendSuccess(res, result, 'My reviews retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  };

  createReview = async (req: AuthRequest, res: Response) => {
    try {
      const result = await performanceService.createReview(req.body, req.user!.userId, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Performance review created');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  };

  updateReview = async (req: AuthRequest, res: Response) => {
    try {
      const result = await performanceService.updateReview(req.params.id as string, req.body, req.user!.userId, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Performance review updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  };

  deleteReview = async (req: AuthRequest, res: Response) => {
    try {
      await performanceService.deleteReview(req.params.id as string, req.user!.userId, { ipAddress: req.ip });
      return sendSuccess(res, null, 'Performance review deleted');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  };

  getReviews = async (req: AuthRequest, res: Response) => {
    try {
      const result = await performanceService.getReviews(req.user!, req.query);
      return sendSuccess(res, result, 'Reviews retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  };

  submitSelfAppraisal = async (req: AuthRequest, res: Response) => {
    try {
      const result = await performanceService.submitSelfAppraisal(req.params.id as string, req.body, req.user!, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Self appraisal submitted');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  };

  submitManagerAppraisal = async (req: AuthRequest, res: Response) => {
    try {
      const result = await performanceService.submitManagerAppraisal(req.params.id as string, req.body, req.user!, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Manager appraisal submitted');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  };

  submitHRAppraisal = async (req: AuthRequest, res: Response) => {
    try {
      const result = await performanceService.submitHRAppraisal(req.params.id as string, req.body, req.user!, { ipAddress: req.ip });
      return sendSuccess(res, result, 'HR appraisal submitted');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  };

  submitFinalApproval = async (req: AuthRequest, res: Response) => {
    try {
      const result = await performanceService.submitFinalApproval(req.params.id as string, req.body, req.user!, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Final approval submitted');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  };
}

export const performanceController = new PerformanceController();
