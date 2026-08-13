import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dumbbell,
  Check,
  ArrowRight,
  ChevronDown,
  Star,
  Shield,
  CreditCard,
  Droplets,
  Moon,
  Utensils,
  Trophy,
  CalendarCheck,
  TrendingUp,
  Zap,
  Bell,
  Smartphone,
  Globe,
  Lock,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useGlobalBranding } from "@/hooks/useBranding";
import { useI18n } from "@/hooks/useI18n";
import "./LandingPage.css";

/**
 * Rating shown above the testimonials.
 *
 * Kept in one place on purpose: these are public claims about the product, so
 * they need to match reality before the page goes in front of buyers. Set
 * `show: false` to drop the whole rating row until there are real numbers.
 */
const SOCIAL_PROOF = {
  show: true,
  score: "4,6 / 5",
  count: "+2.300",
};

const STREAK_DAYS = 12;

/** Icons for the "what's included" list; the copy itself comes from i18n. */
const includedIcons = [
  CalendarCheck, Dumbbell, Utensils, Trophy, TrendingUp,
  Bell, Smartphone, Shield, Zap, CreditCard,
];

type LandingPrice = {
  priceId: string;
  /** Admin-set override; null means the name follows the interface language. */
  name: string | null;
  interval: string;
  amount: number;
  currency: string;
  promo: string | null;
  popular: boolean;
};

type ListPlansRow = {
  priceId: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  label: string | null;
};

/**
 * Billing options shown on the pricing section.
 *
 * Comes from the `list-plans` function, which reads Stripe directly. Prices
 * used to be mirrored into `plan_prices`, and that copy is exactly how the page
 * ended up advertising R$ 29,90 against a USD 4.99 charge. Stripe is now the
 * only place a price is defined.
 */
function useLandingPrices() {
  return useQuery({
    queryKey: ["landing-prices"],
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<LandingPrice[]> => {
      const { data, error } = await supabase.functions.invoke("list-plans");
      if (error) throw error;

      const rows: LandingPrice[] = ((data?.plans ?? []) as ListPlansRow[]).map(p => ({
        priceId: p.priceId,
        // Stripe's price nickname is an explicit override when set; leaving it
        // empty lets the card name follow the interface language.
        name: p.label ?? null,
        interval: normaliseInterval(p.interval, p.intervalCount),
        amount: p.amount,
        currency: p.currency,
        promo: null,
        popular: false,
      }));

      // Middle option carries the badge, which is where the eye lands first.
      if (rows.length === 3) rows[1].popular = true;
      return rows;
    },
  });
}

/**
 * Stripe models "every 3 months" as interval=month with interval_count=3.
 * Collapse that into the single token the copy keys are written against.
 */
function normaliseInterval(interval: string, count: number): string {
  if (interval === "year") return "year";
  if (interval === "month" && count === 12) return "year";
  if (interval === "month" && count === 6) return "semester";
  if (interval === "month" && count === 3) return "quarter";
  if (interval === "week" && count === 4) return "month";
  return interval;
}

