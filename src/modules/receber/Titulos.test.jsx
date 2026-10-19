import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import * as categoriasService from '../../services/categoriasFinanceiras';
import * as clientesService from '../../services/clientes';
import * as contasService from '../../services/contasBancarias';
import * as empresasService from '../../services/empresas';
import * as titulosService from '../../services/titulosReceber';
import Titulos from './Titulos';
import { TAMANHO_PAGINA, useTitulos } from './useTitulos';

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/clientes', () => ({ listarClientes: vi.fn(), obterCliente: vi.fn() }));
vi.mock('../../services/categoriasFinanceiras', () => ({ obterArvoreFinanceira: vi.fn() }));
vi.mock('../../services/contasBancarias', () => ({ listarTodasContasBancarias: vi.fn() }));
vi.mock('../../services/titulosReceber', () => ({ listarTitulos: vi.fn(), criarTitulo: vi.fn(), atualizarTitulo: vi.fn() }));

const { listarTitulos, criarTitulo } = titulosService;

const ALUGUEL = {
  id: 'tit-1',
  empresa_id: 'emp-mia',
  cliente_id: 'cli-aguia',
  origem: 'manual',
  numero: 'ALG-10',
  parcela: 1,
  vencimento: '2026-11-10',
  valor_centavos: 150000,
  recebido_centavos: 0,
  saldo_centavos: 150000,
  vencido: false,
  status: 'carteira',
};

const DUPLICATA = {
  ...ALUGUEL,
  id: 'tit-2',
  origem: 'nota_fiscal_duplicata',
  numero: '1234',
  parcela: 2,
  vencimento: '2026-10-10',
  recebido_centavos: 50000,
  saldo_centavos: 100000,
  vencido: true,
  status: 'em_banco',
};

function renderizar() {
  return render(
    <MemoryRouter>
      <Titulos />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-18T15:00:00Z'));
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  clientesService.obterCliente.mockResolvedValue({ dados: { id: 'cli-aguia', nome: 'Construtora Águia' } });
  clientesService.listarClientes.mockResolvedValue({ dados: [{ id: 'cli-aguia', nome: 'Construtora Águia' }] });
  categoriasService.obterArvoreFinanceira.mockResolvedValue({
    dados: [{ id: 'raiz', nome: 'Receitas diversas', natureza: 'receita', subcategorias: [{ id: 'sub-aluguel', nome: 'Aluguel recebido', lancavel: true }] }],
  });
  contasService.listarTodasContasBancarias.mockResolvedValue([
    { id: 'cb-sic', apelido: 'Sicredi movimento', banco_nome: 'Sicredi' },
    { id: 'cb-itau', apelido: 'Itaú cobrança', banco_nome: 'Itaú' },
  ]);
  listarTitulos.mockResolvedValue({ dados: [ALUGUEL, DUPLICATA] });
  criarTitulo.mockResolvedValue({ dados: ALUGUEL });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useTitulos', () => {
  it('carrega a primeira página e filtra voltando para a página 1', async () => {
    listarTitulos.mockResolvedValue({ dados: Array.from({ length: TAMANHO_PAGINA + 1 }, (_, i) => ({ ...ALUGUEL, id: `t-${i}` })) });
    const { result } = renderHook(() => useTitulos());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.titulos).toHaveLength(TAMANHO_PAGINA);
    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.filtrar({ status: 'em_banco', vencidos: true }));

    await waitFor(() =>
      expect(listarTitulos).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1, status: 'em_banco', vencidos: true }))
    );
  });
});

