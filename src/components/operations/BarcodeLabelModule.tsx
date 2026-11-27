import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { Barcode, Download, Plus, Printer, Search } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Table, ColumnDef } from '../common/Table';
import { InventorySchemaNotice } from './InventorySchemaNotice';
import { InventoryScannerInput } from './InventoryScannerInput';
import { Code128BarcodeSvg } from './Code128BarcodeSvg';
import { inventoryService } from '../../services/inventoryService';
import { productService, ProductItem } from '../../services/productService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { BarcodeLabelRecord, InventoryWarehouse, StockBalanceRecord } from '../../types/inventory';

export const BarcodeLabelModule: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useNotification();
  const isAdmin = role === 'ADMIN';

  const [labels, setLabels] = useState<BarcodeLabelRecord[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [warehouses, setWarehouses] = useState<InventoryWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [scanResult, setScanResult] = useState<{
    code: string;
    product: ProductItem | null;
    label: BarcodeLabelRecord | null;
    balances: StockBalanceRecord[];
  } | null>(null);

  const [selectedLabel, setSelectedLabel] = useState<BarcodeLabelRecord | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const [form, setForm] = useState({
    product_sku: 'SKU-AMB-TUNA-YL',
    warehouse_id: 'WH-AMB-CS01',
    batch_no: `LOT-AMB-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
    pack_weight_kg: 20,
    grade: 'Grade A Sashimi',
    harvest_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [lbls, prdRes, whs] = await Promise.all([
        inventoryService.getBarcodeLabels(),
        productService.getAllProducts(),
        inventoryService.getWarehouses(),
      ]);
      setLabels(lbls);
      setProducts(prdRes.data);
      setWarehouses(whs);
      if (lbls.length > 0 && !selectedLabel) {
        setSelectedLabel(lbls[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedLabel) {
      setQrDataUrl('');
      return;
    }
    const payload = JSON.stringify({
      code: selectedLabel.barcode_code,
      sku: selectedLabel.product_sku,
      batch: selectedLabel.batch_no,
      weightKg: selectedLabel.pack_weight_kg,
      grade: selectedLabel.grade,
    });
    QRCode.toDataURL(payload, { width: 140, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [selectedLabel]);

  const handleScanLookup = async (code: string) => {
    try {
      const res = await inventoryService.lookupBarcode(code);
      setScanResult(res);
      if (res.label) {
        setSelectedLabel(res.label);
      }
      if (!res.product && !res.label && res.balances.length === 0) {
        showToast(`Kode "${code}" belum terdaftar di katalog atau label batch.`, 'warning');
      } else {
        showToast(`Data ditemukan untuk kode "${code}".`, 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal memindai kode.', 'error');
    }
  };

  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setCreating(true);
    try {
      const prd = products.find((p) => p.sku_code === form.product_sku);
      const created = await inventoryService.createOrIncrementBarcodeLabel({
        product_sku: form.product_sku,
        product_name: prd?.sku_name || form.product_sku,
        warehouse_id: form.warehouse_id,
        batch_no: form.batch_no,
        pack_weight_kg: form.pack_weight_kg,
        grade: form.grade,
        harvest_date: form.harvest_date || undefined,
        expiry_date: form.expiry_date || undefined,
      });
      setSelectedLabel(created);
      showToast(`Label barcode ${created.barcode_code} siap dicetak.`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Gagal membuat label barcode.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleExportLabelPdf = async (label: BarcodeLabelRecord) => {
    try {
      if (isAdmin) {
        await inventoryService.createOrIncrementBarcodeLabel({
          barcode_code: label.barcode_code,
          product_sku: label.product_sku,
          product_name: label.product_name,
          warehouse_id: label.warehouse_id,
          batch_no: label.batch_no,
          pack_weight_kg: label.pack_weight_kg,
          grade: label.grade,
          incrementPrint: true,
        });
      }

      const doc = new jsPDF({ unit: 'mm', format: [100, 70], orientation: 'landscape' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('KOPSIM MANDIRI - COLD STORAGE AMBON', 6, 8);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(label.product_name.slice(0, 42), 6, 15);
      doc.text(`SKU: ${label.product_sku} | Batch: ${label.batch_no}`, 6, 21);
      doc.text(`Berat: ${label.pack_weight_kg} Kg | Mutu: ${label.grade}`, 6, 27);
      if (label.expiry_date) {
        doc.text(`Exp Date: ${label.expiry_date}`, 6, 33);
      }

      const qrUrl = await QRCode.toDataURL(
        JSON.stringify({ code: label.barcode_code, sku: label.product_sku, batch: label.batch_no }),
        { width: 120, margin: 1 }
      );
      doc.addImage(qrUrl, 'PNG', 68, 12, 26, 26);

      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.text(label.barcode_code, 6, 55);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 6, 62);

      doc.save(`LABEL-${label.barcode_code}.pdf`);
      showToast(`Label PDF ${label.barcode_code} berhasil diunduh.`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengunduh label PDF.', 'error');
    }
  };

  const columns: ColumnDef<BarcodeLabelRecord>[] = [
    {
      key: 'barcode_code',
      header: 'Kode Barcode',
      cell: (r) => <span className="font-mono text-xs font-bold text-primary-900">{r.barcode_code}</span>,
    },
    {
      key: 'product_name',
      header: 'Komoditas & Batch',
      cell: (r) => (
        <div>
          <div className="text-xs font-semibold text-stone-900">{r.product_name}</div>
          <div className="font-mono text-[11px] text-stone-500">
            {r.product_sku} • {r.batch_no}
          </div>
        </div>
      ),
    },
    {
      key: 'pack_weight_kg',
      header: 'Kemasan & Grade',
      cell: (r) => (
        <span className="font-mono text-xs tabular-nums">
          {r.pack_weight_kg} Kg • {r.grade}
        </span>
      ),
    },
    {
      key: 'print_count',
      header: 'Cetak',
      align: 'center',
      cell: (r) => <Badge variant="default" size="sm">{r.print_count}x</Badge>,
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button size="xs" variant="outline" onClick={() => setSelectedLabel(r)}>
            Pratinjau
          </Button>
          <Button
            size="xs"
            variant="primary"
            onClick={() => handleExportLabelPdf(r)}
            leftIcon={<Download className="w-3 h-3" />}
          >
            PDF Label
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <InventorySchemaNotice />

      {/* Scanner Lookup Card */}
      <Card
        title="Pemindai Barcode / QR Kemasan Ikan"
        subtitle="Gunakan USB Barcode Scanner (otomatis tekan Enter), kamera perangkat, atau ketik kode SKU/Batch"
      >
        <div className="space-y-4">
          <InventoryScannerInput onScan={handleScanLookup} />

          {scanResult && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-emerald-700" />
                  Hasil Pemindaian: <code className="font-mono">{scanResult.code}</code>
                </span>
                <Badge variant={scanResult.product ? 'success' : 'warning'} size="sm">
                  {scanResult.product ? 'SKU Terdaftar' : 'Belum Terdaftar'}
                </Badge>
              </div>
              {scanResult.product && (
                <div className="text-stone-800">
                  <strong>{scanResult.product.sku_name}</strong> ({scanResult.product.sku_code}) —{' '}
                  {scanResult.product.grade} • {scanResult.product.packaging}
                </div>
              )}
              {scanResult.balances.length > 0 ? (
                <div className="space-y-1 pt-1">
                  <span className="font-semibold text-stone-700 block">Posisi Stok Gudang:</span>
                  {scanResult.balances.map((b) => (
                    <div key={b.id} className="font-mono text-[11px] text-stone-800">
                      • {b.warehouse_name}: <strong>{b.qty_on_hand.toLocaleString('id-ID')} {b.unit}</strong> (Batch {b.batch_no})
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-stone-600">Belum ada saldo stok aktif untuk kode tersebut di gudang.</p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Generator & Label Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isAdmin ? (
          <Card title="Buat Label Kemasan & Batch Baru" subtitle="Generate kode barcode standar dan QR traceability untuk box/karton ikan">
            <form onSubmit={handleCreateLabel} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Produk / Jenis Ikan *</label>
                <select
                  value={form.product_sku}
                  onChange={(e) => {
                    const prd = products.find((p) => p.sku_code === e.target.value);
                    setForm({
                      ...form,
                      product_sku: e.target.value,
                      grade: prd?.grade || form.grade,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                >
                  {products.map((p) => (
                    <option key={p.sku_code} value={p.sku_code}>
                      {p.sku_code} — {p.sku_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Gudang Penyimpanan</label>
                  <select
                    value={form.warehouse_id}
                    onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
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
                  <label className="block font-semibold text-stone-700 mb-1">Nomor Batch / Lot *</label>
                  <input
                    type="text"
                    required
                    value={form.batch_no}
                    onChange={(e) => setForm({ ...form, batch_no: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Berat per Kemasan (Kg)</label>
                  <input
                    type="number"
                    min={0.5}
                    step="0.5"
                    value={form.pack_weight_kg}
                    onChange={(e) => setForm({ ...form, pack_weight_kg: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Grade Mutu</label>
                  <input
                    type="text"
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Tanggal Produksi / Tangkap</label>
                  <input
                    type="date"
                    value={form.harvest_date}
                    onChange={(e) => setForm({ ...form, harvest_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Tanggal Kadaluwarsa</label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" size="sm" isLoading={creating} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Generate & Simpan Label Barcode
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card title="Mode Pengawasan Label">
            <p className="text-xs text-stone-600">
              Akun <strong>DIRECTOR</strong> dapat memindai, mempratinjau, dan mengunduh PDF label kemasan. Pembuatan label baru hanya oleh ADMIN.
            </p>
          </Card>
        )}

        <Card
          title="Pratinjau Label Thermal / Karton (100x70mm)"
          subtitle="Siap cetak ke printer thermal atau ekspor PDF label"
          action={
            selectedLabel && (
              <div className="flex items-center gap-2">
                <Button size="xs" variant="outline" onClick={() => window.print()} leftIcon={<Printer className="w-3 h-3" />}>
                  Cetak Browser
                </Button>
                <Button
                  size="xs"
                  variant="gold"
                  onClick={() => handleExportLabelPdf(selectedLabel)}
                  leftIcon={<Download className="w-3 h-3" />}
                >
                  Unduh PDF
                </Button>
              </div>
            )
          }
        >
          {selectedLabel ? (
            <div className="border-2 border-dashed border-stone-300 rounded-2xl p-4 bg-white space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary-800">
                    KOPSIM MANDIRI • COLD STORAGE AMBON
                  </div>
                  <div className="text-sm font-bold text-stone-900">{selectedLabel.product_name}</div>
                  <div className="font-mono text-xs text-stone-600">
                    SKU: {selectedLabel.product_sku} • Lot: {selectedLabel.batch_no}
                  </div>
                  <div className="text-xs text-stone-700 font-mono">
                    Netto: <strong>{selectedLabel.pack_weight_kg} Kg</strong> • {selectedLabel.grade}
                  </div>
                </div>
                {qrDataUrl && (
                  <img src={qrDataUrl} alt={`QR ${selectedLabel.barcode_code}`} className="w-20 h-20 border border-stone-200 rounded" />
                )}
              </div>

              <div className="pt-2 border-t border-stone-100 flex justify-center">
                <Code128BarcodeSvg value={selectedLabel.barcode_code} height={46} />
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-stone-500">
              <Barcode className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              Pilih atau buat label barcode untuk melihat pratinjau cetak.
            </div>
          )}
        </Card>
      </div>

      <Card title="Daftar Label Barcode Terdaftar" subtitle="Riwayat label batch kemasan dan jumlah cetakan">
        <Table
          columns={columns}
          data={labels}
          keyExtractor={(r) => r.id}
          isLoading={loading}
          density="compact"
          emptyState={<p className="text-xs text-stone-500">Belum ada label barcode yang dibuat.</p>}
        />
      </Card>
    </div>
  );
};
