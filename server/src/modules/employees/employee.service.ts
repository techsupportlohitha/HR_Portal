import prisma from '../../config/database';
import crypto from 'crypto';
import { hashPassword } from '../../utils/password';
import { notificationService } from '../notifications/notification.service';
import { CreateEmployeeInput, UpdateEmployeeInput } from './employee.schema';
import { Prisma, Role } from '@prisma/client';
import { getModuleScope, getEmployeeScopeQuery } from '../../utils/authorization';

interface CurrentUser {
  id: string;
  role: Role;
  employeeId?: string;
}

export class EmployeeService {
  async getAll(
    currentUser: CurrentUser,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      departmentId?: string;
      status?: string;
      location?: string;
    }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const scope = getModuleScope(currentUser.role, 'employees');
    // If not an ORG admin and no employee profile linked, return empty
    if (scope !== 'ORG' && !currentUser.employeeId) {
       return { employees: [], meta: { page, limit, total: 0, totalPages: 0 } };
    }

    const scopeQuery = currentUser.employeeId 
      ? getEmployeeScopeQuery(scope, currentUser.employeeId) 
      : {};

    const baseWhere: Prisma.EmployeeWhereInput = {
      AND: [
        { isActive: true },
        scopeQuery
      ]
    };

    if (query.search) {
      baseWhere.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { employeeCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.departmentId) {
      baseWhere.departmentId = query.departmentId;
    }

    if (query.status) {
      baseWhere.status = query.status as any;
    }

    if (query.location) {
      baseWhere.location = query.location;
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where: baseWhere,
        skip,
        take: limit,
        include: {
          department: { select: { id: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.employee.count({ where: baseWhere }),
    ]);

    return {
      employees,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(currentUser: CurrentUser, id: string) {
    const scope = getModuleScope(currentUser.role, 'employees');
    if (scope !== 'ORG' && !currentUser.employeeId) {
      throw new Error('Not authorized');
    }

    const scopeQuery = currentUser.employeeId 
      ? getEmployeeScopeQuery(scope, currentUser.employeeId) 
      : {};

    const employee = await prisma.employee.findFirst({
      where: {
        AND: [
          { id },
          { isActive: true },
          scopeQuery
        ]
      },
      include: {
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
        subordinates: { select: { id: true, firstName: true, lastName: true, designation: true } },
        user: { select: { id: true, email: true, role: true, isActive: true } },
        documents: true,
        assignedAssets: true,
        trainingParticipations: {
          include: {
            training: true,
          },
        },
        performanceReviews: true,
      },
    });

    if (!employee) {
      throw new Error('Employee not found or not accessible');
    }

        // Notify HRs about new joining
    await notificationService.notifyHRs({
      notificationType: 'JOINING',
      message: `New employee joined: ${employee.firstName} ${employee.lastName}`,
      triggerEvent: employee.id
    });

    return employee;
  }

  async create(currentUser: CurrentUser, data: CreateEmployeeInput, reqContext: { ipAddress?: string } = {}) {
    const employee = await prisma.employee.create({
      data: {
        employeeCode: data.employeeCode,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender as any,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
        joiningDate: new Date(data.joiningDate),
        designation: data.designation,
        salary: data.salary,
        departmentId: data.departmentId,
        managerId: data.managerId,
        status: data.status ? (data.status as any) : undefined,
        employmentType: data.employmentType as any,
        location: data.location,
      },
      include: {
        department: { select: { id: true, name: true } },
      },
    });


    
    await prisma.auditLog.create({
      data: {
        actionPerformed: 'CREATE_EMPLOYEE',
        moduleAffected: 'employees',
        recordIdAffected: employee.id,
        userId: currentUser.id,
        ipAddress: reqContext.ipAddress,
        newValue: JSON.stringify(data),
      }
    });

    // Generate a secure temporary password
    const temporaryPassword = crypto.randomBytes(4).toString('hex') + 'aA1!'; 
    const hashedPassword = await hashPassword(temporaryPassword);

    // Create the associated User account
    await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        role: 'EMPLOYEE', // Default role
        employeeId: employee.id,
      }
    });

    return { employee, temporaryPassword };
  }

  async update(currentUser: CurrentUser, id: string, data: UpdateEmployeeInput, reqContext: { ipAddress?: string } = {}) {
    // Capture state before update for audit diff
    const beforeUpdate = await prisma.employee.findUnique({ where: { id } });
    const scope = getModuleScope(currentUser.role, 'employees');
    
    if (scope !== 'ORG') {
      if (!currentUser.employeeId) throw new Error('Not authorized');
      
      if (scope === 'SELF' && id !== currentUser.employeeId) {
        throw new Error('Not authorized to update this employee');
      }
      
      if (scope === 'TEAM') {
        const target = await prisma.employee.findUnique({ where: { id } });
        if (!target) throw new Error('Employee not found');
        if (target.id !== currentUser.employeeId && target.managerId !== currentUser.employeeId) {
          throw new Error('Not authorized to update this employee');
        }
      }
    }

    const updateData: any = { ...data };

    if (data.dateOfBirth) {
      updateData.dateOfBirth = new Date(data.dateOfBirth);
    }
    if (data.joiningDate) {
      updateData.joiningDate = new Date(data.joiningDate);
    }
    if (data.managerId !== undefined) {
      updateData.managerId = data.managerId || null;
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    
    await prisma.auditLog.create({
      data: {
        actionPerformed: 'UPDATE_EMPLOYEE',
        moduleAffected: 'employees',
        recordIdAffected: employee.id,
        userId: currentUser.id,
        ipAddress: reqContext.ipAddress,
        newValue: JSON.stringify(updateData),
      }
    });

    return employee;
  }

  async delete(currentUser: CurrentUser, id: string, reqContext: { ipAddress?: string } = {}) {
    // Soft delete instead of cascade delete!
    await prisma.$transaction(async (tx) => {
      // 1. Deactivate user
      await tx.user.updateMany({
        where: { employeeId: id },
        data: { isActive: false, deactivatedAt: new Date(), tokenVersion: { increment: 1 } }
      });
      // 2. Deactivate employee
      await tx.employee.update({
        where: { id },
        data: { isActive: false, deactivatedAt: new Date(), status: 'INACTIVE' }
      });
    });

    await prisma.auditLog.create({
      data: {
        actionPerformed: 'DEACTIVATE_EMPLOYEE',
        moduleAffected: 'employees',
        recordIdAffected: id,
        userId: currentUser.id,
        ipAddress: reqContext.ipAddress,
      }
    });
  }

  async getDashboardStats(currentUser: CurrentUser) {
    const scope = getModuleScope(currentUser.role, 'employees');
    const scopeQuery = currentUser.employeeId 
      ? getEmployeeScopeQuery(scope, currentUser.employeeId) 
      : {};

    const baseWhere = {
      AND: [
        { isActive: true },
        scopeQuery
      ]
    };

    const [totalEmployees, activeEmployees, departments, recentJoinees] = await Promise.all([
      prisma.employee.count({ where: baseWhere }),
      prisma.employee.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
      prisma.department.count(),
      prisma.employee.findMany({
        where: {
          ...baseWhere,
          joiningDate: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
          },
        },
        select: { id: true, firstName: true, lastName: true, joiningDate: true, designation: true },
        orderBy: { joiningDate: 'desc' },
        take: 5,
      }),
    ]);

    return {
      totalEmployees,
      activeEmployees,
      inactiveEmployees: totalEmployees - activeEmployees,
      departments,
      recentJoinees,
    };
  }
}

export const employeeService = new EmployeeService();
