import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as categoriasService from '../../services/categoriasFinanceiras';
import * as comissoesService from '../../services/comissoes';
import * as empresasService from '../../services/empresas';
import * as pedidosService from '../../services/pedidos';
import * as representantesService from '../../services/representantes';
import Comissoes from './Comissoes';
import FechamentoDetalhe from './FechamentoDetalhe';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/pedidos', () => ({ obterPedido: vi.fn() }));
vi.mock('../../services/representantes', () => ({ listarTodosRepresentantes: vi.fn(), obterRepresentante: vi.fn() }));
vi.mock('../../services/categoriasFinanceiras', () => ({ obterArvoreFinanceira: vi.fn(), obterCategoriaFinanceira: vi.fn() }));
vi.mock('../../services/comissoes', () => ({
  listarComissoes: vi.fn(),
  listarFechamentosComissao: vi.fn(),
  fecharComissoes: vi.fn(),
  obterFechamentoComissao: vi.fn(),
}));

const svc = comissoesService;

const FECHAMENTO = {
  id: 'fec-1',
  empresa_id: 'emp-mia',
  representante_id: 'rep-jose',
  competencia: '2026-09',
  comissoes_centavos: 27000,
  ajustes_centavos: -7000,
  total_centavos: 20000,
  vencimento: '2026-10-15',
  categoria_financeira_id: 'sub-comissao',
  solicitacao_id: 'sol-9',
  status_conta_a_pagar: 'pendente_aprovacao',
};

function perfil(financeiro = true) {
  useAutenticacao.mockReturnValue({ financeiro, administrador: false, comercial: false });
}

async function abrirFechamentos() {
  render(
    <MemoryRouter>
      <Comissoes />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('tab', { name: 'Fechamentos' }));
  await screen.findByRole('link', { name: '09/2026' });
}

