import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React, { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as categoriasService from '../../services/categoriasFinanceiras';
import { SeletorCategoriaDespesa, SeletorCategoriaReceita } from './SeletorCategoriaDespesa';

vi.mock('../../services/categoriasFinanceiras', () => ({ obterArvoreFinanceira: vi.fn() }));

const { obterArvoreFinanceira } = categoriasService;

const ARVORE = [
  {
    id: 'raiz-fixas',
    nome: 'Despesas fixas',
    natureza: 'despesa',
    subcategorias: [
      { id: 'sub-aluguel', nome: 'Aluguel', lancavel: true },
      { id: 'sub-velha', nome: 'Telefone fixo', lancavel: false },
    ],
  },
  {
    id: 'raiz-receitas',
    nome: 'Receitas financeiras',
    natureza: 'receita',
    subcategorias: [{ id: 'sub-juros', nome: 'Juros recebidos', lancavel: true }],
  },
];

function Exemplo({ inicial = '', onAlterar = () => {} }) {
  const [valor, setValor] = useState(inicial);
  return (
    <>
      <label htmlFor="categoria">Categoria</label>
      <SeletorCategoriaDespesa
        id="categoria"
        valor={valor}
        onAlterar={(novo) => {
          setValor(novo);
          onAlterar(novo);
        }}
      />
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  obterArvoreFinanceira.mockResolvedValue({ dados: ARVORE });
});

describe('SeletorCategoriaDespesa', () => {
  it('oferece só as subcategorias lançáveis de despesa, agrupadas pela raiz', async () => {
    render(<Exemplo />);

    const grupo = await screen.findByRole('group', { name: 'Despesas fixas' });
    expect(within(grupo).getByRole('option', { name: 'Aluguel' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Telefone fixo' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Juros recebidos' })).toBeNull();
    expect(obterArvoreFinanceira).toHaveBeenCalledWith({ ativas: true, sinal: expect.anything() });
  });

  it('avisa a escolha e aceita voltar para vazio', async () => {
    const onAlterar = vi.fn();
    render(<Exemplo onAlterar={onAlterar} />);
    await screen.findByRole('option', { name: 'Aluguel' });

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'sub-aluguel' } });
    expect(onAlterar).toHaveBeenLastCalledWith('sub-aluguel');
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: '' } });
    expect(onAlterar).toHaveBeenLastCalledWith('');
  });

  it('mantém a categoria gravada que deixou de ser lançável, marcada para trocar', async () => {
    render(<Exemplo inicial="sub-velha" />);

    expect(await screen.findByRole('option', { name: 'Categoria atual (não lançável)' })).toBeInTheDocument();
    expect(screen.getByLabelText('Categoria')).toHaveValue('sub-velha');
  });

  it('mostra a falha do plano de contas', async () => {
    obterArvoreFinanceira.mockRejectedValue(new Error('falha de rede'));
    render(<Exemplo />);

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Categoria')).toBeDisabled());
  });

  it('na versão de receita oferece só as subcategorias lançáveis de receita', async () => {
    render(
      <>
        <label htmlFor="receita">Categoria de receita</label>
        <SeletorCategoriaReceita id="receita" valor="" onAlterar={() => {}} />
      </>
    );

    expect(await screen.findByRole('option', { name: 'Juros recebidos' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Aluguel' })).toBeNull();
  });

  it('com a linha da DRE oferece só as raízes daquela linha', async () => {
    obterArvoreFinanceira.mockResolvedValue({
      dados: [
        { ...ARVORE[0], linha_dre: 'despesa_fixa' },
        {
          id: 'raiz-financeiras',
          nome: 'Despesas financeiras',
          natureza: 'despesa',
          linha_dre: 'resultado_financeiro',
          subcategorias: [{ id: 'sub-juros-pagos', nome: 'Juros de empréstimos', lancavel: true }],
        },
      ],
    });
    render(
      <>
        <label htmlFor="juros">Categoria de juros</label>
        <SeletorCategoriaDespesa id="juros" linhaDre="resultado_financeiro" valor="" onAlterar={() => {}} />
      </>
    );

    expect(await screen.findByRole('option', { name: 'Juros de empréstimos' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Aluguel' })).toBeNull();
  });
});
