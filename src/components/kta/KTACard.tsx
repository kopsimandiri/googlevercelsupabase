import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  RefreshCw,
  ShieldCheck,
  QrCode,
  AlertCircle,
  LayoutTemplate,
} from 'lucide-react';
import {
  KTAMemberData,
  fetchMemberFromSupabase,
  renderCanonicalKTACard,
  exportKTAToPDF,
  exportKTAToImage,
  exportMasterBlankoTemplateImage,
  KTA_CANVAS_WIDTH,
  KTA_CANVAS_HEIGHT,
} from './ktaRenderer';
import { MemberRecord } from '../../types/database';
import { memberService } from '../../services/memberService';

export interface KTACardProps {
  memberNo?: string;
  member?: Partial<MemberRecord> | KTAMemberData;
  onClose?: () => void;
  standalone?: boolean;
}

export const KTACard: React.FC<KTACardProps> = ({
  memberNo,
  member: initialMember,
  onClose,
  standalone = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blankoCanvasRef = useRef<HTMLCanvasElement>(null);
  const [memberData, setMemberData] = useState<KTAMemberData | null>(() => {
    if (initialMember) {
      const id = (initialMember as any).member_no || (initialMember as any).id || memberNo || '';
      return {
        member_no: id,
        full_name: (initialMember as any).full_name || (initialMember as any).nama || 'Anggota Koperasi',
        status: (initialMember as any).status || 'ANGGOTA',
        work_area: (initialMember as any).work_area || (initialMember as any).plantation || 'KOPERASI PUSAT',
        registered_at: (initialMember as any).registered_at || (initialMember as any).tgl_reg || new Date().toISOString().split('T')[0],
        avatar_url: (initialMember as any).avatar_url || memberService.getMemberAvatar(id) || undefined,
      };
    }
    return null;
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch live member data directly from Supabase if memberNo provided
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setErrorMessage(null);

      const targetId = memberNo || (initialMember as any)?.member_no || (initialMember as any)?.id;

      if (targetId) {
        try {
          const fetched = await fetchMemberFromSupabase(targetId);
          if (isMounted && fetched) {
            // Check avatar URL fallback from local service if avatar_url is empty
            if (!fetched.avatar_url) {
              const localAv = memberService.getMemberAvatar(fetched.member_no);
              if (localAv) fetched.avatar_url = localAv;
            }
            setMemberData(fetched);
            return;
          }
        } catch (err) {
          console.warn('[KTACard] Failed to fetch live member from Supabase:', err);
        }
      }

      // Fallback to initialMember if direct fetch returned null
      if (initialMember && isMounted) {
        const id = (initialMember as any).member_no || (initialMember as any).id || targetId || 'KSIM-2026-000001';
        setMemberData({
          member_no: id,
          full_name: (initialMember as any).full_name || (initialMember as any).nama || 'Anggota Koperasi',
          status: (initialMember as any).status || 'ANGGOTA',
          work_area: (initialMember as any).work_area || (initialMember as any).plantation || 'KOPERASI PUSAT',
          registered_at: (initialMember as any).registered_at || (initialMember as any).tgl_reg || new Date().toISOString().split('T')[0],
          avatar_url: (initialMember as any).avatar_url || memberService.getMemberAvatar(id) || undefined,
        });
      } else if (isMounted && !memberData) {
        setErrorMessage('Data anggota tidak ditemukan di database Supabase.');
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [memberNo, initialMember]);

  // 2. Render Card to Canvas on Member Data changes
  useEffect(() => {
    let isCancelled = false;

    async function drawCard() {
      if (!memberData || !canvasRef.current) return;
      setIsLoading(true);

      // Load Logo Kopsim
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = '/assets/logo-kopsim.png';

      // Load Member Avatar if present
      let avatarImg: HTMLImageElement | null = null;
      const avatarSrc = memberData.avatar_url || memberService.getMemberAvatar(memberData.member_no);
      if (avatarSrc) {
        avatarImg = new Image();
        avatarImg.crossOrigin = 'anonymous';
        avatarImg.src = avatarSrc;
      }

      const promises: Promise<void>[] = [
        new Promise<void>((resolve) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = () => resolve();
        }),
      ];

      if (avatarImg) {
        promises.push(
          new Promise<void>((resolve) => {
            avatarImg!.onload = () => resolve();
            avatarImg!.onerror = () => resolve();
          })
        );
      }

      await Promise.all(promises);

      if (isCancelled || !canvasRef.current) return;

      try {
        const url = await renderCanonicalKTACard(canvasRef.current, memberData, {
          logoImage: logoImg.naturalWidth > 0 ? logoImg : null,
          avatarImage: avatarImg && avatarImg.naturalWidth > 0 ? avatarImg : null,
        });

        if (!isCancelled) {
          setPreviewUrl(url);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('Failed to render KTA Card:', err);
        if (!isCancelled) {
          setErrorMessage('Gagal memproses kartu KTA: ' + (err?.message || err));
          setIsLoading(false);
        }
      }
    }

    drawCard();

    return () => {
      isCancelled = true;
    };
  }, [memberData]);

  // 3. Print Function
  const handlePrint = () => {
    if (!previewUrl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Izinkan pop-up untuk mencetak KTA.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak KTA - ${memberData?.full_name || 'KOPSIM'}</title>
          <style>
            @page {
              size: 85.6mm 53.98mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #fff;
            }
            img {
              width: 85.6mm;
              height: 53.98mm;
              object-fit: contain;
              display: block;
            }
          </style>
        </head>
        <body>
          <img src="${previewUrl}" onload="window.print();window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 4. PDF Export
  const handleExportPDF = async () => {
    if (!canvasRef.current || !memberData) return;
    setIsExporting(true);
    try {
      await exportKTAToPDF(canvasRef.current, memberData);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // 5. Image Export
  const handleExportImage = (format: 'jpg' | 'png' = 'jpg') => {
    if (!canvasRef.current || !memberData) return;
    exportKTAToImage(canvasRef.current, memberData, format);
  };

  // 6. Blanko Template Only Export
  const handleExportBlankoTemplate = (format: 'jpg' | 'png' = 'jpg') => {
    const targetCanvas = blankoCanvasRef.current || canvasRef.current;
    if (!targetCanvas) return;
    exportMasterBlankoTemplateImage(targetCanvas, format);
  };

  const cardContent = (
    <div className="flex flex-col gap-4">
      {/* Hidden Master Canvases */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={blankoCanvasRef} className="hidden" />

      {/* Main KTA Card Preview (CR80 2026 x 1276 px Ratio) */}
      <div className="relative w-full aspect-[2026/1276] bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 shadow-xl flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2.5 text-stone-500 text-xs">
            <RefreshCw className="w-7 h-7 animate-spin text-emerald-800" />
            <span className="font-medium font-sans">Menyiapkan KTA Master Resolusi Tinggi (2026 x 1276 px)...</span>
          </div>
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt={`KTA ${memberData?.full_name || 'Anggota'}`}
            className="w-full h-full object-contain select-none"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-stone-400 text-xs p-6 text-center">
            <AlertCircle className="w-8 h-8 text-amber-500" />
            <p>{errorMessage || 'Gagal memuat kartu KTA'}</p>
          </div>
        )}
      </div>

      {/* Metadata & Verification Note */}
      {memberData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-950">
              <ShieldCheck className="w-4 h-4 text-emerald-800" />
              <span>Verifikasi Resmi KOPSIM:</span>
            </div>
            <p className="text-[11px] text-emerald-900 font-mono truncate">
              https://kopsimari.vercel.app/verify/member/{memberData.member_no}
            </p>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <QrCode className="w-4 h-4 text-amber-800" />
              <span>Standar CR80 300 DPI (2026 x 1276 px):</span>
            </div>
            <p className="text-[11px] text-amber-900">
              85.6mm x 53.98mm (2x HD), bingkai polaroid, QR verifikasi, & aksen hijau-emas KOPSIM.
            </p>
          </div>
        </div>
      )}

      {/* Action Toolbar: Print, PDF, Image, Blanko */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-stone-100">
        <div className="flex items-center gap-2">
          {onClose && !standalone ? (
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
            >
              Tutup
            </button>
          ) : null}

          {/* Download Blanko Template Button */}
          <button
            id="btn-download-blanko-template"
            onClick={() => handleExportBlankoTemplate('jpg')}
            title="Unduh Template Blanko Master (Kosong / Reusable)"
            className="px-3 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-stone-500" />
            <span>Blanko Kosong</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Print Button */}
          <button
            id="btn-print-kta"
            onClick={handlePrint}
            disabled={isLoading || !previewUrl}
            className="px-3.5 py-2 text-xs font-bold text-stone-800 bg-white border border-stone-300 hover:bg-stone-50 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5 text-stone-600" />
            <span>Cetak Kartu</span>
          </button>

          {/* PDF Download Button */}
          <button
            id="btn-pdf-kta"
            onClick={handleExportPDF}
            disabled={isLoading || isExporting || !previewUrl}
            className="px-3.5 py-2 text-xs font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 hover:bg-emerald-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-800" />
            <span>{isExporting ? 'Membuat PDF...' : 'Unduh PDF'}</span>
          </button>

          {/* Image JPG Download Button */}
          <button
            id="btn-download-image-kta"
            onClick={() => handleExportImage('jpg')}
            disabled={isLoading || !previewUrl}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh JPG (2026x1276 HD)</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (standalone) {
    return (
      <div className="w-full max-w-3xl mx-auto p-4 bg-white rounded-3xl border border-stone-200 shadow-md">
        {cardContent}
      </div>
    );
  }

  return (
    <div
      id="kta-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/75 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-3xl w-full p-5 sm:p-6 space-y-4 my-6 animate-fade">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 font-serif text-base sm:text-lg">
                Kartu Tanda Anggota (KTA) Master CR80
              </h3>
              <p className="text-xs text-stone-500">
                KOPSIM Mandiri — Resolusi 2026 × 1276 px (300 DPI 2x)
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {cardContent}
      </div>
    </div>
  );
};
