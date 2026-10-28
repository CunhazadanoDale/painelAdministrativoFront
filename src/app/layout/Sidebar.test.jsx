import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../autenticacao/useAutenticacao';
import * as solicitacoesService from '../../services/solicitacoes';
import { Sidebar } from './Sidebar';

vi.mock('../autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/solicitacoes', () => ({ obterPendencias: vi.fn() }));

const { obterPendencias } = solicitacoesService;

function renderizar(caminho = '/') {
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <Sidebar />
    </MemoryRouter>
  );
}

function area(nome) {
  return screen.getByRole('button', { name: new RegExp(`^${nome}`) });
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
    const link = screen.getByRole('link', { name: /Solicitações/ });
    expect(await within(link).findByText('7')).toHaveAttribute('title', '4 para aprovar · 3 para pagar');
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

  it('aberta no celular, fecha ao navegar ou ao tocar em fechar', async () => {
    obterPendencias.mockResolvedValue({ dados: {} });
    const onFechar = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <Sidebar aberto onFechar={onFechar} />
      </MemoryRouter>
    );

    expect(container.querySelector('.sidebar')).toHaveClass('aberto');
    fireEvent.click(screen.getByRole('link', { name: /Caixa/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar menu' }));

    await waitFor(() => expect(obterPendencias).toHaveBeenCalled());
    expect(onFechar).toHaveBeenCalledTimes(2);
  });

  it('abre só a área da tela atual', async () => {
    obterPendencias.mockResolvedValue({ dados: {} });

    renderizar('/dividas/resumo');

    await waitFor(() => expect(obterPendencias).toHaveBeenCalled());
    expect(area('Financeiro')).toHaveAttribute('aria-expanded', 'true');
    expect(area('Comercial')).toHaveAttribute('aria-expanded', 'false');
    expect(area('Início')).toHaveAttribute('aria-expanded', 'false');
  });

  it('abre e fecha a área no clique e lembra a escolha', async () => {
    obterPendencias.mockResolvedValue({ dados: {} });
    const { unmount } = renderizar('/caixa');
    await waitFor(() => expect(obterPendencias).toHaveBeenCalled());

    fireEvent.click(area('Financeiro'));
    fireEvent.click(area('Comercial'));

    expect(area('Financeiro')).toHaveAttribute('aria-expanded', 'false');
    expect(area('Comercial')).toHaveAttribute('aria-expanded', 'true');
    unmount();

    renderizar('/');
    await waitFor(() => expect(obterPendencias).toHaveBeenCalledTimes(2));
    expect(area('Financeiro')).toHaveAttribute('aria-expanded', 'false');
    expect(area('Comercial')).toHaveAttribute('aria-expanded', 'true');
  });

  it('ignora preferência de áreas corrompida', async () => {
    obterPendencias.mockResolvedValue({ dados: {} });
    localStorage.setItem('mia.menu.areas', '{quebrado');

    renderizar('/caixa');

    await waitFor(() => expect(obterPendencias).toHaveBeenCalled());
    expect(area('Financeiro')).toHaveAttribute('aria-expanded', 'true');
  });

  it('agrupa os itens em seções e esconde a seção sem itens para o perfil', async () => {
    obterPendencias.mockResolvedValue({ dados: {} });
    useAutenticacao.mockReturnValue({ administrador: false, comercial: false, financeiro: false });

    renderizar('/fornecedores');

    await waitFor(() => expect(obterPendencias).toHaveBeenCalled());
    expect(screen.getByText('A pagar')).toBeInTheDocument();
    expect(screen.getByText('Fiscal')).toBeInTheDocument();
    expect(screen.queryByText('Tesouraria')).toBeNull();
    expect(screen.queryByText('A receber')).toBeNull();
  });

  it('mostra o contador de solicitações no título da área fechada', async () => {
    obterPendencias.mockResolvedValue({ dados: { aprovacao: null, financeiro: 7, vencidas: 2 } });

    renderizar('/');

    expect(await within(area('Financeiro')).findByText('7')).toHaveAttribute('title', '7 para pagar · 2 vencidas');
    fireEvent.click(area('Financeiro'));
    expect(within(area('Financeiro')).queryByText('7')).toBeNull();
  });
});
