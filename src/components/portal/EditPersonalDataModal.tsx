import React, { useState, useRef } from 'react';
import { MemberRecord } from '../../types/database';
import { memberService } from '../../services/memberService';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../common/Button';
import {
  X,
  User,
  Camera,
  Upload,
  Save,
  Trash2,
  Lock,
  CheckCircle2,
  AlertCircle,
  Building,
  MapPin,
  Briefcase,
  Calendar,
} from 'lucide-react';

export interface EditPersonalDataModalProps {
  member?: MemberRecord | null;
  memberData?: MemberRecord | null;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: (updated: MemberRecord) => void;
}

export const EditPersonalDataModal: React.FC<EditPersonalDataModalProps> = ({
  member,
  memberData,
  isOpen = true,
  onClose,
  onSuccess,
}) => {
  const activeMember = memberData || member || {
    id: '0824-03001',
    nama: 'Anggota Koperasi',
    gender: 'L',
    provinsi: 'DKI Jakarta',
    kota: 'Jakarta Pusat',
    alamat: 'Jl. Pegangsaan Barat No. 14, Menteng',
    pekerjaan: 'Anggota Koperasi',
    plantation: 'PUSAT JAKARTA',
    tgl_reg: '2024-08-10',
    tgl_lahir: '1990-01-01',
  } as MemberRecord;

  const { showToast } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    nama: activeMember.nama || '',
    gender: (activeMember.gender === 'P' ? 'P' : 'L') as 'L' | 'P',
    tempat_lahir: activeMember.tempat_lahir || activeMember.kota || 'Jakarta',
    tgl_lahir: activeMember.tgl_lahir || '1990-01-01',
    pekerjaan: activeMember.pekerjaan || 'Anggota Koperasi',
    alamat: activeMember.alamat || '',
    kota: activeMember.kota || 'Jakarta Pusat',
    provinsi: activeMember.provinsi || 'DKI Jakarta',
  });

  const [avatarPreview, setAvatarPreview] = useState<string>(
    activeMember.avatar_url || memberService.getMemberAvatar(activeMember.id) || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle Photo File Upload & Compression
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih file gambar (JPG, PNG, atau WEBP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Downscale image to max 400x500 for compact avatar storage
        const canvas = document.createElement('canvas');
        const maxDim = 450;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarPreview(compressedDataUrl);
          showToast('Foto baru berhasil dimuat. Klik Simpan untuk memperbarui.', 'info');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      setErrorMsg('Nama lengkap wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const targetIdentifier = activeMember.id || (activeMember as any).member_no || (activeMember as any).username || '';
      const res = await memberService.updateMemberPersonalData(targetIdentifier, {
        nama: formData.nama,
        gender: formData.gender,
        tempat_lahir: formData.tempat_lahir,
        tgl_lahir: formData.tgl_lahir,
        pekerjaan: formData.pekerjaan,
        alamat: formData.alamat,
        kota: formData.kota,
        provinsi: formData.provinsi,
        avatar_url: avatarPreview,
      });

      const updatedRecord: MemberRecord = {
        ...activeMember,
        nama: formData.nama.trim(),
        gender: formData.gender,
        tempat_lahir: formData.tempat_lahir,
        tgl_lahir: formData.tgl_lahir,
        pekerjaan: formData.pekerjaan,
        alamat: formData.alamat,
        kota: formData.kota,
        provinsi: formData.provinsi,
        avatar_url: avatarPreview,
      };

      showToast(
        res.message || 'Data pribadi dan foto berhasil disimpan ke database.',
        'success',
        res.source === 'SUPABASE' ? 'Supabase Tersinkronisasi' : 'Pembaruan Berhasil'
      );
      onSuccess(res.data || updatedRecord);
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan perubahan data pribadi.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="modal-edit-personal-data"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden my-6">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-white p-5 flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-800/80 text-amber-300 border border-emerald-700">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif text-white">
                Edit & Perbarui Data Pribadi
              </h3>
              <p className="text-xs text-emerald-200">
                Pembaruan profil mandiri dan foto anggota (Tersimpan di tabel <code className="text-amber-300 font-mono">public.members</code>)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-300 hover:text-white p-1.5 rounded-lg hover:bg-emerald-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section: Foto Pribadi Anggota */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-3">
              Foto Pribadi / Pas Foto Anggota
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Photo Display Frame */}
              <div className="relative group shrink-0">
                <div className="w-24 h-32 rounded-xl border-2 border-dashed border-stone-300 bg-white overflow-hidden flex items-center justify-center shadow-inner">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Foto Profil"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarPreview('')}
                    />
                  ) : (
                    <div className="text-center p-2 text-stone-400">
                      <User className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      <span className="text-[10px] block">Belum ada foto</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload & Replace Controls */}
              <div className="space-y-2 flex-1 text-center sm:text-left">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="avatar-file-upload-input"
                />

                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={<Camera className="w-3.5 h-3.5" />}
                  >
                    {avatarPreview ? 'Ganti / Replace Foto' : 'Unggah Foto Baru'}
                  </Button>

                  {avatarPreview && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={handleRemovePhoto}
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Hapus Foto
                    </Button>
                  )}
                </div>

                <p className="text-[11px] text-stone-500 leading-tight">
                  Format gambar JPG, PNG, atau WEBP. Foto akan otomatis muncul pada KTA Digital dan portal anggota Anda.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Identitas Read-only (NRA & NIK) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-stone-100/80 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                Nomor Anggota (NRA)
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-mono font-bold text-emerald-950">{member.id}</span>
                <span className="text-[10px] text-stone-400 font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Terkunci
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-100/80 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                NIK (Kependudukan)
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-mono font-bold text-stone-800">
                  {member.nik ? member.nik.slice(0, 4) + '************' : '3171************'}
                </span>
                <span className="text-[10px] text-stone-400 font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Terkunci
                </span>
              </div>
            </div>
          </div>

          {/* Section: Input Data Pribadi yang Dapat Diedit */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 border-b border-stone-100 pb-1.5">
              Informasi Pribadi & Domisili
            </h4>

            {/* Nama Lengkap */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Nama Lengkap Sesuai KTP <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-700 bg-white"
                placeholder="Masukkan nama lengkap"
              />
            </div>

            {/* Jenis Kelamin & Profesi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Jenis Kelamin <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-700 bg-white"
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Pekerjaan / Profesi
                </label>
                <input
                  type="text"
                  value={formData.pekerjaan}
                  onChange={(e) => setFormData({ ...formData, pekerjaan: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-700 bg-white"
                  placeholder="Contoh: Wiraswasta / Karyawan"
                />
              </div>
            </div>

            {/* Tempat & Tanggal Lahir */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Tempat Lahir
                </label>
                <input
                  type="text"
                  value={formData.tempat_lahir}
                  onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-700 bg-white"
                  placeholder="Kota Kelahiran"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Tanggal Lahir
                </label>
                <input
                  type="date"
                  value={formData.tgl_lahir}
                  onChange={(e) => setFormData({ ...formData, tgl_lahir: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-700 bg-white"
                />
              </div>
            </div>

            {/* Alamat Domisili */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Alamat Domisili Lengkap
              </label>
              <textarea
                rows={2}
                value={formData.alamat}
                onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-700 bg-white resize-none"
                placeholder="Jalan, RT/RW, Kelurahan, Kecamatan"
              />
            </div>

            {/* Kota & Provinsi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Kota / Kabupaten
                </label>
                <input
                  type="text"
                  value={formData.kota}
                  onChange={(e) => setFormData({ ...formData, kota: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-700 bg-white"
                  placeholder="Contoh: Jakarta Pusat"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Provinsi
                </label>
                <input
                  type="text"
                  value={formData.provinsi}
                  onChange={(e) => setFormData({ ...formData, provinsi: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-700 bg-white"
                  placeholder="Contoh: DKI Jakarta"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
