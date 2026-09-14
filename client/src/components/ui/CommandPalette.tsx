import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Users, Laptop, Plane, Briefcase,
  Target, ClipboardList, GraduationCap, Files, UserMinus,
  Shield, History, CreditCard, HelpCircle, Calendar, Settings
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

interface CommandPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function CommandPalette({ open, setOpen }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  // Flattened sidebar navigation mapping
  const mainNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ...(isAdminOrHR ? [{ name: 'Attrition', path: '/dashboard/attrition', icon: UserMinus }] : []),
    { name: 'Employees', path: '/employees', icon: Users },
    { name: 'Performance', path: '/performance', icon: Target },
    { name: 'Apply for leave', path: '/leaves', icon: Calendar },
    ...(isAdminOrHR ? [{ name: 'Leave approvals', path: '/leaves/approvals', icon: ClipboardList }] : []),
    ...(isAdminOrHR ? [{ name: 'Recruitment', path: '/recruitment', icon: Briefcase }] : []),
    { name: 'Training', path: '/training', icon: GraduationCap },
    { name: 'Assets', path: '/assets', icon: Laptop },
    { name: 'Travel', path: '/travel', icon: Plane },
    { name: 'Expenses', path: '/office-expenses', icon: CreditCard },
    { name: 'Documents', path: '/documents', icon: Files },
    { name: 'Helpdesk', path: '/requests', icon: HelpCircle },
  ];

  const accountNav = [
    ...(isAdminOrHR ? [
      { name: 'Role Management', path: '/roles', icon: Shield },
      { name: 'Audit Log', path: '/audit', icon: History },
    ] : [])
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search modules..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {mainNav.map((item) => (
            <CommandItem key={item.path} onSelect={() => runCommand(() => navigate(item.path))}>
              <item.icon size={16} strokeWidth={2} className="opacity-60 mr-3" aria-hidden="true" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Account">
          {accountNav.map((item) => (
            <CommandItem key={item.path} onSelect={() => runCommand(() => navigate(item.path))}>
              <item.icon size={16} strokeWidth={2} className="opacity-60 mr-3" aria-hidden="true" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
