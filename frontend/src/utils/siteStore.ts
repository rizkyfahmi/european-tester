export interface SiteItem {
  id: string;
  name: string;
  url: string;
  status: 'BELUM_DICEK' | 'BERHASIL' | 'GAGAL';
  lastTestedBy?: string | null;
  lastTestedAt?: string | null;
  targetDate?: string | null;
  targetEndDate?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TestingLog {
  id: string;
  siteId: string;
  siteName: string;
  siteUrl: string;
  testerName: string;
  result: 'BERHASIL' | 'GAGAL';
  notes: string;
  date: string;
}

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://frontend-lw4m-ten.vercel.app/api/v1';
const cleanBaseUrl = rawApiUrl.replace(/\/+$/, '');
const BACKEND_API_URL = cleanBaseUrl.endsWith('/sites') ? cleanBaseUrl : `${cleanBaseUrl}/sites`;
const BACKEND_LOGS_URL = `${BACKEND_API_URL}/logs`;

let customSpreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1Ye-bu9EnMsPTFoftfuco_BPiicFkCUDItodPZ7KgCSI/edit?hl=id&gid=0#gid=0';

export function getStoredSites(): SiteItem[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('sites_data_v3');
  if (!data) {
    localStorage.setItem('sites_data_v3', JSON.stringify([]));
    return [];
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveStoredSites(sites: SiteItem[], options?: { skipEvent?: boolean; skipSync?: boolean }): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sites_data_v3', JSON.stringify(sites || []));
  if (!options?.skipEvent) {
    window.dispatchEvent(new Event('sites_updated'));
  }

  if (!options?.skipSync) {
    fetchWithTimeout(
      `${BACKEND_API_URL}/sync`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sites: sites || [] }),
      },
      5000
    ).catch(() => {});
  }
}

