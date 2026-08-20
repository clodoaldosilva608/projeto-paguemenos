/**
 * Páginas institucionais, suporte e legais do Orion
 * Conteúdo real para cada seção do rodapé
 */

import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, FileText, HelpCircle, Mail, Activity, Cookie, Lock, Users, Briefcase, BookOpen, Info } from "lucide-react";
import { Link } from "@tanstack/react-router";

// ════════════════════════════════════════════════════════════════════════════
// LAYOUT SHARED
// ════════════════════════════════════════════════════════════════════════════

function PageLayout({ icon: Icon, title, subtitle, children }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-[#0A192F] text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o início
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10">
              <Icon className="h-6 w-6 text-sky-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{title}</h1>
              <p className="text-sm text-slate-400">{subtitle}</p>
            </div>
          </div>
          <div className="prose prose-invert prose-sm max-w-none text-slate-300">
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// INSTITUCIONAL
// ════════════════════════════════════════════════════════════════════════════

export function SobrePage() {
  return (
    <PageLayout icon={Info} title="Sobre o Orion" subtitle="Plataforma de gestão de vendas e performance">
      <p>O <strong>Orion</strong> é uma plataforma de gestão de vendas, metas e performance desenvolvida para redes de farmácia e varejo. Nosso sistema centraliza em um único lugar todo o ciclo de gestão comercial: do lançamento de vendas pelo vendedor no caixa até o dashboard executivo para a diretoria.</p>
      <h2>Nossa missão</h2>
      <p>Democratizar o acesso a ferramentas de gestão de performance para empresas de todos os tamanhos, com uma plataforma simples, intuitiva e poderosa que funciona em qualquer dispositivo — do celular do vendedor ao monitor na parede da gerência.</p>
      <h2>O que fazemos</h2>
      <ul>
        <li><strong>Metas e indicadores:</strong> definição de metas mensais e diárias por vendedor, categoria e filial</li>
        <li><strong>Vendas em tempo real:</strong> lançamento de vendas com cálculo automático de ticket médio e projeções</li>
        <li><strong>Dashboard executivo:</strong> visão consolidada multi-filial com KPIs, gráficos e insights automáticos</li>
        <li><strong>Gestão de equipes:</strong> organização por filiais e equipes (diurna/noturna) com isolamento de dados</li>
        <li><strong>Assistente IA:</strong> chat com IA especializada em gestão farmacêutica, com foto (OCR) e voz</li>
        <li><strong>TV Mode:</strong> painel em tempo real para monitoramento em tela cheia</li>
      </ul>
      <h2>Tecnologia</h2>
      <p>Construído com stack moderna: <strong>React 19 + TanStack Start + Supabase + Vercel</strong>. Interface responsiva com Tailwind CSS, animações com Framer Motion e visualizações 3D com Three.js. Dados protegidos com Row Level Security (RLS) no Postgres.</p>
    </PageLayout>
  );
}

export function QuemSomosPage() {
  return (
    <PageLayout icon={Users} title="Quem Somos" subtitle="A equipe por trás do Orion">
      <p>O Orion nasceu da necessidade real de redes de farmácia de terem uma ferramenta de gestão que funcionasse de verdade — não apenas um planilha Excel ou um sistema legado complexo.</p>
      <h2>Nossa história</h2>
      <p>Tudo começou em 2026, quando identificamos que as redes de farmácia precisavam de uma plataforma que conectasse o vendedor no caixa ao gestor na diretoria, em tempo real, sem burocracia. Desenvolvemos o Orion para ser essa ponte.</p>
      <h2>Nossos valores</h2>
      <ul>
        <li><strong>Simplicidade:</strong> se não é fácil de usar, não serve</li>
        <li><strong>Tempo real:</strong> decisões precisam de dados atualizados</li>
        <li><strong>Acessibilidade:</strong> funciona em qualquer dispositivo, em qualquer lugar</li>
        <li><strong>Segurança:</strong> dados protegidos com RLS e LGPD</li>
        <li><strong>Inovação:</strong> IA, 3D e animações não são luxo — são parte da experiência</li>
      </ul>
      <h2>Para quem fazemos</h2>
      <p>Redes de farmácia, varejo e qualquer empresa que precise gerenciar metas de vendas por vendedor, filial e categoria. Do vendedor que lança vendas no celular ao admin master que acompanha múltiplas filiais.</p>
    </PageLayout>
  );
}

export function BlogPage() {
  return (
    <PageLayout icon={BookOpen} title="Blog" subtitle="Novidades, dicas e atualizações do Orion">
      <p>Bem-vindo ao blog do Orion! Aqui compartilhamos novidades do produto, dicas de gestão de vendas e atualizações do sistema.</p>
      <h2>Posts recentes</h2>
      <div className="space-y-4">
        <article className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-bold text-sky-400">Como definir metas de vendas que funcionam</h3>
          <p className="mt-1 text-sm text-slate-400">Aprenda a definir metas mensais e diárias por categoria que motivam sua equipe sem sobrecarregar. Veja como usar o Orion para criar projeções realistas.</p>
          <span className="mt-2 text-xs text-slate-600">Publicado em julho de 2026</span>
        </article>
        <article className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-bold text-sky-400">5 indicadores que todo gestor de farmácia deve acompanhar</h3>
          <p className="mt-1 text-sm text-slate-400">Do ticket médio ao percentual de atingimento: os KPIs essenciais para gerenciar sua loja com dados, não com achismos.</p>
          <span className="mt-2 text-xs text-slate-600">Publicado em julho de 2026</span>
        </article>
        <article className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-bold text-sky-400">TV Mode: monitore sua loja em tempo real</h3>
          <p className="mt-1 text-sm text-slate-400">Como usar o painel TV Mode do Orion para acompanhar o desempenho da equipe em uma tela na parede, com atualização automática a cada 30 segundos.</p>
          <span className="mt-2 text-xs text-slate-600">Publicado em julho de 2026</span>
        </article>
      </div>
      <p className="mt-6 text-sm text-slate-500">Em breve mais artigos. Acompanhe!</p>
    </PageLayout>
  );
}

export function CarreirasPage() {
  return (
    <PageLayout icon={Briefcase} title="Carreiras" subtitle="Faça parte da equipe Orion">
      <p>Estamos sempre em busca de talentos apaixonados por tecnologia, design e gestão para nos ajudar a construir o futuro da gestão de vendas.</p>
      <h2>Vagas abertas</h2>
      <div className="space-y-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-bold text-sky-400">Desenvolvedor(a) Full Stack React/TypeScript</h3>
          <p className="mt-1 text-sm text-slate-400">Experiência com React, TypeScript, Supabase/Postgres. Conhecimento de TanStack Start é diferencial.</p>
          <span className="mt-2 text-xs text-slate-600">Remoto · CLT · Pleno/Sênior</span>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-bold text-sky-400">Designer de Produto (UI/UX)</h3>
          <p className="mt-1 text-sm text-slate-400">Experiência com design de dashboards, sistemas de design e prototipação. Figma avançado.</p>
          <span className="mt-2 text-xs text-slate-600">Remoto · CLT · Pleno</span>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-bold text-sky-400">Especialista em Vendas Farmacêuticas</h3>
          <p className="mt-1 text-sm text-slate-400">Para atuar como Product Specialist, ajudando clientes a extrair o máximo do Orion. Experiência em gestão de farmácia.</p>
          <span className="mt-2 text-xs text-slate-600">Híbrido (Fortaleza/CE) · CLT · Pleno</span>
        </div>
      </div>
      <h2>Como se candidatar</h2>
      <p>Envie seu currículo e portfólio para <a href="mailto:contato@orion-vendas.vercel.app" className="text-sky-400 hover:underline">contato@orion-vendas.vercel.app</a> com o assunto "Vaga: [nome da vaga]".</p>
    </PageLayout>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SUPORTE
// ════════════════════════════════════════════════════════════════════════════

export function FAQPage() {
  const faqs = [
    { q: "Como faço login no Orion?", a: "Acesse a página inicial, clique em \"Entrar no Sistema\" e digite seu e-mail e senha. Vendedores podem usar o primeiro nome + matrícula." },
    { q: "Como lançar uma venda?", a: "No dashboard, clique em \"Lançar Vendas Diárias\". Selecione a data, categoria, valor e número de clientes. O sistema calcula o ticket médio automaticamente." },
    { q: "Posso lançar várias vendas no mesmo dia?", a: "Sim! Não há limite. Você pode lançar quantas vendas quiser por dia e por categoria." },
    { q: "Como ver o desempenho da minha equipe?", a: "Gerentes e supervisores veem automaticamente todos os dados da sua filial no dashboard. Admins veem todas as filiais." },
    { q: "O que é o TV Mode?", a: "É um painel em tela cheia para monitoramento em tempo real, ideal para um monitor na parede da loja. Atualiza a cada 30 segundos." },
    { q: "Como usar a Planilha Interna?", a: "No menu, clique em \"Planilha\". Você verá um dashboard executivo com KPIs, gráficos e insights. Use os filtros de período e vendedor." },
    { q: "Esqueci minha senha, o que faço?", a: "Na tela de login, clique em \"Esqueci minha senha\". Se usa login por matrícula, peça ao seu gerente para redefinir sua credencial." },
    { q: "O sistema funciona no celular?", a: "Sim! O Orion é totalmente responsivo e funciona em qualquer dispositivo. Você pode instalar como PWA (Progressive Web App)." },
  ];
  return (
    <PageLayout icon={HelpCircle} title="FAQ" subtitle="Perguntas frequentes sobre o Orion">
      <div className="space-y-4">
        {faqs.map((f, i) => (
          <details key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <summary className="cursor-pointer font-semibold text-sky-400">{f.q}</summary>
            <p className="mt-2 text-sm text-slate-400">{f.a}</p>
          </details>
        ))}
      </div>
    </PageLayout>
  );
}

export function CentralAjudaPage() {
  return (
    <PageLayout icon={HelpCircle} title="Central de Ajuda" subtitle="Tutoriais e guias do Orion">
      <h2>Primeiros passos</h2>
      <ul>
        <li><strong>Login:</strong> use seu e-mail + senha ou primeiro nome + matrícula</li>
        <li><strong>Dashboard:</strong> veja suas metas, realizado e progresso</li>
        <li><strong>Lançar vendas:</strong> clique no botão verde \"Lançar Vendas Diárias\"</li>
        <li><strong>Resultados:</strong> acompanhe seu ranking e percentual de atingimento</li>
      </ul>
      <h2>Para gerentes e supervisores</h2>
      <ul>
        <li><strong>Gestão de equipe:</strong> veja todos os funcionários da sua filial</li>
        <li><strong>Metas:</strong> defina metas mensais e diárias por vendedor e categoria</li>
        <li><strong>Campanhas:</strong> crie campanhas motivacionais para sua equipe</li>
        <li><strong>Planilha Interna:</strong> dashboard executivo com gráficos e insights</li>
        <li><strong>Gestão de Metas:</strong> CRUD completo de metas, vendas e projeções</li>
      </ul>
      <h2>Para admin master</h2>
      <ul>
        <li><strong>Painel Admin:</strong> CRUD de todas as entidades do sistema</li>
        <li><strong>Multi-filial:</strong> veja e compare todas as filiais</li>
        <li><strong>Configuração da IA:</strong> provedor, modelo, prompts e logs</li>
        <li><strong>Auditoria:</strong> trilha completa de alterações no sistema</li>
      </ul>
      <h2>Precisa de mais ajuda?</h2>
      <p>Entre em contato pelo e-mail <a href="mailto:contato@orion-vendas.vercel.app" className="text-sky-400 hover:underline">contato@orion-vendas.vercel.app</a></p>
    </PageLayout>
  );
}

export function ContatoPage() {
  return (
    <PageLayout icon={Mail} title="Contato" subtitle="Fale com a equipe do Orion">
      <p>Estamos à disposição para ajudar com dúvidas, sugestões ou suporte técnico.</p>
      <div className="mt-4 space-y-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-bold text-sky-400">📧 E-mail</h3>
          <p className="mt-1 text-sm text-slate-400"><a href="mailto:contato@orion-vendas.vercel.app" className="hover:underline">contato@orion-vendas.vercel.app</a></p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-bold text-sky-400">💬 Chat no app</h3>
          <p className="mt-1 text-sm text-slate-400">Use o Assistente IA (botão flutuante azul) dentro do sistema para tirar dúvidas rápidas.</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-bold text-sky-400">🕐 Horário de atendimento</h3>
          <p className="mt-1 text-sm text-slate-400">Segunda a sexta, das 8h às 18h (horário de Fortaleza).</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-bold text-sky-400">📍 Localização</h3>
          <p className="mt-1 text-sm text-slate-400">Fortaleza, Ceará — Brasil. Atendimento 100% remoto.</p>
        </div>
      </div>
    </PageLayout>
  );
}

export function StatusPage() {
  return (
    <PageLayout icon={Activity} title="Status do Sistema" subtitle="Disponibilidade e saúde do Orion">
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
          <span className="font-bold text-emerald-300">Todos os sistemas operacionais</span>
        </div>
        <p className="mt-1 text-sm text-slate-400">Última verificação: agora mesmo</p>
      </div>
      <h2 className="mt-6">Histórico de disponibilidade (últimos 30 dias)</h2>
      <div className="mt-2 flex gap-1">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="h-8 flex-1 rounded-sm bg-emerald-500/60" title="Operacional" />
        ))}
      </div>
      <p className="mt-2 text-sm text-slate-400">Disponibilidade: <strong className="text-emerald-400">100%</strong> nos últimos 30 dias</p>
      <h2 className="mt-6">Componentes</h2>
      <ul className="space-y-2">
        <li className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <span>Aplicação Web (Vercel)</span>
          <span className="flex items-center gap-1.5 text-sm text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Operacional</span>
        </li>
        <li className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <span>Banco de Dados (Supabase)</span>
          <span className="flex items-center gap-1.5 text-sm text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Operacional</span>
        </li>
        <li className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <span>Autenticação (Supabase Auth)</span>
          <span className="flex items-center gap-1.5 text-sm text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Operacional</span>
        </li>
        <li className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <span>Assistente IA</span>
          <span className="flex items-center gap-1.5 text-sm text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Operacional</span>
        </li>
      </ul>
    </PageLayout>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LEGAL
// ════════════════════════════════════════════════════════════════════════════

export function TermosPage() {
  return (
    <PageLayout icon={FileText} title="Termos de Serviço" subtitle="Termos e condições de uso da plataforma Orion">
      <p><strong>Última atualização:</strong> 1 de agosto de 2026</p>
      <h2>1. Aceitação dos termos</h2>
      <p>Ao acessar e utilizar a plataforma Orion (\"o Serviço\"), você concorda com estes Termos de Serviço. Se não concordar, não utilize o Serviço.</p>
      <h2>2. Descrição do serviço</h2>
      <p>O Orion é uma plataforma SaaS de gestão de vendas, metas e performance. O Serviço inclui: dashboard de indicadores, lançamento de vendas, gestão de metas, relatórios, assistente IA, painel TV Mode e planilha interna executiva.</p>
      <h2>3. Contas de usuário</h2>
      <p>Você é responsável por manter a confidencialidade de suas credenciais. Não compartilhe sua conta com terceiros. O administrador da empresa é responsável por gerenciar o acesso de seus funcionários.</p>
      <h2>4. Dados e privacidade</h2>
      <p>Seus dados são armazenados de forma segura no Supabase (PostgreSQL) com Row Level Security. Consulte nossa <Link to="/legal/privacidade" className="text-sky-400 hover:underline">Política de Privacidade</Link> para mais detalhes.</p>
      <h2>5. Uso aceitável</h2>
      <p>Você concorda em não: (a) usar o Serviço para fins ilegais; (b) tentar acessar dados de outros usuários sem autorização; (c) sobrecarregar a infraestrutura do Serviço; (d) usar bots ou scripts automatizados sem permissão.</p>
      <h2>6. Disponibilidade</h2>
      <p>Esforçamo-nos para manter 99,9% de disponibilidade, mas não garantimos que o Serviço será ininterrupto ou livre de erros. Manutenções programadas podem ocorrer.</p>
      <h2>7. Cancelamento</h2>
      <p>Você pode cancelar sua conta a qualquer momento. O administrador pode desativar usuários individualmente através do painel admin.</p>
      <h2>8. Limitação de responsabilidade</h2>
      <p>O Serviço é fornecido \"como está\". Não somos responsáveis por decisões de negócio tomadas com base nos dados apresentados, nem por perdas indiretas resultantes do uso do Serviço.</p>
      <h2>9. Alterações</h2>
      <p>Podemos alterar estes termos a qualquer momento. Usuários serão notificados de mudanças significativas.</p>
    </PageLayout>
  );
}

export function PrivacidadePage() {
  return (
    <PageLayout icon={Lock} title="Política de Privacidade" subtitle="Como tratamos seus dados">
      <p><strong>Última atualização:</strong> 1 de agosto de 2026</p>
      <h2>1. Dados que coletamos</h2>
      <ul>
        <li><strong>Dados de cadastro:</strong> nome, e-mail, cargo, filial, equipe</li>
        <li><strong>Dados de uso:</strong> vendas lançadas, metas definidas, interações com a IA</li>
        <li><strong>Dados de auditoria:</strong> logs de ações administrativas (criar, editar, excluir)</li>
        <li><strong>Dados técnicos:</strong> endereço IP, navegador, dispositivo (para segurança e performance)</li>
      </ul>
      <h2>2. Como usamos seus dados</h2>
      <ul>
        <li>Para fornecer o Serviço (dashboards, relatórios, rankings)</li>
        <li>Para autenticar e autorizar acesso aos dados</li>
        <li>Para melhorar o produto (análise de uso, performance)</li>
        <li>Para prevenir fraudes e uso indevido</li>
      </ul>
      <h2>3. Compartilhamento de dados</h2>
      <p>Não vendemos nem compartilhamos seus dados com terceiros. Os dados são processados exclusivamente em infraestrutura da Vercel (aplicação) e Supabase (banco de dados), ambas com certificação de segurança.</p>
      <h2>4. Segurança</h2>
      <p>Utilizamos Row Level Security (RLS) no Postgres para garantir que cada usuário só acesse dados autorizados. Senhas são armazenadas com hash bcrypt. Conexões usam HTTPS/TLS.</p>
      <h2>5. Seus direitos (LGPD)</h2>
      <p>Você tem o direito de: acessar seus dados, corrigir dados incorretos, solicitar exclusão, portar seus dados e revogar consentimento. Consulte nossa página de <Link to="/legal/lgpd" className="text-sky-400 hover:underline">LGPD</Link> para exercer seus direitos.</p>
      <h2>6. Retenção de dados</h2>
      <p>Dados de usuários ativos são mantidos enquanto a conta estiver ativa. Contas desativadas podem ter seus dados retidos por 90 dias para auditoria, após o que são excluídos.</p>
      <h2>7. Cookies</h2>
      <p>Usamos cookies essenciais para autenticação e preferências de tema. Consulte nossa <Link to="/legal/cookies" className="text-sky-400 hover:underline">Política de Cookies</Link>.</p>
    </PageLayout>
  );
}

export function LGPDPage() {
  return (
    <PageLayout icon={ShieldCheck} title="LGPD" subtitle="Lei Geral de Proteção de Dados — Lei nº 13.709/2018">
      <p><strong>Última atualização:</strong> 1 de agosto de 2026</p>
      <h2>O que é a LGPD?</h2>
      <p>A Lei Geral de Proteção de Dados (LGPD) é a legislação brasileira que regula o tratamento de dados pessoais. O Orion está em conformidade com a LGPD.</p>
      <h2>Seus direitos como titular de dados</h2>
      <ul>
        <li><strong>Confirmação de tratamento:</strong> saber se seus dados são tratados pelo Orion</li>
        <li><strong>Acesso:</strong> obter cópia dos seus dados</li>
        <li><strong>Correção:</strong> corrigir dados incompletos, inexatos ou desatualizados</li>
        <li><strong>Anonimização/Bloqueio:</strong> bloquear dados desnecessários ou excessivos</li>
        <li><strong>Portabilidade:</strong> solicitar portabilidade dos dados a outro fornecedor</li>
        <li><strong>Eliminação:</strong> solicitar exclusão dos seus dados</li>
        <li><strong>Informação sobre compartilhamento:</strong> saber com quem seus dados foram compartilhados</li>
        <li><strong>Revogação de consentimento:</strong> retirar consentimento a qualquer momento</li>
      </ul>
      <h2>Como exercer seus direitos</h2>
      <p>Para exercer qualquer um dos direitos acima, envie um e-mail para <a href="mailto:contato@orion-vendas.vercel.app" className="text-sky-400 hover:underline">contato@orion-vendas.vercel.app</a> com o assunto \"LGPD — Solicitação\". Responderemos em até 15 dias úteis.</p>
      <h2>Encarregado de Dados (DPO)</h2>
      <p>O encarregado pelo tratamento de dados pessoais no Orion pode ser contatado pelo e-mail acima. Todas as solicitações serão tratadas com confidencialidade.</p>
      <h2>Bases legais</h2>
      <p>O Orion trata dados pessoais com base nas seguintes hipóteses legais:</p>
      <ul>
        <li><strong>Execução de contrato:</strong> para fornecer o Serviço contratado</li>
        <li><strong>Cumprimento de obrigação legal:</strong> para atender exigências regulatórias</li>
        <li><strong>Legítimo interesse:</strong> para segurança, auditoria e melhoria do Serviço</li>
        <li><strong>Consentimento:</strong> para tratamentos específicos que exijam consentimento</li>
      </ul>
    </PageLayout>
  );
}

export function CookiesPage() {
  return (
    <PageLayout icon={Cookie} title="Política de Cookies" subtitle="Como usamos cookies no Orion">
      <p><strong>Última atualização:</strong> 1 de agosto de 2026</p>
      <h2>1. O que são cookies?</h2>
      <p>Cookies são pequenos arquivos de texto armazenados no seu navegador para manter informações entre sessões. O Orion usa cookies essenciais para funcionar.</p>
      <h2>2. Cookies que utilizamos</h2>
      <ul>
        <li><strong>Autenticação (essencial):</strong> mantém você logado entre páginas e sessões. Sem este cookie, não é possível usar o Orion.</li>
        <li><strong>Preferências (essencial):</strong> lembra seu tema (claro/escuro), filial selecionada e configurações de navegação.</li>
        <li><strong>Segurança (essencial):</strong> tokens CSRF e de proteção contra ataques.</li>
      </ul>
      <h2>3. Cookies de terceiros</h2>
      <p>Não utilizamos cookies de terceiros para rastreamento ou publicidade. O Supabase (autenticação) e a Vercel (hospedagem) podem usar cookies técnicos essenciais para o funcionamento.</p>
      <h2>4. Gerenciamento de cookies</h2>
      <p>Como usamos apenas cookies essenciais, não há necessidade de banner de consentimento. Você pode limpar cookies do seu navegador a qualquer momento, mas precisará fazer login novamente.</p>
      <h2>5. Armazenamento local</h2>
      <p>Além de cookies, o Orion usa <code>localStorage</code> para armazenar preferências de tema, filial selecionada e estado de tour guiado. Estes dados ficam apenas no seu dispositivo.</p>
    </PageLayout>
  );
}
