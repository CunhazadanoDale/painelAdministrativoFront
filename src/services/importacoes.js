import { montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/importacoes';

export function listarImportacoes({
  pagina = 1,
  tamanho = 20,
  empresa = '',
  fornecedor = '',
  status = '',
  numero = '',
  chegada_ate = '',
  sinal,
} = {}) {
  const consulta = montarConsulta({ pagina, tamanho, empresa, fornecedor, status, numero, chegada_ate });
  return requisitar(`${CAMINHO}${consulta}`, { sinal });
}

export function obterImportacao(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}`, { sinal });
}

export function criarImportacao(dados) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: dados });
}

export function atualizarImportacao(id, dados) {
  const { empresa_id: _empresaId, ...corpo } = dados;
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'PUT', corpo });
}

export function embarcarImportacao(id, { versao, embarcada_em, chegada_prevista, documento_embarque }) {
  return requisitar(`${CAMINHO}/${id}/embarcar`, {
    metodo: 'POST',
    corpo: { versao, embarcada_em, chegada_prevista, documento_embarque },
  });
}

export function desembaracarImportacao(id, { versao, chegada_em, desembaracada_em, declaracao }) {
  return requisitar(`${CAMINHO}/${id}/desembaracar`, {
    metodo: 'POST',
    corpo: { versao, chegada_em, desembaracada_em, declaracao },
  });
}

export function receberImportacao(id, { versao, recebida_em, local_id, cambio_micro, itens }) {
  const corpo = { versao, recebida_em, local_id, itens };
  if (cambio_micro !== null && cambio_micro !== undefined) corpo.cambio_micro = cambio_micro;
  return requisitar(`${CAMINHO}/${id}/receber`, { metodo: 'POST', corpo });
}

export function cancelarImportacao(id, { versao, motivo }) {
  return requisitar(`${CAMINHO}/${id}/cancelar`, { metodo: 'POST', corpo: { versao, motivo } });
}

export function listarHistoricoImportacao(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}/historico`, { sinal });
}

export function incluirParcela(id, dados) {
  return requisitar(`${CAMINHO}/${id}/parcelas`, { metodo: 'POST', corpo: dados });
}

export function atualizarParcela(id, parcelaId, dados) {
  return requisitar(`${CAMINHO}/${id}/parcelas/${parcelaId}`, { metodo: 'PUT', corpo: dados });
}

export function removerParcela(id, parcelaId, versao) {
  return requisitar(`${CAMINHO}/${id}/parcelas/${parcelaId}${montarConsulta({ versao })}`, { metodo: 'DELETE' });
}

export function fecharCambio(id, parcelaId, { versao, cambio_micro, vencimento, categoria_financeira_id }) {
  return requisitar(`${CAMINHO}/${id}/parcelas/${parcelaId}/cambio`, {
    metodo: 'POST',
    corpo: { versao, cambio_micro, vencimento, categoria_financeira_id },
  });
}

export function reabrirParcela(id, parcelaId, versao) {
  return requisitar(`${CAMINHO}/${id}/parcelas/${parcelaId}/reabrir`, { metodo: 'POST', corpo: { versao } });
}

export function lancarCusto(id, dados) {
  return requisitar(`${CAMINHO}/${id}/custos`, { metodo: 'POST', corpo: dados });
}

export function cancelarCusto(id, custoId, versao) {
  return requisitar(`${CAMINHO}/${id}/custos/${custoId}/cancelar`, { metodo: 'POST', corpo: { versao } });
}

export function obterCustoPrevisto(id, { cambio_micro, sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}/custo-previsto${montarConsulta({ cambio_micro })}`, { sinal });
}

export function definirAlocacoes(id, { versao, alocacoes }) {
  return requisitar(`${CAMINHO}/${id}/alocacoes`, { metodo: 'PUT', corpo: { versao, alocacoes } });
}

export function obterAlertasImportacao({ empresa = '', folga = '', sinal } = {}) {
  return requisitar(`${CAMINHO}/alertas${montarConsulta({ empresa, folga })}`, { sinal });
}

export function listarImportacoesDoPedido(pedidoId, { sinal } = {}) {
  return requisitar(`/api/v1/pedidos/${pedidoId}/importacoes`, { sinal });
}
