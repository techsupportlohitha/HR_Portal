import { Request, Response } from 'express';
import { travelService } from './travel.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export class TravelController {
  async createTravelRequest(req: AuthRequest, res: Response) {
    try {
      const result = await travelService.createTravelRequest(req.user!, req.body, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Travel request created successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getTravelRequests(req: AuthRequest, res: Response) {
    try {
      const result = await travelService.getTravelRequests(req.user!, req.query);
      return sendSuccess(res, result, 'Travel requests retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  async getTravelRequestById(req: AuthRequest, res: Response) {
    try {
      const result = await travelService.getTravelRequestById(req.user!, req.params.id as string);
      return sendSuccess(res, result, 'Travel request retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 404);
    }
  }

  async deleteTravelRequest(req: AuthRequest, res: Response) {
    try {
      const result = await travelService.deleteTravelRequest(req.user!, req.params.id as string, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Travel request deleted');
    } catch (error: any) {
      const status = error.message === 'Travel request not found.' ? 404 : error.message.includes('authorized') ? 403 : 400;
      return sendError(res, error.message, status);
    }
  }

  async updateApprovalStatus(req: AuthRequest, res: Response) {
    try {
      const result = await travelService.updateApprovalStatus(req.user!, req.params.id as string, req.body, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Approval status updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  
  async submitExpenses(req: AuthRequest, res: Response) {
    try {
      const data = await travelService.submitExpenses(req.user!, req.params.id as string, req.body, { ipAddress: req.ip });
      res.json({ success: true, data, message: 'Expenses submitted successfully' });
    } catch (error: any) {
      res.status(403).json({ success: false, message: error.message });
    }
  }

  async updateSettlement(req: AuthRequest, res: Response) {
    try {
      const result = await travelService.updateSettlement(req.user!, req.params.id as string, req.body, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Settlement recorded');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}

export const travelController = new TravelController();
