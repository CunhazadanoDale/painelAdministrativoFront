import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as gruposService from '../../services/clienteGrupos';
import * as clientesService from '../../services/clientes';
import * as empresasService from '../../services/empresas';
import * as representantesService from '../../services/representantes';
import ClienteDetalhe from './ClienteDetalhe';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/clienteGrupos', () => ({ listarTodosGrupos: vi.fn() }));
vi.mock('../../services/representantes', () => ({ listarTodosRepresentantes: vi.fn() }));
vi.mock('../../services/clientes', () => ({
  obterCliente: vi.fn(),
  atualizarCliente: vi.fn(),
  ativarCliente: vi.fn(),
  desativarCliente: vi.fn(),
  listarObras: vi.fn(),
  criarObra: vi.fn(),
  atualizarObra: vi.fn(),
  ativarObra: vi.fn(),
  desativarObra: vi.fn(),
}));

const { obterCliente, atualizarCliente, desativarCliente, listarObras, criarObra, atualizarObra, ativarObra, desativarObra } =
  clientesService;

const AGUIA = {
  id: 'cli-aguia',
  documento: '11222333000181',
  documento_formatado: '11.222.333/0001-81',
  nome: 'Construtora Águia LTDA',
  nome_fantasia: 'Águia',
  tipo: 'construtora',
  grupo_id: 'gru-aguia',
  uf: 'PB',
  cidade: 'João Pessoa',
  empresa_relacionamento_id: 'emp-mia',
  representante_id: 'rep-jose',
  email_nf: 'nf@aguia.com.br',
  telefone: null,
  observacoes: 'Entregar só pela manhã',
  exige_numero_pedido_na_nf: true,
  proibe_antecipacao: false,
  lead_id: 'lead-1',
  ativo: true,
};

const MAR_AZUL = {
  id: 'obra-mar',
  cliente_id: 'cli-aguia',
  nome: 'Residencial Mar Azul',
  cnpj: '33400004000116',
  cnpj_formatado: '33.400.004/0001-16',
  logradouro: 'Av. Beira Mar',
  numero: '100',
  complemento: null,
  bairro: 'Intermares',
  cidade: 'Cabedelo',
  uf: 'PB',
  cep: '58310000',
  ativo: true,
};

const ANTIGA = { ...MAR_AZUL, id: 'obra-antiga', nome: 'Obra Antiga', cnpj: null, cnpj_formatado: null, cep: null, ativo: false };

function perfil({ comercial = true } = {}) {
  useAutenticacao.mockReturnValue({ comercial, administrador: false });
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/clientes/cli-aguia']}>
      <Routes>
        <Route path="/clientes/:id" element={<ClienteDetalhe />} />
      </Routes>
    </MemoryRouter>
  );
}

function linhaDe(texto) {
  return screen.getByText(texto).closest('tr');
}

async function carregar() {
  renderizar();
  await screen.findByText('Residencial Mar Azul');
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
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  gruposService.listarTodosGrupos.mockResolvedValue([{ id: 'gru-aguia', nome: 'Grupo Águia', ativo: true }]);
  representantesService.listarTodosRepresentantes.mockResolvedValue([{ id: 'rep-jose', nome: 'José Vendas', ativo: true }]);
  obterCliente.mockResolvedValue({ dados: AGUIA });
  atualizarCliente.mockResolvedValue({ dados: AGUIA });
  desativarCliente.mockResolvedValue({ dados: AGUIA });
  listarObras.mockResolvedValue({ dados: [MAR_AZUL, ANTIGA] });
  criarObra.mockResolvedValue({ dados: MAR_AZUL });
  atualizarObra.mockResolvedValue({ dados: MAR_AZUL });
  ativarObra.mockResolvedValue({ dados: ANTIGA });
  desativarObra.mockResolvedValue({ dados: MAR_AZUL });
});

