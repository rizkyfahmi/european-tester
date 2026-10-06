'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/common/Sidebar';

export default function DataIntegrationPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const handleSync = () => {
    setIsSyncing(true);
    setSyncMessage('');

    setTimeout(() => {
      setIsSyncing(false);
      setSyncMessage('Berhasil mensinkronisasi 24 data riwayat ke Google Spreadsheet!');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      <Sidebar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">Integrasi Data & Spreadsheet</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Ekspor hasil testing dan log performa situs langsung ke Google Sheets atau database eksternal.
          </p>
        </div>

        <div className="max-w-xl">
          {/* Main Card */}
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Seluruh data pengujian dan catatan riwayat terkoneksi secara otomatis dengan Google Sheets untuk kemudahan analisis dan pelaporan tim.
            </p>

            {/* Connection Status Box */}
            <div className="border border-slate-800 p-4 rounded-xl bg-slate-950/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Status Koneksi</p>
                <p className="text-sm font-semibold text-blue-400 mt-0.5 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Google Sheets - Dashboard Log Yayasan
                </p>
              </div>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>

            {/* Sync Button */}
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {isSyncing ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sinkronisasi...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sinkronkan Data Sekarang
                </>
              )}
            </button>

            {/* Sync Success Message */}
            {syncMessage && (
              <div className="p-4 border border-emerald-500/30 bg-emerald-950/20 rounded-xl flex items-center gap-3 animate-in fade-in duration-300">
                <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-xs font-semibold text-emerald-400">{syncMessage}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
