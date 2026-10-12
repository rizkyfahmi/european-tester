/**
 * GOOGLE APPS SCRIPT FOR SINGLE SHEET TAB REALTIME SYNC WITH NESTJS BACKEND & MYSQL
 * Project: Website QA Testing Portal
 * Sheet Tab: "Data Testing QA"
 * 
 * Column Order (6 Visible Columns):
 * 1. No (Col A)
 * 2. Site Name (Col B)
 * 3. Site Link (Col C)
 * 4. Tester Name (Col D)
 * 5. Date (Col E)
 * 6. Status / Action (Col F)
 * (Columns 7 & 8 hidden for System ID & Version)
 */

const CONFIG = {
  BACKEND_URL: 'https://european-tester-nine.vercel.app/api/v1',
  API_KEY: 'qa-secret-api-key-2026',
  PRIMARY_SHEET_NAME: 'Data Testing QA',
};

/**
 * OnOpen Event: Adds custom menu to Google Sheets UI
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📌 QA Sync')
    .addItem('🔄 Synchronize / Refresh from Web App', 'refreshAllData')
    .addItem('💾 Save Selected Row to Web App', 'saveSelectedRow')
    .addItem('🗑️ Delete Selected Row from Web App', 'deleteSelectedRow')
    .addSeparator()
    .addItem('🔒 Format Headers', 'formatSystemFields')
    .addToUi();
}

/**
 * Helper Get Site Date (YYYY-MM-DD)
 */
