import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { sendSuccess, sendError } from '../../utils/response';
import { auditService } from './audit.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import { permissionService } from '../permissions/permission.service';
import { redactOfferHistory } from '../recruitment/offer-history';

export class AuditController {
  async getAllLogs(req: AuthRequest, res: Response) {
    try {
      const result = await auditService.getAllLogs(req.query);
      if (!await permissionService.canViewRestricted(req.user!.role as Role, 'recruitment')) result.data = redactOfferHistory(result.data);
      return sendSuccess(res, result, 'Audit logs retrieved successfully');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  async getSummaryStats(_req: Request, res: Response) {
    try {
      const stats = await auditService.getSummaryStats();
      return sendSuccess(res, stats, 'Audit stats retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  async getModuleLogs(req: AuthRequest, res: Response) {
    try {
      let logs = await auditService.getModuleLogs(req.params.module as string);
      if (!await permissionService.canViewRestricted(req.user!.role as Role, 'recruitment')) logs = redactOfferHistory(logs);
      return sendSuccess(res, logs, 'Module audit logs retrieved successfully');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }
}

export const auditController = new AuditController();
