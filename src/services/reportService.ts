import { getSupabaseClient } from '../lib/supabase';
import { COAAccount, JournalEntry, LedgerEntry, TransactionRecord } from '../types/database';
import { cleanNumeric, getAllTransactionsRaw } from './transactionService';

export const COA_TABLE_NAME = 'chart_of_accounts';

export const COA_ACCOUNTS: COAAccount[] = [
  { kode: '1110', nama: 'Kas & Bank Syariah (BSI)', jenis: 'Aset', normal: 'Debit' },
  { kode: '1120', nama: 'Persediaan Komoditas Riil', jenis: 'Aset', normal: 'Debit', kategori: 'PERSEDIAAN' },
  { kode: '1130', nama: 'Piutang Usaha & Anggota', jenis: 'Aset', normal: 'Debit', kategori: 'PIUTANG' },
  { kode: '1210', nama: 'Persediaan Komoditas Riil', jenis: 'Aset', normal: 'Debit' },
  { kode: '1310', nama: 'Aset Tetap & Peralatan Usaha', jenis: 'Aset', normal: 'Debit' },
  { kode: '2110', nama: 'Hutang Usaha & Supplier', jenis: 'Liabilitas', normal: 'Kredit', kategori: 'HUTANG' },
  { kode: '3110', nama: 'Simpanan Pokok Anggota', jenis: 'Ekuitas', normal: 'Kredit', kategori: 'SIMPANAN POKOK' },
  { kode: '3120', nama: 'Simpanan Wajib Anggota', jenis: 'Ekuitas', normal: 'Kredit', kategori: 'SIMPANAN WAJIB' },
  { kode: '3130', nama: 'Simpanan Sukarela (Manasuka)', jenis: 'Ekuitas', normal: 'Kredit', kategori: 'SIMPANAN SUKARELA' },
  { kode: '3140', nama: 'Cadangan Koperasi (25%)', jenis: 'Ekuitas', normal: 'Kredit' },
  { kode: '4110', nama: 'Pendapatan Usaha', jenis: 'Pendapatan', normal: 'Kredit', kategori: 'PENJUALAN' },
  { kode: '4120', nama: 'Pendapatan Jasa & Bagi Hasil', jenis: 'Pendapatan', normal: 'Kredit', kategori: 'JASA' },
  { kode: '5110', nama: 'Beban Pokok Penjualan / Bahan Baku', jenis: 'Beban', normal: 'Debit', kategori: 'PEMBELIAN' },
  { kode: '5120', nama: 'Beban Operasional & Administrasi', jenis: 'Beban', normal: 'Debit', kategori: 'OPERASIONAL' },
  { kode: '5130', nama: 'Beban Logistik & Rantai Dingin', jenis: 'Beban', normal: 'Debit', kategori: 'LOGISTIK' },
];

/**
 * cariAkunCOA / getCoaByKategori:
 * Pure function untuk mencari akun COA yang cocok berdasarkan kategori, referal, dan area_jenis
 */
