import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as pedidosService from '../../services/pedidos';
import { entradaSugerida, hojeEmBrasilia, rotuloAcaoHistorico } from './pedidosUtils';
import { usePedidoDetalhe } from './usePedidoDetalhe';
import { usePedidoHistorico } from './usePedidoHistorico';

const PEDIDO = { id: 'ped-1', numero: 12, status: 'proposta', versao: 3, valor_total_centavos: 100001 };

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('usePedidoDetalhe', () => {
  it('carrega o pedido, mostra o erro e tenta de novo', async () => {
    const obter = vi
      .spyOn(pedidosService, 'obterPedido')
      .mockRejectedValueOnce(new Error('perfil sem acesso a esta empresa'))
      .mockResolvedValue({ dados: PEDIDO });

    const { result } = renderHook(() => usePedidoDetalhe('ped-1'));

    await waitFor(() => expect(result.current.erro).toBe('perfil sem acesso a esta empresa'));
    act(() => result.current.recarregar());

    await waitFor(() => expect(result.current.pedido).toEqual(PEDIDO));
    expect(obter).toHaveBeenCalledWith('ped-1', { sinal: expect.anything() });
  });

  it('executa cada ação com a versão lida e recarrega avançando a geração', async () => {
    vi.spyOn(pedidosService, 'obterPedido').mockResolvedValue({ dados: PEDIDO });
    const atualizar = vi.spyOn(pedidosService, 'atualizarPedido').mockResolvedValue({});
    const confirmar = vi.spyOn(pedidosService, 'confirmarPedido').mockResolvedValue({});
    const reservar = vi.spyOn(pedidosService, 'reservarPendencias').mockResolvedValue({});
    const entrada = vi.spyOn(pedidosService, 'registrarEntrada').mockResolvedValue({});
    const cancelar = vi.spyOn(pedidosService, 'cancelarPedido').mockResolvedValue({});
    const { result } = renderHook(() => usePedidoDetalhe('ped-1'));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    const geracao = result.current.geracao;

    await act(() => result.current.atualizar({ cliente_id: 'cli-1', versao: 3 }));
    await act(() => result.current.confirmar());
    await act(() => result.current.reservarPendencias());
    await act(() => result.current.registrarEntrada({ pago_em: '2026-10-15', valor_centavos: 30000 }));
    await act(() => result.current.cancelar({ motivo: 'desistiu', valor_a_devolver_centavos: 0 }));

    expect(atualizar).toHaveBeenCalledWith('ped-1', { cliente_id: 'cli-1', versao: 3 });
    expect(confirmar).toHaveBeenCalledWith('ped-1', 3);
    expect(reservar).toHaveBeenCalledWith('ped-1', 3);
    expect(entrada).toHaveBeenCalledWith('ped-1', { versao: 3, pago_em: '2026-10-15', valor_centavos: 30000 });
    expect(cancelar).toHaveBeenCalledWith('ped-1', { versao: 3, motivo: 'desistiu', valor_a_devolver_centavos: 0 });
    expect(result.current.geracao).toBe(geracao + 5);
  });
});

describe('usePedidoHistorico', () => {
  it('carrega o histórico mais recente primeiro e busca de novo quando a geração muda', async () => {
    const listar = vi.spyOn(pedidosService, 'listarHistoricoPedido').mockResolvedValue({
      dados: [
        { id: 'h1', acao: 'criado', criado_em: '2026-10-10T10:00:00Z' },
        { id: 'h2', acao: 'confirmado', criado_em: '2026-10-11T10:00:00Z' },
      ],
    });
    const { result, rerender } = renderHook(({ geracao }) => usePedidoHistorico('ped-1', geracao), {
      initialProps: { geracao: 0 },
    });

    await waitFor(() => expect(result.current.eventos.map((evento) => evento.id)).toEqual(['h2', 'h1']));
    rerender({ geracao: 1 });
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(2));
  });
});

describe('utilitários do pedido', () => {
  it('sugere a entrada pelo percentual do modelo arredondando para baixo', () => {
    expect(entradaSugerida({ valor_total_centavos: 100001, condicao: { entrada_bp: 3000 } })).toBe(30000);
    expect(entradaSugerida({ valor_total_centavos: 100001, condicao: { entrada_bp: 0 } })).toBe(0);
  });

  it('dá a data de hoje no fuso de Brasília', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T02:00:00Z'));
    expect(hojeEmBrasilia()).toBe('2026-10-18');
    vi.useRealTimers();
  });

  it('dá nome às ações do histórico', () => {
    expect(rotuloAcaoHistorico('entrada_registrada')).toBe('Entrada registrada');
    expect(rotuloAcaoHistorico('entrega_saiu')).toBe('Entrega saiu');
  });
});
