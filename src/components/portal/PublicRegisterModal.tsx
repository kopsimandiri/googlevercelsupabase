import React, { useState, useEffect, useMemo, useRef } from 'react';
import { memberService } from '../../services/memberService';
import { transactionService } from '../../services/transactionService';
import { uploadPublicRegistrationProof } from '../../services/storageService';
import { INDONESIA_REGIONS } from '../../data/indonesiaRegions';
import { useNotification } from '../../context/NotificationContext';
import { formatRupiah, isValidNik, normalizeNik } from '../../utils/formatters';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { KopsimLogo } from '../common/KopsimLogo';
import {
  X,
  UserPlus,
  CheckCircle2,
  UploadCloud,
  FileCheck,
  ShieldCheck,
  Building,
  CreditCard,
  FileText,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface PublicRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PublicRegisterModal: React.FC<PublicRegisterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nama, setNama] = useState('');
  const [nik, setNik] = useState('');
  const [noHp, setNoHp] = useState('');
  const [email, setEmail] = useState('');
  const [alamat, setAlamat] = useState('');
  const [provinsi, setProvinsi] = useState('DKI Jakarta');
  const [kota, setKota] = useState('Jakarta Pusat');
  const [pekerjaan, setPekerjaan] = useState('Wiraswasta');
  const [plantation, setPlantation] = useState('Pusat Jakarta - Menteng');
  const [simpananPokok, setSimpananPokok] = useState(500000);
  const [simpananWajibAwal, setSimpananWajibAwal] = useState(360000);
  const [simpananSukarelaAwal, setSimpananSukarelaAwal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredMemberId, setRegisteredMemberId] = useState('');

  // Master Cabang / Wilayah dari Supabase tabel 'areas'
  const [areaOptions, setAreaOptions] = useState<string[]>([
    'Pusat Jakarta - Menteng',
    'Cabang Jawa Barat - Bandung',
    'Cabang Jawa Timur - Surabaya',
    'Cabang Jawa Tengah - Semarang',
    'Cabang Banten - Serang',
    'Cabang Sumatera Utara - Medan',
  ]);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);

  // Rekening Bank Resmi Tujuan Transfer dari tabel 'areas'
  const [bankAccounts, setBankAccounts] = useState<string[]>([
    'Bank BSI 7123456789 (a.n KOPSIM)',
    'Bank Mandiri 1230009876543',
  ]);
  const [selectedRekening, setSelectedRekening] = useState<string>('Bank BSI 7123456789 (a.n KOPSIM)');
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);

  // Kredensial Login yang diterbitkan untuk anggota baru
  const [issuedUsername, setIssuedUsername] = useState<string>('');
  const [issuedPassword, setIssuedPassword] = useState<string>('123456');

  // State Bukti Transfer Upload
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isProofUploaded, setIsProofUploaded] = useState(false);
  const [uploadedTrxId, setUploadedTrxId] = useState<string | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [copiedRekening, setCopiedRekening] = useState(false);

  // Ambil data cabang/wilayah dari Supabase tabel 'areas' (kolom area_name)
  useEffect(() => {
    let isMounted = true;
    const loadAreas = async () => {
      setIsLoadingAreas(true);
      try {
        const areas = await memberService.getAreasMaster();
        if (isMounted && Array.isArray(areas) && areas.length > 0) {
          const names = Array.from(
            new Set(
              areas
                .map((a: any) => (typeof a === 'string' ? a : a.area_name))
                .filter((n: any) => Boolean(n && String(n).trim().length > 0))
            )
          ) as string[];

          if (names.length > 0) {
            setAreaOptions(names);
            setPlantation((prev) => (names.includes(prev) ? prev : names[0]));
          }
        }
      } catch (err) {
        console.warn('[PublicRegisterModal] Gagal memuat master areas:', err);
      } finally {
        if (isMounted) setIsLoadingAreas(false);
      }
    };

    if (isOpen) {
      loadAreas();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Ambil nomor rekening bank resmi dari tabel 'areas' sesuai wilayah/cabang yang dipilih
  useEffect(() => {
    let isMounted = true;
    const fetchBanks = async () => {
      if (!plantation) return;
      setIsLoadingBanks(true);
      try {
        const banks = await memberService.getBankAccountsForArea(plantation);
        if (isMounted && Array.isArray(banks) && banks.length > 0) {
          setBankAccounts(banks);
          setSelectedRekening((prev) => (banks.includes(prev) ? prev : banks[0]));
        }
      } catch (err) {
        console.warn('[PublicRegisterModal] Gagal memuat rekening cabang:', err);
      } finally {
        if (isMounted) setIsLoadingBanks(false);
      }
    };

    if (isOpen) {
      fetchBanks();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, plantation]);

  // Reset state saat modal ditutup / dibuka
  useEffect(() => {
    if (!isOpen) {
      setIsRegistered(false);
      setProofFile(null);
      setProofPreview(null);
      setIsProofUploaded(false);
      setUploadedTrxId(null);
      setUploadedFileUrl(null);
      setCopiedRekening(false);
      setIssuedUsername('');
    }
  }, [isOpen]);

  // Daftar kota dinamis sesuai provinsi yang dipilih dari INDONESIA_REGIONS
  const availableCities = useMemo(() => {
    const found = INDONESIA_REGIONS.find(
      (p) => p.name.toLowerCase() === provinsi.toLowerCase()
    );
    return found ? found.cities : [];
  }, [provinsi]);

  const handleProvinsiChange = (newProv: string) => {
    setProvinsi(newProv);
    const found = INDONESIA_REGIONS.find(
      (p) => p.name.toLowerCase() === newProv.toLowerCase()
    );
    if (found && found.cities.length > 0) {
      setKota(found.cities[0]);
    } else {
      setKota('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Ukuran berkas maksimal 10MB', 'error');
      return;
    }

    setProofFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setProofPreview(null);
    }
  };

  const handleRemoveFile = () => {
    setProofFile(null);
    setProofPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopyRekening = () => {
    const match = selectedRekening.match(/\d{5,}/);
    const textToCopy = match ? match[0] : selectedRekening;
    navigator.clipboard.writeText(textToCopy);
    setCopiedRekening(true);
    showToast(`Nomor rekening (${textToCopy}) berhasil disalin!`, 'success');
    setTimeout(() => setCopiedRekening(false), 2500);
  };

  if (!isOpen) return null;

  const totalSetoranAwal = simpananPokok + simpananWajibAwal + (Number(simpananSukarelaAwal) || 0);

  // Submit Terpadu 1 Halaman: Simpan Anggota + Upload Bukti + Catat Transaksi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanNik = normalizeNik(nik);
    if (!nama.trim()) {
      showToast('Nama lengkap wajib diisi sesuai KTP.', 'error');
      return;
    }
    if (!isValidNik(cleanNik)) {
      showToast('Nomor NIK KTP wajib tepat 16 digit angka.', 'error');
      return;
    }
    if (!noHp || noHp.length < 9) {
      showToast('Nomor WhatsApp / HP tidak valid.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Generate username unik berbasis lower(namadepan) dan password default 123456
      const generatedUsername = await memberService.generateUniqueUsername(nama.trim());
      setIssuedUsername(generatedUsername);
      setIssuedPassword('123456');

      // 2. Simpan pendaftaran anggota baru ke Supabase
      const res = await memberService.saveMember(
        {
          nama: nama.trim(),
          gender: 'L',
          alamat: alamat.trim(),
          kota: kota || 'Jakarta',
          provinsi,
          pekerjaan: pekerjaan.trim() || 'Wiraswasta',
          plantation,
          area_jenis: plantation.toUpperCase().includes('PUSAT') ? 'KOPERASI PUSAT' : 'KOPERASI CABANG',
          simpanan_pokok: simpananPokok,
          simpanan_wajib: simpananWajibAwal,
          simpanan_sukarela: Number(simpananSukarelaAwal) || 0,
          nik: cleanNik,
        },
        {
          nik: cleanNik,
          phone: noHp.trim(),
          email: email.trim(),
          work_area: plantation,
          username: generatedUsername,
          legacy_password_hash: '123456',
          password: '123456',
        }
      );

      if (!res.success || !res.id) {
        showToast(res.error || 'Gagal memproses pendaftaran anggota.', 'error');
        setIsSubmitting(false);
        return;
      }

      const newMemberId = res.id;
      setRegisteredMemberId(newMemberId);

      // 3. Jika ada berkas bukti transfer yang dilampirkan, proses upload ke bucket bukti_transfer & catat transaksi
      let proofUploaded = false;
      let finalFileUrl: string | null = null;
      let finalTrxId: string | null = null;

      if (proofFile) {
        try {
          const uploadRes = await uploadPublicRegistrationProof(
            proofFile,
            newMemberId,
            proofFile.name
          );

          if (uploadRes.success && uploadRes.fileUrl) {
            finalFileUrl = uploadRes.fileUrl;
            setUploadedFileUrl(finalFileUrl);

            const nowStr = new Date().toISOString().split('T')[0];
            const trxRes = await transactionService.saveTransaction({
              tanggal: nowStr,
              referal: 'KOPERASI',
              plantation: plantation || 'PUSAT JAKARTA',
              jenis: 'MASUK',
              kategori: 'Simpanan Pokok & Wajib Anggota Baru',
              metode_bayar: selectedRekening || 'Bank BSI 7200112233',
              jumlah: totalSetoranAwal,
              harga_satuan: totalSetoranAwal, // price = amount
              qty: 1,
              filelink: finalFileUrl,
              akun: nama.trim(), // account_name_legacy sesuai nama lengkap anggota
              keterangan: `Setoran awal pendaftaran anggota baru a.n. ${nama.trim()} (No. Registrasi: ${newMemberId})`,
              customer_id: newMemberId,
              customer_name: nama.trim(),
              login_as: nama.trim() || 'CALON ANGGOTA',
            });

            if (trxRes.success) {
              proofUploaded = true;
              finalTrxId = trxRes.id || null;
              setUploadedTrxId(finalTrxId);
              setIsProofUploaded(true);
            }
          }
        } catch (uploadErr) {
          console.warn('[PublicRegisterModal] Upload bukti warning:', uploadErr);
        }
      }

      setIsRegistered(true);
      showToast(
        proofUploaded
          ? `Pendaftaran dan bukti transfer berhasil dikirim! No. Anggota: ${newMemberId}`
          : `Pendaftaran berhasil! No. Anggota: ${newMemberId}`,
        'success',
        'Registrasi Berhasil'
      );
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan sistem pendaftaran.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="public-register-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/65 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 my-6 max-h-[94vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <KopsimLogo size="md" badgeBackground={true} />
            <div>
              <h3 className="font-bold text-stone-900 font-serif text-sm sm:text-base">
                Formulir Pendaftaran Anggota Baru KOPSIM
              </h3>
              <p className="text-[11px] text-stone-500">
                Lengkapi biodata dan lampirkan bukti transfer setoran awal dalam 1 formulir terpadu
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

        {/* Success Confirmation View (Setelah Submit Berhasil) */}
        {isRegistered ? (
          <div className="space-y-4 py-3 text-center overflow-y-auto flex-1 pr-1">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-emerald-950 font-serif">
                Alhamdulillah! Pendaftaran Berhasil Dikirim
              </h4>
              <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                Formulir pendaftaran dan rincian keanggotaan Anda telah tercatat resmi di sistem KOPSIM Mandiri:
              </p>
              <div className="inline-block px-4 py-2 bg-emerald-50 border border-emerald-300 rounded-xl font-mono font-bold text-emerald-950 text-sm mt-2 shadow-xs">
                Nomor Registrasi: {registeredMemberId}
              </div>

              {/* Akun Login Portal Anggota */}
              {issuedUsername && (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-left space-y-1.5 max-w-lg mx-auto text-xs mt-3">
                  <span className="font-bold text-stone-800 block text-[11px] uppercase tracking-wide">
                    Akun Login Portal Anggota:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-stone-700">
                    <div className="p-2 bg-white rounded-lg border border-stone-200">
                      <span className="text-[10px] text-stone-500 block">Username:</span>
                      <strong className="font-mono text-emerald-900 text-xs">{issuedUsername}</strong>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-stone-200">
                      <span className="text-[10px] text-stone-500 block">Password Default:</span>
                      <strong className="font-mono text-emerald-900 text-xs">{issuedPassword}</strong>
                    </div>
                  </div>
                  <p className="text-[10px] text-stone-500">
                    Simpan data akun di atas untuk login ke Portal Anggota KOPSIM.
                  </p>
                </div>
              )}
            </div>

            {/* Status Bukti Transfer */}
            {isProofUploaded ? (
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl text-left space-y-2 max-w-lg mx-auto">
                <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Bukti transfer berhasil diverifikasi ke sistem transaksi!</span>
                </div>
                <div className="text-[11px] text-stone-600 flex justify-between">
                  <span>No. Transaksi Setoran:</span>
                  <strong className="font-mono text-stone-800">{uploadedTrxId || 'Tercatat'}</strong>
                </div>
                <div className="text-[11px] text-stone-600 flex justify-between">
                  <span>Total Setoran Awal:</span>
                  <strong className="font-bold text-emerald-900">{formatRupiah(totalSetoranAwal)}</strong>
                </div>
                {uploadedFileUrl && (
                  <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-stone-500">Lampiran bukti:</span>
                    <a
                      href={uploadedFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:text-emerald-900 font-medium underline inline-flex items-center gap-1"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      Buka Berkas Bukti
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-left space-y-1.5 max-w-lg mx-auto text-xs text-stone-700">
                <span className="font-bold text-amber-900 block flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Pendaftaran Disimpan Tanpa Bukti Transfer
                </span>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Anda dapat menyusulkan bukti transfer ke pengurus melalui WhatsApp Center KOPSIM dengan menyebutkan Nomor Registrasi: <strong>{registeredMemberId}</strong>.
                </p>
              </div>
            )}

            <div className="pt-3 flex justify-center">
              <Button variant="gold" size="md" onClick={onClose}>
                Selesai & Tutup
              </Button>
            </div>
          </div>
        ) : (
          /* UNIFIED 1-PAGE FORM (Biodata + Simpanan + Bukti Transfer) */
          <form onSubmit={handleSubmit} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
            {/* Seksi 1: Ketentuan Pokok */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-stone-700 space-y-1">
              <span className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                Ketentuan Keanggotaan KOPSIM Syariah:
              </span>
              <ul className="list-disc pl-5 text-[11px] space-y-0.5 text-stone-600">
                <li>Simpanan Pokok: <strong>Rp 500.000</strong> (Dibayar 1 kali saat bergabung).</li>
                <li>Simpanan Wajib: <strong>Rp 360.000</strong> (Paket 3 Tahun Pertama / Rp 120.000/tahun).</li>
                <li>Hak penuh atas KTA Digital, partisipasi komoditas riil, dan pembagian SHU tahunan.</li>
              </ul>
            </div>

            {/* Seksi 2: Identitas Diri */}
            <div className="space-y-2.5 pt-1">
              <span className="font-bold text-stone-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                1. Data Identitas Pribadi
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Nama Lengkap (Sesuai KTP) *
                  </label>
                  <input
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: H. Ahmad Subardjo"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden text-xs"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Nomor NIK KTP (16 Digit) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    value={nik}
                    onChange={(e) => setNik(e.target.value.replace(/\D/g, '').slice(0, 16))}
                    placeholder="16 digit NIK sesuai KTP"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Nomor WhatsApp / HP *
                  </label>
                  <input
                    type="tel"
                    required
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    placeholder="081234567890"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Email Aktif (Opsional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden text-xs"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Profesi / Pekerjaan
                  </label>
                  <input
                    type="text"
                    value={pekerjaan}
                    onChange={(e) => setPekerjaan(e.target.value)}
                    placeholder="Wiraswasta / Petani / Karyawan"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Seksi 3: Wilayah & Alamat */}
            <div className="space-y-2.5 pt-1">
              <span className="font-bold text-stone-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-amber-600" />
                2. Wilayah Domisili & Cabang Koperasi
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Provinsi *</label>
                  <select
                    value={provinsi}
                    onChange={(e) => handleProvinsiChange(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden text-xs"
                  >
                    {INDONESIA_REGIONS.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Kota / Kabupaten *</label>
                  <select
                    value={kota}
                    onChange={(e) => setKota(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden text-xs"
                  >
                    {availableCities.length > 0 ? (
                      availableCities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))
                    ) : (
                      <option value={kota || 'Lainnya'}>{kota || 'Pilih Kota'}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Cabang / Wilayah * {isLoadingAreas && <span className="text-[10px] text-stone-400 font-normal">(Memuat...)</span>}
                  </label>
                  <select
                    value={plantation}
                    onChange={(e) => setPlantation(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden text-xs font-medium text-stone-800"
                  >
                    {areaOptions.map((areaName) => (
                      <option key={areaName} value={areaName}>
                        {areaName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Alamat Lengkap Domisili</label>
                <textarea
                  rows={2}
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Jl. ... No. ..., Kelurahan, Kecamatan"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden text-xs resize-none"
                />
              </div>
            </div>

            {/* Seksi 4: Rincian Setoran Awal & Rekening Tujuan BSI */}
            <div className="space-y-2.5 pt-1">
              <span className="font-bold text-stone-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                3. Rincian Setoran Awal & Rekening Pembayaran
              </span>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-stone-700">
                  <div className="p-2 bg-white rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-500 block">Simpanan Pokok</span>
                    <span className="font-bold text-xs text-stone-900">{formatRupiah(simpananPokok)}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-500 block">Simpanan Wajib (3 Thn)</span>
                    <span className="font-bold text-xs text-stone-900">{formatRupiah(simpananWajibAwal)}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-500 block">Simpanan Sukarela</span>
                    <input
                      type="number"
                      min="0"
                      step="50000"
                      value={simpananSukarelaAwal}
                      onChange={(e) => setSimpananSukarelaAwal(Number(e.target.value))}
                      placeholder="Opsional (Rp)"
                      className="w-full bg-stone-50 border border-stone-300 rounded px-1.5 py-0.5 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <label className="text-[11px] text-stone-700 font-semibold flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                      Rekening Resmi Tujuan Transfer ({plantation}):
                      {isLoadingBanks && <span className="text-[10px] text-stone-400 font-normal">(Memuat...)</span>}
                    </label>
                    <div className="text-right">
                      <span className="text-[10px] text-stone-500 mr-1.5">Total Transfer:</span>
                      <strong className="text-emerald-950 font-serif text-sm">
                        {formatRupiah(totalSetoranAwal)}
                      </strong>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                      value={selectedRekening}
                      onChange={(e) => setSelectedRekening(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-lg focus:outline-hidden text-xs font-mono font-bold text-emerald-950 shadow-2xs"
                    >
                      {bankAccounts.map((acc) => (
                        <option key={acc} value={acc}>
                          {acc}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleCopyRekening}
                      className="px-3 py-2 text-xs font-medium bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs shrink-0"
                    >
                      {copiedRekening ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedRekening ? 'Tersalin!' : 'Salin Rekening'}
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-500">
                    * Nomor rekening resmi otomatis disesuaikan dari data cabang/wilayah yang Anda pilih.
                  </p>
                </div>
              </div>
            </div>

            {/* Seksi 5: Unggah Bukti Transfer (Langsung di Halaman yang Sama) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <UploadCloud className="w-3.5 h-3.5 text-amber-600" />
                  4. Unggah Bukti Transfer Setoran Awal
                </span>
                <span className="text-[10px] text-stone-400">JPG, PNG, PDF (Maks. 10MB)</span>
              </div>

              <div className="border-2 border-dashed border-stone-300 hover:border-amber-500 transition-colors rounded-xl p-3 bg-stone-50/50 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="unified-upload-proof-input"
                  accept="image/png,image/jpeg,image/webp,image/jpg,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {proofFile ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 bg-white rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-2.5 overflow-hidden text-left">
                      {proofPreview ? (
                        <div className="w-12 h-12 rounded border border-stone-200 overflow-hidden shrink-0">
                          <img src={proofPreview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="truncate">
                        <strong className="text-xs text-stone-900 block truncate">{proofFile.name}</strong>
                        <span className="text-[10px] text-stone-500">
                          {(proofFile.size / 1024).toFixed(0)} KB • Siap dikirim
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="success" size="sm">
                        <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                        Berkas Dipilih
                      </Badge>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-1 text-stone-400 hover:text-rose-600 rounded transition-colors"
                        title="Hapus berkas"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="unified-upload-proof-input"
                    className="cursor-pointer flex flex-col items-center justify-center py-2 space-y-1"
                  >
                    <UploadCloud className="w-7 h-7 text-stone-400 hover:text-amber-600 transition-colors" />
                    <span className="text-xs font-semibold text-amber-900 hover:underline">
                      Klik untuk memilih berkas bukti transfer
                    </span>
                    <p className="text-[10px] text-stone-400">
                      Foto struk ATM, bukti transfer m-banking BSI, atau slip setoran bank
                    </p>
                  </label>
                )}
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100 shrink-0">
              <span className="text-[11px] text-stone-500 italic hidden sm:inline">
                * Data Anda terlindungi & diverifikasi oleh pengurus KOPSIM
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
                  Batal
                </Button>
                <Button variant="gold" size="sm" type="submit" isLoading={isSubmitting}>
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  Kirim Pendaftaran & Bukti Transfer
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

