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
import * as produtosService from '../../services/produtos';
import ImportacaoDetalhe from './ImportacaoDetalhe';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/locais', () => ({ listarTodosLocais: vi.fn() }));
vi.mock('../../services/fornecedores', () => ({ listarFornecedores: vi.fn(), obterFornecedor: vi.fn() }));
vi.mock('../../services/produtos', () => ({ listarProdutos: vi.fn(), obterProduto: vi.fn() }));
vi.mock('../../services/importacoes', () => ({
  obterImportacao: vi.fn(),
  atualizarImportacao: vi.fn(),
  embarcarImportacao: vi.fn(),
  desembaracarImportacao: vi.fn(),
  cancelarImportacao: vi.fn(),
  listarHistoricoImportacao: vi.fn(),
}));

const svc = importacoesService;
const CONFLITO = 'a importação foi alterada por outra pessoa; recarregue e tente de novo';

const ABERTA = {
  id: 'imp-3',
  empresa_id: 'emp-mia',
  numero: 3,
  fornecedor_id: 'for-sh',
  referencia: 'PI-2026-001',
  moeda: 'USD',
  status: 'aberta',
  valor_total_moeda_centesimos: 450000,
  embarque_previsto: '2026-11-05',
  embarcada_em: null,
  chegada_prevista: '2026-12-20',
  chegada_em: null,
  desembaracada_em: null,
  documento_embarque: null,
  declaracao: null,
  observacoes: 'Container de 40 pés',
  cancelada_motivo: null,
  versao: 2,
  recebida_em: null,
  local_recebimento_id: null,
  itens: [
    {
      id: 'item-1',
      produto_id: 'prod-porc',
      quantidade: 1000,
      valor_moeda_centesimos: 450000,
      quantidade_recebida: null,
      movimento_id: null,
    },
  ],
  parcelas: [],
  custos: [],
  alocacoes: [],
};

const EMBARCADA = {
  ...ABERTA,
  status: 'embarcada',
  embarque_previsto: null,
  embarcada_em: '2026-10-09',
  chegada_prevista: '2026-11-18',
  documento_embarque: 'BL-778',
  versao: 3,
};

const RECEBIDA = {
  ...EMBARCADA,
  status: 'recebida',
  chegada_em: '2026-10-15',
  desembaracada_em: '2026-10-16',
  declaracao: '26/0001234-5',
  recebida_em: '2026-10-18',
  local_recebimento_id: 'loc-cd',
  cambio_micro: 5500000,
  itens: [{ ...ABERTA.itens[0], quantidade_recebida: 950, custo_unitario_centavos: 2859, movimento_id: 'mov-1' }],
};

function perfil({ comercial = false, financeiro = true } = {}) {
  useAutenticacao.mockReturnValue({ comercial, financeiro, administrador: false });
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/importacoes/imp-3']}>
      <Routes>
        <Route path="/importacoes/:id" element={<ImportacaoDetalhe />} />
      </Routes>
    </MemoryRouter>
  );
}

async function carregar(importacao = ABERTA) {
  svc.obterImportacao.mockResolvedValue({ dados: importacao });
  renderizar();
  await screen.findByRole('heading', { name: /Importação 3/ });
}