function getSiteDateStr(site) {
  if (!site) return getTodayDateStr();
  if (site.targetDate && /^\d{4}-\d{2}-\d{2}$/.test(site.targetDate)) {
    return site.targetDate;
  }
  if (site.lastTestedAt) {
    const match = String(site.lastTestedAt).match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  if (site.createdAt) {
    const match = String(site.createdAt).match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  if (site.updatedAt) {
    const match = String(site.updatedAt).match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  return getTodayDateStr();
}

/**
 * Helper Today Date YYYY-MM-DD
 */
function getTodayDateStr() {
  const today = new Date();
  return Utilities.formatDate(today, 'Asia/Jakarta', 'yyyy-MM-dd');
}

/**
 * Helper Add 1 Day to YYYY-MM-DD string
 */
function getNextDateStrStr(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(Date.UTC(year, month, day + 1, 12, 0, 0));
  return Utilities.formatDate(d, 'Asia/Jakarta', 'yyyy-MM-dd');
}

/**
 * Auto-generate Daily Master Entries for every date from site start date up to Today / targetEndDate
 * Ensures cumulative daily range is preserved without resurrecting deleted data
 */
function ensureDailyMasterSites(sites) {
  if (!sites || sites.length === 0) return [];
  const todayStr = getTodayDateStr();

  // Find minimum start date and cutoff end date per site
  const masterDateMap = {};
  const masterEndDateMap = {};
  sites.forEach(function(site) {
    if (!site || !site.name) return;
    const key = site.name.trim().toLowerCase();
    const siteDate = site.targetDate || getSiteDateStr(site);
    if (siteDate) {
      if (!masterDateMap[key] || siteDate < masterDateMap[key]) {
        masterDateMap[key] = siteDate;
      }
    }
    if (site.targetEndDate) {
      if (!masterEndDateMap[key] || site.targetEndDate < masterEndDateMap[key]) {
        masterEndDateMap[key] = site.targetEndDate;
      }
    }
  });

  // Master site prototypes (unique by name, preferring ACTIVE master sites & records with targetEndDate)
  const masterMap = {};
  sites.forEach(function(site) {
    if (!site || !site.name) return;
    const key = site.name.trim().toLowerCase();
    const existing = masterMap[key];
    if (!existing) {
      masterMap[key] = site;
    } else {
      if (existing.id && String(existing.id).startsWith('daily_') && site.id && !String(site.id).startsWith('daily_')) {
        masterMap[key] = site;
      }
      if (site.targetEndDate && !existing.targetEndDate) {
        masterMap[key] = site;
      }
    }
  });

  const existingEntriesSet = {};
  const updatedList = sites.slice();

  sites.forEach(function(s) {
    if (!s || !s.name) return;
    const sDate = s.targetDate || getSiteDateStr(s);
    if (sDate) {
      existingEntriesSet[`${s.name.trim().toLowerCase()}_${sDate}`] = true;
    }
  });

  Object.keys(masterMap).forEach(function(nameKey) {
    const masterSite = masterMap[nameKey];
    const siteStartDate = masterDateMap[nameKey] || masterSite.targetDate || todayStr;
    const siteEndDate = masterEndDateMap[nameKey] || masterSite.targetEndDate || null;
    if (!siteStartDate) return;

    let curDate = siteStartDate;
    const effectiveMaxDate = (siteEndDate && siteEndDate < todayStr) ? siteEndDate : todayStr;

    let safetyCounter = 0;
    while (curDate <= effectiveMaxDate && safetyCounter < 365) {
      safetyCounter++;
      const entryKey = `${nameKey}_${curDate}`;
      if (!existingEntriesSet[entryKey]) {
        const targetSite = {
          id: `daily_${masterSite.name.toLowerCase().replace(/\s+/g, '_')}_${curDate}`,
          name: masterSite.name,
          url: masterSite.url,
          status: 'BELUM_DICEK',
          lastTestedBy: null,
          lastTestedAt: null,
          targetDate: curDate,
          targetEndDate: siteEndDate,
          version: masterSite.version || 1,
        };
        updatedList.push(targetSite);
        existingEntriesSet[entryKey] = true;
      }
      curDate = getNextDateStrStr(curDate);
    }
  });

  const cleanedList = updatedList.filter(function(site) {
    if (!site || !site.name) return false;
    const key = site.name.trim().toLowerCase();
    const sDate = site.targetDate || getSiteDateStr(site);
    const minDate = masterDateMap[key];
    const endDate = masterEndDateMap[key] || site.targetEndDate || (masterMap[key] ? masterMap[key].targetEndDate : null);

    if (sDate > todayStr && site.id && String(site.id).startsWith('daily_')) {
      return false;
    }

    if (minDate && sDate < minDate) return false;
    if (endDate && sDate > endDate) return false;
    return true;
  });

  // Strict Deduplication Pass per (siteName, targetDate)
  const uniqueDateMap = {};
  cleanedList.forEach(function(site) {
    const sDate = site.targetDate || getSiteDateStr(site);
    const key = site.name.trim().toLowerCase() + '_' + sDate;

    if (!uniqueDateMap[key]) {
      uniqueDateMap[key] = site;
    } else {
      const existing = uniqueDateMap[key];
      if (existing.status === 'BELUM_DICEK' && site.status !== 'BELUM_DICEK') {
        uniqueDateMap[key] = site;
      } else if (existing.status !== 'BELUM_DICEK' && site.status === 'BELUM_DICEK') {
        // Keep existing tested record
      } else if (site.id && !String(site.id).startsWith('daily_') && existing.id && String(existing.id).startsWith('daily_')) {
        site.status = existing.status !== 'BELUM_DICEK' ? existing.status : site.status;
        site.lastTestedBy = existing.lastTestedBy || site.lastTestedBy;
        site.lastTestedAt = existing.lastTestedAt || site.lastTestedAt;
        uniqueDateMap[key] = site;
      }
    }
  });

  return Object.keys(uniqueDateMap).map(function(k) { return uniqueDateMap[k]; });
}

/**
 * Format Headers on Sheet cleanly with dark slate styling
 */
function formatHeadersOnSheet(sheet) {
  if (sheet.getMaxColumns() < 8) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), 8 - sheet.getMaxColumns());
  }
  const headers = [['No', 'Site Name', 'Site Link', 'Tester Name', 'Date', 'Status / Action', 'ID', 'Version']];
  const headerRange = sheet.getRange(1, 1, 1, 8);
  headerRange.setValues(headers)
    .setFontWeight('bold')
    .setBackground('#1e293b')
    .setFontColor('#ffffff')
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  sheet.setRowHeight(1, 34);
}

