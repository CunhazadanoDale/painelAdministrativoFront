import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as empresasService from '../../services/empresas';
import * as locaisService from '../../services/locais';
import Locais from './Locais';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));

vi.mock('../../services/locais', () => ({
  listarLocais: vi.fn(),
  criarLocal: vi.fn(),
  renomearLocal: vi.fn(),
  ativarLocal: vi.fn(),
  desativarLocal: vi.fn(),
  removerLocal: vi.fn(),
  listarSaldosDoLocal: vi.fn(),
}));

const { listarLocais, criarLocal, renomearLocal, ativarLocal, desativarLocal, removerLocal, listarSaldosDoLocal } =
  locaisService;
const { listarTodasEmpresas } = empresasService;

const EMPRESAS = [
  { id: 'emp-mia', nome_fantasia: 'MIA', ativa: true },
  { id: 'emp-gig', nome_fantasia: 'Gigante', ativa: true },
];

const GALPAO = { id: 'loc-galpao', empresa_id: 'emp-mia', nome: 'Galpão Cabedelo', ativo: true };
const LOJA = { id: 'loc-loja', empresa_id: 'emp-gig', nome: 'Loja João Pessoa', ativo: false };

const CIMENTO = {
  produto_id: 'prod-cimento',
  produto_nome: 'Cimento CP II 50',
  produto_codigo: 'SKU-001',
  unidade_medida: 'sc',
  local_id: 'loc-galpao',
  quantidade: 10,
  reservado: 3,
  disponivel: 7,
};

function perfil({ administrador = true } = {}) {
  useAutenticacao.mockReturnValue({ administrador });
}

function renderizar() {
  return render(
    <MemoryRouter>
      <Locais />
    </MemoryRouter>
  );
}

function linhaDe(texto) {
  return screen.getByText(texto).closest('tr');
}

async function carregar() {
  renderizar();
  await screen.findByText('Galpão Cabedelo');
}

beforeEach(() => {
  vi.clearAllMocks();
  perfil();
  listarTodasEmpresas.mockResolvedValue(EMPRESAS);
  listarLocais.mockResolvedValue({ dados: [GALPAO, LOJA] });
  criarLocal.mockResolvedValue({ dados: GALPAO });
  renomearLocal.mockResolvedValue({ dados: GALPAO });
  ativarLocal.mockResolvedValue({ dados: LOJA });
  desativarLocal.mockResolvedValue({ dados: GALPAO });
  removerLocal.mockResolvedValue(null);
  listarSaldosDoLocal.mockResolvedValue({ dados: [CIMENTO] });
});

