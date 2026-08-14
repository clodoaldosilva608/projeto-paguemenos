-- ============================================================
-- Adiciona provider 'huggingface' à CHECK constraint de ai_config
-- Permite usar Hugging Face Inference API (gratuito, funciona no Brasil)
-- ============================================================

-- Remover constraint antiga
ALTER TABLE public.ai_config DROP CONSTRAINT IF EXISTS ai_config_provider_check;

-- Adicionar nova constraint com 'huggingface'
ALTER TABLE public.ai_config ADD CONSTRAINT ai_config_provider_check
  CHECK (provider IN ('lovable','openai','google','anthropic','azure','openrouter','huggingface'));

-- Verificação
SELECT 'Constraint atualizada — huggingface agora é provider válido' AS msg;
