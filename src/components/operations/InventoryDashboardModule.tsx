import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Clock,
  Fish,
  RefreshCw,
  ShoppingCart,
  ThermometerSnowflake,
  Warehouse,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Table, ColumnDef } from '../common/Table';
import { LoadingState } from '../common/LoadingState';
import { InventorySchemaNotice } from './InventorySchemaNotice';
import { inventoryService } from '../../services/inventoryService';
import { InventoryDashboardSummary, StockMovementRecord } from '../../types/inventory';
import { ActivePage } from '../../types/navigation';
import { formatDateTimeIndo, formatRupiah } from '../../utils/formatters';

interface InventoryDashboardModuleProps {
  onNavigate?: (page: ActivePage) => void;
}

export const InventoryDashboardModule: React.FC<InventoryDashboardModuleProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<InventoryDashboardSummary | null>(null);
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, movs] = await Promise.all([
        inventoryService.getDashboardSummary(),
        inventoryService.getStockMovements({ limit: 12 }),
      ]);
      setSummary(sum);
      setMovements(movs);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat dashboard operasional perikanan Ambon.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const movementCols: ColumnDef<StockMovementRecord>[] = [
    {
      key: 'movement_date',
      header: 'Waktu',
      cell: (r) => <span className="font-mono text-xs tabular-nums text-stone-600">{formatDateTimeIndo(r.movement_date)}</span>,
    },
    {
      key: 'movement_type',
      header: 'Aktivitas',
      cell: (r) => {
        const variant =
          r.movement_type === 'INBOUND' || r.movement_type === 'TRANSFER_IN'
            ? 'success'
            : r.movement_type === 'OPNAME_ADJUSTMENT'
            ? 'gold'
            : 'danger';
        return <Badge variant={variant} size="sm">{r.movement_type}</Badge>;
      },
    },
    {
      key: 'product_sku',
      header: 'Komoditas & Batch',
      cell: (r) => (
        <div>
          <div className="font-semibold text-xs text-stone-900">{r.product_name}</div>
          <div className="font-mono text-[11px] text-stone-500">
            {r.product_sku} • {r.batch_no}
          </div>
        </div>
      ),
    },
    {
      key: 'warehouse_name',
      header: 'Gudang',
      cell: (r) => <span className="text-xs text-stone-700">{r.warehouse_name || r.warehouse_id}</span>,
    },
    {
      key: 'qty_delta',
      header: 'Qty Mutasi',
      align: 'right',
      cell: (r) => (
        <span
          className={`font-mono text-xs font-bold tabular-nums ${
            r.qty_delta >= 0 ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          {r.qty_delta >= 0 ? '+' : ''}
          {r.qty_delta.toLocaleString('id-ID')} {r.unit}
        </span>
      ),
    },
    {
      key: 'balance_after',
      header: 'Saldo Akhir',
      align: 'right',
      cell: (r) => (
        <span className="font-mono text-xs font-semibold tabular-nums text-stone-900">
          {r.balance_after.toLocaleString('id-ID')} {r.unit}
        </span>
      ),
    },
    {
      key: 'reference_no',
      header: 'Referensi',
      cell: (r) => <span className="font-mono text-[11px] text-stone-600">{r.reference_no}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <InventorySchemaNotice />

      {/* Top Operation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-stone-200 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-900 text-accent-gold shrink-0">
            <Fish className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-stone-900">
              Pusat Kendali Inventory Perikanan Ambon
            </h2>
            <p className="text-xs text-stone-500">
              Pelabuhan Perikanan Nusantara (PPN) Tantui & Cold Storage KOPSIM Mandiri Maluku
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigate && (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={() => onNavigate('OPS_INBOUND')}
                leftIcon={<ArrowDownToLine className="w-3.5 h-3.5" />}
              >
                Penerimaan Masuk
              </Button>
              <Button
                size="sm"
                variant="gold"
                onClick={() => onNavigate('OPS_SALES')}
                leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}
              >
                Catat Penjualan
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Muat Ulang
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Memuat Ringkasan Cold Storage Ambon..." />
      ) : error ? (
        <Card>
          <p className="text-xs text-rose-700 font-medium">{error}</p>
        </Card>
      ) : summary ? (
        <>
          {/* KPI Grid (Single Elevation, Tabular Numerals) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
                <span>Total Stok Tersedia</span>
                <Boxes className="w-4 h-4 text-primary-700" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-stone-900">
                {summary.totalOnHandKg.toLocaleString('id-ID')} <span className="text-sm font-sans font-semibold text-stone-500">Kg</span>
              </div>
              <div className="mt-1 text-[11px] text-stone-500">
                {summary.totalActiveSkus} SKU aktif • Nilai {formatRupiah(summary.totalInventoryValue)}
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
                <span>Total Barang Masuk (Inbound)</span>
                <ArrowDownToLine className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-800">
                {summary.totalInboundQty.toLocaleString('id-ID')} <span className="text-sm font-sans font-semibold text-stone-500">Kg</span>
              </div>
              <div className="mt-1 text-[11px] text-stone-500">Akumulasi penerimaan dari kapal & nelayan</div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
                <span>Total Barang Keluar (Outbound)</span>
                <ArrowUpFromLine className="w-4 h-4 text-rose-700" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-rose-800">
                {summary.totalOutboundQty.toLocaleString('id-ID')} <span className="text-sm font-sans font-semibold text-stone-500">Kg</span>
              </div>
              <div className="mt-1 text-[11px] text-stone-500">Pengiriman penjualan, sample QC & penyusutan</div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
                <span>Realisasi Penjualan Ikan</span>
                <ShoppingCart className="w-4 h-4 text-accent-gold-dark" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono tabular-nums text-stone-900">
                {formatRupiah(summary.totalSalesRevenue)}
              </div>
              <div className="mt-1 text-[11px] text-stone-500 font-mono tabular-nums">
                {summary.totalSalesOrders} Sales Order tercatat
              </div>
            </div>
          </div>

          {/* Cold Storage Utilization & Low Stock / Expiry Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title="Utilisasi Cold Storage & Gudang Ambon"
              subtitle="Monitoring kapasitas ruang pendingin dan suhu target"
              action={
                onNavigate && (
                  <Button size="xs" variant="outline" onClick={() => onNavigate('OPS_WAREHOUSE_STOCK')}>
                    Lihat Detail Stok
                  </Button>
                )
              }
            >
              {summary.warehouseUtilization.length === 0 ? (
                <p className="text-xs text-stone-500">Belum ada gudang terdaftar.</p>
              ) : (
                <div className="space-y-4">
                  {summary.warehouseUtilization.map((wh) => (
                    <div key={wh.warehouse_id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Warehouse className="w-3.5 h-3.5 text-primary-700 shrink-0" />
                          <span className="font-semibold text-stone-900 truncate">{wh.warehouse_name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                            <ThermometerSnowflake className="w-3 h-3" />
                            {wh.target_temp_c}°C
                          </span>
                          <span className="font-bold text-stone-800 tabular-nums">
                            {wh.qty_on_hand.toLocaleString('id-ID')} / {wh.capacity_kg.toLocaleString('id-ID')} Kg
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden border border-stone-200">
                        <div
                          className={`h-full rounded-full transition-all ${
                            wh.utilization_pct > 85
                              ? 'bg-amber-600'
                              : 'bg-primary-700'
                          }`}
                          style={{ width: `${wh.utilization_pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card
              title="Peringatan Persediaan & Kualitas Lot"
              subtitle="SKU ikan di bawah stok minimum dan lot mendekati batas simpan"
            >
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Stok di Bawah Minimum ({summary.lowStockAlerts.length})
                    </span>
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate('OPS_FISH_PRODUCTS')}
                        className="text-[11px] font-semibold text-primary-700 hover:underline"
                      >
                        Atur Batas Min
                      </button>
                    )}
                  </div>
                  {summary.lowStockAlerts.length === 0 ? (
                    <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      Seluruh SKU ikan Ambon berada di atas batas minimum.
                    </p>
                  ) : (
                    <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                      {summary.lowStockAlerts.map((a) => (
                        <div key={a.sku_code} className="px-3 py-2 flex items-center justify-between text-xs bg-white">
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold text-stone-900 truncate">{a.sku_name}</div>
                            <div className="font-mono text-[10px] text-stone-500">{a.sku_code}</div>
                          </div>
                          <div className="text-right shrink-0 font-mono tabular-nums">
                            <span className="font-bold text-rose-700">{a.qty_on_hand.toLocaleString('id-ID')}</span>
                            <span className="text-stone-400"> / min {a.min_stock_qty.toLocaleString('id-ID')} {a.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-stone-800">
                    <Clock className="w-3.5 h-3.5 text-rose-600" />
                    Lot Cold Storage Mendekati Kadaluwarsa (&le; 30 Hari)
                  </div>
                  {summary.expiringSoonLots.length === 0 ? (
                    <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                      Tidak ada batch/lot yang mendekati batas kadaluwarsa dalam 30 hari ke depan.
                    </p>
                  ) : (
                    <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                      {summary.expiringSoonLots.map((lot) => (
                        <div key={`${lot.sku_code}-${lot.batch_no}`} className="px-3 py-2 flex items-center justify-between text-xs bg-rose-50/40">
                          <div>
                            <div className="font-semibold text-stone-900">{lot.sku_name}</div>
                            <div className="font-mono text-[10px] text-stone-500">Batch {lot.batch_no} • Exp {lot.expiry_date}</div>
                          </div>
                          <Badge variant={lot.days_remaining <= 7 ? 'danger' : 'warning'} size="sm">
                            {lot.days_remaining} hari
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Immutable Stock Movement Feed */}
          <Card
            title="Riwayat Mutasi Stok Terbaru (Single Source of Truth)"
            subtitle="Setiap penerimaan, perpindahan gudang, pengeluaran, dan penyesuaian opname tercatat otomatis"
            action={
              onNavigate && (
                <Button size="xs" variant="outline" onClick={() => onNavigate('OPS_INVENTORY_REPORTS')}>
                  Buka Laporan Lengkap
                </Button>
              )
            }
          >
            <Table
              columns={movementCols}
              data={movements}
              keyExtractor={(r) => r.id}
              density="compact"
              emptyState={
                <div className="py-6 text-center space-y-2">
                  <p className="text-xs text-stone-500">Belum ada pergerakan stok yang tercatat.</p>
                  {onNavigate && (
                    <Button size="xs" variant="primary" onClick={() => onNavigate('OPS_INBOUND')}>
                      Catat Penerimaan Barang Pertama
                    </Button>
                  )}
                </div>
              }
            />
          </Card>
        </>
      ) : null}
    </div>
  );
};
