import { LayoutDashboard, Users, Briefcase, BarChart3, GraduationCap, LogOut, Menu } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const adminLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/drives', label: 'Drives', icon: Briefcase },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

const coordinatorLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/drives', label: 'Drives', icon: Briefcase },
];

const studentLinks = [
  { to: '/', label: 'My Portal', icon: GraduationCap },
];

export function AppSidebar() {
  const { user, logout, isAdmin, isStudent } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const links = isAdmin ? adminLinks : isStudent ? studentLinks : coordinatorLinks;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside className={cn(
      "flex flex-col bg-[hsl(var(--nav-bg))] text-[hsl(var(--nav-foreground))] transition-all duration-200",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[hsl(var(--nav-hover))]">
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-[hsl(var(--nav-hover))]">
          <Menu className="h-5 w-5" />
        </button>
        {!collapsed && (
          <div>
            <h1 className="text-sm font-semibold tracking-tight">PlacementOS</h1>
            <p className="text-xs text-[hsl(var(--nav-foreground))]/60">IIIT Ranchi</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-[hsl(var(--nav-active))] text-white"
                : "text-[hsl(var(--nav-foreground))]/80 hover:bg-[hsl(var(--nav-hover))] hover:text-white"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-[hsl(var(--nav-hover))]">
        {!collapsed && user && (
          <div className="mb-2 px-2">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-[hsl(var(--nav-foreground))]/60 truncate">{user.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-[hsl(var(--nav-foreground))]/70 hover:bg-[hsl(var(--nav-hover))] hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
