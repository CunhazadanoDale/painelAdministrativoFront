// Services de Funil e Etapa — espelham /api/v1/funils e /api/v1/etapas do backend Go.
import { listarTodas, montarConsulta, requisitar } from '../lib/api';

const CAMINHO_FUNIL = '/api/v1/funils';

/**
 * Lista funis.
 * @param {{ pagina?: number, tamanho?: number, ativos?: boolean }} opcoes
 */
export function listarFunis({ pagina = 1, tamanho = 50, ativos = true } = {}) {
  return requisitar(
    `${CAMINHO_FUNIL}${montarConsulta({ pagina, tamanho, ativos: ativos ? 'true' : '' })}`
  );
}

export function listarTodosFunis({ ativos = true, sinal } = {}) {
  return listarTodas(CAMINHO_FUNIL, { ativos: ativos ? 'true' : '' }, { sinal });
}

export function criarFunil(dados) {
  return requisitar(CAMINHO_FUNIL, { metodo: 'POST', corpo: dados });
}

export function atualizarFunil(id, dados) {
  return requisitar(`${CAMINHO_FUNIL}/${id}`, { metodo: 'PUT', corpo: dados });
}

export function removerFunil(id) {
  return requisitar(`${CAMINHO_FUNIL}/${id}`, { metodo: 'DELETE' });
}

/** Etapas de um funil, ordenadas por `ordem`. */
export function listarEtapasDoFunil(funilId) {
  return requisitar(`${CAMINHO_FUNIL}/${funilId}/etapas`);
}

export function criarEtapa(dados) {
  return requisitar('/api/v1/etapas', { metodo: 'POST', corpo: dados });
}

export function atualizarEtapa(id, dados) {
  return requisitar(`/api/v1/etapas/${id}`, { metodo: 'PUT', corpo: dados });
}

export function removerEtapa(id) {
  return requisitar(`/api/v1/etapas/${id}`, { metodo: 'DELETE' });
}

/** Reordena etapas em lote: corpo { etapas: [uuid, ...] }. */
export function reordenarEtapas(funilId, etapas) {
  return requisitar(`${CAMINHO_FUNIL}/${funilId}/etapas/ordem`, {
    metodo: 'PUT',
    corpo: { etapas },
  });
}
