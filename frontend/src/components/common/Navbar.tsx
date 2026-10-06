'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [accountName, setAccountName] = useState<string>('tester');

  useEffect(() => {
    const localToken = localStorage.getItem('authToken');
    const sessionToken = sessionStorage.getItem('authToken');
    const savedAccount = localStorage.getItem('sharedAccount') || sessionStorage.getItem('sharedAccount');

    if (!localToken && !sessionToken) {
      router.replace('/');
      return;
    }

    if (savedAccount) {
      setAccountName(savedAccount);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('sharedAccount');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('sharedAccount');
    window.location.href = '/';
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Daftar Situs', href: '/sites' },
    { name: 'Riwayat Testing', href: '/history' },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-blue-600 text-white font-extrabold rounded-xl grid place-items-center text-sm shadow-sm group-hover:bg-blue-500 transition-colors">
              EU
            </div>
            <div>
              <span className="font-bold text-base tracking-tight block text-slate-100">
                QA Workspace
              </span>
              <span className="text-[10px] text-slate-400 block font-mono -mt-1">
                Shared Testing Portal
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-4">
          {/* Integration Status Badge */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-full text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 text-[11px] font-medium">Google Sheets Connected</span>
          </div>

          {/* Shared Account Badge */}
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl">
            <span className="text-slate-400 text-xs">Akun:</span>
            <span className="text-blue-400 font-semibold text-xs">{accountName}</span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-red-400 font-medium px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
            title="Keluar dari sesi akun"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
