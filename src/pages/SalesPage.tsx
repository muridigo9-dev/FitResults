import { useState } from "react";
import "./SalesPage.css";

// ===== DATA =====
const testimonials = [
    {
        name: "Ana Paula",
        role: "Dona de Academia",
        avatar: "AP",
        text: `"Eu gastava R$ 3.000/mês com 4 sistemas diferentes. Com o Flexi Bloom eu substitui TUDO por uma única plataforma. <strong>Economizo R$ 2.500/mês</strong> e meus alunos adoram a gamificação."`,
    },
    {
        name: "Carlos Mendes",
        role: "Personal Trainer",
        avatar: "CM",
        text: `"Em 3 meses usando a plataforma white-label, já tenho <strong>150 alunos pagando mensalidade</strong>. O app tem a minha marca, mhas cores. Ninguém sabe que é um SaaS."`,
    },
    {
        name: "Fernanda Lima",
        role: "Rede de Academias",
        avatar: "FL",
        text: `"Gerencio 5 unidades com branding individual. O sistema multi-tenant é incrível. <strong>Faturamento cresceu 40%</strong> com a retenção da gamificação."`,
    },
];

const features = [
    { icon: "🏢", title: "White-Label Completo", desc: "Sua marca, suas cores, seu logo. Ninguém sabe que é um SaaS." },
    { icon: "🎮", title: "Gamificação Avançada", desc: "XP, níveis, conquistas, leaderboard. Retenção 3x maior." },
    { icon: "📱", title: "PWA Mobile-First", desc: "App instalável. Android, iOS e Desktop. Sem publicar na App Store." },
    { icon: "🔐", title: "LGPD Completa", desc: "Compliance total. Solicitações, auditoria, anonimização." },
    { icon: "💳", title: "Stripe Integrado", desc: "Checkout, assinaturas, webhooks. Receita recorrente automática." },
    { icon: "🏗️", title: "Multi-Tenant", desc: "Uma instalação, infinitas academias. Isolamento total de dados." },
    { icon: "📊", title: "Dashboard Admin", desc: "Métricas, usuários, conteúdo, planos. Tudo em um painel." },
    { icon: "🔔", title: "Notificações Push", desc: "Push web, in-app, segmentação inteligente, throttling." },
    { icon: "🌍", title: "Multi-Idioma", desc: "PT, EN, ES nativos. Adicione qualquer idioma facilmente." },
];

const forWho = [
    { icon: "🏋️", title: "Personal Trainers", desc: "Tenha seu próprio app com sua marca. Gerencie alunos, treinos, dietas e cobranças automaticamente." },
    { icon: "🏢", title: "Donos de Academia", desc: "Gerencie múltiplas unidades. Controle membros, profissionais, conteúdo e muito mais." },
    { icon: "💼", title: "Empreendedores", desc: "Revenda o app para academias e personais. Modelo SaaS com receita recorrente." },
];

const modules = [
    { num: "01", title: "Sistema de Treinos Personalizados", items: ["Biblioteca de 500+ exercícios com vídeo", "Criação de treinos com séries/reps/carga", "Execução guiada com cronômetro", "Histórico de evolução de carga"] },
    { num: "02", title: "Dietas & Nutrição", items: ["Planos alimentares personalizados", "Banco de ingredientes e pratos", "Contagem de macros automática", "Diário alimentar do aluno"] },
    { num: "03", title: "Check-in Diário & Hábitos", items: ["Wizard de check-in (água, sono, treino, refeições)", "Tracking de hábitos customizáveis", "Resumo diário com IA", "Streaks de consistência"] },
    { num: "04", title: "Gamificação & Engajamento", items: ["Sistema de XP e níveis infinitos", "17+ conquistas automáticas", "Leaderboard em tempo real", "Badges e animações de level-up"] },
    { num: "05", title: "Painel Administrativo", items: ["Gestão de usuários e roles (8 tipos)", "Gestão de conteúdo centralizada", "Feature flags por plano", "Branding e personalização visual"] },
    { num: "06", title: "Monetização & Planos", items: ["Stripe checkout integrado", "Planos com preços e features", "Gestão de assinaturas", "Cancelamentos e reativações"] },
];

