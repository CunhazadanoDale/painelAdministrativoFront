import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as caixaService from '../../services/caixa';
import * as categoriasService from '../../services/categoriasFinanceiras';
import * as contasService from '../../services/contasBancarias';
import * as empresasService from '../../services/empresas';
import Caixa from './Caixa';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/contasBancarias', () => ({ listarTodasContasBancarias: vi.fn() }));
vi.mock('../../services/categoriasFinanceiras', () => ({ obterArvoreFinanceira: vi.fn() }));
vi.mock('../../services/caixa', () => ({
  listarSaldos: vi.fn(),
  listarLancamentosExtrato: vi.fn(),
  listarSugestoes: vi.fn(),
  listarPendenciasSistema: vi.fn(),
  conciliarLancamento: vi.fn(),
  classificarLancamento: vi.fn(),
  transferirLancamento: vi.fn(),
  conciliarAutomatico: vi.fn(),
  desfazerConciliacao: vi.fn(),
}));

const svc = caixaService;

const DEBITO = {
  id: 'lan-1',
  conta_bancaria_id: 'cb-sic',
  data: '2026-10-15',
  valor_centavos: -50000,
  tipo: 'debito',
  descricao: 'PAG BOLETO CIMENTOS',
  documento: '123',
  situacao: 'pendente',
  conciliacao_id: null,
};
const TARIFA = { ...DEBITO, id: 'lan-2', data: '2026-10-05', valor_centavos: -1290, descricao: 'TARIFA PACOTE', documento: null };
const CREDITO = { ...DEBITO, id: 'lan-3', data: '2026-10-08', valor_centavos: 100000, tipo: 'credito', descricao: 'TED RECEBIDA' };
const CONCILIADO = { ...DEBITO, id: 'lan-4', data: '2026-10-02', descricao: 'PIX FORNECEDOR', situacao: 'conciliado', conciliacao_id: 'con-1' };

const PAG_1 = { tipo: 'pagamento', id: 'pag-1', data: '2026-10-15', valor_centavos: -30000, descricao: 'Cimentos do Vale', origem_id: 'sol-1' };
const PAG_2 = { tipo: 'pagamento', id: 'pag-2', data: '2026-10-14', valor_centavos: -20000, descricao: 'Cimentos do Vale (2)', origem_id: 'sol-2' };
const PAG_CHEIO = { ...PAG_1, id: 'pag-3', valor_centavos: -50000, descricao: 'Pagamento inteiro', origem_id: 'sol-3' };

async function escolherConta() {
  render(
    <MemoryRouter>
      <Caixa />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('tab', { name: 'Conciliação' }));
  await screen.findByRole('option', { name: 'Sicredi movimento · Sicredi' });
  fireEvent.change(screen.getByLabelText('Conta *'), { target: { value: 'cb-sic' } });
  await screen.findByText('PAG BOLETO CIMENTOS');
}

