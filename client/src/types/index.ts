export type Role = 'ADMIN' | 'HR' | 'HR_EXECUTIVE' | 'MANAGER' | 'EMPLOYEE';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'TERMINATED';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type LeaveType = 'CASUAL' | 'SICK' | 'EARNED' | 'UNPAID' | 'MATERNITY' | 'PATERNITY';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE' | 'WEEKEND' | 'HOLIDAY';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
export type EmploymentType = 'PERMANENT' | 'CONTRACT' | 'INTERN';
export type ExitType = 'VOLUNTARY' | 'INVOLUNTARY';
export type DocumentType = 'RESUME' | 'AADHAAR' | 'PAN' | 'EDUCATIONAL_CERTIFICATE' | 'EXPERIENCE_CERTIFICATE' | 'APPOINTMENT_LETTER' | 'OTHER';
export type VerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'VERIFICATION_REJECTED';
export type TravelMode = 'AIR' | 'TRAIN' | 'ROAD' | 'OWN_VEHICLE';
export type ApprovalStatus = 'APPROVAL_PENDING' | 'APPROVAL_APPROVED' | 'APPROVAL_REJECTED';
export type SettlementStatus = 'UNSETTLED' | 'SETTLED';
export type AssetType = 'LAPTOP' | 'DESKTOP' | 'MOBILE' | 'SIM' | 'ID_CARD' | 'LAPTOP_BAG' | 'VEHICLE' | 'TOOLS' | 'MACHINERY_TOOL' | 'ASSET_OTHER';
export type AssetCategory = 'IT' | 'NON_IT' | 'VEHICLE_CAT';
export type AssetStatus = 'IN_USE' | 'RETURN_REQUESTED' | 'RETURNED' | 'DAMAGED' | 'LOST' | 'RETIRED';
export type RequisitionStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ON_HOLD';
export type ScreeningStatus = 'SCREENING_PENDING' | 'SHORTLISTED' | 'SCREENING_REJECTED';
export type SelectionStatus = 'SELECTED' | 'SELECTION_REJECTED' | 'SELECTION_ON_HOLD';
export type OfferStatus = 'NOT_RELEASED' | 'RELEASED' | 'OFFER_ACCEPTED' | 'OFFER_DECLINED';
export type ReviewPeriod = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUAL';
export type TrainingType = 'INTERNAL' | 'EXTERNAL';
export type RequestType = 'LEAVE_QUERY' | 'SALARY_QUERY' | 'DOCUMENT_REQUEST' | 'EXPERIENCE_LETTER' | 'PAYSLIP' | 'JOINING_DOCUMENTS' | 'GENERAL';
export type TicketStatus = 'SUBMITTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'TICKET_CLOSED';
export type PolicyCategory = 'LEAVE_POLICY' | 'ATTENDANCE_POLICY' | 'TRAVEL_POLICY' | 'CODE_OF_CONDUCT' | 'RECRUITMENT_POLICY' | 'PERFORMANCE_POLICY' | 'TRAINING_POLICY' | 'POSH' | 'SAFETY' | 'CIRCULAR' | 'FORM' | 'SOP';
export type NotificationType = 'JOINING' | 'INTERVIEW' | 'OFFER' | 'RESIGNATION' | 'TRAVEL_NOTIF' | 'ASSET_NOTIF' | 'REVIEW_DUE' | 'TRAINING_NOTIF' | 'QUERY_NOTIF' | 'POLICY_UPLOAD';

