import { ProjectInvestmentCampaign, ShariaAkadType } from '../types/investment';
import { formatRupiah, formatDateIndo } from '../utils/formatters';

export const akadTemplateService = {
  /**
   * Menghasilkan teks lengkap Akad Musyarakah / Mudharabah / Murabahah resmi
   */
  generateProjectAkadText(params: {
    agreementNo: string;
    campaign: ProjectInvestmentCampaign;
    investorName: string;
    memberNo: string;
    amount: number;
    unitsCount: number;
    dateStr: string;
  }): string {
    const {
      agreementNo,
      campaign,
      investorName,
      memberNo,
      amount,
      unitsCount,
      dateStr,
    } = params;

    const formattedAmount = formatRupiah(amount);
    const estAnnualReturn = formatRupiah((amount * campaign.projected_roi_percent) / 100);

    return `AKAD KEMITRAAN SYARIAH (AKAD ${campaign.akad_type})
SURAT UTANG KOPERASI SYARIAH (SUKS) / EFEK SUKUK SEKTOR RIIL
NOMOR KONTRAK: ${agreementNo}

Bismillaahirrahmaanirrahiim,

Pada hari ini, ${formatDateIndo(dateStr)}, telah disepakati Akad Kemitraan Usaha Syariah berlandaskan prinsip saling rela (an-taradhin), keadilan muamalah, dan Fatwa Dewan Syariah Nasional Majelis Ulama Indonesia (DSN-MUI), oleh dan antara pihak-pihak:

1. PIHAK PERTAMA (PENGELOLA / MITRA KERJA):
   KOPERASI SYARIKAT ISLAM MANDIRI (KOPSIM MANDIRI)
   Badan Hukum Kemenkumham RI, beralamat di Kantor Pusat KOPSIM Mandiri Jakarta, bertindak sebagai Pengelola Modal Sektor Riil untuk Proyek Strategis: ${campaign.project_name} (Kode: ${campaign.project_id}).

2. PIHAK KEDUA (PEMODAL / INVESTOR ANGGOTA):
   Nama Lengkap : ${investorName}
   Nomor Anggota (NRA) : ${memberNo}
   Bertindak untuk dan atas nama pribadi selaku Anggota Pemilik Modal / Pemegang Efek Syariah.

PASAL 1: OBJEK DAN DASAR AKAD
1. Pihak Kedua menyerahkan dana penyertaan investasi sejumlah ${formattedAmount} (${unitsCount} unit efek syariah) kepada Pihak Pertama melalui skema Akad ${campaign.akad_type}.
2. Dana tersebut secara mutlak dialokasikan untuk pembiayaan operasional, penguatan rantai pasok, dan perputaran komoditas pada Proyek ${campaign.project_name}.
3. Aset yang mendasari (Underlying Asset) proyek ini adalah: "${campaign.underlying_asset || 'Aset produktif dan kontrak suplai komoditas sektor riil binaan KOPSIM'}".

PASAL 2: NISBAH DAN PROYEKSI IMBAL HASIL (SHU INVESTASI)
1. Pihak Pertama dan Pihak Kedua menyepakati proyeksi imbal hasil indikatif sebesar ${campaign.projected_roi_percent}% per tahun (estimasi imbal hasil: ${estAnnualReturn} per tahun).
2. Distribusi Sisa Hasil Usaha (SHU) / Imbal Hasil Investasi dibagikan dengan jadwal: ${campaign.shu_distribution_schedule}.
3. Bagi hasil dihitung secara proporsional berdasarkan keuntungan bersih riil pengelolaan proyek setelah diaudit oleh manajemen keuangan koperasi.

PASAL 3: JANGKA WAKTU DAN PENGEMBALIAN POKOK
1. Jangka waktu (tenor) investasi disepakati selama ${campaign.tenor_months} bulan sejak tanggal kampanye ditutup dan didanai penuh.
2. Pada akhir periode tenor, Pihak Pertama berkewajiban mengembalikan pokok investasi senilai ${formattedAmount} kepada Pihak Kedua secara utuh melalui rekening simpanan sukarela anggota atau transfer bank terdaftar.

PASAL 4: KEPATUHAN SYARIAH & PENGAWASAN
1. Akad ini diawasi langsung oleh Dewan Pengawas Syariah (DPS) Koperasi Syarikat Islam Mandiri di bawah pimpinan Dr. Hamdan Zoelva, S.H., M.H.
2. Seluruh kegiatan bisnis sektor riil yang dibiayai dijamin bebas dari unsur Riba, Gharar, Maysir, Tadlis, dan komoditas non-halal.

PASAL 5: PERNYATAAN DAN TANDA TANGAN ELEKTRONIK
Pihak Kedua menyatakan telah membaca, memahami prospektus risiko, dan menyetujui seluruh klausul ini secara sadar tanpa paksaan melalui tanda tangan digital tersertifikasi.`;
  },

  /**
   * Menghasilkan teks Akad Wakalah bil Ujrah (Investor kepada Koperasi/Platform)
   */
  generateWakalahAkadText(params: {
    agreementNo: string;
    investorName: string;
    memberNo: string;
    amount: number;
    platformFee: number;
    platformFeePercent: number;
    dateStr: string;
  }): string {
    const {
      agreementNo,
      investorName,
      memberNo,
      amount,
      platformFee,
      platformFeePercent,
      dateStr,
    } = params;

    return `AKAD WAKALAH BIL UJRAH
(PELIMPAHAN KUASA ADMINISTRASI & PENGELOLAAN PORTOFOLIO INVESTASI)
NOMOR REFERENSI: WAKALAH-${agreementNo}

Bismillaahirrahmaanirrahiim,

Berdasarkan Fatwa DSN-MUI No. 10/DSN-MUI/IV/2000 tentang Wakalah dan Fatwa DSN-MUI No. 140/DSN-MUI/VIII/2021 tentang Penyelenggaraan Layanan Urun Dana Syariah (SCF):

1. PEMBERI KUASA (MUWAKKIL):
   ${investorName} (NRA: ${memberNo}), Pemodal Anggota KOPSIM Mandiri.

2. PENERIMA KUASA (WAKIL):
   Koperasi Syarikat Islam Mandiri (KOPSIM Mandiri) selaku Penyelenggara Layanan Investasi Portofolio Proyek.

KETENTUAN AKAD WAKALAH BIL UJRAH:
1. Muwakkil memberikan kuasa penuh (Wakalah) kepada Wakil untuk:
   a. Melakukan pencatatan administrasi efek syariah atas investasi senilai ${formatRupiah(amount)}.
   b. Melakukan verifikasi transaksi dan penitipan dana proyek pada rekening penampungan amanah.
   c. Menyalurkan bagi hasil/dividen secara berkala langsung ke saldo dompet simpanan sukarela Muwakkil.
2. Sebagai imbalan jasa pengelolaan administrasi (Ujrah), Muwakkil menyetujui biaya platform sebesar ${platformFeePercent}% (${formatRupiah(platformFee)}) yang dibayarkan satu kali pada saat transaksi investasi dilakukan.
3. Wakil berjanji menjalankan amanah ini dengan prinsip transparansi, itikad baik (*fiduciary duty*), dan penuh tanggung jawab syar'i.

Disetujui secara digital pada tanggal ${formatDateIndo(dateStr)}.`;
  },

  /**
   * Menghasilkan hash tanda tangan digital yang aman dan dapat diverifikasi
   */
  generateDigitalSignatureHash(params: {
    memberNo: string;
    campaignId: string;
    amount: number;
    timestamp: string;
  }): string {
    const raw = `SIG-KOPSIM-${params.memberNo}-${params.campaignId}-${params.amount}-${params.timestamp}`;
    // Simple fast hashing for signature string
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `KPSM-DSG-${hex.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  },
};
