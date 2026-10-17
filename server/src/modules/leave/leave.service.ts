import prisma from '../../config/database';
import { ApplyLeaveInput, UpdateLeaveStatusInput } from './leave.schema';

export class LeaveService {
  async apply(employeeId: string, data: ApplyLeaveInput) {
    // PostgreSQL date columns use the UTC calendar day; normalize without a local timezone shift.
    const parseDateOnly = (value: Date | string) => {
      if (value instanceof Date) {
        return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
      }

      const [year, month, day] = value.slice(0, 10).split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        throw new Error('A valid calendar date is required');
      }
      return date;
    };
    const startDate = parseDateOnly(data.startDate);
    const endDate = parseDateOnly(data.endDate);

    if (endDate < startDate) {
      throw new Error('End date must be after start date');
    }

    // Sunday is the weekly off; Saturdays are working days.
    let totalDays = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getUTCDay();
      if (dayOfWeek !== 0) {
        totalDays++;
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }

    if (totalDays === 0) {
      throw new Error('Leave period must include at least one working day');
    }

    if ((data.isHalfDay || data.isHourly) && startDate.getTime() !== endDate.getTime()) {
      throw new Error('Half-day and hourly leaves must be for a single day only.');
    }

    // Adjust for half-day or hourly leave
    if (data.isHalfDay && totalDays === 1) {
      totalDays = 0.5;
    } else if (data.isHourly && totalDays === 1 && data.hourlyDuration) {
      // Convert hours to fraction of a day (8-hour workday)
      totalDays = parseFloat((data.hourlyDuration / (8 * 60)).toFixed(4));
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
        isHalfDay: data.isHalfDay ?? false,
        isHourly: data.isHourly ?? false,
        hourlyDuration: data.isHourly ? (data.hourlyDuration ?? null) : null,
        halfDayPeriod: data.isHalfDay ? (data.halfDayPeriod ?? null) : null,
        hourlyStartTime: data.isHourly ? (data.hourlyStartTime ?? null) : null,
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

    return prisma.$transaction(async (tx) => {
      // Claim the pending transition before touching balances. Concurrent retries
      // cannot charge the employee twice; every write rolls back on failure.
      const claimed = await tx.leave.updateMany({
        where: { id: leaveId, status: 'PENDING' },
        data: { status: data.status as any, remarks: data.remarks, approverId },
      });
      if (claimed.count !== 1) throw new Error('This leave request has already been processed');
      if (data.status === 'APPROVED' && leave.leaveType !== 'UNPAID') {
        const year = leave.startDate.getUTCFullYear();
        const balance = await tx.leaveBalance.findUnique({
          where: { employeeId_year_leaveType: { employeeId: leave.employeeId, year, leaveType: leave.leaveType } },
        });
        if (balance) {
          const updated = await tx.leaveBalance.updateMany({
            where: { id: balance.id, remainingDays: { gte: leave.totalDays } },
            data: { usedDays: { increment: leave.totalDays }, remainingDays: { decrement: leave.totalDays } },
          });
          if (updated.count !== 1) throw new Error('Insufficient leave balance for approval');
        }
      }
      return tx.leave.findUniqueOrThrow({
        where: { id: leaveId },
        include: {
          employee: { select: { firstName: true, lastName: true, email: true } },
          approver: { select: { firstName: true, lastName: true } },
        },
      });
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
        approver: { select: { firstName: true, lastName: true } },
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
