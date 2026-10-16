import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  liberarReserva,
  listarLotes,
  listarMovimentos,
  listarReservas,
  reservar,
  transferir,
} from './produtos';

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

describe('services de estoque do produto', () => {
  it('lista movimentos filtrando por tipo e local', async () => {
    await listarMovimentos('prod-1', { pagina: 2, tipo: 'saida', local: 'loc-1' });

    expect(ultimaChamada().url).toContain('/api/v1/produtos/prod-1/movimentos?');
    expect(consulta().get('tipo')).toBe('saida');
    expect(consulta().get('local')).toBe('loc-1');
  });

  it('lista os lotes com local, só com saldo e o sinal', async () => {
    const controle = new AbortController();

    await listarLotes('prod-1', { pagina: 1, tamanho: 21, local: 'loc-1', comSaldo: true, sinal: controle.signal });

    expect(ultimaChamada().url).toContain('/api/v1/produtos/prod-1/lotes?');
    expect(consulta().get('local')).toBe('loc-1');
    expect(consulta().get('com_saldo')).toBe('true');
    expect(consulta().get('tamanho')).toBe('21');
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await listarLotes('prod-1');
    expect(consulta().has('local')).toBe(false);
    expect(consulta().has('com_saldo')).toBe(false);
  });

  it('transfere entre locais com o corpo inteiro', async () => {
    const corpo = {
      local_origem_id: 'loc-1',
      local_destino_id: 'loc-2',
      quantidade: 4,
      documento_ref: 'ROM-12',
      observacao: 'abastecer a loja',
    };

    await transferir('prod-1', corpo);

    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/produtos\/prod-1\/transferencias$/);
  });

  it('reserva no local', async () => {
    await reservar('prod-1', { local_id: 'loc-1', quantidade: 3, observacao: 'pedido 123' });

    expect(ultimaChamada()).toMatchObject({
      metodo: 'POST',
      corpo: { local_id: 'loc-1', quantidade: 3, observacao: 'pedido 123' },
    });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/produtos\/prod-1\/reservas$/);
  });

  it('lista as reservas com status, local e o sinal', async () => {
    const controle = new AbortController();

    await listarReservas('prod-1', { pagina: 2, status: 'ativa', local: 'loc-1', sinal: controle.signal });

    expect(ultimaChamada().url).toContain('/api/v1/produtos/prod-1/reservas?');
    expect(consulta().get('pagina')).toBe('2');
    expect(consulta().get('status')).toBe('ativa');
    expect(consulta().get('local')).toBe('loc-1');
    expect(ultimaChamada().sinal).toBe(controle.signal);
  });

  it('libera a reserva pelo id dela', async () => {
    await liberarReserva('res-1');

    expect(ultimaChamada().metodo).toBe('POST');
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/reservas\/res-1\/liberar$/);
    expect(ultimaChamada().corpo).toBeUndefined();
  });
});
