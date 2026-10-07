'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthFormProps {
  initialMode?: 'login' | 'register';
  onLoginSuccess?: (data: { username: string; token: string }) => void;
}

interface UserAccount {
  username: string;
  email: string;
  password: string;
}

export default function AuthForm({ initialMode = 'login', onLoginSuccess }: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Form states
  const [emailOrUser, setEmailOrUser] = useState('');
  const [password, setPassword] = useState('');

  // Register extra states
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Auto-redirect to dashboard if active session exists
    const localToken = localStorage.getItem('authToken');
    const sessionToken = sessionStorage.getItem('authToken');
    const saved = localStorage.getItem('sharedAccount') || sessionStorage.getItem('sharedAccount');
    const savedRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');

    if (localToken || sessionToken) {
      const isAdmin = savedRole === 'admin' || (saved && saved.toLowerCase().includes('admin'));
      router.push(isAdmin ? '/dashboard-admin' : '/dashboard-tester');
      return;
    }

    if (initialMode === 'register') {
      setRegEmail('');
      setRegPassword('');
      setRegUsername('');
      setConfirmPassword('');
    } else {
      const savedEmail = localStorage.getItem('rememberedEmail');
      if (savedEmail) {
        setEmailOrUser(savedEmail);
      }
    }
  }, [router, initialMode]);

  const switchMode = (targetMode: 'login' | 'register') => {
    setMode(targetMode);
    setErrorMessage('');
    setSuccessMessage('');
    setShowPassword(false);
    setShowConfirmPassword(false);

    if (targetMode === 'register') {
      setRegUsername('');
      setRegEmail('');
      setRegPassword('');
      setConfirmPassword('');
    } else {
      const savedEmail = localStorage.getItem('rememberedEmail');
      setEmailOrUser(savedEmail || '');
      setPassword('');
    }
  };

  const getRegisteredUsers = (): UserAccount[] => {
    try {
      const stored = localStorage.getItem('registeredUsers');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [
      {
        username: 'tester',
        email: 'tester@gmail.com',
        password: 'tester123',
      },
      {
        username: 'admin',
        email: 'admin@gmail.com',
        password: 'admin123',
      },
    ];
  };

  const saveRegisteredUser = (newUser: UserAccount) => {
    const existing = getRegisteredUsers();
    const updated = [...existing, newUser];
    localStorage.setItem('registeredUsers', JSON.stringify(updated));
  };

  const saveSession = (loggedUsername: string, token: string, cleanEmail: string) => {
    const isAdmin = cleanEmail.includes('admin') || loggedUsername.toLowerCase().includes('admin');
    const userRole = isAdmin ? 'admin' : 'tester';
    localStorage.setItem('authToken', token);
    localStorage.setItem('sharedAccount', loggedUsername);
    localStorage.setItem('rememberedEmail', cleanEmail);
    localStorage.setItem('userRole', userRole);
    return userRole;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    const cleanInput = emailOrUser.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanInput,
          username: cleanInput,
          password: cleanPassword,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const loggedUsername = data.user?.username || data.username || (cleanInput.includes('@') ? cleanInput.split('@')[0] : cleanInput);
        const userEmail = data.user?.email || cleanInput;
        const token = data.token || 'mock-jwt-token-nestjs';

        const role = saveSession(loggedUsername, token, userEmail);

        if (onLoginSuccess) {
          onLoginSuccess({ username: loggedUsername, token });
        } else {
          router.push(role === 'admin' ? '/dashboard-admin' : '/dashboard-tester');
        }
        return;
      }
    } catch (err) {
      console.warn('Backend connection fallback, verifying local accounts:', err);
    }

    // Local verification
    const users = getRegisteredUsers();
    const matchedUser = users.find(
      (u) =>
        (u.email.toLowerCase() === cleanInput || u.username.toLowerCase() === cleanInput) &&
        u.password === cleanPassword
    );

    if (matchedUser) {
      const token = 'mock-jwt-token-nestjs';
      const role = saveSession(matchedUser.username, token, matchedUser.email);

      if (onLoginSuccess) {
        onLoginSuccess({ username: matchedUser.username, token });
      } else {
        router.push(role === 'admin' ? '/dashboard-admin' : '/dashboard-tester');
      }
    } else {
      setErrorMessage('Incorrect Username/Email or Password.');
    }

    setLoading(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPassword = regPassword.trim();
    const cleanUsername = regUsername.trim() || cleanEmail.split('@')[0];
    const cleanUsernameLower = cleanUsername.toLowerCase();

    if (!cleanUsername || !cleanEmail || !cleanPassword) {
      setErrorMessage('Username, Email, and Password are required.');
      return;
    }

    if (cleanPassword !== confirmPassword.trim()) {
      setErrorMessage('Password confirmation does not match.');
      return;
    }

    // Check duplicate username & email locally
    const registeredUsers = getRegisteredUsers();
    const existingUsername = registeredUsers.find(
      (u) => u.username.toLowerCase() === cleanUsernameLower || u.email.toLowerCase() === cleanUsernameLower
    );
    if (existingUsername) {
      setErrorMessage(`Username "${cleanUsername}" is already taken by another account.`);
      return;
    }

    const existingEmail = registeredUsers.find(
      (u) => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanEmail
    );
    if (existingEmail) {
      setErrorMessage(`Email "${cleanEmail}" is already registered in the system.`);
      return;
    }

    setLoading(true);

    const newUser: UserAccount = {
      username: cleanUsername,
      email: cleanEmail,
      password: cleanPassword,
    };

    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        saveRegisteredUser(newUser);
        setSuccessMessage(`Registration successful for ${cleanEmail}! Please log in.`);
        setMode('login');
        setEmailOrUser(cleanEmail);
        setPassword(cleanPassword);
        setLoading(false);
        return;
      } else {
        setErrorMessage(data.message || 'Username or Email is already registered.');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Backend connection error fallback to local storage check:', err);
    }

    saveRegisteredUser(newUser);
    setSuccessMessage(`Registration successful for ${cleanEmail}! Please log in.`);
    setMode('login');
    setEmailOrUser(cleanEmail);
    setPassword(cleanPassword);
    setLoading(false);
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 bg-[#0d0705] relative overflow-y-auto no-scrollbar font-sans selection:bg-[#FFE0B2] selection:text-[#3E2522]">
      {/* Background Image Layer & Dark Overlay (GPU Accelerated, No-Stutter) */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden transform-gpu [transform:translateZ(0)] will-change-transform">
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-100 transition-opacity duration-500 blur-sm scale-105"
          style={{ backgroundImage: "url('/bg login3.jpeg')" }}
        />
        <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-black/60 via-black/25 to-black/70" />
      </div>

      {/* Main Glassmorphic Card Container */}
      <main className="relative z-10 w-full max-w-sm bg-gradient-to-br from-[#FFF2DF]/25 via-[#FFE0B2]/15 to-[#D3A376]/10 backdrop-blur-2xl px-7 py-8 rounded-3xl shadow-[0_25px_50px_rgba(0,0,0,0.65),0_0_15px_rgba(255,224,178,0.15)] border border-[#FFE0B2]/40 animate-fade-in-up transition-all duration-500 my-auto">
        {/* Header */}
        <header className="text-left mb-6">
          <h1 className="text-3xl font-bold text-[#FFF2DF] tracking-wide drop-shadow-sm">
            {mode === 'login' ? 'Log in' : 'Register Account'}
          </h1>
          <p className="text-xs text-[#FFF2DF]/90 mt-1.5 font-semibold tracking-wide">
            {mode === 'login' ? 'Please log in to your account' : 'Create your new account to continue'}
          </p>
        </header>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs font-semibold backdrop-blur-md animate-fade-in-up">
            ⚠️ {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-400/40 text-emerald-200 text-xs font-semibold backdrop-blur-md animate-fade-in-up">
            ✓ {successMessage}
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} method="POST" className="space-y-4">
            {/* Username / Email Input */}
            <div className="relative">
              <input
                type="text"
                id="username"
                placeholder=" "
                value={emailOrUser}
                onChange={(e) => setEmailOrUser(e.target.value)}
                className="w-full pt-5 pb-1.5 px-4 rounded-2xl text-sm bg-[#FFF2DF] border border-[#FFE0B2]/60 focus:outline-none focus:border-[#FFF2DF] focus:ring-2 focus:ring-[#FFE0B2]/80 transition-all duration-200 peer shadow-inner text-[#3E2522] font-semibold"
                required
              />
              <label
                htmlFor="username"
                className={`absolute left-4 pointer-events-none transition-all duration-200 ease-out ${
                  emailOrUser
                    ? 'top-1.5 text-[11px] font-bold text-[#3E2522]'
                    : 'top-3.5 text-sm font-medium text-[#8C6E63]/80 peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:font-bold peer-focus:text-[#3E2522] peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-[#3E2522] peer-autofill:top-1.5 peer-autofill:text-[11px] peer-autofill:font-bold peer-autofill:text-[#3E2522]'
                }`}
              >
                Username / Email
              </label>
            </div>

            {/* Password Input */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pt-5 pb-1.5 pl-4 pr-11 rounded-2xl text-sm bg-[#FFF2DF] border border-[#FFE0B2]/60 focus:outline-none focus:border-[#FFF2DF] focus:ring-2 focus:ring-[#FFE0B2]/80 transition-all duration-200 peer shadow-inner text-[#3E2522] font-semibold"
                required
              />
              <label
                htmlFor="password"
                className={`absolute left-4 pointer-events-none transition-all duration-200 ease-out ${
                  password
                    ? 'top-1.5 text-[11px] font-bold text-[#3E2522]'
                    : 'top-3.5 text-sm font-medium text-[#8C6E63]/80 peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:font-bold peer-focus:text-[#3E2522] peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-[#3E2522] peer-autofill:top-1.5 peer-autofill:text-[11px] peer-autofill:font-bold peer-autofill:text-[#3E2522]'
                }`}
              >
                Password
              </label>

              <button
                type="button"
                id="togglePassword"
                tabIndex={-1}
                aria-label="Toggle password visibility"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#8C6E63] hover:text-[#3E2522] transition-colors duration-200 cursor-pointer focus:outline-none border-none outline-none select-none rounded-lg"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a8.88 8.88 0 012.122-.363c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-[#FFE0B2] to-[#FFF2DF] hover:from-[#fff0d6] hover:to-[#ffffff] text-[#3E2522] font-bold rounded-xl text-sm shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:shadow-[0_6px_20px_rgba(255,224,178,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 mt-2 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#FFE0B2]/80"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-[#3E2522]/30 border-t-[#3E2522] rounded-full animate-spin" />
              ) : (
                'Login'
              )}
            </button>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegisterSubmit} method="POST" autoComplete="off" className="space-y-4">
            {/* Username Input */}
            <div className="relative">
              <input
                type="text"
                id="reg-username"
                name="reg_username"
                autoComplete="off"
                placeholder=" "
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                className="w-full pt-5 pb-1.5 px-4 rounded-2xl text-sm bg-[#FFF2DF] border border-[#FFE0B2]/60 focus:outline-none focus:border-[#FFF2DF] focus:ring-2 focus:ring-[#FFE0B2]/80 transition-all duration-200 peer shadow-inner text-[#3E2522] font-semibold"
                required
              />
              <label
                htmlFor="reg-username"
                className={`absolute left-4 pointer-events-none transition-all duration-200 ease-out ${
                  regUsername
                    ? 'top-1.5 text-[11px] font-bold text-[#3E2522]'
                    : 'top-3.5 text-sm font-medium text-[#8C6E63]/80 peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:font-bold peer-focus:text-[#3E2522] peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-[#3E2522] peer-autofill:top-1.5 peer-autofill:text-[11px] peer-autofill:font-bold peer-autofill:text-[#3E2522]'
                }`}
              >
                Username
              </label>
            </div>

            {/* Email Input */}
            <div className="relative">
              <input
                type="email"
                id="reg-email"
                name="reg_email"
                autoComplete="off"
                placeholder=" "
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full pt-5 pb-1.5 px-4 rounded-2xl text-sm bg-[#FFF2DF] border border-[#FFE0B2]/60 focus:outline-none focus:border-[#FFF2DF] focus:ring-2 focus:ring-[#FFE0B2]/80 transition-all duration-200 peer shadow-inner text-[#3E2522] font-semibold"
                required
              />
              <label
                htmlFor="reg-email"
                className={`absolute left-4 pointer-events-none transition-all duration-200 ease-out ${
                  regEmail
                    ? 'top-1.5 text-[11px] font-bold text-[#3E2522]'
                    : 'top-3.5 text-sm font-medium text-[#8C6E63]/80 peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:font-bold peer-focus:text-[#3E2522] peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-[#3E2522] peer-autofill:top-1.5 peer-autofill:text-[11px] peer-autofill:font-bold peer-autofill:text-[#3E2522]'
                }`}
              >
                Email
              </label>
            </div>

            {/* Password Input */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="reg-password"
                name="reg_password"
                autoComplete="new-password"
                placeholder=" "
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full pt-5 pb-1.5 pl-4 pr-11 rounded-2xl text-sm bg-[#FFF2DF] border border-[#FFE0B2]/60 focus:outline-none focus:border-[#FFF2DF] focus:ring-2 focus:ring-[#FFE0B2]/80 transition-all duration-200 peer shadow-inner text-[#3E2522] font-semibold"
                required
              />
              <label
                htmlFor="reg-password"
                className={`absolute left-4 pointer-events-none transition-all duration-200 ease-out ${
                  regPassword
                    ? 'top-1.5 text-[11px] font-bold text-[#3E2522]'
                    : 'top-3.5 text-sm font-medium text-[#8C6E63]/80 peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:font-bold peer-focus:text-[#3E2522] peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-[#3E2522] peer-autofill:top-1.5 peer-autofill:text-[11px] peer-autofill:font-bold peer-autofill:text-[#3E2522]'
                }`}
              >
                Password
              </label>

              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#8C6E63] hover:text-[#3E2522] transition-colors duration-200 cursor-pointer focus:outline-none border-none outline-none select-none rounded-lg"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a8.88 8.88 0 012.122-.363c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Confirm Password Input */}
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="reg-confirm-password"
                name="reg_confirm_password"
                autoComplete="new-password"
                placeholder=" "
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pt-5 pb-1.5 pl-4 pr-11 rounded-2xl text-sm bg-[#FFF2DF] border border-[#FFE0B2]/60 focus:outline-none focus:border-[#FFF2DF] focus:ring-2 focus:ring-[#FFE0B2]/80 transition-all duration-200 peer shadow-inner text-[#3E2522] font-semibold"
                required
              />
              <label
                htmlFor="reg-confirm-password"
                className={`absolute left-4 pointer-events-none transition-all duration-200 ease-out ${
                  confirmPassword
                    ? 'top-1.5 text-[11px] font-bold text-[#3E2522]'
                    : 'top-3.5 text-sm font-medium text-[#8C6E63]/80 peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:font-bold peer-focus:text-[#3E2522] peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-[#3E2522] peer-autofill:top-1.5 peer-autofill:text-[11px] peer-autofill:font-bold peer-autofill:text-[#3E2522]'
                }`}
              >
                Confirm Password
              </label>

              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#8C6E63] hover:text-[#3E2522] transition-colors duration-200 cursor-pointer focus:outline-none border-none outline-none select-none rounded-lg"
              >
                {showConfirmPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a8.88 8.88 0 012.122-.363c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Submit Register Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-[#FFE0B2] to-[#FFF2DF] hover:from-[#fff0d6] hover:to-[#ffffff] text-[#3E2522] font-bold rounded-xl text-sm shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:shadow-[0_6px_20px_rgba(255,224,178,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 mt-2 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#FFE0B2]/80"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-[#3E2522]/30 border-t-[#3E2522] rounded-full animate-spin" />
              ) : (
                'Register Now'
              )}
            </button>
          </form>
        )}

        {/* Footer Toggle Mode Link */}
        <p className="text-xs text-center text-[#FFF2DF] mt-6 font-medium">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="text-[#FFE0B2] font-bold hover:underline hover:text-[#ffffff] transition-all ml-0.5 cursor-pointer focus:outline-none"
              >
                Register now
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-[#FFE0B2] font-bold hover:underline hover:text-[#ffffff] transition-all ml-0.5 cursor-pointer focus:outline-none"
              >
                Log in now
              </button>
            </>
          )}
        </p>
      </main>
    </div>
  );
}