describe('Titulos', () => {
  it('lista com número, cliente, vencimento, saldo, status, origem e o selo de vencido', async () => {
    renderizar();

    const aluguel = (await screen.findByRole('link', { name: 'ALG-10' })).closest('tr');
    expect(within(aluguel).getByRole('link', { name: 'ALG-10' })).toHaveAttribute('href', '/titulos-receber/tit-1');
    expect(await within(aluguel).findByText('Construtora Águia')).toBeInTheDocument();
    expect(within(aluguel).getByText('10/11/2026')).toBeInTheDocument();
    expect(within(aluguel).getByText('R$ 1.500,00')).toBeInTheDocument();
    expect(within(aluguel).getByText('Em carteira')).toBeInTheDocument();
    const duplicata = screen.getByRole('link', { name: '1234/2' }).closest('tr');
    expect(within(duplicata).getByText('R$ 1.000,00 de R$ 1.500,00')).toBeInTheDocument();
    expect(within(duplicata).getByText('Vencido')).toBeInTheDocument();
    expect(within(duplicata).getByText('Duplicata de NF')).toBeInTheDocument();
  });

  it('mostra o vazio conforme o filtro e o erro com nova tentativa', async () => {
    listarTitulos.mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValue({ dados: [] });

    renderizar();

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhum título a receber nas empresas do seu acesso.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'recebido' } });
    expect(await screen.findByText('Nenhum título encontrado com estes filtros.')).toBeInTheDocument();
  });

  it('filtra por empresa, status, origem, cliente, vencimento, vencidos e origem cancelada', async () => {
    renderizar();
    await screen.findByRole('link', { name: 'ALG-10' });
    await screen.findByRole('option', { name: 'MIA' });

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-mia' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'em_banco' } });
    fireEvent.change(screen.getByLabelText('Origem'), { target: { value: 'manual' } });
    fireEvent.click(screen.getByLabelText('Só vencidos'));
    fireEvent.click(screen.getByLabelText('Origem cancelada'));
    fireEvent.click(screen.getByRole('button', { name: /Mais filtros/ }));
    await screen.findByRole('option', { name: 'Construtora Águia' });
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'cli-aguia' } });
    fireEvent.change(screen.getByLabelText('Vencimento de'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Vencimento até'), { target: { value: '2026-10-31' } });

    await waitFor(() =>
      expect(listarTitulos).toHaveBeenLastCalledWith(
        expect.objectContaining({
          empresa: 'emp-mia',
          status: 'em_banco',
          origem: 'manual',
          cliente: 'cli-aguia',
          vencimento_de: '2026-10-01',
          vencimento_ate: '2026-10-31',
          vencidos: true,
          origemCancelada: true,
          pagina: 1,
        })
      )
    );
  });

  it('valida o título manual antes de enviar', async () => {
    renderizar();
    await screen.findByRole('link', { name: 'ALG-10' });
    fireEvent.click(screen.getByRole('button', { name: /Novo Título/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Novo título a receber' });
    await waitFor(() => expect(within(dialogo).getByLabelText('Empresa *')).toHaveValue('emp-mia'));
    fireEvent.change(within(dialogo).getByLabelText('Parcela *'), { target: { value: '0' } });
    fireEvent.change(within(dialogo).getByLabelText('Vencimento *'), { target: { value: '2026-10-17' } });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText('Selecione o cliente.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe o número do documento.')).toBeInTheDocument();
    expect(within(dialogo).getByText('A parcela vai de 1 a 999.')).toBeInTheDocument();
    expect(within(dialogo).getByText('O vencimento não pode ser antes de hoje.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe um valor maior que zero.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Escolha a categoria de receita.')).toBeInTheDocument();
    expect(criarTitulo).not.toHaveBeenCalled();
  });

  it('cria o título manual com a conta de cobrança, que o faz nascer em banco', async () => {
    renderizar();
    await screen.findByRole('link', { name: 'ALG-10' });
    fireEvent.click(screen.getByRole('button', { name: /Novo Título/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Novo título a receber' });
    await waitFor(() => expect(within(dialogo).getByLabelText('Empresa *')).toHaveValue('emp-mia'));
    await within(dialogo).findByRole('option', { name: 'Construtora Águia' });
    await within(dialogo).findByRole('option', { name: 'Aluguel recebido' });

    fireEvent.change(within(dialogo).getByLabelText('Cliente *'), { target: { value: 'cli-aguia' } });
    fireEvent.change(within(dialogo).getByLabelText('Número *'), { target: { value: ' ALG-11 ' } });
    fireEvent.change(within(dialogo).getByLabelText('Vencimento *'), { target: { value: '2026-11-10' } });
    fireEvent.change(within(dialogo).getByLabelText('Valor *'), { target: { value: '1.500,00' } });
    fireEvent.change(within(dialogo).getByLabelText('Categoria de receita *'), { target: { value: 'sub-aluguel' } });
    await within(dialogo).findByRole('option', { name: 'Itaú cobrança · Itaú' });
    fireEvent.change(within(dialogo).getByLabelText('Conta de cobrança'), { target: { value: 'cb-itau' } });
    expect(within(dialogo).getByText(/nasce em banco/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(criarTitulo).toHaveBeenCalledWith({
        empresa_id: 'emp-mia',
        cliente_id: 'cli-aguia',
        numero: 'ALG-11',
        parcela: 1,
        vencimento: '2026-11-10',
        valor_centavos: 150000,
        categoria_financeira_id: 'sub-aluguel',
        conta_bancaria_id: 'cb-itau',
        observacao: '',
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('mostra o número repetido como erro do formulário sem perder o que foi digitado', async () => {
    criarTitulo.mockRejectedValue(new ErroApi(409, 'já existe um título com este número e parcela na empresa'));
    renderizar();
    await screen.findByRole('link', { name: 'ALG-10' });
    fireEvent.click(screen.getByRole('button', { name: /Novo Título/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Novo título a receber' });
    await waitFor(() => expect(within(dialogo).getByLabelText('Empresa *')).toHaveValue('emp-mia'));
    await within(dialogo).findByRole('option', { name: 'Construtora Águia' });
    await within(dialogo).findByRole('option', { name: 'Aluguel recebido' });
    fireEvent.change(within(dialogo).getByLabelText('Cliente *'), { target: { value: 'cli-aguia' } });
    fireEvent.change(within(dialogo).getByLabelText('Número *'), { target: { value: 'ALG-10' } });
    fireEvent.change(within(dialogo).getByLabelText('Valor *'), { target: { value: '10,00' } });
    fireEvent.change(within(dialogo).getByLabelText('Categoria de receita *'), { target: { value: 'sub-aluguel' } });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText('já existe um título com este número e parcela na empresa')).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Número *')).toHaveValue('ALG-10');
  });
});
