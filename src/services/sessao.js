import { requisitar } from '../lib/api';

const CAMINHO = '/api/v1/sessao';

export function obterSessao({ sinal } = {}) {
  return requisitar(CAMINHO, { sinal });
}

export function trocarSenhaPropria(senhaAtual, novaSenha) {
  return requisitar(`${CAMINHO}/senha`, {
    metodo: 'POST',
    corpo: { senha_atual: senhaAtual, nova_senha: novaSenha },
  });
}

export function encerrarSessao() {
  return requisitar(`${CAMINHO}/encerrar`, { metodo: 'POST' });
}
