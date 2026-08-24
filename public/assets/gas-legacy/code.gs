/**
 * KOPERASI SI MANDIRI - CORE ENGINE V6.5
 * + MASTER CUSTOMER & SUPPLIER
 * + INTEGRASI CUSTOMER/SUPPLIER KE TRANSAKSI PROJECT
 */

// ========== CONSTANTS ==========

const TRANSACTION_COLS = {
  NO: 0,            // Kolom A
  ID: 1,            // Kolom B
  TANGGAL: 2,       // Kolom C
  REFERAL: 3,       // Kolom D
  PLANTATION: 4,    // Kolom E (ENTITY)
  JENIS: 5,         // Kolom F (JENIS_KAS)
  KATEGORI: 6,      // Kolom G
  SKU_NAME: 7,      // Kolom H (NAMA_BARANG)
  METODE_BAYAR: 8,  // Kolom I (SUMBER_DANA)
  QTY: 9,           // Kolom J
  JUMLAH: 10,       // Kolom K (JUMLAH_KAS)
  FILELINK: 11,     // Kolom L (FILE_URL)
  AKUN: 12,         // Kolom M (AKUN_ANGGOTA)
  KETERANGAN: 13,   // Kolom N
  LOGIN_AS: 14,     // Kolom O (INPUT_BY)
  LOGTIME: 15,      // Kolom P (TIMESTAMP)
  AREA_JENIS: 16,   // Kolom Q
  HARGA_SATUAN: 17, // Kolom R
  CUSTOMER_ID: 18,  // Kolom S (baru)
  SUPPLIER_ID: 19   // Kolom T (baru)
};

const MEMBERSHIP_COLS = {
  ID: 0, TGL_REG: 1, NAMA: 2, GENDER: 3, PROVINSI: 4,
  KOTA: 5, ALAMAT: 6, PEKERJAAN: 7, PLANTATION: 8,
  PASSWORD: 9, TGL_LAHIR: 10, AREA_JENIS: 13
};

const REFERENSI_COLS = {
  KAT_MASUK: 3,
  KAT_KELUAR: 4,
  PLANT_PROJ: 7,
  PLANT_KOP: 12,
  FUNDS: [13, 14, 15]
};

const MSKU_COLS = {
  NO: 0, SKUID: 1, SKUNAME: 2, GROUP: 3, SUBGROUP: 4,
  BRAND: 5, QTY: 6, DATE_LOG: 7
};

const TRANSACTION_TYPES = { KAS: 'KAS', BARANG: 'BARANG', OPER: 'OPER' };
const CASH_TYPES = { MASUK: 'MASUK', KELUAR: 'KELUAR' };
const REFERAL_TYPES = { KOPERASI: 'KOPERASI', PROJECT: 'PROJECT' };
const ROLES = { ADMIN: 'ADMIN', DIRECTOR: 'DIRECTOR', ANGGOTA: 'ANGGOTA' };

const DEFAULT_PROJECTS = [
  'KAMPUNG HAJI', 'TRADING IKAN', 'GARAM', 'PERTANIAN',
  'PLYWOOD', 'MINYAK MERAH', 'SUPPLIER MBG', 'DISTRIBUTOR MEATSHOP'
];

const CACHE_KEYS = {
  DRIVE_MAP: 'drive_file_map',
  SESSION: 'si_mandiri_session'
};

const AREAS_COLS = { REFERAL: 2, ENTITY: 7 };

const TRX = TRANSACTION_COLS;
const MEM = MEMBERSHIP_COLS;
const REF = REFERENSI_COLS;
const SKU = MSKU_COLS;

// ========== SPREADSHEET IDs ==========

const SS_ID = '1GvPj5DDoTupU0cePmfdRetZItjbkoHab6lPa-K27S7o';
const FOLDER_ID = '1VqYzNuB4CwjlTC0QJxZP5mezIt-xw91Z';
const CACHE_TIME = 900;

const ID_CARD_CONFIG = {
  templateId: '1kQgUFpnkz7RL8ZVYGGIaJfZXyB0SrtGE',
  outputFolder: 'ID_CARD_OUTPUT'
};

// ========== LOGGING ==========

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, SECURITY: 4 };
function logEvent(level, category, message, data = {}) {
  console.log(`[${level}] ${category}: ${message}`, data);
}
function logAudit(data) {
  logEvent(LOG_LEVELS.SECURITY, 'AUDIT', data.action || 'Unknown action', data);
}
function logSecurityEvent(data) {
  logEvent(LOG_LEVELS.SECURITY, 'SECURITY', data.type || 'Security event', data);
}
function logError(error, context = {}) {
  logEvent(LOG_LEVELS.ERROR, 'ERROR', error.message || 'Unknown error', {
    stack: error.stack,
    ...context
  });
}

// ========== ERROR HANDLER ==========

const ErrorMessages = {
  UNAUTHORIZED_ACCESS: { userMessage: 'Anda tidak memiliki akses ke fitur ini', logLevel: 'SECURITY' },
  SESSION_EXPIRED: { userMessage: 'Sesi Anda telah berakhir. Silakan login kembali', logLevel: 'INFO' },
  INVALID_INPUT: { userMessage: 'Data yang dimasukkan tidak valid', logLevel: 'WARN' },
  DATABASE_ERROR: { userMessage: 'Terjadi kesalahan pada database', logLevel: 'ERROR' },
  DRIVE_ERROR: { userMessage: 'Gagal mengakses file di Drive', logLevel: 'ERROR' },
  RATE_LIMIT: { userMessage: 'Terlalu banyak permintaan. Silakan coba lagi nanti', logLevel: 'WARN' },
  UNKNOWN: { userMessage: 'Terjadi kesalahan yang tidak diketahui', logLevel: 'ERROR' }
};
function handleError(error, customMessage = null) {
  console.error('Error caught:', error);
  logError(error);
  let errorCode = 'UNKNOWN';
  if (error && error.message) {
    if (error.message.includes('UNAUTHORIZED_ACCESS')) errorCode = 'UNAUTHORIZED_ACCESS';
    else if (error.message.includes('Session')) errorCode = 'SESSION_EXPIRED';
    else if (error.message.includes('Drive')) errorCode = 'DRIVE_ERROR';
  }
  const errorInfo = ErrorMessages[errorCode] || ErrorMessages.UNKNOWN;
  return {
    success: false,
    error: customMessage || errorInfo.userMessage,
    code: errorCode,
    timestamp: new Date().toISOString()
  };
}

// ========== RATE LIMITER ==========

const RateLimiter = {
  limits: {},
  check: function(key, maxRequests = 10, timeWindow = 60000) {
    const now = Date.now();
    if (!this.limits[key]) {
      this.limits[key] = { count: 1, firstRequest: now };
      return true;
    }
    const timeDiff = now - this.limits[key].firstRequest;
    if (timeDiff > timeWindow) {
      this.limits[key] = { count: 1, firstRequest: now };
      return true;
    }
    this.limits[key].count++;
    if (this.limits[key].count > maxRequests) {
      logSecurityEvent({ type: 'RATE_LIMIT_EXCEEDED', key: key, count: this.limits[key].count });
      return false;
    }
    return true;
  }
};

// ========== VALIDATOR ==========

const Validator = {
  required: function(value, fieldName) {
    if (value === undefined || value === null || value === '') { throw new Error(`${fieldName} wajib diisi`); }
    return value;
  },
  number: function(value, fieldName) {
    const num = Number(value);
    if (isNaN(num)) throw new Error(`${fieldName} harus berupa angka`);
    return num;
  },
  maxLength: function(value, max, fieldName) {
    if (value && value.length > max) throw new Error(`${fieldName} maksimal ${max} karakter`);
    return value;
  },
  date: function(value, fieldName) {
    const date = new Date(value);
    if (isNaN(date.getTime())) throw new Error(`${fieldName} tidak valid`);
    return date;
  }
};

// ========== SESSION MANAGEMENT ==========

const SESSION_KEY = 'SI_MANDIRI_SESSION';

function requireLogin() {
  const session = getCurrentSession();
  if (!session || !session.userId || !session.sessionId) {
    throw new Error('UNAUTHORIZED_ACCESS: Silakan login terlebih dahulu');
  }
  const cache = CacheService.getScriptCache();
  const cached = cache.get('session_' + session.userId + '_' + session.sessionId);
  if (!cached) { throw new Error('SESSION_EXPIRED: Sesi tidak valid'); }
  return session;
}

function requireRole(allowedRoles) {
  const session = requireLogin();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(session.role)) {
    logSecurityEvent({ type: 'UNAUTHORIZED_ROLE_ACCESS', userId: session.userId, role: session.role, requiredRoles: roles });
    throw new Error(`UNAUTHORIZED_ACCESS: Required role ${roles.join(' atau ')}`);
  }
  return session;
}

function getCurrentSession() {
  try {
    const userProps = PropertiesService.getUserProperties();
    const sessionJson = userProps.getProperty(SESSION_KEY);
    if (sessionJson) {
      const session = JSON.parse(sessionJson);
      const cache = CacheService.getScriptCache();
      const cached = cache.get('session_' + session.userId + '_' + session.sessionId);
      if (cached) {
        const cachedSession = JSON.parse(cached);
        if (cachedSession.sessionId === session.sessionId) {
          return session;
        }
      }
    }
  } catch (e) { console.error('Error reading session:', e.message); }
  return null;
}

