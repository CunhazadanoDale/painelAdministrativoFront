import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as dreService from '../../services/dre';
import * as empresasService from '../../services/empresas';
import RelatorioSemanal from './RelatorioSemanal';

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/dre', () => ({ obterRelatorioSemanal: vi.fn() }));

const { obterRelatorioSemanal } = dreService;

const VAZIO = { amortizacao_centavos: 0, juros_centavos: 0, parcelas: 0 };

const RELATORIO = {
  inicio: '2026-10-12',
  fim: '2026-10-18',
  hoje: '2026-10-20',
  notas_emitidas: {
    total_venda: { quantidade: 3, valor_centavos: 327000 },
    por_empresa: [
      { empresa_id: 'emp-mia', natureza: 'venda', quantidade: 3, valor_centavos: 327000 },
      { empresa_id: 'emp-mia', natureza: 'remessa', quantidade: 1, valor_centavos: 5000 },
    ],
  },
  pagamentos: {
    total: { quantidade: 2, valor_centavos: 150000 },
    por_empresa: [
      { empresa_id: 'emp-mia', linha_dre: 'despesa_fixa', quantidade: 1, valor_centavos: 100000 },
      { empresa_id: 'emp-gig', linha_dre: null, quantidade: 1, valor_centavos: 50000 },
    ],
  },
  recebimentos: {
    total: { quantidade: 1, valor_centavos: 54500 },
    por_empresa: [
      { empresa_id: 'emp-mia', tipo: 'conta', quantidade: 1, valor_centavos: 54500, juros_centavos: 500 },
      { empresa_id: 'emp-mia', tipo: 'fomento', quantidade: 1, valor_centavos: 20000, juros_centavos: 0 },
    ],
  },
  titulos_vencidos: {
    total: { quantidade: 51, valor_centavos: 109000 },
    por_empresa: [{ empresa_id: 'emp-mia', quantidade: 51, valor_centavos: 109000 }],
    itens: [
      {
        id: 'tit-1',
        empresa_id: 'emp-mia',
        cliente_nome: 'Construtora Exemplo SPE',
        numero: '123',
        parcela: 2,
        status: 'carteira',
        vencimento: '2026-10-01',
        saldo_centavos: 54500,
      },
    ],
  },
  contas_vencidas: {
    total: { quantidade: 1, valor_centavos: 50000 },
    por_empresa: [{ empresa_id: 'emp-mia', quantidade: 1, valor_centavos: 50000 }],
    itens: [
      {
        id: 'sol-1',
        empresa_id: 'emp-mia',
        fornecedor_nome: null,
        observacao: 'Compra de cimento',
        status: 'aprovado',
        vencimento: '2026-10-01',
        valor_centavos: 50000,
      },
    ],
  },
  estoque_baixo: {
    total: 1,
    itens: [{ produto_id: 'prod-1', nome: 'Cimento CP II', codigo: null, quantidade_atual: 0, estoque_minimo: 5 }],
  },
  saldos_bancarios: {
    saldo_total_centavos: 193710,
    contas_sem_abertura: 1,
    contas: [
      {
        conta_bancaria_id: 'conta-1',
        empresa_id: 'emp-mia',
        apelido: 'Movimento',
        banco_nome: 'Sicredi',
        ativa: true,
        saldo_atual_centavos: 193710,
        ultimo_lancamento_em: '2026-10-14',
      },
      {
        conta_bancaria_id: 'conta-2',
        empresa_id: 'emp-gig',
        apelido: 'Reserva',
        banco_nome: 'Itaú',
        ativa: true,
        saldo_atual_centavos: null,
        ultimo_lancamento_em: null,
      },
    ],
  },
  endividamento: {
    saldo_devedor_centavos: 300000,
    dividas: 1,
    por_credor: [
      { credor_tipo: 'banco', saldo_devedor_centavos: 300000, dividas: 1 },
      { credor_tipo: 'investidor', saldo_devedor_centavos: 0, dividas: 0 },
      { credor_tipo: 'fisco', saldo_devedor_centavos: 0, dividas: 0 },
      { credor_tipo: 'fornecedor', saldo_devedor_centavos: 0, dividas: 0 },
    ],
    por_empresa: [{ empresa_id: 'emp-mia', saldo_devedor_centavos: 300000, dividas: 1 }],
    vencido: VAZIO,
    a_vencer: { amortizacao_centavos: 300000, juros_centavos: 11100, parcelas: 3 },
    a_vencer_30: { amortizacao_centavos: 100000, juros_centavos: 5550, parcelas: 1 },
    a_vencer_90: { amortizacao_centavos: 200000, juros_centavos: 9250, parcelas: 2 },
    a_vencer_365: { amortizacao_centavos: 300000, juros_centavos: 11100, parcelas: 3 },
  },
};

