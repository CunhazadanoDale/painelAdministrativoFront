import { listarTodas, montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/solicitacoes';

export function listarSolicitacoes({
  pagina = 1,
  tamanho = 20,
  escopo = '',
  status = '',
  empresa = '',
  sinal,
} = {}) {
  return requisitar(`${CAMINHO}${montarConsulta({ pagina, tamanho, escopo, status, empresa })}`, {
    sinal,
  });
}

export function obterSolicitacao(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}`, { sinal });
}

export function criarSolicitacao(dados) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: dados });
}

export function aprovar(id) {
  return requisitar(`${CAMINHO}/${id}/aprovar`, { metodo: 'POST', corpo: {} });
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

export function listarHistorico(id, { sinal } = {}) {
  return listarTodas(`${CAMINHO}/${id}/historico`, {}, { sinal });
}

export function listarArquivos(id, { sinal } = {}) {
  return listarTodas(`${CAMINHO}/${id}/arquivos`, {}, { sinal });
}
