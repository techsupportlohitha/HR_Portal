import { z } from 'zod';

export const createEmployeeSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']).optional(),
  alternateMobile: z.string().optional(),
  bloodGroup: z.string().optional(),
  qualification: z.string().optional(),
  experience: z.string().optional(),
  personalEmail: z.string().email().optional().or(z.literal('')),
  permanentAddress: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  emergencyContactNumber: z.string().optional(),

  joiningDate: z.string().min(1, 'Joining date is required'),
  designation: z.string().min(1, 'Designation is required'),
  salary: z.number().positive().optional(),
  departmentId: z.string().optional(),
  managerId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional(),
  isActive: z.boolean().optional(),
  profilePhoto: z.string().optional(),
  
  grade: z.string().optional(),
  location: z.string().optional(),
  employmentType: z.enum(['PERMANENT', 'CONTRACT', 'INTERN']).optional(),
  probationPeriod: z.number().int().nonnegative().optional(),
  confirmationDate: z.string().optional(),
  resignationDate: z.string().optional(),
  noticePeriod: z.number().int().nonnegative().optional(),
  lastWorkingDate: z.string().optional(),
  exitType: z.enum(['RESIGNATION', 'TERMINATION', 'RETIREMENT']).optional(),
  exitReason: z.string().optional(),

  ctc: z.number().nonnegative().optional(),
  basicSalary: z.number().nonnegative().optional(),
  grossSalary: z.number().nonnegative().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  pfNumber: z.string().optional(),
  uanNumber: z.string().optional(),
  esiNumber: z.string().optional(),
  panNumber: z.string().optional(),
  aadhaarNumber: z.string().optional(),
  statutoryRemarks: z.string().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
