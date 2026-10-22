jest.mock('../src/config/database', () => ({
  __esModule: true,
  default: { employee: { findFirst: jest.fn() } },
}));

import prisma from '../src/config/database';
import { employeeService } from '../src/modules/employees/employee.service';
import { generatePublicEmployeeCardToken } from '../src/utils/jwt';

describe('public employee card data', () => {
  it('queries and returns only the public identity fields', async () => {
    const findFirst = prisma.employee.findFirst as jest.Mock;
    findFirst.mockResolvedValue({
      employeeCode: 'EMP-001',
      firstName: 'Devi',
      lastName: 'Employee',
      designation: 'Quality Analyst',
      profilePhoto: '/api/uploads/employee-profile.jpg',
      department: { name: 'Quality' },
    });

    const result = await employeeService.getPublicCard(generatePublicEmployeeCardToken('employee-123'));

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'employee-123', isActive: true, status: { in: ['ACTIVE', 'ON_LEAVE'] } },
      select: {
        employeeCode: true,
        firstName: true,
        lastName: true,
        designation: true,
        profilePhoto: true,
        department: { select: { name: true } },
      },
    });
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('salary');
  });
});
