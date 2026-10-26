import prisma from '../../config/database';
import { CreateDepartmentInput, UpdateDepartmentInput } from './department.schema';

export class DepartmentService {
  async getAll() {
    return prisma.department.findMany({
      include: {
        head: { select: { id: true, firstName: true, lastName: true, designation: true } },
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getById(id: string) {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        head: { select: { id: true, firstName: true, lastName: true, designation: true } },
        employees: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            designation: true,
            email: true,
            status: true,
          },
          orderBy: { firstName: 'asc' },
        },
      },
    });

    if (!department) {
      throw new Error('Department not found');
    }

    return department;
  }

  async create(data: CreateDepartmentInput) {
    return prisma.department.create({
      data: {
        name: data.name,
        description: data.description,
        headId: data.headId || null,
      },
      include: {
        head: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { employees: true } },
      },
    });
  }

  async update(id: string, data: UpdateDepartmentInput) {
    return prisma.department.update({
      where: { id },
      data: { ...data, ...(data.headId !== undefined ? { headId: data.headId || null } : {}) },
      include: {
        head: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { employees: true } },
      },
    });
  }

  async delete(id: string) {
    // Unassign employees from this department first
    await prisma.employee.updateMany({
      where: { departmentId: id },
      data: { departmentId: null },
    });
    await prisma.department.delete({ where: { id } });
  }
}

export const departmentService = new DepartmentService();
