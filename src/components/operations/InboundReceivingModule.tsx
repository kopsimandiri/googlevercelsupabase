import React, { useEffect, useState } from 'react';
import { ArrowDownToLine, Plus, Trash2 } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Table, ColumnDef } from '../common/Table';
import { InventorySchemaNotice } from './InventorySchemaNotice';
import { inventoryService } from '../../services/inventoryService';
import { productService, ProductItem } from '../../services/productService';
import { transactionService } from '../../services/transactionService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { InboundHeaderRecord, InboundItemInput, InventoryWarehouse } from '../../types/inventory';
import { formatDateIndo, formatRupiah } from '../../utils/formatters';

export const InboundReceivingModule: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useNotification();
  const isAdmin = role === 'ADMIN';

  const [inbounds, setInbounds] = useState<InboundHeaderRecord[]>([]);
  const [warehouses, setWarehouses] = useState<InventoryWarehouse[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const suppliers = transactionService.getSuppliers();
  const today = new Date().toISOString().split('T')[0];

  const [header, setHeader] = useState({
    inbound_date: today,
    warehouse_id: 'WH-AMB-CS01',
    supplier_name: suppliers[0]?.nama || 'Koperasi Nelayan Ambon',
    vessel_name: 'KM Bahari Mandiri 01',
    landing_port: 'PPN Tantui Ambon',
    qc_status: 'LOLOS_QC' as 'LOLOS_QC' | 'KARANTINA' | 'DITOLAK',
    notes: '',
  });

  const [items, setItems] = useState<InboundItemInput[]>([
    {
      product_sku: 'SKU-AMB-TUNA-YL',
      product_name: 'Tuna Sirip Kuning Loin Beku (Yellowfin Loin)',
      batch_no: `LOT-AMB-${today.replace(/-/g, '').slice(2)}`,
      qty: 100,
      unit: 'Kg',
      unit_cost: 65000,
      grade: 'Grade A Sashimi',
      temperature_c: -20,
      harvest_date: today,
      expiry_date: '',
    },
  ]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [inb, whs, prdRes] = await Promise.all([
        inventoryService.getInbounds(),
        inventoryService.getWarehouses(),
        productService.getAllProducts(),
      ]);
      setInbounds(inb);
      setWarehouses(whs);
      setProducts(prdRes.data);
      if (whs.length > 0 && !whs.some((w) => w.id === header.warehouse_id)) {
        setHeader((prev) => ({ ...prev, warehouse_id: whs[0].id }));
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal memuat data penerimaan barang.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const addLineItem = () => {
    const firstFish = products.find((p) => p.group_name.includes('IKAN')) || products[0];
    setItems((prev) => [
      ...prev,
      {
        product_sku: firstFish?.sku_code || 'SKU-AMB-CAKALANG',
        product_name: firstFish?.sku_name || 'Ikan Cakalang Beku Utuh',
        batch_no: `LOT-AMB-${today.replace(/-/g, '').slice(2)}-${prev.length + 1}`,
        qty: 50,
        unit: firstFish?.unit || 'Kg',
        unit_cost: firstFish?.defaultPrice || 25000,
        grade: firstFish?.grade || 'Grade A',
        temperature_c: -18,
        harvest_date: today,
        expiry_date: '',
      },
    ]);
  };

  const updateItem = (idx: number, patch: Partial<InboundItemInput>) => {
    setItems((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        if (patch.product_sku) {
          const matched = products.find((p) => p.sku_code === patch.product_sku);
          if (matched) {
            return {
              ...row,
              ...patch,
              product_name: matched.sku_name,
              unit: matched.unit || 'Kg',
              grade: matched.grade || 'Grade A',
              unit_cost: row.unit_cost || matched.defaultPrice || 0,
            };
          }
        }
        return { ...row, ...patch };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSubmitting(true);
    try {
      const res = await inventoryService.createAndPostInbound({
        ...header,
        items,
      });
      showToast(
        `Penerimaan ${res.inbound_no} berhasil dicatat (${res.total_qty.toLocaleString('id-ID')} Kg). Stok gudang bertambah otomatis.`,
        'success'
      );
      await loadAll();
    } catch (err: any) {
      showToast(err?.message || 'Gagal mencatat penerimaan barang.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<InboundHeaderRecord>[] = [
    {
      key: 'inbound_no',
      header: 'No. Dokumen',
      cell: (r) => (
        <div>
          <div className="font-mono text-xs font-bold text-primary-900">{r.inbound_no}</div>
          <div className="text-[11px] text-stone-500">{formatDateIndo(r.inbound_date)}</div>
        </div>
      ),
    },
    {
      key: 'supplier_name',
      header: 'Pemasok / Nelayan & Kapal',
      cell: (r) => (
        <div>
          <div className="font-semibold text-xs text-stone-900">{r.supplier_name}</div>
          <div className="text-[11px] text-stone-500">
            {r.vessel_name || '-'} • {r.landing_port || 'Ambon'}
          </div>
        </div>
      ),
    },
    {
      key: 'warehouse_name',
      header: 'Gudang Tujuan',
      cell: (r) => <span className="text-xs text-stone-700">{r.warehouse_name || r.warehouse_id}</span>,
    },
    {
      key: 'qc_status',
      header: 'Status QC',
      cell: (r) => (
        <Badge
          variant={r.qc_status === 'LOLOS_QC' ? 'success' : r.qc_status === 'KARANTINA' ? 'warning' : 'danger'}
          size="sm"
        >
          {r.qc_status}
        </Badge>
      ),
    },
    {
      key: 'total_qty',
      header: 'Total Qty',
      align: 'right',
      cell: (r) => (
        <span className="font-mono text-xs font-bold tabular-nums text-emerald-800">
          +{r.total_qty.toLocaleString('id-ID')} Kg
        </span>
      ),
    },
    {
      key: 'total_value',
      header: 'Nilai Pembelian',
      align: 'right',
      cell: (r) => (
        <span className="font-mono text-xs font-semibold tabular-nums text-stone-900">
          {formatRupiah(r.total_value)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <InventorySchemaNotice />

      {isAdmin ? (
        <Card
          title="Form Penerimaan Barang Masuk (Inbound Perikanan Ambon)"
          subtitle="Setiap penerimaan LOLOS_QC atau KARANTINA langsung memperbarui saldo gudang dan buku mutasi stok"
        >
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Tanggal Terima *</label>
                <input
                  type="date"
                  required
                  value={header.inbound_date}
                  onChange={(e) => setHeader({ ...header, inbound_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Gudang / Cold Storage Tujuan *</label>
                <select
                  value={header.warehouse_id}
                  onChange={(e) => setHeader({ ...header, warehouse_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouse_code} — {w.warehouse_name} ({w.target_temp_c}°C)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Pemasok / Kelompok Nelayan *</label>
                <input
                  type="text"
                  list="kopsim-suppliers-list"
                  required
                  value={header.supplier_name}
                  onChange={(e) => setHeader({ ...header, supplier_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
                <datalist id="kopsim-suppliers-list">
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.nama} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nama Kapal / Armada</label>
                <input
                  type="text"
                  value={header.vessel_name}
                  onChange={(e) => setHeader({ ...header, vessel_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Pelabuhan Pendaratan</label>
                <input
                  type="text"
                  value={header.landing_port}
                  onChange={(e) => setHeader({ ...header, landing_port: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Hasil Quality Control (QC)</label>
                <select
                  value={header.qc_status}
                  onChange={(e) => setHeader({ ...header, qc_status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                >
                  <option value="LOLOS_QC">LOLOS_QC (Masuk Stok Aktif)</option>
                  <option value="KARANTINA">KARANTINA (Masuk Pengawasan Mutu)</option>
                  <option value="DITOLAK">DITOLAK (Tidak Menambah Stok)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800">Rincian Item Ikan Diterima</span>
                <Button type="button" size="xs" variant="outline" onClick={addLineItem} leftIcon={<Plus className="w-3 h-3" />}>
                  Tambah Baris Ikan
                </Button>
              </div>

              <div className="overflow-x-auto border border-stone-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-stone-100 text-[11px] uppercase text-stone-600">
                    <tr>
                      <th className="py-2 px-3">SKU / Jenis Ikan</th>
                      <th className="py-2 px-3">Batch / Lot</th>
                      <th className="py-2 px-3">Qty</th>
                      <th className="py-2 px-3">Harga Beli / Unit (Rp)</th>
                      <th className="py-2 px-3">Suhu (°C)</th>
                      <th className="py-2 px-3">Kadaluwarsa</th>
                      <th className="py-2 px-3 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {items.map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-2 min-w-[210px]">
                          <select
                            value={row.product_sku}
                            onChange={(e) => updateItem(idx, { product_sku: e.target.value })}
                            className="w-full px-2 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                          >
                            {products.map((p) => (
                              <option key={p.sku_code} value={p.sku_code}>
                                {p.sku_code} — {p.sku_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 min-w-[140px]">
                          <input
                            type="text"
                            required
                            value={row.batch_no}
                            onChange={(e) => updateItem(idx, { batch_no: e.target.value.toUpperCase() })}
                            className="w-full px-2 py-1.5 rounded-lg border border-stone-300 font-mono text-xs"
                          />
                        </td>
                        <td className="p-2 w-28">
                          <input
                            type="number"
                            min={0.1}
                            step="0.1"
                            required
                            value={row.qty}
                            onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 rounded-lg border border-stone-300 font-mono text-xs text-right"
                          />
                        </td>
                        <td className="p-2 w-36">
                          <input
                            type="number"
                            min={0}
                            required
                            value={row.unit_cost}
                            onChange={(e) => updateItem(idx, { unit_cost: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 rounded-lg border border-stone-300 font-mono text-xs text-right"
                          />
                        </td>
                        <td className="p-2 w-24">
                          <input
                            type="number"
                            step="0.5"
                            value={row.temperature_c ?? -18}
                            onChange={(e) => updateItem(idx, { temperature_c: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 rounded-lg border border-stone-300 font-mono text-xs text-right"
                          />
                        </td>
                        <td className="p-2 w-36">
                          <input
                            type="date"
                            value={row.expiry_date || ''}
                            onChange={(e) => updateItem(idx, { expiry_date: e.target.value })}
                            className="w-full px-2 py-1.5 rounded-lg border border-stone-300 font-mono text-xs"
                          />
                        </td>
                        <td className="p-2 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                              aria-label="Hapus baris"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-100">
              <div className="text-xs text-stone-600 font-mono tabular-nums">
                Total Terima:{' '}
                <strong className="text-stone-900">
                  {items.reduce((s, i) => s + Number(i.qty || 0), 0).toLocaleString('id-ID')} Kg
                </strong>{' '}
                • Estimasi Nilai:{' '}
                <strong className="text-primary-900">
                  {formatRupiah(items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.unit_cost || 0), 0))}
                </strong>
              </div>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={submitting}
                leftIcon={<ArrowDownToLine className="w-3.5 h-3.5" />}
              >
                Posting Penerimaan ke Stok Gudang
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs text-stone-600">
          Mode pengawasan <strong>DIRECTOR (Read-Only)</strong>: Pencatatan penerimaan barang baru hanya tersedia untuk akun ADMIN.
        </div>
      )}

      <Card title="Riwayat Dokumen Penerimaan Barang (Inbound)" subtitle="Rekaman penerimaan ikan dari mitra nelayan dan kapal penampung">
        <Table
          columns={columns}
          data={inbounds}
          keyExtractor={(r) => r.id}
          isLoading={loading}
          density="compact"
          emptyState={<p className="text-xs text-stone-500">Belum ada transaksi penerimaan barang.</p>}
        />
      </Card>
    </div>
  );
};