/**
 * Format Column Widths Helper
 */
function formatColumnWidths(sheet) {
  for (let c = 1; c <= 6; c++) {
    sheet.autoResizeColumn(c);
  }
  sheet.setColumnWidth(1, 50);  // No
  if (sheet.getColumnWidth(2) < 180) sheet.setColumnWidth(2, 180); // Site Name
  if (sheet.getColumnWidth(3) < 250) sheet.setColumnWidth(3, 250); // Site Link
  if (sheet.getColumnWidth(4) < 160) sheet.setColumnWidth(4, 160); // Tester Name
  if (sheet.getColumnWidth(5) < 130) sheet.setColumnWidth(5, 130); // Date
  if (sheet.getColumnWidth(6) < 140) sheet.setColumnWidth(6, 140); // Status
}

/**
 * Synchronize Data from Web App API to Single Sheet Tab
 */
function refreshAllData() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const options = {
    method: 'get',
    headers: {
      'X-API-KEY': CONFIG.API_KEY,
      'Authorization': 'Bearer ' + CONFIG.API_KEY,
      'ngrok-skip-browser-warning': 'true',
    },
    muteHttpExceptions: true,
  };

  let sitesData = [];

  try {
    const res = UrlFetchApp.fetch(`${CONFIG.BACKEND_URL}/sites`, options);
    const responseCode = res.getResponseCode();
    if (responseCode === 200) {
      const text = res.getContentText();
      let json = {};
      try {
        json = JSON.parse(text);
      } catch (e) {
        ui.alert('❌ Server response is not valid JSON. Please ensure Web App is running normally.');
        return;
      }
      sitesData = Array.isArray(json) ? json : (json.data !== undefined ? json.data : []);
    } else {
      ui.alert(`❌ Failed to fetch site data from Web App.\nHTTP Status Code: ${responseCode}`);
      return;
    }
  } catch (err) {
    ui.alert('❌ Failed to fetch site data from Web App.\nDetails: ' + err.message);
    return;
  }

  // Ensure primary sheet tab exists
  let mainSheet = ss.getSheetByName(CONFIG.PRIMARY_SHEET_NAME);
  if (!mainSheet) {
    mainSheet = ss.insertSheet(CONFIG.PRIMARY_SHEET_NAME, 0);
  }

  // Clean sheet completely
  mainSheet.clear();
  const maxRows = mainSheet.getMaxRows();
  const maxCols = mainSheet.getMaxColumns();
  mainSheet.getRange(1, 1, maxRows, maxCols).clearDataValidations();

  // Ensure minimum 8 columns for data + hidden system columns
  if (mainSheet.getMaxColumns() < 8) {
    mainSheet.insertColumnsAfter(mainSheet.getMaxColumns(), 8 - mainSheet.getMaxColumns());
  }

  // Write and style Header Row
  formatHeadersOnSheet(mainSheet);

  // If server returns empty data, stop cleanly without resurrecting deleted rows
  if (!sitesData || sitesData.length === 0) {
    mainSheet.showColumns(1, 6);
    if (mainSheet.getMaxColumns() >= 8) {
      mainSheet.hideColumns(7, 2);
    }
    formatColumnWidths(mainSheet);
    ss.setActiveSheet(mainSheet);
    ui.alert('ℹ️ Tidak ada data situs di database server (daftar kosong).');
    return;
  }

  // Process daily master entries for all active dates from site start date up to Today / targetEndDate
  sitesData = ensureDailyMasterSites(sitesData);

  // Sort data strictly by Date (newest first), then by Site Name alphabetically
  sitesData.sort(function(a, b) {
    const dateA = getSiteDateStr(a);
    const dateB = getSiteDateStr(b);
    if (dateA !== dateB) {
      return dateB.localeCompare(dateA);
    }
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  const allRows = [];
  const statusValues = [];

  sitesData.forEach(function(site, index) {
    const dateStr = getSiteDateStr(site);
    const statusText = (site.status === 'BERHASIL' || site.status === 'SELESAI')
      ? 'Successful'
      : (site.status === 'GAGAL' || site.status === 'GAGAL_ADA_REPORT')
      ? 'Failed'
      : 'Pending';

    const rawTester = site.lastTestedBy || site.currentTester || '';
    const testerDisplay = (rawTester && rawTester !== '-' && rawTester !== 'Google Sheets User') ? rawTester : '';

    allRows.push([
      String(index + 1),
      String(site.name || ''),
      String(site.url || ''),
      String(testerDisplay),
      dateStr,
      statusText,
      String(site.id || ''),
      parseInt(site.version, 10) || 1,
    ]);

    statusValues.push(statusText);
  });

  // Ensure sheet has enough rows for batch writing
  const requiredRows = allRows.length + 1;
  if (mainSheet.getMaxRows() < requiredRows) {
    mainSheet.insertRowsAfter(mainSheet.getMaxRows(), requiredRows - mainSheet.getMaxRows());
  }

  // Batch write all data rows
  const dataRange = mainSheet.getRange(2, 1, allRows.length, 8);
  dataRange.setValues(allRows).setVerticalAlignment('middle');

  // Batch format borders & columns
  const visibleDataRange = mainSheet.getRange(2, 1, allRows.length, 6);
  visibleDataRange.setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

  mainSheet.getRange(2, 1, allRows.length, 1).setFontColor('#64748b').setHorizontalAlignment('center');
  mainSheet.getRange(2, 2, allRows.length, 1).setFontWeight('bold').setFontColor('#0f172a').setHorizontalAlignment('left');
  mainSheet.getRange(2, 3, allRows.length, 1).setFontColor('#2563eb').setHorizontalAlignment('left');
  mainSheet.getRange(2, 4, allRows.length, 1).setFontColor('#334155').setHorizontalAlignment('center');
  mainSheet.getRange(2, 5, allRows.length, 1).setFontColor('#475569').setHorizontalAlignment('center');

  // Batch apply status dropdown validation
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Successful', 'Failed', 'Pending'], true)
    .setAllowInvalid(false)
    .build();

  const statusRange = mainSheet.getRange(2, 6, allRows.length, 1);
  statusRange.setDataValidation(statusRule)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  // Apply status background colors in batch arrays
  const bgColors = [];
  const fontColors = [];
  for (let i = 0; i < statusValues.length; i++) {
    const s = statusValues[i];
    if (s === 'Successful') {
      bgColors.push(['#dcfce7']);
      fontColors.push(['#15803d']);
    } else if (s === 'Failed') {
      bgColors.push(['#fee2e2']);
      fontColors.push(['#b91c1c']);
    } else {
      bgColors.push(['#fef3c7']);
      fontColors.push(['#b45309']);
    }
  }
  statusRange.setBackgrounds(bgColors).setFontColors(fontColors);

  // Set uniform row height in batch
  mainSheet.setRowHeights(2, allRows.length, 26);

  // Display columns 1-6, hide system columns 7-8
  mainSheet.showColumns(1, 6);
  mainSheet.hideColumns(7, 2);

  formatColumnWidths(mainSheet);

  ss.setActiveSheet(mainSheet);
  ui.alert(`✅ Synchronization Complete!\nSpreadsheet has been updated with ${allRows.length} rows sorted by Date.`);
}

/**
 * Save Single Selected Row to Web App & Database
 */
function saveSelectedRow() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveRange();

  if (!range) {
    ui.alert('⚠️ Please select a data row to save.');
    return;
  }

  const rowIndex = range.getRow();
  if (rowIndex <= 1) {
    ui.alert('⚠️ Please select a data row (not the header row).');
    return;
  }

  saveRowByNumber(rowIndex, true);
}

