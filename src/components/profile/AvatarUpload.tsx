import React, { useState, useRef } from 'react';
import { Camera, Loader2, Upload, User, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/hooks/useI18n';

interface AvatarUploadProps {
    currentUrl: string;
    onUploadComplete: (url: string) => void;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    initials?: string;
}

export function AvatarUpload({
    currentUrl,
    onUploadComplete,
    size = 'lg',
    initials = '?'
}: AvatarUploadProps) {
    const { t } = useI18n();
    const { user } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sizeClasses = {
        sm: 'h-10 w-10',
        md: 'h-16 w-16',
        lg: 'h-24 w-24',
        xl: 'h-32 w-32'
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        // Validate type
        if (!file.type.startsWith('image/')) {
            toast.error(t('profile.selectValidImage'));
            return;
        }

        // Validate size (1MB)
        if (file.size > 1024 * 1024) {
            toast.error(t('profile.imageMaxSize'));
            return;
        }

        // Show local preview
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        try {
            setIsUploading(true);

            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/avatar.${fileExt}`;

            // Upload to Supabase Storage
            const { data, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    upsert: true,
                    contentType: file.type
                });

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Clean up previous preview if exists
            if (previewUrl) URL.revokeObjectURL(previewUrl);

            onUploadComplete(publicUrl);
            toast.success(t('profile.photoUpdated'));
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            toast.error(t('profile.uploadError'));
            setPreviewUrl(null);
        } finally {
            setIsUploading(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <Avatar className={`${sizeClasses[size]} border-4 border-background shadow-lg overflow-hidden`}>
                    <AvatarImage src={previewUrl || currentUrl} className="object-cover" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                        {initials}
                    </AvatarFallback>

                    {isUploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                            <Loader2 className="h-8 w-8 text-white animate-spin" />
                        </div>
                    )}
                </Avatar>

                <button
                    type="button"
                    onClick={triggerFileInput}
                    disabled={isUploading}
                    className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-2 border-background"
                    aria-label={t('profile.changePhoto')}
                >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-5 w-5" />}
                </button>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />

            <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">
                    {isUploading ? t('profile.uploading') : t('profile.identityPhoto')}
                </p>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={triggerFileInput}
                    disabled={isUploading}
                    className="text-primary hover:text-primary/80 h-auto p-0 font-medium"
                >
                    {currentUrl ? t('profile.changeImage') : t('profile.addPhoto')}
                </Button>
            </div>
        </div>
    );
}
