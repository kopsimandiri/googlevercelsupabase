import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { getSupabaseClient } from '../../lib/supabase';

export interface KTAMemberData {
  member_no: string;
  full_name: string;
  status: string;
  work_area: string;
  registered_at: string;
  avatar_url?: string;
}

/**
 * High-Resolution Dimensions (CR80 Standard Ratio 85.6mm x 53.98mm @ 300 DPI 2x)
 * 2026 x 1276 px for ultra-sharp rendering and printing
 */
export const KTA_CANVAS_WIDTH = 2026;
export const KTA_CANVAS_HEIGHT = 1276;
export const KTA_CARD_RADIUS = 56;

// Official KOPSIM Brand Colors (Institutional & Refined)
export const KOPSIM_COLORS = {
  darkGreen: '#0F3D2E',      // Primary Dark Green (Deep Institutional Pine)
  secondaryGreen: '#1F7A5C', // Secondary Corporate Emerald
  accentGreen: '#2B8C6A',    // Medium Green Accent
  gold: '#C9A24D',           // Refined Muted Institutional Gold
  goldLight: '#E6C77A',      // Soft Champagne Gold
  goldDark: '#A68032',       // Deep Metallic Gold
  cardBg: '#FFFFFF',         // Crisp White
  bgSoft: '#F4F7F5',         // Soft Background
  wave1: '#F2F7F4',          // Faint Base Contour
  wave2: '#E7F1EB',          // Subtle Emerald Contour
  divider: '#DCE5E0',        // Crisp Subtle Row Divider
  textDark: '#0F3D2E',       // High-Contrast Dark Green Text
  textLabel: '#1A5A43',      // Subdued Dark Green for Uppercase Labels
  textMuted: '#5C7168',      // Soft Institutional Annotation Color
};

/**
 * Fetch member directly from Supabase public.members table
 */
export async function fetchMemberFromSupabase(memberNoOrId: string): Promise<KTAMemberData | null> {
  const cleanId = (memberNoOrId || '').trim();
  if (!cleanId) return null;

  const client = getSupabaseClient();
  if (client) {
    try {
      let query = client
        .from('members')
        .select('member_no, id, full_name, status, work_area, registered_at, avatar_url, created_at');

      if (/^\d+$/.test(cleanId)) {
        query = query.or(`member_no.eq.${cleanId},username.eq.${cleanId},id.eq.${cleanId}`);
      } else {
        query = query.or(`member_no.eq.${cleanId},username.eq.${cleanId}`);
      }

      const { data, error } = await query.limit(1);

      if (!error && data && data.length > 0) {
        const row = data[0];
        const memberNo = String(row.member_no || row.id || cleanId);
        const fullName = String(row.full_name || 'Anggota Koperasi');
        const status = String(row.status || 'ANGGOTA');
        const workArea = String(row.work_area || 'KOPERASI PUSAT');
        const registeredAt = String(row.registered_at || row.created_at || new Date().toISOString().split('T')[0]);

        return {
          member_no: memberNo,
          full_name: fullName,
          status,
          work_area: workArea,
          registered_at: registeredAt,
          avatar_url: row.avatar_url,
        };
      }
    } catch (err) {
      console.warn('[ktaRenderer] Supabase fetch warning:', err);
    }
  }

  return null;
}

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Format registration date to Indonesian text: "10 Desember 2025" and "+5 Tahun"
 */
export function formatIndonesianKTADates(dateStr?: string) {
  let dateObj = new Date();
  if (dateStr) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }

  const day = dateObj.getDate();
  const monthName = INDONESIAN_MONTHS[dateObj.getMonth()] || 'Agustus';
  const year = dateObj.getFullYear();

  // Tanggal Terbit
  const issueDateStr = `${day} ${monthName} ${year}`;
  
  // Berlaku Sampai (+5 Tahun)
  const validUntilStr = `${day} ${monthName} ${year + 5}`;

  return {
    issueDateStr,
    validUntilStr,
    year: String(year),
  };
}

/**
 * Helper to draw a rounded rectangle path
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draws rounded circular badge with refined corporate icon on canvas
 * Scaled precisely for 2026 x 1276 px master resolution
 */
function drawIconBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  type: 'user' | 'check' | 'building' | 'calendar' | 'shield-check' | 'qr'
) {
  ctx.save();

  // 1. Outer subtle gold accent ring
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2.5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(201, 162, 77, 0.45)';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 2. Main Circle Badge (Primary Dark Green #0F3D2E)
  ctx.fillStyle = KOPSIM_COLORS.darkGreen;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // 3. Crisp Vector Icon in White
  ctx.strokeStyle = '#FFFFFF';
  ctx.fillStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(2.8, r * 0.12);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const scale = r * 0.054;

  if (type === 'user') {
    // Head
    ctx.beginPath();
    ctx.arc(cx, cy - 3.6 * scale, 3.4 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    // Torso
    ctx.beginPath();
    ctx.arc(cx, cy + 9.5 * scale, 7.2 * scale, Math.PI * 1.18, Math.PI * 1.82);
    ctx.lineTo(cx + 6.2 * scale, cy + 8.5 * scale);
    ctx.lineTo(cx - 6.2 * scale, cy + 8.5 * scale);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  } else if (type === 'check') {
    // Shield / Circle Outline
    ctx.beginPath();
    ctx.arc(cx, cy, 7.5 * scale, 0, Math.PI * 2);
    ctx.stroke();
    // Checkmark
    ctx.beginPath();
    ctx.moveTo(cx - 3.8 * scale, cy);
    ctx.lineTo(cx - scale, cy + 3.2 * scale);
    ctx.lineTo(cx + 4.2 * scale, cy - 3 * scale);
    ctx.stroke();
  } else if (type === 'building') {
    // Building body
    ctx.strokeRect(cx - 6 * scale, cy - 6.5 * scale, 12 * scale, 13 * scale);
    // Door
    ctx.fillRect(cx - 2.2 * scale, cy + 2 * scale, 4.4 * scale, 4.5 * scale);
    // Windows
    ctx.fillRect(cx - 4.5 * scale, cy - 4.5 * scale, 2.5 * scale, 2.5 * scale);
    ctx.fillRect(cx + 2 * scale, cy - 4.5 * scale, 2.5 * scale, 2.5 * scale);
    ctx.fillRect(cx - 4.5 * scale, cy - scale, 2.5 * scale, 2.5 * scale);
    ctx.fillRect(cx + 2 * scale, cy - scale, 2.5 * scale, 2.5 * scale);
  } else if (type === 'calendar') {
    // Calendar body
    ctx.strokeRect(cx - 6.5 * scale, cy - 5.5 * scale, 13 * scale, 12 * scale);
    // Top header line
    ctx.beginPath();
    ctx.moveTo(cx - 6.5 * scale, cy - 1.8 * scale);
    ctx.lineTo(cx + 6.5 * scale, cy - 1.8 * scale);
    ctx.stroke();
    // Binder Pegs
    ctx.beginPath();
    ctx.moveTo(cx - 3.8 * scale, cy - 8 * scale);
    ctx.lineTo(cx - 3.8 * scale, cy - 5.5 * scale);
    ctx.moveTo(cx + 3.8 * scale, cy - 8 * scale);
    ctx.lineTo(cx + 3.8 * scale, cy - 5.5 * scale);
    ctx.stroke();
    // Grid Dots
    ctx.fillRect(cx - 4.2 * scale, cy + 1 * scale, 2.2 * scale, 2.2 * scale);
    ctx.fillRect(cx - 1.1 * scale, cy + 1 * scale, 2.2 * scale, 2.2 * scale);
    ctx.fillRect(cx + 2 * scale, cy + 1 * scale, 2.2 * scale, 2.2 * scale);
  } else if (type === 'shield-check') {
    // Shield
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8 * scale);
    ctx.lineTo(cx + 7 * scale, cy - 4.8 * scale);
    ctx.lineTo(cx + 7 * scale, cy + scale);
    ctx.bezierCurveTo(cx + 7 * scale, cy + 7 * scale, cx, cy + 9 * scale, cx, cy + 9 * scale);
    ctx.bezierCurveTo(cx, cy + 9 * scale, cx - 7 * scale, cy + 7 * scale, cx - 7 * scale, cy + scale);
    ctx.lineTo(cx - 7 * scale, cy - 4.8 * scale);
    ctx.closePath();
    ctx.stroke();
    // Checkmark inside shield
    ctx.beginPath();
    ctx.moveTo(cx - 3.2 * scale, cy + 0.2 * scale);
    ctx.lineTo(cx - 0.8 * scale, cy + 3 * scale);
    ctx.lineTo(cx + 3.8 * scale, cy - 2 * scale);
    ctx.stroke();
  } else if (type === 'qr') {
    // Small QR glyph
    ctx.strokeRect(cx - 6 * scale, cy - 6 * scale, 12 * scale, 12 * scale);
    ctx.fillRect(cx - 4 * scale, cy - 4 * scale, 3 * scale, 3 * scale);
    ctx.fillRect(cx + 1 * scale, cy - 4 * scale, 3 * scale, 3 * scale);
    ctx.fillRect(cx - 4 * scale, cy + 1 * scale, 3 * scale, 3 * scale);
    ctx.fillRect(cx + 1.5 * scale, cy + 1.5 * scale, 2.5 * scale, 2.5 * scale);
  }

  ctx.restore();
}

/**
 * Draws ultra-subtle institutional security guilloche micro-lines in background
 * 100% unobtrusive, ~3-4% opacity for banknote/PVC authentication realism
 */
