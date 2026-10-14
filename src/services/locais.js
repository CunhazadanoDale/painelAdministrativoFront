import { listarTodas, montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/estoque/locais';

export function listarLocais({ pagina = 1, tamanho = 20, empresa = '', ativos = '' } = {}) {
  return requisitar(`${CAMINHO}${montarConsulta({ pagina, tamanho, empresa, ativos })}`);
}

export function listarTodosLocais({ empresa = '', ativos = '', sinal } = {}) {
  return listarTodas(CAMINHO, { empresa, ativos }, { sinal });
}

export function obterLocal(id) {
  return requisitar(`${CAMINHO}/${id}`);
}
