import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/dashboardService';
import { DashboardMetrics, PeriodFilter, TransactionRecord } from '../../types/database';
import { formatRupiah, formatDateIndo, formatDateTimeIndo } from '../../utils/formatters';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  Building,
  Briefcase,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  RefreshCw,
  Search,
  Calendar,
  Filter,
  Eye,
  X,
  FileText,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const DashboardShell: React.FC = () => {
  const { showToast } = useNotification();
  const { role } = useAuth();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTrx, setSelectedTrx] = useState<TransactionRecord | null>(null);

  const loadData = useCallback(async (selectedPeriod: PeriodFilter = period) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getDashboardMetrics(selectedPeriod);
      setMetrics(data);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat metrik dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData(period);
  }, [period, loadData]);

  const handlePeriodChange = (newPeriod: PeriodFilter) => {
    setPeriod(newPeriod);
    const labels: Record<PeriodFilter, string> = {
      ALL: 'Semua Periode',
      THIS_MONTH: 'Bulan Ini',
      THIS_YEAR: 'Tahun Ini',
      LAST_30_DAYS: '30 Hari Terakhir',
    };
    showToast(`Filter periode diubah: ${labels[newPeriod]}`, 'info');
  };

  // Filter recent transactions by search query
  const filteredRecentTransactions = (metrics?.recentTransactions || []).filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.id && t.id.toLowerCase().includes(q)) ||
      (t.kategori && t.kategori.toLowerCase().includes(q)) ||
      (t.plantation && t.plantation.toLowerCase().includes(q)) ||
      (t.keterangan && t.keterangan.toLowerCase().includes(q)) ||
      (t.sku_name && t.sku_name.toLowerCase().includes(q))
    );
  });

  if (isLoading && !metrics) {
    return (
      <LoadingState
        message="Memuat Dashboard Eksekutif KOPSIM..."
        subMessage="Menghitung rekapitulasi finansial Koperasi Pusat, Cabang & 8 Project Sektor Riil"
        fullHeight
      />
    );
  }

  if (error && !metrics) {
    return (
      <ErrorState
        title="Gagal Memuat Data Dashboard"
        errorMessage={error}
        onRetry={() => loadData(period)}
        idPrefix="dashboard-main-error"
      />
    );
  }

  const fin = metrics?.financial;

  return (
    <div className="space-y-6" id="dashboard-executive-view">
      {/* Header Toolbar: Period Selector & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-stone-200/80 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
              Periode Laporan
            </h3>
            <span className="text-[11px] text-stone-500">
              Pembaruan Terakhir: {formatDateTimeIndo(metrics?.lastUpdated)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200">
            {(
              [
                { id: 'ALL', label: 'Semua' },
                { id: 'THIS_MONTH', label: 'Bulan Ini' },
                { id: 'THIS_YEAR', label: 'Tahun Ini' },
                { id: 'LAST_30_DAYS', label: '30 Hari' },
              ] as { id: PeriodFilter; label: string }[]
            ).map((p) => (
              <button
                key={p.id}
                id={`filter-period-${p.id}`}
                onClick={() => handlePeriodChange(p.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  period === p.id
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            id="btn-refresh-dashboard"
            variant="outline"
            size="sm"
            onClick={() => {
              loadData(period);
              showToast('Data dashboard telah diperbarui.', 'success');
            }}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Sinkron
          </Button>
        </div>
      </div>

      {/* KPI Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-metric-cards">
        {/* Total Saldo */}
        <Card className="p-4 border-l-4 border-l-emerald-700" headerBorder={false}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                TOTAL SALDO EFEKTIF
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-stone-900 mt-1 font-serif">
                {formatRupiah(fin?.saldo || 0)}
              </h3>
              <div className="flex items-center gap-1 mt-1 text-xs text-emerald-700 font-medium">
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                <span>Pemasukan - Pengeluaran</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-800">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Total Pemasukan */}
        <Card className="p-4 border-l-4 border-l-emerald-600" headerBorder={false}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                TOTAL PEMASUKAN
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-emerald-900 mt-1 font-serif">
                {formatRupiah(fin?.totalPemasukan || 0)}
              </h3>
              <div className="flex items-center gap-1 mt-1 text-xs text-emerald-700 font-medium">
                <span>Koperasi & Project</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Total Pengeluaran */}
        <Card className="p-4 border-l-4 border-l-rose-600" headerBorder={false}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                TOTAL PENGELUARAN
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-rose-900 mt-1 font-serif">
                {formatRupiah(fin?.totalPengeluaran || 0)}
              </h3>
              <div className="flex items-center gap-1 mt-1 text-xs text-rose-700 font-medium">
                <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                <span>Beban Operasional & Modal</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/70 text-rose-700">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Anggota */}
        <Card className="p-4 border-l-4 border-l-amber-500" headerBorder={false}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                TOTAL ANGGOTA
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-stone-900 mt-1 font-serif">
                {metrics?.membership.total.toLocaleString('id-ID')} Anggota
              </h3>
              <div className="flex items-center gap-1 mt-1 text-xs text-amber-800 font-medium">
                <span>Pusat: {metrics?.membership.pusat} • Cabang: {metrics?.membership.cabang}</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-700">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Breakdown: Koperasi vs Project Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entitas Koperasi */}
        <Card
          id="card-koperasi-entity-breakdown"
          title="Keuangan Koperasi (Pusat & Cabang)"
          subtitle="Arus kas simpanan anggota dan operasional organisasi"
          action={<Badge variant="success" size="sm">Induk Koperasi</Badge>}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-800 font-medium">Saldo Bersih Koperasi:</span>
                <p className="text-xl font-bold text-emerald-950 font-serif">
                  {formatRupiah(fin?.totalKoperasi || 0)}
                </p>
              </div>
              <div className="text-right text-xs space-y-0.5">
                <div className="text-emerald-700">Masuk: <span className="font-semibold">{formatRupiah(fin?.koperasi.masuk || 0)}</span></div>
                <div className="text-rose-700">Keluar: <span className="font-semibold">{formatRupiah(fin?.koperasi.keluar || 0)}</span></div>
              </div>
            </div>

            {/* Simpanan Categories Breakdown */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2.5">
                Rekapitulasi Simpanan Anggota
              </h4>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-center">
                  <span className="text-[10px] text-stone-500 font-medium block">S. Pokok</span>
                  <span className="text-xs font-bold text-emerald-900 block mt-0.5">
                    {formatRupiah(fin?.simpanan.pokok || 0)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-center">
                  <span className="text-[10px] text-stone-500 font-medium block">S. Wajib</span>
                  <span className="text-xs font-bold text-emerald-900 block mt-0.5">
                    {formatRupiah(fin?.simpanan.wajib || 0)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-center">
                  <span className="text-[10px] text-stone-500 font-medium block">S. Sukarela</span>
                  <span className="text-xs font-bold text-amber-900 block mt-0.5">
                    {formatRupiah(fin?.simpanan.manasuka || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Entitas Project */}
        <Card
          id="card-project-entity-breakdown"
          title="Keuangan 8 Project Sektor Riil"
          subtitle="Arus modal trading komoditas dan perputaran bisnis"
          action={<Badge variant="gold" size="sm">8 Strategic Projects</Badge>}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-900 font-medium">Saldo Bersih Project:</span>
                <p className="text-xl font-bold text-amber-950 font-serif">
                  {formatRupiah(fin?.totalProject || 0)}
                </p>
              </div>
              <div className="text-right text-xs space-y-0.5">
                <div className="text-emerald-700">Masuk: <span className="font-semibold">{formatRupiah(fin?.project.masuk || 0)}</span></div>
                <div className="text-rose-700">Keluar: <span className="font-semibold">{formatRupiah(fin?.project.keluar || 0)}</span></div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
              <span>Model transaksi project mengintegrasikan customer & supplier terverifikasi.</span>
              <Badge variant="primary" size="sm">Syariah Compliant</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* 8 Project Summaries Grid */}
      <Card
        id="card-all-projects-summary"
        title="Monitoring 8 Proyek Strategis Sektor Riil"
        subtitle="Evaluasi real-time saldo dan transaksi per unit usaha komoditas"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {(metrics?.projects || []).map((proj, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-stone-200 bg-white hover:border-emerald-700 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-emerald-800 font-mono">
                    P-{String(idx + 1).padStart(2, '0')}
                  </span>
                  <Badge variant={proj.saldo >= 0 ? 'success' : 'danger'} size="sm">
                    {proj.status}
                  </Badge>
                </div>
                <h4 className="text-xs font-bold text-stone-900 truncate">{proj.name}</h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {proj.komoditas && proj.komoditas.length > 0
                    ? proj.komoditas.join(', ')
                    : 'Komoditas Terdaftar'}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500 font-medium">Saldo:</span>
                <span className="font-bold text-emerald-950 font-serif">
                  {formatRupiah(proj.saldo)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Activity Table */}
      <Card
        id="card-recent-activity"
        title="Aktivitas Transaksi Terbaru"
        subtitle="Daftar mutasi kas dan komoditas tercatat terkini"
        action={
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Cari ID / Kategori / Entity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-700 focus:bg-white"
            />
          </div>
        }
      >
        {filteredRecentTransactions.length === 0 ? (
          <EmptyState
            title="Tidak Ada Transaksi Ditemukan"
            description="Tidak ada catatan transaksi yang sesuai dengan kriteria pencarian atau periode filter aktif."
            idPrefix="recent-trx-empty"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse" id="tbl-dashboard-recent-transactions">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/80 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">ID Trx</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Entitas / Project</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3 text-center">Jenis</th>
                  <th className="py-2.5 px-3 text-right">Nominal</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredRecentTransactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-emerald-950">{trx.id}</td>
                    <td className="py-3 px-3 text-stone-600">{formatDateIndo(trx.tanggal)}</td>
                    <td className="py-3 px-3 font-medium text-stone-800">{trx.plantation}</td>
                    <td className="py-3 px-3 text-stone-600">{trx.kategori}</td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant={trx.jenis === 'MASUK' ? 'success' : 'danger'} size="sm">
                        {trx.jenis}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-900 font-serif">
                      {formatRupiah(trx.jumlah)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        id={`btn-view-trx-${trx.id}`}
                        onClick={() => setSelectedTrx(trx)}
                        className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded transition-colors"
                        title="Lihat Detail Transaksi"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Transaction Detail Modal */}
      {selectedTrx && (
        <div
          id="trx-detail-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-800" />
                <h3 className="font-bold text-stone-900 font-serif">Detail Transaksi</h3>
              </div>
              <button
                onClick={() => setSelectedTrx(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl">
                <div>
                  <span className="text-stone-500 font-medium block">ID Transaksi</span>
                  <span className="font-bold font-mono text-emerald-950 text-sm">{selectedTrx.id}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">Tanggal</span>
                  <span className="font-semibold text-stone-900">{formatDateIndo(selectedTrx.tanggal)}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">Referal</span>
                  <span className="font-semibold text-stone-900">{selectedTrx.referal}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">Area Jenis</span>
                  <span className="font-semibold text-stone-900">{selectedTrx.area_jenis}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-stone-500 font-medium block">Entitas / Project</span>
                  <span className="font-semibold text-stone-900">{selectedTrx.plantation}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">Kategori</span>
                  <span className="font-semibold text-stone-900">{selectedTrx.kategori}</span>
                </div>
                {selectedTrx.sku_name && (
                  <div>
                    <span className="text-stone-500 font-medium block">Nama Produk / SKU</span>
                    <span className="font-semibold text-stone-900">{selectedTrx.sku_name}</span>
                  </div>
                )}
                {selectedTrx.qty > 0 && (
                  <div>
                    <span className="text-stone-500 font-medium block">QTY</span>
                    <span className="font-semibold text-stone-900">{selectedTrx.qty}</span>
                  </div>
                )}
                {selectedTrx.harga_satuan && selectedTrx.harga_satuan > 0 && (
                  <div>
                    <span className="text-stone-500 font-medium block">Harga Satuan</span>
                    <span className="font-semibold text-stone-900">{formatRupiah(selectedTrx.harga_satuan)}</span>
                  </div>
                )}
                <div>
                  <span className="text-stone-500 font-medium block">Metode / Sumber Dana</span>
                  <span className="font-semibold text-stone-900">{selectedTrx.metode_bayar}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-900">Total Nominal:</span>
                <span className="text-base font-bold text-emerald-950 font-serif">
                  {formatRupiah(selectedTrx.jumlah)}
                </span>
              </div>

              {selectedTrx.keterangan && (
                <div>
                  <span className="text-stone-500 font-medium block">Keterangan:</span>
                  <p className="text-stone-700 bg-stone-50 p-2.5 rounded-lg border border-stone-200 mt-1">
                    {selectedTrx.keterangan}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedTrx(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
