import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import * as categoriasService from '../../services/categoriasFinanceiras';
import * as empresasService from '../../services/empresas';
import * as fornecedoresService from '../../services/fornecedores';
import * as solicitacoesService from '../../services/solicitacoes';
import { SolicitacaoFormModal } from './SolicitacaoFormModal';

vi.mock('../../services/empresas', () => ({
  listarTodasEmpresas: vi.fn(),
}));

vi.mock('../../services/arquivos', () => ({
  enviarArquivo: vi.fn(),
  removerArquivo: vi.fn(),
}));

vi.mock('../../services/fornecedores', () => ({ listarFornecedores: vi.fn() }));
vi.mock('../../services/categoriasFinanceiras', () => ({ obterArvoreFinanceira: vi.fn() }));
vi.mock('../../services/solicitacoes', () => ({ obterSolicitacao: vi.fn() }));

const { listarTodasEmpresas } = empresasService;

const MIA = { id: 'e-mia', nome_fantasia: 'MIA' };
const GIGANTE = { id: 'e-gigante', nome_fantasia: 'Gigante' };

const ARVORE = [
  {
    id: 'raiz-fixas',
    nome: 'Despesas fixas',
    natureza: 'despesa',
    subcategorias: [{ id: 'sub-aluguel', nome: 'Aluguel', lancavel: true }],
  },
];

const SOLICITACAO = {
  id: 'sol-1',
  empresa_id: 'e-mia',
  valor_centavos: 150000,
  prazo_pagamento: '2026-10-10T00:00:00Z',
  observacao: 'Aluguel de outubro',
  forma_pagamento: 'boleto',
  fornecedor_id: 'for-1',
  categoria_financeira_id: 'sub-aluguel',
  competencia: '2026-10',
  estimado: true,
  origem: 'manual',
  versao: 2,
  status: 'pendente_aprovacao',
};

function preencher() {
  fireEvent.change(screen.getByLabelText('Valor *'), { target: { value: '1.500' } });
  fireEvent.change(screen.getByLabelText('Observação *'), { target: { value: 'Compra de cimento' } });
}

