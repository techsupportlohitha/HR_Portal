import { Router } from 'express';
import multer from 'multer';
import { employeeController } from './employee.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createEmployeeSchema, updateEmployeeSchema } from './employee.schema';

const router = Router();

router.use(authenticate);

router.get('/dashboard-stats', requirePermission('dashboard', 'view'), (req, res) =>
  employeeController.getDashboardStats(req, res)
);
router.get('/', requirePermission('employees', 'view'), (req, res) => employeeController.getAll(req, res));
router.get('/:id', requirePermission('employees', 'view'), (req, res) => employeeController.getById(req, res));
router.post('/', requirePermission('employees', 'add'), validate(createEmployeeSchema), (req, res) =>
  employeeController.create(req, res)
);
router.put('/:id', requirePermission('employees', 'edit'), validate(updateEmployeeSchema), (req, res) =>
  employeeController.update(req, res)
);
router.delete('/:id', requirePermission('employees', 'delete'), (req, res) => employeeController.delete(req, res));

const upload = multer({ dest: 'uploads/' });

router.post('/bulk-import', requirePermission('employees', 'add'), upload.single('file'), (req, res) => employeeController.bulkImport(req as any, res));

router.post('/:id/photo', requirePermission('employees', 'edit'), upload.single('photo'), async (req, res) => {
  try {
    const employeeId = req.params.id as string;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No photo uploaded' });
    }
    const photoUrl = `/api/uploads/${file.filename}`;
    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: { profilePhoto: photoUrl }
    });
    res.json({ success: true, message: 'Profile photo updated', data: updatedEmployee });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});


import prisma from '../../config/database';
import bcrypt from 'bcryptjs';

router.post('/fix-users', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({ where: { user: null } });
    let created = 0;
    for (const emp of employees) {
      if (!emp.email) continue;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      await prisma.user.create({
        data: {
          email: emp.email,
          password: hashedPassword,
          role: 'EMPLOYEE',
          employeeId: emp.id
        }
      });
      created++;
    }
    res.json({ success: true, message: `Created ${created} users`, data: employees });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});


router.post('/reactivate-and-fix', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany();
    let fixed = 0;
    for (const emp of employees) {
      // Reactivate
      await prisma.employee.update({
        where: { id: emp.id },
        data: { isActive: true, status: 'ACTIVE' }
      });
      
      // Create user if missing
      const user = await prisma.user.findUnique({ where: { employeeId: emp.id } });
      if (!user && emp.email) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);
        await prisma.user.create({
          data: {
            email: emp.email,
            password: hashedPassword,
            role: 'EMPLOYEE',
            employeeId: emp.id
          }
        });
      }
      fixed++;
    }
    res.json({ success: true, message: `Reactivated and fixed ${fixed} employees` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});


router.post('/clear-history', async (req, res) => {
  try {
    const deletedAudit = await prisma.auditLog.deleteMany({});
    const deletedLogin = await prisma.loginHistory.deleteMany({});
    res.json({ success: true, message: `Cleared ${deletedAudit.count} audit logs and ${deletedLogin.count} login records.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
