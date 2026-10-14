import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
});
