export interface TransactionRecord {
  id: string;
  tanggal: string;
  referal: 'KOPERASI' | 'PROJECT';
  plantation: string; // Entity or Project Name
  jenis: 'MASUK' | 'KELUAR';
  kategori: string;
  sku_name?: string;
  metode_bayar: string; // Sumber Dana
  qty: number;
  jumlah: number;
  filelink?: string;
  akun?: string;
  keterangan?: string;
  login_as?: string;
  logtime?: string;
  area_jenis: 'KOPERASI PUSAT' | 'KOPERASI CABANG' | 'PROJECT';
  harga_satuan?: number;
  customer_id?: string;
  supplier_id?: string;
}

export interface MemberRecord {
  id: string;
  tgl_reg: string;
  nama: string;
  gender: 'L' | 'P';
  provinsi: string;
  kota: string;
  alamat: string;
  pekerjaan: string;
  plantation: string;
  password?: string;
  tgl_lahir: string;
  area_jenis: 'KOPERASI PUSAT' | 'KOPERASI CABANG';
  simpanan_pokok?: number;
  simpanan_wajib?: number;
  simpanan_sukarela?: number;
  nik?: string;
  tempat_lahir?: string;
  username?: string;
  avatar_url?: string;
  legacy_password_hash?: string;
  status?: string;
}

export interface CustomerRecord {
  id: string;
  nama: string;
  pic: string;
  telepon: string;
  email?: string;
  alamat: string;
  provinsi: string;
  kota: string;
  npwp?: string;
  kategori: string;
  status: 'AKTIF' | 'NONAKTIF';
  keterangan?: string;
}

export interface SupplierRecord {
  id: string;
  nama: string;
  pic: string;
  telepon: string;
  email?: string;
  alamat: string;
  provinsi: string;
  kota: string;
  npwp?: string;
  kategori: string;
  status: 'AKTIF' | 'NONAKTIF';
  keterangan?: string;
}

export interface ProjectSummary {
  name: string;
  totalMasuk: number;
  totalKeluar: number;
  saldo: number;
  transaksiCount: number;
  komoditas?: string[];
  status: 'Aktif' | 'Dalam Pengembangan';
  defaultHarga?: number;
  satuan?: string;
}

export interface FinancialBreakdown {
  totalPemasukan: number;
  totalPengeluaran: number;
  saldo: number;
  totalKoperasi: number;
  totalProject: number;
  koperasi: {
    masuk: number;
    keluar: number;
  };
  project: {
    masuk: number;
    keluar: number;
  };
  simpanan: {
    pokok: number;
    wajib: number;
    manasuka: number;
    total: number;
  };
}

export interface DashboardMetrics {
  financial: FinancialBreakdown;
  membership: {
    total: number;
    pusat: number;
    cabang: number;
  };
  projects: ProjectSummary[];
  recentTransactions: TransactionRecord[];
  lastUpdated: string;
}

export interface COAAccount {
  kode: string;
  nama: string;
  jenis: 'Aset' | 'Liabilitas' | 'Ekuitas' | 'Pendapatan' | 'Beban';
  normal: 'Debit' | 'Kredit';
  kategori?: string;
  referal?: string;
  areaJenis?: string;
}

export interface JournalEntry {
  tanggal: string;
  id: string;
  akun: string;
  namaAkun: string;
  debit: number;
  kredit: number;
  keterangan: string;
}

export interface LedgerEntry {
  tanggal: string;
  id: string;
  keterangan: string;
  debit: number;
  kredit: number;
  saldo: number;
}

export interface ProductItem {
  sku: string;
  name: string;
  category: string;
  grade: string;
  packaging: string;
  availability: 'Tersedia' | 'Pre-Order' | 'Habis';
  moq: number;
  supplyCapacity: string;
  price?: number;
}

