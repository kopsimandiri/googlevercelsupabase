import { getSupabaseClient, isSupabaseConfigured, testTableConnection, SupabaseTableCheckResult } from '../lib/supabase';
import { MemberRecord, RegistrationPayload } from '../types/database';
import { auditService } from './auditService';

const STORAGE_MEMBERS_KEY = 'KOPSIM_MEMBERS_DATA';

export const MEMBERS_TABLE_NAME = 'members';

/**
 * Official PostgreSQL DDL Script for Supabase (18 Kolom Sesuai Skema Resmi)
 */
export const MEMBERS_SQL_DDL = `-- =========================================================
-- KOPSIM MANDIRI: Tabel Master Anggota (members - 18 Kolom)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY,
    member_no TEXT UNIQUE,
    registered_at DATE DEFAULT CURRENT_DATE,
    full_name TEXT NOT NULL,
    gender VARCHAR(10) DEFAULT 'L',
    province TEXT DEFAULT 'DKI Jakarta',
    city TEXT DEFAULT 'Jakarta Pusat',
    address TEXT DEFAULT '',
    occupation TEXT DEFAULT 'Anggota Koperasi',
    username TEXT DEFAULT '',
    birth_date DATE DEFAULT '1990-01-01',
    birth_place TEXT DEFAULT 'Jakarta',
    nik VARCHAR(20) DEFAULT '',
    work_area TEXT DEFAULT 'PUSAT JAKARTA',
    legacy_password_hash TEXT DEFAULT '',
    status TEXT DEFAULT 'AKTIF',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_members_full_name ON public.members (full_name);
CREATE INDEX IF NOT EXISTS idx_members_member_no ON public.members (member_no);
CREATE INDEX IF NOT EXISTS idx_members_registered_at ON public.members (registered_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_work_area ON public.members (work_area);
CREATE INDEX IF NOT EXISTS idx_members_nik ON public.members (nik);

-- Row Level Security (RLS)
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses: Publik / Anggota dapat membaca data & mendaftar
CREATE POLICY "Allow public read access on members" 
    ON public.members FOR SELECT 
    USING (true);

CREATE POLICY "Allow insert for new members" 
    ON public.members FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow admin update on members" 
    ON public.members FOR UPDATE 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow admin delete on members" 
    ON public.members FOR DELETE 
    USING (true);
`;

