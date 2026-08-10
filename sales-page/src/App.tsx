import { useState, useEffect } from "react";
import { Check, ArrowRight, Play, Shield, TrendingUp, Users, DollarSign, Lock, Smartphone, MessageCircle, BarChart, Server, Zap, Globe, Layers, Download, Database, Key, XCircle, CheckCircle, Award } from "lucide-react";
import "./App.css";

// ===== NEW DATA STRUCTURES =====

const featuresDetailed = [
    { icon: <Smartphone className="w-6 h-6 text-emerald-400" />, title: "App Nativo (PWA)", desc: "Seus alunos baixam e instalam direto no celular. Sem taxas da Apple ou Google." },
    { icon: <MessageCircle className="w-6 h-6 text-emerald-400" />, title: "Chat com Aluno", desc: "Tire dúvidas e interaja em tempo real. Aumente a retenção com suporte direto." },
    { icon: <Zap className="w-6 h-6 text-emerald-400" />, title: "Gamificação Viciante", desc: "XP, Níveis e Conquistas automáticas. O aluno treina para 'upar' de nível." },
    { icon: <BarChart className="w-6 h-6 text-emerald-400" />, title: "Dashboard Financeiro", desc: "Saiba exatamente quanto você ganha. Métricas de MRR e Churn em tempo real." },
    { icon: <Globe className="w-6 h-6 text-emerald-400" />, title: "Multi-Idioma", desc: "Venda para o mundo todo. O app traduz automaticamente (PT, EN, ES)." },
    { icon: <Layers className="w-6 h-6 text-emerald-400" />, title: "Treinos Ilimitados", desc: "Crie fichas de treino com vídeos e GIFs. Copie e cole para 100 alunos em segundos." },
    { icon: <Download className="w-6 h-6 text-emerald-400" />, title: "Checkout Transparente", desc: "Páginas de venda integradas. O aluno compra sem sair do seu ambiente." },
    { icon: <Database className="w-6 h-6 text-emerald-400" />, title: "Banco de Exercícios", desc: "Mais de 500 exercícios cadastrados com vídeos demonstrativos prontos." },
    { icon: <Server className="w-6 h-6 text-emerald-400" />, title: "Hospedagem Própria", desc: "Você é dono dos dados. Nada de pagar mensalidade cara por usuário." },
];

const qualifications = {
    for: [
        "Personal Trainers que querem escalar.",
        "Donos de Studio que precisam de gestão.",
        "Empreendedores que buscam renda recorrente.",
        "Quem quer fugir das taxas absurdas de plataformas."
    ],
    notFor: [
        "Quem busca dinheiro fácil sem trabalho.",
        "Quem não quer construir uma marca própria.",
        "Quem prefere continuar vendendo hora/aula.",
        "Quem tem medo de tecnologia (nós facilitamos, mas precisa querer)."
    ]
};

const faqs = [
    { q: "Eu preciso saber programar?", a: "Absolutamente não. Se você sabe usar o Instagram, você sabe gerenciar seu império no Flexi Bloom." },
    { q: "O app é realmente meu?", a: "Sim. A licença White-Label permite que você use sua marca, suas cores e cobre o quanto quiser dos seus alunos." },
    { q: "Qual a diferença entre os planos?", a: "No plano 'Faça Você Mesmo', você recebe o código e aulas. No 'Instalação VIP', nossa equipe configura tudo (servidor, domínio, banco de dados) para você." },
    { q: "E se eu quiser cancelar?", a: "É pagamento único. O software é seu para sempre. Sem mensalidades para nós." },
];

