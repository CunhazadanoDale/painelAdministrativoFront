import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as categoriasService from '../../services/categoriasFinanceiras';
import PlanoContas from './PlanoContas';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));

vi.mock('../../services/categoriasFinanceiras', () => ({
  obterArvoreFinanceira: vi.fn(),
  obterCategoriaFinanceira: vi.fn(),
  criarCategoriaFinanceira: vi.fn(),
  atualizarCategoriaFinanceira: vi.fn(),
  ativarCategoriaFinanceira: vi.fn(),
  desativarCategoriaFinanceira: vi.fn(),
  removerCategoriaFinanceira: vi.fn(),
}));

const {
  obterArvoreFinanceira,
  obterCategoriaFinanceira,
  criarCategoriaFinanceira,
  atualizarCategoriaFinanceira,
  ativarCategoriaFinanceira,
  desativarCategoriaFinanceira,
  removerCategoriaFinanceira,
} = categoriasService;

const CONFLITO = 'a categoria financeira foi alterada por outra pessoa; recarregue e tente de novo';

const ALUGUEL = {
  id: 'sub-aluguel',
  nome: 'Aluguel',
  categoria_pai_id: 'raiz-fixas',
  natureza: 'despesa',
  linha_dre: 'despesa_fixa',
  codigo: '4.2.01',
  ordem: 1,
  ativa: true,
  lancavel: true,
  versao: 3,
};

const ENERGIA = {
  id: 'sub-energia',
  nome: 'Energia',
  categoria_pai_id: 'raiz-fixas',
  natureza: 'despesa',
  linha_dre: 'despesa_fixa',
  codigo: null,
  ordem: 2,
  ativa: false,
  lancavel: false,
  versao: 6,
};

const FIXAS = {
  id: 'raiz-fixas',
  nome: 'Despesas fixas',
  categoria_pai_id: null,
  natureza: 'despesa',
  linha_dre: 'despesa_fixa',
  codigo: '4.2',
  ordem: 3,
  ativa: true,
  lancavel: false,
  versao: 2,
  subcategorias: [ALUGUEL, ENERGIA],
};

const RECEITAS = {
  id: 'raiz-receitas',
  nome: 'Rendimentos',
  categoria_pai_id: null,
  natureza: 'receita',
  linha_dre: 'resultado_financeiro',
  codigo: null,
  ordem: 0,
  ativa: false,
  lancavel: false,
  versao: 1,
  subcategorias: [],
};

function perfil({ financeiro = true, administrador = false } = {}) {
  useAutenticacao.mockReturnValue({ financeiro, administrador });
}

function linhaDe(texto) {
  return screen.getByText(texto).closest('tr');
}

async function renderizar() {
  render(<PlanoContas />);
  await screen.findByText('Despesas fixas');
}

function preencher(dialogo, campos) {
  Object.entries(campos).forEach(([rotulo, valor]) => {
    fireEvent.change(within(dialogo).getByLabelText(rotulo), { target: { value: valor } });
  });
}

function salvar(dialogo) {
  fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
}

async function abrirEdicao(nome) {
  await renderizar();
  fireEvent.click(within(linhaDe(nome)).getByRole('button', { name: 'Editar categoria' }));
  return screen.getByRole('dialog');
}

beforeEach(() => {
  vi.clearAllMocks();
  perfil();
  obterArvoreFinanceira.mockResolvedValue({ dados: [RECEITAS, FIXAS] });
  obterCategoriaFinanceira.mockResolvedValue({ dados: { ...ALUGUEL, versao: 4 } });
  criarCategoriaFinanceira.mockResolvedValue({ dados: ALUGUEL });
  atualizarCategoriaFinanceira.mockResolvedValue({ dados: ALUGUEL });
  ativarCategoriaFinanceira.mockResolvedValue({ dados: ENERGIA });
  desativarCategoriaFinanceira.mockResolvedValue({ dados: ALUGUEL });
  removerCategoriaFinanceira.mockResolvedValue(null);
});

