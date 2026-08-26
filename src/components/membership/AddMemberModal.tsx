import React, { useState, useEffect, useMemo } from 'react';
import { memberService } from '../../services/memberService';
import { MemberRecord } from '../../types/database';
import { INDONESIA_REGIONS } from '../../data/indonesiaRegions';
import { formatRupiah } from '../../utils/formatters';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { useNotification } from '../../context/NotificationContext';
import {
  UserPlus,
  X,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Building,
  Key,
  CreditCard,
  Printer,
  ShieldCheck,
  Sparkles,
  MapPin,
  Calendar,
  Database,
  Lock,
} from 'lucide-react';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newMember: MemberRecord) => void;
  onOpenKta?: (member: MemberRecord) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenKta,
}) => {
  const { showToast } = useNotification();

  // Loading and state
  const [isLoadingAreas, setIsLoadingAreas] = useState<boolean>(false);
  const [areasList, setAreasList] = useState<any[]>([]);
  const [isGeneratingNo, setIsGeneratingNo] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'FORM' | 'SUCCESS'>('FORM');
  const [createdMember, setCreatedMember] = useState<MemberRecord | null>(null);
  const [saveSource, setSaveSource] = useState<'SUPABASE' | 'LOCAL'>('LOCAL');

  // Form Fields - Section 1: Identitas & Area Kerja
  const [memberNo, setMemberNo] = useState<string>('');
  const [registeredAt, setRegisteredAt] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<string>('AKTIF');
  const [workAreaCode, setWorkAreaCode] = useState<string>('JKT-01');

  // Form Fields - Section 2: Data Pribadi
  const [nik, setNik] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [birthPlace, setBirthPlace] = useState<string>('Jakarta');
  const [birthDate, setBirthDate] = useState<string>('1990-01-01');
  const [occupation, setOccupation] = useState<string>('Wiraswasta');

  // Form Fields - Section 3: Alamat & Domisili
  const [province, setProvince] = useState<string>('DKI Jakarta');
  const [city, setCity] = useState<string>('Jakarta Pusat');
  const [customCity, setCustomCity] = useState<string>('');
  const [isCustomCity, setIsCustomCity] = useState<boolean>(false);
  const [address, setAddress] = useState<string>('');

  // Form Fields - Section 4: Akun & Keamanan
  const [username, setUsername] = useState<string>('');
  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);
  const [usernameStatus, setUsernameStatus] = useState<{
    checked: boolean;
    available: boolean;
    message?: string;
  }>({ checked: false, available: true });
  const [password, setPassword] = useState<string>('kopsim123');
  const [confirmPassword, setConfirmPassword] = useState<string>('kopsim123');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Form Fields - Section 5: Simpanan Awal
  const [simpananPokok, setSimpananPokok] = useState<number>(500000);
  const [simpananWajib, setSimpananWajib] = useState<number>(360000);
  const [simpananSukarela, setSimpananSukarela] = useState<number>(0);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch areas on open
  useEffect(() => {
    if (isOpen) {
      loadMasterAreas();
      handleGenerateMemberNo();
      setActiveTab('FORM');
      setCreatedMember(null);
      setErrors({});
    }
  }, [isOpen]);

  // Cities for selected province
  const availableCities = useMemo(() => {
    const p = INDONESIA_REGIONS.find((r) => r.name === province);
    return p ? p.cities : ['Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Barat', 'Jakarta Timur', 'Jakarta Utara'];
  }, [province]);

  const loadMasterAreas = async () => {
    setIsLoadingAreas(true);
    try {
      const areas = await memberService.getAreasMaster();
      setAreasList(areas);
      if (areas.length > 0 && !workAreaCode) {
        setWorkAreaCode(areas[0].area_code);
      }
    } catch (err) {
      console.warn('Failed to load master areas:', err);
    } finally {
      setIsLoadingAreas(false);
    }
  };

  const handleGenerateMemberNo = async () => {
    setIsGeneratingNo(true);
    try {
      const newNo = await memberService.generateNextMemberNo();
      setMemberNo(newNo);
    } catch (err) {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yy = String(now.getFullYear()).slice(-2);
      setMemberNo(`${mm}${yy}-03001`);
    } finally {
      setIsGeneratingNo(false);
    }
  };

  // Auto suggest username from full name
  const handleSuggestUsername = (name: string) => {
    const clean = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (clean) {
      setUsername(clean);
      verifyUsernameUniqueness(clean);
    }
  };

  // Username validator & uniqueness check
  const verifyUsernameUniqueness = async (userVal: string) => {
    const clean = userVal.trim().toLowerCase();
    if (!clean) {
      setUsernameStatus({ checked: false, available: false, message: 'Username wajib diisi' });
      return;
    }

    setIsCheckingUsername(true);
    try {
      const res = await memberService.checkUsernameAvailable(clean);
      setUsernameStatus({
        checked: true,
        available: res.available,
        message: res.message || (res.available ? 'Username tersedia' : 'Username sudah digunakan'),
      });
    } catch {
      setUsernameStatus({ checked: true, available: true, message: 'Username valid' });
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    setConfirmPassword(res);
    showToast('Password acak berhasil dibuat.', 'info');
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!memberNo.trim()) {
      errs.memberNo = 'Nomor Anggota (NRA) wajib diisi / digenerate.';
    }

    if (!fullName.trim()) {
      errs.fullName = 'Nama lengkap sesuai KTP wajib diisi.';
    }

    if (!nik.trim()) {
      errs.nik = 'NIK wajib diisi.';
    } else if (!/^\d{16}$/.test(nik.trim())) {
      errs.nik = 'NIK harus berupa 16 digit angka.';
    }

    if (!workAreaCode.trim()) {
      errs.workAreaCode = 'Area Kerja wajib dipilih dari master data.';
    }

    if (!username.trim()) {
      errs.username = 'Username akun wajib diisi.';
    } else if (/\s/.test(username)) {
      errs.username = 'Username tidak boleh mengandung spasi.';
    } else if (/[^a-z0-9_.]/.test(username)) {
      errs.username = 'Gunakan hanya huruf kecil, angka, garis bawah (_), atau titik (.)';
    }

    if (!password) {
      errs.password = 'Password wajib diisi.';
    } else if (password.length < 4) {
      errs.password = 'Password minimal 4 karakter.';
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = 'Konfirmasi password tidak cocok dengan password.';
    }

    const effectiveCity = isCustomCity ? customCity.trim() : city.trim();
    if (!effectiveCity) {
      errs.city = 'Kota / Kabupaten wajib diisi.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Mohon periksa kembali kolom isian yang belum sesuai.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const effectiveCity = isCustomCity ? customCity.trim() : city.trim();

      const payload = {
        member_no: memberNo.trim(),
        registered_at: registeredAt,
        full_name: fullName.trim(),
        gender,
        nik: nik.trim(),
        birth_place: birthPlace.trim() || effectiveCity,
        birth_date: birthDate,
        occupation: occupation.trim() || 'Anggota Koperasi',
        province: province.trim(),
        city: effectiveCity,
        address: address.trim(),
        work_area: workAreaCode.trim(), // Storing area_code from public.areas
        username: username.trim().toLowerCase(),
        password: password.trim(),
        status,
        simpanan_pokok: simpananPokok,
        simpanan_wajib: simpananWajib,
        simpanan_sukarela: simpananSukarela,
      };

      const result = await memberService.addNewMemberAdmin(payload);

      if (result.success && result.data) {
        setCreatedMember(result.data);
        setSaveSource(result.source);
        setActiveTab('SUCCESS');
        onSuccess(result.data);
        showToast(
          result.source === 'SUPABASE'
            ? `Anggota baru ${result.data.nama} (${result.data.id}) berhasil didaftarkan ke Supabase!`
            : `Anggota baru ${result.data.nama} (${result.data.id}) berhasil disimpan ke sistem lokal.`,
          'success'
        );
      } else {
        showToast(result.error || 'Gagal menambahkan anggota.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Terjadi kesalahan sistem saat menyimpan anggota.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNext = () => {
    setFullName('');
    setNik('');
    setAddress('');
    setUsername('');
    setUsernameStatus({ checked: false, available: true });
    setPassword('kopsim123');
    setConfirmPassword('kopsim123');
    setSimpananSukarela(0);
    setErrors({});
    handleGenerateMemberNo();
    setActiveTab('FORM');
    setCreatedMember(null);
  };

  const totalSimpananAwal = simpananPokok + simpananWajib + (simpananSukarela || 0);

  const selectedAreaObj = areasList.find((a) => a.area_code === workAreaCode);

  if (!isOpen) return null;

  return (
    <div
      id="add-member-modal-root"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full p-5 sm:p-7 space-y-4 my-6 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-stone-900 font-serif text-base sm:text-lg">
                  {activeTab === 'SUCCESS' ? 'Konfirmasi Pendaftaran Anggota' : 'Tambah Anggota Baru'}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <Database className="w-3 h-3 text-emerald-600" />
                  public.members
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {activeTab === 'SUCCESS'
                  ? 'Data anggota telah tersimpan di Buku Induk Register KOPSIM Mandiri'
                  : 'Formulir resmi registrasi anggota & integrasi area kerja Supabase'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {activeTab === 'SUCCESS' && createdMember ? (
          /* ======================================================== */
          /* SUCCESS VIEW & CONFIRMATION SCREEN                       */
          /* ======================================================== */
          <div className="overflow-y-auto space-y-5 pr-1 text-xs py-2">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-full bg-emerald-600 text-white">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold font-serif text-emerald-950">
                    Anggota Berhasil Terdaftar!
                  </h4>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    Tersimpan di: {saveSource === 'SUPABASE' ? 'PostgreSQL Supabase (public.members) & Cache Lokal' : 'Local Storage Cache'}
                  </span>
                </div>
              </div>
            </div>

            {/* Member Details Card */}
            <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-stone-50/70 space-y-3.5">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">
                    NOMOR REGISTER ANGGOTA (NRA)
                  </span>
                  <div className="text-base sm:text-lg font-bold font-mono text-emerald-950">
                    {createdMember.id}
                  </div>
                </div>
                <Badge variant={createdMember.area_jenis === 'KOPERASI PUSAT' ? 'gold' : 'teal'} size="sm">
                  {createdMember.plantation}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-stone-500 text-[11px] block">Nama Lengkap:</span>
                  <span className="font-bold text-stone-900 text-sm">{createdMember.nama}</span>
                  <span className="text-[10px] text-stone-500 block">
                    {createdMember.gender === 'P' ? 'Perempuan (Muslimah)' : 'Laki-laki (Muslim)'}
                  </span>
                </div>

                <div>
                  <span className="text-stone-500 text-[11px] block">NIK (KTP):</span>
                  <span className="font-mono font-bold text-stone-900">{createdMember.nik || '-'}</span>
                </div>

                <div>
                  <span className="text-stone-500 text-[11px] block">Domisili:</span>
                  <span className="font-medium text-stone-800">
                    {createdMember.kota}, {createdMember.provinsi}
                  </span>
                </div>

                <div>
                  <span className="text-stone-500 text-[11px] block">Username Login:</span>
                  <span className="font-mono font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded text-[11px]">
                    @{createdMember.username || createdMember.id}
                  </span>
                </div>
              </div>

              {/* Simpanan Summary */}
              <div className="pt-2 border-t border-stone-200 grid grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-white border border-stone-200">
                  <span className="text-stone-500 text-[10px] block">Simpanan Pokok:</span>
                  <span className="font-mono font-bold text-emerald-950">
                    {formatRupiah(createdMember.simpanan_pokok || 500000)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-stone-200">
                  <span className="text-stone-500 text-[10px] block">Simpanan Wajib:</span>
                  <span className="font-mono font-bold text-emerald-950">
                    {formatRupiah(createdMember.simpanan_wajib || 360000)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-stone-200">
                  <span className="text-stone-500 text-[10px] block">Simpanan Manasuka:</span>
                  <span className="font-mono font-bold text-amber-900">
                    {formatRupiah(createdMember.simpanan_sukarela || 0)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Password akun telah diamankan dalam format hash aman. Password tidak ditampilkan dalam plaintext.
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
              {onOpenKta && (
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenKta(createdMember);
                  }}
                  leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                >
                  Cetak KTA Digital
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleResetForNext}
                leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              >
                Tambah Anggota Lain
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={onClose}
              >
                Selesai & Tutup
              </Button>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* FORM VIEW (TAMBAH ANGGOTA LENGKAP)                       */
          /* ======================================================== */
          <form onSubmit={handleSubmit} className="overflow-y-auto space-y-4 pr-1 text-xs">
            {/* SECTION 1: Identitas & Area Kerja */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-stone-900 flex items-center gap-1.5 text-xs">
                  <Building className="w-4 h-4 text-emerald-700" />
                  1. Identitas Register & Area Kerja
                </h4>
                <span className="text-[10px] text-stone-500 font-mono">* Wajib diisi</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nomor Anggota Auto Generate */}
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Nomor Register Anggota (NRA) *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      required
                      value={memberNo}
                      onChange={(e) => setMemberNo(e.target.value)}
                      placeholder="MMYY-03001"
                      className={`w-full px-3 py-1.5 font-mono font-bold text-emerald-950 bg-white border rounded-lg focus:outline-hidden ${
                        errors.memberNo ? 'border-rose-500 ring-1 ring-rose-500' : 'border-stone-300 focus:ring-1 focus:ring-emerald-700'
                      }`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateMemberNo}
                      isLoading={isGeneratingNo}
                      title="Generate Nomor Anggota Baru"
                      className="shrink-0 px-2 py-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
                    </Button>
                  </div>
                  {errors.memberNo && <p className="text-[10px] text-rose-600 mt-0.5">{errors.memberNo}</p>}
                </div>

                {/* Tanggal Registrasi */}
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Tanggal Registrasi *
                  </label>
                  <input
                    type="date"
                    required
                    value={registeredAt}
                    onChange={(e) => setRegisteredAt(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-700 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Master Area Kerja (public.areas) */}
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Area Kerja (Master <code className="text-emerald-800 font-mono text-[10px]">public.areas</code>) *
                  </label>
                  <select
                    value={workAreaCode}
                    onChange={(e) => setWorkAreaCode(e.target.value)}
                    className={`w-full px-3 py-1.5 bg-white border rounded-lg focus:outline-hidden ${
                      errors.workAreaCode ? 'border-rose-500' : 'border-stone-300 focus:ring-1 focus:ring-emerald-700'
                    }`}
                  >
                    {areasList.map((a) => (
                      <option key={a.area_code || a.id} value={a.area_code}>
                        [{a.area_code}] {a.area_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-stone-500 mt-0.5">
                    Disimpan sebagai kode area: <strong className="font-mono text-emerald-800">{workAreaCode}</strong>
                  </p>
                </div>

                {/* Status Keanggotaan */}
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Status Keanggotaan
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-hidden"
                  >
                    <option value="AKTIF">AKTIF (Anggota Penuh)</option>
                    <option value="CALON">CALON (Menunggu Konfirmasi)</option>
                    <option value="NONAKTIF">NONAKTIF</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: Data Pribadi & Kependudukan */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
              <h4 className="font-bold text-stone-900 flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                2. Data Pribadi Sesuai KTP
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* NIK */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-stone-700 font-semibold">Nomor KTP / NIK (16 Digit) *</label>
                    <span className={`text-[10px] font-mono ${nik.length === 16 ? 'text-emerald-700 font-bold' : 'text-stone-400'}`}>
                      {nik.length}/16 Digit
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    value={nik}
                    onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 3171012304850001"
                    className={`w-full px-3 py-1.5 font-mono bg-white border rounded-lg focus:outline-hidden ${
                      errors.nik ? 'border-rose-500 ring-1 ring-rose-500' : 'border-stone-300 focus:ring-1 focus:ring-emerald-700'
                    }`}
                  />
                  {errors.nik && <p className="text-[10px] text-rose-600 mt-0.5">{errors.nik}</p>}
                </div>

                {/* Nama Lengkap */}
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Nama Lengkap Sesuai KTP *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (!username || username === fullName.toLowerCase().replace(/[^a-z0-9]/g, '_')) {
                        handleSuggestUsername(e.target.value);
                      }
                    }}
                    placeholder="Contoh: H. Ahmad Dahlan, S.E."
                    className={`w-full px-3 py-1.5 bg-white border rounded-lg focus:outline-hidden ${
                      errors.fullName ? 'border-rose-500 ring-1 ring-rose-500' : 'border-stone-300 focus:ring-1 focus:ring-emerald-700'
                    }`}
                  />
                  {errors.fullName && <p className="text-[10px] text-rose-600 mt-0.5">{errors.fullName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Jenis Kelamin */}
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Jenis Kelamin *</label>
                  <select
                    value={gender}
                    onChange={(e: any) => setGender(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-hidden"
                  >
                    <option value="L">Laki-laki (Muslim)</option>
                    <option value="P">Perempuan (Muslimah)</option>
                  </select>
                </div>

                {/* Tempat Lahir */}
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    placeholder="Jakarta / Bandung / Solo"
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-hidden"
                  />
                </div>

                {/* Tanggal Lahir */}
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Pekerjaan / Profesi</label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="Wiraswasta / PNS / Petani / Dokter / Karyawan"
                  className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-hidden"
                />
              </div>
            </div>

            {/* SECTION 3: Alamat & Domisili (Dependent Cascading Dropdowns) */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
              <h4 className="font-bold text-stone-900 flex items-center gap-1.5 text-xs">
                <MapPin className="w-4 h-4 text-emerald-700" />
                3. Alamat & Wilayah Domisili (Cascading)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Provinsi */}
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Provinsi *</label>
                  <select
                    value={province}
                    onChange={(e) => {
                      const newProv = e.target.value;
                      setProvince(newProv);
                      const p = INDONESIA_REGIONS.find((r) => r.name === newProv);
                      if (p && p.cities.length > 0) {
                        setCity(p.cities[0]);
                        setIsCustomCity(false);
                      }
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-hidden"
                  >
                    {INDONESIA_REGIONS.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kota / Kabupaten */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-stone-700 font-semibold">Kota / Kabupaten *</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomCity(!isCustomCity)}
                      className="text-[10px] text-emerald-700 hover:underline font-medium"
                    >
                      {isCustomCity ? 'Pilih dari Daftar' : 'Input Manual'}
                    </button>
                  </div>

                  {isCustomCity ? (
                    <input
                      type="text"
                      value={customCity}
                      onChange={(e) => setCustomCity(e.target.value)}
                      placeholder="Ketik nama kota/kabupaten..."
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-hidden"
                    />
                  ) : (
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-hidden"
                    >
                      {availableCities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Alamat Lengkap Domisili</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Nama Jalan No. XX, RT/RW, Kelurahan, Kecamatan"
                  className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-hidden resize-none"
                />
              </div>
            </div>

            {/* SECTION 4: Akun & Keamanan (Username & Password) */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
              <h4 className="font-bold text-stone-900 flex items-center gap-1.5 text-xs">
                <Key className="w-4 h-4 text-emerald-700" />
                4. Akun Pengguna & Autentikasi
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Username */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-stone-700 font-semibold">Username Login *</label>
                    {isCheckingUsername && (
                      <span className="text-[10px] text-stone-400 flex items-center gap-1">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Cek ketersediaan...
                      </span>
                    )}
                    {!isCheckingUsername && usernameStatus.checked && (
                      <span
                        className={`text-[10px] font-bold ${
                          usernameStatus.available ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {usernameStatus.available ? '✓ Tersedia' : '✗ Sudah Dipakai'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
                        setUsername(val);
                        verifyUsernameUniqueness(val);
                      }}
                      placeholder="contoh: ahmad.dahlan"
                      className={`w-full px-3 py-1.5 font-mono text-xs bg-white border rounded-lg focus:outline-hidden ${
                        errors.username || (usernameStatus.checked && !usernameStatus.available)
                          ? 'border-rose-500 ring-1 ring-rose-500'
                          : 'border-stone-300 focus:ring-1 focus:ring-emerald-700'
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-stone-500 mt-0.5">
                    Hanya huruf kecil, angka, titik, atau garis bawah.
                  </p>
                  {errors.username && <p className="text-[10px] text-rose-600 mt-0.5">{errors.username}</p>}
                </div>

                {/* Password & Generator */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-stone-700 font-semibold">Password Awal *</label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[10px] text-amber-700 hover:text-amber-800 font-bold flex items-center gap-0.5"
                    >
                      <Sparkles className="w-3 h-3" /> Acak Password
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 4 karakter"
                      className={`w-full pl-3 pr-9 py-1.5 font-mono text-xs bg-white border rounded-lg focus:outline-hidden ${
                        errors.password ? 'border-rose-500 ring-1 ring-rose-500' : 'border-stone-300 focus:ring-1 focus:ring-emerald-700'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-[10px] text-rose-600 mt-0.5">{errors.password}</p>}
                </div>
              </div>

              {/* Konfirmasi Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Konfirmasi Password *</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-3 py-1.5 font-mono text-xs bg-white border rounded-lg focus:outline-hidden ${
                      errors.confirmPassword ? 'border-rose-500 ring-1 ring-rose-500' : 'border-stone-300 focus:ring-1 focus:ring-emerald-700'
                    }`}
                  />
                  {errors.confirmPassword && (
                    <p className="text-[10px] text-rose-600 mt-0.5">{errors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex items-center text-[10px] text-stone-500 italic p-2 bg-stone-100 rounded-lg">
                  <Lock className="w-3.5 h-3.5 text-stone-400 mr-1.5 shrink-0" />
                  Password akan disimpan secara terenkripsi/hash dan tidak akan tampil dalam plaintext setelah data tersimpan.
                </div>
              </div>
            </div>

            {/* SECTION 5: Komitmen Simpanan Awal */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/90 to-emerald-900 text-white space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                  <CreditCard className="w-4 h-4" />
                  5. Komitmen Simpanan Awal Anggota
                </h4>
                <span className="text-[10px] text-emerald-300">Standar AD/ART KOPSIM</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-stone-800">
                <div className="p-2.5 rounded-lg bg-white/95 border border-emerald-800">
                  <label className="block text-[10px] text-stone-600 font-semibold mb-0.5">
                    Simpanan Pokok (Wajib 1x)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    value={simpananPokok}
                    onChange={(e) => setSimpananPokok(Number(e.target.value))}
                    className="w-full px-2.5 py-1 text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded focus:outline-hidden"
                  />
                  <span className="text-[9px] text-stone-500 block mt-0.5">Rp 500.000 (Standar)</span>
                </div>

                <div className="p-2.5 rounded-lg bg-white/95 border border-emerald-800">
                  <label className="block text-[10px] text-stone-600 font-semibold mb-0.5">
                    Simpanan Wajib (3 Tahun)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={simpananWajib}
                    onChange={(e) => setSimpananWajib(Number(e.target.value))}
                    className="w-full px-2.5 py-1 text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded focus:outline-hidden"
                  />
                  <span className="text-[9px] text-stone-500 block mt-0.5">Rp 360.000 / 3 tahun</span>
                </div>

                <div className="p-2.5 rounded-lg bg-white/95 border border-emerald-800">
                  <label className="block text-[10px] text-stone-600 font-semibold mb-0.5">
                    Simpanan Manasuka (Sukarela)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100000"
                    value={simpananSukarela}
                    onChange={(e) => setSimpananSukarela(Number(e.target.value))}
                    className="w-full px-2.5 py-1 text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded focus:outline-hidden text-amber-900"
                  />
                  <span className="text-[9px] text-stone-500 block mt-0.5">Fleksibel / opsional</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-emerald-800/80 text-xs">
                <span className="text-emerald-200">Total Akumulasi Setoran Awal:</span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {formatRupiah(totalSimpananAwal)}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 shrink-0">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={onClose}
              >
                Batal
              </Button>

              <Button
                variant="gold"
                size="sm"
                type="submit"
                isLoading={isSubmitting}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                Simpan Anggota ke Supabase
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
