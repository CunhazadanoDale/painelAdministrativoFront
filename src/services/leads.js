// Services do recurso Lead — espelha /api/v1/leads do backend Go.
import { montarConsulta, requisitar } from '../lib/api';

const CAMINHO_LEADS = '/api/v1/leads';
const CAMINHO_FUNILS = '/api/v1/funils';
const CAMINHO_ETAPAS = '/api/v1/etapas';

/**
 * Lista leads ativos com paginação e busca (q).
 * @param {{ pagina?: number, tamanho?: number, q?: string }} opcoes
 * @returns {Promise<{ dados: Array, pagina: number, tamanho: number }>}
 */
export function listarLeads({ pagina = 1, tamanho = 20, q = '' } = {}) {
  return requisitar(`${CAMINHO_LEADS}${montarConsulta({ pagina, tamanho, q })}`);
}

/** Lista todos os leads de uma etapa (sem paginação). */
export function listarLeadsPorEtapa(etapaId) {
  return requisitar(`${CAMINHO_ETAPAS}/${etapaId}/leads`);
}

export function obterLead(id) {
  return requisitar(`${CAMINHO_LEADS}/${id}`);
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

/** Move o lead de etapa e grava a trilha de histórico no backend (transação). */
export function moverLeadDeEtapa(id, etapaId) {
  return requisitar(`${CAMINHO_LEADS}/${id}/etapa`, { metodo: 'PATCH', corpo: { etapa_id: etapaId } });
}

/** Total de leads de um funil (usado para o contador da tela). */
export function contarLeadsPorFunil(funilId) {
  return requisitar(`${CAMINHO_FUNILS}/${funilId}/leads/contagem`);
}

export function contarLeadsPorEtapa(etapaId) {
  return requisitar(`${CAMINHO_ETAPAS}/${etapaId}/leads/contagem`);
}

/** Histórico de movimentações do lead (paginado, mais recente primeiro). */
export function listarHistoricoDoLead(leadId, { pagina = 1, tamanho = 20 } = {}) {
  return requisitar(`${CAMINHO_LEADS}/${leadId}/historico${montarConsulta({ pagina, tamanho })}`);
}
