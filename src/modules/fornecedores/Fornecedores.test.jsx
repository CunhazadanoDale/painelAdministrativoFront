import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as fornecedoresService from '../../services/fornecedores';
import Fornecedores from './Fornecedores';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));

vi.mock('../../services/fornecedores', () => ({
  listarFornecedores: vi.fn(),
  obterFornecedor: vi.fn(),
  criarFornecedor: vi.fn(),
  atualizarFornecedor: vi.fn(),
  ativarFornecedor: vi.fn(),
  desativarFornecedor: vi.fn(),
  removerFornecedor: vi.fn(),
}));

const {
  listarFornecedores,
  obterFornecedor,
  criarFornecedor,
  atualizarFornecedor,
  ativarFornecedor,
  desativarFornecedor,
  removerFornecedor,
} = fornecedoresService;

const CONFLITO = 'o fornecedor foi alterado por outra pessoa; recarregue e tente de novo';

const CERAMICA = {
  id: 'for-pb',
  pais: 'BR',
  documento: '11222333000181',
  documento_formatado: '11.222.333/0001-81',
  tipo_pessoa: 'pj',
  identificacao_estrangeira: null,
  nome: 'Cerâmica Paraíba LTDA',
  nome_fantasia: 'Cerâmica PB',
  moeda_padrao: 'BRL',
  uf: 'PB',
  cidade: 'João Pessoa',
  contato_nome: 'Maria',
  email: 'vendas@ceramicapb.com.br',
  telefone: '',
  observacoes: '',
  ativo: true,
  versao: 3,
};

const FOSHAN = {
  id: 'for-cn',
  pais: 'CN',
  documento: null,
  documento_formatado: null,
  tipo_pessoa: null,
  identificacao_estrangeira: '91330200MA2XXXXX',
  nome: 'Foshan Ceramics Co., Ltd.',
  nome_fantasia: '',
  moeda_padrao: 'USD',
  uf: null,
  cidade: null,
  contato_nome: 'Li Wei',
  email: 'sales@exemplo.cn',
  telefone: '',
  observacoes: '',
  ativo: false,
  versao: 7,
};

function perfil({ financeiro = true, administrador = false } = {}) {
  useAutenticacao.mockReturnValue({ financeiro, administrador });
}

function linhaDe(texto) {
  return screen.getByText(texto).closest('tr');
}

async function abrirNovo() {
  render(<Fornecedores />);
  await screen.findByText('Cerâmica Paraíba LTDA');
  fireEvent.click(screen.getByRole('button', { name: /Novo Fornecedor/ }));
  return screen.getByRole('dialog');
}

async function abrirEdicao(nome) {
  render(<Fornecedores />);
  await screen.findByText(nome);
  fireEvent.click(within(linhaDe(nome)).getByRole('button', { name: 'Editar fornecedor' }));
  return screen.getByRole('dialog');
}

function preencher(dialogo, campos) {
  Object.entries(campos).forEach(([rotulo, valor]) => {
    fireEvent.change(within(dialogo).getByLabelText(rotulo), { target: { value: valor } });
  });
}

function salvar(dialogo) {
  fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  perfil();
  listarFornecedores.mockResolvedValue({ dados: [CERAMICA, FOSHAN] });
  obterFornecedor.mockResolvedValue({ dados: { ...CERAMICA, versao: 4 } });
  criarFornecedor.mockResolvedValue({ dados: CERAMICA });
  atualizarFornecedor.mockResolvedValue({ dados: CERAMICA });
  ativarFornecedor.mockResolvedValue({ dados: FOSHAN });
  desativarFornecedor.mockResolvedValue({ dados: CERAMICA });
  removerFornecedor.mockResolvedValue(null);
});

