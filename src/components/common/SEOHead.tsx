import React, { useEffect } from 'react';
import { ActivePage } from '../../types/navigation';
import { NewsArticle } from '../../types/news';

interface SEOHeadProps {
  activePage: ActivePage;
  article?: NewsArticle | null;
}

interface MetaInfo {
  title: string;
  description: string;
  keywords: string;
  canonicalPath: string;
  ogType: string;
  image: string;
}

const BASE_URL = 'https://kopsimmandiri.id';
const DEFAULT_IMAGE = `${BASE_URL}/assets/logo-kopsim.png`;

export const SEOHead: React.FC<SEOHeadProps> = ({ activePage, article }) => {
  useEffect(() => {
    let meta: MetaInfo = {
      title: 'KOPSIM MANDIRI — Koperasi Syarikat Islam Mandiri',
      description:
        'Koperasi Syarikat Islam Mandiri (KOPSIM Mandiri): Platform koperasi modern berbasis kemandirian ekonomi umat dan ekosistem sektor riil terintegrasi (pertanian, perikanan, industri hilir).',
      keywords:
        'koperasi syarikat islam mandiri, kopsim mandiri, koperasi syariah, sektor riil, komoditas pangan, perikanan ambon, tepung tapioka cianjur',
      canonicalPath: '/',
      ogType: 'website',
      image: DEFAULT_IMAGE,
    };

    if (article) {
      meta = {
        title: `${article.judul} — Warta KOPSIM MANDIRI`,
        description: article.ringkasan || article.judul,
        keywords: `berita koperasi, ${article.kategori}, ${article.lokasi || ''}, kopsim mandiri, sektor riil`,
        canonicalPath: `/berita/${article.slug || article.id}`,
        ogType: 'article',
        image: article.foto_url ? (article.foto_url.startsWith('http') ? article.foto_url : `${BASE_URL}${article.foto_url}`) : DEFAULT_IMAGE,
      };
    } else {
      switch (activePage) {
        case 'TEAM':
          meta = {
            title: 'Tentang & Dewan Pengawas — KOPSIM MANDIRI',
            description:
              'Struktur kepengurusan dan Dewan Pengawas Syariah Koperasi Syarikat Islam Mandiri dipimpin oleh Dr. Hamdan Zoelva, S.H., M.H.',
            keywords: 'dewan pengawas syariah, pengurus koperasi, hamdan zoelva, sejarah kopsim mandiri',
            canonicalPath: '/tentang',
            ogType: 'website',
            image: `${BASE_URL}/assets/hamdan.jpg`,
          };
          break;
        case 'NEWS_LIST':
          meta = {
            title: 'Kabar & Warta Sektor Riil — KOPSIM MANDIRI',
            description:
              'Kanal warta resmi Koperasi Syarikat Islam Mandiri: publikasi kemitraan pangan, hilirisasi industri tapioka, dan ekspedisi perikanan.',
            keywords: 'warta kopsim, berita koperasi, kemitraan tani nelayan, hilirisasi komoditas',
            canonicalPath: '/berita',
            ogType: 'website',
            image: DEFAULT_IMAGE,
          };
          break;
        case 'PORTOFOLIO':
          meta = {
            title: 'Katalog Komoditas & Portofolio Sektor Riil — KOPSIM MANDIRI',
            description:
              'Ekosistem portofolio sektor riil KOPSIM Mandiri: Lahan Jagung & Cabe, Panen Singkong, Tepung Tapioka Cianjur, serta Ikan Layang & Tuna Ambon.',
            keywords: 'portofolio sektor riil, komoditas kopsim, ikan layang ambon, tuna sirip kuning, tepung tapioka cianjur',
            canonicalPath: '/proyek',
            ogType: 'website',
            image: `${BASE_URL}/assets/portfolio/perikanan-ikan-layang-ambon.jpg`,
          };
          break;
        case 'MEMBER_PORTAL':
        case 'SIMPANAN':
          meta = {
            title: 'Portal Anggota — KOPSIM MANDIRI',
            description: 'Layanan terpadu buku simpanan anggota, Kartu Tanda Anggota (KTA) digital, dan riwayat mutasi resmi.',
            keywords: 'portal anggota koperasi, simpanan pokok, simpanan wajib, kta digital kopsim',
            canonicalPath: '/portal/dashboard',
            ogType: 'website',
            image: DEFAULT_IMAGE,
          };
          break;
        case 'REPORTS_DASHBOARD':
        case 'MEMBERSHIP':
        case 'TRANSACTIONS':
        case 'REPORTS_KEUANGAN':
        case 'PROJECT':
        case 'DATABASE_AUDIT':
          meta = {
            title: 'Internal Management — KOPSIM MANDIRI',
            description: 'Sistem Operasional Akuntansi dan Manajemen Internal Koperasi Syarikat Islam Mandiri.',
            keywords: 'sistem akuntansi koperasi, buku transaksi 20 kolom, neraca shu',
            canonicalPath: '/admin',
            ogType: 'website',
            image: DEFAULT_IMAGE,
          };
          break;
      }
    }

    // 1. Update Title
    document.title = meta.title;

    // Helper function to update meta tags
    const updateMetaTag = (selector: string, attr: string, value: string, createSelector?: string) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el && createSelector) {
        el = document.createElement('meta');
        if (createSelector.startsWith('name=')) {
          el.setAttribute('name', createSelector.replace('name=', ''));
        } else if (createSelector.startsWith('property=')) {
          el.setAttribute('property', createSelector.replace('property=', ''));
        }
        document.head.appendChild(el);
      }
      if (el) {
        el.setAttribute(attr, value);
      }
    };

    // Helper function for link tags
    const updateLinkTag = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    // 2. Meta description & keywords
    updateMetaTag('meta[name="description"]', 'content', meta.description, 'name=description');
    updateMetaTag('meta[name="keywords"]', 'content', meta.keywords, 'name=keywords');

    // 3. Canonical URL
    updateLinkTag('canonical', `${BASE_URL}${meta.canonicalPath}`);

    // 4. Open Graph Tags
    updateMetaTag('meta[property="og:title"]', 'content', meta.title, 'property=og:title');
    updateMetaTag('meta[property="og:description"]', 'content', meta.description, 'property=og:description');
    updateMetaTag('meta[property="og:url"]', 'content', `${BASE_URL}${meta.canonicalPath}`, 'property=og:url');
    updateMetaTag('meta[property="og:type"]', 'content', meta.ogType, 'property=og:type');
    updateMetaTag('meta[property="og:image"]', 'content', meta.image, 'property=og:image');
    updateMetaTag('meta[property="og:site_name"]', 'content', 'KOPSIM MANDIRI', 'property=og:site_name');
    updateMetaTag('meta[property="og:locale"]', 'content', 'id_ID', 'property=og:locale');

    // 5. Twitter Card Tags
    updateMetaTag('meta[name="twitter:card"]', 'content', 'summary_large_image', 'name=twitter:card');
    updateMetaTag('meta[name="twitter:title"]', 'content', meta.title, 'name=twitter:title');
    updateMetaTag('meta[name="twitter:description"]', 'content', meta.description, 'name=twitter:description');
    updateMetaTag('meta[name="twitter:image"]', 'content', meta.image, 'name=twitter:image');

    // 6. JSON-LD Structured Data
    const existingJsonLd = document.getElementById('kopsim-schema-jsonld');
    if (existingJsonLd) {
      existingJsonLd.remove();
    }

    const jsonLdScript = document.createElement('script');
    jsonLdScript.id = 'kopsim-schema-jsonld';
    jsonLdScript.type = 'application/ld+json';

    let schemaData: any;

    if (article) {
      schemaData = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.judul,
        description: article.ringkasan,
        image: [meta.image],
        datePublished: article.tanggal,
        dateModified: article.tanggal,
        author: {
          '@type': 'Organization',
          name: 'Redaksi KOPSIM Mandiri',
          url: BASE_URL,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Koperasi Syarikat Islam Mandiri',
          logo: {
            '@type': 'ImageObject',
            url: DEFAULT_IMAGE,
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${BASE_URL}${meta.canonicalPath}`,
        },
      };
    } else {
      schemaData = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': `${BASE_URL}/#organization`,
            name: 'Koperasi Syarikat Islam Mandiri',
            alternateName: 'KOPSIM MANDIRI',
            url: BASE_URL,
            logo: DEFAULT_IMAGE,
            description:
              'Platform koperasi modern berbasis kemandirian ekonomi umat dan ekosistem sektor riil terintegrasi (pertanian, perikanan, industri hilir).',
            contactPoint: {
              '@type': 'ContactPoint',
              email: 'koperasi.simandiri@gmail.com',
              contactType: 'customer support',
              areaServed: 'ID',
              availableLanguage: 'Indonesian',
            },
          },
          {
            '@type': 'WebSite',
            '@id': `${BASE_URL}/#website`,
            url: BASE_URL,
            name: 'KOPSIM MANDIRI',
            publisher: {
              '@id': `${BASE_URL}/#organization`,
            },
          },
        ],
      };
    }

    jsonLdScript.text = JSON.stringify(schemaData);
    document.head.appendChild(jsonLdScript);
  }, [activePage, article]);

  return null;
};
