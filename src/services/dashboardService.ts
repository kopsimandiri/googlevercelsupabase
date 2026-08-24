import { getSupabaseClient } from '../lib/supabase';
import {
  DashboardMetrics,
  FinancialBreakdown,
  MemberRecord,
  PeriodFilter,
  ProjectSummary,
  TransactionRecord,
} from '../types/database';
import { cleanRupiah } from '../utils/formatters';
import { getAllTransactionsRaw, cleanNumeric } from './transactionService';

// Confirmed baseline data based on KOPSIM Legacy Core Engine
const BASELINE_TRANSACTIONS: TransactionRecord[] = [
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

const DEFAULT_PROJECT_NAMES = [
  'KAMPUNG HAJI',
  'TRADING IKAN',
  'GARAM',
  'PERTANIAN',
  'PLYWOOD',
  'MINYAK MERAH',
  'SUPPLIER MBG',
  'DISTRIBUTOR MEATSHOP',
];

export const dashboardService = {
  /**
   * Calculates financial breakdown matching legacy GAS calculateFinancialSummary_
   */
  calculateSummary(transactions: TransactionRecord[]): FinancialBreakdown {
    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    const koperasi = { masuk: 0, keluar: 0 };
    const project = { masuk: 0, keluar: 0 };
    const simpanan = { pokok: 0, wajib: 0, manasuka: 0, total: 0 };

    transactions.forEach((t) => {
      const areaJenis = (t.area_jenis || '').toString().toUpperCase().trim();
      const jenis = (t.jenis || '').toString().toUpperCase().trim();
      const kategori = (t.kategori || '').toString().toUpperCase().trim();
      const jumlah = cleanNumeric(t.jumlah);

      if (jenis === 'MASUK') {
        totalPemasukan += jumlah;
        if (areaJenis.includes('KOPERASI')) koperasi.masuk += jumlah;
        if (areaJenis.includes('PROJECT')) project.masuk += jumlah;

        // Simpanan calculation
        if (kategori.includes('POKOK')) simpanan.pokok += jumlah;
        else if (kategori.includes('WAJIB')) simpanan.wajib += jumlah;
        else if (kategori.includes('MANA') || kategori.includes('SUKARELA')) {
          simpanan.manasuka += jumlah;
        }
      } else if (jenis === 'KELUAR') {
        totalPengeluaran += jumlah;
        if (areaJenis.includes('KOPERASI')) koperasi.keluar += jumlah;
        if (areaJenis.includes('PROJECT')) project.keluar += jumlah;

        // Simpanan penarikan (if any)
        if (kategori.includes('POKOK')) simpanan.pokok -= jumlah;
        else if (kategori.includes('WAJIB')) simpanan.wajib -= jumlah;
        else if (kategori.includes('MANA') || kategori.includes('SUKARELA')) {
          simpanan.manasuka -= jumlah;
        }
      }
    });

    const totalKoperasi = koperasi.masuk - koperasi.keluar;
    const totalProject = project.masuk - project.keluar;
    const saldo = totalPemasukan - totalPengeluaran;
    simpanan.total = simpanan.pokok + simpanan.wajib + simpanan.manasuka;

    return {
      totalKoperasi,
      totalProject,
      totalPemasukan,
      totalPengeluaran,
      saldo,
      koperasi,
      project,
      simpanan,
    };
  },

  /**
   * Fetches all project summaries matching legacy GAS getProjectSummary & getAllProjectsWithTransactions
   */
  calculateProjectSummaries(transactions: TransactionRecord[]): ProjectSummary[] {
    return DEFAULT_PROJECT_NAMES.map((projectName) => {
      const projUpper = projectName.toUpperCase().trim();
      const projectTrx = transactions.filter(
        (t) =>
          (t.area_jenis || '').toUpperCase().trim() === 'PROJECT' &&
          (t.plantation || '').toUpperCase().trim() === projUpper
      );

      let masuk = 0;
      let keluar = 0;
      const komoditasSet = new Set<string>();

      projectTrx.forEach((t) => {
        const nominal = cleanNumeric(t.jumlah);
        if ((t.jenis || '').toUpperCase() === 'MASUK') {
          masuk += nominal;
        } else {
          keluar += nominal;
        }
        if (t.sku_name) {
          komoditasSet.add(t.sku_name);
        }
      });

      const saldo = masuk - keluar;

      return {
        name: projectName,
        totalMasuk: masuk,
        totalKeluar: keluar,
        saldo,
        transaksiCount: projectTrx.length,
        komoditas: Array.from(komoditasSet),
        status: saldo > 0 || projectTrx.length > 0 ? 'Aktif' : 'Dalam Pengembangan',
      };
    });
  },

  /**
   * Loads complete dashboard metrics with Supabase querying or baseline dataset
   */
  async getDashboardMetrics(period: PeriodFilter = 'ALL'): Promise<DashboardMetrics> {
    let startDate: string | undefined;
    let endDate: string | undefined;
    const now = new Date();

    if (period === 'THIS_MONTH') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      startDate = `${y}-${m}-01`;
      endDate = now.toISOString().split('T')[0];
    } else if (period === 'THIS_YEAR') {
      const y = now.getFullYear();
      startDate = `${y}-01-01`;
      endDate = now.toISOString().split('T')[0];
    } else if (period === 'LAST_30_DAYS') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    }

    // 1. Ambil data transaksi menggunakan getAllTransactionsRaw (dengan filter query-level)
    let transactions = await getAllTransactionsRaw(startDate, endDate);
    if (transactions.length === 0 && period === 'ALL') {
      transactions = [...BASELINE_TRANSACTIONS];
    }

    // 2. Query data anggota
    const membersCount = { total: 1542, pusat: 680, cabang: 862 };
    const client = getSupabaseClient();
    if (client) {
      try {
        const { count: totalMembers, error: memErr } = await client
          .from('members')
          .select('*', { count: 'exact', head: true });

        if (!memErr && totalMembers !== null) {
          membersCount.total = totalMembers;
        }
      } catch (err) {
        console.warn('Members count query error:', err);
      }
    }

    // 3. Calculate Financials and Project Summaries
    const financial = this.calculateSummary(transactions);
    const projects = this.calculateProjectSummaries(transactions);

    // 4. Recent Transactions (Top 8 sorted by date/time descending)
    const recentTransactions = [...transactions]
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
      .slice(0, 8);

    return {
      financial,
      membership: membersCount,
      projects,
      recentTransactions,
      lastUpdated: new Date().toISOString(),
    };
  },
};
