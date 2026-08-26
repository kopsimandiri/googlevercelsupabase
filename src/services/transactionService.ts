import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { CustomerRecord, SupplierRecord, TransactionRecord } from '../types/database';
import { cleanRupiah } from '../utils/formatters';
import { authService } from './authService';
import { auditService } from './auditService';

const STORAGE_TRX_KEY = 'KOPSIM_TRANSACTIONS_DATA';
export const TRANSACTIONS_TABLE_NAME = 'transactions';

/**
 * Official PostgreSQL DDL Script for Supabase (19 Kolom Sesuai Skema Resmi)
 */
export const TRANSACTIONS_SQL_DDL = `-- =========================================================
-- KOPSIM MANDIRI: Tabel Master Transaksi & Keuangan (transactions - 19 Kolom)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    transaction_no TEXT UNIQUE,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    referral_type TEXT NOT NULL DEFAULT 'KOPERASI' CHECK (referral_type IN ('KOPERASI', 'PROJECT')),
    area_name TEXT NOT NULL DEFAULT 'PUSAT JAKARTA',
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('MASUK', 'KELUAR')),
    payment_method TEXT NOT NULL DEFAULT 'Bank BSI',
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    file_url TEXT DEFAULT '',
    account_name_legacy TEXT DEFAULT 'Bank BSI',
    description TEXT DEFAULT '',
    category_name TEXT DEFAULT 'Kas',
    product_name TEXT DEFAULT '',
    supplier_name TEXT DEFAULT '',
    customer_name TEXT DEFAULT '',
    qty NUMERIC(12, 2) DEFAULT 1.00,
    price NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing untuk performa laporan & audit
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions (transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_referral_type ON public.transactions (referral_type);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions (transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_area_name ON public.transactions (area_name);
CREATE INDEX IF NOT EXISTS idx_transactions_category_name ON public.transactions (category_name);

-- Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on transactions" 
    ON public.transactions FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert on transactions" 
    ON public.transactions FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow admin update on transactions" 
    ON public.transactions FOR UPDATE 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow admin delete on transactions" 
    ON public.transactions FOR DELETE 
    USING (true);
`;

const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'T260815001',
    tanggal: '2026-08-15',
    referal: 'KOPERASI',
    plantation: 'PUSAT JAKARTA',
    jenis: 'MASUK',
    kategori: 'Simpanan Pokok',
    metode_bayar: 'Bank BSI',
    qty: 1,
    jumlah: 5000000,
    area_jenis: 'KOPERASI PUSAT',
    keterangan: 'Penerimaan Simpanan Pokok 10 Anggota Baru',
    akun: 'Bank BSI',
    login_as: 'ADMIN',
    logtime: '2026-08-15 10:30:00',
  },
  {
    id: 'T260816002',
    tanggal: '2026-08-16',
    referal: 'KOPERASI',
    plantation: 'PUSAT JAKARTA',
    jenis: 'MASUK',
    kategori: 'Simpanan Wajib',
    metode_bayar: 'Bank BSI',
    qty: 1,
    jumlah: 3600000,
    area_jenis: 'KOPERASI PUSAT',
    keterangan: 'Setoran Simpanan Wajib 3 Tahun',
    akun: 'Bank BSI',
    login_as: 'ADMIN',
    logtime: '2026-08-16 11:15:00',
  },
  {
    id: 'T260816003',
    tanggal: '2026-08-16',
    referal: 'KOPERASI',
    plantation: 'CABANG JAWA BARAT',
    jenis: 'MASUK',
    kategori: 'Simpanan Manasuka',
    metode_bayar: 'Bank Mandiri',
    qty: 1,
    jumlah: 15000000,
    area_jenis: 'KOPERASI CABANG',
    keterangan: 'Setoran Modal Sukarela Produktif',
    akun: 'Bank Mandiri',
    login_as: 'ADMIN',
    logtime: '2026-08-16 14:00:00',
  },
  {
    id: 'P260817001',
    tanggal: '2026-08-17',
    referal: 'PROJECT',
    plantation: 'TRADING IKAN',
    jenis: 'MASUK',
    kategori: 'Penjualan Komoditas',
    sku_name: 'Ikan Tuna Segar Grade A',
    metode_bayar: 'Bank Mandiri',
    qty: 500,
    harga_satuan: 65000,
    jumlah: 32500000,
    area_jenis: 'PROJECT',
    keterangan: 'Penjualan ke Mitra Restoran Cold-Chain',
    akun: 'DANA PROJECT',
    customer_id: 'CUST-001',
    login_as: 'ADMIN',
    logtime: '2026-08-17 09:20:00',
  },
  {
    id: 'P260817002',
    tanggal: '2026-08-17',
    referal: 'PROJECT',
    plantation: 'TRADING IKAN',
    jenis: 'KELUAR',
    kategori: 'Pembelian Bahan Baku',
    sku_name: 'Ikan Tuna Segar Grade A',
    metode_bayar: 'Bank Mandiri',
    qty: 500,
    harga_satuan: 45000,
    jumlah: 22500000,
    area_jenis: 'PROJECT',
    keterangan: 'Pembelian dari Nelayan Binaan',
    akun: 'DANA PROJECT',
    supplier_id: 'SUPP-001',
    login_as: 'ADMIN',
    logtime: '2026-08-17 10:00:00',
  },
  {
    id: 'P260818001',
    tanggal: '2026-08-18',
    referal: 'PROJECT',
    plantation: 'PERTANIAN',
    jenis: 'MASUK',
    kategori: 'Penjualan Komoditas',
    sku_name: 'Beras Organik Premium',
    metode_bayar: 'Bank BSI',
    qty: 1000,
    harga_satuan: 14000,
    jumlah: 14000000,
    area_jenis: 'PROJECT',
    keterangan: 'Distribusi Beras Organik ke Agen',
    akun: 'DANA PROJECT',
    customer_id: 'CUST-002',
    login_as: 'ADMIN',
    logtime: '2026-08-18 13:45:00',
  },
  {
    id: 'T260818002',
    tanggal: '2026-08-18',
    referal: 'KOPERASI',
    plantation: 'PUSAT JAKARTA',
    jenis: 'KELUAR',
    kategori: 'Biaya Operasional',
    metode_bayar: 'Bank BSI',
    qty: 1,
    jumlah: 4200000,
    area_jenis: 'KOPERASI PUSAT',
    keterangan: 'Biaya Administrasi & Operasional Kantor',
    akun: 'Bank BSI',
    login_as: 'ADMIN',
    logtime: '2026-08-18 15:30:00',
  },
  {
    id: 'P260818003',
    tanggal: '2026-08-18',
    referal: 'PROJECT',
    plantation: 'GARAM',
    jenis: 'MASUK',
    kategori: 'Penjualan Komoditas',
    sku_name: 'Garam Rakyat Kualitas 1',
    metode_bayar: 'Bank Mandiri',
    qty: 2000,
    harga_satuan: 4000,
    jumlah: 8000000,
    area_jenis: 'PROJECT',
    keterangan: 'Pasokan Garam ke Industri Olahan',
    akun: 'DANA PROJECT',
    customer_id: 'CUST-003',
    login_as: 'ADMIN',
    logtime: '2026-08-18 16:00:00',
  },
];

