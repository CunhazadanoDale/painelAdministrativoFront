import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import * as gruposService from '../../services/clienteGrupos';
import * as clientesService from '../../services/clientes';
import * as empresasService from '../../services/empresas';
import * as representantesService from '../../services/representantes';
import { ConversaoLead } from './ConversaoLead';

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/clienteGrupos', () => ({ listarTodosGrupos: vi.fn() }));
vi.mock('../../services/representantes', () => ({ listarTodosRepresentantes: vi.fn() }));
vi.mock('../../services/clientes', () => ({ listarClientes: vi.fn(), converterLead: vi.fn() }));

const { listarClientes, converterLead } = clientesService;

const LEAD = { id: 'lead-1', nome: 'Construtora Alfa', email: 'compras@alfa.com.br', telefone: '83 98888-7777' };

const CLIENTE = { id: 'cli-alfa', nome: 'Construtora Alfa LTDA', lead_id: 'lead-1' };

function renderizar() {
  return render(
    <MemoryRouter>
      <ConversaoLead lead={LEAD} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  empresasService.listarTodasEmpresas.mockResolvedValue([]);
  gruposService.listarTodosGrupos.mockResolvedValue([]);
  representantesService.listarTodosRepresentantes.mockResolvedValue([{ id: 'rep-jose', nome: 'José Vendas', ativo: true }]);
  listarClientes.mockResolvedValue({ dados: [] });
  converterLead.mockResolvedValue({ dados: CLIENTE });
});

describe('ConversaoLead', () => {
  it('procura o cliente do lead e mostra o link quando já foi convertido', async () => {
    listarClientes.mockResolvedValue({ dados: [CLIENTE] });

    renderizar();

    const link = await screen.findByRole('link', { name: /Construtora Alfa LTDA/ });
    expect(link).toHaveAttribute('href', '/clientes/cli-alfa');
    expect(screen.queryByRole('button', { name: /Converter em cliente/ })).toBeNull();
    expect(listarClientes).toHaveBeenCalledWith(
      expect.objectContaining({ lead: 'lead-1', tamanho: 1, sinal: expect.anything() })
    );
  });

  it('abre o cadastro do cliente preenchido com nome, e-mail e telefone do lead', async () => {
    renderizar();

    fireEvent.click(await screen.findByRole('button', { name: /Converter em cliente/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Converter lead em cliente' });

    expect(within(dialogo).getByLabelText('Nome ou razão social *')).toHaveValue('Construtora Alfa');
    expect(within(dialogo).getByLabelText('E-mail para NF')).toHaveValue('compras@alfa.com.br');
    expect(within(dialogo).getByLabelText('Telefone')).toHaveValue('83 98888-7777');
    expect(within(dialogo).getByLabelText('CPF ou CNPJ *')).not.toBeDisabled();
  });

  it('converte o lead e passa a mostrar o cliente criado', async () => {
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: /Converter em cliente/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Converter lead em cliente' });
    await within(dialogo).findByRole('option', { name: 'José Vendas' });

    fireEvent.change(within(dialogo).getByLabelText('CPF ou CNPJ *'), { target: { value: '11.222.333/0001-81' } });
    fireEvent.change(within(dialogo).getByLabelText('UF *'), { target: { value: 'PB' } });
    fireEvent.change(within(dialogo).getByLabelText('Cidade *'), { target: { value: 'João Pessoa' } });
    listarClientes.mockResolvedValue({ dados: [CLIENTE] });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(converterLead).toHaveBeenCalledWith(
        'lead-1',
        expect.objectContaining({
          documento: '11222333000181',
          nome: 'Construtora Alfa',
          email_nf: 'compras@alfa.com.br',
          telefone: '83 98888-7777',
          uf: 'PB',
          cidade: 'João Pessoa',
        })
      )
    );
    expect(await screen.findByRole('link', { name: /Construtora Alfa LTDA/ })).toHaveAttribute('href', '/clientes/cli-alfa');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('mostra o lead já convertido como erro do formulário', async () => {
    converterLead.mockRejectedValue(new ErroApi(409, 'lead já convertido em cliente'));
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: /Converter em cliente/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Converter lead em cliente' });
    fireEvent.change(within(dialogo).getByLabelText('CPF ou CNPJ *'), { target: { value: '11222333000181' } });
    fireEvent.change(within(dialogo).getByLabelText('UF *'), { target: { value: 'PB' } });
    fireEvent.change(within(dialogo).getByLabelText('Cidade *'), { target: { value: 'João Pessoa' } });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText('lead já convertido em cliente')).toBeInTheDocument();
  });

  it('mostra a falha da consulta com nova tentativa', async () => {
    listarClientes.mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValue({ dados: [] });
    renderizar();

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('button', { name: /Converter em cliente/ })).toBeInTheDocument();
  });
});
