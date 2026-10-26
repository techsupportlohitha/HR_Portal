jest.mock('../src/config/database', () => ({ __esModule: true, default: { department: { create: jest.fn().mockResolvedValue({}), update: jest.fn().mockResolvedValue({}) } } }));
import prisma from '../src/config/database';
import { departmentService } from '../src/modules/departments/department.service';

test('creates an unassigned department without an invalid empty head foreign key', async () => {
  await departmentService.create({ name: 'CIVIL', headId: '' });
  expect(prisma.department.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ name: 'CIVIL', headId: null }) }));
});

test('clears a department head when None is selected', async () => {
  await departmentService.update('department', { headId: '' });
  expect(prisma.department.update).toHaveBeenCalledWith(expect.objectContaining({ data: { headId: null } }));
});
