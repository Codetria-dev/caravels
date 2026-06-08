import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

function AuthModal({ open, onClose }) {
  const { t } = useTranslation();
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, isConfigured } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-700/30">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-light text-slate-100">
              {user ? t('auth.account') : mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
            </h2>
            <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-8 py-6 space-y-5">
          {user ? (
            /* Logged-in state */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-300 font-medium">
                  {user.email?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="text-sm text-slate-200">{user.email}</div>
                  <div className="text-xs text-slate-500">{t('auth.signedIn')}</div>
                </div>
              </div>
              <button
                onClick={() => { signOut(); onClose(); }}
                className="w-full py-2.5 rounded-lg border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600/50 transition-colors text-sm"
              >
                {t('auth.signOut')}
              </button>
            </div>
          ) : !isConfigured ? (
            /* Not configured */
            <div className="text-center text-slate-400 text-sm py-4">
              <p>{t('auth.notConfigured')}</p>
              <p className="text-xs text-slate-500 mt-2">
                {t('auth.configureEnv')}
              </p>
            </div>
          ) : (
            /* Login form */
            <>
              {error && (
                <div className="px-4 py-3 rounded-lg bg-rose-900/30 border border-rose-800/50 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg border border-slate-700/50 text-slate-300 hover:bg-slate-800/50 transition-colors text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('auth.googleSignIn')}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-700/50" />
                <span className="text-xs text-slate-500">{t('auth.or')}</span>
                <div className="flex-1 h-px bg-slate-700/50" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium transition-colors"
                >
                  {loading ? '...' : mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
                </button>
              </form>

              <div className="text-center">
                <button
                  onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                  className="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
                >
                  {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