export default function LandingPage() {
  const { branding } = useGlobalBranding();
  const { t, language } = useI18n();
  const { data: prices = [], isLoading: pricesLoading } = useLandingPrices();
  const [selected, setSelected] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const appName = branding.appName || "MooveBody";
  const locale = language || "pt-BR";

  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);

  /** Card title: the admin's label when set, otherwise the localised period. */
  const planName = (price: LandingPrice) => {
    if (price.name) return price.name;
    if (price.interval === "year" || price.interval === "annual") return t("landing.plans.nameYear");
    if (price.interval === "quarter" || price.interval === "quarterly") return t("landing.plans.nameQuarter");
    if (price.interval === "semester" || price.interval === "semiannual") return t("landing.plans.nameSemester");
    return t("landing.plans.nameMonth");
  };

  /** "/month", "/3 months", "/year" for the price suffix. */
  const periodLabel = (interval: string) => {
    if (interval === "year" || interval === "annual") return t("landing.plans.perYear");
    if (interval === "quarter" || interval === "quarterly") return t("landing.plans.perMonths", { count: 3 });
    if (interval === "semester" || interval === "semiannual") return t("landing.plans.perMonths", { count: 6 });
    return t("landing.plans.perMonth");
  };

  /** Renewal sentence shown under the plan name. */
  const renewLabel = (price: LandingPrice) => {
    const formatted = money(price.amount, price.currency);
    if (price.interval === "year" || price.interval === "annual") {
      return t("landing.plans.renewYear", { price: formatted });
    }
    if (price.interval === "quarter" || price.interval === "quarterly") {
      return t("landing.plans.renewMonths", { price: formatted, count: 3 });
    }
    if (price.interval === "semester" || price.interval === "semiannual") {
      return t("landing.plans.renewMonths", { price: formatted, count: 6 });
    }
    return t("landing.plans.renewMonth", { price: formatted });
  };

  /**
   * Lists out of i18n.
   *
   * `t()` stringifies whatever it finds unless `returnObjects` is set, so
   * asking for a list without it hands back "[object Object],[object Object]"
   * and the `.map()` further down throws — which unmounts the tree and leaves
   * the visitor a blank page. The `Array.isArray` guard means a key that goes
   * missing costs one empty section instead of the whole landing page.
   */
  const list = <T,>(key: string): T[] => {
    const value = t(key, { returnObjects: true });
    return Array.isArray(value) ? (value as T[]) : [];
  };

  const steps = list<{ title: string; desc: string }>("landing.how.steps");
  const includedItems = list<string>("landing.included.items");
  const members = list<{ initials: string; name: string; role: string; text: string }>(
    "landing.members.items"
  );
  const faqs = list<{ q: string; a: string }>("landing.faq.items");

  const heroRows = [
    { icon: Droplets, label: t("landing.preview.water"), value: "1,8 L", pct: 72 },
    { icon: Moon, label: t("landing.preview.sleep"), value: "7 h 20", pct: 88 },
    { icon: Dumbbell, label: t("landing.preview.workout"), value: t("landing.preview.workoutDone"), pct: 100 },
    { icon: Utensils, label: t("landing.preview.meals"), value: "3 / 4", pct: 75 },
  ];

  const current = prices[selected];

  const logoMark = branding.logoUrl ? (
    <span className="lp-logo-mark"><img src={branding.logoUrl} alt={appName} /></span>
  ) : (
    <span className="lp-logo-mark"><Dumbbell size={18} /></span>
  );

  return (
    <div className="lp-root">
      {/* ===== HEADER ===== */}
      <header className="lp-header">
        <div className="lp-container lp-header-inner">
          <Link to="/" className="lp-logo">
            {logoMark}
            <span className="lp-logo-name">{appName}</span>
          </Link>

          <nav className="lp-nav">
            <a className="lp-nav-link" href="#como-funciona">{t("landing.nav.how")}</a>
            <a className="lp-nav-link" href="#incluso">{t("landing.nav.included")}</a>
            <a className="lp-nav-link" href="#faq">{t("landing.nav.faq")}</a>
          </nav>

          <div className="lp-header-right">
            <LanguageSwitcher showLabel={false} />
            <Link to="/auth" className="lp-btn lp-btn-ghost">{t("landing.nav.login")}</Link>
            <Link to="/checkout" className="lp-btn lp-btn-dark">{t("landing.nav.plans")}</Link>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="lp-hero" id="top">
        <div className="lp-container lp-hero-inner">
          <div className="lp-hero-copy">
            <h1>
              {t("landing.hero.title")} <span>{t("landing.hero.accent")}</span>
            </h1>
            <p className="lp-hero-desc">{t("landing.hero.desc")}</p>
            <div className="lp-hero-ctas">
              <Link to="/checkout" className="lp-btn lp-btn-dark lp-btn-lg">
                {t("landing.hero.ctaPlans")}
              </Link>
              <a href="#como-funciona" className="lp-btn lp-btn-outline lp-btn-lg">
                {t("landing.hero.ctaHow")}
              </a>
            </div>
            <p className="lp-hero-note">{t("landing.hero.note")}</p>
          </div>

          {/* Product preview, drawn rather than photographed: there is no
              photography in the project yet. */}
          <div className="lp-hero-visual" aria-hidden="true">
            <div className="lp-preview">
              <div className="lp-preview-head">
                <span className="lp-preview-title">{t("landing.preview.today")}</span>
                <span className="lp-preview-streak">
                  <Zap size={13} /> {t("landing.preview.streak", { days: STREAK_DAYS })}
                </span>
              </div>
              {heroRows.map((row, i) => {
                const Icon = row.icon;
                return (
                  <div key={i} className="lp-preview-row">
                    <span className="lp-preview-icon"><Icon size={16} /></span>
                    <div className="lp-preview-body">
                      <div className="lp-preview-labels">
                        <span>{row.label}</span>
                        <strong>{row.value}</strong>
                      </div>
                      <div className="lp-preview-bar">
                        <span style={{ width: `${row.pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="lp-preview-foot">
                <Check size={14} /> {t("landing.preview.done")}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="lp-section" id="como-funciona">
        <div className="lp-container">
          <p className="lp-eyebrow">{t("landing.how.eyebrow")}</p>
          <h2 className="lp-section-title">{t("landing.how.title")}</h2>
          <p className="lp-section-subtitle">{t("landing.how.subtitle")}</p>
          <div className="lp-steps-grid">
            {steps.map((step, i) => (
              <div key={i} className="lp-step">
                <div className="lp-step-num">{t("landing.how.stepLabel", { n: i + 1 })}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== INCLUDED ===== */}
      <section className="lp-section lp-section-alt" id="incluso">
        <div className="lp-container">
          <p className="lp-eyebrow">{t("landing.included.eyebrow")}</p>
          <h2 className="lp-section-title">{t("landing.included.title")}</h2>
          <p className="lp-section-subtitle">{t("landing.included.subtitle", { appName })}</p>
          <div className="lp-included-panel">
            <div className="lp-included-grid">
              {includedItems.map((text, i) => {
                const Icon = includedIcons[i] || Check;
                return (
                  <div key={i} className="lp-included-item">
                    <span className="lp-included-check"><Check size={13} strokeWidth={3} /></span>
                    <span className="lp-included-text">
                      <Icon size={15} className="lp-included-icon" />
                      {text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===== MEMBERS ===== */}
      <section className="lp-section" id="depoimentos">
        <div className="lp-container">
          <p className="lp-eyebrow">{t("landing.members.eyebrow")}</p>
          <h2 className="lp-section-title">{t("landing.members.title")}</h2>

          {SOCIAL_PROOF.show && (
            <div className="lp-rating-row">
              <span className="lp-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={17} fill="var(--lp-star)" color="var(--lp-star)" />
                ))}
              </span>
              <span className="lp-rating-score">{SOCIAL_PROOF.score}</span>
              <span className="lp-rating-count">· {SOCIAL_PROOF.count}</span>
            </div>
          )}

          <div className="lp-testimonials-grid">
            {members.map((m, i) => (
              <div key={i} className="lp-testimonial-card">
                <div className="lp-stars">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={15} fill="var(--lp-star)" color="var(--lp-star)" />
                  ))}
                </div>
                <p className="lp-testimonial-text">{m.text}</p>
                <div className="lp-testimonial-footer">
                  <div className="lp-testimonial-avatar">{m.initials}</div>
                  <div>
                    <div className="lp-testimonial-name">{m.name}</div>
                    <div className="lp-testimonial-role"><Check size={12} /> {m.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="lp-fineprint">{t("landing.members.fineprint", { appName })}</p>
        </div>
      </section>

      {/* ===== PLANS ===== */}
      <section className="lp-section lp-section-alt" id="planos">
        <div className="lp-container">
          <p className="lp-eyebrow">{t("landing.plans.eyebrow")}</p>
          <h2 className="lp-section-title">{t("landing.plans.title")}</h2>
          <p className="lp-section-subtitle">{t("landing.plans.subtitle")}</p>

          {pricesLoading ? (
            <div className="lp-plans-grid">
              {[0, 1, 2].map(i => <div key={i} className="lp-plan-skeleton" />)}
            </div>
          ) : prices.length === 0 ? (
            <p className="lp-plans-empty">{t("landing.plans.empty")}</p>
          ) : (
            <>
              <div className="lp-plans-grid">
                {prices.map((price, i) => (
                  <button
                    key={price.priceId}
                    type="button"
                    onClick={() => setSelected(i)}
                    aria-pressed={selected === i}
                    className={`lp-plan-card ${selected === i ? "selected" : ""} ${price.popular ? "has-popular" : ""}`}
                  >
                    {price.popular && (
                      <span className="lp-plan-ribbon">{t("landing.plans.popular")}</span>
                    )}
                    <span className="lp-plan-inner">
                      <span className="lp-plan-radio-row">
                        <span className="lp-plan-radio">
                          {selected === i && <span className="lp-plan-radio-dot" />}
                        </span>
                        <span className="lp-plan-name">{planName(price)}</span>
                      </span>
                      <span className="lp-plan-renew">{renewLabel(price)}</span>
                      <span className="lp-plan-price">
                        {money(price.amount, price.currency)}{" "}
                        <span>{periodLabel(price.interval)}</span>
                      </span>
                      {price.promo && <span className="lp-plan-promo">{price.promo}</span>}
                    </span>
                  </button>
                ))}
              </div>

              <p className="lp-plans-note">{t("landing.plans.note")}</p>

              {current && (
                <p className="lp-plans-terms">
                  {t("landing.plans.terms", { price: money(current.amount, current.currency) })}
                </p>
              )}

              <p className="lp-plans-legal">
                <Link to="/terms" className="lp-link">{t("landing.footer.terms")}</Link>
                {" · "}
                <Link to="/privacy" className="lp-link">{t("landing.footer.privacy")}</Link>
              </p>
            </>
          )}

          <div className="lp-plans-cta">
            <Link to="/checkout" className="lp-btn lp-btn-dark lp-btn-xl">
              {t("landing.plans.cta")} <ArrowRight size={19} />
            </Link>
            <div className="lp-trust-row">
              <span><Shield size={15} /> {t("landing.trust.secure")}</span>
              <span><Lock size={15} /> {t("landing.trust.encrypted")}</span>
              <span><CreditCard size={15} /> {t("landing.trust.cards")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="lp-section" id="faq">
        <div className="lp-container lp-container-narrow">
          <p className="lp-eyebrow">{t("landing.faq.eyebrow")}</p>
          <h2 className="lp-section-title">{t("landing.faq.title")}</h2>
          <div className="lp-faq-wrap">
            {faqs.map((faq, i) => (
              <div key={i} className={`lp-faq-item ${openFaq === i ? "open" : ""}`}>
                <button
                  type="button"
                  className="lp-faq-q"
                  aria-expanded={openFaq === i}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {faq.q}
                  <ChevronDown size={19} />
                </button>
                {openFaq === i && <div className="lp-faq-a">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="lp-final">
        <div className="lp-container">
          <h2>{t("landing.final.title")}</h2>
          <p>{t("landing.final.desc")}</p>
          <Link to="/checkout" className="lp-btn lp-btn-light lp-btn-xl">
            {t("landing.final.cta")} <ArrowRight size={19} />
          </Link>
          <div className="lp-trust-row lp-trust-row-light">
            <span><Lock size={15} /> {t("landing.trust.safe")}</span>
            <span><Globe size={15} /> {t("landing.trust.stripe")}</span>
            <span><Check size={15} /> {t("landing.trust.guarantee")}</span>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <Link to="/" className="lp-logo">
                {logoMark}
                <span className="lp-logo-name">{appName}</span>
              </Link>
              <p className="lp-footer-tagline">
                {branding.tagline || t("landing.hero.desc")}
              </p>
            </div>
            <div className="lp-footer-links">
              <strong>{t("landing.footer.navTitle")}</strong>
              <a href="#como-funciona">{t("landing.nav.how")}</a>
              <a href="#incluso">{t("landing.nav.included")}</a>
              <a href="#faq">{t("landing.nav.faq")}</a>
            </div>
            <div className="lp-footer-links">
              <strong>{t("landing.footer.accountTitle")}</strong>
              <Link to="/auth">{t("landing.nav.login")}</Link>
              <Link to="/checkout">{t("landing.nav.plans")}</Link>
              <a href={`mailto:${branding.supportEmail}`}>{t("landing.footer.contact")}</a>
            </div>
            <div className="lp-footer-links">
              <strong>{t("landing.footer.legalTitle")}</strong>
              <Link to="/terms">{t("landing.footer.terms")}</Link>
              <Link to="/privacy">{t("landing.footer.privacy")}</Link>
              <Link to="/privacy">{t("landing.footer.refund")}</Link>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>© {new Date().getFullYear()} {appName}. {t("landing.footer.rights")}</span>
            <LanguageSwitcher showLabel={false} />
          </div>
        </div>
      </footer>
    </div>
  );
}
