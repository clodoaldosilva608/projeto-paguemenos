"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "@/components/planilha/noop-router";
import { Modal } from "@/components/planilha/ui/modal";
import { useToast } from "@/components/planilha/ui/toast";
import { SortableTable, type Column } from "@/components/planilha/ui/sortable-table";
import { Sparkline } from "@/components/planilha/charts-extra";
import { EmployeeEntry } from "@/components/planilha/data-manager";
import { fmtBRL, fmtPct, statusDe } from "@/lib/planilha/format";
import { StatusPill } from "@/components/planilha/kit";

export type FuncionarioLinha = {
  id: number;
  nome: string;
  cargo: string;
  matricula: string;
  email: string;
  status: string;
  meta: number;
  realizado: number;
  projecao: number;
  atingimento: number;
  clientes: number;
  vendasValor: number;
  serie: number[];
  aba: string | null;
};

const control = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#1a56c5] focus:ring-2 focus:ring-blue-100";
const lbl = "text-[11px] font-bold uppercase tracking-wider text-slate-500";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Ativo: "bg-emerald-100 text-emerald-700 border-emerald-300",
    Férias: "bg-sky-100 text-sky-700 border-sky-300",
    Inativo: "bg-slate-200 text-slate-600 border-slate-300",
  };
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${map[status] ?? map.Inativo}`}>{status}</span>;
}

function EditEmployee({ f, onDone }: { f: FuncionarioLinha; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [erro, setErro] = useState("");
  const [busy, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const salvar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro("");
    const form = new FormData(e.currentTarget);
    try {
      const r = await fetch(`/api/funcionarios/${f.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: String(form.get("nome")),
          matricula: String(form.get("matricula")),
          email: String(form.get("email")),
          cargo: String(form.get("cargo")),
          status: String(form.get("status")),
        }),
      });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(data.error ?? "Erro ao atualizar.");
      setOpen(false);
      toast.success("Funcionário atualizado", String(form.get("nome")));
      onDone();
      startTransition(() => router.refresh());
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao atualizar.");
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded p-1 text-[#1a56c5] transition hover:bg-blue-50" title="Editar funcionário" aria-label={`Editar ${f.nome}`}>✎</button>
      {open && (
        <Modal title={`Editar ${f.nome}`} onClose={() => setOpen(false)}>
          <form onSubmit={salvar} className="p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className={`${lbl} sm:col-span-2`}>Nome completo<input required name="nome" defaultValue={f.nome} minLength={3} className={control} /></label>
              <label className={lbl}>Matrícula<input required name="matricula" defaultValue={f.matricula} className={control} /></label>
              <label className={lbl}>E-mail<input required name="email" type="email" defaultValue={f.email} className={control} /></label>
              <label className={lbl}>Cargo
                <select name="cargo" defaultValue={f.cargo} className={control}>
                  {["Vendedor", "Vendedora", "Gerente", "Supervisor", "Admin Master", "Equipe (Outros)"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className={lbl}>Status
                <select name="status" defaultValue={f.status} className={control}>
                  <option>Ativo</option><option>Férias</option><option>Inativo</option>
                </select>
              </label>
            </div>
            {erro && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">{erro}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button disabled={busy} className="rounded-lg bg-[#1a56c5] px-4 py-2 text-xs font-bold text-white hover:bg-[#1d63e0] disabled:opacity-60">{busy ? "Salvando..." : "Salvar alterações"}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function DeleteEmployee({ f }: { f: FuncionarioLinha }) {
  const [open, setOpen] = useState(false);
  const [erro, setErro] = useState("");
  const [busy, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const excluir = async () => {
    setErro("");
    try {
      const r = await fetch(`/api/funcionarios/${f.id}`, { method: "DELETE" });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(data.error ?? "Erro ao excluir.");
      setOpen(false);
      toast.success("Funcionário excluído", f.nome);
      startTransition(() => router.refresh());
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  };

  const inativar = async () => {
    try {
      const r = await fetch(`/api/funcionarios/${f.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Inativo" }),
      });
      if (!r.ok) throw new Error();
      setOpen(false);
      toast.success("Funcionário inativado", `${f.nome} não aparecerá como ativo`);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Não foi possível inativar");
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded p-1 text-rose-500 transition hover:bg-rose-50" title="Excluir funcionário" aria-label={`Excluir ${f.nome}`}>🗑</button>
      {open && (
        <Modal title="Excluir funcionário" onClose={() => setOpen(false)} size="sm">
          <div className="p-5">
            <p className="text-sm text-slate-700">Deseja realmente excluir <strong>{f.nome}</strong> (matrícula {f.matricula || "—"})?</p>
            <p className="mt-2 text-xs text-slate-500">Funcionários com histórico de vendas não podem ser removidos — nesse caso use <strong>Inativar</strong> para preservar os dados.</p>
            {erro && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">{erro}</p>}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button type="button" onClick={inativar} className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100">Inativar</button>
              <button type="button" onClick={excluir} disabled={busy} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60">{busy ? "Excluindo..." : "Excluir"}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function StatusToggle({ f }: { f: FuncionarioLinha }) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const proximo = f.status === "Ativo" ? "Férias" : f.status === "Férias" ? "Inativo" : "Ativo";
  const alternar = async () => {
    try {
      const r = await fetch(`/api/funcionarios/${f.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: proximo }),
      });
      if (!r.ok) throw new Error();
      toast.info(`Status alterado para ${proximo}`, f.nome);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Não foi possível alterar o status");
    }
  };
  return (
    <button type="button" onClick={alternar} title={`Alterar para ${proximo}`} className="transition hover:opacity-70">
      <StatusBadge status={f.status} />
    </button>
  );
}

export function EquipeTable({ rows, filterQuery }: { rows: FuncionarioLinha[]; filterQuery: string }) {
  const columns: Column<FuncionarioLinha>[] = [
    {
      key: "funcionario", label: "Funcionário", sortable: true, value: (r) => r.nome,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1a56c5] to-[#0d3b96] text-[11px] font-bold text-white">
            {r.nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-800">{r.nome}</div>
            <div className="truncate text-[10px] text-slate-500">{r.cargo}</div>
          </div>
        </div>
      ),
    },
    { key: "matricula", label: "Matrícula", sortable: true, value: (r) => r.matricula, render: (r) => <span className="font-mono text-[10.5px]">{r.matricula || "—"}</span> },
    {
      key: "email", label: "E-mail", sortable: true, value: (r) => r.email,
      render: (r) => r.email
        ? <a href={`mailto:${r.email}`} className="text-[#1a56c5] hover:underline">{r.email}</a>
        : <span className="text-slate-400">—</span>,
    },
    { key: "status", label: "Status", align: "center", sortable: true, value: (r) => r.status, render: (r) => <StatusToggle f={r} /> },
    { key: "meta", label: "Meta (R$)", align: "right", sortable: true, value: (r) => r.meta, render: (r) => fmtBRL(r.meta) },
    { key: "realizado", label: "Realizado (R$)", align: "right", sortable: true, value: (r) => r.realizado, render: (r) => <span className="font-semibold">{fmtBRL(r.realizado)}</span> },
    {
      key: "atingimento", label: "% Atingimento", align: "center", sortable: true, value: (r) => r.atingimento,
      render: (r) => (
        <div className="flex items-center justify-center gap-2">
          <span className="font-bold">{fmtPct(r.atingimento)}</span>
          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full" style={{ width: `${Math.min(r.atingimento, 100)}%`, background: r.atingimento >= 70 ? "#16a34a" : r.atingimento >= 30 ? "#f59e0b" : "#dc2626" }} />
          </div>
        </div>
      ),
    },
    { key: "situacao", label: "Situação", align: "center", render: (r) => <StatusPill status={statusDe(r.atingimento)} /> },
    { key: "tendencia", label: "Tendência", align: "center", render: (r) => <Sparkline values={r.serie} /> },
    { key: "clientes", label: "Clientes", align: "right", sortable: true, value: (r) => r.clientes, render: (r) => r.clientes },
    {
      key: "acoes", label: "Ações", align: "center",
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
          {r.aba && (
            <a href={`/?tab=${r.aba}&${filterQuery}`} className="rounded p-1 text-emerald-600 transition hover:bg-emerald-50" title="Abrir painel individual" aria-label={`Abrir painel de ${r.nome}`}>📊</a>
          )}
          <EditEmployee f={r} onDone={() => {}} />
          <DeleteEmployee f={r} />
        </div>
      ),
    },
  ];

  return (
    <SortableTable
      rows={rows}
      columns={columns}
      initialSort={{ key: "realizado", dir: "desc" }}
      searchFields={(r) => [r.nome, r.matricula, r.email, r.cargo, r.status]}
      searchPlaceholder="Buscar por nome, matrícula, e-mail, cargo ou status..."
      headerAction={<EmployeeEntry />}
      emptyLabel="Nenhum funcionário cadastrado"
    />
  );
}
