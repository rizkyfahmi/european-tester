'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Sidebar() {
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
    {
      name: 'QA Workspace Utama',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      name: 'Riwayat Testing Log',
      href: '/history',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'Rekap Spreadsheet',
      href: '/spreadsheet',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-white flex flex-col h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-extrabold rounded-xl grid place-items-center text-base shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            EU
          </div>
          <div>
            <span className="font-bold text-base tracking-tight block text-slate-100 group-hover:text-blue-400 transition-colors">
              QA Workspace
            </span>
            <span className="text-[11px] text-slate-400 block font-mono -mt-0.5">
              Testing Portal
            </span>
          </div>
        </Link>
      </div>

      {/* Integration Status */}
      <div className="px-5 py-3 border-b border-slate-800/50 bg-slate-950/40">
        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-medium text-[11px] text-slate-300">Google Sheets Active</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Main Menu
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-900/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
              }`}
            >
              <span className={isActive ? 'text-blue-400' : 'text-slate-400'}>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Logout Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/30 space-y-3">
        <div className="flex items-center justify-between bg-slate-800/60 border border-slate-700/60 p-2.5 rounded-xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold text-xs grid place-items-center uppercase shrink-0">
              {accountName.charAt(0)}
            </div>
            <div className="truncate">
              <span className="block text-[10px] text-slate-400 leading-tight">Akun Aktif</span>
              <span className="block text-xs font-semibold text-slate-200 truncate">{accountName}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
