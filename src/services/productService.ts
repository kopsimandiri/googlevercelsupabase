import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { ProductDbRecord } from '../types/database';

export interface ProductItem {
  id: string;
  sku_code: string;
  sku_name: string;
  group_id: string;
  group_name: string; // Nama Project / 8 Sektor Riil (misal: 'DISTRIBUTOR MEATSHOP', 'TRADING IKAN', dsb)
  subgroup: string;
  brand: string;
  grade: string;
  packaging: string;
  availability: string;
  moq: number;
  supply_capacity: string;
  defaultPrice: number;
  unit: string;
  created_at?: string;
  updated_at?: string;
}

const PRODUCTS_TABLE_NAME = 'products';
const STORAGE_PRODUCTS_KEY = 'kopsim_master_products_v2';

export const DEFAULT_PROJECT_PRODUCTS: ProductItem[] = [
  // 1. TRADING IKAN
  {
    id: 'PRD-IKAN-01',
    sku_code: 'SKU-TUNA-01',
    sku_name: 'Ikan Tuna Segar Tangkap Laut (Yellowfin)',
    group_id: 'GRP-IKAN',
    group_name: 'TRADING IKAN',
    subgroup: 'Ikan Laut Segar',
    brand: 'Kopsim Bahari',
    grade: 'Grade A Sashimi',
    packaging: 'Sterofoam + Ice Pack 25kg',
    availability: 'Tersedia',
    moq: 25,
    supply_capacity: '20 Ton / Bulan',
    defaultPrice: 65000,
    unit: 'Kg',
  },
  {
    id: 'PRD-IKAN-02',
    sku_code: 'SKU-LAYANG-01',
    sku_name: 'Ikan Layang Tangkap Segar',
    group_id: 'GRP-IKAN',
    group_name: 'TRADING IKAN',
    subgroup: 'Ikan Laut Segar',
    brand: 'Kopsim Bahari',
    grade: 'Grade A',
    packaging: 'Keranjang 30kg',
    availability: 'Tersedia',
    moq: 30,
    supply_capacity: '15 Ton / Bulan',
    defaultPrice: 22000,
    unit: 'Kg',
  },
  {
    id: 'PRD-IKAN-03',
    sku_code: 'SKU-CUMI-01',
    sku_name: 'Cumi-Cumi Beku Ekspor',
    group_id: 'GRP-IKAN',
    group_name: 'TRADING IKAN',
    subgroup: 'Cephalopoda',
    brand: 'Kopsim Bahari',
    grade: 'Export Grade',
    packaging: 'Master Box 10kg',
    availability: 'Tersedia',
    moq: 10,
    supply_capacity: '10 Ton / Bulan',
    defaultPrice: 75000,
    unit: 'Kg',
  },
  {
    id: 'PRD-IKAN-04',
    sku_code: 'SKU-KAKAP-01',
    sku_name: 'Kakap Merah Fillet Super',
    group_id: 'GRP-IKAN',
    group_name: 'TRADING IKAN',
    subgroup: 'Fillet Ikan',
    brand: 'Kopsim Bahari',
    grade: 'Super Fillet',
    packaging: 'Vacuum Pack 1kg',
    availability: 'Tersedia',
    moq: 10,
    supply_capacity: '5 Ton / Bulan',
    defaultPrice: 90000,
    unit: 'Kg',
  },

  // 2. DISTRIBUTOR MEATSHOP
  {
    id: 'PRD-MEAT-01',
    sku_code: 'SKU-MEAT-01',
    sku_name: 'Daging Sapi Prime Cut Halal Segar',
    group_id: 'GRP-MEAT',
    group_name: 'DISTRIBUTOR MEATSHOP',
    subgroup: 'Daging Sapi Segar',
    brand: 'Kopsim Meatshop',
    grade: 'Prime Halal',
    packaging: 'Vacuum Pack 1kg',
    availability: 'Tersedia',
    moq: 10,
    supply_capacity: '30 Ton / Bulan',
    defaultPrice: 125000,
    unit: 'Kg',
  },
  {
    id: 'PRD-MEAT-02',
    sku_code: 'SKU-AYAM-01',
    sku_name: 'Daging Ayam Karkas Broiler Segar',
    group_id: 'GRP-MEAT',
    group_name: 'DISTRIBUTOR MEATSHOP',
    subgroup: 'Unggas Segar',
    brand: 'Kopsim Meatshop',
    grade: 'Broiler Super',
    packaging: 'Plastik Higienis 1kg',
    availability: 'Tersedia',
    moq: 20,
    supply_capacity: '25 Ton / Bulan',
    defaultPrice: 38000,
    unit: 'Kg',
  },
  {
    id: 'PRD-MEAT-03',
    sku_code: 'SKU-KERBAU-01',
    sku_name: 'Daging Kerbau Allana Import',
    group_id: 'GRP-MEAT',
    group_name: 'DISTRIBUTOR MEATSHOP',
    subgroup: 'Daging Import',
    brand: 'Allana Halal',
    grade: 'Import A',
    packaging: 'Karton 20kg',
    availability: 'Tersedia',
    moq: 20,
    supply_capacity: '40 Ton / Bulan',
    defaultPrice: 85000,
    unit: 'Kg',
  },
  {
    id: 'PRD-MEAT-04',
    sku_code: 'SKU-CINCANG-01',
    sku_name: 'Daging Cincang Giling Super',
    group_id: 'GRP-MEAT',
    group_name: 'DISTRIBUTOR MEATSHOP',
    subgroup: 'Olahan Daging',
    brand: 'Kopsim Meatshop',
    grade: 'Grade A 80/20',
    packaging: 'Vacuum Pack 500g',
    availability: 'Tersedia',
    moq: 10,
    supply_capacity: '10 Ton / Bulan',
    defaultPrice: 110000,
    unit: 'Kg',
  },

  // 3. PERTANIAN
  {
    id: 'PRD-AGRI-01',
    sku_code: 'SKU-BERAS-01',
    sku_name: 'Beras Organik Pandan Wangi Cianjur',
    group_id: 'GRP-AGRI',
    group_name: 'PERTANIAN',
    subgroup: 'Beras & Padi',
    brand: 'Kopsim Agri',
    grade: 'Premium SVLK',
    packaging: 'Karung Vakum 25kg / 50kg',
    availability: 'Tersedia',
    moq: 100,
    supply_capacity: '50 Ton / Bulan',
    defaultPrice: 15000,
    unit: 'Kg',
  },
  {
    id: 'PRD-AGRI-02',
    sku_code: 'SKU-BERAS-02',
    sku_name: 'Beras Rojolele Super',
    group_id: 'GRP-AGRI',
    group_name: 'PERTANIAN',
    subgroup: 'Beras & Padi',
    brand: 'Kopsim Agri',
    grade: 'Super Clean',
    packaging: 'Karung 25kg',
    availability: 'Tersedia',
    moq: 100,
    supply_capacity: '60 Ton / Bulan',
    defaultPrice: 13500,
    unit: 'Kg',
  },
  {
    id: 'PRD-AGRI-03',
    sku_code: 'SKU-TAPIOKA-01',
    sku_name: 'Tepung Tapioka Halus Industri',
    group_id: 'GRP-AGRI',
    group_name: 'PERTANIAN',
    subgroup: 'Tepung & Olahan',
    brand: 'Kopsim Agri',
    grade: 'Food Grade',
    packaging: 'Woven Bag 50kg',
    availability: 'Tersedia',
    moq: 500,
    supply_capacity: '100 Ton / Bulan',
    defaultPrice: 8500,
    unit: 'Kg',
  },
  {
    id: 'PRD-AGRI-04',
    sku_code: 'SKU-JAGUNG-01',
    sku_name: 'Jagung Pipil Kering Pakan',
    group_id: 'GRP-AGRI',
    group_name: 'PERTANIAN',
    subgroup: 'Palawija',
    brand: 'Kopsim Agri',
    grade: 'Kering KA 14%',
    packaging: 'Karung 50kg',
    availability: 'Tersedia',
    moq: 500,
    supply_capacity: '80 Ton / Bulan',
    defaultPrice: 5500,
    unit: 'Kg',
  },

  // 4. GARAM
  {
    id: 'PRD-GARAM-01',
    sku_code: 'SKU-GARAM-01',
    sku_name: 'Garam Kristal NaCl > 97% Food Grade',
    group_id: 'GRP-GARAM',
    group_name: 'GARAM',
    subgroup: 'Garam Industri',
    brand: 'Kopsim Garamindo',
    grade: 'Grade K1',
    packaging: 'Woven Bag 50kg',
    availability: 'Tersedia',
    moq: 1000,
    supply_capacity: '100 Ton / Bulan',
    defaultPrice: 4500,
    unit: 'Kg',
  },
  {
    id: 'PRD-GARAM-02',
    sku_code: 'SKU-GARAM-02',
    sku_name: 'Garam Kasar Tambak Rakyat K1',
    group_id: 'GRP-GARAM',
    group_name: 'GARAM',
    subgroup: 'Garam Tambak',
    brand: 'Kopsim Garamindo',
    grade: 'Grade K2',
    packaging: 'Karung 50kg',
    availability: 'Tersedia',
    moq: 2000,
    supply_capacity: '200 Ton / Bulan',
    defaultPrice: 2500,
    unit: 'Kg',
  },
  {
    id: 'PRD-GARAM-03',
    sku_code: 'SKU-GARAM-03',
    sku_name: 'Garam Halus Beryodium Konsumsi',
    group_id: 'GRP-GARAM',
    group_name: 'GARAM',
    subgroup: 'Garam Konsumsi',
    brand: 'Kopsim Garamindo',
    grade: 'Konsumsi Beryodium',
    packaging: 'Pack 500g / Bal 20kg',
    availability: 'Tersedia',
    moq: 100,
    supply_capacity: '50 Ton / Bulan',
    defaultPrice: 6000,
    unit: 'Kg',
  },

  // 5. MINYAK MERAH
  {
    id: 'PRD-MINYAK-01',
    sku_code: 'SKU-RPO-01',
    sku_name: 'Minyak Makan Merah (Red Palm Oil)',
    group_id: 'GRP-MINYAK',
    group_name: 'MINYAK MERAH',
    subgroup: 'Bio Industri & Nutrisi',
    brand: 'Kopsim Nabati',
    grade: 'Virgin Unrefined',
    packaging: 'Jerigen Food Grade 20L / Drum 200L',
    availability: 'Tersedia',
    moq: 20,
    supply_capacity: '30 Ton / Bulan',
    defaultPrice: 18000,
    unit: 'Liter',
  },
  {
    id: 'PRD-MINYAK-02',
    sku_code: 'SKU-MINYAK-02',
    sku_name: 'Minyak Goreng Sawit Higienis Koperasi',
    group_id: 'GRP-MINYAK',
    group_name: 'MINYAK MERAH',
    subgroup: 'Minyak Goreng',
    brand: 'Kopsim Nabati',
    grade: 'Double Fractionated',
    packaging: 'Pouch 1L / Jerigen 5L',
    availability: 'Tersedia',
    moq: 50,
    supply_capacity: '50 Ton / Bulan',
    defaultPrice: 15500,
    unit: 'Liter',
  },

  // 6. PLYWOOD
  {
    id: 'PRD-PLY-01',
    sku_code: 'SKU-PLY-01',
    sku_name: 'Kayu Lapis Plywood Grade Ekspor 18mm',
    group_id: 'GRP-PLYWOOD',
    group_name: 'PLYWOOD',
    subgroup: 'Plywood Ekspor',
    brand: 'Kopsim Wood',
    grade: 'BB/CC Export',
    packaging: 'Pallet 50 Lembar',
    availability: 'Tersedia',
    moq: 50,
    supply_capacity: '5000 Lembar / Bulan',
    defaultPrice: 220000,
    unit: 'Lembar',
  },
  {
    id: 'PRD-PLY-02',
    sku_code: 'SKU-PLY-02',
    sku_name: 'Plywood Furniture Grade 12mm',
    group_id: 'GRP-PLYWOOD',
    group_name: 'PLYWOOD',
    subgroup: 'Plywood Furniture',
    brand: 'Kopsim Wood',
    grade: 'Furniture Grade',
    packaging: 'Pallet 75 Lembar',
    availability: 'Tersedia',
    moq: 50,
    supply_capacity: '7500 Lembar / Bulan',
    defaultPrice: 165000,
    unit: 'Lembar',
  },

  // 7. SUPPLIER MBG
  {
    id: 'PRD-MBG-01',
    sku_code: 'SKU-MBG-01',
    sku_name: 'Paket Pangan Makan Bergizi Gratis (MBG)',
    group_id: 'GRP-MBG',
    group_name: 'SUPPLIER MBG',
    subgroup: 'Paket Siap Saji',
    brand: 'MBG Mandiri',
    grade: 'Standar Gizi Nasional',
    packaging: 'Bento Box Higienis',
    availability: 'Tersedia',
    moq: 50,
    supply_capacity: '10.000 Porsi / Hari',
    defaultPrice: 15000,
    unit: 'Porsi',
  },
  {
    id: 'PRD-MBG-02',
    sku_code: 'SKU-TELUR-01',
    sku_name: 'Telur Ayam Ras Segar Peternak',
    group_id: 'GRP-MBG',
    group_name: 'SUPPLIER MBG',
    subgroup: 'Protein Hewani',
    brand: 'MBG Mandiri',
    grade: 'Fresh Farm Egg',
    packaging: 'Tray 30 Butir / Karton 15kg',
    availability: 'Tersedia',
    moq: 15,
    supply_capacity: '20 Ton / Bulan',
    defaultPrice: 28000,
    unit: 'Kg',
  },
  {
    id: 'PRD-MBG-03',
    sku_code: 'SKU-SUSU-01',
    sku_name: 'Susu Segar Pasteurisasi',
    group_id: 'GRP-MBG',
    group_name: 'SUPPLIER MBG',
    subgroup: 'Produk Susu',
    brand: 'MBG Mandiri',
    grade: 'Pure Cow Milk',
    packaging: 'Botol PET 1L',
    availability: 'Tersedia',
    moq: 20,
    supply_capacity: '5000 Liter / Bulan',
    defaultPrice: 12000,
    unit: 'Liter',
  },

  // 8. KAMPUNG HAJI
  {
    id: 'PRD-HAJI-01',
    sku_code: 'SKU-HAJI-01',
    sku_name: 'Paket Investasi Sarana Kampung Haji',
    group_id: 'GRP-HAJI',
    group_name: 'KAMPUNG HAJI',
    subgroup: 'Investasi Aset',
    brand: 'Kampung Haji Syariah',
    grade: 'Syariah Aset',
    packaging: 'Sertifikat Portofolio',
    availability: 'Tersedia',
    moq: 1,
    supply_capacity: '100 Unit',
    defaultPrice: 10000000,
    unit: 'Unit',
  },
  {
    id: 'PRD-HAJI-02',
    sku_code: 'SKU-HAJI-02',
    sku_name: 'Jasa Akomodasi & Logistik Umrah/Haji',
    group_id: 'GRP-HAJI',
    group_name: 'KAMPUNG HAJI',
    subgroup: 'Layanan Umrah',
    brand: 'Kampung Haji Syariah',
    grade: 'VIP Syariah',
    packaging: 'Voucher Layanan Terpadu',
    availability: 'Tersedia',
    moq: 1,
    supply_capacity: '500 Pax / Musim',
    defaultPrice: 25000000,
    unit: 'Pax',
  },
];

