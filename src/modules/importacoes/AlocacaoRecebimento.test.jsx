import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as empresasService from '../../services/empresas';
import * as fornecedoresService from '../../services/fornecedores';
import * as importacoesService from '../../services/importacoes';
import * as locaisService from '../../services/locais';
import * as pedidosService from '../../services/pedidos';
import * as produtosService from '../../services/produtos';
import ImportacaoDetalhe from './ImportacaoDetalhe';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/locais', () => ({ listarTodosLocais: vi.fn() }));
vi.mock('../../services/categoriasFinanceiras', () => ({ obterArvoreFinanceira: vi.fn(async () => ({ dados: [] })) }));
vi.mock('../../services/fornecedores', () => ({ listarFornecedores: vi.fn(), obterFornecedor: vi.fn() }));
vi.mock('../../services/produtos', () => ({ listarProdutos: vi.fn(), obterProduto: vi.fn() }));
vi.mock('../../services/pedidos', () => ({ listarTodasPendencias: vi.fn() }));
vi.mock('../../services/importacoes', () => ({
  obterImportacao: vi.fn(),
  listarHistoricoImportacao: vi.fn(),
  obterCustoPrevisto: vi.fn(),
  obterAlertasImportacao: vi.fn(),
  definirAlocacoes: vi.fn(),
  receberImportacao: vi.fn(),
}));

const svc = importacoesService;
const CONFLITO = 'a importação foi alterada por outra pessoa; recarregue e tente de novo';

const PRODUTOS = {
  'prod-porc': 'Porcelanato 60x60',
  'prod-rev': 'Revestimento 30x60',
};

const ITEM_PORC = { id: 'item-1', produto_id: 'prod-porc', quantidade: 1000, valor_moeda_centesimos: 400000 };
const ITEM_REV = { id: 'item-2', produto_id: 'prod-rev', quantidade: 200, valor_moeda_centesimos: 100000 };

const EMBARCADA = {
  id: 'imp-3',
  empresa_id: 'emp-mia',
  numero: 3,
  fornecedor_id: 'for-sh',
  moeda: 'USD',
  status: 'embarcada',
  valor_total_moeda_centesimos: 500000,
  embarcada_em: '2026-10-01',
  versao: 6,
  itens: [ITEM_PORC, ITEM_REV],
  parcelas: [],
  custos: [],
  alocacoes: [{ importacao_item_id: 'item-1', pedido_item_id: 'pi-12', quantidade: 600, reservada: null }],
};

const DESEMBARACADA = {
  ...EMBARCADA,
  status: 'desembaracada',
  chegada_em: '2026-10-15',
  desembaracada_em: '2026-10-16',
  parcelas: [
    {
      id: 'par-1',
      descricao: 'Sinal 30%',
      valor_moeda_centesimos: 150000,
      status: 'cambio_fechado',
      status_conta_a_pagar: 'pago',
    },
  ],
};

const PENDENCIAS = [
  { pedido_id: 'ped-12', numero: 12, pedido_item_id: 'pi-12', produto_id: 'prod-porc', prazo_limite: '2027-02-16' },
  { pedido_id: 'ped-15', numero: 15, pedido_item_id: 'pi-15', produto_id: 'prod-porc', prazo_limite: null },
];

const SEM_IMPORTACAO = [
  {
    pedido_id: 'ped-12',
    pedido_numero: 12,
    pedido_item_id: 'pi-12',
    produto_id: 'prod-porc',
    prazo_limite: '2027-02-16',
    restante: 900,
    reservado: 0,
    alocado: 600,
    sem_cobertura: 300,
  },
  {
    pedido_id: 'ped-15',
    pedido_numero: 15,
    pedido_item_id: 'pi-15',
    produto_id: 'prod-porc',
    prazo_limite: null,
    restante: 100,
    reservado: 0,
    alocado: 0,
    sem_cobertura: 100,
  },
  {
    pedido_id: 'ped-20',
    pedido_numero: 20,
    pedido_item_id: 'pi-20',
    produto_id: 'prod-outro',
    prazo_limite: null,
    restante: 5,
    reservado: 0,
    alocado: 0,
    sem_cobertura: 5,
  },
];

function perfil({ comercial = false, financeiro = true } = {}) {
  useAutenticacao.mockReturnValue({ comercial, financeiro, administrador: false });
}

