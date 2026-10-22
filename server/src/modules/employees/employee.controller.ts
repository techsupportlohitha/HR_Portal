import { Response } from 'express';
import { Role } from '@prisma/client';
import { employeeService } from './employee.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';
import { permissionService } from '../permissions/permission.service';
import { omitRestrictedFromPayload, stripRestrictedFields } from '../../utils/restrictedFields';

export class EmployeeController {
  async createPublicCardToken(req: AuthRequest, res: Response): Promise<void> {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const token = await employeeService.createPublicCardToken(req.user! as any, req.params.id as string);
      sendSuccess(res, { token }, 'Public employee pass created');
    } catch (error: any) {
      const expectedFailure = error.message === 'Not authorized' || error.message === 'Employee not found or not accessible';
      sendError(res, expectedFailure ? error.message : 'Could not create employee pass.', expectedFailure ? 404 : 500);
    }
  }

  async getPublicCard(req: AuthRequest, res: Response): Promise<void> {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const employee = await employeeService.getPublicCard(req.params.token as string);
      sendSuccess(res, employee, 'Public employee pass verified');
    } catch (error: any) {
      const invalidPass = error.name === 'JsonWebTokenError'
        || error.name === 'TokenExpiredError'
        || error.message === 'Invalid public employee card token.'
        || error.message === 'This employee pass is no longer active.';
      sendError(res, invalidPass ? 'This pass is invalid or no longer active.' : 'Unable to verify this pass right now.', invalidPass ? 404 : 500);
    }
  }

  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page, limit, search, departmentId, status, location, history } = req.query;
      const result = await employeeService.getAll(req.user! as any, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string,
        departmentId: departmentId as string,
        status: status as string,
        location: location as string,
        history: history === 'true',
        assignmentOptions: req.query.assignmentOptions === 'true',
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
}

export const employeeController = new EmployeeController();
