import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import * as empresasService from '../../services/empresas';
import * as locaisService from '../../services/locais';
import * as produtosService from '../../services/produtos';
import { ReservasProduto } from './ReservasProduto';

vi.mock('../../services/locais', () => ({ listarTodosLocais: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/produtos', () => ({ listarReservas: vi.fn(), obterSaldo: vi.fn() }));

const { listarTodosLocais } = locaisService;
const { listarTodasEmpresas } = empresasService;
const { listarReservas, obterSaldo } = produtosService;

const PRODUTO = { id: 'p1', nome: 'Cimento CP II 50', saldo: 14 };

const MANUAL = {
  id: 'res-manual',
  produto_id: 'p1',
  local_id: 'l-cabedelo',
  quantidade: 3,
  origem: 'manual',
  origem_id: null,
  status: 'ativa',
  observacao: 'pedido 123 da Construtora Alfa',
  criado_em: '2026-10-12T12:00:00Z',
  encerrada_em: null,
};

const DO_PEDIDO = { ...MANUAL, id: 'res-pedido', origem: 'pedido_item', origem_id: 'item-1', observacao: 'Reserva do pedido', quantidade: 2 };

const LIBERADA = { ...MANUAL, id: 'res-liberada', status: 'liberada', observacao: 'cancelada', encerrada_em: '2026-10-13T12:00:00Z' };

const CONFLITO = 'estoque do produto alterado por outra operação, recarregue e tente novamente';

function renderizar({ administrador = true, onReservar, onLiberar, onBaixar } = {}) {
  const props = {
    onReservar: onReservar ?? vi.fn().mockResolvedValue(null),
    onLiberar: onLiberar ?? vi.fn().mockResolvedValue(null),
    onBaixar: onBaixar ?? vi.fn().mockResolvedValue(null),
    onRecarregar: vi.fn(),
  };
  render(<ReservasProduto produto={PRODUTO} geracao={0} administrador={administrador} {...props} />);
  return props;
}

function linhaDe(texto) {
  return screen.getByText(texto).closest('tr');
}

beforeEach(() => {
  vi.clearAllMocks();
  listarTodosLocais.mockResolvedValue([{ id: 'l-cabedelo', nome: 'Galpão Cabedelo', empresa_id: 'e-mia' }]);
  listarTodasEmpresas.mockResolvedValue([{ id: 'e-mia', nome_fantasia: 'MIA' }]);
  listarReservas.mockResolvedValue({ dados: [MANUAL, DO_PEDIDO] });
  obterSaldo.mockResolvedValue({
    dados: {
      produto_id: 'p1',
      saldo: 14,
      reservado: 5,
      disponivel: 9,
      nao_alocado: 0,
      locais: [
        { local_id: 'l-cabedelo', local_nome: 'Galpão Cabedelo', empresa_id: 'e-mia', quantidade: 10, reservado: 5, disponivel: 5 },
      ],
    },
  });
});

describe('ReservasProduto', () => {
  it('lista as reservas ativas com local, quantidade, origem e observação', async () => {
    renderizar();

    const manual = (await screen.findByText('pedido 123 da Construtora Alfa')).closest('tr');
    expect(await within(manual).findByText('Galpão Cabedelo')).toBeInTheDocument();
    expect(within(manual).getByText('3')).toBeInTheDocument();
    expect(within(manual).getByText('Manual')).toBeInTheDocument();
    expect(within(manual).getByText('Ativa')).toBeInTheDocument();
    expect(within(linhaDe('Reserva do pedido')).getByText('Pedido')).toBeInTheDocument();
    expect(listarReservas).toHaveBeenCalledWith('p1', expect.objectContaining({ status: 'ativa' }));
  });

  it('filtra por status e mostra o vazio de cada filtro', async () => {
    listarReservas.mockResolvedValue({ dados: [] });
    renderizar();

    expect(await screen.findByText('Nenhuma reserva ativa.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Status das reservas'), { target: { value: '' } });

    expect(await screen.findByText('Nenhuma reserva registrada.')).toBeInTheDocument();
    expect(listarReservas).toHaveBeenLastCalledWith('p1', expect.objectContaining({ status: '', pagina: 1 }));
  });

  it('mostra o erro e tenta de novo', async () => {
    listarReservas.mockRejectedValueOnce(new Error('falha nas reservas'));
    renderizar();

    expect(await screen.findByText('falha nas reservas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('pedido 123 da Construtora Alfa')).toBeInTheDocument();
  });

  it('quem não é administrador só consulta', async () => {
    renderizar({ administrador: false });
    await screen.findByText('pedido 123 da Construtora Alfa');

    expect(screen.queryByRole('button', { name: /Nova reserva/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Liberar reserva' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Baixar reserva' })).toBeNull();
  });

  it('não oferece ações para reserva de pedido nem para reserva encerrada', async () => {
    listarReservas.mockResolvedValue({ dados: [DO_PEDIDO, LIBERADA] });
    renderizar();
    await screen.findByText('Reserva do pedido');

    expect(within(linhaDe('Reserva do pedido')).queryByRole('button', { name: 'Liberar reserva' })).toBeNull();
    expect(within(linhaDe('Reserva do pedido')).getByText('Pelo pedido')).toBeInTheDocument();
    expect(within(linhaDe('cancelada')).queryByRole('button', { name: 'Baixar reserva' })).toBeNull();
  });

  it('cria a reserva num local com disponível, limitada ao disponível', async () => {
    const { onReservar } = renderizar();
    await screen.findByText('pedido 123 da Construtora Alfa');
    fireEvent.click(screen.getByRole('button', { name: /Nova reserva/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Nova reserva' });
    await within(dialogo).findByRole('option', { name: 'Galpão Cabedelo · MIA — disponível 5' });

    fireEvent.change(within(dialogo).getByLabelText('Local *'), { target: { value: 'l-cabedelo' } });
    fireEvent.change(within(dialogo).getByLabelText('Quantidade *'), { target: { value: '6' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reservar' }));
    expect(await within(dialogo).findByText('Quantidade maior que o disponível no local (5).')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Quantidade *'), { target: { value: '4' } });
    fireEvent.change(within(dialogo).getByLabelText('Observação'), { target: { value: ' obra Alfa ' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reservar' }));

    await waitFor(() =>
      expect(onReservar).toHaveBeenCalledWith({ local_id: 'l-cabedelo', quantidade: 4, observacao: 'obra Alfa' })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('valida local e quantidade da reserva', async () => {
    const { onReservar } = renderizar();
    await screen.findByText('pedido 123 da Construtora Alfa');
    fireEvent.click(screen.getByRole('button', { name: /Nova reserva/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Nova reserva' });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reservar' }));

    expect(await within(dialogo).findByText('Selecione o local.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe a quantidade.')).toBeInTheDocument();
    expect(onReservar).not.toHaveBeenCalled();
  });

  it('libera a reserva depois de confirmar e mostra o erro de reserva encerrada', async () => {
    const onLiberar = vi.fn().mockRejectedValueOnce(new ErroApi(409, 'reserva já encerrada')).mockResolvedValue(null);
    renderizar({ onLiberar });
    await screen.findByText('pedido 123 da Construtora Alfa');

    fireEvent.click(within(linhaDe('pedido 123 da Construtora Alfa')).getByRole('button', { name: 'Liberar reserva' }));
    const dialogo = screen.getByRole('dialog', { name: 'Liberar reserva' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Liberar' }));

    expect(await within(dialogo).findByText('reserva já encerrada')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Liberar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onLiberar).toHaveBeenCalledWith(MANUAL);
  });

  it('baixa a reserva com uma saída do mesmo local e quantidade, levando o documento', async () => {
    const { onBaixar } = renderizar();
    await screen.findByText('pedido 123 da Construtora Alfa');

    fireEvent.click(within(linhaDe('pedido 123 da Construtora Alfa')).getByRole('button', { name: 'Baixar reserva' }));
    const dialogo = screen.getByRole('dialog', { name: 'Baixar reserva' });
    expect(within(dialogo).getByText(/saída de 3/)).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('Documento de referência'), { target: { value: ' NF-200 ' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Baixar' }));

    await waitFor(() =>
      expect(onBaixar).toHaveBeenCalledWith({
        tipo: 'saida',
        local_id: 'l-cabedelo',
        quantidade: 3,
        reserva_id: 'res-manual',
        documento_ref: 'NF-200',
        observacao: 'pedido 123 da Construtora Alfa',
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('no conflito de estoque da baixa avisa e recarrega o detalhe', async () => {
    const onBaixar = vi.fn().mockRejectedValue(new ErroApi(409, CONFLITO));
    const { onRecarregar } = renderizar({ onBaixar });
    await screen.findByText('pedido 123 da Construtora Alfa');

    fireEvent.click(within(linhaDe('pedido 123 da Construtora Alfa')).getByRole('button', { name: 'Baixar reserva' }));
    const dialogo = screen.getByRole('dialog', { name: 'Baixar reserva' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Baixar' }));

    expect(await within(dialogo).findByText(CONFLITO)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Recarregar dados' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onRecarregar).toHaveBeenCalled();
  });
});
