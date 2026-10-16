import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as contasService from '../../services/contasBancarias';
import * as empresasService from '../../services/empresas';
import ContasBancarias from './ContasBancarias';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));

vi.mock('../../services/contasBancarias', () => ({
  listarContasBancarias: vi.fn(),
  obterContaBancaria: vi.fn(),
  criarContaBancaria: vi.fn(),
  atualizarContaBancaria: vi.fn(),
  ativarContaBancaria: vi.fn(),
  desativarContaBancaria: vi.fn(),
  removerContaBancaria: vi.fn(),
  listarBancos: vi.fn(),
}));

const {
  listarContasBancarias,
  obterContaBancaria,
  criarContaBancaria,
  atualizarContaBancaria,
  ativarContaBancaria,
  desativarContaBancaria,
  removerContaBancaria,
  listarBancos,
} = contasService;
const { listarTodasEmpresas } = empresasService;

const CONFLITO = 'a conta bancária foi alterada por outra pessoa; recarregue e tente de novo';

const BANCOS = [
  { codigo: '001', nome: 'Banco do Brasil' },
  { codigo: '341', nome: 'Itaú' },
  { codigo: '748', nome: 'Sicredi' },
];

const EMPRESAS = [
  { id: 'emp-mia', nome_fantasia: 'MIA', ativa: true },
  { id: 'emp-gig', nome_fantasia: 'Gigante', ativa: true },
];

const SICREDI = {
  id: 'cb-sic',
  empresa_id: 'emp-mia',
  banco: '748',
  banco_nome: 'Sicredi',
  tipo: 'corrente',
  agencia: '0812',
  agencia_digito: null,
  agencia_formatada: '0812',
  conta: '54321',
  conta_digito: '0',
  conta_formatada: '54321-0',
  apelido: 'Sicredi movimento',
  ativa: true,
  versao: 3,
};

const POUPANCA = {
  id: 'cb-bb',
  empresa_id: 'emp-gig',
  banco: '001',
  banco_nome: 'Banco do Brasil',
  tipo: 'poupanca',
  agencia: '1234',
  agencia_digito: 'X',
  agencia_formatada: '1234-X',
  conta: '998877',
  conta_digito: '1',
  conta_formatada: '998877-1',
  apelido: 'Poupança BB',
  ativa: false,
  versao: 7,
};

function perfil({ financeiro = true, administrador = false } = {}) {
  useAutenticacao.mockReturnValue({ financeiro, administrador });
}

function linhaDe(texto) {
  return screen.getByText(texto).closest('tr');
}

async function abrirNova() {
  render(<ContasBancarias />);
  await screen.findByText('Sicredi movimento');
  fireEvent.click(screen.getByRole('button', { name: /Nova Conta/ }));
  const dialogo = screen.getByRole('dialog');
  await within(dialogo).findByRole('option', { name: 'Gigante' });
  await within(dialogo).findByRole('option', { name: 'Sicredi (748)' });
  return dialogo;
}

async function abrirEdicao(apelido) {
  render(<ContasBancarias />);
  await screen.findByText(apelido);
  fireEvent.click(within(linhaDe(apelido)).getByRole('button', { name: 'Editar conta' }));
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
  listarTodasEmpresas.mockResolvedValue(EMPRESAS);
  listarBancos.mockResolvedValue({ dados: BANCOS });
  listarContasBancarias.mockResolvedValue({ dados: [SICREDI, POUPANCA] });
  obterContaBancaria.mockResolvedValue({ dados: { ...SICREDI, versao: 4 } });
  criarContaBancaria.mockResolvedValue({ dados: SICREDI });
  atualizarContaBancaria.mockResolvedValue({ dados: SICREDI });
  ativarContaBancaria.mockResolvedValue({ dados: POUPANCA });
  desativarContaBancaria.mockResolvedValue({ dados: SICREDI });
  removerContaBancaria.mockResolvedValue(null);
});

