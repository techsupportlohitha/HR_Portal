import { z } from 'zod';

export const applyLeaveSchema = z.object({
  leaveType: z.enum(['CASUAL', 'SICK', 'EARNED', 'UNPAID', 'MATERNITY', 'PATERNITY']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must be under 500 characters'),
});

export const updateLeaveStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  remarks: z.string().optional(),
});

export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;
export type UpdateLeaveStatusInput = z.infer<typeof updateLeaveStatusSchema>;