function RevenueCalculator() {
    const [students, setStudents] = useState(100);
    const [price, setPrice] = useState(49.90);
    const [monthly, setMonthly] = useState(0);
    const [annual, setAnnual] = useState(0);

    useEffect(() => {
        const m = students * price;
        setMonthly(m);
        setAnnual(m * 12);
    }, [students, price]);

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
            <div className="relative z-10">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    Simulador de Faturamento
                </h3>

                <div className="space-y-6 mb-8">
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400">Total de Alunos</span>
                            <span className="text-white font-bold">{students}</span>
                        </div>
                        <input
                            type="range" min="10" max="1000" step="10"
                            value={students} onChange={(e) => setStudents(Number(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400">Mensalidade Média (R$)</span>
                            <span className="text-white font-bold">R$ {price.toFixed(2)}</span>
                        </div>
                        <input
                            type="range" min="29.90" max="299.90" step="10"
                            value={price} onChange={(e) => setPrice(Number(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                    </div>
                </div>

                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <div className="grid grid-cols-2 gap-4 text-center divide-x divide-slate-700">
                        <div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Mensal</div>
                            <div className="text-emerald-400 font-black text-xl md:text-2xl">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthly)}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Anual</div>
                            <div className="text-white font-black text-xl md:text-2xl">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(annual)}
                            </div>
                        </div>
                    </div>
                </div>
                <p className="text-xs text-slate-500 text-center mt-4">
                    *Estimativa baseada na sua precificação. O lucro é 100% seu.
                </p>
            </div>
        </div>
    );
}

function StickyCTA() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 600) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-emerald-500/30 backdrop-blur-md p-4 z-50 animate-fade-in-up">
            <div className="container mx-auto max-w-4xl flex items-center justify-between gap-4">
                <div className="hidden md:block">
                    <div className="text-white font-bold">Oferta por Tempo Limitado</div>
                    <div className="text-xs text-slate-400">Garanta seu acesso vitalício hoje.</div>
                </div>
                <a href="#pricing" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-6 rounded-lg w-full md:w-auto text-center shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 transition-all">
                    QUERO MEU APP AGORA <ArrowRight className="w-5 h-5" />
                </a>
            </div>
        </div>
    );
}

