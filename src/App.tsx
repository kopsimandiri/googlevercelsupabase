import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { TopNavbar } from './components/layout/TopNavbar';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { Footer } from './components/layout/Footer';
import { PageContainer } from './components/layout/PageContainer';
import { LoginForm } from './components/auth/LoginForm';
import { RoleGuard } from './components/auth/RoleGuard';
import { Card } from './components/common/Card';
import { Button } from './components/common/Button';
import { Badge } from './components/common/Badge';
import { KopsimLogo } from './components/common/KopsimLogo';
import { LoadingState } from './components/common/LoadingState';
import { useAppRouter } from './hooks/useAppRouter';
import { ActivePage } from './types/navigation';
import { NewsArticle } from './types/news';
import { newsService } from './services/newsService';

// Static Lightweight Public Portal Views
import {
  PortfolioMarketplaceView,
  FileManagementView,
  HistoryView,
  TeamView,
} from './components/portal/PublicPortalViews';
import { SEOHead } from './components/common/SEOHead';
import { NewsListView } from './components/portal/NewsListView';
import { NewsDetailView } from './components/portal/NewsDetailView';
import { HomeNewsSection } from './components/portal/HomeNewsSection';

// Route-Level Code Splitting for Large Modules & Dialogs
const PublicRegisterModal = lazy(() =>
  import('./components/portal/PublicRegisterModal').then((m) => ({ default: m.PublicRegisterModal }))
);
const DashboardShell = lazy(() =>
  import('./components/dashboard/DashboardShell').then((m) => ({ default: m.DashboardShell }))
);
const MembershipModule = lazy(() =>
  import('./components/membership/MembershipModule').then((m) => ({ default: m.MembershipModule }))
);
const SimpananModule = lazy(() =>
  import('./components/simpanan/SimpananModule').then((m) => ({ default: m.SimpananModule }))
);
const TransactionModule = lazy(() =>
  import('./components/transactions/TransactionModule').then((m) => ({ default: m.TransactionModule }))
);
const FinanceModule = lazy(() =>
  import('./components/finance/FinanceModule').then((m) => ({ default: m.FinanceModule }))
);
const ProjectModule = lazy(() =>
  import('./components/project/ProjectModule').then((m) => ({ default: m.ProjectModule }))
);
const ReportsModule = lazy(() =>
  import('./components/reports/ReportsModule').then((m) => ({ default: m.ReportsModule }))
);
const SupabaseAuditModule = lazy(() =>
  import('./components/admin/SupabaseAuditModule').then((m) => ({ default: m.SupabaseAuditModule }))
);
const MemberPortalView = lazy(() =>
  import('./components/portal/MemberPortalView').then((m) => ({ default: m.MemberPortalView }))
);
const NewsAdminModule = lazy(() =>
  import('./components/news/NewsAdminModule').then((m) => ({ default: m.NewsAdminModule }))
);
const LoanSimulatorModule = lazy(() =>
  import('./components/loans/LoanSimulatorModule').then((m) => ({ default: m.LoanSimulatorModule }))
);
const NotificationCenterModule = lazy(() =>
  import('./components/notifications/NotificationCenterModule').then((m) => ({ default: m.NotificationCenterModule }))
);
const PaymentGatewayModule = lazy(() =>
  import('./components/payments/PaymentGatewayModule').then((m) => ({ default: m.PaymentGatewayModule }))
);

import {
  Lock,
  Package,
  UserPlus,
  ArrowRight,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Scale,
  FileText,
  Award,
  Users,
  BookOpen,
} from 'lucide-react';

