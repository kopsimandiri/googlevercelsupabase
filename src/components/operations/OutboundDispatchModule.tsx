import React, { useEffect, useState } from 'react';
import { ArrowUpFromLine } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Table, ColumnDef } from '../common/Table';
import { InventorySchemaNotice } from './InventorySchemaNotice';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { InventoryWarehouse, OutboundHeaderRecord, SalesOrderRecord, StockBalanceRecord } from '../../types/inventory';
import { formatDateIndo } from '../../utils/formatters';

export const OutboundDispatchModule: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useNotification();
  const isAdmin = role === 'ADMIN';

  const [outbounds, setOutbounds] = useState<OutboundHeaderRecord[]>([]);
  const [warehouses, setWarehouses] = useState<InventoryWarehouse[]>([]);
  const [balances, setBalances] = useState<StockBalanceRecord[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    outbound_date: today,
    warehouse_id: 'WH-AMB-CS01',
    outbound_type: 'SALES_DELIVERY' as 'SALES_DELIVERY' | 'SAMPLE_QC' | 'SPOILAGE_SHRINK' | 'INTERNAL_USE',
    sales_no: '',
    recipient_name: 'Buyer Ekspor Perikanan Nusantara',
    vehicle_no: 'DE 8821 AM',
    driver_name: 'Armada Reefer Ambon',
    balance_id: '',
    qty: 20,
    notes: '',
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [outb, whs, bal, sos] = await Promise.all([
        inventoryService.getOutbounds(),
        inventoryService.getWarehouses(),
        inventoryService.getStockBalances(),
        inventoryService.getSalesOrders(),
      ]);
      setOutbounds(outb);
      setWarehouses(whs);
      setBalances(bal.filter((b) => b.qty_on_hand > 0));
      setSalesOrders(sos.filter((s) => s.status === 'CONFIRMED'));
    } catch (err: any) {
      showToast(err?.message || 'Gagal memuat data pengeluaran barang.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const slotsInWh = balances.filter((b) => b.warehouse_id === form.warehouse_id);
  const selectedSlot = slotsInWh.find((b) => b.id === form.balance_id) || slotsInWh[0];

  const handleSelectSalesOrder = (salesNo: string) => {
    const matched = salesOrders.find((s) => s.sales_no === salesNo);
    if (!matched) {
      setForm({ ...form, sales_no: '' });
      return;
    }
    const firstItem = matched.items[0];
    const slot = balances.find(
      (b) => b.warehouse_id === matched.warehouse_id && b.product_sku === firstItem?.product_sku
    );
    setForm({
      ...form,
      sales_no: matched.sales_no,
      warehouse_id: matched.warehouse_id,
      recipient_name: matched.customer_name,
      outbound_type: 'SALES_DELIVERY',
      balance_id: slot?.id || '',
      qty: firstItem?.qty || form.qty,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !selectedSlot) return;
    setSubmitting(true);
    try {
      const res = await inventoryService.createAndPostOutbound({
        outbound_date: form.outbound_date,
        warehouse_id: form.warehouse_id,
        outbound_type: form.outbound_type,
        sales_no: form.sales_no || undefined,
        recipient_name: form.recipient_name,
        vehicle_no: form.vehicle_no,
        driver_name: form.driver_name,
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
        `Pengeluaran ${res.outbound_no} diposting (${res.total_qty.toLocaleString('id-ID')} ${selectedSlot.unit}). Stok berkurang atomik.`,
        'success'
      );
      await loadAll();
    } catch (err: any) {
      showToast(err?.message || 'Gagal mencatat pengeluaran barang.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<OutboundHeaderRecord>[] = [
    {
      key: 'outbound_no',
      header: 'No. Surat Jalan / Outbound',
      cell: (r) => (
        <div>
          <div className="font-mono text-xs font-bold text-primary-900">{r.outbound_no}</div>
          <div className="text-[11px] text-stone-500">{formatDateIndo(r.outbound_date)}</div>
        </div>
      ),
    },
    {
      key: 'recipient_name',
      header: 'Tujuan & Armada',
      cell: (r) => (
        <div>
          <div className="font-semibold text-xs text-stone-900">{r.recipient_name}</div>
          <div className="text-[11px] text-stone-500">
            {r.sales_no ? `Ref: ${r.sales_no} • ` : ''}
            {r.vehicle_no || '-'} ({r.driver_name || '-'})
          </div>
        </div>
      ),
    },
    {
      key: 'outbound_type',
      header: 'Jenis Keluar',
      cell: (r) => (
        <Badge variant={r.outbound_type === 'SALES_DELIVERY' ? 'primary' : 'warning'} size="sm">
          {r.outbound_type}
        </Badge>
      ),
    },
    {
      key: 'total_qty',
      header: 'Total Qty Keluar',
      align: 'right',
      cell: (r) => (
        <span className="font-mono text-xs font-bold tabular-nums text-rose-700">
          -{r.total_qty.toLocaleString('id-ID')} Kg
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <InventorySchemaNotice />

      {isAdmin && (
        <Card
          title="Pengeluaran Barang (Outbound & Surat Jalan Reefer)"
          subtitle="Mengeluarkan barang dari gudang secara terkendali dengan validasi saldo stok anti-negatif"
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Tanggal Keluar</label>
                <input
                  type="date"
                  required
                  value={form.outbound_date}
                  onChange={(e) => setForm({ ...form, outbound_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Referensi Sales Order (Opsional)</label>
                <select
                  value={form.sales_no}
                  onChange={(e) => handleSelectSalesOrder(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                >
                  <option value="">-- Pengeluaran Non-SO / Manual --</option>
                  {salesOrders.map((s) => (
                    <option key={s.sales_no} value={s.sales_no}>
                      {s.sales_no} — {s.customer_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Jenis Pengeluaran</label>
                <select
                  value={form.outbound_type}
                  onChange={(e) => setForm({ ...form, outbound_type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                >
                  <option value="SALES_DELIVERY">Pengiriman Penjualan</option>
                  <option value="SAMPLE_QC">Sample Lab / Uji Mutu</option>
                  <option value="SPOILAGE_SHRINK">Susut / Reject Cold Storage</option>
                  <option value="INTERNAL_USE">Keperluan Internal</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Gudang Asal *</label>
                <select
                  value={form.warehouse_id}
                  onChange={(e) => setForm({ ...form, warehouse_id: e.target.value, balance_id: '' })}
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
                <label className="block font-semibold text-stone-700 mb-1">Pilih Lot Stok yang Dikeluarkan *</label>
                {slotsInWh.length === 0 ? (
                  <div className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800">
                    Tidak ada stok tersedia di gudang ini.
                  </div>
                ) : (
                  <select
                    value={selectedSlot?.id || ''}
                    onChange={(e) => setForm({ ...form, balance_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                  >
                    {slotsInWh.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.product_sku} — {s.product_name} (Batch {s.batch_no} • Sisa: {s.qty_on_hand} {s.unit})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Qty Keluar *</label>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nama Penerima *</label>
                <input
                  type="text"
                  required
                  value={form.recipient_name}
                  onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nomor Kendaraan / Kontainer</label>
                <input
                  type="text"
                  value={form.vehicle_no}
                  onChange={(e) => setForm({ ...form, vehicle_no: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Supir / Kurir</label>
                <input
                  type="text"
                  value={form.driver_name}
                  onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-100">
              <Button
                type="submit"
                variant="danger"
                size="sm"
                isLoading={submitting}
                disabled={!selectedSlot}
                leftIcon={<ArrowUpFromLine className="w-3.5 h-3.5" />}
              >
                Posting Pengeluaran Barang
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Riwayat Pengeluaran Barang (Outbound)" subtitle="Seluruh surat jalan, sample QC, dan penyusutan cold storage">
        <Table
          columns={columns}
          data={outbounds}
          keyExtractor={(r) => r.id}
          isLoading={loading}
          density="compact"
          emptyState={<p className="text-xs text-stone-500">Belum ada dokumen pengeluaran barang.</p>}
        />
      </Card>
    </div>
  );
};
