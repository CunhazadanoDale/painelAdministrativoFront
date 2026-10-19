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
vi.mock('../../services/pedidos', () => ({ obterPedido: vi.fn() }));
vi.mock('../../services/representantes', () => ({ listarTodosRepresentantes: vi.fn(), obterRepresentante: vi.fn() }));
vi.mock('../../services/comissoes', () => ({
  listarComissoes: vi.fn(),
  listarPendenciasComissao: vi.fn(),
  apurarComissoes: vi.fn(),
}));

const svc = comissoesService;

const ABERTA = {
  id: 'com-1',
  empresa_id: 'emp-mia',
  representante_id: 'rep-jose',
  pedido_id: 'ped-12',
  entrega_id: 'ent-1',
  competencia: '2026-10',
  base_centavos: 600000,
  percentual_bp: 450,
  valor_centavos: 27000,
  fechamento_id: null,
};

const FECHADA = { ...ABERTA, id: 'com-2', entrega_id: 'ent-2', competencia: '2026-09', fechamento_id: 'fec-1' };

const PENDENTE = {
  entrega_id: 'ent-9',
  pedido_id: 'ped-12',
  pedido_numero: 12,
  empresa_id: 'emp-mia',
  representante_id: 'rep-jose',
  modelo: 'importacao',
  saiu_em: '2026-10-15',
};

function perfil(financeiro = true) {
  useAutenticacao.mockReturnValue({ financeiro, administrador: false, comercial: false });
}

