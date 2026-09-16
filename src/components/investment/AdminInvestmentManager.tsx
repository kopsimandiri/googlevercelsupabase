import React, { useState, useEffect } from 'react';
import {
  ProjectInvestmentCampaign,
  InvestmentTransaction,
  InvestmentDividendDistribution,
} from '../../types/investment';
import { investmentService } from '../../services/investmentService';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { formatRupiah, formatDateIndo } from '../../utils/formatters';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  Coins,
  Settings2,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Building2,
  Plus,
  Save,
  Check,
  Copy,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface AdminInvestmentManagerProps {
  projectId: string;
  projectName: string;
}

export const AdminInvestmentManager: React.FC<AdminInvestmentManagerProps> = ({
  projectId,
  projectName,
}) => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [campaign, setCampaign] = useState<ProjectInvestmentCampaign | null>(null);
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [dividends, setDividends] = useState<InvestmentDividendDistribution[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'CAMPAIGN' | 'TRANSACTIONS' | 'DIVIDENDS'>('CAMPAIGN');
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Form states for campaign
  const [isInvestmentEnabled, setIsInvestmentEnabled] = useState<boolean>(true);
  const [instrumentType, setInstrumentType] = useState<'SUKS' | 'SUKUK' | 'SAHAM'>('SUKS');
  const [akadType, setAkadType] = useState<'MUSYARAKAH' | 'MUDHARABAH' | 'WAKALAH' | 'MURABAHAH'>(
    'MUSYARAKAH'
  );
  const [targetAmount, setTargetAmount] = useState<number>(500000000);
  const [minInvestment, setMinInvestment] = useState<number>(1000000);
  const [projectedRoi, setProjectedRoi] = useState<number>(15.0);
  const [tenorMonths, setTenorMonths] = useState<number>(12);
  const [shuSchedule, setShuSchedule] = useState<'BULANAN' | 'TRIWULAN' | 'SEMESTER' | 'TAHUNAN'>(
    'TRIWULAN'
  );
  const [status, setStatus] = useState<ProjectInvestmentCampaign['status']>('OPEN');
  const [underlyingAsset, setUnderlyingAsset] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form states for new dividend
  const [newDivLabel, setNewDivLabel] = useState<string>('Bagi Hasil Kuartal Proyek');
  const [newDivAmount, setNewDivAmount] = useState<number>(15000000);
  const [newDivRoi, setNewDivRoi] = useState<number>(3.5);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allCampaigns, allTrx, allDividends] = await Promise.all([
        investmentService.getAllCampaigns(),
        investmentService.getAllTransactions(),
        investmentService.getAllDividends(),
      ]);

      const foundCampaign =
        allCampaigns.find(
          (c) =>
            c.project_id.toUpperCase().trim() === projectId.toUpperCase().trim() ||
            c.project_name.toUpperCase().trim() === projectName.toUpperCase().trim()
        ) || null;

      if (foundCampaign) {
        setCampaign(foundCampaign);
        setIsInvestmentEnabled(foundCampaign.is_investment_enabled);
        setInstrumentType(foundCampaign.instrument_type);
        setAkadType(foundCampaign.akad_type);
        setTargetAmount(foundCampaign.target_amount);
        setMinInvestment(foundCampaign.min_investment);
        setProjectedRoi(foundCampaign.projected_roi_percent);
        setTenorMonths(foundCampaign.tenor_months);
        setShuSchedule(foundCampaign.shu_distribution_schedule);
        setStatus(foundCampaign.status);
        setUnderlyingAsset(foundCampaign.underlying_asset || '');
      }

      // Filter transactions for this project
      const filteredTrx = allTrx.filter(
        (t) =>
          t.project_id.toUpperCase().trim() === projectId.toUpperCase().trim() ||
          (foundCampaign && t.campaign_id === foundCampaign.id)
      );
      setTransactions(filteredTrx);

      // Filter dividends
      if (foundCampaign) {
        setDividends(allDividends.filter((d) => d.campaign_id === foundCampaign.id));
      }
    } catch (err) {
      console.error('Error loading admin investment data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: Partial<ProjectInvestmentCampaign> & {
        project_id: string;
        project_name: string;
      } = {
        id: campaign?.id,
        project_id: projectId,
        project_name: projectName,
        instrument_type: instrumentType,
        akad_type: akadType,
        target_amount: Number(targetAmount),
        collected_amount: campaign?.collected_amount || 0,
        min_investment: Number(minInvestment),
        projected_roi_percent: Number(projectedRoi),
        tenor_months: Number(tenorMonths),
        shu_distribution_schedule: shuSchedule,
        offering_start_date: campaign?.offering_start_date || new Date().toISOString().split('T')[0],
        offering_end_date:
          campaign?.offering_end_date ||
          new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
        status,
        platform_fee_percent: 0.5,
        underlying_asset: underlyingAsset,
        is_investment_enabled: isInvestmentEnabled,
      };

      const result = await investmentService.upsertCampaign(payload);
      if (result.data) {
        setCampaign(result.data);
        showToast(
          `Pengaturan kampanye efek ${projectName} berhasil disimpan.`,
          'success',
          'Tersimpan'
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan pengaturan kampanye.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTrxStatus = async (
    trxId: string,
    newStatus: InvestmentTransaction['status']
  ) => {
    try {
      const ok = await investmentService.updateTransactionStatus(
        trxId,
        newStatus,
        user?.name || 'Admin'
      );
      if (ok) {
        showToast(`Status transaksi diubah menjadi ${newStatus}.`, 'success');
        setTransactions((prev) =>
          prev.map((t) => (t.id === trxId ? { ...t, status: newStatus } : t))
        );
      }
    } catch (e) {
      showToast('Gagal memperbarui status transaksi.', 'error');
    }
  };

  const handleAddDividend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) {
      showToast('Harap simpan kampanye proyek terlebih dahulu.', 'error');
      return;
    }
    try {
      const ok = await investmentService.addDividendDistribution({
        campaign_id: campaign.id,
        period_label: newDivLabel,
        distribution_date: new Date().toISOString().split('T')[0],
        gross_profit_shared: Number(newDivAmount),
        roi_rate_actual: Number(newDivRoi),
        status: 'DISTRIBUTED',
        notes: `Distribusi dividen bagi hasil proyek ${projectName}`,
      });
      if (ok) {
        showToast('Distribusi bagi hasil berhasil dicatat.', 'success');
        loadData();
      }
    } catch (e) {
      showToast('Gagal mencatat bagi hasil.', 'error');
    }
  };

  return (
    <div id="admin-investment-manager" className="space-y-5 animate-fadeIn">
      {/* Top Banner Status Proyek */}
      <div className="p-4 rounded-xl bg-surface border border-stone-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-900 text-amber-300 flex items-center justify-center font-bold font-serif shadow-xs">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base font-serif text-stone-900">
                Manajemen Investasi Syariah: {projectName}
              </h3>
              <Badge variant={isInvestmentEnabled ? 'success' : 'stone'} size="sm">
                {isInvestmentEnabled ? 'Investasi Aktif' : 'Nonaktif'}
              </Badge>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Kelola instrumen SUKS/Sukuk, verifikasi setoran anggota, dan riwayat bagi hasil proyek ini
            </p>
          </div>
        </div>

        {/* Feature Flag Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-100 transition-colors">
          <input
            type="checkbox"
            checked={isInvestmentEnabled}
            onChange={(e) => setIsInvestmentEnabled(e.target.checked)}
            className="rounded border-stone-300 text-emerald-800 focus:ring-emerald-700"
          />
          <span className="text-xs font-bold text-stone-800">
            {isInvestmentEnabled ? 'Buka Fitur Investasi' : 'Tutup Fitur Investasi'}
          </span>
        </label>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-stone-200 gap-4 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('CAMPAIGN')}
          className={`pb-2.5 border-b-2 transition-all ${
            activeTab === 'CAMPAIGN'
              ? 'border-emerald-800 text-emerald-950 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Konfigurasi Efek & Akad
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'TRANSACTIONS'
              ? 'border-emerald-800 text-emerald-950 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <span>Verifikasi Setoran Pemodal</span>
          {transactions.filter((t) => t.status === 'PENDING').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
              {transactions.filter((t) => t.status === 'PENDING').length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('DIVIDENDS')}
          className={`pb-2.5 border-b-2 transition-all ${
            activeTab === 'DIVIDENDS'
              ? 'border-emerald-800 text-emerald-950 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Distribusi Dividen / SHU
        </button>
      </div>

      {/* TAB 1: KONFIGURASI KAMPANYE EFEK */}
      {activeTab === 'CAMPAIGN' && (
        <form onSubmit={handleSaveCampaign} className="space-y-4">
          <Card className="p-5 space-y-4 border-stone-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Instrumen Efek</label>
                <select
                  value={instrumentType}
                  onChange={(e) => setInstrumentType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-700 outline-none"
                >
                  <option value="SUKS">SUKS (Surat Utang Koperasi Syariah)</option>
                  <option value="SUKUK">SUKUK (Efek Syariah Berbasis Aset)</option>
                  <option value="SAHAM">SAHAM (Penyertaan Modal Ekuitas)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Akad Syariah</label>
                <select
                  value={akadType}
                  onChange={(e) => setAkadType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-700 outline-none"
                >
                  <option value="MUSYARAKAH">Akad Musyarakah (Kemitraan Modal)</option>
                  <option value="MUDHARABAH">Akad Mudharabah (Bagi Hasil Usaha)</option>
                  <option value="MURABAHAH">Akad Murabahah (Jual Beli Tangguh)</option>
                  <option value="WAKALAH">Akad Wakalah (Pelimpahan Kuasa)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Status Penawaran</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-700 outline-none"
                >
                  <option value="OPEN">OPEN (Sedang Dibuka)</option>
                  <option value="COMING_SOON">COMING SOON (Segera Hadir)</option>
                  <option value="FUNDED">FUNDED (Terdanai 100%)</option>
                  <option value="ACTIVE">ACTIVE (Proyek Sedang Berjalan)</option>
                  <option value="COMPLETED">COMPLETED (Selesai)</option>
                  <option value="CLOSED">CLOSED (Ditutup)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Target Penggalangan Dana (Rp)
                </label>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-700 outline-none font-mono"
                  step="50000000"
                />
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Terformat: {formatRupiah(targetAmount)}
                </span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Minimal Investasi per Unit (Rp)
                </label>
                <input
                  type="number"
                  value={minInvestment}
                  onChange={(e) => setMinInvestment(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-700 outline-none font-mono"
                  step="500000"
                />
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Terformat: {formatRupiah(minInvestment)}
                </span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Proyeksi ROI (% per Tahun)
                </label>
                <input
                  type="number"
                  value={projectedRoi}
                  onChange={(e) => setProjectedRoi(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-700 outline-none font-mono"
                  step="0.5"
                />
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Contoh: 15.5 untuk 15,5% p.a.
                </span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Tenor (Bulan)</label>
                <input
                  type="number"
                  value={tenorMonths}
                  onChange={(e) => setTenorMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-700 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Jadwal Dividen / SHU</label>
                <select
                  value={shuSchedule}
                  onChange={(e) => setShuSchedule(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-700 outline-none"
                >
                  <option value="BULANAN">Bulanan</option>
                  <option value="TRIWULAN">Triwulan (3 Bulan)</option>
                  <option value="SEMESTER">Semester (6 Bulan)</option>
                  <option value="TAHUNAN">Tahunan</option>
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block font-bold text-stone-700 mb-1">
                  Underlying Asset / Dasar Objek Pembiayaan Riil
                </label>
                <input
                  type="text"
                  value={underlyingAsset}
                  onChange={(e) => setUnderlyingAsset(e.target.value)}
                  placeholder="Contoh: Pengadaan armada cold storage 30 Ton & kontrak suplai perikanan ekspor"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-700 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-100">
              <Button
                variant="gold"
                size="sm"
                type="submit"
                disabled={isSaving}
                leftIcon={<Save className="w-3.5 h-3.5" />}
                className="font-bold"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi Efek'}
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* TAB 2: VERIFIKASI SETORAN TRANSAKSI */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200 text-stone-500 text-xs">
              Belum ada pesanan efek investasi untuk proyek {projectName}.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-left text-xs bg-surface">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">No. Transaksi</th>
                    <th className="p-3">Investor (NRA)</th>
                    <th className="p-3 text-right">Nominal Pokok</th>
                    <th className="p-3">Metode</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Aksi Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-stone-50/70">
                      <td className="p-3 font-mono font-bold text-emerald-950">
                        {t.transaction_no}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-stone-900">{t.investor_name}</div>
                        <div className="text-[10px] text-stone-500 font-mono">{t.member_no}</div>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-stone-900">
                        {formatRupiah(t.amount)}
                        <span className="text-[10px] text-stone-400 block">
                          ({t.units_count} Unit)
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-[11px] text-stone-600">
                          {t.payment_method === 'TRANSFER_BANK'
                            ? 'Transfer Bank'
                            : 'Potong Simpanan'}
                        </span>
                        {t.payment_proof_url && (
                          <a
                            href={t.payment_proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-emerald-700 block underline mt-0.5"
                          >
                            Lihat Slip
                          </a>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            t.status === 'APPROVED' || t.status === 'ACTIVE'
                              ? 'success'
                              : t.status === 'PENDING'
                              ? 'gold'
                              : 'stone'
                          }
                          size="sm"
                        >
                          {t.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        {t.status === 'PENDING' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleUpdateTrxStatus(t.id, 'APPROVED')}
                              className="px-2 py-1 rounded-md bg-emerald-700 text-white font-bold hover:bg-emerald-800 text-[10px] flex items-center gap-1"
                              title="Setujui Setoran"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => handleUpdateTrxStatus(t.id, 'REJECTED')}
                              className="px-2 py-1 rounded-md bg-red-100 text-red-700 font-bold hover:bg-red-200 text-[10px] flex items-center gap-1"
                              title="Tolak Setoran"
                            >
                              <XCircle className="w-3 h-3" /> Tolak
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-stone-400">Terverifikasi</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DISTRIBUSI DIVIDEN / SHU */}
      {activeTab === 'DIVIDENDS' && (
        <div className="space-y-4 text-xs">
          <Card className="p-4 border-stone-200 bg-stone-50/70 space-y-3">
            <h4 className="font-bold text-stone-900 font-serif">
              Catat Distribusi Bagi Hasil / Dividen Baru
            </h4>
            <form onSubmit={handleAddDividend} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Nama Periode Bagi Hasil
                </label>
                <input
                  type="text"
                  value={newDivLabel}
                  onChange={(e) => setNewDivLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 outline-none text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Total Laba Dibagikan (Rp)
                </label>
                <input
                  type="number"
                  value={newDivAmount}
                  onChange={(e) => setNewDivAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 outline-none text-xs font-mono"
                  step="1000000"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Realisasi ROI Periode (%)
                </label>
                <input
                  type="number"
                  value={newDivRoi}
                  onChange={(e) => setNewDivRoi(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 outline-none text-xs font-mono"
                  step="0.1"
                />
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <Button
                  variant="gold"
                  size="sm"
                  type="submit"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  className="font-bold"
                >
                  Publikasikan Distribusi SHU
                </Button>
              </div>
            </form>
          </Card>

          {/* List of dividends */}
          <div className="space-y-2">
            <h5 className="font-bold text-stone-800">Riwayat Pembagian Dividen Proyek</h5>
            {dividends.length === 0 ? (
              <div className="p-4 text-center text-stone-500 bg-surface rounded-xl border border-stone-200">
                Belum ada dividen yang dibagikan untuk proyek ini.
              </div>
            ) : (
              dividends.map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-xl bg-surface border border-stone-200 flex items-center justify-between"
                >
                  <div>
                    <h6 className="font-bold text-stone-900">{d.period_label}</h6>
                    <span className="text-[11px] text-stone-500">
                      Tanggal: {formatDateIndo(d.distribution_date)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-900">
                      {formatRupiah(d.gross_profit_shared)}
                    </span>
                    <span className="text-[10px] text-stone-500 block">
                      Realisasi ROI: {d.roi_rate_actual}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
