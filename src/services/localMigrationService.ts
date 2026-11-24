import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  dataUrlToFile,
  getPublicProofUrl,
  uploadMemberProof,
} from './storageService';
import { mapTransactionRecordToSupabaseRow } from './transactionService';

export interface LegacyIndexedDbEntry {
  dbName: string;
  storeName: string;
  records: any[];
}

export interface LegacyLocalScanSummary {
  scannedAt: string;
  hasAnyData: boolean;
  totalRecords: number;
  totalAttachments: number;
  counts: {
    members: number;
    transactions: number;
    investments: number;
    loans: number;
    payments: number;
    news: number;
    projectUpdates: number;
    notifications: number;
    auditLogs: number;
    otherKeys: number;
    indexedDbRecords: number;
  };
  rawPayload: {
    members: any[];
    avatars: Record<string, string>;
    transactions: any[];
    investments: any[];
    campaigns: any[];
    agreements: any[];
    dividends: any[];
    loans: any[];
    payments: any[];
    news: any[];
    projectUpdates: any[];
    notifications: any[];
    notificationJobs: any[];
    auditLogs: any[];
    masterTables: Record<string, any[]>;
    otherKeys: Record<string, any>;
    indexedDb: LegacyIndexedDbEntry[];
  };
}

export interface MigrationProgress {
  step: string;
  current: number;
  total: number;
  percent: number;
  message: string;
}

export interface MigrationExecutionResult {
  success: boolean;
  inserted: number;
  updated: number;
  uploadedProofs: number;
  skippedDuplicates: number;
  failed: number;
  errors: string[];
  details: string[];
}

const KNOWN_LOCAL_KEYS = [
  'KOPSIM_MEMBERS_DATA',
  'KOPSIM_TRANSACTIONS_DATA',
  'kopsim_investment_campaigns_cache',
  'kopsim_investment_transactions_cache',
  'kopsim_digital_agreements_cache',
  'kopsim_investment_dividends_cache',
  'kopsim_news_articles_v2',
  'KOPSIM_LOCAL_AUDIT_LOGS',
  'kopsim_loan_applications',
  'kopsim_payment_requests',
  'kopsim_notification_jobs',
  'kopsim_user_notifications',
  'kopsim_project_updates_cache',
  'kopsim_master_products_v2',
  'KOPSIM_MEMBER_SESSION',
];