function drawSecurityGuilloche(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(15, 61, 46, 0.038)';
  ctx.lineWidth = 1.2;

  // Horizontal harmonic security waves
  const waveCount = 12;
  for (let i = 0; i < waveCount; i++) {
    const yBase = (h / waveCount) * i + 40;
    ctx.beginPath();
    ctx.moveTo(0, yBase);
    for (let x = 0; x <= w; x += 60) {
      const yOffset = Math.sin((x + i * 180) * 0.007) * 26 + Math.cos((x + i * 90) * 0.004) * 16;
      ctx.lineTo(x, yBase + yOffset);
    }
    ctx.stroke();
  }

  // Watermark Emblem in Background (Center Left, Opacity 3.5%)
  const wmCx = w * 0.38;
  const wmCy = h * 0.52;
  const wmRadius = 240;

  ctx.strokeStyle = 'rgba(201, 162, 77, 0.045)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(wmCx, wmCy, wmRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(wmCx, wmCy, wmRadius - 28, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle security micro-repeating text ribbon (Top-center subtle accent)
  ctx.fillStyle = 'rgba(15, 61, 46, 0.045)';
  ctx.font = '600 13px "Plus Jakarta Sans", "Inter", sans-serif';
  ctx.textAlign = 'left';
  const microText = 'KOPSIM MANDIRI • KARTU ANGGOTA RESMI • SYARIKAT ISLAM MANDIRI • ISO CR80 • SECURE DIGITAL IDENTIFICATION • ';
  ctx.fillText(microText.repeat(3), 60, h - 38);

  ctx.restore();
}

/**
 * 100% Clean Master Background (CR80 Standard 2026 x 1276 px)
 * PVC photographic finish: subtle waves, refined diagonal chevron ribbon (Dark Green, Gold, Light Green),
 * glossy sheen, and realistic rounded physical card contour
 */
export function drawMasterBlankoBase(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // 1. Clip outer physical card with standard CR80 rounded corners
  ctx.save();
  drawRoundedRect(ctx, 0, 0, w, h, KTA_CARD_RADIUS);
  ctx.clip();

  // 2. Base Clean White-Soft Background (#FFFFFF to #F4F7F5)
  const baseBgGrad = ctx.createLinearGradient(0, 0, w, h);
  baseBgGrad.addColorStop(0, KOPSIM_COLORS.cardBg);
  baseBgGrad.addColorStop(0.6, KOPSIM_COLORS.cardBg);
  baseBgGrad.addColorStop(1, KOPSIM_COLORS.bgSoft);
  ctx.fillStyle = baseBgGrad;
  ctx.fillRect(0, 0, w, h);

  // 3. Subtle Institutional Security Pattern
  drawSecurityGuilloche(ctx, w, h);

  // 4. Subtle Wave Background (Left & Bottom-Center)
  ctx.fillStyle = KOPSIM_COLORS.wave1;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.40);
  ctx.bezierCurveTo(w * 0.24, h * 0.44, w * 0.46, h * 0.68, w * 0.80, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = KOPSIM_COLORS.wave2;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.68);
  ctx.bezierCurveTo(w * 0.20, h * 0.72, w * 0.40, h * 0.88, w * 0.64, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // 5. Distinctive Diagonal Right Chevron Wings (Harmonious, Institutional & Elegant)
  // A. Top Dark Green Wing (#0F3D2E)
  ctx.fillStyle = KOPSIM_COLORS.darkGreen;
  ctx.beginPath();
  ctx.moveTo(w * 0.74, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h * 0.50);
  ctx.bezierCurveTo(w * 0.87, h * 0.38, w * 0.755, h * 0.21, w * 0.74, 0);
  ctx.closePath();
  ctx.fill();

  // B. Gold Curved Ribbon / Chevron Separator (#C9A24D with Refined Gold Gradient)
  const goldGrad = ctx.createLinearGradient(w * 0.69, 0, w, h * 0.55);
  goldGrad.addColorStop(0, KOPSIM_COLORS.gold);
  goldGrad.addColorStop(0.5, KOPSIM_COLORS.goldLight);
  goldGrad.addColorStop(1, KOPSIM_COLORS.goldDark);

  ctx.fillStyle = goldGrad;
  ctx.beginPath();
  ctx.moveTo(w * 0.695, 0);
  ctx.lineTo(w * 0.74, 0);
  ctx.bezierCurveTo(w * 0.755, h * 0.21, w * 0.87, h * 0.38, w, h * 0.50);
  ctx.lineTo(w, h * 0.55);
  ctx.bezierCurveTo(w * 0.855, h * 0.435, w * 0.70, h * 0.24, w * 0.695, 0);
  ctx.closePath();
  ctx.fill();

  // C. Bottom Secondary Emerald Green Accent Curve (#1F7A5C)
  ctx.fillStyle = KOPSIM_COLORS.secondaryGreen;
  ctx.beginPath();
  ctx.moveTo(w, h * 0.55);
  ctx.lineTo(w, h);
  ctx.lineTo(w * 0.715, h);
  ctx.bezierCurveTo(w * 0.835, h * 0.89, w * 0.935, h * 0.735, w, h * 0.55);
  ctx.closePath();
  ctx.fill();

  // D. Bottom Gold Accent Curve (#C9A24D)
  ctx.fillStyle = goldGrad;
  ctx.beginPath();
  ctx.moveTo(w * 0.715, h);
  ctx.lineTo(w * 0.665, h);
  ctx.bezierCurveTo(w * 0.795, h * 0.93, w * 0.905, h * 0.765, w, h * 0.55);
  ctx.lineTo(w, h * 0.585);
  ctx.bezierCurveTo(w * 0.915, h * 0.785, w * 0.805, h * 0.95, w * 0.715, h);
  ctx.closePath();
  ctx.fill();

  // 6. Subtle Photographic PVC Glossy Specular Sheen (Clean & Professional)
  const sheen = ctx.createLinearGradient(0, 0, w, h);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
  sheen.addColorStop(0.22, 'rgba(255, 255, 255, 0.06)');
  sheen.addColorStop(0.55, 'rgba(255, 255, 255, 0.0)');
  sheen.addColorStop(1, 'rgba(15, 61, 46, 0.04)');

  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);

  // 7. Subtle Physical Card Outer Edge Bevel / Stroke
  ctx.strokeStyle = 'rgba(15, 61, 46, 0.12)';
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, 1.5, 1.5, w - 3, h - 3, KTA_CARD_RADIUS);
  ctx.stroke();

  ctx.restore();
}

