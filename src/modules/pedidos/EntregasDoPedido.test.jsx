import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import * as locaisService from '../../services/locais';
import * as pedidosService from '../../services/pedidos';
import { EntregasDoPedido } from './EntregasDoPedido';

vi.mock('../../services/locais', () => ({ listarTodosLocais: vi.fn() }));
vi.mock('../../services/pedidos', () => ({
  listarEntregasDoPedido: vi.fn(),
  criarEntrega: vi.fn(),
  marcarSaida: vi.fn(),
  marcarEntregue: vi.fn(),
  cancelarEntrega: vi.fn(),
}));

const svc = pedidosService;

const PEDIDO = {
  id: 'ped-12',
  empresa_id: 'emp-mia',
  numero: 12,
  status: 'confirmado',
  itens: [
    { id: 'item-cimento', produto_id: 'prod-cimento', quantidade: 100, restante: 100 },
    { id: 'item-areia', produto_id: 'prod-areia', quantidade: 6, restante: 0 },
  ],
};

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
  versao: 2,
  itens: [{ pedido_item_id: 'item-cimento', local_id: 'loc-galpao', quantidade: 30, movimento_id: null }],
};

const EM_TRANSITO = {
  ...PENDENTE,
  id: 'ent-2',
  status: 'saiu',
  transportadora: null,
  frete_tipo: 'fob',
  frete_centavos: null,
  saiu_em: '2026-10-16T00:00:00Z',
  versao: 5,
  itens: [{ pedido_item_id: 'item-areia', local_id: 'loc-galpao', quantidade: 6, movimento_id: 'mov-1' }],
};

const NOMES = { 'prod-cimento': 'Cimento CP II 50', 'prod-areia': 'Areia média' };
const nomeProduto = (id) => NOMES[id] ?? '—';

