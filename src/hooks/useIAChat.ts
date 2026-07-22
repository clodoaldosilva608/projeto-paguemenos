import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { chatIA } from "@/lib/ia.functions";
import { useAuth } from "@/contexts/AuthContext";
import { vendasStore } from "@/data/vendasStore";

export interface IAMessage { role: "user" | "assistant"; content: string }

export const SUGESTOES_IA = [
  "Como aumentar meu ticket médio?",
  "Dica para bater a meta do mês",
  "Como abordar cliente que só quer preço?",
  "Ideia de campanha para genéricos",
  "Analise meu desempenho neste mês",
];

function contextoDoUsuario(usuario: any) {
  if (!usuario) return undefined;
  const partes = [`Nome: ${usuario.nome}`, `Perfil: ${usuario.perfil}`];
  if (usuario.cargo) partes.push(`Cargo: ${usuario.cargo}`);
  if (usuario.filialId) partes.push(`Filial: ${usuario.filialId}`);

  try {
    const todas = vendasStore.listar();
    const minhas = todas.filter((v) => v.vendedorNome?.toLowerCase().includes((usuario.nome || "").toLowerCase().split(" ")[0]));
    if (minhas.length) {
      const totalLiq = minhas.reduce((s, v) => s + v.valorVendaLiquida, 0);
      const totalCli = minhas.reduce((s, v) => s + v.qtdeClienteVendaLiquida, 0);
      const tkm = totalCli > 0 ? totalLiq / totalCli : 0;
      partes.push(`Vendas do mês (líquido): R$ ${totalLiq.toFixed(2)}`);
      partes.push(`Clientes atendidos: ${totalCli}`);
      partes.push(`Ticket médio: R$ ${tkm.toFixed(2)}`);
      partes.push(`Dias com venda: ${minhas.length}`);
    }
  } catch { /* ignora */ }
  return partes.join(". ");
}

export function useIAChat() {
  const { usuario } = useAuth();
  const [msgs, setMsgs] = useState<IAMessage[]>([]);
  const [carregando, setCarregando] = useState(false);
  const call = useServerFn(chatIA);

  const enviar = useCallback(async (texto: string) => {
    const t = texto.trim();
    if (!t || carregando) return;
    const novos: IAMessage[] = [...msgs, { role: "user", content: t }];
    setMsgs(novos);
    setCarregando(true);
    try {
      const contexto = contextoDoUsuario(usuario);
      const r = await call({ data: { messages: novos, contexto } });
      setMsgs((m) => [...m, { role: "assistant", content: r.text }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "assistant", content: `⚠️ ${e?.message ?? "Erro na IA"}` }]);
    } finally {
      setCarregando(false);
    }
  }, [msgs, carregando, usuario, call]);

  const limpar = useCallback(() => setMsgs([]), []);

  return { msgs, carregando, enviar, limpar, sugestoes: SUGESTOES_IA, usuario };
}
