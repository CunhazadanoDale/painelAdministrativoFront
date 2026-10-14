import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import * as empresasService from '../../services/empresas';
import * as locaisService from '../../services/locais';
import * as produtosService from '../../services/produtos';
import { MovimentoModal } from './MovimentoModal';

vi.mock('../../services/locais', () => ({
  listarTodosLocais: vi.fn(),
}));

vi.mock('../../services/empresas', () => ({
  listarTodasEmpresas: vi.fn(),
}));

vi.mock('../../services/produtos', () => ({
  obterSaldo: vi.fn(),
}));

const { listarTodosLocais } = locaisService;
const { listarTodasEmpresas } = empresasService;
const { obterSaldo } = produtosService;

const PRODUTO = { id: 'p1', nome: 'Cimento CP II 50', saldo: 14 };

const CABEDELO = { id: 'l-cabedelo', nome: 'Galpão Cabedelo', empresa_id: 'e-mia' };
const RECIFE = { id: 'l-recife', nome: 'Recife', empresa_id: 'e-gigante' };

function abrir(onSalvar = vi.fn().mockResolvedValue(null)) {
  render(<MovimentoModal produto={PRODUTO} onFechar={() => {}} onSalvar={onSalvar} />);
  return onSalvar;
}

function escolher(rotulo, valor) {
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });
}

async function aguardarLocais() {
  await screen.findByRole('option', { name: 'Galpão Cabedelo · MIA' });
}

beforeEach(() => {
  vi.clearAllMocks();
  listarTodosLocais.mockResolvedValue([CABEDELO, RECIFE]);
  listarTodasEmpresas.mockResolvedValue([
    { id: 'e-mia', nome_fantasia: 'MIA' },
    { id: 'e-gigante', nome_fantasia: 'Gigante' },
  ]);
  obterSaldo.mockResolvedValue({
    dados: {
      produto_id: 'p1',
      saldo: 14,
      reservado: 0,
      disponivel: 14,
      nao_alocado: 4,
      locais: [{ local_id: 'l-cabedelo', quantidade: 10, reservado: 7, disponivel: 3 }],
    },
  });
});

describe('MovimentoModal', () => {
  it('exige o local do movimento', async () => {
    const onSalvar = abrir();
    await aguardarLocais();
    escolher('Quantidade *', '5');
    escolher('Custo unitário *', '25,90');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText('Selecione o local do estoque.')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('exige custo na entrada e envia local e custo em centavos', async () => {
    const onSalvar = abrir();
    await aguardarLocais();
    escolher('Local *', 'l-cabedelo');
    escolher('Quantidade *', '10');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText('Informe o custo unitário da entrada.')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();

    escolher('Custo unitário *', '25,90');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({
        local_id: 'l-cabedelo',
        tipo: 'entrada',
        quantidade: 10,
        custo_unitario_centavos: 2590,
      })
    );
  });

  it('aceita custo zero na entrada', async () => {
    const onSalvar = abrir();
    await aguardarLocais();
    escolher('Local *', 'l-cabedelo');
    escolher('Quantidade *', '1');
    escolher('Custo unitário *', '0');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ custo_unitario_centavos: 0 }))
    );
  });

  it('na saída esconde o custo e limita ao disponível do local', async () => {
    const onSalvar = abrir();
    await aguardarLocais();
    escolher('Tipo *', 'saida');
    await screen.findByRole('option', { name: 'Galpão Cabedelo · MIA' });
    escolher('Local *', 'l-cabedelo');

    expect(screen.queryByLabelText(/Custo unitário/)).not.toBeInTheDocument();
    expect(await screen.findByText(/Disponível neste local: 3/)).toBeInTheDocument();

    escolher('Quantidade *', '5');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(
      await screen.findByText('Quantidade maior que o disponível no local (3).')
    ).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();

    escolher('Quantidade *', '2');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    expect(onSalvar.mock.calls[0][0]).not.toHaveProperty('custo_unitario_centavos');
    expect(onSalvar.mock.calls[0][0]).toMatchObject({ tipo: 'saida', quantidade: 2 });
  });

  it('trata local sem saldo como disponível zero', async () => {
    const onSalvar = abrir();
    await aguardarLocais();
    escolher('Tipo *', 'perda');
    await screen.findByRole('option', { name: 'Recife · Gigante' });
    escolher('Local *', 'l-recife');
    escolher('Quantidade *', '1');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(
      await screen.findByText('Quantidade maior que o disponível no local (0).')
    ).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('limita a implantação ao saldo não alocado', async () => {
    const onSalvar = abrir();
    await aguardarLocais();
    escolher('Tipo *', 'implantacao');
    escolher('Local *', 'l-cabedelo');
    expect(await screen.findByText(/Não alocado: 4/)).toBeInTheDocument();

    escolher('Quantidade *', '5');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(
      await screen.findByText('Quantidade maior que o saldo não alocado (4).')
    ).toBeInTheDocument();

    escolher('Quantidade *', '4');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    expect(onSalvar.mock.calls[0][0]).toMatchObject({ tipo: 'implantacao', quantidade: 4 });
    expect(onSalvar.mock.calls[0][0]).not.toHaveProperty('custo_unitario_centavos');
  });

  it('no conflito de concorrência avisa, recarrega o saldo e mantém o formulário', async () => {
    const onSalvar = vi
      .fn()
      .mockRejectedValueOnce(
        new ErroApi(409, 'estoque do produto alterado por outra operação, recarregue e tente novamente')
      )
      .mockResolvedValueOnce(null);
    const onFechar = vi.fn();
    render(<MovimentoModal produto={PRODUTO} onFechar={onFechar} onSalvar={onSalvar} />);
    await aguardarLocais();
    escolher('Local *', 'l-cabedelo');
    escolher('Quantidade *', '2');
    escolher('Custo unitário *', '25,90');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('alterado por outra operação');
    expect(onFechar).not.toHaveBeenCalled();
    expect(obterSaldo).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Recarregar dados' }));

    await waitFor(() => expect(obterSaldo).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByLabelText('Quantidade *')).toHaveValue(2);
    expect(screen.getByLabelText('Custo unitário *')).toHaveValue('25,90');

    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
  });

  it('mostra outros erros da API sem o botão de recarregar', async () => {
    const onSalvar = vi
      .fn()
      .mockRejectedValue(new ErroApi(400, 'erro de validação: local inativo não recebe entrada de estoque'));
    abrir(onSalvar);
    await aguardarLocais();
    escolher('Local *', 'l-cabedelo');
    escolher('Quantidade *', '2');
    escolher('Custo unitário *', '1');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText(/local inativo não recebe entrada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recarregar dados' })).not.toBeInTheDocument();
  });

  it('no ajuste o custo só aparece quando a quantidade é positiva', async () => {
    const onSalvar = abrir();
    await aguardarLocais();
    escolher('Tipo *', 'ajuste');
    escolher('Local *', 'l-cabedelo');

    escolher('Quantidade *', '-2');
    expect(screen.queryByLabelText(/Custo unitário/)).not.toBeInTheDocument();

    escolher('Quantidade *', '3');
    escolher('Custo unitário (opcional)', '12,00');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'ajuste', quantidade: 3, custo_unitario_centavos: 1200 })
      )
    );
  });
});
