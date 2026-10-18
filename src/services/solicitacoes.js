import { listarTodas, montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/solicitacoes';

export function listarSolicitacoes({
  pagina = 1,
  tamanho = 20,
  escopo = '',
  status = '',
  empresa = '',
  fornecedor = '',
  categoria = '',
  competencia = '',
  origem = '',
  vencimento_de = '',
  vencimento_ate = '',
  vencidas = false,
  sinal,
} = {}) {
  const consulta = montarConsulta({
    pagina,
    tamanho,
    escopo,
    status,
    empresa,
    fornecedor,
    categoria,
    competencia,
    origem,
    vencimento_de,
    vencimento_ate,
    vencidas: vencidas ? 'true' : '',
  });
  return requisitar(`${CAMINHO}${consulta}`, { sinal });
}

export function obterSolicitacao(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}`, { sinal });
}

export function criarSolicitacao(dados) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: dados });
}

export function atualizarSolicitacao(id, dados) {
  const { empresa_id: _empresaId, arquivo_ids: _arquivoIds, ...corpo } = dados;
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'PUT', corpo });
}

export function aprovar(id, versao) {
  const corpo = versao === undefined || versao === null ? {} : { versao };
  return requisitar(`${CAMINHO}/${id}/aprovar`, { metodo: 'POST', corpo });
}

export function classificar(id, { fornecedor_id, categoria_financeira_id, competencia, versao }) {
  return requisitar(`${CAMINHO}/${id}/classificacao`, {
    metodo: 'PATCH',
    corpo: { fornecedor_id, categoria_financeira_id, competencia, versao },
  });
}

export function adiar(id, { vencimento, motivo, versao }) {
  return requisitar(`${CAMINHO}/${id}/adiar`, { metodo: 'POST', corpo: { vencimento, motivo, versao } });
}

export function rejeitar(id, motivo) {
  return requisitar(`${CAMINHO}/${id}/rejeitar`, { metodo: 'POST', corpo: { motivo } });
}

export function cancelar(id) {
  return requisitar(`${CAMINHO}/${id}/cancelar`, { metodo: 'POST', corpo: {} });
}

export function registrarPagamento(id, dados) {
  return requisitar(`${CAMINHO}/${id}/pagamento`, { metodo: 'POST', corpo: dados });
}

export function obterPagamento(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}/pagamento`, { sinal });
}

export function estornarPagamento(id, { motivo, estornado_em, versao }) {
  return requisitar(`${CAMINHO}/${id}/pagamento/estorno`, {
    metodo: 'POST',
    corpo: { motivo, estornado_em, versao },
  });
}

export function listarPagamentos(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}/pagamentos`, { sinal });
}

export function obterPendencias({ sinal } = {}) {
  return requisitar(`${CAMINHO}/pendencias`, { sinal });
}

export function listarHistorico(id, { sinal } = {}) {
  return listarTodas(`${CAMINHO}/${id}/historico`, {}, { sinal });
}

export function listarArquivos(id, { sinal } = {}) {
  return listarTodas(`${CAMINHO}/${id}/arquivos`, {}, { sinal });
}
