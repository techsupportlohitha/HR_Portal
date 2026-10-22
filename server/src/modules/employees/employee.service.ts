import prisma from '../../config/database';
import crypto from 'crypto';
import { hashPassword } from '../../utils/password';
import { notificationService } from '../notifications/notification.service';
import { performanceService } from '../performance/performance.service';
import { CreateEmployeeInput, UpdateEmployeeInput } from './employee.schema';
import { Prisma, Role } from '@prisma/client';
import { getModuleScope, getEmployeeScopeQuery } from '../../utils/authorization';
import { generatePublicEmployeeCardToken, verifyPublicEmployeeCardToken } from '../../utils/jwt';

interface CurrentUser {
  id: string;
  role: Role;
  employeeId?: string;
}

export class EmployeeService {
  async createPublicCardToken(currentUser: CurrentUser, id: string) {
    const scope = getModuleScope(currentUser.role, 'employees');
    if (scope !== 'ORG' && !currentUser.employeeId) throw new Error('Not authorized');
    const scopeQuery = currentUser.employeeId
      ? getEmployeeScopeQuery(scope, currentUser.employeeId)
      : {};
    const employee = await prisma.employee.findFirst({
      where: { AND: [{ id, isActive: true, status: { in: ['ACTIVE', 'ON_LEAVE'] } }, scopeQuery] },
      select: { id: true },
    });
    if (!employee) throw new Error('Employee not found or not accessible');
    return generatePublicEmployeeCardToken(employee.id);
  }

  async getPublicCard(token: string) {
    const employeeId = verifyPublicEmployeeCardToken(token);
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, isActive: true, status: { in: ['ACTIVE', 'ON_LEAVE'] } },
      select: {
        employeeCode: true,
        firstName: true,
        lastName: true,
        designation: true,
        profilePhoto: true,
        department: { select: { name: true } },
      },
    });
    if (!employee) throw new Error('This employee pass is no longer active.');
    return employee;
  }

  async getAll(
    currentUser: CurrentUser,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      departmentId?: string;
      status?: string;
      location?: string;
      history?: boolean;
      assignmentOptions?: boolean;
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

    const employmentStatusFilter: Prisma.EmployeeWhereInput = query.history
      ? { status: { in: ['INACTIVE', 'RESIGNED', 'TERMINATED'] } }
      : { isActive: true };
    // Role Management creates lightweight, linked account profiles with reserved USR-* codes.
    // Keep those profiles available to assignment lookups, but out of employee management.
    const roleAccountProfileFilter: Prisma.EmployeeWhereInput = query.assignmentOptions
      ? {}
      : { NOT: { employeeCode: { startsWith: 'USR-' } } };

    const baseWhere: Prisma.EmployeeWhereInput = {
      AND: [
        employmentStatusFilter,
        roleAccountProfileFilter,
        scopeQuery
      ]
    };

    const searchTerms = query.search?.trim().split(/\s+/).filter(Boolean) ?? [];
    if (searchTerms.length) {
      baseWhere.AND = [
        employmentStatusFilter,
        roleAccountProfileFilter,
        scopeQuery,
        ...searchTerms.map((term): Prisma.EmployeeWhereInput => ({
          OR: [
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { employeeCode: { contains: term, mode: 'insensitive' } },
          ],
        })),
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
          user: { select: { role: true, isActive: true } },
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

    if (currentUser.role === 'EMPLOYEE') {
      return { ...employee, performanceReviews: await performanceService.getMyReviews(employee.id) };
    }
    return employee;
  }

      async create(currentUser: CurrentUser, data: CreateEmployeeInput, reqContext: { ipAddress?: string } = {}) {
      const createData: any = { ...data };

      const numericFields = ['salary', 'ctc', 'basicSalary', 'grossSalary', 'probationPeriod', 'noticePeriod'];
      for (const field of numericFields) {
        if (createData[field] === '') {
          createData[field] = null;
        } else if (createData[field] !== undefined && createData[field] !== null) {
          createData[field] = Number(createData[field]);
        }
      }
      if (createData.departmentId === '') createData.departmentId = null;
      if (createData.managerId === '') createData.managerId = null;

      for (const field of ['dateOfBirth', 'joiningDate', 'confirmationDate', 'resignationDate', 'lastWorkingDate']) {
        if (createData[field]) createData[field] = new Date(createData[field]);
      }
      const { dateOfBirth, joiningDate, ...restData } = createData;

      let employee;
      try {
        employee = await prisma.employee.create({
          data: {
            ...restData as any,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            joiningDate: new Date(joiningDate),
          },
        include: {
          department: { select: { id: true, name: true } },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : (error.meta?.target || '');
        if (target.includes('email')) {
          throw new Error('This email address is already in use by another employee.');
        }
        if (target.includes('employeeCode')) {
          throw new Error('This Employee ID is already in use.');
        }
      }
      throw error;
    }


    
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

    
      await notificationService.notifyHRs({
        notificationType: 'JOINING',
        message: `New employee joined: ${employee.firstName} ${employee.lastName}`,
        triggerEvent: employee.id
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
    if (data.status === 'INACTIVE' || data.status === 'TERMINATED') {
      updateData.isActive = false;
      updateData.deactivatedAt = beforeUpdate?.deactivatedAt || new Date();
    } else if (data.status === 'ACTIVE') {
      updateData.isActive = true;
      updateData.deactivatedAt = null;
      if (beforeUpdate?.status === 'INACTIVE' || beforeUpdate?.status === 'TERMINATED') {
        updateData.lastWorkingDate = null;
      }
    }
    if (data.lastWorkingDate && data.status !== 'ACTIVE') {
      updateData.lastWorkingDate = new Date(data.lastWorkingDate);
    }

    const numericFields = ['salary', 'ctc', 'basicSalary', 'grossSalary', 'probationPeriod', 'noticePeriod'];
    for (const field of numericFields) {
      if (updateData[field] === '') {
        updateData[field] = null;
      } else if (updateData[field] !== undefined && updateData[field] !== null) {
        updateData[field] = Number(updateData[field]);
      }
    }
    
    if (updateData.departmentId === '') updateData.departmentId = null;

    for (const field of ['dateOfBirth', 'confirmationDate', 'resignationDate', 'lastWorkingDate']) {
      if (updateData[field]) updateData[field] = new Date(updateData[field]);
    }
    if (data.joiningDate) {
      updateData.joiningDate = new Date(data.joiningDate);
    }
    if (data.managerId !== undefined) {
      updateData.managerId = data.managerId || null;
    }

    const employee = await prisma.$transaction(async (tx) => {
      const updatedEmp = await tx.employee.update({
        where: { id },
        data: updateData,
        include: {
          department: { select: { id: true, name: true } },
        },
      });

      // Sync email to user account if it was changed
      if (data.email && beforeUpdate?.email !== data.email) {
        await tx.user.updateMany({
          where: { employeeId: id },
          data: { email: data.email }
        });
      }

      return updatedEmp;
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
        { NOT: { employeeCode: { startsWith: 'USR-' } } },
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
