import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import * as dividasService from '../../services/dividas';
import * as empresasService from '../../services/empresas';
import * as fornecedoresService from '../../services/fornecedores';
import Dividas from './Dividas';

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/fornecedores', () => ({ listarFornecedores: vi.fn(), obterFornecedor: vi.fn() }));
vi.mock('../../services/categoriasFinanceiras', () => ({
  obterArvoreFinanceira: vi.fn(async () => ({
    dados: [
      {
        id: 'raiz-emprestimos',
        nome: 'Empréstimos',
        natureza: 'despesa',
        linha_dre: 'fora_dre',
        subcategorias: [{ id: 'cat-amort', nome: 'Amortização de empréstimos', lancavel: true }],
      },
      {
        id: 'raiz-financeiras',
        nome: 'Despesas financeiras',
        natureza: 'despesa',
        linha_dre: 'resultado_financeiro',
        subcategorias: [{ id: 'cat-juros', nome: 'Juros de empréstimos', lancavel: true }],
      },
    ],
  })),
}));
vi.mock('../../services/contasBancarias', () => ({ listarTodasContasBancarias: vi.fn(async () => []) }));
vi.mock('../../services/dividas', () => ({
  listarDividas: vi.fn(),
  criarDivida: vi.fn(),
  gerarContasDividas: vi.fn(),
  obterDivida: vi.fn(),
}));

const { listarDividas, criarDivida, gerarContasDividas, obterDivida } = dividasService;

const EMPRESAS = [
  { id: 'emp-mia', nome_fantasia: 'MIA', ativa: true },
  { id: 'emp-gig', nome_fantasia: 'Gigante', ativa: true },
];

const SICREDI = { id: 'for-sic', nome: 'Banco Sicredi SA', nome_fantasia: 'Sicredi' };
const RECEITA = { id: 'for-rfb', nome: 'Receita Federal', nome_fantasia: '' };

const CAPITAL = {
  id: 'div-1',
  empresa_id: 'emp-mia',
  fornecedor_id: 'for-sic',
  credor_tipo: 'banco',
  descricao: 'Capital de giro Sicredi',
  contrato: 'CG-77',
  status: 'ativa',
  saldo_devedor_centavos: 300000,
  vencido_centavos: 5550,
  quitada: false,
};

const PERT = {
  ...CAPITAL,
  id: 'div-2',
  empresa_id: 'emp-gig',
  fornecedor_id: 'for-rfb',
  credor_tipo: 'fisco',
  descricao: 'Parcelamento PERT',
  contrato: null,
  saldo_devedor_centavos: 0,
  vencido_centavos: 0,
  quitada: true,
};

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/dividas']}>
      <Routes>
        <Route path="/dividas" element={<Dividas />} />
        <Route path="/dividas/:id" element={<div>Detalhe da dívida</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  empresasService.listarTodasEmpresas.mockResolvedValue(EMPRESAS);
  listarDividas.mockResolvedValue({ dados: [CAPITAL, PERT] });
  fornecedoresService.obterFornecedor.mockImplementation(async (id) => ({
    dados: [SICREDI, RECEITA].find((fornecedor) => fornecedor.id === id),
  }));
  fornecedoresService.listarFornecedores.mockResolvedValue({ dados: [SICREDI, RECEITA] });
  obterDivida.mockImplementation(async (id) => ({ dados: [CAPITAL, PERT].find((divida) => divida.id === id) }));
});