function safeReadLocalArray(key: string): any[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function countDataUrlFields(obj: any): number {
  if (!obj || typeof obj !== 'object') return 0;
  let total = 0;
  const attachmentFields = [
    'filelink',
    'file_url',
    'bukti_url',
    'payment_proof_url',
    'transfer_proof_url',
    'avatar_url',
    'foto_url',
    'ktp_url',
    'selfie_url',
  ];
  for (const f of attachmentFields) {
    const val = obj[f];
    if (typeof val === 'string' && val.trim().startsWith('data:')) {
      total++;
    }
  }
  return total;
}

async function readAllLegacyIndexedDb(): Promise<LegacyIndexedDbEntry[]> {
  if (typeof window === 'undefined' || !window.indexedDB) return [];
  try {
    const idbAny = window.indexedDB as any;
    if (typeof idbAny.databases !== 'function') return [];
    const dbs: Array<{ name?: string }> = await idbAny.databases();
    const results: LegacyIndexedDbEntry[] = [];

    for (const dbInfo of dbs) {
      const dbName = dbInfo.name;
      if (!dbName || !dbName.toLowerCase().includes('kopsim')) continue;

      await new Promise<void>((resolve) => {
        try {
          const req = window.indexedDB.open(dbName);
          req.onerror = () => resolve();
          req.onsuccess = () => {
            const db = req.result;
            const storeNames = Array.from(db.objectStoreNames || []);
            if (storeNames.length === 0) {
              db.close();
              resolve();
              return;
            }
            let pending = storeNames.length;
            for (const storeName of storeNames) {
              try {
                const tx = db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const getAllReq = store.getAll();
                getAllReq.onsuccess = () => {
                  const records = Array.isArray(getAllReq.result) ? getAllReq.result : [];
                  if (records.length > 0) {
                    results.push({ dbName, storeName, records });
                  }
                  pending--;
                  if (pending === 0) {
                    db.close();
                    resolve();
                  }
                };
                getAllReq.onerror = () => {
                  pending--;
                  if (pending === 0) {
                    db.close();
                    resolve();
                  }
                };
              } catch {
                pending--;
                if (pending === 0) {
                  db.close();
                  resolve();
                }
              }
            }
          };
        } catch {
          resolve();
        }
      });
    }
    return results;
  } catch {
    return [];
  }
}

async function uploadAttachmentIfDataUrl(
  rawValue: string | undefined | null,
  folder: 'migrasi' | 'avatar' | 'berita',
  refId: string
): Promise<{ url: string; uploaded: boolean; error?: string }> {
  if (!rawValue || typeof rawValue !== 'string') {
    return { url: '', uploaded: false };
  }
  const trimmed = rawValue.trim();
  if (!trimmed) return { url: '', uploaded: false };

  if (trimmed.startsWith('data:')) {
    const file = dataUrlToFile(trimmed, `${folder}_${refId}`);
    if (!file) {
      return { url: '', uploaded: false, error: `Lampiran base64 untuk ${refId} korup/tidak valid.` };
    }
    const uploadRes = await uploadMemberProof(file, folder, refId, file.name);
    if (!uploadRes.success || !uploadRes.fileUrl) {
      return {
        url: '',
        uploaded: false,
        error: uploadRes.error || `Gagal unggah lampiran ${refId} ke bucket bukti-transfer.`,
      };
    }
    return { url: uploadRes.fileUrl, uploaded: true };
  }

  // URL valid Supabase Storage dipertahankan, URL non-Supabase/Drive dibersihkan
  const cleanPublic = getPublicProofUrl(trimmed);
  return { url: cleanPublic, uploaded: false };
}

export const localMigrationService = {
  /**
   * Memindai data legacy yang masih tersisa di browser (localStorage / IndexedDB) untuk keperluan migrasi Admin.
   */
  async scanLegacyBrowserData(): Promise<LegacyLocalScanSummary> {
    const members = safeReadLocalArray('KOPSIM_MEMBERS_DATA');
    const transactions = safeReadLocalArray('KOPSIM_TRANSACTIONS_DATA');
    const investments = safeReadLocalArray('kopsim_investment_transactions_cache');
    const campaigns = safeReadLocalArray('kopsim_investment_campaigns_cache');
    const agreements = safeReadLocalArray('kopsim_digital_agreements_cache');
    const dividends = safeReadLocalArray('kopsim_investment_dividends_cache');
    const news = safeReadLocalArray('kopsim_news_articles_v2');
    const auditLogs = safeReadLocalArray('KOPSIM_LOCAL_AUDIT_LOGS');
    const loans = safeReadLocalArray('kopsim_loan_applications');
    const payments = safeReadLocalArray('kopsim_payment_requests');
    const notificationJobs = safeReadLocalArray('kopsim_notification_jobs');
    const notifications = safeReadLocalArray('kopsim_user_notifications');
    const projectUpdates = safeReadLocalArray('kopsim_project_updates_cache');

    const avatars: Record<string, string> = {};
    const masterTables: Record<string, any[]> = {};
    const otherKeys: Record<string, any> = {};

    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        if (key.startsWith('KOPSIM_AVATAR_')) {
          const memberId = key.replace('KOPSIM_AVATAR_', '');
          const val = window.localStorage.getItem(key);
          if (val) avatars[memberId] = val;
        } else if (key.startsWith('KOPSIM_TABLE_')) {
          const tblName = key.replace('KOPSIM_TABLE_', '');
          masterTables[tblName] = safeReadLocalArray(key);
        } else if (
          (key.toLowerCase().includes('kopsim') || key.toLowerCase().includes('simpanan')) &&
          !KNOWN_LOCAL_KEYS.includes(key)
        ) {
          const val = window.localStorage.getItem(key);
          if (val) {
            try {
              otherKeys[key] = JSON.parse(val);
            } catch {
              otherKeys[key] = val;
            }
          }
        }
      }
    }

    const indexedDb = await readAllLegacyIndexedDb();
    const indexedDbRecords = indexedDb.reduce((sum, item) => sum + item.records.length, 0);

    let totalAttachments = Object.values(avatars).filter((v) => v.startsWith('data:')).length;
    [members, transactions, investments, news, projectUpdates].forEach((list) => {
      list.forEach((row) => {
        totalAttachments += countDataUrlFields(row);
      });
    });

    const otherKeyCount = Object.keys(otherKeys).length + Object.keys(masterTables).length;
    const totalRecords =
      members.length +
      transactions.length +
      investments.length +
      loans.length +
      payments.length +
      news.length +
      projectUpdates.length +
      notifications.length +
      auditLogs.length +
      indexedDbRecords;

    return {
      scannedAt: new Date().toISOString(),
      hasAnyData: totalRecords > 0 || totalAttachments > 0 || otherKeyCount > 0,
      totalRecords,
      totalAttachments,
      counts: {
        members: members.length,
        transactions: transactions.length,
        investments: investments.length,
        loans: loans.length,
        payments: payments.length,
        news: news.length,
        projectUpdates: projectUpdates.length,
        notifications: notifications.length,
        auditLogs: auditLogs.length,
        otherKeys: otherKeyCount,
        indexedDbRecords,
      },
      rawPayload: {
        members,
        avatars,
        transactions,
        investments,
        campaigns,
        agreements,
        dividends,
        loans,
        payments,
        news,
        projectUpdates,
        notifications,
        notificationJobs,
        auditLogs,
        masterTables,
        otherKeys,
        indexedDb,
      },
    };
  },

  /**
   * Mengekspor seluruh data lokal browser menjadi file cadangan JSON sebelum proses migrasi.
   */
  async exportLocalBackupJson(existingScan?: LegacyLocalScanSummary): Promise<{ filename: string; totalRecords: number }> {
    const summary = existingScan || (await this.scanLegacyBrowserData());
    const dateStamp = new Date().toISOString().split('T')[0];
    const filename = `kopsim-cadangan-lokal-${dateStamp}.json`;

    const backupObject = {
      app: 'KOPSIM Mandiri',
      exported_at: new Date().toISOString(),
      summary: summary.counts,
      total_records: summary.totalRecords,
      total_attachments: summary.totalAttachments,
      data: summary.rawPayload,
    };

    if (typeof window !== 'undefined') {
      const jsonString = JSON.stringify(backupObject, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    return { filename, totalRecords: summary.totalRecords };
  },

  /**
   * Memigrasikan seluruh data lokal browser ke Supabase Postgres + Supabase Storage ('bukti-transfer') tanpa duplikat.
   */
  async migrateLocalDataToSupabase(
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationExecutionResult> {
    const client = getSupabaseClient();
    if (!isSupabaseConfigured || !client) {
      return {
        success: false,
        inserted: 0,
        updated: 0,
        uploadedProofs: 0,
        skippedDuplicates: 0,
        failed: 1,
        errors: ['Supabase belum dikonfigurasi. Pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY aktif.'],
        details: [],
      };
    }

    const scan = await this.scanLegacyBrowserData();
    const {
      members,
      avatars,
      transactions,
      investments,
      loans,
      payments,
      news,
      projectUpdates,
      notifications,
    } = scan.rawPayload;

    const totalItems =
      members.length +
      transactions.length +
      investments.length +
      loans.length +
      payments.length +
      news.length +
      projectUpdates.length +
      notifications.length;

    let currentItem = 0;
    const emit = (step: string, message: string) => {
      if (!onProgress) return;
      const total = Math.max(totalItems, 1);
      const percent = Math.min(100, Math.round((currentItem / total) * 100));
      onProgress({ step, current: currentItem, total: totalItems, percent, message });
    };

    const result: MigrationExecutionResult = {
      success: true,
      inserted: 0,
      updated: 0,
      uploadedProofs: 0,
      skippedDuplicates: 0,
      failed: 0,
      errors: [],
      details: [],
    };

    if (totalItems === 0 && Object.keys(avatars).length === 0) {
      emit('SELESAI', 'Tidak ditemukan data lokal browser yang perlu dimigrasikan.');
      result.details.push('Penyimpanan lokal browser sudah bersih.');
      return result;
    }

    // ------------------------------------------------------------------
    // 1. MIGRASI ANGGOTA (members + avatar_url ke Storage)
    // ------------------------------------------------------------------
    emit('ANGGOTA', 'Memeriksa data anggota di Supabase...');
    const existingMemberNos = new Set<string>();
    const existingNiks = new Set<string>();
    const { data: dbMembers } = await client.from('members').select('id, member_no, nik, avatar_url');
    if (Array.isArray(dbMembers)) {
      dbMembers.forEach((m: any) => {
        if (m.member_no) existingMemberNos.add(String(m.member_no).trim());
        if (m.id) existingMemberNos.add(String(m.id).trim());
        if (m.nik) existingNiks.add(String(m.nik).trim());
      });
    }

    for (const m of members) {
      currentItem++;
      const memberNo = String(m.id || m.member_no || '').trim();
      const nik = String(m.nik || '').trim();
      emit('ANGGOTA', `Memproses anggota ${memberNo || m.nama}...`);

      const rawAvatar = avatars[memberNo] || m.avatar_url || '';
      const avatarUpload = await uploadAttachmentIfDataUrl(rawAvatar, 'avatar', memberNo || 'MEMBER');
      if (avatarUpload.uploaded) result.uploadedProofs++;
      if (avatarUpload.error) result.errors.push(avatarUpload.error);

      if ((memberNo && existingMemberNos.has(memberNo)) || (nik && existingNiks.has(nik))) {
        if (avatarUpload.uploaded && avatarUpload.url && memberNo) {
          await client.from('members').update({ avatar_url: avatarUpload.url }).eq('member_no', memberNo);
          result.updated++;
        } else {
          result.skippedDuplicates++;
        }
        continue;
      }

      const payload = {
        id: memberNo || undefined,
        member_no: memberNo,
        registered_at: m.tanggal_daftar || new Date().toISOString().split('T')[0],
        full_name: m.nama || 'Anggota KOPSIM',
        gender: m.jk === 'P' ? 'P' : 'L',
        province: m.provinsi || 'DKI Jakarta',
        city: m.kota || 'Jakarta',
        address: m.alamat || '',
        occupation: m.pekerjaan || 'Anggota',
        username: m.username || memberNo,
        birth_date: m.tgl_lahir || '1990-01-01',
        birth_place: m.tempat_lahir || 'Jakarta',
        nik: nik || `0000000000${Date.now().toString().slice(-6)}`,
        work_area: m.plantation || 'PUSAT JAKARTA',
        avatar_url: avatarUpload.url || '',
        status: m.status || 'AKTIF',
      };

      const { error } = await client.from('members').insert([payload]);
      if (error) {
        result.failed++;
        result.errors.push(`Anggota ${memberNo}: ${error.message}`);
      } else {
        result.inserted++;
        if (memberNo) existingMemberNos.add(memberNo);
        if (nik) existingNiks.add(nik);
      }
    }

    // ------------------------------------------------------------------
    // 2. MIGRASI TRANSAKSI & BUKTI TRANSFER (transactions + Storage)
    // ------------------------------------------------------------------
    emit('TRANSAKSI', 'Memeriksa buku transaksi di Supabase...');
    const existingTrxMap = new Map<string, { bukti_url?: string; file_url?: string }>();
    const { data: dbTrxs } = await client
      .from('transactions')
      .select('id, transaction_no, file_url, bukti_url');
    if (Array.isArray(dbTrxs)) {
      dbTrxs.forEach((row: any) => {
        if (row.transaction_no) existingTrxMap.set(String(row.transaction_no).trim(), row);
        if (row.id) existingTrxMap.set(String(row.id).trim(), row);
      });
    }

    for (const trx of transactions) {
      currentItem++;
      const trxNo = String(trx.id || trx.transaction_no || '').trim();
      if (!trxNo) {
        result.failed++;
        continue;
      }
      emit('TRANSAKSI', `Memproses transaksi ${trxNo}...`);

      const rawAttachment = trx.bukti_url || trx.filelink || trx.file_url || '';
      const proofUpload = await uploadAttachmentIfDataUrl(rawAttachment, 'migrasi', trxNo);
      if (proofUpload.uploaded) result.uploadedProofs++;
      if (proofUpload.error) result.errors.push(proofUpload.error);

      const existingRow = existingTrxMap.get(trxNo);
      if (existingRow) {
        const existingHasProof = Boolean(
          getPublicProofUrl(existingRow.bukti_url || existingRow.file_url)
        );
        if (!existingHasProof && proofUpload.url) {
          let { error: upErr } = await client
            .from('transactions')
            .update({ bukti_url: proofUpload.url, file_url: proofUpload.url })
            .eq('transaction_no', trxNo);
          if (upErr && upErr.message?.includes('bukti_url')) {
            const retry = await client
              .from('transactions')
              .update({ file_url: proofUpload.url })
              .eq('transaction_no', trxNo);
            upErr = retry.error;
          }
          if (upErr) {
            result.failed++;
            result.errors.push(`Update bukti ${trxNo}: ${upErr.message}`);
          } else {
            result.updated++;
          }
        } else {
          result.skippedDuplicates++;
        }
        continue;
      }

      const dbRow = mapTransactionRecordToSupabaseRow({
        ...trx,
        id: trxNo,
        filelink: proofUpload.url,
        bukti_url: proofUpload.url,
      });

      let { error } = await client.from('transactions').insert([dbRow]);
      if (error && error.message?.includes('bukti_url')) {
        const safeRow = { ...dbRow };
        delete safeRow.bukti_url;
        const retry = await client.from('transactions').insert([safeRow]);
        error = retry.error;
      }

      if (error) {
        result.failed++;
        result.errors.push(`Transaksi ${trxNo}: ${error.message}`);
      } else {
        result.inserted++;
        existingTrxMap.set(trxNo, { bukti_url: proofUpload.url, file_url: proofUpload.url });
      }
    }

    // ------------------------------------------------------------------
    // 3. MIGRASI INVESTASI PROYEK (investment_transactions)
    // ------------------------------------------------------------------
    if (investments.length > 0) {
      emit('INVESTASI', 'Memeriksa transaksi investasi di Supabase...');
      const existingInvNos = new Set<string>();
      const { data: dbInvs } = await client.from('investment_transactions').select('transaction_no');
      if (Array.isArray(dbInvs)) {
        dbInvs.forEach((r: any) => r.transaction_no && existingInvNos.add(String(r.transaction_no).trim()));
      }

      for (const inv of investments) {
        currentItem++;
        const invNo = String(inv.transaction_no || inv.id || '').trim();
        emit('INVESTASI', `Memproses investasi ${invNo}...`);
        if (invNo && existingInvNos.has(invNo)) {
          result.skippedDuplicates++;
          continue;
        }
        const proofUpload = await uploadAttachmentIfDataUrl(
          inv.bukti_url || inv.payment_proof_url,
          'migrasi',
          invNo || 'INV'
        );
        if (proofUpload.uploaded) result.uploadedProofs++;
        if (proofUpload.error) result.errors.push(proofUpload.error);

        const row: Record<string, any> = {
          transaction_no: invNo,
          campaign_id: inv.campaign_id,
          project_id: inv.project_id,
          member_no: inv.member_no,
          investor_name: inv.investor_name,
          investor_email: inv.investor_email || '',
          investor_phone: inv.investor_phone || '',
          amount: Number(inv.amount) || 0,
          units_count: Number(inv.units_count) || 1,
          platform_fee: Number(inv.platform_fee) || 0,
          total_payment: Number(inv.total_payment || inv.amount) || 0,
          payment_method: inv.payment_method || 'TRANSFER_BANK',
          payment_proof_url: proofUpload.url,
          bukti_url: proofUpload.url,
          status: inv.status || 'PENDING',
          notes: inv.notes || '',
        };

        let { error } = await client.from('investment_transactions').insert([row]);
        if (error && error.message?.includes('bukti_url')) {
          delete row.bukti_url;
          const retry = await client.from('investment_transactions').insert([row]);
          error = retry.error;
        }
        if (error) {
          result.failed++;
          result.errors.push(`Investasi ${invNo}: ${error.message}`);
        } else {
          result.inserted++;
          if (invNo) existingInvNos.add(invNo);
        }
      }
    }

    // ------------------------------------------------------------------
    // 4. MIGRASI PENGAJUAN PEMBIAYAAN (loan_applications)
    // ------------------------------------------------------------------
    if (loans.length > 0) {
      emit('PEMBIAYAAN', 'Memeriksa data pengajuan pembiayaan di Supabase...');
      const existingApps = new Set<string>();
      const { data: dbLoans } = await client.from('loan_applications').select('application_no');
      if (Array.isArray(dbLoans)) {
        dbLoans.forEach((r: any) => r.application_no && existingApps.add(String(r.application_no).trim()));
      }
      for (const loan of loans) {
        currentItem++;
        const appNo = String(loan.application_no || loan.id || '').trim();
        emit('PEMBIAYAAN', `Memproses pengajuan ${appNo}...`);
        if (appNo && existingApps.has(appNo)) {
          result.skippedDuplicates++;
          continue;
        }
        const { error } = await client.from('loan_applications').insert([loan]);
        if (error) {
          result.failed++;
          result.errors.push(`Pembiayaan ${appNo}: ${error.message}`);
        } else {
          result.inserted++;
          if (appNo) existingApps.add(appNo);
        }
      }
    }

    // ------------------------------------------------------------------
    // 5. MIGRASI PAYMENT REQUESTS (payment_requests)
    // ------------------------------------------------------------------
    if (payments.length > 0) {
      emit('PEMBAYARAN', 'Memeriksa riwayat tagihan pembayaran...');
      const existingOrders = new Set<string>();
      const { data: dbPays } = await client.from('payment_requests').select('order_id');
      if (Array.isArray(dbPays)) {
        dbPays.forEach((r: any) => r.order_id && existingOrders.add(String(r.order_id).trim()));
      }
      for (const pay of payments) {
        currentItem++;
        const orderId = String(pay.order_id || '').trim();
        emit('PEMBAYARAN', `Memproses order ${orderId}...`);
        if (orderId && existingOrders.has(orderId)) {
          result.skippedDuplicates++;
          continue;
        }
        const { error } = await client.from('payment_requests').insert([pay]);
        if (error) {
          result.failed++;
          result.errors.push(`Payment ${orderId}: ${error.message}`);
        } else {
          result.inserted++;
          if (orderId) existingOrders.add(orderId);
        }
      }
    }

    // ------------------------------------------------------------------
    // 6. MIGRASI BERITA & UPDATE PROYEK (news_articles & project_updates)
    // ------------------------------------------------------------------
    if (news.length > 0) {
      emit('BERITA', 'Memeriksa artikel berita di Supabase...');
      const existingNewsTitles = new Set<string>();
      const { data: dbNews } = await client.from('news_articles').select('id, judul');
      if (Array.isArray(dbNews)) {
        dbNews.forEach((r: any) => {
          if (r.id) existingNewsTitles.add(String(r.id));
          if (r.judul) existingNewsTitles.add(String(r.judul).trim().toLowerCase());
        });
      }
      for (const art of news) {
        currentItem++;
        emit('BERITA', `Memproses berita "${art.judul}"...`);
        if (
          existingNewsTitles.has(String(art.id)) ||
          existingNewsTitles.has(String(art.judul || '').trim().toLowerCase())
        ) {
          result.skippedDuplicates++;
          continue;
        }
        const imgUpload = await uploadAttachmentIfDataUrl(art.foto_url, 'berita', String(art.id || 'NEWS'));
        if (imgUpload.uploaded) result.uploadedProofs++;
        if (imgUpload.error) result.errors.push(imgUpload.error);

        const { error } = await client.from('news_articles').insert([
          {
            id: art.id,
            kategori: art.kategori || 'program',
            project_id: art.project_id || null,
            judul: art.judul,
            ringkasan: art.ringkasan || '',
            konten: art.konten || '',
            lokasi: art.lokasi || null,
            foto_url: imgUpload.url || null,
            tanggal: art.tanggal || new Date().toISOString().split('T')[0],
            status: art.status || 'terbit',
          },
        ]);
        if (error) {
          result.failed++;
          result.errors.push(`Berita ${art.judul}: ${error.message}`);
        } else {
          result.inserted++;
        }
      }
    }

    if (projectUpdates.length > 0) {
      emit('PROYEK', 'Memeriksa laporan progres proyek di Supabase...');
      const existingUpdIds = new Set<string>();
      const { data: dbUpd } = await client.from('project_updates').select('id');
      if (Array.isArray(dbUpd)) {
        dbUpd.forEach((r: any) => r.id && existingUpdIds.add(String(r.id)));
      }
      for (const upd of projectUpdates) {
        currentItem++;
        emit('PROYEK', `Memproses laporan "${upd.judul}"...`);
        if (upd.id && existingUpdIds.has(String(upd.id))) {
          result.skippedDuplicates++;
          continue;
        }
        const imgUpload = await uploadAttachmentIfDataUrl(upd.foto_url, 'berita', String(upd.id || 'PRJ'));
        if (imgUpload.uploaded) result.uploadedProofs++;
        if (imgUpload.error) result.errors.push(imgUpload.error);

        const { error } = await client.from('project_updates').insert([
          {
            id: upd.id,
            project_id: upd.project_id,
            judul: upd.judul,
            narasi: upd.narasi || '',
            foto_url: imgUpload.url || null,
            tanggal: upd.tanggal || new Date().toISOString().split('T')[0],
          },
        ]);
        if (error) {
          result.failed++;
          result.errors.push(`Update proyek ${upd.judul}: ${error.message}`);
        } else {
          result.inserted++;
        }
      }
    }

    // ------------------------------------------------------------------
    // 7. MIGRASI NOTIFIKASI PENGGUNA (user_notifications)
    // ------------------------------------------------------------------
    if (notifications.length > 0) {
      emit('NOTIFIKASI', 'Memeriksa notifikasi pengguna...');
      const existingNotifIds = new Set<string>();
      const { data: dbNotif } = await client.from('user_notifications').select('id');
      if (Array.isArray(dbNotif)) {
        dbNotif.forEach((r: any) => r.id && existingNotifIds.add(String(r.id)));
      }
      for (const n of notifications) {
        currentItem++;
        if (n.id && existingNotifIds.has(String(n.id))) {
          result.skippedDuplicates++;
          continue;
        }
        const { error } = await client.from('user_notifications').insert([n]);
        if (error) {
          result.failed++;
          result.errors.push(`Notifikasi ${n.id}: ${error.message}`);
        } else {
          result.inserted++;
        }
      }
    }

    emit('SELESAI', 'Proses migrasi data lokal ke server selesai.');
    result.success = result.failed === 0 || result.inserted > 0 || result.updated > 0;
    result.details.push(
      `${result.inserted} data baru ditambahkan, ${result.updated} lampiran diperbarui, ${result.uploadedProofs} file diunggah ke bucket bukti-transfer, ${result.skippedDuplicates} duplikat dilewati.`
    );
    return result;
  },

  /**
   * Menghapus kunci-kunci lama KOPSIM di localStorage browser setelah admin memastikan migrasi berhasil.
   */
  clearLegacyLocalBrowserData(): number {
    if (typeof window === 'undefined' || !window.localStorage) return 0;
    const keysToDelete: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (
        KNOWN_LOCAL_KEYS.includes(key) ||
        key.startsWith('KOPSIM_') ||
        key.startsWith('kopsim_')
      ) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((k) => window.localStorage.removeItem(k));
    return keysToDelete.length;
  },
};
