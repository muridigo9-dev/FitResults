import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Mail, Calendar, Camera, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileData } from "@/hooks/useProfileData";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AvatarUpload } from "@/components/profile/AvatarUpload";

export default function EditProfile() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { profile, isLoading, updateProfile } = useProfileData();

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [emailChangeRequested, setEmailChangeRequested] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setAvatarUrl(profile.avatarUrl || "");
    }
  }, [profile]);

  const handleAvatarUploadComplete = async (url: string) => {
    setAvatarUrl(url);
    // Persistência imediata da foto de perfil
    try {
      await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user?.id);

      toast.success("Foto de perfil atualizada e salva!");
    } catch (error) {
      console.error("Erro ao salvar URL do avatar:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          // note: avatar_url is already saved on upload
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success(t("actions.save") + " ✓");
    } catch (error) {
      toast.error(t("states.error"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail.trim() || newEmail === user?.email) return;

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      setEmailChangeRequested(true);
      toast.success("E-mail de confirmação enviado!");
    } catch (error: any) {
      toast.error(error.message || t("states.error"));
    }
  };

  const displayInitials = (fullName || user?.email || "?")
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const memberSince = user?.created_at
    ? format(new Date(user.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "";

  return (
    <AppLayout
      header={{
        title: t("profile.editProfile"),
        showBack: true
      }}
    >
      <div className="py-4 space-y-6">

        {/* Avatar Section */}
        <Card>
          <CardContent className="p-6">
            <AvatarUpload
              currentUrl={avatarUrl}
              initials={displayInitials}
              onUploadComplete={handleAvatarUploadComplete}
              size="xl"
            />
          </CardContent>
        </Card>

        {/* Profile Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados do Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Membro desde
              </Label>
              <p className="text-sm text-muted-foreground">{memberSince}</p>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={isSaving || isLoading}
              className="w-full"
            >
              {isSaving ? t("states.saving") : t("actions.save")}
            </Button>
          </CardContent>
        </Card>

        {/* Email Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Alterar E-mail
            </CardTitle>
            <CardDescription>
              Um e-mail de confirmação será enviado para o novo endereço
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {emailChangeRequested ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertDescription>
                  Verifique sua caixa de entrada no novo e-mail para confirmar a alteração.
                  O e-mail antigo continuará ativo até a confirmação.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="currentEmail">E-mail Atual</Label>
                  <Input
                    id="currentEmail"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newEmail">Novo E-mail</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="novo@email.com"
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Após solicitar, você receberá um link de confirmação no novo e-mail.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleEmailChange}
                  variant="outline"
                  disabled={!newEmail.trim() || newEmail === user?.email}
                  className="w-full"
                >
                  Solicitar Alteração
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
