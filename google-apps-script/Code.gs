/**
 * GOOGLE APPS SCRIPT FOR SINGLE SHEET TAB REALTIME SYNC WITH NESTJS BACKEND & MYSQL
 * Project: Website QA Testing Portal
 * Sheet Tab: "Data Testing QA"
 * 
 * Column Order (6 Visible Columns):
 * 1. No
 * 2. Nama Situs
 * 3. Link Situs
 * 4. Nama Tester
 * 5. Tanggal
 * 6. Status / Aksi
 * (Columns 7 & 8 hidden for System ID & Version)
 * 
 * Features:
 * - Direct clean table view sorted by Date (newest first)
 * - Data perfectly synchronized with Web App
 * - Simple & clean UI formatting without complex banners/sub-headers
 */

const CONFIG = {
  BACKEND_URL: 'https://european-tester-nine.vercel.app/api/v1',
  API_KEY: 'qa-secret-api-key-2026',
  PRIMARY_SHEET_NAME: 'Data Testing QA',
};

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
  const d = new Date(Date.UTC(year, month, day + 1));
  return Utilities.formatDate(d, 'Asia/Jakarta', 'yyyy-MM-dd');
}

/**
 * Auto-generate Daily Master Entries for every date from site start date up to Today / targetEndDate
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

    while (curDate <= effectiveMaxDate) {
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
          version: masterSite.version || 1
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
        // Keep existing tested record! Do not overwrite with untested entry!
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
 * Save Single Selected Row to Web App & Database
 * Column Layout:
 * 1: No (Col A)
 * 2: Site Name (Col B)
 * 3: Site Link (Col C)
 * 4: Tester Name (Col D)
 * 5: Date (Col E)
 * 6: Status / Action (Col F)
 * 7: ID (Col G - Hidden)
 * 8: Version (Col H - Hidden)
 */
function saveSelectedRow() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveRange();

  if (!range) {
    ui.alert('⚠️ Please select a data row to save.');
    return;
  }

  if (range.getNumRows() > 1) {
    ui.alert('⚠️ Please select only one row. Bulk update is not allowed.');
    return;
  }

  const rowIndex = range.getRow();
  if (rowIndex <= 1) {
    ui.alert('⚠️ Please select a data row (not the header row).');
    return;
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

  let effectiveId = id;
  if (!name) {
    ui.alert('❌ Validation Failed: Site Name is required.');
    return;
  }

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
    const matchIdDate = id.match(/(\d{4}-\d{2}-\d{2})/);
    if (matchIdDate) {
      rowTargetDate = matchIdDate[1];
    } else {
      rowTargetDate = getTodayDateStr();
    }
  }

  const payload = {
    name: name,
    url: url,
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
      // Update Status Badge (Column F / 6)
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

      // Update Tester Name (Column D / 4)
      sheet.getRange(rowIndex, 4).setValue(testerName || '');

      ui.alert(`✅ Success: Site data #${no} ("${name}") for date ${rowTargetDate} saved & synced to Web App & Database!`);
    } else if (responseCode === 409) {
      ui.alert(`⚠️ Version Conflict: Data has been modified in the Web App. Please click "📌 QA Sync -> 🔄 Synchronize" first.`);
    } else {
      ui.alert(`❌ Save Failed (${responseCode}): ${json.message || responseText}`);
    }
  } catch (err) {
    ui.alert(`❌ Connection Error: Unable to connect to backend API server. Details: ${err.message}`);
  }
}

