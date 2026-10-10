import { Link, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Settings,
  Plus,
  Video,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects/new', label: 'New Project', icon: Plus },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col bg-bg-panel border-r border-surface-border">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-surface-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center flex-shrink-0">
            <Video className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-text-primary tracking-tight">Capzee</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location.pathname === href || (href !== '/dashboard' && location.pathname.startsWith(href));
            return (
              <Link
                key={href}
                to={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-accent-blue/10 text-accent-blue'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-surface-border">
          <p className="text-xs text-text-muted">Capzee v0.1.0</p>
          <p className="text-xs text-text-disabled mt-0.5">Local Processing Mode</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