describe('PlanoContas', () => {
  it('mostra a árvore com natureza, linha da DRE herdada, código, lançável e situação', async () => {
    await renderizar();

    const raiz = linhaDe('Despesas fixas');
    expect(within(raiz).getByText('Despesa')).toBeInTheDocument();
    expect(within(raiz).getByText('Despesa fixa')).toBeInTheDocument();
    expect(within(raiz).getByText('4.2')).toBeInTheDocument();
    expect(within(raiz).queryByText('Lançável')).toBeNull();
    const aluguel = linhaDe('Aluguel');
    expect(within(aluguel).getByText('Despesa fixa')).toBeInTheDocument();
    expect(within(aluguel).getByText('4.2.01')).toBeInTheDocument();
    expect(within(aluguel).getByText('Lançável')).toBeInTheDocument();
    const energia = linhaDe('Energia');
    expect(within(energia).queryByText('Lançável')).toBeNull();
    expect(within(energia).getByText('Inativa')).toBeInTheDocument();
    expect(within(linhaDe('Rendimentos')).getByText('Resultado financeiro')).toBeInTheDocument();
    expect(within(linhaDe('Rendimentos')).getByText('Receita')).toBeInTheDocument();
  });

  it('mostra o vazio e o vazio só das ativas', async () => {
    obterArvoreFinanceira.mockResolvedValue({ dados: [] });

    render(<PlanoContas />);

    expect(await screen.findByText('Nenhuma categoria no plano de contas.')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Só ativas'));
    expect(await screen.findByText('Nenhuma categoria ativa no plano de contas.')).toBeInTheDocument();
    expect(obterArvoreFinanceira).toHaveBeenLastCalledWith(expect.objectContaining({ ativas: true }));
  });

  it('mostra o erro sem o vazio e tenta de novo', async () => {
    obterArvoreFinanceira.mockRejectedValueOnce(new Error('falha de rede'));

    render(<PlanoContas />);

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma categoria no plano de contas.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Despesas fixas')).toBeInTheDocument();
  });

  it('só deixa ler quem não é financeiro', async () => {
    perfil({ financeiro: false });

    await renderizar();

    expect(screen.queryByRole('button', { name: /Nova Categoria/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Nova subcategoria' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar categoria' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Desativar categoria' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Excluir categoria' })).toBeNull();
  });

  it('deixa a exclusão só para o administrador e a subcategoria só na raiz', async () => {
    await renderizar();

    expect(within(linhaDe('Despesas fixas')).getByRole('button', { name: 'Nova subcategoria' })).toBeInTheDocument();
    expect(within(linhaDe('Aluguel')).queryByRole('button', { name: 'Nova subcategoria' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Excluir categoria' })).toBeNull();
  });

  it('valida nome, natureza, linha da DRE, código e ordem da raiz antes de enviar', async () => {
    await renderizar();
    fireEvent.click(screen.getByRole('button', { name: /Nova Categoria/ }));
    const dialogo = screen.getByRole('dialog');
    preencher(dialogo, { Código: '4..2', Ordem: '-1' });

    salvar(dialogo);

    expect(await within(dialogo).findByText('Informe o nome.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Selecione a natureza.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Selecione a linha da DRE.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Use números separados por ponto, como 4.1.03.')).toBeInTheDocument();
    expect(within(dialogo).getByText('A ordem é um número inteiro a partir de 0.')).toBeInTheDocument();
    expect(criarCategoriaFinanceira).not.toHaveBeenCalled();
  });

  it('cria a raiz oferecendo só as linhas da DRE da natureza escolhida', async () => {
    await renderizar();
    fireEvent.click(screen.getByRole('button', { name: /Nova Categoria/ }));
    const dialogo = screen.getByRole('dialog');

    preencher(dialogo, { 'Natureza *': 'transferencia' });
    const linhas = within(within(dialogo).getByLabelText('Linha da DRE *')).getAllByRole('option');
    expect(linhas.map((opcao) => opcao.textContent)).toEqual(['Selecione…', 'Entre contas']);
    preencher(dialogo, { 'Natureza *': 'despesa' });
    preencher(dialogo, {
      'Linha da DRE *': 'despesa_variavel',
      'Nome *': '  Despesas de venda ',
      Código: '4.3',
      Ordem: '4',
    });
    salvar(dialogo);

    await waitFor(() =>
      expect(criarCategoriaFinanceira).toHaveBeenCalledWith({
        nome: 'Despesas de venda',
        natureza: 'despesa',
        linha_dre: 'despesa_variavel',
        codigo: '4.3',
        ordem: 4,
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('limpa a linha da DRE que não serve para a natureza nova', async () => {
    await renderizar();
    fireEvent.click(screen.getByRole('button', { name: /Nova Categoria/ }));
    const dialogo = screen.getByRole('dialog');

    preencher(dialogo, { 'Natureza *': 'despesa', 'Linha da DRE *': 'despesa_fixa' });
    preencher(dialogo, { 'Natureza *': 'receita' });

    expect(within(dialogo).getByLabelText('Linha da DRE *')).toHaveValue('');
  });

  it('cria a subcategoria herdando natureza e linha da DRE da raiz, sem código vazio', async () => {
    await renderizar();
    fireEvent.click(within(linhaDe('Despesas fixas')).getByRole('button', { name: 'Nova subcategoria' }));
    const dialogo = screen.getByRole('dialog');

    expect(within(dialogo).queryByLabelText('Natureza *')).toBeNull();
    expect(within(dialogo).getByText(/herda/)).toBeInTheDocument();
    expect(within(dialogo).getByText('Despesas fixas')).toBeInTheDocument();
    preencher(dialogo, { 'Nome *': 'Internet' });
    salvar(dialogo);

    await waitFor(() =>
      expect(criarCategoriaFinanceira).toHaveBeenCalledWith({
        nome: 'Internet',
        categoria_pai_id: 'raiz-fixas',
        ordem: 0,
      })
    );
  });

  it('mostra o nome repetido como erro do formulário, sem o aviso de conflito', async () => {
    criarCategoriaFinanceira.mockRejectedValue(new ErroApi(409, 'já existe uma categoria com este nome neste nível'));
    await renderizar();
    fireEvent.click(within(linhaDe('Despesas fixas')).getByRole('button', { name: 'Nova subcategoria' }));
    const dialogo = screen.getByRole('dialog');
    preencher(dialogo, { 'Nome *': 'Aluguel' });

    salvar(dialogo);

    expect(await within(dialogo).findByText('já existe uma categoria com este nome neste nível')).toBeInTheDocument();
    expect(within(dialogo).queryByRole('button', { name: 'Recarregar dados' })).toBeNull();
    expect(within(dialogo).getByLabelText('Nome *')).toHaveValue('Aluguel');
  });

  it('edita nome, código e ordem reenviando os valores lidos e a versão', async () => {
    const dialogo = await abrirEdicao('Aluguel');

    expect(within(dialogo).queryByLabelText('Natureza *')).toBeNull();
    expect(within(dialogo).getByText(/não mudam/)).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Código')).toHaveValue('4.2.01');
    expect(within(dialogo).getByLabelText('Ordem')).toHaveValue('1');
    preencher(dialogo, { 'Nome *': 'Aluguel da sede' });
    salvar(dialogo);

    await waitFor(() =>
      expect(atualizarCategoriaFinanceira).toHaveBeenCalledWith('sub-aluguel', {
        nome: 'Aluguel da sede',
        codigo: '4.2.01',
        ordem: 1,
        versao: 3,
      })
    );
  });

  it('apaga o código enviando nulo', async () => {
    const dialogo = await abrirEdicao('Aluguel');

    preencher(dialogo, { Código: '  ' });
    salvar(dialogo);

    await waitFor(() =>
      expect(atualizarCategoriaFinanceira).toHaveBeenCalledWith(
        'sub-aluguel',
        expect.objectContaining({ codigo: null })
      )
    );
  });

  it('no conflito de versão recarrega o registro sem perder o formulário e grava com a versão nova', async () => {
    atualizarCategoriaFinanceira.mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    const dialogo = await abrirEdicao('Aluguel');
    preencher(dialogo, { 'Nome *': 'Aluguel da sede' });

    salvar(dialogo);

    expect(await within(dialogo).findByText(CONFLITO)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Recarregar dados' }));
    await waitFor(() => expect(obterCategoriaFinanceira).toHaveBeenCalledWith('sub-aluguel', expect.anything()));
    expect(await within(dialogo).findByText(/Dados recarregados/)).toBeInTheDocument();
    expect(within(dialogo).queryByText(CONFLITO)).toBeNull();
    expect(within(dialogo).getByLabelText('Nome *')).toHaveValue('Aluguel da sede');

    salvar(dialogo);

    await waitFor(() =>
      expect(atualizarCategoriaFinanceira).toHaveBeenLastCalledWith(
        'sub-aluguel',
        expect.objectContaining({ nome: 'Aluguel da sede', versao: 4 })
      )
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('cancela a recarga do registro quando o formulário fecha', async () => {
    atualizarCategoriaFinanceira.mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    obterCategoriaFinanceira.mockReturnValue(new Promise(() => {}));
    const dialogo = await abrirEdicao('Aluguel');
    salvar(dialogo);
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Recarregar dados' }));
    await waitFor(() => expect(obterCategoriaFinanceira).toHaveBeenCalled());

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(obterCategoriaFinanceira.mock.calls[0][1].sinal.aborted).toBe(true);
  });

  it('desativa a ativa e ativa a inativa com a versão de cada uma', async () => {
    await renderizar();

    fireEvent.click(within(linhaDe('Aluguel')).getByRole('button', { name: 'Desativar categoria' }));
    await waitFor(() => expect(desativarCategoriaFinanceira).toHaveBeenCalledWith('sub-aluguel', 3));
    await screen.findByText('Energia');
    fireEvent.click(within(linhaDe('Energia')).getByRole('button', { name: 'Ativar categoria' }));

    await waitFor(() => expect(ativarCategoriaFinanceira).toHaveBeenCalledWith('sub-energia', 6));
  });

  it('no conflito de versão da troca de situação avisa e recarrega a árvore', async () => {
    desativarCategoriaFinanceira.mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    await renderizar();

    fireEvent.click(within(linhaDe('Aluguel')).getByRole('button', { name: 'Desativar categoria' }));
    expect(await screen.findByText(CONFLITO)).toBeInTheDocument();
    obterArvoreFinanceira.mockResolvedValue({
      dados: [RECEITAS, { ...FIXAS, subcategorias: [{ ...ALUGUEL, versao: 4 }, ENERGIA] }],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar dados' }));

    await waitFor(() => expect(screen.queryByText(CONFLITO)).toBeNull());
    await waitFor(() => expect(obterArvoreFinanceira).toHaveBeenCalledTimes(2));
    await screen.findByText('Aluguel');
    fireEvent.click(within(linhaDe('Aluguel')).getByRole('button', { name: 'Desativar categoria' }));
    await waitFor(() => expect(desativarCategoriaFinanceira).toHaveBeenLastCalledWith('sub-aluguel', 4));
  });

  it('mostra a raiz com subcategorias ativas como erro com Fechar, sem o aviso de conflito', async () => {
    desativarCategoriaFinanceira.mockRejectedValue(
      new ErroApi(409, 'categoria possui subcategorias ativas e não pode ser desativada')
    );
    await renderizar();

    fireEvent.click(within(linhaDe('Despesas fixas')).getByRole('button', { name: 'Desativar categoria' }));

    expect(await screen.findByText('categoria possui subcategorias ativas e não pode ser desativada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recarregar dados' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByText('categoria possui subcategorias ativas e não pode ser desativada')).toBeNull();
  });

  it('exclui depois de confirmar e mostra o erro de categoria em uso', async () => {
    perfil({ administrador: true });
    removerCategoriaFinanceira.mockRejectedValueOnce(
      new ErroApi(400, 'erro de validação: registro em uso por outros dados e não pode ser excluído')
    );
    await renderizar();

    fireEvent.click(within(linhaDe('Despesas fixas')).getByRole('button', { name: 'Excluir categoria' }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));

    expect(await within(dialogo).findByText(/registro em uso por outros dados/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(removerCategoriaFinanceira).toHaveBeenCalledTimes(2);
    expect(removerCategoriaFinanceira).toHaveBeenCalledWith('raiz-fixas');
  });
});
