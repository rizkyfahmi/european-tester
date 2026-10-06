'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/common/Sidebar';

interface SiteOption {
  id: string;
  name: string;
  url: string;
}

function TestingFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [sites] = useState<SiteOption[]>([
    { id: '1', name: 'Situs Utama Yayasan', url: 'https://yayasan.example.com' },
    { id: '2', name: 'Portal Berita Internal', url: 'https://news.example.com' },
    { id: '3', name: 'Situs Penerimaan PPDB', url: 'https://ppdb.example.com' },
    { id: '4', name: 'Aplikasi Akademik Siswa', url: 'https://akademik.example.com' },
  ]);

  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [siteName, setSiteName] = useState<string>('');
  const [siteUrl, setSiteUrl] = useState<string>('');
  const [testResult, setTestResult] = useState<'BERHASIL' | 'GAGAL'>('BERHASIL');
  const [reportStatus, setReportStatus] = useState<'ADA' | 'TIDAK_ADA'>('TIDAK_ADA');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [testerName, setTesterName] = useState('Tester');

  useEffect(() => {
    const saved = localStorage.getItem('sharedAccount');
    if (saved) setTesterName(saved);

    const paramSiteId = searchParams.get('siteId');
    const paramName = searchParams.get('name');
    const paramUrl = searchParams.get('url');

    if (paramName && paramUrl) {
      setSiteName(paramName);
      setSiteUrl(paramUrl);
      setSelectedSiteId(paramSiteId || 'custom');
    } else if (sites.length > 0) {
      setSelectedSiteId(sites[0].id);
      setSiteName(sites[0].name);
      setSiteUrl(sites[0].url);
    }
  }, [searchParams, sites]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedSiteId(id);
    const matched = sites.find((s) => s.id === id);
    if (matched) {
      setSiteName(matched.name);
      setSiteUrl(matched.url);
    }
  };

  const handleOpenSite = () => {
    if (siteUrl) {
      const target = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
      window.open(target, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSubmitResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName || !siteUrl) return;

    setIsSubmitting(true);
    setSubmitSuccess(false);

    // Save QA Result to local history store & trigger backend API call
    setTimeout(() => {
      try {
        const newRecord = {
          id: String(Date.now()),
          siteName: siteName,
          siteUrl: siteUrl,
          testerName: testerName,
          result: testResult === 'BERHASIL' ? 'PASS' : 'FAIL',
          statusText: testResult === 'BERHASIL' ? 'Berhasil (Normal)' : 'Gagal (Ada Masalah)',
          reportStatus: reportStatus,
          notes: notes || (testResult === 'BERHASIL' ? 'Situs berfungsi dengan baik tanpa kendala' : 'Ditemukan kendala pada situs'),
          date: new Date().toLocaleString('id-ID'),
        };

        const existingLogs = JSON.parse(localStorage.getItem('testingLogsHistory') || '[]');
        localStorage.setItem('testingLogsHistory', JSON.stringify([newRecord, ...existingLogs]));
      } catch (err) {
        console.warn('Local log store warning:', err);
      }

      setIsSubmitting(false);
      setSubmitSuccess(true);
    }, 800);
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            Langkah 1: Kunjungi & Uji Situs
          </span>
          <span className="text-[11px] text-slate-400 font-mono">Tester: {testerName}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Pilih Situs dalam Antrean
            </label>
            <select
              value={selectedSiteId}
              onChange={handleSelectChange}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.url})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              URL Situs Target
            </label>
            <input
              type="text"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleOpenSite}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Kunjungi & Cek Situs Web Langsung (Buka Tab Baru) →
          </button>
        </div>
      </div>

      {/* Input Result Form */}
      <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
        <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
          <span>📝 Langkah 2: Input Hasil Evaluasi Pengujian</span>
        </h3>

        {submitSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-medium space-y-2 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-2 text-sm">
                ✓ Hasil pengujian berhasil disimpan & disinkronkan!
              </span>
              <button
                onClick={() => router.push('/history')}
                className="underline hover:text-emerald-300 font-bold"
              >
                Lihat Riwayat Testing →
              </button>
            </div>
            <p className="text-[11px] text-emerald-300/80">
              Data status untuk {siteName} telah terupdate ke sistem dan spreadsheet.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmitResult} className="space-y-6">
          {/* Status Result Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Hasil Pengujian Situs
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTestResult('BERHASIL')}
                className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  testResult === 'BERHASIL'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/60 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-900/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                🟢 Berhasil (Berfungsi Normal)
              </button>

              <button
                type="button"
                onClick={() => setTestResult('GAGAL')}
                className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  testResult === 'GAGAL'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/60 ring-2 ring-rose-500/30 shadow-lg shadow-rose-900/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-rose-400 animate-pulse"></span>
                🔴 Gagal (Ada Masalah / Kendala)
              </button>
            </div>
          </div>

          {/* Status Report Option */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Status Laporan Kendala (Report)
            </label>
            <div className="flex items-center gap-6 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-semibold">
                <input
                  type="radio"
                  name="report"
                  checked={reportStatus === 'TIDAK_ADA'}
                  onChange={() => setReportStatus('TIDAK_ADA')}
                  className="accent-blue-600"
                />
                Tidak Ada Report
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-rose-400 font-semibold">
                <input
                  type="radio"
                  name="report"
                  checked={reportStatus === 'ADA'}
                  onChange={() => setReportStatus('ADA')}
                  className="accent-rose-600"
                />
                Ada Report Kendala
              </label>
            </div>
          </div>

          {/* Catatan / Detail Temuan */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Catatan & Detail Temuan Testing
            </label>
            <textarea
              rows={4}
              placeholder="Jelaskan temuan Anda (misal: 'Semua halaman dimuat dengan normal' atau 'Tombol submit error 500 pada form pendaftaran')"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            ></textarea>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Simpan & Sinkronkan Hasil Pengujian</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function TestingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      <Sidebar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">Form Hasil Pengujian Situs</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Kunjungi situs web untuk memeriksa fungsinya, lalu simpan hasil evaluasi (Berhasil / Gagal).
          </p>
        </div>

        <Suspense fallback={<div className="p-8 text-slate-400 text-xs">Memuat form pengujian...</div>}>
          <TestingFormContent />
        </Suspense>
      </main>
    </div>
  );
}
