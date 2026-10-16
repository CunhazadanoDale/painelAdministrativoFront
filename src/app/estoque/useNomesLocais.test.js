import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as locaisService from '../../services/locais';
import { useNomesLocais } from './useNomesLocais';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useNomesLocais', () => {
  it('traduz o id do local no nome, inclusive dos inativos, e usa travessão para o desconhecido', async () => {
    const listar = vi.spyOn(locaisService, 'listarTodosLocais').mockResolvedValue([
      { id: 'loc-1', nome: 'Galpão Cabedelo', ativo: true },
      { id: 'loc-2', nome: 'Loja antiga', ativo: false },
    ]);

    const { result } = renderHook(() => useNomesLocais());

    await waitFor(() => expect(result.current('loc-1')).toBe('Galpão Cabedelo'));
    expect(result.current('loc-2')).toBe('Loja antiga');
    expect(result.current('loc-x')).toBe('—');
    expect(result.current(null)).toBe('—');
    expect(listar).toHaveBeenCalledWith(expect.objectContaining({ sinal: expect.anything() }));
    expect(listar.mock.calls[0][0]).not.toHaveProperty('ativos', true);
  });

  it('fica com o travessão quando a lista falha', async () => {
    vi.spyOn(locaisService, 'listarTodosLocais').mockRejectedValue(new Error('falha'));

    const { result } = renderHook(() => useNomesLocais());

    await waitFor(() => expect(locaisService.listarTodosLocais).toHaveBeenCalled());
    expect(result.current('loc-1')).toBe('—');
  });
});