/**
 * Synchronize Data from Web App API to Single Sheet Tab
 * Clean 6-column layout sorted by Date:
 * 1. No
 * 2. Nama Situs
 * 3. Link Situs
 * 4. Nama Tester
 * 5. Tanggal
 * 6. Status / Aksi
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

  let sitesData = null;

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
      if (json.error) {
        ui.alert(`❌ Server Error: ${json.error.message || json.error}`);
        return;
      }
      sitesData = Array.isArray(json) ? json : (json.data !== undefined ? json.data : []);
    } else {
      ui.alert(`❌ Failed to fetch site data from Web App.\nHTTP Status Code: ${responseCode}\nEnsure Vercel Backend is active & connected to Database.`);
      return;
    }
  } catch (err) {
    ui.alert('❌ Failed to fetch site data from Web App.\nDetails: ' + err.message);
    return;
  }

  if (!sitesData) {
    ui.alert('❌ Failed to retrieve data from server.');
    return;
  }

  // Ensure primary sheet tab: "Data Testing QA"
  let mainSheet = ss.getSheetByName(CONFIG.PRIMARY_SHEET_NAME);
  if (!mainSheet) {
    mainSheet = ss.insertSheet(CONFIG.PRIMARY_SHEET_NAME, 0);
  }

  // If server returned empty data, attempt to recover existing rows from Google Sheet & auto-sync back to server
  if (sitesData.length === 0 && mainSheet.getLastRow() > 1) {
    const lastRow = mainSheet.getLastRow();
    const existingValues = mainSheet.getRange(2, 1, lastRow - 1, 8).getValues();
    const recoveredSites = [];
    existingValues.forEach(function(row) {
      const name = String(row[1] || '').trim();
      const url = String(row[2] || '').trim();
      const testerName = String(row[3] || '').trim();
      const targetDate = String(row[4] || '').trim();
      const statusInput = String(row[5] || '').trim().toUpperCase();
      const id = String(row[6] || '').trim();
      const version = parseInt(row[7], 10) || 1;

      if (name) {
        let statusEnum = 'BELUM_DICEK';
        if (statusInput === 'SUCCESSFUL' || statusInput === 'BERHASIL' || statusInput === 'SUCCESS' || statusInput === 'PASSED' || statusInput === 'SELESAI') {
          statusEnum = 'BERHASIL';
        } else if (statusInput === 'FAILED' || statusInput === 'GAGAL' || statusInput === 'FAIL') {
          statusEnum = 'GAGAL';
        }

        recoveredSites.push({
          id: id || `site_sheet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: name,
          url: url || `https://${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          status: statusEnum,
          lastTestedBy: (testerName && testerName !== '-' && testerName !== 'Google Sheets User') ? testerName : null,
          lastTestedAt: targetDate ? targetDate + 'T12:00:00.000Z' : null,
          targetDate: targetDate || getTodayDateStr(),
          version: version,
        });
      }
    });

    if (recoveredSites.length > 0) {
      sitesData = recoveredSites;
      // Auto-sync recovered sheet sites to backend server database
      try {
        const syncOptions = {
          method: 'post',
          contentType: 'application/json',
          headers: {
            'X-API-KEY': CONFIG.API_KEY,
            'Authorization': 'Bearer ' + CONFIG.API_KEY,
            'ngrok-skip-browser-warning': 'true',
          },
          payload: JSON.stringify({ sites: recoveredSites }),
          muteHttpExceptions: true,
        };
        UrlFetchApp.fetch(`${CONFIG.BACKEND_URL}/sites/sync`, syncOptions);
      } catch (e) {}
    }
  }

  // Process daily master entries for all active dates from site start date up to Today / targetEndDate
  sitesData = ensureDailyMasterSites(sitesData);

  // Sort data strictly by Date (newest first), then by Site Name alphabetically
  sitesData.sort(function(a, b) {
    const dateA = getSiteDateStr(a);
    const dateB = getSiteDateStr(b);
    if (dateA !== dateB) {
      return dateB.localeCompare(dateA); // Newest date first
    }
    return String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' });
  });

  // Clear sheet & data validations completely
  mainSheet.clear();
  mainSheet.getRange(1, 1, mainSheet.getMaxRows(), mainSheet.getMaxColumns()).clearDataValidations();

  // Header Row (Row 1): 6 Visible Columns + 2 Hidden System Columns
  const headers = [['No', 'Site Name', 'Site Link', 'Tester Name', 'Date', 'Status / Action', 'ID', 'Version']];
  const headerRange = mainSheet.getRange(1, 1, 1, 8);
  headerRange.setValues(headers)
    .setFontWeight('bold')
    .setBackground('#1e293b') // Clean slate dark header
    .setFontColor('#ffffff')
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

  mainSheet.setRowHeight(1, 34);

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

  if (allRows.length > 0) {
    const dataRange = mainSheet.getRange(2, 1, allRows.length, 8);
    dataRange.setValues(allRows).setVerticalAlignment('middle');

    // Prepare Data Validation Rule for Status Dropdown
    const statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Successful', 'Failed', 'Pending'], true)
      .setAllowInvalid(false)
      .build();

    for (let i = 0; i < allRows.length; i++) {
      const rIdx = i + 2;
      const statusText = statusValues[i];

      // Table borders
      const rowRange = mainSheet.getRange(rIdx, 1, 1, 6);
      rowRange.setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

      // Column Formatting
      mainSheet.getRange(rIdx, 1).setFontColor('#64748b').setHorizontalAlignment('center');                     // No
      mainSheet.getRange(rIdx, 2).setFontWeight('bold').setFontColor('#0f172a').setHorizontalAlignment('left'); // Site Name
      mainSheet.getRange(rIdx, 3).setFontColor('#2563eb').setHorizontalAlignment('left');                       // Site Link
      mainSheet.getRange(rIdx, 4).setFontColor('#334155').setHorizontalAlignment('center');                     // Tester Name
      mainSheet.getRange(rIdx, 5).setFontColor('#475569').setHorizontalAlignment('center');                     // Date

      // Status Badge (Col F / 6)
      const statusCell = mainSheet.getRange(rIdx, 6);
      statusCell.setDataValidation(statusRule);
      statusCell.setFontWeight('bold').setHorizontalAlignment('center');
      if (statusText === 'Successful') {
        statusCell.setBackground('#dcfce7').setFontColor('#15803d');
      } else if (statusText === 'Failed') {
        statusCell.setBackground('#fee2e2').setFontColor('#b91c1c');
      } else {
        statusCell.setBackground('#fef3c7').setFontColor('#b45309');
      }

      mainSheet.setRowHeight(rIdx, 26);
    }
  }

  // Display columns 1-6, hide system columns 7-8
  mainSheet.showColumns(1, 6);
  mainSheet.hideColumns(7, 2);

  // Auto-resize columns 1 to 6
  for (let c = 1; c <= 6; c++) {
    mainSheet.autoResizeColumn(c);
  }

  // Enforce minimum widths & compact No column
  mainSheet.setColumnWidth(1, 50); // No

  const minWidths = {
    2: 180, // Site Name
    3: 250, // Site Link
    4: 160, // Tester Name
    5: 130, // Date
    6: 140, // Status / Action
  };

  for (let c = 2; c <= 6; c++) {
    if (mainSheet.getColumnWidth(c) < minWidths[c]) {
      mainSheet.setColumnWidth(c, minWidths[c]);
    }
  }

  // Set active sheet and clean up unused tabs
  ss.setActiveSheet(mainSheet);
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    if (sheet.getName() !== CONFIG.PRIMARY_SHEET_NAME && sheets.length > 1) {
      try {
        ss.deleteSheet(sheet);
      } catch (e) {}
    }
  }

  ui.alert(`✅ Synchronization Complete!\nSpreadsheet has been updated with 6 columns & sorted by Date.`);
}

function formatSystemFields() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange("1:1").setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
  SpreadsheetApp.getUi().alert('🔒 Header formatting complete.');
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
    `Are you sure you want to delete ${itemsToDelete.length} selected site(s) ("${namesList}") from Web App, Database, and Spreadsheet?\n\nDeleted data cannot be recovered.`,
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
    if (item.id) {
      try {
        const deleteUrl = `${CONFIG.BACKEND_URL}/sites/${encodeURIComponent(item.id)}?targetDate=${encodeURIComponent(item.targetDate || '')}`;
        const res = UrlFetchApp.fetch(deleteUrl, options);
        if (res.getResponseCode() === 200 || res.getResponseCode() === 204) {
          success = true;
        }
      } catch (e) {}
    }

    if (!success && item.name) {
      try {
        const deleteUrl = `${CONFIG.BACKEND_URL}/sites/${encodeURIComponent(item.name)}?targetDate=${encodeURIComponent(item.targetDate || '')}`;
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
  ui.alert(`✅ Success: ${deletedCount} site(s) successfully deleted from Web App, Database, and Spreadsheet!`);
}

/**
 * OnEdit Event Trigger: Automatic cell formatting & auto-sync when editing Google Sheets directly
 */
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== CONFIG.PRIMARY_SHEET_NAME) return;

  const row = e.range.getRow();
  const col = e.range.getColumn();

  if (row <= 1) return;

  // Realtime Status Badge Styling (Col F / 6)
  if (col === 6) {
    const val = String(e.value || '').trim().toUpperCase();
    const cell = sheet.getRange(row, 6);
    cell.setFontWeight('bold').setHorizontalAlignment('center');
    if (val === 'BERHASIL' || val === 'SUCCESS' || val === 'PASSED' || val === 'SELESAI') {
      cell.setBackground('#dcfce7').setFontColor('#15803d');
    } else if (val === 'GAGAL' || val === 'FAILED' || val === 'FAIL') {
      cell.setBackground('#fee2e2').setFontColor('#b91c1c');
    } else {
      cell.setBackground('#fef3c7').setFontColor('#b45309');
    }
  }

  // Auto-save edited row to Web App silently
  if (col >= 2 && col <= 6) {
    saveRowByNumber(row);
  }
}

