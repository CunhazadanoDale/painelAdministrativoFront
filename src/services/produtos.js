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
  sinal,
} = {}) {
  return requisitar(
    `${CAMINHO}${montarConsulta({ pagina, tamanho, categoria_id, busca, ativo, destaque, estoque_baixo })}`,
    { sinal }
  );
}

export function obterProduto(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}`, { sinal });
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

export function obterSaldo(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}/saldo`, { sinal });
}

export function listarMovimentos(id, { pagina = 1, tamanho = 20, tipo = '', local = '', sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}/movimentos${montarConsulta({ pagina, tamanho, tipo, local })}`, {
    sinal,
  });
}

export function movimentar(id, dados) {
  return requisitar(`${CAMINHO}/${id}/movimentos`, { metodo: 'POST', corpo: dados });
}

export function listarLotes(id, { pagina = 1, tamanho = 20, local = '', comSaldo = false, sinal } = {}) {
  const com_saldo = comSaldo ? 'true' : '';
  return requisitar(`${CAMINHO}/${id}/lotes${montarConsulta({ pagina, tamanho, local, com_saldo })}`, {
    sinal,
  });
}

export function transferir(id, dados) {
  return requisitar(`${CAMINHO}/${id}/transferencias`, { metodo: 'POST', corpo: dados });
}

export function reservar(id, dados) {
  return requisitar(`${CAMINHO}/${id}/reservas`, { metodo: 'POST', corpo: dados });
}

export function listarReservas(id, { pagina = 1, tamanho = 20, status = '', local = '', sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}/reservas${montarConsulta({ pagina, tamanho, status, local })}`, {
    sinal,
  });
}

export function liberarReserva(reservaId) {
  return requisitar(`/api/v1/reservas/${reservaId}/liberar`, { metodo: 'POST' });
}

export function anexarImagem(id, dados) {
  return requisitar(`${CAMINHO}/${id}/imagens`, { metodo: 'POST', corpo: dados });
}

export function removerImagem(id, imagemId) {
  return requisitar(`${CAMINHO}/${id}/imagens/${imagemId}`, { metodo: 'DELETE' });
}

export function obterResumo({ sinal } = {}) {
  return requisitar('/api/v1/estoque/resumo', { sinal });
}
