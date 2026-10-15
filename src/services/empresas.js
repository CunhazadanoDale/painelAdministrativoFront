import { listarTodas, montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/empresas';

export function listarEmpresas({ pagina = 1, tamanho = 20, ativas = '', sinal } = {}) {
  return requisitar(`${CAMINHO}${montarConsulta({ pagina, tamanho, ativas })}`, { sinal });
}

export function listarTodasEmpresas({ ativas = '', sinal } = {}) {
  return listarTodas(CAMINHO, { ativas }, { sinal });
}

export function obterEmpresa(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}`, { sinal });
}

export function criarEmpresa({ cnpj, razao_social, nome_fantasia, uf, regime_tributario }) {
  return requisitar(CAMINHO, {
    metodo: 'POST',
    corpo: { cnpj, razao_social, nome_fantasia, uf, regime_tributario },
  });
}

export function atualizarEmpresa(id, { razao_social, nome_fantasia, uf, regime_tributario }) {
  return requisitar(`${CAMINHO}/${id}`, {
    metodo: 'PUT',
    corpo: { razao_social, nome_fantasia, uf, regime_tributario },
  });
}

export function ativarEmpresa(id) {
  return requisitar(`${CAMINHO}/${id}/ativar`, { metodo: 'PATCH' });
}

export function desativarEmpresa(id) {
  return requisitar(`${CAMINHO}/${id}/desativar`, { metodo: 'PATCH' });
}

export function removerEmpresa(id) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'DELETE' });
}

export function obterEmpresasDoUsuario(usuarioId, { sinal } = {}) {
  return requisitar(`/api/v1/usuarios/${usuarioId}/empresas`, { sinal });
}

export function definirEmpresasDoUsuario(usuarioId, { acesso_todas, empresa_ids }) {
  return requisitar(`/api/v1/usuarios/${usuarioId}/empresas`, {
    metodo: 'PUT',
    corpo: { acesso_todas, empresa_ids },
  });
}
