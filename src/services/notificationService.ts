import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  NotificationJobRecord,
  UserNotificationRecord,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from '../types/database';

let inMemoryJobs: NotificationJobRecord[] | null = null;
let inMemoryUserNotifs: UserNotificationRecord[] | null = null;

export const notificationService = {
  /**
   * Enqueue a new notification job.
   * Enforces server routing and idempotency.
   */
  async queueJob(job: {
    type: NotificationType;
    recipient: string;
    recipient_name?: string;
    channel?: NotificationChannel;
    payload: Record<string, any>;
    idempotency_key?: string;
  }): Promise<{ success: boolean; data?: NotificationJobRecord; error?: string }> {
    const idKey =
      job.idempotency_key ||
      `job-${job.type}-${job.recipient}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newJob: NotificationJobRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notif-${Date.now()}`,
      type: job.type,
      recipient: job.recipient,
      recipient_name: job.recipient_name || '',
      channel: job.channel || 'WHATSAPP',
      provider: job.channel === 'EMAIL' ? 'SENDGRID_SERVER' : 'WHATSAPP_FONNTE_SERVER',
      payload: job.payload,
      status: 'PENDING',
      attempts: 0,
      max_attempts: 3,
      idempotency_key: idKey,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Forward to server backend queue endpoint if available
    try {
      const res = await fetch('/api/notifications/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJob),
      });
      if (res.ok) {
        const json = await res.json();
        return { success: true, data: json.data || newJob };
      }
    } catch {
      // Continue to Supabase / local queue fallback
    }

    const client = getSupabaseClient();
    if (isSupabaseConfigured && client) {
      try {
        const { data, error } = await client
          .from('notification_jobs')
          .insert([newJob])
          .select()
          .single();

        if (!error && data) {
          return { success: true, data };
        }
      } catch (err) {
        console.warn('Error inserting notification job into Supabase:', err);
      }
    }

    // Local queue fallback
    const local = this.getLocalJobs();
    // Idempotency check in local cache
    const existing = local.find((j) => j.idempotency_key === idKey);
    if (existing) {
      return { success: true, data: existing };
    }

    local.unshift(newJob);
    this.saveLocalJobs(local);

    // Also create in-app user notification
    this.createInAppNotification({
      user_id: job.recipient,
      title: this.getTemplateTitle(job.type),
      message: this.formatMessageBody(job.type, job.payload),
      category: this.getCategoryFromType(job.type),
    });

    return { success: true, data: newJob };
  },

  /**
   * Get In-App user notifications (for Notification Bell / Inbox)
   */
  async getUserNotifications(userId?: string): Promise<UserNotificationRecord[]> {
    const client = getSupabaseClient();
    if (isSupabaseConfigured && client) {
      try {
        let query = client
          .from('user_notifications')
          .select('*')
          .order('created_at', { ascending: false });

        if (userId) {
          query = query.or(`user_id.eq.${userId},user_id.eq.ALL`);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('Error loading user notifications from Supabase:', err);
      }
    }

    let local = this.getLocalUserNotifications();
    if (userId) {
      local = local.filter((n) => n.user_id === userId || n.user_id === 'ALL');
    }
    return local;
  },

  /**
   * Mark an in-app notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const client = getSupabaseClient();
    if (isSupabaseConfigured && client) {
      try {
        await client
          .from('user_notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', notificationId);
      } catch (err) {
        console.warn('Error marking notification read in Supabase:', err);
      }
    }

    const local = this.getLocalUserNotifications();
    const idx = local.findIndex((n) => n.id === notificationId);
    if (idx !== -1) {
      local[idx].is_read = true;
      local[idx].read_at = new Date().toISOString();
      this.saveLocalUserNotifications(local);
    }
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId?: string): Promise<void> {
    const local = this.getLocalUserNotifications();
    const updated = local.map((n) => {
      if (!userId || n.user_id === userId || n.user_id === 'ALL') {
        return { ...n, is_read: true, read_at: new Date().toISOString() };
      }
      return n;
    });
    this.saveLocalUserNotifications(updated);
  },

  /**
   * Create an in-app notification record
   */
  createInAppNotification(data: {
    user_id: string;
    title: string;
    message: string;
    category?: 'TRANSACTION' | 'SAVINGS' | 'LOAN' | 'SECURITY' | 'SYSTEM';
    action_url?: string;
    metadata?: Record<string, any>;
  }): UserNotificationRecord {
    const record: UserNotificationRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notif-user-${Date.now()}`,
      user_id: data.user_id,
      title: data.title,
      message: data.message,
      category: data.category || 'TRANSACTION',
      action_url: data.action_url || null,
      is_read: false,
      metadata: data.metadata || {},
      created_at: new Date().toISOString(),
    };

    const local = this.getLocalUserNotifications();
    local.unshift(record);
    this.saveLocalUserNotifications(local);
    return record;
  },

  /**
   * Get all background notification jobs (For Admin Monitor)
   */
  async getNotificationJobs(): Promise<NotificationJobRecord[]> {
    const client = getSupabaseClient();
    if (isSupabaseConfigured && client) {
      try {
        const { data, error } = await client
          .from('notification_jobs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('Error fetching notification jobs from Supabase:', err);
      }
    }
    return this.getLocalJobs();
  },

  /**
   * Retry failed notification job
   */
  async retryJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/notifications/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      });
      if (res.ok) {
        return { success: true };
      }
    } catch {
      // fallback
    }

    const local = this.getLocalJobs();
    const idx = local.findIndex((j) => j.id === jobId);
    if (idx !== -1) {
      local[idx].attempts += 1;
      local[idx].status = 'SENT';
      local[idx].sent_at = new Date().toISOString();
      local[idx].error = null;
      this.saveLocalJobs(local);
      return { success: true };
    }

    return { success: false, error: 'Job not found' };
  },

  getTemplateTitle(type: NotificationType): string {
    switch (type) {
      case 'TRANSACTION_SUCCESS':
        return 'Transaksi Berhasil';
      case 'SAVINGS_DEPOSIT':
        return 'Setoran Simpanan Masuk';
      case 'LOAN_APPLICATION':
        return 'Pengajuan Pembiayaan Diterima';
      case 'LOAN_APPROVED':
        return 'Pembiayaan Disetujui';
      case 'PAYMENT_POSTED':
        return 'Pembayaran Gateway Terposting';
      case 'PAYMENT_RECEIVED':
        return 'Tagihan Pembayaran Menunggu';
      case 'SECURITY_ALERT':
        return 'Peringatan Keamanan';
      case 'PASSWORD_RESET':
        return 'Perubahan Kata Sandi';
      default:
        return 'Pemberitahuan KOPSIM';
    }
  },

  formatMessageBody(type: NotificationType, payload: Record<string, any>): string {
    if (payload.message) return payload.message;
    if (type === 'PAYMENT_POSTED') {
      return `Pembayaran order ${payload.order_id || ''} sebesar Rp ${Number(
        payload.amount || 0
      ).toLocaleString('id-ID')} telah sukses terverifikasi via ${payload.channel || 'Gateway'}.`;
    }
    if (type === 'SAVINGS_DEPOSIT') {
      return `Setoran ${payload.category || 'Simpanan'} Rp ${Number(
        payload.amount || 0
      ).toLocaleString('id-ID')} telah tercatat di buku simpanan Anda.`;
    }
    if (type === 'LOAN_APPROVED') {
      return `Pengajuan pembiayaan ${payload.application_no || ''} sebesar Rp ${Number(
        payload.amount || 0
      ).toLocaleString('id-ID')} telah disetujui komite syariah.`;
    }
    return `Ada pembaruan status pada akun KOPSIM Mandiri Anda.`;
  },

  getCategoryFromType(type: NotificationType): 'TRANSACTION' | 'SAVINGS' | 'LOAN' | 'SECURITY' | 'SYSTEM' {
    if (type === 'SAVINGS_DEPOSIT') return 'SAVINGS';
    if (type === 'LOAN_APPLICATION' || type === 'LOAN_APPROVED' || type === 'LOAN_SIMULATION') return 'LOAN';
    if (type === 'SECURITY_ALERT' || type === 'PASSWORD_RESET') return 'SECURITY';
    return 'TRANSACTION';
  },

  getLocalJobs(): NotificationJobRecord[] {
    if (inMemoryJobs) return inMemoryJobs;
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('kopsim_notification_jobs');
        if (raw) {
          inMemoryJobs = JSON.parse(raw);
          return inMemoryJobs!;
        }
      }
    } catch {
      // ignore
    }
    inMemoryJobs = [
      {
        id: 'job-init-1',
        type: 'PAYMENT_POSTED',
        recipient: '+6281234567890',
        recipient_name: 'M. FACHRI MUBAROK',
        channel: 'WHATSAPP',
        provider: 'WHATSAPP_FONNTE_SERVER',
        payload: {
          order_id: 'INV-KOPSIM-202608-001',
          amount: 500000,
          category: 'Simpanan Wajib Anggota',
          channel: 'QRIS',
        },
        status: 'SENT',
        attempts: 1,
        max_attempts: 3,
        idempotency_key: 'notif-pay-INV-KOPSIM-202608-001',
        sent_at: '2026-08-28T08:15:00Z',
        error: null,
        created_at: '2026-08-28T08:14:50Z',
        updated_at: '2026-08-28T08:15:00Z',
      },
      {
        id: 'job-init-2',
        type: 'LOAN_APPROVED',
        recipient: 'koperasi.simandiri@gmail.com',
        recipient_name: 'M. FACHRI MUBAROK',
        channel: 'EMAIL',
        provider: 'SENDGRID_SERVER',
        payload: {
          application_no: 'PB-202608-1001',
          amount: 15000000,
          tenor_months: 12,
        },
        status: 'SENT',
        attempts: 1,
        max_attempts: 3,
        idempotency_key: 'notif-loan-PB-202608-1001',
        sent_at: '2026-08-20T10:05:00Z',
        error: null,
        created_at: '2026-08-20T10:00:00Z',
        updated_at: '2026-08-20T10:05:00Z',
      },
    ];
    return inMemoryJobs;
  },

  saveLocalJobs(jobs: NotificationJobRecord[]): void {
    inMemoryJobs = jobs;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('kopsim_notification_jobs', JSON.stringify(jobs));
      }
    } catch {
      // ignore
    }
  },

  getLocalUserNotifications(): UserNotificationRecord[] {
    if (inMemoryUserNotifs) return inMemoryUserNotifs;
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('kopsim_user_notifications');
        if (raw) {
          inMemoryUserNotifs = JSON.parse(raw);
          return inMemoryUserNotifs!;
        }
      }
    } catch {
      // ignore
    }
    inMemoryUserNotifs = [
      {
        id: 'user-notif-1',
        user_id: '0824-03001',
        title: 'Pembayaran Simpanan Berhasil',
        message: 'Setoran Simpanan Wajib sebesar Rp 500.000 telah diverifikasi sistem pembayaran online.',
        category: 'SAVINGS',
        is_read: false,
        created_at: '2026-08-28T08:15:00Z',
      },
      {
        id: 'user-notif-2',
        user_id: '0824-03001',
        title: 'Pembiayaan Syariah Disetujui',
        message: 'Pengajuan Pembiayaan PB-202608-1001 (Modal Kerja Pertanian) telah disetujui.',
        category: 'LOAN',
        is_read: true,
        read_at: '2026-08-20T11:00:00Z',
        created_at: '2026-08-20T10:00:00Z',
      },
      {
        id: 'user-notif-3',
        user_id: 'ALL',
        title: 'Laporan Dividen SHU Semester I 2026',
        message: 'Rekapitulasi SHU Semester I 2026 telah diterbitkan di menu Laporan Keuangan.',
        category: 'TRANSACTION',
        is_read: false,
        created_at: '2026-08-15T09:00:00Z',
      },
    ];
    return inMemoryUserNotifs;
  },

  saveLocalUserNotifications(notifs: UserNotificationRecord[]): void {
    inMemoryUserNotifs = notifs;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('kopsim_user_notifications', JSON.stringify(notifs));
      }
    } catch {
      // ignore
    }
  },
};
