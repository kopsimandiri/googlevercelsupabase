import React, { useState } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  CheckCheck,
  PhoneCall,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { ActivePage } from '../../types/navigation';
import { KopsimLogo } from './KopsimLogo';

interface WhatsAppStickyButtonProps {
  phoneNumber?: string;
  activePage?: ActivePage;
}

export const WhatsAppStickyButton: React.FC<WhatsAppStickyButtonProps> = ({
  phoneNumber = '082148988520',
  activePage = 'HOME',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customText, setCustomText] = useState('');

  // Clean phone number for WhatsApp URL (convert 08xxx to 628xxx)
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const internationalPhone = cleanPhone.startsWith('0')
    ? '62' + cleanPhone.slice(1)
    : cleanPhone.startsWith('62')
    ? cleanPhone
    : '62' + cleanPhone;

  // Preset topics based on user context
  const getContextMessage = (topic?: string) => {
    if (topic === 'KOMODITAS') {
      return `Assalamu'alaikum CS KOPSIM Mandiri, saya ingin berkonsultasi mengenai peluang kemitraan pasok komoditas (perikanan/pertanian/industri).`;
    }
    if (topic === 'ANGGOTA') {
      return `Assalamu'alaikum CS KOPSIM Mandiri, saya ingin informasi mengenai pendaftaran anggota baru dan aktivasi simpanan syariah.`;
    }
    if (topic === 'PROYEK') {
      return `Assalamu'alaikum CS KOPSIM Mandiri, saya ingin informasi lebih lanjut mengenai 8 Strategic Projects KOPSIM.`;
    }
    if (topic === 'UMUM') {
      return `Assalamu'alaikum CS KOPSIM Mandiri, saya ingin bertanya seputar layanan Koperasi Syarikat Islam Mandiri.`;
    }

    // Default by active page
    switch (activePage) {
      case 'PORTOFOLIO':
        return `Assalamu'alaikum CS KOPSIM Mandiri, saya melihat katalog komoditas di portal dan ingin info ketersediaan pasok & spesifikasi mutu.`;
      case 'HISTORY':
      case 'TEAM':
        return `Assalamu'alaikum CS KOPSIM Mandiri, saya ingin berkonsultasi mengenai profil dan legalitas Koperasi Syarikat Islam Mandiri.`;
      default:
        return `Assalamu'alaikum CS KOPSIM Mandiri, saya ingin berkonsultasi seputar layanan koperasi dan kemitraan sektor riil.`;
    }
  };

  const handleOpenWhatsApp = (messageToSend?: string) => {
    const finalMessage = messageToSend || customText || getContextMessage();
    const encodedMessage = encodeURIComponent(finalMessage.trim());
    const waUrl = `https://wa.me/${internationalPhone}?text=${encodedMessage}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      id="whatsapp-sticky-container"
      className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end pointer-events-auto"
    >
      {/* Floating Chat Modal / Dialog */}
      {isOpen && (
        <div
          id="whatsapp-chat-popup"
          className="mb-3 w-[320px] sm:w-[360px] bg-surface rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-4 text-white relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xs flex items-center justify-center p-1 border border-white/20">
                    <KopsimLogo size="sm" badgeBackground={false} />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-emerald-800 rounded-full"></span>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-amber-200 flex items-center gap-1.5">
                    Layanan CS KOPSIM
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  </h4>
                  <p className="text-[11px] text-emerald-100 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online • Respon Cepat
                  </p>
                </div>
              </div>
              <button
                id="close-wa-popup-btn"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                title="Tutup"
                aria-label="Tutup popup WhatsApp"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-emerald-100/90 mt-2 font-mono">
              WhatsApp CS: <span className="font-bold text-white tracking-wider">0821-4898-8520</span>
            </p>
          </div>

          {/* Chat Body & Topic Shortcuts */}
          <div className="p-4 bg-stone-50/80 space-y-3 max-h-[360px] overflow-y-auto">
            <div className="bg-white p-3 rounded-xl rounded-tl-none border border-stone-200 text-xs text-stone-700 shadow-xs space-y-1">
              <p className="font-semibold text-stone-900 flex items-center gap-1 text-[11px]">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Assalamu'alaikum Warahmatullahi Wabarakatuh
              </p>
              <p className="text-stone-600 leading-relaxed text-[11px]">
                Selamat datang di layanan resmi <strong>Koperasi Syarikat Islam Mandiri</strong>. Ada yang bisa kami bantu hari ini?
              </p>
              <span className="text-[9px] text-stone-400 block text-right font-mono mt-1">
                Layanan 08.00 - 17.00 WIB
              </span>
            </div>

            {/* Quick Topic Buttons */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                Pilih Topik Konsultasi Cepat:
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  id="wa-topic-komoditas"
                  onClick={() => handleOpenWhatsApp(getContextMessage('KOMODITAS'))}
                  className="w-full text-left px-3 py-2 rounded-lg bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 text-xs border border-stone-200 hover:border-emerald-300 flex items-center justify-between transition-colors group"
                >
                  <span className="truncate">🌾 Kemitraan Komoditas & Pasok</span>
                  <Send className="w-3 h-3 text-stone-400 group-hover:text-emerald-600 shrink-0" />
                </button>

                <button
                  id="wa-topic-anggota"
                  onClick={() => handleOpenWhatsApp(getContextMessage('ANGGOTA'))}
                  className="w-full text-left px-3 py-2 rounded-lg bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 text-xs border border-stone-200 hover:border-emerald-300 flex items-center justify-between transition-colors group"
                >
                  <span className="truncate">📝 Pendaftaran & Simpanan Anggota</span>
                  <Send className="w-3 h-3 text-stone-400 group-hover:text-emerald-600 shrink-0" />
                </button>

                <button
                  id="wa-topic-proyek"
                  onClick={() => handleOpenWhatsApp(getContextMessage('PROYEK'))}
                  className="w-full text-left px-3 py-2 rounded-lg bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 text-xs border border-stone-200 hover:border-emerald-300 flex items-center justify-between transition-colors group"
                >
                  <span className="truncate">🏢 Info 8 Strategic Projects</span>
                  <Send className="w-3 h-3 text-stone-400 group-hover:text-emerald-600 shrink-0" />
                </button>
              </div>
            </div>

            {/* Custom Input */}
            <div className="pt-2">
              <label htmlFor="wa-custom-msg" className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                Atau Tulis Pesan Sendiri:
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="wa-custom-msg"
                  type="text"
                  placeholder="Ketik pesan Anda..."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleOpenWhatsApp();
                    }
                  }}
                  className="flex-1 text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                />
                <button
                  id="wa-send-custom-btn"
                  onClick={() => handleOpenWhatsApp()}
                  className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shrink-0"
                  title="Kirim ke WhatsApp"
                  aria-label="Kirim pesan ke WhatsApp"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-3 bg-stone-100 border-t border-stone-200 flex items-center justify-between gap-2">
            <span className="text-[11px] text-stone-500 flex items-center gap-1">
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              Langsung terhubung ke WA
            </span>
            <button
              id="wa-direct-chat-btn"
              onClick={() => handleOpenWhatsApp()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <span>Buka WhatsApp</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Main Sticky WhatsApp Floating Button */}
      <div className="flex items-center gap-2">
        {/* Subtle helper tooltip bubble on desktop */}
        {!isOpen && (
          <div
            id="wa-desktop-bubble"
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-1.5 bg-surface text-stone-800 text-xs font-medium px-3 py-1.5 rounded-full shadow-md border border-stone-200 cursor-pointer hover:bg-emerald-50 transition-all"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Butuh bantuan? <strong>Chat WhatsApp</strong></span>
          </div>
        )}

        <button
          id="sticky-whatsapp-button"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative group flex items-center gap-2.5 px-4 py-3 sm:px-4.5 sm:py-3.5 rounded-full shadow-xl transition-all duration-200 active:scale-95 ${
            isOpen
              ? 'bg-stone-800 text-white hover:bg-stone-900'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/25 hover:shadow-2xl hover:shadow-emerald-800/30 ring-4 ring-emerald-600/20'
          }`}
          title="Chat WhatsApp CS KOPSIM (0821-4898-8520)"
          aria-label="Hubungi Customer Service KOPSIM melalui WhatsApp"
        >
          {/* Notification Ping on closed state */}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border-2 border-surface"></span>
            </span>
          )}

          {isOpen ? (
            <>
              <X className="w-5 h-5" />
              <span className="text-xs font-bold font-sans">Tutup</span>
            </>
          ) : (
            <>
              <MessageCircle className="w-5 h-5 fill-white text-emerald-600 sm:w-5 sm:h-5" />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold leading-tight flex items-center gap-1 font-sans">
                  WhatsApp
                </span>
                <span className="text-[10px] text-emerald-100 font-mono tracking-tight leading-none hidden sm:inline">
                  0821-4898-8520
                </span>
              </div>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
