import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as caixaService from '../../services/caixa';
import * as contasService from '../../services/contasBancarias';
import * as empresasService from '../../services/empresas';
import Caixa from './Caixa';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/contasBancarias', () => ({ listarTodasContasBancarias: vi.fn(), obterContaBancaria: vi.fn() }));
vi.mock('../../services/caixa', () => ({
  listarSaldos: vi.fn(),
  listarFechamentosCaixa: vi.fn(),
  obterPreviaFechamento: vi.fn(),
  fecharMes: vi.fn(),
  obterFechamentoCaixa: vi.fn(),
  reabrirFechamentoCaixa: vi.fn(),
}));

const svc = caixaService;

const FECHAMENTO = {
  id: 'fc-1',
  conta_bancaria_id: 'cb-sic',
  competencia: '2026-09',
  saldo_inicial_centavos: 100000,
  entradas_centavos: 10000,
  saidas_centavos: 1290,
  saldo_final_centavos: 108710,
  saldo_banco_centavos: 108710,
  vigente: true,
  reaberto_em: null,
  motivo_reabertura: null,
  criado_em: '2026-10-02T12:00:00Z',
};

const PREVIA = {
  conta_bancaria_id: 'cb-sic',
  competencia: '2026-09',
  saldo_inicial_centavos: 100000,
  entradas_centavos: 10000,
  saidas_centavos: 1290,
  saldo_final_centavos: 108710,
  saldo_banco_centavos: 108710,
  lancamentos_pendentes: 0,
  conciliacoes_invalidadas: 0,
  mes_encerrado: true,
  pode_fechar: true,
  movimentos_sem_linha: [],
};

function perfil(administrador = false) {
  useAutenticacao.mockReturnValue({ financeiro: true, administrador });
}

async function abrirFechamentos() {
  render(
    <MemoryRouter>
      <Caixa />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('tab', { name: 'Fechamentos' }));
  await screen.findByText('09/2026');
}

