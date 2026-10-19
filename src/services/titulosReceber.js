import { listarTodas, montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/titulos-receber';

export function listarTitulos({
  pagina = 1,
  tamanho = 20,
  empresa = '',
  cliente = '',
  status = '',
  origem = '',
  origem_id = '',
  conta = '',
  vencimento_de = '',
  vencimento_ate = '',
  vencidos = false,
  origemCancelada = false,
  sinal,
} = {}) {
  const consulta = montarConsulta({
    pagina,
    tamanho,
    empresa,
    cliente,
    status,
    origem,
    origem_id,
    conta,
    vencimento_de,
    vencimento_ate,
    vencidos: vencidos ? 'true' : '',
    origem_cancelada: origemCancelada ? 'true' : '',
  });
  return requisitar(`${CAMINHO}${consulta}`, { sinal });
}

export async function listarTitulosAntecipaveis({ empresa, sinal } = {}) {
  const [carteira, emBanco] = await Promise.all(
    ['carteira', 'em_banco'].map((status) => listarTodas(CAMINHO, { empresa, status }, { sinal }))
  );
  return [...carteira, ...emBanco]
    .filter((titulo) => titulo.saldo_centavos > 0 && !titulo.origem_cancelada_em)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

export function obterTitulo(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}`, { sinal });
}

export function listarHistoricoTitulo(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}/historico`, { sinal });
}

export function criarTitulo(dados) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: dados });
}

export function atualizarTitulo(id, dados) {
  const { empresa_id: _empresaId, cliente_id: _clienteId, conta_bancaria_id: _contaId, ...corpo } = dados;
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'PUT', corpo });
}

export function prorrogarTitulo(id, { vencimento, motivo, versao }) {
  return requisitar(`${CAMINHO}/${id}/prorrogar`, { metodo: 'POST', corpo: { vencimento, motivo, versao } });
}

export function enviarAoBanco(id, { conta_bancaria_id, versao }) {
  return requisitar(`${CAMINHO}/${id}/enviar-banco`, { metodo: 'POST', corpo: { conta_bancaria_id, versao } });
}

export function retirarDoBanco(id, versao) {
  return requisitar(`${CAMINHO}/${id}/retirar-banco`, { metodo: 'POST', corpo: { versao } });
}

export function registrarBoletoEnviado(id, { canal, enviado_em, versao }) {
  return requisitar(`${CAMINHO}/${id}/boleto-enviado`, { metodo: 'POST', corpo: { canal, enviado_em, versao } });
}

export function cancelarTitulo(id, { motivo, versao }) {
  return requisitar(`${CAMINHO}/${id}/cancelar`, { metodo: 'POST', corpo: { motivo, versao } });
}

export function registrarRecebimento(id, dados) {
  return requisitar(`${CAMINHO}/${id}/recebimentos`, { metodo: 'POST', corpo: dados });
}

export function listarRecebimentos(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}/recebimentos`, { sinal });
}

export function estornarRecebimento(id, recebimentoId, { motivo, estornado_em, versao }) {
  return requisitar(`${CAMINHO}/${id}/recebimentos/${recebimentoId}/estorno`, {
    metodo: 'POST',
    corpo: { motivo, estornado_em, versao },
  });
}

export function recomprarTitulo(id, dados) {
  return requisitar(`${CAMINHO}/${id}/recompra`, { metodo: 'POST', corpo: dados });
}

export function listarBoletosPendentes({ pagina = 1, tamanho = 20, dias = '', empresa = '', sinal } = {}) {
  return requisitar(`${CAMINHO}/boletos-pendentes${montarConsulta({ pagina, tamanho, dias, empresa })}`, { sinal });
}

export function obterResumoContasAReceber({ de = '', ate = '', empresa = '', sinal } = {}) {
  return requisitar(`/api/v1/contas-a-receber/resumo${montarConsulta({ de, ate, empresa })}`, { sinal });
}