function renderizar() {
  return render(
    <MemoryRouter>
      <Comissoes />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'));
  perfil();
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  pedidosService.obterPedido.mockResolvedValue({ dados: { id: 'ped-12', numero: 12 } });
  representantesService.obterRepresentante.mockResolvedValue({ dados: { id: 'rep-jose', nome: 'José Vendas' } });
  representantesService.listarTodosRepresentantes.mockResolvedValue([
    { id: 'rep-jose', nome: 'José Vendas' },
    { id: 'rep-ana', nome: 'Ana Representações' },
  ]);
  svc.listarComissoes.mockResolvedValue({ dados: [ABERTA, FECHADA] });
  svc.listarPendenciasComissao.mockResolvedValue({ dados: [PENDENTE] });
  svc.apurarComissoes.mockResolvedValue({ dados: { apuradas: ['com-3', 'com-4'], ja_existentes: 1, falhas: [], restam_entregas: false } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Comissoes', () => {
  it('lista as comissões com competência, representante, pedido, base, percentual, valor e situação', async () => {
    renderizar();

    const aberta = (await screen.findByText('10/2026', {}, { timeout: 5000 })).closest('tr');
    expect(await within(aberta).findByRole('link', { name: 'Pedido 12' }, { timeout: 5000 })).toHaveAttribute(
      'href',
      '/pedidos/ped-12'
    );
    expect(await within(aberta).findByText('José Vendas')).toBeInTheDocument();
    expect(within(aberta).getByText('R$ 6.000,00')).toBeInTheDocument();
    expect(within(aberta).getByText('4,50%')).toBeInTheDocument();
    expect(within(aberta).getByText('R$ 270,00')).toBeInTheDocument();
    expect(within(aberta).getByText('Em aberto')).toBeInTheDocument();
    const fechada = screen.getByText('09/2026').closest('tr');
    expect(within(fechada).getByText('Fechada')).toBeInTheDocument();
  });

  it('filtra por empresa, representante, competência e situação', async () => {
    renderizar();
    await screen.findAllByRole('link', { name: 'Pedido 12' });
    await screen.findByRole('option', { name: 'MIA' });
    await screen.findByRole('option', { name: 'Ana Representações' });

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-mia' } });
    fireEvent.change(screen.getByLabelText('Representante'), { target: { value: 'rep-ana' } });
    fireEvent.change(screen.getByLabelText('Competência'), { target: { value: '2026-09' } });
    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'true' } });

    await waitFor(() =>
      expect(svc.listarComissoes).toHaveBeenLastCalledWith(
        expect.objectContaining({ empresa: 'emp-mia', representante: 'rep-ana', competencia: '2026-09', aberta: 'true', pagina: 1 })
      )
    );
  });

  it('mostra o vazio e o erro da lista', async () => {
    svc.listarComissoes.mockRejectedValueOnce(new ErroApi(403, 'perfil sem permissão para ver comissões')).mockResolvedValue({ dados: [] });
    renderizar();

    expect(await screen.findByText('perfil sem permissão para ver comissões')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhuma comissão encontrada.')).toBeInTheDocument();
  });

  it('mostra as entregas pendentes de apuração', async () => {
    renderizar();
    fireEvent.click(screen.getByRole('tab', { name: 'Pendências de apuração' }));

    const linha = (await screen.findByRole('link', { name: 'Pedido 12' })).closest('tr');
    expect(within(linha).getByText('Importação')).toBeInTheDocument();
    expect(within(linha).getByText('15/10/2026')).toBeInTheDocument();
    expect(await within(linha).findByText('José Vendas')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Competência'), { target: { value: '2026-09' } });
    await waitFor(() =>
      expect(svc.listarPendenciasComissao).toHaveBeenLastCalledWith(expect.objectContaining({ competencia: '2026-09' }))
    );
  });

  it('apura com empresa e competência e mostra o resultado', async () => {
    renderizar();
    await screen.findAllByRole('link', { name: 'Pedido 12' });
    fireEvent.click(screen.getByRole('button', { name: 'Apurar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Apurar comissões' });
    await within(dialogo).findByRole('option', { name: 'MIA' });
    fireEvent.change(within(dialogo).getByLabelText('Competência até'), { target: { value: '2026-11' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Apurar' }));
    expect(await within(dialogo).findByText('A competência não pode ser posterior ao mês corrente.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Empresa'), { target: { value: 'emp-mia' } });
    fireEvent.change(within(dialogo).getByLabelText('Competência até'), { target: { value: '2026-09' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Apurar' }));

    await waitFor(() => expect(svc.apurarComissoes).toHaveBeenCalledWith({ empresa_id: 'emp-mia', competencia: '2026-09' }));
    expect(await screen.findByText('Apuração: 2 entrega(s) apurada(s), 1 já apurada(s) antes.')).toBeInTheDocument();
    await waitFor(() => expect(svc.listarComissoes).toHaveBeenCalledTimes(2));
  });

  it('mostra as falhas da apuração e avisa quando restam entregas', async () => {
    svc.apurarComissoes.mockResolvedValue({
      dados: {
        apuradas: [],
        ja_existentes: 0,
        falhas: [{ entrega_id: 'ent-7', representante_id: 'rep-jose', motivo: 'pedido sem representante não tem comissão' }],
        restam_entregas: true,
      },
    });
    renderizar();
    await screen.findAllByRole('link', { name: 'Pedido 12' });
    fireEvent.click(screen.getByRole('button', { name: 'Apurar' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Apurar comissões' })).getByRole('button', { name: 'Apurar' }));

    const resultado = await screen.findByRole('region', { name: 'Resultado da apuração' });
    expect(within(resultado).getByText(/pedido sem representante não tem comissão/)).toBeInTheDocument();
    expect(within(resultado).getByText('Ainda há entregas a apurar; apure de novo.')).toBeInTheDocument();
    expect(svc.apurarComissoes).toHaveBeenCalledWith({ empresa_id: '', competencia: '' });
  });

  it('quem não é financeiro vê só as próprias comissões, sem pendências nem apuração', async () => {
    perfil(false);
    renderizar();
    await screen.findAllByRole('link', { name: 'Pedido 12' });

    expect(screen.queryByRole('tab', { name: 'Pendências de apuração' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Apurar' })).toBeNull();
    expect(screen.queryByLabelText('Representante')).toBeNull();
    expect(representantesService.listarTodosRepresentantes).not.toHaveBeenCalled();
  });
});
