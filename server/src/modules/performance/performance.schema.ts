import { z } from 'zod';

export const performanceMetricKeys = [
  'WORK_QUALITY',
  'PRODUCTIVITY_RELIABILITY',
  'COMMUNICATION',
  'COLLABORATION',
  'OWNERSHIP_INITIATIVE',
  'PROFESSIONAL_CONDUCT',
  'LEARNING_ADAPTABILITY'
] as const;

const metricRatingsSchema = z.record(
  z.enum(performanceMetricKeys),
  z.coerce.number().min(1).max(5)
);

export const createPerformanceReviewSchema = z.object({
  employeeId: z.string(),
  reviewPeriod: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL']),
  kraDescription: z.string().nullish(),
  kpiWeightage: z.coerce.number().nullish(),
  goalDescription: z.string().nullish(),
  targetValue: z.string().nullish()
});

export const updatePerformanceReviewSchema = z.object({
  reviewPeriod: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL']),
  kraDescription: z.string().nullish(),
  kpiWeightage: z.coerce.number().nullish(),
  goalDescription: z.string().nullish(),
  targetValue: z.string().nullish()
});

export const selfAppraisalSchema = z.object({
  achievedValue: z.string().nullish(),
  metricRatings: metricRatingsSchema,
  selfRating: z.coerce.number().min(1).max(5).nullish(),
  employeeComments: z.string().nullish(),
  strengths: z.string().nullish(),
  areasOfImprovement: z.string().nullish(),
  trainingRequirement: z.string().nullish()
});

export const managerAppraisalSchema = z.object({
  metricRatings: metricRatingsSchema,
  managerRating: z.coerce.number().min(1).max(5).nullish(),
  managerComments: z.string().nullish(),
  promotionRecommendation: z.boolean().nullish(),
  salaryRevisionRecommendation: z.string().nullish()
});

export const hrAppraisalSchema = z.object({
  metricRatings: metricRatingsSchema,
  hrRating: z.coerce.number().min(1).max(5).nullish(),
  hrComments: z.string().nullish()
});

export const finalAppraisalSchema = z.object({
  finalRating: z.coerce.number().min(1).max(5).nullish(),
  finalApprovalStatus: z.enum(['APPROVAL_PENDING', 'APPROVAL_APPROVED', 'APPROVAL_REJECTED']).nullish()
});
