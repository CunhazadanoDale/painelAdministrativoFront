import { montarConsulta, requisitar } from '../lib/api';

const CAMINHO_LEADS = '/api/v1/leads';
const CAMINHO_FUNILS = '/api/v1/funils';
const CAMINHO_ETAPAS = '/api/v1/etapas';

export function listarLeads({ pagina = 1, tamanho = 20, q = '', sinal } = {}) {
  return requisitar(`${CAMINHO_LEADS}${montarConsulta({ pagina, tamanho, q })}`, { sinal });
}

export function listarLeadsPorEtapa(etapaId, { sinal } = {}) {
  return requisitar(`${CAMINHO_ETAPAS}/${etapaId}/leads`, { sinal });
}

export function obterLead(id, { sinal } = {}) {
  return requisitar(`${CAMINHO_LEADS}/${id}`, { sinal });
}

export function criarLead(dados) {
  return requisitar(CAMINHO_LEADS, { metodo: 'POST', corpo: dados });
}

export function atualizarLead(id, dados) {
  return requisitar(`${CAMINHO_LEADS}/${id}`, { metodo: 'PUT', corpo: dados });
}

export function removerLead(id) {
  return requisitar(`${CAMINHO_LEADS}/${id}`, { metodo: 'DELETE' });
}

export function moverLeadDeEtapa(id, etapaId) {
  return requisitar(`${CAMINHO_LEADS}/${id}/etapa`, { metodo: 'PATCH', corpo: { etapa_id: etapaId } });
}

export function contarLeadsPorFunil(funilId, { sinal } = {}) {
  return requisitar(`${CAMINHO_FUNILS}/${funilId}/leads/contagem`, { sinal });
}

export function contarLeadsPorEtapa(etapaId, { sinal } = {}) {
  return requisitar(`${CAMINHO_ETAPAS}/${etapaId}/leads/contagem`, { sinal });
}

export function listarHistoricoDoLead(leadId, { pagina = 1, tamanho = 20, sinal } = {}) {
  return requisitar(`${CAMINHO_LEADS}/${leadId}/historico${montarConsulta({ pagina, tamanho })}`, {
    sinal,
  });
}
