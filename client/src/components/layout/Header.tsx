import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, LogOut, User, Search, Sun, Moon, Bell, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useTheme } from 'next-themes';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications';

interface HeaderProps {
  onMenuClick?: () => void;
  menuOpen?: boolean;
  sidebarCollapsed?: boolean;
  onSidebarCollapseToggle?: () => void;
}

export function Header({ onMenuClick, menuOpen = false, sidebarCollapsed = false, onSidebarCollapseToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: notifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll().then(res => res.data),
    refetchInterval: 60000 // Poll every minute
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const unreadCount = notifs?.filter(n => !n.isRead).length || 0;

  return (
    <>
      <header className="flex h-20 items-center justify-between bg-transparent px-6 transition-colors">
        <div className="flex items-center flex-1">
          <Button
            variant="ghost"
            size="sm"
            className="mr-2 text-gray-500 hover:text-navy-900 dark:text-gray-400 dark:hover:text-white lg:hidden"
            onClick={onMenuClick}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="primary-sidebar"
          >
            <div className="relative w-5 h-5 flex items-center justify-center">
              <Menu className={`absolute h-5 w-5 transition-all duration-300 ${menuOpen ? "rotate-90 opacity-0 scale-50" : "rotate-0 opacity-100 scale-100"}`} aria-hidden="true" />
              <X className={`absolute h-5 w-5 transition-all duration-300 ${menuOpen ? "rotate-0 opacity-100 scale-100" : "-rotate-90 opacity-0 scale-50"}`} aria-hidden="true" />
            </div>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="mr-2 hidden text-gray-500 hover:text-navy-900 dark:text-gray-400 dark:hover:text-white lg:inline-flex"
            onClick={onSidebarCollapseToggle}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-controls="primary-sidebar"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
          
          <button 
            onClick={() => setCmdOpen(true)}
            className="hidden md:flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-transparent w-64 justify-between"
          >
            <div className="flex items-center">
              <Search className="h-4 w-4 mr-2" />
              <span>Search...</span>
            </div>
            <kbd className="hidden sm:inline-block text-xs font-semibold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-900">Ctrl K</kbd>
          </button>
        </div>

        <div ref={headerRef} className="flex items-center space-x-4 relative">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-gray-600 dark:text-gray-300"
            aria-label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </Button>
          
          <div className="relative">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setNotifOpen(!notifOpen); setDropdownOpen(false); }}
              className="text-gray-600 dark:text-gray-300 relative"
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              aria-expanded={notifOpen}
              aria-controls="notifications-panel"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-2 h-2 w-2 rounded-full bg-red-500"></span>
              )}
            </Button>
            
            {notifOpen && (
              <div id="notifications-panel" className="absolute right-0 top-10 mt-2 w-80 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 z-50 border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-semibold text-sm text-navy-900 dark:text-white flex justify-between">
                  Notifications
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{unreadCount} new</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifs && notifs.length > 0 ? (
                    notifs.map(n => (
                      <div 
                        key={n.id} 
                        className={`p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${n.isRead ? 'opacity-60' : ''}`}
                        onClick={() => {
                          if (!n.isRead) markReadMutation.mutate(n.id);
                        }}
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title || n.notificationType}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">{n.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">No notifications</div>
                  )}
                </div>
                <button
                  type="button"
                  className="w-full px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setNotifOpen(false);
                    navigate('/notifications');
                  }}
                >
                  View All Notifications
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="flex items-center cursor-pointer space-x-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
            onClick={() => { setDropdownOpen(!dropdownOpen); setNotifOpen(false); }}
            aria-label="Open user menu"
            aria-expanded={dropdownOpen}
            aria-controls="user-menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold">
              {user?.email?.[0].toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:block">
              {user?.employee?.firstName ? `${user.employee.firstName} ${user.employee.lastName}` : user?.email}
            </span>
          </button>

          {dropdownOpen && (
            <div id="user-menu" className="absolute right-0 top-10 mt-2 w-48 rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 z-50 border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 border-b border-gray-200 dark:border-gray-700">
                Signed in as {user?.role}
              </div>
              <button
                className="flex w-full items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-700"
                onClick={() => {
                  setDropdownOpen(false);
                  const empId = user?.employeeId || (user as any)?.employee?.id;
                  if (empId) {
                    navigate(`/employees/${empId}`);
                  } else {
                    // Fallback for users without an employee record (like system admins)
                    navigate('/settings');
                  }
                }} 
              >
                <User className="mr-2 h-4 w-4" /> Profile
              </button>
              {isAdminOrHR && <button
                className="flex w-full items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-700"
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/settings');
                }} 
              >
                <Settings className="mr-2 h-4 w-4" /> Settings
              </button>}
              <button 
                className="flex w-full items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-gray-700"
                onClick={() => {
                  setDropdownOpen(false);
                  setLogoutConfirmOpen(true);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </header>
      <CommandPalette open={cmdOpen} setOpen={setCmdOpen} />
      
      <ConfirmDialog 
        isOpen={logoutConfirmOpen}
        title="Confirm Logout"
        message="Are you sure you want to log out of the HR portal?"
        confirmLabel="Log Out"
        onConfirm={logout}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </>
  );
}