function setSession(userData) {
  const sessionId = Utilities.getUuid();
  const session = {
    userId: userData.userId,
    username: userData.user,
    role: userData.role,
    loginTime: new Date().toISOString(),
    sessionId: sessionId
  };
  try {
    const userProps = PropertiesService.getUserProperties();
    userProps.setProperty(SESSION_KEY, JSON.stringify(session));
    const cache = CacheService.getScriptCache();
    cache.put('session_' + session.userId + '_' + sessionId, JSON.stringify(session), 1800);
    logAudit({ action: 'LOGIN_SUCCESS', userId: session.userId, role: session.role, sessionId: session.sessionId });
  } catch (e) { console.error('Error saving session:', e.message); }
  return session;
}

function clearSession() {
  const session = getCurrentSession();
  try {
    if (session) {
      const cache = CacheService.getScriptCache();
      cache.remove('session_' + session.userId + '_' + session.sessionId);
    }
    const userProps = PropertiesService.getUserProperties();
    userProps.deleteProperty(SESSION_KEY);
    if (session) { logAudit({ action: 'LOGOUT', userId: session.userId }); }
  } catch (e) { console.error('Error clearing session:', e.message); }
}

function sanitizeInput(input) {
  if (input === null || input === undefined) return '';
  const str = String(input);
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '').replace(/on\w+=/gi, '').trim();
}

// ========== PASSWORD HASH ==========

function hashPassword(plain) {
  if (!plain) return '';
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, plain, Utilities.Charset.UTF_8);
  return digest.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

// ========== CONFIGURATION ==========

function getConfig(key) {
  const DEFAULTS = {
    'SPREADSHEET.ID': '1GvPj5DDoTupU0cePmfdRetZItjbkoHab6lPa-K27S7o',
    'DRIVE.UPLOAD_FOLDER_ID': '1VqYzNuB4CwjlTC0QJxZP5mezIt-xw91Z',
    'DRIVE.ID_CARD.TEMPLATE_ID': '1kQgUFpnkz7RL8ZVYGGIaJfZXyB0SrtGE',
    'DRIVE.ID_CARD.OUTPUT_FOLDER': 'ID_CARD_OUTPUT',
    'CACHE.DRIVE_MAP_TTL': 900
  };
  return DEFAULTS[key];
}

// ========== SECURITY CREDENTIALS ==========

function getAdminCredentials() {
  const scriptProps = PropertiesService.getScriptProperties();
  return {
    username: scriptProps.getProperty('ADMIN_USERNAME') || 'admin',
    password: scriptProps.getProperty('ADMIN_PASSWORD') || '114true'
  };
}

function getDirectorCredentials() {
  const scriptProps = PropertiesService.getScriptProperties();
  return {
    username: scriptProps.getProperty('DIRECTOR_USERNAME') || 'director',
    password: scriptProps.getProperty('DIRECTOR_PASSWORD') || 'kopsim114'
  };
}

// ========== UTILITIES ==========

function formatToIndoString(dateInput) {
  if (!dateInput) return "";
  try {
    const d = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
    return isNaN(d.getTime()) ? "" : Utilities.formatDate(d, "GMT+7", "dd MMM yyyy");
  } catch (e) { return ""; }
}

function formatDateToSheet(dateInput) {
  if (!dateInput) return new Date();
  try {
    const d = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch (e) { return new Date(); }
}

function getSheetDataRaw_(ss, sheetName) {
  try {
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return [];
    const lastRow = sh.getLastRow();
    if (lastRow <= 1) return [];
    const lastCol = sh.getLastColumn();
    return sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
  } catch (e) { console.error('Error getting sheet data:', sheetName, e); return []; }
}

function getRefData_(refDataRaw, colIndex) {
  return refDataRaw.map(row => row[colIndex]).filter(item => item && item.toString().trim() !== "");
}

function getSheetHeaders_(sheet) {
  if (!sheet) return [];
  try {
    const lastCol = sheet.getLastColumn();
    return lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  } catch (e) { return []; }
}

function getColumnIndexByHeader_(headers, headerName) {
  const index = headers.findIndex(h => h && h.toString().trim() === headerName.toString().trim());
  return index >= 0 ? index + 1 : 0;
}

function createRowDataFromObject_(obj, headers) {
  const rowData = new Array(headers.length).fill('');
  Object.keys(obj).forEach(key => {
    const colIndex = getColumnIndexByHeader_(headers, key) - 1;
    if (colIndex >= 0 && colIndex < headers.length) {
      rowData[colIndex] = obj[key] || '';
    }
  });
  return rowData;
}

function cleanRupiah(value) {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[Rp\s.,]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

// ========== CALCULATOR ==========

function calculateFinancialSummary_(trxData) {
  const summary = {
    totalKoperasi: 0,
    totalProject: 0,
    totalPemasukan: 0,
    totalPengeluaran: 0,
    saldo: 0,
    koperasi: { masuk: 0, keluar: 0 },
    project: { masuk: 0, keluar: 0 }
  };
  if (!trxData || trxData.length === 0) return summary;
  for (let i = 0; i < trxData.length; i++) {
    try {
      const row = trxData[i];
      if (!row || row.length < 18) continue;
      const areaJenis = (row[TRX.AREA_JENIS] || "").toString().toUpperCase().trim();
      const jenis = (row[TRX.JENIS] || "").toString().toUpperCase().trim();
      const jumlah = cleanRupiah(row[TRX.JUMLAH]);
      if (jenis === CASH_TYPES.MASUK) {
        summary.totalPemasukan += jumlah;
        if (areaJenis.includes('KOPERASI')) summary.koperasi.masuk += jumlah;
        else if (areaJenis.includes('PROJECT')) summary.project.masuk += jumlah;
      } else if (jenis === CASH_TYPES.KELUAR) {
        summary.totalPengeluaran += jumlah;
        if (areaJenis.includes('KOPERASI')) summary.koperasi.keluar += jumlah;
        else if (areaJenis.includes('PROJECT')) summary.project.keluar += jumlah;
      }
    } catch (e) { continue; }
  }
  summary.totalKoperasi = summary.koperasi.masuk - summary.koperasi.keluar;
  summary.totalProject = summary.project.masuk - summary.project.keluar;
  summary.saldo = summary.totalPemasukan - summary.totalPengeluaran;
  return summary;
}

// ========== MAIN CONTROLLER ==========

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.v === 'app') {
      return HtmlService.createTemplateFromFile('index')
        .evaluate()
        .setTitle('SI MANDIRI - Enterprise System')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0');
    }
    return HtmlService.createTemplateFromFile('layout')
      .evaluate()
      .setTitle('Koperasi Syarikat Islam Mandiri')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0');
  } catch (error) {
    console.error('Error in doGet:', error);
    return HtmlService.createHtmlOutput('Error loading application: ' + error.message);
  }
}

function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (e) {
    console.error('Error including file:', filename, e);
    return '';
  }
}

// ========== AUTHENTICATION ==========

function checkLogin(username, password) {
  console.log("Login attempt for user: " + username);
  try {
    const uStr = username.toString().trim();
    const pStr = password.toString().trim();
    const clientId = Session.getTemporaryActiveUserKey() || 'anonymous';
    if (!RateLimiter.check(`login_${clientId}`, 5, 60000)) {
      logSecurityEvent({ type: 'BRUTE_FORCE_ATTEMPT', username: uStr });
      return { status: 'error', message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 1 menit.' };
    }
    const hashedInput = hashPassword(pStr);
    const adminCred = getAdminCredentials();
    if (uStr === adminCred.username && hashedInput === hashPassword(adminCred.password)) {
      const session = { status: 'success', role: ROLES.ADMIN, user: 'Administrator', userId: 'ADMIN' };
      setSession(session);
      logAudit({ action: 'LOGIN_SUCCESS', userId: 'ADMIN', role: ROLES.ADMIN });
      return session;
    }
    const directorCred = getDirectorCredentials();
    if (uStr === directorCred.username && hashedInput === hashPassword(directorCred.password)) {
      const session = { status: 'success', role: ROLES.DIRECTOR, user: 'Director', userId: 'DIRECTOR' };
      setSession(session);
      logAudit({ action: 'LOGIN_SUCCESS', userId: 'DIRECTOR', role: ROLES.DIRECTOR });
      return session;
    }
    const ss = SpreadsheetApp.openById(SS_ID);
    const rawData = getSheetDataRaw_(ss, 'MEMBERSHIP');
    let found = null;
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const id = row[MEM.ID];
      const storedPass = row[MEM.PASSWORD] || '';
      if (id && id.toString().toUpperCase() === uStr.toUpperCase()) {
        const isHash = /^[a-f0-9]{64}$/i.test(storedPass);
        let match = false;
        if (isHash) {
          match = storedPass === hashedInput;
        } else {
          if (storedPass === pStr) {
            match = true;
            const rowNum = i + 2;
            ss.getSheetByName('MEMBERSHIP').getRange(rowNum, MEM.PASSWORD + 1).setValue(hashedInput);
            console.log("Migrasi password untuk " + username);
          }
        }
        if (match) { found = row; break; }
      }
    }
    if (found) {
      const session = { status: 'success', role: ROLES.ANGGOTA, user: found[MEM.NAMA], userId: found[MEM.ID] };
      setSession(session);
      logAudit({ action: 'LOGIN_SUCCESS', userId: found[MEM.ID], role: ROLES.ANGGOTA });
      return session;
    }
    console.log("Login failed for user: " + username);
    logSecurityEvent({ type: 'LOGIN_FAILED', username: uStr });
    return { status: 'error', message: 'Username atau Password Salah' };
  } catch (e) {
    console.error("Error in checkLogin:", e);
    return handleError(e);
  }
}

// ========== DATA FETCHING ==========

