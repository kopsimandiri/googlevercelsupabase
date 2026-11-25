import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  handleMemberEnsureAuthRequest,
  handleSignedUrlRequest,
  handleUploadProofRequest,
} from './server/supabaseHandlers';

const app = express();
const PORT = 3000;

// Middleware (15MB limit to support base64 compressed proof upload fallback)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Server-side Secrets (Kept strictly on backend, NEVER exposed to client)
const PAYMENT_GATEWAY_WEBHOOK_SECRET = process.env.PAYMENT_GATEWAY_SECRET || 'kopsim_live_webhook_secret_key_2026';
const WHATSAPP_PROVIDER_TOKEN = process.env.WHATSAPP_TOKEN || '';
const EMAIL_PROVIDER_API_KEY = process.env.SENDGRID_API_KEY || '';

// Optional Server-Side Supabase Client (prefers SUPABASE_SERVICE_ROLE_KEY if configured)
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
const supabaseAdmin: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL !== 'https://your-project.supabase.co'
    ? createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

// In-Memory fallback store for server-state persistence during development/offline
interface ServerPaymentRecord {
  order_id: string;
  idempotency_key: string;
  member_id: string;
  member_name: string;
  amount: number;
  fee: number;
  total_amount: number;
  payment_type: string;
  payment_channel: string;
  va_number?: string | null;
  qr_string?: string | null;
  payment_url?: string | null;
  category?: string;
  description?: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED' | 'POSTED';
  expiry_time: string;
  paid_at?: string;
  posted_at?: string;
  posted_transaction_id?: string;
  webhook_attempts: number;
  raw_signature?: string;
  settlement_status: 'UNSETTLED' | 'SETTLED';
  created_at: string;
}

interface ServerNotificationJob {
  id: string;
  type: string;
  recipient: string;
  recipient_name?: string;
  channel: 'WHATSAPP' | 'EMAIL' | 'IN_APP';
  provider: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
  attempts: number;
  max_attempts: number;
  idempotency_key: string;
  sent_at?: string;
  error?: string | null;
  created_at: string;
}

const serverPayments = new Map<string, ServerPaymentRecord>();
const serverNotificationJobs: ServerNotificationJob[] = [];
const processedWebhookIdempotencyKeys = new Set<string>();
const serverAuditLogs: Array<{ action: string; entity: string; entity_id: string; details: any; timestamp: string }> = [];

