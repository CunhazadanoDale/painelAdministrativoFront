import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as comissoesService from '../../services/comissoes';
import * as empresasService from '../../services/empresas';
import * as pedidosService from '../../services/pedidos';
import * as representantesService from '../../services/representantes';
import Comissoes from './Comissoes';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/pedidos', () => ({ obterPedido: vi.fn(), listarPedidos: vi.fn() }));
vi.mock('../../services/representantes', () => ({ listarTodosRepresentantes: vi.fn(), obterRepresentante: vi.fn() }));
vi.mock('../../services/comissoes', () => ({
  listarComissoes: vi.fn(),
  listarAjustesComissao: vi.fn(),
  criarAjusteComissao: vi.fn(),
}));

const svc = comissoesService;

const DESCONTO = {
  id: 'aj-1',
  empresa_id: 'emp-mia',
  representante_id: 'rep-jose',
  pedido_id: 'ped-12',
  competencia: '2026-10',
  valor_centavos: -37500,
  motivo: 'devolução de uma peça',
  fechamento_id: null,
};

const PREMIO = { ...DESCONTO, id: 'aj-2', pedido_id: null, valor_centavos: 50000, motivo: 'prêmio de meta', fechamento_id: 'fec-1' };

function perfil(financeiro = true) {
  useAutenticacao.mockReturnValue({ financeiro, administrador: false, comercial: false });
}

async function abrirAjustes() {
  render(
    <MemoryRouter>
      <Comissoes />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('tab', { name: 'Ajustes' }));
  await screen.findByText('devolução de uma peça');
}