function renderizar() {
  return render(
    <MemoryRouter>
      <RelatorioSemanal />
    </MemoryRouter>
  );
}

function bloco(nome) {
  return screen.getByRole('region', { name: nome });
}

beforeEach(() => {
  vi.clearAllMocks();
  empresasService.listarTodasEmpresas.mockResolvedValue([
    { id: 'emp-mia', nome_fantasia: 'MIA', ativa: true },
    { id: 'emp-gig', nome_fantasia: 'Gigante', ativa: true },
  ]);
  obterRelatorioSemanal.mockImplementation(async ({ semana }) => ({
    dados: semana === '2026-10-05' ? { ...RELATORIO, inicio: '2026-10-05', fim: '2026-10-11' } : RELATORIO,
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RelatorioSemanal', () => {
  it('abre na última semana encerrada e mostra o período e o hoje', async () => {
    renderizar();

    expect(await screen.findByText('Semana de 12/10/2026 a 18/10/2026, com a posição de 20/10/2026.')).toBeInTheDocument();
    expect(obterRelatorioSemanal).toHaveBeenCalledWith({ semana: '', empresa: '', sinal: expect.anything() });
    expect(screen.getByLabelText('Semana de')).toHaveValue('2026-10-12');
  });

  it('mostra notas, pagamentos e recebimentos da semana', async () => {
    renderizar();
    await screen.findByRole('region', { name: 'Notas emitidas' });

    const notas = bloco('Notas emitidas');
    expect(within(notas).getByText(/3 notas de venda · R\$\s?3\.270,00/)).toBeInTheDocument();
    expect(within(notas).getByText('Remessa')).toBeInTheDocument();
    expect(await within(notas).findAllByText('MIA')).toHaveLength(2);

    const pagamentos = bloco('Pagamentos feitos');
    expect(within(pagamentos).getByText(/2 pagamentos · R\$\s?1\.500,00/)).toBeInTheDocument();
    expect(within(pagamentos).getByText('Despesa fixa')).toBeInTheDocument();
    expect(within(pagamentos).getByText('Sem categoria')).toBeInTheDocument();

    const recebimentos = bloco('Recebimentos');
    expect(within(recebimentos).getByText(/1 recebimento em conta · R\$\s?545,00/)).toBeInTheDocument();
    expect(within(recebimentos).getByText('Pelo fomento')).toBeInTheDocument();
    expect(within(recebimentos).getByText(/R\$\s?5,00/)).toBeInTheDocument();
  });

  it('mostra os vencidos com links e o aviso do corte em 50', async () => {
    renderizar();
    await screen.findByRole('region', { name: 'Títulos vencidos' });

    const titulos = bloco('Títulos vencidos');
    expect(within(titulos).getByText(/51 títulos · R\$\s?1\.090,00/)).toBeInTheDocument();
    expect(within(titulos).getByRole('link', { name: '123/2' })).toHaveAttribute('href', '/titulos-receber/tit-1');
    expect(within(titulos).getByText('Construtora Exemplo SPE')).toBeInTheDocument();
    expect(within(titulos).getByText('Em carteira')).toBeInTheDocument();
    expect(within(titulos).getByText('Mostrando 1 de 51, os mais antigos.')).toBeInTheDocument();

    const contas = bloco('Contas a pagar vencidas');
    expect(within(contas).getByRole('link', { name: 'Compra de cimento' })).toHaveAttribute('href', '/solicitacoes/sol-1');
    expect(within(contas).getByText('Aprovado')).toBeInTheDocument();

    const estoque = bloco('Estoque baixo');
    expect(within(estoque).getByRole('link', { name: 'Cimento CP II' })).toHaveAttribute('href', '/produtos/prod-1');
  });

  it('mostra os saldos bancários e o endividamento com o link do resumo de dívidas', async () => {
    renderizar();
    await screen.findByRole('region', { name: 'Saldos bancários' });

    const saldos = bloco('Saldos bancários');
    expect(within(saldos).getByText(/Saldo total: R\$\s?1\.937,10/)).toBeInTheDocument();
    expect(within(saldos).getByText('Movimento · Sicredi')).toBeInTheDocument();
    expect(within(saldos).getByText('Sem saldo inicial')).toBeInTheDocument();
    expect(within(saldos).getByText('1 conta sem saldo inicial fica fora do total.')).toBeInTheDocument();

    const dividas = bloco('Endividamento');
    expect(within(dividas).getByText(/Saldo devedor: R\$\s?3\.000,00/)).toBeInTheDocument();
    const trinta = within(dividas).getByText('Próximos 30 dias').closest('tr');
    expect(within(trinta).getByText(/R\$\s?1\.055,50/)).toBeInTheDocument();
    expect(within(dividas).getByText('Banco')).toBeInTheDocument();
    expect(within(dividas).getByRole('link', { name: 'Ver o resumo de dívidas' })).toHaveAttribute('href', '/dividas/resumo');
  });

  it('navega entre semanas, trava a semana futura e filtra a empresa', async () => {
    renderizar();
    await screen.findByText(/Semana de 12\/10\/2026/);
    expect(screen.getByRole('button', { name: 'Próxima semana' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Semana anterior' }));
    expect(await screen.findByText(/Semana de 05\/10\/2026 a 11\/10\/2026/)).toBeInTheDocument();
    expect(obterRelatorioSemanal).toHaveBeenLastCalledWith({ semana: '2026-10-05', empresa: '', sinal: expect.anything() });

    fireEvent.change(screen.getByLabelText('Semana de'), { target: { value: '2026-10-19' } });
    await waitFor(() =>
      expect(obterRelatorioSemanal).toHaveBeenLastCalledWith({ semana: '2026-10-19', empresa: '', sinal: expect.anything() })
    );

    await screen.findByRole('option', { name: 'Gigante' });
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-gig' } });
    await waitFor(() =>
      expect(obterRelatorioSemanal).toHaveBeenLastCalledWith({
        semana: '2026-10-19',
        empresa: 'emp-gig',
        sinal: expect.anything(),
      })
    );
  });

  it('desliga a próxima semana quando ela começa depois de hoje', async () => {
    obterRelatorioSemanal.mockResolvedValue({ dados: { ...RELATORIO, inicio: '2026-10-19', fim: '2026-10-25' } });
    renderizar();

    await screen.findByText(/Semana de 19\/10\/2026/);
    expect(screen.getByRole('button', { name: 'Próxima semana' })).toBeDisabled();
  });

  it('imprime pelo navegador', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderizar();
    await screen.findByText(/Semana de 12\/10\/2026/);

    fireEvent.click(screen.getByRole('button', { name: /Imprimir/ }));
    expect(imprimir).toHaveBeenCalled();
  });

  it('mostra o erro com nova tentativa', async () => {
    obterRelatorioSemanal.mockRejectedValueOnce(new Error('semana não pode estar no futuro'));
    renderizar();

    expect(await screen.findByText('semana não pode estar no futuro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText(/Semana de 12\/10\/2026/)).toBeInTheDocument();
  });
});
