import { PrismaClient, Role, Gender } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    console.error('❌ Destructive seeding is only allowed in development or test environments.');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Departments
  const engineering = await prisma.department.upsert({
    where: { name: 'HR&ADMIN-IT' },
    update: {},
    create: { name: 'HR&ADMIN-IT', description: 'HR & Admin IT' },
  });

  const hr = await prisma.department.upsert({
    where: { name: 'HR & ADMIN' },
    update: {},
    create: { name: 'HR & ADMIN', description: 'HR & Admin' },
  });

  const marketing = await prisma.department.upsert({
    where: { name: 'PROCUREMENT' },
    update: {},
    create: { name: 'PROCUREMENT', description: 'Procurement' },
  });

  const finance = await prisma.department.upsert({
    where: { name: 'ACCOUNTS' },
    update: {},
    create: { name: 'ACCOUNTS', description: 'Accounts' },
  });

  const operations = await prisma.department.upsert({
    where: { name: 'COMMERCIAL' },
    update: {},
    create: { name: 'COMMERCIAL', description: 'Commercial' },
  });



  console.log('✅ Departments upserted');

  // Employees
  const adminEmployee = await prisma.employee.upsert({
    where: { email: 'admin@hrms.com' },
    update: {},
    create: {
      employeeCode: 'EMP001',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@hrms.com',
      phone: '+91 9876543210',
      dateOfBirth: new Date('1985-06-15'),
      gender: Gender.MALE,
      joiningDate: new Date('2020-01-01'),
      designation: 'System Administrator',
      departmentId: engineering.id,
    },
  });

  const hrManager = await prisma.employee.upsert({
    where: { email: 'priya.sharma@hrms.com' },
    update: {},
    create: {
      employeeCode: 'EMP002',
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya.sharma@hrms.com',
      phone: '+91 9876543211',
      dateOfBirth: new Date('1990-03-22'),
      gender: Gender.FEMALE,
      joiningDate: new Date('2021-03-15'),
      designation: 'HR Manager',
      departmentId: hr.id,
    },
  });

  const hrExecutive = await prisma.employee.upsert({
    where: { email: 'hr.exec@hrms.com' },
    update: {},
    create: {
      employeeCode: 'EMP008',
      firstName: 'Neha',
      lastName: 'Gupta',
      email: 'hr.exec@hrms.com',
      phone: '+91 9876543217',
      dateOfBirth: new Date('1992-05-10'),
      gender: Gender.FEMALE,
      joiningDate: new Date('2021-08-20'),
      designation: 'HR Executive',
      departmentId: hr.id,
      managerId: hrManager.id,
    },
  });

  const engManager = await prisma.employee.upsert({
    where: { email: 'rahul.verma@hrms.com' },
    update: {},
    create: {
      employeeCode: 'EMP003',
      firstName: 'Rahul',
      lastName: 'Verma',
      email: 'rahul.verma@hrms.com',
      phone: '+91 9876543212',
      dateOfBirth: new Date('1988-11-10'),
      gender: Gender.MALE,
      joiningDate: new Date('2020-06-01'),
      designation: 'Engineering Manager',
      departmentId: engineering.id,
    },
  });

  const employee1 = await prisma.employee.upsert({
    where: { email: 'ananya.patel@hrms.com' },
    update: {},
    create: {
      employeeCode: 'EMP004',
      firstName: 'Ananya',
      lastName: 'Patel',
      email: 'ananya.patel@hrms.com',
      phone: '+91 9876543213',
      dateOfBirth: new Date('1995-07-08'),
      gender: Gender.FEMALE,
      joiningDate: new Date('2022-01-10'),
      designation: 'Software Engineer',
      departmentId: engineering.id,
      managerId: engManager.id,
    },
  });

  const employee2 = await prisma.employee.upsert({
    where: { email: 'vikram.singh@hrms.com' },
    update: {},
    create: {
      employeeCode: 'EMP005',
      firstName: 'Vikram',
      lastName: 'Singh',
      email: 'vikram.singh@hrms.com',
      phone: '+91 9876543214',
      dateOfBirth: new Date('1993-02-28'),
      gender: Gender.MALE,
      joiningDate: new Date('2022-06-20'),
      designation: 'Senior Software Engineer',
      departmentId: engineering.id,
      managerId: engManager.id,
    },
  });

  console.log('✅ Employees upserted');

  // Update department heads
  await prisma.department.update({
    where: { id: engineering.id },
    data: { headId: engManager.id },
  });

  await prisma.department.update({
    where: { id: hr.id },
    data: { headId: hrManager.id },
  });
  console.log('✅ Department heads assigned');

  // Users
  await prisma.user.upsert({
    where: { email: 'admin@hrms.com' },
    update: { password: hashedPassword, role: Role.ADMIN, employeeId: adminEmployee.id },
    create: { email: 'admin@hrms.com', password: hashedPassword, role: Role.ADMIN, employeeId: adminEmployee.id },
  });
  await prisma.user.upsert({
    where: { email: 'priya.sharma@hrms.com' },
    update: { password: hashedPassword, role: Role.HR, employeeId: hrManager.id },
    create: { email: 'priya.sharma@hrms.com', password: hashedPassword, role: Role.HR, employeeId: hrManager.id },
  });
  await prisma.user.upsert({
    where: { email: 'hr.exec@hrms.com' },
    update: { password: hashedPassword, role: Role.HR_EXECUTIVE, employeeId: hrExecutive.id },
    create: { email: 'hr.exec@hrms.com', password: hashedPassword, role: Role.HR_EXECUTIVE, employeeId: hrExecutive.id },
  });
  await prisma.user.upsert({
    where: { email: 'rahul.verma@hrms.com' },
    update: { password: hashedPassword, role: Role.MANAGER, employeeId: engManager.id },
    create: { email: 'rahul.verma@hrms.com', password: hashedPassword, role: Role.MANAGER, employeeId: engManager.id },
  });
  await prisma.user.upsert({
    where: { email: 'ananya.patel@hrms.com' },
    update: { password: hashedPassword, role: Role.EMPLOYEE, employeeId: employee1.id },
    create: { email: 'ananya.patel@hrms.com', password: hashedPassword, role: Role.EMPLOYEE, employeeId: employee1.id },
  });
  await prisma.user.upsert({
    where: { email: 'vikram.singh@hrms.com' },
    update: { password: hashedPassword, role: Role.EMPLOYEE, employeeId: employee2.id },
    create: { email: 'vikram.singh@hrms.com', password: hashedPassword, role: Role.EMPLOYEE, employeeId: employee2.id },
  });

  console.log('✅ User accounts upserted');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Login Credentials (password for all: password123):');
  console.log('   Admin:        admin@hrms.com');
  console.log('   HR:           priya.sharma@hrms.com');
  console.log('   HR Executive: hr.exec@hrms.com');
  console.log('   Manager:      rahul.verma@hrms.com');
  console.log('   Employee:     ananya.patel@hrms.com');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
