import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { resolveImageUrl, StorageBucket } from "@/hooks/useStorageUpload";

interface ContentImageProps {
  bucket: StorageBucket;
  imagePath?: string | null;
  imageUrl?: string | null;
  fallbackUrl?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: "square" | "video" | "wide" | "auto";
  objectFit?: "cover" | "contain" | "fill";
  lazy?: boolean;
  showPlaceholder?: boolean;
}

/**
 * Content image component with fallback support, lazy loading, and error handling
 * Prioritizes imagePath (storage) over imageUrl (external)
 */
export function ContentImage({
  bucket,
  imagePath,
  imageUrl,
  fallbackUrl = "/placeholder.svg",
  alt,
  className,
  containerClassName,
  aspectRatio = "video",
  objectFit = "cover",
  lazy = true,
  showPlaceholder = true,
}: ContentImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const src = resolveImageUrl(bucket, imagePath, imageUrl, fallbackUrl);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const aspectRatioClass = {
    square: "aspect-square",
    video: "aspect-video",
    wide: "aspect-[21/9]",
    auto: "",
  }[aspectRatio];

  const objectFitClass = {
    cover: "object-cover",
    contain: "object-contain",
    fill: "object-fill",
  }[objectFit];

  // Show fallback if error occurred
  if (hasError) {
    if (!showPlaceholder) {
      return null;
    }

    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center",
          aspectRatioClass,
          containerClassName
        )}
      >
        <img
          src={fallbackUrl}
          alt={alt}
          className={cn("w-full h-full", objectFitClass, className)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        aspectRatioClass,
        containerClassName
      )}
    >
      {/* Loading skeleton */}
      {!isLoaded && showPlaceholder && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}

      <img
        src={src}
        alt={alt}
        loading={lazy ? "lazy" : "eager"}
        onError={handleError}
        onLoad={handleLoad}
        className={cn(
          "w-full h-full transition-opacity duration-300",
          objectFitClass,
          !isLoaded && "opacity-0",
          isLoaded && "opacity-100",
          className
        )}
      />
    </div>
  );
}

/**
 * Simple helper to get the best image source
 */
export function getContentImageSrc(
  bucket: StorageBucket,
  imagePath?: string | null,
  imageUrl?: string | null,
  fallbackUrl?: string
): string {
  return resolveImageUrl(bucket, imagePath, imageUrl, fallbackUrl);
}
