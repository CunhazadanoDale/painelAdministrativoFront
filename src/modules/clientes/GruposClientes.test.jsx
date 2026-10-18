import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as gruposService from '../../services/clienteGrupos';
import GruposClientes from './GruposClientes';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));

vi.mock('../../services/clienteGrupos', () => ({
  listarGrupos: vi.fn(),
  criarGrupo: vi.fn(),
  renomearGrupo: vi.fn(),
  ativarGrupo: vi.fn(),
  desativarGrupo: vi.fn(),
}));

const { listarGrupos, criarGrupo, renomearGrupo, ativarGrupo, desativarGrupo } = gruposService;

const AGUIA = { id: 'gru-aguia', nome: 'Grupo Águia', ativo: true };
const ALFA = { id: 'gru-alfa', nome: 'Construtora Alfa', ativo: false };

function perfil({ comercial = true } = {}) {
  useAutenticacao.mockReturnValue({ comercial });
}

function linhaDe(texto) {
  return screen.getByText(texto).closest('tr');
}

async function carregar() {
  render(<GruposClientes />);
  await screen.findByText('Grupo Águia');
}

beforeEach(() => {
  vi.clearAllMocks();
  perfil();
  listarGrupos.mockResolvedValue({ dados: [AGUIA, ALFA] });
  criarGrupo.mockResolvedValue({ dados: AGUIA });
  renomearGrupo.mockResolvedValue({ dados: AGUIA });
  ativarGrupo.mockResolvedValue({ dados: ALFA });
  desativarGrupo.mockResolvedValue({ dados: AGUIA });
});

describe('GruposClientes', () => {
  it('lista os grupos com a situação', async () => {
    await carregar();

    expect(within(linhaDe('Grupo Águia')).getByText('Ativo')).toBeInTheDocument();
    expect(within(linhaDe('Construtora Alfa')).getByText('Inativo')).toBeInTheDocument();
  });

  it('mostra o vazio conforme o filtro', async () => {
    listarGrupos.mockResolvedValue({ dados: [] });

    render(<GruposClientes />);

    expect(await screen.findByText('Nenhum grupo de clientes cadastrado.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'false' } });
    expect(await screen.findByText('Nenhum grupo encontrado com estes filtros.')).toBeInTheDocument();
  });

  it('mostra o erro sem o vazio e tenta de novo', async () => {
    listarGrupos.mockRejectedValueOnce(new Error('falha de rede'));

    render(<GruposClientes />);

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum grupo de clientes cadastrado.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Grupo Águia')).toBeInTheDocument();
  });

  it('busca ao enviar e filtra por situação', async () => {
    await carregar();

    fireEvent.change(screen.getByLabelText('Buscar grupo'), { target: { value: '  aguia ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'true' } });

    await waitFor(() =>
      expect(listarGrupos).toHaveBeenLastCalledWith(expect.objectContaining({ busca: 'aguia', ativos: 'true', pagina: 1 }))
    );
  });

  it('só deixa ler quem não é comercial', async () => {
    perfil({ comercial: false });

    await carregar();

    expect(screen.queryByRole('button', { name: /Novo Grupo/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Renomear grupo' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Desativar grupo' })).toBeNull();
  });

  it('valida o nome e cria o grupo sem espaços nas pontas', async () => {
    await carregar();
    fireEvent.click(screen.getByRole('button', { name: /Novo Grupo/ }));
    const dialogo = screen.getByRole('dialog');

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialogo).findByText('Informe o nome.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Nome *'), { target: { value: '  Grupo Beta ' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(criarGrupo).toHaveBeenCalledWith('Grupo Beta'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('mostra o nome repetido como erro do formulário sem perder o que foi digitado', async () => {
    criarGrupo.mockRejectedValue(new ErroApi(409, 'já existe um grupo de clientes com este nome'));
    await carregar();
    fireEvent.click(screen.getByRole('button', { name: /Novo Grupo/ }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText('Nome *'), { target: { value: 'grupo aguia' } });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText('já existe um grupo de clientes com este nome')).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Nome *')).toHaveValue('grupo aguia');
  });

  it('renomeia o grupo com o nome atual preenchido', async () => {
    await carregar();
    fireEvent.click(within(linhaDe('Grupo Águia')).getByRole('button', { name: 'Renomear grupo' }));
    const dialogo = screen.getByRole('dialog');

    expect(within(dialogo).getByLabelText('Nome *')).toHaveValue('Grupo Águia');
    fireEvent.change(within(dialogo).getByLabelText('Nome *'), { target: { value: 'Águia Construções' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(renomearGrupo).toHaveBeenCalledWith('gru-aguia', 'Águia Construções'));
  });

  it('desativa o ativo, ativa o inativo e mostra o erro com Fechar', async () => {
    desativarGrupo.mockRejectedValueOnce(new ErroApi(403, 'perfil sem permissão para esta operação'));
    await carregar();

    fireEvent.click(within(linhaDe('Grupo Águia')).getByRole('button', { name: 'Desativar grupo' }));
    expect(await screen.findByText('perfil sem permissão para esta operação')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByText('perfil sem permissão para esta operação')).toBeNull();

    fireEvent.click(within(linhaDe('Construtora Alfa')).getByRole('button', { name: 'Ativar grupo' }));
    await waitFor(() => expect(ativarGrupo).toHaveBeenCalledWith('gru-alfa'));
    expect(desativarGrupo).toHaveBeenCalledWith('gru-aguia');
  });
});
