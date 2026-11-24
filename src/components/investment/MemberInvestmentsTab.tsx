import React, { useState, useEffect } from 'react';
import { InvestmentTransaction, DigitalAgreement, ProjectInvestmentCampaign } from '../../types/investment';
import { investmentService } from '../../services/investmentService';
import { formatRupiah, formatDateIndo } from '../../utils/formatters';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { InvestmentCampaignCard } from './InvestmentCampaignCard';
import { InvestmentCheckoutModal } from './InvestmentCheckoutModal';
import { useAuth } from '../../context/AuthContext';
import { getSignedProofUrl, hasTransactionProof, isPdfFile } from '../../services/storageService';
import {
  Coins,
  TrendingUp,
  FileCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileText,
  X,
  Printer,
  Sparkles,
  Eye,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface MemberInvestmentsTabProps {
  memberNo: string;
  onExploreProjects?: () => void;
}

export const MemberInvestmentsTab: React.FC<MemberInvestmentsTabProps> = ({
  memberNo,
  onExploreProjects,
}) => {
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [subTab, setSubTab] = useState<'PORTOFOLIO' | 'PELUANG_PROYEK'>('PORTOFOLIO');
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [campaigns, setCampaigns] = useState<ProjectInvestmentCampaign[]>([]);
  const [selectedCampaignForInvest, setSelectedCampaignForInvest] =
    useState<ProjectInvestmentCampaign | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedAgreement, setSelectedAgreement] = useState<DigitalAgreement | null>(null);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [selectedProofRaw, setSelectedProofRaw] = useState<string | null>(null);
  const [isProofLoading, setIsProofLoading] = useState<boolean>(false);
  const [proofLoadError, setProofLoadError] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated || !memberNo) {
      setIsLoading(false);
      return;
    }
    loadMemberInvestments();
  }, [isAuthLoading, isAuthenticated, memberNo]);

  const loadMemberInvestments = async () => {
    setIsLoading(true);
    try {
      const [data, campList] = await Promise.all([
        investmentService.getTransactionsByMember(memberNo),
        investmentService.getAllCampaigns(),
      ]);
      setTransactions(data);
      setCampaigns(campList.filter((c) => c.is_investment_enabled !== false));
    } catch (err) {
      console.error('Error loading member investments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenInvestmentProof = async (rawRef: string) => {
    setSelectedProofRaw(rawRef);
    setSelectedProofUrl(null);
    setProofLoadError(false);
    setIsProofLoading(true);

    const signed = await getSignedProofUrl(rawRef, {
      expiresIn: 3600,
      memberNo,
      memberName: user?.name || '',
    });

    if (!signed) {
      console.error('[MemberInvestmentsTab] Bukti tidak dapat dimuat:', { rawRef, memberNo });
      setProofLoadError(true);
    } else {
      setSelectedProofUrl(signed);
    }
    setIsProofLoading(false);
  };

  // Calculations
  const totalInvested = transactions
    .filter((t) => t.status === 'APPROVED' || t.status === 'ACTIVE')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const pendingInvested = transactions
    .filter((t) => t.status === 'PENDING' || t.status === 'PAYMENT_CONFIRMED')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const estimatedAnnualShu = transactions
    .filter((t) => t.status === 'APPROVED' || t.status === 'ACTIVE')
    .reduce((sum, t) => {
      const roi = t.campaign?.projected_roi_percent || 15;
      return sum + (Number(t.amount || 0) * roi) / 100;
    }, 0);

  const totalUnits = transactions
    .filter((t) => t.status === 'APPROVED' || t.status === 'ACTIVE')
    .reduce((sum, t) => sum + Number(t.units_count || 1), 0);

  return (
    <div id="member-investments-tab" className="space-y-6 animate-fadeIn">
      {/* Subtab Navigation: Portofolio vs Peluang Investasi */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('PORTOFOLIO')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'PORTOFOLIO'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Portofolio Efek Saya</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                subTab === 'PORTOFOLIO' ? 'bg-emerald-800 text-amber-300' : 'bg-stone-200 text-stone-700'
              }`}
            >
              {transactions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('PELUANG_PROYEK')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'PELUANG_PROYEK'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-gold" />
            <span>Peluang Investasi Proyek</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              {campaigns.filter((c) => c.status === 'OPEN').length} Buka
            </span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-stone-500 hidden sm:block">
          Urun Dana Tertutup • NRA: {memberNo}
        </div>
      </div>

      {subTab === 'PORTOFOLIO' ? (
        <>
          {/* 4 Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-surface border-stone-200">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
            <span>Portofolio Investasi Aktif</span>
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold font-serif text-emerald-950">
            {formatRupiah(totalInvested)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
            <span>{totalUnits} Unit Efek</span>
            {pendingInvested > 0 && (
              <span className="text-amber-700 font-mono">
                (+{formatRupiah(pendingInvested)} proses verifikasi)
              </span>
            )}
          </div>
        </Card>

        <Card className="p-4 bg-surface border-stone-200">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
            <span>Estimasi SHU Investasi / Thn</span>
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-900">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold font-serif text-accent-gold-dark">
            ~ {formatRupiah(estimatedAnnualShu)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            Imbal hasil proporsional dari performa proyek riil
          </div>
        </Card>

        <Card className="p-4 bg-surface border-stone-200">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
            <span>Total Proyek Terdanai</span>
            <span className="p-1.5 rounded-lg bg-stone-100 text-stone-700">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-stone-900">
            {transactions.filter((t) => t.status === 'APPROVED' || t.status === 'ACTIVE').length} Proyek
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            Sektor agrikultur, properti, & industri
          </div>
        </Card>

        <Card className="p-4 bg-surface border-stone-200">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
            <span>Kepatuhan & Sertifikasi</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-sm font-bold text-stone-900 mt-1">
            Fatwa DSN-MUI
          </div>
          <div className="text-[11px] text-emerald-800 font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Terikat Akad Syariah Sah
          </div>
        </Card>
      </div>

      {/* Daftar Transaksi & Kepemilikan Efek */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold font-serif text-stone-900">
              Daftar Kepemilikan Efek & Sukuk Syariah
            </h3>
            <p className="text-xs text-stone-500">
              Penyertaan modal anggota pada unit-unit Strategic Projects KOPSIM Mandiri
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onExploreProjects) onExploreProjects();
              else setSubTab('PELUANG_PROYEK');
            }}
            className="text-xs"
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-accent-gold" />}
          >
            Cari Peluang Investasi
          </Button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-stone-500 text-xs">Memuat portofolio efek...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-300 space-y-3">
            <Coins className="w-10 h-10 text-stone-400 mx-auto" />
            <h4 className="font-serif font-bold text-stone-800 text-sm">
              Belum Ada Kepemilikan Investasi Efek
            </h4>
            <p className="text-xs text-stone-600 max-w-sm mx-auto">
              Anda belum memiliki portofolio efek SUKS atau Sukuk pada proyek aktif KOPSIM. Sebagai anggota terdaftar, Anda dapat langsung menyertakan modal pada proyek produktif koperasi.
            </p>
            <Button
              variant="gold"
              size="sm"
              onClick={() => {
                if (onExploreProjects) onExploreProjects();
                else setSubTab('PELUANG_PROYEK');
              }}
              className="font-bold text-xs"
            >
              Jelajahi Proyek Investasi
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-4 rounded-xl bg-surface border border-stone-200/90 hover:border-emerald-800/50 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-emerald-900">
                      {tx.transaction_no}
                    </span>
                    <Badge
                      variant={
                        tx.status === 'APPROVED' || tx.status === 'ACTIVE'
                          ? 'success'
                          : tx.status === 'PENDING'
                          ? 'gold'
                          : 'stone'
                      }
                      size="sm"
                    >
                      {tx.status === 'ACTIVE'
                        ? 'Aktif'
                        : tx.status === 'APPROVED'
                        ? 'Disetujui'
                        : tx.status === 'PENDING'
                        ? 'Menunggu Verifikasi'
                        : tx.status}
                    </Badge>
                    <span className="text-[11px] text-stone-400">
                      {formatDateIndo(tx.created_at.split('T')[0])}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-stone-900 font-serif">
                    {tx.campaign?.project_name || tx.project_id}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-stone-600 flex-wrap">
                    <span>
                      Instrumen:{' '}
                      <strong>
                        {tx.campaign?.instrument_type || 'SUKS'} (Akad{' '}
                        {tx.campaign?.akad_type || 'MUSYARAKAH'})
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Tenor: <strong>{tx.campaign?.tenor_months || 12} Bulan</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Jadwal SHU:{' '}
                      <strong>{tx.campaign?.shu_distribution_schedule || 'TRIWULAN'}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-stone-500 block">Nominal Pokok</span>
                    <span className="text-sm font-bold font-mono text-emerald-950">
                      {formatRupiah(tx.amount)}
                    </span>
                    <span className="text-[10px] text-stone-500 block">
                      ({tx.units_count} Unit Efek)
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-2 flex-wrap justify-end">
                    {(() => {
                      const rawProof = tx.bukti_url || tx.payment_proof_url || '';
                      const hasProof = hasTransactionProof({ id: tx.id, filelink: rawProof, bukti_url: rawProof });
                      return hasProof ? (
                        <button
                          type="button"
                          onClick={() => handleOpenInvestmentProof(rawProof)}
                          className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 underline underline-offset-2 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Lihat Bukti
                        </button>
                      ) : (
                        <span className="text-[11px] text-stone-400">Bukti: -</span>
                      );
                    })()}

                    {tx.agreement && (
                      <button
                        type="button"
                        onClick={() => setSelectedAgreement(tx.agreement || null)}
                        className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 underline underline-offset-2"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        Naskah Akad Digital
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  ) : (
    /* VIEW 2: PELUANG INVESTASI PROYEK BARU UNTUK ANGGOTA */
    <div className="space-y-6">
      <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-950 via-emerald-900 to-stone-900 text-white rounded-2xl border border-emerald-800/80 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-accent-gold/20 text-accent-gold border border-accent-gold/30">
              Urun Dana Internal Anggota
            </span>
            <span className="text-emerald-300 text-xs font-mono">
              NRA: {memberNo}
            </span>
          </div>
          <h3 className="font-bold text-lg sm:text-xl font-serif text-white">
            Katalog Peluang Investasi Sektor Riil
          </h3>
          <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
            Penyertaan modal langsung pada rantai pasok strategis koperasi dengan akad syariah murni, diawasi Dewan Pengawas Syariah, dan berorientasi pada imbal hasil berkala untuk anggota.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-stone-500 text-xs">
          Memuat daftar penawaran efek proyek...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-300 text-xs text-stone-500">
          Belum ada kampanye investasi yang sedang aktif saat ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((camp) => (
            <InvestmentCampaignCard
              key={camp.id}
              campaign={camp}
              onInvest={(c) => setSelectedCampaignForInvest(c)}
            />
          ))}
        </div>
      )}
    </div>
  )}

  {/* MODAL CHECKOUT INVESTASI & AKAD UNTUK ANGGOTA */}
  {selectedCampaignForInvest && (
    <InvestmentCheckoutModal
      campaign={selectedCampaignForInvest}
      onClose={() => setSelectedCampaignForInvest(null)}
      onSuccess={() => {
        loadMemberInvestments();
        setSubTab('PORTOFOLIO');
      }}
    />
  )}

      {/* Modal Naskah Akad Digital */}
      {selectedAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs">
          <div className="bg-surface rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-800" />
                <div>
                  <h3 className="font-bold text-sm font-serif text-stone-900">
                    Sertifikat & Naskah Akad Digital Syariah
                  </h3>
                  <span className="text-[11px] font-mono text-stone-500">
                    {selectedAgreement.agreement_no}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgreement(null)}
                aria-label="Tutup modal"
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 text-xs">
              <div>
                <span className="text-stone-500 block">Status Kontrak</span>
                <span className="font-bold text-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  Sah & Ditandatangani Digital
                </span>
              </div>
              <div className="text-right font-mono text-[11px]">
                <span className="text-stone-500 block">Hash Tanda Tangan:</span>
                <span className="font-bold text-stone-800">
                  {selectedAgreement.digital_signature_hash}
                </span>
              </div>
            </div>

            <div className="p-4 bg-stone-900 text-stone-200 rounded-xl h-72 overflow-y-auto font-mono text-[11px] leading-relaxed shadow-inner">
              <pre className="whitespace-pre-wrap font-mono">
                {selectedAgreement.agreement_text}
              </pre>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-stone-400">
                Ditandatangani pada: {formatDateIndo(selectedAgreement.signed_at.split('T')[0])}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                leftIcon={<Printer className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Cetak Kontrak
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pratinjau Bukti Pembayaran Investasi */}
      {(selectedProofRaw || selectedProofUrl) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs">
          <div className="bg-surface rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-sm font-serif text-stone-900">
                Bukti Pembayaran Investasi
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedProofUrl(null);
                  setSelectedProofRaw(null);
                  setProofLoadError(false);
                }}
                aria-label="Tutup pratinjau bukti"
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-stone-900 rounded-xl p-3 flex items-center justify-center min-h-56">
              {isProofLoading ? (
                <div className="flex flex-col items-center gap-2 text-stone-300 py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-xs">Membuat Signed URL bukti transfer...</span>
                </div>
              ) : proofLoadError || !selectedProofUrl ? (
                <div className="text-center p-6 text-stone-300 space-y-3">
                  <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                  <h4 className="font-bold text-white text-sm">Bukti tidak dapat dimuat</h4>
                  <p className="text-[11px] text-stone-400">
                    Gambar bukti pembayaran gagal dimuat dari Supabase Storage atau sesi akses kedaluwarsa.
                  </p>
                  {selectedProofRaw && (
                    <button
                      type="button"
                      onClick={() => handleOpenInvestmentProof(selectedProofRaw)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-600 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Muat Ulang Bukti</span>
                    </button>
                  )}
                </div>
              ) : isPdfFile(selectedProofUrl) ? (
                <a
                  href={selectedProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
                >
                  <ExternalLink className="w-4 h-4" />
                  Buka Dokumen PDF Bukti Transfer
                </a>
              ) : (
                <img
                  src={selectedProofUrl}
                  alt="Bukti Pembayaran Investasi"
                  className="max-h-[55vh] w-auto max-w-full object-contain rounded-lg"
                  referrerPolicy="no-referrer"
                  onError={() => {
                    console.error('[MemberInvestmentsTab] Bukti tidak dapat dimuat pada elemen gambar:', selectedProofUrl);
                    setProofLoadError(true);
                  }}
                />
              )}
            </div>

            <div className="flex justify-end gap-2">
              {selectedProofUrl && (
                <a
                  href={selectedProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Buka Berkas Asli
                </a>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedProofUrl(null);
                  setSelectedProofRaw(null);
                  setProofLoadError(false);
                }}
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