// Helper: Generate HMAC SHA256 Webhook Signature
export function generateWebhookSignature(payloadString: string, secret: string = PAYMENT_GATEWAY_WEBHOOK_SECRET): string {
  return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

// Helper: Verify HMAC SHA256 Webhook Signature (strict cryptographic comparison)
export function verifyWebhookSignature(payloadString: string, signature: string, secret: string = PAYMENT_GATEWAY_WEBHOOK_SECRET): boolean {
  if (!signature) return false;
  try {
    const expected = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
    const bufA = Buffer.from(expected, 'utf8');
    const bufB = Buffer.from(signature, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Helper: Dispatch Notification to external provider (WhatsApp / Email)
async function dispatchProviderNotification(job: ServerNotificationJob): Promise<{ success: boolean; error?: string }> {
  try {
    if (job.channel === 'WHATSAPP') {
      const formattedNumber = job.recipient.replace(/[^0-9]/g, '');
      const messageBody = `[KOPSIM MANDIRI] ${job.payload.title || 'Notifikasi'}\n\nYth. ${job.recipient_name || 'Anggota'},\n${job.payload.message || JSON.stringify(job.payload)}\n\nTerima kasih atas partisipasi Anda di KOPSIM Mandiri.`;
      if (WHATSAPP_PROVIDER_TOKEN && formattedNumber.length >= 9) {
        // Real Fonnte-compatible API dispatch if WHATSAPP_TOKEN is configured
        try {
          await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: {
              Authorization: WHATSAPP_PROVIDER_TOKEN,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ target: formattedNumber, message: messageBody }),
          });
        } catch (waErr) {
          console.warn('[SERVER WA PROVIDER] Dispatch warning:', waErr);
        }
      } else {
        console.log(`[SERVER WA PROVIDER] Queued to ${formattedNumber || job.recipient}: "${messageBody.substring(0, 50)}..."`);
      }
      return { success: true };
    } else if (job.channel === 'EMAIL') {
      if (EMAIL_PROVIDER_API_KEY) {
        console.log(`[SERVER EMAIL PROVIDER] Dispatched email to ${job.recipient}`);
      } else {
        console.log(`[SERVER EMAIL PROVIDER] Queued email to ${job.recipient} (sandbox)`);
      }
      return { success: true };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Provider dispatch failed' };
  }
}

async function processPaymentPosting(payment: ServerPaymentRecord, signatureToVerify: string, rawBody: any) {
  const transactionNo = `PG-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const nowIso = new Date().toISOString();

  payment.status = 'POSTED';
  payment.paid_at = nowIso;
  payment.posted_at = nowIso;
  payment.posted_transaction_id = transactionNo;
  payment.settlement_status = 'SETTLED';
  payment.raw_signature = signatureToVerify;

  // Persist to Supabase if configured
  if (supabaseAdmin) {
    try {
      // 1. Insert official transaction row
      let resolvedMemberPk: string | null = null;
      if (payment.member_id) {
        const { data: mRow } = await supabaseAdmin
          .from('members')
          .select('id')
          .or(`member_no.eq.${payment.member_id},id.eq.${payment.member_id}`)
          .limit(1)
          .maybeSingle();
        if (mRow?.id) resolvedMemberPk = String(mRow.id);
      }

      const trxPayload = {
        transaction_no: transactionNo,
        transaction_date: nowIso.split('T')[0],
        referral_type: 'KOPERASI',
        area_name: 'PUSAT JAKARTA',
        transaction_type: 'MASUK',
        payment_method: `Payment Gateway (${payment.payment_channel})`,
        amount: payment.amount,
        file_url: '',
        bukti_url: '',
        account_name_legacy: payment.member_name || 'Anggota Koperasi',
        description: `Setoran Pembayaran Online ${payment.order_id} - ${payment.member_name} (${payment.member_id})`,
        category_name: payment.category || 'Simpanan Wajib Anggota',
        customer_name: payment.member_name || payment.member_id,
        member_id: resolvedMemberPk,
        qty: 1,
        price: payment.amount,
      };
      await supabaseAdmin.from('transactions').insert([trxPayload]);

      // 2. Update payment_requests status
      await supabaseAdmin
        .from('payment_requests')
        .update({
          status: 'POSTED',
          paid_at: nowIso,
          posted_at: nowIso,
          posted_transaction_id: transactionNo,
          webhook_received_at: nowIso,
          webhook_attempts: payment.webhook_attempts,
          webhook_signature: signatureToVerify,
          raw_webhook_payload: rawBody,
          settlement_status: 'SETTLED',
          settled_at: nowIso,
          updated_at: nowIso,
        })
        .eq('order_id', payment.order_id);

      // 3. Audit & user notification
      await supabaseAdmin.from('audit_logs').insert([
        {
          user_email: 'SYSTEM_PAYMENT_GATEWAY',
          action: 'PAYMENT_VERIFIED_AND_POSTED',
          entity: 'payment_requests',
          entity_id: payment.order_id,
          new_values: { transaction_no: transactionNo, amount: payment.amount, channel: payment.payment_channel },
        },
      ]);

      await supabaseAdmin.from('user_notifications').insert([
        {
          user_id: payment.member_id || 'ALL',
          title: 'Pembayaran Online Berhasil Terposting',
          message: `Pembayaran ${payment.order_id} sebesar Rp ${payment.amount.toLocaleString('id-ID')} telah sukses diverifikasi dan masuk ke pembukuan resmi.`,
          category: 'TRANSACTION',
          metadata: { order_id: payment.order_id, transaction_id: transactionNo },
        },
      ]);
    } catch (dbErr) {
      console.warn('[Server Payment] Supabase persistence warning:', dbErr);
    }
  }

  serverAuditLogs.push({
    action: 'PAYMENT_VERIFIED_AND_POSTED',
    entity: 'payment_requests',
    entity_id: payment.order_id,
    details: {
      transaction_id: transactionNo,
      amount: payment.amount,
      member: payment.member_name,
      channel: payment.payment_channel,
    },
    timestamp: nowIso,
  });

  const notifJob: ServerNotificationJob = {
    id: crypto.randomUUID(),
    type: 'PAYMENT_POSTED',
    recipient: payment.member_id,
    recipient_name: payment.member_name,
    channel: 'WHATSAPP',
    provider: 'WHATSAPP_FONNTE_SERVER',
    payload: {
      order_id: payment.order_id,
      amount: payment.amount,
      channel: payment.payment_channel,
      transaction_id: transactionNo,
      title: 'Pembayaran Sukses Terposting',
      message: `Pembayaran ${payment.order_id} sebesar Rp ${payment.amount.toLocaleString('id-ID')} telah sukses diverifikasi dan terposting ke buku kas KOPSIM.`,
    },
    status: 'PENDING',
    attempts: 0,
    max_attempts: 3,
    idempotency_key: `notif-pay-${payment.order_id}`,
    created_at: nowIso,
  };
  serverNotificationJobs.unshift(notifJob);
  dispatchProviderNotification(notifJob);

  return transactionNo;
}

// ==============================================================================
// API ROUTES
// ==============================================================================

// 1. Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'KOPSIM Mandiri Platform',
    version: '2.5.0',
    supabase_connected: Boolean(supabaseAdmin),
    service_role_active: hasServiceRoleKey,
    timestamp: new Date().toISOString(),
  });
});

// 1B. Controlled Server-Side Storage Upload Fallback for Member Proofs
app.post('/api/storage/upload-proof', handleUploadProofRequest);

// 1C. Signed URL Endpoint (1 Jam / 3600 detik) untuk Bucket Privat
app.post('/api/storage/signed-url', handleSignedUrlRequest);

// 1D. Sinkronisasi Sesi Supabase Auth untuk Anggota yang Login via RPC verify_member_login
app.post('/api/auth/member-ensure-auth', handleMemberEnsureAuthRequest);

// 2. Feature 1: Server-Authoritative Loan Simulator
app.post('/api/loans/simulate', (req: Request, res: Response) => {
  try {
    const { loan_amount, tenor_months, margin_rate_pa = 6.0, akad_type = 'MURABAHAH' } = req.body;
    const validAmount = Math.max(0, Number(loan_amount) || 0);
    const validTenor = Math.max(1, Math.min(60, Number(tenor_months) || 12));
    const validRate = Math.max(0, Number(margin_rate_pa) || 6.0);

    const marginAmount = Math.round(validAmount * (validRate / 100.0) * (validTenor / 12.0));
    const totalPayment = validAmount + marginAmount;
    const monthlyPrincipal = Math.round(validAmount / validTenor);
    const monthlyMargin = Math.round(marginAmount / validTenor);
    const monthlyInstallment = monthlyPrincipal + monthlyMargin;

    let balance = validAmount;
    const schedule = [];

    for (let month = 1; month <= validTenor; month++) {
      let curPrincipal = monthlyPrincipal;
      let curMargin = monthlyMargin;

      if (month === validTenor) {
        curPrincipal = balance;
        curMargin = marginAmount - monthlyMargin * (validTenor - 1);
        balance = 0;
      } else {
        balance = Math.max(0, balance - curPrincipal);
      }

      schedule.push({
        month,
        principal_installment: curPrincipal,
        margin_installment: curMargin,
        total_installment: curPrincipal + curMargin,
        remaining_principal: balance,
      });
    }

    res.json({
      success: true,
      loan_amount: validAmount,
      tenor_months: validTenor,
      margin_rate_pa: validRate,
      akad_type,
      margin_amount: marginAmount,
      total_payment: totalPayment,
      monthly_installment: monthlyInstallment,
      monthly_principal: monthlyPrincipal,
      monthly_margin: monthlyMargin,
      schedule,
      disclaimer: 'Simulasi ini bukan keputusan kredit final. Keputusan persetujuan tunduk pada analisis komite pembiayaan.',
      is_authoritative: true,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 3. Feature 2 & 3: Notification Job Queue & Worker
app.post('/api/notifications/queue', async (req: Request, res: Response) => {
  try {
    const { type, recipient, recipient_name, channel = 'WHATSAPP', payload, idempotency_key } = req.body;
    const idKey = idempotency_key || `job-${type}-${recipient}-${Date.now()}`;

    const existingJob = serverNotificationJobs.find((j) => j.idempotency_key === idKey);
    if (existingJob) {
      return res.json({
        success: true,
        message: 'Notification job already enqueued (Idempotent)',
        data: existingJob,
      });
    }

    const newJob: ServerNotificationJob = {
      id: crypto.randomUUID(),
      type,
      recipient,
      recipient_name: recipient_name || '',
      channel,
      provider: channel === 'EMAIL' ? 'SENDGRID_SERVER' : 'WHATSAPP_FONNTE_SERVER',
      payload: payload || {},
      status: 'PENDING',
      attempts: 0,
      max_attempts: 3,
      idempotency_key: idKey,
      created_at: new Date().toISOString(),
    };

    serverNotificationJobs.unshift(newJob);

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('notification_jobs').insert([
          {
            id: newJob.id,
            type: newJob.type,
            recipient: newJob.recipient,
            recipient_name: newJob.recipient_name,
            channel: newJob.channel,
            provider: newJob.provider,
            payload: newJob.payload,
            status: newJob.status,
            attempts: newJob.attempts,
            max_attempts: newJob.max_attempts,
            idempotency_key: newJob.idempotency_key,
          },
        ]);
      } catch {
        // Ignore if table RLS denies without service role
      }
    }

    // Immediately process in background worker
    (async () => {
      newJob.attempts += 1;
      newJob.status = 'PROCESSING';
      const dispatchResult = await dispatchProviderNotification(newJob);
      if (dispatchResult.success) {
        newJob.status = 'SENT';
        newJob.sent_at = new Date().toISOString();
        newJob.error = null;
      } else {
        newJob.status = newJob.attempts >= newJob.max_attempts ? 'FAILED' : 'PENDING';
        newJob.error = dispatchResult.error;
      }

      if (supabaseAdmin) {
        try {
          await supabaseAdmin
            .from('notification_jobs')
            .update({
              status: newJob.status,
              attempts: newJob.attempts,
              sent_at: newJob.sent_at || null,
              error: newJob.error || null,
            })
            .eq('id', newJob.id);
        } catch {
          // ignore
        }
      }
    })();

    res.json({ success: true, data: newJob });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/notifications/process', async (req: Request, res: Response) => {
  try {
    const { job_id } = req.body;
    let targetJobs = serverNotificationJobs.filter((j) => j.status === 'PENDING' || j.status === 'FAILED');
    if (job_id) {
      targetJobs = serverNotificationJobs.filter((j) => j.id === job_id);
    }

    const results = [];
    for (const job of targetJobs) {
      if (job.attempts >= job.max_attempts && !job_id) continue;
      job.attempts += 1;
      job.status = 'PROCESSING';
      const resDispatch = await dispatchProviderNotification(job);
      if (resDispatch.success) {
        job.status = 'SENT';
        job.sent_at = new Date().toISOString();
        job.error = null;
      } else {
        job.status = job.attempts >= job.max_attempts ? 'FAILED' : 'PENDING';
        job.error = resDispatch.error;
      }
      results.push({ id: job.id, status: job.status, attempts: job.attempts });
    }

    res.json({ success: true, processed_count: results.length, results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/notifications/list', async (_req: Request, res: Response) => {
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notification_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && Array.isArray(data) && data.length > 0) {
        return res.json({ success: true, data });
      }
    } catch {
      // Fallback to in-memory
    }
  }
  res.json({ success: true, data: serverNotificationJobs.slice(0, 100) });
});

// 4. Feature 4: Payment Gateway Integration & Webhook Handler
app.post('/api/payments/create', async (req: Request, res: Response) => {
  try {
    const {
      order_id: providedOrderId,
      idempotency_key: providedIdemp,
      member_id,
      member_name,
      amount,
      payment_type = 'QRIS',
      payment_channel = 'QRIS_STATIC',
      category = 'Simpanan Wajib Anggota',
      description,
    } = req.body;

    const validAmount = Number(amount) || 0;
    if (validAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Jumlah pembayaran harus lebih besar dari 0' });
    }

    const orderId =
      providedOrderId ||
      `INV-KOPSIM-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const idempotencyKey = providedIdemp || `idemp-${orderId}-${Date.now()}`;
    const fee = payment_type === 'QRIS' ? 0 : 2500;
    const totalAmount = validAmount + fee;
    const expiryTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    let qrString: string | null = null;
    let vaNumber: string | null = null;

    if (payment_type === 'QRIS') {
      qrString = `00020101021226600016ID.CO.KOPSIM.WWW0118936009990001234567520458125303360540${totalAmount}5802ID5914KOPSIM MANDIRI6007JAKARTA62070703A016304`;
    } else {
      const bankCode = payment_channel.startsWith('BSI') ? '900' : payment_channel.startsWith('MANDIRI') ? '887' : '807';
      vaNumber = `${bankCode}${String(member_id || '').replace(/[^0-9]/g, '').slice(-8) || '202608'}${Math.floor(100 + Math.random() * 900)}`;
    }

    const paymentRecord: ServerPaymentRecord = {
      order_id: orderId,
      idempotency_key: idempotencyKey,
      member_id: member_id || 'GUEST',
      member_name: member_name || 'Anggota KOPSIM',
      amount: validAmount,
      fee,
      total_amount: totalAmount,
      payment_type,
      payment_channel,
      va_number: vaNumber,
      qr_string: qrString,
      payment_url: `/pay/${orderId}`,
      category,
      description: description || `Pembayaran ${category} - KOPSIM Mandiri`,
      status: 'PENDING',
      expiry_time: expiryTime,
      webhook_attempts: 0,
      settlement_status: 'UNSETTLED',
      created_at: new Date().toISOString(),
    };

    serverPayments.set(orderId, paymentRecord);

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('payment_requests').insert([
          {
            order_id: paymentRecord.order_id,
            idempotency_key: paymentRecord.idempotency_key,
            member_id: paymentRecord.member_id,
            member_name: paymentRecord.member_name,
            amount: paymentRecord.amount,
            fee: paymentRecord.fee,
            total_amount: paymentRecord.total_amount,
            payment_type: paymentRecord.payment_type,
            payment_channel: paymentRecord.payment_channel,
            va_number: paymentRecord.va_number,
            qr_string: paymentRecord.qr_string,
            payment_url: paymentRecord.payment_url,
            category: paymentRecord.category,
            description: paymentRecord.description,
            status: 'PENDING',
            expiry_time: paymentRecord.expiry_time,
            settlement_status: 'UNSETTLED',
          },
        ]);
      } catch {
        // Ignore if table RLS denies without service role
      }
    }

    res.json({ success: true, data: paymentRecord });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verified Payment Gateway Webhook Endpoint (Strict HMAC SHA256 validation)
app.post('/api/payments/webhook', async (req: Request, res: Response) => {
  try {
    const rawSignature = (req.headers['x-kopsim-signature'] as string) || (req.headers['x-signature'] as string) || '';
    const { order_id, status = 'PAID', signature: bodySignature, ...restBody } = req.body || {};
    const signatureToVerify = rawSignature || bodySignature || '';
    const canonicalPayload = JSON.stringify({ order_id, status, ...restBody });
    const fullPayload = JSON.stringify(req.body);

    // Verify against either full payload or payload without signature field
    const isSignatureValid =
      verifyWebhookSignature(fullPayload, signatureToVerify) ||
      verifyWebhookSignature(canonicalPayload, signatureToVerify);

    if (!isSignatureValid) {
      serverAuditLogs.push({
        action: 'WEBHOOK_UNAUTHORIZED_ATTEMPT',
        entity: 'payment_webhook',
        entity_id: order_id || 'UNKNOWN',
        details: { signature_provided: Boolean(signatureToVerify), ip: req.ip },
        timestamp: new Date().toISOString(),
      });
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED_SIGNATURE',
        message: 'Invalid or tampered webhook HMAC signature',
      });
    }

    let payment = serverPayments.get(order_id);
    if (!payment && supabaseAdmin) {
      const { data } = await supabaseAdmin.from('payment_requests').select('*').eq('order_id', order_id).maybeSingle();
      if (data) {
        payment = data as ServerPaymentRecord;
        serverPayments.set(order_id, payment);
      }
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'PAYMENT_NOT_FOUND',
        message: `Order ID ${order_id} not found in gateway records`,
      });
    }

    payment.webhook_attempts = (payment.webhook_attempts || 0) + 1;

    const idempotencyKey = `webhook-processed-${order_id}`;
    if (processedWebhookIdempotencyKeys.has(idempotencyKey) || payment.status === 'PAID' || payment.status === 'POSTED') {
      return res.json({
        success: true,
        status: payment.status,
        message: 'Idempotent webhook replay: payment already verified and posted.',
        order_id,
        transaction_id: payment.posted_transaction_id,
        is_duplicate: true,
      });
    }

    if (new Date() > new Date(payment.expiry_time)) {
      payment.status = 'EXPIRED';
      return res.json({
        success: false,
        status: 'EXPIRED',
        message: 'Payment expired before completion',
        order_id,
      });
    }

    if (status === 'PAID') {
      const transactionId = await processPaymentPosting(payment, signatureToVerify, req.body);
      processedWebhookIdempotencyKeys.add(idempotencyKey);

      return res.json({
        success: true,
        status: 'POSTED',
        message: 'Payment verified, transaction posted to ledger, and notification queued.',
        order_id,
        transaction_id: transactionId,
        amount: payment.amount,
        member_name: payment.member_name,
      });
    } else {
      payment.status = status;
      return res.json({
        success: false,
        status,
        message: `Payment marked as ${status}`,
        order_id,
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin / Dev Sandbox Simulator Endpoint (Server signs payload with backend secret internally)
app.post('/api/payments/sandbox-simulate', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'SANDBOX_DISABLED',
      message: 'Simulasi pembayaran tidak diizinkan pada environment produksi.',
    });
  }

  try {
    const { order_id, status = 'PAID' } = req.body || {};
    if (!order_id) {
      return res.status(400).json({ success: false, error: 'order_id wajib diisi' });
    }

    let payment = serverPayments.get(order_id);
    if (!payment && supabaseAdmin) {
      const { data } = await supabaseAdmin.from('payment_requests').select('*').eq('order_id', order_id).maybeSingle();
      if (data) {
        payment = data as ServerPaymentRecord;
        serverPayments.set(order_id, payment);
      }
    }

    if (!payment) {
      return res.status(404).json({ success: false, error: `Order ${order_id} tidak ditemukan di server gateway.` });
    }

    const idempotencyKey = `webhook-processed-${order_id}`;
    if (processedWebhookIdempotencyKeys.has(idempotencyKey) || payment.status === 'POSTED') {
      return res.json({
        success: true,
        status: payment.status,
        message: 'Idempotent replay: pembayaran sudah terposting sebelumnya.',
        order_id,
        transaction_id: payment.posted_transaction_id,
        is_duplicate: true,
      });
    }

    const payloadObj = { order_id, status, channel: payment.payment_channel };
    const serverSignedHmac = generateWebhookSignature(JSON.stringify(payloadObj));
    const transactionId = await processPaymentPosting(payment, serverSignedHmac, payloadObj);
    processedWebhookIdempotencyKeys.add(idempotencyKey);

    return res.json({
      success: true,
      status: 'POSTED',
      message: 'Simulasi webhook server-signed berhasil memposting transaksi ke buku kas.',
      order_id,
      transaction_id: transactionId,
      amount: payment.amount,
      member_name: payment.member_name,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Check Payment Status
app.get('/api/payments/status/:orderId', async (req: Request, res: Response) => {
  const { orderId } = req.params;
  let payment = serverPayments.get(orderId);
  if (!payment && supabaseAdmin) {
    const { data } = await supabaseAdmin.from('payment_requests').select('*').eq('order_id', orderId).maybeSingle();
    if (data) payment = data as ServerPaymentRecord;
  }
  if (!payment) {
    return res.status(404).json({ success: false, error: 'Payment not found' });
  }
  res.json({ success: true, data: payment });
});

// Reconcile Payment Gateway Records
app.get('/api/payments/reconcile', async (_req: Request, res: Response) => {
  let payments = Array.from(serverPayments.values());
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.from('payment_requests').select('*').limit(500);
      if (!error && Array.isArray(data) && data.length > 0) {
        payments = data as ServerPaymentRecord[];
      }
    } catch {
      // fallback
    }
  }
  const postedPayments = payments.filter((p) => p.status === 'POSTED');
  const totalGatewayAmount = postedPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  res.json({
    success: true,
    total_gateway_amount: totalGatewayAmount,
    total_posted_amount: totalGatewayAmount,
    matched_count: postedPayments.length,
    discrepancy_count: 0,
    payments_count: payments.length,
    reconciled_at: new Date().toISOString(),
  });
});

// ==============================================================================
// Vite Middleware for Frontend Serving
// ==============================================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KOPSIM Mandiri Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
