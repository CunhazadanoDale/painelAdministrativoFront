import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import * as caixaService from '../../services/caixa';
import * as categoriasService from '../../services/categoriasFinanceiras';
import * as contasService from '../../services/contasBancarias';
import * as empresasService from '../../services/empresas';
import Caixa from './Caixa';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/categoriasFinanceiras', () => ({ obterCategoriaFinanceira: vi.fn() }));
vi.mock('../../services/contasBancarias', () => ({ listarTodasContasBancarias: vi.fn(), obterContaBancaria: vi.fn() }));
vi.mock('../../services/caixa', () => ({
  listarSaldos: vi.fn(),
  listarPendenciasSistema: vi.fn(),
  listarLancamentosCaixa: vi.fn(),
  listarTransferencias: vi.fn(),
  listarPagamentosSemConta: vi.fn(),
}));

const svc = caixaService;
const CONTAS = {
  'cb-sic': { id: 'cb-sic', apelido: 'Sicredi movimento', banco_nome: 'Sicredi' },
  'cb-itau': { id: 'cb-itau', apelido: 'Itaú cobrança', banco_nome: 'Itaú' },
};

async function abrirRegistros() {
  render(
    <MemoryRouter>
      <Caixa />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('tab', { name: 'Registros' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'));
  useAutenticacao.mockReturnValue({ financeiro: true, administrador: false });
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  contasService.listarTodasContasBancarias.mockResolvedValue(Object.values(CONTAS));
  contasService.obterContaBancaria.mockImplementation(async (id) => ({ dados: CONTAS[id] }));
  categoriasService.obterCategoriaFinanceira.mockResolvedValue({ dados: { id: 'sub-tarifa', nome: 'Tarifas' } });
  svc.listarSaldos.mockResolvedValue({ dados: [] });
  svc.listarPendenciasSistema.mockResolvedValue({
    dados: [{ tipo: 'recebimento', id: 'rec-1', data: '2026-10-10', valor_centavos: 50800, descricao: 'Construtora Águia - ALG-10', origem_id: 'tit-1' }],
  });
  svc.listarLancamentosCaixa.mockResolvedValue({
    dados: [
      { id: 'lc-1', empresa_id: 'emp-mia', conta_bancaria_id: 'cb-sic', data: '2026-10-05', valor_centavos: -1290, categoria_financeira_id: 'sub-tarifa', competencia: '2026-10', descricao: 'Tarifa do pacote', estornado: false },
      { id: 'lc-2', empresa_id: 'emp-mia', conta_bancaria_id: 'cb-sic', data: '2026-10-06', valor_centavos: -500, categoria_financeira_id: 'sub-tarifa', competencia: '2026-10', descricao: 'IOF', estornado: true },
    ],
  });
  svc.listarTransferencias.mockResolvedValue({
    dados: [{ id: 'tr-1', conta_origem_id: 'cb-sic', conta_destino_id: 'cb-itau', data: '2026-10-05', valor_centavos: 100000, entre_empresas: true, descricao: 'Aplicação', estornado: false }],
  });
  svc.listarPagamentosSemConta.mockResolvedValue({
    dados: [{ tipo: 'pagamento', id: 'pag-9', empresa_id: 'emp-mia', data: '2026-08-10', valor_centavos: -30000, descricao: 'Aluguel antigo', origem_id: 'sol-9' }],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Registros do caixa', () => {
  it('mostra os movimentos do sistema sem linha no extrato da conta escolhida', async () => {
    await abrirRegistros();
    expect(await screen.findByText('Escolha a conta para ver os movimentos sem linha no extrato.')).toBeInTheDocument();
    await screen.findByRole('option', { name: 'Sicredi movimento · Sicredi' });
    fireEvent.change(screen.getByLabelText('Conta *'), { target: { value: 'cb-sic' } });

    const linha = (await screen.findByText('Construtora Águia - ALG-10')).closest('tr');
    expect(within(linha).getByRole('link', { name: 'Recebimento' })).toHaveAttribute('href', '/titulos-receber/tit-1');
    expect(within(linha).getByText('R$ 508,00')).toBeInTheDocument();
    expect(svc.listarPendenciasSistema).toHaveBeenCalledWith(expect.objectContaining({ conta: 'cb-sic', pagina: 1 }));
  });

  it('lista os lançamentos de caixa com categoria, competência e estornados', async () => {
    await abrirRegistros();
    fireEvent.click(screen.getByRole('button', { name: 'Lançamentos de caixa' }));

    const tarifa = (await screen.findByText('Tarifa do pacote')).closest('tr');
    expect(await within(tarifa).findByText('Tarifas')).toBeInTheDocument();
    expect(await within(tarifa).findByText('Sicredi movimento · Sicredi')).toBeInTheDocument();
    expect(within(tarifa).getByText('10/2026')).toBeInTheDocument();
    expect(within(tarifa).getByText('-R$ 12,90')).toBeInTheDocument();
    expect(within(screen.getByText('IOF').closest('tr')).getByText('Estornado')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-10-01' } });
    await waitFor(() => expect(svc.listarLancamentosCaixa).toHaveBeenLastCalledWith(expect.objectContaining({ de: '2026-10-01' })));
  });

  it('lista as transferências com origem, destino e o selo entre empresas', async () => {
    await abrirRegistros();
    fireEvent.click(screen.getByRole('button', { name: 'Transferências' }));

    const linha = (await screen.findByText('Aplicação')).closest('tr');
    expect(await within(linha).findByText('Sicredi movimento · Sicredi')).toBeInTheDocument();
    expect(await within(linha).findByText('Itaú cobrança · Itaú')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 1.000,00')).toBeInTheDocument();
    expect(within(linha).getByText('Entre empresas')).toBeInTheDocument();
  });

  it('lista os pagamentos antigos sem conta bancária', async () => {
    await abrirRegistros();
    fireEvent.click(screen.getByRole('button', { name: 'Pagamentos sem conta' }));

    const linha = (await screen.findByText('Aluguel antigo')).closest('tr');
    expect(within(linha).getByRole('link', { name: 'Pagamento' })).toHaveAttribute('href', '/solicitacoes/sol-9');
    expect(within(linha).getByText('-R$ 300,00')).toBeInTheDocument();
    expect(screen.getByText(/ficam fora da conciliação/)).toBeInTheDocument();
  });
});
