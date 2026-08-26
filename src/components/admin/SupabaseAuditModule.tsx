import React, { useState, useEffect } from 'react';
import {
  masterDataService,
  SUPABASE_TABLES_METADATA,
  TableAuditInfo,
} from '../../services/masterDataService';
import { SupabaseTableName } from '../../types/database';
import { isSupabaseConfigured, getSupabaseClient } from '../../lib/supabase';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { LoadingState } from '../common/LoadingState';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Code2,
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  Table as TableIcon,
  UploadCloud,
  ChevronRight,
  ShieldAlert,
  Info,
  Clock,
  Layers,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';

export const SupabaseAuditModule: React.FC = () => {
  const [auditResults, setAuditResults] = useState<TableAuditInfo[]>([]);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [activeTable, setActiveTable] = useState<SupabaseTableName>('areas');
  const [tableData, setTableData] = useState<any[]>([]);
  const [isLoadingTable, setIsLoadingTable] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<'SUPABASE' | 'LOCAL'>('LOCAL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedDdl, setCopiedDdl] = useState<boolean>(false);
  const [showDdlModal, setShowDdlModal] = useState<boolean>(false);
  const [selectedDdlTable, setSelectedDdlTable] = useState<SupabaseTableName | 'ALL'>('ALL');
  
  // CRUD Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Run comprehensive audit on mount
  useEffect(() => {
    runAudit();
  }, []);

  // Fetch active table data when activeTable changes
  useEffect(() => {
    loadTableData(activeTable);
  }, [activeTable]);

  const runAudit = async () => {
    setIsAuditing(true);
    try {
      const results = await masterDataService.auditAllTables();
      setAuditResults(results);
    } catch (err: any) {
      console.error('Audit failed:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  const loadTableData = async (tableName: SupabaseTableName) => {
    setIsLoadingTable(true);
    try {
      const res = await masterDataService.getTableRecords(tableName);
      setTableData(res.data);
      setDataSource(res.source);
    } catch (err: any) {
      console.error('Error loading table records:', err);
    } finally {
      setIsLoadingTable(false);
    }
  };

  const handleCopyDdl = (tableKey: SupabaseTableName | 'ALL') => {
    const text =
      tableKey === 'ALL'
        ? masterDataService.getAllTablesDdlSql()
        : SUPABASE_TABLES_METADATA[tableKey].ddlSql;
    navigator.clipboard.writeText(text);
    setCopiedDdl(true);
    setTimeout(() => setCopiedDdl(false), 2500);
  };

  const handleSeedToSupabase = async (tableName: SupabaseTableName) => {
    setIsLoadingTable(true);
    try {
      const res = await masterDataService.seedTableToSupabase(tableName);
      if (res.success) {
        setFeedbackMessage({
          type: 'success',
          text: `Berhasil sinkronisasi ${res.count} baris data ke Supabase tabel '${tableName}'!`,
        });
        await loadTableData(tableName);
        await runAudit();
      } else {
        setFeedbackMessage({
          type: 'error',
          text: `Gagal sinkron ke Supabase: ${res.error}`,
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `Terjadi kendala: ${err.message || err}`,
      });
    } finally {
      setIsLoadingTable(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Yakin ingin menghapus record ID: ${id}?`)) return;
    try {
      await masterDataService.deleteRecord(activeTable, id);
      setFeedbackMessage({
        type: 'success',
        text: `Record ${id} berhasil dihapus.`,
      });
      await loadTableData(activeTable);
      await runAudit();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `Gagal menghapus: ${err.message || err}`,
      });
    } finally {
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleOpenCreateModal = () => {
    const meta = SUPABASE_TABLES_METADATA[activeTable];
    const initialObj: any = {};
    meta.columns.forEach((col) => {
      if (col === 'id') {
        initialObj[col] = `${activeTable.substring(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      } else if (col === 'created_at' || col === 'updated_at') {
        initialObj[col] = new Date().toISOString();
      } else if (col.includes('amount') || col.includes('simpanan') || col === 'moq') {
        initialObj[col] = 0;
      } else if (col === 'is_active') {
        initialObj[col] = true;
      } else {
        initialObj[col] = '';
      }
    });
    setEditingRecord(initialObj);
    setIsCreatingNew(true);
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (record: any) => {
    setEditingRecord({ ...record });
    setIsCreatingNew(false);
    setIsEditModalOpen(true);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !editingRecord.id) return;

    try {
      const res = await masterDataService.saveRecord(activeTable, editingRecord);
      setFeedbackMessage({
        type: 'success',
        text: `Data ${editingRecord.id} berhasil disimpan ke ${res.source}!`,
      });
      setIsEditModalOpen(false);
      await loadTableData(activeTable);
      await runAudit();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `Gagal menyimpan: ${err.message || err}`,
      });
    } finally {
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  // Filtered rows
  const filteredData = tableData.filter((row) => {
    if (!searchQuery.trim()) return true;
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const activeMeta = SUPABASE_TABLES_METADATA[activeTable];
  const totalTables = Object.keys(SUPABASE_TABLES_METADATA).length;
  const connectedCount = auditResults.filter((r) => r.isConnected).length;

  return (
    <div className="space-y-6" id="supabase-audit-module-root">
      {/* Top Banner & Audit Control */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-200 bg-gradient-to-r from-primary-950 via-primary-900 to-primary-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-accent-gold/20 rounded-xl border border-accent-gold/40 text-accent-gold shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold font-serif text-white">
                  Audit & Manajemen Database Supabase (11 Tabel Resmi)
                </h2>
                <Badge
                  variant={isSupabaseConfigured ? 'gold' : 'neutral'}
                  size="sm"
                >
                  {isSupabaseConfigured ? 'Production Live' : 'Offline / Standalone'}
                </Badge>
              </div>
              <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
                Pemeriksaan real-time untuk seluruh 11 tabel operasional: DDL Schema, kuantitas baris, status RLS, latensi koneksi (ms), serta modul CRUD penuh.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedDdlTable('ALL');
                setShowDdlModal(true);
              }}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs"
              leftIcon={<Code2 className="w-3.5 h-3.5" />}
            >
              Lihat DDL SQL (11 Tabel)
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={runAudit}
              isLoading={isAuditing}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs font-bold"
            >
              Jalankan Audit Menyeluruh
            </Button>
          </div>
        </div>

        {/* Global Connection Health Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-stone-200 bg-stone-50 text-xs text-stone-700">
          <div className="p-4">
            <span className="text-[10px] text-stone-500 font-mono uppercase block">Total Tabel Terdaftar</span>
            <span className="text-lg font-bold text-stone-900 font-serif">{totalTables} Tabel Master</span>
          </div>
          <div className="p-4">
            <span className="text-[10px] text-stone-500 font-mono uppercase block">Koneksi Supabase Cloud</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  connectedCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="font-bold text-stone-900">
                {connectedCount} / {totalTables} Tersambung
              </span>
            </div>
          </div>
          <div className="p-4">
            <span className="text-[10px] text-stone-500 font-mono uppercase block">Status Supabase Client</span>
            <span className="font-semibold text-emerald-800 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Client Siap (v2.95)
            </span>
          </div>
          <div className="p-4">
            <span className="text-[10px] text-stone-500 font-mono uppercase block">Audit Terakhir</span>
            <span className="font-mono text-stone-800 text-[11px] mt-0.5 block">
              {auditResults[0]?.lastChecked || 'Belum diaudit'}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-stone-400 hover:text-stone-700 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 11 Tables Audit Summary Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 font-mono flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-primary-800" />
            Daftar Audit 11 Tabel Schema
          </h3>
          <span className="text-[11px] text-stone-500">Klik tabel untuk membuka kontrol CRUD</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {Object.entries(SUPABASE_TABLES_METADATA).map(([key, meta]) => {
            const tblKey = key as SupabaseTableName;
            const audit = auditResults.find((r) => r.tableName === tblKey);
            const isSelected = activeTable === tblKey;

            return (
              <div
                key={key}
                onClick={() => setActiveTable(tblKey)}
                className={`p-4 rounded-xl border transition-all cursor-pointer text-xs ${
                  isSelected
                    ? 'bg-primary-50/70 border-primary-700 ring-2 ring-primary-700/20 shadow-xs'
                    : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] text-primary-900 font-bold bg-primary-100 px-1.5 py-0.5 rounded">
                      {key}
                    </span>
                    <h4 className="font-bold text-stone-900 mt-1 text-xs">{meta.label}</h4>
                  </div>
                  <Badge variant={audit?.isConnected ? 'success' : 'neutral'} size="sm">
                    {audit?.isConnected ? 'Cloud OK' : 'Local Data'}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 py-2 border-y border-stone-100 text-[11px]">
                  <div>
                    <span className="text-[10px] text-stone-400 block">Kolom:</span>
                    <span className="font-bold text-stone-800">{meta.columnCount} Kolom</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Baris:</span>
                    <span className="font-bold text-stone-800">{audit?.rowCount ?? 0} Record</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Latensi:</span>
                    <span className="font-bold text-stone-800">{audit?.latencyMs ?? 0} ms</span>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[10px] text-stone-500">
                  <span className="truncate max-w-[180px]">{audit?.statusMessage || 'Siap audit'}</span>
                  <span className="text-primary-800 font-bold flex items-center gap-0.5">
                    Buka <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Table Data & CRUD Explorer */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Explorer Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-800 text-white shadow-xs">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-stone-900">
                  Tabel: <span className="font-mono text-primary-900 underline">{activeTable}</span> ({activeMeta.label})
                </h3>
                <Badge variant={dataSource === 'SUPABASE' ? 'success' : 'gold'} size="sm">
                  Sumber: {dataSource}
                </Badge>
              </div>
              <p className="text-xs text-stone-500">
                Struktur {activeMeta.columnCount} kolom: {activeMeta.columns.slice(0, 6).join(', ')}...
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder={`Cari dalam ${activeTable}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 focus:outline-hidden focus:ring-1 focus:ring-primary-700 w-40 sm:w-56 bg-white"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSeedToSupabase(activeTable)}
              title="Kirim baseline data lokal ke Supabase cloud"
              leftIcon={<UploadCloud className="w-3.5 h-3.5 text-primary-700" />}
              className="text-xs"
            >
              Sinkron ke Cloud
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedDdlTable(activeTable);
                setShowDdlModal(true);
              }}
              title="Lihat DDL SQL untuk tabel ini"
              leftIcon={<Code2 className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              DDL SQL
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTableData(activeTable)}
              isLoading={isLoadingTable}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Refresh
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateModal}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs font-bold"
            >
              Tambah Record
            </Button>
          </div>
        </div>

        {/* Table Records Content */}
        {isLoadingTable ? (
          <LoadingState message={`Memuat baris data tabel ${activeTable}...`} />
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500 space-y-3">
            <Info className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="font-semibold text-stone-700">Belum ada baris data untuk tabel `{activeTable}`.</p>
            <div className="flex justify-center gap-2 pt-2">
              <Button size="sm" variant="primary" onClick={handleOpenCreateModal}>
                Tambah Baris Pertama
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleSeedToSupabase(activeTable)}>
                Seed Baseline Data
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-stone-100 text-stone-700 font-mono uppercase text-[10px] sticky top-0 z-10 border-b border-stone-200">
                <tr>
                  <th className="p-3 w-12 text-center">No</th>
                  {activeMeta.columns.map((col) => (
                    <th key={col} className="p-3 font-semibold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                  <th className="p-3 text-right sticky right-0 bg-stone-100 shadow-xs">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {filteredData.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-stone-50/80 transition-colors">
                    <td className="p-3 text-center text-stone-400 font-mono text-[10px]">{idx + 1}</td>
                    {activeMeta.columns.map((col) => {
                      const val = row[col];
                      const valStr =
                        typeof val === 'object' ? JSON.stringify(val) : String(val ?? '-');
                      const isId = col === 'id' || col.endsWith('_code') || col.endsWith('_no');

                      return (
                        <td
                          key={col}
                          className={`p-3 max-w-xs truncate ${
                            isId ? 'font-mono font-bold text-primary-950' : ''
                          }`}
                          title={valStr}
                        >
                          {typeof val === 'boolean' ? (
                            <Badge variant={val ? 'success' : 'neutral'} size="sm">
                              {val ? 'TRUE' : 'FALSE'}
                            </Badge>
                          ) : (
                            valStr
                          )}
                        </td>
                      );
                    })}
                    <td className="p-3 text-right whitespace-nowrap sticky right-0 bg-white shadow-xs">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(row)}
                          className="p-1.5 text-stone-500 hover:text-primary-800 hover:bg-stone-100 rounded"
                          title="Edit record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                          title="Hapus record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-3.5 border-t border-stone-200 bg-stone-50 text-[11px] text-stone-500 flex items-center justify-between">
          <span>Menampilkan {filteredData.length} dari total {tableData.length} baris data.</span>
          <span className="font-mono">Tabel ID: {activeTable} | {activeMeta.columnCount} Kolom</span>
        </div>
      </div>

      {/* DDL SQL Drawer / Modal */}
      {showDdlModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-stone-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-200 bg-primary-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Code2 className="w-5 h-5 text-accent-gold" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold">
                    DDL SQL Script: {selectedDdlTable === 'ALL' ? 'Semua 9 Tabel' : selectedDdlTable}
                  </h3>
                  <p className="text-xs text-stone-300">
                    Jalankan script ini di menu SQL Editor pada Supabase Dashboard Anda.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDdlModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-stone-900 text-stone-200 overflow-y-auto flex-1 font-mono text-xs leading-relaxed">
              <pre>
                {selectedDdlTable === 'ALL'
                  ? masterDataService.getAllTablesDdlSql()
                  : SUPABASE_TABLES_METADATA[selectedDdlTable].ddlSql}
              </pre>
            </div>

            <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDdlTable('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    selectedDdlTable === 'ALL'
                      ? 'bg-primary-900 text-white'
                      : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                  }`}
                >
                  Semua (9 Tabel)
                </button>
                <button
                  onClick={() => setSelectedDdlTable(activeTable)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    selectedDdlTable === activeTable
                      ? 'bg-primary-900 text-white'
                      : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                  }`}
                >
                  Hanya {activeTable}
                </button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleCopyDdl(selectedDdlTable)}
                  leftIcon={copiedDdl ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copiedDdl ? 'Tersalin ke Clipboard!' : 'Salin DDL SQL'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowDdlModal(false)}>
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Record Modal */}
      {isEditModalOpen && editingRecord && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-stone-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-200 bg-primary-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-serif">
                  {isCreatingNew ? `Tambah Baris Baru: ${activeTable}` : `Edit Data: ${editingRecord.id}`}
                </h3>
                <p className="text-xs text-stone-300">
                  Pastikan semua field {activeMeta.columnCount} kolom terisi sesuai tipe data.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-stone-300 hover:text-white p-1 rounded font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeMeta.columns.map((col) => {
                  const val = editingRecord[col] ?? '';
                  const isId = col === 'id';
                  const isBoolean = typeof val === 'boolean' || col === 'is_active';

                  return (
                    <div key={col} className={col === 'address' || col === 'notes' || col === 'permissions' ? 'sm:col-span-2' : ''}>
                      <label className="block text-[11px] font-bold text-stone-700 uppercase font-mono mb-1">
                        {col} {isId && <span className="text-rose-500">* (PK)</span>}
                      </label>

                      {isBoolean ? (
                        <select
                          value={String(editingRecord[col])}
                          onChange={(e) =>
                            setEditingRecord({
                              ...editingRecord,
                              [col]: e.target.value === 'true',
                            })
                          }
                          className="w-full p-2.5 rounded-lg border border-stone-300 bg-stone-50 focus:bg-white text-xs font-semibold"
                        >
                          <option value="true">TRUE</option>
                          <option value="false">FALSE</option>
                        </select>
                      ) : col === 'notes' || col === 'address' ? (
                        <textarea
                          rows={2}
                          value={val}
                          onChange={(e) =>
                            setEditingRecord({
                              ...editingRecord,
                              [col]: e.target.value,
                            })
                          }
                          className="w-full p-2.5 rounded-lg border border-stone-300 bg-stone-50 focus:bg-white text-xs"
                        />
                      ) : (
                        <input
                          type={col.includes('amount') || col.includes('simpanan') || col === 'moq' ? 'number' : 'text'}
                          value={val}
                          disabled={isId && !isCreatingNew}
                          onChange={(e) =>
                            setEditingRecord({
                              ...editingRecord,
                              [col]:
                                col.includes('amount') || col.includes('simpanan') || col === 'moq'
                                  ? Number(e.target.value)
                                  : e.target.value,
                            })
                          }
                          className={`w-full p-2.5 rounded-lg border border-stone-300 text-xs ${
                            isId && !isCreatingNew ? 'bg-stone-100 font-mono text-stone-500' : 'bg-stone-50 focus:bg-white'
                          }`}
                          required={isId}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-stone-200 flex justify-end gap-2.5">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsEditModalOpen(false)}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit" leftIcon={<Check className="w-3.5 h-3.5" />}>
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
