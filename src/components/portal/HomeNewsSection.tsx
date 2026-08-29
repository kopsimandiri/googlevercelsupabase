import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { OptimizedImage } from '../common/OptimizedImage';
import { newsService } from '../../services/newsService';
import { NewsArticle, NEWS_CATEGORIES } from '../../types/news';
import { formatDateIndo, normalizeImageUrl } from '../../utils/formatters';
import {
  Newspaper,
  Calendar,
  MapPin,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface HomeNewsSectionProps {
  onNavigateNewsList: () => void;
  onSelectArticle: (article: NewsArticle) => void;
}

export const HomeNewsSection: React.FC<HomeNewsSectionProps> = ({
  onNavigateNewsList,
  onSelectArticle,
}) => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadLatestNews() {
      try {
        const data = await newsService.getPublishedArticles();
        if (isMounted) {
          setArticles(data.slice(0, 3));
        }
      } catch (err) {
        console.warn('Failed to fetch home latest news:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadLatestNews();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="space-y-4" id="home-news-section">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-accent-gold font-mono uppercase tracking-wider">
              KABAR KOPSIM MANDIRI
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-stone-900 font-serif">
            Warta & Perkembangan Sektor Riil Terbaru
          </h3>
          <p className="text-xs text-stone-500">
            Laporan kemitraan strategis, pendampingan petani & nelayan, serta update kemajuan proyek
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onNavigateNewsList}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="shrink-0 text-emerald-900 border-emerald-700 hover:bg-emerald-50"
        >
          Lihat Semua Berita
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 bg-stone-100 rounded-2xl animate-pulse border border-stone-200"
            />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 shrink-0">
              <Newspaper className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-stone-900 font-serif">
                Kanal Berita & Warta Sektor Riil
              </h4>
              <p className="text-[11px] text-stone-500 max-w-lg">
                Publikasi artikel sedang dalam proses verifikasi fakta di ruang CMS admin. Kunjungi kanal berita untuk membaca arsip publik.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateNewsList}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Buka Kanal Berita
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {articles.map((art) => {
            const catMeta = NEWS_CATEGORIES[art.kategori] || NEWS_CATEGORIES.kemitraan;
            return (
              <div
                key={art.id}
                onClick={() => onSelectArticle(art)}
                className="group flex flex-col bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs hover:shadow-md hover:border-emerald-700 transition-all cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="relative h-44 bg-stone-100 overflow-hidden">
                  {art.foto_url ? (
                    <OptimizedImage
                      src={normalizeImageUrl(art.foto_url)}
                      alt={art.judul}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-950 to-emerald-800 text-emerald-300">
                      <Newspaper className="w-8 h-8 opacity-60" />
                    </div>
                  )}

                  <div className="absolute top-2.5 left-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold shadow-xs backdrop-blur-xs ${catMeta.badgeClass}`}
                    >
                      {catMeta.label}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[10px] text-stone-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        {formatDateIndo(art.tanggal)}
                      </span>
                      {art.lokasi && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                          {art.lokasi}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-stone-900 font-serif leading-snug group-hover:text-emerald-800 transition-colors line-clamp-2">
                      {art.judul}
                    </h4>

                    <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                      {art.ringkasan}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-emerald-800 font-bold">
                    <span>Baca Selengkapnya</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