async function abrirFechar() {
  await abrirFechamentos();
  fireEvent.click(screen.getByRole('button', { name: /Fechar competência/ }));
  const dialogo = screen.getByRole('dialog', { name: 'Fechar competência de comissões' });
  await waitFor(() => expect(within(dialogo).getByLabelText('Empresa *')).toHaveValue('emp-mia'));
  await within(dialogo).findByRole('option', { name: 'Comissões de vendas' });
  return dialogo;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'));
  perfil();
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  pedidosService.obterPedido.mockResolvedValue({ dados: { id: 'ped-12', numero: 12 } });
  representantesService.obterRepresentante.mockImplementation(async (id) => ({
    dados: { id, nome: id === 'rep-ana' ? 'Ana Representações' : 'José Vendas' },
  }));
  representantesService.listarTodosRepresentantes.mockResolvedValue([
    { id: 'rep-jose', nome: 'José Vendas' },
    { id: 'rep-ana', nome: 'Ana Representações' },
  ]);
  categoriasService.obterArvoreFinanceira.mockResolvedValue({
    dados: [{ id: 'raiz-var', nome: 'Despesas variáveis', natureza: 'despesa', subcategorias: [{ id: 'sub-comissao', nome: 'Comissões de vendas', lancavel: true }] }],
  });
  categoriasService.obterCategoriaFinanceira.mockResolvedValue({ dados: { id: 'sub-comissao', nome: 'Comissões de vendas' } });
  svc.listarComissoes.mockResolvedValue({ dados: [] });
  svc.listarFechamentosComissao.mockResolvedValue({ dados: [FECHAMENTO] });
  svc.fecharComissoes.mockResolvedValue({
    dados: {
      competencia: '2026-09',
      apuracao: { apuradas: ['c-1'], ja_existentes: 3, falhas: [], restam_entregas: false },
      fechados: [FECHAMENTO],
      falhas: [{ representante_id: 'rep-ana', motivo: 'erro de validação: representante sem fornecedor' }],
    },
  });
  svc.obterFechamentoComissao.mockResolvedValue({
    dados: {
      ...FECHAMENTO,
      comissoes: [
        { id: 'com-1', pedido_id: 'ped-12', entrega_id: 'ent-1', competencia: '2026-09', base_centavos: 600000, percentual_bp: 450, valor_centavos: 27000 },
      ],
      ajustes: [{ id: 'aj-1', pedido_id: null, competencia: '2026-09', valor_centavos: -7000, motivo: 'devolução' }],
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Fechamentos de comissão', () => {
  it('lista os fechamentos com totais, vencimento e a conta a pagar', async () => {
    await abrirFechamentos();

    const linha = screen.getByRole('link', { name: '09/2026' }).closest('tr');
    expect(within(linha).getByRole('link', { name: '09/2026' })).toHaveAttribute('href', '/comissoes/fechamentos/fec-1');
    expect(await within(linha).findByText('José Vendas')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 270,00')).toBeInTheDocument();
    expect(within(linha).getByText('-R$ 70,00')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 200,00')).toBeInTheDocument();
    expect(within(linha).getByText('15/10/2026')).toBeInTheDocument();
    expect(within(linha).getByRole('link', { name: 'Pendente de aprovação' })).toHaveAttribute('href', '/solicitacoes/sol-9');
  });

  it('valida o fechamento: competência encerrada e categoria', async () => {
    const dialogo = await abrirFechar();
    fireEvent.change(within(dialogo).getByLabelText('Competência *'), { target: { value: '2026-10' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Fechar competência' }));

    expect(await within(dialogo).findByText('Só fecha competência de mês já encerrado.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Escolha a categoria de despesa da conta a pagar.')).toBeInTheDocument();
    expect(svc.fecharComissoes).not.toHaveBeenCalled();
  });

  it('fecha a competência para todos e mostra fechados e falhas', async () => {
    const dialogo = await abrirFechar();
    expect(within(dialogo).getByLabelText('Competência *')).toHaveValue('2026-09');
    fireEvent.change(within(dialogo).getByLabelText('Categoria da conta a pagar *'), { target: { value: 'sub-comissao' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Fechar competência' }));

    await waitFor(() =>
      expect(svc.fecharComissoes).toHaveBeenCalledWith({
        empresa_id: 'emp-mia',
        competencia: '2026-09',
        categoria_financeira_id: 'sub-comissao',
        representante_id: null,
      })
    );
    const resultado = await screen.findByRole('region', { name: 'Resultado do fechamento' });
    expect(within(resultado).getByText('1 fechamento(s) gerado(s), total de R$ 200,00.')).toBeInTheDocument();
    expect(await within(resultado).findByText(/Ana Representações: erro de validação: representante sem fornecedor/)).toBeInTheDocument();
    await waitFor(() => expect(svc.listarFechamentosComissao).toHaveBeenCalledTimes(2));
  });

  it('fecha só um representante e mostra a recusa como erro', async () => {
    svc.fecharComissoes.mockRejectedValueOnce(new ErroApi(400, 'erro de validação: nada a pagar ao representante na competência'));
    const dialogo = await abrirFechar();
    await within(dialogo).findByRole('option', { name: 'Ana Representações' });
    fireEvent.change(within(dialogo).getByLabelText('Representante'), { target: { value: 'rep-ana' } });
    fireEvent.change(within(dialogo).getByLabelText('Categoria da conta a pagar *'), { target: { value: 'sub-comissao' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Fechar competência' }));

    expect(await within(dialogo).findByText(/nada a pagar ao representante/)).toBeInTheDocument();
    expect(svc.fecharComissoes).toHaveBeenCalledWith(expect.objectContaining({ representante_id: 'rep-ana' }));
  });

  it('quem não é financeiro vê os fechamentos sem fechar', async () => {
    perfil(false);
    await abrirFechamentos();

    expect(screen.queryByRole('button', { name: /Fechar competência/ })).toBeNull();
  });
});

describe('FechamentoDetalhe', () => {
  function renderizar() {
    return render(
      <MemoryRouter initialEntries={['/comissoes/fechamentos/fec-1']}>
        <Routes>
          <Route path="/comissoes/fechamentos/:id" element={<FechamentoDetalhe />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('mostra o fechamento com as comissões, os ajustes e a conta a pagar', async () => {
    renderizar();

    expect(await screen.findByRole('heading', { name: 'Fechamento 09/2026' })).toBeInTheDocument();
    expect(await screen.findByText('José Vendas')).toBeInTheDocument();
    expect(await screen.findByText('Comissões de vendas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pendente de aprovação' })).toHaveAttribute('href', '/solicitacoes/sol-9');
    const comissoes = screen.getByRole('table', { name: 'Comissões do fechamento' });
    expect(await within(comissoes).findByRole('link', { name: 'Pedido 12' })).toBeInTheDocument();
    expect(within(comissoes).getByText('4,50%')).toBeInTheDocument();
    const ajustes = screen.getByRole('table', { name: 'Ajustes do fechamento' });
    expect(within(ajustes).getByText('devolução')).toBeInTheDocument();
    expect(within(ajustes).getByText('-R$ 70,00')).toBeInTheDocument();
  });

  it('mostra o erro com nova tentativa', async () => {
    svc.obterFechamentoComissao.mockRejectedValueOnce(new ErroApi(403, 'comissão de outro representante')).mockResolvedValue({
      dados: { ...FECHAMENTO, comissoes: [], ajustes: [] },
    });
    renderizar();

    expect(await screen.findByText('comissão de outro representante')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: 'Fechamento 09/2026' })).toBeInTheDocument();
  });
});
