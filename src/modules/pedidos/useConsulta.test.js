import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TAMANHO_PAGINA_CONSULTA, useConsulta } from './useConsulta';

function lista(total) {
  return Array.from({ length: total }, (_, i) => ({ id: `l-${i}` }));
}

describe('useConsulta', () => {
  it('carrega com os filtros iniciais e o sinal, e indica se há próxima', async () => {
    const listar = vi.fn().mockResolvedValue({ dados: lista(TAMANHO_PAGINA_CONSULTA + 1) });

    const { result } = renderHook(() => useConsulta(listar, { empresa: '', dias: 30 }));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.itens).toHaveLength(TAMANHO_PAGINA_CONSULTA);
    expect(result.current.temProxima).toBe(true);
    expect(listar).toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 1, tamanho: TAMANHO_PAGINA_CONSULTA + 1, empresa: '', dias: 30, sinal: expect.anything() })
    );
  });

  it('filtra voltando para a página 1 e cancela a busca anterior', async () => {
    const listar = vi.fn().mockResolvedValue({ dados: lista(TAMANHO_PAGINA_CONSULTA + 1) });
    const { result } = renderHook(() => useConsulta(listar, { empresa: '' }));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.filtrar({ empresa: 'emp-1' }));

    await waitFor(() => expect(listar).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1, empresa: 'emp-1' })));
    expect(listar.mock.calls[0][0].sinal.aborted).toBe(true);
  });

  it('mostra o erro preso à chave e limpa no retry', async () => {
    const listar = vi.fn().mockRejectedValueOnce(new Error('de depois de ate')).mockResolvedValue({ dados: lista(1) });

    const { result } = renderHook(() => useConsulta(listar, {}));

    await waitFor(() => expect(result.current.erro).toBe('de depois de ate'));
    act(() => result.current.recarregar());
    await waitFor(() => expect(result.current.itens).toHaveLength(1));
    expect(result.current.erro).toBeNull();
  });
});
