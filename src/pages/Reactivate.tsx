import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  Check,
  ArrowRight,
  Loader2,
  Shield,
  CreditCard,
  RefreshCw,
  XCircle,
  Clock,
  Sparkles,
  Dumbbell,
  LogOut,
  Crown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranding } from "@/hooks/useBranding";
import { LoadingScreen } from "@/components/states/LoadingState";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  features: string[];
  is_highlighted?: boolean;
  prices: {
    id: string;
    price_id: string;
    interval: string;
    label: string;
    display_price: number;
    display_currency: string;
    promo_text: string | null;
  }[];
}

interface SubscriptionInfo {
  status: string;
  plan_name?: string;
  current_period_end?: string;
  stripe_customer_id?: string;
}

const STATUS_LABELS: Record<string, { label: string; color: "destructive" | "secondary" | "outline"; icon: any; message: string }> = {
  cancelled: {
    label: "Cancelada",
    color: "destructive",
    icon: XCircle,
    message: "Sua assinatura foi cancelada. Escolha um plano para continuar usando o app."
  },
  canceled: {
    label: "Cancelada",
    color: "destructive",
    icon: XCircle,
    message: "Sua assinatura foi cancelada. Escolha um plano para continuar usando o app."
  },
  past_due: {
    label: "Pagamento Pendente",
    color: "destructive",
    icon: AlertCircle,
    message: "Houve um problema com seu pagamento. Atualize seus dados de cobrança para continuar."
  },
  unpaid: {
    label: "Não Pago",
    color: "destructive",
    icon: XCircle,
    message: "Sua última cobrança não foi processada. Atualize seus dados de pagamento."
  },
  expired: {
    label: "Expirada",
    color: "secondary",
    icon: Clock,
    message: "Sua assinatura expirou. Renove para continuar acessando todos os recursos."
  },
  incomplete: {
    label: "Incompleta",
    color: "secondary",
    icon: AlertCircle,
    message: "Seu cadastro está incompleto. Complete o pagamento para ativar sua conta."
  },
  none: {
    label: "Sem Assinatura",
    color: "outline",
    icon: Sparkles,
    message: "Você ainda não tem uma assinatura ativa. Escolha um plano para começar!"
  },
};

