import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as recorrentesService from '../../services/despesasRecorrentes';
import { TAMANHO_PAGINA, useDespesasRecorrentes } from './useDespesasRecorrentes';

function despesa(indice, ativa = true, versao = 1) {
  return { id: `rec-${indice}`, descricao: `Despesa ${indice}`, ativa, versao };
}

function lista(total) {
  return Array.from({ length: total }, (_, i) => despesa(i + 1));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useDespesasRecorrentes', () => {
  it('carrega a primeira página e indica se há próxima', async () => {
    const listar = vi
      .spyOn(recorrentesService, 'listarDespesasRecorrentes')
      .mockResolvedValue({ dados: lista(TAMANHO_PAGINA + 1) });

    const { result } = renderHook(() => useDespesasRecorrentes());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.despesas).toHaveLength(TAMANHO_PAGINA);
    expect(result.current.temProxima).toBe(true);
    expect(listar).toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 1, tamanho: TAMANHO_PAGINA + 1, empresa: '', ativa: '' })
    );
  });

  it('filtra por empresa e situação voltando para a página 1', async () => {
    const listar = vi
      .spyOn(recorrentesService, 'listarDespesasRecorrentes')
      .mockResolvedValue({ dados: lista(TAMANHO_PAGINA + 1) });
    const { result } = renderHook(() => useDespesasRecorrentes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.filtrar({ empresa: 'emp-1', ativa: 'false' }));

    await waitFor(() =>
      expect(listar).toHaveBeenLastCalledWith(
        expect.objectContaining({ pagina: 1, empresa: 'emp-1', ativa: 'false' })
      )
    );
    expect(result.current.filtros).toEqual({ empresa: 'emp-1', ativa: 'false' });
  });

  it('volta uma página quando a atual ficou vazia', async () => {
    const listar = vi
      .spyOn(recorrentesService, 'listarDespesasRecorrentes')
      .mockResolvedValueOnce({ dados: lista(TAMANHO_PAGINA + 1) })
      .mockResolvedValueOnce({ dados: [] })
      .mockResolvedValue({ dados: lista(2) });
    const { result } = renderHook(() => useDespesasRecorrentes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());

    await waitFor(() => expect(result.current.pagina).toBe(1));
    await waitFor(() => expect(result.current.despesas).toHaveLength(2));
    expect(listar).toHaveBeenCalledTimes(3);
  });

  it('mostra o erro da API preso à chave e limpa no retry', async () => {
    const listar = vi
      .spyOn(recorrentesService, 'listarDespesasRecorrentes')
      .mockRejectedValueOnce(new Error('falha de rede'))
      .mockResolvedValue({ dados: lista(2) });

    const { result } = renderHook(() => useDespesasRecorrentes());

    await waitFor(() => expect(result.current.erro).toBe('falha de rede'));
    act(() => result.current.recarregar());

    await waitFor(() => expect(result.current.despesas).toHaveLength(2));
    expect(result.current.erro).toBeNull();
    expect(listar).toHaveBeenCalledTimes(2);
  });

  it('cria e recarrega a lista na página 1', async () => {
    const listar = vi.spyOn(recorrentesService, 'listarDespesasRecorrentes').mockResolvedValue({ dados: lista(1) });
    const criar = vi.spyOn(recorrentesService, 'criarDespesaRecorrente').mockResolvedValue({ dados: despesa(9) });
    const { result } = renderHook(() => useDespesasRecorrentes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.criar({ descricao: 'Nova' }));

    expect(criar).toHaveBeenCalledWith({ descricao: 'Nova' });
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(2));
  });

  it('desativa a ativa e ativa a inativa com a versão lida', async () => {
    vi.spyOn(recorrentesService, 'listarDespesasRecorrentes').mockResolvedValue({ dados: lista(1) });
    const ativar = vi.spyOn(recorrentesService, 'ativarDespesaRecorrente').mockResolvedValue({});
    const desativar = vi.spyOn(recorrentesService, 'desativarDespesaRecorrente').mockResolvedValue({});
    const { result } = renderHook(() => useDespesasRecorrentes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.alternarSituacao(despesa(1, true, 3)));
    await act(() => result.current.alternarSituacao(despesa(2, false, 7)));

    expect(desativar).toHaveBeenCalledWith('rec-1', 3);
    expect(ativar).toHaveBeenCalledWith('rec-2', 7);
  });

  it('atualiza e exclui pelo id', async () => {
    vi.spyOn(recorrentesService, 'listarDespesasRecorrentes').mockResolvedValue({ dados: lista(1) });
    const atualizar = vi.spyOn(recorrentesService, 'atualizarDespesaRecorrente').mockResolvedValue({});
    const remover = vi.spyOn(recorrentesService, 'removerDespesaRecorrente').mockResolvedValue(null);
    const { result } = renderHook(() => useDespesasRecorrentes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.atualizar('rec-1', { descricao: 'Outra', versao: 2 }));
    await act(() => result.current.excluir('rec-1'));

    expect(atualizar).toHaveBeenCalledWith('rec-1', { descricao: 'Outra', versao: 2 });
    expect(remover).toHaveBeenCalledWith('rec-1');
  });

  it('gera a competência, recarrega a lista e devolve o relatório', async () => {
    const listar = vi.spyOn(recorrentesService, 'listarDespesasRecorrentes').mockResolvedValue({ dados: lista(1) });
    const relatorio = { competencia: '2026-11', geradas: ['sol-1'], ja_existentes: 2, recusadas: [] };
    const gerar = vi.spyOn(recorrentesService, 'gerarCompetencia').mockResolvedValue({ dados: relatorio });
    const { result } = renderHook(() => useDespesasRecorrentes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    let devolvido;
    await act(async () => {
      devolvido = await result.current.gerar({ competencia: '2026-11', empresa: '' });
    });

    expect(gerar).toHaveBeenCalledWith({ competencia: '2026-11', empresa: '' });
    expect(devolvido).toEqual(relatorio);
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(2));
  });
});
