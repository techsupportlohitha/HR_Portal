import { z } from 'zod';

export const applyLeaveSchema = z.object({
  leaveType: z.enum(['PERSONAL', 'ON_DUTY', 'CASUAL', 'SICK', 'EARNED', 'UNPAID', 'MATERNITY', 'PATERNITY']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must be under 500 characters'),
  isHalfDay: z.boolean().optional().default(false),
  isHourly: z.boolean().optional().default(false),
  hourlyDuration: z.number().int().min(30).max(480).optional(), // 30 min to 8 hours
  halfDayPeriod: z.enum(['MORNING', 'AFTERNOON']).optional(),
  hourlyStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must be in HH:mm format').optional(),
}).superRefine((data, context) => {
  if (data.isHalfDay && data.isHourly) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Choose either half-day or hourly leave.' });
  }
  if (data.isHalfDay && !data.halfDayPeriod) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['halfDayPeriod'], message: 'Choose morning or afternoon.' });
  }
  if (data.isHourly && !data.hourlyStartTime) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['hourlyStartTime'], message: 'Start time is required for hourly leave.' });
  }
  if (data.isHourly && !data.hourlyDuration) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['hourlyDuration'], message: 'Choose an hourly leave duration.' });
  }
});

export const updateLeaveStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
  remarks: z.string().optional(),
});

export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;
export type UpdateLeaveStatusInput = z.infer<typeof updateLeaveStatusSchema>;
