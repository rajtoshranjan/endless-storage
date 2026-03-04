import { Settings } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { selectActiveDrive } from '../../store/slices';
import { CustomIcons } from '../icons';
import { Button } from '../ui/button';
import { UploadWidget } from '../upload-widget';
import { cn } from '../../lib/utils';
import { SelectDrive } from './select-drive';
import { UserNav } from './user-nav';

export function Layout() {
  // Store.
  const { canManageUsers } = useAppSelector(selectActiveDrive);

  // Constants.
  const menuItems = [
    { path: '/', label: 'Files', show: true },
    { path: '/users', label: 'Users', show: canManageUsers },
  ];

  // Hooks.
  const pathname = useLocation().pathname;
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50">
        {/* Main Header */}
        <nav className="border-b bg-muted">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-8">
                <Link to="/" className="flex items-center gap-2">
                  <CustomIcons.Logo className="size-4 text-primary sm:size-5" />
                  <span className="hidden text-base font-semibold tracking-tight sm:inline sm:text-lg">
                    Endless Storage
                  </span>
                </Link>

                <SelectDrive />
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  variant={
                    pathname === '/shared-with-me' ? 'secondary' : 'ghost'
                  }
                  onClick={() => navigate('/shared-with-me')}
                  size="sm"
                  className="hidden h-7 gap-2 rounded-full px-3 text-xs sm:flex sm:h-8 sm:text-sm"
                >
                  <CustomIcons.SharedWithMe className="size-3.5 sm:size-4" />
                  Shared
                </Button>
                <Button
                  variant={
                    pathname === '/shared-with-me' ? 'secondary' : 'ghost'
                  }
                  onClick={() => navigate('/shared-with-me')}
                  size="icon"
                  className="size-7 rounded-full hover:bg-background/60 sm:hidden"
                  title="Shared with me"
                >
                  <CustomIcons.SharedWithMe className="size-3.5 sm:size-4" />
                </Button>

                <div className="h-4 w-px bg-border max-sm:hidden" />

                <Button
                  variant="ghost"
                  onClick={() => navigate('/settings')}
                  size="icon"
                  className="size-7 rounded-full hover:bg-background/60 sm:size-8"
                  title="Settings"
                >
                  <Settings className="size-3.5 sm:size-4" />
                </Button>
                <UserNav
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-full hover:bg-background/60 sm:size-8"
                />
              </div>
            </div>
          </div>
        </nav>

        {/* Sub Header */}
        <nav className="border-b bg-card/40 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
            <div className="flex h-10 items-center justify-between">
              <div className="flex items-center space-x-4">
                {menuItems
                  .filter((item) => item.show)
                  .map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'text-sm font-medium transition-colors hover:text-primary',
                        pathname === item.path
                          ? 'text-primary'
                          : 'text-muted-foreground',
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-3 py-4 sm:p-6 lg:px-8">
        <Outlet />
      </main>

      {/* Global Overlays */}
      <UploadWidget />
    </div>
  );
}
