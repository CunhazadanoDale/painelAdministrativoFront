import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as dreService from '../../services/dre';
import * as empresasService from '../../services/empresas';
import Faturamento from './Faturamento';
import { mesAtualEmBrasilia, mesesAntes } from './dreUtils';

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/dre', () => ({ obterFaturamento: vi.fn() }));

const { obterFaturamento } = dreService;

const FATURAMENTO = {
  de: '2026-08',
  ate: '2026-10',
  meses: [
    { mes: '2026-08', empresas: [], consolidado: { quantidade: 0, valor_centavos: 0, ticket_medio_centavos: 0 } },
    {
      mes: '2026-09',
      empresas: [],
      consolidado: { quantidade: 2, valor_centavos: 200000, ticket_medio_centavos: 100000 },
    },
    {
      mes: '2026-10',
      empresas: [],
      consolidado: { quantidade: 4, valor_centavos: 436000, ticket_medio_centavos: 109000 },
    },
  ],
  empresas: [
    { empresa_id: 'emp-mia', quantidade: 4, valor_centavos: 436000, ticket_medio_centavos: 109000 },
    { empresa_id: 'emp-gig', quantidade: 2, valor_centavos: 200000, ticket_medio_centavos: 100000 },
  ],
  consolidado: { quantidade: 6, valor_centavos: 636000, ticket_medio_centavos: 106000 },
};

function renderizar() {
  return render(
    <MemoryRouter>
      <Faturamento />
    </MemoryRouter>
  );
}

function celulas(tabela, rotulo) {
  const linha = within(tabela)
    .getAllByRole('row')
    .find((tr) => within(tr).queryAllByRole('rowheader')[0]?.textContent === rotulo);
  return within(linha)
    .getAllByRole('cell')
    .map((celula) => celula.textContent.replace(/\s/g, ' '));
}

beforeEach(() => {
  vi.clearAllMocks();
  empresasService.listarTodasEmpresas.mockResolvedValue([
    { id: 'emp-mia', nome_fantasia: 'MIA', ativa: true },
    { id: 'emp-gig', nome_fantasia: 'Gigante', ativa: true },
  ]);
  obterFaturamento.mockResolvedValue({ dados: FATURAMENTO });
});

describe('Faturamento', () => {
  it('pede os últimos 12 meses e mostra o total do período', async () => {
    renderizar();

    const totais = await screen.findByRole('region', { name: 'Total do período' });
    const ate = mesAtualEmBrasilia();
    expect(obterFaturamento).toHaveBeenCalledWith({ de: mesesAntes(ate, 11), ate, empresa: '', sinal: expect.anything() });
    expect(within(totais).getByText(/R\$\s?6\.360,00/)).toBeInTheDocument();
    expect(within(totais).getByText('6')).toBeInTheDocument();
    expect(within(totais).getByText(/R\$\s?1\.060,00/)).toBeInTheDocument();
  });

  it('lista os meses com notas, valor, ticket e barra proporcional ao maior mês', async () => {
    renderizar();

    const tabela = await screen.findByRole('table', { name: 'Faturamento por mês' });
    expect(celulas(tabela, 'out/2026').slice(0, 3)).toEqual(['4', 'R$ 4.360,00', 'R$ 1.090,00']);
    expect(celulas(tabela, 'ago/2026').slice(0, 3)).toEqual(['0', 'R$ 0,00', 'R$ 0,00']);
    expect(within(tabela).getByLabelText('100% do maior mês')).toBeInTheDocument();
    expect(within(tabela).getByLabelText('46% do maior mês')).toBeInTheDocument();
  });

  it('mostra o total por empresa', async () => {
    renderizar();

    const tabela = await screen.findByRole('table', { name: 'Faturamento por empresa' });
    expect(await within(tabela).findByText('MIA')).toBeInTheDocument();
    const linhas = within(tabela).getAllByRole('row').slice(1);
    expect(within(linhas[1]).getByText('Gigante')).toBeInTheDocument();
    expect(within(linhas[1]).getByText(/R\$\s?2\.000,00/)).toBeInTheDocument();
  });

  it('filtra por período e empresa e recusa mais de 60 meses', async () => {
    renderizar();
    await screen.findByRole('table', { name: 'Faturamento por mês' });
    await screen.findByRole('option', { name: 'Gigante' });

    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2022-01' } });
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-10' } });
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-mia' } });
    await waitFor(() =>
      expect(obterFaturamento).toHaveBeenLastCalledWith({
        de: '2022-01',
        ate: '2026-10',
        empresa: 'emp-mia',
        sinal: expect.anything(),
      })
    );

    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2021-10' } });
    expect(screen.getByRole('alert')).toHaveTextContent('O período vai até 60 meses.');
  });

  it('mostra o erro com nova tentativa', async () => {
    obterFaturamento.mockRejectedValueOnce(new Error('falha de rede'));
    renderizar();

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('table', { name: 'Faturamento por mês' })).toBeInTheDocument();
  });
});
