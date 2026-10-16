import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as produtosService from '../../services/produtos';
import { useSaldoProduto } from './useSaldoProduto';

const SALDO = { produto_id: 'prod-1', saldo: 14, reservado: 2, disponivel: 12, nao_alocado: 4, locais: [] };

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useSaldoProduto', () => {
  it('carrega o saldo do produto com o sinal', async () => {
    const obter = vi.spyOn(produtosService, 'obterSaldo').mockResolvedValue({ dados: SALDO });

    const { result } = renderHook(() => useSaldoProduto('prod-1', 0));

    await waitFor(() => expect(result.current.saldo).toEqual(SALDO));
    expect(result.current.carregando).toBe(false);
    expect(obter).toHaveBeenCalledWith('prod-1', { sinal: expect.anything() });
  });

  it('busca de novo quando a geração do detalhe muda', async () => {
    const obter = vi.spyOn(produtosService, 'obterSaldo').mockResolvedValue({ dados: SALDO });
    const { rerender, result } = renderHook(({ geracao }) => useSaldoProduto('prod-1', geracao), {
      initialProps: { geracao: 0 },
    });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    rerender({ geracao: 1 });

    await waitFor(() => expect(obter).toHaveBeenCalledTimes(2));
  });

  it('mostra o erro preso à chave e limpa no retry', async () => {
    vi.spyOn(produtosService, 'obterSaldo')
      .mockRejectedValueOnce(new Error('falha no saldo'))
      .mockResolvedValue({ dados: SALDO });

    const { result } = renderHook(() => useSaldoProduto('prod-1', 0));

    await waitFor(() => expect(result.current.erro).toBe('falha no saldo'));
    act(() => result.current.recarregar());

    await waitFor(() => expect(result.current.saldo).toEqual(SALDO));
    expect(result.current.erro).toBeNull();
  });
});
