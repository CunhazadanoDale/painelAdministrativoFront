import { paraCentavos } from '../../lib/formatar';

export { hojeEmBrasilia, dataParaCampo } from '../pedidos/pedidosUtils';
export { mesAtualEmBrasilia } from '../comissoes/comissoesUtils';
export { nomeDoFornecedor } from '../importacoes/importacoesUtils';
export { nomeDaConta } from '../caixa/caixaUtils';

export const CREDOR_TIPOS = [
  { valor: 'banco', rotulo: 'Banco' },
  { valor: 'investidor', rotulo: 'Investidor' },
  { valor: 'fisco', rotulo: 'Fisco' },
  { valor: 'fornecedor', rotulo: 'Fornecedor' },
];

export const STATUS_DIVIDA = [
  { valor: 'ativa', rotulo: 'Ativa', cor: 'info' },
  { valor: 'renegociada', rotulo: 'Renegociada', cor: 'warning' },
  { valor: 'cancelada', rotulo: 'Cancelada', cor: 'danger' },
];

const QUITADA = { valor: 'quitada', rotulo: 'Quitada', cor: 'success' };

export const SITUACOES_PARCELA = [
  { valor: 'a_vencer', rotulo: 'A vencer', cor: 'info' },
  { valor: 'vencida', rotulo: 'Vencida', cor: 'danger' },
  { valor: 'paga', rotulo: 'Paga', cor: 'success' },
  { valor: 'conta_cancelada', rotulo: 'Conta cancelada', cor: 'warning' },
  { valor: 'cancelada', rotulo: 'Cancelada', cor: 'neutral' },
];

export const INDEXADORES = [
  { valor: 'prefixado', rotulo: 'Prefixado' },
  { valor: 'cdi', rotulo: 'CDI' },
  { valor: 'selic', rotulo: 'Selic' },
  { valor: 'ipca', rotulo: 'IPCA' },
  { valor: 'tr', rotulo: 'TR' },
  { valor: 'outro', rotulo: 'Outro' },
];

export const PERIODOS_TAXA = [
  { valor: 'mensal', rotulo: 'Mensal', sufixo: 'a.m.' },
  { valor: 'anual', rotulo: 'Anual', sufixo: 'a.a.' },
];

export const LIMITES = {
  descricao: 120,
  contrato: 60,
  motivo: 1000,
  observacoes: 2000,
  parcelas: 600,
};

export const VALOR_MAXIMO = 1000000000000000;
const TAXA_BP_MAXIMA = 100000;

const ACOES_HISTORICO = {
  criada: 'Dívida criada',
  alterada: 'Dívida alterada',
  parcela_alterada: 'Parcela alterada',
  contas_geradas: 'Contas a pagar geradas',
  parcela_reaberta: 'Parcela reaberta',
  renegociada: 'Renegociada',
  cancelada: 'Cancelada',
};

function procurar(lista, valor) {
  return lista.find((item) => item.valor === valor) ?? { valor, rotulo: valor, cor: 'neutral' };
}

export function rotuloCredorTipo(tipo) {
  return procurar(CREDOR_TIPOS, tipo).rotulo;
}

export function statusDaDivida(divida) {
  if (divida?.status === 'ativa' && divida.quitada) return QUITADA;
  return procurar(STATUS_DIVIDA, divida?.status);
}

export function situacaoDaParcela(situacao) {
  return procurar(SITUACOES_PARCELA, situacao);
}

export function rotuloAcaoHistorico(acao) {
  return ACOES_HISTORICO[acao] ?? acao;
}

const formatoTaxa = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function paraTaxaBp(texto) {
  const limpo = String(texto ?? '').trim().replace(',', '.');
  if (!limpo) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return NaN;
  const pontosBase = Math.round(Number(limpo) * 100);
  return pontosBase <= TAXA_BP_MAXIMA ? pontosBase : NaN;
}

export function taxaParaTexto(pontosBase) {
  if (pontosBase === null || pontosBase === undefined) return '';
  return formatoTaxa.format(pontosBase / 100);
}

export function erroDaTaxa(texto, periodo) {
  const taxa = paraTaxaBp(texto);
  if (Number.isNaN(taxa)) return 'Taxa inválida: de 0 a 1000%, com até duas casas.';
  if (taxa !== null && !periodo) return 'Escolha se a taxa é mensal ou anual.';
  if (taxa === null && periodo) return 'Informe a taxa ou deixe o período em branco.';
  return null;
}

export function formatarTaxa({ taxa_bp, taxa_periodo, indexador }) {
  const prefixado = !indexador || indexador === 'prefixado';
  const rotuloIndexador = procurar(INDEXADORES, indexador).rotulo;
  if (taxa_bp === null || taxa_bp === undefined) return prefixado ? '—' : rotuloIndexador;
  const sufixo = PERIODOS_TAXA.find((periodo) => periodo.valor === taxa_periodo)?.sufixo ?? '';
  const taxa = `${formatoTaxa.format(taxa_bp / 100)}%${sufixo ? ` ${sufixo}` : ''}`;
  return prefixado ? taxa : `${rotuloIndexador} + ${taxa}`;
}

function vencimentoDoMes(primeiro, deslocamento) {
  const [ano, mes, dia] = primeiro.split('-').map(Number);
  const indice = mes - 1 + deslocamento;
  const anoAlvo = ano + Math.floor(indice / 12);
  const mesAlvo = (indice % 12) + 1;
  const ultimoDia = new Date(Date.UTC(anoAlvo, mesAlvo, 0)).getUTCDate();
  const diaAlvo = Math.min(dia, ultimoDia);
  return `${anoAlvo}-${String(mesAlvo).padStart(2, '0')}-${String(diaAlvo).padStart(2, '0')}`;
}

export function preencherParcelas({ quantidade, primeiroVencimento, saldoCentavos }) {
  const parte = Math.floor(saldoCentavos / quantidade);
  return Array.from({ length: quantidade }, (_, indice) => ({
    vencimento: vencimentoDoMes(primeiroVencimento, indice),
    amortizacao_centavos: indice === quantidade - 1 ? saldoCentavos - parte * (quantidade - 1) : parte,
  }));
}

export function somarAmortizacoes(textos) {
  return textos.reduce((soma, texto) => {
    const valor = paraCentavos(texto);
    return Number.isFinite(valor) ? soma + valor : soma;
  }, 0);
}
