import { useState } from "react";
import { Link } from "react-router-dom";
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
import "./LandingPage.css";

/**
 * Rating shown above the testimonials.
 *
 * Kept in one place on purpose: these are public claims about the product, so
 * they need to match reality before the page goes in front of buyers. Set
 * `show: false` to drop the whole rating row until there are real numbers to
 * put here.
 */
const SOCIAL_PROOF = {
  show: true,
  score: "4,6 / 5",
  count: "+2.300 avaliações verificadas",
};

// ===== DATA =====
const plans = [
  {
    name: "Plano Mensal",
    renew: "Renova automaticamente em R$ 29,90 a cada mês, até você cancelar.",
    price: "R$ 29,90",
    period: "/mês",
    popular: false,
  },
  {
    name: "Plano Trimestral",
    renew: "Renova automaticamente em R$ 79,90 a cada 3 meses, até você cancelar.",
    price: "R$ 79,90",
    period: "/trimestre",
    popular: true,
  },
  {
    name: "Plano Anual",
    renew: "Renova automaticamente em R$ 239,90 a cada 12 meses, até você cancelar.",
    price: "R$ 239,90",
    period: "/ano",
    popular: false,
  },
];

const steps = [
  {
    num: "1",
    title: "Escolha seu plano",
    desc: "Mensal, trimestral ou anual. O preço de entrada e o de renovação aparecem lado a lado — o que você vê é exatamente o que paga.",
  },
  {
    num: "2",
    title: "Revise e confirme",
    desc: "Antes do checkout você recebe um resumo: o total de hoje, o valor da renovação e o período. Nada é cobrado até você confirmar.",
  },
  {
    num: "3",
    title: "Comece — ajuste quando quiser",
    desc: "Registre treinos, refeições e hábitos todo dia. Pause, troque de plano ou cancele quando quiser, direto nas configurações.",
  },
];

const included = [
  { icon: CalendarCheck, text: "Check-in diário: água, sono, treino e refeições" },
  { icon: Dumbbell, text: "Treinos guiados e biblioteca de exercícios" },
  { icon: Utensils, text: "Planos alimentares e contagem de macros" },
  { icon: Trophy, text: "Gamificação com XP, níveis e conquistas" },
  { icon: TrendingUp, text: "Gráficos de progresso e métricas de evolução" },
  { icon: Bell, text: "Lembretes suaves — desative quando quiser" },
  { icon: Smartphone, text: "Instale no celular como app (PWA)" },
  { icon: Shield, text: "Garantia de 7 dias no seu primeiro pedido" },
  { icon: Zap, text: "Cancele nas configurações — sem ligações, sem formulários" },
  { icon: CreditCard, text: "Preço integral exibido antes de cada cobrança" },
];

const testimonials = [
  {
    initials: "MC",
    name: "Mariana Costa",
    role: "Usuária verificada",
    text: "Finalmente um lugar para registrar tudo — treino, água e refeições em um só app. <strong>Muito motivador!</strong> Já recomendei para as minhas amigas.",
  },
  {
    initials: "JR",
    name: "João Ribeiro",
    role: "Usuário verificado",
    text: "O check-in diário me trouxe uma constância que eu nunca tive. <strong>Três meses seguidos</strong> sem perder o ritmo. O melhor investimento da minha rotina.",
  },
  {
    initials: "AS",
    name: "Aline Santos",
    role: "Usuária verificada",
    text: "Consegui cancelar e receber meu reembolso rapidinho, com atendimento muito atencioso. Mas logo voltei, porque <strong>sinto falta do app</strong>.",
  },
];

const faqs = [
  {
    q: "Como funciona a cobrança?",
    a: "No dia da compra você paga o preço de entrada do plano escolhido. A menos que você cancele, o plano renova automaticamente pelo preço de renovação indicado no plano (mais os impostos aplicáveis) ao final de cada período. O valor e a data de renovação sempre aparecem antes de você confirmar o pedido.",
  },
  {
    q: "Como eu cancelo?",
    a: "Você pode cancelar quando quiser, direto das configurações da sua conta — sem ligações e sem formulários. Ao cancelar, o acesso continua até o fim do período já pago.",
  },
  {
    q: "Qual é a política de reembolso?",
    a: "Oferecemos garantia incondicional de 7 dias no seu primeiro pedido. Se não gostar, é só solicitar o reembolso e devolvemos seu dinheiro. Consulte a política de assinatura e reembolso para mais detalhes.",
  },
  {
    q: "Preciso pagar para começar?",
    a: "Você cria sua conta gratuitamente e só decide pelo plano quando estiver pronto. Nenhum valor é cobrado sem a sua confirmação explícita.",
  },
  {
    q: "O app funciona no meu celular?",
    a: "Sim! O app é um PWA (Progressive Web App) e pode ser instalado direto no seu celular, como um app nativo — em Android, iOS e também no computador.",
  },
  {
    q: "É adequado para o meu nível de condicionamento?",
    a: "Sim. Você define seus objetivos, nível atual e preferências durante o cadastro, e a experiência se adapta a você. Oferecemos informações gerais sobre fitness e nutrição e não substituímos aconselhamento médico — consulte seu médico antes de iniciar qualquer programa.",
  },
];

