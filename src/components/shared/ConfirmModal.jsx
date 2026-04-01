import { useTranslation } from 'react-i18next';
import { useScrollLock } from '../../hooks/useScrollLock';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText, cancelText }) {
  const { t } = useTranslation();
  useScrollLock(isOpen);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-lg shadow-green-500/20 flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <AlertDialogTitle className="text-lg font-bold text-zinc-100">
              {title || t('confirm.action')}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-zinc-400 leading-relaxed mt-2">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 mt-2">
          <AlertDialogCancel
            onClick={onCancel}
            className="flex-1 py-2.5 bg-zinc-700 hover:bg-zinc-600 border-zinc-600 text-zinc-300 font-semibold text-sm rounded-xl transition-all"
          >
            {cancelText || t('confirm.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-primary hover:bg-primary-dim text-zinc-950 font-semibold text-sm rounded-xl transition-all"
          >
            {confirmText || t('confirm.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