describe('Dívidas', () => {
  it('lista descrição, empresa, credor, tipo, saldo devedor, vencido e status', async () => {
    renderizar();

    const capital = (await screen.findByRole('link', { name: 'Capital de giro Sicredi' })).closest('tr');
    expect(within(capital).getByRole('link', { name: 'Capital de giro Sicredi' })).toHaveAttribute('href', '/dividas/div-1');
    expect(await within(capital).findByText('MIA')).toBeInTheDocument();
    expect(await within(capital).findByText('Sicredi')).toBeInTheDocument();
    expect(within(capital).getByText('Banco')).toBeInTheDocument();
    expect(within(capital).getByText('CG-77')).toBeInTheDocument();
    expect(within(capital).getByText(/R\$\s?3\.000,00/)).toBeInTheDocument();
    expect(within(capital).getByText(/R\$\s?55,50/)).toBeInTheDocument();
    expect(within(capital).getByText('Ativa')).toBeInTheDocument();

    const pert = screen.getByRole('link', { name: 'Parcelamento PERT' }).closest('tr');
    expect(await within(pert).findByText('Receita Federal')).toBeInTheDocument();
    expect(within(pert).getByText('Fisco')).toBeInTheDocument();
    expect(within(pert).getByText('Quitada')).toBeInTheDocument();
  });

  it('mostra o vazio conforme o filtro e o erro com nova tentativa', async () => {
    listarDividas.mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValue({ dados: [] });

    renderizar();

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhuma dívida nas empresas do seu acesso.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'cancelada' } });
    expect(await screen.findByText('Nenhuma dívida encontrada com estes filtros.')).toBeInTheDocument();
  });

  it('filtra por empresa, tipo de credor, status, situação e credor', async () => {
    renderizar();
    await screen.findByRole('link', { name: 'Capital de giro Sicredi' });
    await screen.findByRole('option', { name: 'Gigante' });
    await screen.findByRole('option', { name: 'Receita Federal' });

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-gig' } });
    fireEvent.change(screen.getByLabelText('Tipo de credor'), { target: { value: 'fisco' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'ativa' } });
    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'vencidas' } });
    fireEvent.change(screen.getByLabelText('Credor'), { target: { value: 'for-rfb' } });

    await waitFor(() =>
      expect(listarDividas).toHaveBeenLastCalledWith(
        expect.objectContaining({
          empresa: 'emp-gig',
          credor_tipo: 'fisco',
          status: 'ativa',
          vencidas: 'true',
          quitada: '',
          fornecedor: 'for-rfb',
          pagina: 1,
        })
      )
    );

    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'em_aberto' } });
    await waitFor(() =>
      expect(listarDividas).toHaveBeenLastCalledWith(expect.objectContaining({ quitada: 'false', vencidas: '' }))
    );
    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'quitadas' } });
    await waitFor(() =>
      expect(listarDividas).toHaveBeenLastCalledWith(expect.objectContaining({ quitada: 'true', vencidas: '' }))
    );
  });

  it('gera as contas da competência e mostra geradas e recusadas pela descrição', async () => {
    gerarContasDividas.mockResolvedValue({
      dados: {
        competencia: '2026-11',
        geradas: [{ divida_id: 'div-1', parcelas: 1, contas: 2 }],
        recusadas: [{ divida_id: 'div-2', motivo: 'fornecedor inativo não recebe conta a pagar' }],
      },
    });
    renderizar();
    await screen.findByRole('link', { name: 'Capital de giro Sicredi' });

    fireEvent.click(screen.getByRole('button', { name: /Gerar competência/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Gerar as contas das dívidas' });
    await within(dialogo).findByRole('option', { name: 'Gigante' });
    expect(within(dialogo).getByLabelText('Competência *').value).toMatch(/^\d{4}-\d{2}$/);
    fireEvent.change(within(dialogo).getByLabelText('Competência *'), { target: { value: '2026-11' } });
    fireEvent.change(within(dialogo).getByLabelText('Empresa'), { target: { value: 'emp-mia' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Gerar' }));

    await waitFor(() => expect(gerarContasDividas).toHaveBeenCalledWith({ competencia: '2026-11', empresa: 'emp-mia' }));
    const relatorio = await within(dialogo).findByRole('status');
    expect(relatorio).toHaveTextContent('1 dívida com contas geradas: 2 contas de 1 parcela.');
    expect(await within(relatorio).findByText('Capital de giro Sicredi: 2 contas de 1 parcela')).toBeInTheDocument();
    expect(
      await within(relatorio).findByText('Parcelamento PERT: fornecedor inativo não recebe conta a pagar')
    ).toBeInTheDocument();
    await waitFor(() => expect(listarDividas.mock.calls.length).toBeGreaterThan(1));
  });

  it('mostra o erro da geração sem fechar', async () => {
    gerarContasDividas.mockRejectedValue(new ErroApi(400, 'erro de validação: competência da geração é obrigatória'));
    renderizar();
    await screen.findByRole('link', { name: 'Capital de giro Sicredi' });

    fireEvent.click(screen.getByRole('button', { name: /Gerar competência/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Gerar as contas das dívidas' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Gerar' }));

    expect(await within(dialogo).findByText(/competência da geração é obrigatória/)).toBeInTheDocument();
  });

  it('cria a dívida pelo formulário e abre o detalhe', async () => {
    criarDivida.mockResolvedValue({ dados: { ...CAPITAL, id: 'div-9' } });
    renderizar();
    await screen.findByRole('link', { name: 'Capital de giro Sicredi' });

    fireEvent.click(screen.getByRole('button', { name: /Nova Dívida/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Nova dívida' });
    await within(dialogo).findByRole('option', { name: 'Gigante' });
    await within(dialogo).findByRole('option', { name: 'Sicredi' });
    await within(dialogo).findByRole('option', { name: 'Juros de empréstimos' });

    fireEvent.change(within(dialogo).getByLabelText('Empresa devedora *'), { target: { value: 'emp-mia' } });
    fireEvent.change(within(dialogo).getByLabelText('Credor *'), { target: { value: 'for-sic' } });
    fireEvent.change(within(dialogo).getByLabelText('Tipo de credor *'), { target: { value: 'banco' } });
    fireEvent.change(within(dialogo).getByLabelText('Descrição *'), { target: { value: 'Giro' } });
    fireEvent.change(within(dialogo).getByLabelText('Categoria da amortização *'), { target: { value: 'cat-amort' } });
    fireEvent.change(within(dialogo).getByLabelText('Categoria dos juros *'), { target: { value: 'cat-juros' } });
    fireEvent.change(within(dialogo).getByLabelText('Saldo devedor na data do saldo *'), { target: { value: '100' } });
    fireEvent.change(within(dialogo).getByLabelText('Data do saldo *'), { target: { value: '2026-09-30' } });
    fireEvent.change(within(dialogo).getByLabelText('Vencimento da parcela 1'), { target: { value: '2026-10-30' } });
    fireEvent.change(within(dialogo).getByLabelText('Amortização da parcela 1'), { target: { value: '100' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(criarDivida).toHaveBeenCalledWith(
        expect.objectContaining({ empresa_id: 'emp-mia', fornecedor_id: 'for-sic', saldo_inicial_centavos: 10000 })
      )
    );
    expect(await screen.findByText('Detalhe da dívida')).toBeInTheDocument();
  });
});
