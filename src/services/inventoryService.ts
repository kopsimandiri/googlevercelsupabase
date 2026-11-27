import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { authService } from './authService';
import { auditService } from './auditService';
import { productService, ProductItem } from './productService';
import { transactionService } from './transactionService';
import {
  BarcodeLabelRecord,
  InboundHeaderRecord,
  InboundItemInput,
  InventoryDashboardSummary,
  InventorySchemaStatus,
  InventoryWarehouse,
  MovementType,
  OutboundHeaderRecord,
  OutboundItemInput,
  SalesOrderItemInput,
  SalesOrderRecord,
  StockBalanceRecord,
  StockMovementRecord,
  StockOpnameItemInput,
  StockOpnameRecord,
  StockTransferRecord,
  TransferItemInput,
} from '../types/inventory';

const INVENTORY_TABLES = [
  'inventory_warehouses',
  'inventory_stock_balances',
  'inventory_stock_movements',
  'inventory_inbound_headers',
  'inventory_barcode_labels',
  'inventory_transfers',
  'inventory_sales_orders',
  'inventory_outbound_headers',
  'inventory_stock_opnames',
] as const;

export const DEFAULT_AMBON_WAREHOUSES: InventoryWarehouse[] = [
  {
    id: 'WH-AMB-CS01',
    warehouse_code: 'AMB-CS-01',
    warehouse_name: 'Cold Storage Utama PPN Tantui Ambon',
    warehouse_type: 'COLD_STORAGE',
    location: 'Kompleks PPN Tantui, Ambon, Maluku',
    target_temp_c: -22,
    capacity_kg: 120000,
    pic_name: 'Kepala Gudang Ambon',
    pic_phone: '0811-4700-101',
    is_active: true,
  },
  {
    id: 'WH-AMB-ABF1',
    warehouse_code: 'AMB-ABF-01',
    warehouse_name: 'Ruang Air Blast Freezer (ABF) Tantui',
    warehouse_type: 'ABF_FREEZER',
    location: 'PPN Tantui Blok B, Ambon, Maluku',
    target_temp_c: -35,
    capacity_kg: 35000,
    pic_name: 'Operator ABF Ambon',
    pic_phone: '0811-4700-102',
    is_active: true,
  },
  {
    id: 'WH-AMB-CHL1',
    warehouse_code: 'AMB-CHL-01',
    warehouse_name: 'Chiller Transit Dermaga & Grading',
    warehouse_type: 'CHILLER',
    location: 'Dermaga Pendaratan Ikan Ambon',
    target_temp_c: 2,
    capacity_kg: 25000,
    pic_name: 'Koordinator QC Dermaga',
    pic_phone: '0811-4700-103',
    is_active: true,
  },
  {
    id: 'WH-AMB-DRY1',
    warehouse_code: 'AMB-DRY-01',
    warehouse_name: 'Gudang Kemasan, Es & Logistik Kering',
    warehouse_type: 'DRY_PACKAGING',
    location: 'Area Gudang Logistik KOPSIM Ambon',
    target_temp_c: 24,
    capacity_kg: 40000,
    pic_name: 'Admin Logistik Ambon',
    pic_phone: '0811-4700-104',
    is_active: true,
  },
];

// Offline / Unit-Test Store (used STRICTLY when Supabase is not configured)
interface OfflineInventoryState {
  warehouses: InventoryWarehouse[];
  balances: StockBalanceRecord[];
  movements: StockMovementRecord[];
  inbounds: InboundHeaderRecord[];
  barcodes: BarcodeLabelRecord[];
  transfers: StockTransferRecord[];
  salesOrders: SalesOrderRecord[];
  outbounds: OutboundHeaderRecord[];
  opnames: StockOpnameRecord[];
}

function createEmptyOfflineState(): OfflineInventoryState {
  return {
    warehouses: DEFAULT_AMBON_WAREHOUSES.map((w) => ({ ...w })),
    balances: [],
    movements: [],
    inbounds: [],
    barcodes: [],
    transfers: [],
    salesOrders: [],
    outbounds: [],
    opnames: [],
  };
}

let offlineState: OfflineInventoryState = createEmptyOfflineState();

function isServerMode(): boolean {
  return Boolean(isSupabaseConfigured && getSupabaseClient());
}

function getActorName(): string {
  const u = authService.getCurrentUser();
  return u?.name || u?.email || u?.username || 'ADMIN';
}

function assertCanReadInventory(): void {
  const role = authService.getCurrentUser()?.role;
  if (role && role !== 'ADMIN' && role !== 'DIRECTOR') {
    throw new Error('Akses ditolak: Modul Operasional Bisnis hanya untuk ADMIN dan DIRECTOR.');
  }
}

function assertCanWriteInventory(): void {
  const role = authService.getCurrentUser()?.role;
  if (!role || role !== 'ADMIN') {
    throw new Error('Otorisasi ditolak: Hanya peran ADMIN yang dapat mencatat atau mengubah transaksi inventory.');
  }
}

function makeDocNo(prefix: string): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate()
  ).padStart(2, '0')}`;
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${ymd}-${rnd}`;
}

