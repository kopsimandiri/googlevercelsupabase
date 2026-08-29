import React, { useState } from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  priority?: boolean;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

/**
 * Modern High-Performance Responsive Image Component
 * Automatically serves AVIF/WebP when available with fallback,
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
  ...rest
}) => {
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Derive WebP and AVIF URLs if this is a local asset
  const isLocalAsset = src && src.startsWith('/assets/');
  let webpSrc: string | null = null;
  let avifSrc: string | null = null;

  if (isLocalAsset) {
    const extMatch = src.match(/\.(jpe?g|png)$/i);
    if (extMatch) {
      webpSrc = src.replace(/\.(jpe?g|png)$/i, '.webp');
      avifSrc = src.replace(/\.(jpe?g|png)$/i, '.avif');
    }
  }

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    ...(aspectRatio ? { aspectRatio } : {}),
  };

  return (
    <picture style={aspectRatio ? containerStyle : undefined} className="block w-full h-full">
      {avifSrc && <source srcSet={avifSrc} type="image/avif" />}
      {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
      <img
        src={hasError ? '/assets/portfolio/perikanan-ikan-layang-ambon.webp' : src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`${className} ${objectFit ? `object-${objectFit}` : ''} transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-90'
        }`}
        {...rest}
      />
    </picture>
  );
};