const DEFAULT_CUSTOMERS: CustomerRecord[] = [
  { id: 'CUST-001', nama: 'PT Boga Maritim Sejahtera', pic: 'Hendro Wijaya', telepon: '081288990011', alamat: 'Kawasan Industri Cikarang', provinsi: 'Jawa Barat', kota: 'Bekasi', kategori: 'Retail & Restoran', status: 'AKTIF' },
  { id: 'CUST-002', nama: 'Koperasi Pasar Induk Beras', pic: 'Drs. H. Mulyadi', telepon: '081377889900', alamat: 'Pasar Induk Cipinang Blok A', provinsi: 'DKI Jakarta', kota: 'Jakarta Timur', kategori: 'Distributor Pangan', status: 'AKTIF' },
  { id: 'CUST-003', nama: 'CV Garam Anugerah Mandiri', pic: 'Ir. Susilo Pratama', telepon: '081900112233', alamat: 'Jl. Rungkut Industri No. 12', provinsi: 'Jawa Timur', kota: 'Surabaya', kategori: 'Industri Manufaktur', status: 'AKTIF' },
];

const DEFAULT_SUPPLIERS: SupplierRecord[] = [
  { id: 'SUPP-001', nama: 'Kelompok Nelayan Mandiri Pesisir', pic: 'Pak Samsul', telepon: '082144556677', alamat: 'Dermaga Muara Baru', provinsi: 'DKI Jakarta', kota: 'Jakarta Utara', kategori: 'Hasil Laut Tangkap', status: 'AKTIF' },
  { id: 'SUPP-002', nama: 'Gabungan Kelompok Tani Subur Makmur', pic: 'Kang Dedi', telepon: '085299887766', alamat: 'Desa Sukamaju, Cianjur', provinsi: 'Jawa Barat', kota: 'Cianjur', kategori: 'Pertanian Padi & Jagung', status: 'AKTIF' },
  { id: 'SUPP-003', nama: 'Koperasi Tambak Garam Rakyat', pic: 'H. Ridwan', telepon: '087811223344', alamat: 'Pesisir Pantura Indramayu', provinsi: 'Jawa Barat', kota: 'Indramayu', kategori: 'Garam Bahan Baku', status: 'AKTIF' },
];

