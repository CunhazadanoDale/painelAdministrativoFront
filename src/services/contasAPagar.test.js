import { beforeEach, describe, expect, it, vi } from 'vitest';

import { obterResumoContasAPagar } from './contasAPagar';
import {
  ativarDespesaRecorrente,
  atualizarDespesaRecorrente,
  criarDespesaRecorrente,
  desativarDespesaRecorrente,
  gerarCompetencia,
  listarDespesasRecorrentes,
  obterDespesaRecorrente,
  removerDespesaRecorrente,
} from './despesasRecorrentes';
import {
  adiar,
  aprovar,
  atualizarSolicitacao,
  classificar,
  estornarPagamento,
  listarPagamentos,
  listarSolicitacoes,
  obterPendencias,
} from './solicitacoes';

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ dados: {} }),
  }));
  vi.stubGlobal('fetch', fetchMock);
});

function ultimaChamada() {
  const [url, opcoes] = fetchMock.mock.calls.at(-1);
  return {
    url: String(url),
    metodo: opcoes.method,
    corpo: opcoes.body ? JSON.parse(opcoes.body) : undefined,
    sinal: opcoes.signal,
  };
}

function consulta() {
  return new URL(ultimaChamada().url, 'http://local').searchParams;
}

describe('services de solicitação no M7', () => {
  it('lista com os filtros de conta a pagar, omitindo os vazios', async () => {
    await listarSolicitacoes({
      escopo: 'financeiro',
      fornecedor: 'for-1',
      categoria: 'cat-1',
      competencia: '2026-10',
      origem: 'recorrencia',
      vencimento_de: '2026-10-01',
      vencimento_ate: '2026-10-31',
      vencidas: true,
    });

    expect(Object.fromEntries(consulta())).toMatchObject({
      escopo: 'financeiro',
      fornecedor: 'for-1',
      categoria: 'cat-1',
      competencia: '2026-10',
      origem: 'recorrencia',
      vencimento_de: '2026-10-01',
      vencimento_ate: '2026-10-31',
      vencidas: 'true',
    });

    await listarSolicitacoes();
    expect(consulta().has('vencidas')).toBe(false);
    expect(consulta().has('fornecedor')).toBe(false);
  });

  it('edita sem empresa nem anexos, com a versão', async () => {
    await atualizarSolicitacao('sol-1', {
      empresa_id: 'emp-1',
      arquivo_ids: ['arq-1'],
      valor_centavos: 64000,
      prazo_pagamento: '2026-10-24',
      versao: 1,
    });

    expect(ultimaChamada().metodo).toBe('PUT');
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/solicitacoes\/sol-1$/);
    expect(ultimaChamada().corpo).toEqual({ valor_centavos: 64000, prazo_pagamento: '2026-10-24', versao: 1 });
  });

  it('classifica, adia e estorna com a versão', async () => {
    await classificar('sol-1', { fornecedor_id: null, categoria_financeira_id: 'cat-1', competencia: '2026-09', versao: 2 });
    expect(ultimaChamada()).toMatchObject({
      metodo: 'PATCH',
      corpo: { fornecedor_id: null, categoria_financeira_id: 'cat-1', competencia: '2026-09', versao: 2 },
    });
    expect(ultimaChamada().url).toMatch(/\/solicitacoes\/sol-1\/classificacao$/);

    await adiar('sol-1', { vencimento: '2026-11-13', motivo: 'novo prazo', versao: 3 });
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: { vencimento: '2026-11-13', motivo: 'novo prazo', versao: 3 } });
    expect(ultimaChamada().url).toMatch(/\/solicitacoes\/sol-1\/adiar$/);

    await estornarPagamento('sol-1', { motivo: 'duplicidade', estornado_em: '2026-10-16T12:00:00.000Z', versao: 4 });
    expect(ultimaChamada()).toMatchObject({
      metodo: 'POST',
      corpo: { motivo: 'duplicidade', estornado_em: '2026-10-16T12:00:00.000Z', versao: 4 },
    });
    expect(ultimaChamada().url).toMatch(/\/solicitacoes\/sol-1\/pagamento\/estorno$/);
  });

  it('aprova com a versão vista e sem ela mantém o corpo vazio', async () => {
    await aprovar('sol-1', 3);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: { versao: 3 } });

    await aprovar('sol-1');
    expect(ultimaChamada().corpo).toEqual({});
  });

  it('lista os pagamentos e obtém os contadores com o sinal', async () => {
    const controle = new AbortController();

    await listarPagamentos('sol-1', { sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/solicitacoes\/sol-1\/pagamentos$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await obterPendencias({ sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/solicitacoes\/pendencias$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);
  });
});

describe('services de despesas recorrentes', () => {
  const RECORRENTE = {
    empresa_id: 'emp-1',
    fornecedor_id: null,
    categoria_financeira_id: 'cat-1',
    descricao: 'Aluguel do galpão',
    valor_centavos: 420000,
    estimado: false,
    forma_pagamento: 'transferencia',
    dia_vencimento: 10,
    vencimento_mes_seguinte: false,
    inicio: '2026-01',
    fim: null,
  };

  it('lista com filtros e o sinal, e obtém uma', async () => {
    const controle = new AbortController();

    await listarDespesasRecorrentes({ pagina: 2, tamanho: 21, empresa: 'emp-1', ativa: true, fornecedor: 'for-1', sinal: controle.signal });
    expect(ultimaChamada().url).toContain('/api/v1/despesas-recorrentes?');
    expect(consulta().get('ativa')).toBe('true');
    expect(consulta().get('fornecedor')).toBe('for-1');
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await obterDespesaRecorrente('rec-1', { sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/despesas-recorrentes\/rec-1$/);
  });

  it('cria com a empresa e altera sem ela, com a versão', async () => {
    await criarDespesaRecorrente(RECORRENTE);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: RECORRENTE });

    await atualizarDespesaRecorrente('rec-1', { ...RECORRENTE, versao: 2 });
    expect(ultimaChamada().metodo).toBe('PUT');
    expect(ultimaChamada().corpo).not.toHaveProperty('empresa_id');
    expect(ultimaChamada().corpo).toMatchObject({ descricao: 'Aluguel do galpão', versao: 2 });
  });

  it('ativa, desativa, exclui e gera a competência', async () => {
    await ativarDespesaRecorrente('rec-1', 3);
    expect(ultimaChamada()).toMatchObject({ metodo: 'PATCH', corpo: { versao: 3 } });
    expect(ultimaChamada().url).toMatch(/\/despesas-recorrentes\/rec-1\/ativar$/);

    await desativarDespesaRecorrente('rec-1', 4);
    expect(ultimaChamada().url).toMatch(/\/despesas-recorrentes\/rec-1\/desativar$/);

    await removerDespesaRecorrente('rec-1');
    expect(ultimaChamada().metodo).toBe('DELETE');

    await gerarCompetencia({ competencia: '2026-11', empresa: 'emp-1' });
    expect(ultimaChamada().metodo).toBe('POST');
    expect(ultimaChamada().url).toContain('/api/v1/despesas-recorrentes/gerar?');
    expect(consulta().get('competencia')).toBe('2026-11');
    expect(consulta().get('empresa')).toBe('emp-1');
  });
});

describe('resumo de contas a pagar', () => {
  it('obtém o resumo com o período, a empresa e o sinal', async () => {
    const controle = new AbortController();

    await obterResumoContasAPagar({ de: '2026-10-12', ate: '2026-12-06', empresa: 'emp-1', sinal: controle.signal });

    expect(ultimaChamada().url).toContain('/api/v1/contas-a-pagar/resumo?');
    expect(Object.fromEntries(consulta())).toEqual({ de: '2026-10-12', ate: '2026-12-06', empresa: 'emp-1' });
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await obterResumoContasAPagar();
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/contas-a-pagar\/resumo$/);
  });
});
