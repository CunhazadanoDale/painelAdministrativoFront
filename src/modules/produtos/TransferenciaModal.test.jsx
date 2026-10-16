import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import * as empresasService from '../../services/empresas';
import * as locaisService from '../../services/locais';
import * as produtosService from '../../services/produtos';
import { TransferenciaModal } from './TransferenciaModal';

vi.mock('../../services/locais', () => ({ listarTodosLocais: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/produtos', () => ({ obterSaldo: vi.fn() }));

const { listarTodosLocais } = locaisService;
const { listarTodasEmpresas } = empresasService;
const { obterSaldo } = produtosService;

const PRODUTO = { id: 'p1', nome: 'Cimento CP II 50', saldo: 14 };

const LOCAIS = [
  { id: 'l-cabedelo', nome: 'Galpão Cabedelo', empresa_id: 'e-mia' },
  { id: 'l-loja', nome: 'Loja João Pessoa', empresa_id: 'e-mia' },
  { id: 'l-recife', nome: 'Recife', empresa_id: 'e-gigante' },
];

const CONFLITO = 'estoque do produto alterado por outra operação, recarregue e tente novamente';

function abrir({ onSalvar = vi.fn().mockResolvedValue(null), onFechar = vi.fn() } = {}) {
  render(<TransferenciaModal produto={PRODUTO} onFechar={onFechar} onSalvar={onSalvar} />);
  return { onSalvar, onFechar };
}

function escolher(rotulo, valor) {
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });
}

function transferir() {
  fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));
}

async function escolherOrigemCabedelo() {
  await screen.findByRole('option', { name: 'Galpão Cabedelo · MIA — disponível 7' });
  escolher('Origem *', 'l-cabedelo');
  await screen.findByRole('option', { name: 'Loja João Pessoa' });
}

beforeEach(() => {
  vi.clearAllMocks();
  listarTodosLocais.mockImplementation(async ({ empresa } = {}) =>
    LOCAIS.filter((local) => !empresa || local.empresa_id === empresa)
  );
  listarTodasEmpresas.mockResolvedValue([
    { id: 'e-mia', nome_fantasia: 'MIA' },
    { id: 'e-gigante', nome_fantasia: 'Gigante' },
  ]);
  obterSaldo.mockResolvedValue({
    dados: {
      produto_id: 'p1',
      saldo: 14,
      reservado: 3,
      disponivel: 11,
      nao_alocado: 0,
      locais: [
        { local_id: 'l-cabedelo', local_nome: 'Galpão Cabedelo', empresa_id: 'e-mia', quantidade: 10, reservado: 3, disponivel: 7 },
        { local_id: 'l-recife', local_nome: 'Recife', empresa_id: 'e-gigante', quantidade: 4, reservado: 0, disponivel: 4 },
        { local_id: 'l-loja', local_nome: 'Loja João Pessoa', empresa_id: 'e-mia', quantidade: 0, reservado: 0, disponivel: 0 },
      ],
    },
  });
});

describe('TransferenciaModal', () => {
  it('oferece como origem só os locais com disponível e como destino só os ativos da mesma empresa', async () => {
    abrir();

    await screen.findByRole('option', { name: 'Galpão Cabedelo · MIA — disponível 7' });
    expect(screen.getByRole('option', { name: 'Recife · Gigante — disponível 4' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Loja João Pessoa · MIA/ })).toBeNull();
    expect(screen.getByLabelText('Destino *')).toBeDisabled();

    escolher('Origem *', 'l-cabedelo');

    await screen.findByRole('option', { name: 'Loja João Pessoa' });
    expect(screen.queryByRole('option', { name: 'Recife' })).toBeNull();
    expect(listarTodosLocais).toHaveBeenLastCalledWith(expect.objectContaining({ empresa: 'e-mia', ativos: true }));
  });

  it('valida origem, destino e quantidade antes de enviar', async () => {
    const { onSalvar } = abrir();
    await screen.findByRole('option', { name: 'Galpão Cabedelo · MIA — disponível 7' });

    transferir();

    expect(await screen.findByText('Selecione o local de origem.')).toBeInTheDocument();
    expect(screen.getByText('Selecione o local de destino.')).toBeInTheDocument();
    expect(screen.getByText('Informe a quantidade.')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('recusa destino igual à origem e quantidade acima do disponível na origem', async () => {
    const { onSalvar } = abrir();
    await escolherOrigemCabedelo();
    escolher('Destino *', 'l-cabedelo');
    escolher('Quantidade *', '8');

    transferir();

    expect(await screen.findByText('O destino deve ser diferente da origem.')).toBeInTheDocument();
    expect(screen.getByText('Quantidade maior que o disponível na origem (7).')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('recusa quantidade que não é inteira e positiva', async () => {
    abrir();
    await escolherOrigemCabedelo();
    escolher('Quantidade *', '-2');

    transferir();

    expect(await screen.findByText('Informe um número inteiro maior que zero.')).toBeInTheDocument();
  });

  it('transfere com documento e observação, sem documento vazio, e fecha', async () => {
    const { onSalvar, onFechar } = abrir();
    await escolherOrigemCabedelo();
    escolher('Destino *', 'l-loja');
    escolher('Quantidade *', '4');
    escolher('Documento de referência', ' ROM-12 ');
    escolher('Observação', ' abastecer a loja ');

    transferir();

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith({
        local_origem_id: 'l-cabedelo',
        local_destino_id: 'l-loja',
        quantidade: 4,
        documento_ref: 'ROM-12',
        observacao: 'abastecer a loja',
      })
    );
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
  });

  it('limpa o destino quando a origem muda de empresa', async () => {
    abrir();
    await escolherOrigemCabedelo();
    escolher('Destino *', 'l-loja');

    escolher('Origem *', 'l-recife');

    await waitFor(() => expect(screen.getByLabelText('Destino *')).toHaveValue(''));
  });

  it('mostra o erro da API sem fechar', async () => {
    const onSalvar = vi
      .fn()
      .mockRejectedValue(new ErroApi(400, 'erro de validação: local inativo não recebe entrada de estoque'));
    const { onFechar } = abrir({ onSalvar });
    await escolherOrigemCabedelo();
    escolher('Destino *', 'l-loja');
    escolher('Quantidade *', '1');

    transferir();

    expect(await screen.findByText(/local inativo não recebe entrada de estoque/)).toBeInTheDocument();
    expect(onFechar).not.toHaveBeenCalled();
  });

  it('no conflito de estoque recarrega o saldo sem perder o formulário', async () => {
    const onSalvar = vi.fn().mockRejectedValueOnce(new ErroApi(409, CONFLITO)).mockResolvedValueOnce(null);
    const { onFechar } = abrir({ onSalvar });
    await escolherOrigemCabedelo();
    escolher('Destino *', 'l-loja');
    escolher('Quantidade *', '2');

    transferir();

    expect(await screen.findByText(CONFLITO)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar dados' }));
    await waitFor(() => expect(obterSaldo).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(CONFLITO)).toBeNull());
    expect(screen.getByLabelText('Quantidade *')).toHaveValue(2);
    expect(screen.getByLabelText('Origem *')).toHaveValue('l-cabedelo');

    transferir();

    await waitFor(() => expect(onFechar).toHaveBeenCalled());
    expect(onSalvar).toHaveBeenCalledTimes(2);
  });
});
