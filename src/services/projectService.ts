import { ProjectSummary, TransactionRecord } from '../types/database';
import { getSupabaseClient } from '../lib/supabase';
import { getAllTransactionsRaw, cleanNumeric } from './transactionService';

export interface ProjectDetailInfo {
  name: string;
  code: string;
  category: string;
  lead: string;
  location: string;
  defaultSku: string;
  defaultPrice: number;
  unit: string;
  description: string;
  status: 'Aktif' | 'Dalam Pengembangan';
}

export const STRATEGIC_PROJECTS: ProjectDetailInfo[] = [
  {
    name: 'KAMPUNG HAJI',
    code: 'P01',
    category: 'Properti & Hospitality',
    lead: 'Divisi Hospitality Syariah',
    location: 'Cianjur / Bogor, Jawa Barat',
    defaultSku: 'Kavling Terpadu Syariah',
    defaultPrice: 150000000,
    unit: 'Unit Kavling',
    description: 'Pengembangan kawasan terpadu edukasi haji, agrowisata manasik, dan permukiman halal mandiri.',
    status: 'Aktif',
  },
  {
    name: 'TRADING IKAN',
    code: 'P02',
    category: 'Perikanan & Maritim',
    lead: 'Divisi Kelautan & Cold Chain',
    location: 'Muara Baru, Jakarta & Pantai Utara',
    defaultSku: 'Ikan Tuna Segar Grade A',
    defaultPrice: 65000,
    unit: 'Kg',
    description: 'Jaringan distribusi ikan segar dan beku dari nelayan binaan ke jaringan Horeka dan ritel modern.',
    status: 'Aktif',
  },
  {
    name: 'GARAM',
    code: 'P03',
    category: 'Industri & Tambak Garam',
    lead: 'Divisi Agro Maritim',
    location: 'Indramayu & Sampang Madura',
    defaultSku: 'Garam Rakyat Kualitas 1',
    defaultPrice: 4000,
    unit: 'Kg',
    description: 'Hilirisasi garam rakyat berkualitas industri untuk konsumsi pangan dan industri olahan.',
    status: 'Aktif',
  },
  {
    name: 'PERTANIAN',
    code: 'P04',
    category: 'Agrikultur & Pangan',
    lead: 'Divisi Ketahanan Pangan',
    location: 'Cianjur & Subang, Jawa Barat',
    defaultSku: 'Beras Organik Premium',
    defaultPrice: 14000,
    unit: 'Kg',
    description: 'Kemitraan sawah mandiri, produksi gabah, beras organik tanpa pestisida, dan komoditas palawija.',
    status: 'Aktif',
  },
  {
    name: 'PLYWOOD',
    code: 'P05',
    category: 'Manufaktur & Material',
    lead: 'Divisi Industri Kayu Olahan',
    location: 'Jawa Tengah & Kalimantan',
    defaultSku: 'Plywood Hardwood 18mm',
    defaultPrice: 220000,
    unit: 'Lembar',
    description: 'Penyediaan kayu lapis kualitas ekspor dan konstruksi dalam negeri dengan legalitas SVLK.',
    status: 'Aktif',
  },
  {
    name: 'MINYAK MERAH',
    code: 'P06',
    category: 'Pengolahan Kelapa Sawit (RPO)',
    lead: 'Divisi Bio-Industri',
    location: 'Sumatera & Kalimantan Barat',
    defaultSku: 'Red Palm Oil Nutrisi Tinggi',
    defaultPrice: 18000,
    unit: 'Liter',
    description: 'Produksi minyak sawit merah kaya beta-karoten dan vitamin E untuk ketahanan gizi keluarga.',
    status: 'Aktif',
  },
  {
    name: 'SUPPLIER MBG',
    code: 'P07',
    category: 'Supply Chain Pangan Gizi',
    lead: 'Divisi Distribusi MBG',
    location: 'Jabodetabek & Nasional',
    defaultSku: 'Paket Bahan Pokok Bergizi',
    defaultPrice: 25000,
    unit: 'Porsi/Paket',
    description: 'Konsorsium penyedia pasokan protein hewani, sayur, telur, dan buah segar untuk program makan bergizi.',
    status: 'Aktif',
  },
  {
    name: 'DISTRIBUTOR MEATSHOP',
    code: 'P08',
    category: 'Peternakan & Daging Halal',
    lead: 'Divisi Ritel Halal Meat',
    location: 'Sentra RPH Jabodetabek',
    defaultSku: 'Daging Sapi Prime Cut Halal',
    defaultPrice: 125000,
    unit: 'Kg',
    description: 'Rantai pasok daging sapi dan ayam halal tersertifikasi MUI dengan jaminan rantai dingin higienis.',
    status: 'Aktif',
  },
];

