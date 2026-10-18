import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as gruposService from '../../services/clienteGrupos';
import * as clientesService from '../../services/clientes';
import * as empresasService from '../../services/empresas';
import * as representantesService from '../../services/representantes';
import Clientes from './Clientes';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/clienteGrupos', () => ({ listarTodosGrupos: vi.fn() }));
vi.mock('../../services/representantes', () => ({ listarTodosRepresentantes: vi.fn() }));
vi.mock('../../services/clientes', () => ({
  listarClientes: vi.fn(),
  criarCliente: vi.fn(),
  atualizarCliente: vi.fn(),
  ativarCliente: vi.fn(),
  desativarCliente: vi.fn(),
  removerCliente: vi.fn(),
  importarClientes: vi.fn(),
}));

const { listarClientes, criarCliente, atualizarCliente, ativarCliente, desativarCliente, removerCliente } =
  clientesService;
const { listarTodosGrupos } = gruposService;
const { listarTodosRepresentantes } = representantesService;
const { listarTodasEmpresas } = empresasService;

const GRUPOS = [
  { id: 'gru-aguia', nome: 'Grupo Águia', ativo: true },
  { id: 'gru-velho', nome: 'Grupo Antigo', ativo: false },
];

const REPRESENTANTES = [
  { id: 'rep-jose', nome: 'José Vendas', ativo: true },
  { id: 'rep-maria', nome: 'Maria Representações', ativo: false },
];

const EMPRESAS = [{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }];

const AGUIA = {
  id: 'cli-aguia',
  documento: '11222333000181',
  documento_formatado: '11.222.333/0001-81',
  tipo_pessoa: 'pj',
  nome: 'Construtora Águia LTDA',
  nome_fantasia: 'Águia',
  tipo: 'construtora',
  grupo_id: 'gru-velho',
  uf: 'PB',
  cidade: 'João Pessoa',
  empresa_relacionamento_id: 'emp-mia',
  representante_id: 'rep-jose',
  email_nf: 'nf@aguia.com.br',
  telefone: null,
  observacoes: '',
  exige_numero_pedido_na_nf: true,
  proibe_antecipacao: false,
  lead_id: null,
  ativo: true,
};

const JOAO = {
  ...AGUIA,
  id: 'cli-joao',
  documento: '52998224725',
  documento_formatado: '529.982.247-25',
  tipo_pessoa: 'pf',
  nome: 'João da Silva',
  nome_fantasia: null,
  tipo: 'pf',
  grupo_id: null,
  representante_id: null,
  empresa_relacionamento_id: null,
  cidade: 'Recife',
  uf: 'PE',
  exige_numero_pedido_na_nf: false,
  ativo: false,
};

function perfil({ comercial = true, administrador = false } = {}) {
  useAutenticacao.mockReturnValue({ comercial, administrador });
}

function renderizar() {
  return render(
    <MemoryRouter>
      <Clientes />
    </MemoryRouter>
  );
}

function linhaDe(texto) {
  return screen.getByText(texto).closest('tr');
}

async function carregar() {
  renderizar();
  await screen.findByText('Construtora Águia LTDA');
}

function preencher(dialogo, campos) {
  Object.entries(campos).forEach(([rotulo, valor]) => {
    fireEvent.change(within(dialogo).getByLabelText(rotulo), { target: { value: valor } });
  });
}

function salvar(dialogo) {
  fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
}

async function abrirNovo() {
  await carregar();
  fireEvent.click(screen.getByRole('button', { name: /Novo Cliente/ }));
  const dialogo = screen.getByRole('dialog');
  await within(dialogo).findByRole('option', { name: 'José Vendas' });
  return dialogo;
}

beforeEach(() => {
  vi.clearAllMocks();
  perfil();
  listarTodasEmpresas.mockResolvedValue(EMPRESAS);
  listarTodosGrupos.mockResolvedValue(GRUPOS);
  listarTodosRepresentantes.mockResolvedValue(REPRESENTANTES);
  listarClientes.mockResolvedValue({ dados: [AGUIA, JOAO] });
  criarCliente.mockResolvedValue({ dados: AGUIA });
  atualizarCliente.mockResolvedValue({ dados: AGUIA });
  ativarCliente.mockResolvedValue({ dados: JOAO });
  desativarCliente.mockResolvedValue({ dados: AGUIA });
  removerCliente.mockResolvedValue(null);
});

