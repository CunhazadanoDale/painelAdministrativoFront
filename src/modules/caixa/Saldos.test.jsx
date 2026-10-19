import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as caixaService from '../../services/caixa';
import * as empresasService from '../../services/empresas';
import Caixa from './Caixa';
import { useSaldosCaixa } from './useSaldosCaixa';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/caixa', () => ({ listarSaldos: vi.fn(), obterAbertura: vi.fn(), definirAbertura: vi.fn() }));

const svc = caixaService;
const CONFLITO = 'o saldo inicial da conta foi alterado por outra pessoa; recarregue e tente de novo';

const SICREDI = {
  conta_bancaria_id: 'cb-sic',
  empresa_id: 'emp-mia',
  apelido: 'Sicredi movimento',
  banco: '748',
  banco_nome: 'Sicredi',
  ativa: true,
  data_corte: '2026-09-30',
  saldo_inicial_centavos: 100000,
  saldo_atual_centavos: 193710,
  ultimo_lancamento_em: '2026-10-14',
  saldo_banco_centavos: 194950,
  saldo_banco_em: '2026-10-12',
  diferenca_banco_centavos: -50,
  lancamentos_pendentes: 4,
};

const ITAU = {
  ...SICREDI,
  conta_bancaria_id: 'cb-itau',
  apelido: 'Itaú cobrança',
  banco_nome: 'Itaú',
  data_corte: null,
  saldo_inicial_centavos: null,
  saldo_atual_centavos: null,
  ultimo_lancamento_em: null,
  saldo_banco_centavos: null,
  saldo_banco_em: null,
  diferenca_banco_centavos: null,
  lancamentos_pendentes: 0,
};

function renderizar() {
  return render(
    <MemoryRouter>
      <Caixa />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'));
  useAutenticacao.mockReturnValue({ financeiro: true, administrador: false });
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  svc.listarSaldos.mockResolvedValue({ dados: [SICREDI, ITAU] });
  svc.obterAbertura.mockResolvedValue({ dados: { conta_bancaria_id: 'cb-sic', data_corte: '2026-09-30', saldo_centavos: 100000, versao: 3 } });
  svc.definirAbertura.mockResolvedValue({ dados: {} });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSaldosCaixa', () => {
  it('busca os saldos da empresa e de novo ao filtrar', async () => {
    const { result } = renderHook(() => useSaldosCaixa());
    await waitFor(() => expect(result.current.saldos).toHaveLength(2));
    expect(svc.listarSaldos).toHaveBeenCalledWith({ empresa: '', sinal: expect.anything() });

    act(() => result.current.filtrar('emp-mia'));
    await waitFor(() => expect(svc.listarSaldos).toHaveBeenLastCalledWith({ empresa: 'emp-mia', sinal: expect.anything() }));
  });
});

describe('Saldos do caixa', () => {
  it('mostra o saldo de cada conta com o banco, a diferença e as pendências', async () => {
    renderizar();

    const sicredi = (await screen.findByText('Sicredi movimento · Sicredi')).closest('tr');
    expect(within(sicredi).getByText('R$ 1.937,10')).toBeInTheDocument();
    expect(within(sicredi).getByText('R$ 1.000,00 em 30/09/2026')).toBeInTheDocument();
    expect(within(sicredi).getByText('14/10/2026')).toBeInTheDocument();
    expect(within(sicredi).getByText('R$ 1.949,50 em 12/10/2026')).toBeInTheDocument();
    expect(within(sicredi).getByText('-R$ 0,50')).toBeInTheDocument();
    expect(within(sicredi).getByText('4')).toBeInTheDocument();
    const itau = screen.getByText('Itaú cobrança · Itaú').closest('tr');
    expect(within(itau).getByText('Sem saldo inicial')).toBeInTheDocument();
    expect(within(itau).getByRole('button', { name: 'Informar saldo inicial' })).toBeInTheDocument();
  });

  it('informa o primeiro saldo inicial sem versão, aceitando negativo', async () => {
    svc.obterAbertura.mockRejectedValue(new ErroApi(404, 'registro não encontrado: conta sem saldo inicial'));
    renderizar();
    const itau = (await screen.findByText('Itaú cobrança · Itaú')).closest('tr');
    fireEvent.click(within(itau).getByRole('button', { name: 'Informar saldo inicial' }));
    const dialogo = screen.getByRole('dialog', { name: 'Saldo inicial — Itaú cobrança' });
    expect(await within(dialogo).findByLabelText('Data de corte *')).toHaveValue('2026-09-30');

    fireEvent.change(within(dialogo).getByLabelText('Data de corte *'), { target: { value: '2026-10-19' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialogo).findByText('A data de corte precisa ser antes de hoje.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe o saldo no fim do dia de corte.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Data de corte *'), { target: { value: '2026-09-30' } });
    fireEvent.change(within(dialogo).getByLabelText('Saldo no fim do dia *'), { target: { value: '-1.500,00' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(svc.definirAbertura).toHaveBeenCalledWith('cb-itau', { data_corte: '2026-09-30', saldo_centavos: -150000, versao: null })
    );
    await waitFor(() => expect(svc.listarSaldos).toHaveBeenCalledTimes(2));
  });

  it('altera o saldo inicial com a versão lida e trata o conflito', async () => {
    svc.definirAbertura.mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    renderizar();
    const sicredi = (await screen.findByText('Sicredi movimento · Sicredi')).closest('tr');
    fireEvent.click(within(sicredi).getByRole('button', { name: 'Alterar saldo inicial' }));
    const dialogo = screen.getByRole('dialog', { name: 'Saldo inicial — Sicredi movimento' });
    await waitFor(() => expect(within(dialogo).getByLabelText('Saldo no fim do dia *')).toHaveValue('1000,00'));
    fireEvent.change(within(dialogo).getByLabelText('Saldo no fim do dia *'), { target: { value: '1.100,00' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(svc.definirAbertura).toHaveBeenCalledWith('cb-sic', { data_corte: '2026-09-30', saldo_centavos: 110000, versao: 3 })
    );
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Recarregar dados' }));
    await waitFor(() => expect(svc.listarSaldos).toHaveBeenCalledTimes(2));
  });

  it('filtra por empresa e mostra o erro com nova tentativa', async () => {
    svc.listarSaldos.mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValue({ dados: [] });
    renderizar();

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhuma conta bancária nas empresas do seu acesso.')).toBeInTheDocument();
    await screen.findByRole('option', { name: 'MIA' });
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-mia' } });
    await waitFor(() => expect(svc.listarSaldos).toHaveBeenLastCalledWith(expect.objectContaining({ empresa: 'emp-mia' })));
  });
});
