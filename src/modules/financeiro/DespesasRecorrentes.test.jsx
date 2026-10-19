import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as categoriasService from '../../services/categoriasFinanceiras';
import * as recorrentesService from '../../services/despesasRecorrentes';
import * as empresasService from '../../services/empresas';
import * as fornecedoresService from '../../services/fornecedores';
import DespesasRecorrentes from './DespesasRecorrentes';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/fornecedores', () => ({ listarFornecedores: vi.fn(), obterFornecedor: vi.fn() }));
vi.mock('../../services/categoriasFinanceiras', () => ({ obterArvoreFinanceira: vi.fn(), obterCategoriaFinanceira: vi.fn() }));
vi.mock('../../services/despesasRecorrentes', () => ({
  listarDespesasRecorrentes: vi.fn(),
  obterDespesaRecorrente: vi.fn(),
  criarDespesaRecorrente: vi.fn(),
  atualizarDespesaRecorrente: vi.fn(),
  ativarDespesaRecorrente: vi.fn(),
  desativarDespesaRecorrente: vi.fn(),
  removerDespesaRecorrente: vi.fn(),
  gerarCompetencia: vi.fn(),
}));

const svc = recorrentesService;
const CONFLITO = 'a despesa recorrente foi alterada por outra pessoa; recarregue e tente de novo';

const ALUGUEL = {
  id: 'rec-aluguel',
  empresa_id: 'emp-mia',
  fornecedor_id: 'for-sol',
  categoria_financeira_id: 'sub-aluguel',
  descricao: 'Aluguel do galpão',
  valor_centavos: 420000,
  estimado: false,
  forma_pagamento: 'transferencia',
  dia_vencimento: 10,
  vencimento_mes_seguinte: false,
  inicio: '2026-01',
  fim: null,
  ativa: true,
  versao: 3,
};

const ENERGIA = {
  ...ALUGUEL,
  id: 'rec-energia',
  fornecedor_id: null,
  descricao: 'Energia',
  valor_centavos: 90000,
  estimado: true,
  forma_pagamento: 'debito_automatico',
  dia_vencimento: 31,
  vencimento_mes_seguinte: true,
  fim: '2026-12',
  ativa: false,
  versao: 7,
};

function perfil({ administrador = false } = {}) {
  useAutenticacao.mockReturnValue({ financeiro: true, administrador });
}

function linhaDe(texto) {
  return screen.getByText(texto).closest('tr');
}

async function carregar() {
  render(<DespesasRecorrentes />);
  await screen.findByText('Aluguel do galpão');
}

