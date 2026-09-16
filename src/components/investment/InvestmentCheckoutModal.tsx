import React, { useState } from 'react';
import { ProjectInvestmentCampaign, InvestmentTransaction } from '../../types/investment';
import { investmentService } from '../../services/investmentService';
import { akadTemplateService } from '../../services/akadTemplateService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { formatRupiah, formatDateIndo } from '../../utils/formatters';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import {
  X,
  Coins,
  FileCheck,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  Building2,
  Calendar,
  Lock,
  ArrowRight,
  Download,
} from 'lucide-react';

interface InvestmentCheckoutModalProps {
  campaign: ProjectInvestmentCampaign;
  onClose: () => void;
  onSuccess: (trx: InvestmentTransaction) => void;
}

export const InvestmentCheckoutModal: React.FC<InvestmentCheckoutModalProps> = ({
  campaign,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [unitsCount, setUnitsCount] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<
    'TRANSFER_BANK' | 'SIMPANAN_SUKARELA' | 'VIRTUAL_ACCOUNT'
  >('TRANSFER_BANK');
  const [proofUrl, setProofUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form identity fallback
  const [investorName, setInvestorName] = useState<string>(user?.name || '');
  const [memberNo, setMemberNo] = useState<string>(user?.memberNo || '0926-03019');
  const [investorPhone, setInvestorPhone] = useState<string>('');

  // Agreement Confirmation States
  const [agreedMusyarakah, setAgreedMusyarakah] = useState<boolean>(false);
  const [agreedWakalah, setAgreedWakalah] = useState<boolean>(false);
  const [activeAkadTab, setActiveAkadTab] = useState<'MUSYARAKAH' | 'WAKALAH'>('MUSYARAKAH');

  // Success Result State
  const [completedTrx, setCompletedTrx] = useState<InvestmentTransaction | null>(null);

  const amount = unitsCount * campaign.min_investment;
  const platformFee = Math.round((amount * (campaign.platform_fee_percent || 0.5)) / 100);
  const totalPayment = amount + platformFee;
  const estAnnualReturn = Math.round((amount * campaign.projected_roi_percent) / 100);

  // Preview teks akad
  const previewAkadText = akadTemplateService.generateProjectAkadText({
    agreementNo: `DRAFT-${campaign.akad_type.slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`,
    campaign,
    investorName: investorName || 'Nama Pemodal',
    memberNo: memberNo || 'NRA-ANGGOTA',
    amount,
    unitsCount,
    dateStr: new Date().toISOString().split('T')[0],
  });

  const previewWakalahText = akadTemplateService.generateWakalahAkadText({
    agreementNo: `DRAFT-WKL-${Date.now().toString(36).toUpperCase()}`,
    investorName: investorName || 'Nama Pemodal',
    memberNo: memberNo || 'NRA-ANGGOTA',
    amount,
    platformFee,
    platformFeePercent: campaign.platform_fee_percent || 0.5,
    dateStr: new Date().toISOString().split('T')[0],
  });

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!investorName.trim()) {
      showToast('Nama pemodal wajib diisi.', 'error');
      return;
    }
    if (amount <= 0) {
      showToast('Nominal investasi tidak valid.', 'error');
      return;
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    if (!agreedMusyarakah || !agreedWakalah) {
      showToast('Harap setujui Akad Syariah dan Akad Wakalah bil Ujrah untuk melanjutkan.', 'error');
      return;
    }
    setStep(3);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await investmentService.createInvestmentTransaction({
        campaignId: campaign.id,
        memberNo: memberNo.trim(),
        investorName: investorName.trim(),
        investorEmail: user?.email,
        investorPhone: investorPhone.trim() || undefined,
        amount,
        paymentMethod,
        paymentProofUrl: proofUrl.trim() || undefined,
        akadAgreementConfirmed: agreedMusyarakah,
        wakalahAgreementConfirmed: agreedWakalah,
      });

      setCompletedTrx(result.transaction);
      setStep(4);
      onSuccess(result.transaction);
      showToast(
        `Penyertaan modal pada proyek ${campaign.project_name} berhasil dicatat.`,
        'success',
        'Investasi Diterima'
      );
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses transaksi investasi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="investment-checkout-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/75 backdrop-blur-xs overflow-y-auto animate-fadeIn"
    >
      <div className="bg-surface rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-900 text-amber-300">
              <Coins className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-sm sm:text-base font-serif text-stone-900">
                Penyertaan Investasi Sektor Riil
              </h3>
              <span className="text-[11px] text-stone-500 font-mono">
                {campaign.project_name} ({campaign.instrument_type} - Akad {campaign.akad_type})
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Wizard Bar */}
        {step < 4 && (
          <div className="px-6 py-3 bg-stone-100/70 border-b border-stone-200/70 flex items-center justify-between text-xs">
            {[
              { num: 1, label: 'Nominal & Lot' },
              { num: 2, label: 'Akad Digital' },
              { num: 3, label: 'Pembayaran' },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-[11px] ${
                    step === s.num
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : step > s.num
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </span>
                <span
                  className={`hidden sm:inline font-medium ${
                    step === s.num ? 'text-emerald-950 font-bold' : 'text-stone-500'
                  }`}
                >
                  {s.label}
                </span>
                {s.num < 3 && <span className="text-stone-300 ml-2">›</span>}
              </div>
            ))}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-stone-800 text-xs sm:text-sm">
          {/* =======================================================
              STEP 1: NOMINAL & SIMULASI RETURN
          ======================================================= */}
          {step === 1 && (
            <form onSubmit={handleStep1Next} className="space-y-5">
              {/* Campaign Highlights Summary */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    Target Pendanaan: {formatRupiah(campaign.target_amount)}
                  </span>
                  <h4 className="font-bold text-stone-900 text-sm mt-0.5 font-serif">
                    {campaign.project_name}
                  </h4>
                  <p className="text-[11px] text-stone-600 mt-1">
                    {campaign.underlying_asset || 'Aset produktif sektor riil syariah'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-stone-500 block">Proyeksi ROI</span>
                  <span className="text-base font-bold text-emerald-900 font-serif">
                    {campaign.projected_roi_percent}% p.a.
                  </span>
                  <span className="text-[10px] text-stone-500 block">Tenor: {campaign.tenor_months} Bln</span>
                </div>
              </div>

              {/* Data Pemodal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Nama Lengkap Pemodal (Sesuai KTA/KTP)
                  </label>
                  <input
                    type="text"
                    required
                    value={investorName}
                    onChange={(e) => setInvestorName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 outline-none"
                    placeholder="Nama Investor"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Nomor Registrasi Anggota (NRA)
                  </label>
                  <input
                    type="text"
                    required
                    value={memberNo}
                    onChange={(e) => setMemberNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 outline-none font-mono"
                    placeholder="0926-XXXXX"
                  />
                </div>
              </div>

              {/* Input Jumlah Unit / Lot */}
              <div className="space-y-3 p-4 rounded-xl bg-stone-50 border border-stone-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-stone-900 text-xs">
                      Jumlah Unit Investasi ({formatRupiah(campaign.min_investment)} / Unit)
                    </label>
                    <span className="text-[11px] text-stone-500 block">
                      Minimal pembelian: 1 Unit efek {campaign.instrument_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setUnitsCount(Math.max(1, unitsCount - 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-stone-300 font-bold hover:bg-stone-100 flex items-center justify-center text-sm shadow-2xs"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-bold text-base font-mono">
                      {unitsCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setUnitsCount(unitsCount + 1)}
                      className="w-8 h-8 rounded-lg bg-white border border-stone-300 font-bold hover:bg-stone-100 flex items-center justify-center text-sm shadow-2xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Instant Quick Lots */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-[10px] text-stone-500 font-medium">Pilihan Cepat:</span>
                  {[1, 2, 5, 10, 20].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setUnitsCount(qty)}
                      className={`px-2.5 py-1 text-[11px] rounded-lg border font-mono font-medium transition-all ${
                        unitsCount === qty
                          ? 'bg-emerald-900 text-white border-emerald-900'
                          : 'bg-white text-stone-700 border-stone-300 hover:border-emerald-700'
                      }`}
                    >
                      {qty} Unit
                    </button>
                  ))}
                </div>
              </div>

              {/* Rincian Finansial & Estimasi Bagi Hasil */}
              <div className="p-4 rounded-xl bg-stone-50/90 border border-stone-200/80 space-y-2 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Pokok Investasi ({unitsCount} Unit):</span>
                  <span className="font-mono font-semibold text-stone-900">
                    {formatRupiah(amount)}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Biaya Platform & Pengelolaan ({campaign.platform_fee_percent}%):</span>
                  <span className="font-mono font-semibold text-stone-900">
                    {formatRupiah(platformFee)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-800 pt-1 border-t border-stone-200">
                  <span className="font-bold">Estimasi Bagi Hasil ({campaign.projected_roi_percent}%/Thn):</span>
                  <span className="font-mono font-bold text-emerald-900 text-sm">
                    ~ {formatRupiah(estAnnualReturn)} / Thn
                  </span>
                </div>
                <div className="flex justify-between text-stone-900 pt-2 border-t border-stone-300 text-sm font-bold">
                  <span>Total Tagihan Pembayaran:</span>
                  <span className="font-serif text-emerald-950 font-bold">
                    {formatRupiah(totalPayment)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={onClose} type="button">
                  Batal
                </Button>
                <Button
                  variant="gold"
                  size="sm"
                  type="submit"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="font-bold"
                >
                  Lanjut ke Akad Digital
                </Button>
              </div>
            </form>
          )}

          {/* =======================================================
              STEP 2: PEMBACAAN & PERSETUJUAN AKAD DIGITAL SYARIAH
          ======================================================= */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                <ShieldCheck className="w-4 h-4 text-accent-gold shrink-0" />
                <span>
                  Sesuai fatwa DSN-MUI, setiap penyertaan modal wajib didahului dengan kejelasan akad
                  muamalah syariah antara Koperasi dan Anggota Pemodal.
                </span>
              </div>

              {/* Akad Tabs */}
              <div className="flex border-b border-stone-200 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveAkadTab('MUSYARAKAH')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all ${
                    activeAkadTab === 'MUSYARAKAH'
                      ? 'border-emerald-800 text-emerald-900'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  1. Akad {campaign.akad_type} (Kemitraan Modal)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAkadTab('WAKALAH')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all ${
                    activeAkadTab === 'WAKALAH'
                      ? 'border-emerald-800 text-emerald-900'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  2. Akad Wakalah bil Ujrah (Platform)
                </button>
              </div>

              {/* Scrollable Akad Clause Box */}
              <div className="p-4 bg-stone-900 text-stone-200 rounded-xl border border-stone-700 h-64 overflow-y-auto font-mono text-[11px] leading-relaxed select-text shadow-inner">
                <pre className="whitespace-pre-wrap font-mono">
                  {activeAkadTab === 'MUSYARAKAH' ? previewAkadText : previewWakalahText}
                </pre>
              </div>

              {/* Agreement Checkboxes */}
              <div className="space-y-2.5 p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedMusyarakah}
                    onChange={(e) => setAgreedMusyarakah(e.target.checked)}
                    className="mt-0.5 rounded border-stone-300 text-emerald-800 focus:ring-emerald-700"
                  />
                  <span className="text-xs text-stone-800 leading-snug">
                    Saya menyetujui seluruh isi <strong>Akad {campaign.akad_type}</strong> penyertaan
                    modal proyek {campaign.project_name} senilai {formatRupiah(amount)} secara sadar
                    dan syar'i.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedWakalah}
                    onChange={(e) => setAgreedWakalah(e.target.checked)}
                    className="mt-0.5 rounded border-stone-300 text-emerald-800 focus:ring-emerald-700"
                  />
                  <span className="text-xs text-stone-800 leading-snug">
                    Saya menyetujui <strong>Akad Wakalah bil Ujrah</strong> untuk pelimpahan kuasa
                    administrasi efek syariah dan pemotongan biaya platform 0,5% ({formatRupiah(platformFee)}).
                  </span>
                </label>
              </div>

              <div className="flex justify-between gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                  Kembali
                </Button>
                <Button
                  variant="gold"
                  size="sm"
                  disabled={!agreedMusyarakah || !agreedWakalah}
                  onClick={handleStep2Next}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="font-bold"
                >
                  Tandatangani & Lanjut Bayar
                </Button>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 3: METODE PEMBAYARAN & UPLOAD BUKTI
          ======================================================= */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold block uppercase">
                    Total Pembayaran
                  </span>
                  <span className="text-xl font-bold font-serif text-emerald-950">
                    {formatRupiah(totalPayment)}
                  </span>
                </div>
                <Badge variant="gold" size="sm">
                  {unitsCount} Lot Efek {campaign.instrument_type}
                </Badge>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-800">
                  Pilih Saluran Pembayaran:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setPaymentMethod('TRANSFER_BANK')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                      paymentMethod === 'TRANSFER_BANK'
                        ? 'border-emerald-800 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-800'
                        : 'border-stone-200 bg-white hover:border-stone-400'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-emerald-800 shrink-0" />
                    <div>
                      <span className="text-xs font-bold block text-stone-900">Transfer Bank Syariah</span>
                      <span className="text-[10px] text-stone-500">BSI / Mandiri / BCA Koperasi</span>
                    </div>
                  </div>

                  <div
                    onClick={() => setPaymentMethod('SIMPANAN_SUKARELA')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                      paymentMethod === 'SIMPANAN_SUKARELA'
                        ? 'border-emerald-800 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-800'
                        : 'border-stone-200 bg-white hover:border-stone-400'
                    }`}
                  >
                    <Coins className="w-5 h-5 text-accent-gold-dark shrink-0" />
                    <div>
                      <span className="text-xs font-bold block text-stone-900">Potong Simpanan Sukarela</span>
                      <span className="text-[10px] text-stone-500">Auto-debet saldo simpanan anggota</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rekening Tujuan Transfer */}
              {paymentMethod === 'TRANSFER_BANK' && (
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-xs">
                  <span className="font-bold text-stone-800 block">
                    Rekening Penampungan Amanah Investasi Proyek:
                  </span>
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Bank:</span>
                      <span className="font-bold text-stone-900">Bank Syariah Indonesia (BSI)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">No. Rekening:</span>
                      <span className="font-bold text-emerald-900 text-sm">719-283-0012</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Atas Nama:</span>
                      <span className="font-bold text-stone-900">KOPSIM MANDIRI - INVESTASI</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Bukti Pembayaran */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Bukti Setor / Tautan Slip Transfer (Opsional / Dapat Disusulkan)
                </label>
                <input
                  type="text"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://... atau nomor referensi transfer bank"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:border-emerald-700 outline-none"
                />
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Pengurus akan memvalidasi bukti transfer dalam 1x24 jam kerja.
                </span>
              </div>

              <div className="flex justify-between gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                  Kembali
                </Button>
                <Button
                  variant="gold"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={handleFinalSubmit}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  className="font-bold"
                >
                  {isSubmitting ? 'Memproses...' : 'Konfirmasi & Terbitkan Akad'}
                </Button>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 4: SUKSES & DIGITAL CERTIFICATE PREVIEW
          ======================================================= */}
          {step === 4 && completedTrx && (
            <div className="space-y-5 text-center py-2 animate-fadeIn">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg sm:text-xl font-bold font-serif text-stone-900">
                  Alhamdulillah, Investasi Berhasil Didaftarkan!
                </h4>
                <p className="text-xs text-stone-600 max-w-md mx-auto">
                  Akad digital telah ditandatangani secara sah dan terdaftar pada sistem kepemilikan efek
                  syariah Koperasi Syarikat Islam Mandiri.
                </p>
              </div>

              {/* Certificate Summary Card */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-left space-y-2.5 max-w-md mx-auto text-xs">
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500">Nomor Transaksi:</span>
                  <span className="font-mono font-bold text-stone-900">{completedTrx.transaction_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Proyek:</span>
                  <span className="font-semibold text-stone-900">{campaign.project_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Instrumen & Akad:</span>
                  <span className="font-semibold text-stone-900">
                    {campaign.instrument_type} (Akad {campaign.akad_type})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Penyertaan Pokok:</span>
                  <span className="font-mono font-bold text-emerald-950">
                    {formatRupiah(completedTrx.amount)} ({completedTrx.units_count} Unit)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Proyeksi SHU / Thn:</span>
                  <span className="font-semibold text-emerald-800">
                    {campaign.projected_roi_percent}% p.a.
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-stone-200">
                  <span className="text-stone-500">Status Pembayaran:</span>
                  <Badge variant="gold" size="sm">
                    {completedTrx.status === 'APPROVED' ? 'Disetujui' : 'Menunggu Verifikasi'}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-center gap-2 pt-2">
                <Button variant="primary" size="sm" onClick={onClose} className="font-bold">
                  Selesai & Tutup
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
