import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as locaisService from '../../services/locais';
import { TAMANHO_PAGINA, useLocais } from './useLocais';

function local(indice, ativo = true) {
  return { id: `loc-${indice}`, nome: `Local ${indice}`, empresa_id: 'emp-1', ativo };
}

function lista(total) {
  return Array.from({ length: total }, (_, i) => local(i + 1));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useLocais', () => {
  it('carrega a primeira página e indica se há próxima', async () => {
    const listar = vi.spyOn(locaisService, 'listarLocais').mockResolvedValue({ dados: lista(TAMANHO_PAGINA + 1) });

    const { result } = renderHook(() => useLocais());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.locais).toHaveLength(TAMANHO_PAGINA);
    expect(result.current.temProxima).toBe(true);
    expect(listar).toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 1, tamanho: TAMANHO_PAGINA + 1, empresa: '', ativos: '' })
    );
  });

  it('filtra por empresa e situação voltando para a página 1', async () => {
    const listar = vi.spyOn(locaisService, 'listarLocais').mockResolvedValue({ dados: lista(TAMANHO_PAGINA + 1) });
    const { result } = renderHook(() => useLocais());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.filtrar({ empresa: 'emp-2', ativos: 'false' }));

    await waitFor(() =>
      expect(listar).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1, empresa: 'emp-2', ativos: 'false' }))
    );
  });

  it('volta uma página quando a atual ficou vazia', async () => {
    const listar = vi
      .spyOn(locaisService, 'listarLocais')
      .mockResolvedValueOnce({ dados: lista(TAMANHO_PAGINA + 1) })
      .mockResolvedValueOnce({ dados: [] })
      .mockResolvedValue({ dados: lista(2) });
    const { result } = renderHook(() => useLocais());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());

    await waitFor(() => expect(result.current.pagina).toBe(1));
    await waitFor(() => expect(result.current.locais).toHaveLength(2));
    expect(listar).toHaveBeenCalledTimes(3);
  });

  it('mostra o erro da API preso à chave e limpa no retry', async () => {
    vi.spyOn(locaisService, 'listarLocais')
      .mockRejectedValueOnce(new Error('falha de rede'))
      .mockResolvedValue({ dados: lista(2) });

    const { result } = renderHook(() => useLocais());

    await waitFor(() => expect(result.current.erro).toBe('falha de rede'));
    act(() => result.current.recarregar());

    await waitFor(() => expect(result.current.locais).toHaveLength(2));
    expect(result.current.erro).toBeNull();
  });

  it('cria, renomeia, troca a situação e exclui recarregando a lista', async () => {
    const listar = vi.spyOn(locaisService, 'listarLocais').mockResolvedValue({ dados: lista(1) });
    const criar = vi.spyOn(locaisService, 'criarLocal').mockResolvedValue({});
    const renomear = vi.spyOn(locaisService, 'renomearLocal').mockResolvedValue({});
    const ativar = vi.spyOn(locaisService, 'ativarLocal').mockResolvedValue({});
    const desativar = vi.spyOn(locaisService, 'desativarLocal').mockResolvedValue({});
    const remover = vi.spyOn(locaisService, 'removerLocal').mockResolvedValue(null);
    const { result } = renderHook(() => useLocais());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.criar({ empresa_id: 'emp-1', nome: 'Novo' }));
    await act(() => result.current.renomear('loc-1', 'Outro'));
    await act(() => result.current.alternarSituacao(local(1, true)));
    await act(() => result.current.alternarSituacao(local(2, false)));
    await act(() => result.current.excluir('loc-1'));

    expect(criar).toHaveBeenCalledWith({ empresa_id: 'emp-1', nome: 'Novo' });
    expect(renomear).toHaveBeenCalledWith('loc-1', 'Outro');
    expect(desativar).toHaveBeenCalledWith('loc-1');
    expect(ativar).toHaveBeenCalledWith('loc-2');
    expect(remover).toHaveBeenCalledWith('loc-1');
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(6));
  });
});
