export interface UpdateTestingResultRowDto {
  testerName?: string;
  result?: 'BERHASIL' | 'GAGAL';
  reportStatus?: 'ADA' | 'TIDAK_ADA';
  notes?: string;
  version?: number;
  source?: 'WEBSITE' | 'GOOGLE_SHEETS';
}

export interface UpdateSiteRowDto {
  name?: string;
  url?: string;
  status?: 'BELUM_DICEK' | 'SEDANG_DICEK' | 'SELESAI' | 'GAGAL_ADA_REPORT' | 'BERHASIL' | 'GAGAL';
  currentTester?: string;
  targetDate?: string;
  version?: number;
  source?: 'WEBSITE' | 'GOOGLE_SHEETS';
}
