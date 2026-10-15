import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AutenticacaoProvider } from '../../app/autenticacao/AutenticacaoProvider';
import Login from './Login';

function respostaLimite(segundos) {
  return {
    ok: false,
    status: 429,
    headers: new Headers({ 'Retry-After': String(segundos) }),
    text: async () =>
      JSON.stringify({ erro: { mensagem: 'muitas tentativas de login; tente novamente em 1 minuto(s)' } }),
  };
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AutenticacaoProvider>
        <Login />
      </AutenticacaoProvider>
    </MemoryRouter>
  );
}

function preencherEEnviar() {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'pessoa@exemplo.com' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'errada' } });
  fireEvent.submit(screen.getByRole('button', { name: /entrar/i }).closest('form'));
}

beforeEach(() => {
  localStorage.clear();
});

describe('Login', () => {
  it('trava o botão durante o Retry-After do 429 e libera depois', async () => {
    const fetchMock = vi.fn(async () => respostaLimite(1));
    vi.stubGlobal('fetch', fetchMock);
    renderizar();

    preencherEEnviar();

    expect(await screen.findByText(/muitas tentativas de login/)).toBeInTheDocument();
    const botao = screen.getByRole('button', { name: /aguarde 1 s/i });
    expect(botao).toBeDisabled();

    fireEvent.submit(botao.closest('form'));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled(), {
      timeout: 3000,
    });
  });

  it('não trava o botão em outros erros', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 404,
        headers: new Headers(),
        text: async () => JSON.stringify({ erro: { mensagem: 'email ou senha inválidos' } }),
      }))
    );
    renderizar();

    preencherEEnviar();

    expect(await screen.findByText('email ou senha inválidos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });
});
