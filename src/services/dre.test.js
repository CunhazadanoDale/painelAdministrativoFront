import { beforeEach, describe, expect, it, vi } from 'vitest';

import { obterFaturamento, obterRelatorioSemanal, obterResumoDre } from './dre';

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
  return { url: String(url), metodo: opcoes.method, sinal: opcoes.signal };
}

function consulta() {
  return Object.fromEntries(new URL(ultimaChamada().url, 'http://local').searchParams);
}

describe('services da DRE', () => {
  it('lê o resumo com período, empresa e sinal, omitindo os vazios', async () => {
    const controle = new AbortController();

    await obterResumoDre({ de: '2026-01', ate: '2026-10', empresa: 'emp-1', sinal: controle.signal });
    expect(ultimaChamada()).toMatchObject({ metodo: 'GET', sinal: controle.signal });
    expect(ultimaChamada().url).toContain('/api/v1/dre/resumo?');
    expect(consulta()).toEqual({ de: '2026-01', ate: '2026-10', empresa: 'emp-1' });

    await obterResumoDre();
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/dre\/resumo$/);
  });

  it('lê o faturamento com período e empresa', async () => {
    const controle = new AbortController();

    await obterFaturamento({ de: '2021-11', ate: '2026-10', empresa: '', sinal: controle.signal });
    expect(ultimaChamada().url).toContain('/api/v1/dre/faturamento?');
    expect(consulta()).toEqual({ de: '2021-11', ate: '2026-10' });
    expect(ultimaChamada().sinal).toBe(controle.signal);
  });

  it('lê o relatório semanal pela semana e empresa', async () => {
    const controle = new AbortController();

    await obterRelatorioSemanal({ semana: '2026-10-14', empresa: 'emp-1', sinal: controle.signal });
    expect(ultimaChamada().url).toContain('/api/v1/dre/relatorio-semanal?');
    expect(consulta()).toEqual({ semana: '2026-10-14', empresa: 'emp-1' });
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await obterRelatorioSemanal();
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/dre\/relatorio-semanal$/);
  });
});
