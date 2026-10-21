import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  atualizarDivida,
  atualizarParcelaDivida,
  cancelarDivida,
  criarDivida,
  gerarContasDividas,
  listarDividas,
  listarHistoricoDivida,
  obterDivida,
  obterResumoDividas,
  reabrirParcelaDivida,
  renegociarDivida,
} from './dividas';

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

const DIVIDA = {
  empresa_id: 'emp-1',
  fornecedor_id: 'for-1',
  credor_tipo: 'banco',
  descricao: 'Capital de giro',
  saldo_inicial_centavos: 300000,
  data_saldo: '2026-09-30',
  categoria_amortizacao_id: 'cat-a',
  categoria_juros_id: 'cat-j',
  parcelas: [{ vencimento: '2026-10-10', amortizacao_centavos: 300000, juros_centavos: 0 }],
};

describe('services de dívidas', () => {
  it('lista com todos os filtros e o sinal, omitindo os vazios', async () => {
    const controle = new AbortController();

    await listarDividas({
      pagina: 2,
      tamanho: 21,
      empresa: 'emp-1',
      fornecedor: 'for-1',
      credor_tipo: 'fisco',
      status: 'ativa',
      quitada: 'false',
      vencidas: 'true',
      sinal: controle.signal,
    });

    expect(ultimaChamada().url).toContain('/api/v1/dividas?');
    expect(Object.fromEntries(consulta())).toEqual({
      pagina: '2',
      tamanho: '21',
      empresa: 'emp-1',
      fornecedor: 'for-1',
      credor_tipo: 'fisco',
      status: 'ativa',
      quitada: 'false',
      vencidas: 'true',
    });
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await listarDividas();
    expect(Object.fromEntries(consulta())).toEqual({ pagina: '1', tamanho: '20' });
  });

  it('lê o detalhe, o histórico e o resumo com o sinal', async () => {
    const controle = new AbortController();

    await obterDivida('div-1', { sinal: controle.signal });
    expect(ultimaChamada()).toMatchObject({ metodo: 'GET', sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/dividas\/div-1$/);

    await listarHistoricoDivida('div-1', { sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/dividas\/div-1\/historico$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await obterResumoDividas({ empresa: 'emp-1', sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/dividas\/resumo\?empresa=emp-1$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await obterResumoDividas();
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/dividas\/resumo$/);
  });

  it('cria com o corpo inteiro', async () => {
    await criarDivida(DIVIDA);

    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: DIVIDA });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/dividas$/);
  });

  it('altera só os campos informativos, sem empresa, credor, saldo e cronograma', async () => {
    await atualizarDivida('div-1', { ...DIVIDA, versao: 3, contrato: 'CG-1' });

    const { corpo, metodo, url } = ultimaChamada();
    expect(metodo).toBe('PUT');
    expect(url).toMatch(/\/api\/v1\/dividas\/div-1$/);
    expect(corpo).toEqual({
      credor_tipo: 'banco',
      descricao: 'Capital de giro',
      categoria_amortizacao_id: 'cat-a',
      categoria_juros_id: 'cat-j',
      contrato: 'CG-1',
      versao: 3,
    });
  });

  it('altera a parcela prevista e reabre a parcela com a versão da dívida', async () => {
    await atualizarParcelaDivida('div-1', 'par-1', { versao: 2, vencimento: '2026-11-15', juros_centavos: 4100 });
    expect(ultimaChamada()).toMatchObject({
      metodo: 'PUT',
      corpo: { versao: 2, vencimento: '2026-11-15', juros_centavos: 4100 },
    });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/dividas\/div-1\/parcelas\/par-1$/);

    await reabrirParcelaDivida('div-1', 'par-1', 4);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: { versao: 4 } });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/dividas\/div-1\/parcelas\/par-1\/reabrir$/);
  });

  it('cancela com motivo e renegocia sem a empresa na dívida nova', async () => {
    await cancelarDivida('div-1', { versao: 1, motivo: 'duplicada' });
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: { versao: 1, motivo: 'duplicada' } });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/dividas\/div-1\/cancelar$/);

    await renegociarDivida('div-1', { versao: 3, motivo: 'acordo', nova: DIVIDA });
    const { corpo, url } = ultimaChamada();
    expect(url).toMatch(/\/api\/v1\/dividas\/div-1\/renegociar$/);
    expect(corpo.versao).toBe(3);
    expect(corpo.motivo).toBe('acordo');
    expect(corpo.nova).not.toHaveProperty('empresa_id');
    expect(corpo.nova).toMatchObject({ fornecedor_id: 'for-1', saldo_inicial_centavos: 300000 });
  });

  it('gera as contas da competência com a empresa opcional', async () => {
    await gerarContasDividas({ competencia: '2026-11', empresa: 'emp-1' });
    expect(ultimaChamada().metodo).toBe('POST');
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/dividas\/gerar\?/);
    expect(Object.fromEntries(consulta())).toEqual({ competencia: '2026-11', empresa: 'emp-1' });

    await gerarContasDividas({ competencia: '2026-12' });
    expect(Object.fromEntries(consulta())).toEqual({ competencia: '2026-12' });
  });
});
