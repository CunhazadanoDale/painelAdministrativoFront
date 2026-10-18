import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as representantesService from '../../services/representantes';
import * as usuariosService from '../../services/usuarios';
import Representantes from './Representantes';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));

vi.mock('../../services/usuarios', () => ({ listarTodosUsuarios: vi.fn() }));

vi.mock('../../services/representantes', () => ({
  listarRepresentantes: vi.fn(),
  criarRepresentante: vi.fn(),
  atualizarRepresentante: vi.fn(),
  ativarRepresentante: vi.fn(),
  desativarRepresentante: vi.fn(),
}));

const {
  listarRepresentantes,
  criarRepresentante,
  atualizarRepresentante,
  ativarRepresentante,
  desativarRepresentante,
} = representantesService;
const { listarTodosUsuarios } = usuariosService;

const JOSE = {
  id: 'rep-jose',
  nome: 'José Vendas',
  documento: '52998224725',
  documento_formatado: '529.982.247-25',
  usuario_id: 'usr-jose',
  email: 'jose@vendas.com',
  telefone: null,
  comissao_pronta_entrega_bp: 300,
  comissao_importacao_bp: 150,
  ativo: true,
};

const MARIA = {
  id: 'rep-maria',
  nome: 'Maria Representações',
  documento: null,
  documento_formatado: null,
  usuario_id: null,
  email: null,
  telefone: '83 99999-0000',
  comissao_pronta_entrega_bp: 250,
  comissao_importacao_bp: 0,
  ativo: false,
};

const USUARIOS = [
  { id: 'usr-jose', nome: 'José da Silva', email: 'jose@mia.com' },
  { id: 'usr-ana', nome: 'Ana Souza', email: 'ana@mia.com' },
];

function perfil({ administrador = true } = {}) {
  useAutenticacao.mockReturnValue({ administrador, comercial: true });
}

function linhaDe(texto) {
  return screen.getByText(texto).closest('tr');
}

async function carregar() {
  render(<Representantes />);
  await screen.findByText('José Vendas');
}

async function abrirNovo() {
  await carregar();
  fireEvent.click(screen.getByRole('button', { name: /Novo Representante/ }));
  const dialogo = screen.getByRole('dialog');
  await within(dialogo).findByRole('option', { name: 'Ana Souza (ana@mia.com)' });
  return dialogo;
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
  listarTodosUsuarios.mockResolvedValue(USUARIOS);
  listarRepresentantes.mockResolvedValue({ dados: [JOSE, MARIA] });
  criarRepresentante.mockResolvedValue({ dados: JOSE });
  atualizarRepresentante.mockResolvedValue({ dados: JOSE });
  ativarRepresentante.mockResolvedValue({ dados: MARIA });
  desativarRepresentante.mockResolvedValue({ dados: JOSE });
});