describe('ContasBancarias', () => {
  it('lista com empresa, banco, tipo, agência, conta e situação', async () => {
    render(<ContasBancarias />);

    const sicredi = (await screen.findByText('Sicredi movimento')).closest('tr');
    expect(await within(sicredi).findByText('MIA')).toBeInTheDocument();
    expect(within(sicredi).getByText('Sicredi')).toBeInTheDocument();
    expect(within(sicredi).getByText('Corrente')).toBeInTheDocument();
    expect(within(sicredi).getByText('0812')).toBeInTheDocument();
    expect(within(sicredi).getByText('54321-0')).toBeInTheDocument();
    expect(within(sicredi).getByText('Ativa')).toBeInTheDocument();
    const poupanca = linhaDe('Poupança BB');
    expect(await within(poupanca).findByText('Gigante')).toBeInTheDocument();
    expect(within(poupanca).getByText('Poupança')).toBeInTheDocument();
    expect(within(poupanca).getByText('1234-X')).toBeInTheDocument();
    expect(within(poupanca).getByText('Inativa')).toBeInTheDocument();
  });

  it('mostra o vazio conforme o filtro', async () => {
    listarContasBancarias.mockResolvedValue({ dados: [] });

    render(<ContasBancarias />);

    expect(await screen.findByText('Nenhuma conta bancária cadastrada nas empresas do seu acesso.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'aplicacao' } });
    expect(await screen.findByText('Nenhuma conta encontrada com estes filtros.')).toBeInTheDocument();
  });

  it('mostra o erro sem o vazio e tenta de novo', async () => {
    listarContasBancarias.mockRejectedValueOnce(new Error('falha de rede'));

    render(<ContasBancarias />);

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma conta bancária cadastrada nas empresas do seu acesso.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Sicredi movimento')).toBeInTheDocument();
  });

  it('filtra por empresa, banco, tipo e situação', async () => {
    render(<ContasBancarias />);
    await screen.findByText('Sicredi movimento');
    await screen.findByRole('option', { name: 'Gigante' });
    await screen.findByRole('option', { name: 'Sicredi (748)' });

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-gig' } });
    fireEvent.change(screen.getByLabelText('Banco'), { target: { value: '001' } });
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'poupanca' } });
    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'false' } });

    await waitFor(() =>
      expect(listarContasBancarias).toHaveBeenLastCalledWith(
        expect.objectContaining({ empresa: 'emp-gig', banco: '001', tipo: 'poupanca', ativa: 'false', pagina: 1 })
      )
    );
  });

  it('deixa a exclusão só para o administrador', async () => {
    render(<ContasBancarias />);
    await screen.findByText('Sicredi movimento');

    expect(within(linhaDe('Sicredi movimento')).getByRole('button', { name: 'Editar conta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir conta' })).toBeNull();
  });

  it('valida empresa, banco, agência, conta, dígitos e apelido antes de enviar', async () => {
    const dialogo = await abrirNova();
    preencher(dialogo, {
      'Agência *': '123456',
      'Dígito da agência': '7a',
      'Conta *': '0000',
      'Dígito da conta': 'Y',
    });

    salvar(dialogo);

    expect(await within(dialogo).findByText('Selecione a empresa.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Selecione o banco.')).toBeInTheDocument();
    expect(within(dialogo).getByText('A agência tem de 1 a 5 dígitos.')).toBeInTheDocument();
    expect(within(dialogo).getByText('O dígito da agência é um número, X ou P.')).toBeInTheDocument();
    expect(within(dialogo).getByText('A conta não pode ser só zeros.')).toBeInTheDocument();
    expect(within(dialogo).getByText('O dígito da conta tem 1 ou 2 caracteres: números, X ou P.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe o apelido.')).toBeInTheDocument();
    expect(criarContaBancaria).not.toHaveBeenCalled();
  });

  it('cria a conta com agência e conta sem pontos, dígito em maiúsculas e sem dígito vazio', async () => {
    const dialogo = await abrirNova();
    preencher(dialogo, {
      'Empresa *': 'emp-mia',
      'Banco *': '001',
      'Tipo *': 'poupanca',
      'Agência *': ' 0812 ',
      'Conta *': '12.345',
      'Dígito da conta': 'x',
      'Apelido *': '  Poupança da obra ',
    });

    salvar(dialogo);

    await waitFor(() =>
      expect(criarContaBancaria).toHaveBeenCalledWith({
        empresa_id: 'emp-mia',
        banco: '001',
        tipo: 'poupanca',
        agencia: '0812',
        conta: '12345',
        conta_digito: 'X',
        apelido: 'Poupança da obra',
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('mostra a conta repetida como erro do formulário, sem o aviso de conflito', async () => {
    criarContaBancaria.mockRejectedValue(new ErroApi(409, 'já existe uma conta com este banco, agência e número'));
    const dialogo = await abrirNova();
    preencher(dialogo, {
      'Empresa *': 'emp-mia',
      'Banco *': '748',
      'Agência *': '0812',
      'Conta *': '54321',
      'Apelido *': 'Repetida',
    });

    salvar(dialogo);

    expect(await within(dialogo).findByText('já existe uma conta com este banco, agência e número')).toBeInTheDocument();
    expect(within(dialogo).queryByRole('button', { name: 'Recarregar dados' })).toBeNull();
    expect(within(dialogo).getByLabelText('Apelido *')).toHaveValue('Repetida');
  });

  it('edita só o apelido, mostrando os dados que não mudam, com a versão lida', async () => {
    const dialogo = await abrirEdicao('Sicredi movimento');

    expect(within(dialogo).queryByLabelText('Banco *')).toBeNull();
    expect(within(dialogo).queryByLabelText('Conta *')).toBeNull();
    expect(within(dialogo).getByText(/Sicredi \(748\)/)).toBeInTheDocument();
    expect(within(dialogo).getByText(/54321-0/)).toBeInTheDocument();
    preencher(dialogo, { 'Apelido *': 'Sicredi principal' });
    salvar(dialogo);

    await waitFor(() =>
      expect(atualizarContaBancaria).toHaveBeenCalledWith('cb-sic', { apelido: 'Sicredi principal', versao: 3 })
    );
  });

  it('no conflito de versão recarrega o registro sem perder o apelido e grava com a versão nova', async () => {
    atualizarContaBancaria.mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    const dialogo = await abrirEdicao('Sicredi movimento');
    preencher(dialogo, { 'Apelido *': 'Sicredi principal' });

    salvar(dialogo);

    expect(await within(dialogo).findByText(CONFLITO)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Recarregar dados' }));
    await waitFor(() => expect(obterContaBancaria).toHaveBeenCalledWith('cb-sic', expect.anything()));
    expect(await within(dialogo).findByText(/Dados recarregados/)).toBeInTheDocument();
    expect(within(dialogo).queryByText(CONFLITO)).toBeNull();
    expect(within(dialogo).getByLabelText('Apelido *')).toHaveValue('Sicredi principal');

    salvar(dialogo);

    await waitFor(() =>
      expect(atualizarContaBancaria).toHaveBeenLastCalledWith('cb-sic', { apelido: 'Sicredi principal', versao: 4 })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('cancela a recarga do registro quando o formulário fecha', async () => {
    atualizarContaBancaria.mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    obterContaBancaria.mockReturnValue(new Promise(() => {}));
    const dialogo = await abrirEdicao('Sicredi movimento');
    salvar(dialogo);
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Recarregar dados' }));
    await waitFor(() => expect(obterContaBancaria).toHaveBeenCalled());

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(obterContaBancaria.mock.calls[0][1].sinal.aborted).toBe(true);
  });

  it('desativa a ativa e ativa a inativa com a versão de cada uma', async () => {
    render(<ContasBancarias />);
    await screen.findByText('Sicredi movimento');

    fireEvent.click(within(linhaDe('Sicredi movimento')).getByRole('button', { name: 'Desativar conta' }));
    await waitFor(() => expect(desativarContaBancaria).toHaveBeenCalledWith('cb-sic', 3));
    await screen.findByText('Poupança BB');
    fireEvent.click(within(linhaDe('Poupança BB')).getByRole('button', { name: 'Ativar conta' }));

    await waitFor(() => expect(ativarContaBancaria).toHaveBeenCalledWith('cb-bb', 7));
  });

  it('no conflito de versão da troca de situação avisa e recarrega a lista', async () => {
    desativarContaBancaria.mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    render(<ContasBancarias />);
    await screen.findByText('Sicredi movimento');

    fireEvent.click(within(linhaDe('Sicredi movimento')).getByRole('button', { name: 'Desativar conta' }));
    expect(await screen.findByText(CONFLITO)).toBeInTheDocument();
    listarContasBancarias.mockResolvedValue({ dados: [{ ...SICREDI, versao: 4 }, POUPANCA] });
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar dados' }));

    await waitFor(() => expect(screen.queryByText(CONFLITO)).toBeNull());
    await waitFor(() => expect(listarContasBancarias).toHaveBeenCalledTimes(2));
    await screen.findByText('Sicredi movimento');
    fireEvent.click(within(linhaDe('Sicredi movimento')).getByRole('button', { name: 'Desativar conta' }));
    await waitFor(() => expect(desativarContaBancaria).toHaveBeenLastCalledWith('cb-sic', 4));
  });

  it('mostra a empresa inativa ao reativar como erro com Fechar', async () => {
    ativarContaBancaria.mockRejectedValue(
      new ErroApi(400, 'erro de validação: empresa inativa não recebe conta bancária')
    );
    render(<ContasBancarias />);
    await screen.findByText('Poupança BB');

    fireEvent.click(within(linhaDe('Poupança BB')).getByRole('button', { name: 'Ativar conta' }));

    expect(await screen.findByText(/empresa inativa não recebe conta bancária/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByText(/empresa inativa não recebe conta bancária/)).toBeNull();
  });

  it('exclui depois de confirmar e mostra o erro de conta em uso', async () => {
    perfil({ administrador: true });
    removerContaBancaria.mockRejectedValueOnce(
      new ErroApi(400, 'erro de validação: registro em uso por outros dados e não pode ser excluído')
    );
    render(<ContasBancarias />);
    await screen.findByText('Sicredi movimento');

    fireEvent.click(within(linhaDe('Sicredi movimento')).getByRole('button', { name: 'Excluir conta' }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));

    expect(await within(dialogo).findByText(/registro em uso por outros dados/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(removerContaBancaria).toHaveBeenCalledTimes(2);
    expect(removerContaBancaria).toHaveBeenCalledWith('cb-sic');
  });
});