function linhaDe(texto) {
  return screen.getByText(texto).closest('tr');
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'));
  useAutenticacao.mockReturnValue({ financeiro: true, administrador: false });
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  contasService.listarTodasContasBancarias.mockResolvedValue([
    { id: 'cb-sic', apelido: 'Sicredi movimento', banco_nome: 'Sicredi' },
    { id: 'cb-itau', apelido: 'Itaú cobrança', banco_nome: 'Itaú' },
  ]);
  categoriasService.obterArvoreFinanceira.mockResolvedValue({
    dados: [
      { id: 'raiz-ban', nome: 'Despesas bancárias', natureza: 'despesa', subcategorias: [{ id: 'sub-tarifa', nome: 'Tarifas', lancavel: true }] },
      { id: 'raiz-rec', nome: 'Receitas financeiras', natureza: 'receita', subcategorias: [{ id: 'sub-rend', nome: 'Rendimentos', lancavel: true }] },
      { id: 'raiz-tra', nome: 'Entre contas', natureza: 'transferencia', subcategorias: [{ id: 'sub-transf', nome: 'Transferência entre contas', lancavel: true }] },
    ],
  });
  svc.listarSaldos.mockResolvedValue({ dados: [] });
  svc.listarLancamentosExtrato.mockResolvedValue({ dados: [DEBITO, TARIFA, CREDITO, CONCILIADO] });
  svc.listarSugestoes.mockResolvedValue({ dados: [PAG_CHEIO] });
  svc.listarPendenciasSistema.mockResolvedValue({ dados: [PAG_CHEIO, PAG_1, PAG_2] });
  svc.conciliarLancamento.mockResolvedValue({ dados: { id: 'con-9' } });
  svc.classificarLancamento.mockResolvedValue({ dados: {} });
  svc.transferirLancamento.mockResolvedValue({ dados: {} });
  svc.conciliarAutomatico.mockResolvedValue({ dados: { conciliadas: 12, ambiguos: 1, sem_par: 3, falhas: 0, restam_linhas: false } });
  svc.desfazerConciliacao.mockResolvedValue({ dados: {} });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Conciliação do extrato', () => {
  it('pede a conta e lista as linhas do período com valor e situação', async () => {
    render(
      <MemoryRouter>
        <Caixa />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Conciliação' }));
    expect(await screen.findByText('Escolha a conta para ver o extrato.')).toBeInTheDocument();
    expect(svc.listarLancamentosExtrato).not.toHaveBeenCalled();
    await screen.findByRole('option', { name: 'Sicredi movimento · Sicredi' });
    fireEvent.change(screen.getByLabelText('Conta *'), { target: { value: 'cb-sic' } });

    const debito = (await screen.findByText('PAG BOLETO CIMENTOS')).closest('tr');
    expect(within(debito).getByText('15/10/2026')).toBeInTheDocument();
    expect(within(debito).getByText('-R$ 500,00')).toBeInTheDocument();
    expect(within(debito).getByText('Pendente')).toBeInTheDocument();
    expect(within(linhaDe('PIX FORNECEDOR')).getByText('Conciliado')).toBeInTheDocument();
    expect(svc.listarLancamentosExtrato).toHaveBeenCalledWith(
      expect.objectContaining({ conta: 'cb-sic', de: '2026-10-01', ate: '2026-10-19', situacao: '' })
    );
  });

  it('filtra pela situação e pelo período', async () => {
    await escolherConta();
    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'pendente' } });
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-09-01' } });

    await waitFor(() =>
      expect(svc.listarLancamentosExtrato).toHaveBeenLastCalledWith(
        expect.objectContaining({ conta: 'cb-sic', situacao: 'pendente', de: '2026-09-01', pagina: 1 })
      )
    );
  });

  it('concilia com a sugestão de valor igual', async () => {
    await escolherConta();
    fireEvent.click(within(linhaDe('PAG BOLETO CIMENTOS')).getByRole('button', { name: 'Conciliar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Conciliar lançamento de 15/10/2026' });
    const sugerido = (await within(dialogo).findByText('Pagamento inteiro')).closest('tr');
    expect(within(sugerido).getByText('Sugerido')).toBeInTheDocument();
    expect(within(sugerido).getByRole('link', { name: 'Pagamento' })).toHaveAttribute('href', '/solicitacoes/sol-3');
    expect(svc.listarPendenciasSistema).toHaveBeenCalledWith(
      expect.objectContaining({ conta: 'cb-sic', de: '2026-10-12', ate: '2026-10-18' })
    );

    fireEvent.click(within(sugerido).getByRole('checkbox'));
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Conciliar' }));

    await waitFor(() => expect(svc.conciliarLancamento).toHaveBeenCalledWith('lan-1', [expect.objectContaining({ tipo: 'pagamento', id: 'pag-3' })]));
    await waitFor(() => expect(svc.listarLancamentosExtrato).toHaveBeenCalledTimes(2));
  });

  it('concilia com dois movimentos que somam o valor e recusa soma diferente', async () => {
    await escolherConta();
    fireEvent.click(within(linhaDe('PAG BOLETO CIMENTOS')).getByRole('button', { name: 'Conciliar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Conciliar lançamento de 15/10/2026' });
    fireEvent.click(within((await within(dialogo).findByText('Cimentos do Vale')).closest('tr')).getByRole('checkbox'));
    expect(within(dialogo).getByText('Selecionado: -R$ 300,00 de -R$ 500,00 (falta -R$ 200,00)')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Conciliar' }));
    expect(await within(dialogo).findByText('A soma dos movimentos precisa ser igual ao valor do lançamento.')).toBeInTheDocument();

    fireEvent.click(within(within(dialogo).getByText('Cimentos do Vale (2)').closest('tr')).getByRole('checkbox'));
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Conciliar' }));

    await waitFor(() =>
      expect(svc.conciliarLancamento).toHaveBeenCalledWith('lan-1', [
        expect.objectContaining({ id: 'pag-1' }),
        expect.objectContaining({ id: 'pag-2' }),
      ])
    );
  });

  it('mostra a recusa de movimento já conciliado por outra pessoa', async () => {
    svc.conciliarLancamento.mockRejectedValue(new ErroApi(409, 'movimento já conciliado com outro lançamento do extrato'));
    await escolherConta();
    fireEvent.click(within(linhaDe('PAG BOLETO CIMENTOS')).getByRole('button', { name: 'Conciliar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Conciliar lançamento de 15/10/2026' });
    fireEvent.click(within((await within(dialogo).findByText('Pagamento inteiro')).closest('tr')).getByRole('checkbox'));
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Conciliar' }));

    expect(await within(dialogo).findByText('movimento já conciliado com outro lançamento do extrato')).toBeInTheDocument();
  });

  it('classifica a tarifa com categoria de despesa e a descrição', async () => {
    await escolherConta();
    fireEvent.click(within(linhaDe('TARIFA PACOTE')).getByRole('button', { name: 'Classificar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Classificar lançamento de 05/10/2026' });
    expect(within(dialogo).getByLabelText('Descrição')).toHaveValue('TARIFA PACOTE');
    await within(dialogo).findByRole('option', { name: 'Tarifas' });
    expect(within(dialogo).queryByRole('option', { name: 'Rendimentos' })).toBeNull();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Classificar' }));
    expect(await within(dialogo).findByText('Escolha a categoria.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Categoria *'), { target: { value: 'sub-tarifa' } });
    fireEvent.change(within(dialogo).getByLabelText('Descrição'), { target: { value: 'Tarifa do pacote' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Classificar' }));

    await waitFor(() =>
      expect(svc.classificarLancamento).toHaveBeenCalledWith('lan-2', { categoria_financeira_id: 'sub-tarifa', descricao: 'Tarifa do pacote' })
    );
  });

  it('no crédito oferece categorias de receita', async () => {
    await escolherConta();
    fireEvent.click(within(linhaDe('TED RECEBIDA')).getByRole('button', { name: 'Classificar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Classificar lançamento de 08/10/2026' });

    expect(await within(dialogo).findByRole('option', { name: 'Rendimentos' })).toBeInTheDocument();
    expect(within(dialogo).queryByRole('option', { name: 'Tarifas' })).toBeNull();
  });

  it('registra a transferência para outra conta com categoria de transferência', async () => {
    await escolherConta();
    fireEvent.click(within(linhaDe('PAG BOLETO CIMENTOS')).getByRole('button', { name: 'Transferência' }));
    const dialogo = screen.getByRole('dialog', { name: 'Transferência entre contas — 15/10/2026' });
    expect(within(dialogo).getByText(/sai desta conta/)).toBeInTheDocument();
    await within(dialogo).findByRole('option', { name: 'Itaú cobrança · Itaú' });
    expect(within(dialogo).queryByRole('option', { name: 'Sicredi movimento · Sicredi' })).toBeNull();
    await within(dialogo).findByRole('option', { name: 'Transferência entre contas' });
    fireEvent.change(within(dialogo).getByLabelText('Conta de destino *'), { target: { value: 'cb-itau' } });
    fireEvent.change(within(dialogo).getByLabelText('Categoria *'), { target: { value: 'sub-transf' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar transferência' }));

    await waitFor(() =>
      expect(svc.transferirLancamento).toHaveBeenCalledWith('lan-1', {
        conta_contraparte_id: 'cb-itau',
        categoria_financeira_id: 'sub-transf',
        descricao: 'PAG BOLETO CIMENTOS',
      })
    );
  });

  it('desfaz a conciliação com motivo', async () => {
    await escolherConta();
    fireEvent.click(within(linhaDe('PIX FORNECEDOR')).getByRole('button', { name: 'Desfazer' }));
    const dialogo = screen.getByRole('dialog', { name: 'Desfazer conciliação de 02/10/2026' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Desfazer' }));
    expect(await within(dialogo).findByText('Informe o motivo.')).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('Motivo *'), { target: { value: 'par errado' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Desfazer' }));

    await waitFor(() => expect(svc.desfazerConciliacao).toHaveBeenCalledWith('con-1', 'par errado'));
    await waitFor(() => expect(svc.listarLancamentosExtrato).toHaveBeenCalledTimes(2));
  });

  it('roda a conciliação automática do período e mostra o resultado', async () => {
    await escolherConta();
    fireEvent.click(screen.getByRole('button', { name: /Conciliar automático/ }));

    await waitFor(() =>
      expect(svc.conciliarAutomatico).toHaveBeenCalledWith({ conta_bancaria_id: 'cb-sic', de: '2026-10-01', ate: '2026-10-19' })
    );
    expect(await screen.findByText('Automática: 12 conciliada(s), 1 ambígua(s), 3 sem par, 0 falha(s).')).toBeInTheDocument();
    await waitFor(() => expect(svc.listarLancamentosExtrato).toHaveBeenCalledTimes(2));
  });
});
