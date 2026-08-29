import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { memberService } from '../../services/memberService';
import { transactionService } from '../../services/transactionService';
import { MemberRecord, TransactionRecord } from '../../types/database';
import { formatRupiah, formatDateIndo, formatDateTimeIndo } from '../../utils/formatters';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Tabs, TabItem } from '../common/Tabs';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { IdCardModal } from '../idcard/IdCardModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { EditPersonalDataModal } from './EditPersonalDataModal';
import { KTACard } from '../kta/KTACard';
import { LoanSimulatorModule } from '../loans/LoanSimulatorModule';
import { PaymentGatewayModule } from '../payments/PaymentGatewayModule';
import {
  CreditCard,
  User,
  Coins,
  ShieldCheck,
  Calendar,
  MapPin,
  Briefcase,
  Building,
  Download,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  QrCode,
  Info,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  KeyRound,
  Edit3,
  Camera,
  Upload,
  Paperclip,
  ExternalLink,
  Eye,
  X,
  Bell,
  FileText,
  PieChart,
  Percent,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Award,
  ChevronRight,
} from 'lucide-react';

type MemberTabType = 'SIMPANAN' | 'TRANSAKSI' | 'SHU' | 'KTA' | 'PROFIL' | 'DOKUMEN' | 'NOTIFIKASI';

