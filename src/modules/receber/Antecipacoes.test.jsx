import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import * as antecipacoesService from '../../services/antecipacoes';
import * as clientesService from '../../services/clientes';
import * as contasService from '../../services/contasBancarias';
import * as empresasService from '../../services/empresas';
import * as fornecedoresService from '../../services/fornecedores';
import * as titulosService from '../../services/titulosReceber';
import AntecipacaoDetalhe from './AntecipacaoDetalhe';
import Antecipacoes from './Antecipacoes';
import { useAntecipacoes } from './useAntecipacoes';

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/clientes', () => ({ obterCliente: vi.fn() }));
vi.mock('../../services/fornecedores', () => ({ listarFornecedores: vi.fn(), obterFornecedor: vi.fn() }));
vi.mock('../../services/contasBancarias', () => ({
  listarTodasContasBancarias: vi.fn(),
  obterContaBancaria: vi.fn(),
}));
vi.mock('../../services/titulosReceber', () => ({ listarTitulosAntecipaveis: vi.fn(), obterTitulo: vi.fn() }));
vi.mock('../../services/antecipacoes', () => ({
  listarAntecipacoes: vi.fn(),
  criarAntecipacao: vi.fn(),
  obterAntecipacao: vi.fn(),
  estornarAntecipacao: vi.fn(),
}));

const svc = antecipacoesService;
const CONFLITO = 'a antecipação foi alterada por outra pessoa; recarregue e tente de novo';

const BORDERO = {
  id: 'ant-1',
  empresa_id: 'emp-mia',
  fornecedor_id: 'for-fomento',
  numero: 'B-77',
  operado_em: '2026-10-15',
  taxa_bp: 300,
  valor_bruto_centavos: 300000,
  valor_liquido_centavos: 294000,
  encargos_centavos: 6000,
  conta_bancaria_id: 'cb-itau',
  status: 'ativa',
  estorno_motivo: null,
  estornado_em: null,
  versao: 2,
  titulos: [
    { titulo_id: 'tit-1', valor_centavos: 150000, status_anterior: 'em_banco', vigente: true },
    { titulo_id: 'tit-2', valor_centavos: 150000, status_anterior: 'carteira', vigente: false },
  ],
};

const ANTECIPAVEIS = [
  { id: 'tit-1', cliente_id: 'cli-aguia', numero: 'ALG-10', parcela: 1, origem: 'manual', vencimento: '2026-11-10', saldo_centavos: 150000 },
  { id: 'tit-2', cliente_id: 'cli-aguia', numero: '1234', parcela: 2, origem: 'nota_fiscal_duplicata', vencimento: '2026-11-20', saldo_centavos: 100000 },
];

const TITULOS = {
  'tit-1': { id: 'tit-1', numero: 'ALG-10', parcela: 1, origem: 'manual' },
  'tit-2': { id: 'tit-2', numero: '1234', parcela: 2, origem: 'nota_fiscal_duplicata' },
};

function renderizarLista() {
  return render(
    <MemoryRouter>
      <Antecipacoes />
    </MemoryRouter>
  );
}

function renderizarDetalhe() {
  return render(
    <MemoryRouter initialEntries={['/antecipacoes/ant-1']}>
      <Routes>
        <Route path="/antecipacoes/:id" element={<AntecipacaoDetalhe />} />
      </Routes>
    </MemoryRouter>
  );
}

