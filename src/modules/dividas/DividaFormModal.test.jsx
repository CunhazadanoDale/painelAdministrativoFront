import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import * as categoriasService from '../../services/categoriasFinanceiras';
import * as contasService from '../../services/contasBancarias';
import * as dividasService from '../../services/dividas';
import * as empresasService from '../../services/empresas';
import * as fornecedoresService from '../../services/fornecedores';
import { DividaFormModal } from './DividaFormModal';

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/fornecedores', () => ({ listarFornecedores: vi.fn() }));
vi.mock('../../services/categoriasFinanceiras', () => ({ obterArvoreFinanceira: vi.fn() }));
vi.mock('../../services/contasBancarias', () => ({ listarTodasContasBancarias: vi.fn() }));
vi.mock('../../services/dividas', () => ({ obterDivida: vi.fn() }));

const EMPRESAS = [
  { id: 'emp-mia', nome_fantasia: 'MIA', ativa: true },
  { id: 'emp-gig', nome_fantasia: 'Gigante', ativa: true },
];

const SICREDI = { id: 'for-sic', nome: 'Banco Sicredi SA', nome_fantasia: 'Sicredi' };
const ITAU = { id: 'for-itau', nome: 'Itaú Unibanco', nome_fantasia: 'Itaú' };

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
  {
    id: 'raiz-fixas',
    nome: 'Despesas fixas',
    natureza: 'despesa',
    linha_dre: 'despesa_fixa',
    subcategorias: [{ id: 'cat-aluguel', nome: 'Aluguel', lancavel: true }],
  },
];

const CONTA = { id: 'conta-1', apelido: 'Movimento', banco_nome: 'Sicredi' };

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
  observacoes: 'carência de 3 meses',
  status: 'ativa',
  versao: 3,
  saldo_devedor_centavos: 210000,
  parcelas: [],
};

const nomeEmpresa = (id) => EMPRESAS.find((empresa) => empresa.id === id)?.nome_fantasia ?? '—';
const nomeFornecedor = (id) => [SICREDI, ITAU].find((fornecedor) => fornecedor.id === id)?.nome_fantasia ?? '—';

function renderizar(props = {}) {
  const onSalvar = props.onSalvar ?? vi.fn(async () => {});
  const onFechar = vi.fn();
  render(
    <DividaFormModal
      modo="criar"
      nomeEmpresa={nomeEmpresa}
      nomeFornecedor={nomeFornecedor}
      onFechar={onFechar}
      {...props}
      onSalvar={onSalvar}
    />
  );
  return { onSalvar, onFechar, dialogo: screen.getByRole('dialog') };
}

async function esperarCarga(dialogo) {
  await within(dialogo).findAllByRole('option', { name: 'Amortização de empréstimos' });
  await within(dialogo).findAllByRole('option', { name: 'Juros de empréstimos' });
}

beforeEach(() => {
  vi.clearAllMocks();
  empresasService.listarTodasEmpresas.mockResolvedValue(EMPRESAS);
  fornecedoresService.listarFornecedores.mockResolvedValue({ dados: [SICREDI, ITAU] });
  categoriasService.obterArvoreFinanceira.mockResolvedValue({ dados: ARVORE });
  contasService.listarTodasContasBancarias.mockResolvedValue([CONTA]);
  dividasService.obterDivida.mockResolvedValue({ dados: { ...DIVIDA, versao: 4 } });
});

