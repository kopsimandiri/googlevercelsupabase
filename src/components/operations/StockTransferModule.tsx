import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, Plus } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Table, ColumnDef } from '../common/Table';
import { InventorySchemaNotice } from './InventorySchemaNotice';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { InventoryWarehouse, StockBalanceRecord, StockTransferRecord } from '../../types/inventory';
import { formatDateIndo } from '../../utils/formatters';

export const StockTransferModule: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useNotification();
  const isAdmin = role === 'ADMIN';

  const [transfers, setTransfers] = useState<StockTransferRecord[]>([]);
  const [warehouses, setWarehouses] = useState<InventoryWarehouse[]>([]);
  const [balances, setBalances] = useState<StockBalanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    transfer_date: today,
    source_warehouse_id: 'WH-AMB-CHL1',
    dest_warehouse_id: 'WH-AMB-CS01',
    balance_id: '',
    qty: 25,
    notes: '',
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [trf, whs, bal] = await Promise.all([
        inventoryService.getTransfers(),
        inventoryService.getWarehouses(),
        inventoryService.getStockBalances(),
      ]);
      setTransfers(trf);
      setWarehouses(whs);
      setBalances(bal.filter((b) => b.qty_on_hand > 0));
    } catch (err: any) {
      showToast(err?.message || 'Gagal memuat data mutasi barang.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const sourceSlots = balances.filter((b) => b.warehouse_id === form.source_warehouse_id);
  const selectedSlot = sourceSlots.find((b) => b.id === form.balance_id) || sourceSlots[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !selectedSlot) return;
    setSubmitting(true);
    try {
      const res = await inventoryService.createAndExecuteTransfer({
        transfer_date: form.transfer_date,
        source_warehouse_id: form.source_warehouse_id,
        dest_warehouse_id: form.dest_warehouse_id,
        notes: form.notes,
        items: [
          {
            product_sku: selectedSlot.product_sku,
            product_name: selectedSlot.product_name || selectedSlot.product_sku,
            batch_no: selectedSlot.batch_no,
            qty: Number(form.qty),
            unit: selectedSlot.unit,
          },
        ],
      });
      showToast(
        `Mutasi ${res.transfer_no} selesai (${res.total_qty.toLocaleString('id-ID')} ${selectedSlot.unit} dipindahkan).`,
        'success'
      );
      await loadAll();
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengeksekusi mutasi barang.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<StockTransferRecord>[] = [
    {
      key: 'transfer_no',
      header: 'No. Mutasi',
      cell: (r) => (
        <div>
          <div className="font-mono text-xs font-bold text-primary-900">{r.transfer_no}</div>
          <div className="text-[11px] text-stone-500">{formatDateIndo(r.transfer_date)}</div>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Asal -> Tujuan Gudang',
      cell: (r) => (
        <div className="text-xs">
          <span className="font-medium text-stone-700">{r.source_warehouse_name}</span>
          <span className="mx-1.5 text-primary-700 font-bold">&rarr;</span>
          <span className="font-semibold text-stone-900">{r.dest_warehouse_name}</span>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Komoditas & Lot',
      cell: (r) => (
        <div className="text-[11px] text-stone-700">
          {r.items.map((it, idx) => (
            <div key={idx}>
              {it.product_name} ({it.batch_no})
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'total_qty',
      header: 'Qty Mutasi',
      align: 'right',
      cell: (r) => <span className="font-mono text-xs font-bold tabular-nums">{r.total_qty.toLocaleString('id-ID')} Kg</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <Badge variant="success" size="sm">{r.status}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <InventorySchemaNotice />

      {isAdmin ? (
        <Card
          title="Mutasi Barang Antar Gudang / Cold Storage"
          subtitle="Memindahkan stok secara atomik (TRANSFER_OUT & TRANSFER_IN) tanpa mengubah total nilai stok koperasi"
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Tanggal Mutasi</label>
                <input
                  type="date"
                  required
                  value={form.transfer_date}
                  onChange={(e) => setForm({ ...form, transfer_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Gudang Asal *</label>
                <select
                  value={form.source_warehouse_id}
                  onChange={(e) => setForm({ ...form, source_warehouse_id: e.target.value, balance_id: '' })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouse_code} — {w.warehouse_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Gudang Tujuan *</label>
                <select
                  value={form.dest_warehouse_id}
                  onChange={(e) => setForm({ ...form, dest_warehouse_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouse_code} — {w.warehouse_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-stone-700 mb-1">Pilih Stok Lot Tersedia di Gudang Asal *</label>
                {sourceSlots.length === 0 ? (
                  <div className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800">
                    Tidak ada stok tersedia di gudang asal ini. Catat Inbound terlebih dahulu.
                  </div>
                ) : (
                  <select
                    value={selectedSlot?.id || ''}
                    onChange={(e) => setForm({ ...form, balance_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                  >
                    {sourceSlots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.product_sku} — {s.product_name} (Batch {s.batch_no} • Sisa: {s.qty_on_hand} {s.unit})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Qty Dipindahkan *</label>
                <input
                  type="number"
                  min={0.1}
                  step="0.1"
                  max={selectedSlot?.qty_on_hand || 999999}
                  required
                  value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono text-right"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Catatan Perpindahan</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Misal: Pemindahan dari Chiller Dermaga ke Cold Storage Utama"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-100">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={submitting}
                disabled={!selectedSlot || form.source_warehouse_id === form.dest_warehouse_id}
                leftIcon={<ArrowLeftRight className="w-3.5 h-3.5" />}
              >
                Eksekusi Mutasi Barang
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card title="Riwayat Mutasi Antar Gudang" subtitle="Jejak perpindahan antar ruangan/gudang Ambon">
        <Table
          columns={columns}
          data={transfers}
          keyExtractor={(r) => r.id}
          isLoading={loading}
          density="compact"
          emptyState={<p className="text-xs text-stone-500">Belum ada dokumen mutasi antar gudang.</p>}
        />
      </Card>
    </div>
  );
};