/**
 * Render Master Blanko Template (Semua Placeholder Kosong)
 * Sesuai instruksi untuk blanko reusable (tanpa data teks/foto anggota spesifik)
 */
export function renderMasterBlankoTemplate(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const w = KTA_CANVAS_WIDTH;
  const h = KTA_CANVAS_HEIGHT;
  canvas.width = w;
  canvas.height = h;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Base Blanko Background
  drawMasterBlankoBase(ctx, w, h);

  // 2. Logo Area (Circular Placeholder)
  const logoCx = 210;
  const logoCy = 185;
  const logoRadius = 90;

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(logoCx, logoCy, logoRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = KOPSIM_COLORS.darkGreen;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Subtle Gold Accent Ring
  ctx.beginPath();
  ctx.arc(logoCx, logoCy, logoRadius - 6, 0, Math.PI * 2);
  ctx.strokeStyle = KOPSIM_COLORS.gold;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = KOPSIM_COLORS.darkGreen;
  ctx.font = 'bold 20px "Plus Jakarta Sans", "Inter", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AREA LOGO', logoCx, logoCy - 6);
  ctx.font = '600 15px "Plus Jakarta Sans", "Inter", Arial, sans-serif';
  ctx.fillStyle = KOPSIM_COLORS.textMuted;
  ctx.fillText('KOPSIM', logoCx, logoCy + 18);
  ctx.restore();

  // 3. Header Texts Area
  const textStartX = 335;
  ctx.save();
  ctx.textAlign = 'left';

  // "KOPERASI SYARIKAT"
  ctx.font = '800 35px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif';
  ctx.fillStyle = KOPSIM_COLORS.darkGreen;
  ctx.fillText('KOPERASI SYARIKAT', textStartX, 145);

  // "ISLAM MANDIRI"
  ctx.font = '800 35px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif';
  ctx.fillStyle = KOPSIM_COLORS.darkGreen;
  ctx.fillText('ISLAM MANDIRI', textStartX, 192);

  // "KARTU ANGGOTA"
  ctx.font = '900 50px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif';
  ctx.fillStyle = KOPSIM_COLORS.darkGreen;
  ctx.fillText('KARTU ANGGOTA', textStartX, 268);

  // Dual Accent Bar (Gold left + Dark green right)
  const barY = 288;
  ctx.fillStyle = KOPSIM_COLORS.gold;
  drawRoundedRect(ctx, textStartX, barY, 100, 7, 3.5);
  ctx.fill();

  ctx.fillStyle = KOPSIM_COLORS.darkGreen;
  drawRoundedRect(ctx, textStartX + 110, barY, 530, 7, 3.5);
  ctx.fill();
  ctx.restore();

  // 4. 5 Data Rows Placeholders (Left Column)
  const labels = [
    { type: 'user' as const, label: 'NOMOR ANGGOTA' },
    { type: 'user' as const, label: 'NAMA LENGKAP' },
    { type: 'check' as const, label: 'STATUS' },
    { type: 'building' as const, label: 'AREA / UNIT' },
    { type: 'calendar' as const, label: 'TAHUN BERGABUNG' },
  ];

  const startY = 380;
  const rowGap = 108;
  const badgeCx = 160;
  const labelX = 210;
  const lineEndX = 970;

  labels.forEach((item, index) => {
    const currentY = startY + index * rowGap;

    // Circle Badge Icon
    drawIconBadge(ctx, badgeCx, currentY + 16, 26, item.type);

    // Label Text
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = '700 18px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif';
    ctx.fillStyle = KOPSIM_COLORS.textLabel;
    ctx.fillText(item.label, labelX, currentY + 7);

    // Divider Line
    ctx.strokeStyle = KOPSIM_COLORS.divider;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(labelX, currentY + 56);
    ctx.lineTo(lineEndX, currentY + 56);
    ctx.stroke();
    ctx.restore();
  });

  // 5. Footer Placeholders: TANGGAL TERBIT & BERLAKU SAMPAI
  const footerY = 975;

  // Tanggal Terbit
  drawIconBadge(ctx, badgeCx, footerY + 16, 24, 'calendar');
  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = '700 18px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif';
  ctx.fillStyle = KOPSIM_COLORS.textLabel;
  ctx.fillText('TANGGAL TERBIT', labelX, footerY + 7);
  ctx.restore();

  // Vertical Separator
  ctx.save();
  ctx.strokeStyle = KOPSIM_COLORS.divider;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(515, footerY - 8);
  ctx.lineTo(515, footerY + 46);
  ctx.stroke();
  ctx.restore();

  // Berlaku Sampai
  const footerCol2BadgeX = 560;
  const footerCol2TextX = 605;
  drawIconBadge(ctx, footerCol2BadgeX, footerY + 16, 24, 'shield-check');

  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = '700 18px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif';
  ctx.fillStyle = KOPSIM_COLORS.textLabel;
  ctx.fillText('BERLAKU SAMPAI', footerCol2TextX, footerY + 7);
  ctx.restore();

  // 6. Right Photo Frame (Polaroid-style thick border, rounded corner)
  const photoX = 1200;
  const photoY = 240;
  const photoW = 430;
  const photoH = 580;
  const photoRadius = 28;

  ctx.save();
  // Outer Soft Drop Shadow
  ctx.shadowColor = 'rgba(15, 61, 46, 0.12)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;

  // Thick White Frame
  drawRoundedRect(ctx, photoX, photoY, photoW, photoH, photoRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Fine Dark Green Stroke
  ctx.strokeStyle = KOPSIM_COLORS.darkGreen;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Inner Placeholder Box
  ctx.shadowColor = 'transparent';
  const innerPad = 12;
  drawRoundedRect(
    ctx,
    photoX + innerPad,
    photoY + innerPad,
    photoW - innerPad * 2,
    photoH - innerPad * 2,
    photoRadius - 8
  );
  ctx.fillStyle = '#F4F7F5';
  ctx.fill();

  ctx.strokeStyle = 'rgba(201, 162, 77, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = KOPSIM_COLORS.textDark;
  ctx.font = '700 22px "Plus Jakarta Sans", "Inter", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BINGKAI PAS FOTO ID', photoX + photoW / 2, photoY + photoH / 2 - 8);
  ctx.font = '600 16px "Plus Jakarta Sans", "Inter", Arial, sans-serif';
  ctx.fillStyle = KOPSIM_COLORS.textMuted;
  ctx.fillText('(Template Blanko Master)', photoX + photoW / 2, photoY + photoH / 2 + 24);
  ctx.restore();

  // 7. Right QR Code Placeholder Box
  const qrX = 1200;
  const qrY = 875;
  const qrSize = 205;

  ctx.save();
  drawRoundedRect(ctx, qrX, qrY, qrSize, qrSize, 18);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = KOPSIM_COLORS.darkGreen;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  drawIconBadge(ctx, qrX + qrSize / 2, qrY + qrSize / 2 - 18, 36, 'qr');
  ctx.fillStyle = KOPSIM_COLORS.textDark;
  ctx.font = '700 16px "Plus Jakarta Sans", "Inter", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AREA QR CODE', qrX + qrSize / 2, qrY + qrSize / 2 + 38);
  ctx.restore();

  // 8. Verification Text Next to QR Code
  const scanTextX = 1435;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = '700 18px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif';
  ctx.fillStyle = KOPSIM_COLORS.textLabel;
  ctx.fillText('SCAN UNTUK', scanTextX, 948);

  ctx.font = '800 24px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif';
  ctx.fillStyle = KOPSIM_COLORS.darkGreen;
  ctx.fillText('VERIFIKASI ANGGOTA', scanTextX, 984);

  // Micro-security pill label
  ctx.fillStyle = KOPSIM_COLORS.gold;
  drawRoundedRect(ctx, scanTextX, 1002, 170, 22, 11);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 11px "Plus Jakarta Sans", "Inter", sans-serif';
  ctx.fillText('ENKRIPSI KOPSIM RESMI', scanTextX + 10, 1017);
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.98);
}

