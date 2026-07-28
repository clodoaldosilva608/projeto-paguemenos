// Cria tabelas equipes e filiais via REST API + popula dados iniciais
const SUPABASE_URL = "https://wfvihysxlzkwwrwobmpv.supabase.co";
const SERVICE_ROLE = "sb_secret_HetybEr5FvTi8aabdMS0Lg_7ihJjxOg";

async function main() {
  console.log("=== Verificando se tabelas já existem ===");

  // Verificar filiais
  let r = await fetch(`${SUPABASE_URL}/rest/v1/filiais?select=id&limit=1`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  });
  if (r.ok) {
    console.log("✅ Tabela filiais já existe");
  } else {
    console.log("❌ Tabela filiais não existe — precisa aplicar SQL no Studio");
    console.log("   Veja: supabase/migrations/20260728000001_equipes_filiais.sql");
    return;
  }

  // Verificar equipes
  r = await fetch(`${SUPABASE_URL}/rest/v1/equipes?select=id&limit=1`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  });
  if (r.ok) {
    console.log("✅ Tabela equipes já existe");
  } else {
    console.log("❌ Tabela equipes não existe");
    return;
  }

  // Popular filial 7537 se não existir
  console.log("\n=== Populando filial 7537 ===");
  r = await fetch(`${SUPABASE_URL}/rest/v1/filiais?id=eq.7537&select=id`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  });
  const filialExiste = await r.json();
  if (filialExiste.length === 0) {
    r = await fetch(`${SUPABASE_URL}/rest/v1/filiais`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        id: "7537",
        nome: "Pague Menos - Filial 7537",
        endereco: "Av. Principal, 1000",
        cidade: "São Paulo",
        estado: "SP",
        ativo: true,
      }),
    });
    if (r.ok) console.log("✅ Filial 7537 criada");
    else console.log("❌ Erro ao criar filial:", await r.text());
  } else {
    console.log("✅ Filial 7537 já existe");
  }

  // Popular equipe Turno Manhã se não existir
  console.log("\n=== Populando Equipe Turno Manhã ===");
  r = await fetch(`${SUPABASE_URL}/rest/v1/equipes?select=id&nome=eq.Equipe%20Turno%20Manh%C3%A3`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  });
  const equipeExiste = await r.json();
  if (equipeExiste.length === 0) {
    r = await fetch(`${SUPABASE_URL}/rest/v1/equipes`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        nome: "Equipe Turno Manhã",
        filial_id: "7537",
        turno: "manha",
        ativo: true,
      }),
    });
    if (r.ok) console.log("✅ Equipe Turno Manhã criada");
    else console.log("❌ Erro ao criar equipe:", await r.text());
  } else {
    console.log("✅ Equipe Turno Manhã já existe");
  }

  console.log("\n✅ Tabelas equipes e filiais prontas!");
}

main();
