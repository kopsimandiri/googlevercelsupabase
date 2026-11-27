import React, { useEffect, useMemo, useState } from 'react';
import { History, Search, Warehouse } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Table, ColumnDef } from '../common/Table';
import { Modal } from '../common/Modal';
import { InventorySchemaNotice } from './InventorySchemaNotice';
import { inventoryService } from '../../services/inventoryService';
import { InventoryWarehouse, StockBalanceRecord, StockMovementRecord } from '../../types/inventory';
import { formatDateIndo, formatDateTimeIndo, formatRupiah } from '../../utils/formatters';

export const WarehouseStockModule: React.FC = () => {
  const [balances, setBalances] = useState<StockBalanceRecord[]>([]);
  const [warehouses, setWarehouses] = useState<InventoryWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWh, setSelectedWh] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(true);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTitle, setHistoryTitle] = useState('');
  const [historyMovements, setHistoryMovements] = useState<StockMovementRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bal, whs] = await Promise.all([
        inventoryService.getStockBalances(),
        inventoryService.getWarehouses(),
      ]);
      setBalances(bal);
      setWarehouses(whs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return balances.filter((b) => {
      if (selectedWh !== 'ALL' && b.warehouse_id !== selectedWh) return false;
      if (onlyAvailable && b.qty_on_hand <= 0) return false;
      if (!q) return true;
      return (
        b.product_sku.toLowerCase().includes(q) ||
        (b.product_name || '').toLowerCase().includes(q) ||
        b.batch_no.toLowerCase().includes(q) ||
        (b.barcode_code || '').toLowerCase().includes(q)
      );
    });
  }, [balances, selectedWh, search, onlyAvailable]);

  const openSkuHistory = async (row: StockBalanceRecord) => {
    setHistoryTitle(`Kartu Mutasi: ${row.product_name || row.product_sku} (${row.product_sku})`);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const movs = await inventoryService.getStockMovements({
        productSku: row.product_sku,
        warehouseId: row.warehouse_id,
        limit: 50,
      });
      setHistoryMovements(movs);
    } finally {
      setHistoryLoading(false);
    }
  };

  const columns: ColumnDef<StockBalanceRecord>[] = [
    {
      key: 'warehouse_name',
      header: 'Gudang / Cold Storage',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Warehouse className="w-3.5 h-3.5 text-primary-700 shrink-0" />
          <span className="text-xs font-medium text-stone-800">{r.warehouse_name || r.warehouse_id}</span>
        </div>
      ),
    },
    {
      key: 'product_sku',
      header: 'Komoditas & Batch',
      cell: (r) => (
        <div>
          <div className="font-semibold text-xs text-stone-900">{r.product_name}</div>
          <div className="font-mono text-[11px] text-stone-500">
            {r.product_sku} • Lot {r.batch_no}
          </div>
        </div>
      ),
    },
    {
      key: 'qty_on_hand',
      header: 'Stok Tersedia',
      align: 'right',
      cell: (r) => {
        const isLow = r.min_stock_qty !== undefined && r.qty_on_hand < r.min_stock_qty;
        return (
          <div className="flex items-center justify-end gap-2">
            <span className="font-mono text-xs font-bold tabular-nums text-stone-900">
              {r.qty_on_hand.toLocaleString('id-ID')} {r.unit}
            </span>
            {isLow && <Badge variant="warning" size="sm">Menipis</Badge>}
          </div>
        );
      },
    },
    {
      key: 'avg_unit_cost',
      header: 'HPP Rata-rata',
      align: 'right',
      cell: (r) => (
        <span className="font-mono text-xs tabular-nums text-stone-700">
          {formatRupiah(r.avg_unit_cost)}
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Nilai Persediaan',
      align: 'right',
      cell: (r) => (
        <span className="font-mono text-xs font-semibold tabular-nums text-primary-900">
          {formatRupiah(r.qty_on_hand * r.avg_unit_cost)}
        </span>
      ),
    },
    {
      key: 'expiry_date',
      header: 'Exp / Tgl Tangkap',
      cell: (r) => (
        <div className="text-[11px] font-mono text-stone-600">
          {r.expiry_date ? `Exp: ${formatDateIndo(r.expiry_date)}` : 'Tanpa Exp'}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Audit',
      align: 'center',
      cell: (r) => (
        <Button size="xs" variant="outline" onClick={() => openSkuHistory(r)} leftIcon={<History className="w-3 h-3" />}>
          Kartu Stok
        </Button>
      ),
    },
  ];

  const historyCols: ColumnDef<StockMovementRecord>[] = [
    {
      key: 'movement_date',
      header: 'Waktu',
      cell: (m) => <span className="font-mono text-[11px] tabular-nums">{formatDateTimeIndo(m.movement_date)}</span>,
    },
    {
      key: 'movement_type',
      header: 'Jenis',
      cell: (m) => <Badge variant={m.qty_delta >= 0 ? 'success' : 'danger'} size="sm">{m.movement_type}</Badge>,
    },
    {
      key: 'qty_delta',
      header: 'Mutasi',
      align: 'right',
      cell: (m) => (
        <span className={`font-mono text-xs font-bold tabular-nums ${m.qty_delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {m.qty_delta >= 0 ? '+' : ''}
          {m.qty_delta.toLocaleString('id-ID')} {m.unit}
        </span>
      ),
    },
    {
      key: 'balance_after',
      header: 'Saldo Akhir',
      align: 'right',
      cell: (m) => (
        <span className="font-mono text-xs font-semibold tabular-nums">
          {m.balance_after.toLocaleString('id-ID')} {m.unit}
        </span>
      ),
    },
    {
      key: 'reference_no',
      header: 'Referensi & Catatan',
      cell: (m) => (
        <div>
          <div className="font-mono text-[11px] font-semibold text-stone-800">{m.reference_no}</div>
          <div className="text-[10px] text-stone-500">{m.notes}</div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <InventorySchemaNotice />

      <Card
        title="Inventory / Stok Gudang Real-Time per Lot & Cold Storage"
        subtitle="Posisi stok dihitung langsung dari ledger mutasi stok yang aman dari manipulasi manual"
      >
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter SKU, nama ikan, batch/lot, atau barcode..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedWh}
                onChange={(e) => setSelectedWh(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white"
              >
                <option value="ALL">Semua Gudang Ambon</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.warehouse_code} — {w.warehouse_name}
                  </option>
                ))}
              </select>

              <label className="inline-flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer px-2">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                  className="rounded border-stone-300 text-primary-700"
                />
                <span>Sembunyikan stok 0</span>
              </label>
            </div>
          </div>

          <Table
            columns={columns}
            data={filtered}
            keyExtractor={(r) => r.id}
            isLoading={loading}
            density="compact"
            emptyState={<p className="text-xs text-stone-500">Belum ada stok di gudang yang dipilih.</p>}
          />
        </div>
      </Card>

      <Modal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={historyTitle}
        subtitle="Audit trail mutasi masuk, keluar, transfer, dan penyesuaian stok"
        size="xl"
      >
        <Table
          columns={historyCols}
          data={historyMovements}
          keyExtractor={(r) => r.id}
          isLoading={historyLoading}
          density="compact"
        />
      </Modal>
    </div>
  );
};
