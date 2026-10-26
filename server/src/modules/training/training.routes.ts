import { Router } from 'express';
import { trainingController } from './training.controller';
import { authenticate, requirePermission, requireStaffView } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { 
  createTrainingSchema, 
  updateTrainingSchema, 
  addParticipantSchema, 
  submitFeedbackSchema,
  recordAssessmentSchema
} from './training.schema';

const router = Router();

router.use(authenticate);

router.get('/my-trainings', requirePermission('training', 'view'), trainingController.getMyTrainings);
router.get('/dashboard', requirePermission('training', 'view'), trainingController.getDashboard);
router.get('/', requireStaffView('training'), trainingController.getAllTrainings);
router.post('/', requirePermission('training', 'add'), validateRequest({ body: createTrainingSchema }), trainingController.createTraining);
router.put('/:id', requirePermission('training', 'edit'), validateRequest({ body: updateTrainingSchema }), trainingController.updateTraining);
router.delete('/:id', requirePermission('training', 'delete'), trainingController.deleteTraining);

// Participants
router.post('/:id/participants', requirePermission('training', 'edit'), validateRequest({ body: addParticipantSchema }), trainingController.addParticipant);
router.delete('/:id/participants/:employeeId', requirePermission('training', 'edit'), trainingController.removeParticipant);

// Feedback and Assessment
router.put('/:id/participants/:employeeId/feedback', requirePermission('training', 'view'), validateRequest({ body: submitFeedbackSchema }), trainingController.submitFeedback);
router.put('/:id/participants/:employeeId/assessment', requirePermission('training', 'edit'), validateRequest({ body: recordAssessmentSchema }), trainingController.recordAssessment);

export default router;
