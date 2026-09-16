import React, { useState, useEffect } from 'react';
import { InvestmentTransaction, DigitalAgreement } from '../../types/investment';
import { investmentService } from '../../services/investmentService';
import { formatRupiah, formatDateIndo } from '../../utils/formatters';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
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
} from 'lucide-react';

interface MemberInvestmentsTabProps {
  memberNo: string;
  onExploreProjects?: () => void;
}

export const MemberInvestmentsTab: React.FC<MemberInvestmentsTabProps> = ({
  memberNo,
  onExploreProjects,
}) => {
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedAgreement, setSelectedAgreement] = useState<DigitalAgreement | null>(null);

  useEffect(() => {
    loadMemberInvestments();
  }, [memberNo]);

  const loadMemberInvestments = async () => {
    setIsLoading(true);
    try {
      const data = await investmentService.getTransactionsByMember(memberNo);
      setTransactions(data);
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
          {onExploreProjects && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExploreProjects}
              className="text-xs"
              leftIcon={<Coins className="w-3.5 h-3.5" />}
            >
              Cari Peluang Investasi
            </Button>
          )}
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
              Anda belum memiliki portofolio efek SUKS atau Sukuk pada proyek aktif KOPSIM. Mulai
              berinvestasi pada proyek sektor riil binaan koperasi.
            </p>
            {onExploreProjects && (
              <Button variant="gold" size="sm" onClick={onExploreProjects} className="font-bold text-xs">
                Jelajahi Proyek Investasi
              </Button>
            )}
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
