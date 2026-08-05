// ============================================================
// KANBAN PAGE — Enterprise Kanban para Orion
// Features: drag & drop, real-time, métricas, IA, templates
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Layout,
  TrendingUp,
  Clock,
  AlertTriangle,
  Bot,
  X,
  GripVertical,
  DollarSign,
  Calendar,
  User,
  Trash2,
  Loader2,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  listarBoards,
  obterBoard,
  criarBoard,
  criarCard,
  moverCard,
  editarCard,
  excluirCard,
  obterFunilMetricas,
  sugerirMovimentacaoIA,
} from "@/lib/kanban.functions";

// ============================================================================
// CONSTANTES
// ============================================================================

const PRIORIDADE_CONFIG = {
  baixa: { cor: "bg-slate-400", label: "Baixa", text: "text-slate-600" },
  media: { cor: "bg-blue-500", label: "Média", text: "text-blue-600" },
  alta: { cor: "bg-orange-500", label: "Alta", text: "text-orange-600" },
  urgente: { cor: "bg-red-500", label: "Urgente", text: "text-red-600" },
};

const TEMPLATES = [
  { id: "farmacia_padrao", nome: "Farmácia Padrão", desc: "5 colunas: Lead → Atendimento → Proposta → Fechado → Pós-Venda", colunas: 5 },
  { id: "farmacia_delivery", nome: "Farmácia com Delivery", desc: "7 colunas: Pedido → Confirmação → Separação → Entrega → Entregue → Pagamento → Pós", colunas: 7 },
  { id: "farmacia_hospitalar", nome: "Farmácia Hospitalar", desc: "6 colunas: Prescrição → Validação → Preparo → Retirada → Entregue → Acompanhamento", colunas: 6 },
  { id: "custom", nome: "Board Customizado", desc: "3 colunas: A Fazer → Em Progresso → Concluído", colunas: 3 },
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function KanbanPage() {
  const { usuario } = useAuth();
  const [boards, setBoards] = useState<any[]>([]);
  const [boardAtivo, setBoardAtivo] = useState<any | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [modalNovoBoard, setModalNovoBoard] = useState(false);
  const [modalNovoCard, setModalNovoCard] = useState<string | null>(null); // coluna_id
  const [cardEditando, setCardEditando] = useState<any | null>(null);
  const [metricas, setMetricas] = useState<any>(null);
  const [sugestoesIA, setSugestoesIA] = useState<any[]>([]);
  const [loadingIA, setLoadingIA] = useState(false);
  const [activeDrag, setActiveDrag] = useState<any>(null);

  const fnListar = useServerFn(listarBoards);
  const fnObter = useServerFn(obterBoard);
  const fnCriarBoard = useServerFn(criarBoard);
  const fnCriarCard = useServerFn(criarCard);
  const fnMover = useServerFn(moverCard);
  const fnEditar = useServerFn(editarCard);
  const fnExcluir = useServerFn(excluirCard);
  const fnFunil = useServerFn(obterFunilMetricas);
  const fnIA = useServerFn(sugerirMovimentacaoIA);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Carregar boards ao montar
  useEffect(() => {
    void carregarBoards();
  }, []);

  const carregarBoards = async () => {
    setLoading(true);
    try {
      const r = await fnListar();
      setBoards(r.boards || []);
      if (r.boards?.length > 0 && !boardAtivo) {
        await selecionarBoard(r.boards[0].id);
      }
    } catch (e: any) {
      toast.error("Erro ao carregar boards: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const selecionarBoard = async (boardId: string) => {
    setLoading(true);
    try {
      const r = await fnObter({ data: { board_id: boardId } });
      setBoardAtivo(r.board);
      setCards(r.cards || []);
      setVendedores(r.vendedores || {});

      // Carregar métricas
      try {
        const m = await fnFunil({ data: { board_id: boardId } });
        setMetricas(m);
      } catch {}

      // Limpar sugestões IA
      setSugestoesIA([]);
    } catch (e: any) {
      toast.error("Erro ao carregar board: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Drag & Drop handlers
  const onDragStart = (e: DragStartEvent) => {
    const card = cards.find((c) => c.id === e.active.id);
    setActiveDrag(card);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = e;
    if (!over) return;

    const cardId = active.id as string;
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    // Determinar coluna destino
    // over.id pode ser um card (sortable) ou uma coluna (droppable)
    let paraColunaId: string;

    if (over.id.toString().startsWith("coluna-")) {
      paraColunaId = over.id.toString().replace("coluna-", "");
    } else {
      // É um card — buscar a coluna dele
      const overCard = cards.find((c) => c.id === over.id);
      paraColunaId = overCard?.coluna_id || card.coluna_id;
    }

    if (card.coluna_id === paraColunaId) {
      // Mesma coluna — reordenar
      const cardsColuna = cards.filter((c) => c.coluna_id === paraColunaId).sort((a, b) => a.ordem - b.ordem);
      const oldIndex = cardsColuna.findIndex((c) => c.id === cardId);
      const newIndex = cardsColuna.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      // Reordenar localmente (optimistic)
      const novosCardsColuna = [...cardsColuna];
      const [moved] = novosCardsColuna.splice(oldIndex, 1);
      novosCardsColuna.splice(newIndex, 0, moved);
      novosCardsColuna.forEach((c, i) => (c.ordem = i));

      setCards((prev) => {
        const outros = prev.filter((c) => c.coluna_id !== paraColunaId);
        return [...outros, ...novosCardsColuna];
      });

      // Sync server
      try {
        await fnMover({ data: { card_id: cardId, para_coluna_id: paraColunaId, nova_ordem: newIndex } });
      } catch (e: any) {
        toast.error("Erro ao reordenar: " + e.message);
        void selecionarBoard(boardAtivo.id);
      }
    } else {
      // Coluna diferente — mover
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, coluna_id: paraColunaId } : c))
      );

      try {
        await fnMover({ data: { card_id: cardId, para_coluna_id: paraColunaId } });
        toast.success("Card movido!");
        // Recarregar métricas
        try {
          const m = await fnFunil({ data: { board_id: boardAtivo.id } });
          setMetricas(m);
        } catch {}
      } catch (e: any) {
        toast.error("Erro ao mover: " + e.message);
        void selecionarBoard(boardAtivo.id);
      }
    }
  };

  // Criar board
  const handleCriarBoard = async (template: string, nome: string) => {
    try {
      const r = await fnCriarBoard({ data: { template, nome } });
      toast.success("Board criado!");
      setModalNovoBoard(false);
      await carregarBoards();
      if (r.board_id) await selecionarBoard(r.board_id);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  // Criar card
  const handleCriarCard = async (cardData: any) => {
    try {
      await fnCriarCard({ data: { ...cardData, board_id: boardAtivo.id } });
      toast.success("Card criado!");
      setModalNovoCard(null);
      await selecionarBoard(boardAtivo.id);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  // Editar card
  const handleEditarCard = async (cardData: any) => {
    try {
      await fnEditar({ data: cardData });
      toast.success("Card atualizado!");
      setCardEditando(null);
      await selecionarBoard(boardAtivo.id);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  // Excluir card
  const handleExcluirCard = async (cardId: string) => {
    if (!confirm("Excluir este card?")) return;
    try {
      await fnExcluir({ data: { card_id: cardId } });
      toast.success("Card excluído!");
      setCardEditando(null);
      await selecionarBoard(boardAtivo.id);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  // IA Sugestões
  const handleSugestoesIA = async () => {
    setLoadingIA(true);
    try {
      const r = await fnIA({ data: { board_id: boardAtivo.id } });
      setSugestoesIA(r.sugestoes || []);
      if (r.erro) toast.error("IA: " + r.erro);
      else if (r.sugestoes?.length > 0) toast.success(`${r.sugestoes.length} sugestões encontradas!`);
      else toast.info("Nenhuma sugestão no momento.");
    } catch (e: any) {
      toast.error("Erro IA: " + e.message);
    } finally {
      setLoadingIA(false);
    }
  };

  if (loading && !boardAtivo) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const colunas = (boardAtivo?.colunas_config || []).sort((a: any, b: any) => a.ordem - b.ordem);

  return (
    <div className="flex h-full flex-col">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Layout className="h-6 w-6 text-blue-600" />
          <div className="relative">
            <select
              value={boardAtivo?.id || ""}
              onChange={(e) => selecionarBoard(e.target.value)}
              className="appearance-none rounded-lg border border-slate-300 bg-white px-4 py-2 pr-8 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>{b.nome}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Métricas rápidas */}
          {metricas?.resumo && (
            <div className="hidden items-center gap-4 text-xs sm:flex">
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                {metricas.resumo.total_cards} cards
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <DollarSign className="h-4 w-4 text-green-500" />
                R$ {Number(metricas.resumo.valor_pipeline).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
              </span>
              {metricas.resumo.cards_atrasados > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <Clock className="h-4 w-4" />
                  {metricas.resumo.cards_atrasados} atrasados
                </span>
              )}
              {metricas.resumo.cards_urgentes > 0 && (
                <span className="flex items-center gap-1 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  {metricas.resumo.cards_urgentes} urgentes
                </span>
              )}
            </div>
          )}

          {/* Botão IA */}
          <button
            onClick={handleSugestoesIA}
            disabled={loadingIA}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow hover:opacity-90 disabled:opacity-50"
          >
            {loadingIA ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
            Sugestões IA
          </button>

          {/* Novo Board */}
          <button
            onClick={() => setModalNovoBoard(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-blue-500"
          >
            <Plus className="h-3.5 w-3.5" /> Novo Board
          </button>
        </div>
      </div>

      {/* SUGESTÕES IA */}
      <AnimatePresence>
        {sugestoesIA.length > 0 && (
          <div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/30"
          >
            <div className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                  <Sparkles className="h-3.5 w-3.5" /> Sugestões da IA
                </span>
                <button onClick={() => setSugestoesIA([])} className="text-purple-400 hover:text-purple-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1.5">
                {sugestoesIA.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-white p-2 text-xs dark:bg-slate-900">
                    <Bot className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-purple-500" />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{s.acao || "sugestão"}:</span>{" "}
                      <span className="text-slate-600 dark:text-slate-400">{s.motivo || s.de_coluna + " → " + s.para_coluna}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* KANBAN BOARD */}
      <div className="flex-1 overflow-x-auto p-4">
        {colunas.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-400">
            Nenhuma coluna configurada. Crie um novo board.
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="flex gap-3" style={{ minWidth: "max-content" }}>
              {colunas.map((col: any) => {
                const cardsColuna = cards.filter((c) => c.coluna_id === col.id).sort((a, b) => a.ordem - b.ordem);
                return (
                  <KanbanColumn
                    key={col.id}
                    coluna={col}
                    cards={cardsColuna}
                    vendedores={vendedores}
                    onAddCard={() => setModalNovoCard(col.id)}
                    onEditCard={(c) => setCardEditando(c)}
                  />
                );
              })}
            </div>
            <DragOverlay>
              {activeDrag ? (
                <div className="w-72 rounded-lg border border-slate-300 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{activeDrag.titulo}</p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* MODAL: Novo Board */}
      <AnimatePresence>
        {modalNovoBoard && (
          <ModalNovoBoard onClose={() => setModalNovoBoard(false)} onCreate={handleCriarBoard} />
        )}
      </AnimatePresence>

      {/* MODAL: Novo Card */}
      {modalNovoCard && boardAtivo && (
        <CardModal
          colunaId={modalNovoCard}
          colunas={colunas}
          onClose={() => setModalNovoCard(null)}
          onSave={handleCriarCard}
        />
      )}

      {/* MODAL: Editar Card */}
      {cardEditando && boardAtivo && (
        <CardModal
          card={cardEditando}
          colunaId={cardEditando.coluna_id}
          colunas={colunas}
          onClose={() => setCardEditando(null)}
          onSave={handleEditarCard}
          onDelete={() => handleExcluirCard(cardEditando.id)}
        />
      )}
    </div>
  );
}

// ============================================================================
// KANBAN COLUMN
// ============================================================================

function KanbanColumn({ coluna, cards, vendedores, onAddCard, onEditCard }: {
  coluna: any;
  cards: any[];
  vendedores: Record<string, string>;
  onAddCard: () => void;
  onEditCard: (card: any) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `coluna-${coluna.id}` });
  const wipExcedido = coluna.wip_limit && cards.length > coluna.wip_limit;
  const valorTotal = cards.reduce((s, c) => s + Number(c.valor || 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 flex-shrink-0 flex-col rounded-xl border bg-slate-50 dark:bg-slate-900 ${
        isOver ? "border-blue-400 ring-2 ring-blue-200" : "border-slate-200 dark:border-slate-800"
      }`}
      style={{ minHeight: "200px" }}
    >
      {/* Header da coluna */}
      <div className="flex items-center justify-between p-3" style={{ borderTopLeftRadius: "0.75rem", borderTopRightRadius: "0.75rem", backgroundColor: coluna.cor + "20" }}>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: coluna.cor }} />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{coluna.nome}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${wipExcedido ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
            {cards.length}
            {coluna.wip_limit ? `/${coluna.wip_limit}` : ""}
          </span>
        </div>
        <button onClick={onAddCard} className="text-slate-400 hover:text-blue-600">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Valor total da coluna */}
      {valorTotal > 0 && (
        <div className="px-3 pb-1 text-[10px] font-medium text-slate-500">
          R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
        </div>
      )}

      {/* Cards */}
      <div className="flex-1 space-y-2 p-2">
        <SortableColumn id={coluna.id}>
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              vendedorNome={vendedores[card.vendedor_id]}
              onClick={() => onEditCard(card)}
            />
          ))}
        </SortableColumn>
      </div>
    </div>
  );
}

// Sortable wrapper para coluna
function SortableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {children}
    </div>
  );
}

// ============================================================================
// SORTABLE CARD
// ============================================================================

function SortableCard({ card, vendedorNome, onClick }: {
  card: any;
  vendedorNome?: string;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const prio = PRIORIDADE_CONFIG[card.prioridade as keyof typeof PRIORIDADE_CONFIG] || PRIORIDADE_CONFIG.media;
  const atrasado = card.data_prazo && new Date(card.data_prazo) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Só abre edição se não estava arrastando
        if (!isDragging) onClick();
      }}
      className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
    >
      {/* Header do card */}
      <div className="mb-1.5 flex items-start justify-between gap-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">{card.titulo}</p>
        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${prio.cor}`} title={prio.label} />
      </div>

      {/* Descrição */}
      {card.descricao && (
        <p className="mb-1.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{card.descricao}</p>
      )}

      {/* Etiquetas */}
      {card.etiquetas?.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {card.etiquetas.slice(0, 3).map((tag: string, i: number) => (
            <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-2">
          {card.valor > 0 && (
            <span className="font-semibold text-green-600 dark:text-green-400">
              R$ {Number(card.valor).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
            </span>
          )}
          {card.data_prazo && (
            <span className={`flex items-center gap-0.5 ${atrasado ? "text-red-500 font-semibold" : ""}`}>
              <Calendar className="h-3 w-3" />
              {new Date(card.data_prazo).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
            </span>
          )}
        </div>
        {vendedorNome && (
          <span className="flex items-center gap-0.5 truncate max-w-[80px]">
            <User className="h-3 w-3" />
            {vendedorNome.split(" ")[0]}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODAL: NOVO BOARD
// ============================================================================

function ModalNovoBoard({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (template: string, nome: string) => void;
}) {
  const [template, setTemplate] = useState("farmacia_padrao");
  const [nome, setNome] = useState("");

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", zIndex: 10000 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Novo Board Kanban</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Nome do Board</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Vendas Filial 7537"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Template</label>
            <div className="space-y-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTemplate(t.id); if (!nome) setNome(t.nome); }}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                    template === t.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                  }`}
                >
                  <Layout className="h-5 w-5 flex-shrink-0 text-blue-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t.nome}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onCreate(template, nome || TEMPLATES.find((t) => t.id === template)?.nome || "Novo Board")}
            disabled={!nome}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            Criar Board
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL: CARD (criar/editar)
// ============================================================================

function CardModal({ card, colunaId, colunas, onClose, onSave, onDelete }: {
  card?: any;
  colunaId: string;
  colunas: any[];
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState({
    card_id: card?.id || "",
    titulo: card?.titulo || "",
    descricao: card?.descricao || "",
    coluna_id: card?.coluna_id || colunaId,
    prioridade: card?.prioridade || "media",
    valor: card?.valor || 0,
    data_prazo: card?.data_prazo || "",
    vendedor_id: card?.vendedor_id || "",
    etiquetas: (card?.etiquetas || []).join(", "),
  });

  const isEdit = !!card;

  const handleSave = () => {
    if (!form.titulo.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    const data: any = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || undefined,
      prioridade: form.prioridade,
      valor: Number(form.valor) || 0,
      etiquetas: form.etiquetas ? form.etiquetas.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
    };

    if (form.data_prazo) data.data_prazo = form.data_prazo;
    if (form.vendedor_id) data.vendedor_id = form.vendedor_id;

    if (isEdit) {
      data.card_id = form.card_id;
    } else {
      data.coluna_id = form.coluna_id;
    }

    onSave(data);
  };

  return (
    <div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {isEdit ? "Editar Card" : "Novo Card"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Título *</label>
            <input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex: Venda de vitamina C para cliente VIP"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              rows={2}
              placeholder="Detalhes do atendimento..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Prioridade</label>
              <select
                value={form.prioridade}
                onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Valor (R$)</label>
              <input
                type="number"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Prazo</label>
              <input
                type="date"
                value={form.data_prazo}
                onChange={(e) => setForm({ ...form, data_prazo: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            {!isEdit && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Coluna</label>
                <select
                  value={form.coluna_id}
                  onChange={(e) => setForm({ ...form, coluna_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {colunas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Etiquetas (separadas por vírgula)</label>
            <input
              value={form.etiquetas}
              onChange={(e) => setForm({ ...form, etiquetas: e.target.value })}
              placeholder="vip, recorrente, novo"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
            >
              {isEdit ? "Salvar" : "Criar Card"}
            </button>
            {isEdit && onDelete && (
              <button
                onClick={onDelete}
                className="rounded-lg border border-red-300 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
