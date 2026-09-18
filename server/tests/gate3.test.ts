import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const metricRatings = {
  WORK_QUALITY: 4,
  PRODUCTIVITY_RELIABILITY: 4,
  COMMUNICATION: 4,
  COLLABORATION: 4,
  OWNERSHIP_INITIATIVE: 4,
  PROFESSIONAL_CONDUCT: 4,
  LEARNING_ADAPTABILITY: 4
};

describe('Gate 3 Talent Workflows', () => {
  let adminToken: string;
  let hrToken: string;
  let managerToken: string;
  let empToken: string;

  let hrId: string;
  let hrEmployeeId: string;
  let managerId: string;
  let managerEmployeeId: string;
  let empId: string;
  let empEmployeeId: string;

  let requisitionId: string;
  let candidateId: string;
  let reviewId: string;
  let trainingId: string;

  beforeAll(async () => {
    // Authenticate users
    const resAdmin = await request(app).post('/api/auth/login').send({ email: 'admin@hrms.com', password: 'password123' });
    adminToken = resAdmin.body.data.token;

    const resHr = await request(app).post('/api/auth/login').send({ email: 'priya.sharma@hrms.com', password: 'password123' });
    hrToken = resHr.body.data.token;
    hrId = resHr.body.data.user.id;
    hrEmployeeId = resHr.body.data.user.employeeId;

    const resMgr = await request(app).post('/api/auth/login').send({ email: 'rahul.verma@hrms.com', password: 'password123' });
    managerToken = resMgr.body.data.token;
    managerId = resMgr.body.data.user.id;
    managerEmployeeId = resMgr.body.data.user.employeeId;

    const resEmp = await request(app).post('/api/auth/login').send({ email: 'ananya.patel@hrms.com', password: 'password123' });
    empToken = resEmp.body.data.token;
    empId = resEmp.body.data.user.id;
    empEmployeeId = resEmp.body.data.user.employeeId;
  });

  afterAll(async () => {
    // Cleanup generated data
    if (candidateId) await prisma.candidate.deleteMany({ where: { id: candidateId } });
    if (requisitionId) await prisma.requisition.deleteMany({ where: { id: requisitionId } });
    if (reviewId) await prisma.performanceReview.deleteMany({ where: { id: reviewId } });
    if (trainingId) await prisma.trainingParticipant.deleteMany({ where: { trainingId } });
    if (trainingId) await prisma.training.deleteMany({ where: { id: trainingId } });
    
    await prisma.$disconnect();
  });

  describe('Recruitment Workflow', () => {
    it('HR creates a Requisition and Candidate', async () => {
      // Create Requisition
      const reqRes = await request(app).post('/api/recruitment/requisitions').set('Authorization', `Bearer ${hrToken}`).send({
        positionTitle: 'Software Engineer',
        location: 'Remote',
        numberOfVacancies: 2,
        departmentId: 'some-dept-id-will-fail-if-checked-so-let-us-just-pass-a-valid-one'
      });
      // Need a valid department ID. Let's fetch one.
      const dept = await prisma.department.findFirst();
      const actualReqRes = await request(app).post('/api/recruitment/requisitions').set('Authorization', `Bearer ${hrToken}`).send({
        positionTitle: 'Software Engineer',
        location: 'Remote',
        numberOfVacancies: 2,
        departmentId: dept!.id
      });
      expect(actualReqRes.status).toBe(200);
      requisitionId = actualReqRes.body.data.id;

      // Create Candidate
      const candRes = await request(app).post('/api/recruitment/candidates').set('Authorization', `Bearer ${hrToken}`).send({
        candidateName: 'Test Candidate',
        mobile: '1234567890',
        email: 'candidate@test.com',
        requisitionId
      });
      expect(candRes.status).toBe(200);
      candidateId = candRes.body.data.id;
    });

    it('Fails to interview a candidate before screening', async () => {
      const interviewRes = await request(app).put(`/api/recruitment/candidates/${candidateId}/interview`).set('Authorization', `Bearer ${hrToken}`).send({
        interviewRound: 'Technical',
        interviewDate: new Date().toISOString(),
        selectionStatus: 'SELECTED'
      });
      expect(interviewRes.status).toBe(400);
      expect(interviewRes.body.message).toMatch(/must be shortlisted before interviewing/);
    });

    it('Screens, Interviews, and Offers candidate successfully', async () => {
      // Screen
      const screenRes = await request(app).put(`/api/recruitment/candidates/${candidateId}/screen`).set('Authorization', `Bearer ${hrToken}`).send({
        screeningStatus: 'SHORTLISTED'
      });
      expect(screenRes.status).toBe(200);

      // Interview
      const interviewRes = await request(app).put(`/api/recruitment/candidates/${candidateId}/interview`).set('Authorization', `Bearer ${hrToken}`).send({
        interviewRound: 'Technical',
        interviewDate: new Date().toISOString(),
        selectionStatus: 'SELECTED'
      });
      expect(interviewRes.status).toBe(200);

      // Offer
      const offerRes = await request(app).put(`/api/recruitment/candidates/${candidateId}/offer`).set('Authorization', `Bearer ${hrToken}`).send({
        offerStatus: 'RELEASED'
      });
      expect(offerRes.status).toBe(200);
    });
  });

  describe('Performance Workflow', () => {
    it('HR creates a performance review', async () => {
      const reviewRes = await request(app).post('/api/performance').set('Authorization', `Bearer ${hrToken}`).send({
        employeeId: empEmployeeId,
        reviewPeriod: 'ANNUAL'
      });
      expect(reviewRes.status).toBe(200);
      reviewId = reviewRes.body.data.id;
    });

    it('Manager cannot self-appraise the employee', async () => {
      const res = await request(app).put(`/api/performance/${reviewId}/self-appraisal`).set('Authorization', `Bearer ${managerToken}`).send({
        metricRatings
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/only submit self appraisal for your own review/i);
    });

    it('Employee submits self appraisal', async () => {
      const res = await request(app).put(`/api/performance/${reviewId}/self-appraisal`).set('Authorization', `Bearer ${empToken}`).send({
        metricRatings,
        employeeComments: 'I did great'
      });
      expect(res.status).toBe(200);
    });

    it('Employee cannot submit manager appraisal', async () => {
      const res = await request(app).put(`/api/performance/${reviewId}/manager-appraisal`).set('Authorization', `Bearer ${empToken}`).send({
        metricRatings
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Only the direct manager/i);
    });

    it('Manager submits manager appraisal', async () => {
      const res = await request(app).put(`/api/performance/${reviewId}/manager-appraisal`).set('Authorization', `Bearer ${managerToken}`).send({
        metricRatings,
        managerComments: 'Excellent work'
      });
      expect(res.status).toBe(200);
    });

    it('HR submits their appraisal', async () => {
      const res = await request(app).put(`/api/performance/${reviewId}/hr-appraisal`).set('Authorization', `Bearer ${hrToken}`).send({
        metricRatings,
        hrComments: 'Ready for final approval'
      });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('FINAL_APPROVAL');
    });

    it('HR gives final approval', async () => {
      const res = await request(app).put(`/api/performance/${reviewId}/final-approval`).set('Authorization', `Bearer ${hrToken}`).send({
        finalApprovalStatus: 'APPROVAL_APPROVED'
      });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('COMPLETED');
      expect(Number(res.body.data.finalRating)).toBe(4);
    });
  });

  describe('Training Workflow', () => {
    it('HR creates a training and assigns an employee', async () => {
      const trainRes = await request(app).post('/api/training').set('Authorization', `Bearer ${hrToken}`).send({
        trainingTopic: 'Security Basics',
        trainingType: 'INTERNAL',
        trainingDate: new Date().toISOString()
      });
      expect(trainRes.status).toBe(200);
      trainingId = trainRes.body.data.id;

      const assignRes = await request(app).post(`/api/training/${trainingId}/participants`).set('Authorization', `Bearer ${hrToken}`).send({
        employeeId: empEmployeeId
      });
      expect(assignRes.status).toBe(200);
    });

    it('HR cannot submit feedback for employee', async () => {
      const res = await request(app).put(`/api/training/${trainingId}/participants/${empEmployeeId}/feedback`).set('Authorization', `Bearer ${hrToken}`).send({
        feedbackRating: 5
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/only submit feedback for your own participation/i);
    });

    it('HR submits trainer feedback', async () => {
      const res = await request(app).put(`/api/training/${trainingId}/participants/${empEmployeeId}/feedback`).set('Authorization', `Bearer ${hrToken}`).send({
        trainerFeedbackRating: 5,
        trainerFeedbackComments: 'Strong participation'
      });
      expect(res.status).toBe(200);
    });

    it('Employee submits feedback', async () => {
      const res = await request(app).put(`/api/training/${trainingId}/participants/${empEmployeeId}/feedback`).set('Authorization', `Bearer ${empToken}`).send({
        feedbackRating: 4
      });
      expect(res.status).toBe(200);
    });

    it('Employee cannot submit trainer feedback', async () => {
      const res = await request(app).put(`/api/training/${trainingId}/participants/${empEmployeeId}/feedback`).set('Authorization', `Bearer ${empToken}`).send({
        trainerFeedbackRating: 5
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/only hr or admin can submit trainer feedback/i);
    });

    it('Employee cannot record their own assessment', async () => {
      const res = await request(app).put(`/api/training/${trainingId}/participants/${empEmployeeId}/assessment`).set('Authorization', `Bearer ${empToken}`).send({
        assessmentScore: 100
      });
      expect(res.status).toBe(400);
    });

    it('HR records assessment', async () => {
      const res = await request(app).put(`/api/training/${trainingId}/participants/${empEmployeeId}/assessment`).set('Authorization', `Bearer ${hrToken}`).send({
        attendanceStatus: 'TRAINING_PRESENT',
        assessmentScore: 90
      });
      expect(res.status).toBe(200);
    });
  });
});
