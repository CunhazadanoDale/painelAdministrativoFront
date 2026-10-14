import { listarTodas, montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/categorias';

export function listarCategorias({ pagina = 1, tamanho = 100, ativo = '' } = {}) {
  return requisitar(`${CAMINHO}${montarConsulta({ pagina, tamanho, ativo })}`);
}

export function listarTodasCategorias({ ativo = '', sinal } = {}) {
  return listarTodas(CAMINHO, { ativo }, { sinal });
}

export function obterCategoria(id) {
  return requisitar(`${CAMINHO}/${id}`);
}

export function criarCategoria(dados) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: dados });
}

export function alterarCategoria(id, dados) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'PUT', corpo: dados });
}

export function ativarCategoria(id) {
  return requisitar(`${CAMINHO}/${id}/ativar`, { metodo: 'PATCH' });
}

export function desativarCategoria(id) {
  return requisitar(`${CAMINHO}/${id}/desativar`, { metodo: 'PATCH' });
}
