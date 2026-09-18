import request from 'supertest';
import app from '../src/app';

describe('Gate 1 Core Employee Tests', () => {
  let employeeToken: string;
  let adminToken: string;
  let employeeId: string;
  let documentId: string;
  let requestId: string;

  beforeAll(async () => {
    // 1. Get Admin token
    const resAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hrms.com', password: 'password123' });
    adminToken = resAdmin.body.data.token;

    // 2. Get Employee token
    const resEmp = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ananya.patel@hrms.com', password: 'password123' });
    employeeToken = resEmp.body.data.token;
    employeeId = resEmp.body.data.user.employeeId;
  });

  afterAll(async () => {
    // Revert Ananya's password to password123
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const { hashPassword } = require('../src/utils/password');
    const hashedPassword = await hashPassword('password123');
    
    await prisma.user.updateMany({
      where: { email: 'ananya.patel@hrms.com' },
      data: { password: hashedPassword }
    });
    
    if (documentId) {
      await prisma.employeeDocument.deleteMany({ where: { id: documentId } });
    }
    if (requestId) {
      await prisma.employeeRequest.deleteMany({ where: { id: requestId } });
    }
    await prisma.$disconnect();
  });

  it('should generate HR-YYYY-NNNNNN for helpdesk requests', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        requestType: 'LEAVE_QUERY',
        description: 'Need a new mouse'
      });
    
    if(res.status !== 200) console.log(res.body); expect(res.status).toBe(200);
    requestId = res.body.data.id;
    expect(res.body.data.id).toMatch(/^HR-\d{4}-\d{6}$/);
  });

  it('should upload a document and securely generate a download link', async () => {
    // Wait, testing file uploads via supertest requires attach()
    const buffer = Buffer.from('dummy file content');
    const res = await request(app)
      .post('/api/employees/documents/upload')
      .set('Authorization', `Bearer ${employeeToken}`)
      .field('documentType', 'OTHER')
      .field('documentName', 'Test Doc')
      .field('employeeId', employeeId)
      .attach('file', buffer, 'test.txt');

    if(res.status !== 200) console.log(res.body); expect(res.status).toBe(200);
    documentId = res.body.data.id;

    // Get download link
    const dlRes = await request(app)
      .get(`/api/employees/documents/${documentId}/download-link`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(dlRes.status).toBe(200);
    expect(dlRes.body.data.downloadUrl).toContain('token=');
  });

  it('should change password and invalidate old token', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        currentPassword: 'password123',
        newPassword: 'newpassword123'
      });
    
    if(res.status !== 200) console.log(res.body); expect(res.status).toBe(200);

    // Old token should now be invalid because tokenVersion incremented
    const fetchRes = await request(app)
      .get(`/api/employees/${employeeId}`)
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(fetchRes.status).toBe(401);
  });
});
