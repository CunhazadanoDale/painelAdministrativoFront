import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as empresasService from '../../services/empresas';
import * as fornecedoresService from '../../services/fornecedores';
import * as importacoesService from '../../services/importacoes';
import * as produtosService from '../../services/produtos';
import Importacoes from './Importacoes';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/fornecedores', () => ({ listarFornecedores: vi.fn(), obterFornecedor: vi.fn() }));
vi.mock('../../services/produtos', () => ({ listarProdutos: vi.fn(), obterProduto: vi.fn() }));
vi.mock('../../services/importacoes', () => ({ listarImportacoes: vi.fn(), criarImportacao: vi.fn() }));

const { listarImportacoes, criarImportacao } = importacoesService;

const EMPRESAS = [
  { id: 'emp-mia', nome_fantasia: 'MIA', ativa: true },
  { id: 'emp-gig', nome_fantasia: 'Gigante', ativa: true },
];

const SHANGHAI = { id: 'for-sh', nome: 'Shanghai Tiles Co', nome_fantasia: 'Shanghai Tiles', moeda_padrao: 'USD' };
const MILANO = { id: 'for-mi', nome: 'Milano Ceramiche', nome_fantasia: '', moeda_padrao: 'EUR' };

const PORCELANATO = { id: 'prod-porc', nome: 'Porcelanato 60x60', codigo: 'POR-1' };
const REVESTIMENTO = { id: 'prod-rev', nome: 'Revestimento 30x60', codigo: 'REV-1' };

const IMP_3 = {
  id: 'imp-3',
  empresa_id: 'emp-mia',
  numero: 3,
  fornecedor_id: 'for-sh',
  referencia: 'PI-2026-001',
  moeda: 'USD',
  status: 'embarcada',
  valor_total_moeda_centesimos: 450000,
  chegada_prevista: '2026-12-20',
  chegada_em: null,
};

const IMP_2 = {
  ...IMP_3,
  id: 'imp-2',
  numero: 2,
  fornecedor_id: 'for-mi',
  referencia: null,
  moeda: 'EUR',
  status: 'desembaracada',
  valor_total_moeda_centesimos: 120050,
  chegada_prevista: '2026-10-01',
  chegada_em: '2026-10-03',
};

function perfil({ comercial = false, financeiro = true } = {}) {
  useAutenticacao.mockReturnValue({ comercial, financeiro, administrador: false });
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/importacoes']}>
      <Routes>
        <Route path="/importacoes" element={<Importacoes />} />
        <Route path="/importacoes/:id" element={<div>Detalhe da importação</div>} />
      </Routes>
    </MemoryRouter>
  );
}

async function abrirNova() {
  renderizar();
  await screen.findByRole('link', { name: '3' });
  fireEvent.click(screen.getByRole('button', { name: /Nova Importação/ }));
  const dialogo = screen.getByRole('dialog', { name: 'Nova Importação' });
  await within(dialogo).findByRole('option', { name: 'Gigante' });
  await within(dialogo).findByRole('option', { name: 'Shanghai Tiles · USD' });
  await within(dialogo).findByRole('option', { name: 'Porcelanato 60x60 (POR-1)' });
  return dialogo;
}

beforeEach(() => {
  vi.clearAllMocks();
  perfil();
  empresasService.listarTodasEmpresas.mockResolvedValue(EMPRESAS);
  listarImportacoes.mockResolvedValue({ dados: [IMP_3, IMP_2] });
  fornecedoresService.obterFornecedor.mockImplementation(async (id) => ({
    dados: [SHANGHAI, MILANO].find((fornecedor) => fornecedor.id === id),
  }));
  fornecedoresService.listarFornecedores.mockResolvedValue({ dados: [SHANGHAI, MILANO] });
  produtosService.listarProdutos.mockResolvedValue({ dados: [PORCELANATO, REVESTIMENTO] });
  criarImportacao.mockResolvedValue({ dados: { ...IMP_3, id: 'imp-4', numero: 4 } });
});

