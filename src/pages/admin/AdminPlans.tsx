import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePlans, Plan, PlanPrice } from "@/hooks/usePlans";
import { useI18n } from "@/hooks/useI18n";
import {
  Package,
  Plus,
  Trash2,
  Edit,
  Loader2,
  DollarSign,
  Tag,
  Calendar,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface PriceFormData {
  id?: string;
  price_id: string;
  interval: "month" | "year" | "promo";
  label: string;
  display_price: string;
  display_currency: string;
  promo_text: string;
  is_active: boolean;
}

interface PlanFormData {
  id?: string;
  name: string;
  description: string;
  features: string;
  is_active: boolean;
  display_order: number;
  prices: PriceFormData[];
}

const defaultPriceForm: PriceFormData = {
  price_id: "",
  interval: "month",
  label: "",
  display_price: "",
  display_currency: "BRL",
  promo_text: "",
  is_active: true,
};

const defaultPlanForm: PlanFormData = {
  name: "",
  description: "",
  features: "",
  is_active: true,
  display_order: 0,
  prices: [],
};

export default function AdminPlans() {
  const { t } = useI18n();
  const { plans, isLoading, savePlan, deletePlan, deletePrice, isSaving, isDeleting } = usePlans();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanFormData | null>(null);
  const [syncingPriceIndex, setSyncingPriceIndex] = useState<number | null>(null);

  const handleEditPlan = (plan: Plan) => {
    let featuresStr = "";
    if (Array.isArray(plan.features)) {
      featuresStr = plan.features.join("\n");
    } else if (typeof plan.features === 'string') {
      try {
        const parsed = JSON.parse(plan.features);
        if (Array.isArray(parsed)) featuresStr = parsed.join("\n");
        else featuresStr = plan.features;
      } catch {
        featuresStr = plan.features;
      }
    }

    setEditingPlan({
      id: plan.id,
      name: plan.name,
      description: plan.description || "",
      features: featuresStr,
      is_active: plan.is_active,
      display_order: plan.display_order,
      prices: (plan.prices || []).map((p) => ({
        id: p.id,
        price_id: p.price_id,
        interval: p.interval,
        label: p.label,
        display_price: p.display_price?.toString() || "",
        display_currency: p.display_currency,
        promo_text: p.promo_text || "",
        is_active: p.is_active,
      })),
    });
    setIsDialogOpen(true);
  };

  const handleNewPlan = () => {
    setEditingPlan({ ...defaultPlanForm });
    setIsDialogOpen(true);
  };

  const handleAddPrice = () => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      prices: [...editingPlan.prices, { ...defaultPriceForm }],
    });
  };

  const handleRemovePrice = (index: number) => {
    if (!editingPlan) return;
    const priceToRemove = editingPlan.prices[index];

    // If price has an ID, delete from database
    if (priceToRemove.id) {
      deletePrice(priceToRemove.id);
    }

    setEditingPlan({
      ...editingPlan,
      prices: editingPlan.prices.filter((_, i) => i !== index),
    });
  };

  const handleUpdatePrice = (index: number, field: keyof PriceFormData, value: string | boolean) => {
    if (!editingPlan) return;
    const updatedPrices = [...editingPlan.prices];
    updatedPrices[index] = { ...updatedPrices[index], [field]: value };
    setEditingPlan({ ...editingPlan, prices: updatedPrices });
  };

  const validatePriceId = (priceId: string) => {
    return priceId.startsWith("price_");
  };

  const handleSyncPrice = async (index: number) => {
    if (!editingPlan) return;
    const priceId = editingPlan.prices[index].price_id;

    if (!priceId || !priceId.startsWith("price_")) {
      toast.error("Insira um Price ID válido antes de sincronizar.");
      return;
    }

    setSyncingPriceIndex(index);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-admin', {
        body: { action: 'get_price', price_id: priceId }
      });

      if (error) throw error;

      let responseData = data;
      if (typeof data === 'string') {
        try {
          responseData = JSON.parse(data);
        } catch (e) {
          console.error("Failed to parse sync response:", e);
        }
      }

      if (!responseData?.success) {
        if (responseData?.warning === "Unknown payload") {
          throw new Error("Função desatualizada. Por favor, faça o deploy do 'stripe-admin'.");
        }
        throw new Error(responseData?.error || "Erro ao sincronizar preço.");
      }

      const { unit_amount, currency, recurring } = responseData.data;

      const updatedPrices = [...editingPlan.prices];

      // Map Stripe interval to our interval type
      let interval: "month" | "year" | "promo" = "month";
      if (recurring?.interval === "year") interval = "year";
      // We default to month if it's not strictly year, or user can adjust.

      updatedPrices[index] = {
        ...updatedPrices[index],
        display_price: (unit_amount / 100).toFixed(2),
        display_currency: currency.toUpperCase(),
        interval: interval
      };

      setEditingPlan({ ...editingPlan, prices: updatedPrices });
      toast.success("Preço sincronizado com sucesso!");
    } catch (error: any) {
      console.error("Sync error:", error);
      toast.error(error.message || "Falha ao sincronizar com Stripe.");
    } finally {
      setSyncingPriceIndex(null);
    }
  };

  const handleSavePlan = () => {
    if (!editingPlan) return;

    if (!editingPlan.name.trim()) {
      toast.error("Nome do plano é obrigatório");
      return;
    }

    // Validate all price IDs
    for (const price of editingPlan.prices) {
      if (price.price_id && !validatePriceId(price.price_id)) {
        toast.error(`Price ID inválido: ${price.price_id}. Deve começar com "price_"`);
        return;
      }
    }

    const planData: any = {
      id: editingPlan.id,
      name: editingPlan.name,
      description: editingPlan.description || null,
      features: editingPlan.features.split("\n").filter((f) => f.trim()),
      is_active: editingPlan.is_active,
      display_order: editingPlan.display_order,
      prices: editingPlan.prices.map((p) => ({
        id: p.id,
        price_id: p.price_id,
        interval: p.interval,
        label: p.label,
        display_price: p.display_price ? parseFloat(p.display_price) : null,
        display_currency: p.display_currency,
        promo_text: p.promo_text || null,
        is_active: p.is_active,
      })),
    };

    savePlan(planData, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setEditingPlan(null);
      },
    });
  };

  const handleDeletePlan = (planId: string) => {
    if (confirm("Tem certeza que deseja excluir este plano? Esta ação não pode ser desfeita.")) {
      deletePlan(planId);
    }
  };

  const getIntervalLabel = (interval: string) => {
    switch (interval) {
      case "month": return "Mensal";
      case "year": return "Anual";
      case "promo": return "Promocional";
      default: return interval;
    }
  };

  const getIntervalIcon = (interval: string) => {
    switch (interval) {
      case "month": return <Calendar className="h-3 w-3" />;
      case "year": return <Calendar className="h-3 w-3" />;
      case "promo": return <Sparkles className="h-3 w-3" />;
      default: return <Tag className="h-3 w-3" />;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Planos">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Planos & Preços">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Gerencie seus planos de assinatura e configure os Price IDs do Stripe.
            </p>
          </div>
          <Button onClick={handleNewPlan}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        </div>

        {/* Important Notice */}
        <Card variant="ghost">
          <CardContent className="py-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Importante: Price IDs</p>
                <p className="text-xs text-muted-foreground">
                  Os valores de preço aqui são apenas para <strong>exibição</strong>.
                  O valor real cobrado é sempre determinado pelo <strong>Price ID</strong> configurado no Stripe.
                  Certifique-se de que os Price IDs estão corretos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plans List */}
        {plans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum plano cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro plano de assinatura para começar.
              </p>
              <Button onClick={handleNewPlan}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Plano
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {plans.map((plan) => (
              <Card key={plan.id} variant={plan.is_active ? "elevated" : "default"}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {plan.name}
                        <Badge variant={plan.is_active ? "default" : "secondary"}>
                          {plan.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </CardTitle>
                      {plan.description && (
                        <CardDescription>{plan.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePlan(plan.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Features */}
                  {plan.features && plan.features.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Recursos:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {(Array.isArray(plan.features) ? plan.features : []).map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Prices */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Preços:</p>
                    {plan.prices && plan.prices.length > 0 ? (
                      <div className="grid gap-2">
                        {plan.prices.map((price) => (
                          <div
                            key={price.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="flex items-center gap-1">
                                {getIntervalIcon(price.interval)}
                                {getIntervalLabel(price.interval)}
                              </Badge>
                              <span className="font-medium">{price.label}</span>
                              {price.promo_text && (
                                <span className="text-xs text-primary">{price.promo_text}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              {price.display_price && (
                                <span className="font-medium">
                                  {price.display_currency} {Number(price.display_price).toFixed(2)}
                                </span>
                              )}
                              <code className="text-xs bg-background px-2 py-1 rounded">
                                {price.price_id}
                              </code>
                              <Badge variant={price.is_active ? "default" : "secondary"} className="text-xs">
                                {price.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhum preço configurado
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Plan Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlan?.id ? "Editar Plano" : "Novo Plano"}
              </DialogTitle>
              <DialogDescription>
                Configure as informações do plano e seus preços.
              </DialogDescription>
            </DialogHeader>

            {editingPlan && (
              <div className="space-y-6 py-4">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="planName">Nome do Plano *</Label>
                    <Input
                      id="planName"
                      placeholder="Ex: Pro, Premium, Enterprise"
                      value={editingPlan.name}
                      onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="planDescription">Descrição</Label>
                    <Textarea
                      id="planDescription"
                      placeholder="Descrição breve do plano"
                      value={editingPlan.description}
                      onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="planFeatures">Recursos (um por linha)</Label>
                    <Textarea
                      id="planFeatures"
                      placeholder="Acesso ilimitado&#10;Suporte prioritário&#10;Relatórios avançados"
                      value={editingPlan.features}
                      onChange={(e) => setEditingPlan({ ...editingPlan, features: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPlan.is_active}
                        onCheckedChange={(checked) => setEditingPlan({ ...editingPlan, is_active: checked })}
                      />
                      <Label>Plano Ativo</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label htmlFor="displayOrder">Ordem:</Label>
                      <Input
                        id="displayOrder"
                        type="number"
                        className="w-20"
                        value={editingPlan.display_order}
                        onChange={(e) => setEditingPlan({ ...editingPlan, display_order: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Prices Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Preços</Label>
                    <Button variant="outline" size="sm" onClick={handleAddPrice}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Preço
                    </Button>
                  </div>

                  {editingPlan.prices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum preço adicionado. Clique em "Adicionar Preço" para começar.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {editingPlan.prices.map((price, index) => (
                        <Card key={index} variant="ghost">
                          <CardContent className="pt-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">
                                {getIntervalIcon(price.interval)}
                                <span className="ml-1">{getIntervalLabel(price.interval)}</span>
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemovePrice(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Price ID (Stripe) *</Label>
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="price_1Nabc..."
                                    value={price.price_id}
                                    onChange={(e) => handleUpdatePrice(index, "price_id", e.target.value)}
                                    className={!validatePriceId(price.price_id) && price.price_id ? "border-red-500" : ""}
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    title="Sincronizar com Stripe"
                                    onClick={() => handleSyncPrice(index)}
                                    disabled={syncingPriceIndex === index || !price.price_id}
                                  >
                                    {syncingPriceIndex === index ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <RefreshCw className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Intervalo</Label>
                                <Select
                                  value={price.interval}
                                  onValueChange={(v) => handleUpdatePrice(index, "interval", v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="month">Mensal</SelectItem>
                                    <SelectItem value="year">Anual</SelectItem>
                                    <SelectItem value="promo">Promocional</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Label (exibição)</Label>
                                <Input
                                  placeholder="Ex: Pro Mensal"
                                  value={price.label}
                                  onChange={(e) => handleUpdatePrice(index, "label", e.target.value)}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Preço de Exibição</Label>
                                <div className="flex gap-2">
                                  <Select
                                    value={price.display_currency}
                                    onValueChange={(v) => handleUpdatePrice(index, "display_currency", v)}
                                  >
                                    <SelectTrigger className="w-24">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="BRL">BRL</SelectItem>
                                      <SelectItem value="USD">USD</SelectItem>
                                      <SelectItem value="EUR">EUR</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="99.90"
                                    value={price.display_price}
                                    onChange={(e) => handleUpdatePrice(index, "display_price", e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Texto Promocional</Label>
                              <Input
                                placeholder="Ex: Economize 20%, 2 meses grátis, etc."
                                value={price.promo_text}
                                onChange={(e) => handleUpdatePrice(index, "promo_text", e.target.value)}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <Switch
                                checked={price.is_active}
                                onCheckedChange={(checked) => handleUpdatePrice(index, "is_active", checked)}
                              />
                              <Label>Preço Ativo</Label>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSavePlan} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Plano"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
