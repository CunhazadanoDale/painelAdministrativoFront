import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import * as clientesService from '../../services/clientes';
import * as empresasService from '../../services/empresas';
import * as notasService from '../../services/notasFiscais';
import * as produtosService from '../../services/produtos';
import EntregasSemNota from './EntregasSemNota';
import ItensSemProduto from './ItensSemProduto';
import { useEntregasSemNota } from './useEntregasSemNota';
import { TAMANHO_PAGINA, useItensSemProduto } from './useItensSemProduto';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/clientes', () => ({ listarClientes: vi.fn(), obterCliente: vi.fn() }));
vi.mock('../../services/produtos', () => ({ listarProdutos: vi.fn() }));
vi.mock('../../services/notasFiscais', () => ({
  listarItensSemProduto: vi.fn(),
  listarEntregasSemNota: vi.fn(),
  obterNota: vi.fn(),
  ligarItemAoProduto: vi.fn(),
}));

const svc = notasService;

const PENDENTE = {
  nota_fiscal_id: 'nf-1',
  empresa_id: 'emp-mia',
  chave: '2526',
  numero_nota: 123,
  serie: 1,
  emitida_em: '2026-10-10T12:30:00Z',
  item: {
    numero_item: 2,
    codigo: 'XYZ-9',
    descricao: 'REJUNTE CINZA',
    produto_id: null,
    quantidade: '2.0000',
    valor_centavos: 4000,
  },
};

const ENTREGA = {
  entrega_id: 'ent-1',
  pedido_id: 'ped-12',
  empresa_id: 'emp-mia',
  pedido_numero: 12,
  cliente_id: 'cli-aguia',
  status: 'saiu',
  saiu_em: '2026-10-09T13:00:00Z',
  entregue_em: null,
  transportadora: 'Rápido Sul',
};

function perfil(financeiro = true) {
  useAutenticacao.mockReturnValue({ financeiro, administrador: false, comercial: false });
}

function renderizar(elemento) {
  return render(<MemoryRouter>{elemento}</MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  perfil();
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  clientesService.obterCliente.mockResolvedValue({ dados: { id: 'cli-aguia', nome: 'Construtora Águia' } });
  clientesService.listarClientes.mockResolvedValue({ dados: [{ id: 'cli-aguia', nome: 'Construtora Águia' }] });
  produtosService.listarProdutos.mockResolvedValue({ dados: [{ id: 'prod-rejunte', nome: 'Rejunte cinza', codigo: 'REJ-1' }] });
  svc.listarItensSemProduto.mockResolvedValue({ dados: [PENDENTE] });
  svc.listarEntregasSemNota.mockResolvedValue({ dados: [ENTREGA] });
  svc.obterNota.mockResolvedValue({ dados: { id: 'nf-1', versao: 7 } });
  svc.ligarItemAoProduto.mockResolvedValue({ dados: {} });
});

describe('useItensSemProduto e useEntregasSemNota', () => {
  it('paginam e filtram voltando para a primeira página', async () => {
    svc.listarItensSemProduto.mockResolvedValue({ dados: Array.from({ length: TAMANHO_PAGINA + 1 }, () => PENDENTE) });
    const itens = renderHook(() => useItensSemProduto());
    await waitFor(() => expect(itens.result.current.temProxima).toBe(true));
    act(() => itens.result.current.irParaProxima());
    await waitFor(() => expect(itens.result.current.pagina).toBe(2));
    act(() => itens.result.current.filtrar({ empresa: 'emp-mia' }));
    await waitFor(() =>
      expect(svc.listarItensSemProduto).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1, empresa: 'emp-mia' }))
    );

    const entregas = renderHook(() => useEntregasSemNota());
    await waitFor(() => expect(entregas.result.current.carregando).toBe(false));
    act(() => entregas.result.current.filtrar({ cliente: 'cli-aguia' }));
    await waitFor(() =>
      expect(svc.listarEntregasSemNota).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1, cliente: 'cli-aguia' }))
    );
  });
});