/**
 * Helper to Save Row by Row Index (with optional UI notifications)
 */
function saveRowByNumber(rowIndex, showUi) {
  const ui = showUi ? SpreadsheetApp.getUi() : null;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.PRIMARY_SHEET_NAME);
  if (!sheet) return;

  if (sheet.getMaxColumns() < 8) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), 8 - sheet.getMaxColumns());
  }

  const rowValues = sheet.getRange(rowIndex, 1, 1, 8).getValues()[0];

  const no = rowValues[0];
  const name = String(rowValues[1] || '').trim();
  const url = String(rowValues[2] || '').trim();
  const testerName = String(rowValues[3] || '').trim();
  const targetDateInput = String(rowValues[4] || '').trim();
  let statusInput = String(rowValues[5] || '').trim().toUpperCase();
  const id = String(rowValues[6] || '').trim();
  const version = parseInt(rowValues[7], 10) || 1;

  if (!name) {
    if (ui) ui.alert('❌ Validation Failed: Site Name is required.');
    return;
  }

  let effectiveId = id;
  if (!effectiveId) {
    effectiveId = 'site_sheet_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    sheet.getRange(rowIndex, 7).setValue(effectiveId);
  }

  // Normalization
  let statusEnum = 'BELUM_DICEK';
  if (statusInput === 'SUCCESSFUL' || statusInput === 'BERHASIL' || statusInput === 'SUCCESS' || statusInput === 'PASSED' || statusInput === 'SELESAI') {
    statusEnum = 'BERHASIL';
  } else if (statusInput === 'FAILED' || statusInput === 'GAGAL' || statusInput === 'FAIL') {
    statusEnum = 'GAGAL';
  }

  let rowTargetDate = targetDateInput;
  if (!rowTargetDate || !/^\d{4}-\d{2}-\d{2}$/.test(rowTargetDate)) {
    const matchIdDate = String(effectiveId).match(/(\d{4}-\d{2}-\d{2})/);
    if (matchIdDate) {
      rowTargetDate = matchIdDate[1];
    } else {
      rowTargetDate = getTodayDateStr();
    }
  }

  const payload = {
    name: name,
    url: url || `https://${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    status: statusEnum,
    targetDate: rowTargetDate,
    currentTester: (testerName && testerName !== '-' && testerName !== 'Google Sheets User') ? testerName : null,
    testerName: (testerName && testerName !== '-' && testerName !== 'Google Sheets User') ? testerName : null,
    result: statusEnum === 'BERHASIL' ? 'BERHASIL' : statusEnum === 'GAGAL' ? 'GAGAL' : null,
    notes: '',
    version: version,
    source: 'GOOGLE_SHEETS',
  };

  const options = {
    method: 'patch',
    contentType: 'application/json',
    headers: {
      'X-API-KEY': CONFIG.API_KEY,
      'Authorization': 'Bearer ' + CONFIG.API_KEY,
      'ngrok-skip-browser-warning': 'true',
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  try {
    const apiUrl = `${CONFIG.BACKEND_URL}/google-sheets/sites/${encodeURIComponent(effectiveId)}`;
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    let json = {};
    try { json = JSON.parse(responseText); } catch (e) {}

    if (responseCode === 200) {
      // Update Status Badge Cell
      const statusCell = sheet.getRange(rowIndex, 6);
      const statusDisplay = statusEnum === 'BERHASIL' ? 'Successful' : statusEnum === 'GAGAL' ? 'Failed' : 'Pending';
      statusCell.setValue(statusDisplay).setFontWeight('bold').setHorizontalAlignment('center');
      if (statusEnum === 'BERHASIL') {
        statusCell.setBackground('#dcfce7').setFontColor('#15803d');
      } else if (statusEnum === 'GAGAL') {
        statusCell.setBackground('#fee2e2').setFontColor('#b91c1c');
      } else {
        statusCell.setBackground('#fef3c7').setFontColor('#b45309');
      }

      sheet.getRange(rowIndex, 4).setValue(testerName || '');
      if (ui) ui.alert(`✅ Success: Site data #${no} ("${name}") for date ${rowTargetDate} saved & synced to Web App & Database!`);
    } else {
      if (ui) ui.alert(`❌ Save Failed (${responseCode}): ${json.message || responseText}`);
    }
  } catch (err) {
    if (ui) ui.alert(`❌ Connection Error: Unable to connect to backend server. Details: ${err.message}`);
  }
}

