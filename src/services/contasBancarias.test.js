import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ativarContaBancaria,
  atualizarContaBancaria,
  criarContaBancaria,
  desativarContaBancaria,
  listarBancos,
  listarContasBancarias,
  listarTodasContasBancarias,
  obterContaBancaria,
  removerContaBancaria,
} from './contasBancarias';

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

const NOVA = {
  empresa_id: 'emp-1',
  banco: '748',
  tipo: 'corrente',
  agencia: '0812',
  conta: '54321-0',
  apelido: 'Sicredi movimento',
};

describe('services de contas bancárias', () => {
  it('lista a página com os filtros e o sinal', async () => {
    const controle = new AbortController();

    await listarContasBancarias({
      pagina: 2,
      tamanho: 21,
      empresa: 'emp-1',
      banco: '748',
      tipo: 'poupanca',
      ativa: false,
      sinal: controle.signal,
    });

    const chamada = ultimaChamada();
    expect(chamada.url).toContain('/api/v1/contas-bancarias?');
    const consulta = new URL(chamada.url, 'http://local').searchParams;
    expect(consulta.get('pagina')).toBe('2');
    expect(consulta.get('tamanho')).toBe('21');
    expect(consulta.get('empresa')).toBe('emp-1');
    expect(consulta.get('banco')).toBe('748');
    expect(consulta.get('tipo')).toBe('poupanca');
    expect(consulta.get('ativa')).toBe('false');
    expect(chamada.sinal).toBe(controle.signal);
  });

  it('omite os filtros vazios', async () => {
    await listarContasBancarias();

    const consulta = new URL(ultimaChamada().url, 'http://local').searchParams;
    expect(consulta.has('empresa')).toBe(false);
    expect(consulta.has('banco')).toBe(false);
    expect(consulta.has('tipo')).toBe(false);
    expect(consulta.has('ativa')).toBe(false);
  });

  it('obtém uma conta com o sinal', async () => {
    const controle = new AbortController();

    await obterContaBancaria('cb-1', { sinal: controle.signal });

    const chamada = ultimaChamada();
    expect(chamada.url).toMatch(/\/api\/v1\/contas-bancarias\/cb-1$/);
    expect(chamada.sinal).toBe(controle.signal);
  });

  it('cria com o corpo inteiro', async () => {
    await criarContaBancaria(NOVA);

    const chamada = ultimaChamada();
    expect(chamada.metodo).toBe('POST');
    expect(chamada.url).toMatch(/\/api\/v1\/contas-bancarias$/);
    expect(chamada.corpo).toEqual(NOVA);
  });

  it('altera só o apelido com a versão', async () => {
    await atualizarContaBancaria('cb-1', { ...NOVA, apelido: 'Movimento', versao: 3 });

    const chamada = ultimaChamada();
    expect(chamada.metodo).toBe('PUT');
    expect(chamada.url).toMatch(/\/api\/v1\/contas-bancarias\/cb-1$/);
    expect(chamada.corpo).toEqual({ apelido: 'Movimento', versao: 3 });
  });

  it('ativa e desativa enviando a versão', async () => {
    await ativarContaBancaria('cb-1', 4);
    expect(ultimaChamada()).toMatchObject({ metodo: 'PATCH', corpo: { versao: 4 } });
    expect(ultimaChamada().url).toMatch(/\/contas-bancarias\/cb-1\/ativar$/);

    await desativarContaBancaria('cb-1', 5);
    expect(ultimaChamada()).toMatchObject({ metodo: 'PATCH', corpo: { versao: 5 } });
    expect(ultimaChamada().url).toMatch(/\/contas-bancarias\/cb-1\/desativar$/);
  });

  it('exclui pelo id', async () => {
    await removerContaBancaria('cb-1');

    const chamada = ultimaChamada();
    expect(chamada.metodo).toBe('DELETE');
    expect(chamada.url).toMatch(/\/api\/v1\/contas-bancarias\/cb-1$/);
  });

  it('lista o catálogo de bancos com o sinal', async () => {
    const controle = new AbortController();

    await listarBancos({ sinal: controle.signal });

    const chamada = ultimaChamada();
    expect(chamada.url).toMatch(/\/api\/v1\/bancos$/);
    expect(chamada.sinal).toBe(controle.signal);
  });

  it('lista todas as contas ativas da empresa sem o corte de 100', async () => {
    const controle = new AbortController();
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify({ dados: [] }) });

    await listarTodasContasBancarias({ empresa: 'emp-1', ativa: true, sinal: controle.signal });

    const consulta = new URL(ultimaChamada().url, 'http://local').searchParams;
    expect(ultimaChamada().url).toContain('/api/v1/contas-bancarias?');
    expect(consulta.get('empresa')).toBe('emp-1');
    expect(consulta.get('ativa')).toBe('true');
    expect(consulta.get('tamanho')).toBe('100');
    expect(ultimaChamada().sinal).toBe(controle.signal);
  });
});