function botao(nome) {
  return screen.getByRole('button', { name: nome });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'));
  perfil();
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA' }]);
  locaisService.listarTodosLocais.mockResolvedValue([{ id: 'loc-cd', nome: 'CD Cabedelo', empresa_id: 'emp-mia' }]);
  fornecedoresService.obterFornecedor.mockResolvedValue({
    dados: { id: 'for-sh', nome: 'Shanghai Tiles Co', nome_fantasia: 'Shanghai Tiles', moeda_padrao: 'USD' },
  });
  fornecedoresService.listarFornecedores.mockResolvedValue({ dados: [] });
  produtosService.obterProduto.mockResolvedValue({ dados: { id: 'prod-porc', nome: 'Porcelanato 60x60' } });
  produtosService.listarProdutos.mockResolvedValue({ dados: [] });
  svc.listarHistoricoImportacao.mockResolvedValue({
    dados: [
      { id: 'h1', acao: 'criada', detalhe: '', criado_em: '2026-10-01T12:00:00Z' },
      { id: 'h2', acao: 'alocacao_alterada', detalhe: '1 alocação, 600 unidades', criado_em: '2026-10-02T12:00:00Z' },
    ],
  });
  ['atualizarImportacao', 'embarcarImportacao', 'desembaracarImportacao', 'cancelarImportacao'].forEach((nome) =>
    svc[nome].mockResolvedValue({ dados: {} })
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Detalhe da importação', () => {
  it('mostra dados, itens com valor na moeda e o histórico mais recente primeiro', async () => {
    await carregar();

    expect(screen.getByText('Aberta')).toBeInTheDocument();
    expect(await screen.findByText('MIA')).toBeInTheDocument();
    expect(await screen.findByText('Shanghai Tiles')).toBeInTheDocument();
    expect(screen.getByText('PI-2026-001')).toBeInTheDocument();
    expect(screen.getByText('05/11/2026')).toBeInTheDocument();
    expect(screen.getByText('20/12/2026')).toBeInTheDocument();
    expect(screen.getByText('Container de 40 pés')).toBeInTheDocument();
    const linha = (await screen.findByRole('link', { name: 'Porcelanato 60x60' })).closest('tr');
    expect(within(linha).getByText('1000')).toBeInTheDocument();
    expect(within(linha).getByText(/US\$\s?4\.500,00/)).toBeInTheDocument();
    const historico = await screen.findAllByText(/Importação criada|Alocação de pedidos alterada/);
    expect(historico.map((item) => item.textContent)).toEqual(['Alocação de pedidos alterada', 'Importação criada']);
    expect(screen.getByText('1 alocação, 600 unidades')).toBeInTheDocument();
  });

  it('para o comercial esconde valores e ações', async () => {
    perfil({ comercial: true, financeiro: false });
    const { valor_total_moeda_centesimos: _total, ...semValores } = ABERTA;
    await carregar({ ...semValores, itens: [{ ...ABERTA.itens[0], valor_moeda_centesimos: undefined }] });

    await screen.findByRole('link', { name: 'Porcelanato 60x60' });
    expect(screen.queryByText('Valor na moeda')).toBeNull();
    expect(screen.queryByText(/Total:/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Embarcar' })).toBeNull();
  });

  it('embarca com a chegada prevista obrigatória e a versão, e recarrega', async () => {
    await carregar();
    expect(screen.queryByRole('button', { name: 'Desembaraçar' })).toBeNull();
    fireEvent.click(botao('Embarcar'));
    const dialogo = screen.getByRole('dialog', { name: 'Embarcar importação 3' });
    expect(within(dialogo).getByLabelText('Embarcada em *')).toHaveValue('2026-10-19');
    fireEvent.change(within(dialogo).getByLabelText('Chegada prevista *'), { target: { value: '2026-10-10' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar embarque' }));
    expect(await within(dialogo).findByText('A chegada prevista não pode ser antes do embarque.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Chegada prevista *'), { target: { value: '2026-11-18' } });
    fireEvent.change(within(dialogo).getByLabelText('Documento de embarque (BL / AWB)'), { target: { value: ' BL-778 ' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar embarque' }));

    await waitFor(() =>
      expect(svc.embarcarImportacao).toHaveBeenCalledWith('imp-3', {
        versao: 2,
        embarcada_em: '2026-10-19',
        chegada_prevista: '2026-11-18',
        documento_embarque: 'BL-778',
      })
    );
    await waitFor(() => expect(svc.obterImportacao).toHaveBeenCalledTimes(2));
  });

  it('desembaraça exigindo a declaração e as datas em ordem', async () => {
    await carregar(EMBARCADA);
    expect(screen.queryByRole('button', { name: 'Embarcar' })).toBeNull();
    fireEvent.click(botao('Desembaraçar'));
    const dialogo = screen.getByRole('dialog', { name: 'Desembaraçar importação 3' });
    fireEvent.change(within(dialogo).getByLabelText('Chegou em *'), { target: { value: '2026-10-05' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar desembaraço' }));

    expect(await within(dialogo).findByText('A chegada não pode ser antes do embarque (09/10/2026).')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe o número da DI ou DUIMP.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Chegou em *'), { target: { value: '2026-10-17' } });
    fireEvent.change(within(dialogo).getByLabelText('Desembaraçada em *'), { target: { value: '2026-10-18' } });
    fireEvent.change(within(dialogo).getByLabelText('DI / DUIMP *'), { target: { value: '26/0001234-5' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar desembaraço' }));

    await waitFor(() =>
      expect(svc.desembaracarImportacao).toHaveBeenCalledWith('imp-3', {
        versao: 3,
        chegada_em: '2026-10-17',
        desembaracada_em: '2026-10-18',
        declaracao: '26/0001234-5',
      })
    );
  });

  it('cancela com motivo e mostra a recusa das contas a pagar e o conflito de versão', async () => {
    svc.cancelarImportacao
      .mockRejectedValueOnce(new ErroApi(409, 'cancele ou rejeite antes as contas a pagar geradas pela importação'))
      .mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    await carregar();
    fireEvent.click(botao('Cancelar importação'));
    const dialogo = screen.getByRole('dialog', { name: 'Cancelar importação 3' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar a importação' }));
    expect(await within(dialogo).findByText('Informe o motivo do cancelamento.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Motivo *'), { target: { value: ' fornecedor desistiu ' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar a importação' }));
    expect(await within(dialogo).findByText(/cancele ou rejeite antes as contas a pagar/)).toBeInTheDocument();
    expect(svc.cancelarImportacao).toHaveBeenCalledWith('imp-3', { versao: 2, motivo: 'fornecedor desistiu' });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar a importação' }));
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Recarregar dados' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(svc.obterImportacao).toHaveBeenCalledTimes(2));
  });

  it('edita sem a empresa, com a versão, travando a moeda com parcela ativa e recarregando no conflito', async () => {
    svc.atualizarImportacao.mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    const comParcela = {
      ...EMBARCADA,
      parcelas: [{ id: 'par-1', status: 'aberta', valor_moeda_centesimos: 135000 }],
    };
    await carregar(comParcela);
    fireEvent.click(botao('Editar'));
    const dialogo = screen.getByRole('dialog', { name: 'Editar Importação 3' });

    expect(within(dialogo).getByLabelText('Moeda *')).toBeDisabled();
    expect(within(dialogo).getAllByText('Só muda com a importação aberta.')).toHaveLength(2);
    expect(within(dialogo).getByText('Chegada prevista *')).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Valor do item 1')).toHaveValue('4500,00');
    fireEvent.change(within(dialogo).getByLabelText('Quantidade do item 1'), { target: { value: '1200' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    svc.obterImportacao.mockResolvedValue({ dados: { ...comParcela, versao: 4 } });
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Recarregar dados' }));
    expect(await within(dialogo).findByText(/Dados recarregados \(versão 4\)/)).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Quantidade do item 1')).toHaveValue(1200);
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(svc.atualizarImportacao).toHaveBeenCalledTimes(2));
    const corpo = svc.atualizarImportacao.mock.calls[1][1];
    expect(corpo).not.toHaveProperty('empresa_id');
    expect(corpo).toMatchObject({
      fornecedor_id: 'for-sh',
      moeda: 'USD',
      chegada_prevista: '2026-11-18',
      itens: [{ produto_id: 'prod-porc', quantidade: 1200, valor_moeda_centesimos: 450000 }],
    });
    expect(corpo.versao).toBe(4);
  });

  it('na importação recebida mostra recebida, custo unitário, local e câmbio, sem ações de estado', async () => {
    await carregar(RECEBIDA);

    const linha = (await screen.findByRole('link', { name: 'Porcelanato 60x60' })).closest('tr');
    expect(within(linha).getByText('950')).toHaveClass('importacoes-alerta');
    expect(within(linha).getByText('R$ 28,59')).toBeInTheDocument();
    expect(await screen.findByText('CD Cabedelo')).toBeInTheDocument();
    expect(screen.getByText('5,500000')).toBeInTheDocument();
    expect(screen.getByText('26/0001234-5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancelar importação' })).toBeNull();
  });
});
