import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { 
  LayoutDashboard, Users, Laptop, Plane, Briefcase, 
  Target, ClipboardList, GraduationCap, Files, UserMinus, 
  Shield, History, ChevronRight, ChevronDown, Building2, CreditCard,
  ClipboardCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';
  
  // By default, open the section that contains the current path
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    workspace: true,
    employees: true,
    expenses: true,
    auth: true,
  });

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const workspaceNav = [
    ...(isAdminOrHR ? [{ name: 'Recruitment', path: '/recruitment', icon: Briefcase }] : []),
    { name: 'Assets', path: '/assets', icon: Laptop },
    ...(isAdminOrHR ? [{ name: 'Attrition', path: '/attrition', icon: UserMinus }] : []),
    { name: 'Documents', path: '/documents', icon: Files },
    { name: 'Helpdesk', path: '/requests', icon: ClipboardList },
  ];

  const employeesNav = [
    { name: 'Employees', path: '/employees', icon: Users },
    { name: 'Training', path: '/training', icon: GraduationCap },
    { name: 'Performance', path: '/performance', icon: Target },
  ];

  const expensesNav = [
    { name: 'Travel', path: '/travel', icon: Plane },
    { name: 'Office Expenses', path: '/office-expenses', icon: Building2 },
  ];

  const authNav = isAdminOrHR ? [
    { name: 'Role Management', path: '/roles', icon: Shield },
    { name: 'Audit Log', path: '/audit', icon: History }
  ] : [];

  const sections = [
    { id: 'employees', title: 'Employees', items: employeesNav, icon: Users },
    { id: 'workspace', title: 'Workspace', items: workspaceNav, icon: LayoutDashboard },
    { id: 'expenses', title: 'Expenses', items: expensesNav, icon: CreditCard },
    ...(authNav.length > 0 ? [{ id: 'auth', title: 'Authorization', items: authNav, icon: Shield }] : []),
  ];

  // Check if any child item is active
  const isSectionActive = (items: any[]) => {
    return items.some(item => 
      location.pathname === item.path || 
      (item.path !== '/dashboard' && item.path !== '#' && location.pathname.startsWith(item.path))
    );
  };

  return (
    <aside id="primary-sidebar" aria-label="Primary navigation" className="bg-sidebar text-white w-64 flex flex-col shadow-xl z-50 h-[calc(100vh-1rem)] m-2 rounded-xl shrink-0 overflow-hidden lg:h-[calc(100vh-2rem)] lg:m-4">
      {/* Brand */}
      <div className="h-20 flex items-center px-6 shrink-0 pt-2">
        <NavLink to="/dashboard" className="flex items-center gap-3">
          <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shrink-0">
            <ClipboardCheck className="h-6 w-6 text-sidebar" />
          </div>
          <span className="text-xl font-bold tracking-wide">HR Portal</span>
        </NavLink>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2 px-3 flex flex-col gap-2 custom-scrollbar">
        <NavLink
          to="/dashboard"
          className={cn(
            "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
            location.pathname === '/dashboard' ? "text-accent-400 bg-white/5" : "text-white/80 hover:text-accent-400"
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Dashboard</span>
        </NavLink>

        {sections.map((section) => {
          const isOpen = openSections[section.id];
          const hasActiveChild = isSectionActive(section.items);
          
          return (
            <div key={section.id} className="flex flex-col">
              <button
                onClick={() => toggleSection(section.id)}
                aria-expanded={isOpen}
                aria-controls={`sidebar-section-${section.id}`}
                className={cn(
                  "flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                  "hover:text-accent-400",
                  hasActiveChild ? "text-[#EAE0CF]" : "text-white/80"
                )}
              >
                <div className="flex items-center gap-3">
                  <section.icon className="h-5 w-5" />
                  <span>{section.title}</span>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 opacity-50" />
                ) : (
                  <ChevronRight className="h-4 w-4 opacity-50" />
                )}
              </button>
              
              {isOpen && (
                <div id={`sidebar-section-${section.id}`} className="mt-1 mb-2 ml-4 flex flex-col gap-1 border-l border-white/10 pl-3">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.path || 
                      (item.path !== '/dashboard' && item.path !== '#' && location.pathname.startsWith(item.path));
                    return (
                      <NavLink
                        key={item.name}
                        to={item.path}
                        onClick={(e) => item.path === '#' && e.preventDefault()}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                          isActive
                            ? "text-[#EAE0CF] bg-white/5 font-semibold"
                            : "text-white/60 hover:text-accent-400 hover:bg-white/5"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
