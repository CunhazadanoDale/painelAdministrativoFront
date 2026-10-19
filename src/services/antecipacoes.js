import { montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/antecipacoes';

export function criarAntecipacao(dados) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: dados });
}

export function listarAntecipacoes({
  pagina = 1,
  tamanho = 20,
  empresa = '',
  fornecedor = '',
  status = '',
  de = '',
  ate = '',
  sinal,
} = {}) {
  return requisitar(`${CAMINHO}${montarConsulta({ pagina, tamanho, empresa, fornecedor, status, de, ate })}`, { sinal });
}

export function obterAntecipacao(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}`, { sinal });
}

export function estornarAntecipacao(id, { motivo, versao }) {
  return requisitar(`${CAMINHO}/${id}/estorno`, { metodo: 'POST', corpo: { motivo, versao } });
}
