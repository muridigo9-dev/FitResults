import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dumbbell,
  Check,
  ArrowRight,
  Loader2,
  Shield,
  CreditCard,
  Sparkles,
  User,
  Eye,
  EyeOff,
  LogOut
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/components/layout/AuthGuard";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "sonner";
import { useBranding } from "@/hooks/useBranding";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { FacebookAuthButton } from "@/components/auth/FacebookAuthButton";
import { MagicLinkButton } from "@/components/auth/MagicLinkButton";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

interface Plan {
  plan_id: string;
  plan_name: string;
  description: string | null;
  display_order: number;
  features: string[];
  price_id: string;
  price_interval: string;
  display_price: number;
  display_currency: string;
  promo_text?: string | null;
}

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useI18n();
  const { user, signUp, signOut } = useAuth();
  const { branding } = useBranding();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const { data: subscriptionStatus } = useSubscriptionStatus();

  useEffect(() => {
    if (user && subscriptionStatus?.isActive) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, subscriptionStatus, navigate]);

  // Load plans using direct table access (publicly available)
  useEffect(() => {
    const loadPlans = async () => {
      try {
        // isLoadingPlans is already true by default

        const { data: plansData, error: plansError } = await (supabase as any)
          .from("plans")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (plansError) throw plansError;

        const { data: pricesData, error: pricesError } = await (supabase as any)
          .from("plan_prices")
          .select("*")
          .eq("is_active", true);

        if (pricesError) throw pricesError;

        const formattedPlans = (plansData || []).map((plan: any) => {
          const prices = (pricesData || []).filter((p: any) => p.plan_id === plan.id);
          const price = prices.find((p: any) => p.interval === 'month') || prices[0];

          if (!price) return null;

          let finalFeatures: string[] = [];

          const getSafeArray = (arr: any): string[] => {
            if (Array.isArray(arr)) return arr;
            if (typeof arr === 'string') {
              try {
                const parsed = JSON.parse(arr);
                if (Array.isArray(parsed)) return parsed;
              } catch (e) {
                return [arr];
              }
            }
            return [];
          };

          if (plan.features) {
            finalFeatures = getSafeArray(plan.features);
          }

          return {
            plan_id: plan.id,
            plan_name: plan.name,
            description: plan.description,
            display_order: plan.display_order,
            price_id: price.price_id,
            display_price: price.display_price,
            display_currency: price.display_currency,
            price_interval: price.interval,
            features: finalFeatures,
            promo_text: price.promo_text
          };
        }).filter((p: any) => p !== null);

        setPlans(formattedPlans);
        if (formattedPlans.length > 0 && !selectedPlan) {
          setSelectedPlan(formattedPlans[0]);
          setSelectedPriceId(formattedPlans[0].price_id);
        }
      } catch (err) {
        console.error("[Checkout] Error loading data:", err);
        setPlans([]);
      } finally {
        setIsLoadingPlans(false);
      }
    };

    loadPlans();
  }, [language, selectedPlan]);

  const validateForm = () => {
    const newErrors: { name?: string; email?: string; password?: string } = {};

    if (!name.trim()) {
      newErrors.name = t("checkout.errors.nameRequired");
    } else if (name.trim().length < 2) {
      newErrors.name = t("checkout.errors.nameMin");
    }

    if (!email.trim()) {
      newErrors.email = t("checkout.errors.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t("checkout.errors.emailInvalid");
    }

    if (!password) {
      newErrors.password = t("checkout.errors.passwordRequired");
    } else if (password.length < 6) {
      newErrors.password = t("checkout.errors.passwordMin");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCheckout = async () => {
    if (!user && !validateForm()) return;

    if (!selectedPriceId) {
      toast.error(t("checkout.errors.selectPlan"));
      return;
    }

    setIsLoading(true);

    try {
      const currentUserEmail = user?.email || email.trim().toLowerCase();
      const currentUserName = user?.user_metadata?.full_name || name.trim() || user?.email?.split('@')[0];

      if (!user) {
        console.log(`[Checkout] Creating account for: ${email}`);
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/dashboard`
          }
        });

        if (signUpError && !signUpError.message.includes("User already registered")) {
          throw signUpError;
        }
      }

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          name: currentUserName,
          email: currentUserEmail,
          price_id: selectedPriceId,
          plan_id: selectedPlan?.plan_id,
          success_url: `${window.location.origin}/checkout/success`,
          cancel_url: window.location.href,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error(t("checkout.errors.unexpected") || "Checkout URL not received");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || t("checkout.errors.unexpected") || "Error initiating checkout");
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    // Corrected: price is assumed to be in major units (e.g. 10.00 for 10 BRL)
    return new Intl.NumberFormat(language, {
      style: "currency",
      currency: currency || "BRL",
    }).format(price);
  };

  if (isLoadingPlans) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-soft via-background to-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t("checkout.loadingPlans")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white py-12 px-4 selection:bg-primary/30 relative">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher showLabel={false} />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-[1px] mx-auto mb-6 shadow-glow">
            <div className="w-full h-full bg-[#0a0a0c] rounded-2xl flex items-center justify-center overflow-hidden">
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.appName} className="h-8 w-8 object-contain" />
              ) : (
                <Dumbbell className="h-7 w-7 text-primary" />
              )}
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
            {t("checkout.title")}
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            {t("checkout.subtitle")}
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.2fr,0.8fr]">
          {/* Left: Plan Cards */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">{t("checkout.plansTitle")}</h2>
            </div>

            <div className="grid gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.plan_id}
                  onClick={() => {
                    setSelectedPlan(plan);
                    setSelectedPriceId(plan.price_id);
                  }}
                  className={cn(
                    "group relative p-[1px] rounded-[24px] cursor-pointer transition-all duration-500 overflow-hidden",
                    selectedPlan?.plan_id === plan.plan_id
                      ? "bg-gradient-to-br from-primary via-primary/50 to-transparent"
                      : "bg-white/5 hover:bg-white/10"
                  )}
                >
                  <div className="bg-[#121217] p-6 md:p-8 rounded-[23px] h-full transition-colors group-hover:bg-[#15151c]">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-2xl font-black">{plan.plan_name}</h3>
                          {selectedPlan?.plan_id === plan.plan_id && (
                            <Badge className="bg-primary hover:bg-primary text-white border-none px-3 py-1 font-bold text-[10px] uppercase tracking-widest">
                              {t("checkout.selected")}
                            </Badge>
                          )}
                        </div>

                        <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                          {plan.description}
                        </p>

                        <div className="grid grid-cols-1 gap-y-2.5 pt-4 border-t border-white/5 mt-4">
                          {(Array.isArray(plan.features) ? plan.features : []).map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-3 group/item">
                              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 mt-0.5">
                                <Check className="h-3 w-3 text-primary stroke-[3]" />
                              </div>
                              <span className="text-[13px] text-white/90 font-medium group-hover/item:text-white transition-colors leading-tight">
                                {feature}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="md:text-right flex flex-col justify-center min-w-[140px] border-t md:border-t-0 border-white/5 pt-6 md:pt-0 mt-2 md:mt-0">
                        {plan.promo_text && (
                          <div className="mb-2 md:text-right text-left">
                            <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-md border border-primary/20">
                              {plan.promo_text}
                            </span>
                          </div>
                        )}
                        <div className="text-4xl font-black text-primary mb-1">
                          {formatPrice(plan.display_price, plan.display_currency)}
                        </div>
                        <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                          {plan.price_interval === 'month' ? t("checkout.perMonth") : t("checkout.perYear")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Personal Data Form */}
          <div className="sticky top-12 h-fit">
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              {/* Glass reflection */}
              <div className="absolute -top-[50%] -right-[50%] w-[100%] h-[100%] bg-gradient-to-br from-white/10 to-transparent rotate-45 pointer-events-none" />

              <div className="relative z-10 space-y-8">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    {t("checkout.yourData")}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {t("checkout.userDataSubtitle")}
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  {!user ? (
                    <div className="grid gap-3">
                      <GoogleAuthButton redirectTo={`${window.location.origin}/checkout`} />
                      <FacebookAuthButton redirectTo={`${window.location.origin}/checkout`} />
                      <MagicLinkButton redirectTo={`${window.location.origin}/checkout`} />
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                          {user.email?.[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold truncate max-w-[150px]">{user.email}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{t("checkout.activeSession")}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-white/40 hover:text-white">
                        <LogOut size={16} />
                      </Button>
                    </div>
                  )}

                  {!user && (
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase tracking-widest">
                        <span className="bg-[#121217] px-3 text-white/40 text-[10px] font-bold">
                          {t("checkout.orUseEmail")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {!user && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-white/60 ml-1">{t("checkout.fullName")}</Label>
                      <Input
                        id="name"
                        placeholder="Diego Faria"
                        className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary focus:border-primary text-white placeholder:text-white/20 transition-all"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                      {errors.name && <p className="text-xs text-destructive animate-in fade-in slide-in-from-left-2">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-white/60 ml-1">{t("auth.email")}</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t("auth.emailPlaceholder")}
                        className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary focus:border-primary text-white placeholder:text-white/20 transition-all font-medium"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      {errors.email && <p className="text-xs text-destructive animate-in fade-in slide-in-from-left-2">{errors.email}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-white/60 ml-1">{t("checkout.createPassword")}</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary focus:border-primary text-white placeholder:text-white/20 transition-all pr-12"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {errors.password && <p className="text-xs text-destructive animate-in fade-in slide-in-from-left-2">{errors.password}</p>}
                    </div>
                  </div>
                )}

                {selectedPlan && (
                  <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 space-y-4 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{t("checkout.selectedPlanHeader")}</p>
                        <p className="text-lg font-bold">{selectedPlan.plan_name}</p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full h-16 rounded-2xl bg-primary hover:bg-primary-dark text-black font-black text-lg gap-3 transition-all active:scale-[0.98] shadow-[0_8px_32px_rgba(var(--primary-rgb),0.3)] group"
                  onClick={handleCheckout}
                  disabled={isLoading || !selectedPriceId}
                >
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="h-6 w-6" />
                      {t("checkout.subscribeNow")}
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-6 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                    <Shield className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{t("checkout.secure")}</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Stripe</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-24 text-center pb-12 opacity-30">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2">Developed by {branding?.appName || "FitResults"}</p>
        <div className="h-px w-12 bg-white mx-auto" />
      </div>
    </div>
  );
}
