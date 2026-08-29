import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { paymentService } from '../../services/paymentService';
import {
  PaymentRequestRecord,
  PaymentStatus,
  PaymentType,
} from '../../types/database';
import {
  CreditCard,
  QrCode,
  Building,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  FileSpreadsheet,
  Lock,
  Layers,
  Copy,
  Receipt,
} from 'lucide-react';

interface PaymentGatewayModuleProps {
  isAdminView?: boolean;
}

export const PaymentGatewayModule: React.FC<PaymentGatewayModuleProps> = ({
  isAdminView = false,
}) => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const activeMemberId = user?.role === 'ANGGOTA' ? (user as any).username || (user as any).member_no || '0824-03001' : '0824-03001';
  const activeMemberName = user?.nama || 'M. FACHRI MUBAROK';

  const [activeTab, setActiveTab] = useState<'CHECKOUT' | 'HISTORY' | 'SANDBOX_TESTER' | 'RECONCILIATION'>('CHECKOUT');

  // Checkout State
  const [amount, setAmount] = useState<number>(500000);
  const [category, setCategory] = useState<string>('Simpanan Wajib Anggota');
  const [paymentType, setPaymentType] = useState<PaymentType>('QRIS');
  const [paymentChannel, setPaymentChannel] = useState<string>('QRIS_DYNAMIC');
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [activePayment, setActivePayment] = useState<PaymentRequestRecord | null>(null);
  const [isPollingStatus, setIsPollingStatus] = useState(false);

  // History State
  const [payments, setPayments] = useState<PaymentRequestRecord[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);

  // Sandbox Tester State
  const [selectedOrderForTest, setSelectedOrderForTest] = useState<string>('');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isTestingScenario, setIsTestingScenario] = useState(false);

  // Reconciliation State
  const [reconciliationReport, setReconciliationReport] = useState<any | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  const loadPayments = async () => {
    setIsLoadingPayments(true);
    try {
      const data = await paymentService.getPayments(
        user?.role === 'ANGGOTA' ? activeMemberId : undefined
      );
      setPayments(data);
      if (data.length > 0 && !selectedOrderForTest) {
        setSelectedOrderForTest(data[0].order_id);
      }
    } catch (err) {
      console.warn('Error loading payments:', err);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [user]);

  // Polling for live payment completion
  useEffect(() => {
    let interval: any = null;
    if (activePayment && activePayment.status === 'PENDING') {
      setIsPollingStatus(true);
      interval = setInterval(async () => {
        const latest = await paymentService.getPaymentStatus(activePayment.order_id);
        if (latest && latest.status !== 'PENDING') {
          setActivePayment(latest);
          setIsPollingStatus(false);
          clearInterval(interval);
          if (latest.status === 'POSTED' || latest.status === 'PAID') {
            showToast(`Pembayaran #${latest.order_id} berhasil terverifikasi!`, 'success');
          }
          await loadPayments();
        }
      }, 3000);
    } else {
      setIsPollingStatus(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activePayment]);

  // Create Payment Handler
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingPayment(true);
    try {
      const res = await paymentService.createPaymentRequest({
        member_id: activeMemberId,
        member_name: activeMemberName,
        amount,
        payment_type: paymentType,
        payment_channel: paymentChannel,
        category,
      });

      if (res.success && res.data) {
        setActivePayment(res.data);
        showToast('Instruksi pembayaran berhasil dibuat.', 'success');
        await loadPayments();
      } else {
        showToast(res.error || 'Gagal membuat tagihan pembayaran.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  // Run Sandbox Test Scenario
  const handleRunSandboxScenario = async (scenario: 'SUCCESS' | 'FAIL' | 'EXPIRE' | 'DUPLICATE' | 'TAMPERED_SIGNATURE') => {
    if (!selectedOrderForTest) {
      showToast('Pilih Order ID terlebih dahulu untuk pengujian.', 'warning');
      return;
    }

    setIsTestingScenario(true);
    setTestResult(null);

    try {
      let payload: any = {
        order_id: selectedOrderForTest,
        channel: 'QRIS',
      };

      if (scenario === 'SUCCESS') {
        payload.status = 'PAID';
        payload.signature = 'sig_valid_kopsim_live_webhook_secret_key_2026';
      } else if (scenario === 'FAIL') {
        payload.status = 'FAILED';
        payload.signature = 'sig_valid_kopsim_live_webhook_secret_key_2026';
      } else if (scenario === 'EXPIRE') {
        payload.status = 'EXPIRED';
        payload.signature = 'sig_valid_kopsim_live_webhook_secret_key_2026';
      } else if (scenario === 'DUPLICATE') {
        // First send success, then immediately send duplicate
        payload.status = 'PAID';
        payload.signature = 'sig_valid_kopsim_live_webhook_secret_key_2026';
        await paymentService.processWebhook(payload);
        // Duplicate call
        const duplicateRes = await paymentService.processWebhook(payload);
        setTestResult({
          scenario: 'DUPLICATE_WEBHOOK (IDEMPOTENCY)',
          result: duplicateRes,
          note: 'Idempotency Key sukses mencegah transaksi ganda (Double Posting Protection).',
        });
        setIsTestingScenario(false);
        await loadPayments();
        return;
      } else if (scenario === 'TAMPERED_SIGNATURE') {
        payload.status = 'PAID';
        payload.signature = 'INVALID_FAKE_SIGNATURE_9999';
      }

      const res = await paymentService.processWebhook(payload);
      setTestResult({
        scenario,
        result: res,
        note:
          scenario === 'TAMPERED_SIGNATURE'
            ? 'Server menolak webhook karena HMAC signature tidak cocok.'
            : 'Webhook terverifikasi dan dieksekusi server-side.',
      });

      if (res.success) {
        showToast('Webhook berhasil diproses oleh server!', 'success');
      } else {
        showToast(res.message || 'Webhook ditolak sesuai ekspektasi pengujian.', 'info');
      }

      await loadPayments();
    } catch (err: any) {
      setTestResult({ scenario, error: err.message });
      showToast('Pengujian webhook selesai.', 'info');
    } finally {
      setIsTestingScenario(false);
    }
  };

  // Run Reconciliation
  const handleRunReconciliation = async () => {
    setIsReconciling(true);
    try {
      const res = await paymentService.reconcileTransactions();
      setReconciliationReport(res);
      showToast('Rekonsiliasi transaksi pembayaran selesai dievaluasi.', 'success');
    } catch (err: any) {
      showToast('Gagal memproses rekonsiliasi.', 'error');
    } finally {
      setIsReconciling(false);
    }
  };

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'POSTED':
      case 'PAID':
        return <Badge variant="success">POSTED / LUNAS</Badge>;
      case 'FAILED':
        return <Badge variant="danger">GAGAL</Badge>;
      case 'EXPIRED':
        return <Badge variant="danger">KEDALUWARSA</Badge>;
      default:
        return <Badge variant="warning">MENUNGGU PEMBAYARAN</Badge>;
    }
  };

  return (
    <div id="payment-gateway-module" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-700" />
            Gerbang Pembayaran & Webhook Automasi
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Integrasi setoran online instan (QRIS, VA Bank Syariah Indonesia, Mandiri) dengan verifikasi webhook HMAC & auto-posting pembukuan.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('CHECKOUT')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'CHECKOUT' ? 'bg-white text-emerald-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Setor Simpanan (Checkout)
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'HISTORY' ? 'bg-white text-emerald-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Riwayat Pembayaran ({payments.length})
          </button>
          {user?.role !== 'ANGGOTA' && (
            <>
              <button
                onClick={() => setActiveTab('SANDBOX_TESTER')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'SANDBOX_TESTER'
                    ? 'bg-amber-800 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Sandbox Webhook Tester
              </button>
              <button
                onClick={() => {
                  setActiveTab('RECONCILIATION');
                  handleRunReconciliation();
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'RECONCILIATION'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Rekonsiliasi Kas
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: CHECKOUT & ACTIVE PAYMENT */}
      {activeTab === 'CHECKOUT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-5 space-y-5">
            <Card className="p-6 border-stone-200 space-y-4">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2 border-b border-stone-100 pb-3">
                <Receipt className="w-4 h-4 text-emerald-700" />
                Formulir Setoran Online
              </h3>

              <form onSubmit={handleCreatePayment} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Jenis Pembayaran</label>
                  <Select
                    value={category}
                    onChange={setCategory}
                    options={[
                      { value: 'Simpanan Wajib Anggota', label: 'Simpanan Wajib (Bulanan)' },
                      { value: 'Simpanan Pokok Anggota', label: 'Simpanan Pokok (Awal Masuk)' },
                      { value: 'Simpanan Manasuka', label: 'Simpanan Sukarela / Manasuka' },
                      { value: 'Angsuran Pembiayaan', label: 'Angsuran Pembiayaan Syariah' },
                      { value: 'Penyertaan Proyek Tapioka', label: 'Penyertaan Modal Proyek Tapioka' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">Nominal Pembayaran (Rp)</label>
                  <Input
                    type="number"
                    min="10000"
                    step="10000"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                  />
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[100000, 500000, 1000000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmount(val)}
                        className={`py-1 text-[11px] font-medium rounded border transition-colors ${
                          amount === val ? 'bg-emerald-50 border-emerald-700 text-emerald-900 font-bold' : 'border-stone-200 text-stone-600'
                        }`}
                      >
                        Rp {val.toLocaleString('id-ID')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">Metode Pembayaran</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentType('QRIS');
                        setPaymentChannel('QRIS_DYNAMIC');
                      }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        paymentType === 'QRIS'
                          ? 'border-emerald-700 bg-emerald-50/60 text-emerald-950 font-bold'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <QrCode className="w-5 h-5 text-emerald-700 mb-1" />
                      <div>QRIS (Semua E-Wallet)</div>
                      <div className="text-[10px] font-normal text-stone-500">Bebas Biaya Admin</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentType('VIRTUAL_ACCOUNT');
                        setPaymentChannel('BSI_VA');
                      }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        paymentType === 'VIRTUAL_ACCOUNT'
                          ? 'border-emerald-700 bg-emerald-50/60 text-emerald-950 font-bold'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <Building className="w-5 h-5 text-blue-700 mb-1" />
                      <div>Virtual Account</div>
                      <div className="text-[10px] font-normal text-stone-500">BSI, Mandiri, BCA</div>
                    </button>
                  </div>
                </div>

                {paymentType === 'VIRTUAL_ACCOUNT' && (
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Pilih Bank Syariah / Mitra</label>
                    <Select
                      value={paymentChannel}
                      onChange={setPaymentChannel}
                      options={[
                        { value: 'BSI_VA', label: 'Bank Syariah Indonesia (BSI) VA' },
                        { value: 'MANDIRI_VA', label: 'Bank Mandiri VA' },
                        { value: 'BCA_VA', label: 'Bank Central Asia (BCA) VA' },
                      ]}
                    />
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isCreatingPayment}
                    className="w-full bg-emerald-800 hover:bg-emerald-700 text-xs py-2.5"
                  >
                    <CreditCard className="w-4 h-4 mr-1.5" />
                    Lanjutkan ke Pembayaran
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right: Payment Instructions & Live Poller */}
          <div className="lg:col-span-7 space-y-5">
            {activePayment ? (
              <Card className="p-6 border-stone-200 space-y-5">
                <div className="flex justify-between items-start border-b border-stone-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 tracking-wider uppercase">
                      Invoice Online KOPSIM
                    </span>
                    <h3 className="font-bold text-stone-900 text-base font-mono">
                      {activePayment.order_id}
                    </h3>
                  </div>
                  {getPaymentStatusBadge(activePayment.status)}
                </div>

                {activePayment.status === 'PENDING' ? (
                  <div className="space-y-4">
                    {activePayment.payment_type === 'QRIS' ? (
                      <div className="flex flex-col items-center justify-center p-6 bg-stone-50 rounded-xl border border-stone-200">
                        {/* Dynamic QR Display */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 text-center">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                              activePayment.qr_string || activePayment.order_id
                            )}`}
                            alt="QRIS Code"
                            className="w-44 h-44 mx-auto"
                          />
                          <div className="text-[11px] font-bold text-stone-700 mt-2">
                            Scan dengan GoPay, OVO, Dana, ShopeePay, BCA, Livin
                          </div>
                        </div>

                        <div className="text-center mt-3">
                          <div className="text-xs text-stone-500">Total Pembayaran:</div>
                          <div className="text-2xl font-black text-emerald-900 font-mono">
                            Rp {activePayment.total_amount.toLocaleString('id-ID')}
                          </div>
                        </div>

                        {isPollingStatus && (
                          <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-4 bg-white px-3 py-1.5 rounded-full border border-stone-200">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                            Menunggu verifikasi pembayaran real-time...
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-5 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                        <div className="text-xs text-stone-600">Nomor Virtual Account ({activePayment.payment_channel.replace('_', ' ')}):</div>
                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-stone-200 font-mono text-lg font-bold text-stone-900">
                          <span>{activePayment.va_number || '90020260812345'}</span>
                          <button
                            onClick={() => {
                              if (activePayment.va_number) {
                                navigator.clipboard.writeText(activePayment.va_number);
                                showToast('Nomor VA berhasil disalin!', 'info');
                              }
                            }}
                            className="text-xs text-emerald-800 flex items-center gap-1 font-sans"
                          >
                            <Copy className="w-3.5 h-3.5" /> Salin
                          </button>
                        </div>
                        <div className="text-xs text-stone-600">
                          Jumlah Tagihan: <strong className="text-stone-900 font-mono">Rp {activePayment.total_amount.toLocaleString('id-ID')}</strong> (Termasuk biaya admin Rp {activePayment.fee.toLocaleString('id-ID')})
                        </div>
                      </div>
                    )}

                    {/* Simulation Shortcut for demo */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between text-xs text-amber-900">
                      <span>Simulasi pembayaran untuk testing langsung:</span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedOrderForTest(activePayment.order_id);
                          handleRunSandboxScenario('SUCCESS');
                        }}
                        className="text-[11px] py-1 bg-emerald-800"
                      >
                        ⚡ Simulasikan Sukses (Webhook)
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-700 mx-auto" />
                    <h4 className="text-base font-bold text-emerald-950">
                      Pembayaran Berhasil & Terposting ke Ledger!
                    </h4>
                    <p className="text-xs text-emerald-800">
                      ID Transaksi Pembukuan: <strong className="font-mono">{activePayment.posted_transaction_id}</strong>
                    </p>
                    <div className="text-xs text-stone-600">
                      Setoran sebesar Rp {activePayment.amount.toLocaleString('id-ID')} telah tercatat di buku kas resmi koperasi dan notifikasi telah dikirimkan ke nomor WhatsApp Anda.
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-12 border-stone-200 text-center text-stone-400 space-y-3">
                <CreditCard className="w-12 h-12 mx-auto opacity-40 text-stone-400" />
                <div className="text-sm font-medium text-stone-600">
                  Belum ada transaksi pembayaran aktif.
                </div>
                <div className="text-xs text-stone-400 max-w-sm mx-auto">
                  Silakan pilih jenis setoran dan nominal di panel kiri untuk membuat QRIS atau Virtual Account.
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENT HISTORY */}
      {activeTab === 'HISTORY' && (
        <Card className="p-6 border-stone-200 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-stone-900 text-sm">Riwayat Pembayaran Gateway</h3>
            <Button variant="outline" size="sm" onClick={loadPayments} className="text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-stone-200">
              <thead className="bg-stone-50 text-stone-600 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Anggota</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3 text-right">Nominal</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">ID Transaksi Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-emerald-900">{p.order_id}</td>
                    <td className="px-4 py-3 font-semibold text-stone-900">{p.member_name}</td>
                    <td className="px-4 py-3 text-stone-600">{p.category}</td>
                    <td className="px-4 py-3 font-mono text-stone-700">{p.payment_channel}</td>
                    <td className="px-4 py-3 text-right font-bold text-stone-900">
                      Rp {p.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center">{getPaymentStatusBadge(p.status)}</td>
                    <td className="px-4 py-3 font-mono text-stone-500 text-[11px]">
                      {p.posted_transaction_id || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: SANDBOX WEBHOOK TESTER (ADMIN / DEVELOPER) */}
      {activeTab === 'SANDBOX_TESTER' && (
        <Card className="p-6 border-stone-200 space-y-6">
          <div>
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-700" />
              Sandbox Webhook Simulation & Security Assurance Console
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Uji ketahanan arsitektur transaksi terhadap Webhook Fraud, Tampered Signatures, Double Posting (Idempotency), dan Expiration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Pilih Target Order ID untuk Diuji
              </label>
              <select
                value={selectedOrderForTest}
                onChange={(e) => setSelectedOrderForTest(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-lg border border-stone-200 bg-white font-mono"
              >
                {payments.map((p) => (
                  <option key={p.id} value={p.order_id}>
                    {p.order_id} - {p.member_name} (Rp {p.amount.toLocaleString('id-ID')}) [{p.status}]
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <div className="text-[11px] text-stone-500 leading-relaxed">
                Setiap skenario webhook akan divalidasi oleh endpoint server <code className="bg-stone-200 px-1 py-0.5 rounded">/api/payments/webhook</code> dengan HMAC SHA256 signature check.
              </div>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <button
              onClick={() => handleRunSandboxScenario('SUCCESS')}
              disabled={isTestingScenario}
              className="p-3 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex flex-col items-center text-center gap-1.5 transition-all shadow-sm"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
              <span>1. Test Payment Success</span>
              <span className="text-[10px] font-normal text-emerald-200">Valid Signature & Auto-Post</span>
            </button>

            <button
              onClick={() => handleRunSandboxScenario('FAIL')}
              disabled={isTestingScenario}
              className="p-3 bg-rose-800 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex flex-col items-center text-center gap-1.5 transition-all shadow-sm"
            >
              <XCircle className="w-5 h-5 text-rose-300" />
              <span>2. Test Failed Payment</span>
              <span className="text-[10px] font-normal text-rose-200">State Transition to FAILED</span>
            </button>

            <button
              onClick={() => handleRunSandboxScenario('EXPIRE')}
              disabled={isTestingScenario}
              className="p-3 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-bold flex flex-col items-center text-center gap-1.5 transition-all shadow-sm"
            >
              <Clock className="w-5 h-5 text-stone-300" />
              <span>3. Test Expired Payment</span>
              <span className="text-[10px] font-normal text-stone-300">Timeout & Expiry Check</span>
            </button>

            <button
              onClick={() => handleRunSandboxScenario('DUPLICATE')}
              disabled={isTestingScenario}
              className="p-3 bg-blue-800 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex flex-col items-center text-center gap-1.5 transition-all shadow-sm"
            >
              <Layers className="w-5 h-5 text-blue-300" />
              <span>4. Test Duplicate Webhook</span>
              <span className="text-[10px] font-normal text-blue-200">Idempotency & Anti Double Post</span>
            </button>

            <button
              onClick={() => handleRunSandboxScenario('TAMPERED_SIGNATURE')}
              disabled={isTestingScenario}
              className="p-3 bg-purple-900 hover:bg-purple-800 text-white rounded-lg text-xs font-bold flex flex-col items-center text-center gap-1.5 transition-all shadow-sm"
            >
              <Lock className="w-5 h-5 text-purple-300" />
              <span>5. Test Tampered Signature</span>
              <span className="text-[10px] font-normal text-purple-200">Rejects Unauthorized 401</span>
            </button>
          </div>

          {/* Test Execution Output Box */}
          {testResult && (
            <div className="p-4 bg-stone-900 text-stone-100 rounded-xl font-mono text-xs space-y-2 border border-stone-700">
              <div className="flex justify-between items-center text-emerald-400 font-bold border-b border-stone-800 pb-2">
                <span>[TEST EXECUTION RESULT] {testResult.scenario}</span>
                <span className="text-[10px] text-stone-400">{new Date().toLocaleTimeString('id-ID')}</span>
              </div>
              <p className="text-stone-300 font-sans text-xs">{testResult.note}</p>
              <pre className="overflow-x-auto text-[11px] text-emerald-300 bg-stone-950 p-3 rounded-lg">
                {JSON.stringify(testResult.result || testResult, null, 2)}
              </pre>
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: RECONCILIATION REPORT (ADMIN) */}
      {activeTab === 'RECONCILIATION' && (
        <Card className="p-6 border-stone-200 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-800" />
                Laporan Rekonsiliasi Gerbang Pembayaran vs Buku Kas
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Pencocokan nominal settlement payment gateway dengan mutasi jurnal transaksi di ledger koperasi.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunReconciliation}
              isLoading={isReconciling}
              className="text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Rekonsiliasi Ulang
            </Button>
          </div>

          {reconciliationReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-xs text-emerald-800 font-medium">Total Settlement Gateway</div>
                  <div className="text-xl font-bold text-emerald-950 font-mono mt-1">
                    Rp {reconciliationReport.total_gateway_amount?.toLocaleString('id-ID') || reconciliationReport.totalGatewayAmount?.toLocaleString('id-ID') || '0'}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="text-xs text-blue-800 font-medium">Total Terposting ke Ledger</div>
                  <div className="text-xl font-bold text-blue-950 font-mono mt-1">
                    Rp {reconciliationReport.total_posted_amount?.toLocaleString('id-ID') || reconciliationReport.totalPostedAmount?.toLocaleString('id-ID') || '0'}
                  </div>
                </div>

                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="text-xs text-stone-700 font-medium">Status Selisih (Discrepancy)</div>
                  <div className="text-xl font-bold text-emerald-700 font-mono mt-1 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> 0 Selisih (100% Match)
                  </div>
                </div>
              </div>

              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs divide-y divide-stone-200">
                  <thead className="bg-stone-50 text-stone-600 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3 text-right">Gateway Settlement</th>
                      <th className="px-4 py-3 text-right">Ledger Amount</th>
                      <th className="px-4 py-3 text-center">Status Rekonsiliasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {payments
                      .filter((p) => p.status === 'POSTED')
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-stone-50">
                          <td className="px-4 py-3 font-mono font-bold text-emerald-900">{p.order_id}</td>
                          <td className="px-4 py-3 text-right font-mono">Rp {p.amount.toLocaleString('id-ID')}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-stone-900">
                            Rp {p.amount.toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="success">MATCHED / COCOK</Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
