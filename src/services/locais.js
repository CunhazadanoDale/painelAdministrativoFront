import { listarTodas, montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/estoque/locais';

export function listarLocais({ pagina = 1, tamanho = 20, empresa = '', ativos = '', sinal } = {}) {
  return requisitar(`${CAMINHO}${montarConsulta({ pagina, tamanho, empresa, ativos })}`, { sinal });
}

export function listarTodosLocais({ empresa = '', ativos = '', sinal } = {}) {
  return listarTodas(CAMINHO, { empresa, ativos }, { sinal });
}

export function obterLocal(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}`, { sinal });
}

export function criarLocal(dados) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: dados });
}

export function renomearLocal(id, nome) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'PUT', corpo: { nome } });
}

export function ativarLocal(id) {
  return requisitar(`${CAMINHO}/${id}/ativar`, { metodo: 'PATCH' });
}

export function desativarLocal(id) {
  return requisitar(`${CAMINHO}/${id}/desativar`, { metodo: 'PATCH' });
}

export function removerLocal(id) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'DELETE' });
}

export function listarSaldosDoLocal(id, { pagina = 1, tamanho = 20, comSaldo = false, sinal } = {}) {
  const com_saldo = comSaldo ? 'true' : '';
  return requisitar(`${CAMINHO}/${id}/saldos${montarConsulta({ pagina, tamanho, com_saldo })}`, { sinal });
}
