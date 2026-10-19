import { hojeEmBrasilia } from '../pedidos/pedidosUtils';

export function ultimoDiaDoMesAnterior(data = hojeEmBrasilia()) {
  const [ano, mes] = data.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, 0)).toISOString().slice(0, 10);
}

export function nomeDaContaDoSaldo(saldo) {
  return saldo.banco_nome ? `${saldo.apelido} · ${saldo.banco_nome}` : saldo.apelido;
}

const MOTIVOS_IGNORADA = {
  valor_zero: 'Valor zero',
  anterior_ao_saldo_inicial: 'Anterior ao saldo inicial',
  mes_fechado: 'Mês fechado',
  data_futura: 'Data futura',
};

export function rotuloMotivoIgnorada(motivo) {
  return MOTIVOS_IGNORADA[motivo] ?? motivo;
}

export const opcaoDeConta = (conta) => ({ valor: conta.id, rotulo: `${conta.apelido} · ${conta.banco_nome}` });

export const nomeDaConta = (conta) => (conta ? `${conta.apelido} · ${conta.banco_nome}` : undefined);

export function somarDias(data, dias) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

export function primeiroDiaDoMes(data = hojeEmBrasilia()) {
  return `${data.slice(0, 7)}-01`;
}

const MOVIMENTOS = {
  pagamento: { rotulo: 'Pagamento', link: (id) => `/solicitacoes/${id}` },
  recebimento: { rotulo: 'Recebimento', link: (id) => `/titulos-receber/${id}` },
  antecipacao: { rotulo: 'Borderô', link: (id) => `/antecipacoes/${id}` },
  transferencia_saida: { rotulo: 'Transferência (saída)', link: null },
  transferencia_entrada: { rotulo: 'Transferência (entrada)', link: null },
};

export function rotuloMovimento(tipo) {
  return MOVIMENTOS[tipo]?.rotulo ?? tipo;
}

export function linkDoMovimento(movimento) {
  const link = MOVIMENTOS[movimento.tipo]?.link;
  return link && movimento.origem_id ? link(movimento.origem_id) : null;
}

export const SITUACOES_LANCAMENTO = {
  pendente: { rotulo: 'Pendente', cor: 'warning' },
  conciliado: { rotulo: 'Conciliado', cor: 'success' },
  invalidado: { rotulo: 'Invalidado', cor: 'danger' },
};
