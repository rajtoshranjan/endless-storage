import { Moon, Sun } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { cn } from '../../lib/utils';
import { Theme } from '../../store/enums';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectTheme, toggleTheme } from '../../store/slices';

export function AppearanceSection() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectTheme);
  const isDark = theme.current === Theme.Dark;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Appearance</h2>
        <p className="text-sm text-muted-foreground">
          Customize how Endless Storage looks
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm">Theme</CardTitle>
          <CardDescription>Choose between light and dark mode</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <button
              onClick={() => !isDark || dispatch(toggleTheme())}
              className={cn(
                'flex flex-1 flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all',
                !isDark
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-transparent hover:border-muted-foreground/20 hover:bg-accent/50',
              )}
            >
              <div
                className={cn(
                  'flex size-10 items-center justify-center rounded-full',
                  !isDark
                    ? 'bg-amber-500/15 text-amber-500'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <Sun className="size-5" />
              </div>
              <span
                className={cn(
                  'text-sm font-medium',
                  !isDark ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                Light
              </span>
            </button>

            <button
              onClick={() => isDark || dispatch(toggleTheme())}
              className={cn(
                'flex flex-1 flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all',
                isDark
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-transparent hover:border-muted-foreground/20 hover:bg-accent/50',
              )}
            >
              <div
                className={cn(
                  'flex size-10 items-center justify-center rounded-full',
                  isDark
                    ? 'bg-indigo-500/15 text-indigo-400'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <Moon className="size-5" />
              </div>
              <span
                className={cn(
                  'text-sm font-medium',
                  isDark ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                Dark
              </span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
