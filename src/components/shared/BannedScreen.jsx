import { useState } from 'react';
import { useAuthContext } from '../../contexts/useAuthContext';
import { useTranslation } from 'react-i18next';
import { auth } from '../../api';
import { Button } from '@/components/ui/button';
import { Ban, LogOut, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BannedScreen() {
  const { user, logout } = useAuthContext();
  const { t } = useTranslation();
  const [appealText, setAppealText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(!!user?.banAppeal);

  if (!user || !user.isBanned) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!appealText.trim()) return;
    
    setLoading(true);
    try {
      await auth.submitAppeal(appealText);
      setSubmitted(true);
      toast.success(t('admin.toast.appealSuccess'));
    } catch (err) {
      toast.error(t('admin.toast.appealError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/95 backdrop-blur-md p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-red-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.1)] text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
        
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <Ban className="w-8 h-8 text-red-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">{t('admin.banned.title')}</h2>
        <p className="text-zinc-400 text-sm mb-6">
          {t('admin.banned.description')}
        </p>

        {submitted ? (
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 mb-6">
            <p className="text-zinc-300 text-sm font-medium">{t('admin.banned.underReview')}</p>
            <p className="text-zinc-500 text-xs mt-1">{t('admin.banned.reviewSoon')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mb-6 text-left">
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              {t('admin.banned.submitLabel')}
            </label>
            <textarea
              value={appealText}
              onChange={(e) => setAppealText(e.target.value)}
              placeholder={t('admin.banned.placeholder')}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-500/50 resize-none h-24 mb-3"
              maxLength={1000}
            />
            <Button 
              type="submit" 
              className="w-full bg-red-500 hover:bg-red-600 text-white" 
              disabled={loading || !appealText.trim()}
            >
              {loading ? t('admin.banned.submitting') : (
                <span className="flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> {t('admin.banned.submitBtn')}
                </span>
              )}
            </Button>
          </form>
        )}

        <Button 
          variant="ghost" 
          onClick={logout} 
          className="text-zinc-500 hover:text-zinc-300 w-full flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> {t('admin.banned.signOut')}
        </Button>
      </div>
    </div>
  );
}