function renderizarEdicao(onSalvar) {
  render(
    <SolicitacaoFormModal
      solicitacao={SOLICITACAO}
      nomeEmpresa={() => 'MIA'}
      nomeFornecedor={() => 'Imobiliária Sol'}
      onFechar={() => {}}
      onSalvar={onSalvar}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-18T15:00:00Z'));
  fornecedoresService.listarFornecedores.mockResolvedValue({
    dados: [{ id: 'for-1', nome: 'Imobiliária Sol', documento_formatado: '11.222.333/0001-81' }],
  });
  categoriasService.obterArvoreFinanceira.mockResolvedValue({ dados: ARVORE });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SolicitacaoFormModal', () => {
  it('exige a empresa antes de salvar', async () => {
    listarTodasEmpresas.mockResolvedValue([MIA, GIGANTE]);
    const onSalvar = vi.fn();

    render(<SolicitacaoFormModal onFechar={() => {}} onSalvar={onSalvar} />);
    await screen.findByRole('option', { name: 'MIA' });
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Selecione a empresa da solicitação.')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('envia a empresa escolhida com o valor em centavos', async () => {
    listarTodasEmpresas.mockResolvedValue([MIA, GIGANTE]);
    const onSalvar = vi.fn().mockResolvedValue(null);
    const onFechar = vi.fn();

    render(<SolicitacaoFormModal onFechar={onFechar} onSalvar={onSalvar} />);
    await screen.findByRole('option', { name: 'MIA' });
    fireEvent.change(screen.getByLabelText('Empresa *'), { target: { value: 'e-gigante' } });
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({ empresa_id: 'e-gigante', valor_centavos: 150000 })
    );
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
  });

  it('usa a única empresa do acesso sem pedir escolha', async () => {
    listarTodasEmpresas.mockResolvedValue([MIA]);
    const onSalvar = vi.fn().mockResolvedValue(null);

    render(<SolicitacaoFormModal onFechar={() => {}} onSalvar={onSalvar} />);
    await waitFor(() => expect(screen.getByLabelText('Empresa *')).toHaveValue('e-mia'));
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ empresa_id: 'e-mia' }))
    );
  });

  it('oferece as formas novas e envia fornecedor, categoria, competência e estimado quando informados', async () => {
    listarTodasEmpresas.mockResolvedValue([MIA]);
    const onSalvar = vi.fn().mockResolvedValue(null);

    render(<SolicitacaoFormModal onFechar={() => {}} onSalvar={onSalvar} />);
    await waitFor(() => expect(screen.getByLabelText('Empresa *')).toHaveValue('e-mia'));
    expect(screen.getByRole('option', { name: 'Transferência' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Débito automático' })).toBeInTheDocument();
    preencher();
    fireEvent.change(screen.getByLabelText('Forma de pagamento *'), { target: { value: 'debito_automatico' } });
    await screen.findByRole('option', { name: 'Imobiliária Sol (11.222.333/0001-81)' });
    fireEvent.change(screen.getByLabelText('Fornecedor'), { target: { value: 'for-1' } });
    await screen.findByRole('option', { name: 'Aluguel' });
    fireEvent.change(screen.getByLabelText('Categoria financeira'), { target: { value: 'sub-aluguel' } });
    fireEvent.change(screen.getByLabelText('Competência'), { target: { value: '2026-09' } });
    fireEvent.click(screen.getByLabelText('Valor estimado'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith({
        empresa_id: 'e-mia',
        valor_centavos: 150000,
        prazo_pagamento: '2026-10-18',
        observacao: 'Compra de cimento',
        forma_pagamento: 'debito_automatico',
        fornecedor_id: 'for-1',
        categoria_financeira_id: 'sub-aluguel',
        competencia: '2026-09',
        estimado: true,
        arquivo_ids: [],
      })
    );
  });

  it('na criação não manda a classificação vazia', async () => {
    listarTodasEmpresas.mockResolvedValue([MIA]);
    const onSalvar = vi.fn().mockResolvedValue(null);

    render(<SolicitacaoFormModal onFechar={() => {}} onSalvar={onSalvar} />);
    await waitFor(() => expect(screen.getByLabelText('Empresa *')).toHaveValue('e-mia'));
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSalvar).toHaveBeenCalled());
    const dados = onSalvar.mock.calls[0][0];
    expect(dados).not.toHaveProperty('fornecedor_id');
    expect(dados).not.toHaveProperty('categoria_financeira_id');
    expect(dados).not.toHaveProperty('competencia');
    expect(dados).not.toHaveProperty('estimado');
  });

  it('edita com a empresa e os anexos fixos, aceitando o vencimento já passado sem mudança', async () => {
    listarTodasEmpresas.mockResolvedValue([MIA]);
    const onSalvar = vi.fn().mockResolvedValue(null);

    renderizarEdicao(onSalvar);

    expect(screen.getByRole('dialog', { name: 'Editar Solicitação' })).toBeInTheDocument();
    expect(screen.getByText('MIA')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Anexos/)).toBeNull();
    expect(screen.getByLabelText('Valor *')).toHaveValue('1500,00');
    expect(screen.getByLabelText('Valor estimado')).toBeChecked();
    expect(await screen.findByRole('option', { name: 'Imobiliária Sol (11.222.333/0001-81)' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Observação *'), { target: { value: 'Aluguel de outubro do galpão' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith({
        valor_centavos: 150000,
        prazo_pagamento: '2026-10-10',
        observacao: 'Aluguel de outubro do galpão',
        forma_pagamento: 'boleto',
        fornecedor_id: 'for-1',
        categoria_financeira_id: 'sub-aluguel',
        competencia: '2026-10',
        estimado: true,
        versao: 2,
      })
    );
  });

  it('na edição recusa mudar o vencimento para antes de hoje e manda nulo ao tirar a classificação', async () => {
    const onSalvar = vi.fn().mockResolvedValue(null);
    renderizarEdicao(onSalvar);
    await screen.findByRole('option', { name: 'Aluguel' });

    fireEvent.change(screen.getByLabelText('Prazo de pagamento *'), { target: { value: '2026-10-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('O prazo não pode ser anterior a hoje.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Prazo de pagamento *'), { target: { value: '2026-10-25' } });
    fireEvent.change(screen.getByLabelText('Fornecedor'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Categoria financeira'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Competência'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({ fornecedor_id: null, categoria_financeira_id: null, prazo_pagamento: '2026-10-25' })
      )
    );
    expect(onSalvar.mock.calls[0][0]).not.toHaveProperty('competencia');
  });

  it('no conflito de versão recarrega a solicitação sem perder o formulário', async () => {
    solicitacoesService.obterSolicitacao.mockResolvedValue({ dados: { ...SOLICITACAO, versao: 3 } });
    const onSalvar = vi
      .fn()
      .mockRejectedValueOnce(new ErroApi(409, 'solicitação alterada por outra operação, recarregue e tente novamente'))
      .mockResolvedValue(null);
    renderizarEdicao(onSalvar);
    fireEvent.change(screen.getByLabelText('Valor *'), { target: { value: '1.600,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Recarregar dados' }));
    expect(await screen.findByText(/Dados recarregados/)).toBeInTheDocument();
    expect(screen.getByLabelText('Valor *')).toHaveValue('1.600,00');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenLastCalledWith(expect.objectContaining({ valor_centavos: 160000, versao: 3 }))
    );
  });
});
