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
