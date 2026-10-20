import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as categoriasService from '../../services/categoriasFinanceiras';
import * as empresasService from '../../services/empresas';
import * as fornecedoresService from '../../services/fornecedores';
import * as importacoesService from '../../services/importacoes';
import * as locaisService from '../../services/locais';
import * as produtosService from '../../services/produtos';
import ImportacaoDetalhe from './ImportacaoDetalhe';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/locais', () => ({ listarTodosLocais: vi.fn() }));
vi.mock('../../services/categoriasFinanceiras', () => ({ obterArvoreFinanceira: vi.fn() }));
vi.mock('../../services/fornecedores', () => ({ listarFornecedores: vi.fn(), obterFornecedor: vi.fn() }));
vi.mock('../../services/produtos', () => ({ listarProdutos: vi.fn(), obterProduto: vi.fn() }));
vi.mock('../../services/pedidos', () => ({ listarTodasPendencias: vi.fn(async () => []) }));
vi.mock('../../services/importacoes', () => ({
  obterAlertasImportacao: vi.fn(async () => ({ dados: { sem_importacao: [] } })),
  obterImportacao: vi.fn(),
  listarHistoricoImportacao: vi.fn(),
  obterCustoPrevisto: vi.fn(),
  incluirParcela: vi.fn(),
  atualizarParcela: vi.fn(),
  removerParcela: vi.fn(),
  fecharCambio: vi.fn(),
  reabrirParcela: vi.fn(),
  lancarCusto: vi.fn(),
  cancelarCusto: vi.fn(),
}));

const svc = importacoesService;

const SHANGHAI = { id: 'for-sh', nome: 'Shanghai Tiles Co', nome_fantasia: 'Shanghai Tiles', moeda_padrao: 'USD' };
const DESPACHANTE = { id: 'for-desp', nome: 'Despachos Paraíba', nome_fantasia: '', moeda_padrao: 'BRL' };

const SINAL = {
  id: 'par-1',
  descricao: 'Sinal 30%',
  valor_moeda_centesimos: 135000,
  vencimento_previsto: '2026-10-20',
  status: 'cambio_fechado',
  cambio_micro: 5432100,
  valor_centavos: 733334,
  vencimento: '2026-10-20',
  solicitacao_id: 'sol-1',
  status_conta_a_pagar: 'pendente_aprovacao',
};

const SALDO = {
  id: 'par-2',
  descricao: 'Saldo 70%',
  valor_moeda_centesimos: 315000,
  vencimento_previsto: '2026-12-01',
  status: 'aberta',
  cambio_micro: null,
  valor_centavos: null,
  vencimento: null,
  solicitacao_id: null,
  status_conta_a_pagar: null,
};

const DESPACHO = {
  id: 'cus-1',
  tipo: 'despachante',
  descricao: 'Despacho da DI 778',
  fornecedor_id: 'for-desp',
  valor_centavos: 250000,
  vencimento: '2026-11-10',
  compoe_custo: true,
  posterior: false,
  solicitacao_id: 'sol-2',
  status_conta_a_pagar: 'rejeitado',
  cancelado: false,
};

const ICMS = {
  ...DESPACHO,
  id: 'cus-2',
  tipo: 'icms',
  descricao: 'ICMS da DI',
  fornecedor_id: 'for-sh',
  valor_centavos: 90000,
  compoe_custo: false,
  solicitacao_id: 'sol-3',
  status_conta_a_pagar: 'pendente_aprovacao',
};

const EMBARCADA = {
  id: 'imp-3',
  empresa_id: 'emp-mia',
  numero: 3,
  fornecedor_id: 'for-sh',
  moeda: 'USD',
  status: 'embarcada',
  valor_total_moeda_centesimos: 500000,
  versao: 5,
  itens: [{ id: 'item-1', produto_id: 'prod-porc', quantidade: 1000, valor_moeda_centesimos: 500000 }],
  parcelas: [SINAL, SALDO],
  custos: [DESPACHO, ICMS],
  alocacoes: [],
};

const PREVISTO = {
  valor_moeda_centesimos: 500000,
  parcelas_fechadas_moeda_centesimos: 135000,
  parcelas_fechadas_centavos: 733334,
  sem_cambio_fechado_moeda_centesimos: 365000,
  cambio_informado_micro: 5500000,
  cambio_medio_micro: 5481668,
  valor_mercadoria_centavos: 2740834,
  custos_centavos: 250000,
  custos_fora_do_rateio_centavos: 90000,
  itens: [
    {
      item_id: 'item-1',
      produto_id: 'prod-porc',
      quantidade: 1000,
      valor_moeda_centesimos: 500000,
      valor_mercadoria_centavos: 2740834,
      custos_centavos: 250000,
      custo_total_centavos: 2990834,
      custo_unitario_centavos: 2991,
    },
  ],
};

