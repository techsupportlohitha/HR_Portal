import { Response } from 'express';
import { Role } from '@prisma/client';
import { employeeService } from './employee.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';
import { permissionService } from '../permissions/permission.service';
import { omitRestrictedFromPayload, stripRestrictedFields } from '../../utils/restrictedFields';

export class EmployeeController {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page, limit, search, departmentId, status, location } = req.query;
      const result = await employeeService.getAll(req.user! as any, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string,
        departmentId: departmentId as string,
        status: status as string,
        location: location as string,
      });
      const canViewRestricted = await permissionService.canViewRestricted(req.user!.role as Role, 'employees');
      sendSuccess(
        res,
        stripRestrictedFields(result.employees, 'employees', canViewRestricted),
        'Employees retrieved',
        200,
        result.meta
      );
    } catch (error: any) {
      sendError(res, error.message);
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const employee = await employeeService.getById(req.user! as any, req.params.id as string);
      const canViewRestricted = await permissionService.canViewRestricted(req.user!.role as Role, 'employees');
      sendSuccess(res, stripRestrictedFields(employee, 'employees', canViewRestricted), 'Employee retrieved');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const canViewRestricted = await permissionService.canViewRestricted(req.user!.role as Role, 'employees');
      const payload = omitRestrictedFromPayload(req.body, 'employees', canViewRestricted);
      const employee = await employeeService.create(req.user! as any, payload as any, { ipAddress: req.ip });
      sendSuccess(res, employee, 'Employee created successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const canViewRestricted = await permissionService.canViewRestricted(req.user!.role as Role, 'employees');
      const payload = omitRestrictedFromPayload(req.body, 'employees', canViewRestricted);
      const employee = await employeeService.update(req.user! as any, req.params.id as string, payload as any, { ipAddress: req.ip });
      sendSuccess(res, employee, 'Employee updated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await employeeService.delete(req.user! as any, req.params.id as string, { ipAddress: req.ip });
      sendSuccess(res, null, 'Employee deactivated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await employeeService.getDashboardStats(req.user! as any);
      sendSuccess(res, stats, 'Dashboard stats retrieved');
    } catch (error: any) {
      sendError(res, error.message);
    }
  }

  async bulkImport(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        sendError(res, 'No file uploaded', 400);
        return;
      }
      
      const xlsx = require('xlsx');
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      
      const result = await employeeService.bulkImport(req.user! as any, data, { ipAddress: req.ip });
      
      // Cleanup the uploaded file
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
         fs.unlinkSync(req.file.path);
      }
      
      sendSuccess(res, result, `Successfully imported ${result.createdCount} employees`);
    } catch (error: any) {
      sendError(res, error.message);
    }
  }

}


export const employeeController = new EmployeeController();
