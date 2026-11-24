import React, { useEffect, useState } from 'react';
import {
  localMigrationService,
  LegacyLocalScanSummary,
  MigrationExecutionResult,
  MigrationProgress,
} from '../../services/localMigrationService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  Database,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  FileJson,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react';

interface LocalDataMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMigrationComplete?: () => void;
}

export const LocalDataMigrationModal: React.FC<LocalDataMigrationModalProps> = ({
  isOpen,
  onClose,
  onMigrationComplete,
}) => {
  const { role } = useAuth();
  const { showToast } = useNotification();
  const isAdmin = role === 'ADMIN';

  const [scanSummary, setScanSummary] = useState<LegacyLocalScanSummary | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<MigrationExecutionResult | null>(null);
  const [backupDownloaded, setBackupDownloaded] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runScan = async () => {
    setIsScanning(true);
    setErrorMessage(null);
    try {
      const summary = await localMigrationService.scanLegacyBrowserData();
      setScanSummary(summary);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memindai penyimpanan lokal browser.');
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setProgress(null);
      runScan();
    }
  }, [isOpen]);

  const handleExportBackup = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    try {
      const res = await localMigrationService.exportLocalBackupJson(scanSummary || undefined);
      setBackupDownloaded(true);
      showToast(`Cadangan JSON "${res.filename}" berhasil diunduh (${res.totalRecords} record).`, 'success');
    } catch (err: any) {
      const msg = err?.message || 'Gagal mengekspor cadangan JSON.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleMigrateToServer = async () => {
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya Admin yang diizinkan menjalankan migrasi ke server.', 'error');
      return;
    }

    setIsMigrating(true);
    setErrorMessage(null);
    setResult(null);
    setProgress({
      step: 'MULAI',
      current: 0,
      total: Math.max(scanSummary?.totalRecords || 1, 1),
      percent: 0,
      message: 'Memulai proses migrasi ke server Supabase...',
    });

    try {
      const execResult = await localMigrationService.migrateLocalDataToSupabase((p) => {
        setProgress(p);
      });
      setResult(execResult);

      if (execResult.success) {
        showToast(
          `Migrasi selesai: ${execResult.inserted} data baru, ${execResult.uploadedProofs} lampiran terunggah ke Supabase Storage.`,
          'success'
        );
        if (onMigrationComplete) onMigrationComplete();
      } else {
        setErrorMessage(execResult.errors[0] || 'Sebagian data gagal dimigrasikan.');
        showToast('Migrasi selesai dengan beberapa catatan kendala.', 'warning');
      }
    } catch (err: any) {
      const msg = err?.message || 'Terjadi kesalahan saat migrasi data ke Supabase.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleClearLegacyCache = async () => {
    const removedCount = localMigrationService.clearLegacyLocalBrowserData();
    showToast(`${removedCount} kunci penyimpanan lokal lama berhasil dibersihkan dari browser ini.`, 'info');
    await runScan();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isMigrating) onClose();
      }}
      title="Migrasi Data Lokal ke Server & Cadangan JSON"
      subtitle="Alat khusus Admin untuk memindahkan sisa data lama di browser ke database PostgreSQL & Storage 'bukti-transfer'"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportBackup}
            isLoading={isExporting}
            disabled={isMigrating}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Ekspor Cadangan (JSON)
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleMigrateToServer}
                isLoading={isMigrating}
                disabled={isScanning || (!scanSummary?.hasAnyData && !isMigrating)}
                leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
              >
                Migrasi Data Lokal ke Server
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose} disabled={isMigrating}>
              Tutup
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {!isAdmin && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-900">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>Fitur migrasi hanya dapat dijalankan oleh akun Administrator (ADMIN).</span>
          </div>
        )}

        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-950">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Langkah Pengaman Sebelum Migrasi:</p>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              1. Klik <strong>Ekspor Cadangan (JSON)</strong> terlebih dahulu sebagai salinan pengaman lokal.
              2. Klik <strong>Migrasi Data Lokal ke Server</strong> untuk mengunggah seluruh foto/lampiran base64 lama ke bucket{' '}
              <code className="bg-white px-1 py-0.5 rounded border border-emerald-200 font-mono">bukti-transfer</code>{' '}
              dan menyimpan data tanpa duplikat ke Supabase.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Terjadi Kendala:</p>
              <p className="text-[11px]">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Hasil Scan Penyimpanan Browser */}
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary-800" />
              <span className="font-bold text-stone-900">Hasil Pemindaian Penyimpanan Lokal Browser</span>
            </div>
            <button
              type="button"
              onClick={runScan}
              disabled={isScanning || isMigrating}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-800 hover:text-primary-950"
            >
              <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
              <span>Pindai Ulang</span>
            </button>
          </div>

          {isScanning ? (
            <div className="py-4 text-center text-stone-500">Memindai localStorage & IndexedDB browser...</div>
          ) : scanSummary ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">Transaksi Kas</span>
                  <span className="text-base font-bold text-stone-900 font-mono">
                    {scanSummary.counts.transactions}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">Data Anggota</span>
                  <span className="text-base font-bold text-stone-900 font-mono">
                    {scanSummary.counts.members}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">Investasi & Lainnya</span>
                  <span className="text-base font-bold text-stone-900 font-mono">
                    {scanSummary.counts.investments +
                      scanSummary.counts.loans +
                      scanSummary.counts.payments +
                      scanSummary.counts.news +
                      scanSummary.counts.projectUpdates +
                      scanSummary.counts.notifications}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                  <span className="text-[10px] text-stone-500 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-amber-600" /> File Base64 Lokal
                  </span>
                  <span className="text-base font-bold text-amber-700 font-mono">
                    {scanSummary.totalAttachments}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-600">
                <span>
                  Status Cadangan JSON:{' '}
                  {backupDownloaded ? (
                    <Badge variant="success" size="sm">Sudah Diunduh</Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">Belum Diunduh</Badge>
                  )}
                </span>
                {!scanSummary.hasAnyData && (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Penyimpanan browser sudah bersih (0 data lama)
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Progres Migrasi */}
        {progress && (
          <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900">
                Tahap: <span className="font-mono text-primary-900">{progress.step}</span>
              </span>
              <span className="font-mono font-bold text-emerald-700">
                {progress.percent}% ({progress.current}/{progress.total})
              </span>
            </div>
            <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-[11px] text-stone-600">{progress.message}</p>
          </div>
        )}

        {/* Hasil Eksekusi Migrasi */}
        {result && (
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              result.failed === 0
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-amber-50/70 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <FileJson className="w-4 h-4 text-emerald-700" />
                Ringkasan Hasil Migrasi
              </span>
              <Badge variant={result.failed === 0 ? 'success' : 'warning'} size="sm">
                {result.failed === 0 ? 'Sukses 100%' : `${result.failed} Kendala`}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 bg-white rounded-lg border border-stone-200">
                <span className="text-[10px] text-stone-500 block">Data Berhasil</span>
                <span className="text-sm font-bold text-emerald-700 font-mono">
                  {result.inserted + result.updated}
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-stone-200">
                <span className="text-[10px] text-stone-500 block">Lampiran Storage</span>
                <span className="text-sm font-bold text-blue-700 font-mono">
                  {result.uploadedProofs}
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-stone-200">
                <span className="text-[10px] text-stone-500 block">Duplikat Dilewati</span>
                <span className="text-sm font-bold text-stone-700 font-mono">
                  {result.skippedDuplicates}
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-stone-200">
                <span className="text-[10px] text-stone-500 block">Gagal</span>
                <span className="text-sm font-bold text-rose-700 font-mono">{result.failed}</span>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="p-2.5 bg-white rounded-lg border border-rose-200 max-h-28 overflow-y-auto space-y-1">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-[10px] text-rose-700 font-mono">
                    • {err}
                  </p>
                ))}
              </div>
            )}

            {isAdmin && scanSummary?.hasAnyData && (
              <div className="pt-1 flex justify-end">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleClearLegacyCache}
                  leftIcon={<Trash2 className="w-3 h-3 text-rose-600" />}
                >
                  Bersihkan Sisa Cache Lokal Browser Ini
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
