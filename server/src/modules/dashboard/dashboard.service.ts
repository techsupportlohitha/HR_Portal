import prisma from '../../config/database';
import { Role } from '@prisma/client';

interface CurrentUser {
  userId: string;
  role: string;
  employeeId?: string | null;
}

function exitDateInMonths(joiningDate: Date, exitDate: Date) {
  const millisecondsPerMonth = 1000 * 60 * 60 * 24 * 30.4375;
  return Math.max(0, (exitDate.getTime() - joiningDate.getTime()) / millisecondsPerMonth);
}

export class DashboardService {
  async getStats(currentUser: CurrentUser) {
    const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'HR' || currentUser.role === 'HR_EXECUTIVE';
    const isManager = currentUser.role === 'MANAGER';
    const now = new Date();

    // 1. Headline Metrics
    // Active Employees
    const activeEmployees = isAdmin
      ? await prisma.employee.count({ where: { isActive: true } })
      : isManager
      ? await prisma.employee.count({ where: { managerId: currentUser.employeeId!, isActive: true } })
      : 1;

    // Monthly Attrition
    let monthlyAttrition = 0;
    let exitsThisMonth = 0;
    let joinersThisMonth = 0;

    if (isAdmin || isManager) {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const empWhere = isManager ? { managerId: currentUser.employeeId! } : {};

      const [recentExits, recentJoins, totalHistoricalEmployees] = await Promise.all([
        prisma.employee.count({
          where: { ...empWhere, isActive: false, deactivatedAt: { gte: thirtyDaysAgo } }
        }),
        prisma.employee.count({
          where: { ...empWhere, joiningDate: { gte: thirtyDaysAgo } }
        }),
        prisma.employee.count({
          where: { ...empWhere }
        })
      ]);

      exitsThisMonth = recentExits;
      joinersThisMonth = recentJoins;

      const currentHeadcount = activeEmployees;
      const headcount30DaysAgo = currentHeadcount + recentExits - recentJoins;
      const avgHeadcount = (currentHeadcount + headcount30DaysAgo) / 2;

      monthlyAttrition = avgHeadcount > 0 ? (recentExits / avgHeadcount) * 100 : 0;
    }

    // Open Vacancies
    const openVacancies = isAdmin
      ? await prisma.requisition.aggregate({
          where: { status: { notIn: ['JOINED_REJECTED', 'OFFER'] } },
          _sum: { numberOfVacancies: true }
        }).then(r => r._sum?.numberOfVacancies || 0)
      : 0;

    // Reviews Completed
    const reviewWhere = isAdmin ? {} : isManager
      ? { employee: { managerId: currentUser.employeeId! } }
      : { employeeId: currentUser.employeeId! };

    const totalReviews = await prisma.performanceReview.count({ where: reviewWhere });
    const completedReviews = await prisma.performanceReview.count({ where: { ...reviewWhere, status: 'COMPLETED' } });

    // Recruitment Stats Fixes
    const selectedCandidates = isAdmin ? await prisma.candidate.count({ where: { selectionStatus: 'SELECTED' } }) : 0;
    const offersAccepted = isAdmin ? await prisma.candidate.count({ where: { offerStatus: 'OFFER_ACCEPTED' } }) : 0;
    const invitedForInterview = isAdmin ? await prisma.candidate.count({ where: { screeningStatus: 'SHORTLISTED' } }) : 0;

    // Today's Attendance (from Leave module)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const leaveEmpWhere = isManager ? { employee: { managerId: currentUser.employeeId! } } : {};

    const absentEmployees = isAdmin || isManager
      ? await prisma.leave.findMany({
          where: {
            ...leaveEmpWhere,
            status: 'APPROVED',
            startDate: { lte: todayEnd },
            endDate: { gte: todayStart },
          },
          include: { employee: { select: { id: true, firstName: true, lastName: true, department: { select: { name: true } } } } },
        })
      : [];

    const absentToday = absentEmployees.length;
    const presentToday = Math.max(0, activeEmployees - absentToday);

    // 2. Needs Attention Queue
    const needsAttention = [];

    if (isAdmin || isManager) {
      const pendingLeaves = await prisma.leave.findMany({
        where: { status: 'PENDING', ...(isManager ? { employee: { managerId: currentUser.employeeId! } } : {}) },
        include: { employee: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'asc' },
        take: 5
      });
      for (const leave of pendingLeaves) {
        needsAttention.push({
          id: `leave-${leave.id}`,
          module: 'Leave',
          title: `Leave request from ${leave.employee.firstName} ${leave.employee.lastName}`,
          owner: currentUser.userId,
          dueDate: leave.startDate.toISOString(),
          action: 'Approve or Reject',
          priority: 'high',
          link: '/leaves/approvals'
        });
      }
    }

    const pendingReviewStatuses = isAdmin ? ['HR_REVIEW', 'FINAL_APPROVAL'] : isManager ? ['MANAGER_REVIEW'] : ['EMPLOYEE_REVIEW'];
    const pendingReviewsList = await prisma.performanceReview.findMany({
      where: {
        status: { in: pendingReviewStatuses as any },
        ...(isAdmin ? {} : isManager ? { employee: { managerId: currentUser.employeeId! } } : { employeeId: currentUser.employeeId! })
      },
      include: { employee: { select: { firstName: true, lastName: true } } },
      take: 5
    });
    for (const review of pendingReviewsList) {
      needsAttention.push({
        id: `perf-${review.id}`,
        module: 'Performance',
        title: `${review.reviewPeriod} review for ${review.employee.firstName} ${review.employee.lastName}`,
        owner: currentUser.userId,
        dueDate: null,
        action: 'Complete review stage',
        priority: 'high',
        link: '/performance'
      });
    }

    needsAttention.splice(5);

    // 3. Module Overview Stats
    const moduleOverview = {
      employees: {
        active: activeEmployees,
        joinersThisMonth,
        exitsThisMonth,
      },
      recruitment: {
        vacancies: openVacancies,
        selectedCandidates,
        offersAccepted
      },
      performance: {
        completed: completedReviews,
        total: totalReviews
      },
      leave: {
        pendingApprovals: isAdmin || isManager ? await prisma.leave.count({ where: { status: 'PENDING', ...(isManager ? { employee: { managerId: currentUser.employeeId! } } : {}) } }) : 0
      },
      travel: {
        pendingApprovals: await prisma.travelRequest.count({ where: { approvalStatus: 'APPROVAL_PENDING', ...(isAdmin ? {} : isManager ? { employee: { managerId: currentUser.employeeId! } } : { employeeId: currentUser.employeeId! }) } })
      },
      assets: {
        assigned: isAdmin ? await prisma.asset.count({ where: { assignedEmployeeId: { not: null } } }) : await prisma.asset.count({ where: { assignedEmployeeId: currentUser.employeeId! } }),
        total: isAdmin ? await prisma.asset.count() : 0
      }
    };

    return {
      headline: {
        activeEmployees,
        monthlyAttrition: Math.round(monthlyAttrition * 10) / 10,
        exitsThisMonth,
        joinersThisMonth,
        openVacancies,
        reviewsCompleted: completedReviews,
        reviewsTotal: totalReviews,
        presentToday,
        absentToday,
      },
      needsAttention,
      moduleOverview,
      invitedForInterview,
      selectedCandidates,
      offersAccepted,
      absentEmployeesList: absentEmployees.map(l => ({
        id: l.employee.id,
        name: `${l.employee.firstName} ${l.employee.lastName}`,
        department: l.employee.department?.name || '',
      })),
      upcomingInterviews: isAdmin ? await prisma.candidate.findMany({
        where: { interviewDate: { gte: now } },
        orderBy: { interviewDate: 'asc' },
        take: 5,
        include: { requisition: { select: { positionTitle: true } } }
      }) : [],
    };
  }

