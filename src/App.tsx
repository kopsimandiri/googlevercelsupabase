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
                  className="hover:border-emerald-700 transition-colors"
                >
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Setiap simpanan, investasi unit usaha, dan bagi hasil diawasi ketat agar bebas dari riba, gharar, maysir, dan sesuai prinsip Good Corporate Governance.
                  </p>
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
            subtitle="Landasan strategis, visi-misi, dan prinsip kerja pengurus Koperasi Syarikat Islam Mandiri"
            breadcrumbs={['Portal Publik', 'Tata Kelola']}
            idPrefix="manajemen"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card
                  title="Visi & Misi Koperasi"
                  subtitle="Landasan strategis organisasi"
                >
                  <div className="space-y-4 text-xs text-stone-700">
                    <div>
                      <h4 className="font-bold text-emerald-900 mb-1 text-sm">Visi</h4>
                      <p className="leading-relaxed bg-emerald-50/60 p-3 rounded-lg border border-emerald-200/70 font-medium">
                        "Menjadi koperasi syariah terkemuka yang membangun kemandirian ekonomi umat melalui ekosistem bisnis sektor riil yang terintegrasi dan berkelanjutan."
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-900 mb-1 text-sm">Misi Utama</h4>
                      <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
                        <li>Mengembangkan sektor riil berbasis syariah untuk kesejahteraan anggota secara berkelanjutan.</li>
                        <li>Menciptakan nilai tambah melalui hilirisasi komoditas strategis nasional.</li>
                        <li>Membangun jaringan logistik dan distribusi yang efisien serta berdaya saing global.</li>
                        <li>Menerapkan tata kelola profesional, amanah, akuntabel, dan transparan.</li>
                      </ul>
                    </div>
                  </div>
                </Card>

                <Card
                  title="5 Nilai Inti (Core Values)"
                  subtitle="Prinsip kerja seluruh insan KOPSIM Mandiri"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { name: '1. Syariah', desc: 'Kepatuhan mutlak pada syariat Islam dan fatwa DSN-MUI.' },
                      { name: '2. Profesional', desc: 'Kompetensi teruji, berintegritas, dan berorientasi hasil.' },
                      { name: '3. Sinergi', desc: 'Kolaborasi produktif antar anggota, petani, dan mitra bisnis.' },
                      { name: '4. Transparan', desc: 'Keterbukaan pelaporan keuangan real-time dan akuntabel.' },
                      { name: '5. Berkelanjutan', desc: 'Memberikan manfaat ekonomi jangka panjang bagi generasi umat.' },
                    ].map((v, i) => (
                      <div key={i} className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                        <span className="text-xs font-bold text-emerald-950 block">{v.name}</span>
                        <span className="text-[11px] text-stone-600 mt-0.5 leading-tight block">{v.desc}</span>
                      </div>
                    ))}
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
          <Footer />
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
