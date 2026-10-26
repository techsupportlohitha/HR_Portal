import { Request, Response } from 'express';
import { trainingService } from './training.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export class TrainingController {
  getMyTrainings = async (req: AuthRequest, res: Response) => {
    try {
      const result = await trainingService.getMyTrainings(req.user!.employeeId!);
      return sendSuccess(res, result, 'My trainings retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  };

  getAllTrainings = async (req: AuthRequest, res: Response) => {
    try {
      const result = await trainingService.getAllTrainings(req.user!, req.query);
      return sendSuccess(res, result, 'Trainings retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  };

  createTraining = async (req: AuthRequest, res: Response) => {
    try {
      const result = await trainingService.createTraining(req.body, req.user!.userId, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Training created');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  };

  updateTraining = async (req: AuthRequest, res: Response) => {
    try {
      const result = await trainingService.updateTraining(req.params.id as string, req.body, req.user!.userId, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Training updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  };

  deleteTraining = async (req: AuthRequest, res: Response) => {
    try {
      await trainingService.deleteTraining(req.params.id as string, req.user!.userId, { ipAddress: req.ip });
      return sendSuccess(res, null, 'Training deleted');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  };

  addParticipant = async (req: AuthRequest, res: Response) => {
    try {
      const result = await trainingService.addParticipant(req.params.id as string, req.body.employeeId, req.user!.userId, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Participant added');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  };

  removeParticipant = async (req: AuthRequest, res: Response) => {
    try {
      await trainingService.removeParticipant(req.params.id as string, req.params.employeeId as string, req.user!.userId, { ipAddress: req.ip });
      return sendSuccess(res, null, 'Participant removed');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  };

  submitFeedback = async (req: AuthRequest, res: Response) => {
    try {
      const result = await trainingService.submitFeedback(req.params.id as string, req.params.employeeId as string, req.body, req.user!, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Feedback submitted');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  };

  recordAssessment = async (req: AuthRequest, res: Response) => {
    try {
      const result = await trainingService.recordAssessment(req.params.id as string, req.params.employeeId as string, req.body, req.user!, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Assessment recorded');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  };

  getDashboard = async (req: AuthRequest, res: Response) => {
    try {
      const result = await trainingService.getTrainingDashboard(req.user!);
      return sendSuccess(res, result, 'Dashboard metrics retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  };
}

export const trainingController = new TrainingController();
