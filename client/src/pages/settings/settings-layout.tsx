import { HardDrive, Palette, LucideIcon } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { PageHeader } from '../../components/layout';

type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    path: '/settings',
    label: 'Appearance',
    icon: Palette,
    description: 'Theme & display',
  },
  {
    path: '/settings/storage',
    label: 'Linked Storage',
    icon: HardDrive,
    description: 'Connected accounts',
  },
];

export function SettingsLayout() {
  const { pathname } = useLocation();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your preferences and integrations"
      />

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar */}
        <nav className="w-full shrink-0 md:w-48">
          <ul className="flex gap-1 overflow-x-auto md:flex-col">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.path ||
                (item.path !== '/settings' && pathname.startsWith(item.path));

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all',
                      isActive
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
