import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as empresasService from '../../services/empresas';
import * as locaisService from '../../services/locais';
import * as pedidosService from '../../services/pedidos';
import Entregas from './Entregas';
import { TAMANHO_PAGINA, useEntregas } from './useEntregas';

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/locais', () => ({ listarTodosLocais: vi.fn() }));
vi.mock('../../services/pedidos', () => ({ listarEntregas: vi.fn(), obterPedido: vi.fn() }));

const { listarEntregas, obterPedido } = pedidosService;

const PENDENTE = {
  id: 'ent-1',
  pedido_id: 'ped-12',
  status: 'pendente',
  transportadora: 'Rodonaves',
  frete_tipo: 'cif',
  frete_centavos: 18000,
  previsao: '2026-10-20T00:00:00Z',
  saiu_em: null,
  entregue_em: null,
  itens: [
    { pedido_item_id: 'item-1', local_id: 'loc-galpao', quantidade: 30 },
    { pedido_item_id: 'item-2', local_id: 'loc-galpao', quantidade: 5 },
  ],
};

const ENTREGUE = {
  ...PENDENTE,
  id: 'ent-2',
  pedido_id: 'ped-7',
  status: 'entregue',
  transportadora: null,
  frete_tipo: 'fob',
  frete_centavos: null,
  saiu_em: '2026-10-16T00:00:00Z',
  entregue_em: '2026-10-17T00:00:00Z',
  itens: [{ pedido_item_id: 'item-9', local_id: 'loc-loja', quantidade: 6 }],
};

function renderizar() {
  return render(
    <MemoryRouter>
      <Entregas />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  locaisService.listarTodosLocais.mockResolvedValue([
    { id: 'loc-galpao', nome: 'Galpão Cabedelo' },
    { id: 'loc-loja', nome: 'Loja João Pessoa' },
  ]);
  obterPedido.mockImplementation(async (id) => ({ dados: { id, numero: id === 'ped-12' ? 12 : 7 } }));
  listarEntregas.mockResolvedValue({ dados: [PENDENTE, ENTREGUE] });
});

describe('useEntregas', () => {
  it('carrega a primeira página e filtra voltando para a página 1', async () => {
    listarEntregas.mockResolvedValue({ dados: Array.from({ length: TAMANHO_PAGINA + 1 }, (_, i) => ({ ...PENDENTE, id: `e-${i}` })) });
    const { result } = renderHook(() => useEntregas());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.entregas).toHaveLength(TAMANHO_PAGINA);
    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.filtrar({ empresa: 'emp-mia', status: 'pendente', previsao_ate: '2026-10-31' }));

    await waitFor(() =>
      expect(listarEntregas).toHaveBeenLastCalledWith(
        expect.objectContaining({ pagina: 1, empresa: 'emp-mia', status: 'pendente', previsao_ate: '2026-10-31' })
      )
    );
  });
});

describe('Entregas', () => {
  it('lista com status, pedido, itens, locais, frete, previsão e andamento', async () => {
    renderizar();

    const pendente = (await screen.findByText('Rodonaves')).closest('tr');
    expect(await within(pendente).findByRole('link', { name: 'Pedido 12' })).toHaveAttribute('href', '/pedidos/ped-12');
    expect(within(pendente).getByText('Pendente')).toBeInTheDocument();
    expect(within(pendente).getByText('2 itens, 35 unidades')).toBeInTheDocument();
    expect(await within(pendente).findByText('Galpão Cabedelo')).toBeInTheDocument();
    expect(within(pendente).getByText('CIF · R$ 180,00')).toBeInTheDocument();
    expect(within(pendente).getByText('20/10/2026')).toBeInTheDocument();
    const entregue = (await screen.findByRole('link', { name: 'Pedido 7' })).closest('tr');
    expect(within(entregue).getByText('1 item, 6 unidades')).toBeInTheDocument();
    expect(within(entregue).getByText('Entregue em 17/10/2026')).toBeInTheDocument();
    expect(obterPedido).toHaveBeenCalledTimes(2);
  });

  it('mostra o vazio conforme o filtro e o erro com nova tentativa', async () => {
    listarEntregas.mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValue({ dados: [] });

    renderizar();

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhuma entrega nas empresas do seu acesso.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'saiu' } });
    expect(await screen.findByText('Nenhuma entrega encontrada com estes filtros.')).toBeInTheDocument();
  });

  it('filtra por empresa, status e previsão até uma data', async () => {
    renderizar();
    await screen.findByText('Rodonaves');
    await screen.findByRole('option', { name: 'MIA' });

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-mia' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'pendente' } });
    fireEvent.change(screen.getByLabelText('Previsão até'), { target: { value: '2026-10-31' } });

    await waitFor(() =>
      expect(listarEntregas).toHaveBeenLastCalledWith(
        expect.objectContaining({ empresa: 'emp-mia', status: 'pendente', previsao_ate: '2026-10-31', pagina: 1 })
      )
    );
  });
});
