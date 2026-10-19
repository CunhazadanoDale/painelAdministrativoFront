import { montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/pedidos';
const ENTREGAS = '/api/v1/entregas';

export function listarPedidos({
  pagina = 1,
  tamanho = 20,
  empresa = '',
  cliente = '',
  representante = '',
  status = '',
  modelo = '',
  numero = '',
  sinal,
} = {}) {
  const consulta = montarConsulta({ pagina, tamanho, empresa, cliente, representante, status, modelo, numero });
  return requisitar(`${CAMINHO}${consulta}`, { sinal });
}

export function obterPedido(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}`, { sinal });
}

export function criarPedido(dados) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: dados });
}

export function atualizarPedido(id, dados) {
  const { empresa_id: _empresaId, ...corpo } = dados;
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'PUT', corpo });
}

export function confirmarPedido(id, versao) {
  return requisitar(`${CAMINHO}/${id}/confirmar`, { metodo: 'POST', corpo: { versao } });
}

export function reservarPendencias(id, versao) {
  return requisitar(`${CAMINHO}/${id}/reservar-pendencias`, { metodo: 'POST', corpo: { versao } });
}

export function registrarEntrada(id, { versao, pago_em, valor_centavos }) {
  return requisitar(`${CAMINHO}/${id}/entrada`, { metodo: 'POST', corpo: { versao, pago_em, valor_centavos } });
}

export function cancelarPedido(id, { versao, motivo, valor_a_devolver_centavos }) {
  return requisitar(`${CAMINHO}/${id}/cancelar`, {
    metodo: 'POST',
    corpo: { versao, motivo, valor_a_devolver_centavos },
  });
}

export function listarHistoricoPedido(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}/historico`, { sinal });
}

export function criarEntrega(pedidoId, dados) {
  return requisitar(`${CAMINHO}/${pedidoId}/entregas`, { metodo: 'POST', corpo: dados });
}

export function listarEntregasDoPedido(pedidoId, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${pedidoId}/entregas`, { sinal });
}

export function listarEntregas({ pagina = 1, tamanho = 20, empresa = '', status = '', previsao_ate = '', sinal } = {}) {
  return requisitar(`${ENTREGAS}${montarConsulta({ pagina, tamanho, empresa, status, previsao_ate })}`, { sinal });
}

export function obterEntrega(id, { sinal } = {}) {
  return requisitar(`${ENTREGAS}/${id}`, { sinal });
}

export function marcarSaida(id, { versao, saiu_em }) {
  return requisitar(`${ENTREGAS}/${id}/saiu`, { metodo: 'POST', corpo: { versao, saiu_em } });
}

export function marcarEntregue(id, { versao, entregue_em }) {
  return requisitar(`${ENTREGAS}/${id}/entregue`, { metodo: 'POST', corpo: { versao, entregue_em } });
}

export function cancelarEntrega(id, versao) {
  return requisitar(`${ENTREGAS}/${id}/cancelar`, { metodo: 'POST', corpo: { versao } });
}

export function listarPendencias({ pagina = 1, tamanho = 20, empresa = '', cliente = '', produto = '', sinal } = {}) {
  return requisitar(`${CAMINHO}/pendencias${montarConsulta({ pagina, tamanho, empresa, cliente, produto })}`, { sinal });
}

export function listarPrazos({ pagina = 1, tamanho = 20, empresa = '', situacao = '', dias = '', sinal } = {}) {
  return requisitar(`${CAMINHO}/prazos${montarConsulta({ pagina, tamanho, empresa, situacao, dias })}`, { sinal });
}

export function listarCancelamentos({
  pagina = 1,
  tamanho = 20,
  empresa = '',
  comDevolucao = false,
  de = '',
  ate = '',
  sinal,
} = {}) {
  const com_devolucao = comDevolucao ? 'true' : '';
  return requisitar(`${CAMINHO}/cancelamentos${montarConsulta({ pagina, tamanho, empresa, com_devolucao, de, ate })}`, {
    sinal,
  });
}

export function gerarTituloEntrada(pedidoId, { vencimento, conta_bancaria_id }) {
  return requisitar(`${CAMINHO}/${pedidoId}/titulo-entrada`, {
    metodo: 'POST',
    corpo: { vencimento, conta_bancaria_id },
  });
}