describe('ClienteDetalhe', () => {
  it('mostra os dados, os vínculos, as regras comerciais e a origem no lead', async () => {
    await carregar();

    expect(screen.getByText('Construtora Águia LTDA', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('11.222.333/0001-81')).toBeInTheDocument();
    expect(screen.getByText('João Pessoa/PB')).toBeInTheDocument();
    expect(await screen.findByText('Grupo Águia')).toBeInTheDocument();
    expect(await screen.findByText('José Vendas')).toBeInTheDocument();
    expect(await screen.findByText('MIA')).toBeInTheDocument();
    expect(screen.getByText('Exige número do pedido na NF')).toBeInTheDocument();
    expect(screen.queryByText('Proíbe antecipação dos títulos')).toBeNull();
    expect(screen.getByText('Entregar só pela manhã')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver o lead de origem' })).toHaveAttribute('href', '/leads/lead-1');
  });

  it('mostra o erro de acesso e tenta de novo', async () => {
    obterCliente.mockRejectedValueOnce(new ErroApi(403, 'cliente de outro representante'));

    renderizar();

    expect(await screen.findByText('cliente de outro representante')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Residencial Mar Azul')).toBeInTheDocument();
  });

  it('edita o cliente pelo mesmo formulário da lista', async () => {
    await carregar();

    fireEvent.click(screen.getByRole('button', { name: 'Editar cliente' }));
    const dialogo = screen.getByRole('dialog');
    await within(dialogo).findByRole('option', { name: 'José Vendas' });
    preencher(dialogo, { Telefone: '83 3333-0000' });
    salvar(dialogo);

    await waitFor(() =>
      expect(atualizarCliente).toHaveBeenCalledWith('cli-aguia', expect.objectContaining({ telefone: '83 3333-0000' }))
    );
  });

  it('desativa o cliente pelo detalhe', async () => {
    await carregar();

    fireEvent.click(screen.getByRole('button', { name: 'Desativar cliente' }));

    await waitFor(() => expect(desativarCliente).toHaveBeenCalledWith('cli-aguia'));
  });

  it('lista as obras com CNPJ, endereço, CEP e situação, e filtra só as ativas', async () => {
    await carregar();

    const mar = linhaDe('Residencial Mar Azul');
    expect(within(mar).getByText('33.400.004/0001-16')).toBeInTheDocument();
    expect(within(mar).getByText('Av. Beira Mar, 100 — Intermares')).toBeInTheDocument();
    expect(within(mar).getByText('Cabedelo/PB')).toBeInTheDocument();
    expect(within(mar).getByText('58310-000')).toBeInTheDocument();
    expect(within(linhaDe('Obra Antiga')).getByText('Inativa')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Só obras ativas'));

    await waitFor(() =>
      expect(listarObras).toHaveBeenLastCalledWith('cli-aguia', expect.objectContaining({ ativas: 'true' }))
    );
  });

  it('valida e cria a obra com CNPJ e CEP sem máscara e opcionais vazios nulos', async () => {
    await carregar();
    fireEvent.click(screen.getByRole('button', { name: /Nova obra/ }));
    const dialogo = screen.getByRole('dialog');
    preencher(dialogo, { CNPJ: '123', CEP: '5831' });

    salvar(dialogo);

    expect(await within(dialogo).findByText('Informe o nome da obra.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe o logradouro.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe a cidade.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Selecione a UF.')).toBeInTheDocument();
    expect(within(dialogo).getByText('O CNPJ tem 14 caracteres.')).toBeInTheDocument();
    expect(within(dialogo).getByText('O CEP tem 8 dígitos.')).toBeInTheDocument();
    expect(criarObra).not.toHaveBeenCalled();

    preencher(dialogo, {
      'Nome da obra *': ' Residencial Sol ',
      CNPJ: '33.400.004/0001-16',
      'Logradouro *': 'Rua das Flores',
      'Cidade *': 'Cabedelo',
      'UF *': 'PB',
      CEP: '58310-000',
    });
    salvar(dialogo);

    await waitFor(() =>
      expect(criarObra).toHaveBeenCalledWith('cli-aguia', {
        nome: 'Residencial Sol',
        cnpj: '33400004000116',
        logradouro: 'Rua das Flores',
        numero: null,
        complemento: null,
        bairro: null,
        cidade: 'Cabedelo',
        uf: 'PB',
        cep: '58310000',
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('edita a obra com os dados atuais e mostra o nome repetido como erro do formulário', async () => {
    atualizarObra.mockRejectedValueOnce(new ErroApi(409, 'já existe uma obra com este nome no cliente'));
    await carregar();
    fireEvent.click(within(linhaDe('Residencial Mar Azul')).getByRole('button', { name: 'Editar obra' }));
    const dialogo = screen.getByRole('dialog');

    expect(within(dialogo).getByLabelText('CNPJ')).toHaveValue('33.400.004/0001-16');
    expect(within(dialogo).getByLabelText('CEP')).toHaveValue('58310-000');
    preencher(dialogo, { 'Nome da obra *': 'Obra Antiga' });
    salvar(dialogo);

    expect(await within(dialogo).findByText('já existe uma obra com este nome no cliente')).toBeInTheDocument();
    salvar(dialogo);
    await waitFor(() =>
      expect(atualizarObra).toHaveBeenLastCalledWith('obra-mar', expect.objectContaining({ nome: 'Obra Antiga', numero: '100' }))
    );
  });

  it('desativa a obra ativa e ativa a inativa', async () => {
    await carregar();

    fireEvent.click(within(linhaDe('Residencial Mar Azul')).getByRole('button', { name: 'Desativar obra' }));
    await waitFor(() => expect(desativarObra).toHaveBeenCalledWith('obra-mar'));
    await screen.findByText('Obra Antiga');
    fireEvent.click(within(linhaDe('Obra Antiga')).getByRole('button', { name: 'Ativar obra' }));

    await waitFor(() => expect(ativarObra).toHaveBeenCalledWith('obra-antiga'));
  });

  it('não oferece obra nova para cliente inativo', async () => {
    obterCliente.mockResolvedValue({ dados: { ...AGUIA, ativo: false } });
    await carregar();

    expect(screen.getByRole('button', { name: /Nova obra/ })).toBeDisabled();
    expect(screen.getByText('Cliente inativo não recebe obra nova.')).toBeInTheDocument();
  });

  it('quem não é comercial só lê', async () => {
    perfil({ comercial: false });

    await carregar();

    expect(screen.queryByRole('button', { name: 'Editar cliente' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Nova obra/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar obra' })).toBeNull();
    expect(representantesService.listarTodosRepresentantes).not.toHaveBeenCalled();
  });
});