/**
 * Delete Selected Row(s) from Web App, Database & Spreadsheet
 */
function deleteSelectedRow() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveRange();

  if (!range) {
    ui.alert('⚠️ Please select a data row to delete.');
    return;
  }

  const startRow = range.getRow();
  const numRows = range.getNumRows();

  if (startRow <= 1) {
    ui.alert('⚠️ Please select a data row (not the header row).');
    return;
  }

  const selectedValues = sheet.getRange(startRow, 1, numRows, 8).getValues();
  const itemsToDelete = [];

  for (let i = 0; i < selectedValues.length; i++) {
    const row = selectedValues[i];
    const name = String(row[1] || '').trim();
    const targetDate = String(row[4] || '').trim();
    const id = String(row[6] || '').trim();
    if (name || id) {
      itemsToDelete.push({ name: name, id: id, targetDate: targetDate });
    }
  }

  if (itemsToDelete.length === 0) {
    ui.alert('⚠️ No valid site data found on selected row(s).');
    return;
  }

  const namesList = itemsToDelete.map(function(item) { return item.name || item.id; }).join(', ');
  const confirmResponse = ui.alert(
    '❓ Confirm Site Deletion',
    `Are you sure you want to delete ${itemsToDelete.length} selected site(s) ("${namesList}") from Web App, Database, and Spreadsheet?\n\nDeleted data will be permanently removed.`,
    ui.ButtonSet.YES_NO
  );

  if (confirmResponse !== ui.Button.YES) {
    return;
  }

  let deletedCount = 0;
  const options = {
    method: 'delete',
    headers: {
      'X-API-KEY': CONFIG.API_KEY,
      'Authorization': 'Bearer ' + CONFIG.API_KEY,
      'ngrok-skip-browser-warning': 'true',
    },
    muteHttpExceptions: true,
  };

  itemsToDelete.forEach(function(item) {
    let success = false;
    const targetKey = item.id || item.name;
    const query = item.targetDate ? `?targetDate=${encodeURIComponent(item.targetDate)}` : '';

    if (targetKey) {
      try {
        const deleteUrl = `${CONFIG.BACKEND_URL}/sites/${encodeURIComponent(targetKey)}${query}`;
        const res = UrlFetchApp.fetch(deleteUrl, options);
        if (res.getResponseCode() === 200 || res.getResponseCode() === 204) {
          success = true;
        }
      } catch (e) {}
    }

    if (success) {
      deletedCount++;
    }
  });

  refreshAllData();
  ui.alert(`✅ Success: ${deletedCount} site(s) successfully deleted completely from Web App, Database, and Spreadsheet!`);
}

