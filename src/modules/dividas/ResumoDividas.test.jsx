import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as dividasService from '../../services/dividas';
import * as empresasService from '../../services/empresas';
import ResumoDividas from './ResumoDividas';

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/dividas', () => ({ obterResumoDividas: vi.fn() }));

const { obterResumoDividas } = dividasService;

const RESUMO = {
  hoje: '2026-10-20',
  saldo_devedor_centavos: 290000,
  dividas: 2,
  por_credor: [
    { credor_tipo: 'banco', saldo_devedor_centavos: 200000, dividas: 1 },
    { credor_tipo: 'investidor', saldo_devedor_centavos: 0, dividas: 0 },
    { credor_tipo: 'fisco', saldo_devedor_centavos: 90000, dividas: 1 },
    { credor_tipo: 'fornecedor', saldo_devedor_centavos: 0, dividas: 0 },
  ],
  por_empresa: [
    { empresa_id: 'emp-gig', saldo_devedor_centavos: 200000, dividas: 1 },
    { empresa_id: 'emp-mia', saldo_devedor_centavos: 90000, dividas: 1 },
  ],
  vencido: { amortizacao_centavos: 30000, juros_centavos: 600, parcelas: 1 },
  a_vencer: { amortizacao_centavos: 260000, juros_centavos: 11700, parcelas: 5 },
  a_vencer_30_dias: { amortizacao_centavos: 30000, juros_centavos: 5950, parcelas: 2 },
  a_vencer_90_dias: { amortizacao_centavos: 130000, juros_centavos: 9650, parcelas: 3 },
  a_vencer_365_dias: { amortizacao_centavos: 260000, juros_centavos: 11700, parcelas: 5 },
};

function renderizar() {
  return render(
    <MemoryRouter>
      <ResumoDividas />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  empresasService.listarTodasEmpresas.mockResolvedValue([
    { id: 'emp-mia', nome_fantasia: 'MIA', ativa: true },
    { id: 'emp-gig', nome_fantasia: 'Gigante', ativa: true },
  ]);
  obterResumoDividas.mockResolvedValue({ dados: RESUMO });
});

describe('ResumoDividas', () => {
  it('mostra o saldo devedor total, por tipo de credor e por empresa', async () => {
    renderizar();

    expect(await screen.findByText(/Posição em 20\/10\/2026/)).toBeInTheDocument();
    const total = screen.getByRole('region', { name: 'Saldo devedor' });
    expect(within(total).getByText(/R\$\s?2\.900,00/)).toBeInTheDocument();
    expect(within(total).getByText('2 dívidas em aberto')).toBeInTheDocument();

    const credores = screen.getByRole('table', { name: 'Saldo por tipo de credor' });
    const banco = within(credores).getByText('Banco').closest('tr');
    expect(within(banco).getByText(/R\$\s?2\.000,00/)).toBeInTheDocument();
    expect(within(credores).getByText('Investidor')).toBeInTheDocument();
    expect(within(credores).getByText('Fornecedor')).toBeInTheDocument();

    const empresas = screen.getByRole('table', { name: 'Saldo por empresa' });
    const linhas = within(empresas).getAllByRole('row').slice(1);
    expect(await within(linhas[0]).findByText('Gigante')).toBeInTheDocument();
    expect(within(linhas[1]).getByText('MIA')).toBeInTheDocument();
  });

  it('mostra vencido e a vencer com amortização, juros, total e parcelas', async () => {
    renderizar();

    const faixas = await screen.findByRole('table', { name: 'Vencido e a vencer' });
    const vencido = within(faixas).getByText('Vencido').closest('tr');
    expect(within(vencido).getByText(/R\$\s?300,00/)).toBeInTheDocument();
    expect(within(vencido).getByText(/R\$\s?6,00/)).toBeInTheDocument();
    expect(within(vencido).getByText(/R\$\s?306,00/)).toBeInTheDocument();
    expect(within(vencido).getByText('1')).toBeInTheDocument();
    const trinta = within(faixas).getByText('Próximos 30 dias').closest('tr');
    expect(within(trinta).getByText(/R\$\s?359,50/)).toBeInTheDocument();
    expect(within(faixas).getByText('Próximos 90 dias')).toBeInTheDocument();
    expect(within(faixas).getByText('Próximos 365 dias')).toBeInTheDocument();
    const aVencer = within(faixas).getByText('A vencer (total)').closest('tr');
    expect(within(aVencer).getByText('5')).toBeInTheDocument();
  });

  it('filtra pela empresa e mostra o erro com nova tentativa', async () => {
    obterResumoDividas.mockRejectedValueOnce(new Error('falha de rede'));
    renderizar();

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByRole('table', { name: 'Vencido e a vencer' });
    await screen.findByRole('option', { name: 'Gigante' });

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-gig' } });
    await waitFor(() =>
      expect(obterResumoDividas).toHaveBeenLastCalledWith({ empresa: 'emp-gig', sinal: expect.anything() })
    );
  });

  it('avisa quando não há dívida em aberto', async () => {
    obterResumoDividas.mockResolvedValue({
      dados: { ...RESUMO, saldo_devedor_centavos: 0, dividas: 0, por_empresa: [] },
    });
    renderizar();

    expect(await screen.findByText('Nenhuma empresa com dívida em aberto.')).toBeInTheDocument();
  });
});
