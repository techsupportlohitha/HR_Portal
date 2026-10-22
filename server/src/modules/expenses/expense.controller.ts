import { Response } from 'express';
import { expenseService } from './expense.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export class ExpenseController {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const data = await expenseService.getAll(req.user!, req.query);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(403).json({ success: false, message: error.message });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const data = await expenseService.create(req.user!, req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const data = await expenseService.delete(req.user!, req.params.id as string, { ipAddress: req.ip });
      res.json({ success: true, data, message: 'Expense deleted' });
    } catch (error: any) {
      const status = error.message === 'Expense not found.' ? 404 : error.message.includes('authorized') ? 403 : 400;
      res.status(status).json({ success: false, message: error.message });
    }
  }

  async updateStatus(req: AuthRequest, res: Response) {
    try {
      const data = await expenseService.updateStatus(req.user!, req.params.id as string, req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(403).json({ success: false, message: error.message });
    }
  }
}

export const expenseController = new ExpenseController();
