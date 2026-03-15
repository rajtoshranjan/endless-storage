import { ChevronRight, Home, MoreHorizontal } from 'lucide-react';
import React from 'react';
import { Button } from '../../components/ui';

type FolderPathItem = { id: string; name: string };

type FolderBreadcrumbProps = {
  path: FolderPathItem[];
  onNavigate: (index: number) => void; // -1 = root
};

export const FolderBreadcrumb: React.FC<FolderBreadcrumbProps> = ({
  path,
  onNavigate,
}) => {
  const isRoot = path.length === 0;

  // When depth > 2, collapse middle items into "…"
  // Always show: Home > [collapsed?] > second-to-last > last
  const showCollapsed = path.length > 2;
  const visibleItems = showCollapsed
    ? [path[path.length - 2], path[path.length - 1]]
    : path;
  const visibleStartIndex = showCollapsed ? path.length - 2 : 0;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-0.5 text-sm text-muted-foreground">
      {/* Home */}
      {isRoot ? (
        <span className="flex shrink-0 items-center gap-1 px-2 text-xs font-medium text-foreground">
          <Home className="size-3" />
          Home
        </span>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 gap-1 px-2 text-xs"
          onClick={() => onNavigate(-1)}
        >
          <Home className="size-3" />
          Home
        </Button>
      )}

      {/* Collapsed indicator */}
      {showCollapsed && (
        <>
          <ChevronRight className="size-3 shrink-0" />
          <span className="flex h-7 shrink-0 items-center px-1.5 text-muted-foreground">
            <MoreHorizontal className="size-3.5" />
          </span>
        </>
      )}

      {/* Visible path items */}
      {visibleItems.map((item, i) => {
        const originalIndex = visibleStartIndex + i;
        const isLast = originalIndex === path.length - 1;
        return (
          <React.Fragment key={item.id}>
            <ChevronRight className="size-3 shrink-0" />
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 min-w-0 px-2 text-xs ${isLast ? 'font-medium text-foreground' : ''}`}
              onClick={() => onNavigate(originalIndex)}
            >
              <span className="max-w-32 truncate">{item.name}</span>
            </Button>
          </React.Fragment>
        );
      })}
    </div>
  );
};