export const projectService = {
  /**
   * Mengambil daftar unik nama project dari tabel areas
   * filter baris dengan referal === 'PROJECT' (uppercase, trim) DAN kolom entity/name tidak kosong
   * hasil = daftar unik nilai entity, urutkan alfabetis
   */
  async getProjectsFromAreas(): Promise<string[]> {
    const client = getSupabaseClient();
    let entities: string[] = [];

    if (client) {
      try {
        const { data, error } = await client.from('areas').select('*');
        if (!error && data && data.length > 0) {
          entities = data
            .filter((row: any) => {
              const referal = (row.referral_type || row.referal || row.type || '').toString().toUpperCase().trim();
              const entity = (row.name || row.entity || '').toString().trim();
              return referal === 'PROJECT' && entity.length > 0;
            })
            .map((row: any) => (row.name || row.entity || '').toString().trim());
        }
      } catch (err) {
        console.warn('getProjectsFromAreas query error:', err);
      }
    }

    if (entities.length === 0) {
      entities = STRATEGIC_PROJECTS.map((p) => p.name);
    }

    const unique = Array.from(new Set(entities)).filter(Boolean);
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  },

  /**
   * Mengambil ringkasan keuangan per proyek spesifik
   * filter: area_jenis === 'PROJECT' DAN plantation === namaProject (uppercase, trim, dibandingkan case-insensitive)
   * masuk = jumlah semua transaksi jenis MASUK
   * keluar = jumlah semua transaksi jenis KELUAR
   * return { totalMasuk: masuk, totalKeluar: keluar, saldo: masuk - keluar, totalTransaksi: jumlah baris }
   */
  async getProjectSummary(namaProject: string): Promise<{
    totalMasuk: number;
    totalKeluar: number;
    saldo: number;
    totalTransaksi: number;
  }> {
    const transactions = await getAllTransactionsRaw();
    const target = namaProject.toUpperCase().trim();

    const projectTrx = transactions.filter((t) => {
      const areaJenis = (t.area_jenis || '').toString().toUpperCase().trim();
      const plantation = (t.plantation || '').toString().toUpperCase().trim();
      return areaJenis === 'PROJECT' && plantation === target;
    });

    let masuk = 0;
    let keluar = 0;

    for (const t of projectTrx) {
      const jumlah = cleanNumeric(t.jumlah);
      const jenis = (t.jenis || '').toString().toUpperCase().trim();
      if (jenis === 'MASUK') {
        masuk += jumlah;
      } else if (jenis === 'KELUAR') {
        keluar += jumlah;
      }
    }

    return {
      totalMasuk: masuk,
      totalKeluar: keluar,
      saldo: masuk - keluar,
      totalTransaksi: projectTrx.length,
    };
  },

  /**
   * Mengambil semua project beserta data keuangan dinamisnya
   */
  async getProjectsWithFinancials(): Promise<Array<ProjectDetailInfo & ProjectSummary>> {
    const projectNames = await this.getProjectsFromAreas();
    const transactions = await getAllTransactionsRaw();

    return projectNames.map((projName, index) => {
      const projUpper = projName.toUpperCase().trim();
      const staticMeta = STRATEGIC_PROJECTS.find(
        (p) => p.name.toUpperCase().trim() === projUpper
      );

      const projTrx = transactions.filter((t) => {
        const areaJenis = (t.area_jenis || '').toString().toUpperCase().trim();
        const plantation = (t.plantation || '').toString().toUpperCase().trim();
        return areaJenis === 'PROJECT' && plantation === projUpper;
      });

      let masuk = 0;
      let keluar = 0;
      const komoditasSet = new Set<string>();

      projTrx.forEach((t) => {
        const nominal = cleanNumeric(t.jumlah);
        const jenis = (t.jenis || '').toString().toUpperCase().trim();
        if (jenis === 'MASUK') {
          masuk += nominal;
        } else if (jenis === 'KELUAR') {
          keluar += nominal;
        }
        if (t.sku_name) {
          komoditasSet.add(t.sku_name);
        }
      });

      const saldo = masuk - keluar;

      const baseInfo: ProjectDetailInfo = staticMeta || {
        name: projName,
        code: `P${String(index + 1).padStart(2, '0')}`,
        category: 'Unit Bisnis Sektor Riil',
        lead: 'Divisi Operasional Bisnis',
        location: 'Sentra Produksi / Distribusi',
        defaultSku: komoditasSet.size > 0 ? Array.from(komoditasSet)[0] : 'Komoditas Proyek',
        defaultPrice: 0,
        unit: 'Satuan',
        description: `Proyek pengembangan dan distribusi komoditas ${projName} KOPSIM Mandiri.`,
        status: 'Aktif',
      };

      return {
        ...baseInfo,
        totalMasuk: masuk,
        totalKeluar: keluar,
        saldo,
        transaksiCount: projTrx.length,
        komoditas: Array.from(komoditasSet),
        status: (saldo > 0 || projTrx.length > 0 ? 'Aktif' : baseInfo.status) as 'Aktif' | 'Dalam Pengembangan',
      };
    });
  },

  async getProjectTransactions(projectName: string): Promise<TransactionRecord[]> {
    const transactions = await getAllTransactionsRaw();
    const projUpper = projectName.toUpperCase().trim();
    return transactions.filter((t) => {
      const areaJenis = (t.area_jenis || '').toString().toUpperCase().trim();
      const plantation = (t.plantation || '').toString().toUpperCase().trim();
      return areaJenis === 'PROJECT' && plantation === projUpper;
    });
  },

  /**
   * getPortfolioData:
   * ambil semua baris areas dengan referal==='PROJECT', untuk tiap entity:
   *   ambil transaksi dengan area_jenis==='PROJECT' DAN plantation===entity
   *   totalMasuk, totalKeluar dari transaksi tsb
   *   saldo = totalMasuk - totalKeluar
   *   komoditas = daftar unik sku_name dari transaksi tsb (maks 3 ditampilkan)
   * stats = { totalProjects, totalValue: jumlah semua saldo, commodityCount: total komoditas unik lintas semua project }
   */
  async getPortfolioData(): Promise<{
    projects: Array<{
      entity: string;
      totalMasuk: number;
      totalKeluar: number;
      saldo: number;
      komoditas: string[];
      totalTransaksi: number;
    }>;
    stats: {
      totalProjects: number;
      totalValue: number;
      commodityCount: number;
    };
  }> {
    const entities = await this.getProjectsFromAreas();
    const transactions = await getAllTransactionsRaw();

    const allCommoditiesSet = new Set<string>();
    let grandTotalValue = 0;

    const projects = entities.map((entityName) => {
      const entityUpper = entityName.toUpperCase().trim();
      const projectTrx = transactions.filter((t) => {
        const areaJenis = (t.area_jenis || '').toString().toUpperCase().trim();
        const plantation = (t.plantation || '').toString().toUpperCase().trim();
        return areaJenis === 'PROJECT' && plantation === entityUpper;
      });

      let totalMasuk = 0;
      let totalKeluar = 0;
      const skuSet = new Set<string>();

      projectTrx.forEach((t) => {
        const nominal = cleanNumeric(t.jumlah);
        const jenis = (t.jenis || '').toString().toUpperCase().trim();
        if (jenis === 'MASUK') {
          totalMasuk += nominal;
        } else if (jenis === 'KELUAR') {
          totalKeluar += nominal;
        }

        if (t.sku_name && t.sku_name.trim()) {
          const skuClean = t.sku_name.trim();
          skuSet.add(skuClean);
          allCommoditiesSet.add(skuClean);
        }
      });

      const saldo = totalMasuk - totalKeluar;
      grandTotalValue += saldo;

      // komoditas = daftar unik sku_name dari transaksi tsb (maks 3 ditampilkan)
      const komoditas = Array.from(skuSet).slice(0, 3);

      return {
        entity: entityName,
        totalMasuk,
        totalKeluar,
        saldo,
        komoditas,
        totalTransaksi: projectTrx.length,
      };
    });

    const stats = {
      totalProjects: entities.length,
      totalValue: grandTotalValue,
      commodityCount: allCommoditiesSet.size,
    };

    return {
      projects,
      stats,
    };
  },
};