/**
 * Robust mapper that normalizes Supabase public.products row
 * into a strongly typed ProductItem (handles column aliases gracefully).
 */
export function mapSupabaseProductRow(row: any): ProductItem {
  const id = String(row.id || row.sku_code || row.product_code || `PRD-${Date.now()}`);
  const sku_code = String(row.sku_code || row.product_code || id);
  const sku_name = String(row.sku_name || row.product_name || row.name || 'Komoditas Sektor Riil');
  
  // Group name is the Project Name (e.g., 'DISTRIBUTOR MEATSHOP', 'TRADING IKAN', 'PERTANIAN')
  const group_name = String(row.group_name || row.category || row.project_name || 'PROJECT UMUM').toUpperCase();
  const group_id = String(row.group_id || `GRP-${group_name.replace(/[^A-Z0-9]/g, '')}`);
  const subgroup = String(row.subgroup || row.category || 'Komoditas Riil');
  const brand = String(row.brand || 'Kopsim Mandiri');
  const grade = String(row.grade || 'Grade A');
  const packaging = String(row.packaging || 'Standard');
  const availability = String(row.availability || 'Tersedia');
  const moq = Number(row.moq) || 1;
  const supply_capacity = String(row.supply_capacity || '10 Ton/Bulan');

  // Estimate price / default price based on common catalog if not in row
  let defaultPrice = Number(row.default_price || row.price || row.unit_price || 0);
  if (!defaultPrice || isNaN(defaultPrice)) {
    const matchedDefault = DEFAULT_PROJECT_PRODUCTS.find(
      (p) => p.sku_code === sku_code || p.sku_name.toLowerCase() === sku_name.toLowerCase()
    );
    defaultPrice = matchedDefault ? matchedDefault.defaultPrice : 50000;
  }

  let unit = String(row.unit || row.satuan || '');
  if (!unit) {
    const matchedDefault = DEFAULT_PROJECT_PRODUCTS.find(
      (p) => p.sku_code === sku_code || p.sku_name.toLowerCase() === sku_name.toLowerCase()
    );
    unit = matchedDefault ? matchedDefault.unit : 'Kg';
  }

  return {
    id,
    sku_code,
    sku_name,
    group_id,
    group_name,
    subgroup,
    brand,
    grade,
    packaging,
    availability,
    moq,
    supply_capacity,
    defaultPrice,
    unit,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const productService = {
  /**
   * Get cached products from local storage fallback
   */
  getStoredProducts(): ProductItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_PRODUCTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(mapSupabaseProductRow);
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached products:', e);
    }
    return DEFAULT_PROJECT_PRODUCTS;
  },

  /**
   * Save products to local storage cache
   */
  saveStoredProducts(products: ProductItem[]) {
    try {
      localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(products));
    } catch (e) {
      console.warn('Failed to cache products:', e);
    }
  },

  /**
   * Fetch all products from Supabase public.products with fallback
   */
  async getAllProducts(): Promise<{ data: ProductItem[]; source: 'SUPABASE' | 'LOCAL' }> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured) {
      try {
        const { data, error } = await client
          .from(PRODUCTS_TABLE_NAME)
          .select('*')
          .order('group_name', { ascending: true });

        if (!error && data && data.length > 0) {
          const mapped = data.map(mapSupabaseProductRow);
          this.saveStoredProducts(mapped);
          return { data: mapped, source: 'SUPABASE' };
        } else if (error) {
          console.warn('[productService.getAllProducts] Supabase error:', error.message);
        }
      } catch (err) {
        console.warn('[productService.getAllProducts] Exception:', err);
      }
    }

    return { data: this.getStoredProducts(), source: 'LOCAL' };
  },

  /**
   * Fetch products for a specific Project / Sektor Riil (group_name = projectName)
   */
  async getProductsByProject(projectName: string): Promise<ProductItem[]> {
    if (!projectName) return [];
    const cleanProject = projectName.trim().toUpperCase();

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured) {
      try {
        // Match group_name (or category) ILIKE %projectName%
        const { data, error } = await client
          .from(PRODUCTS_TABLE_NAME)
          .select('*')
          .or(`group_name.ilike.%${cleanProject}%,category.ilike.%${cleanProject}%`)
          .order('sku_name', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map(mapSupabaseProductRow);
        }
      } catch (err) {
        console.warn(`[productService.getProductsByProject] Error for ${projectName}:`, err);
      }
    }

    // Local fallback matching group_name
    const all = this.getStoredProducts();
    const matched = all.filter((p) => {
      const g = p.group_name.toUpperCase();
      return g.includes(cleanProject) || cleanProject.includes(g);
    });

    if (matched.length > 0) {
      return matched;
    }

    // If still empty, find any default product for this group
    return DEFAULT_PROJECT_PRODUCTS.filter((p) => {
      const g = p.group_name.toUpperCase();
      return g.includes(cleanProject) || cleanProject.includes(g);
    });
  },

  /**
   * Seed all standard 8 Sektor Riil products into Supabase public.products
   */
  async seedProductsToSupabase(): Promise<{ success: boolean; count: number; error?: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, count: 0, error: 'Supabase client belum terhubung.' };
    }

    const payload = DEFAULT_PROJECT_PRODUCTS.map((p) => ({
      id: p.id,
      sku_code: p.sku_code,
      sku_name: p.sku_name,
      group_id: p.group_id,
      group_name: p.group_name,
      subgroup: p.subgroup,
      brand: p.brand,
      grade: p.grade,
      packaging: p.packaging,
      availability: p.availability,
      moq: p.moq,
      supply_capacity: p.supply_capacity,
    }));

    try {
      const { error } = await client.from(PRODUCTS_TABLE_NAME).upsert(payload, { onConflict: 'sku_code' });
      if (error) {
        // If conflict by sku_code fails, try conflict on id
        const retry = await client.from(PRODUCTS_TABLE_NAME).upsert(payload, { onConflict: 'id' });
        if (retry.error) {
          return { success: false, count: 0, error: retry.error.message };
        }
      }
      this.saveStoredProducts(DEFAULT_PROJECT_PRODUCTS);
      return { success: true, count: payload.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message || String(err) };
    }
  },
};
