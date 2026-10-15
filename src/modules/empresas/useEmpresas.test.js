import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as empresasService from '../../services/empresas';
import { TAMANHO_PAGINA, useEmpresas } from './useEmpresas';

function empresa(indice, ativa = true) {
  return { id: `emp-${indice}`, nome_fantasia: `Empresa ${indice}`, ativa };
}

function lista(total) {
  return Array.from({ length: total }, (_, i) => empresa(i + 1));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useEmpresas', () => {
  it('carrega a primeira página e indica se há próxima', async () => {
    const listar = vi
      .spyOn(empresasService, 'listarEmpresas')
      .mockResolvedValue({ dados: lista(TAMANHO_PAGINA + 1) });

    const { result } = renderHook(() => useEmpresas());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.empresas).toHaveLength(TAMANHO_PAGINA);
    expect(result.current.temProxima).toBe(true);
    expect(listar).toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 1, tamanho: TAMANHO_PAGINA + 1, ativas: '' })
    );
  });

  it('filtra pela situação e volta para a página 1', async () => {
    const listar = vi
      .spyOn(empresasService, 'listarEmpresas')
      .mockResolvedValue({ dados: lista(TAMANHO_PAGINA + 1) });
    const { result } = renderHook(() => useEmpresas());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.filtrarSituacao('false'));

    await waitFor(() =>
      expect(listar).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1, ativas: 'false' }))
    );
    expect(result.current.situacao).toBe('false');
  });

  it('mostra o erro da API presa à chave e limpa no retry', async () => {
    const listar = vi
      .spyOn(empresasService, 'listarEmpresas')
      .mockRejectedValueOnce(new Error('falha de rede'))
      .mockResolvedValue({ dados: lista(2) });

    const { result } = renderHook(() => useEmpresas());

    await waitFor(() => expect(result.current.erro).toBe('falha de rede'));
    act(() => result.current.recarregar());

    await waitFor(() => expect(result.current.empresas).toHaveLength(2));
    expect(result.current.erro).toBeNull();
    expect(listar).toHaveBeenCalledTimes(2);
  });

  it('cria e recarrega a lista na página 1', async () => {
    const listar = vi.spyOn(empresasService, 'listarEmpresas').mockResolvedValue({ dados: lista(1) });
    const criar = vi.spyOn(empresasService, 'criarEmpresa').mockResolvedValue({ dados: empresa(9) });
    const { result } = renderHook(() => useEmpresas());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.criar({ cnpj: '11222333000181' }));

    expect(criar).toHaveBeenCalledWith({ cnpj: '11222333000181' });
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(2));
  });

  it('desativa uma ativa e ativa uma inativa', async () => {
    vi.spyOn(empresasService, 'listarEmpresas').mockResolvedValue({ dados: lista(1) });
    const ativar = vi.spyOn(empresasService, 'ativarEmpresa').mockResolvedValue({});
    const desativar = vi.spyOn(empresasService, 'desativarEmpresa').mockResolvedValue({});
    const { result } = renderHook(() => useEmpresas());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.alternarSituacao(empresa(1, true)));
    await act(() => result.current.alternarSituacao(empresa(2, false)));

    expect(desativar).toHaveBeenCalledWith('emp-1');
    expect(ativar).toHaveBeenCalledWith('emp-2');
  });

  it('atualiza e exclui pelo id', async () => {
    vi.spyOn(empresasService, 'listarEmpresas').mockResolvedValue({ dados: lista(1) });
    const atualizar = vi.spyOn(empresasService, 'atualizarEmpresa').mockResolvedValue({});
    const remover = vi.spyOn(empresasService, 'removerEmpresa').mockResolvedValue(null);
    const { result } = renderHook(() => useEmpresas());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.atualizar('emp-1', { nome_fantasia: 'MIA' }));
    await act(() => result.current.excluir('emp-1'));

    expect(atualizar).toHaveBeenCalledWith('emp-1', { nome_fantasia: 'MIA' });
    expect(remover).toHaveBeenCalledWith('emp-1');
  });
});
