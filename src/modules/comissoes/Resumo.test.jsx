import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as comissoesService from '../../services/comissoes';
import * as empresasService from '../../services/empresas';
import * as representantesService from '../../services/representantes';
import Comissoes from './Comissoes';
import { useResumoComissoes } from './useResumoComissoes';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/pedidos', () => ({ obterPedido: vi.fn() }));
vi.mock('../../services/representantes', () => ({ listarTodosRepresentantes: vi.fn(), obterRepresentante: vi.fn() }));
vi.mock('../../services/comissoes', () => ({ listarComissoes: vi.fn(), obterResumoComissoes: vi.fn() }));

const svc = comissoesService;

const RESUMO = {
  competencia: '2026-10',
  total_centavos: 45000,
  linhas: [
    {
      empresa_id: 'emp-mia',
      representante_id: 'rep-ana',
      representante_nome: 'Ana Representações',
      comissoes_centavos: 18000,
      ajustes_centavos: -10000,
      total_centavos: 8000,
      em_aberto_centavos: 0,
      fechado_centavos: 8000,
      pago_centavos: 8000,
    },
    {
      empresa_id: 'emp-mia',
      representante_id: 'rep-jose',
      representante_nome: 'José Vendas',
      comissoes_centavos: 37000,
      ajustes_centavos: 0,
      total_centavos: 37000,
      em_aberto_centavos: 37000,
      fechado_centavos: 0,
      pago_centavos: 0,
    },
  ],
};

function perfil(financeiro = true) {
  useAutenticacao.mockReturnValue({ financeiro, administrador: false, comercial: false });
}

async function abrirResumo() {
  render(
    <MemoryRouter>
      <Comissoes />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('tab', { name: 'Resumo' }));
  await screen.findByText('Ana Representações');
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'));
  perfil();
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  representantesService.listarTodosRepresentantes.mockResolvedValue([{ id: 'rep-jose', nome: 'José Vendas' }]);
  svc.listarComissoes.mockResolvedValue({ dados: [] });
  svc.obterResumoComissoes.mockResolvedValue({ dados: RESUMO });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useResumoComissoes', () => {
  it('busca a competência informada e de novo ao filtrar', async () => {
    const { result } = renderHook(() => useResumoComissoes('2026-10'));
    await waitFor(() => expect(result.current.resumo).toEqual(RESUMO));
    expect(svc.obterResumoComissoes).toHaveBeenCalledWith({ competencia: '2026-10', empresa: '', representante: '', sinal: expect.anything() });

    act(() => result.current.filtrar({ empresa: 'emp-mia' }));
    await waitFor(() =>
      expect(svc.obterResumoComissoes).toHaveBeenLastCalledWith(expect.objectContaining({ empresa: 'emp-mia' }))
    );
  });
});

describe('Resumo de comissões', () => {
  it('mostra o mês corrente por representante com aberto, fechado e pago, e o total', async () => {
    await abrirResumo();

    expect(screen.getByLabelText('Competência *')).toHaveValue('2026-10');
    const tabela = screen.getByRole('table', { name: 'Resumo de comissões' });
    const ana = within(tabela).getByText('Ana Representações').closest('tr');
    expect(await within(ana).findByText('MIA')).toBeInTheDocument();
    expect(within(ana).getByText('-R$ 100,00')).toBeInTheDocument();
    expect(within(ana).getAllByText('R$ 80,00')).toHaveLength(3);
    const jose = within(tabela).getByText('José Vendas').closest('tr');
    expect(within(jose).getAllByText('R$ 370,00')).toHaveLength(3);
    expect(screen.getByText('Total da competência: R$ 450,00')).toBeInTheDocument();
  });

  it('troca a competência e a empresa e não aceita competência vazia', async () => {
    await abrirResumo();
    await screen.findByRole('option', { name: 'MIA' });

    fireEvent.change(screen.getByLabelText('Competência *'), { target: { value: '' } });
    expect(screen.getByText('Informe a competência do resumo.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Competência *'), { target: { value: '2026-09' } });
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-mia' } });

    await waitFor(() =>
      expect(svc.obterResumoComissoes).toHaveBeenLastCalledWith(
        expect.objectContaining({ competencia: '2026-09', empresa: 'emp-mia' })
      )
    );
  });

  it('mostra o vazio e o erro com nova tentativa', async () => {
    svc.obterResumoComissoes
      .mockRejectedValueOnce(new ErroApi(403, 'perfil sem permissão para ver comissões'))
      .mockResolvedValue({ dados: { competencia: '2026-10', total_centavos: 0, linhas: [] } });
    render(
      <MemoryRouter>
        <Comissoes />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Resumo' }));

    expect(await screen.findByText('perfil sem permissão para ver comissões')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhuma comissão nem ajuste na competência.')).toBeInTheDocument();
  });
});

describe('Minhas comissões', () => {
  it('quem não é financeiro vê a tela como as próprias comissões, sem filtro de representante no resumo', async () => {
    perfil(false);
    await abrirResumo();

    expect(screen.getByRole('heading', { name: 'Minhas comissões' })).toBeInTheDocument();
    expect(screen.getByText(/só as comissões do seu cadastro de representante/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Representante')).toBeNull();
  });

  it('o financeiro vê o título geral', async () => {
    await abrirResumo();

    expect(screen.getByRole('heading', { name: 'Comissões' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Minhas comissões' })).toBeNull();
  });
});