const ARVORE = [
  {
    id: 'raiz-compras',
    nome: 'Compras',
    natureza: 'despesa',
    subcategorias: [{ id: 'cat-mercadoria', nome: 'Mercadoria importada', lancavel: true }],
  },
];

function perfil({ financeiro = true } = {}) {
  useAutenticacao.mockReturnValue({ comercial: !financeiro, financeiro, administrador: false });
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

function linhaDe(texto) {
  return screen.getByText(texto).closest('tr');
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'));
  perfil();
  empresasService.listarTodasEmpresas.mockResolvedValue([]);
  locaisService.listarTodosLocais.mockResolvedValue([]);
  categoriasService.obterArvoreFinanceira.mockResolvedValue({ dados: ARVORE });
  fornecedoresService.obterFornecedor.mockImplementation(async (id) => ({
    dados: [SHANGHAI, DESPACHANTE].find((fornecedor) => fornecedor.id === id),
  }));
  fornecedoresService.listarFornecedores.mockResolvedValue({ dados: [SHANGHAI, DESPACHANTE] });
  produtosService.obterProduto.mockResolvedValue({ dados: { id: 'prod-porc', nome: 'Porcelanato 60x60' } });
  svc.listarHistoricoImportacao.mockResolvedValue({ dados: [] });
  svc.obterCustoPrevisto.mockResolvedValue({ dados: PREVISTO });
  ['incluirParcela', 'atualizarParcela', 'removerParcela', 'fecharCambio', 'reabrirParcela', 'lancarCusto', 'cancelarCusto'].forEach(
    (nome) => svc[nome].mockResolvedValue({ dados: {} })
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Parcelas da importação', () => {
  it('mostra as parcelas com câmbio, valor em reais, conta a pagar e a soma contra os itens', async () => {
    await carregar();

    const sinal = linhaDe('Sinal 30%');
    expect(within(sinal).getByText('Câmbio fechado')).toBeInTheDocument();
    expect(within(sinal).getByText('5,432100')).toBeInTheDocument();
    expect(within(sinal).getByText('R$ 7.333,34')).toBeInTheDocument();
    expect(within(sinal).getByRole('link', { name: 'Ver conta' })).toHaveAttribute('href', '/solicitacoes/sol-1');
    expect(within(sinal).getByText('Pendente de aprovação')).toBeInTheDocument();
    expect(within(sinal).queryByRole('button', { name: 'Reabrir' })).toBeNull();
    expect(within(linhaDe('Saldo 70%')).getByRole('button', { name: 'Fechar câmbio' })).toBeInTheDocument();
    expect(screen.getByText(/US\$\s?4\.500,00/, { selector: 'strong' })).toBeInTheDocument();
  });

  it('inclui parcela conferindo o que cabe nos itens e envia a versão', async () => {
    await carregar();
    fireEvent.click(screen.getByRole('button', { name: /Nova parcela/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Nova parcela da importação 3' });
    fireEvent.change(within(dialogo).getByLabelText('Descrição *'), { target: { value: 'Extra' } });
    fireEvent.change(within(dialogo).getByLabelText('Valor em USD *'), { target: { value: '600,00' } });
    fireEvent.change(within(dialogo).getByLabelText('Vencimento previsto *'), { target: { value: '2026-12-10' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Incluir parcela' }));
    expect(await within(dialogo).findByText(/cabe US\$\s?500,00/)).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Valor em USD *'), { target: { value: '500' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Incluir parcela' }));

    await waitFor(() =>
      expect(svc.incluirParcela).toHaveBeenCalledWith('imp-3', {
        versao: 5,
        descricao: 'Extra',
        valor_moeda_centesimos: 50000,
        vencimento_previsto: '2026-12-10',
      })
    );
    await waitFor(() => expect(svc.obterImportacao).toHaveBeenCalledTimes(2));
  });

  it('altera e remove a parcela aberta com a versão', async () => {
    await carregar();
    fireEvent.click(within(linhaDe('Saldo 70%')).getByRole('button', { name: 'Alterar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Alterar parcela "Saldo 70%"' });
    expect(within(dialogo).getByLabelText('Valor em USD *')).toHaveValue('3150,00');
    fireEvent.change(within(dialogo).getByLabelText('Valor em USD *'), { target: { value: '3.650,00' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar parcela' }));
    await waitFor(() =>
      expect(svc.atualizarParcela).toHaveBeenCalledWith('imp-3', 'par-2', {
        versao: 5,
        descricao: 'Saldo 70%',
        valor_moeda_centesimos: 365000,
        vencimento_previsto: '2026-12-01',
      })
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(within(linhaDe('Saldo 70%')).getByRole('button', { name: 'Remover' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover parcela' }));
    await waitFor(() => expect(svc.removerParcela).toHaveBeenCalledWith('imp-3', 'par-2', 5));
  });

  it('fecha o câmbio com seis casas, mostra o valor em reais e envia a categoria', async () => {
    await carregar();
    fireEvent.click(within(linhaDe('Saldo 70%')).getByRole('button', { name: 'Fechar câmbio' }));
    const dialogo = screen.getByRole('dialog', { name: 'Fechar câmbio da parcela "Saldo 70%"' });
    expect(within(dialogo).getByLabelText('Vencimento da conta *')).toHaveValue('2026-12-01');
    fireEvent.change(within(dialogo).getByLabelText('Câmbio (R$ por USD) *'), { target: { value: '5,1234567' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Fechar câmbio' }));
    expect(await within(dialogo).findByText(/até seis casas/)).toBeInTheDocument();
    expect(within(dialogo).getByText('Escolha a categoria de despesa.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Câmbio (R$ por USD) *'), { target: { value: '5,4321' } });
    expect(within(dialogo).getByText('R$ 17.111,12')).toBeInTheDocument();
    await within(dialogo).findByRole('option', { name: 'Mercadoria importada' });
    fireEvent.change(within(dialogo).getByLabelText('Categoria de despesa *'), { target: { value: 'cat-mercadoria' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Fechar câmbio' }));

    await waitFor(() =>
      expect(svc.fecharCambio).toHaveBeenCalledWith('imp-3', 'par-2', {
        versao: 5,
        cambio_micro: 5432100,
        vencimento: '2026-12-01',
        categoria_financeira_id: 'cat-mercadoria',
      })
    );
  });

  it('na importação em real fixa o câmbio 1', async () => {
    await carregar({ ...EMBARCADA, moeda: 'BRL' });
    fireEvent.click(within(linhaDe('Saldo 70%')).getByRole('button', { name: 'Fechar câmbio' }));
    const dialogo = screen.getByRole('dialog');

    expect(within(dialogo).getByLabelText('Câmbio (R$ por BRL) *')).toHaveValue('1,00');
    expect(within(dialogo).getByLabelText('Câmbio (R$ por BRL) *')).toBeDisabled();
    expect(within(dialogo).getByText('R$ 3.150,00')).toBeInTheDocument();
  });

  it('reabre a parcela de conta encerrada e mostra a recusa da API', async () => {
    svc.reabrirParcela.mockRejectedValue(new ErroApi(409, 'cancele ou rejeite antes a conta a pagar da parcela'));
    await carregar({ ...EMBARCADA, parcelas: [{ ...SINAL, status_conta_a_pagar: 'cancelado' }, SALDO] });
    fireEvent.click(within(linhaDe('Sinal 30%')).getByRole('button', { name: 'Reabrir' }));
    const dialogo = screen.getByRole('dialog', { name: 'Reabrir parcela "Sinal 30%"' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reabrir parcela' }));

    expect(await within(dialogo).findByText('cancele ou rejeite antes a conta a pagar da parcela')).toBeInTheDocument();
    expect(svc.reabrirParcela).toHaveBeenCalledWith('imp-3', 'par-1', 5);
  });

  it('não oferece escrita na importação cancelada', async () => {
    await carregar({ ...EMBARCADA, status: 'cancelada' });

    expect(screen.queryByRole('button', { name: /Nova parcela/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Lançar custo/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Fechar câmbio' })).toBeNull();
    expect(screen.queryByText('Custo previsto')).toBeNull();
  });
});

describe('Custos de nacionalização', () => {
  it('lista os custos com fornecedor, rateio e conta, e cancela só o de conta encerrada', async () => {
    await carregar();

    const despacho = linhaDe('Despacho da DI 778');
    expect(await within(despacho).findByText('Despachos Paraíba')).toBeInTheDocument();
    expect(within(despacho).getByText('R$ 2.500,00')).toBeInTheDocument();
    expect(within(despacho).getByText('Compõe')).toBeInTheDocument();
    expect(within(despacho).getByText('Rejeitado')).toBeInTheDocument();
    const icms = linhaDe('ICMS da DI');
    expect(within(icms).getByText('Fora do rateio')).toBeInTheDocument();
    expect(within(icms).queryByRole('button', { name: 'Cancelar' })).toBeNull();
    expect(screen.getByText(/fora do rateio: R\$\s900,00/)).toBeInTheDocument();

    fireEvent.click(within(despacho).getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar custo' }));
    await waitFor(() => expect(svc.cancelarCusto).toHaveBeenCalledWith('imp-3', 'cus-1', 5));
  });

  it('lança o custo com tipo, fornecedor, valor, rateio e categoria', async () => {
    await carregar();
    fireEvent.click(screen.getByRole('button', { name: /Lançar custo/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Lançar custo da importação 3' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Lançar custo' }));
    expect(await within(dialogo).findByText('Escolha o tipo do custo.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Escolha a quem se paga o custo.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Tipo *'), { target: { value: 'pis' } });
    await within(dialogo).findByRole('option', { name: 'Despachos Paraíba' });
    fireEvent.change(within(dialogo).getByLabelText('A quem se paga *'), { target: { value: 'for-desp' } });
    fireEvent.change(within(dialogo).getByLabelText('Valor em reais *'), { target: { value: '1.234,56' } });
    fireEvent.change(within(dialogo).getByLabelText('Vencimento *'), { target: { value: '2026-11-30' } });
    await within(dialogo).findByRole('option', { name: 'Mercadoria importada' });
    fireEvent.change(within(dialogo).getByLabelText('Categoria de despesa *'), { target: { value: 'cat-mercadoria' } });
    fireEvent.click(within(dialogo).getByLabelText('Compõe o custo do produto'));
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Lançar custo' }));

    await waitFor(() =>
      expect(svc.lancarCusto).toHaveBeenCalledWith('imp-3', {
        versao: 5,
        tipo: 'pis',
        descricao: '',
        fornecedor_id: 'for-desp',
        valor_centavos: 123456,
        vencimento: '2026-11-30',
        compoe_custo: false,
        categoria_financeira_id: 'cat-mercadoria',
      })
    );
  });

  it('depois do recebimento lança como posterior e não cancela o custo que entrou no lote', async () => {
    await carregar({
      ...EMBARCADA,
      status: 'recebida',
      custos: [{ ...DESPACHO, status_conta_a_pagar: 'cancelado' }, { ...ICMS, posterior: true, status_conta_a_pagar: 'rejeitado' }],
    });

    expect(within(linhaDe('Despacho da DI 778')).queryByRole('button', { name: 'Cancelar' })).toBeNull();
    expect(within(linhaDe('ICMS da DI')).getByText('Posterior')).toBeInTheDocument();
    expect(within(linhaDe('ICMS da DI')).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Lançar custo/ }));
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByLabelText('Compõe o custo do produto')).toBeDisabled();
    expect(within(dialogo).getByLabelText('Compõe o custo do produto')).not.toBeChecked();
    expect(within(dialogo).getByText(/entra como posterior/)).toBeInTheDocument();
  });
});

describe('Custo previsto', () => {
  it('calcula sem câmbio, mostra o pedido de câmbio da API e recalcula com o informado', async () => {
    svc.obterCustoPrevisto
      .mockRejectedValueOnce(
        new ErroApi(400, 'erro de validação: informe o câmbio para os 365000 centésimos de USD ainda sem câmbio fechado')
      )
      .mockResolvedValue({ dados: PREVISTO });
    await carregar();

    expect(await screen.findByText(/informe o câmbio para os 365000 centésimos/)).toBeInTheDocument();
    expect(svc.obterCustoPrevisto).toHaveBeenCalledWith('imp-3', expect.objectContaining({ cambio_micro: '' }));

    fireEvent.change(screen.getByLabelText('Câmbio para o que falta fechar'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Calcular' }));
    expect(await screen.findByText(/Câmbio inválido/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Câmbio para o que falta fechar'), { target: { value: '5,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Calcular' }));

    await waitFor(() =>
      expect(svc.obterCustoPrevisto).toHaveBeenLastCalledWith('imp-3', expect.objectContaining({ cambio_micro: 5500000 }))
    );
    expect(await screen.findByText('5,481668')).toBeInTheDocument();
    expect(screen.getByText('R$ 29,91')).toBeInTheDocument();
    expect(screen.getByText('R$ 29.908,34')).toBeInTheDocument();
    expect(screen.queryByText(/Câmbio inválido/)).toBeNull();
  });

  it('não aparece para o comercial, assim como parcelas e custos', async () => {
    perfil({ financeiro: false });
    const { parcelas: _parcelas, custos: _custos, ...semValores } = EMBARCADA;
    await carregar(semValores);

    expect(screen.queryByText('Parcelas ao fornecedor')).toBeNull();
    expect(screen.queryByText('Custos de nacionalização')).toBeNull();
    expect(screen.queryByText('Custo previsto')).toBeNull();
    expect(svc.obterCustoPrevisto).not.toHaveBeenCalled();
  });
});