describe('Fornecedores', () => {
  it('lista com documento ou identificação estrangeira, país, moeda e situação', async () => {
    render(<Fornecedores />);

    const nacional = (await screen.findByText('Cerâmica Paraíba LTDA')).closest('tr');
    expect(within(nacional).getByText('11.222.333/0001-81')).toBeInTheDocument();
    expect(within(nacional).getByText('Cerâmica PB')).toBeInTheDocument();
    expect(within(nacional).getByText('BRL')).toBeInTheDocument();
    expect(within(nacional).getByText('Ativo')).toBeInTheDocument();
    const estrangeiro = linhaDe('Foshan Ceramics Co., Ltd.');
    expect(within(estrangeiro).getByText('91330200MA2XXXXX')).toBeInTheDocument();
    expect(within(estrangeiro).getByText('CN')).toBeInTheDocument();
    expect(within(estrangeiro).getByText('Inativo')).toBeInTheDocument();
  });

  it('mostra o vazio conforme o filtro', async () => {
    listarFornecedores.mockResolvedValue({ dados: [] });

    render(<Fornecedores />);

    expect(await screen.findByText('Nenhum fornecedor cadastrado.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Moeda'), { target: { value: 'EUR' } });
    expect(await screen.findByText('Nenhum fornecedor encontrado com estes filtros.')).toBeInTheDocument();
  });

  it('mostra o erro sem o vazio e tenta de novo', async () => {
    listarFornecedores.mockRejectedValueOnce(new Error('falha de rede'));

    render(<Fornecedores />);

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum fornecedor cadastrado.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Cerâmica Paraíba LTDA')).toBeInTheDocument();
  });

  it('busca ao enviar e filtra por moeda e situação', async () => {
    render(<Fornecedores />);
    await screen.findByText('Cerâmica Paraíba LTDA');

    fireEvent.change(screen.getByLabelText('Buscar fornecedor'), { target: { value: '  foshan ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() =>
      expect(listarFornecedores).toHaveBeenLastCalledWith(
        expect.objectContaining({ busca: 'foshan', pagina: 1 })
      )
    );

    fireEvent.change(screen.getByLabelText('Moeda'), { target: { value: 'USD' } });
    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'false' } });

    await waitFor(() =>
      expect(listarFornecedores).toHaveBeenLastCalledWith(
        expect.objectContaining({ busca: 'foshan', moeda: 'USD', ativo: 'false', pagina: 1 })
      )
    );
  });

  it('só deixa ler quem não é financeiro', async () => {
    perfil({ financeiro: false });

    render(<Fornecedores />);
    await screen.findByText('Cerâmica Paraíba LTDA');

    expect(screen.queryByRole('button', { name: /Novo Fornecedor/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar fornecedor' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Desativar fornecedor' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Excluir fornecedor' })).toBeNull();
  });

  it('deixa a exclusão só para o administrador', async () => {
    render(<Fornecedores />);
    await screen.findByText('Cerâmica Paraíba LTDA');
    expect(within(linhaDe('Cerâmica Paraíba LTDA')).getByRole('button', { name: 'Editar fornecedor' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir fornecedor' })).toBeNull();
  });

  it('valida nome, documento e e-mail do fornecedor do Brasil antes de enviar', async () => {
    const dialogo = await abrirNovo();
    preencher(dialogo, { 'CPF ou CNPJ *': '123.456', 'E-mail': 'sem-arroba' });

    salvar(dialogo);

    expect(await within(dialogo).findByText('O CPF tem 11 dígitos e o CNPJ, 14 caracteres.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe o nome ou a razão social.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(criarFornecedor).not.toHaveBeenCalled();
  });

  it('cria o fornecedor do Brasil com documento sem máscara, sem os campos vazios', async () => {
    const dialogo = await abrirNovo();
    preencher(dialogo, {
      'CPF ou CNPJ *': '11.222.333/0001-81',
      'Nome ou razão social *': '  Cerâmica Paraíba LTDA ',
      UF: 'PB',
      Cidade: 'João Pessoa',
      Contato: 'Maria',
    });

    salvar(dialogo);

    await waitFor(() =>
      expect(criarFornecedor).toHaveBeenCalledWith({
        pais: 'BR',
        documento: '11222333000181',
        nome: 'Cerâmica Paraíba LTDA',
        moeda_padrao: 'BRL',
        uf: 'PB',
        cidade: 'João Pessoa',
        contato_nome: 'Maria',
        observacoes: '',
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('cria o estrangeiro com identificação no lugar de documento, UF e cidade', async () => {
    const dialogo = await abrirNovo();
    preencher(dialogo, { 'País *': 'cn' });

    expect(within(dialogo).queryByLabelText('CPF ou CNPJ *')).toBeNull();
    expect(within(dialogo).queryByLabelText('UF')).toBeNull();
    preencher(dialogo, {
      'Identificação estrangeira': '91330200ma2xxxxx',
      'Nome ou razão social *': 'Foshan Ceramics Co., Ltd.',
      'Moeda padrão': 'USD',
    });
    salvar(dialogo);

    await waitFor(() =>
      expect(criarFornecedor).toHaveBeenCalledWith({
        pais: 'CN',
        identificacao_estrangeira: '91330200MA2XXXXX',
        nome: 'Foshan Ceramics Co., Ltd.',
        moeda_padrao: 'USD',
        observacoes: '',
      })
    );
  });

  it('recusa país fora do formato de duas letras', async () => {
    const dialogo = await abrirNovo();
    preencher(dialogo, { 'País *': 'C1', 'Nome ou razão social *': 'Fornecedor' });

    salvar(dialogo);

    expect(await within(dialogo).findByText('Use o código de duas letras do país (BR, CN, US…).')).toBeInTheDocument();
    expect(criarFornecedor).not.toHaveBeenCalled();
  });

  it('mostra o documento repetido como erro do formulário, sem o aviso de conflito', async () => {
    criarFornecedor.mockRejectedValue(new ErroApi(409, 'já existe um fornecedor com este documento'));
    const dialogo = await abrirNovo();
    preencher(dialogo, { 'CPF ou CNPJ *': '11222333000181', 'Nome ou razão social *': 'Cerâmica' });

    salvar(dialogo);

    expect(await within(dialogo).findByText('já existe um fornecedor com este documento')).toBeInTheDocument();
    expect(within(dialogo).queryByRole('button', { name: 'Recarregar dados' })).toBeNull();
    expect(within(dialogo).getByLabelText('Nome ou razão social *')).toHaveValue('Cerâmica');
  });

  it('edita sem deixar mudar país e documento, enviando a versão lida', async () => {
    const dialogo = await abrirEdicao('Cerâmica Paraíba LTDA');
    expect(within(dialogo).getByLabelText('País *')).toBeDisabled();
    expect(within(dialogo).getByLabelText('CPF ou CNPJ *')).toBeDisabled();
    expect(within(dialogo).getByLabelText('CPF ou CNPJ *')).toHaveValue('11.222.333/0001-81');

    preencher(dialogo, { 'Nome fantasia': 'Cerâmica PB Matriz' });
    salvar(dialogo);

    await waitFor(() =>
      expect(atualizarFornecedor).toHaveBeenCalledWith('for-pb', {
        nome: 'Cerâmica Paraíba LTDA',
        nome_fantasia: 'Cerâmica PB Matriz',
        moeda_padrao: 'BRL',
        uf: 'PB',
        cidade: 'João Pessoa',
        contato_nome: 'Maria',
        email: 'vendas@ceramicapb.com.br',
        observacoes: '',
        versao: 3,
      })
    );
  });

  it('no conflito de versão recarrega o registro sem perder o formulário e grava com a versão nova', async () => {
    atualizarFornecedor.mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    const dialogo = await abrirEdicao('Cerâmica Paraíba LTDA');
    preencher(dialogo, { Telefone: '83 3333-0000' });

    salvar(dialogo);

    expect(await within(dialogo).findByText(CONFLITO)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Recarregar dados' }));
    await waitFor(() => expect(obterFornecedor).toHaveBeenCalledWith('for-pb', expect.anything()));
    expect(await within(dialogo).findByText(/Dados recarregados/)).toBeInTheDocument();
    expect(within(dialogo).queryByText(CONFLITO)).toBeNull();
    expect(within(dialogo).getByLabelText('Telefone')).toHaveValue('83 3333-0000');

    salvar(dialogo);

    await waitFor(() =>
      expect(atualizarFornecedor).toHaveBeenLastCalledWith(
        'for-pb',
        expect.objectContaining({ telefone: '83 3333-0000', versao: 4 })
      )
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('cancela a recarga do registro quando o formulário fecha', async () => {
    atualizarFornecedor.mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    obterFornecedor.mockReturnValue(new Promise(() => {}));
    const dialogo = await abrirEdicao('Cerâmica Paraíba LTDA');
    salvar(dialogo);
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Recarregar dados' }));
    await waitFor(() => expect(obterFornecedor).toHaveBeenCalled());

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(obterFornecedor.mock.calls[0][1].sinal.aborted).toBe(true);
  });

  it('desativa o ativo e ativa o inativo com a versão de cada um', async () => {
    render(<Fornecedores />);
    await screen.findByText('Cerâmica Paraíba LTDA');

    fireEvent.click(within(linhaDe('Cerâmica Paraíba LTDA')).getByRole('button', { name: 'Desativar fornecedor' }));
    await waitFor(() => expect(desativarFornecedor).toHaveBeenCalledWith('for-pb', 3));
    await screen.findByText('Foshan Ceramics Co., Ltd.');
    fireEvent.click(within(linhaDe('Foshan Ceramics Co., Ltd.')).getByRole('button', { name: 'Ativar fornecedor' }));

    await waitFor(() => expect(ativarFornecedor).toHaveBeenCalledWith('for-cn', 7));
  });

  it('no conflito de versão da troca de situação avisa e recarrega a lista', async () => {
    desativarFornecedor.mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    render(<Fornecedores />);
    await screen.findByText('Cerâmica Paraíba LTDA');

    fireEvent.click(within(linhaDe('Cerâmica Paraíba LTDA')).getByRole('button', { name: 'Desativar fornecedor' }));
    expect(await screen.findByText(CONFLITO)).toBeInTheDocument();
    listarFornecedores.mockResolvedValue({ dados: [{ ...CERAMICA, versao: 4 }, FOSHAN] });
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar dados' }));

    await waitFor(() => expect(screen.queryByText(CONFLITO)).toBeNull());
    await waitFor(() => expect(listarFornecedores).toHaveBeenCalledTimes(2));
    await screen.findByText('Cerâmica Paraíba LTDA');
    fireEvent.click(within(linhaDe('Cerâmica Paraíba LTDA')).getByRole('button', { name: 'Desativar fornecedor' }));
    await waitFor(() => expect(desativarFornecedor).toHaveBeenLastCalledWith('for-pb', 4));
  });

  it('mostra outro erro da troca de situação com Fechar', async () => {
    desativarFornecedor.mockRejectedValue(new ErroApi(403, 'perfil sem permissão para esta operação'));
    render(<Fornecedores />);
    await screen.findByText('Cerâmica Paraíba LTDA');

    fireEvent.click(within(linhaDe('Cerâmica Paraíba LTDA')).getByRole('button', { name: 'Desativar fornecedor' }));

    expect(await screen.findByText('perfil sem permissão para esta operação')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByText('perfil sem permissão para esta operação')).toBeNull();
  });

  it('exclui depois de confirmar e mostra o erro de fornecedor em uso', async () => {
    perfil({ administrador: true });
    removerFornecedor.mockRejectedValueOnce(
      new ErroApi(400, 'erro de validação: registro em uso por outros dados e não pode ser excluído')
    );
    render(<Fornecedores />);
    await screen.findByText('Cerâmica Paraíba LTDA');

    fireEvent.click(within(linhaDe('Cerâmica Paraíba LTDA')).getByRole('button', { name: 'Excluir fornecedor' }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));

    expect(await within(dialogo).findByText(/registro em uso por outros dados/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(removerFornecedor).toHaveBeenCalledTimes(2);
    expect(removerFornecedor).toHaveBeenCalledWith('for-pb');
  });
});
