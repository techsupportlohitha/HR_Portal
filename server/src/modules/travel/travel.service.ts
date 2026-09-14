import prisma from '../../config/database';
import { notificationService } from '../notifications/notification.service';
import { ApprovalStatus, SettlementStatus, Role, Prisma } from '@prisma/client';
import { getModuleScope } from '../../utils/authorization';
import { notificationDispatcher } from '../../utils/notification.dispatcher';

interface CurrentUser {
  userId: string;
  role: Role | string;
  employeeId?: string | null;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  APPROVAL_PENDING: ['APPROVAL_APPROVED', 'APPROVAL_REJECTED'],
  APPROVAL_APPROVED: [],   // only settle moves it forward
  APPROVAL_REJECTED: [],
};

export class TravelService {
  async createTravelRequest(currentUser: CurrentUser, data: any, reqContext: { ipAddress?: string } = {}) {
    if (!currentUser.employeeId) throw new Error('Only employees can create travel requests.');

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
      throw new Error('End date must be on or after the start date.');
    }

    const overlappingRequest = await prisma.travelRequest.findFirst({
      where: {
        employeeId: currentUser.employeeId,
        approvalStatus: { not: ApprovalStatus.APPROVAL_REJECTED },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { id: true },
    });

    if (overlappingRequest) {
      throw new Error('Travel request has overlapping dates with an existing request.');
    }


    const req = await prisma.travelRequest.create({
      data: {
        ...data,
        startDate,
        endDate,
        employeeId: currentUser.employeeId,
        approvalStatus: ApprovalStatus.APPROVAL_PENDING,
        settlementStatus: SettlementStatus.UNSETTLED,
      }
    });

    await prisma.auditLog.create({
      data: {
        actionPerformed: 'CREATE_TRAVEL_REQUEST',
        moduleAffected: 'travel',
        recordIdAffected: req.id,
        userId: currentUser.userId,
        ipAddress: reqContext.ipAddress,
      }
    });

    if (req.approverId) {
      await notificationService.createNotification({
        notificationType: 'TRAVEL_NOTIF',
        message: `New travel request pending approval from ${req.employeeId}.`,
        recipientId: req.approverId,
        triggerEvent: req.id
      });
    } else {
      await notificationService.notifyHRs({
        notificationType: 'TRAVEL_NOTIF',
        message: `New travel request created (ID: ${req.id}).`,
        triggerEvent: req.id
      });
    }

    return req;
  }

