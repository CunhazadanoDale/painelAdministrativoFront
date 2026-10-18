import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as representantesService from '../../services/representantes';
import { TAMANHO_PAGINA, useRepresentantes } from './useRepresentantes';

function representante(indice, ativo = true) {
  return { id: `rep-${indice}`, nome: `Representante ${indice}`, ativo };
}

function lista(total) {
  return Array.from({ length: total }, (_, i) => representante(i + 1));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useRepresentantes', () => {
  it('carrega a primeira página e indica se há próxima', async () => {
    const listar = vi.spyOn(representantesService, 'listarRepresentantes').mockResolvedValue({ dados: lista(TAMANHO_PAGINA + 1) });

    const { result } = renderHook(() => useRepresentantes());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.representantes).toHaveLength(TAMANHO_PAGINA);
    expect(result.current.temProxima).toBe(true);
    expect(listar).toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 1, tamanho: TAMANHO_PAGINA + 1, busca: '', ativos: '' })
    );
  });

  it('filtra por busca e situação voltando para a página 1', async () => {
    const listar = vi.spyOn(representantesService, 'listarRepresentantes').mockResolvedValue({ dados: lista(TAMANHO_PAGINA + 1) });
    const { result } = renderHook(() => useRepresentantes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.filtrar({ busca: 'jose', ativos: 'true' }));

    await waitFor(() =>
      expect(listar).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1, busca: 'jose', ativos: 'true' }))
    );
  });

  it('volta uma página quando a atual ficou vazia', async () => {
    const listar = vi
      .spyOn(representantesService, 'listarRepresentantes')
      .mockResolvedValueOnce({ dados: lista(TAMANHO_PAGINA + 1) })
      .mockResolvedValueOnce({ dados: [] })
      .mockResolvedValue({ dados: lista(2) });
    const { result } = renderHook(() => useRepresentantes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());

    await waitFor(() => expect(result.current.pagina).toBe(1));
    await waitFor(() => expect(result.current.representantes).toHaveLength(2));
    expect(listar).toHaveBeenCalledTimes(3);
  });

  it('mostra o erro preso à chave e limpa no retry', async () => {
    vi.spyOn(representantesService, 'listarRepresentantes')
      .mockRejectedValueOnce(new Error('falha de rede'))
      .mockResolvedValue({ dados: lista(2) });

    const { result } = renderHook(() => useRepresentantes());

    await waitFor(() => expect(result.current.erro).toBe('falha de rede'));
    act(() => result.current.recarregar());

    await waitFor(() => expect(result.current.representantes).toHaveLength(2));
    expect(result.current.erro).toBeNull();
  });

  it('cria, atualiza e troca a situação recarregando a lista', async () => {
    const listar = vi.spyOn(representantesService, 'listarRepresentantes').mockResolvedValue({ dados: lista(1) });
    const criar = vi.spyOn(representantesService, 'criarRepresentante').mockResolvedValue({});
    const atualizar = vi.spyOn(representantesService, 'atualizarRepresentante').mockResolvedValue({});
    const ativar = vi.spyOn(representantesService, 'ativarRepresentante').mockResolvedValue({});
    const desativar = vi.spyOn(representantesService, 'desativarRepresentante').mockResolvedValue({});
    const { result } = renderHook(() => useRepresentantes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.criar({ nome: 'Novo' }));
    await act(() => result.current.atualizar('rep-1', { nome: 'Outro' }));
    await act(() => result.current.alternarSituacao(representante(1, true)));
    await act(() => result.current.alternarSituacao(representante(2, false)));

    expect(criar).toHaveBeenCalledWith({ nome: 'Novo' });
    expect(atualizar).toHaveBeenCalledWith('rep-1', { nome: 'Outro' });
    expect(desativar).toHaveBeenCalledWith('rep-1');
    expect(ativar).toHaveBeenCalledWith('rep-2');
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(5));
  });
});