/**
 * Render Production Canonical KTA to Canvas (CR80 2026 x 1276 px @ 300 DPI 2x)
 * Injects real member data into the master template with pixel precision
 */
export async function renderCanonicalKTACard(
  canvas: HTMLCanvasElement,
  member: KTAMemberData,
  options?: {
    logoImage?: HTMLImageElement | null;
    avatarImage?: HTMLImageElement | null;
  }
): Promise<string> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const w = KTA_CANVAS_WIDTH;
  const h = KTA_CANVAS_HEIGHT;
  canvas.width = w;
  canvas.height = h;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Draw 100% Clean Master Base Blanko with Security Guilloche
  drawMasterBlankoBase(ctx, w, h);

  // 2. Draw Clean Circular Logo Koperasi (Left Header)
  const logoX = 115;
  const logoY = 90;
  const logoSize = 190;

  ctx.save();
  // White disc behind logo
  ctx.beginPath();
  ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 4, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(15, 61, 46, 0.1)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Double Border (Green + Gold)
  ctx.strokeStyle = KOPSIM_COLORS.darkGreen;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 - 2, 0, Math.PI * 2);
  ctx.strokeStyle = KOPSIM_COLORS.gold;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Clip circular mask so logo renders perfectly without square corners
  ctx.beginPath();
  ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 - 4, 0, Math.PI * 2);
  ctx.clip();

  if (options?.logoImage && options.logoImage.complete && options.logoImage.naturalWidth > 0) {
    ctx.drawImage(options.logoImage, logoX, logoY, logoSize, logoSize);
  } else {
    // Sharp Vector Emblem fallback
    ctx.fillStyle = KOPSIM_COLORS.darkGreen;
    ctx.fillRect(logoX, logoY, logoSize, logoSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 32px "Plus Jakarta Sans", "Inter", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KOPSIM', logoX + logoSize / 2, logoY + logoSize / 2 + 10);
  }
  ctx.restore();

  // 3. Header Texts
  const textStartX = 335;
  ctx.save();
  ctx.textAlign = 'left';

  // "KOPERASI SYARIKAT"
  ctx.font = '800 35px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif';
  ctx.fillStyle = KOPSIM_COLORS.darkGreen;
  ctx.fillText('KOPERASI SYARIKAT', textStartX, 145);

  // "ISLAM MANDIRI"
  ctx.font = '800 35px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif';
  ctx.fillStyle = KOPSIM_COLORS.darkGreen;
  ctx.fillText('ISLAM MANDIRI', textStartX, 192);

  // "KARTU ANGGOTA"
  ctx.font = '900 50px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif';
  ctx.fillStyle = KOPSIM_COLORS.darkGreen;
  ctx.fillText('KARTU ANGGOTA', textStartX, 268);

  // Dual Accent Bar (Gold left + Dark green right)
  const barY = 288;
  ctx.fillStyle = KOPSIM_COLORS.gold;
  drawRoundedRect(ctx, textStartX, barY, 100, 7, 3.5);
  ctx.fill();

  ctx.fillStyle = KOPSIM_COLORS.darkGreen;
  drawRoundedRect(ctx, textStartX + 110, barY, 530, 7, 3.5);
  ctx.fill();
  ctx.restore();

  // 4. Draw Member Photo Box (Right Column) with Polaroid-style Thick White Border
  const photoX = 1200;
  const photoY = 240;
  const photoW = 430;
  const photoH = 580;
  const photoRadius = 28;
  const borderThickness = 12;

  ctx.save();
  // Outer soft drop shadow
  ctx.shadowColor = 'rgba(15, 61, 46, 0.14)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;

  // Draw Polaroid White Outer Frame
  drawRoundedRect(ctx, photoX, photoY, photoW, photoH, photoRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Fine dark green outer stroke
  ctx.strokeStyle = KOPSIM_COLORS.darkGreen;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Clip inside the polaroid border for photo
  ctx.shadowColor = 'transparent';
  const innerX = photoX + borderThickness;
  const innerY = photoY + borderThickness;
  const innerW = photoW - borderThickness * 2;
  const innerH = photoH - borderThickness * 2;
  const innerRadius = photoRadius - 8;

  drawRoundedRect(ctx, innerX, innerY, innerW, innerH, innerRadius);
  ctx.clip();

  if (options?.avatarImage && options.avatarImage.complete && options.avatarImage.naturalWidth > 0) {
    const img = options.avatarImage;
    // Cover photo fit with center crop
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const boxAspect = innerW / innerH;
    let sW = img.naturalWidth;
    let sH = img.naturalHeight;
    let sx = 0;
    let sy = 0;

    if (imgAspect > boxAspect) {
      sW = img.naturalHeight * boxAspect;
      sx = (img.naturalWidth - sW) / 2;
    } else {
      sH = img.naturalWidth / boxAspect;
      sy = (img.naturalHeight - sH) / 2;
    }

    ctx.drawImage(img, sx, sy, sW, sH, innerX, innerY, innerW, innerH);
  } else {
    // Elegant Avatar Placeholder
    const avBg = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerH);
    avBg.addColorStop(0, '#F4F7F5');
    avBg.addColorStop(1, '#E2EBE5');
    ctx.fillStyle = avBg;
    ctx.fillRect(innerX, innerY, innerW, innerH);

    ctx.fillStyle = KOPSIM_COLORS.darkGreen;
    ctx.beginPath();
    ctx.arc(innerX + innerW / 2, innerY + innerH * 0.40, 84, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(innerX + innerW / 2, innerY + innerH * 1.04, 155, Math.PI * 1.12, Math.PI * 1.88);
    ctx.fill();

    ctx.fillStyle = KOPSIM_COLORS.textMuted;
    ctx.font = '700 18px "Plus Jakarta Sans", "Inter", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAS FOTO RESMI', innerX + innerW / 2, innerY + innerH - 26);
  }
  ctx.restore();

  // 5. Data Rows Mapping (Left Column) - Crisp typography with auto-fitting long texts
  const { issueDateStr, validUntilStr, year: joinedYear } = formatIndonesianKTADates(member.registered_at);
  const statusDisplay = (member.status || 'ANGGOTA').toUpperCase();
  const fullWorkArea = (member.work_area || 'KOPERASI PUSAT').toUpperCase();

  const rowData = [
    {
      badgeType: 'user' as const,
      label: 'NOMOR ANGGOTA',
      value: member.member_no || 'KSIM-2026-000001',
      isPrimaryNumber: true,
    },
    {
      badgeType: 'user' as const,
      label: 'NAMA LENGKAP',
      value: (member.full_name || 'ANGGOTA KOPERASI').toUpperCase(),
      isName: true,
    },
    {
      badgeType: 'check' as const,
      label: 'STATUS',
      value: statusDisplay.includes('AKTIF') ? 'ANGGOTA' : statusDisplay,
    },
    {
      badgeType: 'building' as const,
      label: 'AREA / UNIT',
      value: fullWorkArea,
    },
    {
      badgeType: 'calendar' as const,
      label: 'TAHUN BERGABUNG',
      value: joinedYear,
    },
  ];

  const startY = 380;
  const rowGap = 108;
  const badgeCx = 160;
  const labelX = 210;
  const lineEndX = 970;
  const maxDataWidth = lineEndX - labelX - 10; // 750px max width

  rowData.forEach((item, index) => {
    const currentY = startY + index * rowGap;

    // Draw Circle Badge Icon
    drawIconBadge(ctx, badgeCx, currentY + 16, 26, item.badgeType);

    // Label Text (Dark Green Uppercase #1A5A43)
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = '700 18px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif';
    ctx.fillStyle = KOPSIM_COLORS.textLabel;
    ctx.fillText(item.label, labelX, currentY + 7);

    // Dynamic Value with Auto-Fit Font Size
    let baseFontSize = 31;
    if (item.isPrimaryNumber) {
      baseFontSize = 31;
    } else if (item.isName) {
      baseFontSize = 32;
    }

    ctx.font = `800 ${baseFontSize}px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif`;
    let measuredWidth = ctx.measureText(item.value).width;

    // Responsive Text Resizing: Scale font size if string exceeds max container width
    if (measuredWidth > maxDataWidth) {
      const scaleFactor = maxDataWidth / measuredWidth;
      const targetFontSize = Math.max(18, Math.floor(baseFontSize * scaleFactor));
      ctx.font = `800 ${targetFontSize}px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif`;
    }

    ctx.fillStyle = KOPSIM_COLORS.darkGreen;
    ctx.fillText(item.value, labelX, currentY + 41);

    // Gray Divider Line
    ctx.strokeStyle = KOPSIM_COLORS.divider;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(labelX, currentY + 56);
    ctx.lineTo(lineEndX, currentY + 56);
    ctx.stroke();
    ctx.restore();
  });

  // 6. Footer Row: TANGGAL TERBIT & BERLAKU SAMPAI
  const footerY = 975;

  // Tanggal Terbit
  drawIconBadge(ctx, badgeCx, footerY + 16, 24, 'calendar');
  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = '700 18px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif';
  ctx.fillStyle = KOPSIM_COLORS.textLabel;
  ctx.fillText('TANGGAL TERBIT', labelX, footerY + 7);

  ctx.font = '800 24px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif';
  ctx.fillStyle = KOPSIM_COLORS.darkGreen;
  ctx.fillText(issueDateStr, labelX, footerY + 39);
  ctx.restore();

  // Vertical Separator Line
  ctx.save();
  ctx.strokeStyle = KOPSIM_COLORS.divider;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(515, footerY - 8);
  ctx.lineTo(515, footerY + 46);
  ctx.stroke();
  ctx.restore();

  // Berlaku Sampai
  const footerCol2BadgeX = 560;
  const footerCol2TextX = 605;
  drawIconBadge(ctx, footerCol2BadgeX, footerY + 16, 24, 'shield-check');

  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = '700 18px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif';
  ctx.fillStyle = KOPSIM_COLORS.textLabel;
  ctx.fillText('BERLAKU SAMPAI', footerCol2TextX, footerY + 7);

  ctx.font = '800 24px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif';
  ctx.fillStyle = KOPSIM_COLORS.darkGreen;
  ctx.fillText(validUntilStr, footerCol2TextX, footerY + 39);
  ctx.restore();

  // 7. Dynamic QR Code Implementation (Right-Bottom under Photo)
  const memberCode = member.member_no || 'KSIM-2026-000001';
  const qrTargetUrl = `https://kopsimari.vercel.app/verify/member/${encodeURIComponent(memberCode)}`;
  const qrX = 1200;
  const qrY = 875;
  const qrSize = 205;

  try {
    const qrDataUrl = await QRCode.toDataURL(qrTargetUrl, {
      width: qrSize,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0B3D26', // Deep Green QR modules for brand synergy
        light: '#FFFFFF',
      },
    });

    const qrImage = new Image();
    await new Promise<void>((resolve) => {
      qrImage.onload = () => resolve();
      qrImage.onerror = () => resolve();
      qrImage.src = qrDataUrl;
    });

    if (qrImage.complete && qrImage.naturalWidth > 0) {
      // White container box for QR Code with subtle shadow and border
      ctx.save();
      drawRoundedRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(15, 61, 46, 0.1)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 6;
      ctx.fill();

      ctx.strokeStyle = KOPSIM_COLORS.darkGreen;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
    }
  } catch (qrErr) {
    console.error('QR code generation error:', qrErr);
  }

  // 8. Right Verification Labels (Only "SCAN UNTUK" and "VERIFIKASI ANGGOTA")
  const scanTextX = 1435;
  ctx.save();
  ctx.textAlign = 'left';

  // "SCAN UNTUK"
  ctx.font = '700 18px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif';
  ctx.fillStyle = KOPSIM_COLORS.textLabel;
  ctx.fillText('SCAN UNTUK', scanTextX, 948);

  // "VERIFIKASI ANGGOTA"
  ctx.font = '800 24px "Plus Jakarta Sans", "Inter", "Montserrat", Arial, sans-serif';
  ctx.fillStyle = KOPSIM_COLORS.darkGreen;
  ctx.fillText('VERIFIKASI ANGGOTA', scanTextX, 984);

  // Micro-security pill label
  ctx.fillStyle = KOPSIM_COLORS.gold;
  drawRoundedRect(ctx, scanTextX, 1002, 170, 22, 11);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 11px "Plus Jakarta Sans", "Inter", sans-serif';
  ctx.fillText('ENKRIPSI KOPSIM RESMI', scanTextX + 10, 1017);

  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.98);
}

