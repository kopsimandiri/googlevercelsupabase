import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { auditService } from './auditService';

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
  fish_species?: string;
  fish_category?: string;
  storage_type?: 'FRESH' | 'CHILLED' | 'FROZEN' | 'DRY';
  barcode?: string;
  min_stock_qty?: number;
  origin_region?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

const PRODUCTS_TABLE_NAME = 'products';
let inMemoryProducts: ProductItem[] | null = null;

export const AMBON_FISHERY_PRODUCTS: ProductItem[] = [
  {
    id: 'PRD-AMB-01',
    sku_code: 'SKU-AMB-TUNA-YL',
    sku_name: 'Tuna Sirip Kuning Loin Beku (Yellowfin Loin)',
    group_id: 'GRP-IKAN',
    group_name: 'TRADING IKAN',
    subgroup: 'Ikan Pelagis Besar',
    brand: 'Kopsim Bahari Ambon',
    grade: 'Grade A Sashimi',
    packaging: 'Vacuum Pack Carton 20kg',
    availability: 'Tersedia',
    moq: 20,
    supply_capacity: '25 Ton / Bulan',
    defaultPrice: 82000,
    unit: 'Kg',
    fish_species: 'Thunnus albacares (Yellowfin Tuna)',
    fish_category: 'Pelagis Besar',
    storage_type: 'FROZEN',
    barcode: '8997001001014',
    min_stock_qty: 250,
    origin_region: 'Pelabuhan Perikanan Nusantara Ambon',
    is_active: true,
  },
  {
    id: 'PRD-AMB-02',
    sku_code: 'SKU-AMB-CAKALANG',
    sku_name: 'Ikan Cakalang Beku Utuh (Skipjack Whole Round)',
    group_id: 'GRP-IKAN',
    group_name: 'TRADING IKAN',
    subgroup: 'Ikan Pelagis',
    brand: 'Kopsim Bahari Ambon',
    grade: 'Export Grade A',
    packaging: 'Blok Karung / Master Box 25kg',
    availability: 'Tersedia',
    moq: 50,
    supply_capacity: '40 Ton / Bulan',
    defaultPrice: 28500,
    unit: 'Kg',
    fish_species: 'Katsuwonus pelamis (Cakalang)',
    fish_category: 'Pelagis',
    storage_type: 'FROZEN',
    barcode: '8997001001021',
    min_stock_qty: 500,
    origin_region: 'Laut Banda / Ambon',
    is_active: true,
  },
  {
    id: 'PRD-AMB-03',
    sku_code: 'SKU-AMB-TONGKOL',
    sku_name: 'Ikan Tongkol Komo Beku (Eastern Little Tuna)',
    group_id: 'GRP-IKAN',
    group_name: 'TRADING IKAN',
    subgroup: 'Ikan Pelagis',
    brand: 'Kopsim Bahari Ambon',
    grade: 'Grade A',
    packaging: 'Master Box 20kg',
    availability: 'Tersedia',
    moq: 40,
    supply_capacity: '30 Ton / Bulan',
    defaultPrice: 24000,
    unit: 'Kg',
    fish_species: 'Euthynnus affinis (Tongkol)',
    fish_category: 'Pelagis',
    storage_type: 'FROZEN',
    barcode: '8997001001038',
    min_stock_qty: 400,
    origin_region: 'Perairan Ambon & Seram',
    is_active: true,
  },
  {
    id: 'PRD-AMB-04',
    sku_code: 'SKU-AMB-KAKAP',
    sku_name: 'Kakap Merah Ambon Utuh / Fillet (Red Snapper)',
    group_id: 'GRP-IKAN',
    group_name: 'TRADING IKAN',
    subgroup: 'Ikan Demersal / Karang',
    brand: 'Kopsim Bahari Ambon',
    grade: 'Super Export',
    packaging: 'Vacuum IQF 10kg',
    availability: 'Tersedia',
    moq: 20,
    supply_capacity: '12 Ton / Bulan',
    defaultPrice: 95000,
    unit: 'Kg',
    fish_species: 'Lutjanus malabaricus (Kakap Merah)',
    fish_category: 'Demersal & Karang',
    storage_type: 'FROZEN',
    barcode: '8997001001045',
    min_stock_qty: 150,
    origin_region: 'Pulau Ambon & Lease',
    is_active: true,
  },
  {
    id: 'PRD-AMB-05',
    sku_code: 'SKU-AMB-KERAPU',
    sku_name: 'Ikan Kerapu Sunu / Macan Segar Dingin',
    group_id: 'GRP-IKAN',
    group_name: 'TRADING IKAN',
    subgroup: 'Ikan Demersal / Karang',
    brand: 'Kopsim Bahari Ambon',
    grade: 'Grade A Chilled',
    packaging: 'Styrofoam Box + Ice 25kg',
    availability: 'Tersedia',
    moq: 25,
    supply_capacity: '8 Ton / Bulan',
    defaultPrice: 115000,
    unit: 'Kg',
    fish_species: 'Plectropomus leopardus (Kerapu)',
    fish_category: 'Demersal & Karang',
    storage_type: 'CHILLED',
    barcode: '8997001001052',
    min_stock_qty: 100,
    origin_region: 'Teluk Ambon & Tulehu',
    is_active: true,
  },
  {
    id: 'PRD-AMB-06',
    sku_code: 'SKU-AMB-LAYANG',
    sku_name: 'Ikan Layang Benggol / Momar Ambon Beku',
    group_id: 'GRP-IKAN',
    group_name: 'TRADING IKAN',
    subgroup: 'Ikan Pelagis Kecil',
    brand: 'Kopsim Bahari Ambon',
    grade: 'Grade A',
    packaging: 'Karton Block 10kg',
    availability: 'Tersedia',
    moq: 50,
    supply_capacity: '35 Ton / Bulan',
    defaultPrice: 21000,
    unit: 'Kg',
    fish_species: 'Decapterus spp. (Layang / Momar)',
    fish_category: 'Pelagis Kecil',
    storage_type: 'FROZEN',
    barcode: '8997001001069',
    min_stock_qty: 500,
    origin_region: 'Teluk Ambon',
    is_active: true,
  },
  {
    id: 'PRD-AMB-07',
    sku_code: 'SKU-AMB-CUMI',
    sku_name: 'Cumi-Cumi Loligo Maluku Beku (Whole Cleaned)',
    group_id: 'GRP-IKAN',
    group_name: 'TRADING IKAN',
    subgroup: 'Cephalopoda',
    brand: 'Kopsim Bahari Ambon',
    grade: 'Export Grade',
    packaging: 'Master Carton 10kg',
    availability: 'Tersedia',
    moq: 20,
    supply_capacity: '15 Ton / Bulan',
    defaultPrice: 78000,
    unit: 'Kg',
    fish_species: 'Loligo spp. (Cumi Maluku)',
    fish_category: 'Cephalopoda',
    storage_type: 'FROZEN',
    barcode: '8997001001076',
    min_stock_qty: 200,
    origin_region: 'Laut Seram & Ambon',
    is_active: true,
  },
  {
    id: 'PRD-AMB-08',
    sku_code: 'SKU-AMB-TENGGIRI',
    sku_name: 'Ikan Tenggiri Papan Beku (Spanish Mackerel)',
    group_id: 'GRP-IKAN',
    group_name: 'TRADING IKAN',
    subgroup: 'Ikan Pelagis Besar',
    brand: 'Kopsim Bahari Ambon',
    grade: 'Grade A',
    packaging: 'Polybag + Karton 20kg',
    availability: 'Tersedia',
    moq: 20,
    supply_capacity: '10 Ton / Bulan',
    defaultPrice: 72000,
    unit: 'Kg',
    fish_species: 'Scomberomorus commerson (Tenggiri)',
    fish_category: 'Pelagis Besar',
    storage_type: 'FROZEN',
    barcode: '8997001001083',
    min_stock_qty: 150,
    origin_region: 'Perairan Maluku Tengah',
    is_active: true,
  },
];

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
    fish_species: row.fish_species ? String(row.fish_species) : '',
    fish_category: row.fish_category ? String(row.fish_category) : subgroup,
    storage_type: (['FRESH', 'CHILLED', 'FROZEN', 'DRY'].includes(String(row.storage_type || '').toUpperCase())
      ? String(row.storage_type).toUpperCase()
      : 'FROZEN') as 'FRESH' | 'CHILLED' | 'FROZEN' | 'DRY',
    barcode: row.barcode ? String(row.barcode) : '',
    min_stock_qty: row.min_stock_qty !== undefined && row.min_stock_qty !== null ? Number(row.min_stock_qty) : 100,
    origin_region: row.origin_region ? String(row.origin_region) : 'Ambon & Maluku',
    is_active: row.is_active !== undefined ? Boolean(row.is_active) : availability !== 'Nonaktif',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const productService = {
  /**
   * In-memory products fallback strictly for offline/test mode
   */
  getStoredProducts(): ProductItem[] {
    if (!inMemoryProducts) {
      inMemoryProducts = [...AMBON_FISHERY_PRODUCTS, ...DEFAULT_PROJECT_PRODUCTS];
    }
    return inMemoryProducts;
  },

  /**
   * Update in-memory products strictly for offline/test mode
   */
  saveStoredProducts(products: ProductItem[]) {
    inMemoryProducts = products;
  },

  /**
   * Fetch all products from Supabase public.products authoritatively when configured
   */
  async getAllProducts(): Promise<{ data: ProductItem[]; source: 'SUPABASE' | 'LOCAL' }> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured) {
      const { data, error } = await client
        .from(PRODUCTS_TABLE_NAME)
        .select('*')
        .order('group_name', { ascending: true });

      if (error) {
        throw new Error(`Gagal memuat data produk dari Supabase: ${error.message}`);
      }
      const mapped = (data || []).map(mapSupabaseProductRow);
      return { data: mapped, source: 'SUPABASE' };
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
      const { data, error } = await client
        .from(PRODUCTS_TABLE_NAME)
        .select('*')
        .or(`group_name.ilike.%${cleanProject}%,category.ilike.%${cleanProject}%`)
        .order('sku_name', { ascending: true });

      if (error) {
        throw new Error(`Gagal memuat komoditas proyek dari Supabase: ${error.message}`);
      }
      return (data || []).map(mapSupabaseProductRow);
    }

    const all = this.getStoredProducts();
    const matched = all.filter((p) => {
      const g = p.group_name.toUpperCase();
      return g.includes(cleanProject) || cleanProject.includes(g);
    });

    if (matched.length > 0) {
      return matched;
    }

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

    const payload = [...AMBON_FISHERY_PRODUCTS, ...DEFAULT_PROJECT_PRODUCTS].map((p) => ({
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
      unit: p.unit,
      default_price: p.defaultPrice,
      fish_species: p.fish_species || '',
      fish_category: p.fish_category || p.subgroup,
      storage_type: p.storage_type || 'FROZEN',
      barcode: p.barcode || null,
      min_stock_qty: p.min_stock_qty ?? 100,
      origin_region: p.origin_region || 'Indonesia',
      is_active: p.is_active !== false,
    }));

    try {
      const { error } = await client.from(PRODUCTS_TABLE_NAME).upsert(payload, { onConflict: 'sku_code' });
      if (error) {
        const retry = await client.from(PRODUCTS_TABLE_NAME).upsert(payload, { onConflict: 'id' });
        if (retry.error) {
          return { success: false, count: 0, error: retry.error.message };
        }
      }
      await auditService.logActivity('SEED_FISHERY_PRODUCTS', 'products', 'BATCH_SEED', null, {
        count: payload.length,
      });
      this.saveStoredProducts([...AMBON_FISHERY_PRODUCTS, ...DEFAULT_PROJECT_PRODUCTS]);
      return { success: true, count: payload.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message || String(err) };
    }
  },

  /**
   * Create or update a product SKU (supports Ambon Fishery Master Produk & Jenis Ikan)
   */
  async upsertFisheryProduct(input: Partial<ProductItem> & { sku_code: string; sku_name: string }): Promise<{
    success: boolean;
    data?: ProductItem;
    error?: string;
  }> {
    const cleanSku = input.sku_code.trim().toUpperCase();
    const cleanName = input.sku_name.trim();
    if (!cleanSku || !cleanName) {
      return { success: false, error: 'Kode SKU dan Nama Produk wajib diisi.' };
    }

    const normalized: ProductItem = {
      id: input.id || `PRD-${cleanSku.replace(/[^A-Z0-9]/g, '')}`,
      sku_code: cleanSku,
      sku_name: cleanName,
      group_id: input.group_id || 'GRP-IKAN',
      group_name: (input.group_name || 'TRADING IKAN').toUpperCase(),
      subgroup: input.subgroup || input.fish_category || 'Ikan Laut Ambon',
      brand: input.brand || 'Kopsim Bahari Ambon',
      grade: input.grade || 'Grade A',
      packaging: input.packaging || 'Master Box 20kg',
      availability: input.is_active === false ? 'Nonaktif' : (input.availability || 'Tersedia'),
      moq: Number(input.moq) || 10,
      supply_capacity: input.supply_capacity || '10 Ton / Bulan',
      defaultPrice: Number(input.defaultPrice) || 0,
      unit: input.unit || 'Kg',
      fish_species: input.fish_species || '',
      fish_category: input.fish_category || input.subgroup || 'Pelagis',
      storage_type: input.storage_type || 'FROZEN',
      barcode: input.barcode?.trim() || `8997001${Math.floor(100000 + Math.random() * 899999)}`,
      min_stock_qty: Number(input.min_stock_qty ?? 100),
      origin_region: input.origin_region || 'Ambon, Maluku',
      is_active: input.is_active !== false,
    };

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured) {
      const dbPayload: Record<string, any> = {
        id: normalized.id,
        sku_code: normalized.sku_code,
        sku_name: normalized.sku_name,
        group_id: normalized.group_id,
        group_name: normalized.group_name,
        subgroup: normalized.subgroup,
        brand: normalized.brand,
        grade: normalized.grade,
        packaging: normalized.packaging,
        availability: normalized.availability,
        moq: normalized.moq,
        supply_capacity: normalized.supply_capacity,
        unit: normalized.unit,
        default_price: normalized.defaultPrice,
        fish_species: normalized.fish_species,
        fish_category: normalized.fish_category,
        storage_type: normalized.storage_type,
        barcode: normalized.barcode || null,
        min_stock_qty: normalized.min_stock_qty,
        origin_region: normalized.origin_region,
        is_active: normalized.is_active,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await client
        .from(PRODUCTS_TABLE_NAME)
        .upsert(dbPayload, { onConflict: 'sku_code' })
        .select('*')
        .maybeSingle();

      if (error) {
        return { success: false, error: `Gagal menyimpan master produk: ${error.message}` };
      }

      await auditService.logActivity('UPSERT_PRODUCT', 'products', normalized.sku_code, null, {
        sku_name: normalized.sku_name,
        fish_species: normalized.fish_species,
        storage_type: normalized.storage_type,
        defaultPrice: normalized.defaultPrice,
      });

      return { success: true, data: data ? mapSupabaseProductRow(data) : normalized };
    }

    const current = [...this.getStoredProducts()];
    const existingIndex = current.findIndex((p) => p.sku_code === normalized.sku_code || p.id === normalized.id);
    if (existingIndex >= 0) {
      current[existingIndex] = { ...current[existingIndex], ...normalized };
    } else {
      current.unshift(normalized);
    }
    this.saveStoredProducts(current);

    await auditService.logActivity('UPSERT_PRODUCT', 'products', normalized.sku_code, null, {
      sku_name: normalized.sku_name,
      fish_species: normalized.fish_species,
    });

    return { success: true, data: normalized };
  },

  async findProductByBarcodeOrSku(queryCode: string): Promise<ProductItem | null> {
    const q = queryCode.trim().toUpperCase();
    if (!q) return null;
    const { data } = await this.getAllProducts();
    return (
      data.find(
        (p) =>
          p.sku_code.toUpperCase() === q ||
          (p.barcode && p.barcode.toUpperCase() === q) ||
          p.id.toUpperCase() === q
      ) || null
    );
  },
};
