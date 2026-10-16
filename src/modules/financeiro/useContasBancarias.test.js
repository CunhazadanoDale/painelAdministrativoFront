import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as contasService from '../../services/contasBancarias';
import { TAMANHO_PAGINA, useContasBancarias } from './useContasBancarias';

function conta(indice, ativa = true, versao = 1) {
  return { id: `cb-${indice}`, apelido: `Conta ${indice}`, ativa, versao };
}

function lista(total) {
  return Array.from({ length: total }, (_, i) => conta(i + 1));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useContasBancarias', () => {
  it('carrega a primeira página e indica se há próxima', async () => {
    const listar = vi
      .spyOn(contasService, 'listarContasBancarias')
      .mockResolvedValue({ dados: lista(TAMANHO_PAGINA + 1) });

    const { result } = renderHook(() => useContasBancarias());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.contas).toHaveLength(TAMANHO_PAGINA);
    expect(result.current.temProxima).toBe(true);
    expect(listar).toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 1, tamanho: TAMANHO_PAGINA + 1, empresa: '', banco: '', tipo: '', ativa: '' })
    );
  });

  it('filtra por empresa, banco, tipo e situação voltando para a página 1', async () => {
    const listar = vi
      .spyOn(contasService, 'listarContasBancarias')
      .mockResolvedValue({ dados: lista(TAMANHO_PAGINA + 1) });
    const { result } = renderHook(() => useContasBancarias());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.filtrar({ empresa: 'emp-1', banco: '748', tipo: 'poupanca', ativa: 'false' }));

    await waitFor(() =>
      expect(listar).toHaveBeenLastCalledWith(
        expect.objectContaining({ pagina: 1, empresa: 'emp-1', banco: '748', tipo: 'poupanca', ativa: 'false' })
      )
    );
    expect(result.current.filtros).toEqual({ empresa: 'emp-1', banco: '748', tipo: 'poupanca', ativa: 'false' });
  });

  it('volta uma página quando a atual ficou vazia', async () => {
    const listar = vi
      .spyOn(contasService, 'listarContasBancarias')
      .mockResolvedValueOnce({ dados: lista(TAMANHO_PAGINA + 1) })
      .mockResolvedValueOnce({ dados: [] })
      .mockResolvedValue({ dados: lista(2) });
    const { result } = renderHook(() => useContasBancarias());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());

    await waitFor(() => expect(result.current.pagina).toBe(1));
    await waitFor(() => expect(result.current.contas).toHaveLength(2));
    expect(listar).toHaveBeenCalledTimes(3);
  });

  it('mostra o erro da API preso à chave e limpa no retry', async () => {
    const listar = vi
      .spyOn(contasService, 'listarContasBancarias')
      .mockRejectedValueOnce(new Error('falha de rede'))
      .mockResolvedValue({ dados: lista(2) });

    const { result } = renderHook(() => useContasBancarias());

    await waitFor(() => expect(result.current.erro).toBe('falha de rede'));
    act(() => result.current.recarregar());

    await waitFor(() => expect(result.current.contas).toHaveLength(2));
    expect(result.current.erro).toBeNull();
    expect(listar).toHaveBeenCalledTimes(2);
  });

  it('cria e recarrega a lista na página 1', async () => {
    const listar = vi.spyOn(contasService, 'listarContasBancarias').mockResolvedValue({ dados: lista(1) });
    const criar = vi.spyOn(contasService, 'criarContaBancaria').mockResolvedValue({ dados: conta(9) });
    const { result } = renderHook(() => useContasBancarias());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.criar({ apelido: 'Nova' }));

    expect(criar).toHaveBeenCalledWith({ apelido: 'Nova' });
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(2));
  });

  it('desativa uma ativa e ativa uma inativa com a versão lida', async () => {
    vi.spyOn(contasService, 'listarContasBancarias').mockResolvedValue({ dados: lista(1) });
    const ativar = vi.spyOn(contasService, 'ativarContaBancaria').mockResolvedValue({});
    const desativar = vi.spyOn(contasService, 'desativarContaBancaria').mockResolvedValue({});
    const { result } = renderHook(() => useContasBancarias());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.alternarSituacao(conta(1, true, 3)));
    await act(() => result.current.alternarSituacao(conta(2, false, 7)));

    expect(desativar).toHaveBeenCalledWith('cb-1', 3);
    expect(ativar).toHaveBeenCalledWith('cb-2', 7);
  });

  it('atualiza e exclui pelo id', async () => {
    vi.spyOn(contasService, 'listarContasBancarias').mockResolvedValue({ dados: lista(1) });
    const atualizar = vi.spyOn(contasService, 'atualizarContaBancaria').mockResolvedValue({});
    const remover = vi.spyOn(contasService, 'removerContaBancaria').mockResolvedValue(null);
    const { result } = renderHook(() => useContasBancarias());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.atualizar('cb-1', { apelido: 'Outra', versao: 2 }));
    await act(() => result.current.excluir('cb-1'));

    expect(atualizar).toHaveBeenCalledWith('cb-1', { apelido: 'Outra', versao: 2 });
    expect(remover).toHaveBeenCalledWith('cb-1');
  });
});