const pricing = [
    {
        name: "Código da Plataforma",
        desc: "Acesso ao código-fonte completo + aulas ensinando como instalar",
        price: "R$ 599,90",
        period: " pagamento único",
        valueStrike: "Desenvolvimento do zero: R$ 800.000+",
        features: ["Código-fonte 100% completo", "Aulas passo a passo de instalação", "White-label completo", "Todas as 100+ funcionalidades", "Gamificação + Treinos + Dietas", "Stripe + Login Social integrados", "Multi-idioma (PT, EN, ES)", "Atualizações futuras incluídas", "Suporte por comunidade"],
        featured: false,
        checkoutUrl: "https://checkout.ticto.app/O2BB39D4D",
    },
    {
        name: "Código + Instalação",
        desc: "Receba tudo pronto, instalado e configurado pela nossa equipe",
        price: "R$ 997",
        period: " pagamento único",
        valueStrike: "Desenvolvimento do zero: R$ 800.000+",
        features: ["Tudo do plano Código", "Instalação completa pela equipe", "Configuração do Supabase", "Configuração do Stripe", "Deploy em produção (Vercel)", "Domínio personalizado configurado", "Branding inicial configurado", "Onboarding 1-a-1 por chamada", "30 dias de suporte prioritário"],
        featured: true,
        badge: "MAIS ESCOLHIDO",
        checkoutUrl: "https://checkout.ticto.app/O2896656A",
    },
];

const faqs = [
    { q: "O que significa White-Label?", a: "White-label significa que o app terá 100% a sua marca. Seu logo, suas cores, seu nome. O usuário final nunca saberá que é uma plataforma SaaS. É como se você tivesse desenvolvido o app do zero." },
    { q: "Preciso saber programar?", a: "Não! O sistema é 100% configurável pelo painel administrativo. Você configura branding, planos, conteúdo e tudo mais sem escrever uma linha de código." },
    { q: "Como funciona o multi-tenant?", a: "Cada academia/personal tem seus dados completamente isolados. Cada um tem seu branding, seus alunos, seus conteúdos. Uma única instalação serve infinitas academias." },
    { q: "Posso revender para outras academias?", a: "Sim! O modelo Enterprise permite que você revenda o app para outras academias, cada uma com sua marca própria. É o modelo perfeito para uma receita recorrente escalável." },
    { q: "A plataforma está em conformidade com a LGPD?", a: "100%. O sistema inclui solicitações LGPD (acesso, correção, exclusão, portabilidade), logs de auditoria, anonimização de dados e todas as ferramentas necessárias para compliance total." },
    { q: "O app funciona no celular?", a: "Sim! É um PWA (Progressive Web App) que pode ser instalado diretamente no celular como um app nativo. Funciona em Android, iOS e Desktop, sem precisar publicar na App Store ou Google Play." },
];

