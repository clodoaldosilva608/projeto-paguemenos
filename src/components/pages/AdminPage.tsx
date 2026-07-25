import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuickLinks, type QuickLink } from "@/hooks/useQuickLinks";
import {
  criarConvite, revogarConvite, alterarPerfilUsuario, alternarAtivo, excluirUsuario,
  salvarQuickLink, excluirQuickLink, listarAuditoria,
} from "@/lib/admin.functions";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Trash2, Plus, Send, Power, MessageCircle, Instagram, Facebook, Twitter, Youtube, Send as Telegram, Link as LinkIcon, History, RefreshCw, Plug, KeyRound } from "lucide-react";
import { IntegracoesTab } from "@/components/admin/IntegracoesTab";
import CredenciaisMatriculaTab from "@/components/admin/CredenciaisMatriculaTab";

type Perfil = "admin" | "gerente" | "supervisor" | "vendedor";

type AbaAdmin = "usuarios" | "convites" | "acessos" | "credenciais" | "integracoes" | "auditoria";



interface Profile { id: string; nome: string; email: string; ativo: boolean; filial_id: string | null; cargo: string | null; }
interface RoleRow { user_id: string; role: Perfil; }
interface Invite { id: string; email: string; nome: string; perfil: Perfil; status: string; token: string; criado_em: string; expira_em: string; }

