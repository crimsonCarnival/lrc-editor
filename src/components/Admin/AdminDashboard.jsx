import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { admin } from '../../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldAlert, Trash2, Ban, CheckCircle2, RefreshCw, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import RequestLogger from './RequestLogger';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showLogger, setShowLogger] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { users: fetchedUsers } = await admin.getUsers({ search });
      setUsers(fetchedUsers);
    } catch (error) {
      toast.error(t('admin.toast.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleToggleBan = async (user) => {
    try {
      if (user.isBanned) {
        await admin.unbanUser(user.id || user._id);
        toast.success(t('admin.toast.unbannedSuccess', { name: user.username }));
      } else {
        await admin.banUser(user.id || user._id);
        toast.success(t('admin.toast.bannedSuccess', { name: user.username }));
      }
      fetchUsers();
    } catch (err) {
      toast.error(t('admin.toast.statusError'));
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(t('admin.table.confirmDelete', { name: user.username }))) return;
    try {
      await admin.deleteUser(user.id || user._id);
      toast.success(t('admin.toast.deleteSuccess', { name: user.username }));
      fetchUsers();
    } catch (err) {
      toast.error(t('admin.toast.deleteError'));
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <ShieldAlert className="text-indigo-400" />
            {t('admin.dashboard.title')}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">{t('admin.dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={showLogger ? "primary" : "secondary"}
            onClick={() => setShowLogger(!showLogger)}
            className="flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            {t('admin.dashboard.requestLogger')}
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchUsers}>
            <RefreshCw className="w-4 h-4 text-zinc-400" />
          </Button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden relative">
        <div className="p-4 border-b border-zinc-800/50 flex items-center gap-4">
          <Input 
            placeholder={t('admin.dashboard.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-zinc-950"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-zinc-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-zinc-600" />
              {t('admin.dashboard.loading')}
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">{t('admin.dashboard.noUsers')}</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/50 bg-zinc-900/50">
                  <th className="p-4 font-semibold text-zinc-400 text-xs uppercase tracking-wider">{t('admin.table.user')}</th>
                  <th className="p-4 font-semibold text-zinc-400 text-xs uppercase tracking-wider">{t('admin.table.role')}</th>
                  <th className="p-4 font-semibold text-zinc-400 text-xs uppercase tracking-wider">{t('admin.table.status')}</th>
                  <th className="p-4 font-semibold text-zinc-400 text-xs uppercase tracking-wider">{t('admin.table.appeal')}</th>
                  <th className="p-4 font-semibold text-zinc-400 text-xs uppercase tracking-wider">{t('admin.table.joined')}</th>
                  <th className="p-4 font-semibold text-zinc-400 text-xs uppercase tracking-wider text-right">{t('admin.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {users.map(user => (
                  <tr key={user.id || user._id} className={`transition-colors ${user.deletedAt ? 'opacity-50 bg-red-950/20' : 'hover:bg-zinc-800/30'}`}>
                    <td className="p-4">
                      <div className="font-medium text-zinc-200">{user.username} {user.deletedAt && t('admin.table.deleted')}</div>
                      <div className="text-xs text-zinc-500">{user.email || t('admin.table.noEmail')}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      {user.isBanned ? (
                        <span className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
                          <Ban className="w-3.5 h-3.5" /> {t('admin.table.banned')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {t('admin.table.active')}
                        </span>
                      )}
                    </td>
                    <td className="p-4 max-w-[200px] truncate text-xs text-zinc-300">
                      {user.banAppeal ? (
                        <span className="italic text-yellow-200" title={user.banAppeal}>"{user.banAppeal}"</span>
                      ) : (
                        <span className="text-zinc-600">{t('admin.table.noAppeal')}</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-zinc-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Button
                        variant={user.isBanned ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleToggleBan(user)}
                        disabled={user.role === 'admin'}
                        className={!user.isBanned ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" : ""}
                      >
                        {user.isBanned ? t('admin.table.unban') : t('admin.table.ban')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(user)}
                        disabled={user.role === 'admin'}
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <RequestLogger open={showLogger} onClose={() => setShowLogger(false)} />
    </div>
  );
}
