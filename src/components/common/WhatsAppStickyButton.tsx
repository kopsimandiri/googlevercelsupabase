import React, { useMemo } from 'react';
import { MessageCircle } from 'lucide-react';
import { ActivePage } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  ADMIN_WHATSAPP_DISPLAY,
  ADMIN_WHATSAPP_FORMATTED,
  buildAdminWhatsAppUrl,
} from '../../constants/contact';

interface WhatsAppStickyButtonProps {
  phoneNumber?: string;
  activePage?: ActivePage;
}

const ADMIN_INTERNAL_PAGE_LIST: ActivePage[] = [
  'REPORTS_DASHBOARD',
  'MEMBERSHIP',
  'REPORTS_KEANGGOTAAN',
  'SIMPANAN',
  'TRANSACTIONS',
  'FINANCE',
  'PROJECT',
  'REPORTS_PROJECT',
  'REPORTS_KEUANGAN',
  'FILES',
  'DATABASE_AUDIT',
  'NEWS_ADMIN',
];

const ADMIN_INTERNAL_PAGES: ReadonlySet<string> = new Set(ADMIN_INTERNAL_PAGE_LIST);

export const WhatsAppStickyButton: React.FC<WhatsAppStickyButtonProps> = ({
  phoneNumber = ADMIN_WHATSAPP_DISPLAY,
  activePage = 'HOME',
}) => {
  const { user, role, isAuthenticated } = useAuth();

  // Sembunyikan di halaman workspace back-office Admin/Direksi agar tidak bertumpuk dengan banner aksi internal
  const isAdminBackOffice =
    isAuthenticated &&
    (role === 'ADMIN' || role === 'DIRECTOR') &&
    ADMIN_INTERNAL_PAGES.has(activePage);

  const waUrl = useMemo(() => {
    let baseMessage =
      "Assalamu'alaikum Admin KOPSIM Mandiri, saya ingin bertanya seputar layanan koperasi dan kemitraan sektor riil.";

    switch (activePage) {
      case 'PORTOFOLIO':
        baseMessage =
          "Assalamu'alaikum Admin KOPSIM Mandiri, saya melihat katalog komoditas di portal dan ingin informasi ketersediaan pasok serta penawaran kerjasama.";
        break;
      case 'MANAJEMEN':
        baseMessage =
          "Assalamu'alaikum Admin KOPSIM Mandiri, saya ingin menanyakan informasi tata kelola syariah dan keanggotaan koperasi.";
        break;
      case 'HISTORY':
      case 'TEAM':
        baseMessage =
          "Assalamu'alaikum Admin KOPSIM Mandiri, saya ingin berkonsultasi mengenai profil, legalitas, dan keanggotaan Koperasi Syarikat Islam Mandiri.";
        break;
      case 'NEWS_LIST':
      case 'NEWS_DETAIL':
        baseMessage =
          "Assalamu'alaikum Admin KOPSIM Mandiri, saya membaca warta KOPSIM di portal dan ingin informasi lebih lanjut.";
        break;
      case 'MEMBER_PORTAL':
        baseMessage =
          "Assalamu'alaikum Admin KOPSIM Mandiri, saya membutuhkan bantuan terkait Portal Anggota (simpanan, KTA digital, bukti transaksi, atau peluang urun dana proyek).";
        break;
      case 'PAYMENTS':
        baseMessage =
          "Assalamu'alaikum Admin KOPSIM Mandiri, saya ingin konfirmasi pembayaran setoran simpanan melalui Gerbang Pembayaran.";
        break;
      case 'LOANS':
        baseMessage =
          "Assalamu'alaikum Admin KOPSIM Mandiri, saya ingin berkonsultasi mengenai simulasi dan pengajuan pembiayaan syariah.";
        break;
      default:
        break;
    }

    if (isAuthenticated && role === 'ANGGOTA' && user?.name) {
      const nraLabel = user.memberNo ? ` - NRA ${user.memberNo}` : '';
      baseMessage = `${baseMessage} (Anggota: ${user.name}${nraLabel})`;
    }

    return buildAdminWhatsAppUrl(baseMessage, phoneNumber);
  }, [activePage, isAuthenticated, phoneNumber, role, user?.memberNo, user?.name]);

  if (isAdminBackOffice) {
    return null;
  }

  return (
    <div
      id="whatsapp-sticky-container"
      className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2.5 pointer-events-auto"
    >
      <a
        id="sticky-whatsapp-button"
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-2.5 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-950/25 hover:shadow-2xl ring-4 ring-emerald-600/20 transition-all duration-200 active:scale-95 min-h-[44px]"
        title={`Chat WhatsApp Admin KOPSIM (${ADMIN_WHATSAPP_FORMATTED})`}
        aria-label={`Hubungi Admin KOPSIM melalui WhatsApp ${ADMIN_WHATSAPP_FORMATTED}`}
      >
        <MessageCircle className="w-5 h-5 shrink-0 fill-white/15 text-white" />
        <div className="flex flex-col text-left">
          <span className="text-xs font-bold leading-tight font-sans">
            Chat Admin (WA)
          </span>
          <span className="text-[10px] text-emerald-100 font-mono tracking-tight leading-none hidden sm:inline mt-0.5">
            {ADMIN_WHATSAPP_FORMATTED}
          </span>
        </div>
      </a>
    </div>
  );
};
