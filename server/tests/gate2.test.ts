import request from 'supertest';
import app from '../src/app';

describe('Gate 2 Travel and Assets Tests', () => {
  let employeeToken: string;
  let adminToken: string;
  let employeeId: string;
  let travelRequestId: string;
  let assetId: string;

  beforeAll(async () => {
    const resAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hrms.com', password: 'password123' });
    adminToken = resAdmin.body.data.token;

    const resEmp = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ananya.patel@hrms.com', password: 'password123' });
    if(resEmp.status !== 200) console.log('EMP LOGIN FAIL', resEmp.body);
    employeeToken = resEmp.body.data.token;
    employeeId = resEmp.body.data.user.employeeId;
  });

  afterAll(async () => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    if (travelRequestId) {
      await prisma.travelRequest.deleteMany({ where: { id: travelRequestId } });
    }
    if (assetId) {
      await prisma.asset.deleteMany({ where: { id: assetId } });
    }
    await prisma.$disconnect();
  });

  // TRAVEL REQUESTS TESTS
  it('should create a travel request', async () => {
    const res = await request(app)
      .post('/api/travel')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        travelPurpose: 'Client Meeting',
        destination: 'Mumbai',
        startDate: new Date('2026-10-01').toISOString(),
        endDate: new Date('2026-10-05').toISOString(),
        travelMode: 'AIR'
      });
    
    expect(res.status).toBe(200);
    travelRequestId = res.body.data.id;
  });

  it('should prevent duplicate overlapping travel requests', async () => {
    const res = await request(app)
      .post('/api/travel')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        travelPurpose: 'Another Meeting',
        destination: 'Delhi',
        startDate: new Date('2026-10-02').toISOString(),
        endDate: new Date('2026-10-04').toISOString(),
        travelMode: 'TRAIN'
      });
    
    expect(res.status).toBe(400); // Because of the duplicate submission guard
    expect(res.body.message).toMatch(/overlapping dates/);
  });

  it('should approve a travel request and then settle it with computed totals', async () => {
    // Approve
    const approveRes = await request(app)
      .put(`/api/travel/${travelRequestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        approvalStatus: 'APPROVAL_APPROVED',
        advanceApproved: 5000
      });
    if(approveRes.status !== 200) console.log('approve', approveRes.body); expect(approveRes.status).toBe(200);

    // Settle
    const settleRes = await request(app)
      .put(`/api/travel/${travelRequestId}/settle`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        hotelExpense: 2000,
        foodAllowance: 1500,
        localConveyance: 500,
        otherExpenses: 100
      });
    
    if(settleRes.status !== 200) console.log('settle', settleRes.body); expect(settleRes.status).toBe(200);
    expect(Number(settleRes.body.data.totalExpenseClaimed)).toBe(4100);
  });

  it('should reject invalid state transitions', async () => {
    // Attempting to approve an already SETTLED request should fail
    const approveRes = await request(app)
      .put(`/api/travel/${travelRequestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        approvalStatus: 'APPROVAL_APPROVED'
      });
    expect(approveRes.status).toBe(400);
  });

  // ASSETS TESTS
  it('should create and assign an asset with custody tracking', async () => {
    const createRes = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        assetType: 'LAPTOP',
        assetCategory: 'IT',
        brandModel: 'Dell XPS 15',
        serialNumber: `TEST-SN-${Date.now()}`
      });
    
    if(createRes.status !== 200) console.log('create asset', createRes.body); expect(createRes.status).toBe(200);
    assetId = createRes.body.data.id;

    // Assign
    const assignRes = await request(app)
      .put(`/api/assets/${assetId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        assignedEmployeeId: employeeId,
        issueCondition: 'NEW'
      });
    
    if(assignRes.status !== 200) console.log('assign', assignRes.body); expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.status).toBe('IN_USE');
    expect(assignRes.body.data.assignedEmployeeId).toBe(employeeId);
  });

  it('should allow returning an asset and reporting it damaged', async () => {
    // Return
    const returnRes = await request(app)
      .put(`/api/assets/${assetId}/return`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        returnCondition: 'RETURN_GOOD'
      });
    
    if(returnRes.status !== 200) console.log('return', returnRes.body); expect(returnRes.status).toBe(200);
    expect(returnRes.body.data.status).toBe('RETURNED');
    expect(returnRes.body.data.assignedEmployeeId).toBeNull();

    // Report Damaged
    const damageRes = await request(app)
      .put(`/api/assets/${assetId}/damage`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(damageRes.status).toBe(200);
    expect(damageRes.body.data.status).toBe('DAMAGED');
  });
});
