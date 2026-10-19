import { render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../autenticacao/useAutenticacao';
import * as solicitacoesService from '../../services/solicitacoes';
import { Sidebar } from './Sidebar';

vi.mock('../autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/solicitacoes', () => ({ obterPendencias: vi.fn() }));

const { obterPendencias } = solicitacoesService;

function renderizar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAutenticacao.mockReturnValue({ administrador: false, comercial: false, financeiro: true });
});

describe('Sidebar', () => {
  it('mostra no item de solicitações o total das filas do usuário, com o detalhe no título', async () => {
    obterPendencias.mockResolvedValue({ dados: { aprovacao: null, financeiro: 7, vencidas: 2 } });

    renderizar();

    const link = screen.getByRole('link', { name: /Solicitações/ });
    const contador = await within(link).findByText('7');
    expect(contador).toHaveAttribute('title', '7 para pagar · 2 vencidas');
    expect(obterPendencias).toHaveBeenCalledWith({ sinal: expect.anything() });
  });

  it('soma aprovação e financeiro e não mostra contador zerado', async () => {
    obterPendencias.mockResolvedValueOnce({ dados: { aprovacao: 4, financeiro: 3, vencidas: 0 } });
    const { unmount } = renderizar();
    expect(await screen.findByText('7')).toHaveAttribute('title', '4 para aprovar · 3 para pagar');
    unmount();

    obterPendencias.mockResolvedValueOnce({ dados: { aprovacao: 0, financeiro: null, vencidas: null } });
    renderizar();
    await waitFor(() => expect(obterPendencias).toHaveBeenCalledTimes(2));
    expect(within(screen.getByRole('link', { name: /Solicitações/ })).queryByText('0')).toBeNull();
  });

  it('ignora a falha do contador sem quebrar o menu', async () => {
    obterPendencias.mockRejectedValue(new Error('falha'));

    renderizar();

    await waitFor(() => expect(obterPendencias).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: /Solicitações/ })).toBeInTheDocument();
  });
});
