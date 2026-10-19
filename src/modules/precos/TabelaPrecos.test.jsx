import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as produtosService from '../../services/produtos';
import * as precosService from '../../services/tabelaPrecos';
import TabelaPrecos from './TabelaPrecos';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/produtos', () => ({ listarProdutos: vi.fn() }));
vi.mock('../../services/tabelaPrecos', () => ({
  listarPrecosVigentes: vi.fn(),
  listarHistoricoPrecos: vi.fn(),
  lancarPreco: vi.fn(),
  excluirPreco: vi.fn(),
}));

const svc = precosService;

const PORCELANATO = {
  produto_id: 'prod-por',
  produto_nome: 'Porcelanato 60x60',
  produto_codigo: 'POR-60',
  unidade_medida: 'm2',
  modelo: 'pronta_entrega',
  data: '2026-10-19',
  preco_centavos: 12000,
  origem: 'tabela',
  item_id: 'tp-1',
  vigente_de: '2026-10-01',
};

const REJUNTE = { ...PORCELANATO, produto_id: 'prod-rej', produto_nome: 'Rejunte cinza', produto_codigo: 'REJ-1', unidade_medida: 'un', preco_centavos: 2500, origem: 'produto', item_id: null, vigente_de: null };
const CUBA = { ...PORCELANATO, produto_id: 'prod-cuba', produto_nome: 'Cuba inox', produto_codigo: null, preco_centavos: null, origem: 'sem_preco', item_id: null, vigente_de: null };

const HISTORICO = [
  { id: 'tp-2', produto_id: 'prod-por', modelo: 'pronta_entrega', preco_centavos: 12500, vigente_de: '2026-11-01', observacao: 'reajuste do fornecedor' },
  { id: 'tp-1', produto_id: 'prod-por', modelo: 'pronta_entrega', preco_centavos: 12000, vigente_de: '2026-10-01', observacao: '' },
];

function perfil(administrador = true) {
  useAutenticacao.mockReturnValue({ administrador, comercial: true, financeiro: administrador });
}