function getDriveMappingWithCache_() {
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get(CACHE_KEYS.DRIVE_MAP);
    if (cached) { return JSON.parse(cached); }
    const fileMap = {};
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      const fullName = file.getName();
      const id = fullName.lastIndexOf('.') > -1 ? fullName.substring(0, fullName.lastIndexOf('.')) : fullName;
      fileMap[id] = file.getUrl();
    }
    cache.put(CACHE_KEYS.DRIVE_MAP, JSON.stringify(fileMap), CACHE_TIME);
    return fileMap;
  } catch (e) { console.log("Drive Error:", e.message); return {}; }
}

function sanitizeTransactionRow(row) {
  if (!row || row.length === 0) return [];
  const sanitized = row.map(cell => {
    if (cell === undefined || cell === null) return '';
    if (cell instanceof Date) {
      try {
        return Utilities.formatDate(cell, "GMT+7", "yyyy-MM-dd HH:mm:ss");
      } catch (e) { return ''; }
    }
    return cell;
  });
  // Pastikan panjang minimal 20 untuk menampung CUSTOMER_ID & SUPPLIER_ID
  while (sanitized.length < 20) {
    sanitized.push('');
  }
  return sanitized;
}

function ensureTransactionSheetStructure(ss) {
  var sheet = ss.getSheetByName('TRANSAKSI');
  if (!sheet) {
    sheet = ss.insertSheet('TRANSAKSI');
    var headers = [
      'NO', 'ID', 'TANGGAL', 'REFERAL', 'PLANTATION', 'JENIS', 'KATEGORI',
      'SKU NAME', 'METODE PEMBAYARAN', 'QTY', 'JUMLAH', 'FILELINK', 'AKUN',
      'KETERANGAN', 'LOGIN AS', 'LOGTIME', 'AREA_JENIS', 'HARGA SATUAN',
      'CUSTOMER_ID', 'SUPPLIER_ID'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var hasCustomer = headers.some(function(h) { return String(h).trim().toUpperCase() === 'CUSTOMER_ID'; });
  if (!hasCustomer) {
    var newCol = lastCol + 1;
    sheet.getRange(1, newCol).setValue('CUSTOMER_ID');
    newCol++;
    sheet.getRange(1, newCol).setValue('SUPPLIER_ID');
  }
}

// ========== MASTER DATA CUSTOMER/SUPPLIER ==========

function getActiveCustomers() {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const sheet = ss.getSheetByName('CUSTOMER');
    if (!sheet) return [];
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 14).getValues();
    const active = data.filter(row => String(row[10]).toUpperCase() === 'AKTIF');
    return active.map(row => ({
      id: row[0],
      nama: row[1],
      pic: row[2],
      telepon: row[3],
      email: row[4],
      alamat: row[5],
      provinsi: row[6],
      kota: row[7],
      npwp: row[8],
      kategori: row[9],
      status: row[10],
      keterangan: row[11],
      created_at: row[12],
      updated_at: row[13]
    }));
  } catch(e) { console.error('getActiveCustomers error:', e); return []; }
}

function getActiveSuppliers() {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const sheet = ss.getSheetByName('SUPPLIER');
    if (!sheet) return [];
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 14).getValues();
    const active = data.filter(row => String(row[10]).toUpperCase() === 'AKTIF');
    return active.map(row => ({
      id: row[0],
      nama: row[1],
      pic: row[2],
      telepon: row[3],
      email: row[4],
      alamat: row[5],
      provinsi: row[6],
      kota: row[7],
      npwp: row[8],
      kategori: row[9],
      status: row[10],
      keterangan: row[11],
      created_at: row[12],
      updated_at: row[13]
    }));
  } catch(e) { console.error('getActiveSuppliers error:', e); return []; }
}

// ========== GET APP DATA ==========

function getAppData() {
  console.log("Starting getAppData at: " + new Date().toISOString());
  const startTime = Date.now();
  try {
    requireLogin();
    const ss = SpreadsheetApp.openById(SS_ID);
    ensureTransactionSheetStructure(ss);

    const sheetTrx = ss.getSheetByName('TRANSAKSI');
    const lastRowTrx = sheetTrx.getLastRow();
    const lastColTrx = sheetTrx.getLastColumn();
    let trxDataRaw = [];
    if (lastRowTrx > 1) {
      trxDataRaw = sheetTrx.getRange(2, 1, lastRowTrx - 1, lastColTrx).getValues();
    }
    console.log("🔍 Total transaksi di Sheet (raw): " + trxDataRaw.length);

    const sanitizedTrxData = trxDataRaw.map(row => sanitizeTransactionRow(row));
    console.log("🔍 Total transaksi setelah sanitasi: " + sanitizedTrxData.length);

    const memData = getSheetDataRaw_(ss, 'MEMBERSHIP');
    const simData = getSheetDataRaw_(ss, 'SIMPANAN');
    const refData = getSheetDataRaw_(ss, 'REFERENSI');
    const mskuData = getSheetDataRaw_(ss, 'MSKU');
    const areasData = getSheetDataRaw_(ss, 'AREAS');
    const categoriesData = getSheetDataRaw_(ss, 'CATEGORIES');
    const customers = getActiveCustomers();
    const suppliers = getActiveSuppliers();

    const formatDateRow = (row) => row.map((cell, idx) => {
      if (cell instanceof Date) {
        if (idx === TRX.TANGGAL || idx === MEM.TGL_REG || idx === MEM.TGL_LAHIR) {
          return formatToIndoString(cell);
        }
        try { return Utilities.formatDate(cell, "GMT+7", "yyyy-MM-dd HH:mm:ss"); } catch (e) { return ""; }
      }
      if (idx === TRX.JUMLAH || idx === TRX.QTY) { return cleanRupiah(cell); }
      return cell;
    });

    let memMap = {};
    let fundMap = {};
    memData.forEach(row => {
      const p = (row[MEM.PLANTATION] || "").toString().trim();
      const n = row[MEM.NAMA];
      if (p && n) { if (!memMap[p]) memMap[p] = []; memMap[p].push(n); }
    });
    refData.forEach(row => {
      const p = (row[REF.PLANT_PROJ] || "").toString().trim();
      if (p) {
        const funds = REF.FUNDS.map(idx => row[idx]).filter(c => c && c.toString().trim() !== "");
        if (funds.length > 0) fundMap[p] = funds;
      }
    });

    const driveFiles = getDriveMappingWithCache_();
    const safeMembers = memData.map(member => {
      const safeMember = [...member]; safeMember[MEM.PASSWORD] = '********';
      return formatDateRow(safeMember);
    });
    const formattedTransactions = sanitizedTrxData.map(formatDateRow);
    console.log("🔍 Total transaksi setelah format: " + formattedTransactions.length);

    const financialSummary = calculateFinancialSummary_(sanitizedTrxData);
    console.log("🔍 Summary dihitung, saldo: " + financialSummary.saldo);

    const result = {
      transactions: formattedTransactions,
      summary: financialSummary,
      members: safeMembers,
      simpanan: simData.map(formatDateRow),
      driveFiles: driveFiles,
      masterBarang: mskuData,
      refs: {
        referal: Object.values(REFERAL_TYPES),
        katMasuk: getRefData_(refData, REF.KAT_MASUK),
        katKeluar: getRefData_(refData, REF.KAT_KELUAR),
        plantKop: getRefData_(refData, REF.PLANT_KOP),
        plantProj: getRefData_(refData, REF.PLANT_PROJ),
        mapMembers: memMap,
        mapFunds: fundMap,
        areas: areasData,
        categories: categoriesData,
        customers: customers,
        suppliers: suppliers
      }
    };
    console.log("✅ getAppData completed in: " + (Date.now() - startTime) + "ms");
    return result;
  } catch (e) {
    console.error("❌ Error in getAppData:", e);
    return handleError(e);
  }
}

// ========== MEMBER DATA ==========

function getMemberData() {
  console.log("Starting getMemberData");
  const startTime = Date.now();
  try {
    requireLogin();
    const session = getCurrentSession();
    if (!session || session.role !== ROLES.ANGGOTA) throw new Error('UNAUTHORIZED_ACCESS: Hanya untuk anggota');
    const ss = SpreadsheetApp.openById(SS_ID);
    const memSheet = ss.getSheetByName('MEMBERSHIP');
    const lastColMem = memSheet.getLastColumn();
    const memData = memSheet.getRange(2, 1, memSheet.getLastRow() - 1, lastColMem).getValues();
    const myProfile = memData.find(row => row[MEM.ID].toString() === session.userId.toString());
    if (!myProfile) throw new Error('Member not found');
    const trxSheet = ss.getSheetByName('TRANSAKSI');
    const lastColTrx = trxSheet.getLastColumn();
    const trxData = trxSheet.getRange(2, 1, trxSheet.getLastRow() - 1, lastColTrx).getValues();
    const myTransactions = trxData.filter(t => {
      const akun = (t[TRX.AKUN] || "").toString().toUpperCase();
      const memberIdUpper = session.userId.toString().toUpperCase();
      const memberNameUpper = (myProfile[MEM.NAMA] || "").toString().toUpperCase();
      return akun.includes(memberIdUpper) || akun.includes(memberNameUpper);
    });
    const refData = getSheetDataRaw_(ss, 'REFERENSI');
    const formatDateRow = (row) => row.map((cell, idx) => {
      if (cell instanceof Date) return formatToIndoString(cell);
      if (idx === TRX.JUMLAH) return cleanRupiah(cell);
      return cell;
    });
    const result = {
      profile: formatDateRow(myProfile),
      transactions: myTransactions.map(formatDateRow),
      refs: {
        referal: Object.values(REFERAL_TYPES),
        katMasuk: getRefData_(refData, REF.KAT_MASUK),
        katKeluar: getRefData_(refData, REF.KAT_KELUAR),
        plantKop: getRefData_(refData, REF.PLANT_KOP),
      },
      driveFiles: getDriveMappingWithCache_()
    };
    console.log("getMemberData completed in: " + (Date.now() - startTime) + "ms");
    return result;
  } catch (e) { console.error("Error in getMemberData:", e); return handleError(e); }
}

