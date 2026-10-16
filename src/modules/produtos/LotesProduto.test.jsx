import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as locaisService from '../../services/locais';
import * as produtosService from '../../services/produtos';
import { LotesProduto } from './LotesProduto';

vi.mock('../../services/locais', () => ({ listarTodosLocais: vi.fn() }));
vi.mock('../../services/produtos', () => ({ listarLotes: vi.fn() }));

const { listarTodosLocais } = locaisService;
const { listarLotes } = produtosService;

const COMPRADO = {
  id: 'lote-1',
  produto_id: 'p1',
  local_id: 'l-cabedelo',
  movimento_id: 'mov-1',
  lote_origem_id: null,
  custo_unitario_centavos: 2590,
  quantidade_inicial: 10,
  quantidade_atual: 4,
  entrada_em: '2026-10-11T12:00:00Z',
};

const TRANSFERIDO = {
  ...COMPRADO,
  id: 'lote-2',
  local_id: 'l-loja',
  lote_origem_id: 'lote-1',
  quantidade_inicial: 3,
  quantidade_atual: 3,
};

const IMPLANTADO = { ...COMPRADO, id: 'lote-3', custo_unitario_centavos: null, quantidade_inicial: 6, quantidade_atual: 6 };

function linhaDe(texto) {
  return screen.getByText(texto).closest('tr');
}

beforeEach(() => {
  vi.clearAllMocks();
  listarTodosLocais.mockResolvedValue([
    { id: 'l-cabedelo', nome: 'Galpão Cabedelo' },
    { id: 'l-loja', nome: 'Loja João Pessoa' },
  ]);
  listarLotes.mockResolvedValue({ dados: [COMPRADO, TRANSFERIDO, IMPLANTADO] });
});

describe('LotesProduto', () => {
  it('lista os lotes com local, custo, quantidades, origem e o valor em estoque', async () => {
    render(<LotesProduto produtoId="p1" geracao={0} />);

    const comprado = (await screen.findAllByText('R$ 25,90'))[0].closest('tr');
    expect(await within(comprado).findByText('Galpão Cabedelo')).toBeInTheDocument();
    expect(within(comprado).getByText('10')).toBeInTheDocument();
    expect(within(comprado).getByText('4')).toBeInTheDocument();
    expect(within(comprado).getByText('R$ 103,60')).toBeInTheDocument();
    expect(within(comprado).getByText('Movimento')).toBeInTheDocument();
    const transferido = (await screen.findByText('Loja João Pessoa')).closest('tr');
    expect(within(transferido).getByText('Transferência')).toBeInTheDocument();
    expect(within(linhaDe('Desconhecido')).getAllByText('—').length).toBeGreaterThan(0);
    expect(listarLotes).toHaveBeenCalledWith('p1', expect.objectContaining({ comSaldo: true }));
  });

  it('mostra os esgotados quando o filtro desliga e o vazio de cada filtro', async () => {
    listarLotes.mockResolvedValue({ dados: [] });
    render(<LotesProduto produtoId="p1" geracao={0} />);

    expect(await screen.findByText('Nenhum lote com saldo nos locais do seu acesso.')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Só lotes com saldo'));

    expect(await screen.findByText('Nenhum lote nos locais do seu acesso.')).toBeInTheDocument();
    await waitFor(() => expect(listarLotes).toHaveBeenLastCalledWith('p1', expect.objectContaining({ comSaldo: false })));
  });

  it('mostra o erro e tenta de novo', async () => {
    listarLotes.mockRejectedValueOnce(new Error('perfil sem permissão para esta operação'));
    render(<LotesProduto produtoId="p1" geracao={0} />);

    expect(await screen.findByText('perfil sem permissão para esta operação')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect((await screen.findAllByText('R$ 25,90')).length).toBeGreaterThan(0);
  });
});
