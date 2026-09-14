import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import { 
  Search, User, Settings, LayoutDashboard, Briefcase, 
  Users, Laptop, Plane, UserSearch, Star, FileText, BarChart, Shield, History 
, ClipboardList, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface CommandPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function CommandPalette({ open, setOpen }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = React.useState('');
  
  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setOpen]);

  // Reset search when closed
  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl">
        <Command 
          className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
        >
          <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <Search className="w-5 h-5 text-gray-500 dark:text-gray-400 dark:text-gray-500 mr-2" />
          <Command.Input 
            autoFocus
            value={search}
            onValueChange={setSearch}
            placeholder="Search resources, people, settings..." 
            className="flex-1 bg-transparent outline-none focus:outline-none focus-visible:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 font-medium"
          />
        </div>
        
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500">
            {search.length === 0 ? "Start typing to search..." : "No results found."}
          </Command.Empty>
          
          {search.length > 0 && (
            <>
              <Command.Group heading="Navigation" className="text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-2 px-2">
                <Command.Item 
                  onSelect={() => runCommand(() => navigate('/dashboard'))}
                  className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 aria-selected:text-primary-600 dark:aria-selected:text-primary-400 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 mr-3" />
                  Dashboard
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => navigate('/employees'))}
                  className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 aria-selected:text-primary-600 dark:aria-selected:text-primary-400 transition-colors"
                >
                  <Users className="w-4 h-4 mr-3" />
                  Employees
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => navigate('/assets'))}
                  className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 aria-selected:text-primary-600 dark:aria-selected:text-primary-400 transition-colors"
                >
                  <Laptop className="w-4 h-4 mr-3" />
                  Assets
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => navigate('/travel'))}
                  className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 aria-selected:text-primary-600 dark:aria-selected:text-primary-400 transition-colors"
                >
                  <Plane className="w-4 h-4 mr-3" />
                  Travel
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => navigate('/office-expenses'))}
                  className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 aria-selected:text-primary-600 dark:aria-selected:text-primary-400 transition-colors"
                >
                  <Building2 className="w-4 h-4 mr-3" />
                  Office Expenses
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => navigate('/recruitment'))}
                  className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 aria-selected:text-primary-600 dark:aria-selected:text-primary-400 transition-colors"
                >
                  <UserSearch className="w-4 h-4 mr-3" />
                  Recruitment
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => navigate('/performance'))}
                  className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 aria-selected:text-primary-600 dark:aria-selected:text-primary-400 transition-colors"
                >
                  <Star className="w-4 h-4 mr-3" />
                  Performance
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => navigate('/requests'))}
                  className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 aria-selected:text-primary-600 dark:aria-selected:text-primary-400 transition-colors"
                >
                  <ClipboardList className="w-4 h-4 mr-3" />
                  Helpdesk
                </Command.Item>
                
                {/* More navigation items */}
                <Command.Item 
                  onSelect={() => runCommand(() => navigate('/training'))}
                  className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 aria-selected:text-primary-600 dark:aria-selected:text-primary-400 transition-colors"
                >
                  <Star className="w-4 h-4 mr-3" />
                  Training
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => navigate('/documents'))}
                  className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 aria-selected:text-primary-600 dark:aria-selected:text-primary-400 transition-colors"
                >
                  <FileText className="w-4 h-4 mr-3" />
                  Documents
                </Command.Item>

                
                {isAdminOrHR && (
                  <>
                    <Command.Item 
                      onSelect={() => runCommand(() => navigate('/reports'))}
                      className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 aria-selected:text-primary-600 dark:aria-selected:text-primary-400 transition-colors"
                    >
                      <BarChart className="w-4 h-4 mr-3" />
                      Reports
                    </Command.Item>
                    <Command.Item 
                      onSelect={() => runCommand(() => navigate('/attrition'))}
                      className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 aria-selected:text-primary-600 dark:aria-selected:text-primary-400 transition-colors"
                    >
                      <BarChart className="w-4 h-4 mr-3" />
                      Attrition
                    </Command.Item>
                    <Command.Item 
                      onSelect={() => runCommand(() => navigate('/roles'))}
                      className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 aria-selected:text-primary-600 dark:aria-selected:text-primary-400 transition-colors"
                    >
                      <Shield className="w-4 h-4 mr-3" />
                      Role Mgt
                    </Command.Item>
                    <Command.Item 
                      onSelect={() => runCommand(() => navigate('/audit'))}
                      className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 aria-selected:text-primary-600 dark:aria-selected:text-primary-400 transition-colors"
                    >
                      <History className="w-4 h-4 mr-3" />
                      Audit Log
                    </Command.Item>
                  </>
                )}
              </Command.Group>
              
              <Command.Group heading="Settings & Actions" className="text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-2 px-2 mt-4">
                <Command.Item 
                  onSelect={() => runCommand(() => navigate('/profile'))}
                  className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 aria-selected:text-primary-600 dark:aria-selected:text-primary-400 transition-colors"
                >
                  <User className="w-4 h-4 mr-3" />
                  My Profile
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => navigate('/settings'))}
                  className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 aria-selected:text-primary-600 dark:aria-selected:text-primary-400 transition-colors"
                >
                  <Settings className="w-4 h-4 mr-3" />
                  Preferences
                </Command.Item>
              </Command.Group>
            </>
          )}
        </Command.List>
      </Command>
      </div>
    </div>
  );
}