// ========== PROJECT FUNCTIONS ==========

function getProjectsFromAreas() {
  try {
    requireLogin();
    var cache = CacheService.getScriptCache();
    var cacheKey = 'projects_from_areas';
    var cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
    var ss = SpreadsheetApp.openById(SS_ID);
    var sheet = ss.getSheetByName('AREAS');
    if (!sheet) return [];
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    var projects = [];
    data.forEach(function(row) {
      var referal = (row[AREAS_COLS.REFERAL] || '').toString().toUpperCase().trim();
      var entity = (row[AREAS_COLS.ENTITY] || '').toString().trim();
      if (referal === 'PROJECT' && entity) projects.push(entity);
    });
    projects = [...new Set(projects)];
    projects.sort();
    cache.put(cacheKey, JSON.stringify(projects), 300);
    return projects;
  } catch(e) { console.error('Error getProjectsFromAreas:', e); return []; }
}

function getProjectTransactions(projectName) {
  try {
    requireLogin();
    if (!projectName) return [];
    var cache = CacheService.getScriptCache();
    var cacheKey = 'project_trx_' + projectName.replace(/\s/g, '_');
    var cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
    var ss = SpreadsheetApp.openById(SS_ID);
    var sheet = ss.getSheetByName('TRANSAKSI');
    if (!sheet) return [];
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];
    var lastCol = sheet.getLastColumn();
    var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var projectNameUpper = projectName.toString().toUpperCase().trim();
    var filtered = data.filter(function(row) {
      var areaJenis = (row[TRX.AREA_JENIS] || '').toString().toUpperCase().trim();
      var plantation = (row[TRX.PLANTATION] || '').toString().toUpperCase().trim();
      return areaJenis === 'PROJECT' && plantation === projectNameUpper;
    });
    var formatted = filtered.map(function(row) {
      return row.map(function(cell, idx) {
        if (cell instanceof Date) {
          if (idx === TRX.TANGGAL) return formatToIndoString(cell);
          try { return Utilities.formatDate(cell, "GMT+7", "yyyy-MM-dd HH:mm:ss"); } catch (e) { return ""; }
        }
        if (idx === TRX.JUMLAH || idx === TRX.QTY) return cleanRupiah(cell);
        return cell;
      });
    });
    cache.put(cacheKey, JSON.stringify(formatted), 300);
    return formatted;
  } catch(e) { console.error('Error getProjectTransactions:', e); return []; }
}

function getProjectSummary(projectName) {
  try {
    var trx = getProjectTransactions(projectName);
    var masuk = 0, keluar = 0;
    trx.forEach(function(t) {
      var nominal = cleanRupiah(t[TRX.JUMLAH]);
      if ((t[TRX.JENIS] || '').toString().toUpperCase() === 'MASUK') masuk += nominal;
      else keluar += nominal;
    });
    return {
      totalMasuk: masuk,
      totalKeluar: keluar,
      saldo: masuk - keluar,
      totalTransaksi: trx.length
    };
  } catch(e) { console.error('Error getProjectSummary:', e); return { totalMasuk: 0, totalKeluar: 0, saldo: 0, totalTransaksi: 0 }; }
}

function getAllProjectsWithTransactions() {
  try {
    requireLogin();
    var projects = getProjectsFromAreas();
    var result = [];
    projects.forEach(function(p) {
      var summary = getProjectSummary(p);
      result.push({ name: p, totalMasuk: summary.totalMasuk, totalKeluar: summary.totalKeluar, saldo: summary.saldo, totalTransaksi: summary.totalTransaksi });
    });
    return result;
  } catch(e) { console.error('Error getAllProjectsWithTransactions:', e); return []; }
}

function getProjectDefaultPrice(projectName) {
  try {
    var cache = CacheService.getScriptCache();
    var key = 'project_price_' + projectName.replace(/\s/g, '_');
    var cached = cache.get(key);
    if (cached) return JSON.parse(cached);
    var ss = SpreadsheetApp.openById(SS_ID);
    var sheet = ss.getSheetByName('PROJECT_MASTER');
    if (!sheet) return null;
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    var found = null;
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (row[1] && row[1].toString().toUpperCase().trim() === projectName.toUpperCase().trim()) {
        found = { defaultHarga: row[2] || 0, satuan: row[3] || '', status: row[4] || '' };
        break;
      }
    }
    if (found) cache.put(key, JSON.stringify(found), 21600);
    return found;
  } catch(e) { console.error(e); return null; }
}

function getAllProjects() { return DEFAULT_PROJECTS; }
function getProjectData(projectName, page = 1, pageSize = 50) { return {}; }

// ========== CRUD TRANSAKSI (DENGAN CUSTOMER/SUPPLIER) ==========

function generateTransactionId_(ss, referal, dateStr) {
  const d = new Date();
  const prefix = referal === REFERAL_TYPES.PROJECT ? 'P' : 'T';
  const datePart = Utilities.formatDate(d, "GMT+7", "yyMMdd");
  const fullPrefix = `${prefix}${datePart}`;
  const sh = ss.getSheetByName('TRANSAKSI');
  const data = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues().flat();
  let maxCount = 0;
  data.forEach(id => {
    if (id && id.toString().startsWith(fullPrefix)) {
      const num = parseInt(id.toString().substring(7), 10);
      if (!isNaN(num) && num > maxCount) maxCount = num;
    }
  });
  return fullPrefix + ('000' + (maxCount + 1)).slice(-3);
}

function saveTransaction(obj) {
  console.log("Saving transaction: " + (obj.id || "new"));
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    requireLogin();
    Validator.required(obj.tanggal, 'Tanggal');
    const ss = SpreadsheetApp.openById(SS_ID);
    const sh = ss.getSheetByName('TRANSAKSI');
    ensureTransactionSheetStructure(ss);

    let fileUrl = obj.existingFile || "";
    if (obj.fileData) {
      try {
        const folder = DriveApp.getFolderById(FOLDER_ID);
        const blob = Utilities.newBlob(Utilities.base64Decode(obj.fileData), obj.mimeType, obj.fileName);
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileUrl = file.getUrl();
        CacheService.getScriptCache().remove(CACHE_KEYS.DRIVE_MAP);
      } catch (fileError) { console.error("Error uploading file:", fileError); }
    }

    const isEdit = !!obj.id;
    const referal = obj.referal || REFERAL_TYPES.KOPERASI;
    const trxId = isEdit ? obj.id : generateTransactionId_(ss, referal, obj.tanggal);
    const dateObj = formatDateToSheet(obj.tanggal);

    const qty = cleanRupiah(obj.qty || 0);
    const hargaSatuan = cleanRupiah(obj.hargaSatuan || 0);
    const jumlahKas = cleanRupiah(obj.jumlah);

    let areaJenis = '';
    const entityUpper = (obj.entity || '').toString().toUpperCase().trim();
    if (referal === REFERAL_TYPES.PROJECT) {
      areaJenis = 'PROJECT';
    } else if (referal === REFERAL_TYPES.KOPERASI) {
      areaJenis = entityUpper.includes('PUSAT') ? 'KOPERASI PUSAT' : 'KOPERASI CABANG';
    }
    if (!areaJenis && obj.areaJenis) areaJenis = obj.areaJenis;
    console.log("Area Jenis ditentukan: " + areaJenis + " untuk entity: " + entityUpper);

    const customerId = obj.customerId || '';
    const supplierId = obj.supplierId || '';

    const rowData = new Array(20).fill('');
    rowData[0] = '';
    rowData[TRX.ID] = trxId;
    rowData[TRX.TANGGAL] = dateObj;
    rowData[TRX.REFERAL] = referal;
    rowData[TRX.PLANTATION] = obj.entity || obj.plantation || '';
    rowData[TRX.JENIS] = obj.jenisKas || obj.jenis || '';
    rowData[TRX.KATEGORI] = obj.kategori || '';
    rowData[TRX.SKU_NAME] = obj.namaBarang || '';
    rowData[TRX.METODE_BAYAR] = obj.sumberDana || '';
    rowData[TRX.QTY] = qty;
    rowData[TRX.JUMLAH] = jumlahKas;
    rowData[TRX.FILELINK] = fileUrl;
    rowData[TRX.AKUN] = obj.akunAnggota || '';
    rowData[TRX.KETERANGAN] = obj.keterangan || '';
    rowData[TRX.LOGIN_AS] = getCurrentSession().userId || 'SYSTEM';
    rowData[TRX.LOGTIME] = new Date();
    rowData[TRX.AREA_JENIS] = areaJenis;
    rowData[TRX.HARGA_SATUAN] = hargaSatuan;
    rowData[TRX.CUSTOMER_ID] = customerId;
    rowData[TRX.SUPPLIER_ID] = supplierId;

    console.log("📝 rowData length:", rowData.length);
    console.log("📝 Customer ID:", customerId, "Supplier ID:", supplierId);

    if (isEdit) {
      const ids = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues().flat();
      const rowIndex = ids.findIndex(id => id && id.toString() === trxId);
      if (rowIndex !== -1) {
        sh.getRange(rowIndex + 2, 1, 1, rowData.length).setValues([rowData]);
        logAudit({ action: 'UPDATE_TRANSACTION', transactionId: trxId, userId: getCurrentSession().userId });
        SpreadsheetApp.flush();
        return { success: true, id: trxId };
      } else { return { success: false, error: "ID Transaksi tidak ditemukan saat Update" }; }
    } else {
      sh.appendRow(rowData);
      logAudit({ action: 'CREATE_TRANSACTION', transactionId: trxId, userId: getCurrentSession().userId });
      SpreadsheetApp.flush();
      if (referal === REFERAL_TYPES.PROJECT && obj.entity) {
        var cacheKey = 'project_trx_' + obj.entity.toString().replace(/\s/g, '_');
        CacheService.getScriptCache().remove(cacheKey);
        var summaryKey = 'project_summary_' + obj.entity.toString().replace(/\s/g, '_');
        CacheService.getScriptCache().remove(summaryKey);
      }
      return { success: true, id: trxId };
    }
  } catch (e) { console.error("Error saving transaction:", e); return handleError(e); } finally { lock.releaseLock(); }
}

