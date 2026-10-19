import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listarModelosVenda, obterDocumentoProposta } from './pedidos';
import { excluirPreco, lancarPreco, listarHistoricoPrecos, listarPrecosVigentes } from './tabelaPrecos';

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
  return Object.fromEntries(new URL(ultimaChamada().url, 'http://local').searchParams);
}

describe('services da tabela de preços', () => {
  it('lança a vigência com observação opcional nula', async () => {
    await lancarPreco({ produto_id: 'prod-1', modelo: 'pronta_entrega', preco_centavos: 12000, vigente_de: '2026-11-01' });

    expect(ultimaChamada()).toMatchObject({
      url: expect.stringMatching(/\/api\/v1\/tabela-precos$/),
      metodo: 'POST',
      corpo: { produto_id: 'prod-1', modelo: 'pronta_entrega', preco_centavos: 12000, vigente_de: '2026-11-01', observacao: null },
    });
  });

  it('lista o histórico por produto e modelo com o sinal', async () => {
    const controle = new AbortController();

    await listarHistoricoPrecos({ pagina: 2, tamanho: 21, produto: 'prod-1', modelo: 'importacao', sinal: controle.signal });

    expect(ultimaChamada().url).toContain('/api/v1/tabela-precos?');
    expect(consulta()).toEqual({ pagina: '2', tamanho: '21', produto: 'prod-1', modelo: 'importacao' });
    expect(ultimaChamada().sinal).toBe(controle.signal);
  });

  it('lista os preços vigentes do modelo com data, produto e busca, omitindo os vazios', async () => {
    await listarPrecosVigentes({ modelo: 'pronta_entrega', busca: 'porc' });
    expect(ultimaChamada().url).toContain('/api/v1/tabela-precos/vigentes?');
    expect(consulta()).toEqual({ pagina: '1', tamanho: '20', modelo: 'pronta_entrega', busca: 'porc' });

    await listarPrecosVigentes({ modelo: 'importacao', data: '2026-11-05', produto: 'prod-1' });
    expect(consulta()).toMatchObject({ data: '2026-11-05', produto: 'prod-1' });
  });

  it('exclui a vigência futura', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204, text: async () => '' });

    await excluirPreco('tp-1');

    expect(ultimaChamada()).toMatchObject({ url: expect.stringMatching(/\/tabela-precos\/tp-1$/), metodo: 'DELETE' });
  });

  it('obtém o documento da proposta e os modelos de venda', async () => {
    await obterDocumentoProposta('ped-57');
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/pedidos\/ped-57\/proposta$/);

    await listarModelosVenda();
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/modelos-venda$/);
  });
});
