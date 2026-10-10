import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as categoriasService from '../../services/categorias';
import * as produtosService from '../../services/produtos';
import { TAMANHO_PAGINA, useProdutos } from './useProdutos';

function produto(indice) {
  return {
    id: `id-${indice}`,
    nome: `Produto ${indice}`,
    preco_centavos: 1000 + indice,
    saldo: indice,
    ativo: true,
  };
}

function listaDeProdutos(total) {
  return Array.from({ length: total }, (_, i) => produto(i + 1));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useProdutos', () => {
  it('lista os produtos quando categorias e resumo tambem respondem', async () => {
    vi.spyOn(produtosService, 'listarProdutos').mockResolvedValue({ dados: listaDeProdutos(3) });
    vi.spyOn(categoriasService, 'listarCategorias').mockResolvedValue({ dados: [] });
    vi.spyOn(produtosService, 'obterResumo').mockResolvedValue({ dados: { total_produtos: 3 } });

    const { result } = renderHook(() => useProdutos());

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.produtos).toHaveLength(3);
    expect(result.current.resumo).toEqual({ total_produtos: 3 });
    expect(result.current.erro).toBeNull();
  });

  it('mantem a lista de produtos mesmo quando o resumo falha', async () => {
    vi.spyOn(produtosService, 'listarProdutos').mockResolvedValue({ dados: listaDeProdutos(2) });
    vi.spyOn(categoriasService, 'listarCategorias').mockResolvedValue({ dados: [] });
    vi.spyOn(produtosService, 'obterResumo').mockRejectedValue(new Error('resumo indisponivel'));

    const { result } = renderHook(() => useProdutos());

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.produtos).toHaveLength(2);
    expect(result.current.erro).toBeNull();
    expect(result.current.resumo).toBeNull();
  });

  it('mantem a lista de produtos mesmo quando as categorias falham', async () => {
    vi.spyOn(produtosService, 'listarProdutos').mockResolvedValue({ dados: listaDeProdutos(2) });
    vi.spyOn(categoriasService, 'listarCategorias').mockRejectedValue(new Error('categorias fora'));
    vi.spyOn(produtosService, 'obterResumo').mockResolvedValue({ dados: { total_produtos: 2 } });

    const { result } = renderHook(() => useProdutos());

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.produtos).toHaveLength(2);
    expect(result.current.categorias).toEqual([]);
    expect(result.current.erro).toBeNull();
  });

  it('expoe o erro quando a listagem de produtos falha', async () => {
    vi.spyOn(produtosService, 'listarProdutos').mockRejectedValue(
      new Error('A API não devolveu JSON. Confirme se VITE_API_BASE_URL aponta para a API Go.')
    );
    vi.spyOn(categoriasService, 'listarCategorias').mockResolvedValue({ dados: [] });
    vi.spyOn(produtosService, 'obterResumo').mockResolvedValue({ dados: null });

    const { result } = renderHook(() => useProdutos());

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.produtos).toEqual([]);
    expect(result.current.erro).toContain('não devolveu JSON');
  });

  it('limita a pagina ao tamanho combinado e sinaliza proxima pagina', async () => {
    vi.spyOn(produtosService, 'listarProdutos').mockResolvedValue({
      dados: listaDeProdutos(TAMANHO_PAGINA + 1),
    });
    vi.spyOn(categoriasService, 'listarCategorias').mockResolvedValue({ dados: [] });
    vi.spyOn(produtosService, 'obterResumo').mockResolvedValue({ dados: null });

    const { result } = renderHook(() => useProdutos());

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.produtos).toHaveLength(TAMANHO_PAGINA);
    expect(result.current.temProxima).toBe(true);
  });

  it('trata resposta sem array de dados como lista vazia', async () => {
    vi.spyOn(produtosService, 'listarProdutos').mockResolvedValue({ dados: null });
    vi.spyOn(categoriasService, 'listarCategorias').mockResolvedValue({ dados: [] });
    vi.spyOn(produtosService, 'obterResumo').mockResolvedValue({ dados: null });

    const { result } = renderHook(() => useProdutos());

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.produtos).toEqual([]);
    expect(result.current.erro).toBeNull();
  });

  it('aplicarFiltros volta para a primeira pagina', async () => {
    vi.spyOn(produtosService, 'listarProdutos').mockResolvedValue({ dados: [] });
    vi.spyOn(categoriasService, 'listarCategorias').mockResolvedValue({ dados: [] });
    vi.spyOn(produtosService, 'obterResumo').mockResolvedValue({ dados: null });

    const { result } = renderHook(() => useProdutos());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    act(() => result.current.irParaProxima());
    expect(result.current.pagina).toBe(2);

    act(() => result.current.aplicarFiltros({ busca: 'cimento' }));

    expect(result.current.pagina).toBe(1);
    expect(result.current.filtros.busca).toBe('cimento');
  });
});
