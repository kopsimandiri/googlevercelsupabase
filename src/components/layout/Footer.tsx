import React from 'react';
import { ShieldCheck, HeartHandshake, Phone, Mail, MapPin } from 'lucide-react';
import { KopsimLogo } from '../common/KopsimLogo';

export const Footer: React.FC = () => {
  return (
    <footer id="kopsim-footer" className="bg-primary-900 text-stone-300 border-t border-primary-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Kolom 1: Brand & Logo */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-3">
              <KopsimLogo size="lg" badgeBackground={true} />
              <div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-white">
                  KOPERASI SYARIKAT ISLAM <span className="text-accent-gold">MANDIRI</span>
                </h3>
                <p className="text-[11px] text-stone-300 uppercase tracking-widest font-mono">
                  Syarikat Islam • Sejak 1905
                </p>
              </div>
            </div>
            <p className="text-xs text-stone-200 leading-relaxed max-w-md">
              Membangun kemandirian ekonomi umat melalui ekosistem bisnis sektor riil terintegrasi: agrikultur, perikanan maritim, garam industri, perdagangan komoditas, dan permodalan syariah.
            </p>
          </div>

          {/* Kolom 2: Dewan Pengawas & Legalitas */}
          <div className="space-y-2 text-xs">
            <span className="font-bold text-accent-gold uppercase tracking-wider font-mono text-[11px] block">
              Tata Kelola Syariah
            </span>
            <ul className="space-y-1.5 text-stone-300">
              <li>• Dewan Pengawas Syariah: Dr. Hamdan Zoelva, S.H., M.H.</li>
              <li>• Berlandaskan Fatwa DSN-MUI & Prinsip Bebas Riba</li>
              <li>• Kepatuhan Good Corporate Governance (GCG)</li>
              <li>• Badan Hukum Kemenkumham Terdaftar</li>
            </ul>
          </div>

          {/* Kolom 3: Kontak & Sekretariat */}
          <div className="space-y-2 text-xs">
            <span className="font-bold text-accent-gold uppercase tracking-wider font-mono text-[11px] block">
              Sekretariat Pusat
            </span>
            <div className="space-y-2 text-stone-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-accent-gold shrink-0 mt-0.5" />
                <span className="leading-snug">
                  Jl. Taman Amir Hamzah No.6A Pegangsaan, Kec. Menteng, Jakarta Pusat
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-accent-gold shrink-0" />
                <span>koperasi.simandiri@gmail.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-accent-gold shrink-0" />
                <span>
                  021 - 23599354 |{' '}
                  <a
                    href="https://wa.me/6282148988520?text=Assalamu%27alaikum%20CS%20KOPSIM%20Mandiri"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 underline font-mono font-medium inline-flex items-center gap-1"
                  >
                    082148988520 (WA)
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-primary-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-400">
          <div>
            &copy; {new Date().getFullYear()} Koperasi Syarikat Islam Mandiri (KOPSIM). Hak Cipta Dilindungi Undang-Undang.
          </div>
          <div className="flex items-center gap-4 text-stone-300">
            <span>Sistem Terintegrasi React & Supabase</span>
            <span>•</span>
            <span>8 Strategic Projects</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
