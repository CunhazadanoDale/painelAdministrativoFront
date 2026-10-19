import { STATUS_ENTREGA } from '../pedidos/pedidosUtils';

export const NATUREZAS = [
  { valor: 'venda', rotulo: 'Venda' },
  { valor: 'remessa', rotulo: 'Remessa' },
  { valor: 'transferencia', rotulo: 'Transferência' },
  { valor: 'devolucao', rotulo: 'Devolução' },
];

export const STATUS_NOTA = [
  { valor: 'autorizada', rotulo: 'Autorizada', cor: 'success' },
  { valor: 'cancelada', rotulo: 'Cancelada', cor: 'danger' },
];

const ROTULOS_AVISO = {
  itens_sem_produto: 'Há itens sem produto cadastrado; ligue-os no detalhe da nota.',
  numero_pedido_ausente: 'O cliente exige o número do pedido na nota e o XML não traz.',
  cliente_criado: 'O cliente foi criado a partir do destinatário; confira o cadastro.',
  titulos_pendentes: 'Os títulos a receber não foram atualizados; refaça pelo detalhe da nota.',
};

const formatoDataBrasilia = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const formatoDataHoraBrasilia = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function rotuloNatureza(natureza) {
  return NATUREZAS.find((item) => item.valor === natureza)?.rotulo ?? natureza;
}

export function statusDaNota(status) {
  return STATUS_NOTA.find((item) => item.valor === status) ?? { valor: status, rotulo: status, cor: 'neutral' };
}

export function rotuloAviso(aviso) {
  return ROTULOS_AVISO[aviso] ?? aviso;
}

export function numeroDaNota(nota) {
  return `${nota.serie}-${nota.numero}`;
}

export function dataEmBrasilia(iso) {
  if (!iso) return '—';
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? '—' : formatoDataBrasilia.format(data);
}

export function dataHoraEmBrasilia(iso) {
  if (!iso) return '—';
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? '—' : formatoDataHoraBrasilia.format(data).replace(', ', ' ');
}

const ROTULOS_EVENTO = { cancelamento: 'Cancelamento', carta_correcao: 'Carta de correção' };

const ROTULOS_FINALIDADE = {
  normal: 'Normal',
  complementar: 'Complementar',
  ajuste: 'Ajuste',
  devolucao: 'Devolução',
};

export function rotuloEventoNota(tipo) {
  return ROTULOS_EVENTO[tipo] ?? tipo;
}

export function rotuloFinalidade(finalidade) {
  return ROTULOS_FINALIDADE[finalidade] ?? finalidade;
}

export function formatarDocumento(documento) {
  const texto = String(documento ?? '');
  if (texto.length === 14) {
    return `${texto.slice(0, 2)}.${texto.slice(2, 5)}.${texto.slice(5, 8)}/${texto.slice(8, 12)}-${texto.slice(12)}`;
  }
  if (texto.length === 11) return `${texto.slice(0, 3)}.${texto.slice(3, 6)}.${texto.slice(6, 9)}-${texto.slice(9)}`;
  return texto || '—';
}

export function formatarChave(chave) {
  return String(chave ?? '').replace(/(.{4})(?=.)/g, '$1 ');
}

const formatoQuantidade = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 });

export function formatarQuantidade(quantidade) {
  const numero = Number(quantidade);
  return Number.isFinite(numero) ? formatoQuantidade.format(numero) : String(quantidade ?? '—');
}

export function descricaoDaEntrega(entrega) {
  if (!entrega) return undefined;
  const status = STATUS_ENTREGA[entrega.status]?.rotulo ?? entrega.status;
  const momento = entrega.entregue_em
    ? `Entregue em ${dataEmBrasilia(entrega.entregue_em)}`
    : entrega.saiu_em
      ? `Saída em ${dataEmBrasilia(entrega.saiu_em)}`
      : entrega.previsao
        ? `Previsão ${dataEmBrasilia(entrega.previsao)}`
        : `Criada em ${dataEmBrasilia(entrega.criado_em)}`;
  return `${momento} · ${status}`;
}

export function descricaoDoPedido(pedido) {
  return pedido ? `Pedido ${pedido.numero}` : undefined;
}
