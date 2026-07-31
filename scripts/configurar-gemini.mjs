// =============================================================
// configurar-gemini.mjs
// =============================================================
// Configura a tabela ai_config do projeto-paguemenos com uma chave do
// Google AI Studio (Gemini), usando o endpoint OpenAI-compatível que
// funciona de qualquer região (incluindo datacenters da Vercel).
//
// Resolve:
//   - Erro 429 (quota exceeded) — chave nova do Google AI Studio
//   - Erro 400 (user location not supported) — endpoint /v1beta/openai/chat/completions
//     é acessível globalmente, diferentemente do endpoint nativo Gemini.
//
// USO:  node scripts/configurar-gemini.mjs
//
// As credenciais são lidas de variáveis de ambiente (NUNCA hardcoded):
//   - SUPABASE_URL               (pública)
//   - SUPABASE_SERVICE_ROLE_KEY  (server-only; NUNCA commite em .env que vai pro git)
//   - GEMINI_API_KEY             (chave do Google AI Studio)
//
// Carrega automaticamente de um arquivo .env na raiz do projeto.
// =============================================================

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE || !GEMINI_API_KEY) {
  console.error("\n[FATAL] Variáveis de ambiente ausentes no .env:");
  if (!SUPABASE_URL) console.error("   - SUPABASE_URL");
  if (!SERVICE_ROLE) console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  if (!GEMINI_API_KEY) console.error("   - GEMINI_API_KEY");
  console.error("\nCrie um arquivo .env na raiz (veja .env.example). NUNCA commite o .env.\n");
  process.exit(1);
}

// Configuração a ser aplicada na linha ativa de ai_config.
const NOVA_CONFIG = {
  provider: "google",
  model: "gemini-2.0-flash",
  // Endpoint OpenAI-compatível do Gemini — funciona de qualquer região.
  base_url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  provider_panel_url: "https://aistudio.google.com/app/apikey",
  api_key_ciphertext: GEMINI_API_KEY,
  ativo: true,
  status: "conectado",
  last_error: null,
  last_validation: new Date().toISOString(),
  atualizado_em: new Date().toISOString(),
};

const headers = {
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function main() {
  console.log("=== Configurando Gemini no projeto-paguemenos ===\n");
  console.log(`  Supabase URL : ${SUPABASE_URL}`);
  console.log(`  Provider     : ${NOVA_CONFIG.provider}`);
  console.log(`  Model        : ${NOVA_CONFIG.model}`);
  console.log(`  Base URL     : ${NOVA_CONFIG.base_url}`);
  console.log(`  API key      : ${NOVA_CONFIG.api_key_ciphertext.slice(0, 8)}...${NOVA_CONFIG.api_key_ciphertext.slice(-4)}`);
  console.log("");

  // 1) Buscar config ativa atual
  console.log("1) Buscando config ativa atual...");
  const getResp = await fetch(
    `${SUPABASE_URL}/rest/v1/ai_config?select=id,provider,model,ativo&ativo=eq.true&limit=1`,
    { headers },
  );
  if (!getResp.ok) {
    const t = await getResp.text();
    console.error(`❌ Erro ao buscar config: ${getResp.status} ${t.slice(0, 200)}`);
    process.exit(1);
  }
  const rows = await getResp.json();
  const atual = rows[0];

  let result;
  if (atual) {
    // 2) PATCH na config existente
    console.log(`2) Config ativa encontrada (id=${atual.id}, provider=${atual.provider}, model=${atual.model}). Aplicando PATCH...`);
    const patchResp = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_config?id=eq.${atual.id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify(NOVA_CONFIG),
      },
    );
    if (!patchResp.ok) {
      const t = await patchResp.text();
      console.error(`❌ Erro ao fazer PATCH: ${patchResp.status} ${t.slice(0, 300)}`);
      process.exit(1);
    }
    const updated = await patchResp.json();
    result = Array.isArray(updated) && updated.length > 0 ? updated[0] : { id: atual.id, ...NOVA_CONFIG };
    console.log(`✅ PATCH aplicado com sucesso.`);
  } else {
    // 3) INSERT de nova config (se não há nenhuma ativa)
    console.log("2) Nenhuma config ativa encontrada. Criando nova linha...");
    const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/ai_config`, {
      method: "POST",
      headers,
      body: JSON.stringify(NOVA_CONFIG),
    });
    if (!insertResp.ok) {
      const t = await insertResp.text();
      console.error(`❌ Erro ao fazer INSERT: ${insertResp.status} ${t.slice(0, 300)}`);
      process.exit(1);
    }
    const inserted = await insertResp.json();
    result = Array.isArray(inserted) && inserted.length > 0 ? inserted[0] : NOVA_CONFIG;
    console.log(`✅ INSERT aplicado com sucesso.`);
  }

  // 4) Verificação final
  console.log("\n3) Verificação final — relendo config ativa...");
  const verifyResp = await fetch(
    `${SUPABASE_URL}/rest/v1/ai_config?select=id,provider,model,base_url,ativo,status,atualizado_em&ativo=eq.true&limit=1`,
    { headers },
  );
  if (!verifyResp.ok) {
    console.warn(`⚠️  Não foi possível verificar: ${verifyResp.status}`);
  } else {
    const verify = await verifyResp.json();
    const v = verify[0];
    if (!v) {
      console.error("❌ Config ativa não encontrada após update!");
      process.exit(1);
    }
    console.log(`  id            : ${v.id}`);
    console.log(`  provider      : ${v.provider}`);
    console.log(`  model         : ${v.model}`);
    console.log(`  base_url      : ${v.base_url}`);
    console.log(`  ativo         : ${v.ativo}`);
    console.log(`  status        : ${v.status}`);
    console.log(`  atualizado_em : ${v.atualizado_em}`);
  }

  console.log("\n=== Configuração do Gemini concluída! ===");
  console.log("\n📌 Próximos passos:");
  console.log("  1. Acesse 'Configuração da IA' no painel admin do Orion");
  console.log("  2. Clique em 'Testar Conexão' para validar");
  console.log("  3. Use o chat de teste para confirmar que responde");
  console.log("  4. Se ainda houver erro 429, aguarde 60s (rate limit do Gemini)");
  console.log("");
}

main().catch((e) => {
  console.error("❌ Erro fatal:", e.message);
  process.exit(1);
});