export function getStoredLogs(): TestingLog[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('testing_logs_v3');
  if (!data) {
    localStorage.setItem('testing_logs_v3', JSON.stringify([]));
    return [];
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function addTestingLog(log: TestingLog): void {
  if (typeof window === 'undefined') return;
  const existing = getStoredLogs();
  const existingIndex = existing.findIndex(
    (l) => l.siteId === log.siteId || (l.siteName && l.siteName.toLowerCase() === log.siteName.toLowerCase())
  );
  let updated: TestingLog[];
  if (existingIndex >= 0) {
    updated = [...existing];
    updated[existingIndex] = { ...existing[existingIndex], ...log };
  } else {
    updated = [log, ...existing];
  }
  localStorage.setItem('testing_logs_v3', JSON.stringify(updated));
  window.dispatchEvent(new Event('logs_updated'));
}

// Helper function for fetch with automatic 12.0s timeout fallback
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 12000): Promise<Response | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getNextDateStr(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(Date.UTC(year, month, day + 1));
  return d.toISOString().split('T')[0];
}

export function getPreviousDateStr(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(Date.UTC(year, month, day - 1));
  return d.toISOString().split('T')[0];
}

// Ensure every master site has daily entries for all dates from its start date up to Target Date (default Today)
export function ensureDailyMasterSites(sites: SiteItem[], targetDateStr?: string): SiteItem[] {
  if (!sites || sites.length === 0) return [];
  const todayStr = new Date().toISOString().split('T')[0];
  const maxTargetStr = targetDateStr && targetDateStr > todayStr ? targetDateStr : todayStr;

  // Map each site name to its minimum target date (start date)
  const masterDateMap = new Map<string, string>();
  sites.forEach((site) => {
    const key = site.name.trim().toLowerCase();
    const siteDate = site.targetDate || (site.lastTestedAt ? site.lastTestedAt.split('T')[0] : site.createdAt ? site.createdAt.split('T')[0] : todayStr);
    if (siteDate) {
      if (!masterDateMap.has(key)) {
        masterDateMap.set(key, siteDate);
      } else {
        const curMin = masterDateMap.get(key)!;
        if (!site.id.startsWith('daily_') && siteDate < curMin) {
          masterDateMap.set(key, siteDate);
        }
      }
    }
  });

  // Extract unique master sites by lowercased name
  const masterMap = new Map<string, SiteItem>();
  sites.forEach((site) => {
    const key = site.name.trim().toLowerCase();
    if (!masterMap.has(key) || !site.id.startsWith('daily_')) {
      masterMap.set(key, site);
    }
  });

  const updatedList = [...sites];
  let hasChanged = false;

  const existingEntriesSet = new Set<string>();
  sites.forEach((s) => {
    const sDate = s.targetDate || (s.lastTestedAt ? s.lastTestedAt.split('T')[0] : '');
    if (sDate) {
      existingEntriesSet.add(`${s.name.trim().toLowerCase()}_${sDate}`);
    }
  });

  masterMap.forEach((masterSite, nameKey) => {
    const siteStartDate = masterDateMap.get(nameKey) || masterSite.targetDate || todayStr;
    const siteEndDate = masterSite.targetEndDate || null;
    if (!siteStartDate) return;

    let curDate = siteStartDate;
    // Continuous generation from start date up to maxTargetStr (or siteEndDate if deleted / cutoff)
    const effectiveMaxDate = siteEndDate && siteEndDate < maxTargetStr ? siteEndDate : maxTargetStr;

    while (curDate <= effectiveMaxDate) {
      const entryKey = `${nameKey}_${curDate}`;
      if (!existingEntriesSet.has(entryKey)) {
        const targetSite: SiteItem = {
          id: `daily_${masterSite.name.toLowerCase().replace(/\s+/g, '_')}_${curDate}`,
          name: masterSite.name,
          url: masterSite.url,
          status: 'BELUM_DICEK',
          lastTestedBy: null,
          lastTestedAt: null,
          targetDate: curDate,
          targetEndDate: siteEndDate,
        };
        updatedList.unshift(targetSite);
        existingEntriesSet.add(entryKey);
        hasChanged = true;
      }
      curDate = getNextDateStr(curDate);
    }
  });

  // Clean up any daily_ entries created prior to site's start date or after cutoff date (siteEndDate)
  const cleanedList: SiteItem[] = updatedList.map((site): SiteItem => {
    const sDate = site.targetDate || (site.lastTestedAt ? site.lastTestedAt.split('T')[0] : '');
    if (sDate > todayStr && site.status !== 'BELUM_DICEK') {
      hasChanged = true;
      return {
        ...site,
        status: 'BELUM_DICEK',
        lastTestedBy: null,
        lastTestedAt: null,
      };
    }
    return site;
  }).filter((site) => {
    const sDate = site.targetDate || (site.lastTestedAt ? site.lastTestedAt.split('T')[0] : '');
    if (!targetDateStr && sDate > todayStr) {
      return false;
    }
    const key = site.name.trim().toLowerCase();
    const minDate = masterDateMap.get(key);
    const masterSite = masterMap.get(key);
    const endDate = masterSite?.targetEndDate || site.targetEndDate;

    if (minDate && sDate && sDate < minDate) {
      hasChanged = true;
      return false;
    }
    if (endDate && sDate && sDate > endDate) {
      hasChanged = true;
      return false;
    }
    return true;
  });

  // Strict Deduplication Pass per (siteName, targetDate)
  const uniqueDateMap = new Map<string, SiteItem>();
  cleanedList.forEach((site) => {
    const sDate = site.targetDate || (site.lastTestedAt ? site.lastTestedAt.split('T')[0] : '');
    const key = `${site.name.trim().toLowerCase()}_${sDate}`;

    if (!uniqueDateMap.has(key)) {
      uniqueDateMap.set(key, site);
    } else {
      const existing = uniqueDateMap.get(key)!;
      // Prefer item with tested status over BELUM_DICEK, or real database ID over daily_ ID
      if (existing.status === 'BELUM_DICEK' && site.status !== 'BELUM_DICEK') {
        uniqueDateMap.set(key, site);
      } else if (!site.id.startsWith('daily_') && existing.id.startsWith('daily_')) {
        uniqueDateMap.set(key, site);
      }
    }
  });

  const finalUniqueList = Array.from(uniqueDateMap.values());

  if (hasChanged && typeof window !== 'undefined') {
    saveStoredSites(finalUniqueList);
  }

  return finalUniqueList;
}

// NestJS Backend REST API Integration
export async function fetchSitesFromApi(): Promise<SiteItem[]> {
  try {
    const res = await fetchWithTimeout(BACKEND_API_URL, { cache: 'no-store' }, 12000);
    if (res && res.ok) {
      const json = await res.json();
      const sitesArray: SiteItem[] = Array.isArray(json) ? json : json.data;
      if (Array.isArray(sitesArray)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('sites_data_v3', JSON.stringify(sitesArray));
        }
        return sitesArray;
      }
    }
  } catch {
    // Silently fall back to local storage
  }
  return getStoredSites();
}

