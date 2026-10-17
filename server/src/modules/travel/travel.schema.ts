import { z } from 'zod';

export const createTravelSchema = z.object({
  travelPurpose: z.string().min(1),
  destination: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  travelMode: z.enum(['AIR', 'TRAIN', 'ROAD', 'OWN_VEHICLE']),
  travelModes: z.array(z.enum(['AIR', 'TRAIN', 'ROAD', 'OWN_VEHICLE'])).min(1).optional(),
  amountRequired: z.number().positive(),
  outboundAmountRequired: z.number().min(0).optional(),
  returnAmountRequired: z.number().min(0).optional(),
  billUpload: z.string().optional()
}).superRefine((data, context) => {
  if (data.travelModes && !data.travelModes.includes(data.travelMode)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['travelModes'], message: 'The primary travel mode must be selected.' });
  }

  if (data.outboundAmountRequired != null || data.returnAmountRequired != null) {
    const expectedTotal = Math.round(((data.outboundAmountRequired ?? 0) + (data.returnAmountRequired ?? 0) + Number.EPSILON) * 100) / 100;
    if (Math.abs(data.amountRequired - expectedTotal) > 0.005) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['amountRequired'], message: 'Amount required must equal the outbound and return amounts.' });
    }
  }
});

export const updateApprovalSchema = z.object({
  approvalStatus: z.enum(['APPROVED', 'REJECTED', 'APPROVAL_APPROVED', 'APPROVAL_REJECTED']),
  advanceApproved: z.number().min(0).optional(),
  rejectionReason: z.string().optional()
});

export const updateSettlementSchema = z.object({
  hotelExpense: z.number().min(0).optional(),
  foodAllowance: z.number().min(0).optional(),
  localConveyance: z.number().min(0).optional(),
  otherExpenses: z.number().min(0).optional(),
  settlementStatus: z.literal('SETTLED').optional()
});

export const submitExpenseSchema = z.object({
  hotelExpense: z.number().min(0).default(0),
  foodAllowance: z.number().min(0).default(0),
  localConveyance: z.number().min(0).default(0),
  otherExpenses: z.number().min(0).default(0),
  billUpload: z.string().optional()
});
