import { ExpenseStatus } from '@prisma/client';
import { getModuleScope } from '../../utils/authorization';
import prisma from '../../config/database';

interface CurrentUser {
  id: string;
  role: string;
  employeeId?: string | null;
}

export class ExpenseService {
  async getAll(currentUser: CurrentUser, query: any) {
    const scope = getModuleScope(currentUser.role as any, 'office_expenses');
    
    // If not ORG scope, they can only see their own submissions
    const whereClause: any = {};
    if (scope !== 'ORG') {
      if (!currentUser.employeeId) throw new Error('Not authorized');
      whereClause.submittedById = currentUser.employeeId;
    }

    return prisma.officeExpense.findMany({
      where: whereClause,
      include: {
        submittedBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(currentUser: CurrentUser, data: any) {
    if (!currentUser.employeeId) throw new Error('Employee ID required to submit expense');

    return prisma.officeExpense.create({
      data: {
        expenseDate: new Date(data.expenseDate),
        category: data.category,
        description: data.description,
        amount: data.amount,
        billUpload: data.billUpload,
        submittedById: currentUser.employeeId,
      }
    });
  }

  async delete(currentUser: CurrentUser, id: string, reqContext: { ipAddress?: string } = {}) {
    const scope = getModuleScope(currentUser.role as any, 'office_expenses');
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "OfficeExpense" WHERE "id" = ${id} FOR UPDATE`;
      const expense = await tx.officeExpense.findUnique({ where: { id } });
      if (!expense) throw new Error('Expense not found.');
      if (scope !== 'ORG') {
        if (scope !== 'SELF' || expense.submittedById !== currentUser.employeeId) throw new Error('Not authorized to delete this expense.');
        if (expense.status !== ExpenseStatus.PENDING) throw new Error('Only pending expenses can be deleted.');
      }
      await tx.auditLog.create({ data: {
        actionPerformed: 'DELETE_OFFICE_EXPENSE',
        moduleAffected: 'expenses',
        recordIdAffected: expense.id,
        userId: currentUser.id,
        ipAddress: reqContext.ipAddress,
        oldValue: JSON.stringify({ category: expense.category, amount: expense.amount, status: expense.status, description: expense.description }),
      } });
      await tx.officeExpense.delete({ where: { id } });
      return { id };
    });
  }

  async updateStatus(currentUser: CurrentUser, id: string, data: any) {
    const scope = getModuleScope(currentUser.role as any, 'office_expenses');
    if (scope !== 'ORG') throw new Error('Not authorized to approve expenses');
    if (!currentUser.employeeId) throw new Error('Employee ID required to approve expense');

    const existing = await prisma.officeExpense.findUnique({ where: { id } });
    if (!existing) throw new Error('Expense not found');
    const transitions: Record<ExpenseStatus, ExpenseStatus[]> = {
      PENDING: [ExpenseStatus.APPROVED, ExpenseStatus.REJECTED],
      APPROVED: [ExpenseStatus.PAID],
      REJECTED: [],
      PAID: [],
    };
    if (!transitions[existing.status].includes(data.status)) {
      throw new Error('Expense status transition is not allowed');
    }

    return prisma.officeExpense.update({
      where: { id, status: existing.status },
      data: {
        status: data.status,
        approvedById: currentUser.employeeId
      }
    });
  }
}

export const expenseService = new ExpenseService();
