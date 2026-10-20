export const TAMANHO_PAGINA = 20;

export const LIMITE_ARQUIVO = 10 * 1024 * 1024;

export const TIPOS_ARQUIVO = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

export const ROTULOS_STATUS = {
  pendente_aprovacao: 'Pendente de aprovação',
  aprovado: 'Aprovado',
  pago: 'Pago',
  rejeitado: 'Rejeitado',
  cancelado: 'Cancelado',
};

export const CORES_STATUS = {
  pendente_aprovacao: 'warning',
  aprovado: 'info',
  pago: 'success',
  rejeitado: 'danger',
  cancelado: 'neutral',
};

export const FORMAS_PAGAMENTO = [
  { valor: 'pix', rotulo: 'PIX' },
  { valor: 'cartao', rotulo: 'Cartão' },
  { valor: 'boleto', rotulo: 'Boleto' },
  { valor: 'transferencia', rotulo: 'Transferência' },
  { valor: 'debito_automatico', rotulo: 'Débito automático' },
];

export const ESCOPOS = [
  { valor: 'minhas', rotulo: 'Minhas' },
  { valor: 'aprovacao', rotulo: 'Aprovação' },
  { valor: 'financeiro', rotulo: 'Financeiro' },
  { valor: 'todas', rotulo: 'Todas' },
];

export function rotuloStatus(status) {
  return ROTULOS_STATUS[status] || status || '—';
}

export function corStatus(status) {
  return CORES_STATUS[status] || 'neutral';
}

export function rotuloFormaPagamento(forma) {
  const encontrada = FORMAS_PAGAMENTO.find((item) => item.valor === forma);
  return encontrada ? encontrada.rotulo : forma || '—';
}

export function statusPermitidosNoEscopo(escopo) {
  if (escopo === 'aprovacao') return ['pendente_aprovacao'];
  if (escopo === 'financeiro') return ['aprovado', 'pago', 'rejeitado', 'cancelado'];
  return ['pendente_aprovacao', 'aprovado', 'pago', 'rejeitado', 'cancelado'];
}

export function hojeISO() {
  const data = new Date();
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function arquivoPermitido(arquivo) {
  if (!TIPOS_ARQUIVO.includes(arquivo.type)) {
    return 'Formato não aceito: envie um arquivo PDF, PNG, JPEG ou WEBP.';
  }
  if (arquivo.size > LIMITE_ARQUIVO) {
    return 'arquivo excede o limite de 10MB';
  }
  return null;
}

const ROTULOS_EVENTO = {
  criada: 'Solicitação criada',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
  cancelada: 'Cancelada',
  paga: 'Paga',
  editada: 'Editada',
  classificada: 'Classificada',
  adiada: 'Vencimento adiado',
  estornada: 'Pagamento estornado',
};

export const ORIGENS = [
  { valor: 'manual', rotulo: 'Manual' },
  { valor: 'recorrencia', rotulo: 'Despesa recorrente' },
  { valor: 'recompra', rotulo: 'Recompra de título' },
  { valor: 'repasse_fomento', rotulo: 'Repasse ao fomento' },
  { valor: 'comissao', rotulo: 'Comissão' },
  { valor: 'importacao_parcela', rotulo: 'Parcela de importação' },
  { valor: 'importacao_custo', rotulo: 'Custo de importação' },
];

export function rotuloEvento(evento) {
  return ROTULOS_EVENTO[evento] || evento || '—';
}

export function rotuloOrigem(origem) {
  return ORIGENS.find((item) => item.valor === origem)?.rotulo ?? origem ?? '—';
}

export function formatarCompetencia(competencia) {
  if (!competencia) return '—';
  const [ano, mes] = String(competencia).split('-');
  return mes ? `${mes}/${ano}` : competencia;
}
