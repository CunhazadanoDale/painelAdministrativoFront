import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as empresasService from '../../services/empresas';
import * as notasService from '../../services/notasFiscais';
import * as pedidosService from '../../services/pedidos';
import * as produtosService from '../../services/produtos';
import * as titulosService from '../../services/titulosReceber';
import NotaDetalhe from './NotaDetalhe';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/produtos', () => ({ listarProdutos: vi.fn(), obterProduto: vi.fn() }));
vi.mock('../../services/titulosReceber', () => ({ listarTitulos: vi.fn() }));
vi.mock('../../services/pedidos', () => ({
  listarPedidos: vi.fn(),
  obterPedido: vi.fn(),
  listarEntregasDoPedido: vi.fn(),
  obterEntrega: vi.fn(),
}));
vi.mock('../../services/notasFiscais', () => ({
  obterNota: vi.fn(),
  listarEventosNota: vi.fn(),
  atualizarVinculoNota: vi.fn(),
  baixarXmlNota: vi.fn(),
}));

const svc = notasService;
const CONFLITO = 'a nota fiscal foi alterada por outra pessoa; recarregue e tente de novo';

const NOTA = {
  id: 'nf-1',
  chave: '25261011444777000161550010000001231000001237',
  empresa_id: 'emp-mia',
  numero: 123,
  serie: 1,
  emitida_em: '2026-10-10T12:30:00Z',
  finalidade: 'normal',
  natureza: 'venda',
  natureza_operacao: 'VENDA',
  entre_empresas: false,
  cliente_id: 'cli-aguia',
  destinatario_documento: '11444777000161',
  destinatario_nome: 'Construtora Águia',
  cfop_predominante: '5102',
  valor_total_centavos: 109000,
  valor_produtos_centavos: 109000,
  valor_frete_centavos: 0,
  valor_desconto_centavos: 0,
  protocolo: '325260000012345',
  autorizada_em: '2026-10-10T12:31:02Z',
  status: 'autorizada',
  pedido_id: null,
  entrega_id: null,
  versao: 5,
  itens: [],
  duplicatas: [],
};

const PEDIDOS = [
  { id: 'ped-12', numero: 12, status: 'confirmado' },
  { id: 'ped-13', numero: 13, status: 'proposta' },
  { id: 'ped-14', numero: 14, status: 'cancelado' },
  { id: 'ped-15', numero: 15, status: 'entregue' },
];

const ENTREGAS = [
  { id: 'ent-1', pedido_id: 'ped-12', status: 'saiu', saiu_em: '2026-10-09T13:00:00Z', previsao: null, criado_em: '2026-10-08T13:00:00Z' },
  { id: 'ent-2', pedido_id: 'ped-12', status: 'cancelada', saiu_em: null, previsao: null, criado_em: '2026-10-07T13:00:00Z' },
];

function perfil(financeiro = true) {
  useAutenticacao.mockReturnValue({ financeiro, administrador: false, comercial: false });
}

async function abrir(nota = NOTA) {
  svc.obterNota.mockResolvedValue({ dados: nota });
  render(
    <MemoryRouter initialEntries={['/notas-fiscais/nf-1']}>
      <Routes>
        <Route path="/notas-fiscais/:id" element={<NotaDetalhe />} />
      </Routes>
    </MemoryRouter>
  );
  await screen.findByRole('heading', { name: /NF-e/ });
}

beforeEach(() => {
  vi.clearAllMocks();
  perfil();
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  produtosService.obterProduto.mockResolvedValue({ dados: null });
  titulosService.listarTitulos.mockResolvedValue({ dados: [] });
  svc.listarEventosNota.mockResolvedValue({ dados: [] });
  svc.atualizarVinculoNota.mockResolvedValue({ dados: NOTA });
  pedidosService.listarPedidos.mockResolvedValue({ dados: PEDIDOS });
  pedidosService.obterPedido.mockResolvedValue({ dados: { id: 'ped-12', numero: 12 } });
  pedidosService.listarEntregasDoPedido.mockResolvedValue({ dados: ENTREGAS });
  pedidosService.obterEntrega.mockResolvedValue({ dados: ENTREGAS[0] });
});

