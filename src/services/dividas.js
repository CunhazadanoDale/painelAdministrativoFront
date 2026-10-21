import { montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/dividas';

export function listarDividas({
  pagina = 1,
  tamanho = 20,
  empresa = '',
  fornecedor = '',
  credor_tipo = '',
  status = '',
  quitada = '',
  vencidas = '',
  sinal,
} = {}) {
  const consulta = montarConsulta({ pagina, tamanho, empresa, fornecedor, credor_tipo, status, quitada, vencidas });
  return requisitar(`${CAMINHO}${consulta}`, { sinal });
}

export function obterDivida(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}`, { sinal });
}

export function criarDivida(dados) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: dados });
}

export function atualizarDivida(id, dados) {
  const {
    empresa_id: _empresaId,
    fornecedor_id: _fornecedorId,
    saldo_inicial_centavos: _saldo,
    data_saldo: _dataSaldo,
    parcelas: _parcelas,
    ...corpo
  } = dados;
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'PUT', corpo });
}

export function atualizarParcelaDivida(id, parcelaId, { versao, vencimento, juros_centavos }) {
  return requisitar(`${CAMINHO}/${id}/parcelas/${parcelaId}`, {
    metodo: 'PUT',
    corpo: { versao, vencimento, juros_centavos },
  });
}

export function reabrirParcelaDivida(id, parcelaId, versao) {
  return requisitar(`${CAMINHO}/${id}/parcelas/${parcelaId}/reabrir`, { metodo: 'POST', corpo: { versao } });
}

export function cancelarDivida(id, { versao, motivo }) {
  return requisitar(`${CAMINHO}/${id}/cancelar`, { metodo: 'POST', corpo: { versao, motivo } });
}

export function renegociarDivida(id, { versao, motivo, nova }) {
  const { empresa_id: _empresaId, ...dividaNova } = nova;
  return requisitar(`${CAMINHO}/${id}/renegociar`, { metodo: 'POST', corpo: { versao, motivo, nova: dividaNova } });
}

export function listarHistoricoDivida(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}/historico`, { sinal });
}

export function gerarContasDividas({ competencia, empresa = '' }) {
  return requisitar(`${CAMINHO}/gerar${montarConsulta({ competencia, empresa })}`, { metodo: 'POST' });
}

export function obterResumoDividas({ empresa = '', sinal } = {}) {
  return requisitar(`${CAMINHO}/resumo${montarConsulta({ empresa })}`, { sinal });
}
