import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as caixaService from '../../services/caixa';
import * as contasService from '../../services/contasBancarias';
import * as empresasService from '../../services/empresas';
import Caixa from './Caixa';
import { useMovimentoDiario } from './useMovimentoDiario';
import { useProjecaoCaixa } from './useProjecaoCaixa';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/contasBancarias', () => ({ listarTodasContasBancarias: vi.fn(), obterContaBancaria: vi.fn() }));
vi.mock('../../services/caixa', () => ({ listarSaldos: vi.fn(), obterProjecao: vi.fn(), listarMovimentoDiario: vi.fn() }));

const svc = caixaService;

const PROJECAO = {
  de: '2026-10-19',
  ate: '2026-11-18',
  saldo_de_partida: { extrato_centavos: 101500, em_transito_centavos: -50000, total_centavos: 51500, contas_consideradas: 2, contas_sem_saldo_inicial: 1 },
  saldo_final_centavos: -3500,
  dias: [
    { data: '2026-10-19', entradas_centavos: 0, entradas_vencidas_centavos: 20000, saidas_centavos: 5000, saidas_estimadas_centavos: 0, saidas_vencidas_centavos: 0, recorrentes_centavos: 0, saldo_centavos: 66500 },
    { data: '2026-10-20', entradas_centavos: 0, entradas_vencidas_centavos: 0, saidas_centavos: 60000, saidas_estimadas_centavos: 10000, saidas_vencidas_centavos: 0, recorrentes_centavos: 0, saldo_centavos: -3500 },
  ],
};

async function abrir(aba) {
  render(
    <MemoryRouter>
      <Caixa />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('tab', { name: aba }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'));
  useAutenticacao.mockReturnValue({ financeiro: true, administrador: false });
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  contasService.listarTodasContasBancarias.mockResolvedValue([{ id: 'cb-sic', apelido: 'Sicredi movimento', banco_nome: 'Sicredi' }]);
  contasService.obterContaBancaria.mockResolvedValue({ dados: { id: 'cb-sic', apelido: 'Sicredi movimento', banco_nome: 'Sicredi' } });
  svc.listarSaldos.mockResolvedValue({ dados: [] });
  svc.obterProjecao.mockResolvedValue({ dados: PROJECAO });
  svc.listarMovimentoDiario.mockResolvedValue({
    dados: [{ data: '2026-10-14', conta_bancaria_id: 'cb-sic', entradas_centavos: 2000, saidas_centavos: 500, saldo_centavos: 101500 }],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('hooks da projeção e do movimento', () => {
  it('buscam com os filtros e de novo ao filtrar', async () => {
    const projecao = renderHook(() => useProjecaoCaixa({ empresa: '', ate: '2026-11-18' }));
    await waitFor(() => expect(projecao.result.current.projecao).toEqual(PROJECAO));
    expect(svc.obterProjecao).toHaveBeenCalledWith({ empresa: '', ate: '2026-11-18', sinal: expect.anything() });
    act(() => projecao.result.current.filtrar({ empresa: 'emp-mia' }));
    await waitFor(() => expect(svc.obterProjecao).toHaveBeenLastCalledWith(expect.objectContaining({ empresa: 'emp-mia' })));

    const movimento = renderHook(() => useMovimentoDiario({ empresa: '', conta: '', de: '2026-10-01', ate: '2026-10-19' }));
    await waitFor(() => expect(movimento.result.current.itens).toHaveLength(1));
    act(() => movimento.result.current.filtrar({ conta: 'cb-sic' }));
    await waitFor(() => expect(svc.listarMovimentoDiario).toHaveBeenLastCalledWith(expect.objectContaining({ conta: 'cb-sic' })));
  });
});

describe('Projeção diária', () => {
  it('mostra o saldo de partida, o aviso de contas sem saldo inicial e o saldo dia a dia', async () => {
    await abrir('Projeção');

    expect(await screen.findByText('R$ 515,00')).toBeInTheDocument();
    expect(screen.getByText(/1 conta\(s\) sem saldo inicial ficaram de fora/)).toBeInTheDocument();
    expect(svc.obterProjecao).toHaveBeenCalledWith(expect.objectContaining({ empresa: '', ate: '2026-11-18' }));
    const tabela = screen.getByRole('table', { name: 'Projeção diária' });
    const hoje = within(tabela).getByText('19/10/2026').closest('tr');
    expect(within(hoje).getByText('R$ 200,00 vencidas')).toBeInTheDocument();
    expect(within(hoje).getByText('R$ 665,00')).toBeInTheDocument();
    const amanha = within(tabela).getByText('20/10/2026').closest('tr');
    expect(within(amanha).getByText('R$ 100,00 estimadas')).toBeInTheDocument();
    expect(within(amanha).getByText('-R$ 35,00')).toHaveClass('caixa-negativo');
  });

  it('troca a empresa e o horizonte, até 90 dias', async () => {
    await abrir('Projeção');
    await screen.findByText('R$ 515,00');
    await screen.findByRole('option', { name: 'MIA' });

    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2027-02-01' } });
    expect(screen.getByText('A projeção vai no máximo até 17/01/2027.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-12-01' } });
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-mia' } });

    await waitFor(() =>
      expect(svc.obterProjecao).toHaveBeenLastCalledWith(expect.objectContaining({ empresa: 'emp-mia', ate: '2026-12-01' }))
    );
    expect(svc.obterProjecao).not.toHaveBeenCalledWith(expect.objectContaining({ ate: '2027-02-01' }));
  });

  it('mostra o erro com nova tentativa', async () => {
    svc.obterProjecao.mockRejectedValueOnce(new ErroApi(400, 'erro de validação: data final antes de hoje')).mockResolvedValue({ dados: PROJECAO });
    await abrir('Projeção');

    expect(await screen.findByText('erro de validação: data final antes de hoje')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('R$ 515,00')).toBeInTheDocument();
  });
});

describe('Movimento diário', () => {
  it('mostra o realizado por conta e dia e filtra pelo período até 92 dias', async () => {
    await abrir('Movimento diário');

    const linha = (await screen.findByText('14/10/2026')).closest('tr');
    expect(await within(linha).findByText('Sicredi movimento · Sicredi')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 20,00')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 5,00')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 1.015,00')).toBeInTheDocument();
    expect(svc.listarMovimentoDiario).toHaveBeenCalledWith(expect.objectContaining({ de: '2026-10-01', ate: '2026-10-19' }));

    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-06-01' } });
    expect(screen.getByText('O período vai até 92 dias.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-09-01' } });
    await waitFor(() => expect(svc.listarMovimentoDiario).toHaveBeenLastCalledWith(expect.objectContaining({ de: '2026-09-01' })));
    expect(svc.listarMovimentoDiario).not.toHaveBeenCalledWith(expect.objectContaining({ de: '2026-06-01' }));
  });
});