const INITIAL_MEMBERS: MemberRecord[] = [
  { id: '1121-00001', tgl_reg: '2021-11-01', nama: 'Ferry Joko Yuliantono', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Pusat', alamat: 'Jl. Pegangsaan Barat No. 14', pekerjaan: 'Pengurus Koperasi', plantation: 'PUSAT JAKARTA', tgl_lahir: '1970-01-01', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 10000000 },
  { id: '1121-00002', tgl_reg: '2021-11-01', nama: 'Nunung Suhudiah', gender: 'P', provinsi: 'DKI Jakarta', kota: 'Jakarta Selatan', alamat: 'Jl. Tebet Raya No. 20', pekerjaan: 'Ekonom & Pengusaha', plantation: 'PUSAT JAKARTA', tgl_lahir: '1975-11-10', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 10000000 },
  { id: '1121-00003', tgl_reg: '2021-11-01', nama: 'Habloel Mawadi', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Pusat', alamat: 'Jl. Menteng Raya No. 10', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1972-03-15', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '1121-00004', tgl_reg: '2021-11-01', nama: 'Yudhi Irsyahdi', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Timur', alamat: 'Jl. Pemuda No. 22', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1974-05-20', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '1121-00005', tgl_reg: '2021-11-01', nama: 'Achmad Fauzi', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Barat', alamat: 'Jl. Kebon Jeruk No. 8', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1976-08-12', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '1121-00006', tgl_reg: '2021-11-01', nama: 'David', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Pusat', alamat: 'Jl. Cikini Raya No. 15', pekerjaan: 'Profesional', plantation: 'PUSAT JAKARTA', tgl_lahir: '1980-02-18', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '1121-00007', tgl_reg: '2021-11-01', nama: 'Azanil Kelana', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Selatan', alamat: 'Jl. Panglima Polim No. 30', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1971-09-09', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '1121-00008', tgl_reg: '2021-11-01', nama: 'Deva Rachman', gender: 'P', provinsi: 'DKI Jakarta', kota: 'Jakarta Selatan', alamat: 'Jl. Kemang Raya No. 12', pekerjaan: 'Profesional', plantation: 'PUSAT JAKARTA', tgl_lahir: '1976-12-05', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 8000000 },
  { id: '1121-00009', tgl_reg: '2021-11-01', nama: 'Hamdan Zoelva', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Pusat', alamat: 'Jl. Taman Amir Hamzah No. 6A', pekerjaan: 'Praktisi Hukum', plantation: 'PUSAT JAKARTA', tgl_lahir: '1962-06-21', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 15000000 },
  { id: '1121-00010', tgl_reg: '2021-11-01', nama: 'Sodikun', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Utara', alamat: 'Jl. Danau Sunter No. 4', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1968-04-14', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '1121-00011', tgl_reg: '2021-11-01', nama: 'Ismi Kushartanto', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Selatan', alamat: 'Jl. Fatmawati No. 18', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1973-07-25', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '1121-00012', tgl_reg: '2021-11-01', nama: 'Trisiladi Supriyanto', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Timur', alamat: 'Jl. DI Panjaitan No. 5', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1970-10-30', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '1121-00013', tgl_reg: '2021-11-01', nama: 'Aulia Tahkim', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Pusat', alamat: 'Jl. Salemba Raya No. 40', pekerjaan: 'Akademisi', plantation: 'PUSAT JAKARTA', tgl_lahir: '1975-01-15', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '1121-00014', tgl_reg: '2021-11-01', nama: 'Lukman Firmansyah', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Barat', alamat: 'Jl. Tomang Raya No. 11', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1977-06-19', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '1121-00015', tgl_reg: '2021-11-01', nama: 'Setianing Indrawati', gender: 'P', provinsi: 'DKI Jakarta', kota: 'Jakarta Selatan', alamat: 'Jl. Radio Dalam No. 8', pekerjaan: 'Profesional', plantation: 'PUSAT JAKARTA', tgl_lahir: '1979-03-22', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '1121-00016', tgl_reg: '2021-11-01', nama: 'Syaiful Anwar', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Pusat', alamat: 'Jl. Kramat Raya No. 25', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1971-11-14', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '1121-00017', tgl_reg: '2021-11-01', nama: 'Abdul Wahab Sunneth', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Timur', alamat: 'Jl. Raya Bogor KM 20', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1969-08-08', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '1121-00018', tgl_reg: '2021-11-01', nama: 'Syafrudin Djosan', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Selatan', alamat: 'Jl. Wolter Monginsidi No. 16', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1967-05-02', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '1121-03001', tgl_reg: '2021-11-01', nama: 'E. Suminah', gender: 'P', provinsi: 'Jawa Barat', kota: 'Bandung', alamat: 'Jl. Dago No. 50', pekerjaan: 'Wiraswasta', plantation: 'CABANG JAWA BARAT', tgl_lahir: '1975-04-12', area_jenis: 'KOPERASI CABANG', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '1121-03002', tgl_reg: '2021-11-01', nama: 'Taufik Makarao', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Pusat', alamat: 'Jl. Cempaka Putih No. 14', pekerjaan: 'Praktisi Hukum', plantation: 'PUSAT JAKARTA', tgl_lahir: '1973-09-17', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '1121-03003', tgl_reg: '2021-11-01', nama: 'Ahmad Djodjo', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Barat', alamat: 'Jl. Daan Mogot KM 11', pekerjaan: 'Pengusaha', plantation: 'PUSAT JAKARTA', tgl_lahir: '1965-12-28', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 8000000 },
  { id: '1225-02001', tgl_reg: '2025-12-01', nama: 'Alvin Azhar', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Selatan', alamat: 'Jl. Pasar Minggu No. 70', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1988-03-04', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 3000000 },
  { id: '1225-03001', tgl_reg: '2025-12-01', nama: 'Handika', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Timur', alamat: 'Jl. Rawamangun No. 9', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1985-07-11', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 3000000 },
  { id: '1225-03002', tgl_reg: '2025-12-01', nama: 'Imam Ghozali', gender: 'L', provinsi: 'Jawa Timur', kota: 'Surabaya', alamat: 'Jl. Darmo No. 33', pekerjaan: 'Akademisi', plantation: 'CABANG JAWA TIMUR', tgl_lahir: '1970-02-14', area_jenis: 'KOPERASI CABANG', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '1225-03003', tgl_reg: '2025-12-01', nama: 'Syamsurizal', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Pusat', alamat: 'Jl. Tanah Abang II No. 18', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1974-10-08', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '1225-03004', tgl_reg: '2025-12-01', nama: 'Leni Yuliani', gender: 'P', provinsi: 'Jawa Barat', kota: 'Bandung', alamat: 'Jl. Buah Batu No. 42', pekerjaan: 'Pendidik', plantation: 'CABANG JAWA BARAT', tgl_lahir: '1982-06-20', area_jenis: 'KOPERASI CABANG', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 3000000 },
  { id: '1225-03005', tgl_reg: '2025-12-01', nama: 'Muhamad Kadarulah', gender: 'L', provinsi: 'Banten', kota: 'Tangerang', alamat: 'Jl. Sudirman No. 10', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1978-11-29', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '0426-03001', tgl_reg: '2026-04-01', nama: 'Megawaty', gender: 'P', provinsi: 'DKI Jakarta', kota: 'Jakarta Barat', alamat: 'Jl. Puri Indah No. 25', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1983-05-16', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '0426-03002', tgl_reg: '2026-04-01', nama: 'Ivan Prasetia Arifuddin', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Selatan', alamat: 'Jl. Buncit Raya No. 19', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1981-08-23', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '0426-03003', tgl_reg: '2026-04-01', nama: 'Agus', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Timur', alamat: 'Jl. Matraman No. 35', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1979-01-10', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 3000000 },
  { id: '0426-03004', tgl_reg: '2026-04-01', nama: 'Cholil Hasan', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Pusat', alamat: 'Jl. Senen Raya No. 5', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1966-07-04', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 8000000 },
  { id: '0426-03005', tgl_reg: '2026-04-01', nama: 'Muhammad Tonas', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Selatan', alamat: 'Jl. Gandaria No. 8', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1975-09-19', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '0426-03006', tgl_reg: '2026-04-01', nama: 'Gahara Wiratanuningrat R., Ir.', gender: 'L', provinsi: 'Jawa Barat', kota: 'Bandung', alamat: 'Jl. Setiabudi No. 120', pekerjaan: 'Konsultan Teknik', plantation: 'CABANG JAWA BARAT', tgl_lahir: '1964-03-27', area_jenis: 'KOPERASI CABANG', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 10000000 },
  { id: '0426-03007', tgl_reg: '2026-04-01', nama: 'Ihya Wahyu Aulia', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Timur', alamat: 'Jl. Cililitan No. 16', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1987-10-12', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 3000000 },
  { id: '0426-03008', tgl_reg: '2026-04-01', nama: 'Iwan Suprayogi', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Utara', alamat: 'Jl. Pluit Raya No. 44', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1972-12-01', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '0426-03009', tgl_reg: '2026-04-01', nama: 'Stefanus Christmas Prijono', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Barat', alamat: 'Jl. Grogol Permai No. 18', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1976-12-25', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '0426-03010', tgl_reg: '2026-04-01', nama: 'Teuku Irsyad, IMD', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Pusat', alamat: 'Jl. Johar No. 7', pekerjaan: 'Profesional', plantation: 'PUSAT JAKARTA', tgl_lahir: '1971-05-18', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
  { id: '0426-03011', tgl_reg: '2026-04-01', nama: 'Supriyadi', gender: 'L', provinsi: 'DKI Jakarta', kota: 'Jakarta Selatan', alamat: 'Jl. Cilandak KKO No. 30', pekerjaan: 'Wiraswasta', plantation: 'PUSAT JAKARTA', tgl_lahir: '1973-04-05', area_jenis: 'KOPERASI PUSAT', simpanan_pokok: 500000, simpanan_wajib: 360000, simpanan_sukarela: 5000000 },
];

export interface MemberFetchResult {
  data: MemberRecord[];
  source: 'SUPABASE' | 'LOCAL_STORAGE';
  message: string;
}

/**
 * Maps raw Supabase row from public.members (flexible column conventions) to UI MemberRecord
 */
export function mapSupabaseMemberRowToMemberRecord(row: any): MemberRecord {
  const memberNo = String(
    row.member_no ||
    row.id ||
    row.no_anggota ||
    row.nra ||
    row.nomor_anggota ||
    row.member_id ||
    row.nik ||
    ''
  );
  const nama = String(
    row.full_name ||
    row.nama ||
    row.nama_lengkap ||
    row.name ||
    row.fullname ||
    'Anggota'
  );
  
  const rawGender = String(row.gender || row.jenis_kelamin || row.sex || 'L').toUpperCase();
  const gender = rawGender === 'P' || rawGender.startsWith('PEREMPUAN') || rawGender === 'F' || rawGender.startsWith('FEMALE') ? 'P' : 'L';
  
  const provinsi = String(row.province || row.provinsi || 'DKI Jakarta');
  const kota = String(row.city || row.kota || row.kabupaten || row.kabupaten_kota || 'Jakarta Pusat');
  const alamat = String(row.address || row.alamat || row.domisili || row.alamat_lengkap || '');
  const pekerjaan = String(row.occupation || row.pekerjaan || row.profesi || row.jabatan || 'Anggota Koperasi');
  const plantation = String(row.work_area || row.plantation || row.wilayah_kerja || row.cabang || row.kantor || row.area_name || 'PUSAT JAKARTA');
  
  const tglReg = row.registered_at
    ? String(row.registered_at).split('T')[0]
    : (row.tgl_reg
        ? String(row.tgl_reg).split('T')[0]
        : (row.tanggal_daftar
            ? String(row.tanggal_daftar).split('T')[0]
            : (row.registration_date
                ? String(row.registration_date).split('T')[0]
                : (row.created_at
                    ? String(row.created_at).split('T')[0]
                    : new Date().toISOString().split('T')[0]))));

  const tglLahir = row.birth_date
    ? String(row.birth_date).split('T')[0]
    : (row.tgl_lahir
        ? String(row.tgl_lahir).split('T')[0]
        : (row.tanggal_lahir
            ? String(row.tanggal_lahir).split('T')[0]
            : '1990-01-01'));

  const tempatLahir = String(row.birth_place || row.tempat_lahir || row.kota_lahir || kota || 'Jakarta');
  const nikVal = String(row.nik || row.no_ktp || row.ktp || '');
  const usernameVal = String(row.username || row.user_name || row.email || memberNo || row.id || '');
  const avatarVal = String(row.avatar_url || row.foto_url || row.photo_url || row.avatar || row.foto || '');
  const legacyPass = String(row.legacy_password_hash || row.password_hash || row.password || row.pass || '');
  const statusVal = String(row.status || row.status_anggota || 'AKTIF');

  const areaJenis = plantation.toUpperCase().includes('CABANG')
    ? 'KOPERASI CABANG'
    : 'KOPERASI PUSAT';

  return {
    id: memberNo || String(row.id || ''),
    tgl_reg: tglReg,
    nama,
    gender,
    provinsi,
    kota,
    alamat,
    pekerjaan,
    plantation,
    tgl_lahir: tglLahir,
    area_jenis: areaJenis,
    simpanan_pokok: Number(row.simpanan_pokok ?? row.pokok ?? 500000),
    simpanan_wajib: Number(row.simpanan_wajib ?? row.wajib ?? 360000),
    simpanan_sukarela: Number(row.simpanan_sukarela ?? row.sukarela ?? row.manasuka ?? 0),
    nik: nikVal,
    tempat_lahir: tempatLahir,
    username: usernameVal,
    avatar_url: avatarVal,
    legacy_password_hash: legacyPass,
    status: statusVal,
  } as MemberRecord;
}

/**
 * Maps UI MemberRecord to Supabase public.members 18 columns format
 */
export function mapMemberRecordToSupabaseRow(member: Partial<MemberRecord>, extra: any = {}): any {
  const idVal = member.id || extra.id || extra.member_no || `MEM-${Date.now()}`;
  const nowStr = new Date().toISOString();

  // Guarantee clean 16 digits NIK
  let rawNik = String(extra.nik || (member as any).nik || '').replace(/\D/g, '');
  if (!rawNik || rawNik.length !== 16) {
    rawNik = '3171000000000001';
  }

  const rawUsername = String(
    extra.username || (member as any).username || (member.nama ? member.nama.toLowerCase().replace(/[^a-z0-9]/g, '_') : `user_${Date.now()}`)
  ).toLowerCase().trim();

  return {
    id: idVal,
    member_no: member.id || extra.member_no || idVal,
    registered_at: member.tgl_reg || extra.registered_at || nowStr.split('T')[0],
    full_name: (member.nama || extra.full_name || 'Anggota Baru').trim(),
    gender: member.gender === 'P' ? 'P' : 'L',
    province: (member.provinsi || extra.province || 'DKI Jakarta').trim(),
    city: (member.kota || extra.city || 'Jakarta Pusat').trim(),
    address: (member.alamat || extra.address || '').trim(),
    occupation: (member.pekerjaan || extra.occupation || 'Anggota Koperasi').trim(),
    username: rawUsername,
    birth_date: member.tgl_lahir || extra.birth_date || '1990-01-01',
    birth_place: (extra.birth_place || (member as any).tempat_lahir || member.kota || 'Jakarta').trim(),
    nik: rawNik,
    work_area: (member.plantation || extra.work_area || 'JKT-01').trim(),
    legacy_password_hash: (extra.legacy_password_hash || (member as any).legacy_password_hash || '').trim(),
    avatar_url: (member as any).avatar_url || extra.avatar_url || '',
    status: extra.status || (member as any).status || 'AKTIF',
    created_at: extra.created_at || nowStr,
    updated_at: nowStr,
  };
}

export const memberService = {
  async getStoredMembersAsync(): Promise<MemberRecord[]> {
    return this.getStoredMembers();
  },

  /**
   * Fetches official master areas from Supabase public.areas (with local fallback)
   */
  async getAreasMaster(): Promise<any[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('areas')
          .select('id, area_code, area_name, province, city, kopwil, referral_type')
          .order('area_code', { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('[memberService] Supabase getAreasMaster error:', err);
      }
    }

    // Fallback from masterDataService
    try {
      const stored = localStorage.getItem('KOPSIM_TABLE_AREAS');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }

    return [
      {
        id: 'AREA-01',
        area_code: 'JKT-01',
        area_name: 'Pusat Jakarta - Menteng',
        province: 'DKI Jakarta',
        city: 'Jakarta Pusat',
        kopwil: 'KOPWIL I - DKI JAKARTA',
        referral_type: 'KOPERASI',
      },
      {
        id: 'AREA-02',
        area_code: 'JBR-01',
        area_name: 'Cabang Jawa Barat - Cianjur & Bandung',
        province: 'Jawa Barat',
        city: 'Cianjur',
        kopwil: 'KOPWIL II - JAWA BARAT',
        referral_type: 'KOPERASI',
      },
      {
        id: 'AREA-03',
        area_code: 'JTM-01',
        area_name: 'Cabang Jawa Timur - Surabaya & Madura',
        province: 'Jawa Timur',
        city: 'Surabaya',
        kopwil: 'KOPWIL III - JAWA TIMUR',
        referral_type: 'PROJECT',
      },
      {
        id: 'AREA-04',
        area_code: 'JTG-01',
        area_name: 'Cabang Jawa Tengah - Solo & Semarang',
        province: 'Jawa Tengah',
        city: 'Surakarta (Solo)',
        kopwil: 'KOPWIL IV - JAWA TENGAH',
        referral_type: 'KOPERASI',
      },
      {
        id: 'AREA-05',
        area_code: 'SMT-01',
        area_name: 'Cabang Sumatera Utara - Medan',
        province: 'Sumatera Utara',
        city: 'Medan',
        kopwil: 'KOPWIL V - SUMATERA',
        referral_type: 'KOPERASI',
      },
    ];
  },

  /**
   * Generates safe, sequential next member_no (Format: {MMYY}-{XXXXX})
   * Checks both live Supabase records and local storage to guarantee uniqueness.
   */
  async generateNextMemberNo(): Promise<string> {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const prefix = `${mm}${yy}`;

    let maxSeq = 3000;

    // Check local stored members
    const local = this.getStoredMembers();
    local.forEach((m) => {
      const num = m.id || (m as any).member_no || '';
      if (num && num.includes('-')) {
        const parts = num.split('-');
        if (parts.length === 2) {
          const seq = parseInt(parts[1], 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    });

    // Check Supabase public.members
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from(MEMBERS_TABLE_NAME)
          .select('id, member_no');

        if (!error && Array.isArray(data)) {
          data.forEach((row: any) => {
            const num = row.member_no || row.id || '';
            if (num && num.includes('-')) {
              const parts = num.split('-');
              if (parts.length === 2) {
                const seq = parseInt(parts[1], 10);
                if (!isNaN(seq) && seq > maxSeq) {
                  maxSeq = seq;
                }
              }
            }
          });
        }
      } catch (err) {
        console.warn('[memberService] generateNextMemberNo query warning:', err);
      }
    }

    const nextSeqStr = String(maxSeq + 1).padStart(5, '0');
    return `${prefix}-${nextSeqStr}`;
  },

  /**
   * Checks if username is already taken in Supabase public.members or local storage
   */
  async checkUsernameAvailable(username: string): Promise<{ available: boolean; message?: string }> {
    const cleanUser = (username || '').trim().toLowerCase();
    if (!cleanUser) {
      return { available: false, message: 'Username tidak boleh kosong.' };
    }

    // Check local storage
    const local = this.getStoredMembers();
    const isLocalTaken = local.some(
      (m) =>
        (m.username && m.username.toLowerCase() === cleanUser) ||
        (m.id && m.id.toLowerCase() === cleanUser)
    );
    if (isLocalTaken) {
      return { available: false, message: `Username '${cleanUser}' sudah digunakan.` };
    }

    // Check Supabase
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from(MEMBERS_TABLE_NAME)
          .select('id, username')
          .ilike('username', cleanUser)
          .limit(1);

        if (!error && data && data.length > 0) {
          return { available: false, message: `Username '${cleanUser}' sudah terdaftar di Supabase.` };
        }
      } catch (err) {
        console.warn('[memberService] checkUsernameAvailable warning:', err);
      }
    }

    return { available: true };
  },

  /**
   * Comprehensive Admin Add Member Feature:
   * Directly inserts all 18 columns into public.members on Supabase
   * Maps work_area to public.areas.area_code
   */
  async addNewMemberAdmin(payload: {
    member_no: string;
    registered_at: string;
    full_name: string;
    gender: 'L' | 'P';
    nik: string;
    birth_place: string;
    birth_date: string;
    occupation: string;
    province: string;
    city: string;
    address: string;
    work_area: string; // area_code (e.g. JKT-01, JBR-01)
    username: string;
    password?: string;
    status?: string;
    simpanan_pokok?: number;
    simpanan_wajib?: number;
    simpanan_sukarela?: number;
  }): Promise<{ success: boolean; data?: MemberRecord; error?: string; source: 'SUPABASE' | 'LOCAL' }> {
    if (!payload.full_name.trim()) throw new Error('Nama lengkap anggota wajib diisi.');
    if (!payload.member_no.trim()) throw new Error('Nomor Anggota (NRA) wajib diisi.');
    if (!payload.nik.trim() || payload.nik.length !== 16) {
      throw new Error('NIK harus 16 digit angka.');
    }
    if (!payload.work_area.trim()) throw new Error('Area Kerja wajib dipilih dari master data.');

    const cleanUsername = (payload.username || payload.full_name.toLowerCase().replace(/[^a-z0-9]/g, '_'))
      .trim()
      .toLowerCase();

    const nowStr = new Date().toISOString();
    const idVal = payload.member_no.trim();

    if (!payload.password || payload.password.trim().length < 4) {
      throw new Error('Password akun anggota wajib diisi (minimal 4 karakter).');
    }

    // 1. Prepare exact Supabase public.members 18 columns row
    const dbRow = {
      id: idVal,
      member_no: idVal,
      registered_at: payload.registered_at || nowStr.split('T')[0],
      full_name: payload.full_name.trim(),
      gender: payload.gender === 'P' ? 'P' : 'L',
      province: payload.province || 'DKI Jakarta',
      city: payload.city || 'Jakarta Pusat',
      address: payload.address || '',
      occupation: payload.occupation || 'Anggota Koperasi',
      username: cleanUsername,
      birth_date: payload.birth_date || '1990-01-01',
      birth_place: payload.birth_place || payload.city || 'Jakarta',
      nik: payload.nik.trim(),
      work_area: payload.work_area.trim(), // Sesuai aturan: simpan area_code (misal: JKT-01)
      legacy_password_hash: payload.password.trim(),
      status: payload.status || 'AKTIF',
      created_at: nowStr,
      updated_at: nowStr,
    };

    // 2. Prepare UI MemberRecord
    const newMemberRecord: MemberRecord = {
      id: idVal,
      tgl_reg: dbRow.registered_at,
      nama: dbRow.full_name,
      gender: dbRow.gender as 'L' | 'P',
      provinsi: dbRow.province,
      kota: dbRow.city,
      alamat: dbRow.address,
      pekerjaan: dbRow.occupation,
      plantation: dbRow.work_area,
      tgl_lahir: dbRow.birth_date,
      area_jenis: dbRow.work_area.toUpperCase().includes('JKT') || dbRow.work_area.toUpperCase().includes('PUSAT')
        ? 'KOPERASI PUSAT'
        : 'KOPERASI CABANG',
      simpanan_pokok: payload.simpanan_pokok ?? 500000,
      simpanan_wajib: payload.simpanan_wajib ?? 360000,
      simpanan_sukarela: payload.simpanan_sukarela ?? 0,
      nik: dbRow.nik,
      tempat_lahir: dbRow.birth_place,
      username: dbRow.username,
      legacy_password_hash: dbRow.legacy_password_hash,
      status: dbRow.status,
    };

    let savedToSupabase = false;
    let supabaseErrorMessage: string | undefined;
    const client = getSupabaseClient();

    if (client) {
      try {
        console.log(`[memberService] Menyimpan anggota baru ke Supabase public.members...`, dbRow);
        const { error: insertError } = await client
          .from(MEMBERS_TABLE_NAME)
          .insert([dbRow]);

        if (!insertError) {
          savedToSupabase = true;
          console.log(`[memberService] Berhasil menyimpan ke Supabase public.members.`);
        } else {
          console.warn(`[memberService] Supabase insert notice:`, insertError.message);
          supabaseErrorMessage = insertError.message;
          // Try upsert as fallback
          const { error: upsertErr } = await client
            .from(MEMBERS_TABLE_NAME)
            .upsert([dbRow], { onConflict: 'id' });
          if (!upsertErr) {
            savedToSupabase = true;
            supabaseErrorMessage = undefined;
            console.log(`[memberService] Berhasil upsert ke Supabase public.members.`);
          } else {
            supabaseErrorMessage = upsertErr.message;
            console.error(`[memberService] Supabase upsert error:`, upsertErr.message);
          }
        }
      } catch (err: any) {
        supabaseErrorMessage = err?.message || String(err);
        console.error(`[memberService] Supabase insert exception:`, err);
      }
    }

    // 3. Save to local storage cache
    try {
      const stored = this.getStoredMembers();
      // remove duplicate if exists
      const filtered = stored.filter((m) => m.id !== idVal);
      filtered.unshift(newMemberRecord);
      localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Local storage save exception:', e);
    }

    return {
      success: true,
      data: newMemberRecord,
      source: savedToSupabase ? 'SUPABASE' : 'LOCAL',
      error: supabaseErrorMessage,
    };
  },

  getStoredMembers(): MemberRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_MEMBERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    // Only return initial members if no cache exists
    return INITIAL_MEMBERS;
  },

  async checkStatus(): Promise<SupabaseTableCheckResult> {
    return await testTableConnection(MEMBERS_TABLE_NAME);
  },

  /**
   * Fetches real live records directly from Supabase table 'public.members'
   */
  async getMembersWithMeta(): Promise<MemberFetchResult> {
    const client = getSupabaseClient();
    if (client) {
      try {
        console.log(`[memberService] Membaca data langsung dari tabel '${MEMBERS_TABLE_NAME}' di Supabase...`);
        
        // Query direct from Supabase public.members
        const { data, error } = await client
          .from(MEMBERS_TABLE_NAME)
          .select('*');

        if (!error && Array.isArray(data)) {
          console.log(`[memberService] Berhasil memuat ${data.length} baris dari tabel public.members Supabase.`);
          const mappedData = data.map(mapSupabaseMemberRowToMemberRecord);
          // Sync to localStorage for fast local caching
          localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(mappedData));
          return {
            data: mappedData,
            source: 'SUPABASE',
            message: `Data live real-time dari Supabase public.members (${data.length} anggota ditemukan di database)`,
          };
        }

        if (error) {
          console.warn(`[memberService] Supabase public.members query notice:`, error.message);
        }
      } catch (err: any) {
        console.warn(`[memberService] Supabase connection error:`, err);
      }
    }

    const localData = this.getStoredMembers();
    return {
      data: localData,
      source: 'LOCAL_STORAGE',
      message: isSupabaseConfigured
        ? 'Memuat data cache lokal (Supabase belum mengembalikan data public.members)'
        : 'Mode Offline / Local Storage (Supabase belum dihubungkan)',
    };
  },

  async getMembers(): Promise<MemberRecord[]> {
    const result = await this.getMembersWithMeta();
    return result.data;
  },

  async getMemberById(idOrMemberNo: string): Promise<MemberRecord | null> {
    const cleanId = (idOrMemberNo || '').trim();
    if (!cleanId) return null;

    const client = getSupabaseClient();
    if (client) {
      try {
        // Direct query to Supabase public.members by ID, member_no, or username
        const { data, error } = await client
          .from(MEMBERS_TABLE_NAME)
          .select('*')
          .or(`id.ilike.%${cleanId}%,member_no.ilike.%${cleanId}%,username.ilike.%${cleanId}%,full_name.ilike.%${cleanId}%`)
          .limit(1);

        if (!error && data && data.length > 0) {
          return mapSupabaseMemberRowToMemberRecord(data[0]);
        }
      } catch (err) {
        console.warn('[memberService] Direct single member query fallback:', err);
      }
    }

    const members = await this.getMembers();
    const target = cleanId.toLowerCase();
    return (
      members.find(
        (m) =>
          (m.id && m.id.toLowerCase() === target) ||
          (m.nama && m.nama.toLowerCase() === target) ||
          (m.nama && m.nama.toLowerCase().includes(target))
      ) || null
    );
  },

  async saveMember(memberData: Partial<MemberRecord>, extraPayload: any = {}): Promise<{ success: boolean; id?: string; error?: string; source: 'SUPABASE' | 'LOCAL' }> {
    const isEdit = Boolean(memberData.id);
    const client = getSupabaseClient();
    const nowStr = new Date().toISOString();

    if (isEdit) {
      const members = this.getStoredMembers();
      const idx = members.findIndex((m) => m.id === memberData.id);
      if (idx === -1) return { success: false, error: 'ID Anggota tidak ditemukan.', source: 'LOCAL' };

      const oldRecord = { ...members[idx] };
      const updatedRecord: MemberRecord = {
        ...members[idx],
        ...memberData,
      } as MemberRecord;

      let savedToSupabase = false;
      let supabaseErrorMsg: string | undefined;

      if (client) {
        try {
          const updatePayload: Record<string, any> = {
            full_name: updatedRecord.nama,
            gender: updatedRecord.gender === 'P' ? 'P' : 'L',
            province: updatedRecord.provinsi || 'DKI Jakarta',
            city: updatedRecord.kota || 'Jakarta Pusat',
            address: updatedRecord.alamat || '',
            occupation: updatedRecord.pekerjaan || 'Anggota Koperasi',
            work_area: updatedRecord.plantation || 'PUSAT JAKARTA',
            birth_date: updatedRecord.tgl_lahir || '1990-01-01',
            updated_at: nowStr,
          };

          if (updatedRecord.tempat_lahir) {
            updatePayload.birth_place = updatedRecord.tempat_lahir;
          }

          let updateRes = await client
            .from(MEMBERS_TABLE_NAME)
            .update(updatePayload)
            .eq('id', memberData.id);

          if (!updateRes.error) {
            savedToSupabase = true;
          } else {
            console.error('SAVE MEMBER SUPABASE ERROR (ID):', updateRes.error);
            // Try updating with alternate key member_no
            const altUpdate = await client
              .from(MEMBERS_TABLE_NAME)
              .update(updatePayload)
              .eq('member_no', memberData.id);
            if (!altUpdate.error) {
              savedToSupabase = true;
            } else {
              supabaseErrorMsg = altUpdate.error.message;
              console.error('SAVE MEMBER SUPABASE ERROR (MEMBER_NO):', altUpdate.error);
            }
          }
        } catch (err: any) {
          supabaseErrorMsg = err?.message || String(err);
          console.error('SAVE MEMBER SUPABASE ERROR:', err);
        }
      }

      // Update local storage
      members[idx] = updatedRecord;
      localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(members));

      // Record audit log
      await auditService.logActivity(
        'UPDATE_MEMBER',
        'members',
        memberData.id!,
        oldRecord,
        updatedRecord
      );

      return {
        success: true,
        id: memberData.id,
        source: savedToSupabase ? 'SUPABASE' : 'LOCAL',
        error: supabaseErrorMsg,
      };
    } else {
      // 1. Generate unique Member ID
      const newId = await this.generateNextMemberNo();
      const now = new Date();

      const newMember: MemberRecord = {
        id: newId,
        tgl_reg: now.toISOString().split('T')[0],
        nama: (memberData.nama || 'Anggota Baru').trim(),
        gender: memberData.gender === 'P' ? 'P' : 'L',
        provinsi: (memberData.provinsi || 'DKI Jakarta').trim(),
        kota: (memberData.kota || 'Jakarta Pusat').trim(),
        alamat: (memberData.alamat || '').trim().substring(0, 200),
        pekerjaan: (memberData.pekerjaan || 'Anggota Koperasi').trim(),
        plantation: (memberData.plantation || 'JKT-01').trim(),
        tgl_lahir: memberData.tgl_lahir || '1990-01-01',
        area_jenis: (memberData.plantation || '').toUpperCase().includes('PUSAT') || (memberData.plantation || '').toUpperCase().includes('JKT')
          ? 'KOPERASI PUSAT'
          : 'KOPERASI CABANG',
        simpanan_pokok: memberData.simpanan_pokok ?? 500000,
        simpanan_wajib: memberData.simpanan_wajib ?? 360000,
        simpanan_sukarela: memberData.simpanan_sukarela || 0,
      };

      const dbRow = mapMemberRecordToSupabaseRow(newMember, { ...extraPayload, id: newId, member_no: newId });

      let savedToSupabase = false;
      let supabaseErrorMsg: string | undefined;

      // 2. Try Supabase INSERT first
      if (client) {
        try {
          let insertRes = await client
            .from(MEMBERS_TABLE_NAME)
            .insert([dbRow]);

          if (insertRes.error && dbRow.avatar_url) {
            const safeRow = { ...dbRow };
            delete safeRow.avatar_url;
            insertRes = await client.from(MEMBERS_TABLE_NAME).insert([safeRow]);
          }

          if (!insertRes.error) {
            savedToSupabase = true;
          } else {
            supabaseErrorMsg = insertRes.error.message;
            console.error('SAVE MEMBER SUPABASE ERROR:', insertRes.error);
            // Fallback: try upsert
            const { error: upsertErr } = await client
              .from(MEMBERS_TABLE_NAME)
              .upsert([dbRow], { onConflict: 'id' });
            if (!upsertErr) {
              savedToSupabase = true;
              supabaseErrorMsg = undefined;
            } else {
              console.error('SAVE MEMBER SUPABASE ERROR (UPSERT):', upsertErr);
            }
          }
        } catch (err: any) {
          supabaseErrorMsg = err?.message || String(err);
          console.error('SAVE MEMBER SUPABASE ERROR:', err);
        }
      }

      // 3. Update local cache
      const members = this.getStoredMembers();
      const filtered = members.filter((m) => m.id !== newId);
      filtered.unshift(newMember);
      localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(filtered));

      // Record audit log
      await auditService.logActivity(
        'CREATE_MEMBER',
        'members',
        newId,
        null,
        newMember
      );

      return {
        success: true,
        id: newId,
        source: savedToSupabase ? 'SUPABASE' : 'LOCAL',
        error: supabaseErrorMsg,
      };
    }
  },

  async deleteMember(id: string): Promise<{ success: boolean; error?: string }> {
    let members = this.getStoredMembers();
    const targetIdx = members.findIndex((m) => m.id === id);
    if (targetIdx === -1) return { success: false, error: 'Data anggota tidak ditemukan.' };

    const oldRecord = members[targetIdx];
    members = members.filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(members));

    // Record audit log
    await auditService.logActivity(
      'DELETE_MEMBER',
      'members',
      id,
      oldRecord,
      null
    );

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from(MEMBERS_TABLE_NAME).delete().eq('id', id);
        if (error) {
          await client.from(MEMBERS_TABLE_NAME).delete().eq('member_no', id);
        }
      } catch (err) {
        console.warn('Supabase delete member fallback:', err);
      }
    }

    return { success: true };
  },

  async registerNewMember(payload: RegistrationPayload): Promise<{ success: boolean; tempId: string; error?: string }> {
    if (!payload.namaLengkap.trim()) throw new Error('Nama lengkap wajib diisi.');
    if (!/^\d{16}$/.test(payload.nik)) throw new Error('NIK harus 16 digit angka.');
    if (!payload.whatsapp.trim()) throw new Error('Nomor WhatsApp aktif wajib diisi.');
    if (payload.jumlahTransfer < 860000) {
      throw new Error('Jumlah transfer minimal Rp 860.000 (Simpanan Pokok Rp 500.000 + Simpanan Wajib 3 Tahun Rp 360.000).');
    }

    const tempId = `REG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Also insert to member_registrations table in Supabase
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('member_registrations').insert([
          {
            id: tempId,
            submitted_at: new Date().toISOString(),
            full_name: payload.namaLengkap,
            nik: payload.nik,
            birth_place: payload.tempatLahir,
            birth_date: payload.tanggalLahir,
            gender: payload.jenisKelamin === 'Perempuan' ? 'P' : 'L',
            address: payload.alamat,
            city: payload.kota,
            province: payload.provinsi,
            whatsapp: payload.whatsapp,
            email: payload.email || '',
            member_status: payload.statusAnggota || 'Calon Anggota',
            profession: payload.profesi,
            savings_type: payload.jenisSimpanan,
            transfer_amount: payload.jumlahTransfer,
            transfer_date: payload.tanggalTransfer || new Date().toISOString().split('T')[0],
            transfer_proof_url: payload.fileBuktiData || '',
            ktp_url: payload.fileKTPData || '',
            selfie_url: payload.fotoAnggotaData || '',
            approval_status: 'PENDING',
            verification_status: 'Menunggu Verifikasi Admin',
          },
        ]);
      } catch (e) {
        console.warn('Supabase member registration insert fallback:', e);
      }
    }

    await this.saveMember(
      {
        nama: payload.namaLengkap,
        provinsi: payload.provinsi,
        kota: payload.kota,
        alamat: payload.alamat,
        pekerjaan: payload.profesi,
        tgl_lahir: payload.tanggalLahir,
        gender: payload.jenisKelamin === 'Perempuan' ? 'P' : 'L',
        plantation: 'PUSAT JAKARTA',
        simpanan_sukarela: Math.max(0, payload.jumlahTransfer - 860000),
      },
      {
        nik: payload.nik,
        birth_place: payload.tempatLahir,
      }
    );

    return { success: true, tempId };
  },

  /**
   * Update password anggota dan simpan langsung ke database public.members pada kolom legacy_password_hash
   */
  async updateMemberPassword(
    memberNoOrId: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const cleanPassword = (newPassword || '').trim();
    if (!cleanPassword || cleanPassword.length < 4) {
      throw new Error('Password baru minimal 4 karakter.');
    }

    const cleanId = (memberNoOrId || '').trim();
    if (!cleanId) {
      throw new Error('ID atau Nomor Anggota tidak valid.');
    }

    // 1. Update in Supabase public.members table (column: legacy_password_hash)
    const client = getSupabaseClient();
    let supabaseSuccess = false;

    if (client) {
      try {
        let targetId = cleanId;
        const { data: rowById } = await client
          .from(MEMBERS_TABLE_NAME)
          .select('id, member_no')
          .eq('id', cleanId)
          .maybeSingle();

        if (rowById) {
          targetId = rowById.id;
        } else {
          const { data: rowByNo } = await client
            .from(MEMBERS_TABLE_NAME)
            .select('id, member_no')
            .eq('member_no', cleanId)
            .maybeSingle();

          if (rowByNo) {
            targetId = rowByNo.id;
          }
        }

        const { error: err1 } = await client
          .from(MEMBERS_TABLE_NAME)
          .update({
            legacy_password_hash: cleanPassword,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetId);

        if (!err1) {
          supabaseSuccess = true;
        } else {
          const { error: err2 } = await client
            .from(MEMBERS_TABLE_NAME)
            .update({
              legacy_password_hash: cleanPassword,
              updated_at: new Date().toISOString(),
            })
            .eq('member_no', cleanId);

          if (!err2) {
            supabaseSuccess = true;
          }
        }
      } catch (dbErr) {
        console.warn('Supabase updateMemberPassword exception:', dbErr);
      }
    }

    // 2. Update local storage cache if exists
    try {
      const stored = this.getStoredMembers();
      const idx = stored.findIndex(
        (m) =>
          m.id.toLowerCase() === cleanId.toLowerCase() ||
          (m.member_no && m.member_no.toLowerCase() === cleanId.toLowerCase()) ||
          (m.username && m.username.toLowerCase() === cleanId.toLowerCase())
      );
      if (idx !== -1) {
        stored[idx] = {
          ...stored[idx],
          legacy_password_hash: cleanPassword,
        };
        localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(stored));
      }
    } catch (localErr) {
      console.warn('Local member cache update error:', localErr);
    }

    // Record audit log (mask password)
    await auditService.logActivity(
      'CHANGE_MEMBER_PASSWORD',
      'members',
      cleanId,
      { password_changed: true },
      { updated_at: new Date().toISOString() }
    );

    return {
      success: true,
      message: supabaseSuccess
        ? 'Password berhasil diperbarui dan disimpan ke Supabase (tabel members).'
        : 'Password anggota berhasil diperbarui.',
    };
  },

  /**
   * Update data pribadi anggota (Nama, Tempat/Tgl Lahir, Gender, Alamat, Kota, Provinsi, Profesi, Avatar)
   * Terhubung langsung dan diverifikasi tersimpan ke Supabase tabel public.members.
   */
  async updateMemberPersonalData(
    memberNoOrId: string,
    payload: {
      nama: string;
      gender: 'L' | 'P';
      tempat_lahir?: string;
      tgl_lahir: string;
      pekerjaan: string;
      alamat: string;
      kota: string;
      provinsi: string;
      avatar_url?: string;
    }
  ): Promise<{ success: boolean; data?: MemberRecord; message: string; source: 'SUPABASE' | 'LOCAL' }> {
    const cleanId = (memberNoOrId || '').trim();
    if (!cleanId) throw new Error('ID / Nomor Anggota tidak valid.');
    if (!payload.nama.trim()) throw new Error('Nama lengkap wajib diisi.');

    const client = getSupabaseClient();
    const nowStr = new Date().toISOString();
    let savedToSupabase = false;
    let dbReturnedRow: any = null;

    // 1. Update / Upsert ke database Supabase public.members
    if (client) {
      try {
        // Step A: Cari data baris anggota yang cocok di Supabase
        let targetRow: any = null;

        // Cari berdasarkan id
        const { data: rowById } = await client
          .from(MEMBERS_TABLE_NAME)
          .select('*')
          .eq('id', cleanId)
          .maybeSingle();

        if (rowById) {
          targetRow = rowById;
        } else {
          // Cari berdasarkan member_no
          const { data: rowByNo } = await client
            .from(MEMBERS_TABLE_NAME)
            .select('*')
            .eq('member_no', cleanId)
            .maybeSingle();

          if (rowByNo) {
            targetRow = rowByNo;
          } else {
            // Cari berdasarkan nama
            const { data: rowByName } = await client
              .from(MEMBERS_TABLE_NAME)
              .select('*')
              .ilike('full_name', payload.nama.trim())
              .limit(1);

            if (rowByName && rowByName.length > 0) {
              targetRow = rowByName[0];
            }
          }
        }

        if (targetRow) {
          // Baris ditemukan di Supabase -> update berdasarkan ID asli
          const updatePayload: Record<string, any> = {
            full_name: payload.nama.trim(),
            gender: payload.gender === 'P' ? 'P' : 'L',
            birth_place: payload.tempat_lahir || targetRow.birth_place || 'Jakarta',
            birth_date: payload.tgl_lahir || targetRow.birth_date || '1990-01-01',
            occupation: payload.pekerjaan || targetRow.occupation || 'Anggota Koperasi',
            address: payload.alamat || targetRow.address || '',
            city: payload.kota || targetRow.city || 'Jakarta Pusat',
            province: payload.provinsi || targetRow.province || 'DKI Jakarta',
            updated_at: nowStr,
          };

          if (payload.avatar_url !== undefined && payload.avatar_url !== null) {
            updatePayload.avatar_url = payload.avatar_url;
          }

          let updateRes = await client
            .from(MEMBERS_TABLE_NAME)
            .update(updatePayload)
            .eq('id', targetRow.id)
            .select();

          // Fallback 1: Jika tabel Supabase belum memiliki kolom avatar_url, retry update tanpa avatar_url
          if (updateRes.error && updatePayload.avatar_url) {
            console.warn('[memberService] Update with avatar_url failed, retrying without avatar_url:', updateRes.error.message);
            const safePayload = { ...updatePayload };
            delete safePayload.avatar_url;
            updateRes = await client
              .from(MEMBERS_TABLE_NAME)
              .update(safePayload)
              .eq('id', targetRow.id)
              .select();
          }

          // Fallback 2: Jika update by id gagal, coba update by member_no
          if (updateRes.error && targetRow.member_no) {
            updateRes = await client
              .from(MEMBERS_TABLE_NAME)
              .update(updatePayload)
              .eq('member_no', targetRow.member_no)
              .select();
          }

          if (!updateRes.error && updateRes.data && updateRes.data.length > 0) {
            savedToSupabase = true;
            dbReturnedRow = updateRes.data[0];
          } else if (updateRes.error) {
            console.warn('[memberService] Supabase updateMemberPersonalData error:', updateRes.error);
          }
        } else {
          // Anggota belum ada di Supabase -> Lakukan INSERT langsung agar tersimpan di Supabase
          const localStored = this.getStoredMembers().find(
            (m) =>
              m.id.toLowerCase() === cleanId.toLowerCase() ||
              (m.member_no && m.member_no.toLowerCase() === cleanId.toLowerCase()) ||
              (m.username && m.username.toLowerCase() === cleanId.toLowerCase())
          );

          const newRowPayload = mapMemberRecordToSupabaseRow({
            ...(localStored || {}),
            id: cleanId,
            nama: payload.nama.trim(),
            gender: payload.gender,
            tempat_lahir: payload.tempat_lahir,
            tgl_lahir: payload.tgl_lahir,
            pekerjaan: payload.pekerjaan,
            alamat: payload.alamat,
            kota: payload.kota,
            provinsi: payload.provinsi,
            avatar_url: payload.avatar_url || (localStored as any)?.avatar_url || '',
          });

          let insertRes = await client
            .from(MEMBERS_TABLE_NAME)
            .insert([newRowPayload])
            .select();

          if (insertRes.error && newRowPayload.avatar_url) {
            console.warn('[memberService] Insert with avatar_url failed, retrying standard schema:', insertRes.error.message);
            const safeRow = { ...newRowPayload };
            delete (safeRow as any).avatar_url;
            insertRes = await client
              .from(MEMBERS_TABLE_NAME)
              .insert([safeRow])
              .select();
          }

          if (!insertRes.error && insertRes.data && insertRes.data.length > 0) {
            savedToSupabase = true;
            dbReturnedRow = insertRes.data[0];
          } else if (insertRes.error) {
            console.warn('[memberService] Supabase insert error:', insertRes.error);
          }
        }
      } catch (dbErr) {
        console.warn('Supabase updateMemberPersonalData exception:', dbErr);
      }
    }

    // 2. Update local storage cache
    let updatedRecord: MemberRecord | null = null;
    try {
      const stored = this.getStoredMembers();
      const idx = stored.findIndex(
        (m) =>
          m.id.toLowerCase() === cleanId.toLowerCase() ||
          (m.member_no && m.member_no.toLowerCase() === cleanId.toLowerCase()) ||
          (m.username && m.username.toLowerCase() === cleanId.toLowerCase())
      );

      if (idx !== -1) {
        stored[idx] = {
          ...stored[idx],
          nama: payload.nama.trim(),
          gender: payload.gender,
          tempat_lahir: payload.tempat_lahir || stored[idx].tempat_lahir,
          tgl_lahir: payload.tgl_lahir,
          pekerjaan: payload.pekerjaan,
          alamat: payload.alamat,
          kota: payload.kota,
          provinsi: payload.provinsi,
          ...(payload.avatar_url !== undefined ? { avatar_url: payload.avatar_url } : {}),
        };
        updatedRecord = stored[idx];
        localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(stored));
      } else {
        const created: MemberRecord = {
          id: cleanId,
          tgl_reg: new Date().toISOString().split('T')[0],
          nama: payload.nama.trim(),
          gender: payload.gender,
          tempat_lahir: payload.tempat_lahir || 'Jakarta',
          tgl_lahir: payload.tgl_lahir,
          pekerjaan: payload.pekerjaan,
          alamat: payload.alamat,
          kota: payload.kota,
          provinsi: payload.provinsi,
          plantation: 'PUSAT JAKARTA',
          area_jenis: 'KOPERASI PUSAT',
          simpanan_pokok: 500000,
          simpanan_wajib: 360000,
          simpanan_sukarela: 0,
          avatar_url: payload.avatar_url || '',
          status: 'AKTIF',
        };
        stored.push(created);
        updatedRecord = created;
        localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(stored));
      }

      if (payload.avatar_url) {
        localStorage.setItem(`KOPSIM_AVATAR_${cleanId.toUpperCase()}`, payload.avatar_url);
      }
    } catch (localErr) {
      console.warn('Local member cache update error:', localErr);
    }

    if (dbReturnedRow) {
      const fromDb = mapSupabaseMemberRowToMemberRecord(dbReturnedRow);
      if (payload.avatar_url && !fromDb.avatar_url) {
        fromDb.avatar_url = payload.avatar_url;
      }
      updatedRecord = fromDb;
    }

    return {
      success: true,
      data: updatedRecord || undefined,
      source: savedToSupabase ? 'SUPABASE' : 'LOCAL',
      message: savedToSupabase
        ? 'Data pribadi berhasil disimpan dan disinkronisasi ke tabel Supabase public.members.'
        : 'Data pribadi berhasil diperbarui.',
    };
  },

  /**
   * Update pas foto avatar anggota dan simpan langsung ke Supabase public.members pada kolom avatar_url
   */
  async updateMemberAvatar(
    memberNoOrId: string,
    avatarDataUrl: string
  ): Promise<{ success: boolean; avatarUrl: string; message: string; source: 'SUPABASE' | 'LOCAL' }> {
    const cleanId = (memberNoOrId || '').trim();
    if (!cleanId) {
      throw new Error('ID atau Nomor Anggota tidak valid.');
    }

    let savedToSupabase = false;
    const client = getSupabaseClient();
    if (client) {
      try {
        let targetId = cleanId;
        const { data: rowById } = await client
          .from(MEMBERS_TABLE_NAME)
          .select('id, member_no')
          .eq('id', cleanId)
          .maybeSingle();

        if (rowById) {
          targetId = rowById.id;
        } else {
          const { data: rowByNo } = await client
            .from(MEMBERS_TABLE_NAME)
            .select('id, member_no')
            .eq('member_no', cleanId)
            .maybeSingle();
          if (rowByNo) {
            targetId = rowByNo.id;
          }
        }

        const { error } = await client
          .from(MEMBERS_TABLE_NAME)
          .update({
            avatar_url: avatarDataUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetId);

        if (!error) {
          savedToSupabase = true;
        } else {
          // Retry by member_no
          const altRes = await client
            .from(MEMBERS_TABLE_NAME)
            .update({
              avatar_url: avatarDataUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('member_no', cleanId);
          if (!altRes.error) savedToSupabase = true;
        }
      } catch (err) {
        console.warn('Supabase updateMemberAvatar warning:', err);
      }
    }

    // Update local cache
    try {
      const stored = this.getStoredMembers();
      const idx = stored.findIndex(
        (m) =>
          m.id.toLowerCase() === cleanId.toLowerCase() ||
          (m.member_no && m.member_no.toLowerCase() === cleanId.toLowerCase()) ||
          (m.username && m.username.toLowerCase() === cleanId.toLowerCase())
      );
      if (idx !== -1) {
        stored[idx] = {
          ...stored[idx],
          avatar_url: avatarDataUrl,
        };
        localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(stored));
      }
    } catch (localErr) {
      console.warn('Local member avatar cache error:', localErr);
    }

    // Also store standalone avatar storage key
    try {
      localStorage.setItem(`KOPSIM_AVATAR_${cleanId.toUpperCase()}`, avatarDataUrl);
    } catch (e) {
      // quota safeguard
    }

    return {
      success: true,
      avatarUrl: avatarDataUrl,
      source: savedToSupabase ? 'SUPABASE' : 'LOCAL',
      message: savedToSupabase
        ? 'Foto profil berhasil disimpan ke tabel Supabase public.members.'
        : 'Pas foto anggota berhasil diperbarui.',
    };
  },

  getMemberAvatar(memberNoOrId: string): string | null {
    const cleanId = (memberNoOrId || '').trim().toUpperCase();
    if (!cleanId) return null;

    try {
      const direct = localStorage.getItem(`KOPSIM_AVATAR_${cleanId}`);
      if (direct) return direct;

      const stored = this.getStoredMembers();
      const match = stored.find(
        (m) =>
          m.id.toUpperCase() === cleanId ||
          (m.member_no && m.member_no.toUpperCase() === cleanId) ||
          (m.username && m.username.toUpperCase() === cleanId)
      );
      return match?.avatar_url || null;
    } catch {
      return null;
    }
  },

  async pushSeedToSupabase(): Promise<{ success: boolean; count: number; error?: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, count: 0, error: 'Supabase client belum terhubung.' };
    }

    const localMembers = this.getStoredMembers();
    const dbRows = localMembers.map((m) => mapMemberRecordToSupabaseRow(m));

    try {
      const { error } = await client
        .from(MEMBERS_TABLE_NAME)
        .upsert(dbRows, { onConflict: 'id' });

      if (error) {
        return { success: false, count: 0, error: error.message };
      }

      return { success: true, count: localMembers.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message || String(err) };
    }
  },
};