function deleteTransaction(id) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    requireRole([ROLES.ADMIN]);
    const ss = SpreadsheetApp.openById(SS_ID);
    const sh = ss.getSheetByName('TRANSAKSI');
    const lastRow = sh.getLastRow();
    if (lastRow <= 1) return { success: false, error: "Tidak ada data untuk dihapus" };
    const ids = sh.getRange(2, 2, lastRow - 1, 1).getValues().flat();
    const index = ids.findIndex(x => x && x.toString() === id.toString());
    if (index !== -1) {
      var rowData = sh.getRange(index + 2, 1, 1, sh.getLastColumn()).getValues()[0];
      var projectName = rowData[TRX.PLANTATION];
      var referal = rowData[TRX.REFERAL];
      sh.deleteRow(index + 2);
      SpreadsheetApp.flush();
      logAudit({ action: 'DELETE_TRANSACTION', transactionId: id, userId: getCurrentSession().userId });
      if (referal === REFERAL_TYPES.PROJECT && projectName) {
        var cacheKey = 'project_trx_' + projectName.toString().replace(/\s/g, '_');
        CacheService.getScriptCache().remove(cacheKey);
        var summaryKey = 'project_summary_' + projectName.toString().replace(/\s/g, '_');
        CacheService.getScriptCache().remove(summaryKey);
      }
      return { success: true };
    }
    return { success: false, error: "Data tidak ditemukan" };
  } catch(e) { console.error("Error deleting transaction:", e); return handleError(e); } finally { lock.releaseLock(); }
}

// ========== CRUD ANGGOTA ==========

function saveMember(obj) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    requireRole([ROLES.ADMIN, ROLES.DIRECTOR]);
    const ss = SpreadsheetApp.openById(SS_ID);
    const sh = ss.getSheetByName('MEMBERSHIP');
    const tglLahirObj = formatDateToSheet(obj.tglLahir);
    const tglRegObj = obj.id ? null : new Date();
    if (obj.id) {
      const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().flat();
      const index = ids.findIndex(x => x && x.toString() === obj.id.toString());
      if (index !== -1) {
        let password = obj.password;
        if (password && !/^[a-f0-9]{64}$/i.test(password)) password = hashPassword(password);
        const updateData = [[obj.nama, obj.gender, obj.provinsi, obj.kota, (obj.alamat || '').substring(0, 200), obj.pekerjaan, obj.plantation, password, tglLahirObj, obj.areaJenis || '']];
        sh.getRange(index + 2, 3, 1, 10).setValues(updateData);
        logAudit({ action: 'UPDATE_MEMBER', memberId: obj.id, userId: getCurrentSession().userId });
        SpreadsheetApp.flush();
        return { success: true };
      }
      return { success: false, error: "ID Anggota tidak ditemukan" };
    } else {
      const data = sh.getRange(2, 1, sh.getLastRow() > 1 ? sh.getLastRow() - 1 : 1, 1).getValues().flat();
      const now = new Date();
      const mmyy = Utilities.formatDate(now, "GMT+7", "MMyy");
      let maxSeq = 3000;
      data.forEach(id => {
        const strId = id ? id.toString() : '';
        if (strId.includes('-')) {
          const parts = strId.split('-');
          if (parts.length === 2) {
            const seq = parseInt(parts[1], 10);
            if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
          }
        }
      });
      const newId = `${mmyy}-${("00000" + (maxSeq + 1)).slice(-5)}`;
      const hashedPass = hashPassword(obj.password);
      sh.appendRow([newId, tglRegObj, obj.nama, obj.gender, obj.provinsi, obj.kota, (obj.alamat || '').substring(0, 200), obj.pekerjaan, obj.plantation, hashedPass, tglLahirObj, '', '', obj.areaJenis || '']);
      logAudit({ action: 'CREATE_MEMBER', memberId: newId, userId: getCurrentSession().userId });
      SpreadsheetApp.flush();
      return { success: true, id: newId };
    }
  } catch (e) { console.error("Error saving member:", e); return handleError(e); } finally { lock.releaseLock(); }
}

function deleteMember(id) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    requireRole([ROLES.ADMIN]);
    const ss = SpreadsheetApp.openById(SS_ID);
    const sh = ss.getSheetByName('MEMBERSHIP');
    const lastRow = sh.getLastRow();
    if (lastRow <= 1) return { success: false, error: "Tidak ada data" };
    const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const index = ids.findIndex(x => x && x.toString() === id.toString());
    if (index !== -1) { sh.deleteRow(index + 2); SpreadsheetApp.flush(); logAudit({ action: 'DELETE_MEMBER', memberId: id, userId: getCurrentSession().userId }); return { success: true }; }
    return { success: false, error: "Data tidak ditemukan" };
  } catch(e) { console.error("Error deleting member:", e); return handleError(e); } finally { lock.releaseLock(); }
}

// ========== PUBLIC API ==========

function getPortalData() {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const memSheet = ss.getSheetByName('MEMBERSHIP');
    const totalMembers = memSheet ? Math.max(0, memSheet.getLastRow() - 1) : 0;
    const trxSheet = ss.getSheetByName('TRANSAKSI');
    const totalTransactions = trxSheet ? Math.max(0, trxSheet.getLastRow() - 1) : 0;
    return {
      companyName: 'Koperasi Syarikat Islam Mandiri',
      vision: 'Kemandirian Ekonomi Umat',
      mission: 'Membangun ekosistem bisnis terintegrasi',
      announcements: [],
      statistics: { totalMembers: totalMembers, totalTransactions: totalTransactions, lastUpdate: formatToIndoString(new Date()) },
      timestamp: new Date().toISOString()
    };
  } catch (e) { console.error("Error in getPortalData:", e); return { error: 'Gagal memuat data publik', statistics: { totalMembers: 0, totalTransactions: 0 }, timestamp: new Date().toISOString() }; }
}

// ========== ID CARD & MASTER DATA ==========

function getIdCardTemplate() {
  try {
    const file = DriveApp.getFileById(ID_CARD_CONFIG.templateId);
    const blob = file.getBlob();
    const base64 = Utilities.base64Encode(blob.getBytes());
    return { success: true, mimeType: blob.getContentType(), data: base64 };
  } catch (e) { console.error("Error loading template:", e); return { success: false, error: "Gagal load template: " + e.message }; }
}

// ========== MASTER DATA CRUD (DENGAN CUSTOMER & SUPPLIER) ==========

function getMasterData(type) {
  try {
    requireRole([ROLES.ADMIN]);
    const ss = SpreadsheetApp.openById(SS_ID);
    const sheetMap = {
      areas: 'AREAS', categories: 'CATEGORIES', products: 'MSKU', prices: 'MPRICE',
      customer: 'CUSTOMER', supplier: 'SUPPLIER'
    };
    const sheetName = sheetMap[type];
    if (!sheetName) return { headers: [], data: [] };
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return { headers: [], data: [] };
    const headers = getSheetHeaders_(sh);
    const lastRow = sh.getLastRow();
    if (lastRow <= 1) return { headers: headers, data: [] };
    const lastCol = sh.getLastColumn();
    const data = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
    return { headers: headers, data: data };
  } catch (e) { console.error("Error in getMasterData:", e); return handleError(e); }
}

function getMasterDataFiltered(type) {
  try {
    requireRole([ROLES.ADMIN]);
    const ss = SpreadsheetApp.openById(SS_ID);
    const columnConfig = { areas: ['A', 'C', 'H', 'I', 'J', 'K'], categories: ['A', 'C', 'F'] };
    const config = columnConfig[type];
    if (!config) return { headers: [], data: [] };
    const sheetName = { areas: 'AREAS', categories: 'CATEGORIES' }[type];
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return { headers: [], data: [] };
    const allHeaders = getSheetHeaders_(sh);
    const displayHeaders = [];
    const columnIndices = [];
    config.forEach(colLetter => {
      const colIndex = colLetter.charCodeAt(0) - 65;
      if (colIndex < allHeaders.length) {
        displayHeaders.push(allHeaders[colIndex]);
        columnIndices.push(colIndex);
      }
    });
    const lastRow = sh.getLastRow();
    if (lastRow <= 1) return { headers: displayHeaders, data: [] };
    const lastCol = sh.getLastColumn();
    const allData = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
    const filteredData = allData.map(row => columnIndices.map(index => row[index]));
    return { headers: displayHeaders, data: filteredData };
  } catch (e) { console.error("Error in getMasterDataFiltered:", e); return handleError(e); }
}

function getMasterDataRow(type, rowIndex) {
  try {
    requireRole([ROLES.ADMIN]);
    const ss = SpreadsheetApp.openById(SS_ID);
    const sheetMap = {
      areas: 'AREAS', categories: 'CATEGORIES', products: 'MSKU', prices: 'MPRICE',
      customer: 'CUSTOMER', supplier: 'SUPPLIER'
    };
    const sheetName = sheetMap[type];
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return null;
    const headers = getSheetHeaders_(sh);
    const actualRow = rowIndex + 2;
    if (actualRow > sh.getLastRow()) return null;
    const lastCol = sh.getLastColumn();
    const rowData = sh.getRange(actualRow, 1, 1, lastCol).getValues()[0];
    const rowObject = {};
    headers.forEach((header, index) => { if (header) rowObject[header] = rowData[index]; });
    return rowObject;
  } catch (e) { console.error("Error in getMasterDataRow:", e); return null; }
}

