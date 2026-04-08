import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/useAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Music2 } from 'lucide-react';
import { Spinner } from '@/components/ui/skeleton';

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-[11px] text-red-400 font-medium mt-0.5">{message}</p>;
}

export default function AuthPage() {
  const { t } = useTranslation();
  const { login, register } = useAuthContext();
  const [tab, setTab] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Login fields
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const switchTab = (newTab) => {
    setTab(newTab);
    setError('');
    setFieldErrors({});
  };

  const validateLogin = () => {
    const errors = {};
    if (!identifier.trim()) errors.identifier = t('auth.validation.fieldRequired');
    if (!loginPassword) errors.loginPassword = t('auth.validation.fieldRequired');
    else if (loginPassword.length < 8) errors.loginPassword = t('auth.validation.passwordMinLength');
    return errors;
  };

  const validateRegister = () => {
    const errors = {};
    if (username && username.length < 3) errors.username = t('auth.validation.usernameMinLength');
    if (username && !/^[a-zA-Z0-9_-]+$/.test(username)) errors.username = t('auth.validation.usernamePattern');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = t('auth.validation.emailInvalid');
    if (!username && !email) errors.username = t('auth.validation.fieldRequired');
    if (!regPassword) errors.regPassword = t('auth.validation.fieldRequired');
    else if (regPassword.length < 8) errors.regPassword = t('auth.validation.passwordMinLength');
    return errors;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const errors = validateLogin();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setError('');
    setLoading(true);
    try {
      await login({ identifier, password: loginPassword });
    } catch (err) {
      if (err.status === 429) setError(t('auth.tooManyAttempts'));
      else setError(t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const errors = validateRegister();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setError('');
    setLoading(true);
    try {
      await register({
        username: username || undefined,
        email: email || undefined,
        password: regPassword,
      });
    } catch (err) {
      if (err.status === 409) setError(t('auth.usernameTaken'));
      else if (err.status === 400) setError(t('auth.validationError'));
      else if (err.status === 429) setError(t('auth.tooManyAttempts'));
      else setError(t('auth.registerError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-80 h-80 bg-accent-purple/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-raised w-full max-w-sm mx-auto px-4">
        {/* Logo + title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
            <Music2 className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">{t('app.name')}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t('auth.tagline')}</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-elevated">
          {/* Tabs */}
          <div className="flex border-b border-zinc-700/60 px-6 pt-4">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${
                tab === 'login'
                  ? 'text-primary border-primary'
                  : 'text-zinc-400 border-transparent hover:text-zinc-200'
              }`}
            >
              {t('auth.login')}
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${
                tab === 'register'
                  ? 'text-primary border-primary'
                  : 'text-zinc-400 border-transparent hover:text-zinc-200'
              }`}
            >
              {t('auth.register')}
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-medium">
                {error}
              </div>
            )}

            {tab === 'login' ? (
              <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="auth-identifier" className="text-xs font-semibold text-zinc-300">
                    {t('auth.usernameOrEmail')}
                  </Label>
                  <Input
                    id="auth-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => { setIdentifier(e.target.value); setFieldErrors((p) => ({ ...p, identifier: undefined })); }}
                    autoFocus
                    autoComplete="username"
                    className={`bg-zinc-800/80 ${fieldErrors.identifier ? 'border-red-500/60' : 'border-zinc-700/60'}`}
                  />
                  <FieldError message={fieldErrors.identifier} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="auth-password" className="text-xs font-semibold text-zinc-300">
                    {t('auth.password')}
                  </Label>
                  <Input
                    id="auth-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); setFieldErrors((p) => ({ ...p, loginPassword: undefined })); }}
                    autoComplete="current-password"
                    className={`bg-zinc-800/80 ${fieldErrors.loginPassword ? 'border-red-500/60' : 'border-zinc-700/60'}`}
                  />
                  <FieldError message={fieldErrors.loginPassword} />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary-dim text-zinc-950 font-semibold text-sm rounded-xl h-10 mt-1"
                >
                  {loading ? <Spinner size={18} /> : t('auth.loginAction')}
                </Button>
                <p className="text-xs text-zinc-500 text-center">
                  {t('auth.noAccount')}{' '}
                  <button type="button" onClick={() => switchTab('register')} className="text-primary hover:underline font-medium">
                    {t('auth.register')}
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} noValidate className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="auth-username" className="text-xs font-semibold text-zinc-300">
                    {t('auth.username')}
                  </Label>
                  <Input
                    id="auth-username"
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setFieldErrors((p) => ({ ...p, username: undefined })); }}
                    autoComplete="username"
                    maxLength={30}
                    className={`bg-zinc-800/80 ${fieldErrors.username ? 'border-red-500/60' : 'border-zinc-700/60'}`}
                  />
                  <FieldError message={fieldErrors.username} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="auth-email" className="text-xs font-semibold text-zinc-300">
                    {t('auth.email')}
                  </Label>
                  <Input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
                    autoComplete="email"
                    className={`bg-zinc-800/80 ${fieldErrors.email ? 'border-red-500/60' : 'border-zinc-700/60'}`}
                  />
                  <FieldError message={fieldErrors.email} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="auth-reg-password" className="text-xs font-semibold text-zinc-300">
                    {t('auth.password')}
                  </Label>
                  <Input
                    id="auth-reg-password"
                    type="password"
                    value={regPassword}
                    onChange={(e) => { setRegPassword(e.target.value); setFieldErrors((p) => ({ ...p, regPassword: undefined })); }}
                    autoComplete="new-password"
                    className={`bg-zinc-800/80 ${fieldErrors.regPassword ? 'border-red-500/60' : 'border-zinc-700/60'}`}
                  />
                  <FieldError message={fieldErrors.regPassword} />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary-dim text-zinc-950 font-semibold text-sm rounded-xl h-10 mt-1"
                >
                  {loading ? <Spinner size={18} /> : t('auth.registerAction')}
                </Button>
                <p className="text-xs text-zinc-500 text-center">
                  {t('auth.hasAccount')}{' '}
                  <button type="button" onClick={() => switchTab('login')} className="text-primary hover:underline font-medium">
                    {t('auth.login')}
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
