import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  priority?: boolean;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  fallbackSrc?: string;
}

// Whitelist of assets that actually have pre-generated .avif and .webp versions
const MULTI_FORMAT_ASSETS = new Set([
  '/assets/berita/all.jpeg',
  '/assets/berita/handshake.jpeg',
  '/assets/MasterBlankoID.jpg',
]);

/**
 * Modern High-Performance Responsive Image Component
 * Automatically serves AVIF/WebP when verified available with fallback,
 * lazy-loading by default, async decoding, and cumulative layout shift (CLS) prevention.
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  aspectRatio,
  objectFit = 'cover',
  fallbackSrc = '/assets/portfolio/perikanan-ikan-layang-ambon.jpg',
  ...rest
}) => {
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Clean URL path
  const cleanSrc = (src || '').trim();

  // Only emit <source> if the asset is strictly known to have AVIF and WebP files
  const isMultiFormat = cleanSrc && MULTI_FORMAT_ASSETS.has(cleanSrc);
  const webpSrc = isMultiFormat ? cleanSrc.replace(/\.(jpe?g|png)$/i, '.webp') : null;
  const avifSrc = isMultiFormat ? cleanSrc.replace(/\.(jpe?g|png)$/i, '.avif') : null;

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    ...(aspectRatio ? { aspectRatio } : {}),
  };

  if (!cleanSrc || (hasError && !fallbackSrc)) {
    return (
      <div
        style={aspectRatio ? containerStyle : undefined}
        className={`w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-400 p-4 ${className}`}
      >
        <ImageIcon className="w-8 h-8 opacity-40 mb-1" />
        <span className="text-[10px] font-sans text-stone-400 text-center line-clamp-1">{alt || 'Foto'}</span>
      </div>
    );
  }

  const effectiveSrc = hasError ? fallbackSrc : cleanSrc;

  return (
    <picture style={aspectRatio ? containerStyle : undefined} className="block w-full h-full">
      {avifSrc && !hasError && <source srcSet={avifSrc} type="image/avif" />}
      {webpSrc && !hasError && <source srcSet={webpSrc} type="image/webp" />}
      <img
        src={effectiveSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (!hasError && fallbackSrc && cleanSrc !== fallbackSrc) {
            setHasError(true);
          }
        }}
        className={`${className} ${objectFit ? `object-${objectFit}` : ''} transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-90'
        }`}
        {...rest}
      />
    </picture>
  );
};

