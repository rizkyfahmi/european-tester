'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  getStoredSites,
  getSpreadsheetUrl,
  fetchSitesFromApi,
  fetchLogsFromApi,
  createSiteApi,
  submitTestResultApi,
  deleteSiteApi,
  bulkDeleteSitesApi,
  ensureDailyMasterSites,
  SiteItem,
  TestingLog,
} from '@/utils/siteStore';
import CustomDatePicker from '../common/CustomDatePicker';

interface DashboardOverviewProps {
  forcedRole?: 'admin' | 'tester';
}

export default function DashboardOverview({ forcedRole }: DashboardOverviewProps = {}) {
  const [userName, setUserName] = useState<string>('Alex Tester');
  const [userRole, setUserRole] = useState<'admin' | 'tester'>(forcedRole || 'tester');
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [logs, setLogs] = useState<TestingLog[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [dateFilterVal, setDateFilterVal] = useState<string>('');
  const dateFilterRef = useRef<string>(dateFilterVal);

  // Row Tester State (Independent per row)
  const [rowTesterNames, setRowTesterNames] = useState<Record<string, string>>({});
  const [submittingSiteId, setSubmittingSiteId] = useState<string | null>(null);

  // Tambah Situs Modal (Admin)
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [newSiteDate, setNewSiteDate] = useState<string>('');
  const [newSiteEndDate, setNewSiteEndDate] = useState<string>('');
  const [newSiteNotes, setNewSiteNotes] = useState('');
  const [isAddingSite, setIsAddingSite] = useState(false);

  // Custom Alert & Confirm Popups
  const [customAlert, setCustomAlert] = useState<{ title: string; message: string } | null>(null);
  const [confirmDeleteSite, setConfirmDeleteSite] = useState<SiteItem | null>(null);
  const [isDeletingSite, setIsDeletingSite] = useState(false);
  const [confirmTestSubmission, setConfirmTestSubmission] = useState<{
    site: SiteItem;
    resultStatus: 'BERHASIL' | 'GAGAL';
    testerName: string;
    isEditingName?: boolean;
  } | null>(null);

  // Bulk Delete State (Admin)
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Toast
  const [showToast, setShowToast] = useState(false);

  const getTodayDateStr = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadData = async () => {
    const [fetchedSites, fetchedLogs] = await Promise.all([
      fetchSitesFromApi(),
      fetchLogsFromApi(),
    ]);
    const activeDate = dateFilterRef.current || getTodayDateStr();
    const processed = ensureDailyMasterSites(fetchedSites, activeDate);
    setSites(processed);
    setLogs(fetchedLogs);
  };

  useEffect(() => {
    const saved = localStorage.getItem('sharedAccount');
    const savedRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');

    if (saved) {
      setUserName(saved);
    }

    if (forcedRole) {
      setUserRole(forcedRole);
      localStorage.setItem('userRole', forcedRole);
    } else {
      const isAdmin = savedRole === 'admin' || (saved && saved.toLowerCase().includes('admin'));
      setUserRole(isAdmin ? 'admin' : 'tester');
    }

    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('sites_updated', handleUpdate);
    window.addEventListener('logs_updated', handleUpdate);

    const interval = setInterval(() => {
      loadData();
    }, 15000);

    return () => {
      window.removeEventListener('sites_updated', handleUpdate);
      window.removeEventListener('logs_updated', handleUpdate);
      clearInterval(interval);
    };
  }, [forcedRole]);

  // Set default date filter to today & update master sites when date filter changes
  useEffect(() => {
    const todayStr = getTodayDateStr();
    if (!dateFilterVal) {
      setDateFilterVal(todayStr);
      dateFilterRef.current = todayStr;
    }
  }, []);

  useEffect(() => {
    if (dateFilterVal) {
      dateFilterRef.current = dateFilterVal;
      const processed = ensureDailyMasterSites(sites, dateFilterVal);
      setSites(processed);
    }
  }, [dateFilterVal]);

  const spreadsheetUrl = getSpreadsheetUrl();

  // Date Formatting Helper
  const formatDateIndo = (dateString: string): string => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;

    const year = parts[0];
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    const namaBulan = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    return `${day} ${namaBulan[month - 1] || ''} ${year}`;
  };

  const getSiteDate = (site: SiteItem): string => {
    if (site.targetDate && site.targetDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return site.targetDate;
    }
    if (site.lastTestedAt) {
      const match = site.lastTestedAt.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
    return new Date().toISOString().split('T')[0];
  };

  // Compute Stats filtered by selected Date Filter (or past + today if cleared)
  const dateFilteredSites = sites.filter((site) => {
    const siteDate = getSiteDate(site);
    const todayStr = getTodayDateStr();
    return dateFilterVal ? siteDate === dateFilterVal : siteDate <= todayStr;
  });

  const totalSites = dateFilteredSites.length;
  const belumDicekCount = dateFilteredSites.filter((s) => s.status === 'BELUM_DICEK').length;
  const berhasilCount = dateFilteredSites.filter((s) => s.status === 'BERHASIL').length;
  const gagalCount = dateFilteredSites.filter((s) => s.status === 'GAGAL').length;

  const getYearMonthKey = (dateStr: string): string => {
    const match = dateStr.match(/^(\d{4}-\d{2})/);
    return match ? match[1] : 'lainnya';
  };

  const getMonthNameKey = (dateStr: string): string => {
    const match = dateStr.match(/^(\d{4})-(\d{2})/);
    if (!match) return 'Lainnya';
    const year = match[1];
    const monthNum = parseInt(match[2], 10);
    const namaBulan = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    return `${namaBulan[monthNum - 1] || match[2]} ${year}`;
  };

  // Filter Logic
  const filteredSites = sites.filter((site) => {
    const query = searchQuery.toLowerCase().trim();
    const siteDate = getSiteDate(site);
    const todayStr = getTodayDateStr();

    const statusMap: Record<string, string> = {
      BERHASIL: 'Berhasil',
      GAGAL: 'Gagal',
      BELUM_DICEK: 'Belum Dicek',
    };
    const rowStatusIndo = statusMap[site.status] || site.status;

    const matchStatus = statusFilter === 'Semua' || rowStatusIndo === statusFilter;
    const matchDate = dateFilterVal ? siteDate === dateFilterVal : siteDate <= todayStr;
    const matchSearch =
      !query ||
      site.name.toLowerCase().includes(query) ||
      site.url.toLowerCase().includes(query) ||
      (site.lastTestedBy && site.lastTestedBy.toLowerCase().includes(query)) ||
      (site.notes && site.notes.toLowerCase().includes(query));

    return matchStatus && matchDate && matchSearch;
  });

  // Group sites by Date (YYYY-MM-DD)
  const groupedByDate = filteredSites.reduce((acc, site) => {
    const siteDate = getSiteDate(site);
    if (!acc[siteDate]) acc[siteDate] = [];
    acc[siteDate].push(site);
    return acc;
  }, {} as Record<string, SiteItem[]>);

  const sortedDateKeys = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const resetAllFilters = () => {
    setStatusFilter('Semua');
    setDateFilterVal(getTodayDateStr());
    setSearchQuery('');
  };

  const handleCopyLink = (url: string) => {
    try {
      navigator.clipboard.writeText(url);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Open Confirmation Modal on Test Button Click
  const handleDirectSubmitTest = (site: SiteItem, resultStatus: 'BERHASIL' | 'GAGAL') => {
    if (submittingSiteId) return;

    const initialTester = rowTesterNames[site.id] !== undefined
      ? rowTesterNames[site.id].trim()
      : '';

    setConfirmTestSubmission({
      site,
      resultStatus,
      testerName: initialTester,
      isEditingName: !initialTester,
    });
  };

  // Execute Test Submission after Confirmation
  const executeSubmitTest = async () => {
    if (!confirmTestSubmission || submittingSiteId) return;
    const { site, resultStatus, testerName } = confirmTestSubmission;

    if (!testerName.trim()) {
      setCustomAlert({
        title: 'Nama Tester Wajib Diisi',
        message: 'Silakan isi Nama Tester Anda sebelum menyimpan hasil pengujian.',
      });
      return;
    }

    const finalTester = testerName.trim();
    setSubmittingSiteId(site.id);

    try {
      await submitTestResultApi(site.id, {
        testerName: finalTester,
        result: resultStatus,
        notes: '-',
        siteName: site.name,
        siteUrl: site.url,
      });

      await loadData();
      setConfirmTestSubmission(null);
      setCustomAlert({
        title: 'Hasil Pengujian Berhasil Disimpan',
        message: `Hasil pengujian untuk situs "${site.name}" berhasil disimpan sebagai ${resultStatus === 'BERHASIL' ? 'Berhasil' : 'Gagal'} oleh ${finalTester}.`,
      });
    } catch (err) {
      console.error('Error submitting test result:', err);
      setCustomAlert({
        title: 'Gagal Menyimpan',
        message: 'Terjadi kesalahan saat menyimpan hasil pengujian.',
      });
    } finally {
      setSubmittingSiteId(null);
    }
  };

  const normalizeUrl = (u: string) => u.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');

  // Admin Add Site
  const handleSaveSitusBaru = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddingSite) return;

    const siteNameTrim = newSiteName.trim();
    let siteUrlTrim = newSiteUrl.trim();
    if (!siteNameTrim || !siteUrlTrim) return;

    if (!siteUrlTrim.startsWith('http://') && !siteUrlTrim.startsWith('https://')) {
      siteUrlTrim = `https://${siteUrlTrim}`;
    }

    const targetDate = newSiteDate || dateFilterVal || getTodayDateStr();
    setIsAddingSite(true);

    try {
      await createSiteApi(siteNameTrim, siteUrlTrim, targetDate);

      // Exact 0.5 sec delay for smooth UI feedback
      await new Promise((r) => setTimeout(r, 500));

      setDateFilterVal(targetDate);
      await loadData();
      setNewSiteName('');
      setNewSiteUrl('');
      setNewSiteDate('');
      setNewSiteNotes('');
      setShowAddSiteModal(false);
      setIsAddingSite(false);

      setCustomAlert({
        title: 'Berhasil Disimpan',
        message: `Situs "${siteNameTrim}" berhasil ditambahkan ke daftar pengujian mulai tanggal ${formatDateIndo(targetDate)}!`,
      });
    } catch (err) {
      console.error('Error adding site:', err);
      setIsAddingSite(false);
    }
  };

  // Admin Delete Site (Deletes date D and all subsequent dates D+)
  const handleConfirmHapusSitus = async () => {
    if (!confirmDeleteSite || isDeletingSite) return;

    setIsDeletingSite(true);
    const deletedId = confirmDeleteSite.id;
    const deletedNameLower = confirmDeleteSite.name.trim().toLowerCase();
    const deletedTargetDate = getSiteDate(confirmDeleteSite);

    // Optimistically update UI state: remove any entries for this site where sDate >= deletedTargetDate
    setSites((prev) =>
      prev.filter((s) => {
        const sNameLower = s.name.trim().toLowerCase();
        const sDate = getSiteDate(s);
        if (sNameLower === deletedNameLower && sDate >= deletedTargetDate) {
          return false;
        }
        return true;
      })
    );

    try {
      await deleteSiteApi(deletedId, deletedTargetDate, confirmDeleteSite.name);

      // Exact 0.5 sec delay for smooth UI feedback
      await new Promise((r) => setTimeout(r, 500));

      await loadData();
      setConfirmDeleteSite(null);
      setIsDeletingSite(false);

      setCustomAlert({
        title: 'Berhasil Dihapus',
        message: `Data pengujian situs "${confirmDeleteSite.name}" mulai tanggal ${formatDateIndo(deletedTargetDate)} ke atas telah dihapus. Riwayat sebelum tanggal ${formatDateIndo(deletedTargetDate)} tetap tersimpan.`,
      });
    } catch (err) {
      console.error('Error deleting site:', err);
      setIsDeletingSite(false);
    }
  };

  // Bulk Delete Actions (Admin)
  const toggleSelectSite = (id: string) => {
    setSelectedSiteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (filteredList: SiteItem[]) => {
    const allIds = filteredList.map((s) => s.id);
    const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedSiteIds.includes(id));
    if (isAllSelected) {
      setSelectedSiteIds((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelectedSiteIds((prev) => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSiteIds.length === 0 || isDeletingSite) return;

    setIsDeletingSite(true);
    const count = selectedSiteIds.length;
    const idsToDelete = [...selectedSiteIds];
    const selectedSitesList = sites.filter((s) => idsToDelete.includes(s.id));

    // Optimistically update UI state: remove entries for selected sites where sDate >= selected target date
    setSites((prev) =>
      prev.filter((s) => {
        const sNameLower = s.name.trim().toLowerCase();
        const sDate = getSiteDate(s);
        const isTargeted = selectedSitesList.some((sel) => {
          const selName = sel.name.trim().toLowerCase();
          const selDate = getSiteDate(sel);
          return selName === sNameLower && sDate >= selDate;
        });
        return !isTargeted;
      })
    );

    try {
      await bulkDeleteSitesApi(idsToDelete);

      // Exact 0.5 sec delay for smooth UI feedback
      await new Promise((r) => setTimeout(r, 500));

      await loadData();
      setSelectedSiteIds([]);
      setIsSelectionMode(false);
      setShowBulkDeleteConfirm(false);
      setIsDeletingSite(false);

      setCustomAlert({
        title: 'Berhasil Dihapus Massal',
        message: `Berhasil menghapus ${count} data pengujian situs terpilih dari daftar pengujian.`,
      });
    } catch (err) {
      console.error('Error bulk deleting sites:', err);
      setIsDeletingSite(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Toast Notification Copy */}
      {showToast && (
        <div id="copyToast" className="fixed bottom-5 right-5 z-50 bg-[#1a0f0b] text-[#FFE0B2] border border-[#FFE0B2]/40 px-4 py-2.5 rounded-xl text-xs shadow-2xl backdrop-blur-md flex items-center space-x-2 transition-all">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Link berhasil disalin!</span>
        </div>
      )}

      {/* STATS CARDS (4 CARDS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-5 rounded-2xl bg-[#FFF8EE]/10 backdrop-blur-xl border border-[#FFE0B2]/30 shadow-lg flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-medium text-[#FFE0B2]/70 uppercase tracking-wider">Total Situs</span>
          <span className="text-xl sm:text-3xl font-extrabold text-[#FFF8EE] mt-1 sm:mt-2">{totalSites}</span>
        </div>
        <div className="p-3 sm:p-5 rounded-2xl bg-[#FFF8EE]/10 backdrop-blur-xl border border-[#FFE0B2]/30 shadow-lg flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-medium text-[#FFE0B2]/70 uppercase tracking-wider">Belum Dicek</span>
          <span className="text-xl sm:text-3xl font-extrabold text-[#FFF8EE] mt-1 sm:mt-2">{belumDicekCount}</span>
        </div>
        <div className="p-3 sm:p-5 rounded-2xl bg-[#FFF8EE]/10 backdrop-blur-xl border border-[#FFE0B2]/30 shadow-lg flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-medium text-[#FFE0B2]/70 uppercase tracking-wider">Berhasil</span>
          <span className="text-xl sm:text-3xl font-extrabold text-[#FFF8EE] mt-1 sm:mt-2">{berhasilCount}</span>
        </div>
        <div className="p-3 sm:p-5 rounded-2xl bg-[#FFF8EE]/10 backdrop-blur-xl border border-[#FFE0B2]/30 shadow-lg flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-medium text-[#FFE0B2]/70 uppercase tracking-wider">Gagal</span>
          <span className="text-xl sm:text-3xl font-extrabold text-[#FFF8EE] mt-1 sm:mt-2">{gagalCount}</span>
        </div>
      </div>

      {/* BANNER INFORMASI & ACTION SPREADSHEET (ADMIN ONLY) */}
      {userRole === 'admin' && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-neutral-900/40 via-[#FFF8EE]/10 to-[#FFF8EE]/10 backdrop-blur-xl border border-white/10 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-[#FFF8EE]">Sinkronisasi Google Sheets Aktif</h3>
            <p className="text-[11px] text-[#FFE0B2]/70 mt-0.5">Semua data rekap pengujian terkoneksi secara otomatis ke Google Sheets pusat.</p>
          </div>
          <a
            href={spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto text-center px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-lg transition shrink-0 cursor-pointer"
          >
            <span>Buka Spreadsheet</span>
          </a>
        </div>
      )}

      {/* TABLE CONTAINER */}
      <div className="rounded-2xl sm:rounded-3xl bg-[#FFF8EE]/10 backdrop-blur-xl border border-[#FFE0B2]/30 shadow-2xl p-3.5 sm:p-6 space-y-4 sm:space-y-6">
        {/* Controls Filter & Header */}
        <div className="flex flex-col space-y-3.5 border-b border-[#FFE0B2]/15 pb-4">
          {/* Header Top Row: Title & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base sm:text-xl font-bold text-[#FFF8EE] tracking-wide">
              {userRole === 'admin' ? 'Rekap Pengujian Situs' : 'Daftar Pengujian Situs'}
              {dateFilterVal ? ` (${formatDateIndo(dateFilterVal)})` : ''}
            </h2>

            {/* Action Buttons (Admin Only) */}
            {userRole === 'admin' && (
              <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                {/* Tombol Hapus / Mode Centang */}
                {isSelectionMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSelectionMode(false);
                        setSelectedSiteIds([]);
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-full bg-[#FFF8EE]/10 border border-[#FFE0B2]/30 text-[#FFF8EE] hover:bg-[#FFF8EE]/20 transition cursor-pointer flex items-center justify-center space-x-1 shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Batal</span>
                    </button>

                    <button
                      type="button"
                      disabled={selectedSiteIds.length === 0}
                      onClick={() => {
                        if (selectedSiteIds.length > 0) {
                          setShowBulkDeleteConfirm(true);
                        }
                      }}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-full text-white shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedSiteIds.length > 0
                          ? 'bg-rose-600 hover:bg-rose-500 animate-pulse'
                          : 'bg-rose-600/50'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>
                        {selectedSiteIds.length > 0
                          ? `Hapus (${selectedSiteIds.length})`
                          : 'Hapus'}
                      </span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSelectionMode(true)}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-rose-600/80 hover:bg-rose-500 text-white shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Hapus</span>
                  </button>
                )}

                {/* Tombol Tambah Situs */}
                <button
                  type="button"
                  onClick={() => {
                    setNewSiteDate(dateFilterVal || getTodayDateStr());
                    setShowAddSiteModal(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-gradient-to-r from-[#D3A376] to-[#FFE0B2] text-[#3E2522] hover:brightness-110 shadow-md transition flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Tambah Situs</span>
                </button>
              </div>
            )}
          </div>

          {/* Filter Toolbar (Grid on Mobile, Flex on Desktop) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:flex items-center gap-2 w-full">
            {/* 1. Reset Filter */}
            <button
              type="button"
              onClick={resetAllFilters}
              className="col-span-1 md:w-auto px-4 py-2 text-xs font-semibold rounded-full bg-gradient-to-r from-[#D3A376] to-[#FFE0B2] text-[#3E2522] hover:brightness-110 transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reset</span>
            </button>

            {/* 2. Filter Tanggal */}
            <div className="col-span-1 md:w-auto shrink-0">
              <CustomDatePicker
                value={dateFilterVal}
                onChange={(val) => setDateFilterVal(val)}
                placeholder="dd/mm/yyyy"
                className="w-full"
              />
            </div>

            {/* 3. Filter Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                backgroundImage:
                  'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%23FFE0B2" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>\')',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '0.75rem 0.75rem',
              }}
              className="col-span-2 sm:col-span-1 md:w-auto appearance-none pl-3.5 pr-8 py-2 text-xs rounded-full bg-[#1a0f0b]/80 border border-[#FFE0B2]/30 text-[#FFF8EE] focus:outline-none focus:border-[#FFE0B2] cursor-pointer font-medium"
            >
              <option value="Semua" className="bg-[#1a0f0b] text-[#FFF8EE]">Semua Status</option>
              <option value="Berhasil" className="bg-[#1a0f0b] text-[#FFF8EE]">Berhasil</option>
              <option value="Belum Dicek" className="bg-[#1a0f0b] text-[#FFF8EE]">Belum Dicek</option>
              <option value="Gagal" className="bg-[#1a0f0b] text-[#FFF8EE]">Gagal</option>
            </select>

            {/* 4. Input Search */}
            <div className="col-span-2 sm:col-span-1 md:w-56 lg:w-64 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari situs atau tester..."
                className="w-full px-4 py-2 text-xs rounded-full bg-[#1a0f0b]/60 border border-[#FFE0B2]/30 text-[#FFF8EE] placeholder-[#FFE0B2]/50 focus:outline-none focus:border-[#FFE0B2] transition-colors"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-[#FFE0B2]/60 hover:text-[#FFF8EE] hover:bg-white/10 transition-colors cursor-pointer"
                  title="Hapus pencarian"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RESPONSIVE DATA VIEW */}
        {sortedDateKeys.length === 0 ? (
          <div className="p-8 text-center text-[#FFE0B2]/70 text-xs bg-[#1a0f0b]/40 rounded-2xl border border-[#FFE0B2]/20">
            Tidak ada situs yang cocok dengan filter.
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* MOBILE & TABLET CARDS VIEW (< xl) */}
            <div className="space-y-6 xl:hidden">
              {sortedDateKeys.map((dateStr) => {
                const dateSites = [...groupedByDate[dateStr]].sort((a, b) =>
                  a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
                );

                return (
                  <div key={dateStr} className="month-group space-y-3">
                    {/* Header Kelompok Tanggal */}
                    <div className="flex items-center space-x-3 border-b border-[#FFE0B2]/30 pb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FFE0B2]"></span>
                      <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#FFE0B2]">
                        {formatDateIndo(dateStr)}
                      </h3>
                      <span className="text-[11px] font-normal text-[#FFE0B2]/60">({dateSites.length} situs)</span>
                    </div>

                    {/* Grid Cards (1 col mobile, 2 col md/tablet) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {dateSites.map((site, index) => {
                        const siteDate = getSiteDate(site);
                        const todayStr = getTodayDateStr();
                        const isPast = siteDate < todayStr;
                        const isFuture = siteDate > todayStr;
                        const isTested = site.status !== 'BELUM_DICEK';
                        const isSelected = selectedSiteIds.includes(site.id);

                        const statusBadgeClass =
                          site.status === 'BERHASIL'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : site.status === 'GAGAL'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30';

                        const statusText =
                          site.status === 'BERHASIL'
                            ? 'Berhasil'
                            : site.status === 'GAGAL'
                            ? 'Gagal'
                            : 'Belum Dicek';

                        return (
                          <div
                            key={site.id}
                            className={`table-row bg-[#1a0f0b]/60 border border-[#FFE0B2]/20 rounded-xl p-3.5 flex flex-col justify-between space-y-3 transition-all ${
                              isSelected
                                ? 'border-rose-500 bg-rose-950/40 shadow-lg'
                                : 'hover:border-[#FFE0B2]/40'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-start space-x-2 min-w-0">
                                  {userRole === 'admin' && isSelectionMode && (
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelectSite(site.id)}
                                      className="w-4 h-4 mt-0.5 rounded border-[#FFE0B2]/40 bg-[#1a0f0b] text-amber-500 focus:ring-amber-400 cursor-pointer shrink-0"
                                    />
                                  )}
                                  <div>
                                    <span className="text-[10px] font-mono text-[#FFE0B2]/60">
                                      #{index + 1} • {getSiteDate(site)}
                                    </span>
                                    <h4 className="row-title text-sm font-bold text-white break-all">
                                      {site.name}
                                    </h4>
                                  </div>
                                </div>
                                <span className={`status-cell text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusBadgeClass}`}>
                                  {statusText}
                                </span>
                              </div>

                              <div className="text-xs space-y-1.5 pt-2 border-t border-[#FFE0B2]/10">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[#FFE0B2]/60 text-[11px] shrink-0">URL:</span>
                                  <div className="flex items-center space-x-1 overflow-hidden">
                                    <a
                                      href={site.url.startsWith('http') ? site.url : `https://${site.url}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="row-url text-[#FFE0B2] hover:underline truncate max-w-[140px] sm:max-w-[200px]"
                                    >
                                      {site.url}
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyLink(site.url)}
                                      className="p-1 rounded bg-[#FFF8EE]/10 hover:bg-[#FFE0B2] hover:text-[#3E2522] text-[#FFE0B2] transition cursor-pointer shrink-0"
                                      title="Salin Link"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[#FFE0B2]/60 text-[11px] shrink-0">Tester:</span>
                                  <div className="tester-cell text-right min-w-0">
                                    {site.lastTestedBy ? (
                                      <span className="font-mono text-white text-[11px] truncate font-semibold">
                                        {site.lastTestedBy}
                                      </span>
                                    ) : userRole === 'admin' ? (
                                      <span className="font-mono text-[#FFE0B2]/40 text-[11px]">-</span>
                                    ) : (
                                      <input
                                        type="text"
                                        value={
                                          rowTesterNames[site.id] !== undefined
                                            ? rowTesterNames[site.id]
                                            : ''
                                        }
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setRowTesterNames((prev) => ({ ...prev, [site.id]: val }));
                                        }}
                                        placeholder="Nama Tester..."
                                        className="w-28 px-2 py-0.5 text-xs font-semibold text-[#FFF8EE] placeholder-[#FFE0B2]/35 bg-black/40 border border-[#FFE0B2]/20 rounded-lg outline-none focus:border-amber-400"
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {(!isSelectionMode || userRole !== 'admin') && (
                              <div className="pt-2 border-t border-[#FFE0B2]/10">
                                {userRole === 'admin' ? (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteSite(site)}
                                    className="w-full py-2 px-2.5 text-xs font-bold rounded-xl bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/40 text-rose-300 flex items-center justify-center space-x-1 shadow transition cursor-pointer"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span>Hapus Situs</span>
                                  </button>
                                ) : isTested ? (
                                  <div className="text-center py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                    ✓ Terkunci
                                  </div>
                                ) : isFuture ? (
                                  <div className="text-center py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    Belum Waktunya
                                  </div>
                                ) : isPast ? (
                                  <div className="text-center py-1.5 rounded-xl text-xs font-semibold bg-stone-800/60 text-stone-400 border border-stone-700/50">
                                    Terlewat
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      disabled={submittingSiteId === site.id}
                                      onClick={() => handleDirectSubmitTest(site, 'BERHASIL')}
                                      className="py-2 px-2.5 text-xs font-bold rounded-xl bg-[#00A86B] hover:bg-[#008f5b] text-white flex items-center justify-center space-x-1 shadow transition cursor-pointer disabled:opacity-50"
                                    >
                                      <span className="w-2 h-2 rounded-full bg-emerald-200"></span>
                                      <span>Berhasil</span>
                                    </button>

                                    <button
                                      type="button"
                                      disabled={submittingSiteId === site.id}
                                      onClick={() => handleDirectSubmitTest(site, 'GAGAL')}
                                      className="py-2 px-2.5 text-xs font-bold rounded-xl bg-[#E60039] hover:bg-[#c40030] text-white flex items-center justify-center space-x-1 shadow transition cursor-pointer disabled:opacity-50"
                                    >
                                      <span className="w-2 h-2 rounded-full border border-white"></span>
                                      <span>Gagal</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW (>= xl): Original Structured Full Table View */}
            <div className="hidden xl:block overflow-x-auto rounded-2xl border border-[#FFE0B2]/20 bg-[#1a0f0b]/40 backdrop-blur-md shadow-xl scrollbar-thin scrollbar-thumb-[#FFE0B2]/20">
              <table className="w-full min-w-[650px] text-left text-xs text-[#FFF8EE]">
                <thead className="bg-[#FFF8EE]/10 text-[#FFE0B2] border-b border-[#FFE0B2]/20 uppercase tracking-wider sticky top-0 backdrop-blur-md z-10">
                  <tr>
                    {userRole === 'admin' && isSelectionMode && (
                      <th className="p-3 sm:p-3.5 text-center w-10">
                        <input
                          type="checkbox"
                          checked={
                            filteredSites.length > 0 &&
                            filteredSites.every((s) => selectedSiteIds.includes(s.id))
                          }
                          onChange={() => toggleSelectAll(filteredSites)}
                          className="w-3.5 h-3.5 rounded border-[#FFE0B2]/40 bg-[#1a0f0b] text-amber-500 focus:ring-amber-400 focus:ring-offset-0 cursor-pointer"
                          title="Pilih Semua Situs"
                        />
                      </th>
                    )}
                    <th className="p-3 sm:p-3.5 text-center w-12 font-bold">No.</th>
                    <th className="p-3 sm:p-3.5 text-center font-bold">Nama Situs</th>
                    <th className="p-3 sm:p-3.5 text-center font-bold">URL</th>
                    <th className="p-3 sm:p-3.5 text-center font-bold">Status</th>
                    <th className="p-3 sm:p-3.5 text-center font-bold">Nama Tester</th>
                    {(!isSelectionMode || userRole !== 'admin') && (
                      <th className="p-3 sm:p-3.5 text-center font-bold">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFE0B2]/15">
                  {sortedDateKeys.map((dateStr) => {
                    const dateSites = [...groupedByDate[dateStr]].sort((a, b) =>
                      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
                    );

                    return (
                      <React.Fragment key={dateStr}>
                        {!dateFilterVal && (
                          <tr className="date-divider-row bg-gradient-to-r from-[#3E2522]/80 via-[#2A1815]/80 to-[#1a0f0b]/80 border-y border-[#FFE0B2]/30">
                            {userRole === 'admin' && isSelectionMode && (
                              <td className="p-3 text-center w-10">
                                <input
                                  type="checkbox"
                                  checked={
                                    dateSites.length > 0 &&
                                    dateSites.every((s) => selectedSiteIds.includes(s.id))
                                  }
                                  onChange={() => toggleSelectAll(dateSites)}
                                  className="w-3.5 h-3.5 rounded border-[#FFE0B2]/40 bg-[#1a0f0b] text-amber-500 focus:ring-amber-400 focus:ring-offset-0 cursor-pointer"
                                  title="Pilih Semua Situs Tanggal Ini"
                                />
                              </td>
                            )}
                            <td colSpan={userRole === 'admin' && isSelectionMode ? 5 : 6} className="px-3.5 py-2.5 text-xs font-semibold text-[#FFE0B2] tracking-wide">
                              <div className="flex items-center space-x-2">
                                <span className="text-amber-400 font-bold">📅</span>
                                <span className="font-bold text-[#FFE0B2]">Tanggal Pengujian: {formatDateIndo(dateStr)}</span>
                                <span className="text-[11px] font-normal text-[#FFE0B2]/60 ml-2">({dateSites.length} situs)</span>
                              </div>
                            </td>
                          </tr>
                        )}

                        {dateSites.map((site, index) => {
                          const siteDate = getSiteDate(site);
                          const todayStr = getTodayDateStr();
                          const isPast = siteDate < todayStr;
                          const isFuture = siteDate > todayStr;
                          const isTested = site.status !== 'BELUM_DICEK';
                          const isSelected = selectedSiteIds.includes(site.id);

                          const statusClass =
                            site.status === 'BERHASIL'
                              ? 'text-emerald-400'
                              : site.status === 'GAGAL'
                              ? 'text-rose-400'
                              : 'text-amber-300';
                          const statusText =
                            site.status === 'BERHASIL'
                              ? 'Berhasil'
                              : site.status === 'GAGAL'
                              ? 'Gagal'
                              : 'Belum Dicek';

                          return (
                            <tr
                              key={site.id}
                              className={`table-row transition-all duration-200 ${
                                isSelected
                                  ? 'bg-rose-950/45 border-l-4 border-l-rose-500 shadow-md text-[#FFF8EE]'
                                  : 'hover:bg-[#FFF8EE]/10'
                              }`}
                            >
                              {userRole === 'admin' && isSelectionMode && (
                                <td className="p-3 text-center w-10">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectSite(site.id)}
                                    className="w-3.5 h-3.5 rounded border-[#FFE0B2]/40 bg-[#1a0f0b] text-amber-500 focus:ring-amber-400 focus:ring-offset-0 cursor-pointer"
                                  />
                                </td>
                              )}
                              <td className="p-3 text-center text-[#FFE0B2]/70 font-mono">
                                {index + 1}
                              </td>
                              <td className="p-3 font-semibold row-title whitespace-nowrap">{site.name}</td>
                              <td className="p-3">
                                <div className="flex items-center space-x-2">
                                  <a
                                    href={site.url.startsWith('http') ? site.url : `https://${site.url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#FFE0B2] hover:underline truncate max-w-[180px] sm:max-w-xs"
                                  >
                                    {site.url}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyLink(site.url)}
                                    className="p-1 rounded bg-[#FFF8EE]/10 hover:bg-[#FFE0B2] hover:text-[#3E2522] text-[#FFE0B2] transition cursor-pointer shrink-0"
                                    title="Salin Link"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                              <td className={`p-3 text-center font-bold status-cell whitespace-nowrap ${statusClass}`}>
                                {statusText}
                              </td>
                              <td className="p-3 text-center tester-cell font-medium whitespace-nowrap">
                                {site.lastTestedBy ? (
                                  <span className="text-[#FFF8EE] font-semibold tracking-wide">{site.lastTestedBy}</span>
                                ) : userRole === 'admin' ? (
                                  <span className="text-[#FFE0B2]/40 font-semibold text-sm font-mono">-</span>
                                ) : (
                                  <div className="inline-flex items-center justify-center">
                                    <input
                                      type="text"
                                      value={
                                        rowTesterNames[site.id] !== undefined
                                          ? rowTesterNames[site.id]
                                          : ''
                                      }
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setRowTesterNames((prev) => ({ ...prev, [site.id]: val }));
                                      }}
                                      placeholder="Ketik Nama..."
                                      className="w-28 sm:w-36 px-2.5 py-1 text-center text-xs font-semibold text-[#FFF8EE] placeholder-[#FFE0B2]/35 bg-black/30 hover:bg-black/50 focus:bg-black/80 border border-[#FFE0B2]/20 hover:border-[#FFE0B2]/50 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 rounded-xl transition-all duration-200 outline-none shadow-sm"
                                    />
                                  </div>
                                )}
                              </td>
                              {(!isSelectionMode || userRole !== 'admin') && (
                                <td className="p-3 text-center whitespace-nowrap">
                                  {userRole === 'admin' ? (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteSite(site)}
                                      className="px-3 py-1 text-xs font-semibold rounded-full bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/40 text-rose-300 backdrop-blur-md transition cursor-pointer inline-flex items-center justify-center"
                                      title="Hapus Situs"
                                    >
                                      <span>Hapus</span>
                                    </button>
                                  ) : isTested ? (
                                    <span
                                      className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 backdrop-blur-md select-none inline-block"
                                      title="Situs ini telah diuji dan hasil telah dikunci"
                                    >
                                      ✓ Terkunci
                                    </span>
                                  ) : isFuture ? (
                                    <span
                                      className="px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 backdrop-blur-md cursor-not-allowed select-none inline-block"
                                      title="Jadwal pengujian belum tiba (jadwal mendatang)"
                                    >
                                      Belum Waktunya
                                    </span>
                                  ) : isPast ? (
                                    <span
                                      className="px-3 py-1 rounded-full text-[11px] font-semibold bg-stone-800/60 text-stone-400 border border-stone-700/50 backdrop-blur-md cursor-not-allowed select-none inline-block"
                                      title="Jadwal pengujian telah terlewat"
                                    >
                                      Terlewat
                                    </span>
                                  ) : (
                                    <div className="flex items-center justify-center space-x-2">
                                      <button
                                        type="button"
                                        disabled={submittingSiteId === site.id}
                                        onClick={() => handleDirectSubmitTest(site, 'BERHASIL')}
                                        className="px-3 py-1.5 text-xs font-bold rounded-full bg-[#00A86B] hover:bg-[#008f5b] text-white flex items-center space-x-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
                                      >
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-200 inline-block"></span>
                                        <span>Berhasil</span>
                                      </button>

                                      <button
                                        type="button"
                                        disabled={submittingSiteId === site.id}
                                        onClick={() => handleDirectSubmitTest(site, 'GAGAL')}
                                        className="px-3 py-1.5 text-xs font-bold rounded-full bg-[#E60039] hover:bg-[#c40030] text-white flex items-center space-x-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
                                      >
                                        <span className="w-2.5 h-2.5 rounded-full border-2 border-white inline-block"></span>
                                        <span>Gagal</span>
                                      </button>
                                    </div>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* POP-UP MODAL FITUR TAMBAH SITUS BARU (ADMIN) */}
      {showAddSiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md transition-all overflow-y-auto">
          <div className="bg-[#1a0f0b] border border-[#FFE0B2]/30 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-5 relative my-auto max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowAddSiteModal(false)}
              className="absolute top-4 right-4 text-[#FFE0B2]/60 hover:text-white p-1 rounded-full transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="border-b border-[#FFE0B2]/20 pb-3 pr-6">
              <span className="text-[10px] text-[#FFE0B2]/60 uppercase tracking-widest font-semibold">
                Admin Panel
              </span>
              <h3 className="text-base sm:text-lg font-bold text-[#FFF8EE] mt-0.5">
                Tambah Situs Pengujian Baru
              </h3>
            </div>

            <form onSubmit={handleSaveSitusBaru} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#FFE0B2]/80 mb-1.5 font-medium">Nama Situs</label>
                <input
                  type="text"
                  required
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="Contoh: European Payment Portal"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8EE]/5 border border-[#FFE0B2]/30 text-[#FFF8EE] focus:outline-none focus:border-[#FFE0B2]"
                />
              </div>

              <div>
                <label className="block text-[#FFE0B2]/80 mb-1.5 font-medium">URL Link Situs</label>
                <input
                  type="text"
                  required
                  value={newSiteUrl}
                  onChange={(e) => setNewSiteUrl(e.target.value)}
                  placeholder="drive.europeantester.com atau https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF8EE]/5 border border-[#FFE0B2]/30 text-[#FFF8EE] focus:outline-none focus:border-[#FFE0B2]"
                />
              </div>

              <div>
                <label className="block text-[#FFE0B2]/80 mb-1.5 font-medium">Tanggal Mulai Pengujian</label>
                <CustomDatePicker
                  value={newSiteDate || getTodayDateStr()}
                  onChange={(val) => setNewSiteDate(val)}
                  allowClear={false}
                  className="w-full"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddSiteModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#FFF8EE]/10 border border-[#FFE0B2]/20 text-[#FFF8EE] hover:bg-[#FFF8EE]/20 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAddingSite}
                  className="px-5 py-2 font-bold rounded-xl bg-gradient-to-r from-[#D3A376] to-[#FFE0B2] text-[#3E2522] hover:brightness-110 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAddingSite ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-[#3E2522]/30 border-t-[#3E2522] rounded-full animate-spin" />
                      <span>Menambahkan...</span>
                    </>
                  ) : (
                    <span>Tambah Situs</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM POP-UP MODAL ALERT (INFORMASI / SUCCESS) */}
      {customAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm transition-all overflow-y-auto">
          <div className="bg-[#1A1412] border border-[#3D2E27] rounded-[28px] p-6 sm:p-7 max-w-[360px] w-full shadow-2xl text-center relative my-auto">
            <div className="w-14 h-14 rounded-full bg-[#113123] text-[#22C55E] flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div className="mb-6 space-y-1">
              <h4 className="text-base sm:text-lg font-bold text-white">{customAlert.title}</h4>
              <p className="text-xs text-[#FFE0B2]/80 leading-relaxed">{customAlert.message}</p>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setCustomAlert(null)}
                className="w-full py-3 text-sm font-bold rounded-xl bg-[#F3C798] text-[#2A1A08] hover:bg-[#E5B988] transition-colors cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM POP-UP MODAL CONFIRM (KONFIRMASI HAPUS) */}
      {confirmDeleteSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md transition-all overflow-y-auto">
          <div className="bg-[#1a0f0b] border border-[#FFE0B2]/30 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4 text-center relative my-auto">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#FFF8EE]">Konfirmasi Hapus</h4>
              <p className="text-xs text-[#FFE0B2]/80 mt-1.5 leading-relaxed">
                Apakah Anda yakin ingin menghapus situs &quot;{confirmDeleteSite.name}&quot; dari daftar?
              </p>
            </div>
            <div className="pt-2 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteSite(null)}
                className="w-1/2 py-2.5 text-xs font-semibold rounded-xl bg-[#FFF8EE]/10 border border-[#FFE0B2]/20 text-[#FFF8EE] hover:bg-[#FFF8EE]/20 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingSite}
                onClick={handleConfirmHapusSitus}
                className="w-1/2 py-2.5 text-xs font-bold rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingSite ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <span>Hapus</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM POP-UP MODAL CONFIRM BULK DELETE (ADMIN ONLY) */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md transition-all overflow-y-auto">
          <div className="bg-[#1a0f0b] border border-[#FFE0B2]/30 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4 text-center relative my-auto">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#FFF8EE]">Konfirmasi Hapus Massal</h4>
              <p className="text-xs text-[#FFE0B2]/80 mt-1.5 leading-relaxed">
                Apakah Anda yakin ingin menghapus <strong className="text-rose-400">{selectedSiteIds.length} situs terpilih</strong> sekaligus dari daftar pengujian?
              </p>
            </div>
            <div className="pt-2 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="w-1/2 py-2.5 text-xs font-semibold rounded-xl bg-[#FFF8EE]/10 border border-[#FFE0B2]/20 text-[#FFE0B2] hover:bg-[#FFF8EE]/20 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingSite}
                onClick={handleBulkDelete}
                className="w-1/2 py-2.5 text-xs font-bold rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingSite ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <span>Hapus ({selectedSiteIds.length})</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM POP-UP MODAL KONFIRMASI PENGUJIAN */}
      {confirmTestSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md transition-all overflow-y-auto">
          <div className="w-full max-w-md p-5 sm:p-6 bg-[#18120e] rounded-2xl text-white font-sans shadow-xl relative my-auto max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-1">Konfirmasi Pengujian</h2>
            <p className="text-xs sm:text-sm text-amber-100/60 mb-5">Periksa detail hasil pengujian sebelum menyimpan.</p>

            <div className="space-y-3.5">
              {/* Nama Situs */}
              <div className="flex justify-between items-center py-2 border-b border-zinc-800/60">
                <span className="text-xs sm:text-sm text-amber-100/70 font-medium">Nama Situs</span>
                <span className="text-xs sm:text-sm font-semibold text-white">{confirmTestSubmission.site.name}</span>
              </div>

              {/* URL */}
              <div className="flex justify-between items-center py-2 border-b border-zinc-800/60">
                <span className="text-xs sm:text-sm text-amber-100/70 font-medium">URL</span>
                <span className="text-xs sm:text-sm font-mono text-white truncate max-w-[180px] sm:max-w-[220px]">{confirmTestSubmission.site.url}</span>
              </div>

              {/* Hasil Pengujian */}
              <div className="flex justify-between items-center py-2 border-b border-zinc-800/60">
                <span className="text-xs sm:text-sm text-amber-100/70 font-medium">Hasil Pengujian</span>
                <span className="text-xs sm:text-sm font-semibold text-white">
                  {confirmTestSubmission.resultStatus === 'BERHASIL' ? 'Berhasil' : 'Gagal'}
                </span>
              </div>

              {/* Nama Tester */}
              {!confirmTestSubmission.isEditingName ? (
                <div className="flex justify-between items-center py-2 border-b border-zinc-800/60">
                  <span className="text-xs sm:text-sm text-amber-100/70 font-medium">Nama Tester</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-white">{confirmTestSubmission.testerName}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmTestSubmission((prev) =>
                          prev ? { ...prev, isEditingName: true } : null
                        )
                      }
                      className="text-xs text-amber-400 hover:underline cursor-pointer"
                    >
                      (Ubah)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-amber-400">
                      ⚠️ Nama Tester Belum Diisi:
                    </label>
                    <span className="text-[10px] text-amber-300/70 font-medium">Wajib Diisi</span>
                  </div>
                  <input
                    type="text"
                    autoFocus
                    value={confirmTestSubmission.testerName}
                    onChange={(e) =>
                      setConfirmTestSubmission((prev) =>
                        prev ? { ...prev, testerName: e.target.value } : null
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (confirmTestSubmission.testerName.trim()) {
                          setConfirmTestSubmission((prev) =>
                            prev ? { ...prev, isEditingName: false } : null
                          );
                        }
                      }
                    }}
                    placeholder="Silakan ketik nama tester Anda di sini..."
                    className="w-full px-3.5 py-2.5 bg-[#0d0907] border border-amber-500/50 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl text-white text-xs sm:text-sm placeholder-zinc-500 outline-none"
                  />
                  <p className="text-[10px] text-amber-100/60">
                    Silakan ketik nama tester Anda sebelum menyimpan hasil pengujian.
                  </p>
                </div>
              )}

              {/* Tombol Aksi */}
              <div className="flex justify-end items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setConfirmTestSubmission(null)}
                  className="px-4 py-2 text-xs sm:text-sm text-amber-100/80 hover:text-white font-medium transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submittingSiteId === confirmTestSubmission.site.id}
                  onClick={executeSubmitTest}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl text-xs sm:text-sm transition shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingSiteId === confirmTestSubmission.site.id ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <span>Simpan Hasil</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}