describe('vínculo da nota com pedido e entrega', () => {
  it('mostra o pedido e a entrega vinculados', async () => {
    await abrir({ ...NOTA, pedido_id: 'ped-12', entrega_id: 'ent-1' });

    expect(await screen.findByRole('link', { name: 'Pedido 12' })).toHaveAttribute('href', '/pedidos/ped-12');
    expect(await screen.findByText('Saída em 09/10/2026 · Em trânsito')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alterar vínculo' })).toBeInTheDocument();
  });

  it('vincula a nota a um pedido aberto do cliente e a uma entrega dele', async () => {
    await abrir();
    expect(screen.getByText('Sem pedido vinculado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Vincular pedido' }));
    const dialogo = screen.getByRole('dialog', { name: 'Vínculo da NF-e 1-123' });

    await within(dialogo).findByRole('option', { name: 'Pedido 12 · Confirmado' });
    expect(within(dialogo).queryByRole('option', { name: /Pedido 13/ })).toBeNull();
    expect(within(dialogo).queryByRole('option', { name: /Pedido 14/ })).toBeNull();
    expect(within(dialogo).getByRole('option', { name: 'Pedido 15 · Entregue' })).toBeInTheDocument();
    expect(pedidosService.listarPedidos).toHaveBeenCalledWith(
      expect.objectContaining({ empresa: 'emp-mia', cliente: 'cli-aguia' })
    );

    fireEvent.change(within(dialogo).getByLabelText('Pedido'), { target: { value: 'ped-12' } });
    await within(dialogo).findByRole('option', { name: 'Saída em 09/10/2026 · Em trânsito' });
    expect(within(dialogo).queryByRole('option', { name: /Cancelada/ })).toBeNull();
    fireEvent.change(within(dialogo).getByLabelText('Entrega'), { target: { value: 'ent-1' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar vínculo' }));

    await waitFor(() =>
      expect(svc.atualizarVinculoNota).toHaveBeenCalledWith('nf-1', { versao: 5, pedido_id: 'ped-12', entrega_id: 'ent-1' })
    );
    await waitFor(() => expect(svc.obterNota).toHaveBeenCalledTimes(2));
  });

  it('desfaz o vínculo enviando nulos', async () => {
    await abrir({ ...NOTA, pedido_id: 'ped-12', entrega_id: null });
    fireEvent.click(screen.getByRole('button', { name: 'Alterar vínculo' }));
    const dialogo = screen.getByRole('dialog', { name: 'Vínculo da NF-e 1-123' });
    await waitFor(() => expect(within(dialogo).getByLabelText('Pedido')).toHaveValue('ped-12'));

    fireEvent.change(within(dialogo).getByLabelText('Pedido'), { target: { value: '' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar vínculo' }));

    await waitFor(() =>
      expect(svc.atualizarVinculoNota).toHaveBeenCalledWith('nf-1', { versao: 5, pedido_id: null, entrega_id: null })
    );
  });

  it('mostra a recusa da entrega que já tem nota e trata o conflito', async () => {
    svc.atualizarVinculoNota
      .mockRejectedValueOnce(new ErroApi(409, 'a entrega já tem uma nota fiscal autorizada'))
      .mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    await abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Vincular pedido' }));
    const dialogo = screen.getByRole('dialog', { name: 'Vínculo da NF-e 1-123' });
    await within(dialogo).findByRole('option', { name: 'Pedido 12 · Confirmado' });
    fireEvent.change(within(dialogo).getByLabelText('Pedido'), { target: { value: 'ped-12' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar vínculo' }));

    expect(await within(dialogo).findByText('a entrega já tem uma nota fiscal autorizada')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar vínculo' }));
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Recarregar dados' }));
    await waitFor(() => expect(svc.obterNota).toHaveBeenCalledTimes(2));
  });

  it('não oferece vínculo em nota entre empresas, cancelada ou para quem não é financeiro', async () => {
    await abrir({ ...NOTA, entre_empresas: true, cliente_id: null, empresa_destinataria_id: 'emp-mia' });
    expect(screen.queryByRole('button', { name: 'Vincular pedido' })).toBeNull();
  });

  it('nota cancelada não muda de vínculo', async () => {
    await abrir({ ...NOTA, status: 'cancelada' });
    expect(screen.queryByRole('button', { name: 'Vincular pedido' })).toBeNull();
  });

  it('quem não é financeiro não vincula', async () => {
    perfil(false);
    await abrir();
    expect(screen.queryByRole('button', { name: 'Vincular pedido' })).toBeNull();
  });
});
