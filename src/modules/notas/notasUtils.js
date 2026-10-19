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
  return Number.isNaN(data.getTime()) ? '—' : formatoDataHoraBrasilia.format(data);
}