/**
 * Generate Printable PDF for KTA Card (Standard CR80 85.6mm x 53.98mm)
 */
export async function exportKTAToPDF(
  canvas: HTMLCanvasElement,
  member: KTAMemberData
): Promise<void> {
  const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
  
  // Standard CR-80 card landscape: 85.6mm x 53.98mm
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85.6, 53.98], // ISO ID-1 CR-80 standard
  });

  pdf.addImage(dataUrl, 'JPEG', 0, 0, 85.6, 53.98, undefined, 'FAST');
  
  const safeName = (member.full_name || 'Anggota').trim().replace(/\s+/g, '_');
  const safeId = (member.member_no || 'NRA').trim().replace(/\s+/g, '_');
  pdf.save(`KTA_KOPSIM_${safeName}_${safeId}.pdf`);
}

/**
 * Download High-Res JPG/PNG Image of KTA (2026 x 1276 px)
 */
export function exportKTAToImage(
  canvas: HTMLCanvasElement,
  member: KTAMemberData,
  format: 'jpg' | 'png' = 'jpg'
): void {
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(mime, 0.98);
  const safeName = (member.full_name || 'Anggota').trim().replace(/\s+/g, '_');
  const safeId = (member.member_no || 'NRA').trim().replace(/\s+/g, '_');

  const link = document.createElement('a');
  link.download = `KTA_KOPSIM_${safeName}_${safeId}.${format}`;
  link.href = dataUrl;
  link.click();
}

/**
 * Download Master Blanko Template Only (Kosong - 2026 x 1276 px)
 */
export function exportMasterBlankoTemplateImage(
  canvas: HTMLCanvasElement,
  format: 'jpg' | 'png' = 'jpg'
): void {
  renderMasterBlankoTemplate(canvas);
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(mime, 0.98);

  const link = document.createElement('a');
  link.download = `KTA_MASTER_BLANKO_KOPSIM_2026x1276.${format}`;
  link.href = dataUrl;
  link.click();
}