  async getAttritionStats(currentUser: CurrentUser, filters: {
    periodMonths?: number;
    department?: string;
    location?: string;
    employmentType?: string;
  } = {}) {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'HR') {
      throw new Error('Only HR or Admin can access attrition data');
    }

    const now = new Date();
    const periodMonths = filters.periodMonths || 12;
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(now.getMonth() - periodMonths);
    const twentyFourMonthsAgo = new Date(twelveMonthsAgo);
    twentyFourMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - periodMonths);

    // Fetch all employees to aggregate in-memory (fast for HR dashboards)
    const allEmployees = await prisma.employee.findMany({
      include: { department: true }
    });
    const filterOptions = {
      departments: [...new Set(allEmployees.map((employee) => employee.department?.name).filter(Boolean))].sort(),
      locations: [...new Set(allEmployees.map((employee) => employee.location || employee.city).filter(Boolean))].sort(),
      employmentTypes: [...new Set(allEmployees.map((employee) => employee.employmentType).filter(Boolean))].sort(),
    };
    const scopedEmployees = allEmployees.filter((employee) => {
      const departmentName = employee.department?.name || 'Unassigned';
      const locationName = employee.location || employee.city || 'Unknown';
      return (!filters.department || departmentName === filters.department)
        && (!filters.location || locationName === filters.location)
        && (!filters.employmentType || employee.employmentType === filters.employmentType);
    });

    let startHeadcount = 0;
    let endHeadcount = 0;
    let previousStartHeadcount = 0;
    const leavers = [];
    const previousLeavers = [];
    const joiners = [];
    const departmentHeadcount: Record<string, { start: number; end: number }> = {};

    // Monthly buckets for the last 12 months
    const monthlyList = [];
    const monthlyMap: Record<string, any> = {};
    for (let i = periodMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      const item = { month: key, joins: 0, exits: 0 };
      monthlyList.push(item);
      monthlyMap[key] = item;
    }

    // Process employees
    for (const emp of scopedEmployees) {
      const joinDate = new Date(emp.joiningDate);
      const exitDate = emp.lastWorkingDate ? new Date(emp.lastWorkingDate) : (emp.deactivatedAt ? new Date(emp.deactivatedAt) : (emp.status === 'RESIGNED' || emp.status === 'TERMINATED' ? new Date(emp.updatedAt) : null));
      const departmentName = emp.department?.name || 'Unassigned';

      if (!departmentHeadcount[departmentName]) {
        departmentHeadcount[departmentName] = { start: 0, end: 0 };
      }
      
      const joinedBeforeStart = joinDate < twelveMonthsAgo;
      const leftBeforeStart = exitDate && exitDate < twelveMonthsAgo;
      const joinedBeforeEnd = joinDate <= now;
      const leftBeforeEnd = exitDate && exitDate <= now;
      const joinedBeforePreviousStart = joinDate < twentyFourMonthsAgo;
      const leftBeforePreviousStart = exitDate && exitDate < twentyFourMonthsAgo;

      // Start Headcount: Joined before the 12 month window, and haven't left before the window
      if (joinedBeforeStart && !leftBeforeStart) {
        startHeadcount++;
        departmentHeadcount[departmentName].start++;
      }

      // End Headcount: Joined before now, and haven't left yet
      if (joinedBeforeEnd && !leftBeforeEnd) {
        endHeadcount++;
        departmentHeadcount[departmentName].end++;
      }

      if (joinedBeforePreviousStart && !leftBeforePreviousStart) {
        previousStartHeadcount++;
      }

      // Track joins within window
      if (joinDate >= twelveMonthsAgo && joinDate <= now) {
        joiners.push(emp);
        const mKey = joinDate.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (monthlyMap[mKey]) monthlyMap[mKey].joins++;
      }

      // Track exits within window
      if (exitDate && exitDate >= twelveMonthsAgo && exitDate <= now) {
        leavers.push(emp);
        const mKey = exitDate.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (monthlyMap[mKey]) monthlyMap[mKey].exits++;
      }

      if (exitDate && exitDate >= twentyFourMonthsAgo && exitDate < twelveMonthsAgo) {
        previousLeavers.push(emp);
      }
    }

    const averageStrength = (startHeadcount + endHeadcount) / 2;
    const attritionRate = averageStrength > 0 
      ? Math.round((leavers.length / averageStrength) * 100 * 10) / 10 
      : 0;
    const previousAverageStrength = (previousStartHeadcount + startHeadcount) / 2;
    const previousAttritionRate = previousAverageStrength > 0
      ? Math.round((previousLeavers.length / previousAverageStrength) * 100 * 10) / 10
      : null;
    const attritionRateChange = previousAttritionRate === null
      ? null
      : Math.round((attritionRate - previousAttritionRate) * 10) / 10;

    // Breakdowns
    const deptBreakdown: Record<string, number> = {};
    const locBreakdown: Record<string, number> = {};
    const desigBreakdown: Record<string, number> = {};
    const exitReasonBreakdown: Record<string, number> = {};
    const tenureBreakdown: Record<string, number> = {
      'Under 3 months': 0,
      '3–12 months': 0,
      '1–3 years': 0,
      'Over 3 years': 0,
    };
    let voluntary = 0;
    let involuntary = 0;

    for (const l of leavers) {
      const dept = l.department?.name || 'Unassigned';
      deptBreakdown[dept] = (deptBreakdown[dept] || 0) + 1;
      
      const loc = l.location || l.city || 'Unknown';
      locBreakdown[loc] = (locBreakdown[loc] || 0) + 1;

      const desig = l.designation || 'Unknown';
      desigBreakdown[desig] = (desigBreakdown[desig] || 0) + 1;

      const reason = l.exitReason?.trim() || 'Not recorded';
      exitReasonBreakdown[reason] = (exitReasonBreakdown[reason] || 0) + 1;

      const tenureMonths = exitDateInMonths(l.joiningDate, l.lastWorkingDate || l.deactivatedAt || l.updatedAt);
      const tenureBucket = tenureMonths < 3
        ? 'Under 3 months'
        : tenureMonths <= 12
          ? '3–12 months'
          : tenureMonths <= 36
            ? '1–3 years'
            : 'Over 3 years';
      tenureBreakdown[tenureBucket]++;

      if (l.exitType === 'VOLUNTARY' || l.status === 'RESIGNED') {
        voluntary++;
      } else if (l.exitType === 'INVOLUNTARY' || l.status === 'TERMINATED') {
        involuntary++;
      } else {
        // Fallback guess
        voluntary++; 
      }
    }

    return {
      attritionRate,
      attritionCount: leavers.length,
      headcountAtStart: startHeadcount,
      averageStrength,
      voluntaryExits: voluntary,
      involuntaryExits: involuntary,
      previousAttritionRate,
      attritionRateChange,
      reportingPeriod: {
        start: twelveMonthsAgo.toISOString(),
        end: now.toISOString(),
      },
      departmentBreakdown: Object.entries(deptBreakdown)
        .map(([name, count]) => {
          const headcount = departmentHeadcount[name] || { start: 0, end: 0 };
          const averageHeadcount = (headcount.start + headcount.end) / 2;
          const departmentRate = averageHeadcount > 0
            ? Math.round((count / averageHeadcount) * 100 * 10) / 10
            : 0;

          return {
            name,
            count,
            averageHeadcount: Math.round(averageHeadcount * 10) / 10,
            attritionRate: departmentRate,
          };
        })
        .sort((a, b) => b.attritionRate - a.attritionRate || b.count - a.count),
      locationBreakdown: Object.entries(locBreakdown).map(([name, count]) => ({ name, count })),
      designationBreakdown: Object.entries(desigBreakdown).map(([name, count]) => ({ name, count })),
      exitReasonBreakdown: Object.entries(exitReasonBreakdown)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      tenureBreakdown: Object.entries(tenureBreakdown).map(([name, count]) => ({ name, count })),
      filterOptions,
      joinTrend: monthlyList.slice(-6),
      joinExitTrend: monthlyList,
    };
  }

  async getReport(type: string, currentUser: CurrentUser) {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'HR') {
      throw new Error('Only HR or Admin can access reports');
    }

    switch (type) {
      case 'employees':
        return this.getEmployeeReport();
      case 'travel':
        return this.getTravelReport();
      case 'assets':
        return this.getAssetReport();
      case 'recruitment':
        return this.getRecruitmentReport();
      case 'training':
        return this.getTrainingReport();
      default:
        throw new Error(`Unknown report type: ${type}`);
    }
  }

  private async getEmployeeReport() {
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      include: {
        department: { select: { name: true } },
        user: { select: { role: true } }
      },
      orderBy: { firstName: 'asc' }
    });
    return employees.map(e => ({
      id: e.id,
      name: `${e.firstName} ${e.lastName}`,
      email: e.email,
      department: e.department?.name || 'N/A',
      role: e.user?.role || 'EMPLOYEE',
      designation: e.designation,
      joiningDate: e.joiningDate
    }));
  }

  private async getTravelReport() {
    const requests = await prisma.travelRequest.findMany({
      include: {
        employee: { select: { firstName: true, lastName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 1000
    });
    return requests.map(r => ({
      id: r.id,
      employee: `${r.employee.firstName} ${r.employee.lastName}`,
      destination: r.destination,
      startDate: r.startDate,
      endDate: r.endDate,
      approvalStatus: r.approvalStatus,
      settlementStatus: r.settlementStatus,
      totalExpenseClaimed: r.totalExpenseClaimed
    }));
  }

  private async getAssetReport() {
    const assets = await prisma.asset.findMany({
      include: {
        assignedEmployee: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return assets.map(a => ({
      id: a.id,
      assetType: a.assetType,
      brandModel: a.brandModel,
      serialNumber: a.serialNumber,
      status: a.status,
      assignedTo: a.assignedEmployee ? `${a.assignedEmployee.firstName} ${a.assignedEmployee.lastName}` : null
    }));
  }

  private async getRecruitmentReport() {
    const candidates = await prisma.candidate.findMany({
      include: {
        requisition: { select: { positionTitle: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return candidates.map(c => ({
      id: c.id,
      name: c.candidateName,
      email: c.email,
      position: c.requisition?.positionTitle || 'N/A',
      screeningStatus: c.screeningStatus,
      selectionStatus: c.selectionStatus,
      offerStatus: c.offerStatus
    }));
  }

  private async getTrainingReport() {
    const trainings = await prisma.training.findMany({
      include: {
        _count: { select: { participants: true } }
      },
      orderBy: { trainingDate: 'desc' }
    });
    return trainings.map(t => ({
      id: t.id,
      topic: t.trainingTopic,
      type: t.trainingType,
      date: t.trainingDate,
      participantCount: t._count.participants,
      cost: t.trainingCost
    }));
  }
}

export const dashboardService = new DashboardService();
