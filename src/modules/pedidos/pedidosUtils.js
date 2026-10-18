import { formatarPercentual } from '../clientes/clientesUtils';

export const STATUS_PEDIDO = [
  { valor: 'proposta', rotulo: 'Proposta', cor: 'neutral' },
  { valor: 'confirmado', rotulo: 'Confirmado', cor: 'info' },
  { valor: 'parcialmente_entregue', rotulo: 'Parcialmente entregue', cor: 'warning' },
  { valor: 'entregue', rotulo: 'Entregue', cor: 'success' },
  { valor: 'cancelado', rotulo: 'Cancelado', cor: 'danger' },
];

export const MODELOS = [
  { valor: 'pronta_entrega', rotulo: 'Pronta entrega' },
  { valor: 'importacao', rotulo: 'Importação' },
];

export const LIMITES = { numero_pedido_cliente: 60, observacoes: 2000 };

export function statusDoPedido(status) {
  return STATUS_PEDIDO.find((item) => item.valor === status) ?? { valor: status, rotulo: status, cor: 'neutral' };
}

export function rotuloModelo(modelo) {
  return MODELOS.find((item) => item.valor === modelo)?.rotulo ?? modelo;
}

export function descricaoDoModelo(modelo) {
  return modelo === 'importacao'
    ? 'Entrada de 30% e entrega em até 120 dias contados da entrada paga.'
    : 'Boleto em 30 dias; prazo de entrega opcional.';
}

export function descricaoDaCondicao(condicao) {
  if (!condicao) return '—';
  const partes = [];
  if (condicao.entrada_bp) partes.push(`entrada de ${formatarPercentual(condicao.entrada_bp)}`);
  if (condicao.prazo_boleto_dias) partes.push(`boleto em ${condicao.prazo_boleto_dias} dias`);
  if (condicao.prazo_entrega_dias) partes.push(`entrega em até ${condicao.prazo_entrega_dias} dias da entrada`);
  const texto = partes.join(', ');
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : '—';
}

export function dataParaCampo(iso) {
  return iso ? String(iso).slice(0, 10) : '';
}
