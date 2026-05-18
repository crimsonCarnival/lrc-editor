import { useTranslation } from 'react-i18next';
import { AlertTriangle, Home, Music2 } from 'lucide-react';
import { Button } from '@ui/button';

export default function SharedProjectError({ status }) {
  const { t } = useTranslation();

  const isNotFound = status === 404;
  const isForbidden = status === 403;
  const isNoMedia = status === 'no-media';

  const icon = isNoMedia
    ? <Music2 className="size-8 text-amber-400" />
    : <AlertTriangle className="size-8 text-red-500" />;

  const iconBg = isNoMedia ? 'bg-amber-500/10' : 'bg-red-500/10';

  const title = isNoMedia   ? t('project.noMediaTitle', 'Media Not Available') :
                isNotFound  ? t('project.notFoundTitle', 'Project Not Found') :
                isForbidden ? t('project.forbiddenTitle', 'Access Denied') :
                              t('project.errorTitle', 'Error Loading Project');

  const description = isNoMedia   ? t('project.noMediaDesc', 'There was an error loading the media for this project. The audio source may be missing or unavailable.') :
                      isNotFound  ? t('project.notFoundDesc', 'The shared project you are looking for does not exist or has expired.') :
                      isForbidden ? t('project.forbiddenDesc', 'You do not have permission to view this project.') :
                                    t('project.errorDesc', 'An unexpected error occurred while trying to load the project.');

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl">
        <div className={`size-16 rounded-full ${iconBg} flex items-center justify-center mb-6`}>
          {icon}
        </div>
        <h1 className="text-2xl font-semibold text-zinc-100 mb-2">{title}</h1>
        <p className="text-zinc-400 mb-8">{description}</p>
        
        <Button 
          onClick={() => window.location.href = '/'}
          className="w-full h-10 bg-primary text-zinc-950 hover:bg-primary-dim font-semibold gap-2 rounded-xl"
        >
          <Home className="size-4" />
          {t('common.goHome', 'Go to Homepage')}
        </Button>
      </div>
    </div>
  );
}
