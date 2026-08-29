import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { loanService } from '../../services/loanService';
import {
  AkadType,
  LoanSimulationResult,
  LoanApplicationRecord,
  LoanApplicationStatus,
} from '../../types/database';
import {
  Calculator,
  ShieldCheck,
  FileText,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Building2,
  Table,
  CheckCircle2,
  XCircle,
  DollarSign,
  User,
  Search,
  Filter,
} from 'lucide-react';

interface LoanSimulatorModuleProps {
  initialMemberId?: string;
  initialMemberName?: string;
  isAdminView?: boolean;
}

export const LoanSimulatorModule: React.FC<LoanSimulatorModuleProps> = ({
  initialMemberId,
  initialMemberName,
  isAdminView = false,
}) => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const activeMemberId = initialMemberId || (user?.role === 'ANGGOTA' ? (user as any).username || (user as any).member_no || '0824-03001' : '0824-03001');
  const activeMemberName = initialMemberName || user?.nama || 'M. FACHRI MUBAROK';

  const [activeTab, setActiveTab] = useState<'SIMULATOR' | 'APPLICATIONS' | 'ADMIN_REVIEW'>('SIMULATOR');

  // Simulator Inputs
  const [loanAmount, setLoanAmount] = useState<number>(10000000);
  const [tenorMonths, setTenorMonths] = useState<number>(12);
  const [marginRatePa, setMarginRatePa] = useState<number>(6.0);
  const [akadType, setAkadType] = useState<AkadType>('MURABAHAH');
  const [peruntukan, setPeruntukan] = useState<string>('MODAL_KERJA_PERTANIAN');

  // Simulation Result State
  const [simulation, setSimulation] = useState<LoanSimulationResult>(() =>
    loanService.calculateClientSimulation(10000000, 12, 6.0, 'MURABAHAH')
  );
  const [isVerifyingServer, setIsVerifyingServer] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Application Submission Modal State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(7500000);
  const [collateralType, setCollateralType] = useState<string>('BPKB_MOTOR');
  const [collateralDetail, setCollateralDetail] = useState<string>('BPKB Motor Honda Vario 160 & Simpanan KOPSIM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Applications List State
  const [applications, setApplications] = useState<LoanApplicationRecord[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Admin Review Modal State
  const [selectedAppForReview, setSelectedAppForReview] = useState<LoanApplicationRecord | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [confirmStatusAction, setConfirmStatusAction] = useState<{
    id: string;
    status: LoanApplicationStatus;
    title: string;
    message: string;
  } | null>(null);

  // Update real-time simulation on input change
  useEffect(() => {
    const clientCalc = loanService.calculateClientSimulation(
      loanAmount,
      tenorMonths,
      marginRatePa,
      akadType
    );
    setSimulation(clientCalc);
  }, [loanAmount, tenorMonths, marginRatePa, akadType]);

  // Load applications
  const loadApplications = async () => {
    setIsLoadingApps(true);
    try {
      const data = await loanService.getApplications(
        user?.role === 'ANGGOTA' ? activeMemberId : undefined
      );
      setApplications(data);
    } catch (err) {
      console.warn('Error loading applications:', err);
    } finally {
      setIsLoadingApps(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [user]);

  // Server Authoritative Verification Handler
  const handleVerifyServer = async () => {
    setIsVerifyingServer(true);
    try {
      const serverCalc = await loanService.calculateServerAuthoritative(
        loanAmount,
        tenorMonths,
        marginRatePa,
        akadType
      );
      setSimulation(serverCalc);
      showToast('Kalkulasi terverifikasi otoritatif oleh server KOPSIM.', 'success');
    } catch (err: any) {
      showToast('Gagal memverifikasi ke server, menggunakan kalkulator lokal.', 'warning');
    } finally {
      setIsVerifyingServer(false);
    }
  };

  // Submit Application Handler
  const handleConfirmSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await loanService.submitApplication({
        member_id: activeMemberId,
        member_name: activeMemberName,
        akad_type: akadType,
        peruntukan,
        loan_amount: loanAmount,
        tenor_months: tenorMonths,
        margin_rate_pa: marginRatePa,
        collateral_type: collateralType,
        collateral_detail: collateralDetail,
        monthly_income: monthlyIncome,
      });

      if (res.success) {
        showToast(`Pengajuan pembiayaan ${res.data?.application_no || ''} berhasil dikirim!`, 'success');
        setIsApplyModalOpen(false);
        await loadApplications();
        setActiveTab('APPLICATIONS');
      } else {
        showToast(res.error || 'Gagal mengajukan pembiayaan.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: LoanApplicationStatus) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success">DISETUJUI</Badge>;
      case 'DISBURSED':
        return <Badge variant="success">DICAIRKAN</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">DITOLAK</Badge>;
      case 'UNDER_REVIEW':
      case 'SURVEY':
        return <Badge variant="warning">PROSES ANALISIS</Badge>;
      default:
        return <Badge variant="neutral">MENUNGGU REVIEW</Badge>;
    }
  };

  // Filtered Applications
  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.application_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.member_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.peruntukan.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="loan-simulator-module" className="space-y-6">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-emerald-700" />
            Simulasi & Pembiayaan Syariah
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Kalkulator perhitungan margin syariah (Murabahah, Ijarah, Musyarakah) & pengajuan pembiayaan anggota.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('SIMULATOR')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'SIMULATOR' ? 'bg-white text-emerald-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Kalkulator Simulasi
          </button>
          <button
            onClick={() => setActiveTab('APPLICATIONS')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'APPLICATIONS' ? 'bg-white text-emerald-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Riwayat Pengajuan ({applications.length})
          </button>
          {user?.role !== 'ANGGOTA' && (
            <button
              onClick={() => setActiveTab('ADMIN_REVIEW')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'ADMIN_REVIEW' ? 'bg-emerald-800 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Komite Pembiayaan (Admin)
            </button>
          )}
        </div>
      </div>

      {/* Official Mandatory Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-bold">Disclaimer Resmi: </span>
          Simulasi ini bukan keputusan kredit final. Keputusan persetujuan dan pencairan pembiayaan tunduk pada hasil verifikasi dokumen, analisis Debt Service Ratio (DSR), dan persetujuan Komite Pembiayaan Syariah KOPSIM Mandiri.
        </div>
      </div>

      {/* TAB 1: SIMULATOR & APPLICATION */}
      {activeTab === 'SIMULATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Input Form */}
          <div className="lg:col-span-6 space-y-5">
            <Card className="p-6 space-y-5 border-stone-200">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  Parameter Pembiayaan
                </h3>
                {simulation.is_authoritative && (
                  <Badge variant="success" className="text-[10px]">
                    <ShieldCheck className="w-3 h-3 mr-1 inline" /> Terverifikasi Server
                  </Badge>
                )}
              </div>

              {/* Plafon Pinjaman */}
              <div>
                <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                  <label htmlFor="loan-amount-input">Jumlah Pembiayaan (Plafon)</label>
                  <span className="font-bold text-emerald-800 text-sm">
                    Rp {loanAmount.toLocaleString('id-ID')}
                  </span>
                </div>
                <input
                  id="loan-amount-range"
                  type="range"
                  min="1000000"
                  max="100000000"
                  step="500000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-700"
                />
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[5000000, 10000000, 25000000, 50000000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setLoanAmount(val)}
                      className={`text-[11px] py-1 px-2 rounded border transition-all ${
                        loanAmount === val
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {val / 1000000} Jt
                    </button>
                  ))}
                </div>
              </div>

              {/* Tenor */}
              <div>
                <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                  <label htmlFor="tenor-input">Jangka Waktu (Tenor)</label>
                  <span className="font-bold text-stone-900 text-sm">{tenorMonths} Bulan</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[3, 6, 12, 24, 36].map((months) => (
                    <button
                      key={months}
                      type="button"
                      onClick={() => setTenorMonths(months)}
                      className={`text-xs py-2 rounded-lg font-semibold border transition-all ${
                        tenorMonths === months
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                          : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {months} Bln
                    </button>
                  ))}
                </div>
              </div>

              {/* Akad Syariah & Margin */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Jenis Akad Syariah
                  </label>
                  <Select
                    value={akadType}
                    onChange={(val) => setAkadType(val as AkadType)}
                    options={[
                      { value: 'MURABAHAH', label: 'Murabahah (Jual Beli)' },
                      { value: 'MUDHARABAH', label: 'Mudharabah (Bagi Hasil)' },
                      { value: 'MUSYARAKAH', label: 'Musyarakah (Kemitraan)' },
                      { value: 'IJARAH', label: 'Ijarah (Sewa Jasa)' },
                      { value: 'QARDH', label: 'Qardh (Kebajikan/Sosial)' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Margin / Jasa (per tahun)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="20"
                      value={marginRatePa}
                      onChange={(e) => setMarginRatePa(Number(e.target.value))}
                      className="text-right"
                    />
                    <span className="text-xs text-stone-500 font-bold">% p.a.</span>
                  </div>
                </div>
              </div>

              {/* Peruntukan */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Peruntukan Pembiayaan
                </label>
                <Select
                  value={peruntukan}
                  onChange={setPeruntukan}
                  options={[
                    { value: 'MODAL_KERJA_PERTANIAN', label: 'Modal Kerja Pertanian / Singkong Tapioka' },
                    { value: 'PENGADAAN_ALAT_MESIN', label: 'Pengadaan Alat Mesin & Perkebunan' },
                    { value: 'MODAL_DAGANG_KOMODITAS', label: 'Modal Usaha Perdagangan Komoditas' },
                    { value: 'RENOVASI_INFRASTRUKTUR', label: 'Renovasi & Sarana Infrastruktur' },
                    { value: 'KONSUMTIF_SYARIAH', label: 'Kebutuhan Pribadi / Pendidikan (Qardh/Ijarah)' },
                  ]}
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVerifyServer}
                  isLoading={isVerifyingServer}
                  className="flex-1 text-xs"
                >
                  <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-700" />
                  Verifikasi Otoritatif Server
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsApplyModalOpen(true)}
                  className="flex-1 text-xs bg-emerald-800 hover:bg-emerald-700"
                >
                  <ArrowRight className="w-4 h-4 mr-1.5" />
                  Ajukan Pembiayaan
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column: Output Summary & Amortization Preview */}
          <div className="lg:col-span-6 space-y-5">
            {/* Big Key Output Cards */}
            <Card className="p-6 bg-gradient-to-br from-emerald-900 to-stone-900 text-white border-none shadow-md">
              <div className="text-emerald-300 text-xs font-semibold tracking-wider uppercase mb-1">
                Estimasi Angsuran Bulanan
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight mb-4">
                Rp {simulation.monthly_installment.toLocaleString('id-ID')}
                <span className="text-xs font-normal text-emerald-200 ml-1">/ bulan</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-800/80">
                <div>
                  <div className="text-stone-300 text-xs">Porsi Pokok:</div>
                  <div className="text-sm font-bold text-white">
                    Rp {simulation.monthly_principal.toLocaleString('id-ID')}
                  </div>
                </div>
                <div>
                  <div className="text-stone-300 text-xs">Porsi Margin ({marginRatePa}% p.a.):</div>
                  <div className="text-sm font-bold text-emerald-300">
                    Rp {simulation.monthly_margin.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </Card>

            {/* Financial Details Table */}
            <Card className="p-5 border-stone-200 space-y-3">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Ringkasan Total Kewajiban
              </h4>

              <div className="divide-y divide-stone-100 text-xs">
                <div className="py-2 flex justify-between">
                  <span className="text-stone-600">Plafon Pembiayaan Bersih:</span>
                  <span className="font-semibold text-stone-900">
                    Rp {simulation.loan_amount.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-stone-600">Total Margin / Jasa Keuntungan:</span>
                  <span className="font-semibold text-emerald-800">
                    Rp {simulation.margin_amount.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-stone-600">Total Pengembalian ({tenorMonths} Bulan):</span>
                  <span className="font-bold text-stone-900 text-sm">
                    Rp {simulation.total_payment.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-stone-600">Akad Syariah:</span>
                  <span className="font-medium text-stone-800">{simulation.akad_type}</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScheduleModal(true)}
                  className="w-full text-xs"
                >
                  <Table className="w-4 h-4 mr-1.5 text-stone-600" />
                  Lihat Tabel Jadwal Angsuran ({simulation.schedule.length} Bulan)
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: APPLICATIONS LIST (MEMBER / USER VIEW) */}
      {activeTab === 'APPLICATIONS' && (
        <Card className="p-6 border-stone-200 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Daftar Pengajuan Pembiayaan Anda</h3>
              <p className="text-xs text-stone-500">
                Pantau proses verifikasi dokumen dan status persetujuan pembiayaan.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveTab('SIMULATOR')}
              className="text-xs bg-emerald-800"
            >
              + Buat Pengajuan Baru
            </Button>
          </div>

          {applications.length === 0 ? (
            <div className="text-center py-10 text-stone-400 text-sm">
              Belum ada pengajuan pembiayaan aktif.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-stone-200">
                <thead className="bg-stone-50 text-stone-600 font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-3">No. Pengajuan</th>
                    <th className="px-4 py-3">Akad & Peruntukan</th>
                    <th className="px-4 py-3 text-right">Plafon</th>
                    <th className="px-4 py-3 text-center">Tenor</th>
                    <th className="px-4 py-3 text-right">Angsuran / Bln</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-emerald-900">
                        {app.application_no}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-stone-900">{app.akad_type}</div>
                        <div className="text-stone-500 text-[11px]">{app.peruntukan.replace(/_/g, ' ')}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-stone-900">
                        Rp {app.loan_amount.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{app.tenor_months} Bln</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-800">
                        Rp {app.monthly_installment.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(app.status)}</td>
                      <td className="px-4 py-3 text-stone-500">
                        {new Date(app.created_at).toLocaleDateString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: ADMIN REVIEW & APPROVALS (KOMITE PEMBIAYAAN) */}
      {activeTab === 'ADMIN_REVIEW' && (
        <Card className="p-6 border-stone-200 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-800" />
                Daftar Permohonan Pembiayaan Komite Syariah
              </h3>
              <p className="text-xs text-stone-500">
                Otorisasi persetujuan, analisis DSR (Debt Service Ratio), dan pencairan dana pinjaman anggota.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-48">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Cari permohonan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-200"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-lg border border-stone-200 bg-white"
              >
                <option value="ALL">Semua Status</option>
                <option value="SUBMITTED">Menunggu Review</option>
                <option value="APPROVED">Disetujui</option>
                <option value="DISBURSED">Dicairkan</option>
                <option value="REJECTED">Ditolak</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-stone-200">
              <thead className="bg-stone-50 text-stone-600 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3">No. Pengajuan</th>
                  <th className="px-4 py-3">Anggota Pemohon</th>
                  <th className="px-4 py-3">Akad / Keperluan</th>
                  <th className="px-4 py-3 text-right">Plafon</th>
                  <th className="px-4 py-3 text-right">Angsuran / Bln</th>
                  <th className="px-4 py-3 text-center">DSR</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Aksi Otorisasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-emerald-900">
                      {app.application_no}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-stone-900">{app.member_name}</div>
                      <div className="text-[11px] text-stone-500 font-mono">ID: {app.member_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-stone-900">{app.akad_type}</div>
                      <div className="text-stone-500 text-[11px]">{app.peruntukan.replace(/_/g, ' ')}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-stone-900">
                      Rp {app.loan_amount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-800">
                      Rp {app.monthly_installment.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                          (app.dsr_percentage || 0) <= 35
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {app.dsr_percentage || 0}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(app.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        {app.status === 'SUBMITTED' && (
                          <>
                            <button
                              onClick={() =>
                                setConfirmStatusAction({
                                  id: app.id,
                                  status: 'APPROVED',
                                  title: 'Setujui Permohonan Pembiayaan',
                                  message: `Setujui pembiayaan ${app.application_no} untuk ${app.member_name} sebesar Rp ${app.loan_amount.toLocaleString('id-ID')}?`,
                                })
                              }
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Setujui
                            </button>
                            <button
                              onClick={() =>
                                setConfirmStatusAction({
                                  id: app.id,
                                  status: 'REJECTED',
                                  title: 'Tolak Permohonan Pembiayaan',
                                  message: `Tolak permohonan pembiayaan ${app.application_no} untuk ${app.member_name}?`,
                                })
                              }
                              className="px-2.5 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" /> Tolak
                            </button>
                          </>
                        )}
                        {app.status === 'APPROVED' && (
                          <button
                            onClick={() =>
                              setConfirmStatusAction({
                                id: app.id,
                                status: 'DISBURSED',
                                title: 'Cairkan Dana Pembiayaan',
                                message: `Cairkan dana pembiayaan ${app.application_no} sebesar Rp ${app.loan_amount.toLocaleString('id-ID')} ke rekening anggota ${app.member_name}?`,
                              })
                            }
                            className="px-2.5 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                          >
                            <DollarSign className="w-3 h-3" /> Cairkan
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* AMORTIZATION SCHEDULE MODAL */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title={`Tabel Jadwal Angsuran (${simulation.tenor_months} Bulan)`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs bg-stone-50 p-3 rounded-lg border border-stone-200">
            <div>
              <span className="text-stone-500">Plafon: </span>
              <span className="font-bold text-stone-900">
                Rp {simulation.loan_amount.toLocaleString('id-ID')}
              </span>
            </div>
            <div>
              <span className="text-stone-500">Margin ({marginRatePa}%): </span>
              <span className="font-bold text-emerald-800">
                Rp {simulation.margin_amount.toLocaleString('id-ID')}
              </span>
            </div>
            <div>
              <span className="text-stone-500">Total Pengembalian: </span>
              <span className="font-bold text-stone-900">
                Rp {simulation.total_payment.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto border border-stone-200 rounded-lg">
            <table className="w-full text-xs text-left divide-y divide-stone-200">
              <thead className="bg-stone-100 text-stone-700 font-semibold sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-center">Bulan</th>
                  <th className="px-3 py-2 text-right">Angsuran Pokok</th>
                  <th className="px-3 py-2 text-right">Margin Syariah</th>
                  <th className="px-3 py-2 text-right">Total Angsuran</th>
                  <th className="px-3 py-2 text-right">Sisa Pokok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {simulation.schedule.map((item) => (
                  <tr key={item.month} className="hover:bg-stone-50">
                    <td className="px-3 py-2 text-center font-bold text-stone-700">{item.month}</td>
                    <td className="px-3 py-2 text-right">
                      Rp {item.principal_installment.toLocaleString('id-ID')}
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-800 font-medium">
                      Rp {item.margin_installment.toLocaleString('id-ID')}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-stone-900">
                      Rp {item.total_installment.toLocaleString('id-ID')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-stone-600">
                      Rp {item.remaining_principal.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* SUBMISSION FORM MODAL */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Form Pengajuan Pembiayaan Syariah"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleConfirmSubmitApplication} className="space-y-4 text-xs">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1 text-emerald-950">
            <div className="font-bold flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-700" /> Ringkasan Pengajuan
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>Plafon: <strong>Rp {loanAmount.toLocaleString('id-ID')}</strong></div>
              <div>Tenor: <strong>{tenorMonths} Bulan</strong></div>
              <div>Akad: <strong>{akadType}</strong></div>
              <div>Angsuran: <strong className="text-emerald-800">Rp {simulation.monthly_installment.toLocaleString('id-ID')}/bln</strong></div>
            </div>
          </div>

          <div>
            <label className="block font-medium text-stone-700 mb-1">Nama Anggota Pemohon</label>
            <Input value={activeMemberName} disabled className="bg-stone-50" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Nomor Anggota</label>
              <Input value={activeMemberId} disabled className="bg-stone-50 font-mono" />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Penghasilan Bulanan (Rp)</label>
              <Input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-stone-700 mb-1">Jenis Agunan / Jaminan</label>
            <Select
              value={collateralType}
              onChange={setCollateralType}
              options={[
                { value: 'BPKB_MOTOR', label: 'BPKB Kendaraan Bermotor' },
                { value: 'SERTIFIKAT_TANAH', label: 'Sertifikat Tanah / Kebun Singkong' },
                { value: 'SIMPANAN_KOPSIM', label: 'Simpanan Sukarela / Deposito KOPSIM' },
                { value: 'SURAT_KARYAWAN', label: 'Surat Kuasa Potong Gaji' },
              ]}
            />
          </div>

          <div>
            <label className="block font-medium text-stone-700 mb-1">Rincian Agunan</label>
            <Input
              value={collateralDetail}
              onChange={(e) => setCollateralDetail(e.target.value)}
              placeholder="Contoh: BPKB Honda Vario 160 No Pol B-1234-XYZ"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsApplyModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting} className="bg-emerald-800">
              Kirim Permohonan
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM STATUS ACTION DIALOG */}
      {confirmStatusAction && (
        <ConfirmDialog
          isOpen={!!confirmStatusAction}
          onClose={() => setConfirmStatusAction(null)}
          onConfirm={async () => {
            const { id, status } = confirmStatusAction;
            setConfirmStatusAction(null);
            const res = await loanService.updateApplicationStatus(
              id,
              status,
              user?.nama || 'KOMITE_PEMBIAYAAN'
            );
            if (res.success) {
              showToast(`Status permohonan berhasil diperbarui menjadi ${status}.`, 'success');
              await loadApplications();
            } else {
              showToast(res.error || 'Gagal memperbarui status.', 'error');
            }
          }}
          title={confirmStatusAction.title}
          message={confirmStatusAction.message}
          confirmText="Konfirmasi"
          cancelText="Batal"
          variant={confirmStatusAction.status === 'REJECTED' ? 'danger' : 'primary'}
        />
      )}
    </div>
  );
};