describe('Importações', () => {
  it('lista com número, empresa, fornecedor, referência, status, valor na moeda e chegada', async () => {
    renderizar();

    const tres = (await screen.findByRole('link', { name: '3' })).closest('tr');
    expect(within(tres).getByRole('link', { name: '3' })).toHaveAttribute('href', '/importacoes/imp-3');
    expect(await within(tres).findByText('MIA')).toBeInTheDocument();
    expect(await within(tres).findByText('Shanghai Tiles')).toBeInTheDocument();
    expect(within(tres).getByText('PI-2026-001')).toBeInTheDocument();
    expect(within(tres).getByText('Embarcada')).toBeInTheDocument();
    expect(within(tres).getByText(/US\$\s?4\.500,00/)).toBeInTheDocument();
    expect(within(tres).getByText('20/12/2026 (prevista)')).toBeInTheDocument();
    const dois = screen.getByRole('link', { name: '2' }).closest('tr');
    expect(await within(dois).findByText('Milano Ceramiche')).toBeInTheDocument();
    expect(within(dois).getByText(/€\s?1\.200,50/)).toBeInTheDocument();
    expect(within(dois).getByText('03/10/2026 (chegou)')).toBeInTheDocument();
    expect(within(dois).getByText('Desembaraçada')).toBeInTheDocument();
  });

  it('para o comercial mostra a moeda sem valor e sem cadastro', async () => {
    perfil({ comercial: true, financeiro: false });
    listarImportacoes.mockResolvedValue({ dados: [{ ...IMP_3, valor_total_moeda_centesimos: undefined }] });

    renderizar();
    const tres = (await screen.findByRole('link', { name: '3' })).closest('tr');

    expect(within(tres).getByText('USD')).toBeInTheDocument();
    expect(screen.queryByText('Valor')).toBeNull();
    expect(screen.queryByRole('button', { name: /Nova Importação/ })).toBeNull();
  });

  it('mostra o vazio conforme o filtro e o erro com nova tentativa', async () => {
    listarImportacoes.mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValue({ dados: [] });

    renderizar();

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhuma importação nas empresas do seu acesso.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'cancelada' } });
    expect(await screen.findByText('Nenhuma importação encontrada com estes filtros.')).toBeInTheDocument();
  });

  it('filtra por empresa, status, chegada, fornecedor e número', async () => {
    renderizar();
    await screen.findByRole('link', { name: '3' });
    await screen.findByRole('option', { name: 'Gigante' });
    await screen.findByRole('option', { name: 'Milano Ceramiche' });

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-gig' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'aberta' } });
    fireEvent.change(screen.getByLabelText('Chegada até'), { target: { value: '2026-12-31' } });
    fireEvent.change(screen.getByLabelText('Fornecedor'), { target: { value: 'for-mi' } });
    fireEvent.change(screen.getByLabelText('Buscar pelo número'), { target: { value: ' 2 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() =>
      expect(listarImportacoes).toHaveBeenLastCalledWith(
        expect.objectContaining({
          empresa: 'emp-gig',
          status: 'aberta',
          chegada_ate: '2026-12-31',
          fornecedor: 'for-mi',
          numero: '2',
          pagina: 1,
        })
      )
    );
  });

  it('valida empresa, fornecedor, itens, quantidade, valor e datas antes de enviar', async () => {
    const dialogo = await abrirNova();
    fireEvent.change(within(dialogo).getByLabelText('Quantidade do item 1'), { target: { value: '0' } });
    fireEvent.change(within(dialogo).getByLabelText('Valor do item 1'), { target: { value: 'abc' } });
    fireEvent.change(within(dialogo).getByLabelText('Embarque previsto'), { target: { value: '2026-12-10' } });
    fireEvent.change(within(dialogo).getByLabelText('Chegada prevista'), { target: { value: '2026-12-01' } });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText('Selecione a empresa importadora.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Selecione o fornecedor.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Selecione a moeda.')).toBeInTheDocument();
    expect(within(dialogo).getByText('A chegada prevista não pode ser antes do embarque previsto.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Item 1: escolha o produto.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Item 1: quantidade inteira maior que zero.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Item 1: valor inválido.')).toBeInTheDocument();
    expect(criarImportacao).not.toHaveBeenCalled();
  });

  it('cria com a moeda padrão do fornecedor, os itens em centésimos e abre o detalhe', async () => {
    const dialogo = await abrirNova();
    fireEvent.change(within(dialogo).getByLabelText('Empresa importadora *'), { target: { value: 'emp-mia' } });
    fireEvent.change(within(dialogo).getByLabelText('Fornecedor *'), { target: { value: 'for-sh' } });
    expect(within(dialogo).getByLabelText('Moeda *')).toHaveValue('USD');
    fireEvent.change(within(dialogo).getByLabelText('Referência (proforma / invoice)'), { target: { value: ' PI-9 ' } });
    fireEvent.change(within(dialogo).getByLabelText('Chegada prevista'), { target: { value: '2026-12-20' } });
    fireEvent.change(within(dialogo).getByLabelText('Produto do item 1'), { target: { value: 'prod-porc' } });
    fireEvent.change(within(dialogo).getByLabelText('Quantidade do item 1'), { target: { value: '1000' } });
    fireEvent.change(within(dialogo).getByLabelText('Valor do item 1'), { target: { value: '4.500,00' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /Adicionar item/ }));
    await waitFor(() =>
      expect(within(within(dialogo).getByLabelText('Produto do item 2')).getAllByRole('option').length).toBeGreaterThan(1)
    );
    fireEvent.change(within(dialogo).getByLabelText('Produto do item 2'), { target: { value: 'prod-rev' } });
    fireEvent.change(within(dialogo).getByLabelText('Quantidade do item 2'), { target: { value: '50' } });
    fireEvent.change(within(dialogo).getByLabelText('Valor do item 2'), { target: { value: '0' } });
    expect(within(dialogo).getByText(/US\$\s?4\.500,00/)).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(criarImportacao).toHaveBeenCalledWith({
        empresa_id: 'emp-mia',
        fornecedor_id: 'for-sh',
        moeda: 'USD',
        referencia: 'PI-9',
        embarque_previsto: null,
        chegada_prevista: '2026-12-20',
        observacoes: '',
        itens: [
          { produto_id: 'prod-porc', quantidade: 1000, valor_moeda_centesimos: 450000 },
          { produto_id: 'prod-rev', quantidade: 50, valor_moeda_centesimos: 0 },
        ],
      })
    );
    expect(await screen.findByText('Detalhe da importação')).toBeInTheDocument();
  });

  it('recusa produto repetido e mostra o erro da API sem perder o formulário', async () => {
    criarImportacao.mockRejectedValue(
      new ErroApi(400, 'erro de validação: fornecedor "Shanghai" está inativo e não recebe importação nova')
    );
    const dialogo = await abrirNova();
    fireEvent.change(within(dialogo).getByLabelText('Empresa importadora *'), { target: { value: 'emp-mia' } });
    fireEvent.change(within(dialogo).getByLabelText('Fornecedor *'), { target: { value: 'for-mi' } });
    fireEvent.change(within(dialogo).getByLabelText('Produto do item 1'), { target: { value: 'prod-porc' } });
    fireEvent.change(within(dialogo).getByLabelText('Quantidade do item 1'), { target: { value: '10' } });
    fireEvent.change(within(dialogo).getByLabelText('Valor do item 1'), { target: { value: '100' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /Adicionar item/ }));
    await waitFor(() =>
      expect(within(within(dialogo).getByLabelText('Produto do item 2')).getAllByRole('option').length).toBeGreaterThan(1)
    );
    fireEvent.change(within(dialogo).getByLabelText('Produto do item 2'), { target: { value: 'prod-porc' } });
    fireEvent.change(within(dialogo).getByLabelText('Quantidade do item 2'), { target: { value: '1' } });
    fireEvent.change(within(dialogo).getByLabelText('Valor do item 2'), { target: { value: '1' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialogo).findByText('Item 2: produto repetido na importação.')).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Remover o item 2' }));
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText(/está inativo e não recebe importação nova/)).toBeInTheDocument();
    expect(criarImportacao).toHaveBeenCalledWith(expect.objectContaining({ moeda: 'EUR', fornecedor_id: 'for-mi' }));
    expect(within(dialogo).getByLabelText('Fornecedor *')).toHaveValue('for-mi');
  });
});
