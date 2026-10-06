'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('sharedAccount') || sessionStorage.getItem('sharedAccount');
    const savedRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');

    const isAdmin = savedRole === 'admin' || (saved && saved.toLowerCase().includes('admin'));

    if (isAdmin) {
      router.replace('/dashboard-admin');
    } else {
      router.replace('/dashboard-tester');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 grid place-items-center text-slate-400 text-sm">
      <span>Mengarahkan ke Halaman Dashboard...</span>
    </div>
  );
}
