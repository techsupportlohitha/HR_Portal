import { Router } from 'express';
import { leaveController } from './leave.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { applyLeaveSchema, updateLeaveStatusSchema } from './leave.schema';

const router = Router();

router.use(authenticate);

// Employee self-service
router.post('/apply', validate(applyLeaveSchema), (req, res) => leaveController.apply(req, res));
router.get('/my-leaves', (req, res) => leaveController.getMyLeaves(req, res));
router.get('/balances', (req, res) => leaveController.getLeaveBalances(req, res));
router.patch('/:id/cancel', (req, res) => leaveController.cancelLeave(req, res));

// Admin/HR/Manager — approval workflow
router.get('/all', authorize('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'), (req, res) => leaveController.getPendingApprovals(req, res));
router.patch('/:id/status', authorize('ADMIN', 'HR', 'MANAGER'), validate(updateLeaveStatusSchema), (req, res) => leaveController.updateStatus(req, res));
router.get('/balances/:employeeId', authorize('ADMIN', 'HR', 'MANAGER'), (req, res) => leaveController.getLeaveBalances(req, res));

// Dashboard
router.get('/dashboard-stats', authorize('ADMIN', 'HR', 'MANAGER'), (req, res) => leaveController.getDashboardStats(req, res));

export default router;
