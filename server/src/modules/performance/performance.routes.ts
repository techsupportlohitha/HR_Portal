import { Router } from 'express';
import { performanceController } from './performance.controller';
import { authenticate, requirePermission, requireStaffView } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { 
  createPerformanceReviewSchema, 
  selfAppraisalSchema, 
  managerAppraisalSchema, 
  hrAppraisalSchema,
  finalAppraisalSchema,
  updatePerformanceReviewSchema
} from './performance.schema';

const router = Router();

router.use(authenticate);

router.get('/my-reviews', requirePermission('performance', 'view'), performanceController.getMyReviews);
router.post('/', requirePermission('performance', 'add'), validateRequest({ body: createPerformanceReviewSchema }), performanceController.createReview);
router.put('/:id', requirePermission('performance', 'edit'), validateRequest({ body: updatePerformanceReviewSchema }), performanceController.updateReview);
router.delete('/:id', requirePermission('performance', 'delete'), performanceController.deleteReview);
router.get('/', requireStaffView('performance'), performanceController.getReviews);

router.put('/:id/self-appraisal', requirePermission('performance', 'edit'), validateRequest({ body: selfAppraisalSchema }), performanceController.submitSelfAppraisal);
router.put('/:id/manager-appraisal', requirePermission('performance', 'edit'), validateRequest({ body: managerAppraisalSchema }), performanceController.submitManagerAppraisal);
router.put('/:id/hr-appraisal', requirePermission('performance', 'edit'), validateRequest({ body: hrAppraisalSchema }), performanceController.submitHRAppraisal);
router.put('/:id/final-approval', requirePermission('performance', 'approve'), validateRequest({ body: finalAppraisalSchema }), performanceController.submitFinalApproval);

export default router;
