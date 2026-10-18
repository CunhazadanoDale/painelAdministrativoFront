import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as gruposService from '../../services/clienteGrupos';
import * as clientesService from '../../services/clientes';
import * as empresasService from '../../services/empresas';
import * as pedidosService from '../../services/pedidos';
import * as produtosService from '../../services/produtos';
import * as representantesService from '../../services/representantes';
import Pedidos from './Pedidos';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/clienteGrupos', () => ({ listarTodosGrupos: vi.fn() }));
vi.mock('../../services/representantes', () => ({ listarTodosRepresentantes: vi.fn() }));
vi.mock('../../services/clientes', () => ({ listarClientes: vi.fn(), obterCliente: vi.fn(), listarObras: vi.fn() }));
vi.mock('../../services/produtos', () => ({ listarProdutos: vi.fn(), obterProduto: vi.fn() }));
vi.mock('../../services/pedidos', () => ({ listarPedidos: vi.fn(), criarPedido: vi.fn() }));

const { listarPedidos, criarPedido } = pedidosService;
const { listarClientes, obterCliente, listarObras } = clientesService;
const { listarProdutos } = produtosService;

const EMPRESAS = [
  { id: 'emp-mia', nome_fantasia: 'MIA', ativa: true },
  { id: 'emp-gig', nome_fantasia: 'Gigante', ativa: true },
];

const AGUIA = { id: 'cli-aguia', nome: 'Construtora Águia', representante_id: 'rep-jose' };
const JOAO = { id: 'cli-joao', nome: 'João da Silva', representante_id: null };

const CIMENTO = { id: 'prod-cimento', nome: 'Cimento CP II 50', codigo: 'SKU-1', preco_centavos: 3590 };
const AREIA = { id: 'prod-areia', nome: 'Areia média', codigo: 'SKU-2', preco_centavos: null };

const PEDIDO_12 = {
  id: 'ped-12',
  empresa_id: 'emp-mia',
  numero: 12,
  cliente_id: 'cli-aguia',
  modelo: 'pronta_entrega',
  status: 'confirmado',
  valor_total_centavos: 359000,
  prazo_limite: '2026-12-20T00:00:00Z',
};

const PEDIDO_7 = {
  ...PEDIDO_12,
  id: 'ped-7',
  empresa_id: 'emp-gig',
  numero: 7,
  cliente_id: 'cli-joao',
  modelo: 'importacao',
  status: 'proposta',
  valor_total_centavos: 100000,
  prazo_limite: null,
};

function perfil({ comercial = true } = {}) {
  useAutenticacao.mockReturnValue({ comercial, administrador: false, financeiro: false });
}

function renderizar() {
  return render(
    <MemoryRouter>
      <Pedidos />
    </MemoryRouter>
  );
}

async function abrirNova() {
  renderizar();
  await screen.findByRole('link', { name: '12' });
  fireEvent.click(screen.getByRole('button', { name: /Nova Proposta/ }));
  const dialogo = screen.getByRole('dialog', { name: 'Nova Proposta' });
  await within(dialogo).findByRole('option', { name: 'Gigante' });
  await within(dialogo).findByRole('option', { name: 'Construtora Águia' });
  return dialogo;
}

beforeEach(() => {
  vi.clearAllMocks();
  perfil();
  empresasService.listarTodasEmpresas.mockResolvedValue(EMPRESAS);
  gruposService.listarTodosGrupos.mockResolvedValue([]);
  representantesService.listarTodosRepresentantes.mockResolvedValue([
    { id: 'rep-jose', nome: 'José Vendas', ativo: true },
    { id: 'rep-ana', nome: 'Ana Souza', ativo: true },
  ]);
  listarPedidos.mockResolvedValue({ dados: [PEDIDO_12, PEDIDO_7] });
  obterCliente.mockImplementation(async (id) => ({ dados: [AGUIA, JOAO].find((cliente) => cliente.id === id) }));
  listarClientes.mockImplementation(async ({ busca }) => ({
    dados: [AGUIA, JOAO].filter((cliente) => !busca || cliente.nome.toLowerCase().includes(busca.toLowerCase())),
  }));
  listarObras.mockResolvedValue({ dados: [{ id: 'obra-mar', nome: 'Residencial Mar Azul', ativo: true }] });
  listarProdutos.mockResolvedValue({ dados: [CIMENTO, AREIA] });
  criarPedido.mockResolvedValue({ dados: { ...PEDIDO_12, id: 'ped-13', numero: 13 } });
});

