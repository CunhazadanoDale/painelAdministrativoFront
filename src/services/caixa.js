import { montarConsulta, requisitar } from '../lib/api';
import { enviarArquivo } from './arquivos';

const CAIXA = '/api/v1/caixa';
const EXTRATOS = '/api/v1/extratos';
const TIPO_OFX = 'application/x-ofx';

export function obterAbertura(contaId, { sinal } = {}) {
  return requisitar(`${CAIXA}/contas/${contaId}/abertura`, { sinal });
}

export function definirAbertura(contaId, { data_corte, saldo_centavos, versao }) {
  const corpo = versao === null || versao === undefined ? { data_corte, saldo_centavos } : { data_corte, saldo_centavos, versao };
  return requisitar(`${CAIXA}/contas/${contaId}/abertura`, { metodo: 'PUT', corpo });
}

export function listarSaldos({ empresa = '', sinal } = {}) {
  return requisitar(`${CAIXA}/saldos${montarConsulta({ empresa })}`, { sinal });
}

export function enviarOfx(arquivo, opcoes) {
  const comTipo = arquivo.type ? arquivo : new File([arquivo], arquivo.name, { type: TIPO_OFX });
  return enviarArquivo(comTipo, opcoes);
}

export function importarExtrato({ arquivo_id, conta_bancaria_id = null, simular = false }) {
  return requisitar(`${EXTRATOS}/importacao`, { metodo: 'POST', corpo: { arquivo_id, conta_bancaria_id, simular } });
}

export function listarImportacoes({ pagina = 1, tamanho = 20, empresa = '', conta = '', sinal } = {}) {
  return requisitar(`${EXTRATOS}/importacoes${montarConsulta({ pagina, tamanho, empresa, conta })}`, { sinal });
}

export function desfazerImportacao(id) {
  return requisitar(`${EXTRATOS}/importacoes/${id}`, { metodo: 'DELETE' });
}

export function listarLancamentosExtrato({ pagina = 1, tamanho = 20, conta, de = '', ate = '', situacao = '', sinal } = {}) {
  return requisitar(`${EXTRATOS}/lancamentos${montarConsulta({ pagina, tamanho, conta, de, ate, situacao })}`, { sinal });
}

export function listarSugestoes(lancamentoId, { sinal } = {}) {
  return requisitar(`${EXTRATOS}/lancamentos/${lancamentoId}/sugestoes`, { sinal });
}

export function conciliarLancamento(lancamentoId, movimentos) {
  return requisitar(`${EXTRATOS}/lancamentos/${lancamentoId}/conciliacao`, {
    metodo: 'POST',
    corpo: { movimentos: movimentos.map(({ tipo, id }) => ({ tipo, id })) },
  });
}

export function classificarLancamento(lancamentoId, { categoria_financeira_id, descricao = '' }) {
  const corpo = descricao ? { categoria_financeira_id, descricao } : { categoria_financeira_id };
  return requisitar(`${EXTRATOS}/lancamentos/${lancamentoId}/classificacao`, { metodo: 'POST', corpo });
}

export function transferirLancamento(lancamentoId, { conta_contraparte_id, categoria_financeira_id, descricao = '' }) {
  const corpo = { conta_contraparte_id, categoria_financeira_id };
  if (descricao) corpo.descricao = descricao;
  return requisitar(`${EXTRATOS}/lancamentos/${lancamentoId}/transferencia`, { metodo: 'POST', corpo });
}

export function conciliarAutomatico({ conta_bancaria_id, de, ate }) {
  return requisitar(`${EXTRATOS}/conciliar-automatico`, { metodo: 'POST', corpo: { conta_bancaria_id, de, ate } });
}

export function obterConciliacao(id, { sinal } = {}) {
  return requisitar(`/api/v1/conciliacoes/${id}`, { sinal });
}

export function desfazerConciliacao(id, motivo) {
  return requisitar(`/api/v1/conciliacoes/${id}/desfazer`, { metodo: 'POST', corpo: { motivo } });
}

export function listarPendenciasSistema({ pagina = 1, tamanho = 20, conta, de = '', ate = '', sinal } = {}) {
  return requisitar(`${CAIXA}/pendencias-sistema${montarConsulta({ pagina, tamanho, conta, de, ate })}`, { sinal });
}

export function listarPagamentosSemConta({ pagina = 1, tamanho = 20, empresa = '', de = '', ate = '', sinal } = {}) {
  return requisitar(`${CAIXA}/pagamentos-sem-conta${montarConsulta({ pagina, tamanho, empresa, de, ate })}`, { sinal });
}

export function listarLancamentosCaixa({ pagina = 1, tamanho = 20, empresa = '', conta = '', de = '', ate = '', sinal } = {}) {
  return requisitar(`${CAIXA}/lancamentos${montarConsulta({ pagina, tamanho, empresa, conta, de, ate })}`, { sinal });
}

export function listarTransferencias({ pagina = 1, tamanho = 20, empresa = '', conta = '', de = '', ate = '', sinal } = {}) {
  return requisitar(`${CAIXA}/transferencias${montarConsulta({ pagina, tamanho, empresa, conta, de, ate })}`, { sinal });
}

export function obterPreviaFechamento({ conta, competencia, sinal }) {
  return requisitar(`${CAIXA}/fechamentos/previa${montarConsulta({ conta, competencia })}`, { sinal });
}

export function fecharMes({ conta_bancaria_id, competencia, saldo_banco_centavos = null }) {
  const corpo = { conta_bancaria_id, competencia };
  if (saldo_banco_centavos !== null && saldo_banco_centavos !== undefined) corpo.saldo_banco_centavos = saldo_banco_centavos;
  return requisitar(`${CAIXA}/fechamentos`, { metodo: 'POST', corpo });
}

export function listarFechamentosCaixa({ pagina = 1, tamanho = 20, empresa = '', conta = '', competencia = '', sinal } = {}) {
  return requisitar(`${CAIXA}/fechamentos${montarConsulta({ pagina, tamanho, empresa, conta, competencia })}`, { sinal });
}

export function obterFechamentoCaixa(id, { sinal } = {}) {
  return requisitar(`${CAIXA}/fechamentos/${id}`, { sinal });
}

export function reabrirFechamentoCaixa(id, motivo) {
  return requisitar(`${CAIXA}/fechamentos/${id}/reabrir`, { metodo: 'POST', corpo: { motivo } });
}

export function obterProjecao({ empresa = '', ate = '', sinal } = {}) {
  return requisitar(`${CAIXA}/projecao${montarConsulta({ empresa, ate })}`, { sinal });
}

export function listarMovimentoDiario({ empresa = '', conta = '', de = '', ate = '', sinal } = {}) {
  return requisitar(`${CAIXA}/movimento-diario${montarConsulta({ empresa, conta, de, ate })}`, { sinal });
}