describe('DividaFormModal', () => {
  it('limita as categorias à linha da DRE de cada componente', async () => {
    const { dialogo } = renderizar();
    await esperarCarga(dialogo);

    const amortizacao = within(dialogo).getByLabelText('Categoria da amortização *');
    const juros = within(dialogo).getByLabelText('Categoria dos juros *');
    expect(within(amortizacao).queryByRole('option', { name: 'Juros de empréstimos' })).toBeNull();
    expect(within(juros).queryByRole('option', { name: 'Amortização de empréstimos' })).toBeNull();
    expect(within(juros).queryByRole('option', { name: 'Aluguel' })).toBeNull();
  });

  it('valida os obrigatórios, a taxa, as datas e o cronograma antes de enviar', async () => {
    const { dialogo, onSalvar } = renderizar();
    await esperarCarga(dialogo);

    fireEvent.change(within(dialogo).getByLabelText('Taxa (%)'), { target: { value: '1,85' } });
    fireEvent.change(within(dialogo).getByLabelText('Data do saldo *'), { target: { value: '2999-01-01' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    const erros = await within(dialogo).findByRole('list', { name: 'Erros do formulário' });
    expect(within(erros).getByText('Selecione a empresa devedora.')).toBeInTheDocument();
    expect(within(erros).getByText('Selecione o credor.')).toBeInTheDocument();
    expect(within(erros).getByText('Escolha o tipo de credor.')).toBeInTheDocument();
    expect(within(erros).getByText('Informe a descrição.')).toBeInTheDocument();
    expect(within(erros).getByText('Escolha se a taxa é mensal ou anual.')).toBeInTheDocument();
    expect(within(erros).getByText('Escolha a categoria da amortização.')).toBeInTheDocument();
    expect(within(erros).getByText('Escolha a categoria dos juros.')).toBeInTheDocument();
    expect(within(erros).getByText('Informe o saldo devedor maior que zero.')).toBeInTheDocument();
    expect(within(erros).getByText('A data do saldo não pode ser futura.')).toBeInTheDocument();
    expect(within(erros).getByText('Parcela 1: informe o vencimento.')).toBeInTheDocument();
    expect(within(erros).getByText('Parcela 1: amortização inválida.')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('preenche as parcelas mensais, confere a soma e cria com o corpo completo', async () => {
    const { dialogo, onSalvar, onFechar } = renderizar();
    await esperarCarga(dialogo);

    fireEvent.change(within(dialogo).getByLabelText('Empresa devedora *'), { target: { value: 'emp-mia' } });
    await within(dialogo).findByRole('option', { name: 'Movimento · Sicredi' });
    await within(dialogo).findByRole('option', { name: 'Sicredi' });
    fireEvent.change(within(dialogo).getByLabelText('Credor *'), { target: { value: 'for-sic' } });
    fireEvent.change(within(dialogo).getByLabelText('Tipo de credor *'), { target: { value: 'banco' } });
    fireEvent.change(within(dialogo).getByLabelText('Descrição *'), { target: { value: ' Capital de giro ' } });
    fireEvent.change(within(dialogo).getByLabelText('Contrato'), { target: { value: 'CG-77' } });
    fireEvent.change(within(dialogo).getByLabelText('Valor original'), { target: { value: '5.000,00' } });
    fireEvent.change(within(dialogo).getByLabelText('Contratada em'), { target: { value: '2026-03-10' } });
    fireEvent.change(within(dialogo).getByLabelText('Taxa (%)'), { target: { value: '1,85' } });
    fireEvent.change(within(dialogo).getByLabelText('Período da taxa'), { target: { value: 'mensal' } });
    fireEvent.change(within(dialogo).getByLabelText('Indexador'), { target: { value: 'cdi' } });
    fireEvent.change(within(dialogo).getByLabelText('Conta da liberação'), { target: { value: 'conta-1' } });
    fireEvent.change(within(dialogo).getByLabelText('Liberada em'), { target: { value: '2026-03-10' } });
    fireEvent.change(within(dialogo).getByLabelText('Categoria da amortização *'), { target: { value: 'cat-amort' } });
    fireEvent.change(within(dialogo).getByLabelText('Categoria dos juros *'), { target: { value: 'cat-juros' } });
    fireEvent.change(within(dialogo).getByLabelText('Saldo devedor na data do saldo *'), { target: { value: '1.000,00' } });
    fireEvent.change(within(dialogo).getByLabelText('Data do saldo *'), { target: { value: '2026-09-30' } });

    fireEvent.change(within(dialogo).getByLabelText('Quantidade de parcelas'), { target: { value: '3' } });
    fireEvent.change(within(dialogo).getByLabelText('Primeiro vencimento'), { target: { value: '2026-10-31' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Preencher parcelas' }));

    expect(within(dialogo).getByLabelText('Vencimento da parcela 2')).toHaveValue('2026-11-30');
    expect(within(dialogo).getByLabelText('Amortização da parcela 1')).toHaveValue('333,33');
    expect(within(dialogo).getByLabelText('Amortização da parcela 3')).toHaveValue('333,34');
    expect(within(dialogo).getByText(/confere com o saldo/)).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('Juros da parcela 1'), { target: { value: '18,50' } });
    fireEvent.change(within(dialogo).getByLabelText('Juros da parcela 2'), { target: { value: '12,33' } });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith({
        empresa_id: 'emp-mia',
        fornecedor_id: 'for-sic',
        credor_tipo: 'banco',
        descricao: 'Capital de giro',
        contrato: 'CG-77',
        valor_original_centavos: 500000,
        contratada_em: '2026-03-10',
        taxa_bp: 185,
        taxa_periodo: 'mensal',
        indexador: 'cdi',
        conta_liberacao_id: 'conta-1',
        liberada_em: '2026-03-10',
        saldo_inicial_centavos: 100000,
        data_saldo: '2026-09-30',
        categoria_amortizacao_id: 'cat-amort',
        categoria_juros_id: 'cat-juros',
        observacoes: '',
        parcelas: [
          { vencimento: '2026-10-31', amortizacao_centavos: 33333, juros_centavos: 1850 },
          { vencimento: '2026-11-30', amortizacao_centavos: 33333, juros_centavos: 1233 },
          { vencimento: '2026-12-31', amortizacao_centavos: 33334, juros_centavos: 0 },
        ],
      })
    );
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
  });

  it('recusa soma diferente do saldo, vencimento antes do saldo e repetido, e parcela zerada', async () => {
    const { dialogo, onSalvar } = renderizar();
    await esperarCarga(dialogo);

    fireEvent.change(within(dialogo).getByLabelText('Saldo devedor na data do saldo *'), { target: { value: '100' } });
    fireEvent.change(within(dialogo).getByLabelText('Data do saldo *'), { target: { value: '2026-09-30' } });
    fireEvent.change(within(dialogo).getByLabelText('Vencimento da parcela 1'), { target: { value: '2026-09-30' } });
    fireEvent.change(within(dialogo).getByLabelText('Amortização da parcela 1'), { target: { value: '60' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /Adicionar parcela/ }));
    fireEvent.change(within(dialogo).getByLabelText('Vencimento da parcela 2'), { target: { value: '2026-09-30' } });
    fireEvent.change(within(dialogo).getByLabelText('Amortização da parcela 2'), { target: { value: '0' } });
    fireEvent.change(within(dialogo).getByLabelText('Juros da parcela 2'), { target: { value: '0' } });

    expect(within(dialogo).getByText(/difere do saldo em/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    const erros = await within(dialogo).findByRole('list', { name: 'Erros do formulário' });
    expect(within(erros).getByText('Parcela 1: o vencimento tem de ser depois da data do saldo.')).toBeInTheDocument();
    expect(within(erros).getByText('Parcela 2: vencimento repetido.')).toBeInTheDocument();
    expect(within(erros).getByText('Parcela 2: amortização e juros não podem ser os dois zero.')).toBeInTheDocument();
    expect(
      within(erros).getByText('A soma das amortizações (R$ 60,00) tem de ser igual ao saldo devedor (R$ 100,00).')
    ).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('mostra o erro da API sem perder o formulário', async () => {
    const onSalvar = vi.fn().mockRejectedValue(new ErroApi(400, 'erro de validação: credor "Sicredi" está inativo'));
    const { dialogo } = renderizar({ modo: 'editar', divida: DIVIDA, onSalvar });
    await esperarCarga(dialogo);

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText(/está inativo/)).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Descrição *')).toHaveValue('Capital de giro Sicredi');
  });

  it('na edição trava empresa, credor, saldo e cronograma e envia os informativos com a versão', async () => {
    const { dialogo, onSalvar } = renderizar({ modo: 'editar', divida: DIVIDA });
    await esperarCarga(dialogo);
    await within(dialogo).findByRole('option', { name: 'Movimento · Sicredi' });

    expect(screen.getByRole('dialog', { name: 'Editar dívida' })).toBeInTheDocument();
    expect(within(dialogo).getByText('MIA')).toBeInTheDocument();
    expect(within(dialogo).getByText('Sicredi')).toBeInTheDocument();
    expect(within(dialogo).queryByLabelText('Saldo devedor na data do saldo *')).toBeNull();
    expect(within(dialogo).queryByRole('button', { name: 'Preencher parcelas' })).toBeNull();
    expect(within(dialogo).getByLabelText('Taxa (%)')).toHaveValue('1,85');
    expect(within(dialogo).getByLabelText('Valor original')).toHaveValue('5000,00');

    fireEvent.change(within(dialogo).getByLabelText('Contrato'), { target: { value: '' } });
    fireEvent.change(within(dialogo).getByLabelText('Taxa (%)'), { target: { value: '' } });
    fireEvent.change(within(dialogo).getByLabelText('Período da taxa'), { target: { value: '' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith({
        versao: 3,
        credor_tipo: 'banco',
        descricao: 'Capital de giro Sicredi',
        contrato: null,
        valor_original_centavos: 500000,
        contratada_em: '2026-03-10',
        taxa_bp: null,
        taxa_periodo: null,
        indexador: 'cdi',
        conta_liberacao_id: 'conta-1',
        liberada_em: '2026-03-10',
        categoria_amortizacao_id: 'cat-amort',
        categoria_juros_id: 'cat-juros',
        observacoes: 'carência de 3 meses',
      })
    );
  });

  it('no conflito de versão recarrega a dívida e mantém o que foi digitado', async () => {
    const onSalvar = vi
      .fn()
      .mockRejectedValueOnce(new ErroApi(409, 'a dívida foi alterada por outra pessoa; recarregue e tente de novo'))
      .mockResolvedValue(undefined);
    const { dialogo } = renderizar({ modo: 'editar', divida: DIVIDA, onSalvar });
    await esperarCarga(dialogo);

    fireEvent.change(within(dialogo).getByLabelText('Descrição *'), { target: { value: 'Giro renovado' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Recarregar dados' }));

    expect(await within(dialogo).findByText(/Dados recarregados \(versão 4\)/)).toBeInTheDocument();
    expect(dividasService.obterDivida).toHaveBeenCalledWith('div-1', { sinal: expect.anything() });
    expect(within(dialogo).getByLabelText('Descrição *')).toHaveValue('Giro renovado');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(onSalvar).toHaveBeenLastCalledWith(expect.objectContaining({ versao: 4, descricao: 'Giro renovado' }))
    );
  });

  it('na renegociação parte da original, pede o motivo e envia a dívida nova', async () => {
    const { dialogo, onSalvar } = renderizar({ modo: 'renegociar', divida: DIVIDA, hoje: '2026-10-20' });
    await esperarCarga(dialogo);

    expect(screen.getByRole('dialog', { name: 'Renegociar "Capital de giro Sicredi"' })).toBeInTheDocument();
    expect(within(dialogo).getByText(/Saldo devedor da original:/)).toHaveTextContent('R$ 2.100,00');
    expect(within(dialogo).getByLabelText('Descrição *')).toHaveValue('Capital de giro Sicredi');
    expect(within(dialogo).getByLabelText('Saldo devedor na data do saldo *')).toHaveValue('2100,00');
    expect(within(dialogo).getByLabelText('Data do saldo *')).toHaveValue('2026-10-20');
    expect(within(dialogo).getByLabelText('Contrato')).toHaveValue('');

    fireEvent.change(within(dialogo).getByLabelText('Data do saldo *'), { target: { value: '2026-09-01' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Renegociar' }));
    const erros = await within(dialogo).findByRole('list', { name: 'Erros do formulário' });
    expect(within(erros).getByText('Informe o motivo da renegociação.')).toBeInTheDocument();
    expect(
      within(erros).getByText('A data do saldo da nova dívida não pode ser antes da data do saldo da original (30/09/2026).')
    ).toBeInTheDocument();

    await within(dialogo).findByRole('option', { name: 'Itaú' });
    fireEvent.change(within(dialogo).getByLabelText('Credor *'), { target: { value: 'for-itau' } });
    fireEvent.change(within(dialogo).getByLabelText('Descrição *'), { target: { value: 'Renegociação Itaú' } });
    fireEvent.change(within(dialogo).getByLabelText('Data do saldo *'), { target: { value: '2026-10-20' } });
    fireEvent.change(within(dialogo).getByLabelText('Vencimento da parcela 1'), { target: { value: '2026-11-20' } });
    fireEvent.change(within(dialogo).getByLabelText('Amortização da parcela 1'), { target: { value: '2.100,00' } });
    fireEvent.change(within(dialogo).getByLabelText('Juros da parcela 1'), { target: { value: '9' } });
    fireEvent.change(within(dialogo).getByLabelText('Motivo da renegociação *'), { target: { value: ' acordo com o banco ' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Renegociar' }));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith({
        versao: 3,
        motivo: 'acordo com o banco',
        nova: expect.objectContaining({
          fornecedor_id: 'for-itau',
          credor_tipo: 'banco',
          descricao: 'Renegociação Itaú',
          contrato: null,
          saldo_inicial_centavos: 210000,
          data_saldo: '2026-10-20',
          categoria_amortizacao_id: 'cat-amort',
          categoria_juros_id: 'cat-juros',
          parcelas: [{ vencimento: '2026-11-20', amortizacao_centavos: 210000, juros_centavos: 900 }],
        }),
      })
    );
    expect(onSalvar.mock.calls[0][0].nova).not.toHaveProperty('empresa_id');
  });
});