// ===== COMPONENT =====
export default function SalesPage() {
    const [openModule, setOpenModule] = useState<number | null>(null);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <div className="sales-page">
            {/* TOP BAR */}
            <div className="sp-topbar">
                VAGAS LIMITADAS — OFERTA ESPECIAL COM
                <span className="sp-highlight-box">ATÉ 60% OFF</span>
                PARA EARLY ADOPTERS
            </div>

            {/* NAVBAR */}
            <nav className="sp-navbar">
                <div className="sp-navbar-inner">
                    <div className="sp-logo">Flexi Bloom</div>
                    <div className="sp-nav-stats">
                        <span>Plataforma completa</span>
                        <span>100+ funcionalidades</span>
                        <span>R$ 2M+ em valor de desenvolvimento</span>
                    </div>
                    <a href="#pricing" className="sp-cta" style={{ padding: "10px 24px", fontSize: "0.85rem" }}>
                        QUERO COMEÇAR →
                    </a>
                </div>
            </nav>

            {/* HERO */}
            <section className="sp-hero">
                <div className="sp-hero-inner">
                    <div>
                        <div className="sp-hero-badge">WHITE-LABEL SAAS</div>
                        <h1>
                            LANCE SEU PRÓPRIO <span>APP FITNESS</span> EM MINUTOS.
                            <br />SEM PROGRAMAR.
                        </h1>
                        <p className="sp-hero-desc">
                            Plataforma SaaS completa para academias, personal trainers e empreendedores fitness.
                            Sua marca, suas cores, seu negócio. Gamificação, treinos, dietas, check-in, pagamentos e muito mais.
                        </p>
                        <a href="#pricing" className="sp-cta">
                            COMEÇAR AGORA →
                        </a>
                        <div className="sp-payment-badges">
                            <span className="sp-payment-badge">🔒 Compra 100% segura</span>
                            <span className="sp-payment-badge">💳 Visa, Master, Pix</span>
                            <span className="sp-payment-badge">↩️ 7 dias de garantia</span>
                        </div>
                    </div>
                    <div className="sp-hero-mockup">
                        <div className="sp-mockup-header">
                            <div className="sp-mockup-dot" /><div className="sp-mockup-dot" /><div className="sp-mockup-dot" />
                        </div>
                        <div className="sp-mockup-content">
                            <div className="sp-mockup-sidebar">
                                <div /><div /><div /><div /><div /><div />
                            </div>
                            <div className="sp-mockup-main">
                                <div className="sp-mockup-card">
                                    <div className="sp-mockup-card-title">Alunos Ativos</div>
                                    <div className="sp-mockup-card-value">1,247</div>
                                </div>
                                <div className="sp-mockup-card">
                                    <div className="sp-mockup-card-title">Receita Mensal</div>
                                    <div className="sp-mockup-card-value">R$ 89K</div>
                                </div>
                                <div className="sp-mockup-card">
                                    <div className="sp-mockup-card-title">Engajamento</div>
                                    <div className="sp-mockup-card-value">94%</div>
                                </div>
                                <div className="sp-mockup-card">
                                    <div className="sp-mockup-card-title">Retenção</div>
                                    <div className="sp-mockup-card-value">87%</div>
                                </div>
                                <div className="sp-mockup-chart">
                                    {[30, 50, 40, 65, 55, 75, 60, 80, 70, 90, 85, 95].map((h, i) => (
                                        <div key={i} className="sp-chart-bar" style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SOCIAL PROOF */}
            <section className="sp-section sp-section-alt">
                <div className="sp-container">
                    <div className="sp-section-title">
                        NEGÓCIOS FITNESS FATURANDO <span>ALTO</span>
                    </div>
                    <p className="sp-section-subtitle">
                        Donos de academia, personal trainers e empreendedores que já transformaram seus negócios com a plataforma.
                    </p>
                    <div className="sp-testimonials-grid">
                        {testimonials.map((t, i) => (
                            <div key={i} className="sp-testimonial-card">
                                <div className="sp-testimonial-header">
                                    <div className="sp-testimonial-avatar">{t.avatar}</div>
                                    <div>
                                        <div className="sp-testimonial-name">{t.name}</div>
                                        <div className="sp-testimonial-role">{t.role}</div>
                                    </div>
                                </div>
                                <div className="sp-testimonial-text" dangerouslySetInnerHTML={{ __html: t.text }} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* STORY */}
            <section className="sp-story">
                <div className="sp-story-inner">
                    <h2>
                        CHEGOU A SUA VEZ DE <span>ESCALAR</span>
                    </h2>
                    <p>
                        <strong>Desenvolver um app fitness do zero custa entre R$ 800.000 e R$ 2.500.000.</strong> Leva de 12 a 18 meses. Precisa de uma equipe de 5 a 8 desenvolvedores.
                    </p>
                    <p>
                        Mas, e se você pudesse ter todo esse sistema — <strong>pronto, testado e em produção</strong> — com sua marca, por uma fração do custo?
                    </p>
                    <p>
                        O Flexi Bloom é uma plataforma SaaS completa que substitui <strong>5 a 10 sistemas diferentes</strong>. Multi-tenant, white-label, gamificação, LGPD, pagamentos, notificações. <strong>Tudo em um só lugar.</strong>
                    </p>
                    <p>
                        Mais de <strong>100+ funcionalidades</strong> pensadas para o mercado fitness. <strong>R$ 47.000 a R$ 110.000/mês de valor de mercado</strong> entregues por uma fração do preço.
                    </p>
                    <div style={{ textAlign: "center", marginTop: "40px" }}>
                        <a href="#pricing" className="sp-cta" style={{ background: "#0ea5e9", color: "#fff" }}>
                            QUERO FATURAR ASSIM →
                        </a>
                    </div>
                </div>
            </section>

            {/* FOR WHO */}
            <section className="sp-section sp-section-dark">
                <div className="sp-container">
                    <div className="sp-section-title">
                        "SERÁ QUE ISSO TAMBÉM É <span>PRA MIM</span>?"
                    </div>
                    <p className="sp-section-subtitle">
                        Sem sombra de dúvidas, o Flexi Bloom é pra você que…
                    </p>
                    <div className="sp-for-who-grid">
                        {forWho.map((item, i) => (
                            <div key={i} className="sp-for-who-card">
                                <div className="sp-for-who-icon">{item.icon}</div>
                                <div className="sp-for-who-title">{item.title}</div>
                                <div className="sp-for-who-desc">{item.desc}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ textAlign: "center", marginTop: "48px" }}>
                        <a href="#pricing" className="sp-cta">É PRA MIM! TÔ DENTRO. →</a>
                    </div>
                </div>
            </section>

            {/* WHAT YOU GET */}
            <section className="sp-section sp-section-alt">
                <div className="sp-container">
                    <div className="sp-section-title">
                        O QUE VOCÊ RECEBE <span>NA PLATAFORMA</span>
                    </div>
                    <p className="sp-section-subtitle">
                        A plataforma é totalmente flexível: você pode colocar <strong style={{ color: "#f0f6ff" }}>qualquer tipo de treino, conteúdo ou serviço</strong> dentro dela.
                        Venda para consumidores finais (B2C), para empresas (B2B) ou até internacionalmente — com <strong style={{ color: "#0ea5e9" }}>Stripe integrado</strong> para pagamentos globais
                        e <strong style={{ color: "#0ea5e9" }}>login social</strong> (Google, Apple, etc.) para facilitar o acesso dos seus clientes.
                    </p>
                    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
                        {modules.map((mod, i) => (
                            <div key={i} className="sp-module">
                                <div className="sp-module-header" onClick={() => setOpenModule(openModule === i ? null : i)}>
                                    <span className="sp-module-num">{mod.num}</span>
                                    <span className="sp-module-title">{mod.title}</span>
                                    <span className="sp-module-toggle">{openModule === i ? "−" : "+"}</span>
                                </div>
                                {openModule === i && (
                                    <div style={{ padding: "0 24px 20px", paddingLeft: "56px" }}>
                                        {mod.items.map((item, j) => (
                                            <div key={j} style={{ display: "flex", gap: "8px", marginBottom: "8px", color: "#94a3b8", fontSize: "0.9rem" }}>
                                                <span style={{ color: "#06d6a0" }}>•</span> {item}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "40px", flexWrap: "wrap" }}>
                        {["🌎 Venda internacional", "💳 Stripe global", "🔑 Login Social", "🏢 B2B & B2C", "📱 PWA Mobile"].map((tag, i) => (
                            <span key={i} className="sp-float-badge">{tag}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className="sp-section sp-section-dark">
                <div className="sp-container">
                    <div className="sp-section-title">
                        <span>9 DIFERENCIAIS</span> QUE NINGUÉM OFERECE
                    </div>
                    <p className="sp-section-subtitle">
                        Cada funcionalidade foi pensada para gerar resultado real para o seu negócio fitness.
                    </p>
                    <div className="sp-features-grid">
                        {features.map((f, i) => (
                            <div key={i} className="sp-feature-card">
                                <div className="sp-feature-icon">{f.icon}</div>
                                <div className="sp-feature-title">{f.title}</div>
                                <div className="sp-feature-desc">{f.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>



            {/* ROI */}
            <section className="sp-section sp-section-alt">
                <div className="sp-container">
                    <div className="sp-section-title">
                        UMA OPORTUNIDADE <span>INFINITA</span>
                    </div>
                    <p className="sp-section-subtitle">
                        O mercado fitness no Brasil movimenta R$ 12 bilhões por ano. São mais de 30.000 academias — e a maioria não tem app próprio. Veja o que é possível faturar:
                    </p>

                    {/* EXAMPLES GRID */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "40px" }}>
                        {[
                            { emoji: "🟢", level: "Iniciante", desc: "Personal com 30 alunos a R$ 79/mês", revenue: "R$ 2.370/mês", annual: "R$ 28.440/ano", bar: 20 },
                            { emoji: "🔵", level: "Básico", desc: "Studio com 80 alunos a R$ 99/mês", revenue: "R$ 7.920/mês", annual: "R$ 95.040/ano", bar: 35 },
                            { emoji: "🟡", level: "Intermediário", desc: "Academia com 200 alunos a R$ 119/mês", revenue: "R$ 23.800/mês", annual: "R$ 285.600/ano", bar: 55 },
                            { emoji: "🟠", level: "Avançado", desc: "Rede com 500 alunos a R$ 149/mês", revenue: "R$ 74.500/mês", annual: "R$ 894.000/ano", bar: 75 },
                            { emoji: "🔴", level: "Expert (B2B)", desc: "Revenda para 10 academias a R$ 497/mês", revenue: "R$ 4.970/mês", annual: "R$ 59.640/ano", bar: 45 },
                            { emoji: "🌍", level: "Internacional", desc: "App global com 300 users a $29/mês (USD)", revenue: "$8.700/mês", annual: "$104.400/ano", bar: 90 },
                        ].map((ex, i) => (
                            <div key={i} style={{ background: "#0a1628", borderRadius: "16px", padding: "24px", border: "1px solid #1e3a5f" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                                    <span style={{ fontSize: "1.3rem" }}>{ex.emoji}</span>
                                    <span style={{ fontWeight: 800, fontSize: "1rem" }}>{ex.level}</span>
                                </div>
                                <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "12px", lineHeight: 1.5 }}>{ex.desc}</div>
                                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#0ea5e9", marginBottom: "4px" }}>{ex.revenue}</div>
                                <div style={{ fontSize: "0.85rem", color: "#06d6a0", fontWeight: 700, marginBottom: "12px" }}>{ex.annual}</div>
                                <div className="sp-roi-bar" style={{ height: "12px" }}>
                                    <div className="sp-roi-bar-fill" style={{ width: `${ex.bar}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* COMPARISON CARD */}
                    <div className="sp-roi-card">
                        <div>
                            <div style={{ fontSize: "0.9rem", color: "#94a3b8", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>Seu investimento</div>
                            <div className="sp-roi-value">R$ 599,90 a R$ 997</div>
                            <p style={{ color: "#94a3b8", lineHeight: "1.7", marginTop: "8px" }}>
                                Pagamento <strong style={{ color: "#f0f6ff" }}>único</strong>. Sem mensalidade. Sem taxa de plataforma.
                                <br />Toda a receita dos seus alunos é <strong style={{ color: "#06d6a0" }}>100% sua</strong>.
                            </p>
                        </div>
                        <div>
                            <div style={{ background: "#0a1628", borderRadius: "16px", padding: "32px", border: "1px solid #1e3a5f" }}>
                                <div style={{ marginBottom: "24px" }}>
                                    <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "4px" }}>Custo da plataforma</div>
                                    <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>A partir de R$ 599,90 (único)</div>
                                </div>
                                <div style={{ marginBottom: "24px" }}>
                                    <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "4px" }}>Desenvolvimento do zero</div>
                                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0ea5e9" }}>R$ 800.000 - R$ 2.500.000</div>
                                </div>
                                <div>
                                    <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "4px" }}>Economia</div>
                                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#06d6a0" }}>Até 99,9% de economia</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <p style={{ fontSize: "0.85rem", color: "#64748b", textAlign: "center", marginTop: "16px" }}>*Estimativas baseadas em preços médios do mercado fitness brasileiro e internacional</p>
                </div>
            </section>

            {/* PRICING */}
            <section className="sp-section sp-section-dark" id="pricing">
                <div className="sp-container">
                    <div className="sp-section-title">
                        ESCOLHA SEU <span>PLANO</span>
                    </div>
                    <p className="sp-section-subtitle">
                        Todos os planos incluem 7 dias de garantia incondicional. Cancele quando quiser.
                    </p>
                    <div className="sp-pricing-grid">
                        {pricing.map((plan, i) => (
                            <div key={i} className={`sp-pricing-card ${plan.featured ? "sp-pricing-featured" : ""}`}>
                                {plan.badge && <div className="sp-pricing-badge">{plan.badge}</div>}
                                <div className="sp-pricing-name">{plan.name}</div>
                                <div className="sp-pricing-desc">{plan.desc}</div>
                                <div className="sp-pricing-price">
                                    {plan.price} <span>{plan.period}</span>
                                </div>
                                <div className="sp-pricing-value">{plan.valueStrike}</div>
                                <ul className="sp-pricing-features">
                                    {plan.features.map((f, j) => (
                                        <li key={j} className={j < 3 ? "sp-feature-highlight" : ""}>{f}</li>
                                    ))}
                                </ul>
                                <a href={plan.checkoutUrl} target="_blank" rel="noopener noreferrer" className="sp-cta" style={{ width: "100%", justifyContent: "center", fontSize: "0.95rem", padding: "14px 0" }}>
                                    {plan.featured ? "COMEÇAR AGORA →" : "ESCOLHER PLANO →"}
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="sp-section sp-section-alt">
                <div className="sp-container">
                    <div className="sp-section-title">
                        PERGUNTAS <span>FREQUENTES</span>
                    </div>
                    <div style={{ maxWidth: "700px", margin: "40px auto 0" }}>
                        {faqs.map((faq, i) => (
                            <div key={i} className="sp-faq-item" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                                <div className="sp-faq-question" style={{ display: "flex", justifyContent: "space-between" }}>
                                    {faq.q}
                                    <span>{openFaq === i ? "−" : "+"}</span>
                                </div>
                                {openFaq === i && <div className="sp-faq-answer">{faq.a}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="sp-section sp-section-dark" style={{ paddingTop: "100px", paddingBottom: "100px" }}>
                <div className="sp-container" style={{ textAlign: "center" }}>
                    <div className="sp-float-badge" style={{ marginBottom: "24px" }}>
                        ⚡ Oferta por tempo limitado
                    </div>
                    <div className="sp-section-title" style={{ marginBottom: "16px" }}>
                        COMECE AGORA E TENHA SEU <span>APP FITNESS</span> RODANDO EM MINUTOS
                    </div>
                    <p className="sp-section-subtitle" style={{ marginBottom: "40px" }}>
                        Sua marca. Sua receita. Seu negócio. Sem programar. Sem mensalidade.
                        <br />Plataforma que custaria R$ 800.000+ para desenvolver, por menos de R$ 1.000. ☕
                    </p>
                    <a href="#pricing" className="sp-cta" style={{ fontSize: "1.2rem", padding: "20px 48px" }}>
                        QUERO MEU APP AGORA →
                    </a>
                    <div className="sp-payment-badges" style={{ justifyContent: "center", marginTop: "24px" }}>
                        <span className="sp-payment-badge">🔒 Compra 100% segura</span>
                        <span className="sp-payment-badge">↩️ 7 dias de garantia</span>
                        <span className="sp-payment-badge">💳 Todos os cartões e Pix</span>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="sp-footer">
                <div className="sp-container">
                    <p style={{ marginBottom: "8px" }}>
                        <strong style={{ color: "#f0f6ff" }}>Flexi Bloom</strong> — Plataforma SaaS White-Label para o mercado fitness.
                    </p>
                    <p>© {new Date().getFullYear()} Flexi Bloom. Todos os direitos reservados. | Termos de Uso | Política de Privacidade</p>
                </div>
            </footer>
        </div>
    );
}
