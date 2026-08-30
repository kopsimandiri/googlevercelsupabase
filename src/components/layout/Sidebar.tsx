import React from 'react';
import {
  Home,
  Building2,
  FileBarChart,
  Briefcase,
  History,
  Users,
  LayoutDashboard,
  Wallet,
  FolderGit2,
  X,
  Lock,
  LogOut,
  LogIn,
  FileSpreadsheet,
  Coins,
  FileText,
  Landmark,
  Package,
  Globe,
  UserPlus,
  Shield,
  ChevronRight,
  Database,
  Newspaper,
  Calculator,
  CreditCard,
  Bell,
  User,
} from 'lucide-react';
import { ActivePage } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { KopsimLogo } from '../common/KopsimLogo';

interface SidebarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  isOpen: boolean;
  onClose: () => void;
  onRequestLogin: () => void;
  onOpenRegister: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  isOpen,
  onClose,
  onRequestLogin,
  onOpenRegister,
}) => {
  const { user, role, isAuthenticated, logout } = useAuth();

  const handleNavClick = (page: ActivePage) => {
    onNavigate(page);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          id="sidebar-backdrop"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-stone-900/60 backdrop-blur-xs lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        id="kopsim-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-primary-900 text-stone-100 flex flex-col border-r border-primary-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header with Official Insignia */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-primary-800 bg-primary-950/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <KopsimLogo size="sm" badgeBackground={true} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white font-serif leading-none tracking-wide">
                KOPSIM <span className="text-accent-gold">MANDIRI</span>
              </span>
              <span className="text-[9px] text-stone-300 font-mono mt-0.5">
                {isAuthenticated ? `Portal Internal (${role})` : 'Portal Informasi'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-300 hover:text-white rounded-lg lg:hidden"
            aria-label="Tutup menu navigasi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card if Authenticated */}
        {isAuthenticated && user && (
          <div className="px-4 py-3 border-b border-primary-800 bg-primary-950/40 flex items-center justify-between shrink-0">
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate">{user.name}</span>
              <span className="text-[10px] text-accent-gold font-mono block">
                Hak Akses: {role}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-accent-gold/20 text-accent-gold border border-accent-gold/40 shrink-0">
              {role}
            </span>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
          {/* SEKSI 1: PORTAL PUBLIK & INFORMASI (Selalu Terbuka untuk Semua) */}
          <div>
            <div className="flex items-center justify-between px-3 pb-1.5 text-[10px] font-bold tracking-wider text-accent-gold uppercase font-mono border-b border-primary-800/80 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-accent-gold" />
                <span>Portal Informasi Publik</span>
              </span>
              <span className="text-[9px] text-stone-300 font-normal">Akses Bebas</span>
            </div>

            <div className="space-y-1">
              {/* Beranda */}
              <button
                onClick={() => handleNavClick('HOME')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                  activePage === 'HOME'
                    ? 'bg-primary-700 text-white font-semibold shadow-xs'
                    : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                }`}
              >
                <Home className="w-4 h-4 shrink-0 text-white" />
                <span>Beranda Utama</span>
              </button>

              {/* Katalog Komoditas */}
              <button
                onClick={() => handleNavClick('PORTOFOLIO')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                  activePage === 'PORTOFOLIO'
                    ? 'bg-primary-700 text-white font-semibold shadow-xs'
                    : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                }`}
              >
                <Package className="w-4 h-4 shrink-0 text-white" />
                <span>Katalog Komoditas Sektor Riil</span>
              </button>

              {/* Tata Kelola / GCG */}
              <button
                onClick={() => handleNavClick('MANAJEMEN')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                  activePage === 'MANAJEMEN'
                    ? 'bg-primary-700 text-white font-semibold shadow-xs'
                    : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0 text-white" />
                <span>Tata Kelola (GCG) & Visi Misi</span>
              </button>

              {/* Sejarah */}
              <button
                onClick={() => handleNavClick('HISTORY')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                  activePage === 'HISTORY'
                    ? 'bg-primary-700 text-white font-semibold shadow-xs'
                    : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                }`}
              >
                <History className="w-4 h-4 shrink-0 text-white" />
                <span>Sejarah KOPSIM 1905–2026</span>
              </button>

              {/* Tim & Pengawas */}
              <button
                onClick={() => handleNavClick('TEAM')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                  activePage === 'TEAM'
                    ? 'bg-primary-700 text-white font-semibold shadow-xs'
                    : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 shrink-0 text-white" />
                <span>Dewan Pengawas & Pengurus</span>
              </button>

              {/* Kanal Berita & Warta */}
              <button
                onClick={() => handleNavClick('NEWS_LIST')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                  activePage === 'NEWS_LIST' || activePage === 'NEWS_DETAIL'
                    ? 'bg-primary-700 text-white font-semibold shadow-xs'
                    : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                }`}
              >
                <Newspaper className="w-4 h-4 shrink-0 text-amber-300" />
                <span className="flex-1 text-left">Kanal Berita & Warta</span>
                <span className="text-[9px] bg-emerald-700 text-emerald-100 px-1.5 py-0.2 rounded font-bold">
                  Update
                </span>
              </button>

              {/* Kalkulator Simulasi Pinjaman */}
              <button
                onClick={() => handleNavClick('LOANS')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                  activePage === 'LOANS'
                    ? 'bg-primary-700 text-white font-semibold shadow-xs'
                    : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                }`}
              >
                <Calculator className="w-4 h-4 shrink-0 text-emerald-300" />
                <span className="flex-1 text-left">Simulasi Pembiayaan</span>
                <span className="text-[9px] bg-emerald-800 text-emerald-200 px-1.5 py-0.2 rounded font-bold">
                  Syariah
                </span>
              </button>

              {/* Setoran Online QRIS / VA */}
              <button
                onClick={() => handleNavClick('PAYMENTS')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                  activePage === 'PAYMENTS'
                    ? 'bg-primary-700 text-white font-semibold shadow-xs'
                    : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4 shrink-0 text-amber-300" />
                <span className="flex-1 text-left">Setor Simpanan (Online)</span>
                <span className="text-[9px] bg-amber-800 text-amber-200 px-1.5 py-0.2 rounded font-bold">
                  QRIS/VA
                </span>
              </button>

              {/* Pusat Notifikasi */}
              <button
                onClick={() => handleNavClick('NOTIFICATIONS')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                  activePage === 'NOTIFICATIONS'
                    ? 'bg-primary-700 text-white font-semibold shadow-xs'
                    : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                }`}
              >
                <Bell className="w-4 h-4 shrink-0 text-blue-300" />
                <span className="flex-1 text-left">Pusat Notifikasi</span>
                <span className="text-[9px] bg-blue-800 text-blue-200 px-1.5 py-0.2 rounded font-bold">
                  Multi
                </span>
              </button>

              {/* Tombol Pendaftaran Anggota Baru Online */}
              <button
                onClick={() => {
                  onOpenRegister();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold bg-accent-gold/20 text-accent-gold hover:bg-accent-gold/30 border border-accent-gold/40 mt-2 transition-all"
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-accent-gold" />
                  <span>Daftar Anggota Baru</span>
                </div>
                <span className="text-[9px] bg-accent-gold text-white px-1.5 py-0.5 rounded font-bold">
                  Buka Form
                </span>
              </button>
            </div>
          </div>

          {/* SEKSI 2: PORTAL INTERNAL (Hanya Terbuka / Aktif jika Diotentikasi) */}
          <div>
            <div className="flex items-center justify-between px-3 pb-1.5 text-[10px] font-bold tracking-wider text-accent-gold uppercase font-mono border-b border-primary-800/80 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-accent-gold" />
                <span>Portal Internal & Operasional</span>
              </span>
              <span className="text-[9px] text-accent-gold font-mono">
                {isAuthenticated ? role : 'Terkunci'}
              </span>
            </div>

            {/* If NOT Authenticated: Show Clean Lock Gateway Card */}
            {!isAuthenticated ? (
              <div className="p-3 bg-primary-950/60 rounded-xl border border-primary-800 space-y-2.5 text-xs text-stone-200">
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Modul operasional 20 Kolom, Simpanan, Finance, dan 8 Strategic Projects hanya dapat diakses oleh Anggota dan Pengurus terdaftar.
                </p>
                <button
                  onClick={() => {
                    onRequestLogin();
                    onClose();
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-accent-gold hover:bg-accent-gold-dark text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Masuk Portal Layanan</span>
                </button>
              </div>
            ) : role === 'ANGGOTA' ? (
              /* If Authenticated as ANGGOTA: Show strictly personal savings and personal profile */
              <div className="space-y-1">
                {/* 1. Simpanan Pribadi */}
                <button
                  onClick={() => handleNavClick('MEMBER_PORTAL')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all ${
                    activePage === 'MEMBER_PORTAL'
                      ? 'bg-accent-gold text-white font-bold shadow-xs'
                      : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Coins className="w-4 h-4 shrink-0 text-amber-300" />
                    <span>1. Simpanan Pribadi & Mutasi</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-amber-300" />
                </button>

                {/* 2. Data Diri & e-KTA */}
                <button
                  onClick={() => handleNavClick('MEMBER_PORTAL')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all ${
                    activePage === 'MEMBER_PORTAL'
                      ? 'bg-primary-800 text-white font-semibold shadow-xs'
                      : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 shrink-0 text-emerald-300" />
                    <span>2. Data Diri & e-KTA</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-stone-400" />
                </button>
              </div>
            ) : (
              /* If Authenticated as ADMIN or DIRECTOR: Show Full Internal Modules */
              <div className="space-y-1">
                {/* 1. Dashboard Eksekutif */}
                <button
                  onClick={() => handleNavClick('REPORTS_DASHBOARD')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    activePage === 'REPORTS_DASHBOARD'
                      ? 'bg-primary-700 text-white font-semibold shadow-xs'
                      : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard className="w-4 h-4 shrink-0 text-white" />
                    <span>1. Dashboard Eksekutif</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-stone-400" />
                </button>

                {/* 2. Keanggotaan & KTA */}
                <button
                  onClick={() => handleNavClick('MEMBERSHIP')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    activePage === 'MEMBERSHIP' || activePage === 'REPORTS_KEANGGOTAAN'
                      ? 'bg-primary-700 text-white font-semibold shadow-xs'
                      : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 shrink-0 text-white" />
                    <span>2. Keanggotaan & KTA</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-stone-400" />
                </button>

                {/* 3. Simpanan Syariah */}
                <button
                  onClick={() => handleNavClick('SIMPANAN')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    activePage === 'SIMPANAN'
                      ? 'bg-primary-700 text-white font-semibold shadow-xs'
                      : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Coins className="w-4 h-4 shrink-0 text-white" />
                    <span>3. Simpanan Syariah</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-stone-400" />
                </button>

                {/* 4. Transaksi 20 Kolom (Admin/Director) */}
                <button
                  onClick={() => handleNavClick('TRANSACTIONS')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    activePage === 'TRANSACTIONS'
                      ? 'bg-primary-700 text-white font-semibold shadow-xs'
                      : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="w-4 h-4 shrink-0 text-white" />
                    <span>4. Transaksi 20 Kolom</span>
                  </div>
                  <span className="text-[9px] text-stone-300 font-mono">Adm/Dir</span>
                </button>

                {/* 5. Finance & Rekening (Admin/Director) */}
                <button
                  onClick={() => handleNavClick('FINANCE')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    activePage === 'FINANCE'
                      ? 'bg-primary-700 text-white font-semibold shadow-xs'
                      : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Landmark className="w-4 h-4 shrink-0 text-white" />
                    <span>5. Finance & Rekening</span>
                  </div>
                  <span className="text-[9px] text-stone-300 font-mono">Adm/Dir</span>
                </button>

                {/* 6. 8 Sektor Riil Projects */}
                <button
                  onClick={() => handleNavClick('PROJECT')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    activePage === 'PROJECT' || activePage === 'REPORTS_PROJECT'
                      ? 'bg-primary-700 text-white font-semibold shadow-xs'
                      : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FolderGit2 className="w-4 h-4 shrink-0 text-white" />
                    <span>6. 8 Sektor Riil Projects</span>
                  </div>
                  <span className="text-[9px] text-stone-300 font-mono">Adm/Dir</span>
                </button>

                {/* 7. Laporan Keuangan & SHU */}
                <button
                  onClick={() => handleNavClick('REPORTS_KEUANGAN')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    activePage === 'REPORTS_KEUANGAN'
                      ? 'bg-primary-700 text-white font-semibold shadow-xs'
                      : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileBarChart className="w-4 h-4 shrink-0 text-white" />
                    <span>7. Laporan & SHU</span>
                  </div>
                  <span className="text-[9px] text-stone-300 font-mono">Adm/Dir</span>
                </button>

                {/* 8. Repositori Berkas */}
                <button
                  onClick={() => handleNavClick('FILES')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    activePage === 'FILES'
                      ? 'bg-primary-700 text-white font-semibold shadow-xs'
                      : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 shrink-0 text-white" />
                    <span>8. Repositori Berkas</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-stone-400" />
                </button>

                {/* 9. Master Data & Supabase Audit (11 Tabel) */}
                <button
                  onClick={() => handleNavClick('DATABASE_AUDIT')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    activePage === 'DATABASE_AUDIT'
                      ? 'bg-primary-700 text-white font-semibold shadow-xs'
                      : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Database className="w-4 h-4 shrink-0 text-accent-gold" />
                    <span className="text-accent-gold font-semibold">9. Supabase Audit & Master Data</span>
                  </div>
                  <span className="text-[9px] bg-accent-gold/20 text-accent-gold border border-accent-gold/40 px-1 rounded font-bold">
                    11 Tab
                  </span>
                </button>

                {/* 10. Kelola Berita & CMS */}
                <button
                  onClick={() => handleNavClick('NEWS_ADMIN')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    activePage === 'NEWS_ADMIN'
                      ? 'bg-primary-700 text-white font-semibold shadow-xs'
                      : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Newspaper className="w-4 h-4 shrink-0 text-emerald-300" />
                    <span className="text-stone-100 font-semibold">10. Kelola Berita (CMS)</span>
                  </div>
                  <span className="text-[9px] bg-emerald-700/60 text-emerald-200 border border-emerald-500/40 px-1 rounded font-bold">
                    CMS
                  </span>
                </button>

                {/* 11. Pembiayaan & Komite */}
                <button
                  onClick={() => handleNavClick('LOANS')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    activePage === 'LOANS'
                      ? 'bg-primary-700 text-white font-semibold shadow-xs'
                      : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Calculator className="w-4 h-4 shrink-0 text-emerald-300" />
                    <span className="text-stone-100 font-semibold">11. Pembiayaan Syariah</span>
                  </div>
                  <span className="text-[9px] bg-emerald-700/60 text-emerald-200 border border-emerald-500/40 px-1 rounded font-bold">
                    Komite
                  </span>
                </button>

                {/* 12. Payment Gateway & Webhook */}
                <button
                  onClick={() => handleNavClick('PAYMENTS')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    activePage === 'PAYMENTS'
                      ? 'bg-primary-700 text-white font-semibold shadow-xs'
                      : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4 shrink-0 text-amber-300" />
                    <span className="text-stone-100 font-semibold">12. Gerbang Pembayaran</span>
                  </div>
                  <span className="text-[9px] bg-amber-700/60 text-amber-200 border border-amber-500/40 px-1 rounded font-bold">
                    Gateway
                  </span>
                </button>

                {/* 13. Notifikasi & Automasi */}
                <button
                  onClick={() => handleNavClick('NOTIFICATIONS')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    activePage === 'NOTIFICATIONS'
                      ? 'bg-primary-700 text-white font-semibold shadow-xs'
                      : 'text-stone-200 hover:bg-primary-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 shrink-0 text-blue-300" />
                    <span className="text-stone-100 font-semibold">13. Notifikasi & Automasi</span>
                  </div>
                  <span className="text-[9px] bg-blue-700/60 text-blue-200 border border-blue-500/40 px-1 rounded font-bold">
                    Queue
                  </span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-primary-800 bg-primary-950/95 text-xs space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-stone-400">Keamanan Data:</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-800 text-stone-200">
              Syariah & SSL 256
            </span>
          </div>

          {isAuthenticated ? (
            <button
              id="sidebar-logout-btn"
              onClick={logout}
              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-rose-950/50 hover:bg-rose-900 text-rose-300 font-medium text-xs border border-rose-800/60 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar Sesi Internal</span>
            </button>
          ) : (
            <button
              id="sidebar-login-btn"
              onClick={() => {
                onRequestLogin();
                onClose();
              }}
              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-accent-gold hover:bg-accent-gold-dark text-white font-bold text-xs shadow-xs transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk Portal Internal</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
