import React from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { NewsArticle, NEWS_CATEGORIES } from '../../types/news';
import { formatDateIndo, normalizeImageUrl } from '../../utils/formatters';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  FolderGit2,
  Share2,
  ExternalLink,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

interface NewsDetailViewProps {
  article: NewsArticle;
  onBack: () => void;
  onNavigatePortfolio?: (projectId?: string) => void;
}

export const NewsDetailView: React.FC<NewsDetailViewProps> = ({
  article,
  onBack,
  onNavigatePortfolio,
}) => {
  const { showToast } = useNotification();
  const catMeta = NEWS_CATEGORIES[article.kategori] || NEWS_CATEGORIES.kemitraan;

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Tautan artikel disalin ke clipboard.', 'success');
    }
  };

  // Format content paragraphs and handle blockquotes
  const paragraphs = article.konten.split('\n\n').filter((p) => p.trim().length > 0);

  return (
    <article className="max-w-4xl mx-auto space-y-6" id="news-detail-root">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Kembali ke Daftar Berita
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          leftIcon={<Share2 className="w-4 h-4 text-stone-500" />}
        >
          Bagikan
        </Button>
      </div>

      {/* Main Article Container */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Large Hero Image */}
        {article.foto_url && (
          <div className="relative w-full h-72 sm:h-96 bg-stone-900 overflow-hidden">
            <img
              src={normalizeImageUrl(article.foto_url)}
              alt={article.judul}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  '/assets/portfolio/perikanan-ikan-layang-ambon.jpg';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-6 right-6">
              <span className={`px-3 py-1 rounded-lg text-xs font-bold shadow-md ${catMeta.badgeClass}`}>
                {catMeta.label}
              </span>
            </div>
          </div>
        )}

        {/* Article Body Content */}
        <div className="p-6 sm:p-10 space-y-8">
          {/* Metadata Header */}
          <div className="space-y-3 pb-6 border-b border-stone-100">
            {!article.foto_url && (
              <span className={`px-3 py-1 rounded-lg text-xs font-bold inline-block ${catMeta.badgeClass}`}>
                {catMeta.label}
              </span>
            )}

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-stone-900 leading-tight">
              {article.judul}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 pt-1">
              <span className="flex items-center gap-1.5 font-mono">
                <Calendar className="w-4 h-4 text-emerald-800" />
                {formatDateIndo(article.tanggal)}
              </span>

              {article.lokasi && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-800" />
                  {article.lokasi}
                </span>
              )}

              {article.project_id && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                  <FolderGit2 className="w-3.5 h-3.5" />
                  Proyek: {article.project_id}
                </span>
              )}
            </div>
          </div>

          {/* Lead Summary (Highlighted Box) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/5 border-l-4 border-l-emerald-800 text-stone-800 text-sm sm:text-base font-medium leading-relaxed italic">
            "{article.ringkasan}"
          </div>

          {/* Formatted Content Paragraphs */}
          <div className="space-y-5 text-sm sm:text-base text-stone-700 leading-relaxed font-sans">
            {paragraphs.map((p, index) => {
              const isQuote = p.trim().startsWith('"') || p.trim().startsWith('“');

              if (isQuote) {
                return (
                  <blockquote
                    key={index}
                    className="p-5 my-4 rounded-xl bg-amber-500/10 border-l-4 border-l-amber-600 text-stone-900 font-serif text-base italic leading-relaxed"
                  >
                    {p}
                  </blockquote>
                );
              }

              return (
                <p key={index} className="leading-relaxed">
                  {p}
                </p>
              );
            })}
          </div>

          {/* Related Project Callout (If project_id exists) */}
          {article.project_id && (
            <div className="p-6 bg-gradient-to-r from-teal-950 via-teal-900 to-emerald-900 rounded-2xl text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[11px] text-teal-200 font-mono font-bold uppercase tracking-wider block">
                  UNIT USAHA TERKAIT
                </span>
                <h4 className="text-base font-bold font-serif text-amber-300">
                  {article.project_id === 'perikanan-ambon'
                    ? 'Proyek Perikanan Tangkap & Rantai Dingin Ambon'
                    : article.project_id === 'pertanian-tapioka'
                    ? 'Proyek Pertanian Terpadu & Industri Tapioka'
                    : `Unit Usaha Sektor Riil: ${article.project_id}`}
                </h4>
                <p className="text-xs text-teal-100 max-w-xl">
                  Pelajari rantai pasok, komoditas panen, dan skema kemitraan nelayan/petani binaan KOPSIM Mandiri.
                </p>
              </div>

              <Button
                variant="gold"
                size="sm"
                onClick={() => onNavigatePortfolio && onNavigatePortfolio(article.project_id || undefined)}
                className="shrink-0 shadow-xs"
                rightIcon={<ExternalLink className="w-4 h-4" />}
              >
                Lihat Proyek Terkait
              </Button>
            </div>
          )}

          {/* Koperasi Commitment Footer Notice */}
          <div className="pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Diterbitkan resmi oleh Pengurus Koperasi Syarikat Islam Mandiri</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Kembali ke Indeks Berita
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};