export function getCoaByKategori(
  kategori?: string,
  referal?: string,
  areaJenis?: string,
  coaList: COAAccount[] = COA_ACCOUNTS
): COAAccount | null {
  if (!kategori) return null;

  const targetKat = kategori.toUpperCase().trim();
  const targetRef = (referal || 'KOPERASI').toUpperCase().trim();
  const targetArea = (areaJenis || '').toUpperCase().trim();

  for (const acc of coaList) {
    const rawKat = ((acc as any).kategori_transaksi || acc.kategori || acc.nama || '').toUpperCase().trim();

    // Cek kecocokan kategori (exact match atau kecocokan kata kunci)
    const isMatch =
      rawKat === targetKat ||
      (targetKat.includes('POKOK') && acc.kode === '3110') ||
      (targetKat.includes('WAJIB') && acc.kode === '3120') ||
      ((targetKat.includes('MANASUKA') || targetKat.includes('SUKARELA')) && acc.kode === '3130') ||
      ((targetKat.includes('PERSEDIAAN') || targetKat.includes('STOK')) && acc.kode === '1120') ||
      ((targetKat.includes('BAHAN') || targetKat.includes('PEMBELIAN')) && acc.kode === '5110') ||
      ((targetKat.includes('OPERASIONAL') || targetKat.includes('BIAYA') || targetKat.includes('BEBAN')) && acc.kode === '5120') ||
      (targetKat.includes('LOGISTIK') && acc.kode === '5130') ||
      ((targetKat.includes('PENJUALAN') || targetKat.includes('HASIL') || targetKat.includes('PENDAPATAN')) && acc.kode === '4110') ||
      (rawKat && (targetKat.includes(rawKat) || rawKat.includes(targetKat)));

    if (!isMatch) continue;

    // jika akun.referal terisi DAN referal akun !== referal transaksi: skip
    const accRef = (acc.referal || (acc as any).referral_type || '').toUpperCase().trim();
    if (accRef && accRef !== targetRef) {
      continue;
    }

    // jika akun.area_jenis terisi DAN area_jenis akun !== area_jenis transaksi: skip
    const accArea = (acc.areaJenis || (acc as any).area_type || (acc as any).area_jenis || '').toUpperCase().trim();
    if (accArea && targetArea && accArea !== targetArea) {
      continue;
    }

    return acc;
  }

  return null;
}

/**
 * getJurnalFromTransactions:
 * Pure function - Jantung seluruh laporan akuntansi.
 * Mengonversi daftar transaksi menjadi entitas Debit/Kredit buku jurnal.
 */
export function getJurnalFromTransactions(
  transactions: TransactionRecord[],
  coa: COAAccount[] = COA_ACCOUNTS
): JournalEntry[] {
  const jurnal: JournalEntry[] = [];

  for (const t of transactions) {
    const nominal = cleanNumeric(t.jumlah);
    if (nominal === 0 && !t.jumlah) continue;

    const jenis = (t.jenis || '').toString().toUpperCase().trim();
    const kategori = t.kategori || '';
    const ref = (t.referal || 'KOPERASI').toString().toUpperCase().trim();
    const areaJenis = (t.area_jenis || '').toString().toUpperCase().trim();
    const tgl = t.tanggal || new Date().toISOString().split('T')[0];
    const keterangan = t.keterangan || `${t.kategori || ''} - ${t.plantation || ''}`.trim() || 'Transaksi Kas';
    const txId = t.id || `TX-${Math.random().toString(36).substring(2, 9)}`;

    // Cari akun COA yang cocok kategori
    let akun = getCoaByKategori(kategori, ref, areaJenis, coa);
    if (!akun) {
      if (jenis === 'MASUK') {
        akun = { kode: '4110', nama: 'Pendapatan Usaha', jenis: 'Pendapatan', normal: 'Kredit' };
      } else {
        akun = { kode: '5110', nama: 'Beban Operasional', jenis: 'Beban', normal: 'Debit' };
      }
    }

    if (jenis === 'MASUK') {
      if (akun.jenis === 'Ekuitas') {
        // setoran simpanan anggota, dsb
        jurnal.push({
          tanggal: tgl,
          id: txId,
          akun: '1110',
          namaAkun: 'Kas',
          debit: nominal,
          kredit: 0,
          keterangan,
        });
        jurnal.push({
          tanggal: tgl,
          id: txId,
          akun: akun.kode,
          namaAkun: akun.nama,
          debit: 0,
          kredit: nominal,
          keterangan,
        });
      } else {
        jurnal.push({
          tanggal: tgl,
          id: txId,
          akun: '1110',
          namaAkun: 'Kas',
          debit: nominal,
          kredit: 0,
          keterangan,
        });
        jurnal.push({
          tanggal: tgl,
          id: txId,
          akun: akun.kode,
          namaAkun: akun.nama,
          debit: 0,
          kredit: nominal,
          keterangan,
        });
      }
    } else if (jenis === 'KELUAR') {
      if (akun.jenis === 'Aset' && akun.kode === '1120') {
        jurnal.push({
          tanggal: tgl,
          id: txId,
          akun: akun.kode,
          namaAkun: akun.nama,
          debit: nominal,
          kredit: 0,
          keterangan,
        });
        jurnal.push({
          tanggal: tgl,
          id: txId,
          akun: '1110',
          namaAkun: 'Kas',
          debit: 0,
          kredit: nominal,
          keterangan,
        });
      } else if (akun.jenis === 'Ekuitas') {
        jurnal.push({
          tanggal: tgl,
          id: txId,
          akun: akun.kode,
          namaAkun: akun.nama,
          debit: nominal,
          kredit: 0,
          keterangan,
        });
        jurnal.push({
          tanggal: tgl,
          id: txId,
          akun: '1110',
          namaAkun: 'Kas',
          debit: 0,
          kredit: nominal,
          keterangan,
        });
      } else {
        jurnal.push({
          tanggal: tgl,
          id: txId,
          akun: akun.kode,
          namaAkun: akun.nama,
          debit: nominal,
          kredit: 0,
          keterangan,
        });
        jurnal.push({
          tanggal: tgl,
          id: txId,
          akun: '1110',
          namaAkun: 'Kas',
          debit: 0,
          kredit: nominal,
          keterangan,
        });
      }
    }
  }

  return jurnal;
}

