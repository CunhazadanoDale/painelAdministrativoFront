import { listarTodas, montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/cliente-grupos';

export function listarGrupos({ pagina = 1, tamanho = 20, busca = '', ativos = '', sinal } = {}) {
  return requisitar(`${CAMINHO}${montarConsulta({ pagina, tamanho, busca, ativos })}`, { sinal });
}

export function listarTodosGrupos({ ativos = '', sinal } = {}) {
  return listarTodas(CAMINHO, { ativos }, { sinal });
}

export function criarGrupo(nome) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: { nome } });
}

export function renomearGrupo(id, nome) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'PUT', corpo: { nome } });
}

export function ativarGrupo(id) {
  return requisitar(`${CAMINHO}/${id}/ativar`, { metodo: 'PATCH' });
}

export function desativarGrupo(id) {
  return requisitar(`${CAMINHO}/${id}/desativar`, { metodo: 'PATCH' });
}
