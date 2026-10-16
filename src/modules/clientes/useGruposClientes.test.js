import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as gruposService from '../../services/clienteGrupos';
import { TAMANHO_PAGINA, useGruposClientes } from './useGruposClientes';

function grupo(indice, ativo = true) {
  return { id: `gru-${indice}`, nome: `Grupo ${indice}`, ativo };
}

function lista(total) {
  return Array.from({ length: total }, (_, i) => grupo(i + 1));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useGruposClientes', () => {
  it('carrega a primeira página e indica se há próxima', async () => {
    const listar = vi.spyOn(gruposService, 'listarGrupos').mockResolvedValue({ dados: lista(TAMANHO_PAGINA + 1) });

    const { result } = renderHook(() => useGruposClientes());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.grupos).toHaveLength(TAMANHO_PAGINA);
    expect(result.current.temProxima).toBe(true);
    expect(listar).toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 1, tamanho: TAMANHO_PAGINA + 1, busca: '', ativos: '' })
    );
  });

  it('filtra por busca e situação voltando para a página 1', async () => {
    const listar = vi.spyOn(gruposService, 'listarGrupos').mockResolvedValue({ dados: lista(TAMANHO_PAGINA + 1) });
    const { result } = renderHook(() => useGruposClientes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.filtrar({ busca: 'aguia', ativos: 'true' }));

    await waitFor(() =>
      expect(listar).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1, busca: 'aguia', ativos: 'true' }))
    );
  });

  it('volta uma página quando a atual ficou vazia', async () => {
    const listar = vi
      .spyOn(gruposService, 'listarGrupos')
      .mockResolvedValueOnce({ dados: lista(TAMANHO_PAGINA + 1) })
      .mockResolvedValueOnce({ dados: [] })
      .mockResolvedValue({ dados: lista(2) });
    const { result } = renderHook(() => useGruposClientes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());

    await waitFor(() => expect(result.current.pagina).toBe(1));
    await waitFor(() => expect(result.current.grupos).toHaveLength(2));
    expect(listar).toHaveBeenCalledTimes(3);
  });

  it('mostra o erro preso à chave e limpa no retry', async () => {
    vi.spyOn(gruposService, 'listarGrupos')
      .mockRejectedValueOnce(new Error('falha de rede'))
      .mockResolvedValue({ dados: lista(2) });

    const { result } = renderHook(() => useGruposClientes());

    await waitFor(() => expect(result.current.erro).toBe('falha de rede'));
    act(() => result.current.recarregar());

    await waitFor(() => expect(result.current.grupos).toHaveLength(2));
    expect(result.current.erro).toBeNull();
  });

  it('cria, renomeia e troca a situação recarregando a lista', async () => {
    const listar = vi.spyOn(gruposService, 'listarGrupos').mockResolvedValue({ dados: lista(1) });
    const criar = vi.spyOn(gruposService, 'criarGrupo').mockResolvedValue({});
    const renomear = vi.spyOn(gruposService, 'renomearGrupo').mockResolvedValue({});
    const ativar = vi.spyOn(gruposService, 'ativarGrupo').mockResolvedValue({});
    const desativar = vi.spyOn(gruposService, 'desativarGrupo').mockResolvedValue({});
    const { result } = renderHook(() => useGruposClientes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.criar('Novo'));
    await act(() => result.current.renomear('gru-1', 'Outro'));
    await act(() => result.current.alternarSituacao(grupo(1, true)));
    await act(() => result.current.alternarSituacao(grupo(2, false)));

    expect(criar).toHaveBeenCalledWith('Novo');
    expect(renomear).toHaveBeenCalledWith('gru-1', 'Outro');
    expect(desativar).toHaveBeenCalledWith('gru-1');
    expect(ativar).toHaveBeenCalledWith('gru-2');
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(5));
  });
});