function preencher(dialogo, campos) {
  Object.entries(campos).forEach(([rotulo, valor]) => {
    fireEvent.change(within(dialogo).getByLabelText(rotulo), { target: { value: valor } });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-18T15:00:00Z'));
  perfil();
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  fornecedoresService.listarFornecedores.mockResolvedValue({ dados: [{ id: 'for-sol', nome: 'Imobiliária Sol' }] });
  fornecedoresService.obterFornecedor.mockResolvedValue({ dados: { id: 'for-sol', nome: 'Imobiliária Sol' } });
  categoriasService.obterArvoreFinanceira.mockResolvedValue({
    dados: [{ id: 'raiz', nome: 'Despesas fixas', natureza: 'despesa', subcategorias: [{ id: 'sub-aluguel', nome: 'Aluguel', lancavel: true }] }],
  });
  categoriasService.obterCategoriaFinanceira.mockResolvedValue({ dados: { id: 'sub-aluguel', nome: 'Aluguel' } });
  svc.listarDespesasRecorrentes.mockResolvedValue({ dados: [ALUGUEL, ENERGIA] });
  svc.obterDespesaRecorrente.mockResolvedValue({ dados: { ...ALUGUEL, versao: 4 } });
  [svc.criarDespesaRecorrente, svc.atualizarDespesaRecorrente, svc.ativarDespesaRecorrente, svc.desativarDespesaRecorrente].forEach(
    (funcao) => funcao.mockResolvedValue({ dados: ALUGUEL })
  );
  svc.removerDespesaRecorrente.mockResolvedValue(null);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DespesasRecorrentes', () => {
  it('lista com empresa, categoria, fornecedor, valor, vencimento, vigência e situação', async () => {
    await carregar();

    const aluguel = linhaDe('Aluguel do galpão');
    expect(await within(aluguel).findByText('MIA')).toBeInTheDocument();
    expect(await within(aluguel).findByText('Aluguel')).toBeInTheDocument();
    expect(await within(aluguel).findByText('Imobiliária Sol')).toBeInTheDocument();
    expect(within(aluguel).getByText('R$ 4.200,00')).toBeInTheDocument();
    expect(within(aluguel).getByText('Dia 10')).toBeInTheDocument();
    expect(within(aluguel).getByText('01/2026 em diante')).toBeInTheDocument();
    expect(within(aluguel).getByText('Ativa')).toBeInTheDocument();
    const energia = linhaDe('Energia');
    expect(within(energia).getByText('Estimado')).toBeInTheDocument();
    expect(within(energia).getByText('Dia 31 do mês seguinte')).toBeInTheDocument();
    expect(within(energia).getByText('01/2026 a 12/2026')).toBeInTheDocument();
    expect(within(energia).getByText('Inativa')).toBeInTheDocument();
  });

  it('mostra o vazio conforme o filtro e o erro com nova tentativa', async () => {
    svc.listarDespesasRecorrentes.mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValue({ dados: [] });

    render(<DespesasRecorrentes />);

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhuma despesa recorrente cadastrada.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'true' } });
    expect(await screen.findByText('Nenhuma despesa recorrente encontrada com estes filtros.')).toBeInTheDocument();
  });

  it('deixa a exclusão só para o administrador', async () => {
    await carregar();
    expect(screen.queryByRole('button', { name: 'Excluir despesa recorrente' })).toBeNull();
  });

  it('valida a descrição, o valor, a categoria, o dia e a vigência antes de criar', async () => {
    await carregar();
    fireEvent.click(screen.getByRole('button', { name: /Nova Despesa/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Nova despesa recorrente' });
    await within(dialogo).findByRole('option', { name: 'Aluguel' });
    preencher(dialogo, { 'Dia do vencimento *': '32', 'Início *': '2026-05', Fim: '2026-04' });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText('Informe a descrição.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe um valor maior que zero.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Escolha a categoria financeira.')).toBeInTheDocument();
    expect(within(dialogo).getByText('O dia do vencimento vai de 1 a 31.')).toBeInTheDocument();
    expect(within(dialogo).getByText('O fim não pode ser antes do início.')).toBeInTheDocument();
    expect(svc.criarDespesaRecorrente).not.toHaveBeenCalled();
  });

  it('cria a despesa com a empresa, a categoria e o fim vazio como nulo', async () => {
    await carregar();
    fireEvent.click(screen.getByRole('button', { name: /Nova Despesa/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Nova despesa recorrente' });
    await within(dialogo).findByRole('option', { name: 'Aluguel' });
    await waitFor(() => expect(within(dialogo).getByLabelText('Empresa *')).toHaveValue('emp-mia'));
    await within(dialogo).findByRole('option', { name: 'Imobiliária Sol' });
    preencher(dialogo, {
      'Descrição *': '  Internet do escritório ',
      'Valor *': '199,90',
      'Forma de pagamento *': 'boleto',
      Fornecedor: 'for-sol',
      'Categoria financeira *': 'sub-aluguel',
      'Dia do vencimento *': '5',
      'Início *': '2026-11',
    });
    fireEvent.click(within(dialogo).getByLabelText('Vence no mês seguinte à competência'));
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(svc.criarDespesaRecorrente).toHaveBeenCalledWith({
        empresa_id: 'emp-mia',
        fornecedor_id: 'for-sol',
        categoria_financeira_id: 'sub-aluguel',
        descricao: 'Internet do escritório',
        valor_centavos: 19990,
        estimado: false,
        forma_pagamento: 'boleto',
        dia_vencimento: 5,
        vencimento_mes_seguinte: true,
        inicio: '2026-11',
        fim: null,
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('edita com a versão e, no conflito, recarrega sem perder o formulário', async () => {
    svc.atualizarDespesaRecorrente.mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    await carregar();
    fireEvent.click(within(linhaDe('Aluguel do galpão')).getByRole('button', { name: 'Editar despesa recorrente' }));
    const dialogo = screen.getByRole('dialog', { name: 'Editar despesa recorrente' });

    expect(within(dialogo).queryByLabelText('Empresa *')).toBeNull();
    expect(within(dialogo).getByLabelText('Valor *')).toHaveValue('4200,00');
    preencher(dialogo, { 'Valor *': '4500,00' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Recarregar dados' }));
    expect(await within(dialogo).findByText(/Dados recarregados/)).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Valor *')).toHaveValue('4500,00');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(svc.atualizarDespesaRecorrente).toHaveBeenLastCalledWith(
        'rec-aluguel',
        expect.objectContaining({ valor_centavos: 450000, versao: 4, descricao: 'Aluguel do galpão' })
      )
    );
  });

  it('desativa a ativa e ativa a inativa com a versão de cada uma', async () => {
    await carregar();

    fireEvent.click(within(linhaDe('Aluguel do galpão')).getByRole('button', { name: 'Desativar despesa recorrente' }));
    await waitFor(() => expect(svc.desativarDespesaRecorrente).toHaveBeenCalledWith('rec-aluguel', 3));
    await screen.findByText('Energia');
    fireEvent.click(within(linhaDe('Energia')).getByRole('button', { name: 'Ativar despesa recorrente' }));

    await waitFor(() => expect(svc.ativarDespesaRecorrente).toHaveBeenCalledWith('rec-energia', 7));
  });

  it('o administrador exclui e vê o aviso de quem já gerou solicitações', async () => {
    perfil({ administrador: true });
    svc.removerDespesaRecorrente.mockRejectedValueOnce(
      new ErroApi(400, 'erro de validação: despesa recorrente já gerou solicitações e não pode ser excluída; desative-a')
    );
    await carregar();

    fireEvent.click(within(linhaDe('Aluguel do galpão')).getByRole('button', { name: 'Excluir despesa recorrente' }));
    const dialogo = screen.getByRole('dialog', { name: 'Excluir despesa recorrente' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));

    expect(await within(dialogo).findByText(/já gerou solicitações/)).toBeInTheDocument();
    expect(svc.removerDespesaRecorrente).toHaveBeenCalledWith('rec-aluguel');
  });

  it('gera a competência escolhida e mostra geradas, já existentes e recusadas', async () => {
    svc.gerarCompetencia.mockResolvedValue({
      dados: {
        competencia: '2026-11',
        geradas: ['sol-1', 'sol-2'],
        ja_existentes: 3,
        recusadas: [{ despesa_recorrente_id: 'rec-energia', motivo: 'fornecedor inativo não recebe conta a pagar' }],
      },
    });
    await carregar();

    fireEvent.click(screen.getByRole('button', { name: /Gerar competência/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Gerar as contas da competência' });
    expect(within(dialogo).getByLabelText('Competência *')).toHaveValue('2026-10');
    preencher(dialogo, { 'Competência *': '2026-11' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Gerar' }));

    await waitFor(() => expect(svc.gerarCompetencia).toHaveBeenCalledWith({ competencia: '2026-11', empresa: '' }));
    expect(await within(dialogo).findByText('2 geradas, 3 já existiam.')).toBeInTheDocument();
    const recusada = within(dialogo).getByText(/fornecedor inativo/).closest('li');
    expect(within(recusada).getByText(/Energia/)).toBeInTheDocument();
    expect(within(dialogo).getByText(/nascem pendentes de aprovação/)).toBeInTheDocument();
  });
});
