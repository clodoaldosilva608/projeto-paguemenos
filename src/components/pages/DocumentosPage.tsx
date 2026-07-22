import { useState, useEffect } from "react";
import { FileText, Plus, Trash2, Search, Download, Edit, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

interface Documento {
  id: string;
  titulo: string;
  conteudo: string;
  criado_em: string;
}

const STORAGE_KEY = "orion-documentos";

export function DocumentosPage() {
  const { usuario } = useAuth();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Documento | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const all = JSON.parse(raw);
      // Cada usuário vê apenas seus documentos
      setDocumentos(all.filter((d: any) => d.usuario_id === usuario?.id));
    }
  }, [usuario]);

  const salvar = (novos: Documento[]) => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : [];
    const outros = all.filter((d: any) => d.usuario_id !== usuario?.id);
    const meus = novos.map(d => ({ ...d, usuario_id: usuario?.id }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...outros, ...meus]));
    setDocumentos(novos);
  };

  const criar = (titulo: string, conteudo: string) => {
    const novo: Documento = { id: `doc-${Date.now()}`, titulo, conteudo, criado_em: new Date().toISOString() };
    salvar([novo, ...documentos]);
    setShowForm(false);
    toast.success("Documento criado!");
  };

  const atualizar = (id: string, titulo: string, conteudo: string) => {
    salvar(documentos.map(d => d.id === id ? { ...d, titulo, conteudo } : d));
    setEditando(null);
    toast.success("Documento atualizado!");
  };

  const remover = (id: string) => {
    if (!confirm("Excluir documento?")) return;
    salvar(documentos.filter(d => d.id !== id));
    toast.success("Excluído");
  };

  const exportar = (doc: Documento) => {
    const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${doc.titulo}</title></head><body>${doc.conteudo}</body></html>`], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${doc.titulo}.html`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportado!");
  };

  const filtrados = busca ? documentos.filter(d => d.titulo.toLowerCase().includes(busca.toLowerCase())) : documentos;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Meus Documentos</h2>
          <p className="text-sm text-slate-500">Crie e gerencie seus documentos</p>
        </div>
        <button onClick={() => { setEditando(null); setShowForm(true); }} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Novo</button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" />
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">Nenhum documento</p>
          <p className="mt-1 text-sm text-slate-500">Clique em "Novo" para criar.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map(doc => (
            <div key={doc.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <FileText className="h-5 w-5 text-blue-500" />
                <div className="flex gap-1">
                  <button onClick={() => { setEditando(doc); setShowForm(true); }} className="rounded p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Edit className="h-3.5 w-3.5" /></button>
                  <button onClick={() => exportar(doc)} className="rounded p-1 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"><Download className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remover(doc.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <h4 className="mt-2 truncate font-semibold text-slate-800">{doc.titulo}</h4>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{doc.conteudo.replace(/<[^>]+>/g, " ").substring(0, 80)}</p>
              <p className="mt-2 text-[10px] text-slate-400">{new Date(doc.criado_em).toLocaleDateString("pt-BR")}</p>
            </div>
          ))}
        </div>
      )}

      {showForm && <DocForm doc={editando} onClose={() => setShowForm(false)} onSalvar={(t, c) => editando ? atualizar(editando.id, t, c) : criar(t, c)} />}
    </motion.div>
  );
}

function DocForm({ doc, onClose, onSalvar }: { doc: Documento | null; onClose: () => void; onSalvar: (t: string, c: string) => void }) {
  const [titulo, setTitulo] = useState(doc?.titulo || "");
  const [conteudo, setConteudo] = useState(doc?.conteudo || "<p>Escreva aqui...</p>");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">{doc ? "Editar" : "Novo"} documento</h3><button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button></div>
        <div className="space-y-3">
          <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <div className="flex gap-1 border-b border-slate-200 pb-2">
            <button onClick={() => document.execCommand("bold")} className="rounded px-2 py-1 text-xs font-bold hover:bg-slate-100">B</button>
            <button onClick={() => document.execCommand("italic")} className="rounded px-2 py-1 text-xs italic hover:bg-slate-100">I</button>
            <button onClick={() => document.execCommand("underline")} className="rounded px-2 py-1 text-xs underline hover:bg-slate-100">U</button>
            <button onClick={() => document.execCommand("insertUnorderedList")} className="rounded px-2 py-1 text-xs hover:bg-slate-100">• Lista</button>
          </div>
          <div contentEditable suppressContentEditableWarning onBlur={e => setConteudo(e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: conteudo }} className="min-h-[200px] rounded-lg border border-slate-200 p-3 text-sm outline-none" />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancelar</button>
          <button onClick={() => { if (titulo.trim()) onSalvar(titulo, conteudo); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{doc ? "Salvar" : "Criar"}</button>
        </div>
      </div>
    </div>
  );
}