/**
 * Format Headers Utility
 */
function formatSystemFields() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  formatHeadersOnSheet(sheet);
  SpreadsheetApp.getUi().alert('🔒 Header formatting complete.');
}

/**
 * OnEdit Event Trigger: Automatic cell formatting & optional auto-save
 */
function onEdit(e) {
  if (!e || !e.range) return;
  try {
    const sheet = e.range.getSheet();
    if (sheet.getName() !== CONFIG.PRIMARY_SHEET_NAME) return;

    const row = e.range.getRow();
    const col = e.range.getColumn();

    if (row <= 1) return;

    // Realtime Status Badge Styling (Col F / 6)
    if (col === 6) {
      const val = String(e.value || sheet.getRange(row, 6).getValue() || '').trim().toUpperCase();
      const cell = sheet.getRange(row, 6);
      cell.setFontWeight('bold').setHorizontalAlignment('center');
      if (val === 'BERHASIL' || val === 'SUCCESS' || val === 'PASSED' || val === 'SELESAI' || val === 'SUCCESSFUL') {
        cell.setBackground('#dcfce7').setFontColor('#15803d');
      } else if (val === 'GAGAL' || val === 'FAILED' || val === 'FAIL') {
        cell.setBackground('#fee2e2').setFontColor('#b91c1c');
      } else {
        cell.setBackground('#fef3c7').setFontColor('#b45309');
      }
    }

    // Auto-save edited row silently if execution context permits
    if (col >= 2 && col <= 6) {
      try {
        saveRowByNumber(row, false);
      } catch (err) {}
    }
  } catch (err) {}
}