/**
 * Helper to Save Row by Row Index silently without popups
 */
function saveRowByNumber(rowIndex) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.PRIMARY_SHEET_NAME);
  if (!sheet) return;

  const rowValues = sheet.getRange(rowIndex, 1, 1, 8).getValues()[0];
  const name = String(rowValues[1] || '').trim();
  const url = String(rowValues[2] || '').trim();
  const testerName = String(rowValues[3] || '').trim();
  const targetDateInput = String(rowValues[4] || '').trim();
  let statusInput = String(rowValues[5] || '').trim().toUpperCase();
  const id = String(rowValues[6] || '').trim();
  const version = parseInt(rowValues[7], 10) || 1;

  if (!name) return;

  let effectiveId = id;
  if (!effectiveId) {
    effectiveId = 'site_sheet_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    sheet.getRange(rowIndex, 7).setValue(effectiveId);
  }

  let statusEnum = 'BELUM_DICEK';
  if (statusInput === 'BERHASIL' || statusInput === 'SUCCESS' || statusInput === 'PASSED' || statusInput === 'SELESAI') {
    statusEnum = 'BERHASIL';
  } else if (statusInput === 'GAGAL' || statusInput === 'FAILED' || statusInput === 'FAIL') {
    statusEnum = 'GAGAL';
  }

  let rowTargetDate = targetDateInput;
  if (!rowTargetDate || !/^\d{4}-\d{2}-\d{2}$/.test(rowTargetDate)) {
    rowTargetDate = getTodayDateStr();
  }

  const payload = {
    name: name,
    url: url,
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
    UrlFetchApp.fetch(apiUrl, options);
  } catch (err) {}
}