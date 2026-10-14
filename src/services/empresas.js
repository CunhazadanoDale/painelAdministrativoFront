import { listarTodas, montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/empresas';

export function listarEmpresas({ pagina = 1, tamanho = 20, ativas = '' } = {}) {
  return requisitar(`${CAMINHO}${montarConsulta({ pagina, tamanho, ativas })}`);
}

export function listarTodasEmpresas({ ativas = '', sinal } = {}) {
  return listarTodas(CAMINHO, { ativas }, { sinal });
}

export function obterEmpresa(id) {
  return requisitar(`${CAMINHO}/${id}`);
}
