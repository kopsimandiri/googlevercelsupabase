import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  AreaRecord,
  ChartOfAccountRecord,
  CustomerDbRecord,
  MemberRegistrationRecord,
  MemberDbRecord,
  ProductDbRecord,
  RolePermissionRecord,
  SupplierDbRecord,
  UserRoleRecord,
  SupabaseTableName,
} from '../types/database';

export interface TableAuditInfo {
  tableName: SupabaseTableName;
  label: string;
  columnCount: number;
  columnsList: string[];
  isConfigured: boolean;
  isConnected: boolean;
  rowCount: number;
  latencyMs: number;
  statusMessage: string;
  lastChecked: string;
}

export const SUPABASE_TABLES_METADATA: Record<
  SupabaseTableName,
  { label: string; columnCount: number; columns: string[]; primaryKey: string; ddlSql: string }
> = {
  areas: {
    label: 'Wilayah & Cabang (Areas)',
    columnCount: 16,
    columns: [
      'id', 'referral_type', 'kopwil', 'area_code', 'area_name', 'bank_account_1',
      'bank_account_2', 'bank_account_3', 'province', 'city', 'sk_number',
      'potential', 'pic_name', 'pic_contact', 'created_at', 'updated_at',
    ],
    primaryKey: 'id',
    ddlSql: `CREATE TABLE IF NOT EXISTS public.areas (
  id TEXT PRIMARY KEY,
  referral_type TEXT NOT NULL DEFAULT 'KOPERASI',
  kopwil TEXT DEFAULT '',
  area_code TEXT NOT NULL,
  area_name TEXT NOT NULL,
  bank_account_1 TEXT DEFAULT '',
  bank_account_2 TEXT DEFAULT '',
  bank_account_3 TEXT DEFAULT '',
  province TEXT NOT NULL DEFAULT 'DKI Jakarta',
  city TEXT NOT NULL DEFAULT 'Jakarta Pusat',
  sk_number TEXT DEFAULT '',
  potential TEXT DEFAULT '',
  pic_name TEXT DEFAULT '',
  pic_contact TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
  },
  chart_of_accounts: {
    label: 'Bagan Akun (Chart of Accounts)',
    columnCount: 11,
    columns: [
      'id', 'account_code', 'account_name', 'account_group', 'financial_report',
      'normal_balance', 'tx_type', 'parent_code', 'is_active', 'created_at', 'updated_at',
    ],
    primaryKey: 'id',
    ddlSql: `CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id TEXT PRIMARY KEY,
  account_code TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  account_group TEXT NOT NULL,
  financial_report TEXT NOT NULL,
  normal_balance TEXT NOT NULL CHECK (normal_balance IN ('Debit', 'Kredit')),
  tx_type TEXT DEFAULT 'UMUM',
  parent_code TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
  },
  customers: {
    label: 'Pelanggan & Buyer (Customers)',
    columnCount: 15,
    columns: [
      'id', 'customer_code', 'name', 'pic_name', 'phone', 'email', 'address',
      'province', 'city', 'tax_number', 'category', 'status', 'notes', 'created_at', 'updated_at',
    ],
    primaryKey: 'id',
    ddlSql: `CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  customer_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pic_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  province TEXT DEFAULT 'DKI Jakarta',
  city TEXT DEFAULT 'Jakarta',
  tax_number TEXT DEFAULT '',
  category TEXT DEFAULT 'Retail',
  status TEXT DEFAULT 'AKTIF',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
  },
  member_registrations: {
    label: 'Pendaftaran Anggota (Registrations)',
    columnCount: 22,
    columns: [
      'id', 'submitted_at', 'full_name', 'nik', 'birth_place', 'birth_date', 'gender',
      'address', 'city', 'province', 'whatsapp', 'email', 'member_status', 'profession',
      'savings_type', 'transfer_amount', 'transfer_date', 'transfer_proof_url', 'ktp_url',
      'selfie_url', 'approval_status', 'verification_status',
    ],
    primaryKey: 'id',
    ddlSql: `CREATE TABLE IF NOT EXISTS public.member_registrations (
  id TEXT PRIMARY KEY,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  full_name TEXT NOT NULL,
  nik VARCHAR(16) NOT NULL,
  birth_place TEXT DEFAULT '',
  birth_date DATE DEFAULT '1990-01-01',
  gender VARCHAR(10) DEFAULT 'L',
  address TEXT DEFAULT '',
  city TEXT DEFAULT 'Jakarta',
  province TEXT DEFAULT 'DKI Jakarta',
  whatsapp TEXT NOT NULL,
  email TEXT DEFAULT '',
  member_status TEXT DEFAULT 'Calon Anggota',
  profession TEXT DEFAULT 'Wiraswasta',
  savings_type TEXT DEFAULT 'Pokok + Wajib',
  transfer_amount NUMERIC(15,2) DEFAULT 860000.00,
  transfer_date DATE DEFAULT CURRENT_DATE,
  transfer_proof_url TEXT DEFAULT '',
  ktp_url TEXT DEFAULT '',
  selfie_url TEXT DEFAULT '',
  approval_status TEXT DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  verification_status TEXT DEFAULT 'Menunggu Verifikasi Admin'
);`,
  },
  members: {
    label: 'Data Anggota Tetap (Members)',
    columnCount: 18,
    columns: [
      'id', 'member_no', 'registered_at', 'full_name', 'gender', 'province', 'city',
      'address', 'occupation', 'username', 'birth_date', 'birth_place', 'nik',
      'work_area', 'legacy_password_hash', 'status', 'created_at', 'updated_at',
    ],
    primaryKey: 'id',
    ddlSql: `CREATE TABLE IF NOT EXISTS public.members (
  id TEXT PRIMARY KEY,
  member_no TEXT UNIQUE,
  registered_at DATE DEFAULT CURRENT_DATE,
  full_name TEXT NOT NULL,
  gender VARCHAR(10) DEFAULT 'L',
  province TEXT DEFAULT 'DKI Jakarta',
  city TEXT DEFAULT 'Jakarta Pusat',
  address TEXT DEFAULT '',
  occupation TEXT DEFAULT 'Anggota',
  username TEXT DEFAULT '',
  birth_date DATE DEFAULT '1990-01-01',
  birth_place TEXT DEFAULT 'Jakarta',
  nik VARCHAR(20) DEFAULT '',
  work_area TEXT DEFAULT 'PUSAT JAKARTA',
  legacy_password_hash TEXT DEFAULT '',
  status TEXT DEFAULT 'AKTIF',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
  },
  products: {
    label: 'Komoditas & Produk (Products)',
    columnCount: 9,
    columns: [
      'id', 'product_code', 'product_name', 'category', 'grade', 'packaging',
      'availability', 'moq', 'supply_capacity',
    ],
    primaryKey: 'id',
    ddlSql: `CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  product_code TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  grade TEXT DEFAULT 'Grade A',
  packaging TEXT DEFAULT 'Standard',
  availability TEXT DEFAULT 'Tersedia',
  moq INT DEFAULT 1,
  supply_capacity TEXT DEFAULT '10 Ton/Bulan'
);`,
  },
  role_permissions: {
    label: 'Hak Akses Role (Role Permissions)',
    columnCount: 3,
    columns: ['id', 'role_name', 'permissions'],
    primaryKey: 'id',
    ddlSql: `CREATE TABLE IF NOT EXISTS public.role_permissions (
  id TEXT PRIMARY KEY,
  role_name TEXT NOT NULL UNIQUE,
  permissions JSONB DEFAULT '[]'::jsonb
);`,
  },
  suppliers: {
    label: 'Pemasok & Mitra Nelayan (Suppliers)',
    columnCount: 15,
    columns: [
      'id', 'supplier_code', 'name', 'pic_name', 'phone', 'email', 'address',
      'province', 'city', 'tax_number', 'category', 'status', 'notes', 'created_at', 'updated_at',
    ],
    primaryKey: 'id',
    ddlSql: `CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  supplier_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pic_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  province TEXT DEFAULT 'DKI Jakarta',
  city TEXT DEFAULT 'Jakarta',
  tax_number TEXT DEFAULT '',
  category TEXT DEFAULT 'Hasil Laut',
  status TEXT DEFAULT 'AKTIF',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
  },
  transactions: {
    label: 'Transaksi & Keuangan (Transactions)',
    columnCount: 19,
    columns: [
      'id', 'transaction_no', 'transaction_date', 'referral_type', 'area_name',
      'transaction_type', 'payment_method', 'amount', 'file_url', 'account_name_legacy',
      'description', 'category_name', 'product_name', 'supplier_name', 'customer_name',
      'qty', 'price', 'created_at', 'updated_at',
    ],
    primaryKey: 'id',
    ddlSql: `CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  transaction_no TEXT UNIQUE,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  referral_type TEXT NOT NULL DEFAULT 'KOPERASI',
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
);`,
  },
  user_roles: {
    label: 'Peran Pengguna (User Roles)',
    columnCount: 4,
    columns: ['id', 'user_id', 'role', 'created_at'],
    primaryKey: 'id',
    ddlSql: `CREATE TABLE IF NOT EXISTS public.user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'DIRECTOR', 'ANGGOTA')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
  },
};