export const reportService = {
  async getCOA(): Promise<COAAccount[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from(COA_TABLE_NAME)
          .select('*');

        if (!error && data && data.length > 0) {
          const mapped: COAAccount[] = data.map((row: any) => ({
            kode: row.kode || row.account_code || row.kode_akun || row.code || '',
            nama: row.nama || row.account_name || row.nama_akun || row.name || '',
            jenis: (row.jenis || row.account_type || row.jenis_akun || row.type || 'Aset') as any,
            normal: (row.normal || row.normal_balance || row.normal_saldo || 'Debit') as any,
            kategori: row.kategori || row.kategori_transaksi || row.category || '',
            referal: row.referal || row.referral_type || row.referral || '',
            areaJenis: row.areaJenis || row.area_type || row.area_jenis || '',
          }));
          return mapped.sort((a, b) => a.kode.localeCompare(b.kode));
        }
        if (error) {
          console.warn('Supabase chart_of_accounts query error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase chart_of_accounts connection error:', err);
      }
    }

    return COA_ACCOUNTS;
  },

  async getJournalEntries(startDate?: string, endDate?: string): Promise<JournalEntry[]> {
    const transactions = await getAllTransactionsRaw(startDate, endDate);
    const coaList = await this.getCOA();
    return getJurnalFromTransactions(transactions, coaList);
  },

  async getLedger(
    kodeAkun: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ account: COAAccount; entries: LedgerEntry[]; finalSaldo: number }> {
    const coaList = await this.getCOA();
    const account = coaList.find((a) => a.kode === kodeAkun) || coaList[0];

    const journal = await this.getJournalEntries(startDate, endDate);
    // filter jurnal dengan akun===kodeAkun, urutkan tanggal, saldo berjalan += (debit - kredit) tiap baris
    const relevant = journal
      .filter((j) => j.akun === kodeAkun)
      .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    let runningSaldo = 0;
    const ledgerEntries: LedgerEntry[] = [];

    relevant.forEach((j) => {
      if (account.normal === 'Debit') {
        runningSaldo += j.debit - j.kredit;
      } else {
        runningSaldo += j.kredit - j.debit;
      }

      ledgerEntries.push({
        tanggal: j.tanggal,
        id: j.id,
        keterangan: j.keterangan,
        debit: j.debit,
        kredit: j.kredit,
        saldo: runningSaldo,
      });
    });

    return {
      account,
      entries: ledgerEntries,
      finalSaldo: runningSaldo,
    };
  },

  async getTrialBalance(startDate?: string, endDate?: string): Promise<Array<{ kode: string; nama: string; debit: number; kredit: number }>> {
    // kelompokkan jurnal per kode akun, jumlahkan debit & kredit masing-masing akun
    const journal = await this.getJournalEntries(startDate, endDate);
    const coaList = await this.getCOA();

    return coaList.map((acc) => {
      let debit = 0;
      let kredit = 0;
      journal
        .filter((j) => j.akun === acc.kode)
        .forEach((j) => {
          debit += j.debit;
          kredit += j.kredit;
        });

      let netDebit = 0;
      let netKredit = 0;
      if (acc.normal === 'Debit') {
        const net = debit - kredit;
        if (net >= 0) netDebit = net;
        else netKredit = Math.abs(net);
      } else {
        const net = kredit - debit;
        if (net >= 0) netKredit = net;
        else netDebit = Math.abs(net);
      }

      return {
        kode: acc.kode,
        nama: acc.nama,
        debit: netDebit,
        kredit: netKredit,
      };
    });
  },

  async getProfitLoss(startDate?: string, endDate?: string): Promise<{
    pendapatan: Array<{ nama: string; jumlah: number }>;
    totalPendapatan: number;
    beban: Array<{ nama: string; jumlah: number }>;
    totalBeban: number;
    labaBersih: number;
  }> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.rpc('get_financial_profit_loss', {
          p_start_date: startDate || null,
          p_end_date: endDate || null,
        });
        if (!error && data && data.total_pendapatan !== undefined) {
          return {
            pendapatan: [
              { nama: 'Pendapatan Usaha (Penjualan Komoditas)', jumlah: Number(data.pendapatan_penjualan || 0) },
              { nama: 'Pendapatan Jasa & Bagi Hasil', jumlah: Number(data.pendapatan_jasa || 0) },
            ],
            totalPendapatan: Number(data.total_pendapatan || 0),
            beban: [
              { nama: 'Beban Pokok Penjualan (HPP)', jumlah: Number(data.beban_hpp || 0) },
              { nama: 'Beban Operasional & Administrasi', jumlah: Number(data.beban_operasional || 0) },
              { nama: 'Beban Logistik & Rantai Dingin', jumlah: Number(data.beban_logistik || 0) },
            ],
            totalBeban: Number(data.total_beban || 0),
            labaBersih: Number(data.laba_bersih || 0),
          };
        }
      } catch (err) {
        console.warn('Supabase get_financial_profit_loss RPC error fallback:', err);
      }
    }

    // dari jurnal + COA, untuk akun jenis 'Pendapatan': pendapatan += (kredit - debit); untuk akun jenis 'Beban': beban += (debit - kredit)
    // labaRugi = pendapatan - beban
    const journal = await this.getJournalEntries(startDate, endDate);
    const coaList = await this.getCOA();

    const pendapatanMap = new Map<string, { nama: string; jumlah: number }>();
    const bebanMap = new Map<string, { nama: string; jumlah: number }>();

    coaList.forEach((acc) => {
      if (acc.jenis === 'Pendapatan') {
        pendapatanMap.set(acc.kode, { nama: acc.nama, jumlah: 0 });
      } else if (acc.jenis === 'Beban') {
        bebanMap.set(acc.kode, { nama: acc.nama, jumlah: 0 });
      }
    });

    journal.forEach((j) => {
      const acc = coaList.find((a) => a.kode === j.akun);
      if (!acc) return;

      if (acc.jenis === 'Pendapatan') {
        const entry = pendapatanMap.get(acc.kode) || { nama: acc.nama, jumlah: 0 };
        entry.jumlah += j.kredit - j.debit;
        pendapatanMap.set(acc.kode, entry);
      } else if (acc.jenis === 'Beban') {
        const entry = bebanMap.get(acc.kode) || { nama: acc.nama, jumlah: 0 };
        entry.jumlah += j.debit - j.kredit;
        bebanMap.set(acc.kode, entry);
      }
    });

    const pendapatan = Array.from(pendapatanMap.values());
    const totalPendapatan = pendapatan.reduce((a, b) => a + b.jumlah, 0);

    const beban = Array.from(bebanMap.values());
    const totalBeban = beban.reduce((a, b) => a + b.jumlah, 0);

    const labaBersih = totalPendapatan - totalBeban;

    return {
      pendapatan,
      totalPendapatan,
      beban,
      totalBeban,
      labaBersih,
    };
  },

  async getBalanceSheet(startDate?: string, endDate?: string): Promise<{
    aset: Array<{ nama: string; jumlah: number }>;
    totalAset: number;
    liabilitas: Array<{ nama: string; jumlah: number }>;
    totalLiabilitas: number;
    ekuitas: Array<{ nama: string; jumlah: number }>;
    totalEkuitas: number;
  }> {
    // dari neraca saldo + COA, kelompokkan per jenis akun (Aset/Liabilitas/Ekuitas), saldo tiap akun = debit - kredit
    const tb = await this.getTrialBalance(startDate, endDate);
    const pl = await this.getProfitLoss(startDate, endDate);
    const coaList = await this.getCOA();

    const aset: Array<{ nama: string; jumlah: number }> = [];
    const liabilitas: Array<{ nama: string; jumlah: number }> = [];
    const ekuitas: Array<{ nama: string; jumlah: number }> = [];

    tb.forEach((item) => {
      const acc = coaList.find((a) => a.kode === item.kode);
      if (!acc) return;

      if (acc.jenis === 'Aset') {
        aset.push({ nama: item.nama, jumlah: item.debit - item.kredit });
      } else if (acc.jenis === 'Liabilitas') {
        liabilitas.push({ nama: item.nama, jumlah: item.kredit - item.debit });
      } else if (acc.jenis === 'Ekuitas') {
        ekuitas.push({ nama: item.nama, jumlah: item.kredit - item.debit });
      }
    });

    // Tambahkan Laba Tahun Berjalan ke Ekuitas
    ekuitas.push({ nama: 'Laba Tahun Berjalan (SHU)', jumlah: pl.labaBersih });

    const totalAset = aset.reduce((a, b) => a + b.jumlah, 0);
    const totalLiabilitas = liabilitas.reduce((a, b) => a + b.jumlah, 0);
    const totalEkuitas = ekuitas.reduce((a, b) => a + b.jumlah, 0);

    return {
      aset,
      totalAset,
      liabilitas,
      totalLiabilitas,
      ekuitas,
      totalEkuitas,
    };
  },

  async getSHUCalculation(startDate?: string, endDate?: string): Promise<{
    totalSHUKotor: number;
    cadanganKoperasi: number; // 25%
    shuBagianAnggota: number; // 75%
    jasaModal: number; // 40% dari 75%
    jasaUsaha: number; // 60% dari 75%
  }> {
    const client = getSupabaseClient();
    const year = startDate ? new Date(startDate).getFullYear() : new Date().getFullYear();

    if (client) {
      try {
        const { data, error } = await client.rpc('get_shu_distribution', {
          p_year: year,
        });
        if (!error && data && data.total_shu_kotor !== undefined) {
          return {
            totalSHUKotor: Number(data.total_shu_kotor || 0),
            cadanganKoperasi: Number(data.cadangan_koperasi_25 || 0),
            shuBagianAnggota: Number(data.shu_bagian_anggota_75 || 0),
            jasaModal: Number(data.jasa_modal_simpanan_40 || 0),
            jasaUsaha: Number(data.jasa_usaha_transaksi_60 || 0),
          };
        }
      } catch (err) {
        console.warn('Supabase get_shu_distribution RPC error fallback:', err);
      }
    }

    // labaBersih = hasil getLaporanLabaRugi
    // cadangan = labaBersih * 0.25
    // shu = labaBersih - cadangan
    // Pembagian 40% Jasa Modal / 60% Jasa Usaha dari bagian anggota (75%)
    const pl = await this.getProfitLoss(startDate, endDate);
    const totalSHUKotor = Math.max(0, pl.labaBersih);
    const cadanganKoperasi = totalSHUKotor * 0.25;
    const shuBagianAnggota = totalSHUKotor - cadanganKoperasi; // 75%
    const jasaModal = shuBagianAnggota * 0.40;
    const jasaUsaha = shuBagianAnggota * 0.60;

    return {
      totalSHUKotor,
      cadanganKoperasi,
      shuBagianAnggota,
      jasaModal,
      jasaUsaha,
    };
  },

  /**
   * getCashFlow (Laporan Arus Kas)
   * Mengelompokkan arus kas berdasarkan aktivitas Operasi, Investasi, dan Pendanaan
   */
  async getCashFlow(
    startDate?: string,
    endDate?: string
  ): Promise<{
    operasi: number;
    investasi: number;
    pendanaan: number;
    totalArusKas: number;
    detailKategori: Array<{ kategori: string; tipe: 'Operasi' | 'Investasi' | 'Pendanaan'; jumlah: number }>;
  }> {
    const transactions = await getAllTransactionsRaw(startDate, endDate);

    let operasi = 0;
    let investasi = 0;
    let pendanaan = 0;
    const detailMap = new Map<string, { tipe: 'Operasi' | 'Investasi' | 'Pendanaan'; jumlah: number }>();

    transactions.forEach((t) => {
      const nominal = cleanNumeric(t.jumlah);
      const jenis = (t.jenis || '').toString().toUpperCase().trim();
      const kategori = (t.kategori || 'LAINNYA').toString().toUpperCase().trim();
      const area = (t.area_jenis || t.plantation || '').toString().toUpperCase().trim();

      const delta = jenis === 'MASUK' ? nominal : -nominal;
      let isOperasi = true;
      let tipe: 'Operasi' | 'Investasi' | 'Pendanaan' = 'Operasi';

      if (area.includes('PROJECT')) {
        isOperasi = false;
      }

      if (kategori.includes('SIMPANAN')) {
        isOperasi = false;
        pendanaan += delta;
        tipe = 'Pendanaan';
      } else if (isOperasi) {
        operasi += delta;
        tipe = 'Operasi';
      } else {
        investasi += delta;
        tipe = 'Investasi';
      }

      const existing = detailMap.get(kategori) || { tipe, jumlah: 0 };
      existing.jumlah += delta;
      detailMap.set(kategori, existing);
    });

    const detailKategori = Array.from(detailMap.entries()).map(([kategori, item]) => ({
      kategori,
      tipe: item.tipe,
      jumlah: item.jumlah,
    }));

    return {
      operasi,
      investasi,
      pendanaan,
      totalArusKas: operasi + investasi + pendanaan,
      detailKategori,
    };
  },

  /**
   * getRekap (Laporan Rekapitulasi Keuangan)
   * level: 'PROJECT' | 'CABANG' | 'PLANTATION'
   * Mengelompokkan total masuk, total keluar, dan saldo per unit/lokasi
   */
  async getRekap(
    level: 'PROJECT' | 'CABANG' | 'PLANTATION',
    startDate?: string,
    endDate?: string
  ): Promise<
    Array<{
      key: string;
      level: 'PROJECT' | 'CABANG' | 'PLANTATION';
      masuk: number;
      keluar: number;
      saldo: number;
      totalTransaksi: number;
    }>
  > {
    const transactions = await getAllTransactionsRaw(startDate, endDate);
    const groups = new Map<string, { masuk: number; keluar: number; count: number }>();

    transactions.forEach((t) => {
      const areaJenis = (t.area_jenis || '').toString().toUpperCase().trim();
      const plantation = (t.plantation || '').toString().toUpperCase().trim();
      const nominal = cleanNumeric(t.jumlah);
      const jenis = (t.jenis || '').toString().toUpperCase().trim();

      let key = '';
      if (level === 'PROJECT') {
        if (areaJenis.includes('PROJECT') || plantation.includes('PROYEK') || plantation.includes('PROJECT')) {
          key = plantation || 'PROJECT LAINNYA';
        } else {
          return;
        }
      } else if (level === 'CABANG') {
        if (areaJenis.includes('CABANG') || areaJenis.includes('PUSAT')) {
          key = areaJenis || 'KOPERASI';
        } else {
          key = areaJenis || 'LAINNYA';
        }
      } else if (level === 'PLANTATION') {
        key = plantation || areaJenis || 'TIDAK DITENTUKAN';
      }

      if (!key) key = 'UMUM';

      const existing = groups.get(key) || { masuk: 0, keluar: 0, count: 0 };
      if (jenis === 'MASUK') {
        existing.masuk += nominal;
      } else if (jenis === 'KELUAR') {
        existing.keluar += nominal;
      }
      existing.count += 1;
      groups.set(key, existing);
    });

    return Array.from(groups.entries())
      .map(([key, val]) => ({
        key,
        level,
        masuk: val.masuk,
        keluar: val.keluar,
        saldo: val.masuk - val.keluar,
        totalTransaksi: val.count,
      }))
      .sort((a, b) => b.masuk - a.masuk);
  },

  /**
   * getAnalytics (Laporan Analitik Tren dan Distribusi Kategori)
   * Menghasilkan pendapatan/beban bulanan (YYYY-MM) dan 10 kategori teratas
   */
  async getAnalytics(
    startDate?: string,
    endDate?: string
  ): Promise<{
    pendapatanBulanan: Array<{ bulan: string; nominal: number }>;
    bebanBulanan: Array<{ bulan: string; nominal: number }>;
    trenBulanan: Array<{ bulan: string; pendapatan: number; beban: number; surplus: number }>;
    topKategori: Array<{ kategori: string; masuk: number; keluar: number; saldo: number; totalTransaksi: number }>;
  }> {
    const transactions = await getAllTransactionsRaw(startDate, endDate);

    const bulanMasukMap = new Map<string, number>();
    const bulanKeluarMap = new Map<string, number>();
    const allMonths = new Set<string>();

    const kategoriMap = new Map<string, { masuk: number; keluar: number; count: number }>();

    transactions.forEach((t) => {
      const nominal = cleanNumeric(t.jumlah);
      const jenis = (t.jenis || '').toString().toUpperCase().trim();
      const kat = (t.kategori || 'Lainnya').toString().trim();
      const tgl = (t.tanggal || '').toString().trim();
      const bulan = tgl.length >= 7 ? tgl.substring(0, 7) : new Date().toISOString().substring(0, 7);

      allMonths.add(bulan);

      if (jenis === 'MASUK') {
        bulanMasukMap.set(bulan, (bulanMasukMap.get(bulan) || 0) + nominal);
      } else if (jenis === 'KELUAR') {
        bulanKeluarMap.set(bulan, (bulanKeluarMap.get(bulan) || 0) + nominal);
      }

      const existingKat = kategoriMap.get(kat) || { masuk: 0, keluar: 0, count: 0 };
      if (jenis === 'MASUK') {
        existingKat.masuk += nominal;
      } else if (jenis === 'KELUAR') {
        existingKat.keluar += nominal;
      }
      existingKat.count += 1;
      kategoriMap.set(kat, existingKat);
    });

    const sortedMonths = Array.from(allMonths).sort();

    const pendapatanBulanan = sortedMonths.map((bulan) => ({
      bulan,
      nominal: bulanMasukMap.get(bulan) || 0,
    }));

    const bebanBulanan = sortedMonths.map((bulan) => ({
      bulan,
      nominal: bulanKeluarMap.get(bulan) || 0,
    }));

    const trenBulanan = sortedMonths.map((bulan) => {
      const pendapatan = bulanMasukMap.get(bulan) || 0;
      const beban = bulanKeluarMap.get(bulan) || 0;
      return {
        bulan,
        pendapatan,
        beban,
        surplus: pendapatan - beban,
      };
    });

    // topKategori: kelompokkan saldo (masuk-keluar) per kategori, urutkan turun, ambil 10 teratas
    const topKategori = Array.from(kategoriMap.entries())
      .map(([kategori, val]) => ({
        kategori,
        masuk: val.masuk,
        keluar: val.keluar,
        saldo: val.masuk - val.keluar,
        totalTransaksi: val.count,
      }))
      .sort((a, b) => b.saldo - a.saldo)
      .slice(0, 10);

    return {
      pendapatanBulanan,
      bebanBulanan,
      trenBulanan,
      topKategori,
    };
  },
};
