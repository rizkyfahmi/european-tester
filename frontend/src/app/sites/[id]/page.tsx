'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/common/Sidebar';

export default function DetailSitus() {
  const params = useParams();
  const id = params.id;

  // Sample dynamic data mapping (or default placeholder for current ID)
  const siteData = {
    id: id || '1',
    name: 'Situs Utama Yayasan',
    url: 'https://yayasan.example.com',
    lastTested: '28 September 2026, 08:30 WIB',
    responseTime: '180 ms',
    status: 'Aktif',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      <Sidebar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* Back Link & Header */}
        <div className="mb-6">
          <Link
            href="/sites"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-blue-400 transition-colors mb-3 group"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke Daftar Situs
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                Detail Situs #{siteData.id}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {siteData.status}
                </span>
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Informasi performa dan status pengujian langsung untuk situs ini.
              </p>
            </div>

            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 self-start sm:self-auto">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Jalankan Testing Manual
            </button>
          </div>
        </div>

        {/* Main Details Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-800/80">
            {/* Left Column */}
            <div className="space-y-5 pr-0 md:pr-6">
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">
                  Nama Situs
                </label>
                <p className="text-lg font-bold text-slate-100">{siteData.name}</p>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">
                  URL Portal
                </label>
                <a
                  href={siteData.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-lg font-semibold text-blue-400 hover:text-blue-300 font-mono hover:underline inline-flex items-center gap-2"
                >
                  {siteData.url}
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5 pt-5 md:pt-0 pl-0 md:pl-6">
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">
                  Terakhir Dites
                </label>
                <div className="flex items-center gap-2 text-slate-200 font-medium">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-base font-semibold">{siteData.lastTested}</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">
                  Kecepatan Respons Rata-rata
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-emerald-400 font-mono">{siteData.responseTime}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Sangat Cepat
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
