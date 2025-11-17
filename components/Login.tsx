import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import TextInput from './common/TextInput';
import Button from './common/Button';
import { useLanguage } from '../context/LanguageContext';

const AppLogo: React.FC = () => {
    const { t } = useLanguage();
    return (
        <h1 className="text-4xl font-serif text-center mb-8">
            {t('login.title')}
        </h1>
    )
};

interface LoginProps {
  onSwitchMode: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const { t } = useLanguage();

  const isFormValid = email.includes('@') && password.trim().length >= 6;

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Auth state change will be handled by App.tsx
    } catch (err: any) {
      setError(t('login.error'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    setResetSuccess('');
    try {
        await sendPasswordResetEmail(auth, resetEmail);
        setResetSuccess(t('resetPassword.successMessage'));
    } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
            setResetError(t('resetPassword.errorNotFound'));
        } else {
            setResetError(t('resetPassword.genericError'));
        }
        console.error(err);
    } finally {
        setResetLoading(false);
    }
  };

  if (mode === 'reset') {
    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="hidden md:block">
                <img
                    src="https://picsum.photos/400/580"
                    alt="App preview"
                    className="rounded-lg shadow-lg"
                />
            </div>

            <div className="w-full max-w-sm">
                <div className="bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 rounded-lg p-10">
                    <h2 className="text-2xl font-semibold text-center mb-2">{t('resetPassword.title')}</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center mb-6">{t('resetPassword.instructions')}</p>
                    
                    {resetSuccess ? (
                        <p className="text-green-500 text-sm text-center py-4">{resetSuccess}</p>
                    ) : (
                        <form onSubmit={handleResetSubmit} className="flex flex-col gap-2">
                            <TextInput
                                id="reset-email"
                                type="email"
                                label={t('resetPassword.emailLabel')}
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                            />
                            {resetError && <p className="text-red-500 text-xs text-center mt-2">{resetError}</p>}
                            <Button type="submit" disabled={!resetEmail.includes('@') || resetLoading} className="mt-4">
                                {resetLoading ? t('resetPassword.sendingLinkButton') : t('resetPassword.sendLinkButton')}
                            </Button>
                        </form>
                    )}

                    <div className="mt-6 border-t border-zinc-300 dark:border-zinc-700 pt-4">
                        <button
                            onClick={() => setMode('login')}
                            className="w-full font-semibold text-sky-500 hover:text-sky-600 bg-transparent border-none p-0 cursor-pointer text-center text-sm"
                        >
                            {t('resetPassword.backToLogin')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-8">
      <div className="hidden md:block">
        <img
          src="https://picsum.photos/400/580"
          alt="App preview"
          className="rounded-lg shadow-lg"
        />
      </div>

      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 rounded-lg p-10 mb-2.5">
          <AppLogo />
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-2">
            <TextInput
              id="email"
              type="email"
              label={t('login.emailLabel')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextInput
              id="password"
              type="password"
              label={t('login.passwordLabel')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-red-500 text-xs text-center mt-2">{error}</p>}
            <Button type="submit" disabled={!isFormValid || loading} className="mt-4">
              {loading ? t('login.loggingInButton') : t('login.loginButton')}
            </Button>
          </form>

          <div className="mt-6 text-center">
             <button
                onClick={() => {
                    setMode('reset');
                    setError(''); 
                }}
                className="block w-full text-center text-xs text-blue-900 dark:text-blue-400 bg-transparent border-none p-0 cursor-pointer"
            >
              {t('login.forgotPassword')}
            </button>
          </div>
        </div>
        
        <div className="bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 rounded-lg p-6 text-center text-sm">
          <p>
            {t('login.noAccount')}{' '}
            <button
              onClick={onSwitchMode}
              className="font-semibold text-sky-500 hover:text-sky-600 bg-transparent border-none p-0 cursor-pointer"
            >
              {t('login.signUpLink')}
            </button>
          </p>
        </div>
        
        <div className="text-center py-4">
          <p className="text-sm mb-4">{t('login.getTheApp')}</p>
          <div className="flex justify-center gap-4">
            <a href="https://www.mediafire.com/file/g4z89j1vqr7aktw/Vibe.apk/file" target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-500 hover:text-sky-600">
              {t('login.installHere')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;