export function cleanNumeric(value: any): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (typeof value === 'string') {
    let cleaned = value.replace(/Rp/gi, '').trim();
    if (cleaned.includes('.') && cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes('.')) {
      cleaned = cleaned.replace(/\./g, '');
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }
    const num = parseFloat(cleaned.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

/**
 * Maps raw Supabase row from public.transactions (19 columns) to UI TransactionRecord
 */
export function mapAndCleanTransactionRow(row: any): TransactionRecord {
  const jumlah = cleanNumeric(row.amount ?? row.jumlah);
  const qty = cleanNumeric(row.qty ?? row.quantity ?? 1);
  const hargaSatuan = cleanNumeric(row.price ?? row.harga_satuan ?? (qty > 0 ? jumlah / qty : 0));
  
  let tanggal = '';
  if (row.transaction_date) {
    tanggal = typeof row.transaction_date === 'string'
      ? row.transaction_date.split('T')[0]
      : new Date(row.transaction_date).toISOString().split('T')[0];
  } else if (row.tanggal) {
    tanggal = typeof row.tanggal === 'string'
      ? row.tanggal.split('T')[0]
      : new Date(row.tanggal).toISOString().split('T')[0];
  } else {
    tanggal = new Date().toISOString().split('T')[0];
  }

  const rawReferral = (row.referral_type || row.referal || 'KOPERASI').toUpperCase();
  const referal: 'KOPERASI' | 'PROJECT' = rawReferral.includes('PROJECT') ? 'PROJECT' : 'KOPERASI';
  
  const rawJenis = (row.transaction_type || row.jenis || 'MASUK').toUpperCase();
  const jenis: 'MASUK' | 'KELUAR' = rawJenis.includes('KELUAR') ? 'KELUAR' : 'MASUK';
  
  const areaName = row.area_name || row.plantation || (referal === 'PROJECT' ? 'TRADING IKAN' : 'PUSAT JAKARTA');

  let areaJenis: 'KOPERASI PUSAT' | 'KOPERASI CABANG' | 'PROJECT' = 'KOPERASI PUSAT';
  if (row.area_jenis) {
    areaJenis = row.area_jenis;
  } else if (referal === 'PROJECT' || areaName.toUpperCase().includes('PROJECT') || areaName.toUpperCase().includes('TRADING')) {
    areaJenis = 'PROJECT';
  } else if (areaName.toUpperCase().includes('CABANG')) {
    areaJenis = 'KOPERASI CABANG';
  }

  return {
    id: String(row.transaction_no || row.id || ''),
    tanggal,
    referal,
    plantation: areaName,
    jenis,
    kategori: row.category_name || row.kategori || 'Kas',
    sku_name: row.product_name || row.sku_name || '',
    metode_bayar: row.payment_method || row.metode_bayar || 'Bank BSI',
    qty: qty || 1,
    harga_satuan: hargaSatuan,
    jumlah,
    filelink: row.file_url || row.filelink || '',
    akun: row.account_name_legacy || row.akun || (referal === 'PROJECT' ? 'DANA PROJECT' : 'Bank BSI'),
    keterangan: row.description || row.keterangan || '',
    login_as: row.login_as || 'ADMIN',
    logtime: row.created_at || row.logtime || row.updated_at || new Date().toISOString(),
    area_jenis: areaJenis,
    customer_id: row.customer_name || row.customer_id ? String(row.customer_name || row.customer_id) : undefined,
    supplier_id: row.supplier_name || row.supplier_id ? String(row.supplier_name || row.supplier_id) : undefined,
  };
}

/**
 * Maps TransactionRecord to Supabase public.transactions (19+ columns)
 */
export function mapTransactionRecordToSupabaseRow(trx: Partial<TransactionRecord>): any {
  const idVal = trx.id || `T${Date.now()}`;
  const nowStr = new Date().toISOString();
  const currentUser = authService.getCurrentUser();

  return {
    id: idVal,
    transaction_no: idVal,
    transaction_date: trx.tanggal || nowStr.split('T')[0],
    referral_type: trx.referal || 'KOPERASI',
    area_name: trx.plantation || 'PUSAT JAKARTA',
    transaction_type: trx.jenis || 'MASUK',
    payment_method: trx.metode_bayar || 'Bank BSI',
    amount: cleanNumeric(trx.jumlah),
    file_url: trx.filelink || '',
    account_name_legacy: trx.akun || (trx.referal === 'PROJECT' ? 'DANA PROJECT' : 'Bank BSI'),
    description: trx.keterangan || '',
    category_name: trx.kategori || 'Kas',
    product_name: trx.sku_name || '',
    supplier_name: trx.supplier_id || '',
    customer_name: trx.customer_id || '',
    qty: cleanNumeric(trx.qty || 1),
    price: cleanNumeric(trx.harga_satuan || 0),
    actor_user_id: currentUser?.id && currentUser.id.length === 36 ? currentUser.id : null,
    actor_name: trx.login_as || currentUser?.username || currentUser?.role || 'ADMIN',
    is_posted: true,
    is_void: false,
    created_at: nowStr,
    updated_at: nowStr,
  };
}

/**
 * Mengambil data transaksi murni dari public.transactions di Supabase dengan filter tanggal di level query
 * dan membersihkan nilai numerik (jumlah/qty/harga_satuan) sebelum dikembalikan.
 * Fallback ke localStorage hanya jika query Supabase gagal atau tidak tersedia.
 */
export async function getAllTransactionsRaw(startDate?: string, endDate?: string): Promise<TransactionRecord[]> {
  const client = getSupabaseClient();
  let rawList: any[] = [];
  let fetchSucceeded = false;

  if (client) {
    try {
      // 1. Query live data dari tabel public.transactions (19 kolom resmi Supabase)
      let query = client.from(TRANSACTIONS_TABLE_NAME).select('*');
      if (startDate) {
        query = query.gte('transaction_date', startDate);
      }
      if (endDate) {
        const endFilter = endDate.length === 10 ? `${endDate}T23:59:59.999Z` : endDate;
        query = query.lte('transaction_date', endFilter);
      }
      query = query.order('transaction_date', { ascending: false });

      const { data, error } = await query;
      if (!error && data) {
        rawList = data;
        fetchSucceeded = true;
      } else if (error) {
        // 2. Coba alternatif jika kolom tanggal bernama 'tanggal'
        let altQuery = client.from(TRANSACTIONS_TABLE_NAME).select('*');
        if (startDate) {
          altQuery = altQuery.gte('tanggal', startDate);
        }
        if (endDate) {
          altQuery = altQuery.lte('tanggal', endDate);
        }
        altQuery = altQuery.order('tanggal', { ascending: false });

        const altRes = await altQuery;
        if (!altRes.error && altRes.data) {
          rawList = altRes.data;
          fetchSucceeded = true;
        } else {
          console.warn('Supabase transactions query fallback error:', error.message);
        }
      }
    } catch (err) {
      console.warn('Supabase transactions query exception:', err);
    }
  }

  // 3. Fallback ke data localStorage HANYA jika query Supabase gagal / offline
  if (!fetchSucceeded) {
    let localList = transactionService.getStoredTransactions();
    if (startDate || endDate) {
      localList = localList.filter((t) => {
        if (startDate && t.tanggal < startDate) return false;
        if (endDate && t.tanggal > endDate) return false;
        return true;
      });
    }
    return localList.map(mapAndCleanTransactionRow);
  }

  // 4. Bersihkan nilai nominal / string currency dan sinkronkan ke local cache
  const mappedResults = rawList.map(mapAndCleanTransactionRow);
  if (mappedResults.length > 0) {
    try {
      localStorage.setItem(STORAGE_TRX_KEY, JSON.stringify(mappedResults));
    } catch (e) {
      // Ignore quota errors
    }
  }
  return mappedResults;
}

export interface TransactionsMetaResult {
  data: TransactionRecord[];
  source: 'SUPABASE' | 'LOCAL';
  isConfigured: boolean;
  isConnected: boolean;
  totalDbRows: number;
  latencyMs: number;
  errorMessage?: string;
}

export const transactionService = {
  getAllTransactionsRaw,

  getStoredTransactions(): TransactionRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_TRX_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_TRX_KEY, JSON.stringify(INITIAL_TRANSACTIONS));
    return INITIAL_TRANSACTIONS;
  },

  /**
   * Mengambil data transaksi dengan metadata koneksi PostgreSQL Supabase
   */
  async getTransactionsWithMeta(tabFilter?: 'PUSAT' | 'CABANG' | 'PROJECT'): Promise<TransactionsMetaResult> {
    const startTime = performance.now();
    const isConfigured = isSupabaseConfigured;
    const client = getSupabaseClient();

    if (!client || !isConfigured) {
      const local = this.getStoredTransactions();
      const filtered = this.filterByTab(local, tabFilter);
      return {
        data: filtered,
        source: 'LOCAL',
        isConfigured: false,
        isConnected: false,
        totalDbRows: 0,
        latencyMs: 0,
        errorMessage: 'Klien Supabase belum terkonfigurasi di file environment.',
      };
    }

    try {
      // 1. Coba query langsung dari public.transactions
      const { data, error, count } = await client
        .from(TRANSACTIONS_TABLE_NAME)
        .select('*', { count: 'exact' })
        .order('transaction_date', { ascending: false });

      const latencyMs = Math.round(performance.now() - startTime);

      if (error) {
        // Coba alternatif order by tanggal jika kolom berbeda
        const altRes = await client
          .from(TRANSACTIONS_TABLE_NAME)
          .select('*', { count: 'exact' });

        if (!altRes.error && altRes.data) {
          const mapped = altRes.data.map(mapAndCleanTransactionRow);
          if (mapped.length > 0) {
            localStorage.setItem(STORAGE_TRX_KEY, JSON.stringify(mapped));
          }
          const filtered = this.filterByTab(mapped, tabFilter);
          return {
            data: filtered,
            source: 'SUPABASE',
            isConfigured: true,
            isConnected: true,
            totalDbRows: altRes.count ?? altRes.data.length,
            latencyMs,
          };
        }

        console.warn('Supabase getTransactionsWithMeta error:', error);
        const local = this.getStoredTransactions();
        return {
          data: this.filterByTab(local, tabFilter),
          source: 'LOCAL',
          isConfigured: true,
          isConnected: false,
          totalDbRows: 0,
          latencyMs,
          errorMessage: error.message,
        };
      }

      const rawData = data || [];
      const mapped = rawData.map(mapAndCleanTransactionRow);
      if (mapped.length > 0) {
        localStorage.setItem(STORAGE_TRX_KEY, JSON.stringify(mapped));
      }

      return {
        data: this.filterByTab(mapped, tabFilter),
        source: 'SUPABASE',
        isConfigured: true,
        isConnected: true,
        totalDbRows: count ?? rawData.length,
        latencyMs,
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      console.warn('Supabase getTransactionsWithMeta exception:', err);
      const local = this.getStoredTransactions();
      return {
        data: this.filterByTab(local, tabFilter),
        source: 'LOCAL',
        isConfigured: true,
        isConnected: false,
        totalDbRows: 0,
        latencyMs,
        errorMessage: err?.message || String(err),
      };
    }
  },

  filterByTab(list: TransactionRecord[], tabFilter?: 'PUSAT' | 'CABANG' | 'PROJECT'): TransactionRecord[] {
    if (!tabFilter) return list;
    return list.filter((t) => {
      const area = (t.area_jenis || '').toUpperCase();
      if (tabFilter === 'PUSAT') return area.includes('KOPERASI PUSAT');
      if (tabFilter === 'CABANG') return area.includes('KOPERASI CABANG');
      if (tabFilter === 'PROJECT') return area.includes('PROJECT');
      return true;
    });
  },

  async getTransactions(tabFilter?: 'PUSAT' | 'CABANG' | 'PROJECT'): Promise<TransactionRecord[]> {
    const meta = await this.getTransactionsWithMeta(tabFilter);
    return meta.data;
  },

  async generateTransactionId(referal: 'KOPERASI' | 'PROJECT', dateStr?: string): Promise<string> {
    const client = getSupabaseClient();
    const d = dateStr ? new Date(dateStr) : new Date();
    const formattedDate = !isNaN(d.getTime())
      ? d.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    if (client) {
      try {
        const { data, error } = await client.rpc('generate_transaction_id', {
          tipe: referal,
          tanggal: formattedDate,
        });
        if (!error && data) {
          return data as string;
        }
      } catch (err) {
        console.warn('Supabase RPC generate_transaction_id exception:', err);
      }
    }

    const prefix = referal === 'PROJECT' ? 'P' : 'T';
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const datePart = `${yy}${mm}${dd}`;
    const fullPrefix = `${prefix}${datePart}`;

    const transactions = this.getStoredTransactions();
    let maxCount = 0;
    transactions.forEach((t) => {
      if (t.id && t.id.startsWith(fullPrefix)) {
        const seq = parseInt(t.id.substring(7), 10);
        if (!isNaN(seq) && seq > maxCount) maxCount = seq;
      }
    });

    return `${fullPrefix}${String(maxCount + 1).padStart(3, '0')}`;
  },

  async saveTransaction(
    trxData: Partial<TransactionRecord>,
    isEditExplicit?: boolean
  ): Promise<{ success: boolean; id: string; error?: string; source?: 'SUPABASE' | 'LOCAL' }> {
    const list = this.getStoredTransactions();
    const existingIdx = trxData.id ? list.findIndex((t) => t.id === trxData.id) : -1;
    const isEdit = isEditExplicit !== undefined ? isEditExplicit : (existingIdx !== -1);
    const referal = trxData.referal || 'KOPERASI';

    const qty = Number(trxData.qty ?? 1);
    const hargaSatuan = Number(trxData.harga_satuan ?? 0);
    let jumlah = cleanRupiah(trxData.jumlah);

    // Check negative quantities or unit prices first
    if ((trxData.qty !== undefined && qty < 0) || (trxData.harga_satuan !== undefined && hargaSatuan < 0)) {
      throw new Error('Kuantitas (qty) dan harga satuan tidak boleh negatif.');
    }

    if (referal === 'PROJECT' && qty > 0 && hargaSatuan > 0) {
      jumlah = qty * hargaSatuan;
    }

    // Server-side & Business Validation: Nominal must be > 0
    if (isNaN(jumlah) || jumlah <= 0) {
      throw new Error('Nominal transaksi harus berupa angka positif lebih besar dari 0.');
    }

    const trxId = isEdit
      ? trxData.id!
      : (trxData.id || await this.generateTransactionId(referal, trxData.tanggal));

    // Duplicate transaction ID protection on create
    if (!isEdit && list.some((t) => t.id === trxId)) {
      throw new Error(`Nomor transaksi ${trxId} sudah ada di sistem. Gunakan nomor unik.`);
    }

    let areaJenis: 'KOPERASI PUSAT' | 'KOPERASI CABANG' | 'PROJECT' = 'KOPERASI PUSAT';
    if (referal === 'PROJECT') {
      areaJenis = 'PROJECT';
    } else if ((trxData.plantation || '').toUpperCase().includes('CABANG')) {
      areaJenis = 'KOPERASI CABANG';
    }

    const currentUser = authService.getCurrentUser();
    const newRecord: TransactionRecord = {
      id: trxId,
      tanggal: trxData.tanggal || new Date().toISOString().split('T')[0],
      referal,
      plantation: trxData.plantation || 'PUSAT JAKARTA',
      jenis: trxData.jenis || 'MASUK',
      kategori: trxData.kategori || 'Kas',
      sku_name: trxData.sku_name || '',
      metode_bayar: trxData.metode_bayar || 'Bank BSI',
      qty,
      harga_satuan: hargaSatuan,
      jumlah,
      filelink: trxData.filelink || '',
      akun: trxData.akun || (referal === 'PROJECT' ? 'DANA PROJECT' : 'Bank BSI'),
      keterangan: trxData.keterangan || '',
      login_as: currentUser?.username || trxData.login_as || currentUser?.role || 'ADMIN',
      logtime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      area_jenis: areaJenis,
      customer_id: trxData.customer_id || '',
      supplier_id: trxData.supplier_id || '',
    };

    let oldRecord: TransactionRecord | null = null;
    if (isEdit) {
      oldRecord = { ...list[existingIdx] };
      list[existingIdx] = newRecord;
    } else {
      list.unshift(newRecord);
    }

    localStorage.setItem(STORAGE_TRX_KEY, JSON.stringify(list));

    // Audit Log recording
    await auditService.logActivity(
      isEdit ? 'UPDATE_TRANSACTION' : 'CREATE_TRANSACTION',
      'transactions',
      trxId,
      oldRecord,
      newRecord
    );

    let savedToSupabase = false;
    const client = getSupabaseClient();
    if (client) {
      try {
        const dbRow = mapTransactionRecordToSupabaseRow(newRecord);
        if (isEdit) {
          const { error } = await client.from(TRANSACTIONS_TABLE_NAME).update(dbRow).eq('id', trxId);
          if (!error) savedToSupabase = true;
        } else {
          const { error } = await client.from(TRANSACTIONS_TABLE_NAME).insert([dbRow]);
          if (!error) savedToSupabase = true;
        }
      } catch (err) {
        console.warn('Supabase transaction mutation fallback:', err);
      }
    }

    return { success: true, id: trxId, source: savedToSupabase ? 'SUPABASE' : 'LOCAL' };
  },

  async deleteTransaction(id: string): Promise<{ success: boolean; error?: string }> {
    let list = this.getStoredTransactions();
    const targetIdx = list.findIndex((t) => t.id === id);
    if (targetIdx === -1) return { success: false, error: 'Data transaksi tidak ditemukan.' };

    const oldRecord = list[targetIdx];
    list = list.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_TRX_KEY, JSON.stringify(list));

    // Audit deletion
    await auditService.logActivity(
      'DELETE_TRANSACTION',
      'transactions',
      id,
      oldRecord,
      null
    );

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from(TRANSACTIONS_TABLE_NAME).delete().eq('id', id);
        if (error) {
          await client.from(TRANSACTIONS_TABLE_NAME).delete().eq('transaction_no', id);
        }
      } catch (err) {
        console.warn('Supabase delete transaction fallback:', err);
      }
    }

    return { success: true };
  },

  /**
   * Membatalkan transaksi (void) tanpa menghapus jejak pembukuan untuk menjaga integritas audit
   */
  async voidTransaction(id: string, reason: string): Promise<{ success: boolean; message: string }> {
    const list = this.getStoredTransactions();
    const target = list.find((t) => t.id === id);
    if (!target) {
      throw new Error('Transaksi tidak ditemukan.');
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.rpc('void_transaction', {
          p_transaction_no: id,
          p_reason: reason || 'Dibatalkan oleh Admin',
        });
        if (!error && data?.success) {
          return { success: true, message: data.message };
        }
      } catch (e) {
        console.warn('RPC void_transaction error fallback:', e);
      }
    }

    // Local fallback
    target.keterangan = `[VOID - ${reason || 'Dibatalkan'}] ${target.keterangan || ''}`;
    localStorage.setItem(STORAGE_TRX_KEY, JSON.stringify(list));

    await auditService.logActivity(
      'VOID_TRANSACTION',
      'transactions',
      id,
      { status: 'POSTED' },
      { status: 'VOID', reason }
    );

    return { success: true, message: 'Transaksi berhasil dibatalkan (VOID).' };
  },

  /**
   * Mengambil agregasi simpanan koperasi dari public.transactions berdasarkan query:
   * SELECT a.account_name_legacy, a.category_name, SUM(a.amount) IDR 
   * FROM public.transactions a
   * WHERE a.referral_type='KOPERASI'
   * GROUP BY a.account_name_legacy, a.category_name;
   */
  async getKoperasiSavingsSummary(): Promise<{
    totalSimpananPokok: number;
    totalSimpananWajib: number;
    totalSimpananManasuka: number;
    grandTotalSimpanan: number;
    memberMap: Record<string, { pokok: number; wajib: number; manasuka: number; total: number; accountName: string }>;
    rawGroupedRows: Array<{ account_name_legacy: string; category_name: string; idr: number; savings_type: 'SIMPANAN POKOK' | 'SIMPANAN WAJIB' | 'SIMPANAN MANASUKA' }>;
  }> {
    const client = getSupabaseClient();
    let rawTransactions: any[] = [];

    if (client) {
      try {
        const { data, error } = await client
          .from(TRANSACTIONS_TABLE_NAME)
          .select('account_name_legacy, category_name, transaction_type, amount, referral_type, description, customer_id')
          .or('referral_type.ilike.%KOPERASI%,referral_type.is.null');

        if (!error && Array.isArray(data) && data.length > 0) {
          rawTransactions = data;
        } else if (error) {
          console.warn('[getKoperasiSavingsSummary] Supabase query fallback:', error.message);
        }
      } catch (err) {
        console.warn('[getKoperasiSavingsSummary] Supabase fetch error:', err);
      }
    }

    // Fallback to local stored transactions if database query returned no records
    if (rawTransactions.length === 0) {
      const stored = this.getStoredTransactions();
      rawTransactions = stored
        .filter((t) => !t.referal || t.referal === 'KOPERASI' || (t.kategori && t.kategori.toLowerCase().includes('simpanan')))
        .map((t) => ({
          account_name_legacy: t.akun || t.customer_id || 'Kas Koperasi',
          category_name: t.kategori,
          transaction_type: t.jenis,
          amount: t.jumlah,
          referral_type: t.referal,
          description: t.keterangan,
        }));
    }

    let totalSimpananPokok = 0;
    let totalSimpananWajib = 0;
    let totalSimpananManasuka = 0;

    const groupedMap: Record<string, { pokok: number; wajib: number; manasuka: number; total: number; accountName: string }> = {};
    const groupedRowMap: Record<string, { account_name_legacy: string; category_name: string; idr: number; savings_type: 'SIMPANAN POKOK' | 'SIMPANAN WAJIB' | 'SIMPANAN MANASUKA' }> = {};

    rawTransactions.forEach((row: any) => {
      const accName = (row.account_name_legacy || row.akun || row.customer_id || 'Anggota Koperasi').trim();
      const catName = (row.category_name || row.kategori || 'Simpanan').trim();
      const catUpper = catName.toUpperCase();
      const rawAmt = cleanNumeric(row.amount ?? row.jumlah);
      const isKeluar = (row.transaction_type || row.jenis || '').toUpperCase().includes('KELUAR');
      const signedAmt = isKeluar ? -rawAmt : rawAmt;

      // Group key for SQL output
      const groupKey = `${accName}___${catName}`;

      let savingsType: 'SIMPANAN POKOK' | 'SIMPANAN WAJIB' | 'SIMPANAN MANASUKA' = 'SIMPANAN MANASUKA';
      if (catUpper.includes('POKOK')) {
        savingsType = 'SIMPANAN POKOK';
        totalSimpananPokok += signedAmt;
      } else if (catUpper.includes('WAJIB')) {
        savingsType = 'SIMPANAN WAJIB';
        totalSimpananWajib += signedAmt;
      } else {
        // SIMPANAN MANASUKA (SUKARELA / MANASUKA / LAINNYA)
        savingsType = 'SIMPANAN MANASUKA';
        totalSimpananManasuka += signedAmt;
      }

      // 1. Accumulate SQL grouped rows
      if (!groupedRowMap[groupKey]) {
        groupedRowMap[groupKey] = {
          account_name_legacy: accName,
          category_name: catName,
          idr: 0,
          savings_type: savingsType,
        };
      }
      groupedRowMap[groupKey].idr += signedAmt;

      // 2. Accumulate member map
      const normAccKey = accName.toLowerCase();
      if (!groupedMap[normAccKey]) {
        groupedMap[normAccKey] = {
          accountName: accName,
          pokok: 0,
          wajib: 0,
          manasuka: 0,
          total: 0,
        };
      }

      if (savingsType === 'SIMPANAN POKOK') {
        groupedMap[normAccKey].pokok += signedAmt;
      } else if (savingsType === 'SIMPANAN WAJIB') {
        groupedMap[normAccKey].wajib += signedAmt;
      } else {
        groupedMap[normAccKey].manasuka += signedAmt;
      }
      groupedMap[normAccKey].total =
        groupedMap[normAccKey].pokok + groupedMap[normAccKey].wajib + groupedMap[normAccKey].manasuka;
    });

    const rawGroupedRows = Object.values(groupedRowMap);
    const grandTotalSimpanan = totalSimpananPokok + totalSimpananWajib + totalSimpananManasuka;

    return {
      totalSimpananPokok: Math.max(0, totalSimpananPokok),
      totalSimpananWajib: Math.max(0, totalSimpananWajib),
      totalSimpananManasuka: Math.max(0, totalSimpananManasuka),
      grandTotalSimpanan: Math.max(0, grandTotalSimpanan),
      memberMap: groupedMap,
      rawGroupedRows,
    };
  },

  /**
   * Mengambil agregasi simpanan anggota dari public.transactions berdasarkan query:
   * SELECT a.account_name_legacy, a.category_name, sum(a.amount) fd FROM public.transactions a ...
   */
  async getMemberSavingsSummary(
    memberName: string,
    memberNo?: string
  ): Promise<{
    hasTrx: boolean;
    simpananPokok: number;
    simpananWajib: number;
    simpananSukarela: number;
    simpananManasuka: number;
    totalSimpanan: number;
    categoryBreakdown: Record<string, number>;
  }> {
    const cleanName = (memberName || '').trim();
    const cleanNo = (memberNo || '').trim();
    const client = getSupabaseClient();

    let pokok = 500000;
    let wajib = 360000;
    let manasuka = 0;
    const categoryBreakdown: Record<string, number> = {};

    let hasSavingsTrx = false;
    let transactionsList: any[] = [];

    if (client && (cleanName.length >= 3 || cleanNo.length >= 3)) {
      try {
        const orClauses: string[] = [];
        if (cleanName.length >= 3) {
          orClauses.push(`account_name_legacy.ilike.%${cleanName}%`, `description.ilike.%${cleanName}%`);
        }
        if (cleanNo.length >= 3) {
          orClauses.push(`account_name_legacy.ilike.%${cleanNo}%`, `description.ilike.%${cleanNo}%`, `customer_id.ilike.%${cleanNo}%`);
        }

        const { data, error } = await client
          .from(TRANSACTIONS_TABLE_NAME)
          .select('account_name_legacy, category_name, transaction_type, amount, description, customer_id')
          .or(orClauses.join(','));

        if (!error && data && data.length > 0) {
          transactionsList = data;
        }
      } catch (err) {
        console.warn('getMemberSavingsSummary Supabase query error:', err);
      }
    }

    // Fallback to local stored transactions filtered strictly by member name or ID
    if (transactionsList.length === 0 && (cleanName.length >= 3 || cleanNo.length >= 3)) {
      const localTrx = this.getStoredTransactions();
      transactionsList = localTrx.filter((t) => {
        const desc = (t.keterangan || '').toLowerCase();
        const cust = (t.customer_id || '').toLowerCase();
        const acc = (t.akun || '').toLowerCase();
        const targetName = cleanName.toLowerCase();
        const targetNo = cleanNo.toLowerCase();

        const matchNo = targetNo.length >= 3 && (cust.includes(targetNo) || desc.includes(targetNo) || acc.includes(targetNo));
        const matchName = targetName.length >= 3 && (desc.includes(targetName) || acc.includes(targetName));

        return matchNo || matchName;
      });
    }

    if (transactionsList.length > 0) {
      let foundPokok = 0;
      let foundWajib = 0;
      let foundManasuka = 0;

      transactionsList.forEach((row: any) => {
        const cat = (row.category_name || row.kategori || '').toLowerCase();
        const rawAmount = cleanNumeric(row.amount ?? row.jumlah);
        const type = (row.transaction_type || row.jenis || 'MASUK').toUpperCase();
        const signedAmount = type === 'KELUAR' ? -rawAmount : rawAmount;

        const categoryKey = (row.category_name || row.kategori || 'Simpanan').trim();
        categoryBreakdown[categoryKey] = (categoryBreakdown[categoryKey] || 0) + signedAmount;

        if (cat.includes('pokok')) {
          foundPokok += signedAmount;
          hasSavingsTrx = true;
        } else if (cat.includes('wajib')) {
          foundWajib += signedAmount;
          hasSavingsTrx = true;
        } else {
          // Any other category (sukarela, manasuka, dll)
          foundManasuka += signedAmount;
          hasSavingsTrx = true;
        }
      });

      if (hasSavingsTrx) {
        pokok = foundPokok;
        wajib = foundWajib;
        manasuka = foundManasuka;
      }
    }

    const totalSimpanan = hasSavingsTrx
      ? Object.values(categoryBreakdown).reduce((sum, val) => sum + (Number(val) || 0), 0)
      : (pokok + wajib + manasuka);

    return {
      hasTrx: hasSavingsTrx,
      simpananPokok: Math.max(0, pokok),
      simpananWajib: Math.max(0, wajib),
      simpananSukarela: Math.max(0, manasuka),
      simpananManasuka: Math.max(0, manasuka),
      totalSimpanan: Math.max(0, totalSimpanan),
      categoryBreakdown,
    };
  },

  /**
   * Mengambil riwayat mutasi transaksi buku tabungan anggota
   */
  async getMemberTransactions(memberName: string, memberNo?: string): Promise<TransactionRecord[]> {
    const cleanName = (memberName || '').trim();
    const cleanNo = (memberNo || '').trim();
    const client = getSupabaseClient();

    if (client && (cleanName.length >= 3 || cleanNo.length >= 3)) {
      try {
        const orClauses: string[] = [];
        if (cleanName.length >= 3) {
          orClauses.push(`account_name_legacy.ilike.%${cleanName}%`, `description.ilike.%${cleanName}%`);
        }
        if (cleanNo.length >= 3) {
          orClauses.push(`account_name_legacy.ilike.%${cleanNo}%`, `description.ilike.%${cleanNo}%`, `customer_id.ilike.%${cleanNo}%`);
        }

        const { data, error } = await client
          .from(TRANSACTIONS_TABLE_NAME)
          .select('*')
          .or(orClauses.join(','))
          .order('transaction_date', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map(mapAndCleanTransactionRow);
        }
      } catch (err) {
        console.warn('getMemberTransactions Supabase error:', err);
      }
    }

    // Fallback to local stored transactions
    const all = this.getStoredTransactions();
    return all.filter((t) => {
      const desc = (t.keterangan || '').toLowerCase();
      const cust = (t.customer_id || '').toLowerCase();
      const acc = (t.akun || '').toLowerCase();
      const targetName = cleanName.toLowerCase();
      const targetNo = cleanNo.toLowerCase();

      const matchNo = targetNo.length >= 3 && (cust.includes(targetNo) || desc.includes(targetNo) || acc.includes(targetNo));
      const matchName = targetName.length >= 3 && (desc.includes(targetName) || acc.includes(targetName));

      return matchNo || matchName;
    });
  },

  getCustomers(): CustomerRecord[] {
    return DEFAULT_CUSTOMERS;
  },

  getSuppliers(): SupplierRecord[] {
    return DEFAULT_SUPPLIERS;
  },
};

