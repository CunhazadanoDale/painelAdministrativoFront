import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ativarLocal,
  criarLocal,
  desativarLocal,
  listarLocais,
  listarSaldosDoLocal,
  obterLocal,
  removerLocal,
  renomearLocal,
} from './locais';

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

describe('services de locais de estoque', () => {
  it('lista a página com empresa, situação e o sinal', async () => {
    const controle = new AbortController();

    await listarLocais({ pagina: 2, tamanho: 21, empresa: 'emp-1', ativos: false, sinal: controle.signal });

    expect(ultimaChamada().url).toContain('/api/v1/estoque/locais?');
    expect(consulta().get('pagina')).toBe('2');
    expect(consulta().get('tamanho')).toBe('21');
    expect(consulta().get('empresa')).toBe('emp-1');
    expect(consulta().get('ativos')).toBe('false');
    expect(ultimaChamada().sinal).toBe(controle.signal);
  });

  it('omite os filtros vazios', async () => {
    await listarLocais();

    expect(consulta().has('empresa')).toBe(false);
    expect(consulta().has('ativos')).toBe(false);
  });

  it('obtém um local com o sinal', async () => {
    const controle = new AbortController();

    await obterLocal('loc-1', { sinal: controle.signal });

    expect(ultimaChamada().url).toMatch(/\/api\/v1\/estoque\/locais\/loc-1$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);
  });

  it('cria com empresa e nome', async () => {
    await criarLocal({ empresa_id: 'emp-1', nome: 'Galpão Cabedelo' });

    expect(ultimaChamada()).toMatchObject({
      metodo: 'POST',
      corpo: { empresa_id: 'emp-1', nome: 'Galpão Cabedelo' },
    });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/estoque\/locais$/);
  });

  it('renomeia mandando só o nome', async () => {
    await renomearLocal('loc-1', 'Loja João Pessoa');

    expect(ultimaChamada()).toMatchObject({ metodo: 'PUT', corpo: { nome: 'Loja João Pessoa' } });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/estoque\/locais\/loc-1$/);
  });

  it('ativa, desativa e exclui pelo id', async () => {
    await ativarLocal('loc-1');
    expect(ultimaChamada().metodo).toBe('PATCH');
    expect(ultimaChamada().url).toMatch(/\/estoque\/locais\/loc-1\/ativar$/);

    await desativarLocal('loc-1');
    expect(ultimaChamada().metodo).toBe('PATCH');
    expect(ultimaChamada().url).toMatch(/\/estoque\/locais\/loc-1\/desativar$/);

    await removerLocal('loc-1');
    expect(ultimaChamada().metodo).toBe('DELETE');
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/estoque\/locais\/loc-1$/);
  });

  it('lista os saldos do local paginados, só com saldo e com o sinal', async () => {
    const controle = new AbortController();

    await listarSaldosDoLocal('loc-1', { pagina: 3, tamanho: 21, comSaldo: true, sinal: controle.signal });

    expect(ultimaChamada().url).toContain('/api/v1/estoque/locais/loc-1/saldos?');
    expect(consulta().get('pagina')).toBe('3');
    expect(consulta().get('com_saldo')).toBe('true');
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await listarSaldosDoLocal('loc-1');
    expect(consulta().has('com_saldo')).toBe(false);
  });
});