const ICONES = [
  { v: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
  { v: "telegram", label: "Telegram", Icon: Telegram },
  { v: "instagram", label: "Instagram", Icon: Instagram },
  { v: "facebook", label: "Facebook", Icon: Facebook },
  { v: "twitter", label: "Twitter/X", Icon: Twitter },
  { v: "youtube", label: "YouTube", Icon: Youtube },
  { v: "link", label: "Link genérico", Icon: LinkIcon },
];

export default function AdminPage() {
  const { usuario } = useAuth();
  const [aba, setAba] = useState<AbaAdmin>("usuarios");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const { links, reload: reloadLinks } = useQuickLinks(true);
  const [loading, setLoading] = useState(true);

  const call = {
    criarConvite: useServerFn(criarConvite),
    revogarConvite: useServerFn(revogarConvite),
    alterarPerfil: useServerFn(alterarPerfilUsuario),
    alternarAtivo: useServerFn(alternarAtivo),
    excluir: useServerFn(excluirUsuario),
    salvarLink: useServerFn(salvarQuickLink),
    excluirLink: useServerFn(excluirQuickLink),
  };

  const reload = async () => {
    setLoading(true);
    const [{ data: pRows }, { data: rRows }, { data: iRows }] = await Promise.all([
      supabase.from("profiles").select("id,nome,email,ativo,filial_id,cargo").order("nome"),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("invites").select("*").order("criado_em", { ascending: false }),
    ]);
    setProfiles((pRows ?? []) as Profile[]);
    setRoles((rRows ?? []) as RoleRow[]);
    setInvites((iRows ?? []) as Invite[]);
    setLoading(false);
  };

  useEffect(() => { void reload(); }, []);

  if (usuario?.perfil !== "admin") {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">Acesso restrito ao administrador.</div>;
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-slate-900">
        {([
          { id: "usuarios", label: "Usuários", Icon: Power },
          { id: "convites", label: "Convites", Icon: Send },
          { id: "acessos", label: "Acessos rápidos", Icon: LinkIcon },
          { id: "credenciais", label: "Credenciais", Icon: KeyRound },
          { id: "integracoes", label: "Integrações", Icon: Plug },
          { id: "auditoria", label: "Auditoria", Icon: History },
        ] as const).map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setAba(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${aba === id ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"}`}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>


      {loading && <p className="text-sm text-slate-500">Carregando...</p>}

      {aba === "usuarios" && (
        <UsuariosTab
          profiles={profiles} roles={roles} usuarioLogadoId={usuario!.id}
          onChangeRole={async (uid, r) => { await call.alterarPerfil({ data: { user_id: uid, perfil: r } }); toast.success("Perfil atualizado"); reload(); }}
          onToggle={async (uid, a) => { await call.alternarAtivo({ data: { user_id: uid, ativo: a } }); toast.success(a ? "Usuário ativado" : "Usuário desativado"); reload(); }}
          onDelete={async (uid) => { if (!confirm("Excluir permanentemente?")) return; try { await call.excluir({ data: { user_id: uid } }); toast.success("Usuário excluído"); reload(); } catch (e: any) { toast.error(e.message); } }}
        />
      )}

      {aba === "convites" && (
        <ConvitesTab
          invites={invites}
          onCriar={async (payload) => {
            try {
              const r = await call.criarConvite({ data: payload });
              toast.success("Convite criado! Link copiado.");
              const link = window.location.origin + `/auth?mode=signup&invite=${r.invite.token}&email=${encodeURIComponent(r.invite.email)}`;
              await navigator.clipboard.writeText(link).catch(() => {});
              reload();
              return link;
            } catch (e: any) { toast.error(e.message); return null; }
          }}
          onRevogar={async (id) => { await call.revogarConvite({ data: { id } }); toast.success("Convite revogado"); reload(); }}
        />
      )}

      {aba === "acessos" && (
        <AcessosRapidosTab
          links={links}
          onSalvar={async (l) => { try { await call.salvarLink({ data: l }); toast.success("Botão salvo"); reloadLinks(); } catch (e: any) { toast.error(e.message); } }}
          onExcluir={async (id) => { if (!confirm("Excluir botão?")) return; await call.excluirLink({ data: { id } }); toast.success("Excluído"); reloadLinks(); }}
        />
      )}

      {aba === "integracoes" && <IntegracoesTab />}

      {aba === "credenciais" && <CredenciaisMatriculaTab />}

      {aba === "auditoria" && <AuditoriaTab />}
    </div>
  );
}

// -------------------- Auditoria --------------------

function AuditoriaTab() {
  const listar = useServerFn(listarAuditoria);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    try {
      const r: any = await listar({ data: { limit: 200 } });
      setRows(r?.rows ?? []);
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void carregar(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100"><History className="h-4 w-4" /> Registro de auditoria</h3>
        <button onClick={carregar} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
          <RefreshCw className="h-3 w-3" /> Atualizar
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 dark:bg-white/5 dark:text-slate-400">
            <tr><th className="px-4 py-2">Quando</th><th className="px-4 py-2">Quem</th><th className="px-4 py-2">Ação</th><th className="px-4 py-2">Alvo</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="p-4 text-center text-xs text-slate-500">Carregando...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-xs text-slate-500">Sem registros ainda.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-white/5">
                <td className="px-4 py-2 text-xs text-slate-500">{new Date(r.criado_em).toLocaleString("pt-BR")}</td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{r.ator_nome ?? r.ator_id ?? "—"}</td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{r.acao}</td>
                <td className="px-4 py-2 text-slate-500 text-xs">{r.alvo_tipo ?? ""}{r.alvo_id ? ` · ${r.alvo_id.slice(0, 8)}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// -------------------- Sub-componentes --------------------

function UsuariosTab({ profiles, roles, usuarioLogadoId, onChangeRole, onToggle, onDelete }: {
  profiles: Profile[]; roles: RoleRow[]; usuarioLogadoId: string;
  onChangeRole: (uid: string, r: Perfil) => void; onToggle: (uid: string, a: boolean) => void; onDelete: (uid: string) => void;
}) {
  const perfilDe = (uid: string): Perfil => (roles.find((r) => r.user_id === uid)?.role || "vendedor") as Perfil;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 dark:bg-white/5 dark:text-slate-400">
          <tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">E-mail</th><th className="px-4 py-3">Perfil</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr>
        </thead>
        <tbody>
          {profiles.map((p) => {
            const perf = perfilDe(p.id);
            const isSelf = p.id === usuarioLogadoId;
            return (
              <tr key={p.id} className="border-t border-slate-100 dark:border-white/5">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{p.nome}</td>
                <td className="px-4 py-3 text-slate-500">{p.email}</td>
                <td className="px-4 py-3">
                  <select value={perf} disabled={isSelf} onChange={(e) => onChangeRole(p.id, e.target.value as Perfil)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-slate-800">
                    <option value="admin">Admin</option><option value="gerente">Gerente</option><option value="supervisor">Supervisor</option><option value="vendedor">Vendedor</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.ativo ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{p.ativo ? "Ativo" : "Inativo"}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onToggle(p.id, !p.ativo)} title={p.ativo ? "Desativar" : "Ativar"} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><Power className="h-4 w-4" /></button>
                    <button onClick={() => onDelete(p.id)} disabled={isSelf} title="Excluir" className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ConvitesTab({ invites, onCriar, onRevogar }: {
  invites: Invite[]; onCriar: (p: any) => Promise<string | null>; onRevogar: (id: string) => void;
}) {
  const [form, setForm] = useState({ email: "", nome: "", perfil: "vendedor" as Perfil, cargo: "" });
  const [lastLink, setLastLink] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const link = await onCriar({ ...form, filial_id: "f-7537", equipe_id: "eq-1" });
    if (link) { setLastLink(link); setForm({ email: "", nome: "", perfil: "vendedor", cargo: "" }); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-5 dark:border-white/10 dark:bg-slate-900">
        <input required placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 sm:col-span-2" />
        <input required type="email" placeholder="email@empresa.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 sm:col-span-2" />
        <select value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value as Perfil })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100">
          <option value="vendedor">Vendedor</option><option value="supervisor">Supervisor</option><option value="gerente">Gerente</option><option value="admin">Admin</option>
        </select>
        <button type="submit" className="col-span-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"><Plus className="h-4 w-4" />Enviar convite</button>
      </form>

      {lastLink && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
          <Send className="mt-0.5 h-4 w-4" />
          <div className="flex-1">
            <p className="font-semibold">Convite gerado. Link copiado para a área de transferência.</p>
            <p className="mt-1 break-all font-mono text-xs opacity-80">{lastLink}</p>
          </div>
          <button onClick={() => navigator.clipboard.writeText(lastLink)} className="rounded p-1 hover:bg-emerald-500/20"><Copy className="h-4 w-4" /></button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 dark:bg-white/5 dark:text-slate-400">
            <tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">E-mail</th><th className="px-4 py-3">Perfil</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr>
          </thead>
          <tbody>
            {invites.map((inv) => {
              const link = window.location.origin + `/auth?mode=signup&invite=${inv.token}&email=${encodeURIComponent(inv.email)}`;
              return (
                <tr key={inv.id} className="border-t border-slate-100 dark:border-white/5">
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{inv.nome}</td>
                  <td className="px-4 py-3 text-slate-500">{inv.email}</td>
                  <td className="px-4 py-3 text-slate-500">{inv.perfil}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">{inv.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado"); }} title="Copiar link" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><Copy className="h-4 w-4" /></button>
                      {inv.status === "pendente" && <button onClick={() => onRevogar(inv.id)} title="Revogar" className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AcessosRapidosTab({ links, onSalvar, onExcluir }: {
  links: QuickLink[]; onSalvar: (l: any) => void; onExcluir: (id: string) => void;
}) {
  const [novo, setNovo] = useState({ label: "", url: "", icone: "whatsapp", cor: "#25D366", ativo: true });

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); onSalvar({ ...novo, ordem: links.length }); setNovo({ label: "", url: "", icone: "whatsapp", cor: "#25D366", ativo: true }); }}
            className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-6 dark:border-white/10 dark:bg-slate-900">
        <input required placeholder="Rótulo (ex.: Grupo WhatsApp)" value={novo.label} onChange={(e) => setNovo({ ...novo, label: e.target.value })} className="col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" />
        <input required type="url" placeholder="https://..." value={novo.url} onChange={(e) => setNovo({ ...novo, url: e.target.value })} className="col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" />
        <select value={novo.icone} onChange={(e) => setNovo({ ...novo, icone: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100">
          {ICONES.map((i) => <option key={i.v} value={i.v}>{i.label}</option>)}
        </select>
        <input type="color" value={novo.cor} onChange={(e) => setNovo({ ...novo, cor: e.target.value })} className="h-10 w-full rounded-lg border border-slate-200 bg-white dark:border-white/10" />
        <button type="submit" className="col-span-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"><Plus className="h-4 w-4" />Adicionar botão</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => {
          const IconDef = ICONES.find((i) => i.v === l.icone) ?? ICONES[6];
          return (
            <div key={l.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ backgroundColor: l.cor }}>
                <IconDef.Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{l.label}</p>
                <p className="truncate text-[11px] text-slate-500">{l.url}</p>
              </div>
              <label className="flex cursor-pointer items-center gap-1 text-[11px] text-slate-500">
                <input type="checkbox" checked={l.ativo} onChange={(e) => onSalvar({ id: l.id, label: l.label, url: l.url, icone: l.icone, cor: l.cor, ordem: l.ordem, ativo: e.target.checked })} />
                {l.ativo ? "Visível" : "Oculto"}
              </label>
              <button onClick={() => onExcluir(l.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
            </div>
          );
        })}
        {links.length === 0 && <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-white/10">Nenhum botão de acesso rápido cadastrado ainda.</p>}
      </div>
    </div>
  );
}
