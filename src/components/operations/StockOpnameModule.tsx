import React, { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Table, ColumnDef } from '../common/Table';
import { InventorySchemaNotice } from './InventorySchemaNotice';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { InventoryWarehouse, StockBalanceRecord, StockOpnameRecord } from '../../types/inventory';
import { formatDateIndo } from '../../utils/formatters';

interface EditableOpnameRow {
  product_sku: string;
  product_name: string;
  batch_no: string;
  system_qty: number;
  physical_qty: number;
  unit: string;
  reason: string;
}

export const StockOpnameModule: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useNotification();
  const isAdmin = role === 'ADMIN';

  const [opnames, setOpnames] = useState<StockOpnameRecord[]>([]);
  const [warehouses, setWarehouses] = useState<InventoryWarehouse[]>([]);
  const [balances, setBalances] = useState<StockBalanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [opnameDate, setOpnameDate] = useState(today);
  const [warehouseId, setWarehouseId] = useState('WH-AMB-CS01');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<EditableOpnameRow[]>([]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [opn, whs, bal] = await Promise.all([
        inventoryService.getStockOpnames(),
        inventoryService.getWarehouses(),
        inventoryService.getStockBalances(),
      ]);
      setOpnames(opn);
      setWarehouses(whs);
      setBalances(bal);
    } catch (err: any) {
      showToast(err?.message || 'Gagal memuat data stock opname.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const whSlots = balances.filter((b) => b.warehouse_id === warehouseId);
    setRows(
      whSlots.map((s) => ({
        product_sku: s.product_sku,
        product_name: s.product_name || s.product_sku,
        batch_no: s.batch_no,
        system_qty: s.qty_on_hand,
        physical_qty: s.qty_on_hand,
        unit: s.unit,
        reason: '',
      }))
    );
  }, [warehouseId, balances]);

  const handleSaveOpname = async (approveImmediately: boolean) => {
    if (!isAdmin || rows.length === 0) return;
    setSubmitting(true);
    try {
      const res = await inventoryService.createAndApproveStockOpname({
        opname_date: opnameDate,
        warehouse_id: warehouseId,
        approveImmediately,
        notes,
        items: rows,
      });
      showToast(
        approveImmediately
          ? `Opname ${res.opname_no} disetujui. Selisih ${res.total_variance_qty} Kg disesuaikan ke saldo stok.`
          : `Draft Opname ${res.opname_no} tersimpan.`,
        'success'
      );
      await loadAll();
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan stock opname.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveDraft = async (opnameNo: string) => {
    if (!isAdmin) return;
    setSubmitting(true);
    try {
      await inventoryService.approveDraftStockOpname(opnameNo);
      showToast(`Opname ${opnameNo} berhasil disetujui dan disesuaikan ke stok.`, 'success');
      await loadAll();
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyetujui draft opname.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<StockOpnameRecord>[] = [
    {
      key: 'opname_no',
      header: 'No. Opname',
      cell: (r) => (
        <div>
          <div className="font-mono text-xs font-bold text-primary-900">{r.opname_no}</div>
          <div className="text-[11px] text-stone-500">{formatDateIndo(r.opname_date)}</div>
        </div>
      ),
    },
    {
      key: 'warehouse_name',
      header: 'Gudang',
      cell: (r) => <span className="text-xs text-stone-800">{r.warehouse_name || r.warehouse_id}</span>,
    },
    {
      key: 'total_items',
      header: 'Jumlah Lot',
      align: 'center',
      cell: (r) => <span className="font-mono text-xs tabular-nums">{r.total_items} Lot</span>,
    },
    {
      key: 'total_variance_qty',
      header: 'Total Selisih (Fisik - Sistem)',
      align: 'right',
      cell: (r) => (
        <span
          className={`font-mono text-xs font-bold tabular-nums ${
            r.total_variance_qty === 0
              ? 'text-emerald-700'
              : r.total_variance_qty > 0
              ? 'text-sky-700'
              : 'text-rose-700'
          }`}
        >
          {r.total_variance_qty > 0 ? '+' : ''}
          {r.total_variance_qty.toLocaleString('id-ID')} Kg
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <Badge variant={r.status === 'APPROVED' ? 'success' : 'warning'} size="sm">
          {r.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      cell: (r) =>
        r.status === 'DRAFT' && isAdmin ? (
          <Button
            size="xs"
            variant="primary"
            disabled={submitting}
            onClick={() => handleApproveDraft(r.opname_no)}
            leftIcon={<CheckCircle2 className="w-3 h-3" />}
          >
            Approve & Sesuaikan
          </Button>
        ) : (
          <span className="text-[11px] text-stone-500 font-mono">{r.approved_by || '-'}</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <InventorySchemaNotice />

      {isAdmin && (
        <Card
          title="Stock Opname & Penyesuaian Stok Fisik Cold Storage"
          subtitle="Bandingkan stok tercatat sistem dengan timbangan fisik di gudang Ambon; selisih otomatis tercatat di buku mutasi saat disetujui"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Tanggal Opname</label>
                <input
                  type="date"
                  value={opnameDate}
                  onChange={(e) => setOpnameDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Gudang Diperiksa</label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
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
                <label className="block font-semibold text-stone-700 mb-1">Catatan Audit</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Opname mingguan cold storage"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 text-stone-600 text-center">
                Belum ada batch stok di gudang ini untuk dilakukan stock opname.
              </div>
            ) : (
              <div className="overflow-x-auto border border-stone-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-stone-100 text-[11px] uppercase text-stone-600">
                    <tr>
                      <th className="py-2 px-3">Komoditas & Lot</th>
                      <th className="py-2 px-3 text-right">Stok Sistem</th>
                      <th className="py-2 px-3 text-right">Hasil Timbang Fisik</th>
                      <th className="py-2 px-3 text-right">Selisih</th>
                      <th className="py-2 px-3">Keterangan Selisih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {rows.map((row, idx) => {
                      const variance = Math.round((row.physical_qty - row.system_qty) * 100) / 100;
                      return (
                        <tr key={`${row.product_sku}-${row.batch_no}`}>
                          <td className="p-2.5">
                            <div className="font-semibold text-stone-900">{row.product_name}</div>
                            <div className="font-mono text-[10px] text-stone-500">
                              {row.product_sku} • {row.batch_no}
                            </div>
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold tabular-nums">
                            {row.system_qty.toLocaleString('id-ID')} {row.unit}
                          </td>
                          <td className="p-2.5 text-right w-36">
                            <input
                              type="number"
                              min={0}
                              step="0.1"
                              value={row.physical_qty}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value));
                                setRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, physical_qty: val } : r))
                                );
                              }}
                              className="w-full px-2 py-1.5 rounded-lg border border-stone-300 font-mono text-xs text-right"
                            />
                          </td>
                          <td
                            className={`p-2.5 text-right font-mono font-bold tabular-nums ${
                              variance === 0
                                ? 'text-emerald-700'
                                : variance > 0
                                ? 'text-sky-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {variance > 0 ? '+' : ''}
                            {variance.toLocaleString('id-ID')} {row.unit}
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={row.reason}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, reason: e.target.value } : r))
                                )
                              }
                              placeholder="Susut es / selisih timbang..."
                              className="w-full px-2 py-1.5 rounded-lg border border-stone-300 text-xs"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-stone-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting || rows.length === 0}
                onClick={() => handleSaveOpname(false)}
              >
                Simpan Sebagai Draft
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={submitting}
                disabled={rows.length === 0}
                onClick={() => handleSaveOpname(true)}
                leftIcon={<ClipboardCheck className="w-3.5 h-3.5" />}
              >
                Approve & Sesuaikan Saldo Stok
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card title="Riwayat Stock Opname" subtitle="Daftar audit fisik dan status penyesuaian saldo">
        <Table
          columns={columns}
          data={opnames}
          keyExtractor={(r) => r.id}
          isLoading={loading}
          density="compact"
          emptyState={<p className="text-xs text-stone-500">Belum ada dokumen stock opname.</p>}
        />
      </Card>
    </div>
  );
};
