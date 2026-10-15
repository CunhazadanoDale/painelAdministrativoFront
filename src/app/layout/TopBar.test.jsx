import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import paginaInicial from '../../../index.html?raw';
import { AutenticacaoProvider } from '../autenticacao/AutenticacaoProvider';
import { TopBar } from './TopBar';

function Caminho() {
  const localizacao = useLocation();
  return <span data-testid="caminho">{`${localizacao.pathname}${localizacao.search}`}</span>;
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AutenticacaoProvider>
        <TopBar />
        <Caminho />
      </AutenticacaoProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.setItem(
    'mia.sessao',
    JSON.stringify({
      token: 'token-de-teste',
      expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      comercial: true,
      usuario: { usuario_id: 1, nome: 'Pessoa Teste' },
    })
  );
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, text: async () => '{"dados":[]}' })));
});

describe('TopBar', () => {
  it('a busca tem nome acessível e leva para os leads', () => {
    renderizar();

    expect(screen.getByRole('search')).toBeInTheDocument();
    const busca = screen.getByRole('searchbox', { name: 'Pesquisar leads' });
    fireEvent.change(busca, { target: { value: 'maria' } });
    fireEvent.submit(screen.getByRole('search'));

    expect(screen.getByTestId('caminho')).toHaveTextContent('/leads?q=maria');
  });

  it('não mostra botões sem ação', () => {
    renderizar();

    expect(screen.queryByRole('button', { name: /ajuda/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /notifica/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Sair' })).toHaveAttribute('type', 'button');
  });
});

describe('index.html', () => {
  it('declara o idioma e o título do painel', () => {
    expect(paginaInicial).toContain('<html lang="pt-BR">');
    expect(paginaInicial).toContain('<title>Painel MiaConstrutora</title>');
  });
});
