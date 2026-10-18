import { montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/despesas-recorrentes';

export function listarDespesasRecorrentes({
  pagina = 1,
  tamanho = 20,
  empresa = '',
  ativa = '',
  fornecedor = '',
  sinal,
} = {}) {
  return requisitar(`${CAMINHO}${montarConsulta({ pagina, tamanho, empresa, ativa, fornecedor })}`, { sinal });
}

export function obterDespesaRecorrente(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}`, { sinal });
}

export function criarDespesaRecorrente(dados) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: dados });
}

export function atualizarDespesaRecorrente(id, dados) {
  const { empresa_id: _empresaId, ...corpo } = dados;
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'PUT', corpo });
}

export function ativarDespesaRecorrente(id, versao) {
  return requisitar(`${CAMINHO}/${id}/ativar`, { metodo: 'PATCH', corpo: { versao } });
}

export function desativarDespesaRecorrente(id, versao) {
  return requisitar(`${CAMINHO}/${id}/desativar`, { metodo: 'PATCH', corpo: { versao } });
}

export function removerDespesaRecorrente(id) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'DELETE' });
}

export function gerarCompetencia({ competencia, empresa = '' }) {
  return requisitar(`${CAMINHO}/gerar${montarConsulta({ competencia, empresa })}`, { metodo: 'POST' });
}
