import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as contasAPagarService from '../../services/contasAPagar';
import * as empresasService from '../../services/empresas';
import ResumoContasAPagar from './ResumoContasAPagar';
import { useResumoContasAPagar } from './useResumoContasAPagar';

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/contasAPagar', () => ({ obterResumoContasAPagar: vi.fn() }));

const { obterResumoContasAPagar } = contasAPagarService;

const RESUMO = {
  de: '2026-10-12',
  ate: '2026-12-06',
  semanas: [
    {
      semana: '2026-10-12',
      empresa_id: 'emp-mia',
      previsto: { quantidade: 2, valor_centavos: 100000 },
      a_pagar: { quantidade: 1, valor_centavos: 50000 },
      vencido: { quantidade: 1, valor_centavos: 50000 },
      estimado_centavos: 20000,
    },
  ],
  atrasadas: [{ empresa_id: 'emp-gig', vencido: { quantidade: 3, valor_centavos: 90000 } }],
  totais: {
    previsto: { quantidade: 2, valor_centavos: 100000 },
    a_pagar: { quantidade: 1, valor_centavos: 50000 },
    vencido: { quantidade: 4, valor_centavos: 140000 },
    estimado_centavos: 20000,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  empresasService.listarTodasEmpresas.mockResolvedValue([
    { id: 'emp-mia', nome_fantasia: 'MIA', ativa: true },
    { id: 'emp-gig', nome_fantasia: 'Gigante', ativa: true },
  ]);
  obterResumoContasAPagar.mockResolvedValue({ dados: RESUMO });
});

describe('useResumoContasAPagar', () => {
  it('busca o resumo padrão com o sinal e de novo quando o filtro muda', async () => {
    const { result } = renderHook(() => useResumoContasAPagar());

    await waitFor(() => expect(result.current.resumo).toEqual(RESUMO));
    expect(obterResumoContasAPagar).toHaveBeenCalledWith({ de: '', ate: '', empresa: '', sinal: expect.anything() });

    act(() => result.current.filtrar({ empresa: 'emp-mia' }));

    await waitFor(() =>
      expect(obterResumoContasAPagar).toHaveBeenLastCalledWith(expect.objectContaining({ empresa: 'emp-mia' }))
    );
  });
});

describe('ResumoContasAPagar', () => {
  it('mostra os totais, as semanas por empresa e as atrasadas', async () => {
    render(<ResumoContasAPagar />);

    const totais = await screen.findByRole('region', { name: 'Totais do período' });
    expect(within(totais).getByText('Previsto').closest('div')).toHaveTextContent('R$ 1.000,002 contas');
    expect(within(totais).getByText('Vencido').closest('div')).toHaveTextContent('R$ 1.400,004 contas');
    expect(within(totais).getByText('Estimado').closest('div')).toHaveTextContent('R$ 200,00');
    expect(screen.getByText('Período de 12/10/2026 a 06/12/2026.')).toBeInTheDocument();

    const semana = screen.getByText('12/10 a 18/10/2026').closest('tr');
    expect(await within(semana).findByText('MIA')).toBeInTheDocument();
    expect(within(semana).getByText('R$ 1.000,00 (2)')).toBeInTheDocument();
    expect(within(semana).getAllByText('R$ 500,00 (1)')).toHaveLength(2);

    const atrasadas = screen.getByRole('region', { name: 'Vencidas antes do período' });
    expect(await within(atrasadas).findByText('Gigante')).toBeInTheDocument();
    expect(within(atrasadas).getByText('R$ 900,00 (3)')).toBeInTheDocument();
  });

  it('filtra por período e empresa e recusa fim antes do início', async () => {
    render(<ResumoContasAPagar />);
    await screen.findByRole('region', { name: 'Totais do período' });
    await screen.findByRole('option', { name: 'MIA' });

    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-10-01' } });
    expect(screen.getByText('O fim não pode ser antes do início.')).toBeInTheDocument();
    expect(obterResumoContasAPagar).not.toHaveBeenLastCalledWith(expect.objectContaining({ ate: '2026-10-01' }));

    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-12-31' } });
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-mia' } });

    await waitFor(() =>
      expect(obterResumoContasAPagar).toHaveBeenLastCalledWith(
        expect.objectContaining({ de: '2026-11-01', ate: '2026-12-31', empresa: 'emp-mia' })
      )
    );
  });

  it('mostra o vazio e o erro com nova tentativa', async () => {
    obterResumoContasAPagar
      .mockRejectedValueOnce(new Error('erro de validação: intervalo do resumo deve ter no máximo 1 ano'))
      .mockResolvedValue({ dados: { ...RESUMO, semanas: [], atrasadas: [] } });

    render(<ResumoContasAPagar />);

    expect(await screen.findByText(/no máximo 1 ano/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhuma conta a pagar em aberto no período.')).toBeInTheDocument();
  });
});
