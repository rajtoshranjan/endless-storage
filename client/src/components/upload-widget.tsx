import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  File,
  Loader2,
  X,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import {
  closeWidget,
  selectIsUploadWidgetVisible,
  selectUploadJobs,
} from '../store/slices';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { abortUpload } from '../services/apis';
import { Button, ScrollArea, Progress } from './ui';

export function UploadWidget() {
  const dispatch = useAppDispatch();
  const isVisible = useAppSelector(selectIsUploadWidgetVisible);
  const jobs = useAppSelector(selectUploadJobs);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isVisible) return null;

  const activeCount = jobs.filter((j) => j.status === 'uploading').length;
  const isAllDone = jobs.length > 0 && activeCount === 0;

  // Header string logic similar to Google Drive
  let headerTitle = 'Uploads';
  if (activeCount > 0) {
    headerTitle = `Uploading ${activeCount} item${activeCount !== 1 ? 's' : ''}`;
  } else if (isAllDone) {
    headerTitle = `${jobs.length} upload${jobs.length !== 1 ? 's' : ''} complete`;
  }

  return (
    <div className="fixed bottom-0 right-8 z-50 flex w-80 flex-col overflow-hidden rounded-t-lg border bg-background shadow-2xl sm:w-[360px]">
      {/* Header - Sleek and dark similar to GD */}
      <div
        className="flex cursor-pointer items-center justify-between bg-zinc-900 px-4 py-3 text-zinc-50 dark:bg-zinc-800"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsMinimized(!isMinimized);
          }
        }}
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <span className="text-sm font-medium">{headerTitle}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-6 rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
          >
            {isMinimized ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
            onClick={(e) => {
              e.stopPropagation();
              dispatch(closeWidget());
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <ScrollArea className="h-64 border-t bg-background">
          <div className="flex flex-col">
            {jobs.map((job) => {
              const isActive = job.status === 'uploading';

              return (
                <div
                  key={job.id}
                  className="group relative flex items-center justify-between border-b px-4 py-3 hover:bg-muted/50"
                >
                  <div className="flex flex-1 items-center gap-3 overflow-hidden">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-500">
                      <File className="size-4" />
                    </div>
                    <div className="flex flex-1 flex-col overflow-hidden pr-2">
                      <span
                        className="truncate text-sm font-medium"
                        title={job.fileName}
                      >
                        {job.fileName.length > 28
                          ? `${job.fileName.slice(0, 15)}…${job.fileName.slice(-12)}`
                          : job.fileName}
                      </span>
                      {isActive ? (
                        <div className="mt-1 flex flex-col gap-1.5">
                          <Progress
                            value={job.progress}
                            className="h-1.5 w-full [&>div]:bg-emerald-500"
                          />
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {job.progress === 100
                              ? 'Finishing...'
                              : job.totalChunks > 1
                                ? `Uploading chunk ${job.completedChunks}/${job.totalChunks} · ${job.progress}%`
                                : `Uploading... ${job.progress}%`}
                          </span>
                        </div>
                      ) : (
                        <span className="mt-0.5 text-xs text-muted-foreground">
                          {job.status === 'success'
                            ? 'Upload complete'
                            : job.status === 'cancelled'
                              ? 'Upload cancelled'
                              : 'Upload failed'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-center pl-2">
                    {isActive ? (
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="size-4 animate-spin text-emerald-500" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 rounded-full text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
                          onClick={() => abortUpload(job.id)}
                          title="Cancel upload"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : job.status === 'success' ? (
                      <CheckCircle2 className="size-5 text-emerald-500" />
                    ) : job.status === 'cancelled' ? (
                      <XCircle className="size-5 text-muted-foreground" />
                    ) : (
                      <XCircle className="size-5 text-destructive" />
                    )}
                  </div>
                </div>
              );
            })}
            {jobs.length === 0 && (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No active uploads
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
