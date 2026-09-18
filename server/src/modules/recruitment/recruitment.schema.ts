import { z } from 'zod';

export const createRequisitionSchema = z.object({
  positionTitle: z.string().min(1),
  location: z.string().min(1),
  numberOfVacancies: z.number().min(1),
  requisitionDate: z.string().optional(), // Or we can let server set it
  departmentId: z.string()
});

export const updateRequisitionStatusSchema = z.object({
  status: z.enum(['REQUIREMENT', 'SOURCING', 'SCREENING', 'TELEPHONIC', 'HR_INTERVIEW', 'TECHNICAL', 'MANAGEMENT', 'SELECTED', 'OFFER', 'JOINED_REJECTED'])
});

export const createCandidateSchema = z.object({
  candidateName: z.string().min(1),
  mobile: z.string().optional(),
  email: z.string().email().optional(),
  qualification: z.string().optional(),
  totalExperience: z.number().optional(),
  currentCompany: z.string().optional(),
  currentSalary: z.number().optional(),
  expectedSalary: z.number().optional(),
  noticePeriod: z.number().optional(),
  source: z.string().optional(),
  requisitionId: z.string(),
  interviewDate: z.string().optional(),
  screeningStatus: z.string().optional(),
  interviewerId: z.string().optional(),
});

export const screenCandidateSchema = z.object({
  screeningStatus: z.enum(['SCREENING_PENDING', 'SHORTLISTED', 'SCREENING_REJECTED']),
  screeningNotes: z.string().optional()
});

export const interviewCandidateSchema = z.object({
  interviewRound: z.string().min(1),
  interviewDate: z.string(),
  interviewFeedback: z.string().optional(),
  interviewScore: z.number().optional(),
  selectionStatus: z.enum(['SELECTED', 'SELECTION_REJECTED', 'SELECTION_ON_HOLD']),
  interviewerId: z.string().optional()
});

export const offerCandidateSchema = z.object({
  offerStatus: z.enum(['NOT_RELEASED', 'RELEASED', 'OFFER_ACCEPTED', 'OFFER_DECLINED']),
  offerDate: z.string().optional(),
  offeredSalary: z.number().optional(),
  joiningDate: z.string().optional()
});
