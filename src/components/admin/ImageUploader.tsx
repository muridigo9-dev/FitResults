import { useState, useCallback, useRef } from "react";
import { Upload, Link as LinkIcon, X, Loader2, ImageIcon, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useStorageUpload, StorageBucket } from "@/hooks/useStorageUpload";
import { isVideoUrl } from "@/lib/exerciseMedia";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ImageUploaderProps {
  bucket: StorageBucket;
  storagePath: string;
  currentImageUrl?: string;
  currentImagePath?: string;
  onImageChange: (data: { imageUrl?: string; imagePath?: string }) => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
  aspectRatio?: "square" | "video" | "wide";
  placeholder?: string;
  /** Also take video files. Only for buckets whose allowed_mime_types include them. */
  allowVideo?: boolean;
}

/**
 * Image uploader component - Refactored for Compact UI
 */
export function ImageUploader({
  bucket,
  storagePath,
  currentImageUrl,
  currentImagePath,
  onImageChange,
  onRemove,
  disabled = false,
  className,
  aspectRatio = "video",
  placeholder = "Adicionar imagem",
  allowVideo = false,
}: ImageUploaderProps) {
  const acceptedTypes = allowVideo
    ? "image/*,video/mp4,video/webm,video/quicktime"
    : "image/*";
  const [isDragging, setIsDragging] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isUrlPopoverOpen, setIsUrlPopoverOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { upload, remove, getPublicUrl, isUploading, progress } = useStorageUpload();

  // Determine current preview URL
  const previewUrl = currentImagePath
    ? getPublicUrl(bucket, currentImagePath)
    : currentImageUrl || "";

  const hasImage = !!(currentImagePath || currentImageUrl);

  // Helper: Aspect Ratio classes
  const aspectRatioClass = {
    square: "aspect-square",
    video: "aspect-video",
    wide: "aspect-[21/9]",
  }[aspectRatio];

  // --- Handlers ---

  const handleFileSelect = useCallback(async (file: File) => {
    if (disabled || isUploading) return;
    const result = await upload(file, { bucket, path: storagePath });
    if (result) {
      onImageChange({ imagePath: result.path, imageUrl: undefined });
      setPreviewError(false);
    }
  }, [bucket, storagePath, upload, onImageChange, disabled, isUploading]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [handleFileSelect]);

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      onImageChange({ imageUrl: trimmed, imagePath: undefined });
      setPreviewError(false);
      setIsUrlPopoverOpen(false);
      setUrlInput("");
    }
  };

  const handleRemove = useCallback(async () => {
    if (currentImagePath) await remove(bucket, currentImagePath);
    onImageChange({ imageUrl: "", imagePath: "" });
    setPreviewError(false);
    onRemove?.();
  }, [bucket, currentImagePath, remove, onImageChange, onRemove]);

  // Drag & Drop
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;
    const file = e.dataTransfer.files?.[0];
    const isAccepted = file?.type.startsWith("image/") || (allowVideo && file?.type.startsWith("video/"));
    if (file && isAccepted) handleFileSelect(file);
  };

  // --- Render ---

  if (hasImage && !previewError) {
    return (
      <div className={cn("group relative rounded-lg overflow-hidden border bg-muted/30 shadow-sm transition-all animate-in fade-in zoom-in-95", className)}>
        {/* Preview Image - Constrained Height */}
        <div className={cn("w-full relative", aspectRatioClass, "max-h-[300px]")}>
          {isVideoUrl(previewUrl) ? (
            <video
              src={previewUrl}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              onError={() => setPreviewError(true)}
            />
          ) : (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={() => setPreviewError(true)}
            />
          )}

          {/* Overlay Controls */}
          {!disabled && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
              <Button
                variant="secondary"
                size="sm"
                className="h-8 gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Trocar
              </Button>

              <Popover open={isUrlPopoverOpen} onOpenChange={setIsUrlPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm" className="h-8 gap-2" disabled={isUploading} onClick={(e) => e.stopPropagation()}>
                    <LinkIcon className="h-3.5 w-3.5" />
                    URL
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="center">
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://..."
                      className="h-8 text-xs"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                    />
                    <Button size="sm" className="h-8 px-3" onClick={handleUrlSubmit}>OK</Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="destructive"
                size="sm"
                className="h-8 gap-2"
                onClick={handleRemove}
                disabled={isUploading}
              >
                <X className="h-3.5 w-3.5" />
                Remover
              </Button>
            </div>
          )}

          {/* Loading Overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-xs font-medium text-foreground">{progress}%</p>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept={acceptedTypes} className="hidden" onChange={handleInputChange} />
      </div>
    );
  }

  // Empty State - Compact
  return (
    <div className={cn(className)}>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all",
          "hover:bg-muted/50 hover:border-primary/50",
          isDragging ? "border-primary bg-primary/5 scale-[0.99]" : "border-muted-foreground/20",
          disabled && "opacity-60 cursor-not-allowed",
          // Compact height options
          aspectRatio === 'square' ? "aspect-square" : "h-32 sm:h-40"
        )}
      >
        <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              {isUploading ? "Enviando..." : placeholder}
            </p>
            <p className="text-xs text-muted-foreground">
              Arraste ou clique para upload
            </p>
          </div>
        </div>

        {/* Click Handler (Invisible Overlay) */}
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        />

        {/* URL Option (Floating trigger) */}
        {!isUploading && !disabled && (
          <Popover open={isUrlPopoverOpen} onOpenChange={setIsUrlPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute bottom-2 right-2 h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <LinkIcon className="h-3 w-3 mr-1" />
                Via URL
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="flex gap-2">
                <Input
                  placeholder="https://..."
                  className="h-8 text-xs"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                />
                <Button size="sm" className="h-8 px-3" onClick={handleUrlSubmit}>OK</Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <input ref={fileInputRef} type="file" accept={acceptedTypes} className="hidden" onChange={handleInputChange} />
      </div>

      {previewError && (
        <p className="text-xs text-destructive mt-1.5 ml-1">
          Erro ao carregar imagem. Tente outra.
        </p>
      )}
    </div>
  );
}
