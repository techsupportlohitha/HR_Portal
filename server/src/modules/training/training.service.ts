import prisma from '../../config/database';
import { notificationService } from '../notifications/notification.service';
import { notificationDispatcher } from '../../utils/notification.dispatcher';
import { Role, Prisma } from '@prisma/client';
import { getModuleScope } from '../../utils/authorization';

interface CurrentUser {
  id: string;
  userId: string;
  email: string;
  role: string;
  employeeId?: string | null;
}

export class TrainingService {
  async getMyTrainings(employeeId: string) {
    return prisma.trainingParticipant.findMany({
      where: { employeeId },
      include: { training: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAllTrainings(currentUser: CurrentUser, filters: any = {}) {
    const scope = getModuleScope(currentUser.role as Role, 'training');
    if (scope !== 'ORG' && !currentUser.employeeId) return [];

    let scopeQuery: Prisma.TrainingWhereInput = {};
    if (scope === 'TEAM') {
      const emp = await prisma.employee.findUnique({ where: { id: currentUser.employeeId! }, select: { departmentId: true } });
      const departmentId = emp?.departmentId || undefined;
      scopeQuery = { targetDepartmentId: departmentId };
    } else if (scope === 'SELF') {
      scopeQuery = { participants: { some: { employeeId: currentUser.employeeId! } } };
    }

    return prisma.training.findMany({
      where: { ...filters, ...scopeQuery },
      include: {
        _count: { select: { participants: true } },
        participants: {
          include: {
            employee: {
              select: { firstName: true, lastName: true, department: { select: { name: true } } }
            }
          }
        },
        targetDepartment: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createTraining(data: any, userId: string, reqContext: { ipAddress?: string } = {}) {
    return prisma.$transaction(async (tx) => {
      const training = await tx.training.create({
        data: {
          ...data,
          trainingDate: new Date(data.trainingDate),
          ...(data.trainingEndDate && { trainingEndDate: new Date(data.trainingEndDate) })
        }
      });
      await tx.auditLog.create({
        data: {
          actionPerformed: 'CREATE_TRAINING',
          moduleAffected: 'training',
          recordIdAffected: training.id,
          userId,
          ipAddress: reqContext.ipAddress,
        }
      });
      return training;
    });
  }

  async updateTraining(id: string, data: any, userId: string, reqContext: { ipAddress?: string } = {}) {
    return prisma.$transaction(async (tx) => {
      const updateData = { ...data };
      if (updateData.trainingDate) { updateData.trainingDate = new Date(updateData.trainingDate); }
      if (updateData.trainingEndDate) { updateData.trainingEndDate = new Date(updateData.trainingEndDate); }
      const training = await tx.training.update({ where: { id }, data: updateData });
      await tx.auditLog.create({
        data: {
          actionPerformed: 'UPDATE_TRAINING',
          moduleAffected: 'training',
          recordIdAffected: id,
          userId,
          ipAddress: reqContext.ipAddress,
        }
      });
      return training;
    });
  }

  async addParticipant(trainingId: string, employeeId: string, userId: string, reqContext: { ipAddress?: string } = {}) {
    const exists = await prisma.trainingParticipant.findUnique({
      where: { trainingId_employeeId: { trainingId, employeeId } }
    });
    if (exists) throw new Error('Employee is already a participant in this training');

    return prisma.$transaction(async (tx) => {
      const participant = await tx.trainingParticipant.create({
        data: { trainingId, employeeId },
        include: { employee: { include: { department: true } } }
      });
      await tx.auditLog.create({
        data: {
          actionPerformed: 'ADD_TRAINING_PARTICIPANT',
          moduleAffected: 'training',
          recordIdAffected: participant.id,
          userId,
          ipAddress: reqContext.ipAddress,
        }
      });
      // Notify employee of training assignment
      notificationDispatcher.dispatch({
        employeeId,
        notificationType: 'TRAINING_NOTIF',
        message: `You have been assigned to a training program. Please check the training portal.`,
        triggerEvent: 'TRAINING_ASSIGNED',
        channels: ['IN_APP', 'EMAIL']
      }).catch(() => {});
      return participant;
    });
  }

  async removeParticipant(trainingId: string, employeeId: string, userId: string, reqContext: { ipAddress?: string } = {}) {
    return prisma.$transaction(async (tx) => {
      const participant = await tx.trainingParticipant.findUnique({
        where: { trainingId_employeeId: { trainingId, employeeId } }
      });
      if (!participant) throw new Error('Participant not found');

      await tx.trainingParticipant.delete({
        where: { id: participant.id }
      });
      
      await tx.auditLog.create({
        data: {
          actionPerformed: 'REMOVE_TRAINING_PARTICIPANT',
          moduleAffected: 'training',
          recordIdAffected: participant.id,
          userId,
          ipAddress: reqContext.ipAddress,
        }
      });
    });
  }

  async submitFeedback(trainingId: string, employeeId: string, data: any, currentUser: CurrentUser, reqContext: { ipAddress?: string } = {}) {
    const isAdminOrHR = currentUser.role === 'ADMIN' || currentUser.role === 'HR';
    const includesTraineeFeedback = data.feedbackRating !== undefined || data.feedbackComments !== undefined;
    const includesTrainerFeedback = data.trainerFeedbackRating !== undefined || data.trainerFeedbackComments !== undefined;

    if (includesTraineeFeedback && currentUser.employeeId !== employeeId) {
      throw new Error('You can only submit feedback for your own participation');
    }
    if (includesTrainerFeedback && !isAdminOrHR) {
      throw new Error('Only HR or Admin can submit trainer feedback');
    }

    const participant = await prisma.trainingParticipant.findUnique({
      where: { trainingId_employeeId: { trainingId, employeeId } }
    });
    if (!participant) throw new Error('Participant not found');

    return prisma.$transaction(async (tx) => {
      const updated = await tx.trainingParticipant.update({
        where: { id: participant.id },
        data: {
          feedbackRating: data.feedbackRating,
          feedbackComments: data.feedbackComments,
          trainerFeedbackRating: data.trainerFeedbackRating,
          trainerFeedbackComments: data.trainerFeedbackComments
        }
      });
      await tx.auditLog.create({
        data: {
          actionPerformed: 'SUBMIT_TRAINING_FEEDBACK',
          moduleAffected: 'training',
          recordIdAffected: participant.id,
          userId: currentUser.userId,
          ipAddress: reqContext.ipAddress,
        }
      });
      return updated;
    });
  }

  async recordAssessment(trainingId: string, employeeId: string, data: any, currentUser: CurrentUser, reqContext: { ipAddress?: string } = {}) {
    const scope = getModuleScope(currentUser.role as Role, 'training');
    if (scope === 'SELF') {
      throw new Error('Employees cannot record their own assessments');
    }

    const participant = await prisma.trainingParticipant.findUnique({
      where: { trainingId_employeeId: { trainingId, employeeId } }
    });
    if (!participant) throw new Error('Participant not found');

    return prisma.$transaction(async (tx) => {
      const updated = await tx.trainingParticipant.update({
        where: { id: participant.id },
        data: {
          attendanceStatus: data.attendanceStatus,
          assessmentScore: data.assessmentScore,
          certificateIssued: data.certificateIssued,
          certificateFile: data.certificateFile
        }
      });
      await tx.auditLog.create({
        data: {
          actionPerformed: 'RECORD_TRAINING_ASSESSMENT',
          moduleAffected: 'training',
          recordIdAffected: participant.id,
          userId: currentUser.userId,
          ipAddress: reqContext.ipAddress,
        }
      });
      return updated;
    });
  }

  async getTrainingDashboard(currentUser: CurrentUser) {
    const scope = getModuleScope(currentUser.role as Role, 'training');
    if (scope !== 'ORG' && !currentUser.employeeId) return null;

    const now = new Date();
    
    // Scoping for queries
    let scopeQuery: Prisma.TrainingWhereInput = {};
    let participantScopeQuery: Prisma.TrainingParticipantWhereInput = {};
    if (scope === 'TEAM') {
      const emp = await prisma.employee.findUnique({ where: { id: currentUser.employeeId! }, select: { departmentId: true } });
      const departmentId = emp?.departmentId || undefined;
      scopeQuery = { targetDepartmentId: departmentId };
      participantScopeQuery = { training: { targetDepartmentId: departmentId } };
    } else if (scope === 'SELF') {
      scopeQuery = { participants: { some: { employeeId: currentUser.employeeId! } } };
      participantScopeQuery = { employeeId: currentUser.employeeId! };
    }

    const upcoming = await prisma.training.count({ where: { ...scopeQuery, trainingDate: { gte: now } } });
    const completed = await prisma.training.count({ where: { ...scopeQuery, trainingDate: { lt: now } } });
    
    const aggregations = await prisma.training.aggregate({
      where: { ...scopeQuery },
      _sum: {
        trainingHours: true,
        trainingCost: true,
      }
    });

    const participantAggregations = await prisma.trainingParticipant.aggregate({
      where: participantScopeQuery,
      _avg: {
        feedbackRating: true
      },
      _count: {
        _all: true
      }
    });

    // Employee-wise and department-wise could be complex groupBys. For simplicity, just get raw grouped data.
    const departmentWiseData = await prisma.training.groupBy({
      by: ['targetDepartmentId'],
      where: { ...scopeQuery, targetDepartmentId: { not: null } },
      _count: { _all: true }
    });
    
    // Join department names
    const departments = await prisma.department.findMany({ select: { id: true, name: true } });
    const departmentWise = departmentWiseData.map(d => ({
      name: departments.find(dep => dep.id === d.targetDepartmentId)?.name || 'Unknown',
      value: d._count._all
    }));

    // Employee-wise training count
    const employeeWiseData = await prisma.trainingParticipant.groupBy({
      by: ['employeeId'],
      where: participantScopeQuery,
      _count: { _all: true },
      orderBy: { _count: { employeeId: 'desc' } },
      take: 5
    });

    const employees = await prisma.employee.findMany({ 
      where: { id: { in: employeeWiseData.map(e => e.employeeId) } },
      select: { id: true, firstName: true, lastName: true } 
    });

    const employeeWise = employeeWiseData.map(e => {
      const emp = employees.find(emp => emp.id === e.employeeId);
      return {
        name: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        value: e._count._all
      };
    });

    return {
      upcomingTrainings: upcoming,
      completedTrainings: completed,
      totalTrainingHours: Number(aggregations._sum.trainingHours || 0),
      totalTrainingCost: Number(aggregations._sum.trainingCost || 0),
      averageFeedback: Number(participantAggregations._avg.feedbackRating || 0),
      totalParticipants: participantAggregations._count._all,
      departmentWise,
      employeeWise
    };
  }
}

export const trainingService = new TrainingService();

