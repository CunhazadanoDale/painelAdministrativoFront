import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AutenticacaoProvider } from '../../app/autenticacao/AutenticacaoProvider';
import * as empresasService from '../../services/empresas';
import * as solicitacoesService from '../../services/solicitacoes';
import Solicitacoes from './Solicitacoes';

vi.mock('../../services/empresas', () => ({
  listarTodasEmpresas: vi.fn(),
}));

vi.mock('../../services/solicitacoes', () => ({
  listarSolicitacoes: vi.fn(),
  criarSolicitacao: vi.fn(),
}));

vi.mock('../../services/fornecedores', () => ({
  listarFornecedores: vi.fn(async () => ({ dados: [{ id: 'for-1', nome: 'Imobiliária Sol' }] })),
  obterFornecedor: vi.fn(async (id) => ({ dados: { id, nome: 'Imobiliária Sol' } })),
}));

vi.mock('../../services/categoriasFinanceiras', () => ({
  obterArvoreFinanceira: vi.fn(async () => ({
    dados: [{ id: 'raiz', nome: 'Despesas fixas', natureza: 'despesa', subcategorias: [{ id: 'sub-aluguel', nome: 'Aluguel', lancavel: true }] }],
  })),
}));

const { listarTodasEmpresas } = empresasService;
const { listarSolicitacoes } = solicitacoesService;

const SOLICITACAO = {
  id: 's1',
  empresa_id: 'e-gigante',
  valor_centavos: 150000,
  prazo_pagamento: '2026-10-20T00:00:00Z',
  forma_pagamento: 'pix',
  observacao: 'Compra de cimento',
  status: 'pendente_aprovacao',
};

function renderizar() {
  return render(
    <MemoryRouter>
      <AutenticacaoProvider>
        <Solicitacoes />
      </AutenticacaoProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem(
    'mia.sessao',
    JSON.stringify({
      token: 'token-de-teste',
      expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      administrador: false,
      usuario: { id: 'u1', nome: 'Ana' },
    })
  );
  listarTodasEmpresas.mockResolvedValue([
    { id: 'e-mia', nome_fantasia: 'MIA' },
    { id: 'e-gigante', nome_fantasia: 'Gigante' },
  ]);
  listarSolicitacoes.mockResolvedValue({ dados: [SOLICITACAO] });
});

describe('Solicitacoes', () => {
  it('mostra o nome da empresa e o prazo sem mudar de dia', async () => {
    renderizar();

    expect(await screen.findByText('Compra de cimento')).toBeInTheDocument();
    expect(await screen.findByText('Gigante', { selector: 'td *, td' })).toBeInTheDocument();
    expect(screen.getByText('20/10/2026')).toBeInTheDocument();
  });

  it('filtra a lista pela empresa escolhida', async () => {
    renderizar();
    await screen.findByText('Compra de cimento');
    await screen.findByRole('option', { name: 'MIA' });

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'e-mia' } });

    await waitFor(() =>
      expect(listarSolicitacoes).toHaveBeenLastCalledWith(
        expect.objectContaining({ escopo: 'minhas', empresa: 'e-mia', pagina: 1 })
      )
    );
  });

  it('mostra a competência, o fornecedor e o selo de vencida', async () => {
    listarSolicitacoes.mockResolvedValue({
      dados: [{ ...SOLICITACAO, competencia: '2026-10', fornecedor_id: 'for-1', vencida: true }],
    });

    renderizar();

    const linha = (await screen.findByText('Compra de cimento')).closest('tr');
    expect(within(linha).getByText('10/2026')).toBeInTheDocument();
    expect(await within(linha).findByText('Imobiliária Sol')).toBeInTheDocument();
    expect(within(linha).getByText('Vencida')).toBeInTheDocument();
  });

  it('filtra por fornecedor, categoria, competência, vencimento, origem e vencidas', async () => {
    renderizar();
    await screen.findByText('Compra de cimento');

    fireEvent.click(screen.getByRole('button', { name: /Mais filtros/ }));
    await screen.findByRole('option', { name: 'Imobiliária Sol' });
    await screen.findByRole('option', { name: 'Aluguel' });
    fireEvent.change(screen.getByLabelText('Fornecedor'), { target: { value: 'for-1' } });
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'sub-aluguel' } });
    fireEvent.change(screen.getByLabelText('Competência'), { target: { value: '2026-10' } });
    fireEvent.change(screen.getByLabelText('Vencimento de'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Vencimento até'), { target: { value: '2026-10-31' } });
    fireEvent.change(screen.getByLabelText('Origem'), { target: { value: 'recorrencia' } });
    fireEvent.click(screen.getByLabelText('Só vencidas'));

    await waitFor(() =>
      expect(listarSolicitacoes).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pagina: 1,
          fornecedor: 'for-1',
          categoria: 'sub-aluguel',
          competencia: '2026-10',
          vencimento_de: '2026-10-01',
          vencimento_ate: '2026-10-31',
          origem: 'recorrencia',
          vencidas: true,
        })
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    await waitFor(() =>
      expect(listarSolicitacoes).toHaveBeenLastCalledWith(
        expect.objectContaining({ fornecedor: '', categoria: '', competencia: '', origem: '', vencidas: false })
      )
    );
  });

  it('recusa o vencimento final antes do inicial sem buscar', async () => {
    renderizar();
    await screen.findByText('Compra de cimento');
    fireEvent.click(screen.getByRole('button', { name: /Mais filtros/ }));

    fireEvent.change(screen.getByLabelText('Vencimento de'), { target: { value: '2026-10-31' } });
    fireEvent.change(screen.getByLabelText('Vencimento até'), { target: { value: '2026-10-01' } });

    expect(screen.getByText('O vencimento final não pode ser antes do inicial.')).toBeInTheDocument();
    expect(listarSolicitacoes).not.toHaveBeenLastCalledWith(expect.objectContaining({ vencimento_ate: '2026-10-01' }));
  });
});