describe('Clientes', () => {
  it('lista com documento, tipo, cidade, grupo, representante, situação e link para o detalhe', async () => {
    await carregar();

    const aguia = linhaDe('Construtora Águia LTDA');
    expect(within(aguia).getByText('Águia')).toBeInTheDocument();
    expect(within(aguia).getByText('11.222.333/0001-81')).toBeInTheDocument();
    expect(within(aguia).getByText('Construtora')).toBeInTheDocument();
    expect(within(aguia).getByText('João Pessoa/PB')).toBeInTheDocument();
    expect(await within(aguia).findByText('Grupo Antigo')).toBeInTheDocument();
    expect(await within(aguia).findByText('José Vendas')).toBeInTheDocument();
    expect(within(aguia).getByRole('link', { name: 'Construtora Águia LTDA' })).toHaveAttribute('href', '/clientes/cli-aguia');
    const joao = linhaDe('João da Silva');
    expect(within(joao).getByText('Pessoa física')).toBeInTheDocument();
    expect(within(joao).getByText('Inativo')).toBeInTheDocument();
  });

  it('mostra o vazio conforme o filtro e o erro com nova tentativa', async () => {
    listarClientes.mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValue({ dados: [] });

    renderizar();

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhum cliente cadastrado.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'loja' } });
    expect(await screen.findByText('Nenhum cliente encontrado com estes filtros.')).toBeInTheDocument();
  });

  it('busca e filtra por tipo, UF, grupo, representante e situação', async () => {
    await carregar();
    await screen.findByRole('option', { name: 'Grupo Águia' });

    fireEvent.change(screen.getByLabelText('Buscar cliente'), { target: { value: ' aguia ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'construtora' } });
    fireEvent.change(screen.getByLabelText('UF'), { target: { value: 'PB' } });
    fireEvent.change(screen.getByLabelText('Grupo'), { target: { value: 'gru-aguia' } });
    fireEvent.change(screen.getByLabelText('Representante'), { target: { value: 'rep-jose' } });
    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'true' } });

    await waitFor(() =>
      expect(listarClientes).toHaveBeenLastCalledWith(
        expect.objectContaining({
          busca: 'aguia',
          tipo: 'construtora',
          uf: 'PB',
          grupo: 'gru-aguia',
          representante: 'rep-jose',
          ativo: 'true',
          pagina: 1,
        })
      )
    );
  });

  it('quem não é comercial só lê, sem filtro nem nome de representante', async () => {
    perfil({ comercial: false });

    await carregar();

    expect(listarTodosRepresentantes).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Representante')).toBeNull();
    expect(within(linhaDe('Construtora Águia LTDA')).getByText('Com representante')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo Cliente/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar cliente' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Desativar cliente' })).toBeNull();
  });

  it('deixa a exclusão só para o administrador', async () => {
    await carregar();
    expect(screen.queryByRole('button', { name: 'Excluir cliente' })).toBeNull();
  });

  it('valida documento, nome, cidade, UF, e-mail e a combinação de tipo com CPF', async () => {
    const dialogo = await abrirNovo();
    preencher(dialogo, { 'CPF ou CNPJ *': '529.982.247-25', 'Tipo *': 'construtora', 'E-mail para NF': 'sem-arroba' });

    salvar(dialogo);

    expect(await within(dialogo).findByText('CPF só com o tipo pessoa física, e pessoa física só com CPF.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe o nome ou a razão social.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe a cidade.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Selecione a UF.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(criarCliente).not.toHaveBeenCalled();
  });

  it('exige o documento na criação', async () => {
    const dialogo = await abrirNovo();

    salvar(dialogo);

    expect(await within(dialogo).findByText('Informe o CPF ou CNPJ.')).toBeInTheDocument();
  });

  it('cria com documento sem máscara, vínculos, regras comerciais e opcionais vazios nulos', async () => {
    const dialogo = await abrirNovo();
    await within(dialogo).findByRole('option', { name: 'MIA' });
    expect(within(dialogo).queryByRole('option', { name: /Grupo Antigo/ })).toBeNull();
    expect(within(dialogo).queryByRole('option', { name: /Maria Representações/ })).toBeNull();
    preencher(dialogo, {
      'CPF ou CNPJ *': '11.222.333/0001-81',
      'Nome ou razão social *': '  Construtora Águia LTDA ',
      'Tipo *': 'construtora',
      'UF *': 'PB',
      'Cidade *': 'João Pessoa',
      Grupo: 'gru-aguia',
      'Representante do cliente': 'rep-jose',
      'Empresa de relacionamento': 'emp-mia',
    });
    fireEvent.click(within(dialogo).getByLabelText('Exige número do pedido na NF'));

    salvar(dialogo);

    await waitFor(() =>
      expect(criarCliente).toHaveBeenCalledWith({
        documento: '11222333000181',
        nome: 'Construtora Águia LTDA',
        nome_fantasia: null,
        tipo: 'construtora',
        grupo_id: 'gru-aguia',
        uf: 'PB',
        cidade: 'João Pessoa',
        empresa_relacionamento_id: 'emp-mia',
        representante_id: 'rep-jose',
        email_nf: null,
        telefone: null,
        observacoes: '',
        exige_numero_pedido_na_nf: true,
        proibe_antecipacao: false,
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('mostra o documento repetido como erro do formulário sem perder o que foi digitado', async () => {
    criarCliente.mockRejectedValue(new ErroApi(409, 'já existe um cliente com este documento'));
    const dialogo = await abrirNovo();
    preencher(dialogo, {
      'CPF ou CNPJ *': '11222333000181',
      'Nome ou razão social *': 'Águia',
      'UF *': 'PB',
      'Cidade *': 'João Pessoa',
    });

    salvar(dialogo);

    expect(await within(dialogo).findByText('já existe um cliente com este documento')).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Nome ou razão social *')).toHaveValue('Águia');
  });

  it('edita com o documento travado, mantendo o grupo inativo já gravado', async () => {
    await carregar();
    fireEvent.click(within(linhaDe('Construtora Águia LTDA')).getByRole('button', { name: 'Editar cliente' }));
    const dialogo = screen.getByRole('dialog');
    await within(dialogo).findByRole('option', { name: 'Grupo Antigo (inativo)' });

    expect(within(dialogo).getByLabelText('CPF ou CNPJ *')).toBeDisabled();
    expect(within(dialogo).getByLabelText('Grupo')).toHaveValue('gru-velho');
    expect(within(dialogo).getByLabelText('Exige número do pedido na NF')).toBeChecked();
    preencher(dialogo, { Telefone: '83 99999-0000' });
    salvar(dialogo);

    await waitFor(() =>
      expect(atualizarCliente).toHaveBeenCalledWith(
        'cli-aguia',
        expect.objectContaining({
          documento: '11222333000181',
          grupo_id: 'gru-velho',
          representante_id: 'rep-jose',
          empresa_relacionamento_id: 'emp-mia',
          telefone: '83 99999-0000',
          nome_fantasia: 'Águia',
          email_nf: 'nf@aguia.com.br',
          exige_numero_pedido_na_nf: true,
        })
      )
    );
  });

  it('desativa o ativo, ativa o inativo e mostra o erro com Fechar', async () => {
    desativarCliente.mockRejectedValueOnce(new ErroApi(403, 'cliente de outro representante'));
    await carregar();

    fireEvent.click(within(linhaDe('Construtora Águia LTDA')).getByRole('button', { name: 'Desativar cliente' }));
    expect(await screen.findByText('cliente de outro representante')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    fireEvent.click(within(linhaDe('João da Silva')).getByRole('button', { name: 'Ativar cliente' }));
    await waitFor(() => expect(ativarCliente).toHaveBeenCalledWith('cli-joao'));
    expect(desativarCliente).toHaveBeenCalledWith('cli-aguia');
  });

  it('exclui depois de confirmar e mostra o erro de cliente em uso', async () => {
    perfil({ comercial: true, administrador: true });
    removerCliente.mockRejectedValueOnce(
      new ErroApi(400, 'erro de validação: registro em uso por outros dados e não pode ser excluído')
    );
    await carregar();

    fireEvent.click(within(linhaDe('Construtora Águia LTDA')).getByRole('button', { name: 'Excluir cliente' }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));

    expect(await within(dialogo).findByText(/registro em uso por outros dados/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(removerCliente).toHaveBeenCalledWith('cli-aguia');
  });

  it('esconde a importação por CSV de quem não é administrador', async () => {
    await carregar();
    expect(screen.queryByRole('button', { name: /Importar CSV/ })).toBeNull();
  });

  it('abre a importação para o administrador e recarrega a lista depois de importar', async () => {
    perfil({ comercial: true, administrador: true });
    clientesService.importarClientes.mockResolvedValue({ dados: { simulacao: false, total: 1, importadas: 1, rejeitadas: [] } });
    await carregar();

    fireEvent.click(screen.getByRole('button', { name: /Importar CSV/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Importar clientes' });
    fireEvent.change(within(dialogo).getByLabelText('Arquivo CSV *'), {
      target: { files: [new File(['documento;nome'], 'clientes.csv', { type: 'text/csv' })] },
    });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Importar' }));

    expect(await within(dialogo).findByText('1 de 1 linhas importadas.')).toBeInTheDocument();
    await waitFor(() => expect(listarClientes).toHaveBeenCalledTimes(2));
  });
});
