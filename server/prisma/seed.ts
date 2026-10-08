import { PrismaClient, Role, Gender } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    console.warn('Skipping database seed in production. Set ALLOW_PRODUCTION_SEED=true only for an intentional seed operation.');
    return;
  }

  console.log('?? Seeding database with clean slate...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Departments (Essential structure)
  const engineering = await prisma.department.upsert({
    where: { name: 'IT' },
    update: {},
    create: { name: 'IT', description: 'IT Department' },
  });

  const hr = await prisma.department.upsert({
    where: { name: 'HR&Admin' },
    update: {},
    create: { name: 'HR&Admin', description: 'Human Resources' },
  });

  const marketing = await prisma.department.upsert({
    where: { name: 'Procurement' },
    update: {},
    create: { name: 'Procurement', description: 'Procurement' },
  });

  const finance = await prisma.department.upsert({
    where: { name: 'Accounts' },
    update: {},
    create: { name: 'Accounts', description: 'Accounts & Finance' },
  });

  const operations = await prisma.department.upsert({
    where: { name: 'Commercial' },
    update: {},
    create: { name: 'Commercial', description: 'Commercial Operations' },
  });

  await prisma.department.upsert({
    where: { name: 'Quality' },
    update: {},
    create: { name: 'Quality', description: 'Quality Assurance' },
  });

  await prisma.department.upsert({
    where: { name: 'Export' },
    update: {},
    create: { name: 'Export', description: 'Export & Shipping' },
  });

  await prisma.department.upsert({
    where: { name: 'MIS' },
    update: {},
    create: { name: 'MIS', description: 'Management Information Systems' },
  });

  await prisma.department.upsert({
    where: { name: 'Automobile' },
    update: {},
    create: { name: 'Automobile', description: 'Automobile Management' },
  });


  // Create only the foundational Admin Employee
  const adminEmployee = await prisma.employee.upsert({
    where: { email: 'admin@hrms.com' },
    update: {},
    create: {
      employeeCode: 'EMP-001',
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@hrms.com',
      gender: Gender.OTHER,
      joiningDate: new Date('2024-01-01'),
      designation: 'System Administrator',
      status: 'ACTIVE',
      departmentId: engineering.id,
    },
  });

  // Create only the foundational Admin User
  await prisma.user.upsert({
    where: { email: 'admin@hrms.com' },
    update: { password: hashedPassword, role: Role.ADMIN, employeeId: adminEmployee.id },
    create: {
      email: 'admin@hrms.com',
      password: hashedPassword,
      role: Role.ADMIN,
      employeeId: adminEmployee.id,
    },
  });

  console.log('? Clean seed completed. Only admin@hrms.com (password123) has been created.');
}

main()
  .catch((e) => {
    console.error('? Failed to seed database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