function AppContent() {
  const { activePage, activeTab, navigate } = useAppRouter();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  const { isAuthenticated, isLoading } = useAuth();
  const { showToast } = useNotification();

  // If navigating directly to a news detail URL with article ID, hydrate selectedArticle
  useEffect(() => {
    if (activePage === 'NEWS_DETAIL' && !selectedArticle && activeTab && activeTab !== 'detail') {
      newsService.getArticleById(activeTab).then((article) => {
        if (article) {
          setSelectedArticle(article);
        }
      });
    }
  }, [activePage, activeTab, selectedArticle]);

  const handleNavigate = (page: ActivePage) => {
    navigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
        <LoadingState
          message="Memverifikasi Sesi KOPSIM Mandiri..."
          subMessage="Memeriksa token keamanan dan otorisasi peran pengguna"
        />
      </div>
    );
  }

  const renderModuleWithSuspense = (component: React.ReactNode, moduleName: string) => (
    <Suspense
      fallback={
        <div className="py-12 flex items-center justify-center">
          <LoadingState
            message={`Memuat Modul ${moduleName}...`}
            subMessage="Mengoptimalkan aset dan menyinkronkan data terbaru"
          />
        </div>
      }
    >
      {component}
    </Suspense>
  );

  const renderContent = () => {
    switch (activePage) {
      // =========================================================================
      // BOUNDARY 1: PORTAL PUBLIK
      // =========================================================================
      case 'HOME':
        return (
          <PageContainer
            title="Portal Informasi & Layanan Koperasi Syariah"
            subtitle="Ekosistem bisnis terpadu sektor riil, ketahanan pangan, dan permodalan syariah mandiri"
            breadcrumbs={['Portal Publik', 'Beranda']}
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => setShowRegisterModal(true)}
                  leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                >
                  Daftar Anggota
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (isAuthenticated) {
                      handleNavigate('REPORTS_DASHBOARD');
                    } else {
                      setShowLoginModal(true);
                    }
                  }}
                  leftIcon={<Lock className="w-3.5 h-3.5" />}
                >
                  Portal Internal
                </Button>
              </div>
            }
            idPrefix="home"
          >
            <div className="space-y-8">
              {/* Hero Banner */}
              <div
                id="hero-banner-shell"
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-white p-6 sm:p-10 lg:p-12 shadow-xl border border-emerald-800 flex flex-col md:flex-row items-center justify-between gap-8"
              >
                <div className="max-w-xl relative z-10 space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="gold" size="sm">
                      KOPERASI SYARIKAT ISLAM MANDIRI
                    </Badge>
                    <span className="text-[11px] text-emerald-200 bg-emerald-900/80 px-2.5 py-0.5 rounded-full border border-emerald-700">
                      Berdiri Sejak 1905 • Modernisasi 2026
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-bold text-amber-300 leading-tight">
                    Membangun Ekosistem Ekonomi Umat Berkelanjutan
                  </h1>

                  <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                    Holding Koperasi Syariah yang menaungi 8 unit usaha sektor riil berdaya saing tinggi: ketahanan pangan, maritim perikanan, agrikultur, manufaktur, dan distribusi nasional berlandaskan prinsip Syariah yang amanah dan transparan.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-3">
                    <Button
                      variant="gold"
                      size="md"
                      onClick={() => setShowRegisterModal(true)}
                      leftIcon={<UserPlus className="w-4 h-4" />}
                    >
                      Daftar Jadi Anggota
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      className="bg-white text-emerald-950 font-bold border-2 border-white hover:bg-emerald-50 hover:text-emerald-900 shadow-md"
                      onClick={() => handleNavigate('PORTOFOLIO')}
                      leftIcon={<Package className="w-4 h-4 text-emerald-800" />}
                    >
                      Katalog Komoditas
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      className="bg-emerald-800 hover:bg-emerald-700 text-white font-semibold border border-emerald-600/80 shadow-md"
                      onClick={() => {
                        if (isAuthenticated) {
                          handleNavigate('REPORTS_DASHBOARD');
                        } else {
                          setShowLoginModal(true);
                        }
                      }}
                      leftIcon={<Lock className="w-4 h-4 text-amber-300" />}
                    >
                      Masuk Portal Internal
                    </Button>
                  </div>
                </div>

                {/* Prominent Official Insignia on Hero Banner */}
                <div className="relative z-10 shrink-0 flex flex-col items-center justify-center p-2 sm:p-4">
                  <div className="transition-transform duration-300 hover:scale-105">
                    <KopsimLogo size="hero" badgeBackground={true} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-mono text-amber-300 font-bold uppercase tracking-widest mt-2.5 sm:mt-3 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-700 shadow-xs">
                    Insignia Resmi KOPSIM
                  </span>
                </div>
              </div>

              {/* 3 Pilar Utama Koperasi */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Card
                  title="Sektor Riil & Ketahanan Pangan"
                  subtitle="Aset Produktif Berbasis Syariah"
                  className="hover:border-emerald-700 transition-colors"
                >
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Pengelolaan hulu ke hilir: pertanian terpadu, perikanan tangkap cold-chain, produksi garam mutu industri, serta rantai pasok katering MBG dan daging halal.
                  </p>
                </Card>

                <Card
                  title="Kepatuhan Syariah & GCG"
                  subtitle="Dewan Pengawas Syariah Dr. Hamdan Zoelva"
                  className="hover:border-primary-700 transition-all cursor-pointer group hover:shadow-md"
                  onClick={() => handleNavigate('MANAJEMEN')}
                >
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Setiap simpanan, investasi unit usaha, dan bagi hasil diawasi ketat agar bebas dari riba, gharar, maysir, dan sesuai prinsip Good Corporate Governance.
                  </p>
                  <div className="pt-2.5 mt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px] font-semibold text-primary-700">
                    <span className="group-hover:underline flex items-center gap-1">
                      Tata Kelola & Visi Misi
                      <ArrowRight className="w-3 h-3" />
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-sm font-medium">
                      5 Pilar GCG
                    </span>
                  </div>
                </Card>

                <Card
                  title="Modernisasi Frontend & Supabase"
                  subtitle="Sistem Transparansi Real-Time"
                  className="hover:border-emerald-700 transition-colors"
                >
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Arsitektur modern React/Vite dengan PostgreSQL Supabase menjamin integritas buku jurnal 20 kolom, kalkulasi SHU otomatis, dan penerbitan KTA digital instan.
                  </p>
                </Card>
              </div>

              {/* 8 Sektor Riil Showcase Matrix */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-stone-900 font-serif">
                      8 Strategic Projects (Sektor Riil Unggulan)
                    </h3>
                    <p className="text-xs text-stone-500">Unit usaha produktif binaan Koperasi Syarikat Islam Mandiri</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigate('PROJECT')}
                  >
                    Lihat Monitoring Unit
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { name: 'Kampung Haji', code: 'PRJ-01', cat: 'Properti & Pariwisata Syariah' },
                    { name: 'Trading Ikan', code: 'PRJ-02', cat: 'Maritim & Cold-Chain' },
                    { name: 'Garam Rakyat', code: 'PRJ-03', cat: 'Industri NaCl > 97%' },
                    { name: 'Pertanian Terpadu', code: 'PRJ-04', cat: 'Beras Organik Cianjur' },
                    { name: 'Plywood Industri', code: 'PRJ-05', cat: 'Hardwood SVLK Export' },
                    { name: 'Minyak Merah (RPO)', code: 'PRJ-06', cat: 'Bio-Industri & Vitamin' },
                    { name: 'Supplier MBG', code: 'PRJ-07', cat: 'Rantai Pasok Gizi MBG' },
                    { name: 'Distributor Meatshop', code: 'PRJ-08', cat: 'Daging Prime Cut Halal' },
                  ].map((p) => (
                    <div key={p.code} className="p-3.5 rounded-xl border border-stone-200 bg-white shadow-2xs hover:border-emerald-700 transition-all">
                      <span className="text-[10px] font-mono font-bold text-emerald-800">{p.code}</span>
                      <h4 className="text-xs font-bold text-stone-900 mt-1">{p.name}</h4>
                      <p className="text-[10px] text-stone-500 mt-0.5 truncate">{p.cat}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warta & Berita Sektor Riil Terkini */}
              <HomeNewsSection
                onNavigateNewsList={() => handleNavigate('NEWS_LIST')}
                onSelectArticle={(article) => {
                  setSelectedArticle(article);
                  handleNavigate('NEWS_DETAIL');
                }}
              />

              {/* Call To Action Box Pendaftaran */}
              <div className="p-6 sm:p-8 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="text-base sm:text-lg font-bold text-emerald-950 font-serif">
                    Bergabung Menjadi Anggota Koperasi Syariah Mandiri
                  </h3>
                  <p className="text-xs text-stone-600 max-w-xl">
                    Dapatkan manfaat SHU tahunan, akses KTA digital resmi, dan hak partisipasi pembiayaan proyek sektor riil dengan setoran awal terjangkau.
                  </p>
                </div>
                <Button
                  variant="gold"
                  size="md"
                  onClick={() => setShowRegisterModal(true)}
                  className="shrink-0 shadow-sm"
                  leftIcon={<UserPlus className="w-4 h-4" />}
                >
                  Daftar Sekarang
                </Button>
              </div>
            </div>
          </PageContainer>
        );

      case 'MANAJEMEN':
        return (
          <PageContainer
            title="Tata Kelola & Manajemen (Good Corporate Governance)"
            subtitle="Landasan strategis, visi-misi, 5 pilar GCG, dan prinsip pengawasan syariah Koperasi Syarikat Islam Mandiri"
            breadcrumbs={['Portal Publik', 'Tata Kelola (GCG) & Visi Misi']}
            idPrefix="manajemen"
          >
            <div className="space-y-6">
              {/* Highlight Banner / Komitmen GCG */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-primary-900 via-primary-800 to-primary-950 text-white border border-primary-700 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent-gold font-mono bg-accent-gold/20 px-2.5 py-0.5 rounded-full border border-accent-gold/30">
                      Good Corporate Governance (GCG) Syariah
                    </span>
                    <span className="text-[10px] text-stone-300 font-mono">
                      UU No. 25/1992 & Fatwa DSN-MUI
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-white">
                    Komitmen Integritas, Transparansi, dan Kepatuhan Syariah
                  </h3>
                  <p className="text-xs text-stone-200 leading-relaxed">
                    KOPSIM Mandiri menerapkan standar tata kelola korporasi modern yang akuntabel guna memastikan setiap aset anggota, perputaran modal sektor riil, dan pembagian hasil usaha terkelola secara adil, amanah, dan terhindar dari riba, gharar, dan maysir.
                  </p>
                </div>
                <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => handleNavigate('FILES')}
                    leftIcon={<FileText className="w-3.5 h-3.5" />}
                    className="text-xs font-bold"
                  >
                    Berkas Legalitas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigate('TEAM')}
                    leftIcon={<Users className="w-3.5 h-3.5 text-primary-800" />}
                    className="text-xs bg-white text-primary-950 font-bold hover:bg-emerald-50 hover:text-primary-900 border border-white shadow-xs"
                  >
                    Susunan Pengurus
                  </Button>
                </div>
              </div>

              {/* Grid 1: Visi Misi & 5 Nilai Inti */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card
                  title="Visi & Misi Koperasi"
                  subtitle="Landasan strategis dan arah pembangunan jangka panjang"
                >
                  <div className="space-y-4 text-xs text-stone-700">
                    <div>
                      <h4 className="font-bold text-primary-900 mb-1.5 text-sm flex items-center gap-2">
                        <Award className="w-4 h-4 text-accent-gold" />
                        Visi Organisasi
                      </h4>
                      <p className="leading-relaxed bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200/80 font-medium text-emerald-950 text-xs sm:text-[13px]">
                        "Menjadi koperasi syariah terkemuka yang membangun kemandirian ekonomi umat melalui ekosistem bisnis sektor riil yang terintegrasi dan berkelanjutan."
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-primary-900 mb-2 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary-700" />
                        Misi Utama KOPSIM
                      </h4>
                      <ul className="space-y-2 text-stone-700">
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                          <span>Mengembangkan usaha sektor riil (agrikultur, perikanan maritim, garam, dan logistik) berbasis syariah untuk kesejahteraan anggota.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                          <span>Menciptakan nilai tambah melalui hilirisasi komoditas strategis nasional dan penguatan rantai pasok pangan.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                          <span>Membangun jaringan logistik, pergudangan modern, dan distribusi yang efisien serta berdaya saing pasar domestik maupun ekspor.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                          <span>Menerapkan tata kelola profesional, amanah, akuntabel, dan transparan didukung infrastruktur teknologi pencatatan modern.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </Card>

                <Card
                  title="5 Nilai Inti (Core Values)"
                  subtitle="Prinsip kerja seluruh insan Koperasi Syarikat Islam Mandiri"
                >
                  <div className="space-y-3">
                    {[
                      {
                        num: '1',
                        name: 'Syariah',
                        color: 'bg-emerald-50 text-emerald-900 border-emerald-200',
                        desc: 'Kepatuhan mutlak pada syariat Islam dan fatwa Dewan Syariah Nasional (DSN-MUI) dalam setiap akad dan muamalah.',
                      },
                      {
                        num: '2',
                        name: 'Profesional',
                        color: 'bg-blue-50 text-blue-900 border-blue-200',
                        desc: 'Kompetensi teruji, berintegritas tinggi, disiplin operasional, dan fokus pada pencapaian hasil terbaik.',
                      },
                      {
                        num: '3',
                        name: 'Sinergi',
                        color: 'bg-amber-50 text-amber-900 border-amber-200',
                        desc: 'Kolaborasi produktif yang saling menguatkan antar anggota, kelompok tani/nelayan, mitra usaha, dan pemerintah.',
                      },
                      {
                        num: '4',
                        name: 'Transparan',
                        color: 'bg-purple-50 text-purple-900 border-purple-200',
                        desc: 'Keterbukaan pelaporan keuangan real-time, akuntabilitas audit buku jurnal 20 kolom, dan keterbukaan operasional.',
                      },
                      {
                        num: '5',
                        name: 'Berkelanjutan',
                        color: 'bg-stone-50 text-stone-900 border-stone-200',
                        desc: 'Membangun ekosistem bisnis berjangka panjang yang ramah lingkungan dan mewariskan kemandirian ekonomi bagi generasi mendatang.',
                      },
                    ].map((v) => (
                      <div key={v.num} className={`p-3 rounded-xl border flex items-start gap-3 ${v.color}`}>
                        <span className="w-6 h-6 rounded-lg bg-white/80 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {v.num}
                        </span>
                        <div>
                          <span className="text-xs font-bold block">{v.name}</span>
                          <span className="text-[11px] opacity-90 mt-0.5 leading-relaxed block">{v.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Grid 2: 5 Pilar Good Corporate Governance (GCG) */}
              <Card
                title="5 Pilar Utama Good Corporate Governance (GCG)"
                subtitle="Pedoman baku kepatuhan tata kelola perkoperasian modern yang bersih dan berkeadilan"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2 hover:border-primary-600 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-stone-900 text-sm">1. Transparansi (Transparency)</h4>
                    </div>
                    <p className="text-stone-600 leading-relaxed text-[11px]">
                      Keterbukaan akses informasi relevan bagi seluruh anggota. Pencatatan transaksi buku jurnal kas terdistribusi, transparansi biaya/margin usaha, serta laporan perkembangan proyek komoditas yang dapat diverifikasi.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2 hover:border-primary-600 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
                        <Scale className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-stone-900 text-sm">2. Akuntabilitas (Accountability)</h4>
                    </div>
                    <p className="text-stone-600 leading-relaxed text-[11px]">
                      Kejelasan fungsi, struktur, dan pertanggungjawaban organ koperasi (Pengurus, Pengawas, dan Dewan Pengawas Syariah). Seluruh kinerja dipertanggungjawabkan dalam forum resmi Rapat Anggota Tahunan (RAT).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2 hover:border-primary-600 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-stone-900 text-sm">3. Responsibilitas (Responsibility)</h4>
                    </div>
                    <p className="text-stone-600 leading-relaxed text-[11px]">
                      Kesesuaian pengelolaan koperasi terhadap peraturan perundang-undangan perkoperasian yang berlaku, regulasi perizinan usaha Kemenkumham, serta tanggung jawab sosial pemberdayaan ekonomi masyarakat sekitar.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2 hover:border-primary-600 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-purple-100 text-purple-800">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-stone-900 text-sm">4. Independensi (Independency)</h4>
                    </div>
                    <p className="text-stone-600 leading-relaxed text-[11px]">
                      Pengelolaan organisasi secara objektif dan profesional tanpa benturan kepentingan (*conflict of interest*) maupun intervensi pihak luar yang dapat merugikan kepentingan sah anggota koperasi.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2 hover:border-primary-600 transition-colors sm:col-span-2 lg:col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                        <Award className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-stone-900 text-sm">5. Kewajaran & Kesetaraan (Fairness)</h4>
                    </div>
                    <p className="text-stone-600 leading-relaxed text-[11px]">
                      Keadilan dan kesetaraan dalam memenuhi hak-hak anggota yang timbul berdasarkan perjanjian dan peraturan perundang-undangan. Setiap anggota—mulai dari petani, nelayan, hingga penyimpan dana—memperoleh porsi bagi hasil dan Sisa Hasil Usaha (SHU) secara proporsional dan adil.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Grid 3: Dewan Pengawas Syariah & Struktur Pengawasan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card
                  title="Dewan Pengawas Syariah (DPS)"
                  subtitle="Kepatuhan fatwa dan audit akad syariah"
                >
                  <div className="space-y-3.5 text-xs text-stone-700">
                    <div className="flex items-center gap-3.5 p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-accent-gold shadow-md shrink-0 bg-stone-100 ring-2 ring-amber-400/20 relative">
                        <img
                          src="/assets/hamdan.jpg"
                          alt="Dr. Hamdan Zoelva, S.H., M.H."
                          width={64}
                          height={64}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          style={{ objectPosition: '50% 12%' }}
                          className="w-full h-full object-cover scale-105"
                          onError={(e) => {
                            // Fallback jika terjadi error muat gambar
                            const target = e.currentTarget as HTMLImageElement;
                            target.onerror = null;
                            target.src = '/assets/logo-kopsim.png';
                          }}
                        />
                      </div>
                      <div>
                        <h4 className="font-bold text-stone-900 text-sm sm:text-[15px]">Dr. Hamdan Zoelva, S.H., M.H.</h4>
                        <span className="text-[11px] text-accent-gold-dark font-semibold block">Ketua Dewan Pengawas Syariah</span>
                        <span className="text-[10px] text-stone-500 mt-0.5 block">Mantan Ketua Mahkamah Konstitusi RI & Pakar Hukum Tata Negara</span>
                      </div>
                    </div>

                    <p className="text-stone-600 leading-relaxed">
                      Dewan Pengawas Syariah bertugas memberikan opini, rekomendasi, serta pengawasan berkala atas seluruh produk simpanan, pembiayaan modal kerja, dan akad kerjasama komoditas sektor riil agar senantiasa selaras dengan tuntunan syariat Islam.
                    </p>

                    <div className="pt-2 border-t border-stone-100 space-y-1.5">
                      <span className="text-[11px] font-bold text-stone-800 block">Akad Muamalah yang Digunakan:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {['Murabahah (Jual-Beli)', 'Mudharabah (Bagi Hasil)', 'Musyarakah (Kemitraan Modal)', 'Ijarah (Sewa/Jasa)', 'Salam / Istishna (Pesanan Komoditas)'].map((akad) => (
                          <span key={akad} className="text-[10px] bg-stone-100 text-stone-800 px-2.5 py-1 rounded-md font-medium border border-stone-200">
                            {akad}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card
                  title="Legalitas & Badan Hukum Resmi"
                  subtitle="Status terdaftar dan pengawasan perizinan"
                >
                  <div className="space-y-3 text-xs text-stone-700">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg border border-stone-200">
                        <span className="font-semibold text-stone-800">Status Badan Hukum:</span>
                        <span className="font-mono font-bold text-primary-800">Terdaftar Kemenkumham RI</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg border border-stone-200">
                        <span className="font-semibold text-stone-800">Afiliasi Gerakan:</span>
                        <span className="font-mono font-bold text-stone-800">Syarikat Islam (Est. 1905)</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg border border-stone-200">
                        <span className="font-semibold text-stone-800">Prinsip Akuntansi:</span>
                        <span className="font-mono font-bold text-stone-800">Buku Jurnal 20 Kolom & SAK ETAP</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Dokumen Anggaran Dasar (AD), Anggaran Rumah Tangga (ART), Nomor Induk Berusaha (NIB), dan perizinan komoditas tersedia pada repositori Berkas Publik untuk diunduh dan dipelajari oleh anggota dan calon mitra.
                    </p>

                    <div className="pt-2 flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleNavigate('FILES')}
                        leftIcon={<FileText className="w-3.5 h-3.5" />}
                        className="text-xs"
                      >
                        Buka Repositori Berkas
                      </Button>
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={() => setShowRegisterModal(true)}
                        leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                        className="text-xs"
                      >
                        Daftar Anggota
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </PageContainer>
        );

      case 'PORTOFOLIO':
        return (
          <PageContainer
            title="Katalog Pasok Komoditas Sektor Riil"
            subtitle="Spesifikasi mutu komoditas perikanan, pertanian, garam, sawit merah, dan peternakan siap pasok"
            breadcrumbs={['Portal Publik', 'Katalog Komoditas']}
            idPrefix="portfolio-view"
          >
            <PortfolioMarketplaceView onOpenRegister={() => setShowRegisterModal(true)} />
          </PageContainer>
        );

      case 'HISTORY':
        return (
          <PageContainer
            title="Sejarah & Jejak Langkah Perjuangan"
            subtitle="Meneruskan amanah kemandirian ekonomi Sarekat Dagang Islam 1905 hingga modernisasi sistem 2026"
            breadcrumbs={['Portal Publik', 'Sejarah']}
            idPrefix="history-view"
          >
            <HistoryView />
          </PageContainer>
        );

      case 'TEAM':
        return (
          <PageContainer
            title="Dewan Pengawas Syariah & Pengurus Koperasi"
            subtitle="Struktur kepengurusan amanah dan kepemimpinan Koperasi Syarikat Islam Mandiri"
            breadcrumbs={['Portal Publik', 'Tim Pengurus']}
            idPrefix="team-view"
          >
            <TeamView />
          </PageContainer>
        );

      case 'NEWS_LIST':
        return (
          <PageContainer
            title="Kanal Berita & Warta Sektor Riil"
            subtitle="Warta kemitraan strategis, inisiatif program, dampak ekonomi, dan laporan perkembangan proyek KOPSIM Mandiri"
            breadcrumbs={['Portal Publik', 'Kanal Berita']}
            idPrefix="news-list-page"
          >
            <NewsListView
              onSelectArticle={(article) => {
                setSelectedArticle(article);
                handleNavigate('NEWS_DETAIL');
              }}
              onNavigatePortfolio={() => handleNavigate('PORTOFOLIO')}
            />
          </PageContainer>
        );

      case 'NEWS_DETAIL':
        return (
          <PageContainer
            title={selectedArticle ? selectedArticle.judul : 'Detail Artikel Berita'}
            subtitle="Warta Resmi Koperasi Syarikat Islam Mandiri"
            breadcrumbs={['Portal Publik', 'Kanal Berita', 'Detail']}
            idPrefix="news-detail-page"
          >
            {selectedArticle ? (
              <NewsDetailView
                article={selectedArticle}
                onBack={() => handleNavigate('NEWS_LIST')}
                onNavigatePortfolio={() => handleNavigate('PORTOFOLIO')}
              />
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-stone-200">
                <p className="text-stone-600 mb-4 text-xs">Artikel tidak ditemukan atau belum dipilih.</p>
                <Button variant="primary" size="sm" onClick={() => handleNavigate('NEWS_LIST')}>
                  Kembali ke Daftar Berita
                </Button>
              </div>
            )}
          </PageContainer>
        );

      // =========================================================================
      // BOUNDARY 2: MEMBER PORTAL
      // =========================================================================
      case 'MEMBER_PORTAL':
        return (
          <PageContainer
            title="Portal Layanan & Buku Simpanan Anggota"
            subtitle="Informasi saldo simpanan syariah terverifikasi, riwayat mutasi, dan Kartu Tanda Anggota (KTA) Digital resmi"
            breadcrumbs={['Portal Layanan', 'Portal Khusus Anggota']}
            idPrefix="member-portal-view"
          >
            <RoleGuard
              allowedRoles={['ADMIN', 'DIRECTOR', 'ANGGOTA']}
              onRequestLogin={() => setShowLoginModal(true)}
              onGoHome={() => handleNavigate('HOME')}
            >
              {renderModuleWithSuspense(<MemberPortalView />, 'Portal Anggota')}
            </RoleGuard>
          </PageContainer>
        );

      case 'FILES':
        return (
          <PageContainer
            title="Repositori Berkas & Dokumen Internal"
            subtitle="Penyimpanan digital AD/ART, SK Kemenkumham, sertifikat halal, dan slip transfer"
            breadcrumbs={['Portal Internal', '8. Repositori Berkas']}
            idPrefix="files-view"
          >
            <RoleGuard
              allowedRoles={['ADMIN', 'DIRECTOR']}
              onRequestLogin={() => setShowLoginModal(true)}
              onGoHome={() => handleNavigate('HOME')}
            >
              <FileManagementView />
            </RoleGuard>
          </PageContainer>
        );

      // =========================================================================
      // BOUNDARY 3: ADMIN & MANAGEMENT PORTAL (PROTECTED BY ROLE GUARD)
      // =========================================================================
      case 'REPORTS_DASHBOARD':
        return (
          <PageContainer
            title="Dashboard Eksekutif — Sistem Internal"
            subtitle="Ringkasan performa finansial, simpanan anggota, dan perputaran modal 8 project strategis"
            breadcrumbs={['Portal Internal', '1. Dashboard']}
            idPrefix="report-dashboard"
          >
            <RoleGuard
              allowedRoles={['ADMIN', 'DIRECTOR']}
              onRequestLogin={() => setShowLoginModal(true)}
              onGoHome={() => handleNavigate('HOME')}
            >
              {renderModuleWithSuspense(<DashboardShell />, 'Dashboard Eksekutif')}
            </RoleGuard>
          </PageContainer>
        );

      case 'MEMBERSHIP':
      case 'REPORTS_KEANGGOTAAN':
        return (
          <PageContainer
            title="Database Keanggotaan & KTA Digital"
            subtitle="Pencatatan data anggota, penerbitan Kartu Tanda Anggota (KTA) digital, dan histori kepesertaan"
            breadcrumbs={['Portal Internal', '2. Keanggotaan']}
            idPrefix="membership-view"
          >
            <RoleGuard
              allowedRoles={['ADMIN', 'DIRECTOR']}
              onRequestLogin={() => setShowLoginModal(true)}
              onGoHome={() => handleNavigate('HOME')}
            >
              {renderModuleWithSuspense(<MembershipModule />, 'Keanggotaan & KTA')}
            </RoleGuard>
          </PageContainer>
        );

      case 'SIMPANAN':
        return (
          <PageContainer
            title="Buku Simpanan & Tabungan Syariah"
            subtitle="Simpanan Pokok (Rp 500k), Simpanan Wajib (Rp 360k/3th), dan Simpanan Sukarela Manasuka"
            breadcrumbs={['Portal Internal', '3. Simpanan']}
            idPrefix="simpanan-view"
          >
            <RoleGuard
              allowedRoles={['ADMIN', 'DIRECTOR']}
              onRequestLogin={() => setShowLoginModal(true)}
              onGoHome={() => handleNavigate('HOME')}
            >
              {renderModuleWithSuspense(<SimpananModule />, 'Simpanan')}
            </RoleGuard>
          </PageContainer>
        );

      case 'TRANSACTIONS':
        return (
          <PageContainer
            title="Buku Transaksi Kas & Komoditas 20 Kolom"
            subtitle="Pencatatan standar debet-kredit, referal pusat, cabang, serta komoditas riil"
            breadcrumbs={['Portal Internal', '4. Transaksi 20 Kolom']}
            idPrefix="transactions-view"
          >
            <RoleGuard
              allowedRoles={['ADMIN', 'DIRECTOR']}
              onRequestLogin={() => setShowLoginModal(true)}
              onGoHome={() => handleNavigate('HOME')}
            >
              {renderModuleWithSuspense(<TransactionModule />, 'Transaksi 20 Kolom')}
            </RoleGuard>
          </PageContainer>
        );

      case 'FINANCE':
        return (
          <PageContainer
            title="Finance & Likuiditas Entitas"
            subtitle="Pemisahan kas induk pusat, wilayah cabang daerah, dan rekening operasional resmi (BSI & Mandiri)"
            breadcrumbs={['Portal Internal', '5. Finance']}
            idPrefix="finance-view"
          >
            <RoleGuard
              allowedRoles={['ADMIN', 'DIRECTOR']}
              onRequestLogin={() => setShowLoginModal(true)}
              onGoHome={() => handleNavigate('HOME')}
            >
              {renderModuleWithSuspense(<FinanceModule />, 'Finance & Likuiditas')}
            </RoleGuard>
          </PageContainer>
        );

      case 'PROJECT':
      case 'REPORTS_PROJECT':
        return (
          <PageContainer
            title="Monitoring 8 Strategic Projects Sektor Riil"
            subtitle="Pengawasan operasional Kampung Haji, Trading Ikan, Garam, Pertanian, Plywood, Sawit, MBG & Meatshop"
            breadcrumbs={['Portal Internal', '6. 8 Projects']}
            idPrefix="project-view"
          >
            <RoleGuard
              allowedRoles={['ADMIN', 'DIRECTOR']}
              onRequestLogin={() => setShowLoginModal(true)}
              onGoHome={() => handleNavigate('HOME')}
            >
              {renderModuleWithSuspense(<ProjectModule />, 'Monitoring Proyek')}
            </RoleGuard>
          </PageContainer>
        );

      case 'REPORTS_KEUANGAN':
        return (
          <PageContainer
            title="Laporan Keuangan & Perhitungan SHU"
            subtitle="Jurnal umum, buku besar COA, neraca saldo, laba rugi, neraca, dan alokasi SHU (25% Cadangan)"
            breadcrumbs={['Portal Internal', '7. Laporan & SHU']}
            idPrefix="reports-keuangan-view"
          >
            <RoleGuard
              allowedRoles={['ADMIN', 'DIRECTOR']}
              onRequestLogin={() => setShowLoginModal(true)}
              onGoHome={() => handleNavigate('HOME')}
            >
              {renderModuleWithSuspense(<ReportsModule initialTab="JURNAL" />, 'Laporan Keuangan')}
            </RoleGuard>
          </PageContainer>
        );

      case 'DATABASE_AUDIT':
        return (
          <PageContainer
            title="Audit Menyeluruh & Master Data Supabase (11 Tabel)"
            subtitle="Pemeriksaan status koneksi live, skema kolom, latensi respon, sinkronisasi cloud, dan modul CRUD 11 tabel"
            breadcrumbs={['Portal Internal', '9. Supabase Audit & Master Data']}
            idPrefix="supabase-audit-view"
          >
            <RoleGuard
              allowedRoles={['ADMIN', 'DIRECTOR']}
              onRequestLogin={() => setShowLoginModal(true)}
              onGoHome={() => handleNavigate('HOME')}
            >
              {renderModuleWithSuspense(<SupabaseAuditModule />, 'Audit Database')}
            </RoleGuard>
          </PageContainer>
        );

      case 'NEWS_ADMIN':
        return (
          <PageContainer
            title="Pengelolaan Berita & Warta Sektor Riil (CMS)"
            subtitle="Penyusunan draft narasi, pelengkapan fakta riil, dan publikasi artikel resmi koperasi"
            breadcrumbs={['Portal Internal', '10. Kelola Berita (CMS)']}
            idPrefix="news-admin-page"
          >
            <RoleGuard
              allowedRoles={['ADMIN']}
              onRequestLogin={() => setShowLoginModal(true)}
              onGoHome={() => handleNavigate('HOME')}
            >
              {renderModuleWithSuspense(<NewsAdminModule />, 'CMS Berita')}
            </RoleGuard>
          </PageContainer>
        );

      case 'LOANS':
        return (
          <PageContainer
            title="Simulasi & Pengajuan Pembiayaan Syariah"
            subtitle="Kalkulator pembiayaan bagi hasil, jadwal amortisasi resmi, dan pengajuan modal kerja"
            breadcrumbs={['Layanan Koperasi', 'Simulasi Pembiayaan']}
            idPrefix="loans-view-page"
          >
            {renderModuleWithSuspense(<LoanSimulatorModule />, 'Simulasi Pembiayaan')}
          </PageContainer>
        );

      case 'NOTIFICATIONS':
        return (
          <PageContainer
            title="Pusat Notifikasi & Automasi Multi-Channel"
            subtitle="Kotak masuk pengumuman, riwayat pesan WhatsApp/Email, dan antrean pengiriman background jobs"
            breadcrumbs={['Layanan Koperasi', 'Pusat Notifikasi']}
            idPrefix="notifications-view-page"
          >
            {renderModuleWithSuspense(<NotificationCenterModule />, 'Pusat Notifikasi')}
          </PageContainer>
        );

      case 'PAYMENTS':
        return (
          <PageContainer
            title="Gerbang Pembayaran & Setoran Online"
            subtitle="Setoran simpanan wajib, pokok, sukarela, dan angsuran pinjaman via QRIS dan Virtual Account"
            breadcrumbs={['Layanan Koperasi', 'Gerbang Pembayaran']}
            idPrefix="payments-view-page"
          >
            {renderModuleWithSuspense(<PaymentGatewayModule />, 'Gerbang Pembayaran')}
          </PageContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-800" id="kopsim-app-root">
      {/* Dynamic SEO Meta & Schema.org JSON-LD */}
      <SEOHead activePage={activePage} article={selectedArticle} />

      {/* Top Navigation Bar */}
      <TopNavbar
        activePage={activePage}
        onNavigate={handleNavigate}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onRequestLogin={() => setShowLoginModal(true)}
        onOpenRegister={() => setShowRegisterModal(true)}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex min-h-0 pb-16 lg:pb-0">
        {/* Sidebar */}
        <Sidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onRequestLogin={() => setShowLoginModal(true)}
          onOpenRegister={() => setShowRegisterModal(true)}
        />

        {/* Dynamic Main View */}
        <main className="flex-1 overflow-y-auto flex flex-col min-w-0" id="kopsim-main-view">
          <div className="flex-1">{renderContent()}</div>
          <Footer onNavigate={handleNavigate} />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activePage={activePage}
        onNavigate={handleNavigate}
        onOpenRegister={() => setShowRegisterModal(true)}
        onRequestLogin={() => setShowLoginModal(true)}
      />

      {/* Public Online Registration Modal (Loaded on demand) */}
      {showRegisterModal && (
        <Suspense fallback={null}>
          <PublicRegisterModal
            isOpen={showRegisterModal}
            onClose={() => setShowRegisterModal(false)}
            onSuccess={() => {
              showToast('Data pendaftaran Anda telah tersimpan di sistem.', 'success');
            }}
          />
        </Suspense>
      )}

      {/* Internal Portal Login Modal */}
      {showLoginModal && (
        <div
          id="login-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/65 backdrop-blur-xs"
        >
          <LoginForm
            isModal
            onSuccess={(loggedInRole) => {
              setShowLoginModal(false);
              if (loggedInRole === 'ANGGOTA') {
                handleNavigate('MEMBER_PORTAL');
              } else {
                handleNavigate('REPORTS_DASHBOARD');
              }
            }}
            onCancel={() => setShowLoginModal(false)}
          />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}
