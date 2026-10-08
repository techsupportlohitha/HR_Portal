import prisma from '../../config/database';
import { hasAdminAccess } from '../../utils/roles';

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
    const hasOrganizationAccess = hasAdminAccess(currentUser.role);
    const now = new Date();

    // 1. Headline Metrics
    // Active Employees
    const activeEmployees = hasOrganizationAccess
      ? await prisma.employee.count({ where: { isActive: true } })
      : 1;

    // Monthly Attrition
    let monthlyAttrition = 0;
    let exitsThisMonth = 0;
    let joinersThisMonth = 0;

    if (hasOrganizationAccess) {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const empWhere = {};

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
    const openVacancies = hasOrganizationAccess
      ? await prisma.requisition.aggregate({
          where: { status: { not: 'JOINED_REJECTED' } },
          _sum: { numberOfVacancies: true }
        }).then(r => r._sum?.numberOfVacancies || 0)
      : 0;

    // Reviews Completed
    const reviewWhere = hasOrganizationAccess ? {} : { employeeId: currentUser.employeeId! };

    const totalReviews = await prisma.performanceReview.count({ where: reviewWhere });
    const completedReviews = await prisma.performanceReview.count({ where: { ...reviewWhere, status: 'COMPLETED' } });

    // Recruitment Stats Fixes
    const selectedCandidates = hasOrganizationAccess ? await prisma.candidate.count({ where: { selectionStatus: 'SELECTED' } }) : 0;
    const offersAccepted = hasOrganizationAccess ? await prisma.candidate.count({ where: { offerStatus: 'OFFER_ACCEPTED' } }) : 0;
    const invitedForInterview = hasOrganizationAccess ? await prisma.candidate.count({ where: { screeningStatus: 'SHORTLISTED' } }) : 0;

    // Today's Attendance (from Leave module)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const leaveEmpWhere = {};

    const absentEmployees = hasOrganizationAccess
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
    const needsAttention: Array<{
      id: string;
      module: string;
      title: string;
      owner: string;
      dueDate: string | null;
      action: string;
      priority: string;
      link: string;
      sortDate: Date;
    }> = [];

    if (hasOrganizationAccess) {
      const pendingLeaves = await prisma.leave.findMany({
        where: { status: 'PENDING' },
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
          link: '/leaves/approvals',
          sortDate: leave.createdAt
        });
      }

      const [pendingTravel, pendingExpenses] = await Promise.all([
        prisma.travelRequest.findMany({
          where: { approvalStatus: 'APPROVAL_PENDING' },
          include: { employee: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'asc' },
          take: 5
        }),
        prisma.officeExpense.findMany({
          where: { status: 'PENDING' },
          include: { submittedBy: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'asc' },
          take: 5
        })
      ]);

      for (const request of pendingTravel) {
        needsAttention.push({
          id: `travel-${request.id}`,
          module: 'Travel',
          title: `Travel to ${request.destination} for ${request.employee.firstName} ${request.employee.lastName}`,
          owner: currentUser.userId,
          dueDate: request.startDate.toISOString(),
          action: 'Review travel request',
          priority: 'high',
          link: '/travel',
          sortDate: request.createdAt
        });
      }

      for (const expense of pendingExpenses) {
        needsAttention.push({
          id: `expense-${expense.id}`,
          module: 'Office Expense',
          title: `${expense.category.replace(/_/g, ' ')} expense from ${expense.submittedBy.firstName} ${expense.submittedBy.lastName}`,
          owner: currentUser.userId,
          dueDate: expense.expenseDate.toISOString(),
          action: 'Review expense approval',
          priority: 'high',
          link: '/office-expenses',
          sortDate: expense.createdAt
        });
      }
    }

    const pendingReviewStatuses = hasOrganizationAccess ? ['HR_REVIEW', 'FINAL_APPROVAL'] : ['EMPLOYEE_REVIEW'];
    const pendingReviewsList = await prisma.performanceReview.findMany({
      where: {
        status: { in: pendingReviewStatuses as any },
        ...(hasOrganizationAccess ? {} : { employeeId: currentUser.employeeId! })
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
        link: '/performance',
        sortDate: review.createdAt
      });
    }

    needsAttention.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
    // Keep at least the oldest pending Travel and Office Expense request visible
    // even when older leave/performance items would otherwise fill the whole queue.
    const reservedApprovalItems = ['Travel', 'Office Expense']
      .map((module) => needsAttention.find((item) => item.module === module))
      .filter((item): item is (typeof needsAttention)[number] => Boolean(item));
    const reservedIds = new Set(reservedApprovalItems.map((item) => item.id));
    const visibleNeedsAttention = [
      ...reservedApprovalItems,
      ...needsAttention.filter((item) => !reservedIds.has(item.id))
    ]
      .slice(0, 5)
      .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
    const needsAttentionItems = visibleNeedsAttention.map(({ sortDate: _sortDate, ...item }) => item);

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
          pendingApprovals: await prisma.leave.count({ where: { status: 'PENDING', ...(hasOrganizationAccess ? {} : { employeeId: currentUser.employeeId! }) } })
        },
      travel: {
        pendingApprovals: await prisma.travelRequest.count({ where: { approvalStatus: 'APPROVAL_PENDING', ...(hasOrganizationAccess ? {} : { employeeId: currentUser.employeeId! }) } })
      },
      expenses: {
        pendingApprovals: await prisma.officeExpense.count({ where: { status: 'PENDING', ...(hasOrganizationAccess ? {} : { submittedById: currentUser.employeeId! }) } })
      },
        training: {
          pendingApprovals: hasOrganizationAccess ? await prisma.training.count({ where: { status: 'PENDING' } }) : 0
        },
      assets: {
        assigned: hasOrganizationAccess ? await prisma.asset.count({ where: { assignedEmployeeId: { not: null } } }) : await prisma.asset.count({ where: { assignedEmployeeId: currentUser.employeeId! } }),
        total: hasOrganizationAccess ? await prisma.asset.count() : 0
      }
    };

    // Calculate 7-day attendance trend
    const trendDays = 7;
    const trendStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - trendDays + 1);
    const trendEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const recentLeaves = await prisma.leave.findMany({
      where: {
        ...leaveEmpWhere,
        status: 'APPROVED',
        startDate: { lte: trendEndDate },
        endDate: { gte: trendStartDate }
      }
    });

    const attendanceTrend = [];
    for (let i = 0; i < trendDays; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (trendDays - 1 - i));
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      
      let absentOnDay = 0;
      recentLeaves.forEach(leave => {
         if (leave.startDate <= dEnd && leave.endDate >= dStart) {
            absentOnDay++;
         }
      });
      
      // Assume weekend is full absent or we just show active - absent
      const dayOfWeek = d.getDay();
      let presentOnDay = Math.max(0, activeEmployees - absentOnDay);
      if (dayOfWeek === 0 || dayOfWeek === 6) {
         presentOnDay = 0; // weekends typically 0
         absentOnDay = 0;
      }
      
      attendanceTrend.push({
         date: d.toLocaleDateString('en-US', { weekday: 'short' }),
         present: presentOnDay,
         absent: absentOnDay
      });
    }

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
      needsAttention: needsAttentionItems,
      moduleOverview,
      invitedForInterview,
      selectedCandidates,
      offersAccepted,
      attendanceTrend,
      absentEmployeesList: absentEmployees.map(l => ({
        id: l.employee.id,
        name: `${l.employee.firstName} ${l.employee.lastName}`,
        department: l.employee.department?.name || '',
      })),
      upcomingInterviews: hasOrganizationAccess ? await prisma.candidate.findMany({
        where: { interviewDate: { gte: now } },
        orderBy: { interviewDate: 'asc' },
        take: 5,
        include: { 
          requisition: { select: { positionTitle: true } },
          interviewer: { select: { firstName: true, lastName: true } }
        }
      }) : [],
    };
  }

  async getAttritionStats(currentUser: CurrentUser, filters: {
    periodMonths?: number;
    department?: string;
    location?: string;
    employmentType?: string;
  } = {}) {
    if (!hasAdminAccess(currentUser.role)) {
      throw new Error('Only Admin, HR, or Manager can access attrition data');
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
    if (!hasAdminAccess(currentUser.role)) {
      throw new Error('Only Admin, HR, or Manager can access reports');
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
