import React, { useState, useEffect } from 'react';
import { InvestmentTransaction, DigitalAgreement, ProjectInvestmentCampaign } from '../../types/investment';
import { investmentService } from '../../services/investmentService';
import { formatRupiah, formatDateIndo } from '../../utils/formatters';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { InvestmentCampaignCard } from './InvestmentCampaignCard';
import { InvestmentCheckoutModal } from './InvestmentCheckoutModal';
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
} from 'lucide-react';

interface MemberInvestmentsTabProps {
  memberNo: string;
  onExploreProjects?: () => void;
}

export const MemberInvestmentsTab: React.FC<MemberInvestmentsTabProps> = ({
  memberNo,
  onExploreProjects,
}) => {
  const [subTab, setSubTab] = useState<'PORTOFOLIO' | 'PELUANG_PROYEK'>('PORTOFOLIO');
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [campaigns, setCampaigns] = useState<ProjectInvestmentCampaign[]>([]);
  const [selectedCampaignForInvest, setSelectedCampaignForInvest] =
    useState<ProjectInvestmentCampaign | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedAgreement, setSelectedAgreement] = useState<DigitalAgreement | null>(null);

  useEffect(() => {
    loadMemberInvestments();
  }, [memberNo]);

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

                  {tx.agreement && (
                    <button
                      type="button"
                      onClick={() => setSelectedAgreement(tx.agreement || null)}
                      className="mt-2 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 underline underline-offset-2"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      Naskah Akad Digital
                    </button>
                  )}
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
    </div>
  );
};