export async function fetchLogsFromApi(): Promise<TestingLog[]> {
  try {
    const res = await fetchWithTimeout(BACKEND_LOGS_URL, { cache: 'no-store' }, 4000);
    if (res && res.ok) {
      const json = await res.json();
      const logsArray = Array.isArray(json) ? json : json.data;
      if (Array.isArray(logsArray)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('testing_logs_v3', JSON.stringify(logsArray));
        }
        return logsArray;
      }
    }
  } catch {
    // Silently fall back to local storage
  }
  return getStoredLogs();
}

export async function createSiteApi(name: string, url: string, targetDate?: string, targetEndDate?: string): Promise<SiteItem | null> {
  const cleanName = name.trim();
  let cleanUrl = url.trim();
  if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `https://${cleanUrl}`;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const finalTargetDate = targetDate || todayStr;
  const finalTargetEndDate = targetEndDate && targetEndDate.trim() ? targetEndDate.trim() : null;

  const fallbackSite: SiteItem = {
    id: `site_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: cleanName,
    url: cleanUrl,
    status: 'BELUM_DICEK',
    lastTestedBy: null,
    lastTestedAt: null,
    targetDate: finalTargetDate,
    targetEndDate: finalTargetEndDate,
  };

  const current = getStoredSites();
  const normalizeUrl = (u: string) => u.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const normNewUrl = normalizeUrl(cleanUrl);
  const normNewName = cleanName.toLowerCase();

  saveStoredSites([fallbackSite, ...current.filter((s) => s.name.toLowerCase() !== cleanName.toLowerCase())], { skipEvent: true, skipSync: true });

  try {
    const res = await fetchWithTimeout(
      BACKEND_API_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, url: cleanUrl, targetDate: finalTargetDate, targetEndDate: finalTargetEndDate }),
      },
      12000
    );
    if (res && res.ok) {
      const json = await res.json();
      const rawApiSite: any = json.data || json;
      const newSite: SiteItem = {
        ...fallbackSite,
        ...rawApiSite,
        targetDate: rawApiSite.targetDate || finalTargetDate,
        targetEndDate: rawApiSite.targetEndDate || finalTargetEndDate,
      };
      const latestSites = getStoredSites();
      const synced = [newSite, ...latestSites.filter((s) => s.name.toLowerCase() !== cleanName.toLowerCase() && s.id !== fallbackSite.id)];
      saveStoredSites(synced, { skipEvent: true, skipSync: true });
      return newSite;
    } else if (res && !res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const latestSites = getStoredSites().filter((s) => s.id !== fallbackSite.id && s.name.toLowerCase() !== cleanName.toLowerCase());
      saveStoredSites(latestSites, { skipEvent: true, skipSync: true });
      throw new Error(errJson.message || 'Gagal menambahkan situs ke server');
    }
  } catch (err: any) {
    if (err.message && err.message.includes('Gagal')) {
      throw err;
    }
    // Silently fall back to local storage
  }

  return fallbackSite;
}

export async function submitTestResultApi(
  siteId: string,
  resultData: { testerName: string; result: 'BERHASIL' | 'GAGAL'; notes?: string; siteName?: string; siteUrl?: string },
): Promise<boolean> {
  const currentSites = getStoredSites();
  const targetSite = currentSites.find((s) => s.id === siteId) ||
    currentSites.find((s) => resultData.siteName && s.name.trim().toLowerCase() === resultData.siteName.trim().toLowerCase());

  const targetName = (resultData.siteName || targetSite?.name || '').trim().toLowerCase();
  const nowIso = new Date().toISOString();
  const targetDateStr = targetSite?.targetDate || (targetSite?.lastTestedAt ? targetSite.lastTestedAt.split('T')[0] : nowIso.split('T')[0]);

  const updatedSite: SiteItem = {
    id: targetSite?.id || siteId,
    name: targetSite?.name || resultData.siteName || 'Situs',
    url: targetSite?.url || resultData.siteUrl || '',
    status: resultData.result,
    lastTestedBy: resultData.testerName || 'Tester',
    lastTestedAt: nowIso,
    targetDate: targetDateStr,
  };

  // Immediate local update in-place for ONLY the site instance matching ID or matching name AND same targetDate
  let updatedAny = false;
  const newSitesList = currentSites.map((s) => {
    const sDate = s.targetDate || (s.lastTestedAt ? s.lastTestedAt.split('T')[0] : '');
    const isSameId = s.id === siteId || (targetSite && s.id === targetSite.id);
    const isSameNameAndDate = targetName && s.name.trim().toLowerCase() === targetName && (sDate === targetDateStr || !sDate);

    if (isSameId || isSameNameAndDate) {
      updatedAny = true;
      return {
        ...s,
        status: resultData.result,
        lastTestedBy: resultData.testerName || 'Tester',
        lastTestedAt: nowIso,
        targetDate: targetDateStr,
      };
    }
    return s;
  });

  if (!updatedAny) {
    newSitesList.unshift(updatedSite);
  }
  saveStoredSites(newSitesList);

  const newLog: TestingLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    siteId: updatedSite.id,
    siteName: updatedSite.name,
    siteUrl: updatedSite.url,
    testerName: updatedSite.lastTestedBy || 'Tester',
    result: resultData.result,
    notes: '',
    date: nowIso,
  };
  addTestingLog(newLog);

  try {
    const res = await fetchWithTimeout(
      `${BACKEND_API_URL}/${siteId}/test`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...resultData,
          siteName: updatedSite.name,
          siteUrl: updatedSite.url,
        }),
      },
      4000
    );
    if (res && res.ok) {
      const data = await res.json();
      const returnedSite = data?.data?.site || data?.site;
      const returnedLog = data?.data?.log || data?.log;
      if (returnedSite) {
        const syncedSites = getStoredSites().map((s) =>
          s.id === siteId || s.id === returnedSite.id || s.name.trim().toLowerCase() === targetName
            ? { ...s, ...returnedSite }
            : s
        );
        saveStoredSites(syncedSites);
      }
      if (returnedLog) {
        addTestingLog(returnedLog);
      }
    }
  } catch {
    // Silently fall back to local storage update
  }
  return true;
}

export async function deleteSiteApi(siteId: string, deleteDate?: string, siteName?: string): Promise<boolean> {
  const current = getStoredSites();
  const targetSite = current.find((s) => s.id === siteId);

  let nameToUse = (siteName || targetSite?.name || '').trim().toLowerCase();
  if (!nameToUse && siteId.startsWith('daily_')) {
    const parts = siteId.split('_');
    if (parts.length >= 2) {
      nameToUse = parts[1].replace(/_/g, ' ').trim().toLowerCase();
    }
  }

  // Filter out any entries where s.id === siteId or name matches nameToUse unconditionally
  const filtered = current.filter((s) => {
    const sId = s.id;
    const sNameLower = s.name.trim().toLowerCase();

    if (sId === siteId) return false;
    if (nameToUse && (sNameLower === nameToUse || sId.includes(nameToUse))) return false;
    return true;
  });

  saveStoredSites(filtered, { skipEvent: true, skipSync: true });

  try {
    const encodedId = encodeURIComponent(siteId);
    let url = `${BACKEND_API_URL}/${encodedId}`;
    if (deleteDate) {
      url += `?targetDate=${encodeURIComponent(deleteDate)}`;
    }
    await fetchWithTimeout(url, { method: 'DELETE' }, 4000);

    if (nameToUse) {
      const nameUrl = `${BACKEND_API_URL}/by-name/${encodeURIComponent(nameToUse)}`;
      await fetchWithTimeout(nameUrl, { method: 'DELETE' }, 4000);
    }
  } catch {
    // Silently fall back to local storage deletion
  }

  return true;
}

export async function bulkDeleteSitesApi(siteIds: string[]): Promise<boolean> {
  if (!siteIds || siteIds.length === 0) return true;

  const current = getStoredSites();
  const targetIdsSet = new Set<string>(siteIds);
  const selectedEntries = current.filter((s) => targetIdsSet.has(s.id));

  const namesCutoffMap = new Map<string, { deleteDate: string; cutoffDate: string }>();

  selectedEntries.forEach((s) => {
    const sName = s.name.trim().toLowerCase();
    const sDate = s.targetDate || (s.lastTestedAt ? s.lastTestedAt.split('T')[0] : '');
    if (sName && sDate) {
      if (!namesCutoffMap.has(sName) || sDate < namesCutoffMap.get(sName)!.deleteDate) {
        namesCutoffMap.set(sName, { deleteDate: sDate, cutoffDate: getPreviousDateStr(sDate) });
      }
    }
  });

  const filtered = current
    .filter((s) => {
      const sNameLower = s.name.trim().toLowerCase();
      const sDate = s.targetDate || (s.lastTestedAt ? s.lastTestedAt.split('T')[0] : '');
      const cutoffInfo = namesCutoffMap.get(sNameLower);
      if (cutoffInfo && sDate >= cutoffInfo.deleteDate) {
        return false;
      }
      return true;
    })
    .map((s) => {
      const sNameLower = s.name.trim().toLowerCase();
      const cutoffInfo = namesCutoffMap.get(sNameLower);
      if (cutoffInfo) {
        return {
          ...s,
          targetEndDate: cutoffInfo.cutoffDate,
        };
      }
      return s;
    });

  saveStoredSites(filtered);

  try {
    await Promise.all(
      siteIds.map(async (id) => {
        const targetSite = selectedEntries.find((s) => s.id === id);
        const dateStr = targetSite?.targetDate || (targetSite?.lastTestedAt ? targetSite.lastTestedAt.split('T')[0] : '');
        const encodedId = encodeURIComponent(id);
        let url = `${BACKEND_API_URL}/${encodedId}`;
        if (dateStr) {
          url += `?targetDate=${encodeURIComponent(dateStr)}`;
        }
        await fetchWithTimeout(url, { method: 'DELETE' }, 4000);
      })
    );
  } catch {
    // Silently fall back to local storage deletion
  }

  return true;
}

export function getSpreadsheetUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('custom_spreadsheet_url');
    if (custom && !custom.includes('1BxiMVs')) return custom;
  }
  return customSpreadsheetUrl;
}

export function setSpreadsheetUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('custom_spreadsheet_url', url);
  }
  customSpreadsheetUrl = url;
}

export function exportSitesToCSV(sites: SiteItem[]): void {
  const getSiteDateStr = (site: SiteItem): string => {
    if (site.targetDate && site.targetDate.match(/^\d{4}-\d{2}-\d{2}$/)) return site.targetDate;
    if (site.lastTestedAt) {
      const match = site.lastTestedAt.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
    return new Date().toISOString().split('T')[0];
  };

  const getMonthNameKey = (dateStr: string): string => {
    const match = dateStr.match(/^(\d{4})-(\d{2})/);
    if (!match) return 'Lainnya';
    const year = match[1];
    const monthNum = parseInt(match[2], 10);
    const monthsIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${monthsIndo[monthNum - 1] || match[2]} ${year}`;
  };

  const formatDateIndo = (dateStr: string): string => {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return dateStr;
    const year = match[1];
    const monthNum = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    const monthsIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${day} ${monthsIndo[monthNum - 1] || match[2]} ${year}`;
  };

  const headers = ['Nomor', 'Nama Situs', 'Link Target', 'Status Pengujian', 'Nama Tester', 'Waktu Testing'];
  const formattedRows: string[][] = [headers];

  const groupedByMonth = sites.reduce((acc, site) => {
    const sDate = getSiteDateStr(site);
    const ymKey = sDate.slice(0, 7);
    if (!acc[ymKey]) acc[ymKey] = [];
    acc[ymKey].push(site);
    return acc;
  }, {} as Record<string, SiteItem[]>);

  const monthKeys = Object.keys(groupedByMonth).sort().reverse();

  monthKeys.forEach((mKey) => {
    const monthSites = groupedByMonth[mKey].sort((a, b) => getSiteDateStr(b).localeCompare(getSiteDateStr(a)));
    const sampleDate = monthSites[0] ? getSiteDateStr(monthSites[0]) : `${mKey}-01`;
    const monthLabel = getMonthNameKey(sampleDate);

    formattedRows.push([`"${monthLabel} (${monthSites.length} situs)"`, '""', '""', '""', '""', '""']);

    const groupedByDate = monthSites.reduce((acc, site) => {
      const dKey = getSiteDateStr(site);
      if (!acc[dKey]) acc[dKey] = [];
      acc[dKey].push(site);
      return acc;
    }, {} as Record<string, SiteItem[]>);

    const dateKeys = Object.keys(groupedByDate).sort().reverse();

    dateKeys.forEach((dKey) => {
      const dateSites = groupedByDate[dKey];
      formattedRows.push([`"${formatDateIndo(dKey)} (${dateSites.length} situs)"`, '""', '""', '""', '""', '""']);

      dateSites.forEach((site) => {
        const monthNo = monthSites.indexOf(site) + 1;
        formattedRows.push([
          `"${monthNo}"`,
          `"${(site.name || '').replace(/"/g, '""')}"`,
          `"${(site.url || '').replace(/"/g, '""')}"`,
          `"${site.status === 'BERHASIL' ? 'Berhasil' : site.status === 'GAGAL' ? 'Gagal' : 'Belum Dicek'}"`,
          `"${(site.lastTestedBy || '-').replace(/"/g, '""')}"`,
          `"${(site.lastTestedAt || '-').replace(/"/g, '""')}"`,
        ]);
      });
    });
  });

  const csvString = '\uFEFF' + formattedRows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Rekap_Spreadsheet_QA_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