async function abrirNovo() {
  await abrirAjustes();
  fireEvent.click(screen.getByRole('button', { name: /Novo ajuste/ }));
  const dialogo = screen.getByRole('dialog', { name: 'Novo ajuste de comissão' });
  await waitFor(() => expect(within(dialogo).getByLabelText('Empresa *')).toHaveValue('emp-mia'));
  await within(dialogo).findByRole('option', { name: 'José Vendas' });
  return dialogo;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'));
  perfil();
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  pedidosService.obterPedido.mockResolvedValue({ dados: { id: 'ped-12', numero: 12 } });
  pedidosService.listarPedidos.mockResolvedValue({
    dados: [
      { id: 'ped-12', numero: 12, status: 'parcialmente_entregue' },
      { id: 'ped-13', numero: 13, status: 'proposta' },
    ],
  });
  representantesService.obterRepresentante.mockResolvedValue({ dados: { id: 'rep-jose', nome: 'José Vendas' } });
  representantesService.listarTodosRepresentantes.mockResolvedValue([
    { id: 'rep-jose', nome: 'José Vendas' },
    { id: 'rep-ana', nome: 'Ana Representações' },
  ]);
  svc.listarComissoes.mockResolvedValue({ dados: [] });
  svc.listarAjustesComissao.mockResolvedValue({ dados: [DESCONTO, PREMIO] });
  svc.criarAjusteComissao.mockResolvedValue({ dados: DESCONTO });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Ajustes de comissão', () => {
  it('lista os ajustes com valor com sinal, motivo, pedido e situação', async () => {
    await abrirAjustes();

    const desconto = screen.getByText('devolução de uma peça').closest('tr');
    expect(within(desconto).getByText('-R$ 375,00')).toBeInTheDocument();
    expect(within(desconto).getByText('10/2026')).toBeInTheDocument();
    expect(await within(desconto).findByRole('link', { name: 'Pedido 12' })).toHaveAttribute('href', '/pedidos/ped-12');
    expect(within(desconto).getByText('Em aberto')).toBeInTheDocument();
    const premio = screen.getByText('prêmio de meta').closest('tr');
    expect(within(premio).getByText('R$ 500,00')).toBeInTheDocument();
    expect(within(premio).getByText('—')).toBeInTheDocument();
    expect(within(premio).getByText('Fechado')).toBeInTheDocument();
  });

  it('filtra os ajustes por competência e situação', async () => {
    await abrirAjustes();

    fireEvent.change(screen.getByLabelText('Competência'), { target: { value: '2026-09' } });
    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'false' } });

    await waitFor(() =>
      expect(svc.listarAjustesComissao).toHaveBeenLastCalledWith(
        expect.objectContaining({ competencia: '2026-09', aberto: 'false', pagina: 1 })
      )
    );
  });

  it('valida o ajuste antes de enviar', async () => {
    const dialogo = await abrirNovo();
    expect(within(dialogo).getByLabelText('Competência *')).toHaveValue('2026-10');
    fireEvent.change(within(dialogo).getByLabelText('Competência *'), { target: { value: '2026-11' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Lançar ajuste' }));

    expect(await within(dialogo).findByText('Escolha o representante.')).toBeInTheDocument();
    expect(within(dialogo).getByText('A competência não pode ser posterior ao mês corrente.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe um valor maior que zero.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe o motivo do ajuste.')).toBeInTheDocument();
    expect(svc.criarAjusteComissao).not.toHaveBeenCalled();
  });

  it('lança um desconto ligado a um pedido do representante, com valor negativo', async () => {
    const dialogo = await abrirNovo();
    fireEvent.change(within(dialogo).getByLabelText('Representante *'), { target: { value: 'rep-jose' } });
    await within(dialogo).findByRole('option', { name: 'Pedido 12' });
    expect(within(dialogo).queryByRole('option', { name: 'Pedido 13' })).toBeNull();
    expect(pedidosService.listarPedidos).toHaveBeenCalledWith(
      expect.objectContaining({ empresa: 'emp-mia', representante: 'rep-jose' })
    );
    fireEvent.change(within(dialogo).getByLabelText('Pedido'), { target: { value: 'ped-12' } });
    fireEvent.change(within(dialogo).getByLabelText('Tipo *'), { target: { value: 'desconto' } });
    fireEvent.change(within(dialogo).getByLabelText('Valor *'), { target: { value: '375,00' } });
    fireEvent.change(within(dialogo).getByLabelText('Motivo *'), { target: { value: ' devolução de uma peça ' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Lançar ajuste' }));

    await waitFor(() =>
      expect(svc.criarAjusteComissao).toHaveBeenCalledWith({
        empresa_id: 'emp-mia',
        representante_id: 'rep-jose',
        pedido_id: 'ped-12',
        competencia: '2026-10',
        valor_centavos: -37500,
        motivo: 'devolução de uma peça',
      })
    );
    await waitFor(() => expect(svc.listarAjustesComissao).toHaveBeenCalledTimes(2));
  });

  it('lança um acréscimo sem pedido e mostra a recusa da API', async () => {
    svc.criarAjusteComissao.mockRejectedValueOnce(
      new ErroApi(400, 'erro de validação: representante do ajuste não encontrado')
    );
    const dialogo = await abrirNovo();
    fireEvent.change(within(dialogo).getByLabelText('Representante *'), { target: { value: 'rep-ana' } });
    fireEvent.change(within(dialogo).getByLabelText('Valor *'), { target: { value: '500,00' } });
    fireEvent.change(within(dialogo).getByLabelText('Motivo *'), { target: { value: 'prêmio de meta' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Lançar ajuste' }));

    expect(await within(dialogo).findByText(/representante do ajuste não encontrado/)).toBeInTheDocument();
    expect(svc.criarAjusteComissao).toHaveBeenCalledWith(
      expect.objectContaining({ representante_id: 'rep-ana', pedido_id: null, valor_centavos: 50000 })
    );
  });

  it('quem não é financeiro vê os ajustes sem lançar', async () => {
    perfil(false);
    await abrirAjustes();

    expect(screen.queryByRole('button', { name: /Novo ajuste/ })).toBeNull();
  });
});
