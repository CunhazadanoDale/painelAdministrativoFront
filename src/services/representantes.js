import { listarTodas, montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/representantes';

export function listarRepresentantes({ pagina = 1, tamanho = 20, busca = '', ativos = '', sinal } = {}) {
  return requisitar(`${CAMINHO}${montarConsulta({ pagina, tamanho, busca, ativos })}`, { sinal });
}

export function listarTodosRepresentantes({ ativos = '', sinal } = {}) {
  return listarTodas(CAMINHO, { ativos }, { sinal });
}

export function obterRepresentante(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}`, { sinal });
}

export function criarRepresentante(dados) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: dados });
}

export function atualizarRepresentante(id, dados) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'PUT', corpo: dados });
}

export function ativarRepresentante(id) {
  return requisitar(`${CAMINHO}/${id}/ativar`, { metodo: 'PATCH' });
}

export function desativarRepresentante(id) {
  return requisitar(`${CAMINHO}/${id}/desativar`, { metodo: 'PATCH' });
}

export function definirFornecedorDoRepresentante(id, fornecedorId) {
  return requisitar(`${CAMINHO}/${id}/fornecedor`, { metodo: 'PUT', corpo: { fornecedor_id: fornecedorId || null } });
}
