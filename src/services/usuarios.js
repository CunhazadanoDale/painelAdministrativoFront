import { montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/usuarios';

export function listarUsuarios({ pagina = 1, tamanho = 20, q = '', ativos = '' } = {}) {
  return requisitar(`${CAMINHO}${montarConsulta({ pagina, tamanho, q, ativos })}`);
}

export function obterUsuario(id) {
  return requisitar(`${CAMINHO}/${id}`);
}

export function criarUsuario(dados) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: dados });
}

export function atualizarUsuario(id, dados) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'PUT', corpo: dados });
}

export function removerUsuario(id) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'DELETE' });
}

export function trocarSenha(id, novaSenha) {
  return requisitar(`${CAMINHO}/${id}/senha`, { metodo: 'POST', corpo: { nova_senha: novaSenha } });
}

export function ativarUsuario(id) {
  return requisitar(`${CAMINHO}/${id}/ativar`, { metodo: 'PATCH' });
}

export function desativarUsuario(id) {
  return requisitar(`${CAMINHO}/${id}/desativar`, { metodo: 'PATCH' });
}
