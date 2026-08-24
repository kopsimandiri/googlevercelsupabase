import React, { useState } from 'react';
import { memberService } from '../../services/memberService';
import { useNotification } from '../../context/NotificationContext';
import { formatRupiah } from '../../utils/formatters';
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

  const [nama, setNama] = useState('');
  const [nik, setNik] = useState('');
  const [noHp, setNoHp] = useState('');
  const [email, setEmail] = useState('');
  const [alamat, setAlamat] = useState('');
  const [kota, setKota] = useState('');
  const [provinsi, setProvinsi] = useState('DKI Jakarta');
  const [pekerjaan, setPekerjaan] = useState('Wiraswasta');
  const [plantation, setPlantation] = useState('PUSAT JAKARTA');
  const [simpananPokok, setSimpananPokok] = useState(500000);
  const [simpananWajibAwal, setSimpananWajibAwal] = useState(360000);
  const [simpananSukarelaAwal, setSimpananSukarelaAwal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredMemberId, setRegisteredMemberId] = useState('');

  if (!isOpen) return null;

  const totalSetoranAwal = simpananPokok + simpananWajibAwal + (Number(simpananSukarelaAwal) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nama.trim()) {
      showToast('Nama lengkap wajib diisi sesuai KTP.', 'error');
      return;
    }
    if (!nik || nik.length < 10) {
      showToast('Nomor NIK KTP tidak valid (minimal 10 digit).', 'error');
      return;
    }
    if (!noHp || noHp.length < 9) {
      showToast('Nomor WhatsApp / HP tidak valid.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await memberService.saveMember({
        nama,
        gender: 'L',
        alamat,
        kota: kota || 'Jakarta',
        provinsi,
        pekerjaan,
        plantation,
        area_jenis: plantation.includes('PUSAT') ? 'KOPERASI PUSAT' : 'KOPERASI CABANG',
        simpanan_pokok: simpananPokok,
        simpanan_wajib: simpananWajibAwal,
        simpanan_sukarela: Number(simpananSukarelaAwal) || 0,
      });

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
          <div className="space-y-4 py-4 text-center">
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

            <div className="pt-2 flex justify-center">
              <Button variant="gold" size="md" onClick={onClose}>
                Selesai & Tutup
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
                <label className="block text-stone-700 font-semibold mb-1">Nomor NIK KTP *</label>
                <input
                  type="text"
                  required
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  placeholder="16 digit NIK"
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
                <label className="block text-stone-700 font-semibold mb-1">Kota / Kabupaten *</label>
                <input
                  type="text"
                  required
                  value={kota}
                  onChange={(e) => setKota(e.target.value)}
                  placeholder="Jakarta Selatan"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden text-xs"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Provinsi</label>
                <select
                  value={provinsi}
                  onChange={(e) => setProvinsi(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden text-xs"
                >
                  <option value="DKI Jakarta">DKI Jakarta</option>
                  <option value="Jawa Barat">Jawa Barat</option>
                  <option value="Jawa Tengah">Jawa Tengah</option>
                  <option value="Jawa Timur">Jawa Timur</option>
                  <option value="Banten">Banten</option>
                  <option value="Sumatera Utara">Sumatera Utara</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Cabang / Wilayah *</label>
                <select
                  value={plantation}
                  onChange={(e) => setPlantation(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden text-xs"
                >
                  <option value="PUSAT JAKARTA">PUSAT JAKARTA</option>
                  <option value="CABANG JAWA BARAT">CABANG JAWA BARAT</option>
                  <option value="CABANG JAWA TIMUR">CABANG JAWA TIMUR</option>
                  <option value="CABANG JAWA TENGAH">CABANG JAWA TENGAH</option>
                  <option value="CABANG SUMATERA">CABANG SUMATERA</option>
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
