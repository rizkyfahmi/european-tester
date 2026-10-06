'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HistoryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-400 grid place-items-center text-xs">
      Mengarahkan ke QA Workspace Utama...
    </div>
  );
}
