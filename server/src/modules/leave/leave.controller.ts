import { Request, Response } from 'express';
import { leaveService } from './leave.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export class LeaveController {
  async apply(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.employeeId) {
        sendError(res, 'Employee profile not found', 400);
        return;
      }
      const leave = await leaveService.apply(req.user.employeeId, req.body);
      sendSuccess(res, leave, 'Leave application submitted successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.employeeId) {
        sendError(res, 'Employee profile not found', 400);
        return;
      }
      const leave = await leaveService.updateStatus(
        req.params.id as string,
        req.user.employeeId,
        req.body
      );
      sendSuccess(res, leave, `Leave ${req.body.status.toLowerCase()} successfully`);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getMyLeaves(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.employeeId) {
        sendError(res, 'Employee profile not found', 400);
        return;
      }
      const status = req.query.status as string | undefined;
      const leaves = await leaveService.getMyLeaves(
        req.user.employeeId,
        status
      );
      sendSuccess(res, leaves, 'Leaves retrieved');
    } catch (error: any) {
      sendError(res, error.message);
    }
  }

  async getPendingApprovals(_req: Request, res: Response): Promise<void> {
    try {
      const leaves = await leaveService.getPendingApprovals();
      sendSuccess(res, leaves, 'Pending approvals retrieved');
    } catch (error: any) {
      sendError(res, error.message);
    }
  }

  async getLeaveBalances(req: AuthRequest, res: Response): Promise<void> {
    try {
      const employeeId = (req.params.employeeId as string) || req.user?.employeeId;
      if (!employeeId) {
        sendError(res, 'Employee ID required', 400);
        return;
      }
      const balances = await leaveService.getLeaveBalances(employeeId);
      sendSuccess(res, balances, 'Leave balances retrieved');
    } catch (error: any) {
      sendError(res, error.message);
    }
  }

  async cancelLeave(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.employeeId) {
        sendError(res, 'Employee profile not found', 400);
        return;
      }
      const leave = await leaveService.cancelLeave(req.params.id as string, req.user.employeeId);
      sendSuccess(res, leave, 'Leave cancelled successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getDashboardStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await leaveService.getDashboardStats();
      sendSuccess(res, stats, 'Leave stats retrieved');
    } catch (error: any) {
      sendError(res, error.message);
    }
  }
}

export const leaveController = new LeaveController();
