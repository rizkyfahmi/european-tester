export type SiteStatus = 'BELUM_DICEK' | 'SEDANG_DICEK' | 'SELESAI' | 'GAGAL_ADA_REPORT';

export interface Site {
  id: string;
  name: string;
  url: string;
  status: SiteStatus;
  currentTester?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  targetDate?: string | null;
  targetEndDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestingResult {
  id: string;
  siteId: string;
  siteName?: string;
  testerName: string;
  result: 'Berhasil' | 'Gagal';
  reportStatus: 'Ada' | 'Tidak Ada';
  notes?: string;
  testedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  token: string;
  username: string;
}
