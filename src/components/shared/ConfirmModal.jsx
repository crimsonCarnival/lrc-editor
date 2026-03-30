import { useTranslation } from 'react-i18next';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText, cancelText }) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-zinc-900 border border-zinc-700/80 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-lg shadow-green-500/20 flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-zinc-100">{title || t('confirmAction')}</h3>
        </div>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-green-800 hover:bg-green-700 text-zinc-300 font-semibold text-sm rounded-xl transition-all cursor-pointer"
          >
            {cancelText || t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-zinc-600 hover:bg-zinc-500 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer"
          >
            {confirmText || t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
