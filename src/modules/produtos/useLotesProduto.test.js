import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as produtosService from '../../services/produtos';
import { TAMANHO_PAGINA_LOTES, useLotesProduto } from './useLotesProduto';

function lote(indice) {
  return { id: `lote-${indice}`, local_id: 'loc-1', quantidade_inicial: 5, quantidade_atual: 5 };
}

function lista(total) {
  return Array.from({ length: total }, (_, i) => lote(i + 1));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useLotesProduto', () => {
  it('carrega só os lotes com saldo da primeira página com o sinal', async () => {
    const listar = vi.spyOn(produtosService, 'listarLotes').mockResolvedValue({ dados: lista(TAMANHO_PAGINA_LOTES + 1) });

    const { result } = renderHook(() => useLotesProduto('prod-1', 0));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.lotes).toHaveLength(TAMANHO_PAGINA_LOTES);
    expect(result.current.temProxima).toBe(true);
    expect(listar).toHaveBeenCalledWith(
      'prod-1',
      expect.objectContaining({ pagina: 1, tamanho: TAMANHO_PAGINA_LOTES + 1, comSaldo: true, sinal: expect.anything() })
    );
  });

  it('mostra também os esgotados voltando para a página 1 e busca de novo quando a geração muda', async () => {
    const listar = vi.spyOn(produtosService, 'listarLotes').mockResolvedValue({ dados: lista(TAMANHO_PAGINA_LOTES + 1) });
    const { result, rerender } = renderHook(({ geracao }) => useLotesProduto('prod-1', geracao), {
      initialProps: { geracao: 0 },
    });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.mostrarSoComSaldo(false));

    await waitFor(() =>
      expect(listar).toHaveBeenLastCalledWith('prod-1', expect.objectContaining({ pagina: 1, comSaldo: false }))
    );

    const chamadas = listar.mock.calls.length;
    rerender({ geracao: 1 });
    await waitFor(() => expect(listar.mock.calls.length).toBe(chamadas + 1));
  });

  it('mostra o erro preso à chave e limpa no retry', async () => {
    vi.spyOn(produtosService, 'listarLotes')
      .mockRejectedValueOnce(new Error('falha nos lotes'))
      .mockResolvedValue({ dados: lista(1) });

    const { result } = renderHook(() => useLotesProduto('prod-1', 0));

    await waitFor(() => expect(result.current.erro).toBe('falha nos lotes'));
    act(() => result.current.recarregar());

    await waitFor(() => expect(result.current.lotes).toHaveLength(1));
    expect(result.current.erro).toBeNull();
  });
});