  async getTravelRequests(currentUser: CurrentUser, filters: any = {}) {
    const scope = getModuleScope(currentUser.role as Role, 'travel');
    if (scope !== 'ORG' && !currentUser.employeeId) return [];

    let scopeQuery: Prisma.TravelRequestWhereInput = {};
    if (scope === 'SELF') {
      scopeQuery = { employeeId: currentUser.employeeId! };
    } else if (scope === 'TEAM') {
      scopeQuery = {
        employee: { OR: [{ id: currentUser.employeeId! }, { managerId: currentUser.employeeId! }] }
      };
    }

    return prisma.travelRequest.findMany({
      where: { AND: [filters, scopeQuery] },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, department: true, designation: true } },
        approver: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getTravelRequestById(currentUser: CurrentUser, id: string) {
    const scope = getModuleScope(currentUser.role as Role, 'travel');
    let scopeQuery: Prisma.TravelRequestWhereInput = {};
    if (scope === 'SELF') {
      scopeQuery = { employeeId: currentUser.employeeId! };
    } else if (scope === 'TEAM') {
      scopeQuery = {
        employee: { OR: [{ id: currentUser.employeeId! }, { managerId: currentUser.employeeId! }] }
      };
    }

    const req = await prisma.travelRequest.findFirst({
      where: { AND: [{ id }, scopeQuery] },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, department: true, designation: true } },
        approver: { select: { firstName: true, lastName: true } },
        verifiedBy: { select: { email: true } }
      }
    });

    if (!req) throw new Error('Travel request not found or access denied.');
    return req;
  }

  
  async updateApprovalStatus(currentUser: CurrentUser, id: string, data: any, reqContext: { ipAddress?: string } = {}) {
    const scope = getModuleScope(currentUser.role as Role, 'travel');
    if (scope !== 'ORG') throw new Error('Not authorized');

    const existing = await prisma.travelRequest.findUnique({ where: { id } });
    if (!existing) throw new Error('Request not found');
    if (existing.settlementStatus === SettlementStatus.SETTLED || existing.approvalStatus !== ApprovalStatus.APPROVAL_PENDING) {
      throw new Error('Travel request is no longer pending approval.');
    }

    const mappedStatus = data.approvalStatus === 'APPROVED' || data.approvalStatus === 'APPROVAL_APPROVED'
      ? ApprovalStatus.APPROVAL_APPROVED
      : ApprovalStatus.APPROVAL_REJECTED;
    
    const request = await prisma.$transaction(async (tx) => {
      return tx.travelRequest.update({
        where: { id },
        data: {
          approvalStatus: mappedStatus,
          approvalDate: new Date(),
          advanceApproved: data.advanceApproved
        }
      });
    });

    await notificationDispatcher.dispatch({
      employeeId: request.employeeId,
      notificationType: 'TRAVEL_NOTIF',
      message: `Your travel request for ${request.destination} was ${mappedStatus === ApprovalStatus.APPROVAL_APPROVED ? 'approved' : 'rejected'}.`,
      triggerEvent: mappedStatus,
      channels: ['IN_APP', 'EMAIL'],
    });
    return request;
  }

  async submitExpenses(currentUser: CurrentUser, id: string, data: any, reqContext: { ipAddress?: string } = {}) {
    const existing = await prisma.travelRequest.findUnique({ where: { id } });
    if (!existing) throw new Error('Request not found');
    
    // Employee self-service
    if (existing.employeeId !== currentUser.employeeId) {
      throw new Error('Not authorized to submit expenses for this request');
    }

    if (existing.approvalStatus !== 'APPROVAL_APPROVED') {
      throw new Error('Cannot submit expenses for an unapproved request');
    }

    const totalClaimed = (data.hotelExpense || 0) + (data.foodAllowance || 0) + (data.localConveyance || 0) + (data.otherExpenses || 0);

    const request = await prisma.$transaction(async (tx) => {
      return tx.travelRequest.update({
        where: { id },
        data: {
          hotelExpense: data.hotelExpense,
          foodAllowance: data.foodAllowance,
          localConveyance: data.localConveyance,
          otherExpenses: data.otherExpenses,
          totalExpenseClaimed: totalClaimed,
          billUpload: data.billUpload,
          settlementStatus: 'SUBMITTED'
        }
      });
    });
    return request;
  }

  async updateSettlement(currentUser: CurrentUser, id: string, data: any, reqContext: { ipAddress?: string } = {}) {
    const scope = getModuleScope(currentUser.role as Role, 'travel');
    if (scope !== 'ORG') throw new Error('Not authorized');

    const existing = await prisma.travelRequest.findUnique({ where: { id } });
    if (!existing) throw new Error('Request not found');

    const totalClaimed = Number(existing.totalExpenseClaimed || 0);
    const hotelExpense = data.hotelExpense ?? existing.hotelExpense ?? 0;
    const foodAllowance = data.foodAllowance ?? existing.foodAllowance ?? 0;
    const localConveyance = data.localConveyance ?? existing.localConveyance ?? 0;
    const otherExpenses = data.otherExpenses ?? existing.otherExpenses ?? 0;
    const computedTotalClaimed = hotelExpense + foodAllowance + localConveyance + otherExpenses;
    const advanceApproved = Number(existing.advanceApproved || 0);
    const amountPayable = (computedTotalClaimed || totalClaimed) - advanceApproved;

    const request = await prisma.$transaction(async (tx) => {
      return tx.travelRequest.update({
        where: { id },
        data: {
          hotelExpense,
          foodAllowance,
          localConveyance,
          otherExpenses,
          totalExpenseClaimed: computedTotalClaimed || totalClaimed,
          settlementStatus: 'SETTLED',
          amountPayable: amountPayable,
          settlementDate: new Date()
        }
      });
    });
    return request;
  }

}

export const travelService = new TravelService();
