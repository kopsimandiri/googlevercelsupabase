export function formatRupiah(amount: number | string | null | undefined): string {
  if (amount === undefined || amount === null) return 'Rp 0';
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : amount;
  if (isNaN(num)) return 'Rp 0';
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

export function cleanRupiah(value: any): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[Rp\s.,]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export function formatDateIndo(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateInput);
  }
}

export function formatDateTimeIndo(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateInput);
  }
}

export function normalizeNik(nik?: string | null): string {
  if (!nik) return '';
  return nik.replace(/\D/g, '').slice(0, 16);
}

export function isValidNik(nik?: string | null): boolean {
  if (!nik) return false;
  const clean = normalizeNik(nik);
  return /^\d{16}$/.test(clean);
}

export function maskNik(nik?: string | null): string {
  if (!nik) return '3171************';
  const clean = normalizeNik(nik) || nik.replace(/\s+/g, '');
  if (clean.length < 6) return clean + '************'.slice(0, Math.max(0, 16 - clean.length));
  const firstFour = clean.substring(0, 4);
  const lastTwo = clean.slice(-2);
  return `${firstFour}${'*'.repeat(Math.max(0, clean.length - 6))}${lastTwo}`;
}

export function normalizeImageUrl(url?: string | null): string {
  if (!url) return '';
  // Convert Windows backslashes to forward slashes
  let clean = url.trim().replace(/\\/g, '/');
  
  // Handle data URIs and absolute web URLs directly
  if (clean.startsWith('data:') || clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  // Remove leading /public/ or public/
  if (clean.startsWith('/public/')) {
    clean = clean.replace(/^\/public\//, '/');
  } else if (clean.startsWith('public/')) {
    clean = clean.replace(/^public\//, '/');
  }

  // Ensure single leading slash for relative web assets
  if (!clean.startsWith('/')) {
    clean = '/' + clean;
  }

  return clean;
}