async function abrirFechar(previa = PREVIA) {
  svc.obterPreviaFechamento.mockResolvedValue({ dados: previa });
  await abrirFechamentos();
  fireEvent.click(screen.getByRole('button', { name: /Fechar mês/ }));
  const dialogo = screen.getByRole('dialog', { name: 'Fechar mês da conta' });
  await within(dialogo).findByRole('option', { name: 'Sicredi movimento · Sicredi' });
  fireEvent.change(within(dialogo).getByLabelText('Conta *'), { target: { value: 'cb-sic' } });
  return dialogo;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'));
  perfil();
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  contasService.listarTodasContasBancarias.mockResolvedValue([{ id: 'cb-sic', apelido: 'Sicredi movimento', banco_nome: 'Sicredi' }]);
  contasService.obterContaBancaria.mockResolvedValue({ dados: { id: 'cb-sic', apelido: 'Sicredi movimento', banco_nome: 'Sicredi' } });
  svc.listarSaldos.mockResolvedValue({ dados: [] });
  svc.listarFechamentosCaixa.mockResolvedValue({ dados: [FECHAMENTO, { ...FECHAMENTO, id: 'fc-0', competencia: '2026-08', vigente: false, motivo_reabertura: 'extrato corrigido' }] });
  svc.fecharMes.mockResolvedValue({ dados: FECHAMENTO });
  svc.reabrirFechamentoCaixa.mockResolvedValue({ dados: { ...FECHAMENTO, vigente: false } });
  svc.obterFechamentoCaixa.mockResolvedValue({
    dados: {
      ...FECHAMENTO,
      conciliacoes_invalidadas: 1,
      movimentos_sem_linha: [{ tipo: 'pagamento', id: 'pag-1', data: '2026-09-20', valor_centavos: -5000, descricao: 'Pagamento lançado depois', origem_id: 'sol-1' }],
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Fechamento do caixa', () => {
  it('lista os fechamentos com saldos, conta e situação', async () => {
    await abrirFechamentos();

    const setembro = screen.getByText('09/2026').closest('tr');
    expect(await within(setembro).findByText('Sicredi movimento · Sicredi')).toBeInTheDocument();
    expect(within(setembro).getByText('R$ 1.000,00')).toBeInTheDocument();
    expect(within(setembro).getAllByText('R$ 1.087,10')).toHaveLength(2);
    expect(within(setembro).getByText('Fechado')).toBeInTheDocument();
    expect(within(screen.getByText('08/2026').closest('tr')).getByText('Reaberto')).toBeInTheDocument();
  });

  it('mostra a prévia que pode fechar e fecha o mês anterior', async () => {
    const dialogo = await abrirFechar();
    expect(within(dialogo).getByLabelText('Competência *')).toHaveValue('2026-09');

    expect(await within(dialogo).findByText('Pode fechar.')).toBeInTheDocument();
    expect(svc.obterPreviaFechamento).toHaveBeenCalledWith(expect.objectContaining({ conta: 'cb-sic', competencia: '2026-09' }));
    const resumo = within(dialogo).getByRole('table', { name: 'Prévia do fechamento' });
    expect(within(resumo).getAllByText('R$ 1.087,10')).toHaveLength(2);
    expect(within(dialogo).queryByLabelText('Saldo do banco no fim do mês *')).toBeNull();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Fechar o mês' }));

    await waitFor(() => expect(svc.fecharMes).toHaveBeenCalledWith({ conta_bancaria_id: 'cb-sic', competencia: '2026-09', saldo_banco_centavos: null }));
    await waitFor(() => expect(svc.listarFechamentosCaixa).toHaveBeenCalledTimes(2));
  });

  it('sem saldo do banco no OFX pede o saldo para fechar', async () => {
    const dialogo = await abrirFechar({ ...PREVIA, saldo_banco_centavos: null, pode_fechar: false });
    const campo = await within(dialogo).findByLabelText('Saldo do banco no fim do mês *');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Fechar o mês' }));
    expect(await within(dialogo).findByText('Informe o saldo do banco no fim do mês.')).toBeInTheDocument();

    fireEvent.change(campo, { target: { value: '1.087,10' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Fechar o mês' }));
    await waitFor(() =>
      expect(svc.fecharMes).toHaveBeenCalledWith({ conta_bancaria_id: 'cb-sic', competencia: '2026-09', saldo_banco_centavos: 108710 })
    );
  });

  it('avisa o que impede o fechamento e lista os movimentos sem linha', async () => {
    const dialogo = await abrirFechar({
      ...PREVIA,
      lancamentos_pendentes: 3,
      conciliacoes_invalidadas: 1,
      saldo_banco_centavos: 108760,
      pode_fechar: false,
      movimentos_sem_linha: [{ tipo: 'recebimento', id: 'rec-1', data: '2026-09-29', valor_centavos: 2000, descricao: 'Recebimento sem linha', origem_id: 'tit-1' }],
    });

    expect(await within(dialogo).findByText('3 lançamento(s) pendente(s) de conciliação no mês.')).toBeInTheDocument();
    expect(within(dialogo).getByText('1 conciliação(ões) invalidada(s) por estorno; desfaça antes de fechar.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Saldo calculado diferente do saldo do banco: diferença de R$ 0,50.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Recebimento sem linha')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Fechar o mês' }));
    expect(await within(dialogo).findByText('Resolva as pendências antes de fechar.')).toBeInTheDocument();
    expect(svc.fecharMes).not.toHaveBeenCalled();
  });

  it('mostra a recusa da API ao fechar', async () => {
    svc.fecharMes.mockRejectedValue(new ErroApi(409, 'feche antes o mês de 08/2026'));
    const dialogo = await abrirFechar();
    await within(dialogo).findByText('Pode fechar.');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Fechar o mês' }));

    expect(await within(dialogo).findByText('feche antes o mês de 08/2026')).toBeInTheDocument();
  });

  it('mostra o detalhe com as divergências', async () => {
    await abrirFechamentos();
    fireEvent.click(within(screen.getByText('09/2026').closest('tr')).getByRole('button', { name: 'Detalhe' }));
    const dialogo = screen.getByRole('dialog', { name: 'Fechamento 09/2026' });

    expect(await within(dialogo).findByText('1 conciliação(ões) invalidada(s) depois do fechamento.')).toBeInTheDocument();
    const movimento = within(dialogo).getByText('Pagamento lançado depois').closest('tr');
    expect(within(movimento).getByRole('link', { name: 'Pagamento' })).toHaveAttribute('href', '/solicitacoes/sol-1');
  });

  it('o administrador reabre o último fechamento com motivo', async () => {
    perfil(true);
    await abrirFechamentos();
    expect(within(screen.getByText('08/2026').closest('tr')).queryByRole('button', { name: 'Reabrir' })).toBeNull();
    fireEvent.click(within(screen.getByText('09/2026').closest('tr')).getByRole('button', { name: 'Reabrir' }));
    const dialogo = screen.getByRole('dialog', { name: 'Reabrir fechamento 09/2026' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reabrir' }));
    expect(await within(dialogo).findByText('Informe o motivo da reabertura.')).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('Motivo *'), { target: { value: 'extrato corrigido' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reabrir' }));

    await waitFor(() => expect(svc.reabrirFechamentoCaixa).toHaveBeenCalledWith('fc-1', 'extrato corrigido'));
  });

  it('o financeiro sem administrador não reabre', async () => {
    await abrirFechamentos();

    expect(screen.queryByRole('button', { name: 'Reabrir' })).toBeNull();
  });
});
