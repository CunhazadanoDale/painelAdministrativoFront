import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import * as categoriasService from '../../services/categoriasFinanceiras';
import * as contasService from '../../services/contasBancarias';
import * as dividasService from '../../services/dividas';
import * as empresasService from '../../services/empresas';
import * as fornecedoresService from '../../services/fornecedores';
import DividaDetalhe from './DividaDetalhe';

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/fornecedores', () => ({ listarFornecedores: vi.fn(), obterFornecedor: vi.fn() }));
vi.mock('../../services/categoriasFinanceiras', () => ({
  obterArvoreFinanceira: vi.fn(),
  obterCategoriaFinanceira: vi.fn(),
}));
vi.mock('../../services/contasBancarias', () => ({
  listarTodasContasBancarias: vi.fn(),
  obterContaBancaria: vi.fn(),
}));
vi.mock('../../services/dividas', () => ({
  obterDivida: vi.fn(),
  atualizarDivida: vi.fn(),
  atualizarParcelaDivida: vi.fn(),
  reabrirParcelaDivida: vi.fn(),
  cancelarDivida: vi.fn(),
  renegociarDivida: vi.fn(),
  listarHistoricoDivida: vi.fn(),
}));

const svc = dividasService;
const CONFLITO = 'a dívida foi alterada por outra pessoa; recarregue e tente de novo';

const SICREDI = { id: 'for-sic', nome: 'Banco Sicredi SA', nome_fantasia: 'Sicredi' };

const ARVORE = [
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
];

const CATEGORIAS = {
  'cat-amort': { id: 'cat-amort', nome: 'Amortização de empréstimos' },
  'cat-juros': { id: 'cat-juros', nome: 'Juros de empréstimos' },
};

const PARCELA_PAGA = {
  id: 'par-1',
  numero: 1,
  vencimento: '2026-10-10',
  amortizacao_centavos: 100000,
  juros_centavos: 5550,
  status: 'gerada',
  situacao: 'paga',
  substituta_id: null,
  conta_amortizacao: { solicitacao_id: 'sol-1', status: 'pago' },
  conta_juros: { solicitacao_id: 'sol-2', status: 'pago' },
};

const PARCELA_REJEITADA = {
  ...PARCELA_PAGA,
  id: 'par-2',
  numero: 2,
  vencimento: '2026-11-10',
  juros_centavos: 3700,
  situacao: 'conta_cancelada',
  conta_amortizacao: { solicitacao_id: 'sol-3', status: 'rejeitado' },
  conta_juros: null,
};

const PARCELA_PREVISTA = {
  ...PARCELA_PAGA,
  id: 'par-3',
  numero: 3,
  vencimento: '2026-12-10',
  juros_centavos: 1850,
  status: 'prevista',
  situacao: 'a_vencer',
  conta_amortizacao: null,
  conta_juros: null,
};

const PARCELA_CANCELADA = {
  ...PARCELA_PREVISTA,
  id: 'par-0',
  numero: 2,
  status: 'cancelada',
  situacao: 'cancelada',
  substituta_id: 'par-2',
};

const DIVIDA = {
  id: 'div-1',
  empresa_id: 'emp-mia',
  fornecedor_id: 'for-sic',
  credor_tipo: 'banco',
  descricao: 'Capital de giro Sicredi',
  contrato: 'CG-77',
  valor_original_centavos: 500000,
  contratada_em: '2026-03-10',
  taxa_bp: 185,
  taxa_periodo: 'mensal',
  indexador: 'cdi',
  conta_liberacao_id: 'conta-1',
  liberada_em: '2026-03-10',
  saldo_inicial_centavos: 300000,
  data_saldo: '2026-09-30',
  categoria_amortizacao_id: 'cat-amort',
  categoria_juros_id: 'cat-juros',
  divida_origem_id: null,
  status: 'ativa',
  motivo: null,
  observacoes: 'carência de 3 meses',
  versao: 3,
  saldo_devedor_centavos: 200000,
  quitada: false,
  parcelas: [PARCELA_PAGA, PARCELA_CANCELADA, PARCELA_REJEITADA, PARCELA_PREVISTA],
};

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/dividas/div-1']}>
      <Routes>
        <Route path="/dividas" element={<div>Lista de dívidas</div>} />
        <Route path="/dividas/:id" element={<DividaDetalhe />} />
      </Routes>
    </MemoryRouter>
  );
}

async function abrir() {
  renderizar();
  await screen.findByRole('heading', { name: 'Capital de giro Sicredi' });
}

function linhaDaParcela(numero, situacao) {
  const tabela = screen.getByRole('table', { name: 'Parcelas' });
  return within(tabela)
    .getAllByRole('row')
    .find((linha) => {
      const celulas = within(linha).queryAllByRole('cell');
      return celulas[0]?.textContent === String(numero) && within(linha).queryByText(situacao);
    });
}