describe('Pedidos', () => {
  it('lista com número, empresa, cliente, modelo, status, valor e prazo', async () => {
    renderizar();

    const doze = (await screen.findByRole('link', { name: '12' })).closest('tr');
    expect(within(doze).getByRole('link', { name: '12' })).toHaveAttribute('href', '/pedidos/ped-12');
    expect(await within(doze).findByText('MIA')).toBeInTheDocument();
    expect(await within(doze).findByText('Construtora Águia')).toBeInTheDocument();
    expect(within(doze).getByText('Pronta entrega')).toBeInTheDocument();
    expect(within(doze).getByText('Confirmado')).toBeInTheDocument();
    expect(within(doze).getByText('R$ 3.590,00')).toBeInTheDocument();
    expect(within(doze).getByText('20/12/2026')).toBeInTheDocument();
    const sete = screen.getByRole('link', { name: '7' }).closest('tr');
    expect(within(sete).getByText('Proposta')).toBeInTheDocument();
    expect(within(sete).getByText('Importação')).toBeInTheDocument();
    expect(await within(sete).findByText('João da Silva')).toBeInTheDocument();
    expect(obterCliente).toHaveBeenCalledTimes(2);
  });

  it('mostra o vazio conforme o filtro e o erro com nova tentativa', async () => {
    listarPedidos.mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValue({ dados: [] });

    renderizar();

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhum pedido nas empresas do seu acesso.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'cancelado' } });
    expect(await screen.findByText('Nenhum pedido encontrado com estes filtros.')).toBeInTheDocument();
  });

  it('filtra por empresa, status, modelo e número', async () => {
    renderizar();
    await screen.findByRole('link', { name: '12' });
    await screen.findByRole('option', { name: 'Gigante' });

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-gig' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'proposta' } });
    fireEvent.change(screen.getByLabelText('Modelo'), { target: { value: 'importacao' } });
    fireEvent.change(screen.getByLabelText('Buscar pelo número'), { target: { value: ' 7 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() =>
      expect(listarPedidos).toHaveBeenLastCalledWith(
        expect.objectContaining({ empresa: 'emp-gig', status: 'proposta', modelo: 'importacao', numero: '7', pagina: 1 })
      )
    );
  });

  it('esconde a nova proposta de quem não é comercial', async () => {
    perfil({ comercial: false });

    renderizar();
    await screen.findByRole('link', { name: '12' });

    expect(screen.queryByRole('button', { name: /Nova Proposta/ })).toBeNull();
  });

  it('valida empresa, cliente, itens, quantidade e preço antes de enviar', async () => {
    const dialogo = await abrirNova();
    fireEvent.change(within(dialogo).getByLabelText('Quantidade do item 1'), { target: { value: '0' } });
    fireEvent.change(within(dialogo).getByLabelText('Preço do item 1'), { target: { value: 'abc' } });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText('Selecione a empresa.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Selecione o cliente.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Item 1: escolha o produto.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Item 1: quantidade inteira maior que zero.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Item 1: preço inválido.')).toBeInTheDocument();
    expect(criarPedido).not.toHaveBeenCalled();
  });

  it('cria a proposta com o preço sugerido do produto, o representante do cliente e o total', async () => {
    const dialogo = await abrirNova();
    fireEvent.change(within(dialogo).getByLabelText('Empresa *'), { target: { value: 'emp-mia' } });
    fireEvent.change(within(dialogo).getByLabelText('Cliente *'), { target: { value: 'cli-aguia' } });
    expect(within(dialogo).getByLabelText('Representante do pedido')).toHaveValue('rep-jose');
    await within(dialogo).findByRole('option', { name: 'Residencial Mar Azul' });
    fireEvent.change(within(dialogo).getByLabelText('Obra'), { target: { value: 'obra-mar' } });
    fireEvent.change(within(dialogo).getByLabelText('Prazo limite'), { target: { value: '2026-12-20' } });
    fireEvent.change(within(dialogo).getByLabelText('Nº do pedido do cliente'), { target: { value: ' OC-778 ' } });

    await within(dialogo).findByRole('option', { name: 'Cimento CP II 50 (SKU-1)' });
    fireEvent.change(within(dialogo).getByLabelText('Produto do item 1'), { target: { value: 'prod-cimento' } });
    expect(within(dialogo).getByLabelText('Preço do item 1')).toHaveValue('35,90');
    fireEvent.change(within(dialogo).getByLabelText('Quantidade do item 1'), { target: { value: '10' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /Adicionar item/ }));
    await within(dialogo).findByLabelText('Produto do item 2');
    await waitFor(() =>
      expect(within(within(dialogo).getByLabelText('Produto do item 2')).getAllByRole('option').length).toBeGreaterThan(1)
    );
    fireEvent.change(within(dialogo).getByLabelText('Produto do item 2'), { target: { value: 'prod-areia' } });
    fireEvent.change(within(dialogo).getByLabelText('Quantidade do item 2'), { target: { value: '2' } });
    fireEvent.change(within(dialogo).getByLabelText('Preço do item 2'), { target: { value: '150,00' } });
    expect(within(dialogo).getByText('R$ 659,00')).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(criarPedido).toHaveBeenCalledWith({
        empresa_id: 'emp-mia',
        cliente_id: 'cli-aguia',
        obra_id: 'obra-mar',
        representante_id: 'rep-jose',
        modelo: 'pronta_entrega',
        prazo_limite: '2026-12-20',
        numero_pedido_cliente: 'OC-778',
        observacoes: '',
        itens: [
          { produto_id: 'prod-cimento', quantidade: 10, preco_unitario_centavos: 3590 },
          { produto_id: 'prod-areia', quantidade: 2, preco_unitario_centavos: 15000 },
        ],
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('na importação esconde o prazo, que é calculado, e recusa produto repetido', async () => {
    const dialogo = await abrirNova();
    fireEvent.change(within(dialogo).getByLabelText('Modelo *'), { target: { value: 'importacao' } });

    expect(within(dialogo).queryByLabelText('Prazo limite')).toBeNull();
    expect(within(dialogo).getByText(/Entrada de 30%/)).toBeInTheDocument();
    await within(dialogo).findByRole('option', { name: 'Cimento CP II 50 (SKU-1)' });
    fireEvent.change(within(dialogo).getByLabelText('Produto do item 1'), { target: { value: 'prod-cimento' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /Adicionar item/ }));
    await waitFor(() =>
      expect(within(within(dialogo).getByLabelText('Produto do item 2')).getAllByRole('option').length).toBeGreaterThan(1)
    );
    fireEvent.change(within(dialogo).getByLabelText('Produto do item 2'), { target: { value: 'prod-cimento' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText('Item 2: produto repetido no pedido.')).toBeInTheDocument();
  });

  it('remove um item e mostra o erro da API sem perder o formulário', async () => {
    criarPedido.mockRejectedValue(new ErroApi(400, 'erro de validação: cliente inativo não recebe pedido novo'));
    const dialogo = await abrirNova();
    fireEvent.click(within(dialogo).getByRole('button', { name: /Adicionar item/ }));
    await within(dialogo).findByLabelText('Produto do item 2');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Remover o item 2' }));
    expect(within(dialogo).queryByLabelText('Produto do item 2')).toBeNull();

    fireEvent.change(within(dialogo).getByLabelText('Empresa *'), { target: { value: 'emp-mia' } });
    fireEvent.change(within(dialogo).getByLabelText('Cliente *'), { target: { value: 'cli-joao' } });
    await within(dialogo).findByRole('option', { name: 'Cimento CP II 50 (SKU-1)' });
    fireEvent.change(within(dialogo).getByLabelText('Produto do item 1'), { target: { value: 'prod-cimento' } });
    fireEvent.change(within(dialogo).getByLabelText('Quantidade do item 1'), { target: { value: '1' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText(/cliente inativo não recebe pedido novo/)).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Cliente *')).toHaveValue('cli-joao');
  });
});