async function carregar(importacao = EMBARCADA) {
  svc.obterImportacao.mockResolvedValue({ dados: importacao });
  render(
    <MemoryRouter initialEntries={['/importacoes/imp-3']}>
      <Routes>
        <Route path="/importacoes/:id" element={<ImportacaoDetalhe />} />
      </Routes>
    </MemoryRouter>
  );
  await screen.findByRole('heading', { name: /Importação 3/ });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'));
  perfil();
  empresasService.listarTodasEmpresas.mockResolvedValue([]);
  locaisService.listarTodosLocais.mockImplementation(async ({ empresa } = {}) =>
    [
      { id: 'loc-cd', nome: 'CD Cabedelo', empresa_id: 'emp-mia', ativo: true },
      { id: 'loc-gig', nome: 'Depósito Gigante', empresa_id: 'emp-gig', ativo: true },
    ].filter((local) => !empresa || local.empresa_id === empresa)
  );
  fornecedoresService.obterFornecedor.mockResolvedValue({ dados: { id: 'for-sh', nome: 'Shanghai Tiles' } });
  produtosService.obterProduto.mockImplementation(async (id) => ({ dados: { id, nome: PRODUTOS[id] } }));
  svc.listarHistoricoImportacao.mockResolvedValue({ dados: [] });
  svc.obterCustoPrevisto.mockResolvedValue({ dados: null });
  svc.obterAlertasImportacao.mockResolvedValue({ dados: { prazo_em_risco: [], sem_previsao: [], sem_importacao: SEM_IMPORTACAO } });
  pedidosService.listarTodasPendencias.mockResolvedValue(PENDENCIAS);
  svc.definirAlocacoes.mockResolvedValue({ dados: {} });
  svc.receberImportacao.mockResolvedValue({ dados: {} });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Alocação de pedidos', () => {
  it('mostra o pedido alocado com link e prazo, consultando a empresa da importação', async () => {
    await carregar();

    const link = await screen.findByRole('link', { name: 'Pedido 12' });
    expect(link).toHaveAttribute('href', '/pedidos/ped-12');
    const linha = link.closest('tr');
    expect(within(linha).getByText('16/02/2027')).toBeInTheDocument();
    expect(within(linha).getByText('600')).toBeInTheDocument();
    expect(pedidosService.listarTodasPendencias).toHaveBeenCalledWith(expect.objectContaining({ empresa: 'emp-mia' }));
    expect(svc.obterAlertasImportacao).toHaveBeenCalledWith(expect.objectContaining({ empresa: 'emp-mia' }));
  });

  it('o comercial aloca pelos pedidos sem cobertura do mesmo produto e envia a versão', async () => {
    perfil({ comercial: true, financeiro: false });
    await carregar();
    await screen.findByRole('link', { name: 'Pedido 12' });
    fireEvent.click(screen.getByRole('button', { name: 'Alocar pedidos' }));
    const dialogo = screen.getByRole('dialog', { name: 'Alocar pedidos à importação 3' });

    expect(within(dialogo).queryByText('Pedido 20')).toBeNull();
    const doze = within(dialogo).getByLabelText('Alocar Porcelanato 60x60 ao pedido 12');
    expect(doze).toHaveValue(600);
    expect(within(doze.closest('tr')).getByText('900')).toBeInTheDocument();
    fireEvent.change(doze, { target: { value: '950' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar alocações' }));
    expect(await within(dialogo).findByText('Pedido 12: passa do que falta cobrir (900).')).toBeInTheDocument();

    fireEvent.change(doze, { target: { value: '0' } });
    fireEvent.change(within(dialogo).getByLabelText('Alocar Porcelanato 60x60 ao pedido 15'), { target: { value: '80' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar alocações' }));

    await waitFor(() =>
      expect(svc.definirAlocacoes).toHaveBeenCalledWith('imp-3', {
        versao: 6,
        alocacoes: [{ importacao_item_id: 'item-1', pedido_item_id: 'pi-15', quantidade: 80 }],
      })
    );
  });

  it('confere a soma contra a quantidade do item e trata o conflito de versão', async () => {
    svc.definirAlocacoes.mockRejectedValue(new ErroApi(409, CONFLITO));
    await carregar({ ...EMBARCADA, itens: [{ ...ITEM_PORC, quantidade: 650 }, ITEM_REV] });
    await screen.findByRole('link', { name: 'Pedido 12' });
    fireEvent.click(screen.getByRole('button', { name: 'Alocar pedidos' }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText('Alocar Porcelanato 60x60 ao pedido 15'), { target: { value: '100' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar alocações' }));
    expect(
      await within(dialogo).findByText('Porcelanato 60x60: as alocações passam da quantidade do item (650).')
    ).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Alocar Porcelanato 60x60 ao pedido 15'), { target: { value: '50' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar alocações' }));
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Recarregar dados' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(svc.obterImportacao).toHaveBeenCalledTimes(2));
  });

  it('depois do recebimento mostra o reservado e não deixa alocar', async () => {
    await carregar({
      ...DESEMBARACADA,
      status: 'recebida',
      alocacoes: [{ importacao_item_id: 'item-1', pedido_item_id: 'pi-12', quantidade: 600, reservada: 450 }],
    });

    const linha = (await screen.findByRole('link', { name: 'Pedido 12' })).closest('tr');
    expect(within(linha).getByText('450')).toHaveClass('importacoes-alerta');
    expect(screen.queryByRole('button', { name: 'Alocar pedidos' })).toBeNull();
  });
});

describe('Recebimento', () => {
  it('recebe com local da empresa, câmbio do que falta fechar e as quantidades recebidas', async () => {
    await carregar(DESEMBARACADA);
    fireEvent.click(screen.getByRole('button', { name: 'Receber' }));
    const dialogo = screen.getByRole('dialog', { name: 'Receber importação 3' });
    expect(within(dialogo).getByText(/US\$\s?3\.500,00 ainda sem câmbio fechado/)).toBeInTheDocument();
    await within(dialogo).findByRole('option', { name: 'CD Cabedelo' });
    expect(within(dialogo).queryByRole('option', { name: 'Depósito Gigante' })).toBeNull();
    expect(locaisService.listarTodosLocais).toHaveBeenCalledWith(expect.objectContaining({ empresa: 'emp-mia', ativos: true }));

    fireEvent.change(within(dialogo).getByLabelText('Recebida em *'), { target: { value: '2026-10-10' } });
    fireEvent.change(within(dialogo).getByLabelText('Recebida de Porcelanato 60x60'), { target: { value: '1001' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Receber no estoque' }));
    expect(await within(dialogo).findByText('O recebimento não pode ser antes do desembaraço (16/10/2026).')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe o câmbio.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Porcelanato 60x60: recebida de 0 a 1000.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Recebida em *'), { target: { value: '2026-10-18' } });
    fireEvent.change(within(dialogo).getByLabelText('Local de estoque *'), { target: { value: 'loc-cd' } });
    fireEvent.change(within(dialogo).getByLabelText('Câmbio do que falta fechar *'), { target: { value: '5,5' } });
    fireEvent.change(within(dialogo).getByLabelText('Recebida de Porcelanato 60x60'), { target: { value: '950' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Receber no estoque' }));

    await waitFor(() =>
      expect(svc.receberImportacao).toHaveBeenCalledWith('imp-3', {
        versao: 6,
        recebida_em: '2026-10-18',
        local_id: 'loc-cd',
        cambio_micro: 5500000,
        itens: [
          { item_id: 'item-1', quantidade_recebida: 950 },
          { item_id: 'item-2', quantidade_recebida: 200 },
        ],
      })
    );
    await waitFor(() => expect(svc.obterImportacao).toHaveBeenCalledTimes(2));
  });

  it('dispensa o câmbio com tudo fechado, recusa nada recebido e avisa a conta que bloqueia', async () => {
    svc.receberImportacao.mockRejectedValue(new ErroApi(409, 'estoque do produto alterado por outra operação, recarregue e tente novamente'));
    await carregar({
      ...DESEMBARACADA,
      parcelas: [
        { ...DESEMBARACADA.parcelas[0], valor_moeda_centesimos: 500000 },
        { id: 'par-9', descricao: 'Antiga', valor_moeda_centesimos: 1, status: 'cambio_fechado', status_conta_a_pagar: 'rejeitado' },
      ],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Receber' }));
    const dialogo = screen.getByRole('dialog');

    expect(within(dialogo).getByText(/bloqueia o recebimento: parcela "Antiga"/)).toBeInTheDocument();
    expect(within(dialogo).getByText('Todas as parcelas cobrem os itens com câmbio fechado.')).toBeInTheDocument();
    await within(dialogo).findByRole('option', { name: 'CD Cabedelo' });
    fireEvent.change(within(dialogo).getByLabelText('Local de estoque *'), { target: { value: 'loc-cd' } });
    fireEvent.change(within(dialogo).getByLabelText('Recebida de Porcelanato 60x60'), { target: { value: '0' } });
    fireEvent.change(within(dialogo).getByLabelText('Recebida de Revestimento 30x60'), { target: { value: '0' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Receber no estoque' }));
    expect(await within(dialogo).findByText(/Nada foi recebido/)).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Recebida de Revestimento 30x60'), { target: { value: '200' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Receber no estoque' }));

    await waitFor(() => expect(svc.receberImportacao).toHaveBeenCalled());
    expect(svc.receberImportacao.mock.calls[0][1].cambio_micro).toBeNull();
    expect(await within(dialogo).findByRole('button', { name: 'Recarregar dados' })).toBeInTheDocument();
  });

  it('o comercial não recebe', async () => {
    perfil({ comercial: true, financeiro: false });
    await carregar(DESEMBARACADA);

    expect(screen.queryByRole('button', { name: 'Receber' })).toBeNull();
  });
});
