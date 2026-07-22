// =============================================================
// ORION · DADOS DE VENDAS DIÁRIAS POR VENDEDOR (Jul/2026)
// =============================================================

export interface VendaDiaria {
  data: string;       // YYYY-MM-DD
  vendedorId: string;
  vendedorCodigo: string;
  vendedorNome: string;
  matricula: string;
  valorVendaLiquida: number;
  qtdeClienteVendaLiquida: number;
  tkmVenda: number;
  valorVendaRecepto: number;
  qtdeClienteRecepto: number;
  tkmRecepto: number;
  valorVendaTotal: number;
  qtdeClienteTotal: number;
  tkmTotal: number;
}



const VENDEDORES = [
  { id: "u-elielton",  codigo: "00070214301", nome: "ELIELTON SILVA",       matricula: "070214301", base: 5200, clientes: 48 },
  { id: "u-adelino",   codigo: "00070214302", nome: "ADELINO SANTOS",       matricula: "070214302", base: 4800, clientes: 50 },
  { id: "u-mieko",     codigo: "00070214303", nome: "MIEKO TANAKA",         matricula: "070214303", base: 4300, clientes: 39 },
  { id: "u-fabio",     codigo: "00070214304", nome: "FÁBIO OLIVEIRA",       matricula: "070214304", base: 5900, clientes: 63 },
  { id: "u-alicia",    codigo: "00070214305", nome: "ALÍCIA FERREIRA",      matricula: "070214305", base: 4500, clientes: 49 },
  { id: "u-clodoaldo", codigo: "00070214306", nome: "CLODOALDO CONCEIÇÃO",  matricula: "070214306", base: 1600, clientes: 32 },
];

// Gera de 01/07 a 16/07/2026
const DATAS: string[] = [];
for (let d = 1; d <= 16; d++) {
  DATAS.push(`2026-07-${String(d).padStart(2, "0")}`);
}

// Geração determinística usando seed simples
let seedCounter = 42;
function seededRandom() {
  seedCounter = (seedCounter * 16807 + 0) % 2147483647;
  return seedCounter / 2147483647;
}

function gerarDiaDeterministico(
  data: string,
  v: typeof VENDEDORES[0]
): VendaDiaria {
  const f1 = seededRandom();
  const f2 = seededRandom();
  const f3 = seededRandom();
  const f4 = seededRandom();
  const valorVendaLiquida = Number((v.base * (0.6 + f1 * 0.8)).toFixed(2));
  const qtdeClienteVendaLiquida = Math.max(10, Math.round(v.clientes * (0.5 + f2)));
  const tkmVenda = Number((valorVendaLiquida / qtdeClienteVendaLiquida).toFixed(2));
  const valorVendaRecepto = Number((f3 * v.base * 0.18).toFixed(2));
  const qtdeClienteRecepto = Math.round(f4 * 4);
  const tkmRecepto = qtdeClienteRecepto > 0 ? Number((valorVendaRecepto / qtdeClienteRecepto).toFixed(2)) : 0;
  const valorVendaTotal = Number((valorVendaLiquida + valorVendaRecepto).toFixed(2));
  const qtdeClienteTotal = qtdeClienteVendaLiquida + qtdeClienteRecepto;
  const tkmTotal = qtdeClienteTotal > 0 ? Number((valorVendaTotal / qtdeClienteTotal).toFixed(2)) : 0;

  return {
    data,
    vendedorId: v.id,
    vendedorCodigo: v.codigo,
    vendedorNome: v.nome,
    matricula: v.matricula,
    valorVendaLiquida,
    qtdeClienteVendaLiquida,
    tkmVenda,
    valorVendaRecepto,
    qtdeClienteRecepto,
    tkmRecepto,
    valorVendaTotal,
    qtdeClienteTotal,
    tkmTotal,
  };
}

export const vendasDiarias: VendaDiaria[] = [];
for (const data of DATAS) {
  for (const v of VENDEDORES) {
    vendasDiarias.push(gerarDiaDeterministico(data, v));
  }
}
// Ordena por data desc
vendasDiarias.sort((a, b) => b.data.localeCompare(a.data));

export const listaVendedores = VENDEDORES.map((v) => ({
  id: v.id,
  codigo: v.codigo,
  nome: v.nome,
  matricula: v.matricula,
}));