describe('ItensSemProduto', () => {
  it('lista os itens pendentes com a nota, o código e o valor', async () => {
    renderizar(<ItensSemProduto />);

    const linha = (await screen.findByRole('link', { name: '1-123' })).closest('tr');
    expect(within(linha).getByRole('link', { name: '1-123' })).toHaveAttribute('href', '/notas-fiscais/nf-1');
    expect(within(linha).getByText('XYZ-9')).toBeInTheDocument();
    expect(within(linha).getByText('REJUNTE CINZA')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 40,00')).toBeInTheDocument();
    expect(await within(linha).findByText('MIA')).toBeInTheDocument();
  });

  it('liga o item lendo a versão atual da nota e recarrega a lista', async () => {
    renderizar(<ItensSemProduto />);
    const linha = (await screen.findByRole('link', { name: '1-123' })).closest('tr');
    fireEvent.click(within(linha).getByRole('button', { name: 'Ligar produto' }));
    const dialogo = screen.getByRole('dialog', { name: 'Ligar o item 2 a um produto' });
    await within(dialogo).findByRole('option', { name: 'Rejunte cinza (REJ-1)' });
    fireEvent.change(within(dialogo).getByLabelText('Produto *'), { target: { value: 'prod-rejunte' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Ligar' }));

    await waitFor(() =>
      expect(svc.ligarItemAoProduto).toHaveBeenCalledWith('nf-1', 2, { versao: 7, produto_id: 'prod-rejunte' })
    );
    expect(svc.obterNota).toHaveBeenCalledWith('nf-1');
    await waitFor(() => expect(svc.listarItensSemProduto).toHaveBeenCalledTimes(2));
  });

  it('quem não é financeiro só vê a lista', async () => {
    perfil(false);
    renderizar(<ItensSemProduto />);
    await screen.findByRole('link', { name: '1-123' });

    expect(screen.queryByRole('button', { name: 'Ligar produto' })).toBeNull();
  });

  it('mostra o vazio e o erro com nova tentativa', async () => {
    svc.listarItensSemProduto.mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValue({ dados: [] });
    renderizar(<ItensSemProduto />);

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhum item de nota sem produto.')).toBeInTheDocument();
  });
});

describe('EntregasSemNota', () => {
  it('lista as entregas que saíram sem nota com pedido, cliente, status e transportadora', async () => {
    renderizar(<EntregasSemNota />);

    const linha = (await screen.findByRole('link', { name: 'Pedido 12' })).closest('tr');
    expect(within(linha).getByRole('link', { name: 'Pedido 12' })).toHaveAttribute('href', '/pedidos/ped-12');
    expect(await within(linha).findByText('Construtora Águia')).toBeInTheDocument();
    expect(within(linha).getByText('Em trânsito')).toBeInTheDocument();
    expect(within(linha).getByText('09/10/2026')).toBeInTheDocument();
    expect(within(linha).getByText('Rápido Sul')).toBeInTheDocument();
  });

  it('filtra por empresa e cliente', async () => {
    renderizar(<EntregasSemNota />);
    await screen.findByRole('link', { name: 'Pedido 12' });
    await screen.findByRole('option', { name: 'MIA' });

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-mia' } });
    await screen.findByRole('option', { name: 'Construtora Águia' });
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'cli-aguia' } });

    await waitFor(() =>
      expect(svc.listarEntregasSemNota).toHaveBeenLastCalledWith(
        expect.objectContaining({ empresa: 'emp-mia', cliente: 'cli-aguia', pagina: 1 })
      )
    );
  });

  it('mostra o vazio', async () => {
    svc.listarEntregasSemNota.mockResolvedValue({ dados: [] });
    renderizar(<EntregasSemNota />);

    expect(await screen.findByText('Todas as entregas que saíram têm nota fiscal.')).toBeInTheDocument();
  });
});
