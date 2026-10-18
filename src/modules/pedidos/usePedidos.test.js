import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as pedidosService from '../../services/pedidos';
import { TAMANHO_PAGINA, usePedidos } from './usePedidos';

function lista(total) {
  return Array.from({ length: total }, (_, i) => ({ id: `ped-${i + 1}`, numero: i + 1 }));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('usePedidos', () => {
  it('carrega a primeira página e indica se há próxima', async () => {
    const listar = vi.spyOn(pedidosService, 'listarPedidos').mockResolvedValue({ dados: lista(TAMANHO_PAGINA + 1) });

    const { result } = renderHook(() => usePedidos());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.pedidos).toHaveLength(TAMANHO_PAGINA);
    expect(result.current.temProxima).toBe(true);
    expect(listar).toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 1, tamanho: TAMANHO_PAGINA + 1, empresa: '', status: '', modelo: '', numero: '' })
    );
  });

  it('filtra voltando para a página 1', async () => {
    const listar = vi.spyOn(pedidosService, 'listarPedidos').mockResolvedValue({ dados: lista(TAMANHO_PAGINA + 1) });
    const { result } = renderHook(() => usePedidos());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.filtrar({ empresa: 'emp-1', status: 'confirmado', modelo: 'importacao', numero: '12' }));

    await waitFor(() =>
      expect(listar).toHaveBeenLastCalledWith(
        expect.objectContaining({ pagina: 1, empresa: 'emp-1', status: 'confirmado', modelo: 'importacao', numero: '12' })
      )
    );
  });

  it('mostra o erro preso à chave e limpa no retry', async () => {
    vi.spyOn(pedidosService, 'listarPedidos')
      .mockRejectedValueOnce(new Error('falha de rede'))
      .mockResolvedValue({ dados: lista(2) });

    const { result } = renderHook(() => usePedidos());

    await waitFor(() => expect(result.current.erro).toBe('falha de rede'));
    act(() => result.current.recarregar());

    await waitFor(() => expect(result.current.pedidos).toHaveLength(2));
    expect(result.current.erro).toBeNull();
  });

  it('cria e atualiza recarregando a lista', async () => {
    const listar = vi.spyOn(pedidosService, 'listarPedidos').mockResolvedValue({ dados: lista(1) });
    const criar = vi.spyOn(pedidosService, 'criarPedido').mockResolvedValue({ dados: { id: 'ped-9' } });
    const atualizar = vi.spyOn(pedidosService, 'atualizarPedido').mockResolvedValue({});
    const { result } = renderHook(() => usePedidos());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.criar({ cliente_id: 'cli-1' }));
    await act(() => result.current.atualizar('ped-1', { cliente_id: 'cli-2', versao: 2 }));

    expect(criar).toHaveBeenCalledWith({ cliente_id: 'cli-1' });
    expect(atualizar).toHaveBeenCalledWith('ped-1', { cliente_id: 'cli-2', versao: 2 });
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(3));
  });
});
