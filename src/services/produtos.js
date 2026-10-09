import { montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/produtos';

export function listarProdutos({
  pagina = 1,
  tamanho = 20,
  categoria_id = '',
  busca = '',
  ativo = '',
  destaque = '',
  estoque_baixo = '',
} = {}) {
  return requisitar(
    `${CAMINHO}${montarConsulta({ pagina, tamanho, categoria_id, busca, ativo, destaque, estoque_baixo })}`
  );
}

export function obterProduto(id) {
  return requisitar(`${CAMINHO}/${id}`);
}

export function criarProduto(dados) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: dados });
}

export function alterarProduto(id, dados) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'PUT', corpo: dados });
}

export function ativarProduto(id) {
  return requisitar(`${CAMINHO}/${id}/ativar`, { metodo: 'PATCH' });
}

export function desativarProduto(id) {
  return requisitar(`${CAMINHO}/${id}/desativar`, { metodo: 'PATCH' });
}

export function alternarDestaque(id, destaque) {
  return requisitar(`${CAMINHO}/${id}/destaque`, { metodo: 'PATCH', corpo: { destaque } });
}

export function obterSaldo(id) {
  return requisitar(`${CAMINHO}/${id}/saldo`);
}

export function listarMovimentos(id, { pagina = 1, tamanho = 20, tipo = '' } = {}) {
  return requisitar(`${CAMINHO}/${id}/movimentos${montarConsulta({ pagina, tamanho, tipo })}`);
}

export function movimentar(id, dados) {
  return requisitar(`${CAMINHO}/${id}/movimentos`, { metodo: 'POST', corpo: dados });
}

export function anexarImagem(id, dados) {
  return requisitar(`${CAMINHO}/${id}/imagens`, { metodo: 'POST', corpo: dados });
}

export function removerImagem(id, imagemId) {
  return requisitar(`${CAMINHO}/${id}/imagens/${imagemId}`, { metodo: 'DELETE' });
}

export function obterResumo() {
  return requisitar('/api/v1/estoque/resumo');
}
