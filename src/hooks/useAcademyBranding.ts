import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { processFileForUpload } from "@/lib/optimization-pipeline";
import { useAcademy } from "@/contexts/AcademyContext";

export function useAcademyBranding() {
    const queryClient = useQueryClient();
    const { currentAcademy, refreshAcademy } = useAcademy();

    const updateBrandingMutation = useMutation({
        mutationFn: async (branding: any) => {
            if (!currentAcademy?.id) throw new Error("No active academy");

            const { data, error } = await supabase
                .from("academies")
                .update({
                    branding,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", currentAcademy.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["academy", currentAcademy?.id] });
            queryClient.invalidateQueries({ queryKey: ["branding"] });
            refreshAcademy();
            toast.success("Branding da academia atualizado!");
        },
        onError: (error) => {
            console.error("Error updating academy branding:", error);
            toast.error("Erro ao salvar branding");
        },
    });

    return {
        branding: currentAcademy?.branding || {},
        updateBranding: updateBrandingMutation.mutate,
        isUpdating: updateBrandingMutation.isPending,
    };
}

export function useAcademyLogoUpload() {
    const { currentAcademy } = useAcademy();

    const uploadMutation = useMutation({
        mutationFn: async (originalFile: File) => {
            if (!currentAcademy?.id) throw new Error("No active academy");

            // Optimize
            const { file } = await processFileForUpload(originalFile);

            const fileExt = file.name.split(".").pop();
            const fileName = `academy-${currentAcademy.id}-${Date.now()}.${fileExt}`;
            const filePath = `brand/${fileName}`;

            // Upload to storage
            const { error: uploadError } = await supabase.storage
                .from("brand-assets")
                .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from("brand-assets")
                .getPublicUrl(filePath);

            return publicUrl;
        },
        onError: (error) => {
            console.error("Error uploading academy logo:", error);
            toast.error("Erro ao fazer upload da logo");
        },
    });

    return {
        uploadLogo: uploadMutation.mutateAsync,
        isUploading: uploadMutation.isPending,
    };
}
