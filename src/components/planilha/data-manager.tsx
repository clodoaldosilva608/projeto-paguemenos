import type { ReactNode } from "react";
export type VendedorLite = { id: number; nome: string };
export type MetaAtual = { categoria: string; vendedorId: number; valor: number };

export function SaleForm({ open, onClose }: { open: boolean; onClose: () => void; vendedores: VendedorLite[]; defaultDate: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-2 text-lg font-bold text-slate-800 dark:text-white">Nova Venda</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Use a aba "Vendas Diárias" da dashboard principal.</p>
        <button onClick={onClose} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Fechar</button>
      </div>
    </div>
  );
}

export function EmployeeForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-2 text-lg font-bold text-slate-800 dark:text-white">Novo Funcionário</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Use a aba "Funcionários" da dashboard principal.</p>
        <button onClick={onClose} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Fechar</button>
      </div>
    </div>
  );
}

export function GoalsManager(_props?: any) { return null; }
export function SalesEntry(_props?: any) { return null; }
export function EmployeeEntry(_props?: any) { return null; }

// Stubs que aceitam qualquer props (venda, vendedores) sem quebrar
export function EditSaleButton(_props?: any) {
  return <button className="rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300">✏️</button>;
}
export function DeleteSaleButton(_props?: any) {
  return <button className="rounded-md border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400">🗑️</button>;
}