export interface RegistrationPayload {
  namaLengkap: string;
  nik: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  alamat: string;
  kota: string;
  provinsi: string;
  whatsapp: string;
  email?: string;
  statusAnggota: string;
  profesi: string;
  jenisSimpanan: string;
  jumlahTransfer: number;
  tanggalTransfer: string;
  fileKTPName?: string;
  fileKTPData?: string;
  fileBuktiName?: string;
  fileBuktiData?: string;
  fotoAnggotaData?: string;
}

export type PeriodFilter = 'ALL' | 'THIS_MONTH' | 'THIS_YEAR' | 'LAST_30_DAYS';

// ============================================================================
// 10 TABEL RESMI SUPABASE AUDIT SCHEMA
// ============================================================================

// 1. areas (16 kolom)
export interface AreaRecord {
  id: string;
  referral_type: string;
  kopwil: string;
  area_code: string;
  area_name: string;
  bank_account_1: string;
  bank_account_2: string;
  bank_account_3: string;
  province: string;
  city: string;
  sk_number: string;
  potential: string;
  pic_name: string;
  pic_contact: string;
  created_at?: string;
  updated_at?: string;
}

// 2. chart_of_accounts (11 kolom)
export interface ChartOfAccountRecord {
  id: string;
  account_code: string;
  account_name: string;
  account_group: string;
  financial_report: string;
  normal_balance: string;
  tx_type: string;
  parent_code?: string;
  is_active: boolean | string;
  created_at?: string;
  updated_at?: string;
}

// 3. customers (15 kolom)
export interface CustomerDbRecord {
  id: string;
  customer_code: string;
  name: string;
  pic_name: string;
  phone: string;
  email?: string;
  address: string;
  province: string;
  city: string;
  tax_number?: string;
  category: string;
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// 4. member_registrations (22 kolom)
export interface MemberRegistrationRecord {
  id: string;
  submitted_at: string;
  full_name: string;
  nik: string;
  birth_place: string;
  birth_date: string;
  gender: string;
  address: string;
  city: string;
  province: string;
  whatsapp: string;
  email?: string;
  member_status: string;
  profession: string;
  savings_type: string;
  transfer_amount: number;
  transfer_date: string;
  transfer_proof_url?: string;
  ktp_url?: string;
  selfie_url?: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  verification_status: string;
}

// 5. members (18 kolom)
export interface MemberDbRecord {
  id: string;
  member_no: string;
  registered_at: string;
  full_name: string;
  gender: string;
  province: string;
  city: string;
  address: string;
  occupation: string;
  username: string;
  birth_date: string;
  birth_place: string;
  nik: string;
  work_area: string;
  legacy_password_hash?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

// 6. products (9 kolom)
export interface ProductDbRecord {
  id: string;
  sku_code: string;
  sku_name: string;
  group_id: string;
  group_name: string;
  subgroup?: string;
  brand?: string;
  created_at?: string;
  updated_at?: string;
}

// 7. role_permissions (3 kolom)
export interface RolePermissionRecord {
  id: string;
  role: string;
  permission: string;
}

// 8. suppliers (15 kolom)
export interface SupplierDbRecord {
  id: string;
  supplier_code: string;
  name: string;
  pic_name: string;
  phone: string;
  email?: string;
  address: string;
  province: string;
  city: string;
  tax_number?: string;
  category: string;
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// 9. transactions (19 kolom)
export interface TransactionDbRecord {
  id: string;
  transaction_no: string;
  transaction_date: string;
  referral_type: string;
  area_name: string;
  transaction_type: string;
  payment_method: string;
  amount: number;
  file_url?: string;
  account_name_legacy?: string;
  description?: string;
  category_name?: string;
  product_name?: string;
  supplier_name?: string;
  customer_name?: string;
  qty?: number;
  price?: number;
  created_at?: string;
  updated_at?: string;
}

// 10. user_roles (4 kolom)
export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: string;
  created_at?: string;
}

export type SupabaseTableName =
  | 'areas'
  | 'chart_of_accounts'
  | 'customers'
  | 'member_registrations'
  | 'members'
  | 'products'
  | 'role_permissions'
  | 'suppliers'
  | 'transactions'
  | 'user_roles';


