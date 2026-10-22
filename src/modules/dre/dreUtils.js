import { rotuloDaLinha } from '../financeiro/planoContasUtils';

export { hojeEmBrasilia } from '../pedidos/pedidosUtils';
export { mesAtualEmBrasilia } from '../comissoes/comissoesUtils';

export const ESTRUTURA_DRE = [
  { tipo: 'linha', chave: 'receita_bruta', rotulo: 'Receita bruta' },
  { tipo: 'linha', chave: 'outras_receitas', rotulo: 'Outras receitas' },
  { tipo: 'linha', chave: 'deducoes', rotulo: 'Deduções' },
  { tipo: 'subtotal', chave: 'receita_liquida_centavos', rotulo: 'Receita líquida' },
  { tipo: 'linha', chave: 'cmv', rotulo: 'CMV' },
  { tipo: 'linha', chave: 'perdas_estoque', rotulo: 'Perdas de estoque' },
  { tipo: 'subtotal', chave: 'lucro_bruto_centavos', rotulo: 'Lucro bruto' },
  { tipo: 'linha', chave: 'despesas_variaveis', rotulo: 'Despesas variáveis' },
  { tipo: 'subtotal', chave: 'margem_contribuicao_centavos', rotulo: 'Margem de contribuição' },
  { tipo: 'linha', chave: 'despesas_fixas', rotulo: 'Despesas fixas' },
  { tipo: 'linha', chave: 'nao_classificado', rotulo: 'Não classificado' },
  { tipo: 'subtotal', chave: 'resultado_operacional_centavos', rotulo: 'Resultado operacional' },
  { tipo: 'linha', chave: 'resultado_financeiro', rotulo: 'Resultado financeiro' },
  { tipo: 'subtotal', chave: 'resultado_centavos', rotulo: 'Resultado' },
  { tipo: 'linha', chave: 'fora_dre', rotulo: 'Fora da DRE' },
];

export const MAXIMO_MESES_DRE = 24;
export const MAXIMO_MESES_FATURAMENTO = 60;

const NOMES_MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function indiceDoMes(competencia) {
  const [ano, mes] = competencia.split('-').map(Number);
  return ano * 12 + mes - 1;
}

function competenciaDoIndice(indice) {
  return `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, '0')}`;
}

export function mesesAntes(competencia, quantidade) {
  return competenciaDoIndice(indiceDoMes(competencia) - quantidade);
}

export function mesesNoPeriodo(de, ate) {
  return Math.max(0, indiceDoMes(ate) - indiceDoMes(de) + 1);
}

export function formatarMes(competencia) {
  const [ano, mes] = competencia.split('-');
  return `${NOMES_MESES[Number(mes) - 1]}/${ano}`;
}

export function somarDias(data, dias) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

const formatoPercentual = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatarPontosBase(pontosBase) {
  if (pontosBase === null || pontosBase === undefined) return '—';
  return `${formatoPercentual.format(pontosBase / 100)}%`;
}

function linhaDe(demonstrativo, chave) {
  return demonstrativo?.linhas?.find((linha) => linha.linha === chave);
}

export function valorDaLinha(demonstrativo, item) {
  if (item.tipo === 'subtotal') return demonstrativo?.subtotais?.[item.chave] ?? 0;
  return linhaDe(demonstrativo, item.chave)?.valor_centavos ?? 0;
}

export function idDoItem(item) {
  return item.chave === 'categoria' ? item.categoria_id : item.chave;
}

export function itensDasLinhas(demonstrativos, chave) {
  const vistos = new Map();
  demonstrativos.forEach((demonstrativo) => {
    (linhaDe(demonstrativo, chave)?.itens ?? []).forEach((item) => {
      const id = idDoItem(item);
      if (!vistos.has(id)) vistos.set(id, { id, nome: item.nome });
    });
  });
  return [...vistos.values()];
}

export function valorDoItem(demonstrativo, chave, id) {
  return linhaDe(demonstrativo, chave)?.itens?.find((item) => idDoItem(item) === id)?.valor_centavos ?? 0;
}

export function rotuloLinhaPagamento(linha) {
  return linha ? rotuloDaLinha(linha) : 'Sem categoria';
}
