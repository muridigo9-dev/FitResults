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
  Sparkles,
  Droplets,
  Moon,
  Utensils,
  Trophy,
  Target,
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
    desc: "Escolha a opção mensal, trimestral ou anual. O preço de entrada e o de renovação aparecem juntos — o que você vê é exatamente o que paga.",
  },
  {
    num: "2",
    title: "Crie sua conta",
    desc: "Cadastre-se em segundos com e-mail ou login social. Você revisa e confirma tudo antes de qualquer pagamento.",
  },
  {
    num: "3",
    title: "Comece a evoluir",
    desc: "Registre treinos, refeições e hábitos diários. Acompanhe seu progresso e ajuste tudo quando quiser, direto da página de perfil.",
  },
];

const included = [
  { icon: CalendarCheck, text: "Check-in diário: água, sono, treino e refeições" },
  { icon: Dumbbell, text: "Treinos guiados e biblioteca de exercícios" },
  { icon: Utensils, text: "Planos alimentares e contagem de macros" },
  { icon: Trophy, text: "Gamificação com XP, níveis e conquistas" },
  { icon: TrendingUp, text: "Gráficos de progresso e métricas de evolução" },
  { icon: Bell, text: "Lembretes suaves — você pode desativar quando quiser" },
  { icon: Smartphone, text: "Funciona no celular: instale como app (PWA)" },
  { icon: Shield, text: "Garantia de 7 dias no seu primeiro pedido" },
  { icon: Zap, text: "Cancele quando quiser, sem ligações e sem burocracia" },
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
    a: "Sim! O FitResults é um PWA (Progressive Web App) que pode ser instalado direto no seu celular, como um app nativo — em Android, iOS e também no computador.",
  },
  {
    q: "É adequado para o meu nível de condicionamento?",
    a: "Sim. Você define seus objetivos, nível atual e preferências durante o cadastro, e a experiência se adapta a você. O FitResults oferece informações gerais sobre fitness e nutrição e não substitui aconselhamento médico — consulte seu médico antes de iniciar qualquer programa.",
  },
];

