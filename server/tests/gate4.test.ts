import request from 'supertest';
import app from '../src/app';

describe('Gate 4 Dashboard, Attrition, and Reports', () => {
  let adminToken: string;
  let empToken: string;
  let hrToken: string;

  beforeAll(async () => {
    const resAdmin = await request(app).post('/api/auth/login').send({ email: 'admin@hrms.com', password: 'password123' });
    adminToken = resAdmin.body.data.token;

    const resHr = await request(app).post('/api/auth/login').send({ email: 'priya.sharma@hrms.com', password: 'password123' });
    hrToken = resHr.body.data.token;

    const resEmp = await request(app).post('/api/auth/login').send({ email: 'ananya.patel@hrms.com', password: 'password123' });
    empToken = resEmp.body.data.token;
  });

  describe('Dashboard Stats', () => {
    it('Admin can get dashboard stats', async () => {
      const res = await request(app).get('/api/dashboard/stats').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('headline.activeEmployees');
      expect(res.body.data).toHaveProperty('moduleOverview.travel.pendingApprovals');
      expect(res.body.data).toHaveProperty('moduleOverview.assets.total');
    });

    it('Employee can get their own scoped stats', async () => {
      const res = await request(app).get('/api/dashboard/stats').set('Authorization', `Bearer ${empToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('headline.activeEmployees');
      expect(res.body.data).toHaveProperty('moduleOverview');
    });

    it('Dashboard totals are non-negative numbers', async () => {
      const res = await request(app).get('/api/dashboard/stats').set('Authorization', `Bearer ${adminToken}`);
      const data = res.body.data;
      expect(data.headline.activeEmployees).toBeGreaterThanOrEqual(0);
      expect(data.moduleOverview.travel.pendingApprovals).toBeGreaterThanOrEqual(0);
      expect(data.moduleOverview.leave.pendingApprovals).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Attrition Analytics', () => {
    it('Admin can get attrition stats', async () => {
      const res = await request(app).get('/api/dashboard/attrition').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('attritionRate');
      expect(res.body.data).toHaveProperty('joinTrend');
      expect(res.body.data).toHaveProperty('departmentBreakdown');
    });

    it('HR can get attrition stats', async () => {
      const res = await request(app).get('/api/dashboard/attrition').set('Authorization', `Bearer ${hrToken}`);
      expect(res.status).toBe(200);
    });

    it('Employee cannot get attrition stats', async () => {
      const res = await request(app).get('/api/dashboard/attrition').set('Authorization', `Bearer ${empToken}`);
      expect(res.status).toBe(403);
    });

    it('Attrition rate is a valid percentage', async () => {
      const res = await request(app).get('/api/dashboard/attrition').set('Authorization', `Bearer ${adminToken}`);
      const rate = res.body.data.attritionRate;
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });

    it('Join trend has 6 months of data', async () => {
      const res = await request(app).get('/api/dashboard/attrition').set('Authorization', `Bearer ${adminToken}`);
      expect(res.body.data.joinTrend).toHaveLength(6);
    });
  });

  describe('Reports', () => {
    it('Admin can get employee report', async () => {
      const res = await request(app).get('/api/dashboard/reports/employees').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Employee cannot get reports', async () => {
      const res = await request(app).get('/api/dashboard/reports/employees').set('Authorization', `Bearer ${empToken}`);
      expect(res.status).toBe(403);
    });

    it('Admin can get travel report', async () => {
      const res = await request(app).get('/api/dashboard/reports/travel').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('Admin can get recruitment report', async () => {
      const res = await request(app).get('/api/dashboard/reports/recruitment').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('Admin can export CSV report', async () => {
      const res = await request(app)
        .get('/api/dashboard/reports/employees?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
    });

    it('Unknown report type returns 400', async () => {
      const res = await request(app).get('/api/dashboard/reports/unknown_type').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });
  });
});