// Initial local seeds
const SEED_DATA: Record<SupabaseTableName, any[]> = {
  areas: [
    {
      id: 'AREA-01',
      referral_type: 'KOPERASI',
      kopwil: 'KOPWIL I - DKI JAKARTA',
      area_code: 'JKT-01',
      area_name: 'Pusat Jakarta - Menteng',
      bank_account_1: 'Bank BSI 7123456789 (a.n KOPSIM)',
      bank_account_2: 'Bank Mandiri 1230009876543',
      bank_account_3: 'BCA Syariah 0019283746',
      province: 'DKI Jakarta',
      city: 'Jakarta Pusat',
      sk_number: 'SK/01/KOPSIM/2024',
      potential: 'Pusat Keuangan & Perdagangan Komoditas',
      pic_name: 'Nunung Suhudiah, SE',
      pic_contact: '081234567890',
    },
    {
      id: 'AREA-02',
      referral_type: 'KOPERASI',
      kopwil: 'KOPWIL II - JAWA BARAT',
      area_code: 'JBR-01',
      area_name: 'Cabang Jawa Barat - Cianjur & Bandung',
      bank_account_1: 'Bank BSI 7987654321',
      bank_account_2: 'Bank Mandiri 1300012345678',
      bank_account_3: '',
      province: 'Jawa Barat',
      city: 'Cianjur',
      sk_number: 'SK/02/KOPSIM/2024',
      potential: 'Pertanian Beras Organik & Plywood',
      pic_name: 'Kang Dedi Sukamaju',
      pic_contact: '085299887766',
    },
    {
      id: 'AREA-03',
      referral_type: 'PROJECT',
      kopwil: 'KOPWIL III - JAWA TIMUR',
      area_code: 'JTM-01',
      area_name: 'Cabang Jawa Timur - Surabaya & Madura',
      bank_account_1: 'Bank Mandiri 1400055443322',
      bank_account_2: '',
      bank_account_3: '',
      province: 'Jawa Timur',
      city: 'Surabaya',
      sk_number: 'SK/03/KOPSIM/2024',
      potential: 'Industri Garam Rakyat & Cold-Chain Perikanan',
      pic_name: 'Bambang Sutrisno',
      pic_contact: '081900112233',
    },
  ],
  chart_of_accounts: [
    {
      id: 'COA-1010',
      account_code: '1010',
      account_name: 'Kas Operasional Pusat',
      account_group: 'Aset Lancar',
      financial_report: 'Neraca',
      normal_balance: 'Debit',
      tx_type: 'KAS',
      parent_code: '1000',
      is_active: true,
    },
    {
      id: 'COA-1020',
      account_code: '1020',
      account_name: 'Bank Syariah Indonesia (BSI)',
      account_group: 'Aset Lancar',
      financial_report: 'Neraca',
      normal_balance: 'Debit',
      tx_type: 'BANK',
      parent_code: '1000',
      is_active: true,
    },
    {
      id: 'COA-1030',
      account_code: '1030',
      account_name: 'Bank Mandiri Giro Operasional',
      account_group: 'Aset Lancar',
      financial_report: 'Neraca',
      normal_balance: 'Debit',
      tx_type: 'BANK',
      parent_code: '1000',
      is_active: true,
    },
    {
      id: 'COA-2010',
      account_code: '2010',
      account_name: 'Simpanan Pokok Anggota',
      account_group: 'Ekuitas / Modal Sendiri',
      financial_report: 'Neraca',
      normal_balance: 'Kredit',
      tx_type: 'SIMPANAN',
      parent_code: '2000',
      is_active: true,
    },
    {
      id: 'COA-2020',
      account_code: '2020',
      account_name: 'Simpanan Wajib Anggota',
      account_group: 'Ekuitas / Modal Sendiri',
      financial_report: 'Neraca',
      normal_balance: 'Kredit',
      tx_type: 'SIMPANAN',
      parent_code: '2000',
      is_active: true,
    },
    {
      id: 'COA-2030',
      account_code: '2030',
      account_name: 'Simpanan Sukarela / Manasuka',
      account_group: 'Liabilitas Jangka Pendek',
      financial_report: 'Neraca',
      normal_balance: 'Kredit',
      tx_type: 'SIMPANAN',
      parent_code: '2000',
      is_active: true,
    },
    {
      id: 'COA-4010',
      account_code: '4010',
      account_name: 'Pendapatan Penjualan Komoditas Riil',
      account_group: 'Pendapatan Usaha',
      financial_report: 'Laba Rugi',
      normal_balance: 'Kredit',
      tx_type: 'PROJECT',
      parent_code: '4000',
      is_active: true,
    },
    {
      id: 'COA-5010',
      account_code: '5010',
      account_name: 'Harga Pokok Penjualan (HPP) Komoditas',
      account_group: 'Beban Pokok Usaha',
      financial_report: 'Laba Rugi',
      normal_balance: 'Debit',
      tx_type: 'PROJECT',
      parent_code: '5000',
      is_active: true,
    },
  ],
  customers: [
    {
      id: 'CUST-001',
      customer_code: 'CUST-001',
      name: 'PT Boga Maritim Sejahtera',
      pic_name: 'Hendro Wijaya',
      phone: '081288990011',
      email: 'hendro@bogamaritim.co.id',
      address: 'Kawasan Industri MM2100 Blok C-4',
      province: 'Jawa Barat',
      city: 'Bekasi',
      tax_number: '01.234.567.8-412.000',
      category: 'Retail & Restoran Horeka',
      status: 'AKTIF',
      notes: 'Buyer reguler ikan tuna segar dan cumi beku',
    },
    {
      id: 'CUST-002',
      customer_code: 'CUST-002',
      name: 'Koperasi Pasar Induk Beras',
      pic_name: 'Drs. H. Mulyadi',
      phone: '081377889900',
      email: 'mulyadi.cipinang@gmail.com',
      address: 'Pasar Induk Cipinang Blok A No. 12',
      province: 'DKI Jakarta',
      city: 'Jakarta Timur',
      tax_number: '02.345.678.9-005.000',
      category: 'Distributor Pangan',
      status: 'AKTIF',
      notes: 'Distributor pasokan beras organik Cianjur',
    },
    {
      id: 'CUST-003',
      customer_code: 'CUST-003',
      name: 'CV Garam Anugerah Mandiri',
      pic_name: 'Ir. Susilo Pratama',
      phone: '081900112233',
      email: 'susilo@garamanugerah.com',
      address: 'Jl. Rungkut Industri No. 12',
      province: 'Jawa Timur',
      city: 'Surabaya',
      tax_number: '03.456.789.0-602.000',
      category: 'Industri Manufaktur',
      status: 'AKTIF',
      notes: 'Pabrik pengolahan garam halus industri',
    },
  ],
  member_registrations: [
    {
      id: 'REG-2608-001',
      submitted_at: '2026-08-20T10:15:00Z',
      full_name: 'Muhammad Farhan',
      nik: '3201011508920005',
      birth_place: 'Bogor',
      birth_date: '1992-08-15',
      gender: 'L',
      address: 'Jl. Pajajaran No. 45',
      city: 'Bogor',
      province: 'Jawa Barat',
      whatsapp: '081299887766',
      email: 'farhan.m@gmail.com',
      member_status: 'Calon Anggota',
      profession: 'Wiraswasta Agrobisnis',
      savings_type: 'Pokok (500k) + Wajib 3th (360k)',
      transfer_amount: 860000,
      transfer_date: '2026-08-20',
      transfer_proof_url: '/assets/MasterBlankoID.jpg',
      ktp_url: '',
      selfie_url: '',
      approval_status: 'APPROVED',
      verification_status: 'Telah Diverifikasi & Diterbitkan KTA',
    },
    {
      id: 'REG-2608-002',
      submitted_at: '2026-08-21T08:30:00Z',
      full_name: 'Dewi Sartika Putri',
      nik: '3171014502880002',
      birth_place: 'Jakarta',
      birth_date: '1988-02-14',
      gender: 'P',
      address: 'Jl. Cikini Raya No. 18',
      city: 'Jakarta Pusat',
      province: 'DKI Jakarta',
      whatsapp: '085711223344',
      email: 'dewi.sartika@gmail.com',
      member_status: 'Calon Anggota',
      profession: 'Konsultan Keuangan Syariah',
      savings_type: 'Pokok (500k) + Wajib (360k) + Sukarela (1jt)',
      transfer_amount: 1860000,
      transfer_date: '2026-08-21',
      transfer_proof_url: '',
      ktp_url: '',
      selfie_url: '',
      approval_status: 'PENDING',
      verification_status: 'Menunggu Konfirmasi Slip Bank',
    },
  ],
  members: [
    {
      id: '0824-03001',
      member_no: '0824-03001',
      registered_at: '2024-08-10',
      full_name: 'H. Ahmad Dahlan',
      gender: 'L',
      province: 'DKI Jakarta',
      city: 'Jakarta Pusat',
      address: 'Jl. Pegangsaan Barat No. 14, Menteng',
      occupation: 'Pengusaha Komoditas',
      username: 'ahmad.dahlan',
      birth_date: '1978-05-12',
      birth_place: 'Yogyakarta',
      area_id: 'AREA-01',
      status: 'AKTIF',
      simpanan_pokok: 500000,
      simpanan_wajib: 360000,
      simpanan_sukarela: 5000000,
      created_at: '2024-08-10T00:00:00Z',
    },
    {
      id: '0824-03002',
      member_no: '0824-03002',
      registered_at: '2024-08-11',
      full_name: 'Siti Rahmah, S.Pd',
      gender: 'P',
      province: 'Jawa Barat',
      city: 'Bandung',
      address: 'Jl. Asia Afrika No. 88',
      occupation: 'Pendidik & Wiraswasta',
      username: 'siti.rahmah',
      birth_date: '1985-09-20',
      birth_place: 'Bandung',
      area_id: 'AREA-02',
      status: 'AKTIF',
      simpanan_pokok: 500000,
      simpanan_wajib: 360000,
      simpanan_sukarela: 2000000,
      created_at: '2024-08-11T00:00:00Z',
    },
    {
      id: '0824-03003',
      member_no: '0824-03003',
      registered_at: '2024-08-12',
      full_name: 'Bambang Sutrisno',
      gender: 'L',
      province: 'Jawa Timur',
      city: 'Surabaya',
      address: 'Jl. Pemuda No. 45',
      occupation: 'Supplier Perikanan',
      username: 'bambang.s',
      birth_date: '1980-03-15',
      birth_place: 'Surabaya',
      area_id: 'AREA-03',
      status: 'AKTIF',
      simpanan_pokok: 500000,
      simpanan_wajib: 360000,
      simpanan_sukarela: 10000000,
      created_at: '2024-08-12T00:00:00Z',
    },
    {
      id: '0824-03004',
      member_no: '0824-03004',
      registered_at: '2024-08-14',
      full_name: 'Dr. Hamdan Zoelva',
      gender: 'L',
      province: 'DKI Jakarta',
      city: 'Jakarta Pusat',
      address: 'Jl. Taman Amir Hamzah No. 6A',
      occupation: 'Akademisi / Praktisi Hukum',
      username: 'hamdan.zoelva',
      birth_date: '1962-06-21',
      birth_place: 'Bima',
      area_id: 'AREA-01',
      status: 'AKTIF',
      simpanan_pokok: 500000,
      simpanan_wajib: 360000,
      simpanan_sukarela: 15000000,
      created_at: '2024-08-14T00:00:00Z',
    },
    {
      id: '0824-03005',
      member_no: '0824-03005',
      registered_at: '2024-08-15',
      full_name: 'Nunung Suhudiah, SE',
      gender: 'P',
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      address: 'Jl. Tebet Raya No. 20',
      occupation: 'Ekonom & Pengusaha',
      username: 'nunung.suhudiah',
      birth_date: '1975-11-10',
      birth_place: 'Jakarta',
      area_id: 'AREA-01',
      status: 'AKTIF',
      simpanan_pokok: 500000,
      simpanan_wajib: 360000,
      simpanan_sukarela: 10000000,
      created_at: '2024-08-15T00:00:00Z',
    },
  ],
  products: [
    {
      id: 'PRD-01',
      product_code: 'SKU-TUNA-01',
      product_name: 'Ikan Tuna Segar Tangkap Laut (Yellowfin)',
      category: 'Perikanan & Kelautan',
      grade: 'Grade A Sashimi',
      packaging: 'Sterofoam + Ice Pack 25kg',
      availability: 'Tersedia',
      moq: 100,
      supply_capacity: '20 Ton / Bulan',
    },
    {
      id: 'PRD-02',
      product_code: 'SKU-BERAS-01',
      product_name: 'Beras Organik Pandan Wangi Cianjur',
      category: 'Pertanian & Pangan',
      grade: 'Premium SVLK',
      packaging: 'Karung Vakum 25kg / 50kg',
      availability: 'Tersedia',
      moq: 500,
      supply_capacity: '50 Ton / Bulan',
    },
    {
      id: 'PRD-03',
      product_code: 'SKU-GARAM-01',
      product_name: 'Garam Kristal NaCl > 97% Food Grade',
      category: 'Industri Garam',
      grade: 'Grade K1',
      packaging: 'Woven Bag 50kg',
      availability: 'Tersedia',
      moq: 1000,
      supply_capacity: '100 Ton / Bulan',
    },
    {
      id: 'PRD-04',
      product_code: 'SKU-RPO-01',
      product_name: 'Minyak Makan Merah (Red Palm Oil)',
      category: 'Bio Industri & Nutrisi',
      grade: 'Virgin Unrefined',
      packaging: 'Jerigen Food Grade 20L / Drum 200L',
      availability: 'Pre-Order',
      moq: 200,
      supply_capacity: '15 Ton / Bulan',
    },
    {
      id: 'PRD-05',
      product_code: 'SKU-DAGING-01',
      product_name: 'Daging Sapi Prime Cut Halal Segar',
      category: 'Peternakan & Daging',
      grade: 'Prime Cut Halal MUI',
      packaging: 'Vacuum Box 20kg Cold-Chain',
      availability: 'Tersedia',
      moq: 50,
      supply_capacity: '10 Ton / Bulan',
    },
  ],
  role_permissions: [
    {
      id: 'ROLE-ADMIN',
      role_name: 'ADMIN',
      permissions: ['read_all', 'write_all', 'delete_all', 'manage_users', 'export_financials', 'audit_database'],
    },
    {
      id: 'ROLE-DIRECTOR',
      role_name: 'DIRECTOR',
      permissions: ['read_all', 'write_transactions', 'view_reports', 'approve_registrations', 'view_projects'],
    },
    {
      id: 'ROLE-ANGGOTA',
      role_name: 'ANGGOTA',
      permissions: ['view_profile', 'view_simpanan', 'download_kta', 'view_portfolio', 'submit_inquiry'],
    },
  ],
  suppliers: [
    {
      id: 'SUPP-001',
      supplier_code: 'SUPP-001',
      name: 'Kelompok Nelayan Mandiri Pesisir',
      pic_name: 'Pak Samsul',
      phone: '082144556677',
      email: 'nelayan.muarabaru@gmail.com',
      address: 'Dermaga Muara Baru Dermaga 03',
      province: 'DKI Jakarta',
      city: 'Jakarta Utara',
      tax_number: '04.567.890.1-008.000',
      category: 'Hasil Laut Tangkap',
      status: 'AKTIF',
      notes: 'Pemasok tuna, cumi, dan kakap merah segar',
    },
    {
      id: 'SUPP-002',
      supplier_code: 'SUPP-002',
      name: 'Gabungan Kelompok Tani Subur Makmur',
      pic_name: 'Kang Dedi',
      phone: '085299887766',
      email: 'gapoktan.sukamaju@gmail.com',
      address: 'Desa Sukamaju Kec. Pacet',
      province: 'Jawa Barat',
      city: 'Cianjur',
      tax_number: '05.678.901.2-406.000',
      category: 'Pertanian Padi & Jagung',
      status: 'AKTIF',
      notes: 'Petani mitra beras organik binaan KOPSIM',
    },
    {
      id: 'SUPP-003',
      supplier_code: 'SUPP-003',
      name: 'Koperasi Tambak Garam Rakyat',
      pic_name: 'H. Ridwan',
      phone: '087811223344',
      email: 'tambak.indramayu@gmail.com',
      address: 'Pesisir Pantura Losarang',
      province: 'Jawa Barat',
      city: 'Indramayu',
      tax_number: '06.789.012.3-437.000',
      category: 'Garam Bahan Baku',
      status: 'AKTIF',
      notes: 'Kelompok petambak garam evaporasi matahari',
    },
  ],
  transactions: [
    {
      id: 'T260815001',
      transaction_no: 'T260815001',
      transaction_date: '2026-08-15',
      referral_type: 'KOPERASI',
      area_name: 'PUSAT JAKARTA',
      transaction_type: 'MASUK',
      payment_method: 'Bank BSI',
      amount: 5000000,
      file_url: '',
      account_name_legacy: 'Bank BSI',
      description: 'Penerimaan Simpanan Pokok 10 Anggota Baru',
      category_name: 'Simpanan Pokok',
      product_name: '',
      supplier_name: '',
      customer_name: '',
      qty: 1,
      price: 5000000,
      created_at: '2026-08-15T10:30:00Z',
      updated_at: '2026-08-15T10:30:00Z',
    },
    {
      id: 'T260816002',
      transaction_no: 'T260816002',
      transaction_date: '2026-08-16',
      referral_type: 'KOPERASI',
      area_name: 'PUSAT JAKARTA',
      transaction_type: 'MASUK',
      payment_method: 'Bank BSI',
      amount: 3600000,
      file_url: '',
      account_name_legacy: 'Bank BSI',
      description: 'Setoran Simpanan Wajib 3 Tahun',
      category_name: 'Simpanan Wajib',
      product_name: '',
      supplier_name: '',
      customer_name: '',
      qty: 1,
      price: 3600000,
      created_at: '2026-08-16T11:15:00Z',
      updated_at: '2026-08-16T11:15:00Z',
    },
    {
      id: 'P260817001',
      transaction_no: 'P260817001',
      transaction_date: '2026-08-17',
      referral_type: 'PROJECT',
      area_name: 'TRADING IKAN',
      transaction_type: 'MASUK',
      payment_method: 'Bank Mandiri',
      amount: 32500000,
      file_url: '',
      account_name_legacy: 'DANA PROJECT',
      description: 'Penjualan ke Mitra Restoran Cold-Chain',
      category_name: 'Penjualan Komoditas',
      product_name: 'Ikan Tuna Segar Grade A',
      supplier_name: '',
      customer_name: 'CUST-001',
      qty: 500,
      price: 65000,
      created_at: '2026-08-17T09:20:00Z',
      updated_at: '2026-08-17T09:20:00Z',
    },
  ],
  user_roles: [
    {
      id: 'UR-01',
      user_id: 'admin@kopsim.id',
      role: 'ADMIN',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'UR-02',
      user_id: 'director@kopsim.id',
      role: 'DIRECTOR',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'UR-03',
      user_id: 'anggota@kopsim.id',
      role: 'ANGGOTA',
      created_at: '2024-01-01T00:00:00Z',
    },
  ],
};

