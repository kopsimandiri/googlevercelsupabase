import { authService } from '../src/services/authService';
import { productService, AMBON_FISHERY_PRODUCTS } from '../src/services/productService';
import { inventoryService } from '../src/services/inventoryService';
import { transactionService } from '../src/services/transactionService';
import { auditService } from '../src/services/auditService';
import { ROUTE_DEFINITIONS, pageToPath, pathToPage } from '../src/hooks/useAppRouter';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runPhase9Tests() {
  console.log('================================================================');
  console.log('  KOPSIM MANDIRI — PHASE 9 AMBON FISHERY INVENTORY & OPS TESTS');
  console.log('================================================================');

  inventoryService.resetOfflineStateForTests();

  // 1. Router & RBAC Route Definitions Check
  console.log('\n▶ [TEST 1] Routing & Role Guards untuk 10 Modul Operasional Bisnis');
  const opsPages = [
    'OPS_INVENTORY_DASHBOARD',
    'OPS_FISH_PRODUCTS',
    'OPS_INBOUND',
    'OPS_WAREHOUSE_STOCK',
    'OPS_BARCODE',
    'OPS_TRANSFER',
    'OPS_SALES',
    'OPS_OUTBOUND',
    'OPS_OPNAME',
    'OPS_INVENTORY_REPORTS',
  ] as const;

  for (const page of opsPages) {
    const path = pageToPath(page);
    const parsed = pathToPage(path);
    const def = ROUTE_DEFINITIONS.find((r) => r.page === page);
    assert(
      parsed.page === page &&
        Boolean(def?.requiresAuth) &&
        def?.requiredRoles?.includes('ADMIN') === true &&
        def?.requiredRoles?.includes('DIRECTOR') === true &&
        def?.requiredRoles?.includes('ANGGOTA') === false,
      `Route ${page} (${path}) terproteksi ADMIN & DIRECTOR dan tertutup untuk ANGGOTA`
    );
  }

  // 2. Role Enforcement at Service Layer
  console.log('\n▶ [TEST 2] Isolasi Peran ANGGOTA, DIRECTOR (Read-Only), dan ADMIN');
  await authService.login({ identifier: 'anggota@kopsimmandiri.id', password: 'x' });
  let anggotaBlocked = false;
  try {
    await inventoryService.getStockBalances();
  } catch {
    anggotaBlocked = true;
  }
  assert(anggotaBlocked, 'ANGGOTA ditolak membaca saldo stok operasional bisnis');

  await authService.login({ identifier: 'direksi@kopsimmandiri.id', password: 'x' });
  const dirWarehouses = await inventoryService.getWarehouses();
  assert(dirWarehouses.length >= 4, 'DIRECTOR dapat membaca daftar gudang Cold Storage Ambon');

  let directorWriteBlocked = false;
  try {
    await inventoryService.createAndPostInbound({
      inbound_date: '2026-11-26',
      warehouse_id: 'WH-AMB-CHL1',
      supplier_name: 'Nelayan Tantui',
      items: [
        {
          product_sku: 'SKU-AMB-TUNA-YL',
          product_name: 'Tuna Sirip Kuning',
          batch_no: 'LOT-DIR-TEST',
          qty: 10,
          unit: 'Kg',
          unit_cost: 60000,
        },
      ],
    });
  } catch {
    directorWriteBlocked = true;
  }
  assert(directorWriteBlocked, 'DIRECTOR diblokir saat mencoba mutasi/write inventory (Read-Only)');

  // Switch to ADMIN
  await authService.login({ identifier: 'admin@kopsimmandiri.id', password: 'AdminKopsimSecure2026!' });

  // 3. Ambon Fishery Product Master & Barcode Lookup
  console.log('\n▶ [TEST 3] Master Produk & Jenis Ikan Perikanan Ambon');
  assert(AMBON_FISHERY_PRODUCTS.length >= 8, 'Katalog dasar perikanan Ambon tersedia (8 jenis ikan utama)');
  const upsertRes = await productService.upsertFisheryProduct({
    sku_code: 'SKU-AMB-BARONANG',
    sku_name: 'Ikan Baronang Segar Teluk Ambon',
    fish_species: 'Siganus spp.',
    fish_category: 'Demersal & Karang',
    storage_type: 'CHILLED',
    defaultPrice: 55000,
    min_stock_qty: 80,
    barcode: '8997001001999',
  });
  assert(upsertRes.success === true, 'Admin berhasil menambahkan SKU ikan baru ke master produk');
  const foundByBarcode = await productService.findProductByBarcodeOrSku('8997001001999');
  assert(foundByBarcode?.sku_code === 'SKU-AMB-BARONANG', 'Pencarian master produk by barcode akurat');

  // 4. Inbound Receiving & Weighted Average Cost
  console.log('\n▶ [TEST 4] Inbound Receiving & HPP Rata-rata Tertimbang');
  const inb1 = await inventoryService.createAndPostInbound({
    inbound_date: '2026-11-26',
    warehouse_id: 'WH-AMB-CHL1',
    supplier_name: 'Kelompok Nelayan Tantui Ambon',
    vessel_name: 'KM Bahari 02',
    qc_status: 'LOLOS_QC',
    items: [
      {
        product_sku: 'SKU-AMB-TUNA-YL',
        product_name: 'Tuna Sirip Kuning Loin Beku (Yellowfin Loin)',
        batch_no: 'LOT-TUNA-001',
        qty: 100,
        unit: 'Kg',
        unit_cost: 60000,
      },
    ],
  });
  assert(inb1.total_qty === 100 && inb1.status === 'POSTED', 'Inbound batch 1 tercatat POSTED (100 Kg)');

  await inventoryService.createAndPostInbound({
    inbound_date: '2026-11-26',
    warehouse_id: 'WH-AMB-CHL1',
    supplier_name: 'Kelompok Nelayan Tantui Ambon',
    qc_status: 'LOLOS_QC',
    items: [
      {
        product_sku: 'SKU-AMB-TUNA-YL',
        product_name: 'Tuna Sirip Kuning Loin Beku (Yellowfin Loin)',
        batch_no: 'LOT-TUNA-001',
        qty: 100,
        unit: 'Kg',
        unit_cost: 70000,
      },
    ],
  });

  let balances = await inventoryService.getStockBalances();
  const chillerTuna = balances.find((b) => b.warehouse_id === 'WH-AMB-CHL1' && b.batch_no === 'LOT-TUNA-001');
  assert(chillerTuna?.qty_on_hand === 200, 'Saldo batch akumulatif akurat (100 + 100 = 200 Kg)');
  assert(chillerTuna?.avg_unit_cost === 65000, 'HPP rata-rata tertimbang akurat ((60rb+70rb)/2 = Rp 65.000)');

  // 5. Warehouse Transfer Conservation & Anti-Negative Stock Guard
  console.log('\n▶ [TEST 5] Mutasi Antar Gudang (Konservasi Stok) & Proteksi Anti-Negatif');
  await inventoryService.createAndExecuteTransfer({
    transfer_date: '2026-11-26',
    source_warehouse_id: 'WH-AMB-CHL1',
    dest_warehouse_id: 'WH-AMB-CS01',
    items: [
      {
        product_sku: 'SKU-AMB-TUNA-YL',
        product_name: 'Tuna Sirip Kuning Loin Beku (Yellowfin Loin)',
        batch_no: 'LOT-TUNA-001',
        qty: 150,
        unit: 'Kg',
      },
    ],
  });

  balances = await inventoryService.getStockBalances();
  const chillerAfter = balances.find((b) => b.warehouse_id === 'WH-AMB-CHL1' && b.batch_no === 'LOT-TUNA-001');
  const csAfter = balances.find((b) => b.warehouse_id === 'WH-AMB-CS01' && b.batch_no === 'LOT-TUNA-001');
  assert(chillerAfter?.qty_on_hand === 50 && csAfter?.qty_on_hand === 150, 'Konservasi mutasi gudang akurat (50 + 150 = 200 Kg)');

  let negativeBlocked = false;
  try {
    await inventoryService.createAndExecuteTransfer({
      transfer_date: '2026-11-26',
      source_warehouse_id: 'WH-AMB-CHL1',
      dest_warehouse_id: 'WH-AMB-CS01',
      items: [
        {
          product_sku: 'SKU-AMB-TUNA-YL',
          product_name: 'Tuna Sirip Kuning Loin Beku (Yellowfin Loin)',
          batch_no: 'LOT-TUNA-001',
          qty: 999,
          unit: 'Kg',
        },
      ],
    });
  } catch {
    negativeBlocked = true;
  }
  assert(negativeBlocked, 'Mutasi melebihi stok gudang asal ditolak (Anti-Negative Stock)');

  // 6. Barcode Label Registry & Lookup
  console.log('\n▶ [TEST 6] Barcode Label Printing & Lookup');
  const label = await inventoryService.createOrIncrementBarcodeLabel({
    product_sku: 'SKU-AMB-TUNA-YL',
    product_name: 'Tuna Sirip Kuning Loin Beku',
    warehouse_id: 'WH-AMB-CS01',
    batch_no: 'LOT-TUNA-001',
    pack_weight_kg: 20,
    grade: 'Grade A Sashimi',
    incrementPrint: true,
  });
  assert(label.print_count === 1, 'Pembuatan dan increment hitungan cetak label barcode tercatat');
  const scanLookup = await inventoryService.lookupBarcode(label.barcode_code);
  assert(scanLookup.product?.sku_code === 'SKU-AMB-TUNA-YL' && scanLookup.balances.length > 0, 'Scan label mengembalikan SKU dan saldo stok batch terkait');

  // 7. Sales Order + Idempotent Ledger Posting + Outbound Dispatch
  console.log('\n▶ [TEST 7] Penjualan (Sales Control), Outbound, & Idempotensi Jurnal 20 Kolom');
  const beforeCount = (await transactionService.getTransactions()).length;
  const so = await inventoryService.createSalesOrder({
    sales_date: '2026-11-26',
    warehouse_id: 'WH-AMB-CS01',
    customer_name: 'PT Bahari Ekspor Nusantara',
    sales_channel: 'EKSPOR',
    payment_method: 'Bank BSI',
    payment_status: 'LUNAS',
    postToFinanceLedger: true,
    items: [
      {
        product_sku: 'SKU-AMB-TUNA-YL',
        product_name: 'Tuna Sirip Kuning Loin Beku',
        batch_no: 'LOT-TUNA-001',
        qty: 80,
        unit: 'Kg',
        unit_price: 85000,
      },
    ],
  });
  assert(so.total_amount === 6800000 && Boolean(so.ledger_transaction_no), 'Sales Order tersimpan dan otomatis terposting ke Transaksi 20 Kolom');

  // Calling postSalesOrderToFinanceLedger again MUST be idempotent (no duplicate ledger row)
  const repost = await inventoryService.postSalesOrderToFinanceLedger(so.sales_no);
  const afterTrxs = await transactionService.getTransactions();
  const matchingLedgerRows = afterTrxs.filter((t) => t.id === so.ledger_transaction_no);
  assert(
    repost.transactionNo === so.ledger_transaction_no &&
      afterTrxs.length === beforeCount + 1 &&
      matchingLedgerRows.length === 1,
    'Posting ulang Sales Order bersifat idempoten tanpa duplikasi jurnal kas'
  );

  const outb = await inventoryService.createAndPostOutbound({
    outbound_date: '2026-11-26',
    warehouse_id: 'WH-AMB-CS01',
    outbound_type: 'SALES_DELIVERY',
    sales_no: so.sales_no,
    recipient_name: so.customer_name,
    vehicle_no: 'DE 8821 AM',
    items: [
      {
        product_sku: 'SKU-AMB-TUNA-YL',
        product_name: 'Tuna Sirip Kuning Loin Beku',
        batch_no: 'LOT-TUNA-001',
        qty: 80,
        unit: 'Kg',
      },
    ],
  });
  balances = await inventoryService.getStockBalances();
  const csPostOutbound = balances.find((b) => b.warehouse_id === 'WH-AMB-CS01' && b.batch_no === 'LOT-TUNA-001');
  const updatedSos = await inventoryService.getSalesOrders();
  const dispatchedSo = updatedSos.find((x) => x.sales_no === so.sales_no);
  assert(
    outb.total_qty === 80 && csPostOutbound?.qty_on_hand === 70 && dispatchedSo?.status === 'DISPATCHED',
    'Outbound mengurangi stok Cold Storage Utama (150 - 80 = 70 Kg) & menandai SO DISPATCHED'
  );

  // 8. Stock Opname Variance & Approval + Audit Trail
  console.log('\n▶ [TEST 8] Stock Opname Variance & Audit Trail Menyeluruh');
  const opname = await inventoryService.createAndApproveStockOpname({
    opname_date: '2026-11-26',
    warehouse_id: 'WH-AMB-CS01',
    approveImmediately: true,
    notes: 'Cek fisik susut dingin mingguan',
    items: [
      {
        product_sku: 'SKU-AMB-TUNA-YL',
        product_name: 'Tuna Sirip Kuning Loin Beku',
        batch_no: 'LOT-TUNA-001',
        system_qty: 70,
        physical_qty: 68,
        unit: 'Kg',
        reason: 'Susut es timbang ulang',
      },
    ],
  });
  balances = await inventoryService.getStockBalances();
  const csFinal = balances.find((b) => b.warehouse_id === 'WH-AMB-CS01' && b.batch_no === 'LOT-TUNA-001');
  const auditLogs = auditService.getStoredLogs();
  const hasInventoryAudit = auditLogs.some((a) => a.entity.startsWith('inventory_'));
  const summary = await inventoryService.getDashboardSummary();

  assert(opname.total_variance_qty === -2 && csFinal?.qty_on_hand === 68, 'Stock Opname menyesuaikan selisih fisik (-2 Kg -> saldo akhir 68 Kg)');
  assert(hasInventoryAudit, 'Audit trail mencatat mutasi modul inventory operasional bisnis');
  assert(summary.totalOnHandKg === 118, 'Dashboard Summary menghitung total stok gabungan akurat (50 Chiller + 68 CS = 118 Kg)');

  console.log('\n================================================================');
  console.log(`  HASIL TEST PHASE 9: ${passed} PASS, ${failed} FAIL`);
  console.log('================================================================');
  if (failed > 0) {
    process.exit(1);
  }
}

runPhase9Tests().catch((err) => {
  console.error('Phase 9 Test Error:', err);
  process.exit(1);
});
