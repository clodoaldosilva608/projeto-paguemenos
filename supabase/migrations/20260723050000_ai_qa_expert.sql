-- Migration: AI Config / QA Expert Validator Seed
-- Auto-correção e Configuração Inicial de IA
--
-- NOTA DE SEGURANÇA: A chave do Gemini NÃO é mais hardcoded nesta migration.
-- O valor era 'AQ.Ab8RN6...PXJ9sQ' (commit histórico — considerada comprometida).
-- Agora a migration insere um placeholder; a chave real deve ser configurada
-- via o script scripts/configurar-gemini.mjs (que lê de .env) ou pelo painel
-- admin (tela "Configuração da IA").

INSERT INTO integrations (
    provider,
    model,
    api_key,
    system_prompt,
    assistant_prompt,
    assistant_style,
    temperature,
    language,
    status,
    auto_translate
) VALUES (
    'google',
    'gemini-1.5-pro',
    '<configure-via-painel-ou-script-configurar-gemini>',
    'Você é um Especialista em Gestão Farmacêutica e Farmácia Clínica, focado em vendas, atendimento e conformidade na rede Pague Menos. Siga rigorosamente as diretrizes operacionais e de saúde.',
    'Sou o Assistente IA Especializado Pague Menos. Como posso ajudar com os processos de loja, gestão de estoque ou dúvidas farmacêuticas hoje?',
    'professional',
    0.3,
    'pt-BR',
    'active',
    true
)
ON CONFLICT (id) DO UPDATE SET
    api_key = EXCLUDED.api_key,
    system_prompt = EXCLUDED.system_prompt,
    assistant_prompt = EXCLUDED.assistant_prompt,
    status = EXCLUDED.status;
