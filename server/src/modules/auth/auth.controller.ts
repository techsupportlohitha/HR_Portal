import { Request, Response } from 'express';
import { authService } from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.login(req.body, { ipAddress: req.ip, deviceBrowser: req.headers['user-agent'] });
      sendSuccess(res, result, 'Login successful');
    } catch (error: any) {
      console.error('[AUTH LOGIN ERROR]', error);
      sendError(res, error.message || 'Login failed', 401);
    }
  }

  async getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 401);
        return;
      }
      const user = await authService.getMe(req.user.userId);
      sendSuccess(res, user, 'User profile retrieved');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }


  async changePassword(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      await authService.changePassword(req.user.id, req.body, { ipAddress: req.ip });
      return sendSuccess(res, null, 'Password changed successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async setupPassword(req: Request, res: Response) {
    try {
      await authService.setupPassword(req.body, { ipAddress: req.ip });
      return sendSuccess(res, null, 'Password setup successfully. You can now login.');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}

export const authController = new AuthController();