function saveMasterData(obj) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    requireRole([ROLES.ADMIN]);
    const ss = SpreadsheetApp.openById(SS_ID);
    const sheetMap = {
      areas: 'AREAS', categories: 'CATEGORIES', products: 'MSKU', prices: 'MPRICE',
      customer: 'CUSTOMER', supplier: 'SUPPLIER'
    };
    const sheetName = sheetMap[obj.type];
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return { success: false, error: "Sheet tidak ditemukan" };
    const headers = getSheetHeaders_(sh);
    const rowData = createRowDataFromObject_(obj.data, headers);
    if (obj.rowId !== undefined && obj.rowId !== null && obj.rowId !== '') {
      const rowNum = parseInt(obj.rowId) + 2;
      if (rowNum <= sh.getLastRow()) {
        sh.getRange(rowNum, 1, 1, headers.length).setValues([rowData]);
        logAudit({ action: 'UPDATE_MASTER_DATA', type: obj.type, rowId: obj.rowId, userId: getCurrentSession().userId });
        SpreadsheetApp.flush();
        return { success: true };
      }
      return { success: false, error: "Baris tidak ditemukan" };
    } else {
      sh.appendRow(rowData);
      logAudit({ action: 'CREATE_MASTER_DATA', type: obj.type, userId: getCurrentSession().userId });
      SpreadsheetApp.flush();
      return { success: true };
    }
  } catch (e) { console.error("Error saving master data:", e); return handleError(e); } finally { lock.releaseLock(); }
}

function deleteMasterData(type, rowIndex) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    requireRole([ROLES.ADMIN]);
    const ss = SpreadsheetApp.openById(SS_ID);
    const sheetMap = {
      areas: 'AREAS', categories: 'CATEGORIES', products: 'MSKU', prices: 'MPRICE',
      customer: 'CUSTOMER', supplier: 'SUPPLIER'
    };
    const sheetName = sheetMap[type];
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return { success: false, error: "Sheet tidak ditemukan" };
    const lastRow = sh.getLastRow();
    if (lastRow <= 1) return { success: false, error: "Tidak ada data" };
    const rowNum = rowIndex + 2;
    if (rowNum <= sh.getLastRow()) {
      sh.deleteRow(rowNum);
      SpreadsheetApp.flush();
      logAudit({ action: 'DELETE_MASTER_DATA', type: type, rowId: rowIndex, userId: getCurrentSession().userId });
      return { success: true };
    }
    return { success: false, error: "Baris tidak ditemukan" };
  } catch(e) { console.error("Error deleting master data:", e); return handleError(e); } finally { lock.releaseLock(); }
}

// =========================================================================
// ===================== MODUL LAPORAN KEUANGAN PROFESIONAL =================
// =========================================================================

