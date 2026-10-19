import { formatarMoeda } from '../../lib/formatar';

export const STATUS_TITULO = [
  { valor: 'carteira', rotulo: 'Em carteira', cor: 'neutral' },
  { valor: 'em_banco', rotulo: 'Em banco', cor: 'info' },
  { valor: 'antecipado', rotulo: 'Antecipado', cor: 'warning' },
  { valor: 'recebido', rotulo: 'Recebido', cor: 'success' },
  { valor: 'cancelado', rotulo: 'Cancelado', cor: 'danger' },
];

export const ORIGENS_TITULO = [
  { valor: 'manual', rotulo: 'Manual' },
  { valor: 'pedido', rotulo: 'Entrada de pedido' },
  { valor: 'nota_fiscal_duplicata', rotulo: 'Duplicata de NF' },
];

export const CANAIS_BOLETO = [
  { valor: 'email', rotulo: 'E-mail' },
  { valor: 'whatsapp', rotulo: 'WhatsApp' },
  { valor: 'portal', rotulo: 'Portal' },
  { valor: 'correio', rotulo: 'Correio' },
  { valor: 'outro', rotulo: 'Outro' },
];

const ROTULOS_EVENTO = {
  criado: 'Título criado',
  gerado: 'Título gerado',
  editado: 'Editado',
  prorrogado: 'Vencimento prorrogado',
  enviado_banco: 'Enviado ao banco',
  retirado_banco: 'Retirado do banco',
  boleto_enviado: 'Boleto enviado',
  antecipado: 'Antecipado',
  antecipacao_estornada: 'Antecipação estornada',
  recomprado: 'Recomprado',
  recebido: 'Recebimento',
  recebimento_estornado: 'Recebimento estornado',
  cancelado: 'Cancelado',
  origem_cancelada: 'Origem cancelada',
};

export function statusDoTitulo(status) {
  return STATUS_TITULO.find((item) => item.valor === status) ?? { valor: status, rotulo: status, cor: 'neutral' };
}

export function rotuloOrigemTitulo(origem) {
  return ORIGENS_TITULO.find((item) => item.valor === origem)?.rotulo ?? origem;
}

export function rotuloCanal(canal) {
  return CANAIS_BOLETO.find((item) => item.valor === canal)?.rotulo ?? canal;
}

export function rotuloEventoTitulo(evento) {
  return ROTULOS_EVENTO[evento] ?? evento;
}

export function numeroDoTitulo(titulo) {
  return titulo.parcela > 1 || titulo.origem === 'nota_fiscal_duplicata'
    ? `${titulo.numero}/${titulo.parcela}`
    : titulo.numero;
}

export function textoDoSaldo(titulo) {
  return titulo.saldo_centavos === titulo.valor_centavos
    ? formatarMoeda(titulo.valor_centavos)
    : `${formatarMoeda(titulo.saldo_centavos)} de ${formatarMoeda(titulo.valor_centavos)}`;
}