export default function Reactivate() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { t, language } = useLanguage();
  const { branding } = useBranding();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSuccessMode, setIsSuccessMode] = useState(false);
  const [successPollingCount, setSuccessPollingCount] = useState(0);

  // Load subscription info and plans
  useEffect(() => {
    if (!user) {
      setIsLoadingData(false);
      return;
    }

    const loadData = async () => {
      try {
        // Get current subscription info
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("subscription_status, account_status, stripe_customer_id")
          .eq("id", user.id)
          .maybeSingle();

        console.log("[Reactivate] Profile:", profile);

        // DISABLED: Allow cancelled users to reactivate
        // if (profile?.subscription_status === "active" || profile?.subscription_status === "trialing") {
        //   navigate("/dashboard", { replace: true });
        //   return;
        // }

        setSubscriptionInfo({
          status: profile?.subscription_status || "none",
          stripe_customer_id: profile?.stripe_customer_id,
        });

        // 2. Check for success flags
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get("reactivated") === "true") {
          setIsSuccessMode(true);

          // If already active, redirect to dashboard
          if (profile?.subscription_status === "active" || profile?.subscription_status === "trialing") {
            toast.success("Sua conta foi reativada com sucesso!");
            setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
            return;
          }
        }

        // 3. Load plans (same logic as Checkout)
        const { data: plansData, error: plansError } = await (supabase as any)
          .from("plans")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (plansError) {
          console.error("[Reactivate] Error loading plans:", plansError);
          throw plansError;
        }

        const { data: pricesData, error: pricesError } = await (supabase as any)
          .from("plan_prices")
          .select("*")
          .eq("is_active", true);
        if (viewError) {
          console.error("[Reactivate] View loading error:", viewError);
          // Modo legado se a view falhar
          const { data: plansData } = await (supabase as any).from("plans").select("*").eq("is_active", true);
          const { data: pricesData } = await (supabase as any).from("plan_prices").select("*").eq("is_active", true);
          const { data: featuresData } = await (supabase as any).from("plan_features").select("*, feature_flags:feature_key(*)").eq("enabled", true);

          const legacyPlans = (plansData || []).map((plan: any) => {
            const planPrices = (pricesData || []).filter((price: any) => price.plan_id === plan.id);
            const planFeatures = (featuresData || [])
              .filter((f: any) => f.plan_id === plan.id)
              .reduce((acc: string[], f: any) => {
                const ff = Array.isArray(f.feature_flags) ? f.feature_flags[0] : f.feature_flags;
                if (ff?.show_in_plans === false) return acc;

                let label = ff?.display_name;
                if (language.startsWith('en')) label = ff?.display_name_en || label;
                else if (language.startsWith('es')) label = ff?.display_name_es || label;

                acc.push(label || t(`plan.features.${f.feature_key}`) || f.feature_key);
                return acc;
              }, []);

            return { ...plan, features: planFeatures, prices: planPrices };
          }).filter(p => p.prices.length > 0);

          setPlans(legacyPlans);

          // Auto-select highlighted plan or first plan
          const highlightedPlan = legacyPlans.find((p: Plan) => p.is_highlighted);
          const defaultPlan = highlightedPlan || legacyPlans[0];

          if (defaultPlan) {
            setSelectedPlan(defaultPlan);
            if (defaultPlan.prices?.length > 0) {
              setSelectedPriceId(defaultPlan.prices[0].price_id);
            }
          }

        } else {
          const processedPlans = (viewData || []).map((item: any) => {
            const rawFeatures = item.feature_details || {};
            const featuresList: string[] = [];

            Object.entries(rawFeatures).forEach(([key, details]: [string, any]) => {
              if (details.show_in_plans === false || !details.enabled) return;

              let label = details.display_name;
              if (language.startsWith('en')) label = details.display_name_en || label;
              else if (language.startsWith('es')) label = details.display_name_es || label;

              featuresList.push(label || t(`plan.features.${key}`) || key);
            });

            return {
              id: item.plan_id, // Ensure plan ID is correctly mapped
              name: item.plan_name,
              description: item.plan_description,
              is_highlighted: item.is_highlighted,
              features: featuresList,
              prices: [{
                id: item.price_id, // Ensure price ID is correctly mapped
                price_id: item.price_id,
                display_price: item.display_price,
                display_currency: item.display_currency,
                interval: item.price_interval,
                label: item.price_label,
                promo_text: item.promo_text
              }]
            };
          }).filter(p => p.prices.length > 0);

          setPlans(processedPlans);

          // Auto-select highlighted plan or first plan
          const highlightedPlan = processedPlans.find((p: Plan) => p.is_highlighted);
          const defaultPlan = highlightedPlan || processedPlans[0];

          if (defaultPlan) {
            setSelectedPlan(defaultPlan);
            if (defaultPlan.prices?.length > 0) {
              setSelectedPriceId(defaultPlan.prices[0].price_id);
            }
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Erro ao carregar dados");
      } finally {
        setIsLoadingData(false); // End loading data
      }
    };

    loadData();
  }, [user, navigate, successPollingCount, language, t]); // Added language and t to dependencies

  // Handle polling for success
  useEffect(() => {
    if (isSuccessMode && successPollingCount < 10) {
      const timer = setTimeout(() => {
        setSuccessPollingCount(prev => prev + 1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccessMode, successPollingCount]);

  const handleReactivate = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      // If user has existing Stripe customer and wants billing portal
      if (subscriptionInfo?.stripe_customer_id && !selectedPriceId) {
        const { data, error } = await supabase.functions.invoke("create-billing-portal-session", {
          body: {
            return_url: `${window.location.origin}/dashboard`,
          },
        });

        if (error) throw error;

        if (data?.url) {
          window.location.href = data.url;
          return;
        }
      }

      // Create new checkout session
      if (!selectedPriceId) {
        // Handle FREE plans that don't need Stripe
        if (selectedPlan?.name?.toLowerCase().includes('free')) {
          toast.success("Plano gratuito ativado!");
          navigate("/dashboard", { replace: true });
          return;
        }
        toast.error("Selecione um plano");
        return;
      }

      const requestBody = {
        name: user.user_metadata?.full_name || user.email?.split("@")[0],
        email: user.email,
        price_id: selectedPriceId.trim(),
        customer_id: subscriptionInfo?.stripe_customer_id,
        success_url: `${window.location.origin}/dashboard?reactivated=true`,
        cancel_url: `${window.location.origin}/reactivate?cancelled=true`,
      };

      console.log("[Reactivate] Sending to checkout:", requestBody);

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: requestBody,
      });

      console.log("[Reactivate] Response:", { data, error });

      if (error) {
        console.error("[Reactivate] Error details:", error);
        throw error;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        console.error("[Reactivate] No URL in response:", data);
        throw new Error("URL de checkout não recebida");
      }
    } catch (error: any) {
      console.error("Reactivation error:", error);

      // Try to extract meaningful error message
      let errorMessage = "Erro ao processar. Tente novamente.";

      if (error?.context?.body) {
        try {
          // Verify if it's already an object or needs parsing
          const errorData = typeof error.context.body === 'string'
            ? JSON.parse(error.context.body)
            : error.context.body;

          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error("Failed to parse error body:", e);
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBillingPortal = async () => {
    if (!subscriptionInfo?.stripe_customer_id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-billing-portal-session", {
        body: {
          return_url: `${window.location.origin}/reactivate`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Billing portal error:", error);
      toast.error("Erro ao abrir portal de faturamento");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(price / 100);
  };

  if (authLoading || isLoadingData) {
    return <LoadingScreen message={t("reactivate.loading")} />;
  }

  // Not authenticated - show message to login
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-primary-soft via-background to-background">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
              <Dumbbell className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle>{t("reactivate.loginToContinue")}</CardTitle>
            <CardDescription>
              {t("reactivate.loginRequired")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full" size="lg">
              <Link to="/auth">
                {t("reactivate.login")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">{t("reactivate.backToHome")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get status info with i18n
  const status = subscriptionInfo?.status || "none";
  const normalizedStatus = status === "canceled" ? "cancelled" : status;
  const statusConfig = {
    cancelled: { label: t("accountInactive.cancelled.title"), color: "destructive" as const, icon: XCircle },
    expired: { label: t("accountInactive.expired.title"), color: "secondary" as const, icon: Clock },
    past_due: { label: "Payment Pending", color: "destructive" as const, icon: AlertCircle },
    unpaid: { label: "Unpaid", color: "destructive" as const, icon: XCircle },
    incomplete: { label: "Incomplete", color: "secondary" as const, icon: AlertCircle },
    none: { label: t("reactivate.noSubscription"), color: "outline" as const, icon: Sparkles },
  };
  const statusInfo = statusConfig[normalizedStatus as keyof typeof statusConfig] || statusConfig.none;
  const StatusIcon = statusInfo.icon;
  const statusMessage = normalizedStatus === "none" ? t("reactivate.message") : subscriptionInfo?.status;

  if (isSuccessMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-soft via-background to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center py-8">
          <CardContent className="space-y-6">
            <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
              <Check className="h-10 w-10 text-green-500" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">Pagamento Confirmado!</CardTitle>
              <CardDescription className="text-base px-4">
                Estamos ativando seu acesso. Isso deve levar apenas alguns instantes...
              </CardDescription>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Tentativa {successPollingCount + 1} de 10</p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Verificar manualmente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-soft via-background to-background">
      {/* Header */}
      <header className="w-full px-4 py-4 flex items-center justify-between border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.appName} className="h-8 w-auto" />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
          <span className="font-semibold text-foreground">{branding.appName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {user.email}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">{t("accountInactive.logout")}</span>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Status Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-yellow-500/20 mb-4">
            <StatusIcon className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {t("reactivate.title")}
          </h1>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Badge variant={statusInfo.color}>
              {statusInfo.label}
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            {statusMessage}
          </p>
        </div>

        {/* Billing Portal Option */}
        {subscriptionInfo?.stripe_customer_id && (
          <Card className="mb-6 border-primary/20">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Gerenciar assinatura existente</p>
                    <p className="text-sm text-muted-foreground">
                      Atualizar forma de pagamento ou ver histórico
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleBillingPortal}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Portal de Faturamento
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator className="my-8" />

        {/* Plans Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-center">
            {t("reactivate.choosePlan")}
          </h2>
          <p className="text-muted-foreground text-center mb-6">
            {t("reactivate.syncMessage")}
          </p>

          {plans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Nenhum plano disponível</p>
                <p className="text-muted-foreground">
                  Entre em contato com o suporte para mais informações.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const isSelected = selectedPlan?.id === plan.id;
                const isHighlighted = plan.is_highlighted;

                return (
                  <Card
                    key={plan.id}
                    className={`relative cursor-pointer transition-all duration-200 ${isSelected
                      ? "ring-2 ring-primary border-primary shadow-lg"
                      : "hover:border-primary/50 hover:shadow-md"
                      } ${isHighlighted ? "border-primary/30" : ""}`}
                    onClick={() => {
                      setSelectedPlan(plan);
                      if (plan.prices?.length > 0) {
                        setSelectedPriceId(plan.prices[0].price_id);
                      }
                    }}
                  >
                    {/* Highlighted badge */}
                    {isHighlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground shadow-sm">
                          <Crown className="h-3 w-3 mr-1" />
                          {t("reactivate.mostPopular")}
                        </Badge>
                      </div>
                    )}

                    <CardHeader className={isHighlighted ? "pt-6" : ""}>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      {plan.description && (
                        <CardDescription>{plan.description}</CardDescription>
                      )}
                    </CardHeader>

                    <CardContent>
                      {/* Price */}
                      {plan.prices?.[0] && (
                        <div className="mb-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-primary">
                              {formatPrice(plan.prices[0].display_price, plan.prices[0].display_currency)}
                            </span>
                            <span className="text-muted-foreground">
                              /{plan.prices[0].interval === "month" ? t("reactivate.perMonth") : t("reactivate.perYear")}
                            </span>
                          </div>
                          {plan.prices[0].promo_text && (
                            <Badge variant="secondary" className="mt-1">
                              {plan.prices[0].promo_text}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Features */}
                      <ul className="space-y-3 pt-4 border-t border-border/50">
                        {plan.features.map((featureName, index) => (
                          <li key={index} className="flex items-start gap-3 text-[13px] leading-tight text-foreground/80 group/feat">
                            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 mt-0.5">
                              <Check className="h-3 w-3 text-primary stroke-[3]" />
                            </div>
                            <span className="font-medium group-hover/feat:text-foreground transition-colors">
                              {featureName}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* Price Options */}
                      {plan.prices?.length > 1 && isSelected && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                          {plan.prices.map((price) => (
                            <Button
                              key={price.id}
                              size="sm"
                              variant={selectedPriceId === price.price_id ? "default" : "outline"}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPriceId(price.price_id);
                              }}
                            >
                              {price.label || (price.interval === "month" ? "Mensal" : "Anual")}
                            </Button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Checkout Button */}
        {plans.length > 0 && (
          <Card className="sticky bottom-4 shadow-lg border-primary/20">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 text-center sm:text-left">
                  {selectedPlan && (
                    <p className="text-sm text-muted-foreground">
                      {t("reactivate.selectedPlan")}: <span className="font-medium text-foreground">{selectedPlan.name}</span>
                    </p>
                  )}
                </div>
                <Button
                  size="lg"
                  onClick={handleReactivate}
                  disabled={isLoading || (!selectedPriceId && selectedPlan?.id !== 'free')}
                  className="w-full sm:w-auto min-w-[200px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("reactivate.processing")}
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      {t("reactivate.subscribeNow")}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>{t("reactivate.securePayment")}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("reactivate.needHelp")}{" "}
            <a
              href={`mailto:${branding.supportEmail || 'support@fitresults.com'}`}
              className="text-primary hover:underline font-medium"
            >
              {t("reactivate.contactSupport")}
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
