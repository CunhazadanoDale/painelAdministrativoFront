import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as categoriasService from '../../services/categoriasFinanceiras';
import * as contasService from '../../services/contasBancarias';
import * as empresasService from '../../services/empresas';
import * as fornecedoresService from '../../services/fornecedores';
import * as solicitacoesService from '../../services/solicitacoes';
import SolicitacaoDetalhe from './SolicitacaoDetalhe';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/usuarios', () => ({ listarTodosUsuarios: vi.fn(async () => []) }));
vi.mock('../../services/arquivos', () => ({ baixarArquivo: vi.fn(), enviarArquivo: vi.fn(), removerArquivo: vi.fn() }));
vi.mock('../../services/fornecedores', () => ({ listarFornecedores: vi.fn(), obterFornecedor: vi.fn() }));
vi.mock('../../services/categoriasFinanceiras', () => ({ obterArvoreFinanceira: vi.fn(), obterCategoriaFinanceira: vi.fn() }));
vi.mock('../../services/contasBancarias', () => ({ listarTodasContasBancarias: vi.fn(), obterContaBancaria: vi.fn() }));
vi.mock('../../services/solicitacoes', () => ({
  obterSolicitacao: vi.fn(),
  listarHistorico: vi.fn(),
  listarArquivos: vi.fn(),
  listarPagamentos: vi.fn(),
  aprovar: vi.fn(),
  rejeitar: vi.fn(),
  cancelar: vi.fn(),
  registrarPagamento: vi.fn(),
  atualizarSolicitacao: vi.fn(),
  classificar: vi.fn(),
  adiar: vi.fn(),
  estornarPagamento: vi.fn(),
}));

const svc = solicitacoesService;
const CONFLITO = 'solicitação alterada por outra operação, recarregue e tente novamente';

const BASE = {
  id: 'sol-1',
  solicitante_id: 'usr-solicitante',
  empresa_id: 'emp-mia',
  valor_centavos: 150000,
  prazo_pagamento: '2026-10-25T00:00:00Z',
  observacao: 'Aluguel de outubro',
  forma_pagamento: 'boleto',
  fornecedor_id: 'for-sol',
  categoria_financeira_id: 'sub-aluguel',
  competencia: '2026-10',
  estimado: true,
  origem: 'recorrencia',
  origem_id: 'rec-1',
  vencida: false,
  versao: 4,
  status: 'aprovado',
  criado_em: '2026-10-10T13:00:00Z',
};

const PAGAMENTO_ESTORNADO = {
  id: 'pag-1',
  conta_bancaria_id: 'cb-sic',
  valor_centavos: 150000,
  pago_em: '2026-10-12T13:00:00Z',
  estornado: true,
  estorno: { motivo: 'pago em duplicidade', estornado_em: '2026-10-13T13:00:00Z' },
  comprovante_arquivo_id: null,
};

const PAGAMENTO_VIGENTE = { ...PAGAMENTO_ESTORNADO, id: 'pag-2', estornado: false, estorno: null, pago_em: '2026-10-14T13:00:00Z' };

function perfil({ id = 'usr-financeiro', administrador = false, aprovacao = false, financeiro = true } = {}) {
  useAutenticacao.mockReturnValue({
    usuario: { id, nome: 'Pessoa' },
    administrador,
    financeiro,
    permissoes: { aprovacao, financeiro },
  });
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/solicitacoes/sol-1']}>
      <Routes>
        <Route path="/solicitacoes/:id" element={<SolicitacaoDetalhe />} />
      </Routes>
    </MemoryRouter>
  );
}

async function carregar() {
  renderizar();
  await screen.findByText('Dados da solicitação');
}

