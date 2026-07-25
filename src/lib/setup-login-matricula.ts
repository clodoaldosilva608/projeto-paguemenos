// Cria a tabela login_matricula via server function usando supabaseAdmin.rpc
// Solução temporária — contorna o erro do SQL Studio do Supabase
import { createServerFn } from "@tanstack/react-start";

export const criarTabelaLoginMatricula = createServerFn({ method: "POST" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Tentar criar a tabela via função SQL personalizada
    // Usamos uma função pré-existente que executa SQL arbitrário via PL/pgSQL
    // ou simplesmente tentamos fazer queries que falhem graciosamente se a tabela existir

    // Estratégia: usar supabase.from() e capturar erro para detectar se tabela existe
    const { error: errTeste } = await supabaseAdmin
      .from("login_matricula")
      .select("id")
      .limit(1);

    if (!errTeste) {
      return { ok: true, mensagem: "Tabela login_matricula já existe!" };
    }

    if (errTeste.code !== "PGRST205" && !errTeste.message.includes("schema cache")) {
      // Outro erro — tabela existe mas com problema diferente
      return { ok: false, erro: "Tabela existe mas com erro: " + errTeste.message };
    }

    // Tabela não existe. Tentar criar via RPC de função SQL.
    // Vamos criar uma função SQL temporária via .rpc() que faz o CREATE TABLE.
    // Mas isso também precisa de DDL...

    // Última alternativa: retornar instruções para o admin
    return {
      ok: false,
      erro: "Tabela login_matricula não existe. Aplique o SQL no Supabase Studio.",
      sql_comando: `CREATE TABLE public.login_matricula (id uuid PRIMARY KEY, user_id uuid NOT NULL, primeiro_nome text NOT NULL, matricula text NOT NULL, ativo boolean DEFAULT true, criado_em timestamptz DEFAULT now(), atualizado_em timestamptz DEFAULT now())`,
    };
  });
