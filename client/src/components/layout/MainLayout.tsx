import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const DESKTOP_BREAKPOINT = 1024;
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'hr-portal-sidebar-collapsed';

export default function MainLayout() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= DESKTOP_BREAKPOINT);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= DESKTOP_BREAKPOINT);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => (
    window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
  ));
  const location = useLocation();
  const sidebarContainerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLElement | null>(null);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  }, [isDesktop, location.pathname]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Listen to window resize to handle default state
  useEffect(() => {
    const handleResize = () => {
      const nextIsDesktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      setIsDesktop(nextIsDesktop);
      setSidebarOpen(nextIsDesktop);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!sidebarOpen || isDesktop) return;

    menuButtonRef.current = document.activeElement as HTMLElement | null;
    const container = sidebarContainerRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = container?.querySelectorAll<HTMLElement>(focusableSelector);
    focusable?.[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSidebarOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !container) return;
      const items = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDesktop, sidebarOpen]);

  return (
    <div className="flex h-screen bg-canvas transition-colors overflow-hidden relative">
      {/* Mobile overlay */}
      {sidebarOpen && !isDesktop && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <div 
        ref={sidebarContainerRef}
        role={sidebarOpen && !isDesktop ? 'dialog' : undefined}
        aria-modal={sidebarOpen && !isDesktop ? true : undefined}
        aria-label={sidebarOpen && !isDesktop ? 'Navigation menu' : undefined}
        className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:relative 
          ${sidebarOpen
            ? (sidebarCollapsed ? 'translate-x-0 lg:w-20 lg:opacity-100' : 'translate-x-0 lg:w-[18rem] lg:opacity-100')
            : '-translate-x-full lg:w-0 lg:opacity-0 lg:-ml-4 overflow-hidden'}`}
      >
        <div className={`h-full ${sidebarCollapsed ? 'w-[18rem] lg:w-20' : 'w-[18rem] lg:w-[18rem]'}`}>
          <Sidebar collapsed={isDesktop && sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(prev => !prev)} />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          menuOpen={sidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          onSidebarCollapseToggle={() => setSidebarCollapsed(prev => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 lg:px-8">
          <ErrorBoundary><Outlet /></ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

