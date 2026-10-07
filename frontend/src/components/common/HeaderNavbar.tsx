'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HeaderNavbar() {
  const router = useRouter();
  const [accountName, setAccountName] = useState<string>('Alex Tester');
  const [userRole, setUserRole] = useState<'admin' | 'tester'>('tester');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const localToken = localStorage.getItem('authToken');
    const sessionToken = sessionStorage.getItem('authToken');
    const saved = localStorage.getItem('sharedAccount') || sessionStorage.getItem('sharedAccount');
    const savedRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');

    if (!localToken && !sessionToken) {
      router.replace('/');
      return;
    }

    if (saved) {
      setAccountName(saved);
    }

    const isAdmin = savedRole === 'admin' || (saved && saved.toLowerCase().includes('admin'));
    setUserRole(isAdmin ? 'admin' : 'tester');

    const handleClickOutside = () => setDropdownOpen(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('sharedAccount');
    localStorage.removeItem('userRole');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('sharedAccount');
    sessionStorage.removeItem('userRole');
    window.location.href = '/';
  };

  const getInitial = () => {
    if (userRole === 'admin') return 'ADM';
    if (!accountName) return 'TST';
    const clean = accountName.trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.length <= 3 ? clean.toUpperCase() : clean.slice(0, 3).toUpperCase();
  };

  const currentEmail = userRole === 'admin' ? 'admin@europeantester.com' : `${accountName.toLowerCase().replace(/\s+/g, '')}@gmail.com`;

  return (
    <header className="sticky top-0 z-40 w-full">
      <nav className="w-full flex items-center justify-between px-4 sm:px-6 py-3 bg-[#1a0f0b]/40 backdrop-blur-xl border-b border-[#FFE0B2]/20 shadow-lg">
        {/* Logo & Title */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            router.push(userRole === 'admin' ? '/dashboard-admin' : '/dashboard-tester');
          }}
          className="flex items-center space-x-2.5"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#D3A376] to-[#FFE0B2] flex items-center justify-center text-[#3E2522] font-black text-xs sm:text-sm shadow-md">
            ET
          </div>
          <span className="text-base sm:text-lg font-bold tracking-wide text-[#FFF8EE]">
            European Tester{' '}
            {userRole === 'admin' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 ml-1">
                Admin
              </span>
            )}
          </span>
        </a>

        {/* Profile Dropdown Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDropdownOpen((prev) => !prev);
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#D3A376] to-[#FFE0B2] text-[#3E2522] flex items-center justify-center font-bold text-xs tracking-wider shadow-md hover:brightness-110 border border-[#FFE0B2]/40 transition-all cursor-pointer shrink-0"
            title={accountName}
          >
            {getInitial()}
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-2 w-64 sm:w-72 rounded-2xl bg-[#1a0f0b]/95 backdrop-blur-2xl border border-[#FFE0B2]/30 shadow-2xl overflow-hidden text-xs z-50 animate-fade-in"
            >
              {/* Header User Card */}
              <div className="bg-[#FFF8EE]/5 p-4 flex flex-col items-center justify-center text-center border-b border-[#FFE0B2]/15">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#D3A376] to-[#FFE0B2] text-[#3E2522] flex items-center justify-center font-black text-lg sm:text-xl mb-2 shadow-inner">
                  {getInitial()}
                </div>
                <h4 className="text-sm font-bold text-[#FFF8EE]">{accountName}</h4>
                <p className="text-[11px] text-[#FFE0B2]/70">{currentEmail}</p>
              </div>



              {/* Log Out */}
              <div className="border-t border-[#FFE0B2]/15 py-1.5">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-rose-400 hover:bg-rose-500/10 transition cursor-pointer flex items-center space-x-2.5 font-semibold"
                >
                  <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}



