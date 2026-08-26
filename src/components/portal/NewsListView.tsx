import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { newsService } from '../../services/newsService';
import { NewsArticle, NewsCategory, NEWS_CATEGORIES } from '../../types/news';
import { formatDateIndo } from '../../utils/formatters';
import {
  Newspaper,
  Calendar,
  MapPin,
  ArrowRight,
  Search,
  FolderGit2,
  Filter,
  Sparkles,
  RefreshCw,
  Clock,
  Compass,
} from 'lucide-react';

interface NewsListViewProps {
  onSelectArticle: (article: NewsArticle) => void;
  onNavigatePortfolio?: () => void;
}

export const NewsListView: React.FC<NewsListViewProps> = ({
  onSelectArticle,
  onNavigatePortfolio,
}) => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    let isMounted = true;
    async function loadNews() {
      setIsLoading(true);
      try {
        const data = await newsService.getPublishedArticles();
        if (isMounted) {
          setArticles(data);
        }
      } catch (err) {
        console.warn('Failed to load published articles:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadNews();
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = articles.filter((art) => {
    const matchCat =
      selectedCategory === 'ALL' || art.kategori === selectedCategory;
    const matchSearch =
      art.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.ringkasan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (art.lokasi && art.lokasi.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-8" id="news-list-view-root">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 rounded-2xl text-white shadow-md border border-emerald-800">
        <div className="max-w-2xl space-y-2">
          <Badge variant="gold" size="sm">
            WARTA & KABAR TERKINI
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-amber-300">
            Kanal Berita & Perkembangan Sektor Riil
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Menyajikan informasi resmi seputar kemitraan strategis, program pendampingan petani & nelayan, dampak sosial ekonomi, dan laporan perkembangan proyek investasi KOPSIM Mandiri.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
        {/* Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Semua Berita
          </button>

          {(['kemitraan', 'program', 'dampak', 'update_proyek'] as NewsCategory[]).map(
            (cat) => {
              const meta = NEWS_CATEGORIES[cat];
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {meta.label}
                </button>
              );
            }
          )}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari berita..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
        </div>
      </div>

      {/* News Article Grid */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-stone-200">
          <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin mx-auto mb-2" />
          <p className="text-xs text-stone-600 font-medium">Memuat warta berita...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 space-y-3">
          <Newspaper className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="text-sm sm:text-base font-bold text-stone-800 font-serif">
            Belum Ada Artikel yang Diterbitkan
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
            Artikel berita saat ini masih berada dalam tahap penyusunan dan verifikasi fakta asli (draft) di ruang CMS admin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((art) => {
            const catMeta = NEWS_CATEGORIES[art.kategori] || NEWS_CATEGORIES.kemitraan;
            return (
              <div
                key={art.id}
                onClick={() => onSelectArticle(art)}
                className="group flex flex-col bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs hover:shadow-md hover:border-emerald-700 transition-all cursor-pointer"
              >
                {/* Thumbnail Image */}
                <div className="relative h-48 bg-stone-100 overflow-hidden">
                  {art.foto_url ? (
                    <img
                      src={art.foto_url}
                      alt={art.judul}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-950 to-emerald-800 text-emerald-300">
                      <Newspaper className="w-10 h-10 opacity-60" />
                    </div>
                  )}

                  {/* Category Badge on Photo */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-xs backdrop-blur-xs ${catMeta.badgeClass}`}
                    >
                      {catMeta.label}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-[11px] text-stone-400">
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

                    <h3 className="text-sm font-bold text-stone-900 font-serif leading-snug group-hover:text-emerald-800 transition-colors line-clamp-2">
                      {art.judul}
                    </h3>

                    <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                      {art.ringkasan}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-emerald-800 font-bold">
                    <span>Baca Selengkapnya</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
