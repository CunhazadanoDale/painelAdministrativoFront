import { montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/categorias-financeiras';

export function obterArvoreFinanceira({ ativas = false, sinal } = {}) {
  return requisitar(`${CAMINHO}/arvore${montarConsulta({ ativas: ativas ? 'true' : '' })}`, { sinal });
}

export function obterCategoriaFinanceira(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}`, { sinal });
}

export function criarCategoriaFinanceira(dados) {
  const { natureza: _natureza, linha_dre: _linhaDre, ...subcategoria } = dados;
  return requisitar(CAMINHO, { metodo: 'POST', corpo: dados.categoria_pai_id ? subcategoria : dados });
}

export function atualizarCategoriaFinanceira(id, { nome, codigo, ordem, versao }) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'PUT', corpo: { nome, codigo, ordem, versao } });
}

export function ativarCategoriaFinanceira(id, versao) {
  return requisitar(`${CAMINHO}/${id}/ativar`, { metodo: 'PATCH', corpo: { versao } });
}

export function desativarCategoriaFinanceira(id, versao) {
  return requisitar(`${CAMINHO}/${id}/desativar`, { metodo: 'PATCH', corpo: { versao } });
}

export function removerCategoriaFinanceira(id) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'DELETE' });
}
