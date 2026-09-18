import { z } from 'zod';

export const createTrainingSchema = z.object({
  trainingTopic: z.string().min(1),
  trainingType: z.enum(['INTERNAL', 'EXTERNAL']),
  trainerName: z.string().optional(),
  trainingDate: z.string(),
  trainingEndDate: z.string().optional(), // Let string be parsed
  trainingLocation: z.string().optional(),
  trainingCost: z.number().min(0).optional(),
  trainingHours: z.number().min(0).optional(),
  targetDepartmentId: z.string().optional(),
  status: z.string().optional()
});

export const updateTrainingSchema = createTrainingSchema.partial();

export const addParticipantSchema = z.object({
  employeeId: z.string()
});

export const submitFeedbackSchema = z.object({
  feedbackRating: z.number().min(1).max(5).optional(),
  feedbackComments: z.string().optional(),
  trainerFeedbackRating: z.number().min(1).max(5).optional(),
  trainerFeedbackComments: z.string().optional()
});

export const recordAssessmentSchema = z.object({
  attendanceStatus: z.enum(['TRAINING_PRESENT', 'TRAINING_ABSENT']).optional(),
  assessmentScore: z.number().min(1).max(100).optional(),
  certificateIssued: z.boolean().optional(),
  certificateFile: z.string().optional()
});

