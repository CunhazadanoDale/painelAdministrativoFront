import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as categoriasService from '../../services/categoriasFinanceiras';
import { usePlanoContas } from './usePlanoContas';

const ARVORE = [
  {
    id: 'raiz-1',
    nome: 'Despesas fixas',
    ativa: true,
    versao: 2,
    subcategorias: [{ id: 'sub-1', nome: 'Aluguel', ativa: false, versao: 5 }],
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('usePlanoContas', () => {
  it('carrega a árvore inteira', async () => {
    const obter = vi.spyOn(categoriasService, 'obterArvoreFinanceira').mockResolvedValue({ dados: ARVORE });

    const { result } = renderHook(() => usePlanoContas());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.raizes).toEqual(ARVORE);
    expect(obter).toHaveBeenCalledWith(expect.objectContaining({ ativas: false, sinal: expect.anything() }));
  });

  it('pede só as ativas quando o filtro liga', async () => {
    const obter = vi.spyOn(categoriasService, 'obterArvoreFinanceira').mockResolvedValue({ dados: ARVORE });
    const { result } = renderHook(() => usePlanoContas());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.mostrarSoAtivas(true));

    await waitFor(() => expect(obter).toHaveBeenLastCalledWith(expect.objectContaining({ ativas: true })));
    expect(result.current.soAtivas).toBe(true);
  });

  it('mostra o erro da API preso à chave e limpa no retry', async () => {
    const obter = vi
      .spyOn(categoriasService, 'obterArvoreFinanceira')
      .mockRejectedValueOnce(new Error('falha de rede'))
      .mockResolvedValue({ dados: ARVORE });

    const { result } = renderHook(() => usePlanoContas());

    await waitFor(() => expect(result.current.erro).toBe('falha de rede'));
    act(() => result.current.recarregar());

    await waitFor(() => expect(result.current.raizes).toEqual(ARVORE));
    expect(result.current.erro).toBeNull();
    expect(obter).toHaveBeenCalledTimes(2);
  });

  it('cria, atualiza e exclui recarregando a árvore', async () => {
    const obter = vi.spyOn(categoriasService, 'obterArvoreFinanceira').mockResolvedValue({ dados: ARVORE });
    const criar = vi.spyOn(categoriasService, 'criarCategoriaFinanceira').mockResolvedValue({});
    const atualizar = vi.spyOn(categoriasService, 'atualizarCategoriaFinanceira').mockResolvedValue({});
    const remover = vi.spyOn(categoriasService, 'removerCategoriaFinanceira').mockResolvedValue(null);
    const { result } = renderHook(() => usePlanoContas());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.criar({ nome: 'Nova' }));
    await act(() => result.current.atualizar('sub-1', { nome: 'Outra', versao: 5 }));
    await act(() => result.current.excluir('sub-1'));

    expect(criar).toHaveBeenCalledWith({ nome: 'Nova' });
    expect(atualizar).toHaveBeenCalledWith('sub-1', { nome: 'Outra', versao: 5 });
    expect(remover).toHaveBeenCalledWith('sub-1');
    await waitFor(() => expect(obter).toHaveBeenCalledTimes(4));
  });

  it('desativa a ativa e ativa a inativa com a versão lida', async () => {
    vi.spyOn(categoriasService, 'obterArvoreFinanceira').mockResolvedValue({ dados: ARVORE });
    const ativar = vi.spyOn(categoriasService, 'ativarCategoriaFinanceira').mockResolvedValue({});
    const desativar = vi.spyOn(categoriasService, 'desativarCategoriaFinanceira').mockResolvedValue({});
    const { result } = renderHook(() => usePlanoContas());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.alternarSituacao(ARVORE[0]));
    await act(() => result.current.alternarSituacao(ARVORE[0].subcategorias[0]));

    expect(desativar).toHaveBeenCalledWith('raiz-1', 2);
    expect(ativar).toHaveBeenCalledWith('sub-1', 5);
  });
});