/** The daily check-in rows drawn in the hero preview card. */
const heroPreview = [
  { icon: Droplets, label: "Água", value: "1,8 L", pct: 72 },
  { icon: Moon, label: "Sono", value: "7 h 20", pct: 88 },
  { icon: Dumbbell, label: "Treino", value: "Concluído", pct: 100 },
  { icon: Utensils, label: "Refeições", value: "3 de 4", pct: 75 },
];

// ===== COMPONENT =====
export default function LandingPage() {
  const { branding } = useGlobalBranding();
  const [selectedPlan, setSelectedPlan] = useState(1);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const appName = branding.appName || "MooveBody";

  const logoMark = branding.logoUrl ? (
    <span className="lp-logo-mark">
      <img src={branding.logoUrl} alt={appName} />
    </span>
  ) : (
    <span className="lp-logo-mark">
      <Dumbbell size={18} />
    </span>
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
            <a className="lp-nav-link" href="#como-funciona">Como funciona</a>
            <a className="lp-nav-link" href="#incluso">O que está incluso</a>
            <a className="lp-nav-link" href="#faq">FAQ</a>
          </nav>

          <div className="lp-header-right">
            <LanguageSwitcher showLabel={false} />
            <Link to="/auth" className="lp-btn lp-btn-ghost">Entrar</Link>
            <Link to="/checkout" className="lp-btn lp-btn-dark">
              Ver planos e preços
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="lp-hero" id="top">
        <div className="lp-container lp-hero-inner">
          <div className="lp-hero-copy">
            <h1>
              Treine com constância — <span>no seu ritmo</span>
            </h1>
            <p className="lp-hero-desc">
              Treinos guiados, orientação nutricional e check-in diário reunidos em
              um só lugar. Todo preço aparece antes de você pagar — sem renovação
              escondida, sem surpresa na letra miúda.
            </p>
            <div className="lp-hero-ctas">
              <Link to="/checkout" className="lp-btn lp-btn-dark lp-btn-lg">
                Ver planos
              </Link>
              <a href="#como-funciona" className="lp-btn lp-btn-outline lp-btn-lg">
                Como funciona
              </a>
            </div>
            <p className="lp-hero-note">
              Planos a partir de um mês. Cancele quando quiser.
            </p>
          </div>

          {/* Product preview, drawn rather than photographed: there is no
              photography in the project yet, and a real screenshot beats a
              stock photo for a tracking app anyway. */}
          <div className="lp-hero-visual" aria-hidden="true">
            <div className="lp-preview">
              <div className="lp-preview-head">
                <span className="lp-preview-title">Hoje</span>
                <span className="lp-preview-streak">
                  <Zap size={13} /> 12 dias seguidos
                </span>
              </div>
              {heroPreview.map((row, i) => {
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
                <Check size={14} /> Check-in do dia concluído
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="lp-section" id="como-funciona">
        <div className="lp-container">
          <p className="lp-eyebrow">Como funciona</p>
          <h2 className="lp-section-title">
            Três passos simples — você no controle o tempo todo
          </h2>
          <p className="lp-section-subtitle">
            Você vê e confirma o plano completo antes de qualquer pagamento. Nada é
            cobrado até você dizer sim.
          </p>
          <div className="lp-steps-grid">
            {steps.map((step, i) => (
              <div key={i} className="lp-step">
                <div className="lp-step-num">Passo {step.num}</div>
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
          <p className="lp-eyebrow">O que está incluso</p>
          <h2 className="lp-section-title">
            Um plano completo — a única escolha é por quanto tempo
          </h2>
          <p className="lp-section-subtitle">
            Todos os planos incluem a experiência completa do {appName}. O período de
            cobrança é a única coisa que muda.
          </p>
          <div className="lp-included-panel">
            <div className="lp-included-grid">
              {included.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="lp-included-item">
                    <span className="lp-included-check"><Check size={13} strokeWidth={3} /></span>
                    <span className="lp-included-text">
                      <Icon size={15} className="lp-included-icon" />
                      {item.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="lp-section" id="depoimentos">
        <div className="lp-container">
          <p className="lp-eyebrow">Dos nossos membros</p>
          <h2 className="lp-section-title">
            A confiança de quem queria um começo mais simples
          </h2>

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
            {testimonials.map((t, i) => (
              <div key={i} className="lp-testimonial-card">
                <div className="lp-stars">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={15} fill="var(--lp-star)" color="var(--lp-star)" />
                  ))}
                </div>
                <p className="lp-testimonial-text" dangerouslySetInnerHTML={{ __html: t.text }} />
                <div className="lp-testimonial-footer">
                  <div className="lp-testimonial-avatar">{t.initials}</div>
                  <div>
                    <div className="lp-testimonial-name">{t.name}</div>
                    <div className="lp-testimonial-role">
                      <Check size={12} /> {t.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="lp-fineprint">
            As avaliações refletem experiências e pontos de vista individuais dos
            membros; os resultados variam e não são garantidos. As avaliações são de
            compradores verificados e não são incentivadas. O {appName} não oferece
            aconselhamento médico — consulte seu médico antes de iniciar qualquer
            programa de exercícios ou nutrição.
          </p>
        </div>
      </section>

      {/* ===== PLANS ===== */}
      <section className="lp-section lp-section-alt" id="planos">
        <div className="lp-container">
          <p className="lp-eyebrow">Planos e preços</p>
          <h2 className="lp-section-title">Preço completo, nada escondido</h2>
          <p className="lp-section-subtitle">
            Cada plano mostra o preço de entrada e o de renovação juntos. Você revisa
            e confirma tudo antes de pagar.
          </p>

          <div className="lp-plans-grid">
            {plans.map((plan, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedPlan(i)}
                aria-pressed={selectedPlan === i}
                className={`lp-plan-card ${selectedPlan === i ? "selected" : ""} ${plan.popular ? "has-popular" : ""}`}
              >
                {plan.popular && <span className="lp-plan-ribbon">Mais popular</span>}
                <span className="lp-plan-inner">
                  <span className="lp-plan-radio-row">
                    <span className="lp-plan-radio">
                      {selectedPlan === i && <span className="lp-plan-radio-dot" />}
                    </span>
                    <span className="lp-plan-name">{plan.name}</span>
                  </span>
                  <span className="lp-plan-renew">{plan.renew}</span>
                  <span className="lp-plan-price">
                    {plan.price} <span>{plan.period}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>

          <p className="lp-plans-note">
            Nenhum pagamento nesta etapa — você revisa e confirma seu pedido no passo
            seguinte.
          </p>

          <p className="lp-plans-terms">
            Você será cobrado em {plans[selectedPlan].price} hoje. A menos que
            cancele, sua assinatura renova automaticamente pelo preço de renovação
            indicado acima (mais impostos aplicáveis). Cancele quando quiser nas
            configurações da conta. No passo seguinte você revisa o resumo do pedido e
            aceita os <Link to="/terms" className="lp-link">Termos de Serviço</Link> e a{" "}
            <Link to="/privacy" className="lp-link">Política de Privacidade</Link> antes
            do pagamento.
          </p>

          <div className="lp-plans-cta">
            <Link to="/checkout" className="lp-btn lp-btn-dark lp-btn-xl">
              Obter meu plano <ArrowRight size={19} />
            </Link>
            <div className="lp-trust-row">
              <span><Shield size={15} /> Pagamento seguro e garantia de 7 dias</span>
              <span><Lock size={15} /> Transações criptografadas</span>
              <span><CreditCard size={15} /> Todos os cartões e Pix</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="lp-section" id="faq">
        <div className="lp-container lp-container-narrow">
          <p className="lp-eyebrow">Perguntas, respondidas</p>
          <h2 className="lp-section-title">Dúvidas frequentes</h2>
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
          <h2>Comece agora, no seu ritmo</h2>
          <p>
            Registre hábitos, treinos e refeições e acompanhe sua evolução todos os
            dias. Sem fidelidade, sem mensalidade escondida.
          </p>
          <Link to="/checkout" className="lp-btn lp-btn-light lp-btn-xl">
            Ver planos e preços <ArrowRight size={19} />
          </Link>
          <div className="lp-trust-row lp-trust-row-light">
            <span><Lock size={15} /> Compra 100% segura</span>
            <span><Globe size={15} /> Pagamento via Stripe</span>
            <span><Check size={15} /> Garantia de 7 dias</span>
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
                {branding.tagline || "Seu app de saúde e bem-estar. Acompanhe dietas, treinos e progresso."}
              </p>
            </div>
            <div className="lp-footer-links">
              <strong>Navegação</strong>
              <a href="#como-funciona">Como funciona</a>
              <a href="#incluso">O que está incluso</a>
              <a href="#faq">Perguntas frequentes</a>
            </div>
            <div className="lp-footer-links">
              <strong>Conta</strong>
              <Link to="/auth">Entrar</Link>
              <Link to="/checkout">Ver planos e preços</Link>
              <a href={`mailto:${branding.supportEmail}`}>Contato</a>
            </div>
            <div className="lp-footer-links">
              <strong>Legal</strong>
              <Link to="/terms">Termos de Serviço</Link>
              <Link to="/privacy">Política de Privacidade</Link>
              <Link to="/privacy">Política de Reembolso</Link>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>© {new Date().getFullYear()} {appName}. Todos os direitos reservados.</span>
            <LanguageSwitcher showLabel={false} />
          </div>
        </div>
      </footer>
    </div>
  );
}
