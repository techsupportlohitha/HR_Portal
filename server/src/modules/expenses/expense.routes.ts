import { Router } from 'express';
import { expenseController } from './expense.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createExpenseSchema, updateExpenseStatusSchema } from './expense.schema';

const router = Router();

router.use(authenticate);

// Module permissions govern actions; service checks govern record visibility.
router.get('/', requirePermission('expenses', 'view'), (req, res) => expenseController.getAll(req, res));
router.post('/', requirePermission('expenses', 'add'), validateRequest({ body: createExpenseSchema }), (req, res) => expenseController.create(req, res));
router.delete('/:id', requirePermission('expenses', 'delete'), (req, res) => expenseController.delete(req, res));
router.patch('/:id/status', requirePermission('expenses', 'approve'), validateRequest({ body: updateExpenseStatusSchema }), (req, res) => expenseController.updateStatus(req, res));

export default router;
