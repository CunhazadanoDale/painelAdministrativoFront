import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as dreService from '../../services/dre';
import * as empresasService from '../../services/empresas';
import Dre from './Dre';
import { mesAtualEmBrasilia, mesesAntes } from './dreUtils';

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/dre', () => ({ obterResumoDre: vi.fn() }));

const { obterResumoDre } = dreService;

const CHAVES = [
  'receita_bruta',
  'outras_receitas',
  'deducoes',
  'cmv',
  'perdas_estoque',
  'despesas_variaveis',
  'despesas_fixas',
  'nao_classificado',
  'resultado_financeiro',
  'fora_dre',
];

function demonstrativo(valores, { subtotais = {}, indicadores = {}, semCusto = 0, itens = {} } = {}) {
  return {
    linhas: CHAVES.map((linha) => ({
      linha,
      valor_centavos: valores[linha] ?? 0,
      quantidade: 0,
      itens: itens[linha] ?? [],
    })),
    subtotais: {
      receita_liquida_centavos: 0,
      lucro_bruto_centavos: 0,
      margem_contribuicao_centavos: 0,
      resultado_operacional_centavos: 0,
      resultado_centavos: 0,
      ...subtotais,
    },
    indicadores: { margem_contribuicao_bp: null, ponto_equilibrio_centavos: null, ...indicadores },
    quantidade_sem_custo: semCusto,
  };
}

const ALUGUEL = (valor) => ({ chave: 'categoria', categoria_id: 'cat-aluguel', nome: 'Aluguel', valor_centavos: valor });

const SETEMBRO = demonstrativo(
  { receita_bruta: 1000000, cmv: -400000, despesas_fixas: -200000 },
  {
    subtotais: { receita_liquida_centavos: 1000000, resultado_centavos: 400000 },
    indicadores: { margem_contribuicao_bp: 6000, ponto_equilibrio_centavos: 333333 },
    itens: { despesas_fixas: [ALUGUEL(-200000)] },
  }
);

const OUTUBRO = demonstrativo(
  { receita_bruta: 500000, despesas_fixas: -250000, fora_dre: 3000000 },
  {
    subtotais: { receita_liquida_centavos: 500000, resultado_centavos: -50000 },
    indicadores: { margem_contribuicao_bp: -150 },
    semCusto: 3,
    itens: {
      despesas_fixas: [
        ALUGUEL(-200000),
        { chave: 'categoria', categoria_id: 'cat-sal', nome: 'Salários', valor_centavos: -50000 },
      ],
    },
  }
);

const TOTAL = demonstrativo(
  { receita_bruta: 1500000, cmv: -400000, despesas_fixas: -450000, fora_dre: 3000000 },
  {
    subtotais: { receita_liquida_centavos: 1500000, resultado_centavos: 350000 },
    indicadores: { margem_contribuicao_bp: 5263, ponto_equilibrio_centavos: 855000 },
    semCusto: 3,
    itens: {
      despesas_fixas: [
        ALUGUEL(-400000),
        { chave: 'categoria', categoria_id: 'cat-sal', nome: 'Salários', valor_centavos: -50000 },
      ],
    },
  }
);

const RESUMO = {
  de: '2026-09',
  ate: '2026-10',
  meses: [
    { mes: '2026-09', empresas: [], consolidado: SETEMBRO },
    { mes: '2026-10', empresas: [], consolidado: OUTUBRO },
  ],
  total: { empresas: [], consolidado: TOTAL },
};

function renderizar() {
  return render(
    <MemoryRouter>
      <Dre />
    </MemoryRouter>
  );
}

function linha(nome) {
  return within(screen.getByRole('table', { name: 'DRE' }))
    .getAllByRole('row')
    .find((tr) => within(tr).queryAllByRole('rowheader')[0]?.textContent === nome);
}

function celulas(nome) {
  return within(linha(nome))
    .getAllByRole('cell')
    .map((celula) => celula.textContent.replace(/\s/g, ' '));
}