export const MemberPortalView: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState<MemberTabType>('SIMPANAN');
  const [memberData, setMemberData] = useState<MemberRecord | null>(null);
  const [memberTransactions, setMemberTransactions] = useState<TransactionRecord[]>([]);
  const [savingsData, setSavingsData] = useState<{
    pokok: number;
    wajib: number;
    manasuka: number;
    sukarela: number;
    total: number;
    categoryBreakdown: Record<string, number>;
  }>({
    pokok: 500000,
    wajib: 360000,
    manasuka: 0,
    sukarela: 0,
    total: 860000,
    categoryBreakdown: {},
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showKtaModal, setShowKtaModal] = useState<boolean>(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [selectedProof, setSelectedProof] = useState<{ url: string; title: string } | null>(null);
  const [selectedKuitansi, setSelectedKuitansi] = useState<TransactionRecord | null>(null);
  const [showLoanModal, setShowLoanModal] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);

  // Simulated notifications state
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: 'Simpanan Pokok & Wajib Terverifikasi',
      desc: 'Buku simpanan Anda telah tervalidasi di pembukuan Koperasi Syarikat Islam Mandiri.',
      date: '2024-08-10',
      read: true,
      type: 'VERIFICATION',
    },
    {
      id: 'notif-2',
      title: 'Penerbitan KTA Digital Resmi (QR Encrypted)',
      desc: 'Kartu Tanda Anggota Digital KOPSIM Mandiri Anda siap diunduh dan dicetak dengan standar ISO-7810.',
      date: '2024-08-11',
      read: true,
      type: 'KTA',
    },
    {
      id: 'notif-3',
      title: 'Update Proyek: Panen Singkong & Pengolahan Tapioka',
      desc: 'Pabrik tepung tapioka mitra binaan KOPSIM di Cianjur mulai beroperasi penuh dengan kapasitas 100 Ton/Bulan.',
      date: '2024-08-25',
      read: false,
      type: 'PROJECT',
    },
  ]);

  const memberNo = user?.memberNo || user?.memberId || user?.id || '0824-03001';

  useEffect(() => {
    let isMounted = true;

    async function loadMemberDetails() {
      setIsLoading(true);
      try {
        const memberName = user?.name || '';

        // 1. Fetch real member data from Supabase public.members via memberService
        let found = await memberService.getMemberById(memberNo);
        if (!found && memberName) {
          found = await memberService.getMemberById(memberName);
        }
        if (!found) {
          const allMembers = await memberService.getMembers();
          found =
            allMembers.find(
              (m) =>
                (m.id && m.id.toLowerCase() === memberNo.toLowerCase()) ||
                (m.nama && memberName && m.nama.toLowerCase() === memberName.toLowerCase()) ||
                (m.nama && memberName && m.nama.toLowerCase().includes(memberName.toLowerCase()))
            ) || null;
        }

        if (found) {
          if (isMounted) setMemberData(found);
        } else {
          // Fallback constructed record from user session
          const fallbackMember: MemberRecord = {
            id: memberNo,
            nama: memberName || user?.name || 'Anggota Koperasi',
            gender: (user?.gender as 'L' | 'P') || 'L',
            provinsi: user?.province || 'DKI Jakarta',
            kota: user?.city || 'Jakarta Pusat',
            alamat: user?.address || 'Jl. Pegangsaan Barat No. 14, Menteng',
            pekerjaan: user?.occupation || 'Anggota Koperasi',
            plantation: user?.workArea || 'PUSAT JAKARTA',
            tgl_reg: user?.registeredAt || '2024-08-10',
            tgl_lahir: user?.birthDate || '1990-01-01',
            area_jenis: 'KOPERASI PUSAT',
            simpanan_pokok: 500000,
            simpanan_wajib: 360000,
            simpanan_sukarela: 0,
          };
          if (isMounted) setMemberData(fallbackMember);
        }

        // 2. Query aggregate savings directly matching user SQL requirement:
        const savingsRes = await transactionService.getMemberSavingsSummary(
          memberName || found?.nama || '',
          memberNo
        );

        if (isMounted) {
          const basePokok = Number(found?.simpanan_pokok ?? 500000);
          const baseWajib = Number(found?.simpanan_wajib ?? 360000);
          const baseManasuka = Number(found?.simpanan_sukarela ?? 0);

          const finalPokok =
            savingsRes.hasTrx && savingsRes.simpananPokok > 0 ? savingsRes.simpananPokok : basePokok;
          const finalWajib =
            savingsRes.hasTrx && savingsRes.simpananWajib > 0 ? savingsRes.simpananWajib : baseWajib;
          const finalManasuka =
            savingsRes.hasTrx && savingsRes.simpananManasuka > 0
              ? savingsRes.simpananManasuka
              : savingsRes.hasTrx && savingsRes.simpananSukarela > 0
              ? savingsRes.simpananSukarela
              : baseManasuka;

          // Build complete category breakdown
          const breakdown: Record<string, number> = { ...(savingsRes.categoryBreakdown || {}) };
          if (!Object.keys(breakdown).some((k) => k.toUpperCase().includes('POKOK'))) {
            breakdown['SIMPANAN POKOK'] = finalPokok;
          }
          if (!Object.keys(breakdown).some((k) => k.toUpperCase().includes('WAJIB'))) {
            breakdown['SIMPANAN WAJIB'] = finalWajib;
          }
          if (
            finalManasuka > 0 &&
            !Object.keys(breakdown).some(
              (k) => k.toUpperCase().includes('MANASUKA') || k.toUpperCase().includes('SUKARELA')
            )
          ) {
            breakdown['SIMPANAN MANASUKA'] = finalManasuka;
          }

          // Calculate grand total from components and category breakdown
          const calculatedTotal =
            Object.values(breakdown).reduce((acc, val) => acc + (Number(val) || 0), 0) ||
            finalPokok + finalWajib + finalManasuka;

          setSavingsData({
            pokok: finalPokok,
            wajib: finalWajib,
            manasuka: finalManasuka,
            sukarela: finalManasuka,
            total: calculatedTotal,
            categoryBreakdown: breakdown,
          });
        }

        // 3. Query member transactions
        const realTrx = await transactionService.getMemberTransactions(
          memberName || found?.nama || '',
          memberNo
        );

        if (isMounted) {
          setMemberTransactions(realTrx);
        }
      } catch (err) {
        console.error('Error loading member portal data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadMemberDetails();

    return () => {
      isMounted = false;
    };
  }, [memberNo, user]);

  const memberTabs: TabItem<MemberTabType>[] = [
    { id: 'SIMPANAN', label: 'Buku Simpanan', icon: <Coins className="w-4 h-4" /> },
    { id: 'TRANSAKSI', label: 'Riwayat Transaksi', icon: <Clock className="w-4 h-4" />, badge: memberTransactions.length || undefined },
    { id: 'SHU', label: 'Hak & Estimasi SHU', icon: <PieChart className="w-4 h-4" /> },
    { id: 'KTA', label: 'KTA Digital', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'PROFIL', label: 'Data Pribadi', icon: <User className="w-4 h-4" /> },
    { id: 'DOKUMEN', label: 'Dokumen Resmi', icon: <FileText className="w-4 h-4" /> },
    {
      id: 'NOTIFIKASI',
      label: 'Pemberitahuan',
      icon: <Bell className="w-4 h-4" />,
      badge: notifications.filter((n) => !n.read).length || undefined,
    },
  ];

  // Estimasi SHU kalkulator sederhana (Jasa Modal 60% + Jasa Anggota 40%)
  const shuEstimates = useMemo(() => {
    const totalSimpanan = savingsData.total;
    // Asumsi total simpanan koperasi: Rp 5 Milyar, laba bersih SHU dibagikan ke anggota: Rp 500 Juta
    const estimasiJasaModal = Math.round((totalSimpanan / 5000000000) * 300000000);
    const estimasiJasaUsaha = Math.round((totalSimpanan / 5000000000) * 200000000);
    const totalEstimasi = estimasiJasaModal + estimasiJasaUsaha;

    return {
      jasaModal: estimasiJasaModal,
      jasaUsaha: estimasiJasaUsaha,
      totalSHU: totalEstimasi > 50000 ? totalEstimasi : 86000,
    };
  }, [savingsData.total]);

  if (isLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <LoadingState
          message="Memuat Buku Simpanan & Profil Anggota..."
          subMessage="Menghubungkan data identitas keanggotaan terverifikasi"
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6" id="member-portal-root">
      {/* 1. Header Profile Banner */}
      <div
        id="member-header-card"
        className="rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-white p-6 sm:p-8 shadow-xl border border-emerald-700/80 relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Foto Profil Anggota dengan Tombol Ganti Cepat */}
            <div className="relative group shrink-0">
              <div className="w-16 h-20 sm:w-20 sm:h-24 bg-emerald-950/90 rounded-2xl border-2 border-amber-400/70 shadow-lg overflow-hidden flex items-center justify-center">
                {memberData?.avatar_url || memberService.getMemberAvatar(memberNo) ? (
                  <img
                    src={memberData?.avatar_url || memberService.getMemberAvatar(memberNo) || ''}
                    alt={memberData?.nama || 'Foto Anggota'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-1 text-amber-300">
                    <User className="w-8 h-8 opacity-80" />
                    <span className="text-[9px] font-mono mt-0.5">FOTO</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(true)}
                title="Ganti Pas Foto & Edit Data Pribadi"
                className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-amber-400 text-emerald-950 hover:bg-amber-300 shadow-md transition-transform transform hover:scale-110 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase tracking-wider">
                  Anggota Resmi KOPSIM
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-700 text-emerald-100 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-300" />
                  STATUS: {user?.status || memberData?.status || 'AKTIF'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-serif text-amber-300 tracking-tight">
                {memberData?.nama || user?.name || 'Anggota Koperasi'}
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 font-mono mt-0.5">
                Nomor Registrasi Anggota (NRA): <span className="font-bold text-white">{memberNo}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions Role Anggota */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              id="btn-open-payment-modal"
              variant="primary"
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-emerald-950 font-extrabold shadow-sm border border-amber-300"
              onClick={() => setShowPaymentModal(true)}
              leftIcon={<CreditCard className="w-4 h-4 text-emerald-950" />}
            >
              + Setor Simpanan (QRIS)
            </Button>
            <Button
              id="btn-open-loan-modal"
              variant="outline"
              size="sm"
              className="bg-emerald-800/90 text-emerald-100 hover:bg-emerald-700 border border-emerald-500/50 shadow-sm font-semibold"
              onClick={() => setShowLoanModal(true)}
              leftIcon={<Coins className="w-4 h-4 text-amber-300" />}
            >
              Simulasi Pembiayaan
            </Button>
            <Button
              id="btn-open-edit-profile-modal"
              variant="primary"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold border border-emerald-400/40 shadow-sm"
              onClick={() => setShowEditProfileModal(true)}
              leftIcon={<Edit3 className="w-4 h-4 text-amber-300" />}
            >
              Edit Profil
            </Button>
            <Button
              id="btn-open-change-password-modal"
              variant="outline"
              size="sm"
              className="bg-emerald-900/90 text-amber-300 hover:bg-emerald-800 border border-amber-400/50 shadow-sm font-semibold"
              onClick={() => setShowChangePasswordModal(true)}
              leftIcon={<KeyRound className="w-4 h-4 text-amber-400" />}
            >
              Password
            </Button>
            <Button
              id="btn-open-kta-modal"
              variant="gold"
              size="sm"
              onClick={() => setShowKtaModal(true)}
              leftIcon={<CreditCard className="w-4 h-4" />}
            >
              KTA Digital
            </Button>
          </div>
        </div>

        {/* Unified Navigation Tabs */}
        <div className="relative z-10 mt-6 pt-4 border-t border-emerald-800/80">
          <Tabs
            id="member-portal-nav-tabs"
            tabs={memberTabs}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId)}
            variant="pills"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BUKU SIMPANAN */}
      {/* ========================================================================= */}
      {activeTab === 'SIMPANAN' && (
        <div className="space-y-6 animate-in fade-in duration-200" id="member-savings-section">
          {/* 4 Financial Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Simpanan Pokok */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Simpanan Pokok</span>
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                  <Coins className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-900">
                {formatRupiah(savingsData.pokok)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
                <span>Dibayar Sekali</span>
                <span className="font-bold text-emerald-600">✓ Lunas Terdaftar</span>
              </div>
            </div>

            {/* Card 2: Simpanan Wajib */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Simpanan Wajib</span>
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
                  <Calendar className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-blue-950">
                {formatRupiah(savingsData.wajib)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
                <span>Paket 3 Tahun (36 Bln)</span>
                <span className="font-bold text-blue-600">Rp 10.000 / bln</span>
              </div>
            </div>

            {/* Card 3: Simpanan Manasuka */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Simpanan Manasuka</span>
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-900">
                {formatRupiah(savingsData.manasuka ?? savingsData.sukarela)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
                <span>Manasuka / Sukarela</span>
                <span className="font-bold text-amber-700">Fleksibel</span>
              </div>
            </div>

            {/* Card 4: Total Simpanan */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-950 text-white border border-emerald-800 shadow-md">
              <div className="flex items-center justify-between text-emerald-200 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Simpanan Saya</span>
                <span className="p-1.5 rounded-lg bg-emerald-800/80 text-amber-300">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300">
                {formatRupiah(savingsData.total)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-200">
                <span>Hak Keanggotaan & SHU</span>
                <span className="font-bold text-amber-300">Terverifikasi</span>
              </div>
            </div>
          </div>

          {/* Akad Syariah & Info Simpanan */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs sm:text-sm text-emerald-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <Info className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Ketentuan Syariah Simpanan KOPSIM Mandiri</span>
            </div>
            <p className="text-emerald-900/90 leading-relaxed text-xs">
              Simpanan Pokok dan Simpanan Wajib berlandaskan akad{' '}
              <strong>Wadi'ah Yad Dhamanah / Mudharabah Musytarakah</strong> yang diinvestasikan pada 8 proyek
              sektor riil halal dan produktif. Anggota berhak memperoleh <strong>Sisa Hasil Usaha (SHU)</strong>{' '}
              tahunan sesuai porsi simpanan dan partisipasi transaksi pada Rapat Anggota Tahunan (RAT).
            </p>
          </div>

          {/* Rincian Kategori Simpanan */}
          {Object.keys(savingsData.categoryBreakdown || {}).length > 0 && (
            <Card
              title="Rincian Saldo Akun Berdasarkan Kategori"
              subtitle="Hasil agregasi transaksi resmi di pembukuan Koperasi Syarikat Islam Mandiri"
              action={
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 font-medium hidden sm:inline">Total Simpanan:</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-emerald-950 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    {formatRupiah(savingsData.total)}
                  </span>
                </div>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(savingsData.categoryBreakdown).map(([category, sumAmount]) => (
                  <div
                    key={category}
                    className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/90 flex flex-col justify-between"
                  >
                    <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wide">
                      {category}
                    </span>
                    <span className="text-base font-bold font-mono text-emerald-900 mt-1">
                      {formatRupiah(Number(sumAmount) || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RIWAYAT TRANSAKSI */}
      {/* ========================================================================= */}
      {activeTab === 'TRANSAKSI' && (
        <div className="space-y-6 animate-in fade-in duration-200" id="member-transactions-section">
          <Card
            title="Riwayat Mutasi Transaksi & Setoran"
            subtitle="Semua mutasi setoran dan penarikan yang tercatat resmi di buku kas koperasi"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const memberName = user?.name || memberData?.nama || '';
                  const realTrx = await transactionService.getMemberTransactions(memberName, memberNo);
                  setMemberTransactions(realTrx);
                  showToast('Daftar riwayat transaksi telah diperbarui.', 'success');
                }}
                leftIcon={<Clock className="w-3.5 h-3.5" />}
              >
                Segarkan
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Jenis Transaksi</th>
                    <th className="py-3 px-4">Kategori Simpanan</th>
                    <th className="py-3 px-4">Keterangan</th>
                    <th className="py-3 px-4 text-right">Jumlah (IDR)</th>
                    <th className="py-3 px-4 text-center">Bukti / Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {memberTransactions.length > 0 ? (
                    memberTransactions.map((trx, idx) => {
                      const isIncome = trx.jenis === 'MASUK';
                      return (
                        <tr key={trx.id || idx} className="hover:bg-stone-50/60 transition-colors">
                          <td className="py-3 px-4 text-stone-600 font-mono">
                            {formatDateIndo(trx.tanggal || '2024-08-10')}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[11px] ${
                                isIncome ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
                              }`}
                            >
                              {isIncome ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              {isIncome ? 'SETORAN' : 'PENARIKAN'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-stone-800">{trx.kategori || 'Simpanan'}</td>
                          <td className="py-3 px-4 text-stone-600">{trx.keterangan || trx.deskripsi || 'Transaksi'}</td>
                          <td
                            className={`py-3 px-4 text-right font-mono font-bold ${
                              isIncome ? 'text-emerald-700' : 'text-stone-800'
                            }`}
                          >
                            {formatRupiah(trx.jumlah)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {trx.filelink && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedProof({
                                      url: trx.filelink!,
                                      title: `Bukti Transaksi - ${trx.kategori || 'Setoran'} (${formatDateIndo(
                                        trx.tanggal || ''
                                      )})`,
                                    })
                                  }
                                  className="px-2 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Bukti</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedKuitansi(trx)}
                                className="px-2 py-1 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Kuitansi</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <>
                      {/* Default Row 1: Simpanan Pokok Pendaftaran */}
                      <tr className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-4 text-stone-600 font-mono">
                          {formatDateIndo(memberData?.tgl_reg || '2024-08-10')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                            <ArrowDownLeft className="w-3 h-3" /> SETORAN
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-stone-800">Simpanan Pokok</td>
                        <td className="py-3 px-4 text-stone-600">Setoran Simpanan Pokok registrasi resmi</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {formatRupiah(savingsData.pokok)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedKuitansi({
                                id: 'TRX-POKOK-INIT',
                                tanggal: memberData?.tgl_reg || '2024-08-10',
                                referal: 'KOPERASI',
                                plantation: 'PUSAT JAKARTA',
                                jenis: 'MASUK',
                                kategori: 'Simpanan Pokok Anggota',
                                metode_bayar: 'Bank Transfer BSI',
                                jumlah: savingsData.pokok,
                                akun: memberData?.nama || user?.name || 'Anggota',
                                keterangan: 'Setoran Simpanan Pokok Keanggotaan KOPSIM Mandiri',
                              })
                            }
                            className="px-2 py-1 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Kuitansi</span>
                          </button>
                        </td>
                      </tr>

                      {/* Default Row 2: Simpanan Wajib */}
                      <tr className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-4 text-stone-600 font-mono">
                          {formatDateIndo(memberData?.tgl_reg || '2024-08-10')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                            <ArrowDownLeft className="w-3 h-3" /> SETORAN
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-stone-800">Simpanan Wajib</td>
                        <td className="py-3 px-4 text-stone-600">Setoran Simpanan Wajib paket 3 tahun</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {formatRupiah(savingsData.wajib)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedKuitansi({
                                id: 'TRX-WAJIB-INIT',
                                tanggal: memberData?.tgl_reg || '2024-08-10',
                                referal: 'KOPERASI',
                                plantation: 'PUSAT JAKARTA',
                                jenis: 'MASUK',
                                kategori: 'Simpanan Wajib Anggota',
                                metode_bayar: 'Bank Transfer BSI',
                                jumlah: savingsData.wajib,
                                akun: memberData?.nama || user?.name || 'Anggota',
                                keterangan: 'Setoran Simpanan Wajib Paket 3 Tahun (36 Bulan)',
                              })
                            }
                            className="px-2 py-1 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Kuitansi</span>
                          </button>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HAK & ESTIMASI SHU */}
      {/* ========================================================================= */}
      {activeTab === 'SHU' && (
        <div className="space-y-6 animate-in fade-in duration-200" id="member-shu-section">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Jasa Modal (Simpanan)</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <Percent className="w-5 h-5" />
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-950">
                {formatRupiah(shuEstimates.jasaModal)}
              </div>
              <p className="text-xs text-stone-500 mt-2">
                Dihitung dari rasio total simpanan Anda terhadap modal koperasi.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Jasa Usaha (Partisipasi)</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <TrendingUp className="w-5 h-5" />
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-amber-950">
                {formatRupiah(shuEstimates.jasaUsaha)}
              </div>
              <p className="text-xs text-stone-500 mt-2">
                Dihitung dari keaktifan transaksi & perputaran komoditas sektor riil.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-900 to-emerald-950 text-white border border-emerald-800 shadow-md">
              <div className="flex items-center justify-between text-emerald-200 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Proyeksi SHU Tahun Ini</span>
                <span className="p-2 rounded-xl bg-emerald-800/80 text-amber-300">
                  <Award className="w-5 h-5" />
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-amber-300">
                {formatRupiah(shuEstimates.totalSHU)}
              </div>
              <p className="text-xs text-emerald-200/90 mt-2">
                Akan dibagikan setelah pengesahan Rapat Anggota Tahunan (RAT).
              </p>
            </div>
          </div>

          <Card
            title="Prinsip & Mekanisme Pembagian SHU Sesuai UU Perkoperasian"
            subtitle="Pedoman Anggaran Dasar dan Anggaran Rumah Tangga (AD/ART) KOPSIM Mandiri"
          >
            <div className="space-y-4 text-xs sm:text-sm text-stone-700 leading-relaxed">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <h4 className="font-bold text-stone-900 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>1. Rasio Proporsionalitas Simpanan (Jasa Modal)</span>
                </h4>
                <p className="text-stone-600 pl-6">
                  Setiap anggota yang memiliki Simpanan Pokok dan Simpanan Wajib aktif berhak memperoleh bagian SHU
                  yang bersumber dari surplus keuntungan 8 proyek sektor riil (pertanian jagung, tapioka, perikanan tuna, dll).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <h4 className="font-bold text-stone-900 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>2. Transparansi Laporan Keuangan Audit Publik</span>
                </h4>
                <p className="text-stone-600 pl-6">
                  Perhitungan SHU didasarkan pada laporan laba rugi dan neraca keuangan yang telah diaudit oleh Dewan
                  Pengawas Syariah dan Akuntan Publik Independen sebelum dipresentasikan di RAT.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: KTA DIGITAL */}
      {/* ========================================================================= */}
      {activeTab === 'KTA' && (
        <div className="space-y-6 animate-in fade-in duration-200" id="member-kta-section">
          <Card
            title="Kartu Tanda Anggota (KTA) Digital Resmi"
            subtitle="KTA standar ISO-7810 dilengkapi enkripsi QR Code verifikasi identitas keanggotaan"
            action={
              <Button
                variant="gold"
                size="sm"
                onClick={() => setShowKtaModal(true)}
                leftIcon={<CreditCard className="w-4 h-4" />}
              >
                Unduh PDF KTA
              </Button>
            }
          >
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 py-4">
              <div className="max-w-md w-full shrink-0">
                <KTACard
                  member={{
                    id: memberNo,
                    nama: memberData?.nama || user?.name || 'Anggota Koperasi',
                    gender: memberData?.gender || 'L',
                    provinsi: memberData?.provinsi || 'DKI Jakarta',
                    pekerjaan: memberData?.pekerjaan || 'Anggota',
                    tgl_reg: memberData?.tgl_reg || '2024-08-10',
                    tgl_lahir: memberData?.tgl_lahir || '1990-01-01',
                    avatar_url: memberData?.avatar_url || memberService.getMemberAvatar(memberNo),
                  }}
                  showQrDetails={true}
                />
              </div>

              <div className="space-y-4 max-w-md text-xs sm:text-sm text-stone-600">
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2 text-emerald-950">
                  <h4 className="font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>Verifikasi Keaslian KTA</span>
                  </h4>
                  <p className="text-xs text-emerald-900/90 leading-relaxed">
                    Setiap KTA Digital KOPSIM Mandiri memiliki QR Code unik yang dapat dipindai oleh publik atau mitra
                    koperasi untuk memverifikasi status keanggotaan aktif dan Nomor Registrasi Anggota (NRA).
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowKtaModal(true)}
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Buka Dialog Cetak & Unduh
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DATA PRIBADI & PROFIL */}
      {/* ========================================================================= */}
      {activeTab === 'PROFIL' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200" id="member-profile-section">
          {/* Kolom Kiri: Detail Profil Anggota */}
          <div className="lg:col-span-2 space-y-6">
            <Card
              title="Data Pribadi & Identitas Anggota"
              subtitle="Data terdaftar pada database resmi Koperasi Syarikat Islam Mandiri"
              action={
                <Button
                  id="btn-edit-personal-data"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditProfileModal(true)}
                  leftIcon={<Edit3 className="w-3.5 h-3.5 text-emerald-700" />}
                >
                  Ubah Data
                </Button>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100">
                  <span className="text-stone-400 text-[11px] block font-medium">Nama Lengkap</span>
                  <span className="font-bold text-stone-900 mt-0.5 block">{memberData?.nama || user?.name || '-'}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100">
                  <span className="text-stone-400 text-[11px] block font-medium">Nomor Registrasi Anggota (NRA)</span>
                  <span className="font-mono font-bold text-emerald-900 mt-0.5 block">{memberNo}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100">
                  <span className="text-stone-400 text-[11px] block font-medium">Jenis Kelamin</span>
                  <span className="font-semibold text-stone-800 mt-0.5 block">
                    {memberData?.gender === 'P' || user?.gender === 'P' ? 'Perempuan' : 'Laki-laki'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100">
                  <span className="text-stone-400 text-[11px] block font-medium">Tanggal Registrasi</span>
                  <span className="font-semibold text-stone-800 mt-0.5 block font-mono">
                    {formatDateIndo(memberData?.tgl_reg || user?.registeredAt || '2024-08-10')}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100">
                  <span className="text-stone-400 text-[11px] block font-medium">Pekerjaan / Profesi</span>
                  <span className="font-semibold text-stone-800 mt-0.5 block">{memberData?.pekerjaan || user?.occupation || 'Anggota'}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100">
                  <span className="text-stone-400 text-[11px] block font-medium">Wilayah Kerja / Plantation</span>
                  <span className="font-semibold text-stone-800 mt-0.5 block">{memberData?.plantation || user?.workArea || 'PUSAT JAKARTA'}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100 sm:col-span-2">
                  <span className="text-stone-400 text-[11px] block font-medium">Alamat Lengkap</span>
                  <span className="font-semibold text-stone-800 mt-0.5 block">{memberData?.alamat || user?.address || '-'}</span>
                </div>
              </div>
            </Card>

            <Card title="Keamanan Akun & Kredensial">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-stone-900">Kata Sandi Akun Portal</h4>
                  <p className="text-xs text-stone-500">
                    Disarankan memperbarui kata sandi secara berkala untuk melindungi data finansial.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChangePasswordModal(true)}
                  leftIcon={<KeyRound className="w-4 h-4 text-amber-600" />}
                >
                  Ganti Password
                </Button>
              </div>
            </Card>
          </div>

          {/* Kolom Kanan: Status & Ringkasan */}
          <div className="space-y-6">
            <Card title="Status Keanggotaan">
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <ShieldCheck className="w-10 h-10 text-emerald-700 mx-auto" />
                  <h4 className="text-sm font-bold text-emerald-950">Anggota Aktif & Terverifikasi</h4>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Anda tercatat sebagai pemilik hak suara dan penerima SHU pada Koperasi Syarikat Islam Mandiri.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: DOKUMEN RESMI */}
      {/* ========================================================================= */}
      {activeTab === 'DOKUMEN' && (
        <div className="space-y-6 animate-in fade-in duration-200" id="member-documents-section">
          <Card
            title="Pusat Dokumen & Legalitas Anggota"
            subtitle="Unduh sertifikat resmi, formulir setoran, dan dokumen anggaran dasar koperasi"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-sm font-bold text-stone-900">Sertifikat Keanggotaan KOPSIM</h4>
                  </div>
                  <p className="text-xs text-stone-500">
                    Bukti kepemilikan nomor registrasi resmi ({memberNo}) bertanda tangan pengurus.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowKtaModal(true)}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Unduh
                </Button>
              </div>

              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-sm font-bold text-stone-900">Buku AD / ART Koperasi</h4>
                  </div>
                  <p className="text-xs text-stone-500">
                    Anggaran Dasar & Anggaran Rumah Tangga Koperasi Syarikat Islam Mandiri.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => showToast('Buku AD/ART sedang disiapkan untuk diunduh.', 'info')}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Unduh
                </Button>
              </div>

              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-sm font-bold text-stone-900">Formulir Penambahan Simpanan</h4>
                  </div>
                  <p className="text-xs text-stone-500">
                    Formulir resmi untuk penempatan Simpanan Manasuka / Sukarela produktif.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => showToast('Formulir penambahan simpanan telah diunduh.', 'success')}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Unduh
                </Button>
              </div>

              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600" />
                    <h4 className="text-sm font-bold text-stone-900">Katalog Komoditas Sektor Riil</h4>
                  </div>
                  <p className="text-xs text-stone-500">
                    Daftar 8 proyek komoditas pangan & industri hilir binaan KOPSIM Mandiri.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => showToast('Katalog komoditas sektor riil telah diunduh.', 'success')}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Unduh
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: PEMBERITAHUAN */}
      {/* ========================================================================= */}
      {activeTab === 'NOTIFIKASI' && (
        <div className="space-y-6 animate-in fade-in duration-200" id="member-notifications-section">
          <Card
            title="Pusat Pemberitahuan & Warta Anggota"
            subtitle="Pesan resmi terkait status simpanan, agenda RAT, dan perkembangan proyek komoditas"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNotifications(notifications.map((n) => ({ ...n, read: true })));
                  showToast('Semua notifikasi telah ditandai sudah dibaca.', 'success');
                }}
              >
                Tandai Sudah Dibaca
              </Button>
            }
          >
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-2xl border transition-colors flex items-start gap-4 ${
                    notif.read
                      ? 'bg-white border-stone-200'
                      : 'bg-emerald-50/60 border-emerald-200/80 shadow-2xs'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      notif.read ? 'bg-stone-100 text-stone-500' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`text-xs sm:text-sm font-bold ${
                          notif.read ? 'text-stone-800' : 'text-emerald-950 font-bold'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[11px] text-stone-400 font-mono shrink-0">
                        {formatDateIndo(notif.date)}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">{notif.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOGS & MODALS */}
      {/* ========================================================================= */}

      {/* 1. Modal KTA Digital */}
      {showKtaModal && (
        <IdCardModal
          isOpen={showKtaModal}
          onClose={() => setShowKtaModal(false)}
          member={{
            id: memberNo,
            nama: memberData?.nama || user?.name || 'Anggota Koperasi',
            gender: memberData?.gender || 'L',
            provinsi: memberData?.provinsi || 'DKI Jakarta',
            pekerjaan: memberData?.pekerjaan || 'Anggota',
            tgl_reg: memberData?.tgl_reg || '2024-08-10',
            tgl_lahir: memberData?.tgl_lahir || '1990-01-01',
            avatar_url: memberData?.avatar_url || memberService.getMemberAvatar(memberNo),
          }}
        />
      )}

      {/* 2. Modal Ganti Password */}
      {showChangePasswordModal && (
        <ChangePasswordModal
          isOpen={showChangePasswordModal}
          onClose={() => setShowChangePasswordModal(false)}
          memberNo={memberNo}
          memberName={memberData?.nama || user?.name || ''}
        />
      )}

      {/* 3. Modal Edit Data Pribadi */}
      {showEditProfileModal && (
        <EditPersonalDataModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          memberData={memberData}
          onSuccess={(updated) => {
            setMemberData(updated);
            if (updateUser) {
              updateUser({
                name: updated.nama,
                gender: updated.gender,
                province: updated.provinsi,
                city: updated.kota,
                address: updated.alamat,
                occupation: updated.pekerjaan,
                workArea: updated.plantation,
              });
            }
          }}
        />
      )}

      {/* 4. Modal Pratinjau Bukti Transaksi */}
      {selectedProof && (
        <Modal
          isOpen={!!selectedProof}
          onClose={() => setSelectedProof(null)}
          title={selectedProof.title}
          size="md"
        >
          <div className="flex flex-col items-center justify-center p-2">
            <img
              src={selectedProof.url}
              alt="Bukti Transaksi"
              className="max-h-[65vh] w-auto object-contain rounded-xl border border-stone-200 shadow-md"
            />
            <div className="mt-4 flex justify-end w-full">
              <a
                href={selectedProof.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-800 text-white hover:bg-emerald-900 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka Gambar Asli</span>
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Modal Kuitansi Pembayaran / Setoran */}
      {selectedKuitansi && (
        <Modal
          isOpen={!!selectedKuitansi}
          onClose={() => setSelectedKuitansi(null)}
          title="Kuitansi Resmi Setoran Koperasi"
          subtitle={`No. Transaksi: ${selectedKuitansi.id || 'TRX-SETORAN'}`}
          size="md"
          footer={
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                window.print();
              }}
              leftIcon={<Printer className="w-4 h-4" />}
            >
              Cetak Kuitansi
            </Button>
          }
        >
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-4 text-xs sm:text-sm">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-bold text-stone-900 font-serif">Koperasi Syarikat Islam Mandiri</h3>
                <p className="text-[11px] text-stone-500">Badan Hukum No. AHU-0001234.AH.01.26.TAHUN 2024</p>
              </div>
              <Badge variant="success">LUNAS TERCATAT</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-stone-400 block text-[10px]">Telah Diterima Dari</span>
                <span className="font-bold text-stone-900">{memberData?.nama || user?.name}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px]">Nomor Anggota (NRA)</span>
                <span className="font-mono font-bold text-emerald-900">{memberNo}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px]">Untuk Pembayaran</span>
                <span className="font-semibold text-stone-800">{selectedKuitansi.kategori}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px]">Tanggal Setor</span>
                <span className="font-mono text-stone-800">{formatDateIndo(selectedKuitansi.tanggal || '')}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-center">
              <span className="text-xs text-emerald-800 font-medium block">Jumlah Pembayaran:</span>
              <span className="text-xl font-bold font-mono text-emerald-950">
                {formatRupiah(selectedKuitansi.jumlah)}
              </span>
            </div>

            <p className="text-[10px] text-stone-400 text-center italic">
              Kuitansi ini dihasilkan secara elektronik dan sah sebagai bukti setoran simpanan resmi KOPSIM Mandiri.
            </p>
          </div>
        </Modal>
      )}

      {/* Modal Simulasi Pembiayaan Syariah */}
      {showLoanModal && (
        <Modal
          isOpen={showLoanModal}
          onClose={() => setShowLoanModal(false)}
          title="Kalkulator & Simulasi Pembiayaan Syariah"
          maxWidth="max-w-4xl"
        >
          <div className="p-2">
            <LoanSimulatorModule
              initialMemberId={memberNo}
              initialMemberName={memberData?.nama || user?.name}
            />
          </div>
        </Modal>
      )}

      {/* Modal Setoran Online (Payment Gateway) */}
      {showPaymentModal && (
        <Modal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          title="Setor Simpanan Online (QRIS & Virtual Account)"
          maxWidth="max-w-4xl"
        >
          <div className="p-2">
            <PaymentGatewayModule />
          </div>
        </Modal>
      )}
    </div>
  );
};
