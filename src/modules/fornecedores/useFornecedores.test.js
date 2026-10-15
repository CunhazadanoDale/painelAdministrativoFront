import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as fornecedoresService from '../../services/fornecedores';
import { TAMANHO_PAGINA, useFornecedores } from './useFornecedores';

function fornecedor(indice, ativo = true, versao = 1) {
  return { id: `for-${indice}`, nome: `Fornecedor ${indice}`, ativo, versao };
}

function lista(total) {
  return Array.from({ length: total }, (_, i) => fornecedor(i + 1));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useFornecedores', () => {
  it('carrega a primeira página e indica se há próxima', async () => {
    const listar = vi
      .spyOn(fornecedoresService, 'listarFornecedores')
      .mockResolvedValue({ dados: lista(TAMANHO_PAGINA + 1) });

    const { result } = renderHook(() => useFornecedores());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.fornecedores).toHaveLength(TAMANHO_PAGINA);
    expect(result.current.temProxima).toBe(true);
    expect(listar).toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 1, tamanho: TAMANHO_PAGINA + 1, busca: '', moeda: '', ativo: '' })
    );
  });

  it('filtra por busca, moeda e situação voltando para a página 1', async () => {
    const listar = vi
      .spyOn(fornecedoresService, 'listarFornecedores')
      .mockResolvedValue({ dados: lista(TAMANHO_PAGINA + 1) });
    const { result } = renderHook(() => useFornecedores());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.filtrar({ busca: 'foshan' }));
    await waitFor(() =>
      expect(listar).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1, busca: 'foshan' }))
    );

    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.filtrar({ moeda: 'USD', ativo: 'false' }));

    await waitFor(() =>
      expect(listar).toHaveBeenLastCalledWith(
        expect.objectContaining({ pagina: 1, busca: 'foshan', moeda: 'USD', ativo: 'false' })
      )
    );
    expect(result.current.filtros).toEqual({ busca: 'foshan', moeda: 'USD', ativo: 'false' });
  });

  it('volta uma página quando a atual ficou vazia', async () => {
    const listar = vi
      .spyOn(fornecedoresService, 'listarFornecedores')
      .mockResolvedValueOnce({ dados: lista(TAMANHO_PAGINA + 1) })
      .mockResolvedValueOnce({ dados: [] })
      .mockResolvedValue({ dados: lista(2) });
    const { result } = renderHook(() => useFornecedores());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());

    await waitFor(() => expect(result.current.pagina).toBe(1));
    await waitFor(() => expect(result.current.fornecedores).toHaveLength(2));
    expect(listar).toHaveBeenCalledTimes(3);
  });

  it('mostra o erro da API preso à chave e limpa no retry', async () => {
    const listar = vi
      .spyOn(fornecedoresService, 'listarFornecedores')
      .mockRejectedValueOnce(new Error('falha de rede'))
      .mockResolvedValue({ dados: lista(2) });

    const { result } = renderHook(() => useFornecedores());

    await waitFor(() => expect(result.current.erro).toBe('falha de rede'));
    act(() => result.current.recarregar());

    await waitFor(() => expect(result.current.fornecedores).toHaveLength(2));
    expect(result.current.erro).toBeNull();
    expect(listar).toHaveBeenCalledTimes(2);
  });

  it('cria e recarrega a lista na página 1', async () => {
    const listar = vi.spyOn(fornecedoresService, 'listarFornecedores').mockResolvedValue({ dados: lista(1) });
    const criar = vi.spyOn(fornecedoresService, 'criarFornecedor').mockResolvedValue({ dados: fornecedor(9) });
    const { result } = renderHook(() => useFornecedores());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.criar({ nome: 'Novo' }));

    expect(criar).toHaveBeenCalledWith({ nome: 'Novo' });
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(2));
  });

  it('desativa um ativo e ativa um inativo com a versão lida', async () => {
    vi.spyOn(fornecedoresService, 'listarFornecedores').mockResolvedValue({ dados: lista(1) });
    const ativar = vi.spyOn(fornecedoresService, 'ativarFornecedor').mockResolvedValue({});
    const desativar = vi.spyOn(fornecedoresService, 'desativarFornecedor').mockResolvedValue({});
    const { result } = renderHook(() => useFornecedores());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.alternarSituacao(fornecedor(1, true, 3)));
    await act(() => result.current.alternarSituacao(fornecedor(2, false, 7)));

    expect(desativar).toHaveBeenCalledWith('for-1', 3);
    expect(ativar).toHaveBeenCalledWith('for-2', 7);
  });

  it('atualiza e exclui pelo id', async () => {
    vi.spyOn(fornecedoresService, 'listarFornecedores').mockResolvedValue({ dados: lista(1) });
    const atualizar = vi.spyOn(fornecedoresService, 'atualizarFornecedor').mockResolvedValue({});
    const remover = vi.spyOn(fornecedoresService, 'removerFornecedor').mockResolvedValue(null);
    const { result } = renderHook(() => useFornecedores());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.atualizar('for-1', { nome: 'Outro', versao: 2 }));
    await act(() => result.current.excluir('for-1'));

    expect(atualizar).toHaveBeenCalledWith('for-1', { nome: 'Outro', versao: 2 });
    expect(remover).toHaveBeenCalledWith('for-1');
  });
});
