import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, PartyPopper } from 'lucide-react';

export default function UnbanNotificationModal({ isOpen, onClose }) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-elevated sm:max-w-[400px] overflow-hidden text-center p-8">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div className="absolute -top-1 -right-1">
              <PartyPopper className="w-8 h-8 text-yellow-500 animate-bounce" />
            </div>
          </div>
        </div>

        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold text-zinc-100 leading-tight">
            {t('auth.unbanTitle') || 'Welcome Back!'}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm leading-relaxed">
            {t('auth.unbanMessage') || 'Your account suspension has been lifted. You can now use all features again.'}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="mt-8">
          <Button
            type="button"
            onClick={onClose}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11 text-lg"
          >
            {t('common.gotIt') || 'Awesome!'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
