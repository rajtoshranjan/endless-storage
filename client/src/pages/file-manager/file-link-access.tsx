import { DownloadIcon } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CustomIcons } from '../../components';
import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui';
import { EnvVariables } from '../../config';

export const FileShareLinkDownload = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) return;

    // Redirect to backend download URL and close tab
    window.location.href = `${EnvVariables.apiUrl}/files/links/${slug}/download`;
  }, [slug]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Link to="/" className="flex items-center gap-2 self-center font-medium">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <CustomIcons.Logo className="size-4" />
        </div>
        Endless Storage
      </Link>
      <Card className=" text-center">
        <CardHeader>
          <div className="animate-pulse">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/20">
              <DownloadIcon className="size-6 animate-bounce text-primary" />
            </div>
          </div>
          <CardTitle className="pb-2 text-2xl">Downloading Your File</CardTitle>
          <CardDescription className="text-sm">
            Your download should begin automatically in a moment...
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            onClick={() => navigate('/')}
            className="min-w-[200px] shadow-sm"
          >
            Return to Dashboard
          </Button>
          <p className="text-xs text-muted-foreground">
            Having trouble? Try refreshing the page
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
