import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import * as categoriasService from '../../services/categoriasFinanceiras';
import * as clientesService from '../../services/clientes';
import * as contasService from '../../services/contasBancarias';
import * as empresasService from '../../services/empresas';
import * as titulosService from '../../services/titulosReceber';
import TituloDetalhe from './TituloDetalhe';

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/clientes', () => ({ listarClientes: vi.fn(), obterCliente: vi.fn() }));
vi.mock('../../services/categoriasFinanceiras', () => ({
  obterArvoreFinanceira: vi.fn(),
  obterCategoriaFinanceira: vi.fn(),
}));
vi.mock('../../services/contasBancarias', () => ({
  listarTodasContasBancarias: vi.fn(),
  obterContaBancaria: vi.fn(),
}));
vi.mock('../../services/titulosReceber', () => ({
  obterTitulo: vi.fn(),
  listarHistoricoTitulo: vi.fn(),
  listarRecebimentos: vi.fn(),
  registrarRecebimento: vi.fn(),
  estornarRecebimento: vi.fn(),
}));

const svc = titulosService;
const CONFLITO = 'o título foi alterado por outra pessoa; recarregue e tente de novo';

const EM_BANCO = {
  id: 'tit-1',
  empresa_id: 'emp-mia',
  cliente_id: 'cli-aguia',
  origem: 'manual',
  origem_id: null,
  numero: 'ALG-10',
  parcela: 1,
  vencimento: '2026-11-10',
  valor_centavos: 150000,
  recebido_centavos: 50000,
  saldo_centavos: 100000,
  vencido: false,
  categoria_financeira_id: null,
  competencia: '2026-11',
  conta_bancaria_id: 'cb-itau',
  status: 'em_banco',
  boleto_enviado_em: null,
  boleto_canal: null,
  origem_cancelada_em: null,
  cancelado_motivo: null,
  observacao: null,
  versao: 6,
};

const ANTECIPADO = { ...EM_BANCO, status: 'antecipado' };

const RECEBIMENTOS = [
  {
    id: 'rec-1',
    tipo: 'conta',
    conta_bancaria_id: 'cb-itau',
    recebido_em: '2026-10-10',
    valor_centavos: 50000,
    juros_centavos: 800,
    desconto_centavos: 0,
    entrada_no_caixa_centavos: 50800,
    registrou_entrada_pedido: false,
    estornado: false,
    estorno: null,
    repasse: null,
  },
  {
    id: 'rec-0',
    tipo: 'conta',
    conta_bancaria_id: 'cb-itau',
    recebido_em: '2026-10-05',
    valor_centavos: 20000,
    juros_centavos: 0,
    desconto_centavos: 0,
    entrada_no_caixa_centavos: 20000,
    registrou_entrada_pedido: false,
    estornado: true,
    estorno: { motivo: 'valor errado', estornado_em: '2026-10-06' },
    repasse: null,
  },
  {
    id: 'rec-2',
    tipo: 'conta',
    conta_bancaria_id: 'cb-sic',
    recebido_em: '2026-10-12',
    valor_centavos: 10000,
    juros_centavos: 0,
    desconto_centavos: 0,
    entrada_no_caixa_centavos: 10000,
    registrou_entrada_pedido: false,
    estornado: false,
    estorno: null,
    repasse: { id: 'rep-1', solicitacao_id: 'sol-9', valor_centavos: 10000 },
  },
];

const CONTAS = {
  'cb-itau': { id: 'cb-itau', apelido: 'Itaú cobrança', banco_nome: 'Itaú' },
  'cb-sic': { id: 'cb-sic', apelido: 'Sicredi movimento', banco_nome: 'Sicredi' },
};

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/titulos-receber/tit-1']}>
      <Routes>
        <Route path="/titulos-receber/:id" element={<TituloDetalhe />} />
      </Routes>
    </MemoryRouter>
  );
}

async function abrir(titulo = EM_BANCO) {
  svc.obterTitulo.mockResolvedValue({ dados: titulo });
  renderizar();
  await screen.findByRole('heading', { name: /Título/ });
}