beforeEach(() => {
  vi.clearAllMocks();
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  fornecedoresService.obterFornecedor.mockResolvedValue({ dados: SICREDI });
  fornecedoresService.listarFornecedores.mockResolvedValue({ dados: [SICREDI] });
  categoriasService.obterArvoreFinanceira.mockResolvedValue({ dados: ARVORE });
  categoriasService.obterCategoriaFinanceira.mockImplementation(async (id) => ({ dados: CATEGORIAS[id] }));
  contasService.listarTodasContasBancarias.mockResolvedValue([]);
  contasService.obterContaBancaria.mockResolvedValue({
    dados: { id: 'conta-1', apelido: 'Movimento', banco_nome: 'Sicredi' },
  });
  svc.obterDivida.mockResolvedValue({ dados: DIVIDA });
  svc.listarHistoricoDivida.mockResolvedValue({
    dados: [
      { id: 'h-1', acao: 'criada', detalhe: 'saldo R$ 3.000,00 em 30/09/2026, 3 parcelas', criado_em: '2026-10-20T13:00:00Z' },
      { id: 'h-2', acao: 'contas_geradas', detalhe: '2 contas da parcela 1', criado_em: '2026-10-20T13:00:01Z' },
    ],
  });
});

describe('DividaDetalhe', () => {
  it('mostra os dados, o saldo devedor, a taxa e os nomes de credor, conta e categorias', async () => {
    await abrir();

    expect(screen.getByText('Ativa')).toBeInTheDocument();
    const dados = screen.getByRole('region', { name: 'Dados da dívida' });
    expect(await within(dados).findByText('MIA')).toBeInTheDocument();
    expect(await within(dados).findByText('Sicredi')).toBeInTheDocument();
    expect(within(dados).getByText('Banco')).toBeInTheDocument();
    expect(within(dados).getByText('CG-77')).toBeInTheDocument();
    expect(within(dados).getByText('CDI + 1,85% a.m.')).toBeInTheDocument();
    expect(within(dados).getByText(/R\$\s?3\.000,00 em 30\/09\/2026/)).toBeInTheDocument();
    expect(within(dados).getByText(/R\$\s?2\.000,00/)).toBeInTheDocument();
    expect(await within(dados).findByText('Movimento · Sicredi em 10/03/2026')).toBeInTheDocument();
    expect(await within(dados).findByText('Amortização de empréstimos')).toBeInTheDocument();
    expect(await within(dados).findByText('Juros de empréstimos')).toBeInTheDocument();
    expect(within(dados).getByText('carência de 3 meses')).toBeInTheDocument();
  });

  it('lista as parcelas com situação, contas a pagar e a cancelada esmaecida', async () => {
    await abrir();

    const paga = linhaDaParcela(1, 'Paga');
    expect(within(paga).getByText(/R\$\s?1\.000,00/)).toBeInTheDocument();
    expect(within(paga).getByText(/R\$\s?55,50/)).toBeInTheDocument();
    const links = within(paga).getAllByRole('link', { name: 'Ver conta' });
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/solicitacoes/sol-1', '/solicitacoes/sol-2']);
    expect(within(paga).getAllByText('Pago')).toHaveLength(2);

    const cancelada = linhaDaParcela(2, 'Cancelada');
    expect(cancelada).toHaveClass('dividas-parcela-cancelada');
    expect(within(cancelada).queryByRole('button')).toBeNull();

    const rejeitada = linhaDaParcela(2, 'Conta cancelada');
    expect(within(rejeitada).getByText('Rejeitado')).toBeInTheDocument();
    expect(within(rejeitada).getByRole('button', { name: 'Reabrir' })).toBeInTheDocument();

    const prevista = linhaDaParcela(3, 'A vencer');
    expect(within(prevista).getAllByText('Prevista')).toHaveLength(2);
    expect(within(prevista).getByRole('button', { name: 'Alterar' })).toBeInTheDocument();

    const historico = screen.getByRole('region', { name: 'Histórico' });
    expect(await within(historico).findByText('Contas a pagar geradas')).toBeInTheDocument();
    expect(within(historico).getByText('2 contas da parcela 1')).toBeInTheDocument();
  });

  it('altera vencimento e juros da parcela prevista com a versão da dívida', async () => {
    svc.atualizarParcelaDivida.mockResolvedValue({ dados: DIVIDA });
    await abrir();

    fireEvent.click(within(linhaDaParcela(3, 'A vencer')).getByRole('button', { name: 'Alterar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Alterar a parcela 3' });
    expect(within(dialogo).getByLabelText('Vencimento *')).toHaveValue('2026-12-10');
    expect(within(dialogo).getByLabelText('Juros, encargos e IOF')).toHaveValue('18,50');
    fireEvent.change(within(dialogo).getByLabelText('Vencimento *'), { target: { value: '2026-12-15' } });
    fireEvent.change(within(dialogo).getByLabelText('Juros, encargos e IOF'), { target: { value: '41' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar parcela' }));

    await waitFor(() =>
      expect(svc.atualizarParcelaDivida).toHaveBeenCalledWith('div-1', 'par-3', {
        versao: 3,
        vencimento: '2026-12-15',
        juros_centavos: 4100,
      })
    );
    await waitFor(() => expect(svc.obterDivida).toHaveBeenCalledTimes(2));
  });

  it('reabre a parcela com conta encerrada e mostra a recusa da API', async () => {
    svc.reabrirParcelaDivida.mockRejectedValueOnce(
      new ErroApi(409, 'cancele ou rejeite antes as contas a pagar da parcela no contas a pagar')
    );
    svc.reabrirParcelaDivida.mockResolvedValue({ dados: DIVIDA });
    await abrir();

    fireEvent.click(within(linhaDaParcela(2, 'Conta cancelada')).getByRole('button', { name: 'Reabrir' }));
    const dialogo = screen.getByRole('dialog', { name: 'Reabrir a parcela 2' });
    expect(within(dialogo).getByText(/só com o que não foi pago/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reabrir parcela' }));
    expect(await within(dialogo).findByText(/cancele ou rejeite antes/)).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reabrir parcela' }));
    await waitFor(() => expect(svc.reabrirParcelaDivida).toHaveBeenLastCalledWith('div-1', 'par-2', 3));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('cancela com motivo e trata o conflito de versão recarregando', async () => {
    svc.cancelarDivida.mockRejectedValue(new ErroApi(409, CONFLITO));
    await abrir();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar dívida' }));
    const dialogo = screen.getByRole('dialog', { name: 'Cancelar "Capital de giro Sicredi"' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar dívida' }));
    expect(await within(dialogo).findByText('Informe o motivo do cancelamento.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Motivo *'), { target: { value: ' lançada em duplicidade ' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar dívida' }));
    await waitFor(() =>
      expect(svc.cancelarDivida).toHaveBeenCalledWith('div-1', { versao: 3, motivo: 'lançada em duplicidade' })
    );
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Recarregar dados' }));
    await waitFor(() => expect(svc.obterDivida).toHaveBeenCalledTimes(2));
  });

  it('edita pelo formulário com a versão lida', async () => {
    svc.atualizarDivida.mockResolvedValue({ dados: DIVIDA });
    await abrir();

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Editar dívida' });
    await within(dialogo).findAllByRole('option', { name: 'Juros de empréstimos' });
    fireEvent.change(within(dialogo).getByLabelText('Contrato'), { target: { value: 'CG-78' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(svc.atualizarDivida).toHaveBeenCalledWith('div-1', expect.objectContaining({ versao: 3, contrato: 'CG-78' }))
    );
  });

  it('renegocia e abre a dívida nova', async () => {
    svc.renegociarDivida.mockResolvedValue({ dados: { ...DIVIDA, id: 'div-2' } });
    await abrir();

    fireEvent.click(screen.getByRole('button', { name: 'Renegociar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Renegociar "Capital de giro Sicredi"' });
    await within(dialogo).findAllByRole('option', { name: 'Juros de empréstimos' });
    await within(dialogo).findByRole('option', { name: 'Sicredi' });
    fireEvent.change(within(dialogo).getByLabelText('Vencimento da parcela 1'), { target: { value: '2999-01-10' } });
    fireEvent.change(within(dialogo).getByLabelText('Amortização da parcela 1'), { target: { value: '2.000,00' } });
    fireEvent.change(within(dialogo).getByLabelText('Motivo da renegociação *'), { target: { value: 'acordo' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Renegociar' }));

    await waitFor(() =>
      expect(svc.renegociarDivida).toHaveBeenCalledWith(
        'div-1',
        expect.objectContaining({ versao: 3, motivo: 'acordo', nova: expect.objectContaining({ saldo_inicial_centavos: 200000 }) })
      )
    );
    await waitFor(() => expect(svc.obterDivida).toHaveBeenCalledWith('div-2', expect.anything()));
  });

  it('dívida renegociada não tem ações e mostra o motivo e a origem', async () => {
    svc.obterDivida.mockResolvedValue({
      dados: { ...DIVIDA, status: 'renegociada', motivo: 'acordo com o banco', divida_origem_id: 'div-0', saldo_devedor_centavos: 0 },
    });
    await abrir();

    expect(screen.getByText('Renegociada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Renegociar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reabrir' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Alterar' })).toBeNull();
    expect(screen.getByText('acordo com o banco')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver a dívida original' })).toHaveAttribute('href', '/dividas/div-0');
  });

  it('mostra o erro da carga com nova tentativa', async () => {
    svc.obterDivida.mockRejectedValueOnce(new ErroApi(404, 'registro não encontrado: dívida não encontrada'));
    renderizar();

    expect(await screen.findByText(/dívida não encontrada/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: 'Capital de giro Sicredi' })).toBeInTheDocument();
  });
});
