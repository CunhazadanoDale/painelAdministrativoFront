import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useNomesPorId } from './useNomesPorId';

const CATALOGO = { 'cli-1': 'Construtora Águia', 'cli-2': 'Loja do João', 'cli-3': 'Obra Alfa' };

function obterFalso() {
  return vi.fn(async (id) => {
    if (!CATALOGO[id]) throw new Error('não encontrado');
    return { dados: { id, nome: CATALOGO[id] } };
  });
}

describe('useNomesPorId', () => {
  it('busca cada id uma vez, sem repetir, e devolve o nome ou travessão', async () => {
    const obter = obterFalso();

    const { result } = renderHook(() => useNomesPorId(['cli-1', 'cli-2', 'cli-1', null], obter));

    await waitFor(() => expect(result.current('cli-2')).toBe('Loja do João'));
    expect(result.current('cli-1')).toBe('Construtora Águia');
    expect(result.current(null)).toBe('—');
    expect(obter).toHaveBeenCalledTimes(2);
    expect(obter).toHaveBeenCalledWith('cli-1', { sinal: expect.anything() });
  });

  it('busca só os ids novos quando a lista muda e ignora o que falhou', async () => {
    const obter = obterFalso();
    const { result, rerender } = renderHook(({ ids }) => useNomesPorId(ids, obter), {
      initialProps: { ids: ['cli-1'] },
    });
    await waitFor(() => expect(result.current('cli-1')).toBe('Construtora Águia'));

    rerender({ ids: ['cli-1', 'cli-3', 'cli-x'] });

    await waitFor(() => expect(result.current('cli-3')).toBe('Obra Alfa'));
    expect(result.current('cli-x')).toBe('—');
    expect(obter).toHaveBeenCalledTimes(3);
  });

  it('usa o extrator de nome informado', async () => {
    const obter = vi.fn(async (id) => ({ dados: { id, razao: `Razão ${id}` } }));

    const { result } = renderHook(() => useNomesPorId(['a'], obter, (item) => item.razao));

    await waitFor(() => expect(result.current('a')).toBe('Razão a'));
  });

  it('busca de novo o id cuja busca foi abortada quando a lista mudou no meio', async () => {
    let liberar;
    const obter = vi
      .fn()
      .mockImplementationOnce((id, { sinal }) => new Promise((_, rejeitar) => {
        liberar = () => rejeitar(Object.assign(new Error('abortado'), { name: 'AbortError' }));
        sinal.addEventListener('abort', () => liberar());
      }))
      .mockImplementation(async (id) => ({ dados: { id, nome: CATALOGO[id] } }));
    const { result, rerender } = renderHook(({ ids }) => useNomesPorId(ids, obter), {
      initialProps: { ids: ['cli-1'] },
    });

    rerender({ ids: ['cli-1', 'cli-2'] });

    await waitFor(() => expect(result.current('cli-1')).toBe('Construtora Águia'));
    expect(result.current('cli-2')).toBe('Loja do João');
  });
});
