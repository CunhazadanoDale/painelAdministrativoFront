import { hojeEmBrasilia } from '../pedidos/pedidosUtils';

export function ultimoDiaDoMesAnterior(data = hojeEmBrasilia()) {
  const [ano, mes] = data.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, 0)).toISOString().slice(0, 10);
}

export function nomeDaContaDoSaldo(saldo) {
  return saldo.banco_nome ? `${saldo.apelido} · ${saldo.banco_nome}` : saldo.apelido;
}