function renderizar({ comercial = true, pedido = PEDIDO, onAlterou = vi.fn() } = {}) {
  render(
    <EntregasDoPedido pedido={pedido} comercial={comercial} geracao={0} nomeProduto={nomeProduto} onAlterou={onAlterou} />
  );
  return onAlterou;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-18T15:00:00Z'));
  locaisService.listarTodosLocais.mockImplementation(async ({ empresa } = {}) =>
    [
      { id: 'loc-galpao', nome: 'Galpão Cabedelo', empresa_id: 'emp-mia' },
      { id: 'loc-loja', nome: 'Loja João Pessoa', empresa_id: 'emp-mia' },
      { id: 'loc-recife', nome: 'Recife', empresa_id: 'emp-gig' },
    ].filter((local) => !empresa || local.empresa_id === empresa)
  );
  svc.listarEntregasDoPedido.mockResolvedValue({ dados: [PENDENTE, EM_TRANSITO] });
  [svc.criarEntrega, svc.marcarSaida, svc.marcarEntregue, svc.cancelarEntrega].forEach((funcao) =>
    funcao.mockResolvedValue({ dados: PENDENTE })
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('EntregasDoPedido', () => {
  it('lista as entregas com status, frete, previsão, itens e local', async () => {
    renderizar();

    const pendente = (await screen.findByText('Rodonaves')).closest('tr');
    expect(within(pendente).getByText('Pendente')).toBeInTheDocument();
    expect(within(pendente).getByText('CIF · R$ 180,00')).toBeInTheDocument();
    expect(within(pendente).getByText('20/10/2026')).toBeInTheDocument();
    expect(await within(pendente).findByText('30 × Cimento CP II 50 · Galpão Cabedelo')).toBeInTheDocument();
    const transito = screen.getByText('Em trânsito').closest('tr');
    expect(within(transito).getByText('FOB')).toBeInTheDocument();
    expect(within(transito).getByText('Saiu em 16/10/2026')).toBeInTheDocument();
  });

  it('mostra o vazio e o erro com nova tentativa', async () => {
    svc.listarEntregasDoPedido.mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValue({ dados: [] });
    renderizar();

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhuma entrega programada.')).toBeInTheDocument();
  });

  it('quem não é comercial só consulta', async () => {
    renderizar({ comercial: false });
    await screen.findByText('Rodonaves');

    expect(screen.queryByRole('button', { name: /Programar entrega/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Dar saída' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Marcar entregue' })).toBeNull();
  });

  it('não oferece programar entrega em pedido que não está confirmado', async () => {
    renderizar({ pedido: { ...PEDIDO, status: 'proposta' } });
    await screen.findByText('Rodonaves');

    expect(screen.queryByRole('button', { name: /Programar entrega/ })).toBeNull();
  });

  it('programa a entrega só com o que ainda falta programar, por item e local da empresa', async () => {
    const onAlterou = renderizar();
    await screen.findByText('Rodonaves');
    fireEvent.click(screen.getByRole('button', { name: /Programar entrega/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Programar entrega do pedido 12' });

    expect(within(dialogo).getByText('Cimento CP II 50')).toBeInTheDocument();
    expect(within(dialogo).getByText('até 70')).toBeInTheDocument();
    expect(within(dialogo).queryByText('Areia média')).toBeNull();
    await within(dialogo).findByRole('option', { name: 'Loja João Pessoa' });
    expect(within(dialogo).queryByRole('option', { name: 'Recife' })).toBeNull();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Programar' }));
    expect(await within(dialogo).findByText('Informe a quantidade de pelo menos um item.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Quantidade de Cimento CP II 50'), { target: { value: '80' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Programar' }));
    expect(await within(dialogo).findByText('Cimento CP II 50: no máximo 70.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Quantidade de Cimento CP II 50'), { target: { value: '20' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Programar' }));
    expect(await within(dialogo).findByText('Cimento CP II 50: escolha o local de saída.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe o valor do frete CIF.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Local de Cimento CP II 50'), { target: { value: 'loc-loja' } });
    fireEvent.change(within(dialogo).getByLabelText('Valor do frete'), { target: { value: '150,00' } });
    fireEvent.change(within(dialogo).getByLabelText('Transportadora'), { target: { value: ' Jamef ' } });
    fireEvent.change(within(dialogo).getByLabelText('Previsão'), { target: { value: '2026-10-25' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Programar' }));

    await waitFor(() =>
      expect(svc.criarEntrega).toHaveBeenCalledWith('ped-12', {
        transportadora: 'Jamef',
        frete_tipo: 'cif',
        frete_centavos: 15000,
        previsao: '2026-10-25',
        itens: [{ pedido_item_id: 'item-cimento', local_id: 'loc-loja', quantidade: 20 }],
      })
    );
    await waitFor(() => expect(onAlterou).toHaveBeenCalled());
  });

  it('no frete FOB o valor é opcional e vai nulo quando vazio', async () => {
    renderizar();
    await screen.findByText('Rodonaves');
    fireEvent.click(screen.getByRole('button', { name: /Programar entrega/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Programar entrega do pedido 12' });
    await within(dialogo).findByRole('option', { name: 'Galpão Cabedelo' });

    fireEvent.change(within(dialogo).getByLabelText('Frete *'), { target: { value: 'fob' } });
    fireEvent.change(within(dialogo).getByLabelText('Quantidade de Cimento CP II 50'), { target: { value: '5' } });
    fireEvent.change(within(dialogo).getByLabelText('Local de Cimento CP II 50'), { target: { value: 'loc-galpao' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Programar' }));

    await waitFor(() =>
      expect(svc.criarEntrega).toHaveBeenCalledWith('ped-12', {
        transportadora: null,
        frete_tipo: 'fob',
        frete_centavos: null,
        previsao: null,
        itens: [{ pedido_item_id: 'item-cimento', local_id: 'loc-galpao', quantidade: 5 }],
      })
    );
  });

  it('dá saída com a data de hoje, avisando da baixa do estoque', async () => {
    const onAlterou = renderizar();
    const pendente = (await screen.findByText('Rodonaves')).closest('tr');

    fireEvent.click(within(pendente).getByRole('button', { name: 'Dar saída' }));
    const dialogo = screen.getByRole('dialog', { name: 'Dar saída na entrega' });
    expect(within(dialogo).getByText(/baixa o estoque/)).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Saiu em *')).toHaveValue('2026-10-18');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Dar saída' }));

    await waitFor(() => expect(svc.marcarSaida).toHaveBeenCalledWith('ent-1', { versao: 2, saiu_em: '2026-10-18' }));
    await waitFor(() => expect(onAlterou).toHaveBeenCalled());
  });

  it('mostra o saldo insuficiente na saída sem fechar', async () => {
    svc.marcarSaida.mockRejectedValue(new ErroApi(400, 'erro de validação: saldo disponível insuficiente no local'));
    renderizar();
    const pendente = (await screen.findByText('Rodonaves')).closest('tr');

    fireEvent.click(within(pendente).getByRole('button', { name: 'Dar saída' }));
    const dialogo = screen.getByRole('dialog', { name: 'Dar saída na entrega' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Dar saída' }));

    expect(await within(dialogo).findByText(/saldo disponível insuficiente no local/)).toBeInTheDocument();
  });

  it('marca entregue sem aceitar data antes da saída', async () => {
    renderizar();
    const transito = (await screen.findByText('Em trânsito')).closest('tr');

    fireEvent.click(within(transito).getByRole('button', { name: 'Marcar entregue' }));
    const dialogo = screen.getByRole('dialog', { name: 'Marcar entrega como entregue' });
    fireEvent.change(within(dialogo).getByLabelText('Entregue em *'), { target: { value: '2026-10-15' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Marcar entregue' }));
    expect(await within(dialogo).findByText('A entrega não pode ser antes da saída (16/10/2026).')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Entregue em *'), { target: { value: '2026-10-17' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Marcar entregue' }));

    await waitFor(() =>
      expect(svc.marcarEntregue).toHaveBeenCalledWith('ent-2', { versao: 5, entregue_em: '2026-10-17' })
    );
  });

  it('cancela a entrega pendente com a versão e recarrega no conflito', async () => {
    svc.cancelarEntrega.mockRejectedValueOnce(
      new ErroApi(409, 'a entrega foi alterada por outra pessoa; recarregue e tente de novo')
    );
    const onAlterou = renderizar();
    const pendente = (await screen.findByText('Rodonaves')).closest('tr');

    fireEvent.click(within(pendente).getByRole('button', { name: 'Cancelar entrega' }));
    const dialogo = screen.getByRole('dialog', { name: 'Cancelar entrega' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar a entrega' }));
    expect(await within(dialogo).findByText(/alterada por outra pessoa/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Recarregar dados' }));

    await waitFor(() => expect(onAlterou).toHaveBeenCalled());
    expect(svc.cancelarEntrega).toHaveBeenCalledWith('ent-1', 2);
  });
});