// ===== COMPONENT =====
export default function LandingPage() {
  const { branding } = useGlobalBranding();
  const [selectedPlan, setSelectedPlan] = useState(1);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const appName = branding.appName || "FitResults";

  return (
    <div className="lp-root">
      {/* ===== HEADER ===== */}
      <header className="lp-header">
        <div className="lp-container lp-header-inner">
          <Link to="/" className="lp-logo">
            {branding.logoUrl ? (
              <span className="lp-logo-mark">
                <img src={branding.logoUrl} alt={appName} />
              </span>
            ) : (
              <span className="lp-logo-mark">
                <Dumbbell size={18} />
              </span>
            )}
            <span className="lp-logo-name">{appName}</span>
          </Link>

          <nav className="lp-nav">
            <a className="lp-nav-link" href="#como-funciona">Como funciona</a>
            <a className="lp-nav-link" href="#incluso">O que está incluso</a>
            <a className="lp-nav-link" href="#faq">FAQ</a>
          </nav>

          <div className="lp-header-right">
            <LanguageSwitcher showLabel={false} />
            <Link to="/auth" className="lp-header-login">Entrar</Link>
            <Link to="/checkout" className="lp-btn lp-btn-header">
              Ver planos e preços <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="lp-hero" id="top">
        <div className="lp-container">
          <div className="lp-hero-badge">
            <Sparkles size={16} />
            Check-in, treinos e nutrição em um só lugar
          </div>
          <h1>
            Seus treinos, sua alimentação e seus hábitos — <span>no seu ritmo</span>.
          </h1>
          <p className="lp-hero-desc">
            O {appName} reúne check-ins diários, planos de treino e orientação
            nutricional em um único app. Acompanhe sua evolução, mantenha a constância
            e veja resultados reais — com todos os preços exibidos antes de você pagar.
          </p>
          <div className="lp-hero-ctas">
            <Link to="/checkout" className="lp-btn lp-btn-primary">
              Ver planos e preços <ArrowRight size={18} />
            </Link>
            <a href="#como-funciona" className="lp-btn lp-btn-outline">
              Ver como funciona
            </a>
          </div>
          <div className="lp-hero-trust">
            <span><Check size={16} /> Sem fidelidade</span>
            <span><Check size={16} /> Cancele quando quiser</span>
            <span><Check size={16} /> Garantia de 7 dias</span>
          </div>
        </div>
      </section>

      {/* ===== PLANS ===== */}
      <section className="lp-plans" id="planos">
        <div className="lp-container">
          <p className="lp-plans-note">
            Escolha entre os planos mensal, trimestral ou anual. Todos os preços são
            exibidos antes do pagamento — sem renovações ocultas e sem surpresas na
            letra pequena.
          </p>

          <div className="lp-plans-grid">
            {plans.map((plan, i) => (
              plan.popular ? (
                <div key={i} className="lp-plan-cell">
                  <div className="lp-plan-popular">
                    <span className="lp-plan-popular-badge">Mais popular</span>
                  </div>
                  <div
                    className={`lp-plan-card has-popular ${selectedPlan === i ? "selected" : ""}`}
                    onClick={() => setSelectedPlan(i)}
                  >
                    <div className="lp-plan-radio-row">
                      <span className="lp-plan-radio">
                        {selectedPlan === i && <span className="lp-plan-radio-dot" />}
                      </span>
                      <span className="lp-plan-name">{plan.name}</span>
                    </div>
                    <p className="lp-plan-renew">{plan.renew}</p>
                    <div className="lp-plan-price">
                      {plan.price} <span>{plan.period}</span>
                    </div>
                    <Link to="/checkout" className="lp-plan-cta">
                      Começar <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              ) : (
                <div
                  key={i}
                  className={`lp-plan-card ${selectedPlan === i ? "selected" : ""}`}
                  onClick={() => setSelectedPlan(i)}
                >
                  <div className="lp-plan-radio-row">
                    <span className="lp-plan-radio">
                      {selectedPlan === i && <span className="lp-plan-radio-dot" />}
                    </span>
                    <span className="lp-plan-name">{plan.name}</span>
                  </div>
                  <p className="lp-plan-renew">{plan.renew}</p>
                  <div className="lp-plan-price">
                    {plan.price} <span>{plan.period}</span>
                  </div>
                  <Link to="/checkout" className="lp-plan-cta">
                    Começar <ArrowRight size={16} />
                  </Link>
                </div>
              )
            ))}
          </div>

          <div className="lp-plans-footer">
            <p className="lp-plans-note" style={{ marginBottom: 0 }}>
              Nenhum pagamento é feito nesta etapa — você revisa e confirma seu plano
              na página de checkout.
            </p>
            <Link to="/checkout" className="lp-btn lp-btn-dark" style={{ fontSize: "1.1rem", padding: "18px 44px" }}>
              Obter meu plano <ArrowRight size={20} />
            </Link>
            <div className="lp-plans-secure">
              <span><Shield size={16} /> Pagamento seguro e criptografado</span>
              <span><CreditCard size={16} /> Todos os cartões e Pix</span>
              <span><Check size={16} /> Garantia de 7 dias</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="lp-section lp-section-alt" id="como-funciona">
        <div className="lp-container">
          <h2 className="lp-section-title">Como funciona</h2>
          <p className="lp-section-subtitle">
            Três passos simples — você tem o controle em todo momento. Você revisa e
            confirma seu plano completo antes de qualquer pagamento.
          </p>
          <div className="lp-steps-grid">
            {steps.map((step, i) => (
              <div key={i} className="lp-step">
                <div className="lp-step-num">{step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== INCLUDED ===== */}
      <section className="lp-section" id="incluso">
        <div className="lp-container">
          <h2 className="lp-section-title">O que está incluso</h2>
          <p className="lp-section-subtitle">
            Um plano completo — você só escolhe o período. Todos os planos incluem a
            experiência completa do {appName}. O único que muda é a forma de cobrança.
          </p>
          <div className="lp-included-grid">
            {included.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="lp-included-item">
                  <Icon size={20} />
                  <span>{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="lp-section lp-section-alt" id="depoimentos">
        <div className="lp-container">
          <h2 className="lp-section-title">Nossos membros opinam</h2>
          <p className="lp-section-subtitle">
            A confiança de quem procurava um começo mais simples.
          </p>
          <div className="lp-testimonials-rating">
            <div className="lp-testimonials-stars">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} fill="var(--lp-star)" color="var(--lp-star)" />
              ))}
            </div>
            <span className="lp-testimonials-score">4,6 / 5</span>
          </div>
          <p className="lp-testimonials-count">+2.300 avaliações verificadas</p>

          <div className="lp-testimonials-grid">
            {testimonials.map((t, i) => (
              <div key={i} className="lp-testimonial-card">
                <div className="lp-testimonial-stars">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={16} fill="var(--lp-star)" color="var(--lp-star)" />
                  ))}
                </div>
                <p className="lp-testimonial-text" dangerouslySetInnerHTML={{ __html: t.text }} />
                <div className="lp-testimonial-footer">
                  <div className="lp-testimonial-avatar">{t.initials}</div>
                  <div>
                    <div className="lp-testimonial-name">{t.name}</div>
                    <div className="lp-testimonial-role">
                      <Check size={12} style={{ verticalAlign: "-2px", marginRight: 2 }} />
                      {t.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="lp-testimonials-note">
            As avaliações refletem experiências e pontos de vista individuais dos
            membros; os resultados variam e não são garantidos. As avaliações são de
            compradores verificados e não são incentivadas. O {appName} não oferece
            aconselhamento médico — consulte seu médico antes de iniciar qualquer
            programa de exercícios ou nutrição.
          </p>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="lp-section" id="faq">
        <div className="lp-container">
          <h2 className="lp-section-title">Perguntas, respondidas</h2>
          <p className="lp-section-subtitle">Perguntas frequentes</p>
          <div className="lp-faq-wrap">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`lp-faq-item ${openFaq === i ? "open" : ""}`}
              >
                <div className="lp-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {faq.q}
                  <ChevronDown size={20} />
                </div>
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
            Registre seus hábitos, treinos e refeições e acompanhe sua evolução todos
            os dias. Sem fidelidade, sem mensalidades escondidas — e com preços
            sempre claros antes de você pagar.
          </p>
          <Link to="/checkout" className="lp-btn lp-btn-primary" style={{ fontSize: "1.05rem", padding: "18px 44px" }}>
            Ver planos e preços <ArrowRight size={20} />
          </Link>
          <div className="lp-plans-secure" style={{ marginTop: 24 }}>
            <span><Lock size={16} /> Compra 100% segura</span>
            <span><Globe size={16} /> Pagamento via Stripe</span>
            <span><Check size={16} /> Garantia de 7 dias</span>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <Link to="/" className="lp-logo">
                {branding.logoUrl ? (
                  <span className="lp-logo-mark"><img src={branding.logoUrl} alt={appName} /></span>
                ) : (
                  <span className="lp-logo-mark"><Dumbbell size={18} /></span>
                )}
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