function makeMovementNo(prefix = 'MOV'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function applyOfflineMovement(params: {
  movementNo?: string;
  movementType: MovementType;
  warehouseId: string;
  productSku: string;
  productName: string;
  batchNo: string;
  barcodeCode?: string;
  qtyDelta: number;
  unit: string;
  unitCost: number;
  referenceType: string;
  referenceNo: string;
  notes?: string;
  harvestDate?: string;
  expiryDate?: string;
}): StockBalanceRecord {
  const batch = (params.batchNo || 'BATCH-GENERAL').trim() || 'BATCH-GENERAL';
  let balance = offlineState.balances.find(
    (b) => b.warehouse_id === params.warehouseId && b.product_sku === params.productSku && b.batch_no === batch
  );

  const before = balance ? Number(balance.qty_on_hand) : 0;
  const after = before + Number(params.qtyDelta);

  if (after < 0) {
    throw new Error(
      `Stok tidak mencukupi untuk SKU ${params.productSku} batch ${batch} (tersedia: ${before} ${params.unit}, diminta: ${Math.abs(
        params.qtyDelta
      )} ${params.unit}).`
    );
  }

  const prevCost = balance ? Number(balance.avg_unit_cost) : 0;
  let nextCost = prevCost;
  if (params.qtyDelta > 0 && params.unitCost > 0 && after > 0) {
    nextCost = Math.round(((before * prevCost + params.qtyDelta * params.unitCost) / after) * 100) / 100;
  } else if (prevCost === 0 && params.unitCost > 0) {
    nextCost = params.unitCost;
  }

  const nowIso = new Date().toISOString();
  if (!balance) {
    balance = {
      id: generateId(),
      warehouse_id: params.warehouseId,
      product_sku: params.productSku,
      product_name: params.productName,
      batch_no: batch,
      barcode_code: params.barcodeCode || '',
      qty_on_hand: after,
      qty_reserved: 0,
      unit: params.unit || 'Kg',
      avg_unit_cost: nextCost,
      harvest_date: params.harvestDate || null,
      expiry_date: params.expiryDate || null,
      last_movement_at: nowIso,
    };
    offlineState.balances.push(balance);
  } else {
    balance.qty_on_hand = after;
    balance.avg_unit_cost = nextCost;
    if (params.barcodeCode) balance.barcode_code = params.barcodeCode;
    if (params.harvestDate) balance.harvest_date = params.harvestDate;
    if (params.expiryDate) balance.expiry_date = params.expiryDate;
    balance.last_movement_at = nowIso;
  }

  offlineState.movements.unshift({
    id: generateId(),
    movement_no: params.movementNo || makeMovementNo(),
    movement_date: nowIso,
    movement_type: params.movementType,
    warehouse_id: params.warehouseId,
    product_sku: params.productSku,
    product_name: params.productName,
    batch_no: batch,
    barcode_code: params.barcodeCode || '',
    qty_delta: params.qtyDelta,
    unit: params.unit || 'Kg',
    balance_before: before,
    balance_after: after,
    unit_cost: nextCost,
    reference_type: params.referenceType,
    reference_no: params.referenceNo,
    notes: params.notes || '',
    created_by: getActorName(),
    created_at: nowIso,
  });

  return balance;
}

async function applySupabaseMovement(params: {
  movementType: MovementType;
  warehouseId: string;
  productSku: string;
  productName: string;
  batchNo: string;
  barcodeCode?: string;
  qtyDelta: number;
  unit: string;
  unitCost: number;
  referenceType: string;
  referenceNo: string;
  notes?: string;
  harvestDate?: string;
  expiryDate?: string;
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client tidak tersedia.');

  const { error } = await client.rpc('inventory_apply_stock_movement', {
    p_movement_no: makeMovementNo(),
    p_movement_type: params.movementType,
    p_warehouse_id: params.warehouseId,
    p_product_sku: params.productSku,
    p_product_name: params.productName,
    p_batch_no: params.batchNo || 'BATCH-GENERAL',
    p_barcode_code: params.barcodeCode || '',
    p_qty_delta: params.qtyDelta,
    p_unit: params.unit || 'Kg',
    p_unit_cost: params.unitCost || 0,
    p_reference_type: params.referenceType,
    p_reference_no: params.referenceNo,
    p_notes: params.notes || '',
    p_harvest_date: params.harvestDate || null,
    p_expiry_date: params.expiryDate || null,
    p_created_by: getActorName(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export const inventoryService = {
  /**
   * Test helper strictly for offline unit tests
   */
  resetOfflineStateForTests() {
    offlineState = createEmptyOfflineState();
  },

  /**
   * Checks whether Supabase inventory migration tables exist (without breaking or faking data)
   */
  async checkSchemaStatus(): Promise<InventorySchemaStatus> {
    if (!isServerMode()) {
      return {
        ready: true,
        source: 'LOCAL_OFFLINE',
        missingTables: [],
        checkedAt: new Date().toISOString(),
        message: 'Mode lokal/offline aktif (Supabase belum dikonfigurasi).',
      };
    }

    const client = getSupabaseClient()!;
    const missingTables: string[] = [];

    for (const table of INVENTORY_TABLES) {
      const { error } = await client.from(table).select('id').limit(1);
      if (error) {
        const msg = error.message.toLowerCase();
        if (
          msg.includes('does not exist') ||
          msg.includes('could not find the table') ||
          error.code === '42P01' ||
          error.code === 'PGRST205'
        ) {
          missingTables.push(table);
        }
      }
    }

    return {
      ready: missingTables.length === 0,
      source: 'SUPABASE',
      missingTables,
      checkedAt: new Date().toISOString(),
      message:
        missingTables.length === 0
          ? 'Seluruh skema tabel Inventory Perikanan Ambon siap di Supabase.'
          : `${missingTables.length} tabel inventory belum ditemukan di Supabase. Jalankan migrasi SQL 20261127000001_ambon_fishery_inventory_schema.sql.`,
    };
  },

  // ===========================================================================
  // 1. WAREHOUSES / COLD STORAGE
  // ===========================================================================
  async getWarehouses(): Promise<InventoryWarehouse[]> {
    assertCanReadInventory();
    if (isServerMode()) {
      const client = getSupabaseClient()!;
      const { data, error } = await client
        .from('inventory_warehouses')
        .select('*')
        .order('warehouse_code', { ascending: true });
      if (error) {
        throw new Error(`Gagal memuat data gudang: ${error.message}`);
      }
      return (data || []).map((w: any) => ({
        id: String(w.id),
        warehouse_code: String(w.warehouse_code),
        warehouse_name: String(w.warehouse_name),
        warehouse_type: w.warehouse_type,
        location: String(w.location || ''),
        target_temp_c: Number(w.target_temp_c ?? -20),
        capacity_kg: Number(w.capacity_kg ?? 50000),
        pic_name: String(w.pic_name || ''),
        pic_phone: String(w.pic_phone || ''),
        is_active: Boolean(w.is_active ?? true),
        created_at: w.created_at,
      }));
    }
    return [...offlineState.warehouses];
  },

  async saveWarehouse(input: Partial<InventoryWarehouse> & { warehouse_code: string; warehouse_name: string }): Promise<InventoryWarehouse> {
    assertCanWriteInventory();
    const payload: InventoryWarehouse = {
      id: input.id || `WH-${input.warehouse_code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
      warehouse_code: input.warehouse_code.trim().toUpperCase(),
      warehouse_name: input.warehouse_name.trim(),
      warehouse_type: input.warehouse_type || 'COLD_STORAGE',
      location: input.location || 'Ambon, Maluku',
      target_temp_c: Number(input.target_temp_c ?? -20),
      capacity_kg: Math.max(1, Number(input.capacity_kg ?? 50000)),
      pic_name: input.pic_name || '',
      pic_phone: input.pic_phone || '',
      is_active: input.is_active !== false,
    };

    if (isServerMode()) {
      const client = getSupabaseClient()!;
      const { data, error } = await client
        .from('inventory_warehouses')
        .upsert(
          {
            id: payload.id,
            warehouse_code: payload.warehouse_code,
            warehouse_name: payload.warehouse_name,
            warehouse_type: payload.warehouse_type,
            location: payload.location,
            target_temp_c: payload.target_temp_c,
            capacity_kg: payload.capacity_kg,
            pic_name: payload.pic_name,
            pic_phone: payload.pic_phone,
            is_active: payload.is_active,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'warehouse_code' }
        )
        .select('*')
        .single();
      if (error) throw new Error(`Gagal menyimpan gudang: ${error.message}`);
      await auditService.logActivity('UPSERT_WAREHOUSE', 'inventory_warehouses', payload.warehouse_code, null, payload);
      return data as InventoryWarehouse;
    }

    const idx = offlineState.warehouses.findIndex((w) => w.warehouse_code === payload.warehouse_code || w.id === payload.id);
    if (idx >= 0) {
      offlineState.warehouses[idx] = payload;
    } else {
      offlineState.warehouses.push(payload);
    }
    await auditService.logActivity('UPSERT_WAREHOUSE', 'inventory_warehouses', payload.warehouse_code, null, payload);
    return payload;
  },

  // ===========================================================================
  // 2. STOCK BALANCES & MOVEMENTS (SINGLE SOURCE OF TRUTH)
  // ===========================================================================
  async getStockBalances(): Promise<StockBalanceRecord[]> {
    assertCanReadInventory();
    const [warehouses, productRes] = await Promise.all([
      this.getWarehouses().catch(() => [] as InventoryWarehouse[]),
      productService.getAllProducts().catch(() => ({ data: [] as ProductItem[] })),
    ]);

    const whMap = new Map<string, string>(warehouses.map((w) => [w.id, w.warehouse_name]));
    const prdMap = new Map<string, ProductItem>(productRes.data.map((p) => [p.sku_code, p]));

    let rawBalances: StockBalanceRecord[] = [];
    if (isServerMode()) {
      const client = getSupabaseClient()!;
      const { data, error } = await client
        .from('inventory_stock_balances')
        .select('*')
        .order('last_movement_at', { ascending: false });
      if (error) throw new Error(`Gagal memuat saldo stok gudang: ${error.message}`);
      rawBalances = (data || []).map((r: any) => ({
        id: String(r.id),
        warehouse_id: String(r.warehouse_id),
        product_sku: String(r.product_sku),
        batch_no: String(r.batch_no || 'BATCH-GENERAL'),
        barcode_code: String(r.barcode_code || ''),
        qty_on_hand: Number(r.qty_on_hand || 0),
        qty_reserved: Number(r.qty_reserved || 0),
        unit: String(r.unit || 'Kg'),
        avg_unit_cost: Number(r.avg_unit_cost || 0),
        harvest_date: r.harvest_date || null,
        expiry_date: r.expiry_date || null,
        last_movement_at: r.last_movement_at || r.updated_at || new Date().toISOString(),
      }));
    } else {
      rawBalances = offlineState.balances.map((b) => ({ ...b }));
    }

    return rawBalances.map((b) => {
      const prd = prdMap.get(b.product_sku);
      return {
        ...b,
        warehouse_name: whMap.get(b.warehouse_id) || b.warehouse_id,
        product_name: prd?.sku_name || b.product_name || b.product_sku,
        fish_species: prd?.fish_species || '',
        fish_category: prd?.fish_category || prd?.subgroup || '',
        grade: prd?.grade || 'Grade A',
        min_stock_qty: prd?.min_stock_qty ?? 100,
      };
    });
  },

  async getStockMovements(filters?: {
    warehouseId?: string;
    productSku?: string;
    movementType?: MovementType | 'ALL';
    limit?: number;
  }): Promise<StockMovementRecord[]> {
    assertCanReadInventory();
    const warehouses = await this.getWarehouses().catch(() => [] as InventoryWarehouse[]);
    const whMap = new Map<string, string>(warehouses.map((w) => [w.id, w.warehouse_name]));

    let rows: StockMovementRecord[] = [];
    if (isServerMode()) {
      const client = getSupabaseClient()!;
      let query = client
        .from('inventory_stock_movements')
        .select('*')
        .order('movement_date', { ascending: false })
        .limit(filters?.limit || 250);

      if (filters?.warehouseId) query = query.eq('warehouse_id', filters.warehouseId);
      if (filters?.productSku) query = query.eq('product_sku', filters.productSku);
      if (filters?.movementType && filters.movementType !== 'ALL') {
        query = query.eq('movement_type', filters.movementType);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Gagal memuat kartu mutasi stok: ${error.message}`);
      rows = (data || []).map((r: any) => ({
        id: String(r.id),
        movement_no: String(r.movement_no),
        movement_date: r.movement_date,
        movement_type: r.movement_type,
        warehouse_id: String(r.warehouse_id),
        product_sku: String(r.product_sku),
        product_name: String(r.product_name || r.product_sku),
        batch_no: String(r.batch_no || 'BATCH-GENERAL'),
        barcode_code: String(r.barcode_code || ''),
        qty_delta: Number(r.qty_delta || 0),
        unit: String(r.unit || 'Kg'),
        balance_before: Number(r.balance_before || 0),
        balance_after: Number(r.balance_after || 0),
        unit_cost: Number(r.unit_cost || 0),
        reference_type: String(r.reference_type || ''),
        reference_no: String(r.reference_no || ''),
        notes: String(r.notes || ''),
        created_by: String(r.created_by || 'ADMIN'),
        created_at: r.created_at,
      }));
    } else {
      rows = offlineState.movements
        .filter((m) => (!filters?.warehouseId ? true : m.warehouse_id === filters.warehouseId))
        .filter((m) => (!filters?.productSku ? true : m.product_sku === filters.productSku))
        .filter((m) => (!filters?.movementType || filters.movementType === 'ALL' ? true : m.movement_type === filters.movementType))
        .slice(0, filters?.limit || 250);
    }

    return rows.map((m) => ({
      ...m,
      warehouse_name: whMap.get(m.warehouse_id) || m.warehouse_id,
    }));
  },

  // ===========================================================================
  // 3. MODUL PENERIMAAN BARANG (INBOUND)
  // ===========================================================================
  async getInbounds(): Promise<InboundHeaderRecord[]> {
    assertCanReadInventory();
    const warehouses = await this.getWarehouses().catch(() => [] as InventoryWarehouse[]);
    const whMap = new Map<string, string>(warehouses.map((w) => [w.id, w.warehouse_name]));

    if (isServerMode()) {
      const client = getSupabaseClient()!;
      const { data: headers, error } = await client
        .from('inventory_inbound_headers')
        .select('*, inventory_inbound_items(*)')
        .order('inbound_date', { ascending: false })
        .limit(150);
      if (error) throw new Error(`Gagal memuat data inbound: ${error.message}`);
      return (headers || []).map((h: any) => ({
        id: String(h.id),
        inbound_no: String(h.inbound_no),
        inbound_date: h.inbound_date,
        warehouse_id: String(h.warehouse_id),
        warehouse_name: whMap.get(h.warehouse_id) || h.warehouse_id,
        supplier_id: h.supplier_id || '',
        supplier_name: String(h.supplier_name || ''),
        vessel_name: String(h.vessel_name || ''),
        landing_port: String(h.landing_port || 'PPN Tantui Ambon'),
        qc_status: h.qc_status || 'LOLOS_QC',
        status: h.status || 'POSTED',
        total_qty: Number(h.total_qty || 0),
        total_value: Number(h.total_value || 0),
        notes: String(h.notes || ''),
        created_by: String(h.created_by || 'ADMIN'),
        posted_at: h.posted_at,
        items: (h.inventory_inbound_items || []).map((i: any) => ({
          product_sku: String(i.product_sku),
          product_name: String(i.product_name),
          batch_no: String(i.batch_no),
          barcode_code: String(i.barcode_code || ''),
          qty: Number(i.qty || 0),
          unit: String(i.unit || 'Kg'),
          unit_cost: Number(i.unit_cost || 0),
          grade: i.grade || 'Grade A',
          temperature_c: Number(i.temperature_c ?? -18),
          harvest_date: i.harvest_date || undefined,
          expiry_date: i.expiry_date || undefined,
        })),
      }));
    }

    return offlineState.inbounds.map((h) => ({
      ...h,
      warehouse_name: whMap.get(h.warehouse_id) || h.warehouse_id,
    }));
  },

  async createAndPostInbound(input: {
    inbound_date: string;
    warehouse_id: string;
    supplier_id?: string;
    supplier_name: string;
    vessel_name?: string;
    landing_port?: string;
    qc_status?: 'LOLOS_QC' | 'KARANTINA' | 'DITOLAK';
    notes?: string;
    items: InboundItemInput[];
  }): Promise<InboundHeaderRecord> {
    assertCanWriteInventory();
    if (!input.warehouse_id) throw new Error('Gudang tujuan wajib dipilih.');
    if (!input.supplier_name.trim()) throw new Error('Nama supplier/nelayan wajib diisi.');
    if (!input.items || input.items.length === 0) throw new Error('Minimal 1 item komoditas ikan wajib ditambahkan.');

    for (const item of input.items) {
      if (Number(item.qty) <= 0) throw new Error(`Qty masuk untuk ${item.product_sku} harus lebih dari 0.`);
      if (Number(item.unit_cost) < 0) throw new Error(`Harga beli untuk ${item.product_sku} tidak boleh negatif.`);
    }

    const inboundNo = makeDocNo('INB-AMB');
    const totalQty = input.items.reduce((s, i) => s + Number(i.qty), 0);
    const totalValue = input.items.reduce((s, i) => s + Number(i.qty) * Number(i.unit_cost), 0);
    const qcStatus = input.qc_status || 'LOLOS_QC';
    const shouldPostStock = qcStatus !== 'DITOLAK';

    if (isServerMode()) {
      const client = getSupabaseClient()!;
      const { data: hdr, error: hdrErr } = await client
        .from('inventory_inbound_headers')
        .insert({
          inbound_no: inboundNo,
          inbound_date: input.inbound_date,
          warehouse_id: input.warehouse_id,
          supplier_id: input.supplier_id || '',
          supplier_name: input.supplier_name.trim(),
          vessel_name: input.vessel_name || '',
          landing_port: input.landing_port || 'PPN Tantui Ambon',
          qc_status: qcStatus,
          status: shouldPostStock ? 'POSTED' : 'CANCELLED',
          total_qty: totalQty,
          total_value: totalValue,
          notes: input.notes || '',
          created_by: getActorName(),
          posted_at: shouldPostStock ? new Date().toISOString() : null,
        })
        .select('*')
        .single();

      if (hdrErr) throw new Error(`Gagal membuat dokumen inbound: ${hdrErr.message}`);

      const itemRows = input.items.map((it) => ({
        inbound_id: hdr.id,
        product_sku: it.product_sku,
        product_name: it.product_name,
        batch_no: it.batch_no || `LOT-${inboundNo}`,
        barcode_code: it.barcode_code || `${it.product_sku}-${inboundNo}`,
        qty: Number(it.qty),
        unit: it.unit || 'Kg',
        unit_cost: Number(it.unit_cost || 0),
        line_total: Number(it.qty) * Number(it.unit_cost || 0),
        grade: it.grade || 'Grade A',
        temperature_c: Number(it.temperature_c ?? -18),
        harvest_date: it.harvest_date || null,
        expiry_date: it.expiry_date || null,
      }));

      const { error: itemsErr } = await client.from('inventory_inbound_items').insert(itemRows);
      if (itemsErr) throw new Error(`Gagal menyimpan detail item inbound: ${itemsErr.message}`);

      if (shouldPostStock) {
        for (const it of itemRows) {
          await applySupabaseMovement({
            movementType: 'INBOUND',
            warehouseId: input.warehouse_id,
            productSku: it.product_sku,
            productName: it.product_name,
            batchNo: it.batch_no,
            barcodeCode: it.barcode_code,
            qtyDelta: it.qty,
            unit: it.unit,
            unitCost: it.unit_cost,
            referenceType: 'INBOUND',
            referenceNo: inboundNo,
            notes: `Penerimaan dari ${input.supplier_name} (${input.vessel_name || 'Daratan'})`,
            harvestDate: it.harvest_date || undefined,
            expiryDate: it.expiry_date || undefined,
          });
        }
      }

      await auditService.logActivity('POST_INBOUND', 'inventory_inbound_headers', inboundNo, null, {
        warehouse_id: input.warehouse_id,
        supplier_name: input.supplier_name,
        total_qty: totalQty,
        total_value: totalValue,
        qc_status: qcStatus,
      });

      return {
        id: String(hdr.id),
        inbound_no: inboundNo,
        inbound_date: input.inbound_date,
        warehouse_id: input.warehouse_id,
        supplier_id: input.supplier_id,
        supplier_name: input.supplier_name,
        vessel_name: input.vessel_name,
        landing_port: input.landing_port || 'PPN Tantui Ambon',
        qc_status: qcStatus,
        status: shouldPostStock ? 'POSTED' : 'CANCELLED',
        total_qty: totalQty,
        total_value: totalValue,
        notes: input.notes,
        created_by: getActorName(),
        posted_at: shouldPostStock ? new Date().toISOString() : undefined,
        items: input.items,
      };
    }

    const normalizedItems = input.items.map((it) => ({
      ...it,
      batch_no: it.batch_no || `LOT-${inboundNo}`,
      barcode_code: it.barcode_code || `${it.product_sku}-${inboundNo}`,
    }));

    if (shouldPostStock) {
      for (const it of normalizedItems) {
        applyOfflineMovement({
          movementType: 'INBOUND',
          warehouseId: input.warehouse_id,
          productSku: it.product_sku,
          productName: it.product_name,
          batchNo: it.batch_no,
          barcodeCode: it.barcode_code,
          qtyDelta: Number(it.qty),
          unit: it.unit || 'Kg',
          unitCost: Number(it.unit_cost || 0),
          referenceType: 'INBOUND',
          referenceNo: inboundNo,
          notes: `Inbound dari ${input.supplier_name}`,
          harvestDate: it.harvest_date,
          expiryDate: it.expiry_date,
        });
      }
    }

    const record: InboundHeaderRecord = {
      id: generateId(),
      inbound_no: inboundNo,
      inbound_date: input.inbound_date,
      warehouse_id: input.warehouse_id,
      supplier_id: input.supplier_id,
      supplier_name: input.supplier_name.trim(),
      vessel_name: input.vessel_name || '',
      landing_port: input.landing_port || 'PPN Tantui Ambon',
      qc_status: qcStatus,
      status: shouldPostStock ? 'POSTED' : 'CANCELLED',
      total_qty: totalQty,
      total_value: totalValue,
      notes: input.notes,
      created_by: getActorName(),
      posted_at: shouldPostStock ? new Date().toISOString() : undefined,
      items: normalizedItems,
    };
    offlineState.inbounds.unshift(record);
    await auditService.logActivity('POST_INBOUND', 'inventory_inbound_headers', inboundNo, null, {
      warehouse_id: input.warehouse_id,
      total_qty: totalQty,
      total_value: totalValue,
    });
    return record;
  },

  // ===========================================================================
  // 4. MODUL BARCODE SCANNER & LABEL PRINTING
  // ===========================================================================
  async getBarcodeLabels(): Promise<BarcodeLabelRecord[]> {
    assertCanReadInventory();
    const warehouses = await this.getWarehouses().catch(() => [] as InventoryWarehouse[]);
    const whMap = new Map<string, string>(warehouses.map((w) => [w.id, w.warehouse_name]));

    if (isServerMode()) {
      const client = getSupabaseClient()!;
      const { data, error } = await client
        .from('inventory_barcode_labels')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw new Error(`Gagal memuat label barcode: ${error.message}`);
      return (data || []).map((r: any) => ({
        id: String(r.id),
        barcode_code: String(r.barcode_code),
        product_sku: String(r.product_sku),
        product_name: String(r.product_name),
        warehouse_id: r.warehouse_id || undefined,
        warehouse_name: r.warehouse_id ? whMap.get(r.warehouse_id) || r.warehouse_id : undefined,
        batch_no: String(r.batch_no || 'BATCH-GENERAL'),
        pack_weight_kg: Number(r.pack_weight_kg || 10),
        grade: String(r.grade || 'Grade A'),
        harvest_date: r.harvest_date || null,
        expiry_date: r.expiry_date || null,
        print_count: Number(r.print_count || 0),
        last_printed_at: r.last_printed_at || null,
        created_by: r.created_by || 'ADMIN',
        created_at: r.created_at,
      }));
    }

    return offlineState.barcodes.map((b) => ({
      ...b,
      warehouse_name: b.warehouse_id ? whMap.get(b.warehouse_id) || b.warehouse_id : undefined,
    }));
  },

  async createOrIncrementBarcodeLabel(input: {
    barcode_code?: string;
    product_sku: string;
    product_name: string;
    warehouse_id?: string;
    batch_no: string;
    pack_weight_kg: number;
    grade?: string;
    harvest_date?: string;
    expiry_date?: string;
    incrementPrint?: boolean;
  }): Promise<BarcodeLabelRecord> {
    assertCanWriteInventory();
    const cleanSku = input.product_sku.trim().toUpperCase();
    const cleanBatch = (input.batch_no || 'BATCH-GENERAL').trim().toUpperCase();
    const generatedCode =
      input.barcode_code?.trim().toUpperCase() ||
      `KSM-${cleanSku.replace(/[^A-Z0-9]/g, '').slice(-6)}-${cleanBatch.replace(/[^A-Z0-9]/g, '').slice(-6)}`;

    if (isServerMode()) {
      const client = getSupabaseClient()!;
      const { data: existing } = await client
        .from('inventory_barcode_labels')
        .select('*')
        .eq('barcode_code', generatedCode)
        .maybeSingle();

      const nextPrintCount = Number(existing?.print_count || 0) + (input.incrementPrint ? 1 : 0);
      const { data, error } = await client
        .from('inventory_barcode_labels')
        .upsert(
          {
            barcode_code: generatedCode,
            product_sku: cleanSku,
            product_name: input.product_name,
            warehouse_id: input.warehouse_id || null,
            batch_no: cleanBatch,
            pack_weight_kg: Number(input.pack_weight_kg || 10),
            grade: input.grade || 'Grade A',
            harvest_date: input.harvest_date || null,
            expiry_date: input.expiry_date || null,
            print_count: nextPrintCount,
            last_printed_at: input.incrementPrint ? new Date().toISOString() : existing?.last_printed_at || null,
            created_by: getActorName(),
          },
          { onConflict: 'barcode_code' }
        )
        .select('*')
        .single();
      if (error) throw new Error(`Gagal menyimpan label barcode: ${error.message}`);

      await auditService.logActivity(
        input.incrementPrint ? 'PRINT_BARCODE_LABEL' : 'CREATE_BARCODE_LABEL',
        'inventory_barcode_labels',
        generatedCode,
        null,
        { product_sku: cleanSku, batch_no: cleanBatch, print_count: nextPrintCount }
      );
      return data as BarcodeLabelRecord;
    }

    const existing = offlineState.barcodes.find((b) => b.barcode_code === generatedCode);
    const nowIso = new Date().toISOString();
    if (existing) {
      if (input.incrementPrint) {
        existing.print_count += 1;
        existing.last_printed_at = nowIso;
      }
      return { ...existing };
    }

    const rec: BarcodeLabelRecord = {
      id: generateId(),
      barcode_code: generatedCode,
      product_sku: cleanSku,
      product_name: input.product_name,
      warehouse_id: input.warehouse_id,
      batch_no: cleanBatch,
      pack_weight_kg: Number(input.pack_weight_kg || 10),
      grade: input.grade || 'Grade A',
      harvest_date: input.harvest_date || null,
      expiry_date: input.expiry_date || null,
      print_count: input.incrementPrint ? 1 : 0,
      last_printed_at: input.incrementPrint ? nowIso : null,
      created_by: getActorName(),
      created_at: nowIso,
    };
    offlineState.barcodes.unshift(rec);
    await auditService.logActivity('CREATE_BARCODE_LABEL', 'inventory_barcode_labels', generatedCode, null, {
      product_sku: cleanSku,
      batch_no: cleanBatch,
    });
    return rec;
  },

  async lookupBarcode(code: string): Promise<{
    code: string;
    product: ProductItem | null;
    label: BarcodeLabelRecord | null;
    balances: StockBalanceRecord[];
  }> {
    assertCanReadInventory();
    const q = code.trim().toUpperCase();
    const [productsRes, labels, balances] = await Promise.all([
      productService.getAllProducts(),
      this.getBarcodeLabels(),
      this.getStockBalances(),
    ]);

    const label = labels.find((l) => l.barcode_code.toUpperCase() === q) || null;
    const matchedBalances = balances.filter(
      (b) =>
        b.barcode_code.toUpperCase() === q ||
        b.product_sku.toUpperCase() === q ||
        b.batch_no.toUpperCase() === q ||
        (label && b.product_sku === label.product_sku && b.batch_no === label.batch_no)
    );
    const targetSku = label?.product_sku || matchedBalances[0]?.product_sku || q;
    const product =
      productsRes.data.find(
        (p) =>
          p.sku_code.toUpperCase() === targetSku ||
          (p.barcode && p.barcode.toUpperCase() === q)
      ) || null;

    return {
      code: q,
      product,
      label,
      balances: matchedBalances,
    };
  },

  // ===========================================================================
  // 5. MODUL MUTASI BARANG ANTAR GUDANG (TRANSFER)
  // ===========================================================================
  async getTransfers(): Promise<StockTransferRecord[]> {
    assertCanReadInventory();
    const warehouses = await this.getWarehouses().catch(() => [] as InventoryWarehouse[]);
    const whMap = new Map<string, string>(warehouses.map((w) => [w.id, w.warehouse_name]));

    if (isServerMode()) {
      const client = getSupabaseClient()!;
      const { data, error } = await client
        .from('inventory_transfers')
        .select('*, inventory_transfer_items(*)')
        .order('transfer_date', { ascending: false })
        .limit(150);
      if (error) throw new Error(`Gagal memuat data mutasi barang: ${error.message}`);
      return (data || []).map((t: any) => ({
        id: String(t.id),
        transfer_no: String(t.transfer_no),
        transfer_date: t.transfer_date,
        source_warehouse_id: String(t.source_warehouse_id),
        source_warehouse_name: whMap.get(t.source_warehouse_id) || t.source_warehouse_id,
        dest_warehouse_id: String(t.dest_warehouse_id),
        dest_warehouse_name: whMap.get(t.dest_warehouse_id) || t.dest_warehouse_id,
        status: t.status || 'COMPLETED',
        total_qty: Number(t.total_qty || 0),
        notes: String(t.notes || ''),
        created_by: String(t.created_by || 'ADMIN'),
        posted_at: t.posted_at,
        items: (t.inventory_transfer_items || []).map((i: any) => ({
          product_sku: String(i.product_sku),
          product_name: String(i.product_name),
          batch_no: String(i.batch_no),
          qty: Number(i.qty || 0),
          unit: String(i.unit || 'Kg'),
        })),
      }));
    }

    return offlineState.transfers.map((t) => ({
      ...t,
      source_warehouse_name: whMap.get(t.source_warehouse_id) || t.source_warehouse_id,
      dest_warehouse_name: whMap.get(t.dest_warehouse_id) || t.dest_warehouse_id,
    }));
  },

  async createAndExecuteTransfer(input: {
    transfer_date: string;
    source_warehouse_id: string;
    dest_warehouse_id: string;
    notes?: string;
    items: TransferItemInput[];
  }): Promise<StockTransferRecord> {
    assertCanWriteInventory();
    if (!input.source_warehouse_id || !input.dest_warehouse_id) {
      throw new Error('Gudang asal dan gudang tujuan wajib dipilih.');
    }
    if (input.source_warehouse_id === input.dest_warehouse_id) {
      throw new Error('Gudang asal dan gudang tujuan tidak boleh sama.');
    }
    if (!input.items || input.items.length === 0) {
      throw new Error('Minimal 1 item komoditas untuk mutasi wajib dipilih.');
    }

    const balances = await this.getStockBalances();
    for (const item of input.items) {
      if (Number(item.qty) <= 0) {
        throw new Error(`Qty mutasi untuk ${item.product_sku} harus lebih dari 0.`);
      }
      const slot = balances.find(
        (b) =>
          b.warehouse_id === input.source_warehouse_id &&
          b.product_sku === item.product_sku &&
          b.batch_no === (item.batch_no || 'BATCH-GENERAL')
      );
      const avail = slot ? Number(slot.qty_on_hand) : 0;
      if (avail < Number(item.qty)) {
        throw new Error(
          `Stok gudang asal tidak mencukupi untuk ${item.product_sku} (${item.batch_no}): tersedia ${avail} ${item.unit}, diminta ${item.qty} ${item.unit}.`
        );
      }
    }

    const transferNo = makeDocNo('TRF-AMB');
    const totalQty = input.items.reduce((s, i) => s + Number(i.qty), 0);

    if (isServerMode()) {
      const client = getSupabaseClient()!;
      const { data: hdr, error: hdrErr } = await client
        .from('inventory_transfers')
        .insert({
          transfer_no: transferNo,
          transfer_date: input.transfer_date,
          source_warehouse_id: input.source_warehouse_id,
          dest_warehouse_id: input.dest_warehouse_id,
          status: 'COMPLETED',
          total_qty: totalQty,
          notes: input.notes || '',
          created_by: getActorName(),
          posted_at: new Date().toISOString(),
        })
        .select('*')
        .single();
      if (hdrErr) throw new Error(`Gagal membuat dokumen mutasi: ${hdrErr.message}`);

      const { error: itemErr } = await client.from('inventory_transfer_items').insert(
        input.items.map((it) => ({
          transfer_id: hdr.id,
          product_sku: it.product_sku,
          product_name: it.product_name,
          batch_no: it.batch_no || 'BATCH-GENERAL',
          qty: Number(it.qty),
          unit: it.unit || 'Kg',
        }))
      );
      if (itemErr) throw new Error(`Gagal menyimpan detail item mutasi: ${itemErr.message}`);

      for (const it of input.items) {
        const slot = balances.find(
          (b) =>
            b.warehouse_id === input.source_warehouse_id &&
            b.product_sku === it.product_sku &&
            b.batch_no === (it.batch_no || 'BATCH-GENERAL')
        );
        const unitCost = slot?.avg_unit_cost || 0;

        await applySupabaseMovement({
          movementType: 'TRANSFER_OUT',
          warehouseId: input.source_warehouse_id,
          productSku: it.product_sku,
          productName: it.product_name,
          batchNo: it.batch_no || 'BATCH-GENERAL',
          barcodeCode: slot?.barcode_code || '',
          qtyDelta: -Number(it.qty),
          unit: it.unit || 'Kg',
          unitCost,
          referenceType: 'TRANSFER',
          referenceNo: transferNo,
          notes: `Mutasi keluar ke ${input.dest_warehouse_id}`,
        });

        await applySupabaseMovement({
          movementType: 'TRANSFER_IN',
          warehouseId: input.dest_warehouse_id,
          productSku: it.product_sku,
          productName: it.product_name,
          batchNo: it.batch_no || 'BATCH-GENERAL',
          barcodeCode: slot?.barcode_code || '',
          qtyDelta: Number(it.qty),
          unit: it.unit || 'Kg',
          unitCost,
          referenceType: 'TRANSFER',
          referenceNo: transferNo,
          notes: `Mutasi masuk dari ${input.source_warehouse_id}`,
          harvestDate: slot?.harvest_date || undefined,
          expiryDate: slot?.expiry_date || undefined,
        });
      }

      await auditService.logActivity('EXECUTE_TRANSFER', 'inventory_transfers', transferNo, null, {
        source: input.source_warehouse_id,
        dest: input.dest_warehouse_id,
        total_qty: totalQty,
      });

      return {
        id: String(hdr.id),
        transfer_no: transferNo,
        transfer_date: input.transfer_date,
        source_warehouse_id: input.source_warehouse_id,
        dest_warehouse_id: input.dest_warehouse_id,
        status: 'COMPLETED',
        total_qty: totalQty,
        notes: input.notes,
        created_by: getActorName(),
        posted_at: new Date().toISOString(),
        items: input.items,
      };
    }

    for (const it of input.items) {
      const slot = balances.find(
        (b) =>
          b.warehouse_id === input.source_warehouse_id &&
          b.product_sku === it.product_sku &&
          b.batch_no === (it.batch_no || 'BATCH-GENERAL')
      );
      const unitCost = slot?.avg_unit_cost || 0;

      applyOfflineMovement({
        movementType: 'TRANSFER_OUT',
        warehouseId: input.source_warehouse_id,
        productSku: it.product_sku,
        productName: it.product_name,
        batchNo: it.batch_no || 'BATCH-GENERAL',
        barcodeCode: slot?.barcode_code,
        qtyDelta: -Number(it.qty),
        unit: it.unit || 'Kg',
        unitCost,
        referenceType: 'TRANSFER',
        referenceNo: transferNo,
        notes: `Mutasi keluar ke ${input.dest_warehouse_id}`,
      });

      applyOfflineMovement({
        movementType: 'TRANSFER_IN',
        warehouseId: input.dest_warehouse_id,
        productSku: it.product_sku,
        productName: it.product_name,
        batchNo: it.batch_no || 'BATCH-GENERAL',
        barcodeCode: slot?.barcode_code,
        qtyDelta: Number(it.qty),
        unit: it.unit || 'Kg',
        unitCost,
        referenceType: 'TRANSFER',
        referenceNo: transferNo,
        notes: `Mutasi masuk dari ${input.source_warehouse_id}`,
        harvestDate: slot?.harvest_date || undefined,
        expiryDate: slot?.expiry_date || undefined,
      });
    }

    const record: StockTransferRecord = {
      id: generateId(),
      transfer_no: transferNo,
      transfer_date: input.transfer_date,
      source_warehouse_id: input.source_warehouse_id,
      dest_warehouse_id: input.dest_warehouse_id,
      status: 'COMPLETED',
      total_qty: totalQty,
      notes: input.notes,
      created_by: getActorName(),
      posted_at: new Date().toISOString(),
      items: input.items,
    };
    offlineState.transfers.unshift(record);
    await auditService.logActivity('EXECUTE_TRANSFER', 'inventory_transfers', transferNo, null, {
      source: input.source_warehouse_id,
      dest: input.dest_warehouse_id,
      total_qty: totalQty,
    });
    return record;
  },

  // ===========================================================================
  // 6. MODUL PENJUALAN (SALES CONTROL) + IDEMPOTENT LEDGER POSTING
  // ===========================================================================
  async getSalesOrders(): Promise<SalesOrderRecord[]> {
    assertCanReadInventory();
    const warehouses = await this.getWarehouses().catch(() => [] as InventoryWarehouse[]);
    const whMap = new Map<string, string>(warehouses.map((w) => [w.id, w.warehouse_name]));

    if (isServerMode()) {
      const client = getSupabaseClient()!;
      const { data, error } = await client
        .from('inventory_sales_orders')
        .select('*, inventory_sales_order_items(*)')
        .order('sales_date', { ascending: false })
        .limit(150);
      if (error) throw new Error(`Gagal memuat data penjualan: ${error.message}`);
      return (data || []).map((s: any) => ({
        id: String(s.id),
        sales_no: String(s.sales_no),
        sales_date: s.sales_date,
        warehouse_id: String(s.warehouse_id),
        warehouse_name: whMap.get(s.warehouse_id) || s.warehouse_id,
        customer_id: s.customer_id || '',
        customer_name: String(s.customer_name || ''),
        sales_channel: s.sales_channel || 'B2B_GROSIR',
        payment_method: String(s.payment_method || 'Bank BSI'),
        status: s.status || 'CONFIRMED',
        payment_status: s.payment_status || 'LUNAS',
        subtotal_amount: Number(s.subtotal_amount || 0),
        discount_amount: Number(s.discount_amount || 0),
        total_amount: Number(s.total_amount || 0),
        ledger_transaction_no: s.ledger_transaction_no || null,
        notes: String(s.notes || ''),
        created_by: String(s.created_by || 'ADMIN'),
        items: (s.inventory_sales_order_items || []).map((i: any) => ({
          product_sku: String(i.product_sku),
          product_name: String(i.product_name),
          batch_no: String(i.batch_no || 'BATCH-GENERAL'),
          qty: Number(i.qty || 0),
          unit: String(i.unit || 'Kg'),
          unit_price: Number(i.unit_price || 0),
        })),
      }));
    }

    return offlineState.salesOrders.map((s) => ({
      ...s,
      warehouse_name: whMap.get(s.warehouse_id) || s.warehouse_id,
    }));
  },

  async createSalesOrder(input: {
    sales_date: string;
    warehouse_id: string;
    customer_id?: string;
    customer_name: string;
    sales_channel: 'B2B_GROSIR' | 'EKSPOR' | 'MBG_KOPERASI' | 'RETAIL_MITRA';
    payment_method: string;
    payment_status: 'BELUM_LUNAS' | 'DP' | 'LUNAS';
    discount_amount?: number;
    postToFinanceLedger?: boolean;
    notes?: string;
    items: SalesOrderItemInput[];
  }): Promise<SalesOrderRecord> {
    assertCanWriteInventory();
    if (!input.warehouse_id) throw new Error('Gudang sumber wajib dipilih.');
    if (!input.customer_name.trim()) throw new Error('Nama buyer/pelanggan wajib diisi.');
    if (!input.items || input.items.length === 0) throw new Error('Minimal 1 item penjualan wajib dipilih.');

    const balances = await this.getStockBalances();
    for (const item of input.items) {
      if (Number(item.qty) <= 0) throw new Error(`Qty jual untuk ${item.product_sku} harus lebih dari 0.`);
      const avail = balances
        .filter((b) => b.warehouse_id === input.warehouse_id && b.product_sku === item.product_sku)
        .reduce((s, b) => s + Number(b.qty_on_hand), 0);
      if (avail < Number(item.qty)) {
        throw new Error(
          `Stok gudang tidak mencukupi untuk penjualan ${item.product_sku}: tersedia ${avail} ${item.unit}, order ${item.qty} ${item.unit}.`
        );
      }
    }

    const salesNo = makeDocNo('SLS-AMB');
    const subtotal = input.items.reduce((s, i) => s + Number(i.qty) * Number(i.unit_price), 0);
    const discount = Math.max(0, Number(input.discount_amount || 0));
    const totalAmount = Math.max(0, subtotal - discount);

    let ledgerTxNo: string | null = null;
    if (input.postToFinanceLedger && totalAmount > 0) {
      const totalQty = input.items.reduce((s, i) => s + Number(i.qty), 0);
      const summaryProduct =
        input.items.length === 1 ? input.items[0].product_name : `${input.items[0].product_name} (+${input.items.length - 1} item)`;
      const ledgerRes = await transactionService.saveTransaction({
        tanggal: input.sales_date,
        referal: 'PROJECT',
        plantation: 'TRADING IKAN',
        jenis: 'MASUK',
        kategori: 'Penjualan Ikan Ambon',
        sku_name: summaryProduct,
        metode_bayar: input.payment_method || 'Bank BSI',
        akun: input.payment_method || 'Bank BSI',
        qty: totalQty,
        jumlah: totalAmount,
        harga_satuan: totalQty > 0 ? Math.round(totalAmount / totalQty) : totalAmount,
        customer_id: input.customer_id || '',
        customer_name: input.customer_name.trim(),
        keterangan: `[SALES ${salesNo}] Penjualan Perikanan Ambon ke ${input.customer_name.trim()} (${input.sales_channel})`,
      });
      if (ledgerRes.success) {
        ledgerTxNo = ledgerRes.id;
      }
    }

    if (isServerMode()) {
      const client = getSupabaseClient()!;
      const { data: hdr, error: hdrErr } = await client
        .from('inventory_sales_orders')
        .insert({
          sales_no: salesNo,
          sales_date: input.sales_date,
          warehouse_id: input.warehouse_id,
          customer_id: input.customer_id || '',
          customer_name: input.customer_name.trim(),
          sales_channel: input.sales_channel,
          payment_method: input.payment_method || 'Bank BSI',
          status: 'CONFIRMED',
          payment_status: input.payment_status,
          subtotal_amount: subtotal,
          discount_amount: discount,
          total_amount: totalAmount,
          ledger_transaction_no: ledgerTxNo,
          notes: input.notes || '',
          created_by: getActorName(),
        })
        .select('*')
        .single();
      if (hdrErr) throw new Error(`Gagal menyimpan Sales Order: ${hdrErr.message}`);

      const { error: itemErr } = await client.from('inventory_sales_order_items').insert(
        input.items.map((it) => ({
          sales_order_id: hdr.id,
          product_sku: it.product_sku,
          product_name: it.product_name,
          batch_no: it.batch_no || 'BATCH-GENERAL',
          qty: Number(it.qty),
          unit: it.unit || 'Kg',
          unit_price: Number(it.unit_price),
          line_total: Number(it.qty) * Number(it.unit_price),
        }))
      );
      if (itemErr) throw new Error(`Gagal menyimpan detail item penjualan: ${itemErr.message}`);

      await auditService.logActivity('CREATE_SALES_ORDER', 'inventory_sales_orders', salesNo, null, {
        customer_name: input.customer_name,
        total_amount: totalAmount,
        ledger_transaction_no: ledgerTxNo,
      });

      return {
        id: String(hdr.id),
        sales_no: salesNo,
        sales_date: input.sales_date,
        warehouse_id: input.warehouse_id,
        customer_id: input.customer_id,
        customer_name: input.customer_name.trim(),
        sales_channel: input.sales_channel,
        payment_method: input.payment_method || 'Bank BSI',
        status: 'CONFIRMED',
        payment_status: input.payment_status,
        subtotal_amount: subtotal,
        discount_amount: discount,
        total_amount: totalAmount,
        ledger_transaction_no: ledgerTxNo,
        notes: input.notes,
        created_by: getActorName(),
        items: input.items,
      };
    }

    const record: SalesOrderRecord = {
      id: generateId(),
      sales_no: salesNo,
      sales_date: input.sales_date,
      warehouse_id: input.warehouse_id,
      customer_id: input.customer_id,
      customer_name: input.customer_name.trim(),
      sales_channel: input.sales_channel,
      payment_method: input.payment_method || 'Bank BSI',
      status: 'CONFIRMED',
      payment_status: input.payment_status,
      subtotal_amount: subtotal,
      discount_amount: discount,
      total_amount: totalAmount,
      ledger_transaction_no: ledgerTxNo,
      notes: input.notes,
      created_by: getActorName(),
      items: input.items,
    };
    offlineState.salesOrders.unshift(record);
    await auditService.logActivity('CREATE_SALES_ORDER', 'inventory_sales_orders', salesNo, null, {
      customer_name: input.customer_name,
      total_amount: totalAmount,
      ledger_transaction_no: ledgerTxNo,
    });
    return record;
  },

  async postSalesOrderToFinanceLedger(salesNo: string): Promise<{ transactionNo: string }> {
    assertCanWriteInventory();
    const orders = await this.getSalesOrders();
    const order = orders.find((o) => o.sales_no === salesNo);
    if (!order) throw new Error(`Sales Order ${salesNo} tidak ditemukan.`);
    if (order.ledger_transaction_no) {
      return { transactionNo: order.ledger_transaction_no };
    }

    const totalQty = order.items.reduce((s, i) => s + Number(i.qty), 0);
    const summaryProduct =
      order.items.length === 1
        ? order.items[0].product_name
        : `${order.items[0]?.product_name || 'Komoditas Ikan'} (+${order.items.length - 1} item)`;

    const ledgerRes = await transactionService.saveTransaction({
      tanggal: order.sales_date,
      referal: 'PROJECT',
      plantation: 'TRADING IKAN',
      jenis: 'MASUK',
      kategori: 'Penjualan Ikan Ambon',
      sku_name: summaryProduct,
      metode_bayar: order.payment_method || 'Bank BSI',
      akun: order.payment_method || 'Bank BSI',
      qty: totalQty,
      jumlah: order.total_amount,
      harga_satuan: totalQty > 0 ? Math.round(order.total_amount / totalQty) : order.total_amount,
      customer_id: order.customer_id || '',
      customer_name: order.customer_name,
      keterangan: `[SALES ${order.sales_no}] Penjualan Perikanan Ambon ke ${order.customer_name}`,
    });

    if (!ledgerRes.success) {
      throw new Error(ledgerRes.error || 'Gagal memposting penjualan ke jurnal transaksi 20 kolom.');
    }

    if (isServerMode()) {
      const client = getSupabaseClient()!;
      const { error } = await client
        .from('inventory_sales_orders')
        .update({ ledger_transaction_no: ledgerRes.id, updated_at: new Date().toISOString() })
        .eq('sales_no', salesNo);
      if (error) throw new Error(`Gagal memperbarui referensi jurnal Sales Order: ${error.message}`);
    } else {
      const target = offlineState.salesOrders.find((o) => o.sales_no === salesNo);
      if (target) target.ledger_transaction_no = ledgerRes.id;
    }

    await auditService.logActivity('POST_SALES_TO_LEDGER', 'inventory_sales_orders', salesNo, null, {
      ledger_transaction_no: ledgerRes.id,
      amount: order.total_amount,
    });

    return { transactionNo: ledgerRes.id };
  },

  // ===========================================================================
  // 7. MODUL PENGELUARAN BARANG (OUTBOUND)
  // ===========================================================================
  async getOutbounds(): Promise<OutboundHeaderRecord[]> {
    assertCanReadInventory();
    const warehouses = await this.getWarehouses().catch(() => [] as InventoryWarehouse[]);
    const whMap = new Map<string, string>(warehouses.map((w) => [w.id, w.warehouse_name]));

    if (isServerMode()) {
      const client = getSupabaseClient()!;
      const { data, error } = await client
        .from('inventory_outbound_headers')
        .select('*, inventory_outbound_items(*)')
        .order('outbound_date', { ascending: false })
        .limit(150);
      if (error) throw new Error(`Gagal memuat data pengeluaran barang: ${error.message}`);
      return (data || []).map((o: any) => ({
        id: String(o.id),
        outbound_no: String(o.outbound_no),
        outbound_date: o.outbound_date,
        warehouse_id: String(o.warehouse_id),
        warehouse_name: whMap.get(o.warehouse_id) || o.warehouse_id,
        outbound_type: o.outbound_type || 'SALES_DELIVERY',
        sales_no: o.sales_no || undefined,
        recipient_name: String(o.recipient_name || ''),
        vehicle_no: String(o.vehicle_no || ''),
        driver_name: String(o.driver_name || ''),
        delivery_note_no: String(o.delivery_note_no || ''),
        status: o.status || 'POSTED',
        total_qty: Number(o.total_qty || 0),
        notes: String(o.notes || ''),
        created_by: String(o.created_by || 'ADMIN'),
        posted_at: o.posted_at,
        items: (o.inventory_outbound_items || []).map((i: any) => ({
          product_sku: String(i.product_sku),
          product_name: String(i.product_name),
          batch_no: String(i.batch_no || 'BATCH-GENERAL'),
          qty: Number(i.qty || 0),
          unit: String(i.unit || 'Kg'),
        })),
      }));
    }

    return offlineState.outbounds.map((o) => ({
      ...o,
      warehouse_name: whMap.get(o.warehouse_id) || o.warehouse_id,
    }));
  },

  async createAndPostOutbound(input: {
    outbound_date: string;
    warehouse_id: string;
    outbound_type: 'SALES_DELIVERY' | 'SAMPLE_QC' | 'SPOILAGE_SHRINK' | 'INTERNAL_USE';
    sales_no?: string;
    recipient_name: string;
    vehicle_no?: string;
    driver_name?: string;
    delivery_note_no?: string;
    notes?: string;
    items: OutboundItemInput[];
  }): Promise<OutboundHeaderRecord> {
    assertCanWriteInventory();
    if (!input.warehouse_id) throw new Error('Gudang asal wajib dipilih.');
    if (!input.recipient_name.trim()) throw new Error('Nama penerima / tujuan keluar wajib diisi.');
    if (!input.items || input.items.length === 0) throw new Error('Minimal 1 item pengeluaran wajib ditambahkan.');

    const balances = await this.getStockBalances();
    for (const item of input.items) {
      if (Number(item.qty) <= 0) throw new Error(`Qty keluar untuk ${item.product_sku} harus lebih dari 0.`);
      const slot = balances.find(
        (b) =>
          b.warehouse_id === input.warehouse_id &&
          b.product_sku === item.product_sku &&
          b.batch_no === (item.batch_no || 'BATCH-GENERAL')
      );
      const avail = slot ? Number(slot.qty_on_hand) : 0;
      if (avail < Number(item.qty)) {
        throw new Error(
          `Stok tidak mencukupi untuk pengeluaran ${item.product_sku} (${item.batch_no}): tersedia ${avail} ${item.unit}, diminta ${item.qty} ${item.unit}.`
        );
      }
    }

    const outboundNo = makeDocNo('OUT-AMB');
    const totalQty = input.items.reduce((s, i) => s + Number(i.qty), 0);
    const moveType: MovementType = input.outbound_type === 'SALES_DELIVERY' ? 'SALES_OUT' : 'OUTBOUND';

    if (isServerMode()) {
      const client = getSupabaseClient()!;
      const { data: hdr, error: hdrErr } = await client
        .from('inventory_outbound_headers')
        .insert({
          outbound_no: outboundNo,
          outbound_date: input.outbound_date,
          warehouse_id: input.warehouse_id,
          outbound_type: input.outbound_type,
          sales_no: input.sales_no || null,
          recipient_name: input.recipient_name.trim(),
          vehicle_no: input.vehicle_no || '',
          driver_name: input.driver_name || '',
          delivery_note_no: input.delivery_note_no || `SJ-${outboundNo}`,
          status: 'POSTED',
          total_qty: totalQty,
          notes: input.notes || '',
          created_by: getActorName(),
          posted_at: new Date().toISOString(),
        })
        .select('*')
        .single();
      if (hdrErr) throw new Error(`Gagal membuat dokumen outbound: ${hdrErr.message}`);

      const { error: itemErr } = await client.from('inventory_outbound_items').insert(
        input.items.map((it) => ({
          outbound_id: hdr.id,
          product_sku: it.product_sku,
          product_name: it.product_name,
          batch_no: it.batch_no || 'BATCH-GENERAL',
          qty: Number(it.qty),
          unit: it.unit || 'Kg',
        }))
      );
      if (itemErr) throw new Error(`Gagal menyimpan detail item outbound: ${itemErr.message}`);

      for (const it of input.items) {
        const slot = balances.find(
          (b) =>
            b.warehouse_id === input.warehouse_id &&
            b.product_sku === it.product_sku &&
            b.batch_no === (it.batch_no || 'BATCH-GENERAL')
        );
        await applySupabaseMovement({
          movementType: moveType,
          warehouseId: input.warehouse_id,
          productSku: it.product_sku,
          productName: it.product_name,
          batchNo: it.batch_no || 'BATCH-GENERAL',
          barcodeCode: slot?.barcode_code || '',
          qtyDelta: -Number(it.qty),
          unit: it.unit || 'Kg',
          unitCost: slot?.avg_unit_cost || 0,
          referenceType: input.sales_no ? 'SALES_ORDER' : 'OUTBOUND',
          referenceNo: input.sales_no || outboundNo,
          notes: `Pengeluaran ${input.outbound_type} ke ${input.recipient_name}`,
        });
      }

      if (input.sales_no) {
        await client
          .from('inventory_sales_orders')
          .update({ status: 'DISPATCHED', updated_at: new Date().toISOString() })
          .eq('sales_no', input.sales_no);
      }

      await auditService.logActivity('POST_OUTBOUND', 'inventory_outbound_headers', outboundNo, null, {
        warehouse_id: input.warehouse_id,
        outbound_type: input.outbound_type,
        sales_no: input.sales_no || null,
        total_qty: totalQty,
      });

      return {
        id: String(hdr.id),
        outbound_no: outboundNo,
        outbound_date: input.outbound_date,
        warehouse_id: input.warehouse_id,
        outbound_type: input.outbound_type,
        sales_no: input.sales_no,
        recipient_name: input.recipient_name.trim(),
        vehicle_no: input.vehicle_no,
        driver_name: input.driver_name,
        delivery_note_no: input.delivery_note_no || `SJ-${outboundNo}`,
        status: 'POSTED',
        total_qty: totalQty,
        notes: input.notes,
        created_by: getActorName(),
        posted_at: new Date().toISOString(),
        items: input.items,
      };
    }

    for (const it of input.items) {
      const slot = balances.find(
        (b) =>
          b.warehouse_id === input.warehouse_id &&
          b.product_sku === it.product_sku &&
          b.batch_no === (it.batch_no || 'BATCH-GENERAL')
      );
      applyOfflineMovement({
        movementType: moveType,
        warehouseId: input.warehouse_id,
        productSku: it.product_sku,
        productName: it.product_name,
        batchNo: it.batch_no || 'BATCH-GENERAL',
        barcodeCode: slot?.barcode_code,
        qtyDelta: -Number(it.qty),
        unit: it.unit || 'Kg',
        unitCost: slot?.avg_unit_cost || 0,
        referenceType: input.sales_no ? 'SALES_ORDER' : 'OUTBOUND',
        referenceNo: input.sales_no || outboundNo,
        notes: `Pengeluaran ${input.outbound_type} ke ${input.recipient_name}`,
      });
    }

    if (input.sales_no) {
      const so = offlineState.salesOrders.find((s) => s.sales_no === input.sales_no);
      if (so) so.status = 'DISPATCHED';
    }

    const record: OutboundHeaderRecord = {
      id: generateId(),
      outbound_no: outboundNo,
      outbound_date: input.outbound_date,
      warehouse_id: input.warehouse_id,
      outbound_type: input.outbound_type,
      sales_no: input.sales_no,
      recipient_name: input.recipient_name.trim(),
      vehicle_no: input.vehicle_no,
      driver_name: input.driver_name,
      delivery_note_no: input.delivery_note_no || `SJ-${outboundNo}`,
      status: 'POSTED',
      total_qty: totalQty,
      notes: input.notes,
      created_by: getActorName(),
      posted_at: new Date().toISOString(),
      items: input.items,
    };
    offlineState.outbounds.unshift(record);
    await auditService.logActivity('POST_OUTBOUND', 'inventory_outbound_headers', outboundNo, null, {
      warehouse_id: input.warehouse_id,
      outbound_type: input.outbound_type,
      sales_no: input.sales_no || null,
      total_qty: totalQty,
    });
    return record;
  },

  // ===========================================================================
  // 8. MODUL STOCK OPNAME
  // ===========================================================================
  async getStockOpnames(): Promise<StockOpnameRecord[]> {
    assertCanReadInventory();
    const warehouses = await this.getWarehouses().catch(() => [] as InventoryWarehouse[]);
    const whMap = new Map<string, string>(warehouses.map((w) => [w.id, w.warehouse_name]));

    if (isServerMode()) {
      const client = getSupabaseClient()!;
      const { data, error } = await client
        .from('inventory_stock_opnames')
        .select('*, inventory_stock_opname_items(*)')
        .order('opname_date', { ascending: false })
        .limit(100);
      if (error) throw new Error(`Gagal memuat data stock opname: ${error.message}`);
      return (data || []).map((o: any) => ({
        id: String(o.id),
        opname_no: String(o.opname_no),
        opname_date: o.opname_date,
        warehouse_id: String(o.warehouse_id),
        warehouse_name: whMap.get(o.warehouse_id) || o.warehouse_id,
        status: o.status || 'DRAFT',
        total_items: Number(o.total_items || 0),
        total_variance_qty: Number(o.total_variance_qty || 0),
        notes: String(o.notes || ''),
        created_by: String(o.created_by || 'ADMIN'),
        approved_by: o.approved_by || null,
        approved_at: o.approved_at || null,
        items: (o.inventory_stock_opname_items || []).map((i: any) => ({
          product_sku: String(i.product_sku),
          product_name: String(i.product_name),
          batch_no: String(i.batch_no || 'BATCH-GENERAL'),
          system_qty: Number(i.system_qty || 0),
          physical_qty: Number(i.physical_qty || 0),
          variance_qty: Number(i.variance_qty || 0),
          unit: String(i.unit || 'Kg'),
          reason: String(i.reason || ''),
        })),
      }));
    }

    return offlineState.opnames.map((o) => ({
      ...o,
      warehouse_name: whMap.get(o.warehouse_id) || o.warehouse_id,
    }));
  },

  async createAndApproveStockOpname(input: {
    opname_date: string;
    warehouse_id: string;
    approveImmediately: boolean;
    notes?: string;
    items: Array<{
      product_sku: string;
      product_name: string;
      batch_no: string;
      system_qty: number;
      physical_qty: number;
      unit: string;
      reason?: string;
    }>;
  }): Promise<StockOpnameRecord> {
    assertCanWriteInventory();
    if (!input.warehouse_id) throw new Error('Gudang opname wajib dipilih.');
    if (!input.items || input.items.length === 0) throw new Error('Minimal 1 baris item opname wajib diisi.');

    const computedItems: StockOpnameItemInput[] = input.items.map((it) => {
      const physical = Math.max(0, Number(it.physical_qty));
      const system = Number(it.system_qty);
      return {
        ...it,
        physical_qty: physical,
        system_qty: system,
        variance_qty: Math.round((physical - system) * 100) / 100,
      };
    });

    const opnameNo = makeDocNo('OPN-AMB');
    const totalVariance = computedItems.reduce((s, i) => s + i.variance_qty, 0);
    const status = input.approveImmediately ? 'APPROVED' : 'DRAFT';

    if (isServerMode()) {
      const client = getSupabaseClient()!;
      const { data: hdr, error: hdrErr } = await client
        .from('inventory_stock_opnames')
        .insert({
          opname_no: opnameNo,
          opname_date: input.opname_date,
          warehouse_id: input.warehouse_id,
          status,
          total_items: computedItems.length,
          total_variance_qty: totalVariance,
          notes: input.notes || '',
          created_by: getActorName(),
          approved_by: input.approveImmediately ? getActorName() : null,
          approved_at: input.approveImmediately ? new Date().toISOString() : null,
        })
        .select('*')
        .single();
      if (hdrErr) throw new Error(`Gagal menyimpan stock opname: ${hdrErr.message}`);

      const { error: itemErr } = await client.from('inventory_stock_opname_items').insert(
        computedItems.map((it) => ({
          opname_id: hdr.id,
          product_sku: it.product_sku,
          product_name: it.product_name,
          batch_no: it.batch_no || 'BATCH-GENERAL',
          system_qty: it.system_qty,
          physical_qty: it.physical_qty,
          variance_qty: it.variance_qty,
          unit: it.unit || 'Kg',
          reason: it.reason || '',
        }))
      );
      if (itemErr) throw new Error(`Gagal menyimpan detail opname: ${itemErr.message}`);

      if (input.approveImmediately) {
        const balances = await this.getStockBalances();
        for (const it of computedItems) {
          if (it.variance_qty !== 0) {
            const slot = balances.find(
              (b) =>
                b.warehouse_id === input.warehouse_id &&
                b.product_sku === it.product_sku &&
                b.batch_no === (it.batch_no || 'BATCH-GENERAL')
            );
            await applySupabaseMovement({
              movementType: 'OPNAME_ADJUSTMENT',
              warehouseId: input.warehouse_id,
              productSku: it.product_sku,
              productName: it.product_name,
              batchNo: it.batch_no || 'BATCH-GENERAL',
              barcodeCode: slot?.barcode_code || '',
              qtyDelta: it.variance_qty,
              unit: it.unit || 'Kg',
              unitCost: slot?.avg_unit_cost || 0,
              referenceType: 'STOCK_OPNAME',
              referenceNo: opnameNo,
              notes: it.reason || `Penyesuaian opname (${it.system_qty} -> ${it.physical_qty})`,
            });
          }
        }
      }

      await auditService.logActivity(
        input.approveImmediately ? 'APPROVE_STOCK_OPNAME' : 'CREATE_STOCK_OPNAME',
        'inventory_stock_opnames',
        opnameNo,
        null,
        { warehouse_id: input.warehouse_id, total_variance_qty: totalVariance, status }
      );

      return {
        id: String(hdr.id),
        opname_no: opnameNo,
        opname_date: input.opname_date,
        warehouse_id: input.warehouse_id,
        status,
        total_items: computedItems.length,
        total_variance_qty: totalVariance,
        notes: input.notes,
        created_by: getActorName(),
        approved_by: input.approveImmediately ? getActorName() : null,
        approved_at: input.approveImmediately ? new Date().toISOString() : null,
        items: computedItems,
      };
    }

    if (input.approveImmediately) {
      for (const it of computedItems) {
        if (it.variance_qty !== 0) {
          applyOfflineMovement({
            movementType: 'OPNAME_ADJUSTMENT',
            warehouseId: input.warehouse_id,
            productSku: it.product_sku,
            productName: it.product_name,
            batchNo: it.batch_no || 'BATCH-GENERAL',
            qtyDelta: it.variance_qty,
            unit: it.unit || 'Kg',
            unitCost: 0,
            referenceType: 'STOCK_OPNAME',
            referenceNo: opnameNo,
            notes: it.reason || `Penyesuaian opname (${it.system_qty} -> ${it.physical_qty})`,
          });
        }
      }
    }

    const record: StockOpnameRecord = {
      id: generateId(),
      opname_no: opnameNo,
      opname_date: input.opname_date,
      warehouse_id: input.warehouse_id,
      status,
      total_items: computedItems.length,
      total_variance_qty: totalVariance,
      notes: input.notes,
      created_by: getActorName(),
      approved_by: input.approveImmediately ? getActorName() : null,
      approved_at: input.approveImmediately ? new Date().toISOString() : null,
      items: computedItems,
    };
    offlineState.opnames.unshift(record);
    await auditService.logActivity(
      input.approveImmediately ? 'APPROVE_STOCK_OPNAME' : 'CREATE_STOCK_OPNAME',
      'inventory_stock_opnames',
      opnameNo,
      null,
      { warehouse_id: input.warehouse_id, total_variance_qty: totalVariance, status }
    );
    return record;
  },

  async approveDraftStockOpname(opnameNo: string): Promise<StockOpnameRecord> {
    assertCanWriteInventory();
    const all = await this.getStockOpnames();
    const target = all.find((o) => o.opname_no === opnameNo);
    if (!target) throw new Error(`Dokumen opname ${opnameNo} tidak ditemukan.`);
    if (target.status === 'APPROVED') return target;

    const balances = await this.getStockBalances();
    for (const it of target.items) {
      if (it.variance_qty !== 0) {
        const slot = balances.find(
          (b) =>
            b.warehouse_id === target.warehouse_id &&
            b.product_sku === it.product_sku &&
            b.batch_no === (it.batch_no || 'BATCH-GENERAL')
        );
        if (isServerMode()) {
          await applySupabaseMovement({
            movementType: 'OPNAME_ADJUSTMENT',
            warehouseId: target.warehouse_id,
            productSku: it.product_sku,
            productName: it.product_name,
            batchNo: it.batch_no || 'BATCH-GENERAL',
            barcodeCode: slot?.barcode_code || '',
            qtyDelta: it.variance_qty,
            unit: it.unit || 'Kg',
            unitCost: slot?.avg_unit_cost || 0,
            referenceType: 'STOCK_OPNAME',
            referenceNo: opnameNo,
            notes: it.reason || `Approval opname (${it.system_qty} -> ${it.physical_qty})`,
          });
        } else {
          applyOfflineMovement({
            movementType: 'OPNAME_ADJUSTMENT',
            warehouseId: target.warehouse_id,
            productSku: it.product_sku,
            productName: it.product_name,
            batchNo: it.batch_no || 'BATCH-GENERAL',
            qtyDelta: it.variance_qty,
            unit: it.unit || 'Kg',
            unitCost: slot?.avg_unit_cost || 0,
            referenceType: 'STOCK_OPNAME',
            referenceNo: opnameNo,
            notes: it.reason || `Approval opname (${it.system_qty} -> ${it.physical_qty})`,
          });
        }
      }
    }

    const nowIso = new Date().toISOString();
    if (isServerMode()) {
      const client = getSupabaseClient()!;
      await client
        .from('inventory_stock_opnames')
        .update({ status: 'APPROVED', approved_by: getActorName(), approved_at: nowIso, updated_at: nowIso })
        .eq('opname_no', opnameNo);
    } else {
      const ref = offlineState.opnames.find((o) => o.opname_no === opnameNo);
      if (ref) {
        ref.status = 'APPROVED';
        ref.approved_by = getActorName();
        ref.approved_at = nowIso;
      }
    }

    await auditService.logActivity('APPROVE_STOCK_OPNAME', 'inventory_stock_opnames', opnameNo, null, {
      total_variance_qty: target.total_variance_qty,
    });
    return { ...target, status: 'APPROVED', approved_by: getActorName(), approved_at: nowIso };
  },

  // ===========================================================================
  // 9. DASHBOARD SUMMARY (PERIKANAN AMBON)
  // ===========================================================================
  async getDashboardSummary(): Promise<InventoryDashboardSummary> {
    assertCanReadInventory();
    const [warehouses, balances, inbounds, outbounds, salesOrders, productsRes] = await Promise.all([
      this.getWarehouses().catch(() => [] as InventoryWarehouse[]),
      this.getStockBalances().catch(() => [] as StockBalanceRecord[]),
      this.getInbounds().catch(() => [] as InboundHeaderRecord[]),
      this.getOutbounds().catch(() => [] as OutboundHeaderRecord[]),
      this.getSalesOrders().catch(() => [] as SalesOrderRecord[]),
      productService.getAllProducts().catch(() => ({ data: [] as ProductItem[] })),
    ]);

    const totalOnHandKg = balances.reduce((s, b) => s + Number(b.qty_on_hand || 0), 0);
    const totalInventoryValue = balances.reduce(
      (s, b) => s + Number(b.qty_on_hand || 0) * Number(b.avg_unit_cost || 0),
      0
    );
    const activeSkus = new Set(balances.filter((b) => b.qty_on_hand > 0).map((b) => b.product_sku));
    const totalInboundQty = inbounds.filter((i) => i.status === 'POSTED').reduce((s, i) => s + i.total_qty, 0);
    const totalOutboundQty = outbounds.filter((o) => o.status === 'POSTED').reduce((s, o) => s + o.total_qty, 0);
    const validSales = salesOrders.filter((s) => s.status !== 'CANCELLED');
    const totalSalesRevenue = validSales.reduce((s, o) => s + Number(o.total_amount || 0), 0);

    // Aggregate per SKU for low-stock check
    const qtyBySku = new Map<string, number>();
    for (const b of balances) {
      qtyBySku.set(b.product_sku, (qtyBySku.get(b.product_sku) || 0) + b.qty_on_hand);
    }

    const lowStockAlerts: InventoryDashboardSummary['lowStockAlerts'] = [];
    for (const prd of productsRes.data) {
      const isFishery =
        prd.group_name.includes('IKAN') || Boolean(prd.fish_species) || prd.sku_code.startsWith('SKU-AMB');
      if (!isFishery) continue;
      const qty = qtyBySku.get(prd.sku_code) || 0;
      const minQty = Number(prd.min_stock_qty ?? 100);
      if (qty < minQty) {
        lowStockAlerts.push({
          sku_code: prd.sku_code,
          sku_name: prd.sku_name,
          warehouse_name: 'Total Seluruh Gudang Ambon',
          qty_on_hand: qty,
          min_stock_qty: minQty,
          unit: prd.unit || 'Kg',
        });
      }
    }

    const todayMs = Date.now();
    const expiringSoonLots: InventoryDashboardSummary['expiringSoonLots'] = balances
      .filter((b) => b.qty_on_hand > 0 && b.expiry_date)
      .map((b) => {
        const expMs = new Date(b.expiry_date as string).getTime();
        const days = Math.ceil((expMs - todayMs) / (1000 * 60 * 60 * 24));
        return {
          sku_code: b.product_sku,
          sku_name: b.product_name || b.product_sku,
          batch_no: b.batch_no,
          warehouse_name: b.warehouse_name || b.warehouse_id,
          qty_on_hand: b.qty_on_hand,
          expiry_date: b.expiry_date as string,
          days_remaining: days,
        };
      })
      .filter((x) => x.days_remaining <= 30)
      .sort((a, b) => a.days_remaining - b.days_remaining);

    const warehouseUtilization = warehouses.map((w) => {
      const qty = balances
        .filter((b) => b.warehouse_id === w.id)
        .reduce((s, b) => s + Number(b.qty_on_hand || 0), 0);
      return {
        warehouse_id: w.id,
        warehouse_code: w.warehouse_code,
        warehouse_name: w.warehouse_name,
        warehouse_type: w.warehouse_type,
        target_temp_c: w.target_temp_c,
        qty_on_hand: qty,
        capacity_kg: w.capacity_kg,
        utilization_pct: w.capacity_kg > 0 ? Math.min(100, Math.round((qty / w.capacity_kg) * 1000) / 10) : 0,
      };
    });

    return {
      totalOnHandKg,
      totalInventoryValue,
      totalActiveSkus: activeSkus.size,
      totalInboundQty,
      totalOutboundQty,
      totalSalesRevenue,
      totalSalesOrders: validSales.length,
      lowStockAlerts,
      expiringSoonLots,
      warehouseUtilization,
    };
  },
};
