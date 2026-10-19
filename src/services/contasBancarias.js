import { listarTodas, montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/contas-bancarias';

export function listarContasBancarias({
  pagina = 1,
  tamanho = 20,
  empresa = '',
  banco = '',
  tipo = '',
  ativa = '',
  sinal,
} = {}) {
  return requisitar(`${CAMINHO}${montarConsulta({ pagina, tamanho, empresa, banco, tipo, ativa })}`, {
    sinal,
  });
}

export function listarTodasContasBancarias({ empresa = '', ativa = '', sinal } = {}) {
  return listarTodas(CAMINHO, { empresa, ativa }, { sinal });
}

export function obterContaBancaria(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}`, { sinal });
}

export function criarContaBancaria(dados) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: dados });
}

export function atualizarContaBancaria(id, { apelido, versao }) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'PUT', corpo: { apelido, versao } });
}

export function ativarContaBancaria(id, versao) {
  return requisitar(`${CAMINHO}/${id}/ativar`, { metodo: 'PATCH', corpo: { versao } });
}

export function desativarContaBancaria(id, versao) {
  return requisitar(`${CAMINHO}/${id}/desativar`, { metodo: 'PATCH', corpo: { versao } });
}

export function removerContaBancaria(id) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'DELETE' });
}

export function listarBancos({ sinal } = {}) {
  return requisitar('/api/v1/bancos', { sinal });
}