function App() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [demoMode, setDemoMode] = useState(false);

    return (
        <div className="font-sans text-slate-50 bg-slate-950 min-h-screen selection:bg-emerald-500 selection:text-white pb-20 md:pb-0">

            {/* ANNOUNCEMENT BAR */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-500 text-center py-2 text-xs font-bold tracking-widest uppercase text-white">
                ⚠️ Oferta de Lançamento: Acesso Vitalício Disponível por Tempo Limitado
            </div>

            {/* HERO SECTION */}
            <header className="relative pt-16 pb-24 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/40 via-slate-950 to-slate-950 z-0"></div>
                <div className="container mx-auto px-4 relative z-10 max-w-6xl">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        {/* Copy Side */}
                        <div className="flex-1 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 border border-slate-800 text-emerald-400 text-sm font-medium mb-6 animate-fade-in-up">
                                <Check className="w-4 h-4" /> Validado por 500+ Empreendedores
                            </div>
                            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight text-white">
                                Pare de Vender Horas.<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                                    Tenha Seu Próprio App Fitness.
                                </span>
                            </h1>
                            <p className="text-lg text-slate-400 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                                Tenha sua própria plataforma <strong>White-Label</strong> rodando em 24h.
                                Sem programar. Sem custos mensais de software.
                                Apenas você, sua marca e 100% do lucro no seu bolso.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <a href="#pricing" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-lg px-8 py-4 rounded-xl transition-all hover:scale-105 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2">
                                    QUERO MEU NEGÓCIO <ArrowRight className="w-5 h-5" />
                                </a>
                                <button onClick={() => setDemoMode(true)} className="px-8 py-4 rounded-xl border border-slate-700 hover:bg-white/5 text-slate-300 font-medium transition-all flex items-center justify-center gap-2 group">
                                    <Play className="w-5 h-5 fill-current opacity-70 group-hover:opacity-100 transition-opacity" />
                                    Ver Demo
                                </button>
                            </div>
                            <p className="mt-6 text-sm text-slate-500">
                                🔒 Garantia de 7 dias • 💳 Acesso Imediato • 🚀 Setup Fácil
                            </p>
                        </div>

                        {/* Calculator Side */}
                        <div className="w-full max-w-md lg:max-w-lg">
                            <RevenueCalculator />
                        </div>
                    </div>
                </div>
            </header>

            {/* TRUST BANNER - NEW */}
            <section className="py-10 border-y border-slate-800/50 bg-slate-900/30">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">Tecnologia Robusta Utilizada Por Gigantes</p>
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        <div className="flex items-center gap-2 text-slate-300 font-bold text-xl"><Globe className="w-6 h-6" /> React</div>
                        <div className="flex items-center gap-2 text-slate-300 font-bold text-xl"><Server className="w-6 h-6" /> Node.js</div>
                        <div className="flex items-center gap-2 text-slate-300 font-bold text-xl"><Database className="w-6 h-6" /> PostgreSQL</div>
                        <div className="flex items-center gap-2 text-slate-300 font-bold text-xl"><CreditCardIcon /> Stripe</div>
                        <div className="flex items-center gap-2 text-slate-300 font-bold text-xl"><CloudIcon /> AWS</div>
                    </div>
                </div>
            </section>

            {/* FEATURES GRID - "WHAT YOU GET" */}
            <section className="py-24 bg-slate-900/30 border-b border-slate-800/50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4 text-white">Tudo Que Um Grande App Tem (E Mais)</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            Não é só um app de treino. É uma máquina de vendas e retenção para o seu negócio.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {featuresDetailed.map((feat, i) => (
                            <div key={i} className="bg-slate-950 border border-slate-800 p-6 rounded-xl hover:border-emerald-500/50 transition-colors group">
                                <div className="mb-4 bg-slate-900 w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                    {feat.icon}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* QUALIFICATION SECTION - NEW */}
            <section className="py-24 bg-slate-950">
                <div className="container mx-auto px-4 max-w-5xl">
                    <h2 className="text-3xl font-bold text-center mb-16 text-white">Será Que Isso É Para Você?</h2>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* THIS IS FOR YOU */}
                        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-8">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                <CheckCircle className="w-6 h-6 text-emerald-500" />
                                ISSO É PARA VOCÊ SE...
                            </h3>
                            <ul className="space-y-4">
                                {qualifications.for.map((item, i) => (
                                    <li key={i} className="flex gap-3 text-slate-300">
                                        <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* THIS IS NOT FOR YOU */}
                        <div className="bg-red-950/10 border border-red-500/20 rounded-2xl p-8 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                <XCircle className="w-6 h-6 text-red-500" />
                                ISSO NÃO É PARA VOCÊ SE...
                            </h3>
                            <ul className="space-y-4">
                                {qualifications.notFor.map((item, i) => (
                                    <li key={i} className="flex gap-3 text-slate-400">
                                        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* DEMO SECTION */}
            <section className="py-24 bg-slate-100 text-slate-900" id="demo">
                <div className="container mx-auto px-4 max-w-4xl text-center">
                    <h2 className="text-4xl font-bold mb-6 text-slate-900">Veja Por Dentre da Máquina</h2>
                    <p className="text-slate-600 mb-12 text-lg">
                        O painel administrativo mais poderoso do mercado. Controle alunos, treinos, dietas e financeiro em um só lugar.
                    </p>

                    <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-200 bg-slate-900 aspect-video group cursor-pointer" onClick={() => setDemoMode(true)}>
                        {/* Fake UI Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors">
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/50 group-hover:scale-110 transition-transform">
                                <Play className="w-8 h-8 text-white fill-current ml-1" />
                            </div>
                        </div>
                        <div className="absolute bottom-6 left-6 text-white text-left">
                            <div className="uppercase text-xs font-bold tracking-wider mb-1 text-emerald-400">Walkthrough</div>
                            <div className="text-2xl font-bold">Tour Completo do Sistema (2min)</div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-center gap-8 text-sm font-medium text-slate-500">
                        <div className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Interface Intuitiva</div>
                        <div className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Rápido e Leve</div>
                        <div className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 100% Responsivo</div>
                    </div>
                </div>
            </section>

            {/* OFFER STACK - "GRAND SLAM OFFER" */}
            <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-950 border-t border-slate-800">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center mb-12">
                        <span className="text-emerald-400 font-bold tracking-wider uppercase text-sm">Empilhamento de Valor</span>
                        <h2 className="text-4xl md:text-5xl font-black text-white mt-2 mb-6">Vamos Ver Tudo O Que Você Recebe</h2>
                        <p className="text-slate-400 text-lg">Não é apenas um software. É um ecossistema completo para você enriquecer.</p>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
                        {/* Decorative background */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -ml-32 -mb-32"></div>

                        <div className="relative z-10 space-y-8">
                            {/* Core Offer */}
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-8">
                                <div className="flex items-center gap-4 text-left w-full">
                                    <div className="bg-emerald-500/10 p-4 rounded-xl shrink-0">
                                        <Smartphone className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Seu Próprio App White-Label</h3>
                                        <p className="text-slate-500 text-sm">Android, iOS (PWA), Painel Web e Landing Page.</p>
                                    </div>
                                </div>
                                <div className="text-right whitespace-nowrap">
                                    <div className="text-xs text-slate-500 uppercase font-bold">Valor Real</div>
                                    <div className="text-2xl font-bold text-emerald-400/80 decoration-slate-600 line-through">R$ 15.000</div>
                                </div>
                            </div>

                            {/* Bonuses */}
                            {[
                                { name: "Sistema de Gamificação Viciante", val: "2.997", desc: "Retenção automática de alunos." },
                                { name: "Dashboard do CEO", val: "1.497", desc: "Métricas financeiras em tempo real." },
                                { name: "Gerador de Fichas Ilimitado", val: "997", desc: "Crie treinos em segundos." },
                                { name: "Checkout de Alta Conversão", val: "1.997", desc: "Páginas de vendas prontas." },
                                { name: "Comunidade de Donos de App", val: "Inestimável", desc: "Networking de alto nível." },
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-dashed border-slate-800 pb-4 last:border-0">
                                    <div className="flex items-center gap-4 text-left w-full pl-4 md:pl-8 border-l-2 border-emerald-500/30">
                                        <div>
                                            <h3 className="text-lg font-bold text-white"><span className="text-emerald-500 mr-2">Bônus #{i + 1}:</span> {item.name}</h3>
                                            <p className="text-slate-500 text-sm">{item.desc}</p>
                                        </div>
                                    </div>
                                    <div className="text-right whitespace-nowrap">
                                        <div className="text-xs text-slate-500 uppercase font-bold">Valor</div>
                                        <div className="text-xl font-bold text-white/50 line-through">R$ {item.val}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total Value */}
                        <div className="mt-12 bg-slate-900/50 rounded-2xl p-6 md:p-8 text-center border border-slate-800">
                            <div className="text-slate-400 font-medium mb-2 uppercase tracking-widest text-sm">Valor Total Entregue</div>
                            <div className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-6">
                                R$ 22.488,00
                            </div>
                            <div className="flex flex-col md:flex-row justify-center items-center gap-4 text-lg">
                                <span className="text-slate-400">Por Apenas:</span>
                                <span className="text-3xl font-bold text-emerald-400">R$ 599,90</span>
                                <span className="bg-emerald-500 text-slate-950 text-xs font-bold px-2 py-1 rounded">HOJE</span>
                            </div>
                            <div className="mt-8">
                                <a href="#pricing" className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xl px-12 py-5 rounded-xl transition-all hover:scale-105 shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-pulse">
                                    QUERO APROVEITAR ESSA OFERTA <ArrowRight className="w-6 h-6" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PRICING SECTION */}
            <section id="pricing" className="py-24 bg-slate-950 relative">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-white mb-4">Escolha Como Começar</h2>
                        <p className="text-slate-400">Pagamento único. Acesso vitalício. Sem letras miúdas.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 items-start">
                        {/* OFFER 1: DIY */}
                        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 hover:border-slate-600 transition-colors relative">
                            <h3 className="text-xl font-bold text-white mb-2">Faça Você Mesmo</h3>
                            <p className="text-slate-400 text-sm mb-6">Para quem tem conhecimento técnico ou quer economizar.</p>
                            <div className="mb-6">
                                <span className="text-4xl font-black text-white">R$ 599,90</span>
                                <span className="text-slate-500 text-sm block mt-1">Pagamento Único</span>
                            </div>
                            <a href="https://checkout.ticto.app/O2BB39D4D" target="_blank" className="block w-full border border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 font-bold py-4 rounded-xl text-center transition-colors mb-8">
                                COMPRAR CÓDIGO
                            </a>
                            <ul className="space-y-4 text-sm text-slate-300">
                                <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Código Fonte Completo (React + Node)</li>
                                <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Acesso às Aulas de Instalação</li>
                                <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Suporte via Comunidade</li>
                                <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Atualizações do Código (1 ano)</li>
                                <li className="flex gap-3 text-slate-500"><Server className="w-5 h-5 shrink-0" /> Você configura seu servidor</li>
                            </ul>
                        </div>

                        {/* OFFER 2: DFY (Done For You) */}
                        <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border-2 border-emerald-500 p-8 relative shadow-[0_0_40px_rgba(16,185,129,0.15)] transform md:-translate-y-4">
                            <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-bl-lg uppercase">
                                Recomendado
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Instalação VIP</h3>
                            <p className="text-emerald-400 text-sm mb-6">Entregamos tudo pronto. Você só coloca sua logo.</p>
                            <div className="mb-6">
                                <span className="text-4xl font-black text-white">R$ 997,00</span>
                                <span className="text-slate-500 text-sm block mt-1">Pagamento Único</span>
                            </div>
                            <a href="https://checkout.ticto.app/O2896656A" target="_blank" className="block w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-xl text-center transition-colors mb-8 shadow-lg shadow-emerald-500/20">
                                QUERO TUDO PRONTO
                            </a>
                            <ul className="space-y-4 text-sm text-slate-300">
                                <li className="flex gap-3"><strong className="text-white flex items-center gap-2"><Key className="w-4 h-4 text-emerald-400" /> Instalação Completa (Nós fazemos)</strong></li>
                                <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Configuração do Servidor VPS</li>
                                <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Configuração do Domínio e SSL</li>
                                <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Setup do Banco de Dados</li>
                                <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Tudo do plano 'Faça Você Mesmo'</li>
                                <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Suporte Prioritário (WhatsApp)</li>
                            </ul>
                            <div className="mt-8 pt-6 border-t border-emerald-500/20 text-center">
                                <div className="text-emerald-400 text-sm font-bold flex items-center justify-center gap-2 mb-2">
                                    <Award className="w-5 h-5" /> Garantia Tripla
                                </div>
                                <p className="text-slate-400 text-xs">
                                    Se em 30 dias você não vender, nós pessoalmente revisaremos sua estratégia.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-24 bg-slate-950 border-t border-slate-900">
                <div className="container mx-auto px-4 max-w-2xl">
                    <h2 className="text-3xl font-bold text-center mb-12 text-white">Dúvidas Comuns</h2>
                    <div className="space-y-4">
                        {faqs.map((faq, i) => (
                            <div key={i} className="border border-slate-800 rounded-lg overflow-hidden cursor-pointer hover:border-slate-700 transition-colors" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                                <div className="bg-slate-900 p-6 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-200">{faq.q}</h3>
                                    <span className="text-emerald-500 text-xl">{openFaq === i ? "−" : "+"}</span>
                                </div>
                                {openFaq === i && (
                                    <div className="p-6 bg-slate-900/50 text-slate-400 border-t border-slate-800 text-sm leading-relaxed">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-12 border-t border-slate-900 text-center text-slate-600 text-sm bg-slate-950">
                <div className="container mx-auto px-4">
                    <p className="mb-4">Flexi Bloom Inc. - Transformando Personal Trainers em Empresários Digital.</p>
                    <div className="flex justify-center gap-6">
                        <a href="#" className="hover:text-emerald-500 transition-colors">Termos de Uso</a>
                        <a href="#" className="hover:text-emerald-500 transition-colors">Política de Privacidade</a>
                        <a href="#" className="hover:text-emerald-500 transition-colors">Suporte</a>
                    </div>
                </div>
            </footer>

            {/* DEMO MODAL */}
            {demoMode && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDemoMode(false)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-lg w-full text-center relative shadow-2xl" onClick={e => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 text-slate-500 hover:text-white" onClick={() => setDemoMode(false)}>✕</button>
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                            <Lock className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-2xl font-bold mb-4 text-white">Acesso à Área de Membros</h3>
                        <p className="text-slate-400 mb-8">
                            Para acessar a demo interativa completa e ver os bastidores do sistema, você precisa se cadastrar na nossa lista VIP de espera.
                        </p>
                        <input type="email" placeholder="Seu melhor e-mail" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white mb-4 focus:outline-none focus:border-emerald-500 placeholder-slate-600" />
                        <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-lg transition-colors shadow-lg shadow-emerald-500/20" onClick={() => { alert("Bem-vindo à lista VIP! O link da demo foi enviado para seu e-mail."); setDemoMode(false); }}>
                            LIBERAR MEU ACESSO
                        </button>
                    </div>
                </div>
            )}

            <StickyCTA />
        </div>
    );
}

// Simple Icon Components for Trust Banner
function CreditCardIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
}

function CloudIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19c0-3.037-2.463-5.5-5.5-5.5S6.5 15.963 6.5 19" /><path d="M14 13.5c0-4.418-3.582-8-8-8" /></svg>
}

export default App;
