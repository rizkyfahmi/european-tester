'use client';

import React, { useState } from 'react';
import { SiteItem, exportSitesToCSV, getSpreadsheetUrl, setSpreadsheetUrl } from '@/utils/siteStore';

interface SpreadsheetModalProps {
  sites: SiteItem[];
  onClose: () => void;
}

export default function SpreadsheetModal({ sites, onClose }: SpreadsheetModalProps) {
  const [activeTab, setActiveTab] = useState<'grid' | 'embed'>('grid');
  const [customUrl, setCustomUrl] = useState(getSpreadsheetUrl());
  const [savedNotice, setSavedNotice] = useState(false);
  const spreadsheetUrl = getSpreadsheetUrl();

  const handleUpdateUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      setSpreadsheetUrl(customUrl.trim());
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    }
  };

  const totalSites = sites.length;
  const berhasilCount = sites.filter((s) => s.status === 'BERHASIL').length;
  const gagalCount = sites.filter((s) => s.status === 'GAGAL').length;
  const belumDicekCount = sites.filter((s) => s.status === 'BELUM_DICEK').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Google Sheets Style Top Header */}
        <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 grid place-items-center text-lg font-bold shadow-inner shrink-0">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Google Spreadsheet Settings &amp; Preview
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ⚡ Realtime Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Change target Google Spreadsheet URL link or preview QA summary data.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => exportSitesToCSV(sites)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              title="Download Spreadsheet Data as CSV / Excel File"
            >
              <span>📥 Download CSV</span>
            </button>

            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center gap-1"
            >
              <span>🔗 Open Spreadsheet ↗</span>
            </a>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white grid place-items-center text-sm font-bold transition-colors ml-1"
              title="Close Modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Google Sheets Toolbar Header */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-1.5 flex items-center justify-between text-xs text-slate-400 shrink-0 overflow-x-auto gap-4">
          <div className="flex items-center gap-4 text-[11px] font-medium text-slate-300 shrink-0">
            <span className="hover:text-white cursor-pointer transition-colors">File</span>
            <span className="hover:text-white cursor-pointer transition-colors">Edit</span>
            <span className="hover:text-white cursor-pointer transition-colors">View</span>
            <span className="hover:text-white cursor-pointer transition-colors">Format</span>
            <span className="hover:text-white cursor-pointer transition-colors">Data</span>
            <span className="hover:text-white cursor-pointer transition-colors">Tools</span>
            <span className="hover:text-white cursor-pointer transition-colors">Help</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] shrink-0">
            <button
              onClick={() => setActiveTab('grid')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'grid'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🟢 Web Spreadsheet Grid ({sites.length} Rows)
            </button>
            <button
              onClick={() => setActiveTab('embed')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'embed'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🌐 Google Sheets Embed
            </button>
          </div>
        </div>

        {/* Formula Bar (Google Sheets Style) */}
        <div className="bg-slate-950 border-b border-slate-800 px-3 py-1.5 flex items-center gap-2 text-xs shrink-0">
          <div className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono text-[11px] text-blue-400 font-semibold shrink-0">
            A1:E{sites.length + 1}
          </div>
          <div className="text-slate-500 font-mono text-[11px] font-bold select-none shrink-0">
            fx
          </div>
          <div className="h-4 w-px bg-slate-800 mx-1 shrink-0"></div>
          <div className="font-mono text-[11px] text-slate-300 truncate">
            =QA_SPREADSHEET_SYNC(Total: {totalSites} Sites | 🟢 {berhasilCount} | 🔴 {gagalCount} | ⚪ {belumDicekCount})
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-auto bg-slate-950 p-3">
          {activeTab === 'grid' ? (
            <div className="border border-slate-800 rounded-xl overflow-hidden shadow-2xl bg-slate-900">
              {/* Spreadsheet Grid Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    {/* Column Letters Row (A, B, C, D, E) */}
                    <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-mono text-slate-500 text-center select-none">
                      <th className="w-10 py-1 bg-slate-950 border-r border-slate-800 font-semibold">#</th>
                      <th className="py-1 px-3 border-r border-slate-800 font-semibold">A</th>
                      <th className="py-1 px-3 border-r border-slate-800 font-semibold">B</th>
                      <th className="py-1 px-3 border-r border-slate-800 font-semibold">C</th>
                      <th className="py-1 px-3 border-r border-slate-800 font-semibold">D</th>
                      <th className="py-1 px-3 font-semibold">E</th>
                    </tr>

                    {/* Column Headers Row (Matching exact Web QA Table) */}
                    <tr className="bg-slate-900 border-b border-slate-700/80 text-slate-200 font-bold uppercase text-[11px] tracking-wider text-center">
                      <th className="py-2.5 px-3 bg-slate-950 text-center border-r border-slate-800 text-slate-400 font-mono">
                        1
                      </th>
                      <th className="py-2.5 px-3 border-r border-slate-800 bg-slate-900/90 text-blue-300 text-center">
                        Site Name
                      </th>
                      <th className="py-2.5 px-3 border-r border-slate-800 bg-slate-900/90 text-blue-300 text-center">
                        Target Link URL
                      </th>
                      <th className="py-2.5 px-3 border-r border-slate-800 bg-slate-900/90 text-blue-300 text-center">
                        Test Status
                      </th>
                      <th className="py-2.5 px-3 border-r border-slate-800 bg-slate-900/90 text-blue-300 text-center">
                        Tester Name
                      </th>
                      <th className="py-2.5 px-3 bg-slate-900/90 text-blue-300 text-center">
                        Test Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {sites.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                          No site data available on the web.
                        </td>
                      </tr>
                    ) : (
                      sites.map((site, index) => {
                        const rowIndex = index + 2; // Row 1 is header
                        return (
                          <tr
                            key={site.id}
                            className="hover:bg-slate-800/50 transition-colors group"
                          >
                            {/* Row Number Column */}
                            <td className="py-2.5 px-3 text-center bg-slate-950 border-r border-slate-800 text-slate-500 font-mono text-[11px] font-semibold select-none group-hover:text-slate-300">
                              {rowIndex}
                            </td>

                            {/* Column A: Site Name */}
                            <td className="py-2.5 px-3 border-r border-slate-800 font-semibold text-white">
                              {site.name}
                            </td>

                            {/* Column B: Link Target */}
                            <td className="py-2.5 px-3 border-r border-slate-800 font-mono text-[11px]">
                              <a
                                href={site.url.startsWith('http') ? site.url : `https://${site.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 hover:underline break-all"
                              >
                                {site.url}
                              </a>
                            </td>

                            {/* Column C: Test Status */}
                            <td className="py-2.5 px-3 border-r border-slate-800">
                              {site.status === 'BERHASIL' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                  🟢 Successful
                                </span>
                              ) : site.status === 'GAGAL' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                                  🔴 Failed
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  ⚪ Pending
                                </span>
                              )}
                            </td>

                            {/* Column D: Tester Name */}
                            <td className="py-2.5 px-3 border-r border-slate-800 font-medium text-slate-300">
                              {site.lastTestedBy ? (
                                <span className="text-slate-200">{site.lastTestedBy}</span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>

                            {/* Column E: Test Time */}
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                              {site.lastTestedAt ? (
                                site.lastTestedAt
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="w-full h-full min-h-[500px] border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
              <iframe
                src={spreadsheetUrl}
                className="w-full h-full min-h-[550px] border-0"
                title="Google Spreadsheet Embed"
              ></iframe>
            </div>
          )}
        </div>

        {/* Bottom Sheet Tab Bar (Google Sheets UI Footer) */}
        <div className="bg-slate-950 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 font-bold text-xs flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Sheet1: Web QA Data</span>
            </div>
            <span className="text-[11px] text-slate-500">
              {totalSites} data rows synced directly from web database.
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span>Successful: <strong className="text-emerald-400">{berhasilCount}</strong></span>
            <span>Failed: <strong className="text-rose-400">{gagalCount}</strong></span>
            <span>Pending: <strong className="text-slate-300">{belumDicekCount}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
