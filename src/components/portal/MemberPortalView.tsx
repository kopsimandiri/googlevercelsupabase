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
import { LoadingState } from '../common/LoadingState';
import { IdCardModal } from '../idcard/IdCardModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { EditPersonalDataModal } from './EditPersonalDataModal';
import { KopsimLogo } from '../common/KopsimLogo';
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
  Image as ImageIcon,
} from 'lucide-react';

export const MemberPortalView: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState<'SIMPANAN' | 'PROFIL'>('SIMPANAN');
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
          found = allMembers.find(
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
        // SELECT a.account_name_legacy,a.category_name,sum(a.amount) IDR from public.transactions a ...
        const savingsRes = await transactionService.getMemberSavingsSummary(
          memberName || found?.nama || '',
          memberNo
        );

        if (isMounted) {
          const basePokok = Number(found?.simpanan_pokok ?? 500000);
          const baseWajib = Number(found?.simpanan_wajib ?? 360000);
          const baseManasuka = Number(found?.simpanan_sukarela ?? 0);

          const finalPokok = savingsRes.hasTrx && savingsRes.simpananPokok > 0 ? savingsRes.simpananPokok : basePokok;
          const finalWajib = savingsRes.hasTrx && savingsRes.simpananWajib > 0 ? savingsRes.simpananWajib : baseWajib;
          const finalManasuka = savingsRes.hasTrx && savingsRes.simpananManasuka > 0
            ? savingsRes.simpananManasuka
            : (savingsRes.hasTrx && savingsRes.simpananSukarela > 0 ? savingsRes.simpananSukarela : baseManasuka);

          // Build complete category breakdown
          const breakdown: Record<string, number> = { ...(savingsRes.categoryBreakdown || {}) };
          if (!Object.keys(breakdown).some((k) => k.toUpperCase().includes('POKOK'))) {
            breakdown['SIMPANAN POKOK'] = finalPokok;
          }
          if (!Object.keys(breakdown).some((k) => k.toUpperCase().includes('WAJIB'))) {
            breakdown['SIMPANAN WAJIB'] = finalWajib;
          }
          if (finalManasuka > 0 && !Object.keys(breakdown).some((k) => k.toUpperCase().includes('MANASUKA') || k.toUpperCase().includes('SUKARELA'))) {
            breakdown['SIMPANAN MANASUKA'] = finalManasuka;
          }

          // Calculate grand total from components and category breakdown
          const calculatedTotal = Object.values(breakdown).reduce((acc, val) => acc + (Number(val) || 0), 0) || (finalPokok + finalWajib + finalManasuka);

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

  const savingsSummary = savingsData;

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
                className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-amber-400 text-emerald-950 hover:bg-amber-300 shadow-md transition-transform transform hover:scale-110"
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
              id="btn-open-edit-profile-modal"
              variant="primary"
              size="md"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold border border-emerald-400/40 shadow-sm"
              onClick={() => setShowEditProfileModal(true)}
              leftIcon={<Edit3 className="w-4 h-4 text-amber-300" />}
            >
              Edit Data Pribadi
            </Button>
            <Button
              id="btn-open-change-password-modal"
              variant="outline"
              size="md"
              className="bg-emerald-900/90 text-amber-300 hover:bg-emerald-800 border border-amber-400/50 shadow-sm font-semibold"
              onClick={() => setShowChangePasswordModal(true)}
              leftIcon={<KeyRound className="w-4 h-4 text-amber-400" />}
            >
              Ganti Password
            </Button>
            <Button
              id="btn-open-kta-modal"
              variant="gold"
              size="md"
              onClick={() => setShowKtaModal(true)}
              leftIcon={<CreditCard className="w-4 h-4" />}
            >
              Lihat KTA Digital
            </Button>
            <Button
              id="btn-print-savings-summary"
              variant="secondary"
              size="md"
              className="bg-emerald-800/80 text-white hover:bg-emerald-700 border border-emerald-600"
              onClick={() => {
                showToast('Mencetak rekap simpanan resmi...', 'info', 'Cetak Rekap');
                window.print();
              }}
              leftIcon={<Printer className="w-4 h-4" />}
            >
              Cetak Rekap
            </Button>
          </div>
        </div>

        {/* Navigation Tabs for Member */}
        <div className="relative z-10 flex items-center gap-2 mt-6 pt-5 border-t border-emerald-800/80">
          <button
            id="tab-member-savings"
            onClick={() => setActiveTab('SIMPANAN')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'SIMPANAN'
                ? 'bg-amber-400 text-emerald-950 shadow-md font-extrabold'
                : 'text-emerald-100 hover:text-white hover:bg-emerald-800/60'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>1. Simpanan Saya</span>
          </button>

          <button
            id="tab-member-profile"
            onClick={() => setActiveTab('PROFIL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'PROFIL'
                ? 'bg-amber-400 text-emerald-950 shadow-md font-extrabold'
                : 'text-emerald-100 hover:text-white hover:bg-emerald-800/60'
            }`}
          >
            <User className="w-4 h-4" />
            <span>2. Data Pribadi & KTA Digital</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SIMPANAN SAYA */}
      {/* ========================================================================= */}
      {activeTab === 'SIMPANAN' && (
        <div className="space-y-6 animate-fadeIn" id="member-savings-section">
          {/* 4 Financial Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Simpanan Pokok */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Simpanan Pokok</span>
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                  <Coins className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-900">
                {formatRupiah(savingsSummary.pokok)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
                <span>Dibayar Sekali</span>
                <span className="font-bold text-emerald-600">✓ Lunas Terdaftar</span>
              </div>
            </div>

            {/* Card 2: Simpanan Wajib */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Simpanan Wajib</span>
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
                  <Calendar className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-blue-950">
                {formatRupiah(savingsSummary.wajib)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
                <span>Paket 3 Tahun (36 Bln)</span>
                <span className="font-bold text-blue-600">Rp 10.000 / bln</span>
              </div>
            </div>

            {/* Card 3: Simpanan Manasuka */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Simpanan Manasuka</span>
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-900">
                {formatRupiah(savingsSummary.manasuka ?? savingsSummary.sukarela)}
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
                {formatRupiah(savingsSummary.total)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-200">
                <span>Hak Keanggotaan & SHU</span>
                <span className="font-bold text-amber-300">Terverifikasi</span>
              </div>
            </div>
          </div>

          {/* Akad Syariah & Info Simpanan */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs sm:text-sm text-emerald-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <Info className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Ketentuan Syariah Simpanan KOPSIM Mandiri</span>
            </div>
            <p className="text-emerald-900/90 leading-relaxed text-xs">
              Simpanan Pokok dan Simpanan Wajib berlandaskan akad <strong>Wadi'ah Yad Dhamanah / Mudharabah Musytarakah</strong> yang diinvestasikan pada 8 proyek sektor riil halal dan produktif. Anggota berhak memperoleh <strong>Sisa Hasil Usaha (SHU)</strong> tahunan sesuai porsi simpanan dan partisipasi transaksi pada Rapat Anggota Tahunan (RAT).
            </p>
          </div>

          {/* Rincian Kategori Simpanan Berdasarkan Query Transaksi */}
          {Object.keys(savingsSummary.categoryBreakdown || {}).length > 0 && (
            <Card
              title="Rincian Saldo Akun Berdasarkan Kategori"
              subtitle="Hasil agregasi transaksi resmi (Query: public.transactions a LEFT JOIN public.members b)"
              action={
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 font-medium hidden sm:inline">Total Simpanan:</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-emerald-950 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    {formatRupiah(savingsSummary.total)}
                  </span>
                </div>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(savingsSummary.categoryBreakdown).map(([category, sumAmount]) => (
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

          {/* Riwayat Setoran Simpanan */}
          <Card
            title="Riwayat Setoran & Mutasi Simpanan Saya"
            subtitle="Daftar mutasi setoran simpanan yang tercatat di pembukuan resmi koperasi"
            actions={
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const memberName = user?.name || memberData?.nama || '';
                  const realTrx = await transactionService.getMemberTransactions(memberName, memberNo);
                  setMemberTransactions(realTrx);
                  showToast('Daftar riwayat mutasi telah diperbarui.', 'success');
                }}
                leftIcon={<Clock className="w-3.5 h-3.5" />}
              >
                Muat Ulang
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
                    <th className="py-3 px-4 text-right">Jumlah Setoran</th>
                    <th className="py-3 px-4 text-center">Bukti / Lampiran</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {/* Dynamic rows if found */}
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
                              className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded ${
                                isIncome
                                  ? 'text-emerald-700 bg-emerald-50'
                                  : 'text-amber-700 bg-amber-50'
                              }`}
                            >
                              {isIncome ? (
                                <ArrowDownLeft className="w-3 h-3" />
                              ) : (
                                <ArrowUpRight className="w-3 h-3" />
                              )}
                              {isIncome ? 'SETORAN MASUK' : 'PENARIKAN / KELUAR'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-stone-800">
                            {trx.kategori || 'Simpanan'}
                          </td>
                          <td className="py-3 px-4 text-stone-600">
                            {trx.keterangan || trx.deskripsi || 'Transaksi Simpanan'}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono font-bold ${
                              isIncome ? 'text-emerald-700' : 'text-stone-800'
                            }`}
                          >
                            {formatRupiah(trx.jumlah)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {trx.filelink ? (
                              <div className="inline-flex items-center gap-1.5 justify-center">
                                <a
                                  href={trx.filelink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-950 border border-emerald-200 transition-colors shadow-2xs"
                                  title="Buka Link Lampiran Bukti"
                                >
                                  <Paperclip className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Lihat</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedProof({
                                      url: trx.filelink!,
                                      title: `Bukti Transaksi - ${trx.kategori || 'Setoran'} (${formatDateIndo(trx.tanggal || '')})`,
                                    })
                                  }
                                  className="p-1 text-stone-500 hover:text-emerald-800 hover:bg-stone-100 rounded transition-colors"
                                  title="Pratinjau Foto Bukti"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-stone-400 font-mono">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              BERHASIL
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <>
                      {/* Default Row 1: Simpanan Pokok Pendaftaran */}
                      <tr className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-4 text-stone-600 font-mono">{formatDateIndo(memberData?.tgl_reg || '2024-08-10')}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            <ArrowDownLeft className="w-3 h-3" /> SETORAN MASUK
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-stone-800">Simpanan Pokok</td>
                        <td className="py-3 px-4 text-stone-600">Setoran Simpanan Pokok saat registrasi anggota resmi</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {formatRupiah(savingsSummary.pokok)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-stone-400 font-mono text-[11px]">-</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            BERHASIL
                          </span>
                        </td>
                      </tr>

                      {/* Default Row 2: Simpanan Wajib */}
                      <tr className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-4 text-stone-600 font-mono">{formatDateIndo(memberData?.tgl_reg || '2024-08-10')}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            <ArrowDownLeft className="w-3 h-3" /> SETORAN MASUK
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-stone-800">Simpanan Wajib</td>
                        <td className="py-3 px-4 text-stone-600">Setoran Simpanan Wajib paket 3 tahun</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {formatRupiah(savingsSummary.wajib)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-stone-400 font-mono text-[11px]">-</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            BERHASIL
                          </span>
                        </td>
                      </tr>

                      {/* Sukarela if exists */}
                      {savingsSummary.sukarela > 0 && (
                        <tr className="hover:bg-stone-50/60 transition-colors">
                          <td className="py-3 px-4 text-stone-600 font-mono">{formatDateIndo('2024-09-01')}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              <ArrowDownLeft className="w-3 h-3" /> SETORAN MASUK
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-stone-800">Simpanan Sukarela</td>
                          <td className="py-3 px-4 text-stone-600">Penempatan Simpanan Manasuka Berjangka</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            {formatRupiah(savingsSummary.sukarela)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-stone-400 font-mono text-[11px]">-</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              BERHASIL
                            </span>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DATA PRIBADI & KTA DIGITAL */}
      {/* ========================================================================= */}
      {activeTab === 'PROFIL' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn" id="member-profile-section">
          {/* Kolom Kiri: Detail Profil Anggota */}
          <div className="lg:col-span-2 space-y-6">
            <Card
              title="Data Profil Pribadi Anggota"
              subtitle="Data identitas resmi yang terdaftar pada sistem database induk KOPSIM Mandiri (tabel public.members)"
              action={
                <Button
                  id="btn-card-edit-profile"
                  variant="primary"
                  size="sm"
                  onClick={() => setShowEditProfileModal(true)}
                  leftIcon={<Edit3 className="w-3.5 h-3.5 text-amber-300" />}
                >
                  Edit Data Pribadi
                </Button>
              }
            >
              {/* Highlight Banner: Foto Profil & Aksi Cepat Edit */}
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-white border border-emerald-800 flex flex-col sm:flex-row items-center gap-5 shadow-sm">
                <div className="relative group shrink-0">
                  <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl border-2 border-amber-400 bg-emerald-950/80 overflow-hidden flex items-center justify-center shadow-md">
                    {memberData?.avatar_url || memberService.getMemberAvatar(memberNo) ? (
                      <img
                        src={memberData?.avatar_url || memberService.getMemberAvatar(memberNo) || ''}
                        alt={memberData?.nama || 'Foto Anggota'}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-center p-2 text-emerald-200">
                        <User className="w-8 h-8 mx-auto mb-1 opacity-60" />
                        <span className="text-[9px] block font-mono">PAS FOTO</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div>
                    <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                      Foto & Identitas Pribadi Anggota
                    </span>
                    <h3 className="text-base font-bold font-serif text-white">
                      {memberData?.nama || user?.name || 'Anggota Koperasi'}
                    </h3>
                    <p className="text-xs text-emerald-200 mt-0.5">
                      Foto dan perubahan data pribadi tersimpan langsung ke database <code className="text-amber-300 font-mono">public.members</code>.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start pt-1">
                    <Button
                      id="btn-edit-personal-data-banner"
                      variant="gold"
                      size="sm"
                      onClick={() => setShowEditProfileModal(true)}
                      leftIcon={<Camera className="w-3.5 h-3.5" />}
                    >
                      Ganti Foto / Edit Data Pribadi
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* NRA */}
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                    Nomor Registrasi Anggota (NRA)
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-950 block">
                    {memberNo}
                  </span>
                </div>

                {/* NIK Masked */}
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Nomor Induk Kependudukan (NIK)</span>
                    <span className="text-emerald-700 font-normal">Terkunci & Aman</span>
                  </span>
                  <span className="text-sm font-mono font-bold text-stone-800 block">
                    {user?.nikMasked || '3171************'}
                  </span>
                </div>

                {/* Nama Lengkap */}
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                    Nama Lengkap
                  </span>
                  <span className="text-sm font-bold text-stone-900 block">
                    {memberData?.nama || user?.name}
                  </span>
                </div>

                {/* Jenis Kelamin */}
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                    Jenis Kelamin
                  </span>
                  <span className="text-sm font-semibold text-stone-800 block">
                    {(memberData?.gender || user?.gender) === 'P' ? 'Perempuan' : 'Laki-laki'}
                  </span>
                </div>

                {/* Tanggal Lahir */}
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                    Tempat, Tanggal Lahir
                  </span>
                  <span className="text-sm font-semibold text-stone-800 block">
                    {memberData?.tempat_lahir || user?.birthPlace || 'Jakarta'}, {formatDateIndo(memberData?.tgl_lahir || user?.birthDate || '1990-01-01')}
                  </span>
                </div>

                {/* Pekerjaan */}
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                    Pekerjaan / Profesi
                  </span>
                  <span className="text-sm font-semibold text-stone-800 block">
                    {memberData?.pekerjaan || user?.occupation || 'Anggota Koperasi'}
                  </span>
                </div>

                {/* Wilayah Kerja */}
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                    Wilayah Kerja / Cabang
                  </span>
                  <span className="text-sm font-bold text-emerald-900 block">
                    {memberData?.plantation || user?.workArea || 'PUSAT JAKARTA'}
                  </span>
                </div>

                {/* Status Keanggotaan */}
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                    Status Keanggotaan
                  </span>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <Badge variant="success" size="sm">
                      {user?.status || memberData?.status || 'AKTIF'}
                    </Badge>
                    <span className="text-[11px] text-stone-500">Terdaftar sejak {formatDateIndo(memberData?.tgl_reg || '2024-08-10')}</span>
                  </div>
                </div>

                {/* Alamat Lengkap */}
                <div className="sm:col-span-2 p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                    Alamat Domisili
                  </span>
                  <span className="text-xs text-stone-700 leading-relaxed block">
                    {memberData?.alamat || user?.address || 'Jl. Pegangsaan Barat No. 14, Menteng'}, {memberData?.kota || user?.city || 'Jakarta Pusat'}, {memberData?.provinsi || user?.province || 'DKI Jakarta'}
                  </span>
                </div>

                {/* Keamanan Akun & Password */}
                <div className="sm:col-span-2 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                      <KeyRound className="w-4 h-4 text-emerald-700" />
                      <span>Keamanan Akun & Kata Sandi</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Kelola kata sandi akun anggota Anda. Data tersimpan di kolom <code className="font-bold">legacy_password_hash</code> tabel <code className="font-bold">public.members</code>.
                    </p>
                  </div>
                  <Button
                    id="btn-profile-change-password"
                    variant="primary"
                    size="sm"
                    className="shrink-0 font-bold"
                    onClick={() => setShowChangePasswordModal(true)}
                    leftIcon={<KeyRound className="w-3.5 h-3.5" />}
                  >
                    Ganti Password
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Kolom Kanan: Pratinjau KTA Digital */}
          <div className="space-y-6">
            <Card
              title="Kartu Tanda Anggota (KTA)"
              subtitle="KTA Digital Resmi dengan QR Code Verifikasi"
            >
              <div className="space-y-4">
                {/* Digital Card Preview Visual */}
                <div
                  id="kta-preview-box"
                  className="rounded-2xl bg-gradient-to-tr from-emerald-950 via-emerald-900 to-emerald-800 text-white p-5 border-2 border-amber-400/80 shadow-lg relative overflow-hidden space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-emerald-700/80 pb-3">
                    <div className="flex items-center gap-2">
                      <KopsimLogo size="xs" badgeBackground={true} />
                      <div>
                        <span className="text-[11px] font-bold font-serif text-amber-300 block leading-tight">
                          KOPSIM MANDIRI
                        </span>
                        <span className="text-[8px] text-emerald-200 font-mono block">
                          KARTU TANDA ANGGOTA
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-amber-400 text-emerald-950 font-mono">
                      CR-80
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-emerald-200 uppercase font-mono block">Nama Lengkap</span>
                    <span className="text-sm font-bold text-white block uppercase tracking-wide truncate">
                      {memberData?.nama || user?.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[9px] text-emerald-200 uppercase font-mono block">Nomor Anggota (NRA)</span>
                      <span className="text-xs font-mono font-bold text-amber-300 block">
                        {memberNo}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-emerald-200 uppercase font-mono block">Wilayah</span>
                      <span className="text-[11px] font-bold text-emerald-100 block">
                        {memberData?.plantation || user?.workArea || 'PUSAT JAKARTA'}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  id="btn-open-kta-viewer"
                  variant="gold"
                  size="md"
                  className="w-full justify-center shadow-md font-bold"
                  onClick={() => setShowKtaModal(true)}
                  leftIcon={<QrCode className="w-4 h-4" />}
                >
                  Buka & Unduh KTA HD
                </Button>

                <p className="text-[11px] text-stone-500 text-center leading-relaxed">
                  KTA Digital dapat diunduh dalam format PNG beresolusi tinggi (1000 × 630 px) siap cetak.
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Modal Edit Data Pribadi Anggota */}
      {showEditProfileModal && (memberData || user) && (
        <EditPersonalDataModal
          member={
            memberData ||
            ({
              id: memberNo,
              tgl_reg: '2024-08-10',
              nama: user?.name || 'Anggota KOPSIM',
              gender: (user?.gender === 'P' ? 'P' : 'L') as 'L' | 'P',
              provinsi: user?.province || 'DKI Jakarta',
              kota: user?.city || 'Jakarta Pusat',
              alamat: user?.address || '',
              pekerjaan: user?.occupation || 'Anggota Koperasi',
              plantation: user?.workArea || 'PUSAT JAKARTA',
              tgl_lahir: user?.birthDate || '1990-01-01',
              area_jenis: user?.areaJenis || 'KOPERASI PUSAT',
              simpanan_pokok: savingsData.pokok,
              simpanan_wajib: savingsData.wajib,
              simpanan_sukarela: savingsData.manasuka,
              nik: user?.nikMasked || '',
              tempat_lahir: user?.birthPlace || 'Jakarta',
              avatar_url: memberData?.avatar_url || memberService.getMemberAvatar(memberNo),
              status: user?.status || 'AKTIF',
            } as MemberRecord)
          }
          onClose={() => setShowEditProfileModal(false)}
          onSuccess={(updated) => {
            setMemberData(updated);
            if (updateUser) {
              updateUser({
                name: updated.nama,
                gender: updated.gender,
                address: updated.alamat,
                city: updated.kota,
                province: updated.provinsi,
                occupation: updated.pekerjaan,
                birthDate: updated.tgl_lahir,
                birthPlace: updated.tempat_lahir,
              });
            }
          }}
        />
      )}

      {/* Modal KTA Digital HD */}
      {showKtaModal && memberData && (
        <IdCardModal
          member={memberData}
          onClose={() => setShowKtaModal(false)}
          onAvatarUpdated={(newAvatar) => {
            setMemberData((prev) => (prev ? { ...prev, avatar_url: newAvatar } : null));
          }}
        />
      )}

      {/* Modal Ganti Password Anggota */}
      {showChangePasswordModal && (
        <ChangePasswordModal
          memberNo={memberNo}
          memberName={user?.name || memberData?.nama || 'Anggota KOPSIM'}
          username={user?.id}
          onClose={() => setShowChangePasswordModal(false)}
          onSuccess={() => {
            showToast('Password baru siap digunakan untuk login berikutnya.', 'success', 'Password Tersimpan');
          }}
        />
      )}

      {/* Modal Pratinjau Foto Lampiran Bukti Setoran */}
      {selectedProof && (
        <div
          id="proof-preview-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-xl w-full p-4 sm:p-5 space-y-3.5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">{selectedProof.title}</h4>
                  <p className="text-[11px] text-stone-500">Lampiran bukti transaksi pembukuan koperasi</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProof(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 flex flex-col items-center justify-center p-2 bg-stone-50 rounded-xl border border-stone-200">
              {selectedProof.url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) ||
              selectedProof.url.startsWith('data:image/') ||
              selectedProof.url.includes('drive.google.com') ||
              selectedProof.url.includes('supabase.co/storage') ||
              selectedProof.url.includes('images') ? (
                <img
                  src={selectedProof.url}
                  alt="Bukti Setoran"
                  className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-xs"
                  onError={(e) => {
                    // Fallback to text link if image fails to render inline
                    (e.target as HTMLElement).style.display = 'none';
                    const fallback = document.getElementById('proof-fallback-view');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}

              <div
                id="proof-fallback-view"
                className="flex flex-col items-center justify-center py-6 text-center space-y-2"
                style={{
                  display:
                    selectedProof.url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) ||
                    selectedProof.url.startsWith('data:image/')
                      ? 'none'
                      : 'flex',
                }}
              >
                <ImageIcon className="w-10 h-10 text-stone-400" />
                <span className="text-xs text-stone-600 font-medium max-w-xs break-all">
                  {selectedProof.url}
                </span>
                <p className="text-[11px] text-stone-400">
                  Dokumen lampiran siap dibuka melalui tautan langsung.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-100 shrink-0">
              <a
                href={selectedProof.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka di Tab Baru / Unduh</span>
              </a>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedProof(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
