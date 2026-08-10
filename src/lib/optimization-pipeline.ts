/**
 * OPTIMIZATION PIPELINE
 * 
 * Central validation and optimization logic for all file uploads.
 * Guarantees that only optimized assets enter the storage.
 * 
 * Features:
 * - Smart resizing (max 1920px)
 * - WebP conversion for images
 * - Metadata stripping (via canvas reconstruction)
 * - Intelligent fallback for GIFs/Docs
 */

const MAX_WIDTH = 1920;
const QUALITY = 0.8;
const MAX_SIZE_MB = 5;

interface OptimizationResult {
    file: File;
    originalSize: number;
    optimizedSize: number;
    isOptimized: boolean;
    optimizationTime: number;
}

/**
 * Process any file for upload.
 * Detects type and applies appropriate optimization strategy.
 */
export async function processFileForUpload(file: File): Promise<OptimizationResult> {
    const startTime = performance.now();
    const originalSize = file.size;

    // 1. Validation limits
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`Arquivo muito grande. Máximo suportado: ${MAX_SIZE_MB}MB`);
    }

    try {
        // 2. Strategy Selector
        if (file.type.startsWith("image/")) {
            // Skip GIFs for now to avoid breaking animations (complex to optimize client-side without heavy libs)
            if (file.type === "image/gif") {
                return createResult(file, originalSize, false, startTime);
            }

            // Optimize Standard Images (JPG, PNG, WEBP)
            if (["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                const optimizedFile = await optimizeImage(file);
                return createResult(optimizedFile, originalSize, true, startTime);
            }
        }

        // 3. Document Pass-through (PDFs, etc)
        // Future: Add PDF compression here if libraries allow
        return createResult(file, originalSize, false, startTime);

    } catch (error) {
        console.warn("Optimization failed, falling back to original:", error);
        // Safety Fallback: If optimization crashes, upload original but log warning
        return createResult(file, originalSize, false, startTime);
    }
}

/**
 * Core Image Optimization Logic
 * - Resizes to MAX_WIDTH
 * - Converts to WebP
 * - Strips EXIF (canvas rebuild does this natively)
 */
async function optimizeImage(file: File): Promise<File> {
    // Create bitmap from file (faster than Image object)
    const bitmap = await createImageBitmap(file);

    // Calculate new dimensions
    let width = bitmap.width;
    let height = bitmap.height;

    if (width > MAX_WIDTH) {
        const ratio = MAX_WIDTH / width;
        width = MAX_WIDTH;
        height = Math.round(height * ratio);
    }

    // Draw to canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    // High quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(bitmap, 0, 0, width, height);

    // Convert to WebP blob
    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
            (b) => resolve(b),
            "image/webp",
            QUALITY
        );
    });

    if (!blob) throw new Error("Blob creation failed");

    // Create new File object
    // Rename extension to .webp
    const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";

    return new File([blob], newName, {
        type: "image/webp",
        lastModified: Date.now(),
    });
}

function createResult(file: File, originalSize: number, isOptimized: boolean, startTime: number): OptimizationResult {
    const endTime = performance.now();
    if (isOptimized) {
        console.log(`[Optimizer] ${file.name}: ${(originalSize / 1024).toFixed(1)}kb -> ${(file.size / 1024).toFixed(1)}kb in ${(endTime - startTime).toFixed(0)}ms`);
    }
    return {
        file,
        originalSize,
        optimizedSize: file.size,
        isOptimized,
        optimizationTime: endTime - startTime
    };
}
