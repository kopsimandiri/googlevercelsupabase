import { useState, useEffect, useCallback } from 'react';
import { newsService } from '../services/newsService';
import { NewsArticle } from '../types/news';

export function useNews() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [allArticles, setAllArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [published, all] = await Promise.all([
        newsService.getPublishedArticles(),
        newsService.getAllArticles(),
      ]);
      setArticles(published);
      setAllArticles(all);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat berita koperasi');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const createArticle = async (article: Omit<NewsArticle, 'id' | 'created_at'>) => {
    const res = await newsService.createArticle(article);
    await fetchArticles();
    return res;
  };

  const updateArticle = async (id: string, updates: Partial<NewsArticle>) => {
    const res = await newsService.updateArticle(id, updates);
    await fetchArticles();
    return res;
  };

  const deleteArticle = async (id: string) => {
    const res = await newsService.deleteArticle(id);
    await fetchArticles();
    return res;
  };

  return {
    articles,
    allArticles,
    isLoading,
    error,
    refresh: fetchArticles,
    createArticle,
    updateArticle,
    deleteArticle,
  };
}
