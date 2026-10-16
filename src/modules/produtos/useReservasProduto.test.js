import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as produtosService from '../../services/produtos';
import { TAMANHO_PAGINA_RESERVAS, useReservasProduto } from './useReservasProduto';

function reserva(indice) {
  return { id: `res-${indice}`, local_id: 'loc-1', quantidade: 1, status: 'ativa' };
}

function lista(total) {
  return Array.from({ length: total }, (_, i) => reserva(i + 1));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useReservasProduto', () => {
  it('carrega as reservas ativas da primeira página com o sinal', async () => {
    const listar = vi
      .spyOn(produtosService, 'listarReservas')
      .mockResolvedValue({ dados: lista(TAMANHO_PAGINA_RESERVAS + 1) });

    const { result } = renderHook(() => useReservasProduto('prod-1', 0));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.reservas).toHaveLength(TAMANHO_PAGINA_RESERVAS);
    expect(result.current.temProxima).toBe(true);
    expect(listar).toHaveBeenCalledWith(
      'prod-1',
      expect.objectContaining({ pagina: 1, tamanho: TAMANHO_PAGINA_RESERVAS + 1, status: 'ativa', sinal: expect.anything() })
    );
  });

  it('troca o status voltando para a página 1 e busca de novo quando a geração muda', async () => {
    const listar = vi
      .spyOn(produtosService, 'listarReservas')
      .mockResolvedValue({ dados: lista(TAMANHO_PAGINA_RESERVAS + 1) });
    const { result, rerender } = renderHook(({ geracao }) => useReservasProduto('prod-1', geracao), {
      initialProps: { geracao: 0 },
    });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.filtrarStatus(''));

    await waitFor(() =>
      expect(listar).toHaveBeenLastCalledWith('prod-1', expect.objectContaining({ pagina: 1, status: '' }))
    );

    const chamadas = listar.mock.calls.length;
    rerender({ geracao: 1 });
    await waitFor(() => expect(listar.mock.calls.length).toBe(chamadas + 1));
  });

  it('mostra o erro preso à chave e limpa no retry', async () => {
    vi.spyOn(produtosService, 'listarReservas')
      .mockRejectedValueOnce(new Error('falha nas reservas'))
      .mockResolvedValue({ dados: lista(1) });

    const { result } = renderHook(() => useReservasProduto('prod-1', 0));

    await waitFor(() => expect(result.current.erro).toBe('falha nas reservas'));
    act(() => result.current.recarregar());

    await waitFor(() => expect(result.current.reservas).toHaveLength(1));
    expect(result.current.erro).toBeNull();
  });
});