export interface User {
  id: string;
  email: string;
  role: Role;
  employeeId?: string | null;
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  maritalStatus?: MaritalStatus;
  bloodGroup?: string;
  qualification?: string;
  experience?: string;
  alternateMobile?: string;
  personalEmail?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactNumber?: string;
  joiningDate: string;
  designation: string;
  salary?: number;
  status: EmployeeStatus;
  profilePhoto?: string;
  grade?: string;
  location?: string;
  employmentType?: EmploymentType;
  probationPeriod?: number;
  confirmationDate?: string;
  resignationDate?: string;
  noticePeriod?: number;
  lastWorkingDate?: string;
  exitType?: ExitType;
  exitReason?: string;
  ctc?: number;
  basicSalary?: number;
  grossSalary?: number;
  bankName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  pfNumber?: string;
  uanNumber?: string;
  esiNumber?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  statutoryRemarks?: string;
  departmentId?: string;
  department?: { id: string; name: string };
  managerId?: string;
  manager?: { id: string; firstName: string; lastName: string };
  subordinates?: { id: string; firstName: string; lastName: string; designation: string }[];
  user?: { id: string; email: string; role: Role };
  documents?: EmployeeDocument[];
  assignedAssets?: Asset[];
  trainingParticipations?: TrainingParticipant[];
  performanceReviews?: PerformanceReview[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  headId?: string;
  head?: { id: string; firstName: string; lastName: string; designation?: string };
  employees?: Employee[];
  _count?: { employees: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface Attendance {
  id: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  workHours?: number;
  status: AttendanceStatus;
  notes?: string;
  employeeId: string;
  employee?: Employee;
  createdAt?: string;
}

export interface Leave {
  id: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  remarks?: string;
  employeeId: string;
  employee?: Employee;
  approverId?: string;
  approver?: { firstName: string; lastName: string };
  createdAt?: string;
}

export interface LeaveBalance {
  id: string;
  year: number;
  leaveType: LeaveType;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  employeeId: string;
}

export interface EmployeeDocument {
  id: string;
  documentType: DocumentType;
  documentName: string;
  filePath: string;
  verificationStatus: VerificationStatus;
  expiryDate?: string;
  employeeId: string;
  employee?: Employee;
  uploadDate: string;
  createdAt?: string;
}

export interface TravelRequest {
  id: string;
  travelPurpose: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelMode: TravelMode;
  advanceRequested?: number;
  advanceApproved?: number;
  approvalStatus: ApprovalStatus;
  approvalDate?: string;
  hotelExpense?: number;
  foodAllowance?: number;
  localConveyance?: number;
  otherExpenses?: number;
  totalExpenseClaimed?: number;
  billUpload?: string;
  amountPayable?: number;
  settlementStatus: SettlementStatus;
  settlementDate?: string;
  employeeId: string;
  employee?: Employee;
  approverId?: string;
  approver?: { firstName: string; lastName: string };
  createdAt?: string;
}

export interface Asset {
  id: string;
  assetType: AssetType;
  assetCategory: AssetCategory;
  brandModel?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchaseValue?: number;
  vendor?: string;
  warrantyExpiryDate?: string;
  issueDate?: string;
  issueCondition?: string;
  assetLocation?: string;
  returnDate?: string;
  returnCondition?: string;
  status: AssetStatus;
  remarks?: string;
  assignedEmployeeId?: string;
  assignedEmployee?: Employee;
  createdAt?: string;
}

export interface Requisition {
  id: string;
  positionTitle: string;
  location?: string;
  numberOfVacancies: number;
  requisitionDate: string;
  status: RequisitionStatus;
  departmentId?: string;
  department?: { id: string; name: string };
  raisedById?: string;
  raisedBy?: { firstName: string; lastName: string };
  candidates?: Candidate[];
  _count?: { candidates: number };
  createdAt?: string;
}

export interface Candidate {
  id: string;
  candidateName: string;
  mobile?: string;
  email?: string;
  qualification?: string;
  totalExperience?: number;
  currentCompany?: string;
  currentSalary?: number;
  expectedSalary?: number;
  noticePeriod?: number;
  source?: string;
  resumePath?: string;
  screeningStatus: ScreeningStatus;
  screeningNotes?: string;
  interviewRound?: string;
  interviewDate?: string;
  interviewFeedback?: string;
  interviewScore?: number;
  selectionStatus?: SelectionStatus;
  offerStatus?: OfferStatus;
  offerDate?: string;
  offeredSalary?: number;
  joiningDate?: string;
  rejectionStage?: string;
  rejectionReason?: string;
  recruitmentCost?: number;
  requisitionId: string;
  requisition?: Requisition;
  interviewerId?: string;
  interviewer?: { firstName: string; lastName: string };
  createdAt?: string;
}

export interface PerformanceReview {
  id: string;
  reviewPeriod: ReviewPeriod;
  kraDescription?: string;
  kpiWeightage?: number;
  goalDescription?: string;
  targetValue?: string;
  achievedValue?: string;
  selfRating?: number;
  managerRating?: number;
  hrRating?: number;
  finalRating?: number;
  selfMetricRatings?: Record<string, number>;
  managerMetricRatings?: Record<string, number>;
  hrMetricRatings?: Record<string, number>;
  managerComments?: string;
  employeeComments?: string;
  hrComments?: string;
  strengths?: string;
  areasOfImprovement?: string;
  trainingRequirement?: string;
  promotionRecommendation: boolean;
  salaryRevisionRecommendation?: string;
  finalApprovalStatus: ApprovalStatus;
  finalApprovalDate?: string;
  employeeId: string;
  employee?: Employee;
  finalApprovedById?: string;
  finalApprovedBy?: { firstName: string; lastName: string };
  createdAt?: string;
}

export interface Training {
  id: string;
  trainingTopic: string;
  trainingType: TrainingType;
  trainerName?: string;
  trainingDate: string;
  trainingLocation?: string;
  trainingCost?: number;
  trainingHours?: number;
  targetDepartmentId?: string;
  targetDepartment?: { id: string; name: string };
  participants?: TrainingParticipant[];
  _count?: { participants: number };
  createdAt?: string;
}

export interface TrainingParticipant {
  id: string;
  attendanceStatus: string;
  feedbackRating?: number;
  feedbackComments?: string;
  assessmentScore?: number;
  certificateIssued: boolean;
  certificateFile?: string;
  trainingId: string;
  training?: Training;
  employeeId: string;
  employee?: Employee;
}

export interface EmployeeRequest {
  id: string;
  requestType: RequestType;
  description: string;
  status: TicketStatus;
  responseNotes?: string;
  resolutionDate?: string;
  closureDate?: string;
  slaDueDate?: string;
  employeeId: string;
  employee?: Employee;
  assignedToId?: string;
  assignedTo?: { email: string };
  createdAt?: string;
}

export interface Policy {
  id: string;
  policyName: string;
  policyCategory: PolicyCategory;
  versionNumber: string;
  filePath: string;
  applicableTo: string;
  acknowledgementRequired: boolean;
  uploadedById?: string;
  uploadedBy?: { email: string };
  acknowledgements?: PolicyAcknowledgement[];
  _count?: { acknowledgements: number };
  uploadDate: string;
  createdAt?: string;
}

export interface PolicyAcknowledgement {
  id: string;
  acknowledgementStatus: string;
  acknowledgementDate?: string;
  policyId: string;
  policy?: Policy;
  employeeId: string;
  employee?: Employee;
}

export interface Notification {
  id: string;
  notificationType: NotificationType;
  message: string;
  triggerEvent?: string;
  isRead: boolean;
  deliveryChannel: string;
  recipientId: string;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  actionPerformed: string;
  moduleAffected: string;
  recordIdAffected?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  userId: string;
  user?: { email: string };
  createdAt?: string;
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  departments: number;
  recentJoinees: {
    id: string;
    firstName: string;
    lastName: string;
    joiningDate: string;
    designation: string;
  }[];
}

export interface LeaveDashboardStats {
  pendingCount: number;
  todayOnLeave: (Leave & { employee: Employee })[];
}

export interface AttendanceSummary {
  records: Attendance[];
  summary: {
    totalDays: number;
    present: number;
    absent: number;
    halfDay: number;
    onLeave: number;
    totalWorkHours: number;
    averageWorkHours: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
