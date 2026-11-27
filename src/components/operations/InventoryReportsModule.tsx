import React, { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Table, ColumnDef } from '../common/Table';
import { InventorySchemaNotice } from './InventorySchemaNotice';
import { inventoryService } from '../../services/inventoryService';
import { useNotification } from '../../context/NotificationContext';
import {
  SalesOrderRecord,
  StockBalanceRecord,
  StockMovementRecord,
  StockOpnameRecord,
} from '../../types/inventory';
import { formatDateIndo, formatDateTimeIndo, formatRupiah } from '../../utils/formatters';

type ReportTab = 'STOCK_POSITION' | 'MOVEMENT_LEDGER' | 'SALES_RECAP' | 'OPNAME_SUMMARY';

export const InventoryReportsModule: React.FC = () => {
  const { showToast } = useNotification();
  const [tab, setTab] = useState<ReportTab>('STOCK_POSITION');
  const [loading, setLoading] = useState(true);

  const [balances, setBalances] = useState<StockBalanceRecord[]>([]);
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [sales, setSales] = useState<SalesOrderRecord[]>([]);
  const [opnames, setOpnames] = useState<StockOpnameRecord[]>([]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [bal, mov, sls, opn] = await Promise.all([
        inventoryService.getStockBalances(),
        inventoryService.getStockMovements({ limit: 300 }),
        inventoryService.getSalesOrders(),
        inventoryService.getStockOpnames(),
      ]);
      setBalances(bal);
      setMovements(mov);
      setSales(sls);
      setOpnames(opn);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const downloadCsv = (filename: string, headers: string[], rows: Array<Array<string | number>>) => {
    const csvContent = [
      headers.join(','),
      ...rows.map((r) =>
        r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`File ${filename} berhasil diunduh.`, 'success');
  };

  const handleExportCsv = () => {
    if (tab === 'STOCK_POSITION') {
      downloadCsv(
        'laporan-posisi-stok-ambon.csv',
        ['Gudang', 'SKU', 'Nama Produk', 'Batch', 'Qty Tersedia', 'Satuan', 'HPP Rata2', 'Nilai Persediaan'],
        balances.map((b) => [
          b.warehouse_name || b.warehouse_id,
          b.product_sku,
          b.product_name || '',
          b.batch_no,
          b.qty_on_hand,
          b.unit,
          b.avg_unit_cost,
          b.qty_on_hand * b.avg_unit_cost,
        ])
      );
    } else if (tab === 'MOVEMENT_LEDGER') {
      downloadCsv(
        'laporan-kartu-mutasi-ambon.csv',
        ['Waktu', 'No Mutasi', 'Tipe', 'Gudang', 'SKU', 'Batch', 'Delta Qty', 'Saldo Akhir', 'Referensi'],
        movements.map((m) => [
          m.movement_date,
          m.movement_no,
          m.movement_type,
          m.warehouse_name || m.warehouse_id,
          m.product_sku,
          m.batch_no,
          m.qty_delta,
          m.balance_after,
          m.reference_no,
        ])
      );
    } else if (tab === 'SALES_RECAP') {
      downloadCsv(
        'laporan-penjualan-ikan-ambon.csv',
        ['No Penjualan', 'Tanggal', 'Buyer', 'Kanal', 'Status', 'Total Nilai', 'No Jurnal 20 Kolom'],
        sales.map((s) => [
          s.sales_no,
          s.sales_date,
          s.customer_name,
          s.sales_channel,
          s.status,
          s.total_amount,
          s.ledger_transaction_no || '-',
        ])
      );
    } else {
      downloadCsv(
        'laporan-stock-opname-ambon.csv',
        ['No Opname', 'Tanggal', 'Gudang', 'Jumlah Lot', 'Total Selisih Kg', 'Status', 'Disetujui Oleh'],
        opnames.map((o) => [
          o.opname_no,
          o.opname_date,
          o.warehouse_name || o.warehouse_id,
          o.total_items,
          o.total_variance_qty,
          o.status,
          o.approved_by || '-',
        ])
      );
    }
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('KOPSIM MANDIRI - LAPORAN INVENTORY PERIKANAN AMBON', 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Kategori: ${tab} | Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, 21);

    let y = 30;
    const writeLine = (text: string) => {
      if (y > 190) {
        doc.addPage();
        y = 18;
      }
      doc.text(text.slice(0, 145), 14, y);
      y += 6;
    };

    if (tab === 'STOCK_POSITION') {
      balances.forEach((b) =>
        writeLine(
          `${b.warehouse_name || b.warehouse_id} | ${b.product_sku} | ${b.batch_no} | ${b.qty_on_hand} ${b.unit} | ${formatRupiah(
            b.qty_on_hand * b.avg_unit_cost
          )}`
        )
      );
    } else if (tab === 'MOVEMENT_LEDGER') {
      movements.forEach((m) =>
        writeLine(
          `${formatDateTimeIndo(m.movement_date)} | ${m.movement_type} | ${m.product_sku} (${m.batch_no}) | ${
            m.qty_delta >= 0 ? '+' : ''
          }${m.qty_delta} -> ${m.balance_after} ${m.unit} | ${m.reference_no}`
        )
      );
    } else if (tab === 'SALES_RECAP') {
      sales.forEach((s) =>
        writeLine(
          `${s.sales_no} | ${s.sales_date} | ${s.customer_name} | ${s.sales_channel} | ${formatRupiah(
            s.total_amount
          )} | Jurnal: ${s.ledger_transaction_no || '-'}`
        )
      );
    } else {
      opnames.forEach((o) =>
        writeLine(
          `${o.opname_no} | ${o.opname_date} | ${o.warehouse_name || o.warehouse_id} | Selisih: ${
            o.total_variance_qty
          } Kg | ${o.status}`
        )
      );
    }

    doc.save(`LAPORAN-${tab.toLowerCase()}.pdf`);
    showToast('Laporan PDF berhasil diunduh.', 'success');
  };

  const stockCols: ColumnDef<StockBalanceRecord>[] = [
    { key: 'warehouse_name', header: 'Gudang', cell: (r) => <span className="text-xs">{r.warehouse_name}</span> },
    { key: 'product_sku', header: 'SKU & Nama', cell: (r) => <span className="text-xs font-semibold">{r.product_sku} — {r.product_name}</span> },
    { key: 'batch_no', header: 'Batch', cell: (r) => <span className="font-mono text-xs">{r.batch_no}</span> },
    { key: 'qty_on_hand', header: 'Qty', align: 'right', cell: (r) => <span className="font-mono text-xs font-bold tabular-nums">{r.qty_on_hand.toLocaleString('id-ID')} {r.unit}</span> },
    { key: 'val', header: 'Nilai Persediaan', align: 'right', cell: (r) => <span className="font-mono text-xs font-semibold tabular-nums">{formatRupiah(r.qty_on_hand * r.avg_unit_cost)}</span> },
  ];

  const movementCols: ColumnDef<StockMovementRecord>[] = [
    { key: 'movement_date', header: 'Waktu', cell: (r) => <span className="font-mono text-[11px]">{formatDateTimeIndo(r.movement_date)}</span> },
    { key: 'movement_type', header: 'Tipe', cell: (r) => <Badge variant={r.qty_delta >= 0 ? 'success' : 'danger'} size="sm">{r.movement_type}</Badge> },
    { key: 'product_sku', header: 'SKU & Lot', cell: (r) => <span className="font-mono text-xs">{r.product_sku} ({r.batch_no})</span> },
    { key: 'qty_delta', header: 'Mutasi', align: 'right', cell: (r) => <span className="font-mono text-xs font-bold tabular-nums">{r.qty_delta >= 0 ? '+' : ''}{r.qty_delta} {r.unit}</span> },
    { key: 'balance_after', header: 'Saldo Akhir', align: 'right', cell: (r) => <span className="font-mono text-xs tabular-nums">{r.balance_after} {r.unit}</span> },
    { key: 'reference_no', header: 'Referensi', cell: (r) => <span className="font-mono text-[11px]">{r.reference_no}</span> },
  ];

  const salesCols: ColumnDef<SalesOrderRecord>[] = [
    { key: 'sales_no', header: 'No. SO', cell: (r) => <span className="font-mono text-xs font-bold">{r.sales_no}</span> },
    { key: 'sales_date', header: 'Tanggal', cell: (r) => <span className="text-xs">{formatDateIndo(r.sales_date)}</span> },
    { key: 'customer_name', header: 'Buyer', cell: (r) => <span className="text-xs font-semibold">{r.customer_name}</span> },
    { key: 'total_amount', header: 'Nilai', align: 'right', cell: (r) => <span className="font-mono text-xs font-bold tabular-nums">{formatRupiah(r.total_amount)}</span> },
    { key: 'ledger_transaction_no', header: 'Jurnal 20 Kolom', cell: (r) => <span className="font-mono text-xs">{r.ledger_transaction_no || '-'}</span> },
  ];

  const opnameCols: ColumnDef<StockOpnameRecord>[] = [
    { key: 'opname_no', header: 'No. Opname', cell: (r) => <span className="font-mono text-xs font-bold">{r.opname_no}</span> },
    { key: 'opname_date', header: 'Tanggal', cell: (r) => <span className="text-xs">{formatDateIndo(r.opname_date)}</span> },
    { key: 'warehouse_name', header: 'Gudang', cell: (r) => <span className="text-xs">{r.warehouse_name}</span> },
    { key: 'total_variance_qty', header: 'Selisih', align: 'right', cell: (r) => <span className="font-mono text-xs font-bold tabular-nums">{r.total_variance_qty} Kg</span> },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant={r.status === 'APPROVED' ? 'success' : 'warning'} size="sm">{r.status}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <InventorySchemaNotice />

      <Card
        title="Laporan Terpadu Inventory & Operasional Perikanan Ambon"
        subtitle="Audit posisi stok, kartu mutasi ledger, rekap penjualan ikan, dan berita acara stock opname"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExportCsv} leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}>
              Ekspor CSV
            </Button>
            <Button size="sm" variant="primary" onClick={handleExportPdf} leftIcon={<Download className="w-3.5 h-3.5" />}>
              Unduh PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={() => window.print()} leftIcon={<Printer className="w-3.5 h-3.5" />}>
              Cetak
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
            {[
              { id: 'STOCK_POSITION', label: '1. Posisi & Nilai Stok' },
              { id: 'MOVEMENT_LEDGER', label: '2. Kartu Mutasi Stok' },
              { id: 'SALES_RECAP', label: '3. Rekap Penjualan Ikan' },
              { id: 'OPNAME_SUMMARY', label: '4. Berita Acara Stock Opname' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as ReportTab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  tab === item.id
                    ? 'bg-primary-900 text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'STOCK_POSITION' && (
            <Table columns={stockCols} data={balances} keyExtractor={(r) => r.id} isLoading={loading} density="compact" />
          )}
          {tab === 'MOVEMENT_LEDGER' && (
            <Table columns={movementCols} data={movements} keyExtractor={(r) => r.id} isLoading={loading} density="compact" />
          )}
          {tab === 'SALES_RECAP' && (
            <Table columns={salesCols} data={sales} keyExtractor={(r) => r.id} isLoading={loading} density="compact" />
          )}
          {tab === 'OPNAME_SUMMARY' && (
            <Table columns={opnameCols} data={opnames} keyExtractor={(r) => r.id} isLoading={loading} density="compact" />
          )}
        </div>
      </Card>
    </div>
  );
};
