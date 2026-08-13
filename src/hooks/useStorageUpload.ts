import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { processFileForUpload } from "@/lib/optimization-pipeline";

export type StorageBucket =
  | "diet-images"
  | "workout-images"
  | "challenge-images"
  | "brand-assets"
  | "exercises-media"
  | "workouts-media"
  | "muscle-groups";

interface UploadOptions {
  bucket: StorageBucket;
  path: string;
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  path: string;
  publicUrl: string;
}

interface UseStorageUploadReturn {
  upload: (file: File, options: UploadOptions) => Promise<UploadResult | null>;
  remove: (bucket: StorageBucket, path: string) => Promise<boolean>;
  getPublicUrl: (bucket: StorageBucket, path: string) => string;
  isUploading: boolean;
  progress: number;
  error: string | null;
}

/**
 * Hook for managing file uploads to Supabase Storage
 */
export function useStorageUpload(): UseStorageUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get the public URL for a file in storage
   */
  const getPublicUrl = useCallback((bucket: StorageBucket, path: string): string => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }, []);

  /**
   * Upload a file to storage
   */
  const upload = useCallback(async (
    originalFile: File,
    { bucket, path, onProgress }: UploadOptions
  ): Promise<UploadResult | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // 1. PIPELINE DE OTIMIZAÇÃO (Obrigatório para novos uploads)
      const { file } = await processFileForUpload(originalFile);

      // Validate file type (Post-optimization check)
      // Note: Optimizer converts to WebP, so checking original types might flag it if we don't allow WebP,
      // but validTypes includes webp. Video is passed through untouched by the pipeline; whether a given
      // bucket actually accepts it is enforced server-side by its allowed_mime_types, so listing the
      // types here does not let a video land in an image-only bucket.
      const validTypes = [
        "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml",
        "video/mp4", "video/webm", "video/quicktime",
      ];
      if (!validTypes.includes(file.type)) {
        throw new Error("Tipo de arquivo não suportado após processamento.");
      }

      // Generate unique filename
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const fileName = `${path}/${timestamp}-${randomStr}.${ext}`;

      // Upload file
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(uploadError.message || "Erro ao fazer upload da imagem");
      }

      setProgress(100);
      onProgress?.(100);

      const publicUrl = getPublicUrl(bucket, data.path);

      return {
        path: data.path,
        publicUrl,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido no upload";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [getPublicUrl]);

  /**
   * Remove a file from storage
   */
  const remove = useCallback(async (bucket: StorageBucket, path: string): Promise<boolean> => {
    try {
      const { error: removeError } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (removeError) {
        console.error("Remove error:", removeError);
        throw new Error(removeError.message || "Erro ao remover imagem");
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao remover imagem";
      toast.error(message);
      return false;
    }
  }, []);

  return {
    upload,
    remove,
    getPublicUrl,
    isUploading,
    progress,
    error,
  };
}

/**
 * Utility to get resolved image URL from path or URL
 */
export function resolveImageUrl(
  bucket: StorageBucket,
  imagePath?: string | null,
  imageUrl?: string | null,
  fallbackUrl?: string
): string {
  // If storage path exists, generate public URL
  if (imagePath) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(imagePath);
    return data.publicUrl;
  }

  // If external URL exists, use it
  if (imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {
    return imageUrl;
  }

  // Return fallback
  return fallbackUrl || "/placeholder.svg";
}

/**
 * Generate storage path for content
 */
export function getStoragePath(
  contentType: "diet" | "workout" | "challenge",
  contentId: string,
  isUserContent: boolean = false,
  userId?: string
): string {
  if (isUserContent && userId) {
    return `user/${userId}/${contentId}`;
  }
  return `system/${contentId}`;
}
