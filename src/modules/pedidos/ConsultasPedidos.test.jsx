import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as clientesService from '../../services/clientes';
import * as empresasService from '../../services/empresas';
import * as pedidosService from '../../services/pedidos';
import ConsultasPedidos from './ConsultasPedidos';

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/clientes', () => ({ obterCliente: vi.fn() }));
vi.mock('../../services/pedidos', () => ({
  listarPendencias: vi.fn(),
  listarPrazos: vi.fn(),
  listarCancelamentos: vi.fn(),
}));

const { listarPendencias, listarPrazos, listarCancelamentos } = pedidosService;

const PENDENCIA = {
  pedido_id: 'ped-12',
  numero: 12,
  empresa_id: 'emp-mia',
  cliente_id: 'cli-aguia',
  status: 'confirmado',
  prazo_limite: '2026-12-20T00:00:00Z',
  pedido_item_id: 'item-1',
  produto_id: 'prod-cimento',
  produto_nome: 'Cimento CP II 50',
  vendido: 100,
  entregue: 20,
  restante: 80,
  programado: 10,
  reservado: 50,
  falta_cobrir: 30,
  disponivel_na_empresa: 12,
  pode_cobrir_agora: 12,
};

const NO_PRAZO = (id, numero, dias) => ({
  id,
  numero,
  empresa_id: 'emp-mia',
  cliente_id: 'cli-aguia',
  status: 'confirmado',
  prazo_limite: '2026-10-21T00:00:00Z',
  valor_total_centavos: 359000,
  dias_para_o_prazo: dias,
});

const CANCELADO = {
  id: 'ped-7',
  numero: 7,
  empresa_id: 'emp-mia',
  cliente_id: 'cli-aguia',
  status: 'cancelado',
  cancelado_motivo: 'cliente desistiu',
  valor_total_centavos: 100000,
  entrada_paga_centavos: 30000,
  valor_a_devolver_centavos: 25000,
  atualizado_em: '2026-10-15T14:00:00Z',
};

function renderizar() {
  return render(
    <MemoryRouter>
      <ConsultasPedidos />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  clientesService.obterCliente.mockResolvedValue({ dados: { id: 'cli-aguia', nome: 'Construtora Águia' } });
  listarPendencias.mockResolvedValue({ dados: [PENDENCIA] });
  listarPrazos.mockResolvedValue({ dados: [NO_PRAZO('ped-1', 1, -3), NO_PRAZO('ped-2', 2, 0), NO_PRAZO('ped-3', 3, 5)] });
  listarCancelamentos.mockResolvedValue({ dados: [CANCELADO] });
});

describe('ConsultasPedidos', () => {
  it('abre nas pendências com o que falta entregar e cobrir por item', async () => {
    renderizar();

    expect(screen.getByRole('tab', { name: 'Pendências' })).toHaveAttribute('aria-selected', 'true');
    const linha = (await screen.findByText('Cimento CP II 50')).closest('tr');
    expect(within(linha).getByRole('link', { name: '12' })).toHaveAttribute('href', '/pedidos/ped-12');
    expect(await within(linha).findByText('Construtora Águia')).toBeInTheDocument();
    ['100', '20', '80', '10', '50', '30'].forEach((valor) => expect(within(linha).getByText(valor)).toBeInTheDocument());
    expect(within(linha).getAllByText('12')).toHaveLength(3);
    expect(within(linha).getByText('20/12/2026')).toBeInTheDocument();
    expect(listarPrazos).not.toHaveBeenCalled();
  });

  it('filtra as pendências pela empresa e mostra o vazio', async () => {
    listarPendencias.mockResolvedValue({ dados: [] });
    renderizar();
    expect(await screen.findByText('Nenhuma pendência de entrega.')).toBeInTheDocument();
    await screen.findByRole('option', { name: 'MIA' });

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-mia' } });

    await waitFor(() =>
      expect(listarPendencias).toHaveBeenLastCalledWith(expect.objectContaining({ empresa: 'emp-mia', pagina: 1 }))
    );
  });

  it('mostra os prazos vencidos e a vencer com os dias que faltam', async () => {
    renderizar();
    fireEvent.click(screen.getByRole('tab', { name: 'Prazos' }));

    expect(await screen.findByText('Vencido há 3 dias')).toBeInTheDocument();
    expect(screen.getByText('Vence hoje')).toBeInTheDocument();
    expect(screen.getByText('Vence em 5 dias')).toBeInTheDocument();
    expect(listarPrazos).toHaveBeenCalledWith(expect.objectContaining({ situacao: '', dias: 30 }));

    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'vencido' } });
    fireEvent.change(screen.getByLabelText('Dias à frente'), { target: { value: '15' } });

    await waitFor(() =>
      expect(listarPrazos).toHaveBeenLastCalledWith(expect.objectContaining({ situacao: 'vencido', dias: 15, pagina: 1 }))
    );
  });

  it('recusa dias fora de 0 a 365 sem buscar', async () => {
    renderizar();
    fireEvent.click(screen.getByRole('tab', { name: 'Prazos' }));
    await screen.findByText('Vence hoje');

    fireEvent.change(screen.getByLabelText('Dias à frente'), { target: { value: '400' } });

    expect(screen.getByText('Use de 0 a 365 dias.')).toBeInTheDocument();
    expect(listarPrazos).not.toHaveBeenLastCalledWith(expect.objectContaining({ dias: 400 }));
  });

  it('mostra os cancelamentos com motivo, entrada e devolução, e filtra por devolução e período', async () => {
    renderizar();
    fireEvent.click(screen.getByRole('tab', { name: 'Cancelamentos' }));

    const linha = (await screen.findByText('cliente desistiu')).closest('tr');
    expect(within(linha).getByText('R$ 1.000,00')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 300,00')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 250,00')).toBeInTheDocument();
    expect(within(linha).getByText('15/10/2026')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Só com valor a devolver'));
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-10-31' } });

    await waitFor(() =>
      expect(listarCancelamentos).toHaveBeenLastCalledWith(
        expect.objectContaining({ comDevolucao: true, de: '2026-10-01', ate: '2026-10-31', pagina: 1 })
      )
    );
  });

  it('mostra o erro da consulta com nova tentativa', async () => {
    listarCancelamentos
      .mockRejectedValueOnce(new Error('erro de validação: início depois do fim'))
      .mockResolvedValue({ dados: [] });
    renderizar();
    fireEvent.click(screen.getByRole('tab', { name: 'Cancelamentos' }));

    expect(await screen.findByText(/início depois do fim/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhum pedido cancelado.')).toBeInTheDocument();
  });
});
