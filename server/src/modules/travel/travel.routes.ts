import { Router } from 'express';
import { travelController } from './travel.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createTravelSchema, updateApprovalSchema, updateSettlementSchema, submitExpenseSchema } from './travel.schema';

const router = Router();

router.use(authenticate);

router.post('/', requirePermission('travel', 'add'), validateRequest({ body: createTravelSchema }), (req, res) => travelController.createTravelRequest(req, res));
router.get('/', requirePermission('travel', 'view'), (req, res) => travelController.getTravelRequests(req, res));
router.get('/:id', requirePermission('travel', 'view'), (req, res) => travelController.getTravelRequestById(req, res));
router.delete('/:id', requirePermission('travel', 'delete'), (req, res) => travelController.deleteTravelRequest(req, res));
router.put('/:id/approve', requirePermission('travel', 'approve'), validateRequest({ body: updateApprovalSchema }), (req, res) => travelController.updateApprovalStatus(req, res));
router.put('/:id/settle', requirePermission('travel', 'edit'), validateRequest({ body: updateSettlementSchema }), (req, res) => travelController.updateSettlement(req, res));

router.put('/:id/expenses', requirePermission('travel', 'add'), validateRequest({ body: submitExpenseSchema }), (req, res) => travelController.submitExpenses(req, res));
export default router;
