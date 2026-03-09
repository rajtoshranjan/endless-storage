import { ChevronRight, Home } from 'lucide-react';
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

  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      {isRoot ? (
        <span className="flex items-center gap-1 px-2 text-xs font-medium text-foreground">
          <Home className="size-3" />
          Home
        </span>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={() => onNavigate(-1)}
        >
          <Home className="size-3" />
          Home
        </Button>
      )}
      {path.map((item, index) => (
        <React.Fragment key={item.id}>
          <ChevronRight className="size-3 shrink-0" />
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 text-xs ${index === path.length - 1 ? 'font-medium text-foreground' : ''}`}
            onClick={() => onNavigate(index)}
          >
            {item.name}
          </Button>
        </React.Fragment>
      ))}
    </div>
  );
};
