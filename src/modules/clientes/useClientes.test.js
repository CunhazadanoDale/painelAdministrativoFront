import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as clientesService from '../../services/clientes';
import { TAMANHO_PAGINA, useClientes } from './useClientes';

function cliente(indice, ativo = true) {
  return { id: `cli-${indice}`, nome: `Cliente ${indice}`, ativo };
}

function lista(total) {
  return Array.from({ length: total }, (_, i) => cliente(i + 1));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useClientes', () => {
  it('carrega a primeira página e indica se há próxima', async () => {
    const listar = vi
      .spyOn(clientesService, 'listarClientes')
      .mockResolvedValue({ dados: lista(TAMANHO_PAGINA + 1) });

    const { result } = renderHook(() => useClientes());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.clientes).toHaveLength(TAMANHO_PAGINA);
    expect(result.current.temProxima).toBe(true);
    expect(listar).toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 1, tamanho: TAMANHO_PAGINA + 1, busca: '', tipo: '', uf: '', grupo: '', representante: '', ativo: '' })
    );
  });

  it('filtra por busca, tipo, UF, grupo, representante e situação voltando para a página 1', async () => {
    const listar = vi
      .spyOn(clientesService, 'listarClientes')
      .mockResolvedValue({ dados: lista(TAMANHO_PAGINA + 1) });
    const { result } = renderHook(() => useClientes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.filtrar({ busca: 'aguia' }));
    await waitFor(() =>
      expect(listar).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1, busca: 'aguia' }))
    );

    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.filtrar({ tipo: 'loja', uf: 'PB', grupo: 'gru-1', representante: 'rep-1', ativo: 'false' }));

    await waitFor(() =>
      expect(listar).toHaveBeenLastCalledWith(
        expect.objectContaining({ pagina: 1, busca: 'aguia', tipo: 'loja', uf: 'PB', grupo: 'gru-1', representante: 'rep-1', ativo: 'false' })
      )
    );
    expect(result.current.filtros).toEqual({ busca: 'aguia', tipo: 'loja', uf: 'PB', grupo: 'gru-1', representante: 'rep-1', ativo: 'false' });
  });

  it('volta uma página quando a atual ficou vazia', async () => {
    const listar = vi
      .spyOn(clientesService, 'listarClientes')
      .mockResolvedValueOnce({ dados: lista(TAMANHO_PAGINA + 1) })
      .mockResolvedValueOnce({ dados: [] })
      .mockResolvedValue({ dados: lista(2) });
    const { result } = renderHook(() => useClientes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());

    await waitFor(() => expect(result.current.pagina).toBe(1));
    await waitFor(() => expect(result.current.clientes).toHaveLength(2));
    expect(listar).toHaveBeenCalledTimes(3);
  });

  it('mostra o erro da API preso à chave e limpa no retry', async () => {
    const listar = vi
      .spyOn(clientesService, 'listarClientes')
      .mockRejectedValueOnce(new Error('falha de rede'))
      .mockResolvedValue({ dados: lista(2) });

    const { result } = renderHook(() => useClientes());

    await waitFor(() => expect(result.current.erro).toBe('falha de rede'));
    act(() => result.current.recarregar());

    await waitFor(() => expect(result.current.clientes).toHaveLength(2));
    expect(result.current.erro).toBeNull();
    expect(listar).toHaveBeenCalledTimes(2);
  });

  it('cria e recarrega a lista na página 1', async () => {
    const listar = vi.spyOn(clientesService, 'listarClientes').mockResolvedValue({ dados: lista(1) });
    const criar = vi.spyOn(clientesService, 'criarCliente').mockResolvedValue({ dados: cliente(9) });
    const { result } = renderHook(() => useClientes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.criar({ nome: 'Novo' }));

    expect(criar).toHaveBeenCalledWith({ nome: 'Novo' });
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(2));
  });

  it('desativa um ativo e ativa um inativo', async () => {
    vi.spyOn(clientesService, 'listarClientes').mockResolvedValue({ dados: lista(1) });
    const ativar = vi.spyOn(clientesService, 'ativarCliente').mockResolvedValue({});
    const desativar = vi.spyOn(clientesService, 'desativarCliente').mockResolvedValue({});
    const { result } = renderHook(() => useClientes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.alternarSituacao(cliente(1, true)));
    await act(() => result.current.alternarSituacao(cliente(2, false)));

    expect(desativar).toHaveBeenCalledWith('cli-1');
    expect(ativar).toHaveBeenCalledWith('cli-2');
  });

  it('atualiza e exclui pelo id', async () => {
    vi.spyOn(clientesService, 'listarClientes').mockResolvedValue({ dados: lista(1) });
    const atualizar = vi.spyOn(clientesService, 'atualizarCliente').mockResolvedValue({});
    const remover = vi.spyOn(clientesService, 'removerCliente').mockResolvedValue(null);
    const { result } = renderHook(() => useClientes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.atualizar('cli-1', { nome: 'Outro', versao: 2 }));
    await act(() => result.current.excluir('cli-1'));

    expect(atualizar).toHaveBeenCalledWith('cli-1', { nome: 'Outro', versao: 2 });
    expect(remover).toHaveBeenCalledWith('cli-1');
  });
});
