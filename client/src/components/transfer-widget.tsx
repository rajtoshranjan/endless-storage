import {
  ArrowDownToLine,
  ArrowUpToLine,
  CheckCircle2,
  File,
  Loader2,
  X,
  XCircle,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  closeWidget,
  selectIsWidgetVisible,
  selectTransferJobs,
} from '../store/slices';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  ScrollArea,
} from './ui';

export function TransferWidget() {
  const dispatch = useAppDispatch();
  const isVisible = useAppSelector(selectIsWidgetVisible);
  const jobs = useAppSelector(selectTransferJobs);

  if (!isVisible) return null;

  const activeCount = jobs.filter(
    (j) => j.status === 'uploading' || j.status === 'downloading',
  ).length;
  const isAllDone = jobs.length > 0 && activeCount === 0;

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 overflow-hidden shadow-lg sm:bottom-6 sm:right-6 sm:w-96">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/20 px-4 py-3">
        <CardTitle className="text-sm">
          {activeCount > 0
            ? `${activeCount} active transfer${activeCount !== 1 ? 's' : ''}`
            : isAllDone
              ? 'Transfers complete'
              : 'Transfers'}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 rounded-full text-muted-foreground hover:bg-muted"
          onClick={() => dispatch(closeWidget())}
        >
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-80">
          <div className="flex flex-col gap-1 p-2">
            {jobs.map((job) => {
              const isActive =
                job.status === 'uploading' || job.status === 'downloading';
              return (
                <div
                  key={job.id}
                  className="flex flex-col gap-2 rounded-md p-2 hover:bg-accent/40"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded bg-primary/10">
                      {job.type === 'upload' ? (
                        <ArrowUpToLine className="size-4 text-primary" />
                      ) : job.type === 'download' ? (
                        <ArrowDownToLine className="size-4 text-primary" />
                      ) : (
                        <File className="size-4 text-primary" />
                      )}
                    </div>
                    <div className="w-0 flex-1 overflow-hidden">
                      <p className="text-sm font-medium" title={job.fileName}>
                        {job.fileName.length > 28
                          ? `${job.fileName.slice(0, 15)}…${job.fileName.slice(-12)}`
                          : job.fileName}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {isActive
                          ? job.progress === 100
                            ? 'Finishing...'
                            : job.totalChunks > 1
                              ? `Chunk ${job.completedChunks}/${job.totalChunks} · ${job.progress}%`
                              : `${job.progress}%`
                          : job.status === 'success'
                            ? 'Complete'
                            : 'Failed'}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {isActive && (
                        <Loader2 className="size-4 animate-spin text-primary" />
                      )}
                      {job.status === 'success' && (
                        <CheckCircle2 className="size-5 text-emerald-500" />
                      )}
                      {job.status === 'error' && (
                        <XCircle className="size-5 text-destructive" />
                      )}
                    </div>
                  </div>
                  {isActive && (
                    <Progress value={job.progress} className="h-1.5" />
                  )}
                </div>
              );
            })}
            {jobs.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No active transfers
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
