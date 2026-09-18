import prisma from '../../config/database';
import { ApplyLeaveInput, UpdateLeaveStatusInput } from './leave.schema';

export class LeaveService {
  async apply(employeeId: string, data: ApplyLeaveInput) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate < startDate) {
      throw new Error('End date must be after start date');
    }

    // Calculate total days (excluding weekends)
    let totalDays = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        totalDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    if (totalDays === 0) {
      throw new Error('Leave period must include at least one working day');
    }

    // Check leave balance
    const currentYear = new Date().getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_year_leaveType: {
          employeeId,
          year: currentYear,
          leaveType: data.leaveType as any,
        },
      },
    });

    if (balance && balance.remainingDays.toNumber() < totalDays && data.leaveType !== 'UNPAID') {
      throw new Error(`Insufficient ${data.leaveType} leave balance. Available: ${balance.remainingDays.toNumber()} days`);
    }

    // Check for overlapping leaves
    const overlapping = await prisma.leave.findFirst({
      where: {
        employeeId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
      },
    });

    if (overlapping) {
      throw new Error('You already have a leave request for this period');
    }

    return prisma.leave.create({
      data: {
        employeeId,
        leaveType: data.leaveType as any,
        startDate,
        endDate,
        totalDays,
        reason: data.reason,
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async updateStatus(leaveId: string, approverId: string, data: UpdateLeaveStatusInput) {
    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
    });

    if (!leave) {
      throw new Error('Leave request not found');
    }

    if (leave.status !== 'PENDING') {
      throw new Error('This leave request has already been processed');
    }

    const currentYear = new Date().getFullYear();

    // If approved, update leave balance
    if (data.status === 'APPROVED' && leave.leaveType !== 'UNPAID') {
      await prisma.leaveBalance.updateMany({ where: { employeeId: leave.employeeId, year: currentYear, leaveType: leave.leaveType },
        data: {
          usedDays: { increment: leave.totalDays },
          remainingDays: { decrement: leave.totalDays },
        },
      });
    }

    return prisma.leave.update({
      where: { id: leaveId },
      data: {
        status: data.status as any,
        remarks: data.remarks,
        approverId,
      },
      include: {
        employee: { select: { firstName: true, lastName: true, email: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async getMyLeaves(employeeId: string, status?: string) {
    const where: any = { employeeId };
    if (status) where.status = status;

    return prisma.leave.findMany({
      where,
      include: {
        approver: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingApprovals(user: any) {
    const whereClause = (user?.role === 'ADMIN' || user?.role === 'HR' || user?.role === 'MANAGER') ? {} : { employeeId: user?.employeeId };
    return prisma.leave.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            designation: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLeaveBalances(employeeId: string) {
    const currentYear = new Date().getFullYear();
    return prisma.leaveBalance.findMany({
      where: { employeeId, year: currentYear },
      orderBy: { leaveType: 'asc' },
    });
  }

  async cancelLeave(leaveId: string, employeeId: string) {
    const leave = await prisma.leave.findFirst({
      where: { id: leaveId, employeeId },
    });

    if (!leave) {
      throw new Error('Leave request not found');
    }

    if (leave.status !== 'PENDING') {
      throw new Error('Only pending leave requests can be cancelled');
    }

    return prisma.leave.update({
      where: { id: leaveId },
      data: { status: 'CANCELLED' },
    });
  }

  async getDashboardStats() {
    const [pendingCount, todayOnLeave] = await Promise.all([
      prisma.leave.count({ where: { status: 'PENDING' } }),
      prisma.leave.findMany({
        where: {
          status: 'APPROVED',
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
        include: {
          employee: {
            select: { firstName: true, lastName: true, designation: true },
          },
        },
      }),
    ]);

    return { pendingCount, todayOnLeave };
  }
}

export const leaveService = new LeaveService();