describe('Representantes', () => {
  it('lista com documento, login, comissões em porcentagem e situação', async () => {
    await carregar();

    const jose = linhaDe('José Vendas');
    expect(within(jose).getByText('529.982.247-25')).toBeInTheDocument();
    expect(await within(jose).findByText('José da Silva')).toBeInTheDocument();
    expect(within(jose).getByText('3,00%')).toBeInTheDocument();
    expect(within(jose).getByText('1,50%')).toBeInTheDocument();
    const maria = linhaDe('Maria Representações');
    expect(within(maria).getByText('Sem login')).toBeInTheDocument();
    expect(within(maria).getByText('Inativo')).toBeInTheDocument();
  });

  it('para o comercial mostra só se há login, sem buscar usuários nem oferecer cadastro', async () => {
    perfil({ administrador: false });

    await carregar();

    expect(within(linhaDe('José Vendas')).getByText('Com login')).toBeInTheDocument();
    expect(listarTodosUsuarios).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Novo Representante/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar representante' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Desativar representante' })).toBeNull();
  });

  it('mostra o vazio conforme o filtro e o erro com nova tentativa', async () => {
    listarRepresentantes.mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValue({ dados: [] });

    render(<Representantes />);

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhum representante cadastrado.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'true' } });
    expect(await screen.findByText('Nenhum representante encontrado com estes filtros.')).toBeInTheDocument();
  });

  it('busca por nome ou documento ao enviar', async () => {
    await carregar();

    fireEvent.change(screen.getByLabelText('Buscar representante'), { target: { value: ' 529 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() =>
      expect(listarRepresentantes).toHaveBeenLastCalledWith(expect.objectContaining({ busca: '529', pagina: 1 }))
    );
  });

  it('valida nome, documento, e-mail e percentuais antes de enviar', async () => {
    const dialogo = await abrirNovo();
    preencher(dialogo, {
      Documento: '123',
      'E-mail': 'sem-arroba',
      'Comissão pronta entrega (%)': '101',
      'Comissão importação (%)': 'abc',
    });

    salvar(dialogo);

    expect(await within(dialogo).findByText('Informe o nome.')).toBeInTheDocument();
    expect(within(dialogo).getByText('O CPF tem 11 dígitos e o CNPJ, 14 caracteres.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(within(dialogo).getAllByText('Informe um percentual de 0 a 100, com até duas casas.')).toHaveLength(2);
    expect(criarRepresentante).not.toHaveBeenCalled();
  });

  it('cria com documento sem máscara, login, percentuais em pontos-base e opcionais vazios nulos', async () => {
    const dialogo = await abrirNovo();
    preencher(dialogo, {
      'Nome *': '  Ana Representações ',
      Documento: '529.982.247-25',
      'Usuário com login': 'usr-ana',
      'Comissão pronta entrega (%)': '2,5',
      'Comissão importação (%)': '1',
    });

    salvar(dialogo);

    await waitFor(() =>
      expect(criarRepresentante).toHaveBeenCalledWith({
        nome: 'Ana Representações',
        documento: '52998224725',
        usuario_id: 'usr-ana',
        email: null,
        telefone: null,
        comissao_pronta_entrega_bp: 250,
        comissao_importacao_bp: 100,
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('mostra o usuário já vinculado como erro do formulário', async () => {
    criarRepresentante.mockRejectedValue(new ErroApi(409, 'usuário já vinculado a outro representante'));
    const dialogo = await abrirNovo();
    preencher(dialogo, { 'Nome *': 'Ana', 'Usuário com login': 'usr-jose' });

    salvar(dialogo);

    expect(await within(dialogo).findByText('usuário já vinculado a outro representante')).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Nome *')).toHaveValue('Ana');
  });

  it('edita reenviando o cadastro inteiro e avisa que tirar o login desfaz o vínculo', async () => {
    await carregar();
    fireEvent.click(within(linhaDe('José Vendas')).getByRole('button', { name: 'Editar representante' }));
    const dialogo = screen.getByRole('dialog');
    await within(dialogo).findByRole('option', { name: 'José da Silva (jose@mia.com)' });

    expect(within(dialogo).getByLabelText('Documento')).toHaveValue('529.982.247-25');
    expect(within(dialogo).getByLabelText('Comissão pronta entrega (%)')).toHaveValue('3,00');
    expect(within(dialogo).getByLabelText('Usuário com login')).toHaveValue('usr-jose');
    preencher(dialogo, { 'Usuário com login': '' });
    expect(within(dialogo).getByText(/passa a ver todos os clientes/)).toBeInTheDocument();
    salvar(dialogo);

    await waitFor(() =>
      expect(atualizarRepresentante).toHaveBeenCalledWith('rep-jose', {
        nome: 'José Vendas',
        documento: '52998224725',
        usuario_id: null,
        email: 'jose@vendas.com',
        telefone: null,
        comissao_pronta_entrega_bp: 300,
        comissao_importacao_bp: 150,
      })
    );
  });

  it('desativa o ativo e ativa o inativo, mostrando o erro com Fechar', async () => {
    desativarRepresentante.mockRejectedValueOnce(new ErroApi(500, 'erro interno'));
    await carregar();

    fireEvent.click(within(linhaDe('José Vendas')).getByRole('button', { name: 'Desativar representante' }));
    expect(await screen.findByText('erro interno')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    fireEvent.click(within(linhaDe('Maria Representações')).getByRole('button', { name: 'Ativar representante' }));
    await waitFor(() => expect(ativarRepresentante).toHaveBeenCalledWith('rep-maria'));
    expect(desativarRepresentante).toHaveBeenCalledWith('rep-jose');
  });
});