beforeEach(() => {
  vi.clearAllMocks();
  empresasService.listarTodasEmpresas.mockResolvedValue([
    { id: 'emp-mia', nome_fantasia: 'MIA', ativa: true },
    { id: 'emp-gig', nome_fantasia: 'Gigante', ativa: true },
  ]);
  obterResumoDre.mockResolvedValue({ dados: RESUMO });
});

describe('Dre', () => {
  it('pede os últimos 12 meses até o mês corrente', async () => {
    renderizar();

    await screen.findByRole('table', { name: 'DRE' });
    const ate = mesAtualEmBrasilia();
    expect(obterResumoDre).toHaveBeenCalledWith({ de: mesesAntes(ate, 11), ate, empresa: '', sinal: expect.anything() });
    expect(screen.getByLabelText('De')).toHaveValue(mesesAntes(ate, 11));
    expect(screen.getByLabelText('Até')).toHaveValue(ate);
  });

  it('mostra as linhas e os subtotais por mês com o total do período', async () => {
    renderizar();
    const tabela = await screen.findByRole('table', { name: 'DRE' });

    const cabecalho = within(tabela).getAllByRole('columnheader').map((th) => th.textContent);
    expect(cabecalho).toEqual(['', 'set/2026', 'out/2026', 'Total']);
    expect(celulas('Receita bruta')).toEqual(['R$ 10.000,00', 'R$ 5.000,00', 'R$ 15.000,00']);
    expect(celulas('CMV')).toEqual(['-R$ 4.000,00', 'R$ 0,00', '-R$ 4.000,00']);
    expect(celulas('Resultado')).toEqual(['R$ 4.000,00', '-R$ 500,00', 'R$ 3.500,00']);
    expect(linha('Resultado')).toHaveClass('dre-subtotal');
    expect(celulas('Fora da DRE')).toEqual(['R$ 0,00', 'R$ 30.000,00', 'R$ 30.000,00']);
    expect(linha('Fora da DRE')).toHaveClass('dre-fora');
    expect(celulas('Margem de contribuição (%)')).toEqual(['60,00%', '-1,50%', '52,63%']);
    expect(celulas('Ponto de equilíbrio')).toEqual(['R$ 3.333,33', '—', 'R$ 8.550,00']);
    expect(screen.getByRole('status')).toHaveTextContent('3 unidades saíram de lotes sem custo');
  });

  it('abre o detalhamento por categoria da linha', async () => {
    renderizar();
    await screen.findByRole('table', { name: 'DRE' });

    const botao = screen.getByRole('button', { name: 'Despesas fixas' });
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Aluguel')).toBeNull();
    expect(screen.queryByRole('button', { name: 'CMV' })).toBeNull();

    fireEvent.click(botao);

    expect(botao).toHaveAttribute('aria-expanded', 'true');
    expect(celulas('Aluguel')).toEqual(['-R$ 2.000,00', '-R$ 2.000,00', '-R$ 4.000,00']);
    expect(celulas('Salários')).toEqual(['R$ 0,00', '-R$ 500,00', '-R$ 500,00']);
    fireEvent.click(botao);
    expect(screen.queryByText('Aluguel')).toBeNull();
  });

  it('filtra por período e empresa e recusa período acima de 24 meses sem pedir', async () => {
    renderizar();
    await screen.findByRole('table', { name: 'DRE' });
    await screen.findByRole('option', { name: 'Gigante' });

    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-01' } });
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-06' } });
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-gig' } });
    await waitFor(() =>
      expect(obterResumoDre).toHaveBeenLastCalledWith({
        de: '2026-01',
        ate: '2026-06',
        empresa: 'emp-gig',
        sinal: expect.anything(),
      })
    );

    const chamadas = obterResumoDre.mock.calls.length;
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2024-01' } });
    expect(screen.getByRole('alert')).toHaveTextContent('O período vai até 24 meses.');
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-07' } });
    expect(screen.getByRole('alert')).toHaveTextContent('O mês inicial não pode ser depois do final.');
    expect(obterResumoDre.mock.calls.length).toBe(chamadas);
  });

  it('mostra o erro com nova tentativa', async () => {
    obterResumoDre.mockRejectedValueOnce(new Error('falha de rede'));
    renderizar();

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('table', { name: 'DRE' })).toBeInTheDocument();
  });
});