function botao(nome) {
  return screen.getByRole('button', { name: nome });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-18T15:00:00Z'));
  perfil();
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  fornecedoresService.obterFornecedor.mockResolvedValue({ dados: { id: 'for-sol', nome: 'Imobiliária Sol' } });
  fornecedoresService.listarFornecedores.mockResolvedValue({ dados: [{ id: 'for-sol', nome: 'Imobiliária Sol' }] });
  categoriasService.obterCategoriaFinanceira.mockResolvedValue({ dados: { id: 'sub-aluguel', nome: 'Aluguel' } });
  categoriasService.obterArvoreFinanceira.mockResolvedValue({
    dados: [{ id: 'raiz', nome: 'Despesas fixas', natureza: 'despesa', subcategorias: [{ id: 'sub-aluguel', nome: 'Aluguel', lancavel: true }] }],
  });
  contasService.listarTodasContasBancarias.mockResolvedValue([
    { id: 'cb-sic', apelido: 'Sicredi movimento', banco_nome: 'Sicredi', empresa_id: 'emp-mia' },
    { id: 'cb-itau', apelido: 'Itaú folha', banco_nome: 'Itaú', empresa_id: 'emp-mia' },
  ]);
  contasService.obterContaBancaria.mockResolvedValue({ dados: { id: 'cb-sic', apelido: 'Sicredi movimento' } });
  svc.obterSolicitacao.mockResolvedValue({ dados: BASE });
  svc.listarHistorico.mockResolvedValue([
    { id: 'h1', evento: 'criada', descricao: 'solicitação criada', para_status: 'pendente_aprovacao', criado_em: '2026-10-10T13:00:00Z' },
    { id: 'h2', evento: 'adiada', descricao: 'vencimento adiado de 2026-10-20 para 2026-10-25: novo prazo', para_status: 'aprovado', criado_em: '2026-10-11T13:00:00Z' },
  ]);
  svc.listarArquivos.mockResolvedValue([]);
  svc.listarPagamentos.mockResolvedValue({ dados: [] });
  [svc.aprovar, svc.classificar, svc.adiar, svc.estornarPagamento, svc.atualizarSolicitacao, svc.registrarPagamento].forEach(
    (funcao) => funcao.mockResolvedValue({ dados: BASE })
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SolicitacaoDetalhe no M7', () => {
  it('mostra fornecedor, categoria, competência, estimado, origem e os eventos do histórico', async () => {
    await carregar();

    expect(await screen.findByText('Imobiliária Sol')).toBeInTheDocument();
    expect(await screen.findByText('Aluguel')).toBeInTheDocument();
    expect(screen.getByText('10/2026')).toBeInTheDocument();
    expect(screen.getByText('Estimado')).toBeInTheDocument();
    expect(screen.getByText('Despesa recorrente')).toBeInTheDocument();
    expect(screen.getByText('Vencimento adiado')).toBeInTheDocument();
  });

  it('destaca a solicitação vencida', async () => {
    svc.obterSolicitacao.mockResolvedValue({ dados: { ...BASE, vencida: true } });

    await carregar();

    expect(screen.getByText('Vencida')).toBeInTheDocument();
  });

  it('o solicitante edita a pendente pelo formulário com a versão', async () => {
    perfil({ id: 'usr-solicitante', financeiro: false });
    svc.obterSolicitacao.mockResolvedValue({ dados: { ...BASE, status: 'pendente_aprovacao' } });
    await carregar();

    fireEvent.click(botao('Editar'));
    const dialogo = screen.getByRole('dialog', { name: 'Editar Solicitação' });
    fireEvent.change(within(dialogo).getByLabelText('Observação *'), { target: { value: 'Aluguel do galpão' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(svc.atualizarSolicitacao).toHaveBeenCalledWith(
        'sol-1',
        expect.objectContaining({ observacao: 'Aluguel do galpão', versao: 4 })
      )
    );
  });

  it('o aprovador aprova mandando a versão que viu', async () => {
    perfil({ id: 'usr-aprovador', aprovacao: true, financeiro: false });
    svc.obterSolicitacao.mockResolvedValue({ dados: { ...BASE, status: 'pendente_aprovacao' } });
    await carregar();

    fireEvent.click(botao('Aprovar'));

    await waitFor(() => expect(svc.aprovar).toHaveBeenCalledWith('sol-1', 4));
  });

  it('o financeiro classifica a aprovada exigindo categoria e competência', async () => {
    svc.obterSolicitacao.mockResolvedValue({ dados: { ...BASE, categoria_financeira_id: null, fornecedor_id: null, competencia: '' } });
    await carregar();

    fireEvent.click(botao('Classificar'));
    const dialogo = screen.getByRole('dialog', { name: 'Classificar a conta a pagar' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Classificar' }));
    expect(await within(dialogo).findByText('Escolha a categoria financeira.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe a competência.')).toBeInTheDocument();

    await within(dialogo).findByRole('option', { name: 'Aluguel' });
    fireEvent.change(within(dialogo).getByLabelText('Categoria financeira *'), { target: { value: 'sub-aluguel' } });
    fireEvent.change(within(dialogo).getByLabelText('Competência *'), { target: { value: '2026-09' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Classificar' }));

    await waitFor(() =>
      expect(svc.classificar).toHaveBeenCalledWith('sol-1', {
        fornecedor_id: null,
        categoria_financeira_id: 'sub-aluguel',
        competencia: '2026-09',
        versao: 4,
      })
    );
  });

  it('sem categoria o pagamento fica travado com o aviso para classificar', async () => {
    svc.obterSolicitacao.mockResolvedValue({ dados: { ...BASE, categoria_financeira_id: null } });
    await carregar();

    expect(botao('Registrar pagamento')).toBeDisabled();
    expect(screen.getByText('Classifique antes de pagar.')).toBeInTheDocument();
  });

  it('no conflito de versão da classificação avisa e recarrega', async () => {
    svc.classificar.mockRejectedValue(new ErroApi(409, CONFLITO));
    await carregar();

    fireEvent.click(botao('Classificar'));
    const dialogo = screen.getByRole('dialog', { name: 'Classificar a conta a pagar' });
    await within(dialogo).findByRole('option', { name: 'Aluguel' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Classificar' }));
    expect(await within(dialogo).findByText(CONFLITO)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Recarregar dados' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(svc.obterSolicitacao).toHaveBeenCalledTimes(2));
  });

  it('o financeiro adia para depois do vencimento atual, com motivo', async () => {
    await carregar();

    fireEvent.click(botao('Adiar'));
    const dialogo = screen.getByRole('dialog', { name: 'Adiar o vencimento' });
    fireEvent.change(within(dialogo).getByLabelText('Novo vencimento *'), { target: { value: '2026-10-25' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Adiar' }));
    expect(await within(dialogo).findByText('O novo vencimento deve ser depois de 25/10/2026.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe o motivo do adiamento.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Novo vencimento *'), { target: { value: '2026-11-13' } });
    fireEvent.change(within(dialogo).getByLabelText('Motivo *'), { target: { value: ' fornecedor aceitou ' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Adiar' }));

    await waitFor(() =>
      expect(svc.adiar).toHaveBeenCalledWith('sol-1', { vencimento: '2026-11-13', motivo: 'fornecedor aceitou', versao: 4 })
    );
  });

  it('o pagamento exige a conta bancária da empresa e a manda no corpo', async () => {
    await carregar();

    fireEvent.click(botao('Registrar pagamento'));
    const dialogo = screen.getByRole('dialog', { name: 'Registrar pagamento' });
    await within(dialogo).findByRole('option', { name: 'Sicredi movimento · Sicredi' });
    expect(contasService.listarTodasContasBancarias).toHaveBeenCalledWith(
      expect.objectContaining({ empresa: 'emp-mia', ativa: true })
    );
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar' }));
    expect(await within(dialogo).findByText('Escolha a conta bancária de onde o dinheiro saiu.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Conta bancária *'), { target: { value: 'cb-sic' } });
    fireEvent.change(within(dialogo).getByLabelText('Valor pago *'), { target: { value: '1480,00' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar' }));

    await waitFor(() =>
      expect(svc.registrarPagamento).toHaveBeenCalledWith('sol-1', { conta_bancaria_id: 'cb-sic', valor_centavos: 148000 })
    );
  });

  it('lista os pagamentos, inclusive o estornado com o motivo', async () => {
    svc.obterSolicitacao.mockResolvedValue({ dados: { ...BASE, status: 'pago' } });
    svc.listarPagamentos.mockResolvedValue({ dados: [PAGAMENTO_ESTORNADO, PAGAMENTO_VIGENTE] });

    await carregar();

    const estornado = (await screen.findByText(/pago em duplicidade/)).closest('li');
    expect(within(estornado).getByText('Estornado')).toBeInTheDocument();
    expect(await within(estornado).findByText(/Sicredi movimento/)).toBeInTheDocument();
    expect(screen.getByText('Vigente')).toBeInTheDocument();
  });

  it('o financeiro estorna o pagamento com motivo e a versão', async () => {
    svc.obterSolicitacao.mockResolvedValue({ dados: { ...BASE, status: 'pago' } });
    svc.listarPagamentos.mockResolvedValue({ dados: [PAGAMENTO_VIGENTE] });
    await carregar();

    fireEvent.click(botao('Estornar pagamento'));
    const dialogo = screen.getByRole('dialog', { name: 'Estornar pagamento' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Estornar' }));
    expect(await within(dialogo).findByText('Informe o motivo do estorno.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Motivo *'), { target: { value: 'pago em duplicidade' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Estornar' }));

    await waitFor(() =>
      expect(svc.estornarPagamento).toHaveBeenCalledWith('sol-1', { motivo: 'pago em duplicidade', versao: 4 })
    );
  });
});