function ensureCOASheet() {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('COA');
  if (!sheet) {
    sheet = ss.insertSheet('COA');
    var headers = ['KODE_AKUN', 'NAMA_AKUN', 'JENIS_AKUN', 'NORMAL_SALDO', 'KATEGORI_TRANSAKSI', 'REFERAL', 'AREA_JENIS'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    var defaultData = [
      ['1110', 'Kas', 'Aset', 'Debit', '', '', ''],
      ['1120', 'Persediaan', 'Aset', 'Debit', 'Pembelian Barang', '', ''],
      ['1210', 'Piutang Anggota', 'Aset', 'Debit', 'Penjualan Kredit', '', ''],
      ['2110', 'Simpanan Pokok', 'Ekuitas', 'Kredit', 'Simpanan Pokok', 'KOPERASI', ''],
      ['2120', 'Simpanan Wajib', 'Ekuitas', 'Kredit', 'Simpanan Wajib', 'KOPERASI', ''],
      ['2130', 'Simpanan Manasuka', 'Ekuitas', 'Kredit', 'Simpanan Manasuka', 'KOPERASI', ''],
      ['4110', 'Pendapatan Usaha', 'Pendapatan', 'Kredit', 'Pendapatan Usaha', 'KOPERASI', ''],
      ['4120', 'Pendapatan Project', 'Pendapatan', 'Kredit', 'Pendapatan Project', 'PROJECT', ''],
      ['5110', 'Beban Operasional', 'Beban', 'Debit', 'Biaya Operasional', 'KOPERASI', ''],
      ['5120', 'Beban Project', 'Beban', 'Debit', 'Biaya Project', 'PROJECT', ''],
      ['6110', 'Harga Pokok Penjualan', 'Beban', 'Debit', 'Pembelian Barang', 'PROJECT', ''],
    ];
    if (defaultData.length > 0) sheet.getRange(2, 1, defaultData.length, defaultData[0].length).setValues(defaultData);
  }
  return sheet;
}

function ensureAuditLogSheet() {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('AUDIT_LOG');
  if (!sheet) {
    sheet = ss.insertSheet('AUDIT_LOG');
    var headers = ['ID', 'TIMESTAMP', 'USER', 'ACTION', 'TABLE', 'RECORD_ID', 'OLD_DATA', 'NEW_DATA'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

function logAuditEntry(action, table, recordId, oldData, newData) {
  try {
    var sheet = ensureAuditLogSheet();
    var id = Utilities.getUuid();
    var timestamp = new Date();
    var user = getCurrentSession() ? getCurrentSession().userId : 'SYSTEM';
    var row = [id, timestamp, user, action, table, recordId, JSON.stringify(oldData), JSON.stringify(newData)];
    sheet.appendRow(row);
  } catch (e) { console.error('Error logging audit:', e); }
}

function getCOA() {
  ensureCOASheet();
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName('COA');
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  var coa = {};
  data.forEach(function(row) {
    var kode = row[0];
    if (kode) {
      coa[kode] = { kode: kode, nama: row[1], jenis: row[2], normal: row[3], kategori: row[4], referal: row[5], areaJenis: row[6] };
    }
  });
  return coa;
}

function getCoaByKategori(kategori, referal, areaJenis) {
  var coa = getCOA();
  var found = null;
  for (var k in coa) {
    var akun = coa[k];
    if (akun.kategori === kategori) {
      if (akun.referal && akun.referal !== '' && akun.referal !== referal) continue;
      if (akun.areaJenis && akun.areaJenis !== '' && akun.areaJenis !== areaJenis) continue;
      found = akun;
      break;
    }
  }
  return found;
}

function getJurnalFromTransactions(transactions, coa) {
  var jurnal = [];
  transactions.forEach(function(t) {
    var tanggal = t[TRX.TANGGAL] || new Date();
    var id = t[TRX.ID] || '';
    var ref = t[TRX.REFERAL] || 'KOPERASI';
    var areaJenis = t[TRX.AREA_JENIS] || '';
    var kategori = t[TRX.KATEGORI] || '';
    var nominal = cleanRupiah(t[TRX.JUMLAH]);
    var jenis = (t[TRX.JENIS] || '').toUpperCase();
    var akunTerkait = t[TRX.AKUN] || '';
    var akun = getCoaByKategori(kategori, ref, areaJenis);
    if (!akun) {
      if (jenis === 'MASUK') akun = { kode: '4110', nama: 'Pendapatan Usaha', jenis: 'Pendapatan', normal: 'Kredit' };
      else akun = { kode: '5110', nama: 'Beban Operasional', jenis: 'Beban', normal: 'Debit' };
    }
    var debit = 0, kredit = 0;
    if (jenis === 'MASUK') {
      if (akun.jenis === 'Ekuitas') {
        jurnal.push({ tanggal: tanggal, id: id, akun: '1110', namaAkun: 'Kas', debit: nominal, kredit: 0, keterangan: 'Penerimaan ' + kategori + ' dari ' + akunTerkait });
        jurnal.push({ tanggal: tanggal, id: id, akun: akun.kode, namaAkun: akun.nama, debit: 0, kredit: nominal, keterangan: 'Penerimaan ' + kategori + ' dari ' + akunTerkait });
      } else {
        jurnal.push({ tanggal: tanggal, id: id, akun: '1110', namaAkun: 'Kas', debit: nominal, kredit: 0, keterangan: 'Pemasukan ' + kategori });
        jurnal.push({ tanggal: tanggal, id: id, akun: akun.kode, namaAkun: akun.nama, debit: 0, kredit: nominal, keterangan: 'Pemasukan ' + kategori });
      }
    } else if (jenis === 'KELUAR') {
      if (akun.jenis === 'Aset' && akun.kode === '1120') {
        jurnal.push({ tanggal: tanggal, id: id, akun: akun.kode, namaAkun: akun.nama, debit: nominal, kredit: 0, keterangan: 'Pembelian ' + kategori });
        jurnal.push({ tanggal: tanggal, id: id, akun: '1110', namaAkun: 'Kas', debit: 0, kredit: nominal, keterangan: 'Pembelian ' + kategori });
      } else if (akun.jenis === 'Ekuitas') {
        jurnal.push({ tanggal: tanggal, id: id, akun: akun.kode, namaAkun: akun.nama, debit: nominal, kredit: 0, keterangan: 'Penarikan ' + kategori });
        jurnal.push({ tanggal: tanggal, id: id, akun: '1110', namaAkun: 'Kas', debit: 0, kredit: nominal, keterangan: 'Penarikan ' + kategori });
      } else {
        jurnal.push({ tanggal: tanggal, id: id, akun: akun.kode, namaAkun: akun.nama, debit: nominal, kredit: 0, keterangan: 'Pengeluaran ' + kategori });
        jurnal.push({ tanggal: tanggal, id: id, akun: '1110', namaAkun: 'Kas', debit: 0, kredit: nominal, keterangan: 'Pengeluaran ' + kategori });
      }
    }
  });
  return jurnal;
}

// ---------- LAPORAN ----------

function getLaporanJurnal(startDate, endDate, filter) {
  try {
    requireLogin();
    var ss = SpreadsheetApp.openById(SS_ID);
    var transaksi = getSheetDataRaw_(ss, 'TRANSAKSI');
    var start = new Date(startDate);
    var end = new Date(endDate);
    var filtered = transaksi.filter(function(row) {
      var tgl = row[TRX.TANGGAL];
      if (!tgl) return false;
      if (tgl instanceof Date) return tgl >= start && tgl <= end;
      return false;
    });
    if (filter) {
      if (filter.referal) filtered = filtered.filter(function(row) { return row[TRX.REFERAL] === filter.referal; });
      if (filter.areaJenis) filtered = filtered.filter(function(row) { return row[TRX.AREA_JENIS] === filter.areaJenis; });
    }
    var coa = getCOA();
    var jurnal = getJurnalFromTransactions(filtered, coa);
    jurnal.sort(function(a,b) { return a.tanggal - b.tanggal; });
    return jurnal;
  } catch (e) { return handleError(e); }
}

function getLaporanBukuBesar(kodeAkun, startDate, endDate) {
  try {
    var jurnal = getLaporanJurnal(startDate, endDate, {});
    var entries = jurnal.filter(function(j) { return j.akun === kodeAkun; });
    var saldo = 0;
    var result = [];
    entries.forEach(function(j) {
      var debit = j.debit || 0;
      var kredit = j.kredit || 0;
      saldo += debit - kredit;
      result.push({ tanggal: j.tanggal, id: j.id, keterangan: j.keterangan, debit: debit, kredit: kredit, saldo: saldo });
    });
    return result;
  } catch (e) { return handleError(e); }
}

function getLaporanNeracaSaldo(startDate, endDate) {
  try {
    var jurnal = getLaporanJurnal(startDate, endDate, {});
    var akunMap = {};
    jurnal.forEach(function(j) {
      var kode = j.akun;
      if (!akunMap[kode]) akunMap[kode] = { debit: 0, kredit: 0, nama: j.namaAkun };
      akunMap[kode].debit += j.debit || 0;
      akunMap[kode].kredit += j.kredit || 0;
    });
    var result = [];
    for (var k in akunMap) {
      result.push({ kode: k, nama: akunMap[k].nama, debit: akunMap[k].debit, kredit: akunMap[k].kredit });
    }
    return result;
  } catch (e) { return handleError(e); }
}

function getLaporanLabaRugi(startDate, endDate) {
  try {
    var coa = getCOA();
    var jurnal = getLaporanJurnal(startDate, endDate, {});
    var pendapatan = 0, beban = 0;
    jurnal.forEach(function(j) {
      var akun = coa[j.akun];
      if (akun) {
        if (akun.jenis === 'Pendapatan') pendapatan += j.kredit - j.debit;
        else if (akun.jenis === 'Beban') beban += j.debit - j.kredit;
      }
    });
    var labaRugi = pendapatan - beban;
    return { pendapatan: pendapatan, beban: beban, labaRugi: labaRugi, detailPendapatan: getDetailAkun(jurnal, 'Pendapatan'), detailBeban: getDetailAkun(jurnal, 'Beban') };
  } catch (e) { return handleError(e); }
}

function getDetailAkun(jurnal, jenis) {
  var coa = getCOA();
  var map = {};
  jurnal.forEach(function(j) {
    var akun = coa[j.akun];
    if (akun && akun.jenis === jenis) {
      var kode = j.akun;
      if (!map[kode]) map[kode] = { nama: akun.nama, saldo: 0 };
      if (jenis === 'Pendapatan') map[kode].saldo += j.kredit - j.debit;
      else if (jenis === 'Beban') map[kode].saldo += j.debit - j.kredit;
    }
  });
  return map;
}

function getLaporanNeraca(startDate, endDate) {
  try {
    var coa = getCOA();
    var neracaSaldo = getLaporanNeracaSaldo(startDate, endDate);
    var aset = 0, liabilitas = 0, ekuitas = 0;
    var detailAset = [], detailLiabilitas = [], detailEkuitas = [];
    neracaSaldo.forEach(function(item) {
      var akun = coa[item.kode];
      if (akun) {
        var saldo = item.debit - item.kredit;
        if (akun.jenis === 'Aset') { aset += saldo; detailAset.push({kode: item.kode, nama: item.nama, saldo: saldo}); }
        else if (akun.jenis === 'Liabilitas') { liabilitas += saldo; detailLiabilitas.push({kode: item.kode, nama: item.nama, saldo: saldo}); }
        else if (akun.jenis === 'Ekuitas') { ekuitas += saldo; detailEkuitas.push({kode: item.kode, nama: item.nama, saldo: saldo}); }
      }
    });
    return { aset: aset, liabilitas: liabilitas, ekuitas: ekuitas, detailAset: detailAset, detailLiabilitas: detailLiabilitas, detailEkuitas: detailEkuitas };
  } catch (e) { return handleError(e); }
}

function getLaporanArusKas(startDate, endDate) {
  try {
    var transaksi = getSheetDataRaw_(SpreadsheetApp.openById(SS_ID), 'TRANSAKSI');
    var start = new Date(startDate);
    var end = new Date(endDate);
    var filtered = transaksi.filter(function(row) {
      var tgl = row[TRX.TANGGAL];
      if (!tgl) return false;
      if (tgl instanceof Date) return tgl >= start && tgl <= end;
      return false;
    });
    var arus = { operasi: 0, investasi: 0, pendanaan: 0, detailOperasi: [], detailInvestasi: [], detailPendanaan: [] };
    filtered.forEach(function(t) {
      var nominal = cleanRupiah(t[TRX.JUMLAH]);
      var jenis = (t[TRX.JENIS] || '').toUpperCase();
      var kategori = (t[TRX.KATEGORI] || '').toUpperCase();
      var area = (t[TRX.AREA_JENIS] || '').toUpperCase();
      var isOperasi = true;
      if (area.includes('PROJECT')) isOperasi = false;
      if (kategori.includes('SIMPANAN')) { isOperasi = false; arus.pendanaan += (jenis === 'MASUK' ? nominal : -nominal); }
      else if (isOperasi) { arus.operasi += (jenis === 'MASUK' ? nominal : -nominal); arus.detailOperasi.push({ id: t[TRX.ID], kategori: kategori, nominal: nominal, jenis: jenis }); }
      else { arus.investasi += (jenis === 'MASUK' ? nominal : -nominal); arus.detailInvestasi.push({ id: t[TRX.ID], kategori: kategori, nominal: nominal, jenis: jenis }); }
    });
    return arus;
  } catch (e) { return handleError(e); }
}

function getLaporanSHU(startDate, endDate) {
  try {
    var labaRugi = getLaporanLabaRugi(startDate, endDate);
    var laba = labaRugi.labaRugi;
    var cadangan = laba * 0.25;
    var shu = laba - cadangan;
    return { labaBersih: laba, cadangan: cadangan, shu: shu };
  } catch (e) { return handleError(e); }
}

function getLaporanRekap(level, startDate, endDate) {
  try {
    var transaksi = getSheetDataRaw_(SpreadsheetApp.openById(SS_ID), 'TRANSAKSI');
    var start = new Date(startDate);
    var end = new Date(endDate);
    var filtered = transaksi.filter(function(row) {
      var tgl = row[TRX.TANGGAL];
      if (!tgl) return false;
      if (tgl instanceof Date) return tgl >= start && tgl <= end;
      return false;
    });
    var rekap = {};
    filtered.forEach(function(t) {
      var key = '';
      if (level === 'PROJECT') key = (t[TRX.AREA_JENIS] || '').toUpperCase() === 'PROJECT' ? t[TRX.PLANTATION] : '';
      else if (level === 'CABANG') key = (t[TRX.AREA_JENIS] || '').toUpperCase() === 'KOPERASI CABANG' ? t[TRX.PLANTATION] : '';
      else if (level === 'PLANTATION') key = t[TRX.PLANTATION] || '';
      if (!key) return;
      if (!rekap[key]) rekap[key] = { masuk: 0, keluar: 0 };
      var nominal = cleanRupiah(t[TRX.JUMLAH]);
      if ((t[TRX.JENIS] || '').toUpperCase() === 'MASUK') rekap[key].masuk += nominal;
      else rekap[key].keluar += nominal;
    });
    var result = [];
    for (var k in rekap) {
      result.push({ nama: k, masuk: rekap[k].masuk, keluar: rekap[k].keluar, saldo: rekap[k].masuk - rekap[k].keluar });
    }
    return result;
  } catch (e) { return handleError(e); }
}

function getLaporanAnalitik(startDate, endDate) {
  try {
    var transaksi = getSheetDataRaw_(SpreadsheetApp.openById(SS_ID), 'TRANSAKSI');
    var start = new Date(startDate);
    var end = new Date(endDate);
    var filtered = transaksi.filter(function(row) {
      var tgl = row[TRX.TANGGAL];
      if (!tgl) return false;
      if (tgl instanceof Date) return tgl >= start && tgl <= end;
      return false;
    });
    var pendapatanBulanan = {};
    var bebanBulanan = {};
    filtered.forEach(function(t) {
      var tgl = t[TRX.TANGGAL];
      if (!tgl) return;
      var bulan = Utilities.formatDate(tgl, "GMT+7", "yyyy-MM");
      var nominal = cleanRupiah(t[TRX.JUMLAH]);
      var jenis = (t[TRX.JENIS] || '').toUpperCase();
      if (jenis === 'MASUK') pendapatanBulanan[bulan] = (pendapatanBulanan[bulan] || 0) + nominal;
      else bebanBulanan[bulan] = (bebanBulanan[bulan] || 0) + nominal;
    });
    var topKategori = {};
    filtered.forEach(function(t) {
      var kat = t[TRX.KATEGORI] || '';
      var nominal = cleanRupiah(t[TRX.JUMLAH]);
      var jenis = (t[TRX.JENIS] || '').toUpperCase();
      if (!topKategori[kat]) topKategori[kat] = { masuk: 0, keluar: 0 };
      if (jenis === 'MASUK') topKategori[kat].masuk += nominal;
      else topKategori[kat].keluar += nominal;
    });
    var sortedKategori = Object.keys(topKategori).sort(function(a,b) {
      return (topKategori[b].masuk - topKategori[b].keluar) - (topKategori[a].masuk - topKategori[a].keluar);
    }).slice(0, 10);
    var top10 = sortedKategori.map(function(k) { return { kategori: k, saldo: topKategori[k].masuk - topKategori[k].keluar }; });
    return { pendapatanBulanan: pendapatanBulanan, bebanBulanan: bebanBulanan, topKategori: top10 };
  } catch (e) { return handleError(e); }
}

// =========================================================================
// ===================== DATA PORTOFOLIO & MARKETPLACE =====================
// =========================================================================

function getPortfolioData() {
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    var areas = getSheetDataRaw_(ss, 'AREAS');
    var transaksi = getSheetDataRaw_(ss, 'TRANSAKSI');
    var projects = [];
    var totalProjects = 0;
    var totalValue = 0;
    var commodities = new Set();
    areas.forEach(function(row) {
      var referal = (row[AREAS_COLS.REFERAL] || '').toString().toUpperCase().trim();
      var entity = (row[AREAS_COLS.ENTITY] || '').toString().trim();
      if (referal === 'PROJECT' && entity) {
        var projectTrx = transaksi.filter(function(t) {
          var areaJenis = (t[TRX.AREA_JENIS] || '').toString().toUpperCase().trim();
          var plantation = (t[TRX.PLANTATION] || '').toString().trim();
          return areaJenis === 'PROJECT' && plantation === entity;
        });
        var totalMasuk = 0, totalKeluar = 0;
        projectTrx.forEach(function(t) {
          var nominal = cleanRupiah(t[TRX.JUMLAH]);
          if ((t[TRX.JENIS] || '').toString().toUpperCase() === 'MASUK') totalMasuk += nominal;
          else totalKeluar += nominal;
        });
        var saldo = totalMasuk - totalKeluar;
        var komoditas = [];
        projectTrx.forEach(function(t) {
          var sku = t[TRX.SKU_NAME] || '';
          if (sku) komoditas.push(sku);
        });
        if (komoditas.length > 0) { komoditas = [...new Set(komoditas)]; komoditas.forEach(function(k) { commodities.add(k); }); }
        projects.push({ name: entity, totalMasuk: totalMasuk, totalKeluar: totalKeluar, saldo: saldo, transaksiCount: projectTrx.length, komoditas: komoditas.slice(0,3) });
        totalProjects++;
        totalValue += saldo;
      }
    });
    var stats = { totalProjects: totalProjects, totalValue: totalValue, commodityCount: commodities.size };
    return { projects: projects, stats: stats };
  } catch(e) { console.error('getPortfolioData error:', e); return { projects: [], stats: {} }; }
}

function getMarketplaceData() {
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    var msku = getSheetDataRaw_(ss, 'MSKU');
    var products = [];
    msku.forEach(function(row) {
      var name = (row[MSKU_COLS.SKUNAME] || '').toString().trim();
      var category = (row[MSKU_COLS.GROUP] || '').toString().trim();
      var sku = (row[MSKU_COLS.SKUID] || '').toString().trim();
      if (name) {
        products.push({ name: name, category: category, sku: sku, grade: 'Premium', packaging: 'Standar', availability: 'Tersedia', moq: 100, supplyCapacity: '5000 unit/bulan' });
      }
    });
    var categories = [...new Set(products.map(p => p.category))];
    return { products: products, categories: categories };
  } catch(e) { console.error('getMarketplaceData error:', e); return { products: [], categories: [] }; }
}

// =====================================================================
// ================ FITUR PENDAFTARAN ANGGOTA BARU ====================
// =====================================================================

function processForm(formObject) {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    if (!folder) throw new Error('Folder tujuan upload tidak ditemukan.');
    const ss = SpreadsheetApp.openById(SS_ID);
    let sheet = ss.getSheetByName('Pendaftaran');
    if (!sheet) {
      sheet = ss.insertSheet('Pendaftaran');
      const headers = [
        'Timestamp', 'ID Anggota', 'Nama Lengkap', 'NIK', 'Tempat Lahir',
        'Tanggal Lahir', 'Jenis Kelamin', 'Alamat', 'Kota', 'Provinsi',
        'WhatsApp', 'Email', 'Status Anggota', 'Profesi',
        'Jenis Simpanan', 'Jumlah Transfer', 'Tanggal Transfer',
        'URL Bukti Transfer', 'URL KTP', 'Selfie', 'Persetujuan',
        'Status Verifikasi'
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    function uploadFile(fileData, baseFileName) {
      if (!fileData || fileData === '') return '';
      const base64Length = fileData.length - fileData.indexOf(',') - 1;
      const fileSizeBytes = Math.ceil(base64Length * 0.75);
      if (fileSizeBytes > 2 * 1024 * 1024) throw new Error('Ukuran file terlalu besar (maks 2MB)');
      let mimeType = fileData.substring(fileData.indexOf(":") + 1, fileData.indexOf(";"));
      let allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(mimeType)) throw new Error('Tipe file tidak diizinkan: ' + mimeType);
      let extension = '';
      if (mimeType === 'image/jpeg') extension = '.jpg';
      else if (mimeType === 'image/png') extension = '.png';
      else if (mimeType === 'application/pdf') extension = '.pdf';
      let safeFileName = baseFileName.replace(/[^a-zA-Z0-9]/g, '_') + '_' + new Date().getTime() + extension;
      let base64 = fileData.substring(fileData.indexOf(",") + 1);
      let blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, safeFileName);
      let file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return file.getUrl();
    }
    if (!formObject.namaLengkap) throw new Error('Nama lengkap wajib diisi.');
    if (!/^\d{16}$/.test(formObject.nik)) throw new Error('NIK harus 16 digit angka.');
    if (!formObject.tempatLahir) throw new Error('Tempat lahir wajib diisi.');
    if (!formObject.tanggalLahir) throw new Error('Tanggal lahir wajib diisi.');
    if (!formObject.alamat) throw new Error('Alamat wajib diisi.');
    if (!formObject.kota) throw new Error('Kota wajib diisi.');
    if (!formObject.provinsi) throw new Error('Provinsi wajib diisi.');
    if (!formObject.whatsapp) throw new Error('Nomor WhatsApp wajib diisi.');
    if (!formObject.statusAnggota) throw new Error('Status anggota wajib dipilih.');
    if (!formObject.profesi) throw new Error('Profesi wajib diisi.');
    if (!formObject.jenisSimpanan) throw new Error('Jenis simpanan wajib dipilih.');
    const jumlahTransfer = parseFloat(formObject.jumlahTransfer);
    if (isNaN(jumlahTransfer) || jumlahTransfer < 860000) throw new Error('Jumlah transfer minimal Rp 860.000');
    if (!formObject.tanggalTransfer) throw new Error('Tanggal transfer wajib diisi.');
    let urlKTP = '';
    if (formObject.fileKTP) { urlKTP = uploadFile(formObject.fileKTP, 'KTP_' + formObject.namaLengkap); } else { throw new Error('File KTP wajib diupload.'); }
    let urlBukti = '';
    if (formObject.fileBukti) {
      if (Array.isArray(formObject.fileBukti)) {
        let urls = [];
        for (let i = 0; i < formObject.fileBukti.length; i++) {
          let fileData = formObject.fileBukti[i];
          if (fileData) {
            let url = uploadFile(fileData, 'Bukti_' + formObject.namaLengkap + '_' + (i+1));
            if (url) urls.push(url);
          }
        }
        urlBukti = urls.join(', ');
      } else if (typeof formObject.fileBukti === 'string' && formObject.fileBukti !== '') {
        urlBukti = uploadFile(formObject.fileBukti, 'Bukti_' + formObject.namaLengkap);
      }
    }
    if (!urlBukti) throw new Error('Bukti transfer wajib diupload.');
    const idSementara = 'PENDING-' + Utilities.getUuid().substring(0, 8);
    const rowData = [
      new Date(), idSementara, formObject.namaLengkap, formObject.nik,
      formObject.tempatLahir, formObject.tanggalLahir, formObject.jenisKelamin || '',
      formObject.alamat, formObject.kota, formObject.provinsi,
      formObject.whatsapp, formObject.email || '', formObject.statusAnggota,
      formObject.profesi, formObject.jenisSimpanan, jumlahTransfer,
      formObject.tanggalTransfer, urlBukti, urlKTP, '', 'Setuju', 'Pending Verifikasi'
    ];
    sheet.appendRow(rowData);
    return 'SUCCESS';
  } catch (error) {
    console.error('Error in processForm:', error);
    return 'ERROR: ' + error.toString();
  }
}