async function abrirBordero() {
  renderizarLista();
  await screen.findByRole('link', { name: '15/10/2026' });
  fireEvent.click(screen.getByRole('button', { name: /Nova Antecipação/ }));
  const dialogo = screen.getByRole('dialog', { name: 'Nova antecipação' });
  await waitFor(() => expect(within(dialogo).getByLabelText('Empresa *')).toHaveValue('emp-mia'));
  await within(dialogo).findByRole('checkbox', { name: 'Antecipar ALG-10' });
  return dialogo;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'));
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  clientesService.obterCliente.mockResolvedValue({ dados: { id: 'cli-aguia', nome: 'Construtora Águia' } });
  fornecedoresService.obterFornecedor.mockResolvedValue({ dados: { id: 'for-fomento', nome: 'Fomento Sul' } });
  fornecedoresService.listarFornecedores.mockResolvedValue({ dados: [{ id: 'for-fomento', nome: 'Fomento Sul' }] });
  contasService.obterContaBancaria.mockResolvedValue({ dados: { id: 'cb-itau', apelido: 'Itaú cobrança', banco_nome: 'Itaú' } });
  contasService.listarTodasContasBancarias.mockResolvedValue([
    { id: 'cb-sic', apelido: 'Sicredi movimento', banco_nome: 'Sicredi' },
    { id: 'cb-itau', apelido: 'Itaú cobrança', banco_nome: 'Itaú' },
  ]);
  titulosService.listarTitulosAntecipaveis.mockResolvedValue(ANTECIPAVEIS);
  titulosService.obterTitulo.mockImplementation(async (id) => ({ dados: TITULOS[id] }));
  svc.listarAntecipacoes.mockResolvedValue({ dados: [BORDERO] });
  svc.criarAntecipacao.mockResolvedValue({ dados: BORDERO });
  svc.obterAntecipacao.mockResolvedValue({ dados: BORDERO });
  svc.estornarAntecipacao.mockResolvedValue({ dados: { ...BORDERO, status: 'estornada' } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAntecipacoes', () => {
  it('filtra voltando para a primeira página', async () => {
    const { result } = renderHook(() => useAntecipacoes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.filtrar({ status: 'estornada', de: '2026-10-01' }));

    await waitFor(() =>
      expect(svc.listarAntecipacoes).toHaveBeenLastCalledWith(
        expect.objectContaining({ pagina: 1, status: 'estornada', de: '2026-10-01' })
      )
    );
  });
});

describe('Antecipacoes', () => {
  it('lista os borderôs com fomento, valores e status', async () => {
    renderizarLista();

    const linha = (await screen.findByRole('link', { name: '15/10/2026' })).closest('tr');
    expect(within(linha).getByRole('link', { name: '15/10/2026' })).toHaveAttribute('href', '/antecipacoes/ant-1');
    expect(within(linha).getByText('B-77')).toBeInTheDocument();
    expect(await within(linha).findByText('Fomento Sul')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 3.000,00')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 2.940,00')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 60,00')).toBeInTheDocument();
    expect(within(linha).getByText('Ativa')).toBeInTheDocument();
  });

  it('filtra por status e período', async () => {
    renderizarLista();
    await screen.findByRole('link', { name: '15/10/2026' });

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'ativa' } });
    fireEvent.change(screen.getByLabelText('Operado de'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Operado até'), { target: { value: '2026-10-31' } });

    await waitFor(() =>
      expect(svc.listarAntecipacoes).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'ativa', de: '2026-10-01', ate: '2026-10-31', pagina: 1 })
      )
    );
  });

  it('valida o borderô: fomento, conta, títulos e líquido até o bruto', async () => {
    const dialogo = await abrirBordero();

    fireEvent.click(within(dialogo).getByRole('checkbox', { name: 'Antecipar ALG-10' }));
    expect(within(dialogo).getByText(/Bruto: R\$ 1\.500,00/)).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('Valor líquido *'), { target: { value: '1.600,00' } });
    fireEvent.change(within(dialogo).getByLabelText('Taxa ao mês (%)'), { target: { value: '150' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText('Escolha o fomento.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Escolha a conta onde o líquido entrou.')).toBeInTheDocument();
    expect(within(dialogo).getByText('A taxa vai de 0 a 100% ao mês.')).toBeInTheDocument();
    expect(within(dialogo).getByText('O líquido precisa ser maior que zero e no máximo o bruto (R$ 1.500,00).')).toBeInTheDocument();
    expect(svc.criarAntecipacao).not.toHaveBeenCalled();
  });

  it('pede ao menos um título', async () => {
    const dialogo = await abrirBordero();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText('Selecione ao menos um título.')).toBeInTheDocument();
  });

  it('cria o borderô com os títulos marcados, a taxa em pontos-base e o líquido', async () => {
    const dialogo = await abrirBordero();
    await within(dialogo).findByRole('option', { name: 'Fomento Sul' });
    fireEvent.change(within(dialogo).getByLabelText('Fomento *'), { target: { value: 'for-fomento' } });
    fireEvent.change(within(dialogo).getByLabelText('Número do borderô'), { target: { value: ' B-77 ' } });
    fireEvent.change(within(dialogo).getByLabelText('Operado em *'), { target: { value: '2026-10-15' } });
    fireEvent.change(within(dialogo).getByLabelText('Taxa ao mês (%)'), { target: { value: '2,5' } });
    await within(dialogo).findByRole('option', { name: 'Itaú cobrança · Itaú' });
    fireEvent.change(within(dialogo).getByLabelText('Conta do crédito *'), { target: { value: 'cb-itau' } });
    fireEvent.click(within(dialogo).getByRole('checkbox', { name: 'Antecipar ALG-10' }));
    fireEvent.click(within(dialogo).getByRole('checkbox', { name: 'Antecipar 1234/2' }));
    expect(within(dialogo).getByText(/Bruto: R\$ 2\.500,00/)).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('Valor líquido *'), { target: { value: '2.400,00' } });
    expect(within(dialogo).getByText(/Encargos: R\$ 100,00/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(svc.criarAntecipacao).toHaveBeenCalledWith({
        empresa_id: 'emp-mia',
        fornecedor_id: 'for-fomento',
        numero: 'B-77',
        operado_em: '2026-10-15',
        taxa_bp: 250,
        valor_liquido_centavos: 240000,
        conta_bancaria_id: 'cb-itau',
        titulo_ids: ['tit-1', 'tit-2'],
      })
    );
    expect(titulosService.listarTitulosAntecipaveis).toHaveBeenCalledWith(expect.objectContaining({ empresa: 'emp-mia' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('mostra a recusa do cliente que proíbe antecipação sem perder o borderô', async () => {
    svc.criarAntecipacao.mockRejectedValue(new ErroApi(400, 'cliente não permite antecipação: Construtora Águia'));
    const dialogo = await abrirBordero();
    await within(dialogo).findByRole('option', { name: 'Fomento Sul' });
    fireEvent.change(within(dialogo).getByLabelText('Fomento *'), { target: { value: 'for-fomento' } });
    await within(dialogo).findByRole('option', { name: 'Itaú cobrança · Itaú' });
    fireEvent.change(within(dialogo).getByLabelText('Conta do crédito *'), { target: { value: 'cb-itau' } });
    fireEvent.click(within(dialogo).getByRole('checkbox', { name: 'Antecipar ALG-10' }));
    fireEvent.change(within(dialogo).getByLabelText('Valor líquido *'), { target: { value: '1.450,00' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText('cliente não permite antecipação: Construtora Águia')).toBeInTheDocument();
    expect(within(dialogo).getByRole('checkbox', { name: 'Antecipar ALG-10' })).toBeChecked();
  });
});

describe('AntecipacaoDetalhe', () => {
  it('mostra o borderô e os títulos com o link e se seguem vigentes', async () => {
    renderizarDetalhe();

    expect(await screen.findByRole('heading', { name: 'Antecipação B-77' })).toBeInTheDocument();
    expect(await screen.findByText('Fomento Sul')).toBeInTheDocument();
    expect(await screen.findByText('Itaú cobrança · Itaú')).toBeInTheDocument();
    expect(screen.getByText('3,00% ao mês')).toBeInTheDocument();
    const tabela = screen.getByRole('table', { name: 'Títulos do borderô' });
    const primeiro = (await within(tabela).findByRole('link', { name: 'ALG-10' })).closest('tr');
    expect(within(primeiro).getByRole('link', { name: 'ALG-10' })).toHaveAttribute('href', '/titulos-receber/tit-1');
    expect(within(primeiro).getByText('Em banco')).toBeInTheDocument();
    expect(within(primeiro).getByText('Vigente')).toBeInTheDocument();
    const segundo = (await within(tabela).findByRole('link', { name: '1234/2' })).closest('tr');
    expect(within(segundo).getByText('Fora do borderô')).toBeInTheDocument();
  });

  it('estorna o borderô ativo com motivo e trata o conflito', async () => {
    svc.estornarAntecipacao.mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    renderizarDetalhe();
    fireEvent.click(await screen.findByRole('button', { name: 'Estornar borderô' }));
    const dialogo = screen.getByRole('dialog', { name: 'Estornar antecipação B-77' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Estornar' }));
    expect(await within(dialogo).findByText('Informe o motivo do estorno.')).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('Motivo *'), { target: { value: 'lançado na empresa errada' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Estornar' }));

    await waitFor(() =>
      expect(svc.estornarAntecipacao).toHaveBeenCalledWith('ant-1', { motivo: 'lançado na empresa errada', versao: 2 })
    );
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Recarregar dados' }));
    await waitFor(() => expect(svc.obterAntecipacao).toHaveBeenCalledTimes(2));
  });

  it('borderô estornado mostra o motivo e não oferece estorno', async () => {
    svc.obterAntecipacao.mockResolvedValue({
      dados: { ...BORDERO, status: 'estornada', estorno_motivo: 'lançado errado', estornado_em: '2026-10-16T12:00:00Z' },
    });
    renderizarDetalhe();

    expect(await screen.findByText('lançado errado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Estornar borderô' })).toBeNull();
  });
});
