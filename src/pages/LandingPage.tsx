import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Dumbbell,
  ArrowRight,
  Droplets,
  Moon,
  Utensils,
  Trophy,
  LogIn,
  Check,
  Users,
  BarChart3,
  Target,
  Scale,
  CalendarCheck,
  Smartphone,
  Shield,
  Zap,
  Heart,
  Award,
  MessageSquare,
  Bell,
  Palette,
  Globe,
  CreditCard,
  Building2,
  UserCog,
  FileText,
  Settings,
  LineChart,
  Sparkles,
  ChevronRight,
  Star,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useGlobalBranding, applyBrandingToDOM } from "@/hooks/useBranding";
import { useI18n } from "@/hooks/useI18n";
import { useEffect } from "react";
import { useBrandingContext } from "@/contexts/BrandingContext";

export default function LandingPage() {
  const { t } = useI18n();
  const { branding } = useGlobalBranding();
  const { isDarkMode: userThemePreference } = useBrandingContext();
  const isDark = branding.landingPageTheme === "dark";

  // Note: Theme forcing for Landing Page is now handled globally in BrandingContext.tsx
  // based on the location.pathname === '/' check.

  // Feature categories with icons and descriptions
  const featureCategories = [
    {
      title: t("landing.features.categories.users.title"),
      icon: Users,
      color: "primary",
      features: t("landing.features.categories.users.items", { returnObjects: true }) as unknown as string[] || [],
    },
    {
      title: t("landing.features.categories.dashboard.title"),
      icon: BarChart3,
      color: "tertiary",
      features: t("landing.features.categories.dashboard.items", { returnObjects: true }) as unknown as string[] || [],
    },
    {
      title: t("landing.features.categories.checkin.title"),
      icon: CalendarCheck,
      color: "accent",
      features: t("landing.features.categories.checkin.items", { returnObjects: true }) as unknown as string[] || [],
    },
    {
      title: t("landing.features.categories.nutrition.title"),
      icon: Utensils,
      color: "habit-meals",
      features: t("landing.features.categories.nutrition.items", { returnObjects: true }) as unknown as string[] || [],
    },
    {
      title: t("landing.features.categories.workouts.title"),
      icon: Dumbbell,
      color: "habit-workout",
      features: t("landing.features.categories.workouts.items", { returnObjects: true }) as unknown as string[] || [],
    },
    {
      title: t("landing.features.categories.gamification.title"),
      icon: Trophy,
      color: "level-gold",
      features: t("landing.features.categories.gamification.items", { returnObjects: true }) as unknown as string[] || [],
    },
    {
      title: t("landing.features.categories.habits.title"),
      icon: Target,
      color: "success",
      features: t("landing.features.categories.habits.items", { returnObjects: true }) as unknown as string[] || [],
    },
    {
      title: t("landing.features.categories.metrics.title"),
      icon: Scale,
      color: "quaternary",
      features: t("landing.features.categories.metrics.items", { returnObjects: true }) as unknown as string[] || [],
    },
    {
      title: t("landing.features.categories.trainer.title"),
      icon: UserCog,
      color: "primary",
      features: t("landing.features.categories.trainer.items", { returnObjects: true }) as unknown as string[] || [],
    },
    {
      title: t("landing.features.categories.communication.title"),
      icon: MessageSquare,
      color: "tertiary",
      features: t("landing.features.categories.communication.items", { returnObjects: true }) as unknown as string[] || [],
    },
    {
      title: t("landing.features.categories.admin_panel.title"),
      icon: Settings,
      color: "muted-foreground",
      features: t("landing.features.categories.admin_panel.items", { returnObjects: true }) as unknown as string[] || [],
    },
    {
      title: t("landing.features.categories.branding.title"),
      icon: Palette,
      color: "accent",
      features: t("landing.features.categories.branding.items", { returnObjects: true }) as unknown as string[] || [],
    },
  ];

  const techFeatures = [
    {
      icon: Smartphone,
      title: t("landing.tech.pwa.title"),
      description: t("landing.tech.pwa.desc"),
    },
    {
      icon: Globe,
      title: t("landing.tech.multiLanguage.title"),
      description: t("landing.tech.multiLanguage.desc"),
    },
    {
      icon: Shield,
      title: t("landing.tech.security.title"),
      description: t("landing.tech.security.desc"),
    },
    {
      icon: CreditCard,
      title: t("landing.tech.stripe.title"),
      description: t("landing.tech.stripe.desc"),
    },
    {
      icon: Zap,
      title: t("landing.tech.performance.title"),
      description: t("landing.tech.performance.desc"),
    },
    {
      icon: Building2,
      title: t("landing.tech.multiTenant.title"),
      description: t("landing.tech.multiTenant.desc"),
    },
  ];

  const testimonials = (t("landing.testimonials.items", { returnObjects: true }) as unknown as any[]) || [
    {
      name: "Carlos Silva",
      role: t("landing.testimonials.roles.trainer"),
      image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop",
      text: t("landing.testimonials.texts.trainer"),
    },
    {
      name: "Ana Oliveira",
      role: t("landing.testimonials.roles.student"),
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=1470&auto=format&fit=crop",
      text: t("landing.testimonials.texts.student"),
    },
    {
      name: "Pedro Santos",
      role: t("landing.testimonials.roles.gymOwner"),
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=1470&auto=format&fit=crop",
      text: t("landing.testimonials.texts.gymOwner"),
    },
  ];
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.appName} className="h-9 w-auto object-contain" />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <span className="font-bold text-xl text-foreground">{branding.appName}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher showLabel={false} className="mr-2" />
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">
                <LogIn className="h-4 w-4 mr-2" />
                {t("landing.nav.login")}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/checkout">
                {t("landing.nav.subscribe")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-soft via-background to-background" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
              <Sparkles className="h-3 w-3 mr-1" />
              {t("landing.hero.badge")}
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              {t("landing.hero.title")
                .split("{highlight}")
                .map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span className="text-gradient-primary">
                        {t("landing.hero.highlight")}
                      </span>
                    )}
                  </span>
                ))}
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {branding.tagline || t("landing.hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="xl" className="text-lg px-8">
                <Link to="/checkout">
                  {t("landing.hero.ctaStart")}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="text-lg px-8">
                <Link to="/auth">
                  <LogIn className="h-5 w-5 mr-2" />
                  {t("landing.hero.ctaAccount")}
                </Link>
              </Button>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-3xl mx-auto">
              {[
                { value: t("landing.stats.featuresVal"), label: t("landing.stats.features") },
                { value: t("landing.stats.languagesVal"), label: t("landing.stats.languages") },
                { value: t("landing.stats.mobileVal"), label: t("landing.stats.mobile") },
                { value: t("landing.stats.supportVal"), label: t("landing.stats.support") },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Habit Icons Section */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[
              { icon: Droplets, label: t("landing.habits.hydration"), color: "habit-water" },
              { icon: Moon, label: t("landing.habits.sleep"), color: "habit-sleep" },
              { icon: Dumbbell, label: t("landing.habits.training"), color: "habit-workout" },
              { icon: Utensils, label: t("landing.habits.nutrition"), color: "habit-meals" },
              { icon: Heart, label: t("landing.habits.wellbeing"), color: "accent" },
              { icon: Target, label: t("landing.habits.goals"), color: "success" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-2xl bg-${item.color}/10 flex items-center justify-center border border-${item.color}/20`}>
                    <Icon className={`h-6 w-6 text-${item.color}`} />
                  </div>
                  <span className="font-medium text-foreground">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">
              {t("landing.features.badge")}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("landing.features.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("landing.features.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCategories.map((category, i) => {
              const Icon = category.icon;
              return (
                <Card key={i} className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`h-12 w-12 rounded-2xl bg-${category.color}/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        <Icon className={`h-6 w-6 text-${category.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">{category.title}</h3>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {category.features.map((feature, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tech Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-tertiary/10 text-tertiary border-tertiary/20">
              {t("landing.tech.badge")}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("landing.tech.title")}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {techFeatures.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="flex items-start gap-4 p-6 rounded-2xl bg-background border border-border/50">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Admin Panel Features */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-quaternary/10 text-quaternary border-quaternary/20">
                {t("landing.admin_preview.badge")}
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                {t("landing.admin_preview.title")}
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                {t("landing.admin_preview.desc")}
              </p>
              <div className="space-y-4">
                {(t("landing.admin_preview.items", { returnObjects: true }) as unknown as string[] || []).map((item, i) => {
                  const itemsIcons = [Users, FileText, CreditCard, LineChart, Bell, Settings];
                  const Icon = itemsIcons[i] || Settings;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-foreground">{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary/20 via-tertiary/20 to-quaternary/20 flex items-center justify-center border border-border/50">
                <div className="text-center">
                  <Settings className="h-16 w-16 text-primary/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">{t("landing.admin_preview.previewText")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-success/10 text-success border-success/20">
              {t("landing.testimonials.badge")}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("landing.testimonials.title")}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-level-gold text-level-gold" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6">"{testimonial.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">{testimonial.name}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="h-20 w-20 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-8 shadow-glow overflow-hidden">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.appName} className="w-full h-full object-contain p-4" />
              ) : (
                <Award className="h-10 w-10 text-primary-foreground" />
              )}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              {t("landing.cta.title")}
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              {t("landing.cta.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="xl" className="text-lg px-8">
                <Link to="/checkout">
                  {t("landing.cta.ctaFree")}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="text-lg px-8">
                <a href={`mailto:${branding.supportEmail}`}>
                  {t("landing.cta.ctaSales")}
                  <ChevronRight className="h-5 w-5 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.appName} className="h-8 w-auto object-contain" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Dumbbell className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <span className="font-semibold text-foreground">{branding.appName}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("landing.footer.rights")}
            </p>
            <div className="flex items-center gap-4">
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("landing.footer.links.login")}
              </Link>
              <Link to="/checkout" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("landing.footer.links.plans")}
              </Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("landing.footer.links.privacy")}
              </Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("landing.footer.links.terms")}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
