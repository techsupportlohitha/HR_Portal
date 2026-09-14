import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, Users, Laptop, Plane, Briefcase, 
  Target, ClipboardList, GraduationCap, Files, UserMinus, 
  Shield, History, ChevronRight, ChevronDown, Building2, CreditCard,
  ClipboardCheck, Calendar, ChevronsLeft, ChevronsRight, Settings, HelpCircle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type SidebarNavItem = {
  name: string;
  path?: string;
  icon: LucideIcon;
  badge?: number;
  children?: SidebarNavItem[];
};

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';
  
  const [openNavGroups, setOpenNavGroups] = useState<Record<string, boolean>>({
    'nav-group-leave-requests': true,
  });

  const toggleNavGroup = (id: string) => {
    setOpenNavGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const mainNav: SidebarNavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ...(isAdminOrHR ? [{ name: 'Attrition', path: '/dashboard/attrition', icon: UserMinus }] : []),
    { name: 'Employees', path: '/employees', icon: Users },
    { name: 'Performance', path: '/performance', icon: Target },
    {
      name: 'Leave Requests',
      icon: Calendar,
      children: [
        { name: 'Apply for leave', path: '/leaves', icon: Calendar },
        ...(isAdminOrHR ? [{ name: 'Leave approvals', path: '/leaves/approvals', icon: ClipboardList }] : []),
      ],
    },
    ...(isAdminOrHR ? [{ name: 'Recruitment', path: '/recruitment', icon: Briefcase }] : []),
    { name: 'Training', path: '/training', icon: GraduationCap },
    { name: 'Assets', path: '/assets', icon: Laptop },
    { name: 'Travel', path: '/travel', icon: Plane },
    { name: 'Expenses', path: '/office-expenses', icon: CreditCard },
    { name: 'Documents', path: '/documents', icon: Files },
    { name: 'Helpdesk', path: '/requests', icon: HelpCircle },
  ];

  const accountNav: SidebarNavItem[] = [
    ...(isAdminOrHR ? [
      { name: 'Role Management', path: '/roles', icon: Shield },
      { name: 'Audit Log', path: '/audit', icon: History },
    ] : [])
  ];

  const isNavItemActive = (path: string) => (
    location.pathname === path ||
    (path !== '/dashboard' && path !== '#' && location.pathname.startsWith(`${path}/`))
  );

  const isItemActive = (item: SidebarNavItem): boolean => (
    (item.path ? isNavItemActive(item.path) : false) ||
    Boolean(item.children?.some(isItemActive))
  );

  return (
    <aside aria-label="Primary navigation" className={cn(
      "bg-white dark:bg-[#09090b] text-slate-700 dark:text-slate-300 flex flex-col h-full w-full border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out font-sans overflow-hidden"
    )}>
      {/* Brand */}
      <div className={cn("h-[72px] flex items-center shrink-0 border-b border-slate-100 dark:border-slate-800", collapsed ? "justify-center" : "px-6")}>
        <NavLink to="/dashboard" className="flex items-center gap-3 w-full" title={collapsed ? 'HR Portal' : undefined}>
          <div className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 text-white shadow-sm">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div className={cn("flex flex-col min-w-0 transition-opacity duration-300", collapsed ? "opacity-0 w-0 hidden" : "opacity-100")}>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">HR Portal</span>
          </div>
        </NavLink>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-6 custom-scrollbar px-3">
        {/* Main Section */}
        <div className="flex flex-col gap-1">
          {mainNav.map((item) => renderNavItem(item, collapsed, toggleNavGroup, openNavGroups, isItemActive, isNavItemActive))}
        </div>

        {/* Account Section */}
        <div className="flex flex-col gap-1 mt-auto">
          {!collapsed && (
            <div className="px-3 pb-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Account
            </div>
          )}
          {accountNav.map((item) => renderNavItem(item, collapsed, toggleNavGroup, openNavGroups, isItemActive, isNavItemActive))}
        </div>
      </div>

    </aside>
  );
}

function renderNavItem(
  item: SidebarNavItem, 
  collapsed: boolean, 
  toggleNavGroup: (id: string) => void, 
  openNavGroups: Record<string, boolean>, 
  isItemActive: (item: SidebarNavItem) => boolean, 
  isNavItemActive: (path: string) => boolean
) {
  const isActive = isItemActive(item);

  if (item.children) {
    const groupId = `nav-group-${item.name.toLowerCase().replace(/\s+/g, '-')}`;
    const isGroupOpen = openNavGroups[groupId] ?? isActive;

    return (
      <div key={item.name}>
        <button
          type="button"
          onClick={() => toggleNavGroup(groupId)}
          title={collapsed ? item.name : undefined}
          className={cn(
            "flex w-full items-center rounded-lg h-10 text-sm font-medium transition-all duration-200 group border-l-[3px]",
            collapsed ? "justify-center px-0" : "px-3",
            isActive
              ? "text-blue-600 bg-blue-50 border-blue-600 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-500"
              : "text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <div className={cn("flex min-w-0 items-center gap-3", collapsed && "justify-center")}>
            <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
            {!collapsed && <span className="truncate">{item.name}</span>}
          </div>
          {!collapsed && (
            <div className="ml-auto flex items-center gap-2">
              {item.badge && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
              {isGroupOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
              )}
            </div>
          )}
        </button>

        {isGroupOpen && (
          <div className={cn(
            "mt-1 flex flex-col gap-1",
            !collapsed && "ml-9"
          )}>
            {item.children.map((child) => {
              const childIsActive = child.path ? isNavItemActive(child.path) : false;
              return (
                <NavLink
                  key={child.name}
                  to={child.path || '#'}
                  title={collapsed ? child.name : undefined}
                  onClick={(e) => {
                    if (!child.path) e.preventDefault();
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg h-9 text-sm transition-all duration-200 border-l-[3px]",
                    collapsed ? "justify-center px-0" : "px-3",
                    childIsActive
                      ? "text-blue-600 font-semibold border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-500"
                      : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  {collapsed ? <child.icon className="h-5 w-5 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40 shrink-0" />}
                  {!collapsed && <span className="truncate">{child.name}</span>}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      key={item.name}
      to={item.path || '#'}
      title={collapsed ? item.name : undefined}
      onClick={(e) => {
        if (!item.path) e.preventDefault();
      }}
      className={cn(
        "flex items-center rounded-lg h-10 text-sm font-medium transition-all duration-200 group relative border-l-[3px]",
        collapsed ? "justify-center px-0" : "px-3",
        isActive
          ? "text-blue-600 bg-blue-50 border-blue-600 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-500"
          : "text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
      )}
    >
      <item.icon className={cn("h-5 w-5 shrink-0", collapsed ? "" : "mr-3", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
      {!collapsed && <span className="truncate">{item.name}</span>}
      {!collapsed && item.badge && (
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
          {item.badge}
        </span>
      )}
      {collapsed && item.badge && (
        <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-blue-600"></span>
      )}
    </NavLink>
  );
}
