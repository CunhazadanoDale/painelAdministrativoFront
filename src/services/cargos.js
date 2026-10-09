import { montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/cargos';

export function listarCargos({ pagina = 1, tamanho = 20, ativos = '' } = {}) {
  return requisitar(`${CAMINHO}${montarConsulta({ pagina, tamanho, ativos })}`);
}

export function obterCargo(id) {
  return requisitar(`${CAMINHO}/${id}`);
}

export function criarCargo(dados) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: dados });
}

export function atualizarCargo(id, dados) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'PUT', corpo: dados });
}

export function removerCargo(id) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'DELETE' });
}
