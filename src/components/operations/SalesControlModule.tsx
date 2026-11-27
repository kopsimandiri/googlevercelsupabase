import React, { useEffect, useState } from 'react';
import { BookCheck, Plus, ShoppingCart, Trash2 } from 'lucide-react';
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
import { InventoryWarehouse, SalesOrderItemInput, SalesOrderRecord, StockBalanceRecord } from '../../types/inventory';
import { formatDateIndo, formatRupiah } from '../../utils/formatters';

export const SalesControlModule: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useNotification();
  const isAdmin = role === 'ADMIN';

  const [orders, setOrders] = useState<SalesOrderRecord[]>([]);
  const [warehouses, setWarehouses] = useState<InventoryWarehouse[]>([]);
  const [balances, setBalances] = useState<StockBalanceRecord[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const customers = transactionService.getCustomers();
  const today = new Date().toISOString().split('T')[0];

  const [header, setHeader] = useState({
    sales_date: today,
    warehouse_id: 'WH-AMB-CS01',
    customer_name: customers[0]?.nama || 'Buyer Ekspor Perikanan Nusantara',
    sales_channel: 'B2B_GROSIR' as 'B2B_GROSIR' | 'EKSPOR' | 'MBG_KOPERASI' | 'RETAIL_MITRA',
    payment_method: 'Bank BSI',
    payment_status: 'LUNAS' as 'BELUM_LUNAS' | 'DP' | 'LUNAS',
    discount_amount: 0,
    postToFinanceLedger: true,
    notes: '',
  });

  const [items, setItems] = useState<SalesOrderItemInput[]>([
    {
      product_sku: 'SKU-AMB-TUNA-YL',
      product_name: 'Tuna Sirip Kuning Loin Beku (Yellowfin Loin)',
      batch_no: 'BATCH-GENERAL',
      qty: 50,
      unit: 'Kg',
      unit_price: 82000,
    },
  ]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ord, whs, bal, prdRes] = await Promise.all([
        inventoryService.getSalesOrders(),
        inventoryService.getWarehouses(),
        inventoryService.getStockBalances(),
        productService.getAllProducts(),
      ]);
      setOrders(ord);
      setWarehouses(whs);
      setBalances(bal.filter((b) => b.qty_on_hand > 0));
      setProducts(prdRes.data);
    } catch (err: any) {
      showToast(err?.message || 'Gagal memuat data penjualan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const availableInWh = balances.filter((b) => b.warehouse_id === header.warehouse_id);

  const updateLine = (idx: number, patch: Partial<SalesOrderItemInput>) => {
    setItems((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        if (patch.product_sku) {
          const prd = products.find((p) => p.sku_code === patch.product_sku);
          const slot = availableInWh.find((b) => b.product_sku === patch.product_sku);
          return {
            ...row,
            ...patch,
            product_name: prd?.sku_name || patch.product_sku,
            batch_no: slot?.batch_no || row.batch_no,
            unit: prd?.unit || 'Kg',
            unit_price: prd?.defaultPrice || row.unit_price,
          };
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
      const res = await inventoryService.createSalesOrder({
        ...header,
        items,
      });
      showToast(
        `Sales Order ${res.sales_no} tersimpan (${formatRupiah(res.total_amount)}).${
          res.ledger_transaction_no ? ` Terposting ke Jurnal ${res.ledger_transaction_no}.` : ''
        }`,
        'success'
      );
      await loadAll();
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan Sales Order.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostLedger = async (salesNo: string) => {
    if (!isAdmin) return;
    try {
      const res = await inventoryService.postSalesOrderToFinanceLedger(salesNo);
      showToast(`Sales ${salesNo} berhasil diposting ke Transaksi 20 Kolom (${res.transactionNo}).`, 'success');
      await loadAll();
    } catch (err: any) {
      showToast(err?.message || 'Gagal posting ke jurnal keuangan.', 'error');
    }
  };

  const columns: ColumnDef<SalesOrderRecord>[] = [
    {
      key: 'sales_no',
      header: 'No. Penjualan',
      cell: (r) => (
        <div>
          <div className="font-mono text-xs font-bold text-primary-900">{r.sales_no}</div>
          <div className="text-[11px] text-stone-500">{formatDateIndo(r.sales_date)}</div>
        </div>
      ),
    },
    {
      key: 'customer_name',
      header: 'Buyer / Kanal',
      cell: (r) => (
        <div>
          <div className="font-semibold text-xs text-stone-900">{r.customer_name}</div>
          <div className="text-[11px] text-stone-500">
            {r.sales_channel} • {r.payment_method}
          </div>
        </div>
      ),
    },
    {
      key: 'total_amount',
      header: 'Total Nilai',
      align: 'right',
      cell: (r) => (
        <span className="font-mono text-xs font-bold tabular-nums text-stone-900">
          {formatRupiah(r.total_amount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status Order & Bayar',
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant={r.status === 'DISPATCHED' || r.status === 'COMPLETED' ? 'success' : 'gold'} size="sm">
            {r.status}
          </Badge>
          <Badge variant={r.payment_status === 'LUNAS' ? 'success' : 'warning'} size="sm">
            {r.payment_status}
          </Badge>
        </div>
      ),
    },
    {
      key: 'ledger_transaction_no',
      header: 'Integrasi Jurnal 20 Kolom',
      align: 'right',
      cell: (r) =>
        r.ledger_transaction_no ? (
          <Badge variant="primary" size="sm">
            {r.ledger_transaction_no}
          </Badge>
        ) : isAdmin ? (
          <Button
            size="xs"
            variant="outline"
            onClick={() => handlePostLedger(r.sales_no)}
            leftIcon={<BookCheck className="w-3 h-3" />}
          >
            Posting ke Kas
          </Button>
        ) : (
          <span className="text-[11px] text-stone-400">Belum diposting</span>
        ),
    },
  ];

  const subtotal = items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.unit_price || 0), 0);
  const netTotal = Math.max(0, subtotal - Number(header.discount_amount || 0));

  return (
    <div className="space-y-6">
      <InventorySchemaNotice />

      {isAdmin && (
        <Card
          title="Kendali Penjualan Ikan (Sales Control)"
          subtitle="Validasi kecukupan stok gudang dan integrasi idempoten ke Buku Transaksi 20 Kolom (Sektor TRADING IKAN)"
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Tanggal Order</label>
                <input
                  type="date"
                  required
                  value={header.sales_date}
                  onChange={(e) => setHeader({ ...header, sales_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Gudang Pemenuhan</label>
                <select
                  value={header.warehouse_id}
                  onChange={(e) => setHeader({ ...header, warehouse_id: e.target.value })}
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
                <label className="block font-semibold text-stone-700 mb-1">Buyer / Pelanggan *</label>
                <input
                  type="text"
                  list="kopsim-customers-list"
                  required
                  value={header.customer_name}
                  onChange={(e) => setHeader({ ...header, customer_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
                <datalist id="kopsim-customers-list">
                  {customers.map((c) => (
                    <option key={c.id} value={c.nama} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Kanal Penjualan</label>
                <select
                  value={header.sales_channel}
                  onChange={(e) => setHeader({ ...header, sales_channel: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                >
                  <option value="B2B_GROSIR">B2B Grosir Nasional</option>
                  <option value="EKSPOR">Buyer Ekspor</option>
                  <option value="MBG_KOPERASI">Pasokan MBG / Koperasi</option>
                  <option value="RETAIL_MITRA">Mitra Retail & Resto</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800">Item Penjualan</span>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    setItems((prev) => [
                      ...prev,
                      {
                        product_sku: availableInWh[0]?.product_sku || 'SKU-AMB-CAKALANG',
                        product_name: availableInWh[0]?.product_name || 'Ikan Cakalang Beku Utuh',
                        batch_no: availableInWh[0]?.batch_no || 'BATCH-GENERAL',
                        qty: 10,
                        unit: 'Kg',
                        unit_price: 30000,
                      },
                    ])
                  }
                  leftIcon={<Plus className="w-3 h-3" />}
                >
                  Tambah Item
                </Button>
              </div>

              <div className="overflow-x-auto border border-stone-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-stone-100 text-[11px] uppercase text-stone-600">
                    <tr>
                      <th className="py-2 px-3">SKU Ikan (Stok Tersedia di Gudang)</th>
                      <th className="py-2 px-3">Batch Lot</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Harga Jual (Rp)</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                      <th className="py-2 px-3 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {items.map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-2 min-w-[220px]">
                          <select
                            value={row.product_sku}
                            onChange={(e) => updateLine(idx, { product_sku: e.target.value })}
                            className="w-full px-2 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                          >
                            {products.map((p) => {
                              const avail = availableInWh
                                .filter((b) => b.product_sku === p.sku_code)
                                .reduce((s, b) => s + b.qty_on_hand, 0);
                              return (
                                <option key={p.sku_code} value={p.sku_code}>
                                  {p.sku_code} — {p.sku_name} (Stok: {avail} {p.unit})
                                </option>
                              );
                            })}
                          </select>
                        </td>
                        <td className="p-2 w-40">
                          <input
                            type="text"
                            value={row.batch_no}
                            onChange={(e) => updateLine(idx, { batch_no: e.target.value })}
                            className="w-full px-2 py-1.5 rounded-lg border border-stone-300 font-mono text-xs"
                          />
                        </td>
                        <td className="p-2 w-28">
                          <input
                            type="number"
                            min={0.1}
                            step="0.1"
                            value={row.qty}
                            onChange={(e) => updateLine(idx, { qty: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 rounded-lg border border-stone-300 font-mono text-xs text-right"
                          />
                        </td>
                        <td className="p-2 w-36">
                          <input
                            type="number"
                            min={0}
                            value={row.unit_price}
                            onChange={(e) => updateLine(idx, { unit_price: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 rounded-lg border border-stone-300 font-mono text-xs text-right"
                          />
                        </td>
                        <td className="p-2 text-right font-mono font-semibold tabular-nums">
                          {formatRupiah(Number(row.qty) * Number(row.unit_price))}
                        </td>
                        <td className="p-2 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center pt-2 border-t border-stone-100">
              <div className="flex items-center gap-3">
                <select
                  value={header.payment_method}
                  onChange={(e) => setHeader({ ...header, payment_method: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-stone-300 bg-white"
                >
                  <option value="Bank BSI">Bank BSI</option>
                  <option value="Bank Mandiri">Bank Mandiri</option>
                  <option value="Kas Tunai Operasional">Kas Tunai Operasional</option>
                </select>
                <select
                  value={header.payment_status}
                  onChange={(e) => setHeader({ ...header, payment_status: e.target.value as any })}
                  className="px-3 py-2 rounded-xl border border-stone-300 bg-white"
                >
                  <option value="LUNAS">LUNAS</option>
                  <option value="DP">DP</option>
                  <option value="BELUM_LUNAS">BELUM LUNAS</option>
                </select>
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-stone-800 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={header.postToFinanceLedger}
                  onChange={(e) => setHeader({ ...header, postToFinanceLedger: e.target.checked })}
                  className="rounded border-stone-300 text-primary-700"
                />
                <span>Posting otomatis ke Jurnal Transaksi 20 Kolom</span>
              </label>

              <div className="flex items-center justify-end gap-3">
                <div className="text-right font-mono tabular-nums">
                  <div className="text-[10px] text-stone-500">TOTAL PENJUALAN</div>
                  <div className="text-sm font-bold text-primary-900">{formatRupiah(netTotal)}</div>
                </div>
                <Button type="submit" variant="gold" size="sm" isLoading={submitting} leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}>
                  Simpan Sales Order
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      <Card title="Daftar Penjualan (Sales Control)" subtitle="Status order, pembayaran, dan sinkronisasi jurnal keuangan KOPSIM">
        <Table
          columns={columns}
          data={orders}
          keyExtractor={(r) => r.id}
          isLoading={loading}
          density="compact"
          emptyState={<p className="text-xs text-stone-500">Belum ada Sales Order tercatat.</p>}
        />
      </Card>
    </div>
  );
};
