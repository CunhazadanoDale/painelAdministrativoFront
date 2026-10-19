import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import * as comissoesService from '../../services/comissoes';
import { ComissaoDoPedido } from './ComissaoDoPedido';

vi.mock('../../services/comissoes', () => ({ obterComissaoDoPedido: vi.fn(), definirComissaoDoPedido: vi.fn() }));

const svc = comissoesService;
const CONFLITO = 'a comissão do pedido foi alterada por outra pessoa; recarregue e tente de novo';

const PEDIDO = {
  id: 'ped-12',
  representante_id: 'rep-jose',
  status: 'confirmado',
  itens: [{ id: 'i-1', quantidade_entregue: 0 }],
};

const PADRAO = { pedido_id: 'ped-12', representante_id: 'rep-jose', percentual_bp: 300, origem: 'padrao', definido: false, versao: null };
const MANUAL = { ...PADRAO, percentual_bp: 450, origem: 'manual', definido: true, versao: 2 };

function renderizar({ pedido = PEDIDO, comercial = true } = {}) {
  return render(<ComissaoDoPedido pedido={pedido} comercial={comercial} geracao={0} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  svc.obterComissaoDoPedido.mockResolvedValue({ dados: PADRAO });
  svc.definirComissaoDoPedido.mockResolvedValue({ dados: MANUAL });
});

describe('ComissaoDoPedido', () => {
  it('mostra o padrão do representante ainda não gravado', async () => {
    renderizar();

    expect(await screen.findByText('3,00%')).toBeInTheDocument();
    expect(screen.getByText(/Padrão do representante/)).toBeInTheDocument();
    expect(svc.obterComissaoDoPedido).toHaveBeenCalledWith('ped-12', { sinal: expect.anything() });
  });

  it('mostra o percentual definido pelo comercial', async () => {
    svc.obterComissaoDoPedido.mockResolvedValue({ dados: MANUAL });
    renderizar();

    expect(await screen.findByText('4,50%')).toBeInTheDocument();
    expect(screen.getByText('Definido pelo comercial')).toBeInTheDocument();
  });

  it('define o percentual pela primeira vez sem versão', async () => {
    renderizar();
    await screen.findByText('3,00%');
    fireEvent.click(screen.getByRole('button', { name: 'Alterar percentual' }));
    const dialogo = screen.getByRole('dialog', { name: 'Comissão do pedido' });
    expect(within(dialogo).getByLabelText('Percentual (%) *')).toHaveValue('3,00');

    fireEvent.change(within(dialogo).getByLabelText('Percentual (%) *'), { target: { value: '120' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialogo).findByText('Informe um percentual de 0 a 100, com até duas casas.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Percentual (%) *'), { target: { value: '4,5' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(svc.definirComissaoDoPedido).toHaveBeenCalledWith('ped-12', { percentual_bp: 450, versao: null }));
    await waitFor(() => expect(svc.obterComissaoDoPedido).toHaveBeenCalledTimes(2));
  });

  it('altera o percentual já definido com a versão e trata o conflito', async () => {
    svc.obterComissaoDoPedido.mockResolvedValue({ dados: MANUAL });
    svc.definirComissaoDoPedido.mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    renderizar();
    await screen.findByText('4,50%');
    fireEvent.click(screen.getByRole('button', { name: 'Alterar percentual' }));
    const dialogo = screen.getByRole('dialog', { name: 'Comissão do pedido' });
    fireEvent.change(within(dialogo).getByLabelText('Percentual (%) *'), { target: { value: '5' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(svc.definirComissaoDoPedido).toHaveBeenCalledWith('ped-12', { percentual_bp: 500, versao: 2 }));
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Recarregar dados' }));
    await waitFor(() => expect(svc.obterComissaoDoPedido).toHaveBeenCalledTimes(2));
  });

  it('depois da primeira saída avisa que o percentual travou e não oferece alterar', async () => {
    renderizar({ pedido: { ...PEDIDO, status: 'parcialmente_entregue', itens: [{ id: 'i-1', quantidade_entregue: 10 }] } });
    await screen.findByText('3,00%');

    expect(screen.queryByRole('button', { name: 'Alterar percentual' })).toBeNull();
    expect(screen.getByText(/não muda depois da primeira saída/)).toBeInTheDocument();
  });

  it('quem não é comercial só lê', async () => {
    renderizar({ comercial: false });
    await screen.findByText('3,00%');

    expect(screen.queryByRole('button', { name: 'Alterar percentual' })).toBeNull();
  });

  it('mostra o erro com nova tentativa', async () => {
    svc.obterComissaoDoPedido.mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValue({ dados: PADRAO });
    renderizar();

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('3,00%')).toBeInTheDocument();
  });
});