describe('Locais', () => {
  it('lista com empresa e situação', async () => {
    await carregar();

    expect(await within(linhaDe('Galpão Cabedelo')).findByText('MIA')).toBeInTheDocument();
    expect(within(linhaDe('Galpão Cabedelo')).getByText('Ativo')).toBeInTheDocument();
    expect(await within(linhaDe('Loja João Pessoa')).findByText('Gigante')).toBeInTheDocument();
    expect(within(linhaDe('Loja João Pessoa')).getByText('Inativo')).toBeInTheDocument();
  });

  it('mostra o vazio conforme o filtro', async () => {
    listarLocais.mockResolvedValue({ dados: [] });

    renderizar();

    expect(await screen.findByText('Nenhum local de estoque nas empresas do seu acesso.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'false' } });
    expect(await screen.findByText('Nenhum local encontrado com estes filtros.')).toBeInTheDocument();
  });

  it('mostra o erro sem o vazio e tenta de novo', async () => {
    listarLocais.mockRejectedValueOnce(new Error('falha de rede'));

    renderizar();

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum local de estoque nas empresas do seu acesso.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Galpão Cabedelo')).toBeInTheDocument();
  });

  it('filtra por empresa e situação', async () => {
    await carregar();
    await screen.findByRole('option', { name: 'Gigante' });

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-gig' } });
    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'true' } });

    await waitFor(() =>
      expect(listarLocais).toHaveBeenLastCalledWith(
        expect.objectContaining({ empresa: 'emp-gig', ativos: 'true', pagina: 1 })
      )
    );
  });

  it('só deixa consultar os saldos quem não é administrador', async () => {
    perfil({ administrador: false });

    await carregar();

    expect(within(linhaDe('Galpão Cabedelo')).getByRole('button', { name: 'Ver saldos' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo Local/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Renomear local' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Desativar local' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Excluir local' })).toBeNull();
  });

  it('valida empresa e nome antes de criar', async () => {
    await carregar();
    fireEvent.click(screen.getByRole('button', { name: /Novo Local/ }));
    const dialogo = screen.getByRole('dialog');
    await within(dialogo).findByRole('option', { name: 'Gigante' });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText('Selecione a empresa.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe o nome.')).toBeInTheDocument();
    expect(criarLocal).not.toHaveBeenCalled();
  });

  it('cria o local na empresa escolhida com o nome sem espaços nas pontas', async () => {
    await carregar();
    fireEvent.click(screen.getByRole('button', { name: /Novo Local/ }));
    const dialogo = screen.getByRole('dialog');
    await within(dialogo).findByRole('option', { name: 'Gigante' });

    fireEvent.change(within(dialogo).getByLabelText('Empresa *'), { target: { value: 'emp-gig' } });
    fireEvent.change(within(dialogo).getByLabelText('Nome *'), { target: { value: '  Depósito Bayeux ' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(criarLocal).toHaveBeenCalledWith({ empresa_id: 'emp-gig', nome: 'Depósito Bayeux' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('mostra o nome repetido como erro do formulário sem perder o que foi digitado', async () => {
    criarLocal.mockRejectedValue(new ErroApi(409, 'já existe um local com este nome na empresa'));
    await carregar();
    fireEvent.click(screen.getByRole('button', { name: /Novo Local/ }));
    const dialogo = screen.getByRole('dialog');
    await within(dialogo).findByRole('option', { name: 'Gigante' });
    fireEvent.change(within(dialogo).getByLabelText('Empresa *'), { target: { value: 'emp-mia' } });
    fireEvent.change(within(dialogo).getByLabelText('Nome *'), { target: { value: 'Galpão Cabedelo' } });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText('já existe um local com este nome na empresa')).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Nome *')).toHaveValue('Galpão Cabedelo');
  });

  it('renomeia mostrando a empresa, que não muda', async () => {
    await carregar();
    fireEvent.click(within(linhaDe('Galpão Cabedelo')).getByRole('button', { name: 'Renomear local' }));
    const dialogo = screen.getByRole('dialog');

    expect(within(dialogo).queryByLabelText('Empresa *')).toBeNull();
    expect(await within(dialogo).findByText('MIA')).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('Nome *'), { target: { value: 'Galpão Cabedelo 2' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(renomearLocal).toHaveBeenCalledWith('loc-galpao', 'Galpão Cabedelo 2'));
  });

  it('desativa o ativo, ativa o inativo e mostra o erro de local com saldo', async () => {
    desativarLocal.mockRejectedValueOnce(
      new ErroApi(400, 'erro de validação: local com saldo não pode ser desativado')
    );
    await carregar();

    fireEvent.click(within(linhaDe('Galpão Cabedelo')).getByRole('button', { name: 'Desativar local' }));
    expect(await screen.findByText(/local com saldo não pode ser desativado/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByText(/local com saldo não pode ser desativado/)).toBeNull();

    fireEvent.click(within(linhaDe('Loja João Pessoa')).getByRole('button', { name: 'Ativar local' }));
    await waitFor(() => expect(ativarLocal).toHaveBeenCalledWith('loc-loja'));
    expect(desativarLocal).toHaveBeenCalledWith('loc-galpao');
  });

  it('exclui depois de confirmar e mostra o erro de local em uso', async () => {
    removerLocal.mockRejectedValueOnce(
      new ErroApi(400, 'erro de validação: registro em uso por outros dados e não pode ser excluído')
    );
    await carregar();

    fireEvent.click(within(linhaDe('Galpão Cabedelo')).getByRole('button', { name: 'Excluir local' }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));

    expect(await within(dialogo).findByText(/registro em uso por outros dados/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(removerLocal).toHaveBeenCalledTimes(2);
  });

  it('mostra os saldos do local só com saldo, com link para o produto, e pode mostrar os zerados', async () => {
    await carregar();

    fireEvent.click(within(linhaDe('Galpão Cabedelo')).getByRole('button', { name: 'Ver saldos' }));
    const dialogo = screen.getByRole('dialog');

    const cimento = (await within(dialogo).findByText('Cimento CP II 50')).closest('tr');
    expect(within(cimento).getByText('SKU-001')).toBeInTheDocument();
    expect(within(cimento).getByText('10')).toBeInTheDocument();
    expect(within(cimento).getByText('3')).toBeInTheDocument();
    expect(within(cimento).getByText('7')).toBeInTheDocument();
    expect(within(cimento).getByRole('link', { name: 'Cimento CP II 50' })).toHaveAttribute(
      'href',
      '/produtos/prod-cimento'
    );
    expect(listarSaldosDoLocal).toHaveBeenCalledWith(
      'loc-galpao',
      expect.objectContaining({ comSaldo: true, pagina: 1 })
    );

    fireEvent.click(within(dialogo).getByLabelText('Só produtos com saldo'));

    await waitFor(() =>
      expect(listarSaldosDoLocal).toHaveBeenLastCalledWith('loc-galpao', expect.objectContaining({ comSaldo: false }))
    );
  });

  it('mostra o vazio e o erro dos saldos do local', async () => {
    listarSaldosDoLocal.mockRejectedValueOnce(new Error('falha nos saldos')).mockResolvedValue({ dados: [] });
    await carregar();

    fireEvent.click(within(linhaDe('Galpão Cabedelo')).getByRole('button', { name: 'Ver saldos' }));
    const dialogo = screen.getByRole('dialog');

    expect(await within(dialogo).findByText('falha nos saldos')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Tentar novamente' }));
    expect(await within(dialogo).findByText('Nenhum produto com saldo neste local.')).toBeInTheDocument();
  });
});
