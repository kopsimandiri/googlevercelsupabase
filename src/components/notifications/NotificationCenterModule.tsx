import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { notificationService } from '../../services/notificationService';
import {
  NotificationJobRecord,
  UserNotificationRecord,
  NotificationStatus,
} from '../../types/database';
import {
  Bell,
  Send,
  RefreshCw,
  CheckCheck,
  AlertTriangle,
  Smartphone,
  Mail,
  ShieldCheck,
  Inbox,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
} from 'lucide-react';

interface NotificationCenterModuleProps {
  isAdminView?: boolean;
}

export const NotificationCenterModule: React.FC<NotificationCenterModuleProps> = ({
  isAdminView = false,
}) => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState<'INBOX' | 'QUEUE_MANAGER'>('INBOX');

  // In-App Notifications State
  const [inboxNotifications, setInboxNotifications] = useState<UserNotificationRecord[]>([]);
  const [inboxCategoryFilter, setInboxCategoryFilter] = useState<string>('ALL');
  const [isLoadingInbox, setIsLoadingInbox] = useState(false);

  // Background Notification Jobs (Admin)
  const [jobs, setJobs] = useState<NotificationJobRecord[]>([]);
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('ALL');
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  // Quick Test Dispatch Modal
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testChannel, setTestChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [testRecipient, setTestRecipient] = useState('+6281234567890');
  const [testMessage, setTestMessage] = useState('Pemberitahuan resmi transaksi koperasi.');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const loadInbox = async () => {
    setIsLoadingInbox(true);
    try {
      const activeUserId = user?.role === 'ANGGOTA' ? (user as any).username || (user as any).member_no || '0824-03001' : undefined;
      const data = await notificationService.getUserNotifications(activeUserId);
      setInboxNotifications(data);
    } catch (err) {
      console.warn('Error loading inbox:', err);
    } finally {
      setIsLoadingInbox(false);
    }
  };

  const loadJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const data = await notificationService.getNotificationJobs();
      setJobs(data);
    } catch (err) {
      console.warn('Error loading jobs:', err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    loadInbox();
    if (user?.role !== 'ANGGOTA') {
      loadJobs();
    }
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setInboxNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead(
      user?.role === 'ANGGOTA' ? (user as any).username || '0824-03001' : undefined
    );
    setInboxNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    showToast('Semua notifikasi ditandai telah dibaca.', 'success');
  };

  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      const res = await notificationService.retryJob(jobId);
      if (res.success) {
        showToast('Notifikasi berhasil diproses ulang!', 'success');
        await loadJobs();
      } else {
        showToast(res.error || 'Gagal memproses ulang.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setRetryingJobId(null);
    }
  };

  const handleSendTestNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingTest(true);
    try {
      const res = await notificationService.queueJob({
        type: 'SYSTEM_NOTICE',
        recipient: testRecipient,
        recipient_name: user?.nama || 'Anggota Koperasi',
        channel: testChannel,
        payload: {
          title: 'Uji Coba Notifikasi KOPSIM',
          message: testMessage,
          timestamp: new Date().toISOString(),
        },
      });

      if (res.success) {
        showToast(`Job notifikasi ${testChannel} berhasil di-enqueue ke server worker!`, 'success');
        setIsTestModalOpen(false);
        await loadJobs();
        await loadInbox();
      }
    } catch (err: any) {
      showToast('Gagal mengirimkan notifikasi.', 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  const filteredInbox = inboxNotifications.filter((n) => {
    if (inboxCategoryFilter === 'ALL') return true;
    return n.category === inboxCategoryFilter;
  });

  const filteredJobs = jobs.filter((j) => {
    if (jobStatusFilter === 'ALL') return true;
    return j.status === jobStatusFilter;
  });

  const unreadCount = inboxNotifications.filter((n) => !n.is_read).length;

  return (
    <div id="notification-center-module" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-700" />
            Pusat Notifikasi & Automasi
            {unreadCount > 0 && (
              <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount} Baru
              </span>
            )}
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Automasi pengiriman pesan multi-channel (WhatsApp, Email & In-App) berbasis event transaksi & keamanan.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('INBOX')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'INBOX' ? 'bg-white text-emerald-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" /> Kotak Masuk
          </button>
          {user?.role !== 'ANGGOTA' && (
            <button
              onClick={() => setActiveTab('QUEUE_MANAGER')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'QUEUE_MANAGER'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Queue Worker (Admin)
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: INBOX NOTIFICATIONS */}
      {activeTab === 'INBOX' && (
        <Card className="p-6 border-stone-200 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInboxCategoryFilter('ALL')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  inboxCategoryFilter === 'ALL'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setInboxCategoryFilter('TRANSACTION')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  inboxCategoryFilter === 'TRANSACTION'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Transaksi
              </button>
              <button
                onClick={() => setInboxCategoryFilter('SAVINGS')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  inboxCategoryFilter === 'SAVINGS'
                    ? 'bg-blue-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Simpanan
              </button>
              <button
                onClick={() => setInboxCategoryFilter('LOAN')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  inboxCategoryFilter === 'LOAN'
                    ? 'bg-amber-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Pembiayaan
              </button>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs text-emerald-800 hover:text-emerald-700"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" /> Tandai Semua Terbaca
              </Button>
            )}
          </div>

          <div className="divide-y divide-stone-100">
            {filteredInbox.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-sm">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Tidak ada notifikasi dalam kotak masuk.
              </div>
            ) : (
              filteredInbox.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                  className={`py-3.5 px-4 rounded-lg transition-colors cursor-pointer flex items-start gap-3 ${
                    notif.is_read ? 'hover:bg-stone-50' : 'bg-emerald-50/40 hover:bg-emerald-50/70 border-l-4 border-emerald-700'
                  }`}
                >
                  <div className="mt-0.5">
                    {notif.category === 'SAVINGS' ? (
                      <div className="p-2 bg-blue-100 text-blue-800 rounded-full">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : notif.category === 'LOAN' ? (
                      <div className="p-2 bg-amber-100 text-amber-800 rounded-full">
                        <Clock className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-2 bg-emerald-100 text-emerald-800 rounded-full">
                        <Bell className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-xs ${notif.is_read ? 'font-medium text-stone-900' : 'font-bold text-emerald-950'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-stone-400 shrink-0">
                        {new Date(notif.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })},{' '}
                        {new Date(notif.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">{notif.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* TAB 2: QUEUE WORKER MONITOR (ADMIN) */}
      {activeTab === 'QUEUE_MANAGER' && (
        <Card className="p-6 border-stone-200 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-800" />
                Notification Background Jobs & Delivery Tracker
              </h3>
              <p className="text-xs text-stone-500">
                Penyedia WhatsApp Server (Fonnte/Cloud API) & Email Server (SendGrid) dengan retry logic dan idempotency.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadJobs}
                isLoading={isLoadingJobs}
                className="text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Queue
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsTestModalOpen(true)}
                className="text-xs bg-emerald-800"
              >
                <Send className="w-3.5 h-3.5 mr-1" /> Uji Kirim Pesan
              </Button>
            </div>
          </div>

          {/* Job status filter */}
          <div className="flex items-center gap-2">
            {['ALL', 'PENDING', 'SENT', 'FAILED'].map((st) => (
              <button
                key={st}
                onClick={() => setJobStatusFilter(st)}
                className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                  jobStatusFilter === st
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {st === 'ALL' ? 'Semua Status' : st}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-stone-200">
              <thead className="bg-stone-50 text-stone-600 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3">Tipe Event</th>
                  <th className="px-4 py-3">Channel / Provider</th>
                  <th className="px-4 py-3">Penerima</th>
                  <th className="px-4 py-3 text-center">Percobaan</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Terkirim Pada</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-stone-900">{job.type}</div>
                      <div className="text-[10px] text-stone-400 font-mono truncate max-w-[150px]">
                        {job.idempotency_key}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-medium text-stone-800">
                        {job.channel === 'WHATSAPP' ? (
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Mail className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        {job.channel}
                      </div>
                      <div className="text-[10px] text-stone-400">{job.provider}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-stone-900">{job.recipient_name || '-'}</div>
                      <div className="text-[11px] text-stone-500 font-mono">{job.recipient}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      {job.attempts} / {job.max_attempts}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {job.status === 'SENT' ? (
                        <Badge variant="success">SENT</Badge>
                      ) : job.status === 'FAILED' ? (
                        <Badge variant="danger">FAILED</Badge>
                      ) : (
                        <Badge variant="warning">PENDING</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-[11px]">
                      {job.sent_at ? new Date(job.sent_at).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {job.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          disabled={retryingJobId === job.id}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-semibold inline-flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TEST DISPATCH MODAL */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title="Uji Kirim Pesan Multi-Channel"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSendTestNotification} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-stone-700 mb-1">Pilih Channel Provider</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTestChannel('WHATSAPP')}
                className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-2 font-medium transition-all ${
                  testChannel === 'WHATSAPP'
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                    : 'border-stone-200 text-stone-600'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-600" /> WhatsApp Server
              </button>
              <button
                type="button"
                onClick={() => setTestChannel('EMAIL')}
                className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-2 font-medium transition-all ${
                  testChannel === 'EMAIL'
                    ? 'border-blue-700 bg-blue-50 text-blue-900'
                    : 'border-stone-200 text-stone-600'
                }`}
              >
                <Mail className="w-4 h-4 text-blue-600" /> Email SendGrid
              </button>
            </div>
          </div>

          <div>
            <label className="block font-medium text-stone-700 mb-1">
              Nomor WhatsApp / Email Penerima
            </label>
            <input
              type="text"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-stone-700 mb-1">Isi Pesan Uji Coba</label>
            <textarea
              rows={3}
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsTestModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSendingTest} className="bg-emerald-800">
              Enqueue ke Worker
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
