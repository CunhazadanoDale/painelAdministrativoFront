import { montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/comissoes';

function booleanoOpcional(valor) {
  return valor === true || valor === false ? String(valor) : valor;
}

export function obterComissaoDoPedido(pedidoId, { sinal } = {}) {
  return requisitar(`/api/v1/pedidos/${pedidoId}/comissao`, { sinal });
}

export function definirComissaoDoPedido(pedidoId, { percentual_bp, versao }) {
  const corpo = versao === null || versao === undefined ? { percentual_bp } : { percentual_bp, versao };
  return requisitar(`/api/v1/pedidos/${pedidoId}/comissao`, { metodo: 'PUT', corpo });
}

export function apurarComissoes({ empresa_id = '', competencia = '' } = {}) {
  const corpo = {};
  if (empresa_id) corpo.empresa_id = empresa_id;
  if (competencia) corpo.competencia = competencia;
  return requisitar(`${CAMINHO}/apurar`, { metodo: 'POST', corpo });
}

export function listarPendenciasComissao({ pagina = 1, tamanho = 20, empresa = '', competencia = '', sinal } = {}) {
  return requisitar(`${CAMINHO}/pendencias${montarConsulta({ pagina, tamanho, empresa, competencia })}`, { sinal });
}

export function listarComissoes({
  pagina = 1,
  tamanho = 20,
  empresa = '',
  representante = '',
  pedido = '',
  competencia = '',
  aberta = '',
  sinal,
} = {}) {
  const consulta = montarConsulta({
    pagina,
    tamanho,
    empresa,
    representante,
    pedido,
    competencia,
    aberta: booleanoOpcional(aberta),
  });
  return requisitar(`${CAMINHO}${consulta}`, { sinal });
}

export function criarAjusteComissao(dados) {
  return requisitar(`${CAMINHO}/ajustes`, { metodo: 'POST', corpo: dados });
}

export function listarAjustesComissao({
  pagina = 1,
  tamanho = 20,
  empresa = '',
  representante = '',
  pedido = '',
  competencia = '',
  aberto = '',
  sinal,
} = {}) {
  const consulta = montarConsulta({
    pagina,
    tamanho,
    empresa,
    representante,
    pedido,
    competencia,
    aberto: booleanoOpcional(aberto),
  });
  return requisitar(`${CAMINHO}/ajustes${consulta}`, { sinal });
}

export function fecharComissoes({ empresa_id, competencia, categoria_financeira_id, representante_id = null }) {
  return requisitar(`${CAMINHO}/fechamentos`, {
    metodo: 'POST',
    corpo: { empresa_id, competencia, categoria_financeira_id, representante_id },
  });
}

export function listarFechamentosComissao({
  pagina = 1,
  tamanho = 20,
  empresa = '',
  representante = '',
  competencia = '',
  sinal,
} = {}) {
  return requisitar(
    `${CAMINHO}/fechamentos${montarConsulta({ pagina, tamanho, empresa, representante, competencia })}`,
    { sinal }
  );
}

export function obterFechamentoComissao(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/fechamentos/${id}`, { sinal });
}

export function obterResumoComissoes({ competencia, empresa = '', representante = '', sinal } = {}) {
  return requisitar(`${CAMINHO}/resumo${montarConsulta({ competencia, empresa, representante })}`, { sinal });
}