async function abrirRecebimento(titulo) {
  await abrir(titulo);
  fireEvent.click(screen.getByRole('button', { name: 'Registrar recebimento' }));
  const dialogo = screen.getByRole('dialog', { name: 'Recebimento do título ALG-10' });
  await within(dialogo).findByRole('option', { name: 'Sicredi movimento · Sicredi' });
  return dialogo;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'));
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  clientesService.obterCliente.mockResolvedValue({ dados: { id: 'cli-aguia', nome: 'Construtora Águia' } });
  categoriasService.obterArvoreFinanceira.mockResolvedValue({
    dados: [
      { id: 'raiz-fin', nome: 'Despesas financeiras', natureza: 'despesa', subcategorias: [{ id: 'sub-repasse', nome: 'Repasse a fomento', lancavel: true }] },
    ],
  });
  contasService.obterContaBancaria.mockImplementation(async (id) => ({ dados: CONTAS[id] }));
  contasService.listarTodasContasBancarias.mockResolvedValue(Object.values(CONTAS));
  svc.listarHistoricoTitulo.mockResolvedValue({ dados: [] });
  svc.listarRecebimentos.mockResolvedValue({ dados: RECEBIMENTOS });
  svc.registrarRecebimento.mockResolvedValue({ dados: { titulo: EM_BANCO, recebimento: RECEBIMENTOS[0] } });
  svc.estornarRecebimento.mockResolvedValue({ dados: EM_BANCO });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Recebimentos do título', () => {
  it('lista os recebimentos com conta, valores, estorno e repasse, e só oferece estornar o que pode', async () => {
    await abrir();

    const tabela = await screen.findByRole('table', { name: 'Recebimentos do título' });
    const linhas = within(tabela).getAllByRole('row').slice(1);
    expect(linhas).toHaveLength(3);
    const vigente = linhas.find((linha) => within(linha).queryByText('10/10/2026'));
    expect(await within(vigente).findByText('Itaú cobrança · Itaú')).toBeInTheDocument();
    expect(within(vigente).getByText('R$ 500,00')).toBeInTheDocument();
    expect(within(vigente).getByText('R$ 8,00')).toBeInTheDocument();
    expect(within(vigente).getByText('R$ 508,00')).toBeInTheDocument();
    expect(within(vigente).getByRole('button', { name: 'Estornar' })).toBeInTheDocument();

    const estornado = linhas.find((linha) => within(linha).queryByText('05/10/2026'));
    expect(within(estornado).getByText('Estornado')).toBeInTheDocument();
    expect(within(estornado).getByText(/valor errado/)).toBeInTheDocument();
    expect(within(estornado).queryByRole('button', { name: 'Estornar' })).toBeNull();

    const repasse = linhas.find((linha) => within(linha).queryByText('12/10/2026'));
    expect(within(repasse).getByRole('link', { name: 'Repasse ao fomento' })).toHaveAttribute('href', '/solicitacoes/sol-9');
    expect(within(repasse).queryByRole('button', { name: 'Estornar' })).toBeNull();
  });

  it('mostra o vazio dos recebimentos', async () => {
    svc.listarRecebimentos.mockResolvedValue({ dados: [] });
    await abrir();

    expect(await screen.findByText('Nenhum recebimento registrado.')).toBeInTheDocument();
  });

  it('valida o recebimento contra o saldo e a data', async () => {
    const dialogo = await abrirRecebimento();
    expect(within(dialogo).getByLabelText('Valor recebido *')).toHaveValue('1000,00');
    expect(within(dialogo).getByLabelText('Recebido em *')).toHaveValue('2026-10-19');

    fireEvent.change(within(dialogo).getByLabelText('Valor recebido *'), { target: { value: '900,00' } });
    fireEvent.change(within(dialogo).getByLabelText('Desconto'), { target: { value: '200,00' } });
    fireEvent.change(within(dialogo).getByLabelText('Recebido em *'), { target: { value: '2026-10-20' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar' }));

    expect(await within(dialogo).findByText('Escolha a conta onde o dinheiro entrou.')).toBeInTheDocument();
    expect(within(dialogo).getByText('A data do recebimento não pode estar no futuro.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Valor mais desconto passa do saldo (R$ 1.000,00).')).toBeInTheDocument();
    expect(svc.registrarRecebimento).not.toHaveBeenCalled();
  });

  it('registra a baixa parcial em outra conta, avisando que difere da cobrança', async () => {
    const dialogo = await abrirRecebimento();
    expect(within(dialogo).queryByLabelText('Tipo *')).toBeNull();

    fireEvent.change(within(dialogo).getByLabelText('Conta *'), { target: { value: 'cb-sic' } });
    expect(within(dialogo).getByText(/diferente da conta de cobrança/)).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('Valor recebido *'), { target: { value: '400,00' } });
    fireEvent.change(within(dialogo).getByLabelText('Juros e multa'), { target: { value: '12,50' } });
    fireEvent.change(within(dialogo).getByLabelText('Recebido em *'), { target: { value: '2026-10-18' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar' }));

    await waitFor(() =>
      expect(svc.registrarRecebimento).toHaveBeenCalledWith('tit-1', {
        versao: 6,
        tipo: 'conta',
        conta_bancaria_id: 'cb-sic',
        recebido_em: '2026-10-18',
        valor_centavos: 40000,
        juros_centavos: 1250,
        desconto_centavos: 0,
      })
    );
    await waitFor(() => expect(svc.obterTitulo).toHaveBeenCalledTimes(2));
  });

  it('no título antecipado, a baixa no fomento vai sem conta', async () => {
    const dialogo = await abrirRecebimento(ANTECIPADO);

    fireEvent.change(within(dialogo).getByLabelText('Tipo *'), { target: { value: 'fomento' } });
    expect(within(dialogo).queryByLabelText('Conta *')).toBeNull();
    expect(within(dialogo).queryByLabelText('Juros e multa')).toBeNull();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar' }));

    await waitFor(() =>
      expect(svc.registrarRecebimento).toHaveBeenCalledWith('tit-1', {
        versao: 6,
        tipo: 'fomento',
        recebido_em: '2026-10-19',
        valor_centavos: 100000,
        juros_centavos: 0,
        desconto_centavos: 0,
      })
    );
  });

  it('no título antecipado recebido em conta exige o repasse ao fomento', async () => {
    const dialogo = await abrirRecebimento(ANTECIPADO);

    expect(within(dialogo).getByText(/gera a conta a pagar do repasse ao fomento/)).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('Conta *'), { target: { value: 'cb-itau' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar' }));
    expect(await within(dialogo).findByText('Informe o vencimento do repasse.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Escolha a categoria de despesa do repasse.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Vencimento do repasse *'), { target: { value: '2026-10-25' } });
    await within(dialogo).findByRole('option', { name: 'Repasse a fomento' });
    fireEvent.change(within(dialogo).getByLabelText('Categoria do repasse *'), { target: { value: 'sub-repasse' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar' }));

    await waitFor(() =>
      expect(svc.registrarRecebimento).toHaveBeenCalledWith('tit-1', {
        versao: 6,
        tipo: 'conta',
        conta_bancaria_id: 'cb-itau',
        recebido_em: '2026-10-19',
        valor_centavos: 100000,
        juros_centavos: 0,
        desconto_centavos: 0,
        repasse: { vencimento: '2026-10-25', categoria_financeira_id: 'sub-repasse' },
      })
    );
  });

  it('não oferece recebimento em título recebido ou cancelado', async () => {
    await abrir({ ...EM_BANCO, status: 'recebido', saldo_centavos: 0, recebido_centavos: 150000 });

    expect(screen.queryByRole('button', { name: 'Registrar recebimento' })).toBeNull();
  });

  it('estorna o recebimento com motivo e data, e trata o conflito', async () => {
    svc.estornarRecebimento.mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    await abrir();
    const tabela = await screen.findByRole('table', { name: 'Recebimentos do título' });
    fireEvent.click(within(tabela).getByRole('button', { name: 'Estornar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Estornar recebimento de 10/10/2026' });
    expect(within(dialogo).getByLabelText('Data do estorno *')).toHaveValue('2026-10-19');

    fireEvent.change(within(dialogo).getByLabelText('Data do estorno *'), { target: { value: '2026-10-09' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Estornar' }));
    expect(await within(dialogo).findByText('Informe o motivo do estorno.')).toBeInTheDocument();
    expect(within(dialogo).getByText('A data do estorno não pode ser antes do recebimento.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Motivo *'), { target: { value: 'cheque devolvido' } });
    fireEvent.change(within(dialogo).getByLabelText('Data do estorno *'), { target: { value: '2026-10-15' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Estornar' }));

    await waitFor(() =>
      expect(svc.estornarRecebimento).toHaveBeenCalledWith('tit-1', 'rec-1', {
        motivo: 'cheque devolvido',
        estornado_em: '2026-10-15',
        versao: 6,
      })
    );
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Recarregar dados' }));
    await waitFor(() => expect(svc.obterTitulo).toHaveBeenCalledTimes(2));
  });
});
