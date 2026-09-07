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

  // State Bukti Transfer Upload
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isProofUploaded, setIsProofUploaded] = useState(false);
  const [uploadedTrxId, setUploadedTrxId] = useState<string | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

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

  // Reset state saat modal ditutup / dibuka
  useEffect(() => {
    if (!isOpen) {
      setIsRegistered(false);
      setProofFile(null);
      setProofPreview(null);
      setIsProofUploaded(false);
      setUploadedTrxId(null);
      setUploadedFileUrl(null);
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

  // Upload bukti transfer ke bucket 'bukti_transfer' dan catat ke tabel 'transactions'
  const handleUploadProof = async () => {
    if (!proofFile) {
      showToast('Silakan pilih berkas bukti transfer terlebih dahulu.', 'error');
      return;
    }
    if (!registeredMemberId) {
      showToast('Nomor anggota belum terdaftar.', 'error');
      return;
    }

    setIsUploadingProof(true);
    try {
      // 1. Simpan berkas bukti transfer ke Supabase Storage bucket 'bukti_transfer'
      const uploadRes = await uploadPublicRegistrationProof(
        proofFile,
        registeredMemberId,
        proofFile.name
      );

      if (!uploadRes.success || !uploadRes.fileUrl) {
        showToast(uploadRes.error || 'Gagal mengunggah bukti transfer.', 'error');
        setIsUploadingProof(false);
        return;
      }

      // 2. Catat transaksi setoran awal ke tabel Supabase 'transactions' dengan kolom 'file_url'
      const nowStr = new Date().toISOString().split('T')[0];
      const trxRes = await transactionService.saveTransaction({
        tanggal: nowStr,
        referal: 'KOPERASI',
        plantation: plantation || 'PUSAT JAKARTA',
        jenis: 'MASUK',
        kategori: 'Simpanan Pokok & Wajib Anggota Baru',
        metode_bayar: 'Transfer Bank BSI',
        jumlah: totalSetoranAwal,
        filelink: uploadRes.fileUrl,
        akun: 'Bank BSI',
        keterangan: `Setoran awal pendaftaran anggota baru a.n. ${nama} (No. Registrasi: ${registeredMemberId})`,
        customer_id: registeredMemberId,
        login_as: nama || 'CALON ANGGOTA',
      });

      if (trxRes.success) {
        setIsProofUploaded(true);
        setUploadedTrxId(trxRes.id);
        setUploadedFileUrl(uploadRes.fileUrl);
        showToast(
          'Bukti transfer berhasil diunggah dan diverifikasi ke sistem transaksi KOPSIM!',
          'success',
          'Upload Berhasil'
        );
        if (onSuccess) onSuccess();
      } else {
        showToast(trxRes.error || 'Gagal mencatat transaksi setoran awal.', 'error');
      }
    } catch (err: any) {
      console.error('[PublicRegisterModal] Upload proof error:', err);
      showToast(err.message || 'Terjadi kesalahan saat mengunggah bukti transfer.', 'error');
    } finally {
      setIsUploadingProof(false);
    }
  };

  if (!isOpen) return null;

  const totalSetoranAwal = simpananPokok + simpananWajibAwal + (Number(simpananSukarelaAwal) || 0);

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
      const res = await memberService.saveMember(
        {
          nama,
          gender: 'L',
          alamat,
          kota: kota || 'Jakarta',
          provinsi,
          pekerjaan,
          plantation,
          area_jenis: plantation.toUpperCase().includes('PUSAT') ? 'KOPERASI PUSAT' : 'KOPERASI CABANG',
          simpanan_pokok: simpananPokok,
          simpanan_wajib: simpananWajibAwal,
          simpanan_sukarela: Number(simpananSukarelaAwal) || 0,
          nik: cleanNik,
        },
        {
          nik: cleanNik,
          phone: noHp,
          email,
          work_area: plantation,
        }
      );

      if (res.success && res.id) {
        setRegisteredMemberId(res.id);
        setIsRegistered(true);
        showToast(
          `Pendaftaran berhasil! Nomor Anggota Baru: ${res.id}`,
          'success',
          'Pendaftaran Diterima'
        );
        if (onSuccess) onSuccess();
      } else {
        showToast(res.error || 'Gagal memproses pendaftaran.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan sistem pendaftaran.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="public-register-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/65 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-xl w-full p-6 space-y-4 my-8 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <KopsimLogo size="md" badgeBackground={true} />
            <div>
              <h3 className="font-bold text-stone-900 font-serif text-sm">
                Pendaftaran Anggota Baru KOPSIM
              </h3>
              <p className="text-[11px] text-stone-500">
                Koperasi Syarikat Islam Mandiri — Form Registrasi Online
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Confirmation View */}
        {isRegistered ? (
          <div className="space-y-4 py-3 text-center overflow-y-auto flex-1 pr-1">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-emerald-950 font-serif">
                Alhamdulillah! Registrasi Berhasil
              </h4>
              <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                Formulir pendaftaran Anda telah tercatat di sistem KOPSIM Mandiri dengan Nomor Registrasi:
              </p>
              <div className="inline-block px-4 py-2 bg-stone-100 border border-stone-300 rounded-xl font-mono font-bold text-emerald-950 text-sm mt-2">
                {registeredMemberId}
              </div>
            </div>

            {/* Rekening Transfer Simpanan */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-left text-xs space-y-2">
              <span className="font-bold text-emerald-900 block">
                Instruksi Pembayaran Simpanan Awal:
              </span>
              <div className="flex justify-between font-mono font-bold text-stone-800 text-sm border-b border-emerald-200 pb-1.5">
                <span>Total Setoran Awal:</span>
                <span className="text-emerald-950">{formatRupiah(totalSetoranAwal)}</span>
              </div>
              <p className="text-[11px] text-stone-600">
                Silakan transfer setoran awal ke rekening resmi Koperasi Syarikat Islam Mandiri:
              </p>
              <div className="p-2.5 bg-white rounded-lg border border-emerald-300 font-mono text-xs">
                <span className="text-stone-500 block">Bank Syariah Indonesia (BSI)</span>
                <strong className="text-emerald-950 text-sm">No. Rek: 7200112233</strong>
                <span className="text-stone-500 block">a.n. Koperasi Syarikat Islam Mandiri</span>
              </div>
              <p className="text-[10px] text-stone-500 italic">
                * Tim verifikasi kepengurusan akan memvalidasi setoran dan mengaktifkan KTA Digital Anda dalam 1x24 jam.
              </p>
            </div>

            {/* Upload Bukti Transfer Section */}
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-left space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-stone-900 text-xs">
                      Unggah Bukti Transfer Setoran Awal
                    </h5>
                    <p className="text-[11px] text-stone-500">
                      Tersimpan di sistem KOPSIM & otomatis diverifikasi pengurus
                    </p>
                  </div>
                </div>
                {isProofUploaded && (
                  <Badge variant="success" size="sm">
                    <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                    Terunggah
                  </Badge>
                )}
              </div>

              {isProofUploaded ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Bukti transfer berhasil tersimpan ke sistem transaksi!</span>
                  </div>
                  <div className="text-[11px] text-stone-600 flex justify-between">
                    <span>No. Transaksi:</span>
                    <strong className="font-mono text-stone-800">{uploadedTrxId}</strong>
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
                        Lihat Berkas Bukti
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="border-2 border-dashed border-stone-300 hover:border-amber-500 transition-colors rounded-xl p-3 text-center bg-white">
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="upload-proof-input"
                      accept="image/png,image/jpeg,image/webp,image/jpg,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="upload-proof-input"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-1.5"
                    >
                      {proofPreview ? (
                        <div className="relative group max-w-[160px] max-h-[100px] overflow-hidden rounded-lg border border-stone-200 my-1">
                          <img
                            src={proofPreview}
                            alt="Preview Bukti Transfer"
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ) : (
                        <UploadCloud className="w-8 h-8 text-stone-400 group-hover:text-amber-600 transition-colors" />
                      )}
                      <div>
                        <span className="text-xs font-semibold text-amber-900 hover:underline">
                          {proofFile ? proofFile.name : 'Klik untuk memilih bukti transfer (JPG / PNG / PDF)'}
                        </span>
                        <p className="text-[10px] text-stone-400">
                          Maksimal ukuran berkas 10MB
                        </p>
                      </div>
                    </label>
                  </div>

                  {proofFile && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-stone-600 truncate max-w-[220px]">
                        {proofFile.name} ({(proofFile.size / 1024).toFixed(0)} KB)
                      </span>
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={handleUploadProof}
                        isLoading={isUploadingProof}
                        disabled={isUploadingProof}
                      >
                        <UploadCloud className="w-3.5 h-3.5 mr-1" />
                        Kirim Bukti Transfer
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-center gap-2">
              <Button variant={isProofUploaded ? 'gold' : 'outline'} size="md" onClick={onClose}>
                {isProofUploaded ? 'Selesai & Tutup' : 'Tutup (Unggah Nanti)'}
              </Button>
            </div>
          </div>
        ) : (
          /* Registration Form */
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs overflow-y-auto flex-1 pr-1">
            <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-stone-700 space-y-1">
              <span className="font-bold text-amber-900 block">Ketentuan Pokok Anggota:</span>
              <ul className="list-disc pl-4 text-[11px] space-y-0.5 text-stone-600">
                <li>Simpanan Pokok: Rp 500.000 (Dibayar 1 kali saat bergabung)</li>
                <li>Simpanan Wajib: Rp 360.000 (Paket 3 Tahun Pertama / Rp 120.000/tahun)</li>
                <li>Berhak atas KTA Digital, akses laporan SHU tahunan, dan hak partisipasi unit usaha</li>
              </ul>
            </div>

            {/* Biodata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Nama Lengkap (Sesuai KTP) *</label>
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
                <label className="block text-stone-700 font-semibold mb-1">Nomor NIK KTP (16 Digit) *</label>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Nomor WhatsApp / HP *</label>
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
                <label className="block text-stone-700 font-semibold mb-1">Profesi / Pekerjaan</label>
                <input
                  type="text"
                  value={pekerjaan}
                  onChange={(e) => setPekerjaan(e.target.value)}
                  placeholder="Wiraswasta / Petani / Karyawan"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden text-xs"
                />
              </div>
            </div>

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
              <label className="block text-stone-700 font-semibold mb-1">Alamat Domisili Lengkap</label>
              <textarea
                rows={2}
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Jl. ... No. ..., Kelurahan, Kecamatan"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden text-xs resize-none"
              />
            </div>

            {/* Simpanan Ringkasan */}
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-stone-800 uppercase block">
                Rincian Setoran Awal
              </span>
              <div className="grid grid-cols-3 gap-2 text-stone-700">
                <div className="p-2 bg-white rounded border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">Simpanan Pokok</span>
                  <span className="font-bold text-xs">{formatRupiah(simpananPokok)}</span>
                </div>
                <div className="p-2 bg-white rounded border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">Simpanan Wajib (3 Thn)</span>
                  <span className="font-bold text-xs">{formatRupiah(simpananWajibAwal)}</span>
                </div>
                <div className="p-2 bg-white rounded border border-stone-200">
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

              <div className="pt-2 flex items-center justify-between border-t border-stone-200">
                <span className="font-semibold text-emerald-950">Total Setoran Awal yang Disiapkan:</span>
                <span className="text-sm font-bold text-emerald-950 font-serif">
                  {formatRupiah(totalSetoranAwal)}
                </span>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 shrink-0">
              <Button variant="outline" size="sm" type="button" onClick={onClose}>
                Batal
              </Button>
              <Button variant="gold" size="sm" type="submit" isLoading={isSubmitting}>
                Kirim Formulir Pendaftaran
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
