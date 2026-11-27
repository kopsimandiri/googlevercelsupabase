import React, { useEffect, useMemo, useState } from 'react';
import { Fish, Plus, Search, Database, Edit3 } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Table, ColumnDef } from '../common/Table';
import { Modal } from '../common/Modal';
import { InventorySchemaNotice } from './InventorySchemaNotice';
import { productService, ProductItem } from '../../services/productService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { formatRupiah } from '../../utils/formatters';

export const FishProductMasterModule: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useNotification();
  const isAdmin = role === 'ADMIN';

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterScope, setFilterScope] = useState<'FISHERY' | 'ALL'>('FISHERY');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    id: '',
    sku_code: '',
    sku_name: '',
    fish_species: '',
    fish_category: 'Pelagis Besar',
    storage_type: 'FROZEN' as 'FRESH' | 'CHILLED' | 'FROZEN' | 'DRY',
    grade: 'Grade A',
    packaging: 'Master Box 20kg',
    unit: 'Kg',
    defaultPrice: 0,
    min_stock_qty: 100,
    barcode: '',
    origin_region: 'Ambon & Maluku',
    is_active: true,
  });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await productService.getAllProducts();
      setProducts(res.data);
    } catch (err: any) {
      showToast(err?.message || 'Gagal memuat master produk.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => {
        if (filterScope === 'FISHERY') {
          return (
            p.group_name.includes('IKAN') ||
            Boolean(p.fish_species) ||
            p.sku_code.startsWith('SKU-AMB') ||
            p.sku_code.includes('TUNA') ||
            p.sku_code.includes('LAYANG') ||
            p.sku_code.includes('CUMI') ||
            p.sku_code.includes('KAKAP')
          );
        }
        return true;
      })
      .filter((p) => {
        if (!q) return true;
        return (
          p.sku_code.toLowerCase().includes(q) ||
          p.sku_name.toLowerCase().includes(q) ||
          (p.fish_species || '').toLowerCase().includes(q) ||
          (p.barcode || '').toLowerCase().includes(q)
        );
      });
  }, [products, search, filterScope]);

  const openNewModal = () => {
    setForm({
      id: '',
      sku_code: 'SKU-AMB-',
      sku_name: '',
      fish_species: '',
      fish_category: 'Pelagis Besar',
      storage_type: 'FROZEN',
      grade: 'Grade A',
      packaging: 'Master Box 20kg',
      unit: 'Kg',
      defaultPrice: 50000,
      min_stock_qty: 150,
      barcode: `8997001${Math.floor(100000 + Math.random() * 899999)}`,
      origin_region: 'Ambon & Maluku',
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (p: ProductItem) => {
    setForm({
      id: p.id,
      sku_code: p.sku_code,
      sku_name: p.sku_name,
      fish_species: p.fish_species || '',
      fish_category: p.fish_category || p.subgroup || 'Pelagis Besar',
      storage_type: p.storage_type || 'FROZEN',
      grade: p.grade || 'Grade A',
      packaging: p.packaging || 'Master Box 20kg',
      unit: p.unit || 'Kg',
      defaultPrice: p.defaultPrice || 0,
      min_stock_qty: p.min_stock_qty ?? 100,
      barcode: p.barcode || '',
      origin_region: p.origin_region || 'Ambon & Maluku',
      is_active: p.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      const res = await productService.upsertFisheryProduct({
        id: form.id || undefined,
        sku_code: form.sku_code,
        sku_name: form.sku_name,
        group_id: 'GRP-IKAN',
        group_name: 'TRADING IKAN',
        subgroup: form.fish_category,
        fish_species: form.fish_species,
        fish_category: form.fish_category,
        storage_type: form.storage_type,
        grade: form.grade,
        packaging: form.packaging,
        unit: form.unit,
        defaultPrice: form.defaultPrice,
        min_stock_qty: form.min_stock_qty,
        barcode: form.barcode,
        origin_region: form.origin_region,
        is_active: form.is_active,
      });
      if (!res.success) {
        showToast(res.error || 'Gagal menyimpan produk ikan.', 'error');
        return;
      }
      showToast(`Master produk ${form.sku_code} berhasil disimpan.`, 'success');
      setModalOpen(false);
      await loadProducts();
    } finally {
      setSaving(false);
    }
  };

  const handleSeedAmbon = async () => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const res = await productService.seedProductsToSupabase();
      if (res.success) {
        showToast(`${res.count} SKU komoditas & ikan Ambon berhasil disinkronkan ke public.products.`, 'success');
        await loadProducts();
      } else {
        showToast(res.error || 'Gagal melakukan sinkronisasi master produk.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<ProductItem>[] = [
    {
      key: 'sku_code',
      header: 'SKU & Barcode',
      cell: (p) => (
        <div>
          <div className="font-mono text-xs font-bold text-primary-900">{p.sku_code}</div>
          <div className="font-mono text-[10px] text-stone-500">{p.barcode || 'Belum ada barcode'}</div>
        </div>
      ),
    },
    {
      key: 'sku_name',
      header: 'Nama Produk & Jenis Ikan',
      cell: (p) => (
        <div>
          <div className="font-semibold text-xs text-stone-900">{p.sku_name}</div>
          <div className="text-[11px] text-stone-500">
            {p.fish_species || p.subgroup} • Asal: {p.origin_region || 'Ambon'}
          </div>
        </div>
      ),
    },
    {
      key: 'storage_type',
      header: 'Penyimpanan & Mutu',
      cell: (p) => (
        <div className="space-y-1">
          <Badge variant={p.storage_type === 'FROZEN' ? 'primary' : p.storage_type === 'CHILLED' ? 'warning' : 'default'} size="sm">
            {p.storage_type || 'FROZEN'}
          </Badge>
          <div className="text-[10px] text-stone-500">{p.grade} • {p.packaging}</div>
        </div>
      ),
    },
    {
      key: 'defaultPrice',
      header: 'Harga Referensi',
      align: 'right',
      cell: (p) => (
        <span className="font-mono text-xs font-semibold tabular-nums text-stone-900">
          {formatRupiah(p.defaultPrice)} / {p.unit}
        </span>
      ),
    },
    {
      key: 'min_stock_qty',
      header: 'Min Stok',
      align: 'right',
      cell: (p) => (
        <span className="font-mono text-xs tabular-nums text-stone-700">
          {(p.min_stock_qty ?? 100).toLocaleString('id-ID')} {p.unit}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'center',
      cell: (p) =>
        isAdmin ? (
          <Button size="xs" variant="outline" onClick={() => openEditModal(p)} leftIcon={<Edit3 className="w-3 h-3" />}>
            Edit
          </Button>
        ) : (
          <Badge variant="default" size="sm">Read-Only</Badge>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <InventorySchemaNotice />

      <Card
        title="Master Produk & Jenis Ikan (Terintegrasi Tabel public.products)"
        subtitle="Pengelolaan SKU ikan pelagis/demersal Ambon, jenis penyimpanan cold-chain, barcode standar, dan batas stok minimum"
        action={
          isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSeedAmbon}
                disabled={saving}
                leftIcon={<Database className="w-3.5 h-3.5" />}
              >
                Sinkron Katalog Ambon
              </Button>
              <Button size="sm" variant="primary" onClick={openNewModal} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Tambah SKU Ikan
              </Button>
            </div>
          )
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode SKU, jenis ikan (Tuna, Cakalang, Kakap), atau barcode..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-primary-700"
              />
            </div>

            <div className="inline-flex rounded-xl border border-stone-200 bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => setFilterScope('FISHERY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterScope === 'FISHERY' ? 'bg-white text-primary-900 shadow-2xs' : 'text-stone-600'
                }`}
              >
                Perikanan & Kelautan
              </button>
              <button
                type="button"
                onClick={() => setFilterScope('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterScope === 'ALL' ? 'bg-white text-primary-900 shadow-2xs' : 'text-stone-600'
                }`}
              >
                Semua 8 Sektor ({products.length})
              </button>
            </div>
          </div>

          <Table
            columns={columns}
            data={filtered}
            keyExtractor={(r) => r.sku_code}
            isLoading={loading}
            density="compact"
            emptyState={
              <div className="py-6 space-y-2 text-center">
                <Fish className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-xs text-stone-500">Belum ada SKU ikan yang cocok dengan pencarian.</p>
                {isAdmin && (
                  <Button size="xs" variant="primary" onClick={openNewModal}>
                    Tambah SKU Ikan Baru
                  </Button>
                )}
              </div>
            }
          />
        </div>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? `Edit Master SKU: ${form.sku_code}` : 'Tambah SKU & Jenis Ikan Baru'}
        subtitle="Data disimpan langsung ke tabel master public.products agar terhubung ke modul transaksi dan inventori"
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Kode SKU *</label>
              <input
                type="text"
                required
                value={form.sku_code}
                onChange={(e) => setForm({ ...form, sku_code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono"
                placeholder="SKU-AMB-TUNA-01"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Barcode EAN/Code128</label>
              <input
                type="text"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-stone-700 mb-1">Nama Produk / Komoditas Ikan *</label>
              <input
                type="text"
                required
                value={form.sku_name}
                onChange={(e) => setForm({ ...form, sku_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
                placeholder="Contoh: Tuna Sirip Kuning Loin Beku (Yellowfin)"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Spesies / Nama Ilmiah Ikan</label>
              <input
                type="text"
                value={form.fish_species}
                onChange={(e) => setForm({ ...form, fish_species: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
                placeholder="Thunnus albacares"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Kategori Ikan</label>
              <select
                value={form.fish_category}
                onChange={(e) => setForm({ ...form, fish_category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
              >
                <option value="Pelagis Besar">Pelagis Besar (Tuna, Tenggiri)</option>
                <option value="Pelagis">Pelagis (Cakalang, Tongkol)</option>
                <option value="Pelagis Kecil">Pelagis Kecil (Layang, Kembung)</option>
                <option value="Demersal & Karang">Demersal & Karang (Kakap Merah, Kerapu)</option>
                <option value="Cephalopoda">Cephalopoda (Cumi, Gurita)</option>
                <option value="Olahan & Kemasan">Olahan & Kemasan</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Tipe Penyimpanan</label>
              <select
                value={form.storage_type}
                onChange={(e) => setForm({ ...form, storage_type: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
              >
                <option value="FROZEN">FROZEN (Cold Storage -20°C)</option>
                <option value="CHILLED">CHILLED (Chiller 0°C s/d 4°C)</option>
                <option value="FRESH">FRESH (Tangkap Segar Es)</option>
                <option value="DRY">DRY (Gudang Kering / Kemasan)</option>
              </select>
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
              <label className="block font-semibold text-stone-700 mb-1">Kemasan</label>
              <input
                type="text"
                value={form.packaging}
                onChange={(e) => setForm({ ...form, packaging: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Satuan Utama</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
              >
                <option value="Kg">Kg</option>
                <option value="Box">Box</option>
                <option value="Karton">Karton</option>
                <option value="Ton">Ton</option>
                <option value="Ekor">Ekor</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Harga Referensi (Rp / Satuan)</label>
              <input
                type="number"
                min={0}
                value={form.defaultPrice}
                onChange={(e) => setForm({ ...form, defaultPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Batas Stok Minimum Peringatan</label>
              <input
                type="number"
                min={0}
                value={form.min_stock_qty}
                onChange={(e) => setForm({ ...form, min_stock_qty: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-stone-700 mb-1">Wilayah Asal Tangkapan</label>
              <input
                type="text"
                value={form.origin_region}
                onChange={(e) => setForm({ ...form, origin_region: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={saving}>
              Simpan Master Produk
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
