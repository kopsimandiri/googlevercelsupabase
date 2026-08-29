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

// 9. transactions (19+ kolom)
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
  member_id?: string | null;
  category_code?: string | null;
  account_code?: string | null;
  created_at?: string;
  updated_at?: string;
}

// 10. user_roles (4 kolom)
export interface UserRoleRecord {
  id: string;
  user_id: string;
  role_id?: string | null;
  role: string;
  created_at?: string;
}

// 11. transaction_categories (8 kolom)
export interface TransactionCategoryRecord {
  id: number | string;
  type: string;
  category_code: string;
  name: string;
  account_code?: string | null;
  account_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

// 12. news_articles
export interface NewsArticleDbRecord {
  id: string;
  kategori: string;
  project_id?: string | null;
  judul: string;
  ringkasan: string;
  konten: string;
  lokasi?: string | null;
  foto_url?: string | null;
  tanggal: string;
  dibuat_oleh?: string | null;
  status: 'draft' | 'terbit';
  created_at?: string;
  updated_at?: string;
}

// 13. project_updates
export interface ProjectUpdateDbRecord {
  id: string;
  project_id: string;
  judul: string;
  narasi: string;
  foto_url?: string | null;
  tanggal: string;
  dibuat_oleh?: string | null;
  created_at?: string;
  updated_at?: string;
}

// 14. profiles
export interface ProfileRecord {
  id: string;
  full_name?: string | null;
  role: 'ADMIN' | 'DIRECTOR' | 'ANGGOTA';
  phone?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

// 15. roles
export interface RoleRecord {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
}

// 16. audit_logs
export interface AuditLogRecord {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  old_values?: any;
  new_values?: any;
  ip_address?: string | null;
  created_at?: string;
}

// 17. notification_jobs
export type NotificationType =
  | 'TRANSACTION_SUCCESS'
  | 'SAVINGS_DEPOSIT'
  | 'LOAN_SIMULATION'
  | 'LOAN_APPLICATION'
  | 'LOAN_APPROVED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_POSTED'
  | 'SECURITY_ALERT'
  | 'PASSWORD_RESET'
  | 'SYSTEM_NOTICE';

export type NotificationChannel = 'WHATSAPP' | 'EMAIL' | 'IN_APP' | 'PUSH';
export type NotificationStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface NotificationJobRecord {
  id: string;
  type: NotificationType;
  recipient: string;
  recipient_name?: string | null;
  channel: NotificationChannel;
  provider: string;
  payload: Record<string, any>;
  status: NotificationStatus;
  attempts: number;
  max_attempts: number;
  idempotency_key?: string | null;
  sent_at?: string | null;
  error?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// 18. user_notifications (In-App Inbox)
export interface UserNotificationRecord {
  id: string;
  user_id: string;
  title: string;
  message: string;
  category: 'TRANSACTION' | 'SAVINGS' | 'LOAN' | 'SECURITY' | 'SYSTEM';
  action_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

// 19. payment_requests
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED' | 'POSTED';
export type PaymentType = 'QRIS' | 'VIRTUAL_ACCOUNT' | 'BANK_TRANSFER' | 'EWALLET';

export interface PaymentRequestRecord {
  id: string;
  order_id: string;
  idempotency_key: string;
  member_id: string;
  member_name: string;
  amount: number;
  fee: number;
  total_amount: number;
  payment_type: PaymentType;
  payment_channel: string;
  va_number?: string | null;
  qr_string?: string | null;
  payment_url?: string | null;
  description?: string | null;
  category: string;
  status: PaymentStatus;
  expiry_time: string;
  paid_at?: string | null;
  posted_at?: string | null;
  posted_transaction_id?: string | null;
  webhook_received_at?: string | null;
  webhook_attempts?: number;
  webhook_signature?: string | null;
  raw_webhook_payload?: any;
  settlement_status: 'UNSETTLED' | 'SETTLED' | 'DISCREPANCY';
  settled_at?: string | null;
  created_at: string;
  updated_at: string;
}

// 20. loan_applications (Pembiayaan Syariah)
export type AkadType = 'MURABAHAH' | 'MUDHARABAH' | 'MUSYARAKAH' | 'IJARAH' | 'QARDH';
export type LoanApplicationStatus =
  | 'SIMULATED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'SURVEY'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISBURSED'
  | 'COMPLETED';

export interface AmortizationScheduleItem {
  month: number;
  principal_installment: number;
  margin_installment: number;
  total_installment: number;
  remaining_principal: number;
}

export interface LoanSimulationResult {
  loan_amount: number;
  tenor_months: number;
  margin_rate_pa: number;
  akad_type: AkadType;
  margin_amount: number;
  total_payment: number;
  monthly_installment: number;
  monthly_principal: number;
  monthly_margin: number;
  schedule: AmortizationScheduleItem[];
  disclaimer: string;
  is_authoritative?: boolean;
}

export interface LoanApplicationRecord {
  id: string;
  application_no: string;
  member_id: string;
  member_name: string;
  akad_type: AkadType;
  peruntukan: string;
  loan_amount: number;
  tenor_months: number;
  margin_rate_pa: number;
  margin_amount: number;
  total_payment: number;
  monthly_installment: number;
  monthly_principal: number;
  monthly_margin: number;
  amortization_schedule?: AmortizationScheduleItem[];
  status: LoanApplicationStatus;
  collateral_type?: string | null;
  collateral_detail?: string | null;
  monthly_income?: number;
  dsr_percentage?: number;
  approval_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  disbursed_at?: string | null;
  disbursed_transaction_id?: string | null;
  created_at: string;
  updated_at: string;
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
  | 'transaction_categories'
  | 'user_roles'
  | 'news_articles'
  | 'project_updates'
  | 'profiles'
  | 'roles'
  | 'audit_logs'
  | 'notification_jobs'
  | 'user_notifications'
  | 'payment_requests'
  | 'loan_applications';



