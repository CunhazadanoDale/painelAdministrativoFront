import { paraCentavos } from '../../lib/formatar';

export { MOEDAS } from '../fornecedores/fornecedoresUtils';
export { hojeEmBrasilia, dataParaCampo } from '../pedidos/pedidosUtils';

export const STATUS_IMPORTACAO = [
  { valor: 'aberta', rotulo: 'Aberta', cor: 'neutral' },
  { valor: 'embarcada', rotulo: 'Embarcada', cor: 'info' },
  { valor: 'desembaracada', rotulo: 'Desembaraçada', cor: 'warning' },
  { valor: 'recebida', rotulo: 'Recebida', cor: 'success' },
  { valor: 'cancelada', rotulo: 'Cancelada', cor: 'danger' },
];

export const STATUS_PARCELA = [
  { valor: 'aberta', rotulo: 'Aberta', cor: 'neutral' },
  { valor: 'cambio_fechado', rotulo: 'Câmbio fechado', cor: 'success' },
  { valor: 'cancelada', rotulo: 'Cancelada', cor: 'danger' },
];

export const TIPOS_CUSTO = [
  { valor: 'frete_internacional', rotulo: 'Frete internacional' },
  { valor: 'seguro', rotulo: 'Seguro' },
  { valor: 'imposto_importacao', rotulo: 'Imposto de importação' },
  { valor: 'ipi', rotulo: 'IPI' },
  { valor: 'pis', rotulo: 'PIS' },
  { valor: 'cofins', rotulo: 'COFINS' },
  { valor: 'icms', rotulo: 'ICMS' },
  { valor: 'taxa_siscomex', rotulo: 'Taxa Siscomex' },
  { valor: 'despachante', rotulo: 'Despachante aduaneiro' },
  { valor: 'armazenagem', rotulo: 'Armazenagem' },
  { valor: 'frete_nacional', rotulo: 'Frete nacional' },
  { valor: 'outros', rotulo: 'Outros' },
];

export const LIMITES = {
  referencia: 60,
  observacoes: 2000,
  documento_embarque: 60,
  declaracao: 30,
  motivo: 1000,
  descricao_parcela: 120,
  descricao_custo: 255,
};

export const VALOR_MAXIMO = 1000000000000000;
export const CAMBIO_BRL = 1000000;
const CAMBIO_MAXIMO = 1000000000;
const CASAS_CAMBIO = 6;

const ACOES_HISTORICO = {
  criada: 'Importação criada',
  alterada: 'Importação alterada',
  embarcada: 'Embarcada',
  desembaracada: 'Desembaraçada',
  recebida: 'Recebida',
  cancelada: 'Cancelada',
  parcela_incluida: 'Parcela incluída',
  parcela_alterada: 'Parcela alterada',
  parcela_removida: 'Parcela removida',
  parcela_cambio_fechado: 'Câmbio da parcela fechado',
  parcela_reaberta: 'Parcela reaberta',
  custo_lancado: 'Custo lançado',
  custo_cancelado: 'Custo cancelado',
  alocacao_alterada: 'Alocação de pedidos alterada',
};

function procurar(lista, valor) {
  return lista.find((item) => item.valor === valor) ?? { valor, rotulo: valor, cor: 'neutral' };
}

export function statusDaImportacao(status) {
  return procurar(STATUS_IMPORTACAO, status);
}

export function statusDaParcela(status) {
  return procurar(STATUS_PARCELA, status);
}

export function rotuloTipoCusto(tipo) {
  return procurar(TIPOS_CUSTO, tipo).rotulo;
}

export function rotuloAcaoHistorico(acao) {
  return ACOES_HISTORICO[acao] ?? acao;
}

export function nomeDoFornecedor(fornecedor) {
  return fornecedor?.nome_fantasia || fornecedor?.nome;
}

export function paraCentesimos(texto) {
  return paraCentavos(texto);
}

export function formatarValorMoeda(centesimos, moeda) {
  const valor = Number(centesimos);
  if (centesimos === null || centesimos === undefined || !Number.isFinite(valor)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda || 'BRL' }).format(valor / 100);
}

export function paraCambioMicro(texto) {
  let limpo = String(texto ?? '').replace(/\s/g, '');
  if (limpo.includes(',')) limpo = limpo.replace(/\./g, '').replace(',', '.');
  const partes = /^(\d+)(?:\.(\d{1,6}))?$/.exec(limpo);
  if (!partes) return NaN;
  const inteiro = Number(partes[1]);
  const fracao = Number((partes[2] ?? '').padEnd(CASAS_CAMBIO, '0'));
  return inteiro * 10 ** CASAS_CAMBIO + fracao;
}

export function formatarCambio(micro) {
  if (micro === null || micro === undefined || !Number.isFinite(Number(micro))) return '—';
  const texto = String(micro).padStart(CASAS_CAMBIO + 1, '0');
  return `${texto.slice(0, -CASAS_CAMBIO)},${texto.slice(-CASAS_CAMBIO)}`;
}

export function cambioParaTexto(micro) {
  if (micro === null || micro === undefined) return '';
  const [inteiro, fracao] = formatarCambio(micro).split(',');
  const cortada = fracao.replace(/0+$/, '');
  return `${inteiro},${cortada.length >= 2 ? cortada : cortada.padEnd(2, '0')}`;
}

export function erroDoCambio(texto, moeda) {
  if (!String(texto ?? '').trim()) return 'Informe o câmbio.';
  const micro = paraCambioMicro(texto);
  if (!Number.isFinite(micro)) return 'Câmbio inválido: use números com vírgula e até seis casas.';
  if (moeda === 'BRL') return micro === CAMBIO_BRL ? null : 'Importação em real usa câmbio 1.';
  if (micro < 1) return 'O câmbio tem de ser maior que zero.';
  if (micro > CAMBIO_MAXIMO) return 'O câmbio vai até 1000.';
  return null;
}

export function valorEmReais(centesimos, cambioMicro) {
  if (centesimos === null || centesimos === undefined || cambioMicro === null || cambioMicro === undefined) return null;
  const produto = BigInt(centesimos) * BigInt(cambioMicro);
  return Number((produto + BigInt(CAMBIO_BRL / 2)) / BigInt(CAMBIO_BRL));
}
