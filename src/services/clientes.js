import { montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/clientes';

export function listarClientes({
  pagina = 1,
  tamanho = 20,
  busca = '',
  grupo = '',
  representante = '',
  tipo = '',
  uf = '',
  ativo = '',
  lead = '',
  sinal,
} = {}) {
  const consulta = montarConsulta({ pagina, tamanho, busca, grupo, representante, tipo, uf, ativo, lead });
  return requisitar(`${CAMINHO}${consulta}`, { sinal });
}

export function obterCliente(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}`, { sinal });
}

export function criarCliente(dados) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: dados });
}

export function atualizarCliente(id, dados) {
  const { documento: _documento, ...corpo } = dados;
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'PUT', corpo });
}

export function ativarCliente(id) {
  return requisitar(`${CAMINHO}/${id}/ativar`, { metodo: 'PATCH' });
}

export function desativarCliente(id) {
  return requisitar(`${CAMINHO}/${id}/desativar`, { metodo: 'PATCH' });
}

export function removerCliente(id) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'DELETE' });
}

export function converterLead(leadId, dados) {
  return requisitar(`/api/v1/leads/${leadId}/converter`, { metodo: 'POST', corpo: dados });
}

export function importarClientes(arquivo, { simular = false } = {}) {
  return requisitar(`${CAMINHO}/importacao?simular=${simular ? 'true' : 'false'}`, {
    metodo: 'POST',
    corpo: arquivo,
    tipoConteudo: 'text/csv',
  });
}

export function listarObras(clienteId, { pagina = 1, tamanho = 20, ativas = '', sinal } = {}) {
  return requisitar(`${CAMINHO}/${clienteId}/obras${montarConsulta({ pagina, tamanho, ativas })}`, { sinal });
}

export function obterObra(id, { sinal } = {}) {
  return requisitar(`/api/v1/obras/${id}`, { sinal });
}

export function criarObra(clienteId, dados) {
  return requisitar(`${CAMINHO}/${clienteId}/obras`, { metodo: 'POST', corpo: dados });
}

export function atualizarObra(id, dados) {
  return requisitar(`/api/v1/obras/${id}`, { metodo: 'PUT', corpo: dados });
}

export function ativarObra(id) {
  return requisitar(`/api/v1/obras/${id}/ativar`, { metodo: 'PATCH' });
}

export function desativarObra(id) {
  return requisitar(`/api/v1/obras/${id}/desativar`, { metodo: 'PATCH' });
}