async function carregar() {
  render(<TabelaPrecos />);
  await screen.findByText('Porcelanato 60x60');
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'));
  perfil();
  svc.listarPrecosVigentes.mockResolvedValue({ dados: [PORCELANATO, REJUNTE, CUBA] });
  svc.listarHistoricoPrecos.mockResolvedValue({ dados: HISTORICO });
  svc.lancarPreco.mockResolvedValue({ dados: HISTORICO[0] });
  svc.excluirPreco.mockResolvedValue(null);
  produtosService.listarProdutos.mockResolvedValue({ dados: [{ id: 'prod-por', nome: 'Porcelanato 60x60', codigo: 'POR-60' }] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TabelaPrecos', () => {
  it('lista o preço do dia de cada produto com a origem', async () => {
    await carregar();

    const porcelanato = screen.getByText('Porcelanato 60x60').closest('tr');
    expect(within(porcelanato).getByText('POR-60')).toBeInTheDocument();
    expect(within(porcelanato).getByText('R$ 120,00')).toBeInTheDocument();
    expect(within(porcelanato).getByText('Tabela desde 01/10/2026')).toBeInTheDocument();
    const rejunte = screen.getByText('Rejunte cinza').closest('tr');
    expect(within(rejunte).getByText('Preço do produto')).toBeInTheDocument();
    const cuba = screen.getByText('Cuba inox').closest('tr');
    expect(within(cuba).getByText('Sem preço')).toBeInTheDocument();
    expect(svc.listarPrecosVigentes).toHaveBeenCalledWith(expect.objectContaining({ modelo: 'pronta_entrega', pagina: 1 }));
  });

  it('troca o modelo, a data e busca pelo nome ou código', async () => {
    await carregar();

    fireEvent.change(screen.getByLabelText('Modelo'), { target: { value: 'importacao' } });
    fireEvent.change(screen.getByLabelText('Preço em'), { target: { value: '2026-11-05' } });
    fireEvent.change(screen.getByLabelText('Buscar produto'), { target: { value: ' porc ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() =>
      expect(svc.listarPrecosVigentes).toHaveBeenLastCalledWith(
        expect.objectContaining({ modelo: 'importacao', data: '2026-11-05', busca: 'porc', pagina: 1 })
      )
    );
  });

  it('mostra o histórico do produto e exclui só a vigência futura', async () => {
    await carregar();
    fireEvent.click(within(screen.getByText('Porcelanato 60x60').closest('tr')).getByRole('button', { name: 'Histórico' }));
    const dialogo = screen.getByRole('dialog', { name: 'Histórico de preços — Porcelanato 60x60' });

    const futura = (await within(dialogo).findByText('01/11/2026')).closest('tr');
    expect(within(futura).getByText('R$ 125,00')).toBeInTheDocument();
    expect(within(futura).getByText('reajuste do fornecedor')).toBeInTheDocument();
    expect(within(futura).getByText('Futura')).toBeInTheDocument();
    const vigente = within(dialogo).getByText('01/10/2026').closest('tr');
    expect(within(vigente).queryByRole('button', { name: 'Excluir' })).toBeNull();
    expect(svc.listarHistoricoPrecos).toHaveBeenCalledWith(expect.objectContaining({ produto: 'prod-por', modelo: 'pronta_entrega' }));

    fireEvent.click(within(futura).getByRole('button', { name: 'Excluir' }));
    fireEvent.click(within(futura).getByRole('button', { name: 'Confirmar exclusão' }));

    await waitFor(() => expect(svc.excluirPreco).toHaveBeenCalledWith('tp-2'));
    await waitFor(() => expect(svc.listarHistoricoPrecos).toHaveBeenCalledTimes(2));
  });

  it('lança uma nova vigência para o produto da linha', async () => {
    await carregar();
    fireEvent.click(within(screen.getByText('Porcelanato 60x60').closest('tr')).getByRole('button', { name: 'Novo preço' }));
    const dialogo = screen.getByRole('dialog', { name: 'Novo preço — Porcelanato 60x60' });
    expect(within(dialogo).getByLabelText('Vigente a partir de *')).toHaveValue('2026-10-19');
    expect(within(dialogo).getByLabelText('Modelo *')).toHaveValue('pronta_entrega');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Lançar' }));
    expect(await within(dialogo).findByText('Informe um preço maior que zero.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Preço *'), { target: { value: '125,00' } });
    fireEvent.change(within(dialogo).getByLabelText('Vigente a partir de *'), { target: { value: '2026-11-01' } });
    fireEvent.change(within(dialogo).getByLabelText('Observação'), { target: { value: ' reajuste do fornecedor ' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Lançar' }));

    await waitFor(() =>
      expect(svc.lancarPreco).toHaveBeenCalledWith({
        produto_id: 'prod-por',
        modelo: 'pronta_entrega',
        preco_centavos: 12500,
        vigente_de: '2026-11-01',
        observacao: 'reajuste do fornecedor',
      })
    );
    await waitFor(() => expect(svc.listarPrecosVigentes).toHaveBeenCalledTimes(2));
  });

  it('lança pelo botão geral escolhendo o produto e mostra a recusa de início repetido', async () => {
    svc.lancarPreco.mockRejectedValueOnce(new ErroApi(409, 'já existe preço deste produto e modelo com início nesta data'));
    await carregar();
    fireEvent.click(screen.getByRole('button', { name: /Lançar preço/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Novo preço' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Lançar' }));
    expect(await within(dialogo).findByText('Escolha o produto.')).toBeInTheDocument();

    await within(dialogo).findByRole('option', { name: 'Porcelanato 60x60 (POR-60)' });
    fireEvent.change(within(dialogo).getByLabelText('Produto *'), { target: { value: 'prod-por' } });
    fireEvent.change(within(dialogo).getByLabelText('Preço *'), { target: { value: '120,00' } });
    fireEvent.change(within(dialogo).getByLabelText('Vigente a partir de *'), { target: { value: '2026-10-01' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Lançar' }));

    expect(await within(dialogo).findByText('já existe preço deste produto e modelo com início nesta data')).toBeInTheDocument();
    expect(svc.lancarPreco).toHaveBeenCalledWith(expect.objectContaining({ produto_id: 'prod-por', observacao: null }));
  });

  it('quem não é administrador só consulta', async () => {
    perfil(false);
    await carregar();

    expect(screen.queryByRole('button', { name: /Lançar preço/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Novo preço' })).toBeNull();
    fireEvent.click(within(screen.getByText('Porcelanato 60x60').closest('tr')).getByRole('button', { name: 'Histórico' }));
    const dialogo = screen.getByRole('dialog', { name: 'Histórico de preços — Porcelanato 60x60' });
    await within(dialogo).findByText('01/11/2026');
    expect(within(dialogo).queryByRole('button', { name: 'Excluir' })).toBeNull();
  });

  it('mostra o vazio e o erro com nova tentativa', async () => {
    svc.listarPrecosVigentes
      .mockRejectedValueOnce(new ErroApi(403, 'perfil sem permissão para ver a tabela de preços'))
      .mockResolvedValue({ dados: [] });
    render(<TabelaPrecos />);

    expect(await screen.findByText('perfil sem permissão para ver a tabela de preços')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhum produto encontrado.')).toBeInTheDocument();
  });
});
