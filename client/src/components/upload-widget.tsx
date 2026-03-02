import { CheckCircle2, File, Loader2, X, XCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  closeWidget,
  selectIsWidgetVisible,
  selectUploadJobs,
} from '../store/slices';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';

export function UploadWidget() {
  const dispatch = useAppDispatch();
  const isVisible = useAppSelector(selectIsWidgetVisible);
  const jobs = useAppSelector(selectUploadJobs);

  if (!isVisible) return null;

  const uploadingCount = jobs.filter((j) => j.status === 'uploading').length;
  const isAllDone = jobs.length > 0 && uploadingCount === 0;

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 overflow-hidden shadow-lg sm:bottom-6 sm:right-6 sm:w-96">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/20 px-4 py-3">
        <CardTitle className="text-sm">
          {uploadingCount > 0
            ? `Uploading ${uploadingCount} file${uploadingCount !== 1 ? 's' : ''}`
            : isAllDone
              ? 'Uploads complete'
              : 'Uploads'}
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
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col gap-2 rounded-md p-2 hover:bg-accent/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded bg-primary/10">
                    <File className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {job.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {job.status === 'uploading'
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
                    {job.status === 'uploading' && (
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
                {job.status === 'uploading' && (
                  <Progress value={job.progress} className="h-1.5" />
                )}
              </div>
            ))}
            {jobs.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No active uploads
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
