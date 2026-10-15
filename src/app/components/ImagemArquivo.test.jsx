import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { definirToken } from '../../lib/api';
import { ImagemArquivo } from './ImagemArquivo';

let criarUrl;
let revogarUrl;

beforeEach(() => {
  definirToken('token-abc');
  criarUrl = vi.fn(() => 'blob:imagem-1');
  revogarUrl = vi.fn();
  URL.createObjectURL = criarUrl;
  URL.revokeObjectURL = revogarUrl;
});

afterEach(() => {
  definirToken(null);
});

describe('ImagemArquivo', () => {
  it('baixa a imagem pela rota autenticada e mostra o object URL', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, blob: async () => new Blob(['png']) }));
    vi.stubGlobal('fetch', fetchMock);

    render(<ImagemArquivo arquivoId="arq-1" alt="Saco de cimento" />);

    const imagem = await screen.findByRole('img', { name: 'Saco de cimento' });
    expect(imagem).toHaveAttribute('src', 'blob:imagem-1');
    const [url, opcoes] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/arquivos/arq-1');
    expect(opcoes.headers.Authorization).toBe('Bearer token-abc');
    expect(opcoes.signal).toBeInstanceOf(AbortSignal);
  });

  it('revoga o object URL ao desmontar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, blob: async () => new Blob(['png']) })));

    const { unmount } = render(<ImagemArquivo arquivoId="arq-1" alt="Saco de cimento" />);
    await screen.findByRole('img', { name: 'Saco de cimento' });

    unmount();

    expect(revogarUrl).toHaveBeenCalledWith('blob:imagem-1');
  });

  it('cancela o download ao desmontar antes da resposta', async () => {
    let sinal;
    vi.stubGlobal(
      'fetch',
      vi.fn((_, opcoes) => {
        sinal = opcoes.signal;
        return new Promise(() => {});
      })
    );

    const { unmount } = render(<ImagemArquivo arquivoId="arq-1" alt="Saco de cimento" />);
    await waitFor(() => expect(sinal).toBeDefined());

    unmount();

    expect(sinal.aborted).toBe(true);
    expect(criarUrl).not.toHaveBeenCalled();
  });

  it('mostra aviso quando o download falha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 403,
        json: async () => ({ erro: { mensagem: 'perfil sem permissão para baixar este arquivo' } }),
      }))
    );

    render(<ImagemArquivo arquivoId="arq-1" alt="Saco de cimento" />);

    const aviso = await screen.findByRole('img', { name: 'Saco de cimento' });
    expect(aviso).toHaveTextContent('Imagem indisponível');
    expect(aviso).toHaveAttribute('title', 'perfil sem permissão para baixar este arquivo');
  });
});
