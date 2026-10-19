import * as representantesService from '../../services/representantes';
import { hojeEmBrasilia } from '../pedidos/pedidosUtils';

export { formatarCompetencia } from '../solicitacoes/solicitacoesUtils';

export function mesAtualEmBrasilia() {
  return hojeEmBrasilia().slice(0, 7);
}

export function descricaoDoPedido(pedido) {
  return pedido ? `Pedido ${pedido.numero}` : undefined;
}

export const carregarRepresentantes = (sinal) => representantesService.listarTodosRepresentantes({ sinal });

export const opcaoDeRepresentante = (representante) => ({ valor: representante.id, rotulo: representante.nome });

export function textoDaApuracao(resultado) {
  const apuradas = resultado?.apuradas?.length ?? 0;
  const jaExistentes = resultado?.ja_existentes ?? 0;
  return `Apuração: ${apuradas} entrega(s) apurada(s), ${jaExistentes} já apurada(s) antes.`;
}
