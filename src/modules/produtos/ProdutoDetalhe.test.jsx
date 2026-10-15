import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AutenticacaoProvider } from '../../app/autenticacao/AutenticacaoProvider';
import ProdutoDetalhe from './ProdutoDetalhe';

const PRODUTO = {
  id: 'prod-1',
  categoria_id: 'cat-1',
  nome: 'Cimento CP II',
  unidade_medida: 'un',
  preco_centavos: 3500,
  saldo: 0,
  ativo: false,
  destaque: false,
  imagens: [{ id: 'img-1', arquivo_id: 'arq-1', ordem: 0, alt: 'Saco de cimento' }],
};

function responderPara(url) {
  const texto = String(url);
  if (texto.includes('/api/v1/arquivos/')) {
    return { ok: true, status: 200, blob: async () => new Blob(['png']) };
  }
  const corpo = texto.includes('/movimentos')
    ? { dados: [] }
    : texto.includes('/api/v1/categorias')
      ? { dados: [] }
      : { dados: PRODUTO };
  return { ok: true, status: 200, text: async () => JSON.stringify(corpo) };
}

function entrarComo(administrador) {
  localStorage.setItem(
    'mia.sessao',
    JSON.stringify({
      token: 'token-de-teste',
      expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      administrador,
      usuario: { usuario_id: 1, nome: 'Pessoa Teste', email: 'teste@exemplo.com' },
    })
  );
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/produtos/prod-1']}>
      <AutenticacaoProvider>
        <Routes>
          <Route path="/produtos/:id" element={<ProdutoDetalhe />} />
        </Routes>
      </AutenticacaoProvider>
    </MemoryRouter>
  );
}

let fetchMock;

beforeEach(() => {
  localStorage.clear();
  URL.createObjectURL = vi.fn(() => 'blob:imagem-1');
  URL.revokeObjectURL = vi.fn();
  fetchMock = vi.fn(async (url) => responderPara(url));
  vi.stubGlobal('fetch', fetchMock);
});

describe('ProdutoDetalhe', () => {
  it('administrador vê a imagem do produto inativo pela rota autenticada', async () => {
    entrarComo(true);
    renderizar();

    const imagem = await screen.findByRole('img', { name: 'Saco de cimento' });

    expect(imagem).toHaveAttribute('src', 'blob:imagem-1');
    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes('/api/v1/arquivos/arq-1'))).toBe(true);
    expect(urls.some((url) => url.includes('/publico/imagens'))).toBe(false);
  });

  it('quem não é administrador continua na rota pública da vitrine', async () => {
    entrarComo(false);
    renderizar();

    const imagem = await screen.findByRole('img', { name: 'Saco de cimento' });

    expect(imagem.getAttribute('src')).toContain('/api/v1/publico/imagens/img-1');
  });
});
