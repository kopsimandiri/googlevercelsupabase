import React from 'react';
import { Button } from '../common/Button';
import {
  ShieldCheck,
  Scale,
  FileText,
  AlertTriangle,
  CheckCircle2,
  X,
  Building2,
  HelpCircle,
} from 'lucide-react';

interface InvestmentComplianceModalProps {
  onClose: () => void;
}

export const InvestmentComplianceModal: React.FC<InvestmentComplianceModalProps> = ({ onClose }) => {
  return (
    <div
      id="investment-compliance-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-surface rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base font-serif text-stone-900">
                Transparansi & Kepatuhan Layanan Urun Dana Syariah
              </h3>
              <p className="text-[11px] text-stone-500">
                Kepatuhan Syariah DSN-MUI & Prinsip Kehati-hatian Sektor Riil KOPSIM Mandiri
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Fatwa DSN-MUI Dasar Hukum */}
        <div className="space-y-2">
          <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-900 flex items-center gap-1.5 font-serif">
            <Scale className="w-4 h-4 text-accent-gold" />
            1. Landasan Fatwa Dewan Syariah Nasional (DSN-MUI)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <span className="font-bold text-stone-900 block font-mono text-[11px]">
                Fatwa DSN-MUI No. 140/DSN-MUI/VIII/2021
              </span>
              <p className="text-stone-600 text-[11px] leading-relaxed">
                Penyelenggaraan Layanan Urun Dana Berbasis Teknologi Informasi Berdasarkan Prinsip Syariah (Securities Crowdfunding Syariah).
              </p>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <span className="font-bold text-stone-900 block font-mono text-[11px]">
                Fatwa DSN-MUI No. 08 & 115 / SUKUK
              </span>
              <p className="text-stone-600 text-[11px] leading-relaxed">
                Pembiayaan Musyarakah dan Penerbitan Sukuk Mudharabah/Musyarakah berlandaskan aset riil (*underlying asset*).
              </p>
            </div>
          </div>
        </div>

        {/* 2. Perbandingan Instrumen Efek Syariah */}
        <div className="space-y-2">
          <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-900 flex items-center gap-1.5 font-serif">
            <FileText className="w-4 h-4 text-accent-gold" />
            2. Karakteristik Instrumen Efek Koperasi
          </h4>
          <div className="overflow-x-auto rounded-xl border border-stone-200 text-xs">
            <table className="w-full text-left bg-surface">
              <thead className="bg-stone-50 text-[10px] text-stone-600 uppercase border-b border-stone-200">
                <tr>
                  <th className="p-2.5">Instrumen</th>
                  <th className="p-2.5">Akad Syariah</th>
                  <th className="p-2.5">Karakteristik Imbal Hasil</th>
                  <th className="p-2.5">Tenor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-[11px]">
                <tr>
                  <td className="p-2.5 font-bold font-mono text-emerald-950">SUKS</td>
                  <td className="p-2.5">Musyarakah / Murabahah</td>
                  <td className="p-2.5">SHU Investasi Berkala (Triwulan) + Pokok saat Jatuh Tempo</td>
                  <td className="p-2.5">12 - 24 Bulan</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold font-mono text-emerald-950">SUKUK</td>
                  <td className="p-2.5">Mudharabah / Wakalah</td>
                  <td className="p-2.5">Bagi Hasil Proporsional Laba Riil Proyek + Pokok</td>
                  <td className="p-2.5">12 Bulan</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold font-mono text-emerald-950">SAHAM EFEK</td>
                  <td className="p-2.5">Musyarakah Mutanaqisah</td>
                  <td className="p-2.5">Dividen Tahunan & Hak Kepemilikan Lot Unit Usaha</td>
                  <td className="p-2.5">Jangka Panjang</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Pernyataan Risiko Sektor Riil */}
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2 text-xs text-amber-950">
          <div className="flex items-center gap-1.5 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span>Pemberitahuan Risiko Investasi Sektor Riil</span>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-700">
            Investasi pada proyek sektor riil mengandung potensi risiko bisnis, cuaca/panen (agrikultur), fluktuasi harga pasar komoditas, dan likuiditas. Kinerja masa lalu tidak menjamin hasil masa depan. Anggota disarankan berinvestasi dengan dana produktif dan membaca prospektus masing-masing proyek secara seksama.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" size="sm" onClick={onClose} className="font-bold">
            Saya Mengerti
          </Button>
        </div>
      </div>
    </div>
  );
};
