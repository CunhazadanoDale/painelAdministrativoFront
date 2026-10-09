import { requisitar } from '../lib/api';

const CAMINHO = '/api/v1/sessao';

export function obterSessao() {
  return requisitar(CAMINHO);
}

export function trocarSenhaPropria(novaSenha) {
  return requisitar(`${CAMINHO}/senha`, { metodo: 'POST', corpo: { nova_senha: novaSenha } });
}
