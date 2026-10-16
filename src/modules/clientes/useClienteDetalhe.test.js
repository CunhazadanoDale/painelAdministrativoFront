import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as clientesService from '../../services/clientes';
import { useClienteDetalhe } from './useClienteDetalhe';
import { TAMANHO_PAGINA_OBRAS, useObrasCliente } from './useObrasCliente';

const CLIENTE = { id: 'cli-1', nome: 'Construtora Águia', ativo: true };

function obra(indice, ativo = true) {
  return { id: `obra-${indice}`, nome: `Obra ${indice}`, ativo };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useClienteDetalhe', () => {
  it('carrega o cliente com o sinal, mostra o erro e tenta de novo', async () => {
    const obter = vi
      .spyOn(clientesService, 'obterCliente')
      .mockRejectedValueOnce(new Error('cliente de outro representante'))
      .mockResolvedValue({ dados: CLIENTE });

    const { result } = renderHook(() => useClienteDetalhe('cli-1'));

    await waitFor(() => expect(result.current.erro).toBe('cliente de outro representante'));
    act(() => result.current.recarregar());

    await waitFor(() => expect(result.current.cliente).toEqual(CLIENTE));
    expect(result.current.erro).toBeNull();
    expect(obter).toHaveBeenCalledWith('cli-1', { sinal: expect.anything() });
  });

  it('atualiza e troca a situação recarregando o cliente e avançando a geração', async () => {
    const obter = vi.spyOn(clientesService, 'obterCliente').mockResolvedValue({ dados: CLIENTE });
    const atualizar = vi.spyOn(clientesService, 'atualizarCliente').mockResolvedValue({});
    const desativar = vi.spyOn(clientesService, 'desativarCliente').mockResolvedValue({});
    const { result } = renderHook(() => useClienteDetalhe('cli-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    const geracao = result.current.geracao;

    await act(() => result.current.atualizar({ nome: 'Outro' }));
    await act(() => result.current.alternarSituacao());

    expect(atualizar).toHaveBeenCalledWith('cli-1', { nome: 'Outro' });
    expect(desativar).toHaveBeenCalledWith('cli-1');
    expect(result.current.geracao).toBe(geracao + 2);
    await waitFor(() => expect(obter).toHaveBeenCalledTimes(3));
  });
});

describe('useObrasCliente', () => {
  it('carrega as obras da primeira página e filtra só as ativas voltando para a página 1', async () => {
    const listar = vi
      .spyOn(clientesService, 'listarObras')
      .mockResolvedValue({ dados: Array.from({ length: TAMANHO_PAGINA_OBRAS + 1 }, (_, i) => obra(i + 1)) });
    const { result } = renderHook(() => useObrasCliente('cli-1', 0));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.obras).toHaveLength(TAMANHO_PAGINA_OBRAS);
    expect(result.current.temProxima).toBe(true);
    expect(listar).toHaveBeenCalledWith('cli-1', expect.objectContaining({ pagina: 1, ativas: '', sinal: expect.anything() }));

    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.mostrarSoAtivas(true));

    await waitFor(() =>
      expect(listar).toHaveBeenLastCalledWith('cli-1', expect.objectContaining({ pagina: 1, ativas: 'true' }))
    );
  });

  it('cria, altera e troca a situação recarregando a lista', async () => {
    const listar = vi.spyOn(clientesService, 'listarObras').mockResolvedValue({ dados: [obra(1)] });
    const criar = vi.spyOn(clientesService, 'criarObra').mockResolvedValue({});
    const atualizar = vi.spyOn(clientesService, 'atualizarObra').mockResolvedValue({});
    const ativar = vi.spyOn(clientesService, 'ativarObra').mockResolvedValue({});
    const desativar = vi.spyOn(clientesService, 'desativarObra').mockResolvedValue({});
    const { result } = renderHook(() => useObrasCliente('cli-1', 0));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.criar({ nome: 'Nova' }));
    await act(() => result.current.atualizar('obra-1', { nome: 'Outra' }));
    await act(() => result.current.alternarSituacao(obra(1, true)));
    await act(() => result.current.alternarSituacao(obra(2, false)));

    expect(criar).toHaveBeenCalledWith('cli-1', { nome: 'Nova' });
    expect(atualizar).toHaveBeenCalledWith('obra-1', { nome: 'Outra' });
    expect(desativar).toHaveBeenCalledWith('obra-1');
    expect(ativar).toHaveBeenCalledWith('obra-2');
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(5));
  });
});
