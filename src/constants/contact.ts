export const ADMIN_WHATSAPP_DISPLAY = '082148988520';
export const ADMIN_WHATSAPP_FORMATTED = '0821-4898-8520';
export const ADMIN_WHATSAPP_INTERNATIONAL = '6282148988520';
export const ADMIN_OFFICE_PHONE = '021 - 23599354';
export const ADMIN_EMAIL = 'koperasi.simandiri@gmail.com';
export const ADMIN_ADDRESS = 'Jl. Taman Amir Hamzah No.6A Pegangsaan, Kec. Menteng, Jakarta Pusat';

/**
 * Mengonversi nomor WhatsApp lokal (08xxx) atau campuran karakter menjadi format internasional 628xxx
 */
export function formatWhatsAppInternational(phoneNumber: string = ADMIN_WHATSAPP_DISPLAY): string {
  const cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');
  if (!cleanPhone) return ADMIN_WHATSAPP_INTERNATIONAL;
  if (cleanPhone.startsWith('0')) {
    return `62${cleanPhone.slice(1)}`;
  }
  if (cleanPhone.startsWith('62')) {
    return cleanPhone;
  }
  return `62${cleanPhone}`;
}

/**
 * Membentuk URL wa.me resmi dengan pesan pembuka ter-encode aman
 */
export function buildAdminWhatsAppUrl(
  message: string = "Assalamu'alaikum Admin KOPSIM Mandiri, saya ingin bertanya seputar layanan koperasi.",
  phoneNumber: string = ADMIN_WHATSAPP_DISPLAY
): string {
  const internationalPhone = formatWhatsAppInternational(phoneNumber);
  const encodedMessage = encodeURIComponent((message || '').trim());
  return encodedMessage
    ? `https://wa.me/${internationalPhone}?text=${encodedMessage}`
    : `https://wa.me/${internationalPhone}`;
}
