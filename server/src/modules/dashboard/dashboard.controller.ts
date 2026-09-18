import { Response } from 'express';
import { dashboardService } from './dashboard.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export class DashboardController {
  getStats = async (req: AuthRequest, res: Response) => {
    try {
      const result = await dashboardService.getStats(req.user!);
      return sendSuccess(res, result, 'Dashboard stats retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  };

  getAttritionStats = async (req: AuthRequest, res: Response) => {
    try {
      const requestedPeriod = Number(req.query.periodMonths);
      const periodMonths = [3, 6, 12].includes(requestedPeriod) ? requestedPeriod : 12;
      const result = await dashboardService.getAttritionStats(req.user!, {
        periodMonths,
        department: typeof req.query.department === 'string' ? req.query.department : undefined,
        location: typeof req.query.location === 'string' ? req.query.location : undefined,
        employmentType: typeof req.query.employmentType === 'string' ? req.query.employmentType : undefined,
      });
      return sendSuccess(res, result, 'Attrition stats retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 403);
    }
  };

  getReport = async (req: AuthRequest, res: Response) => {
    try {
      const type = req.params.type as string;
      const data = await dashboardService.getReport(type, req.user!);

      // Support CSV export
      if (req.query.format === 'csv') {
        if (!Array.isArray(data) || data.length === 0) {
          return sendError(res, 'No data to export', 404);
        }
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row =>
          Object.values(row).map(v => (v === null || v === undefined ? '' : String(v).replace(/,/g, ';'))).join(',')
        );
        const csv = [headers, ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${type}-report.csv"`);
        
        // Audit log the export
        await import('../../config/database').then(({ default: prisma }) =>
          prisma.auditLog.create({
            data: {
              actionPerformed: `EXPORT_REPORT_${type.toUpperCase()}`,
              moduleAffected: 'reports',
              recordIdAffected: `export-${Date.now()}`,
              userId: req.user!.userId,
              ipAddress: req.ip,
            }
          })
        );

        return res.send(csv);
      }

      return sendSuccess(res, data, `${type} report retrieved`);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  };
}

export const dashboardController = new DashboardController();