export const masterDataService = {
  getLocalStorageKey(table: SupabaseTableName): string {
    return `KOPSIM_TABLE_${table.toUpperCase()}`;
  },

  getStoredData<T = any>(table: SupabaseTableName): T[] {
    try {
      const stored = localStorage.getItem(this.getLocalStorageKey(table));
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    const seed = SEED_DATA[table] || [];
    localStorage.setItem(this.getLocalStorageKey(table), JSON.stringify(seed));
    return seed as T[];
  },

  saveStoredData<T = any>(table: SupabaseTableName, data: T[]): void {
    localStorage.setItem(this.getLocalStorageKey(table), JSON.stringify(data));
  },

  /**
   * Audit all 10 tables in Supabase with exact live checks
   */
  async auditAllTables(): Promise<TableAuditInfo[]> {
    const tableKeys: SupabaseTableName[] = [
      'areas',
      'chart_of_accounts',
      'customers',
      'member_registrations',
      'members',
      'products',
      'role_permissions',
      'suppliers',
      'transactions',
      'user_roles',
    ];

    const results: TableAuditInfo[] = [];

    for (const tbl of tableKeys) {
      const meta = SUPABASE_TABLES_METADATA[tbl];
      const startTime = performance.now();

      if (!isSupabaseConfigured) {
        const localData = this.getStoredData(tbl);
        results.push({
          tableName: tbl,
          label: meta.label,
          columnCount: meta.columnCount,
          columnsList: meta.columns,
          isConfigured: false,
          isConnected: false,
          rowCount: localData.length,
          latencyMs: 0,
          statusMessage: 'Supabase URL/Key belum dikonfigurasi (Menggunakan data lokal).',
          lastChecked: new Date().toLocaleTimeString('id-ID'),
        });
        continue;
      }

      const client = getSupabaseClient();
      if (!client) {
        results.push({
          tableName: tbl,
          label: meta.label,
          columnCount: meta.columnCount,
          columnsList: meta.columns,
          isConfigured: true,
          isConnected: false,
          rowCount: 0,
          latencyMs: 0,
          statusMessage: 'Client Supabase gagal diinisialisasi.',
          lastChecked: new Date().toLocaleTimeString('id-ID'),
        });
        continue;
      }

      try {
        const { count, error } = await client
          .from(tbl)
          .select('*', { count: 'exact', head: true });

        const latencyMs = Math.round(performance.now() - startTime);

        if (error) {
          const localData = this.getStoredData(tbl);
          results.push({
            tableName: tbl,
            label: meta.label,
            columnCount: meta.columnCount,
            columnsList: meta.columns,
            isConfigured: true,
            isConnected: false,
            rowCount: localData.length,
            latencyMs,
            statusMessage: `Tabel belum dibuat / RLS error: ${error.message}`,
            lastChecked: new Date().toLocaleTimeString('id-ID'),
          });
        } else {
          results.push({
            tableName: tbl,
            label: meta.label,
            columnCount: meta.columnCount,
            columnsList: meta.columns,
            isConfigured: true,
            isConnected: true,
            rowCount: count ?? 0,
            latencyMs,
            statusMessage: `Tersambung aktif (${count ?? 0} baris data).`,
            lastChecked: new Date().toLocaleTimeString('id-ID'),
          });
        }
      } catch (err: any) {
        const latencyMs = Math.round(performance.now() - startTime);
        results.push({
          tableName: tbl,
          label: meta.label,
          columnCount: meta.columnCount,
          columnsList: meta.columns,
          isConfigured: true,
          isConnected: false,
          rowCount: 0,
          latencyMs,
          statusMessage: `Kesalahan koneksi: ${err?.message || err}`,
          lastChecked: new Date().toLocaleTimeString('id-ID'),
        });
      }
    }

    return results;
  },

  /**
   * Fetch records for any of the 9 tables
   */
  async getTableRecords<T = any>(table: SupabaseTableName): Promise<{ data: T[]; source: 'SUPABASE' | 'LOCAL' }> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from(table).select('*');
        if (!error && data && data.length > 0) {
          this.saveStoredData(table, data);
          return { data: data as T[], source: 'SUPABASE' };
        }
      } catch (err) {
        console.warn(`Supabase getTableRecords (${table}) fallback:`, err);
      }
    }

    return { data: this.getStoredData(table) as T[], source: 'LOCAL' };
  },

  /**
   * Create or Update a record in any of the 9 tables
   */
  async saveRecord<T extends { id: string }>(
    table: SupabaseTableName,
    record: T
  ): Promise<{ success: boolean; id: string; error?: string; source: 'SUPABASE' | 'LOCAL' }> {
    const records = this.getStoredData(table) as T[];
    const existingIndex = records.findIndex((r) => r.id === record.id);
    const isEdit = existingIndex !== -1;

    if (isEdit) {
      records[existingIndex] = { ...records[existingIndex], ...record };
    } else {
      records.unshift(record);
    }
    this.saveStoredData(table, records);

    const client = getSupabaseClient();
    let savedToSupabase = false;

    if (client) {
      try {
        if (isEdit) {
          const { error } = await client.from(table).update(record).eq('id', record.id);
          if (!error) savedToSupabase = true;
        } else {
          const { error } = await client.from(table).insert([record]);
          if (!error) savedToSupabase = true;
        }
      } catch (err) {
        console.warn(`Supabase saveRecord (${table}) fallback:`, err);
      }
    }

    return {
      success: true,
      id: record.id,
      source: savedToSupabase ? 'SUPABASE' : 'LOCAL',
    };
  },

  /**
   * Delete a record from any of the 9 tables
   */
  async deleteRecord(table: SupabaseTableName, id: string): Promise<{ success: boolean; error?: string }> {
    let records = this.getStoredData(table);
    records = records.filter((r) => r.id !== id);
    this.saveStoredData(table, records);

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from(table).delete().eq('id', id);
      } catch (err) {
        console.warn(`Supabase deleteRecord (${table}) fallback:`, err);
      }
    }

    return { success: true };
  },

  /**
   * Push Seed Data into Supabase
   */
  async seedTableToSupabase(table: SupabaseTableName): Promise<{ success: boolean; count: number; error?: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, count: 0, error: 'Supabase client belum terhubung' };
    }

    const data = this.getStoredData(table);
    try {
      const { error } = await client.from(table).upsert(data, { onConflict: 'id' });
      if (error) {
        return { success: false, count: 0, error: error.message };
      }
      return { success: true, count: data.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message || String(err) };
    }
  },

  /**
   * Generate Full DDL Script for all 9 tables
   */
  getAllTablesDdlSql(): string {
    return `-- ====================================================================
-- KOPSIM MANDIRI: MASTER DATABASE DDL (9 TABEL RESMI)
-- ====================================================================

${Object.values(SUPABASE_TABLES_METADATA)
  .map((m) => m.ddlSql)
  .join('\n\n')}
`;
  },
};
