import { Report, ReportStatus } from "../types";

// Public-facing short link for the portal (redirects to production), used
// in all outbound WhatsApp messages instead of the raw origin.
export const PORTAL_LINK = "https://uii.id/LaporFTI";

/**
 * Clean phone number to international WhatsApp format (e.g. 0812... -> 62812...)
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Generate WhatsApp confirmation link when student submits a new report
 */
export function generateWhatsAppReportConfirmationLink(report: Report): string {
  const phone = formatPhoneNumber(report.reporterWhatsapp || "");
  const appUrl = PORTAL_LINK;

  const text = `*KONFIRMASI LAPORAN - LAPOR FTI FTI UII* 🏛️\n\n` +
    `Halo *${report.reporterName || "Mahasiswa FTI"}*,\n` +
    `Laporan aduan/aspirasi Anda telah berhasil terdaftar dalam sistem.\n\n` +
    `📌 *Kode Tiket:* \`${report.id}\`\n` +
    `📝 *Judul:* ${report.title}\n` +
    `📂 *Kategori:* ${report.category}\n` +
    `⏱️ *Status Saat Ini:* ${report.status}\n\n` +
    `Anda dapat memantau perkembangan penanganan laporan kapan saja melalui tautan portal:\n` +
    `🔗 ${appUrl}\n\n` +
    `_Terima kasih atas partisipasi Anda dalam menjaga kualitas layanan FTI UII._`;

  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Generate WhatsApp notification link when staff updates status
 */
export function generateWhatsAppStatusUpdateLink(
  report: Report,
  newStatus: ReportStatus,
  note: string
): string {
  const phone = formatPhoneNumber(report.reporterWhatsapp || "");
  const appUrl = PORTAL_LINK;

  const text = `*UPDATE STATUS ADUAN - LAPOR FTI FTI UII* 🔔\n\n` +
    `Yth. *${report.reporterName || "Pelapor"}*,\n` +
    `Pengaduan Anda dengan kode tiket *${report.id}* telah ditindaklanjuti oleh Dekanat/Staf FTI UII.\n\n` +
    `📋 *Judul Laporan:* ${report.title}\n` +
    `📊 *Status Terbaru:* *${newStatus.toUpperCase()}*\n` +
    `💬 *Catatan Tindak Lanjut:* "${note || "Status laporan telah diperbarui."}"\n\n` +
    `Lacak linimasa selengkapnya di portal Lapor FTI:\n` +
    `🔗 ${appUrl}\n\n` +
    `_Lapor FTI • Fakultas Teknologi Industri Universitas Islam Indonesia_`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * Generate WhatsApp notification link when staff sends a direct message/reply
 */
export function generateWhatsAppStaffReplyLink(
  report: Report,
  replyText: string,
  staffName: string = "Staf FTI"
): string {
  const phone = formatPhoneNumber(report.reporterWhatsapp || "");
  const appUrl = PORTAL_LINK;

  const text = `*BALASAN RESMI STAF - LAPOR FTI FTI UII* 💬\n\n` +
    `Halo *${report.reporterName || "Pelapor"}*,\n` +
    `Terdapat balasan resmi dari *${staffName}* terkait pengaduan tiket *${report.id}*:\n\n` +
    `"${replyText}"\n\n` +
    `Lihat rincian & kirim balasan melalui portal Lapor FTI:\n` +
    `🔗 ${appUrl}\n\n` +
    `_Lapor FTI FTI UII_`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
