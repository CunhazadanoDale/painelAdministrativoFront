import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const LOCAIS = [
  { id: 'loc-galpao', empresa_id: 'emp-mia', nome: 'Galpão Cabedelo', ativo: true },
  { id: 'loc-loja', empresa_id: 'emp-mia', nome: 'Loja João Pessoa', ativo: true },
];

const EMPRESAS = [{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }];

const SALDO = {
  produto_id: 'prod-1',
  saldo: 14,
  reservado: 3,
  disponivel: 11,
  nao_alocado: 4,
  locais: [
    {
      produto_id: 'prod-1',
      local_id: 'loc-galpao',
      local_nome: 'Galpão Cabedelo',
      empresa_id: 'emp-mia',
      quantidade: 10,
      reservado: 3,
      disponivel: 7,
    },
  ],
};

const MOVIMENTOS = [
  {
    id: 'mov-1',
    tipo: 'transferencia',
    quantidade: 2,
    saldo_apos: 14,
    local_id: 'loc-galpao',
    local_destino_id: 'loc-loja',
    saldo_local_apos: 8,
    criado_em: '2026-10-12T12:00:00Z',
  },
  {
    id: 'mov-0',
    tipo: 'entrada',
    quantidade: 14,
    saldo_apos: 14,
    local_id: null,
    local_destino_id: null,
    saldo_local_apos: null,
    criado_em: '2026-09-01T12:00:00Z',
  },
];

let respostas;

function responderPara(url) {
  const texto = String(url);
  if (texto.includes('/api/v1/arquivos/')) {
    return { ok: true, status: 200, blob: async () => new Blob(['png']) };
  }
  const resposta = Object.entries(respostas).find(([trecho]) => texto.includes(trecho));
  if (resposta && resposta[1] instanceof Error) {
    return {
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ erro: { mensagem: resposta[1].message } }),
    };
  }
  const corpo = resposta ? resposta[1] : { dados: PRODUTO };
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
  respostas = {
    '/movimentos': { dados: [] },
    '/reservas': { dados: [] },
    '/saldo': { dados: SALDO },
    '/api/v1/categorias': { dados: [] },
    '/api/v1/estoque/locais': { dados: LOCAIS },
    '/api/v1/empresas': { dados: EMPRESAS },
  };
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

  it('mostra os totais do grupo e o saldo de cada local do acesso', async () => {
    entrarComo(false);
    renderizar();

    const painel = (await screen.findByText('Saldo por local')).closest('section');
    expect(await within(painel).findByText('Galpão Cabedelo')).toBeInTheDocument();
    const totais = within(painel.querySelector('dl'));
    expect(totais.getByText('Não alocado').nextSibling).toHaveTextContent('4');
    expect(totais.getByText('Reservado').nextSibling).toHaveTextContent('3');
    expect(totais.getByText('Disponível').nextSibling).toHaveTextContent('11');
    const galpao = within(painel).getByText('Galpão Cabedelo').closest('tr');
    expect(within(galpao).getByText('10')).toBeInTheDocument();
    expect(within(galpao).getByText('7')).toBeInTheDocument();
    expect(await within(galpao).findByText('MIA')).toBeInTheDocument();
  });

  it('mostra a falha do saldo sem derrubar o detalhe e tenta de novo', async () => {
    respostas['/saldo'] = new Error('falha no saldo');
    entrarComo(false);
    renderizar();

    expect(await screen.findByText('falha no saldo')).toBeInTheDocument();
    expect(screen.getByText('Cimento CP II', { selector: 'span' })).toBeInTheDocument();
    respostas['/saldo'] = { dados: SALDO };
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('Saldo por local')).toBeInTheDocument();
    expect(screen.queryByText('falha no saldo')).toBeNull();
  });

  it('mostra o local de cada movimento, a transferência com origem e destino, o antigo sem local, e filtra por local', async () => {
    respostas['/movimentos'] = { dados: MOVIMENTOS };
    entrarComo(false);
    renderizar();

    const transferencia = (await screen.findByText('Transferência')).closest('tr');
    expect(await within(transferencia).findByText('Galpão Cabedelo → Loja João Pessoa')).toBeInTheDocument();
    expect(within(transferencia).getByText('8')).toBeInTheDocument();
    const antigo = screen.getByText('Entrada').closest('tr');
    expect(within(antigo).getByText('Anterior aos locais')).toBeInTheDocument();

    await screen.findByRole('option', { name: 'Loja João Pessoa · MIA' });
    fireEvent.change(screen.getByLabelText('Local dos movimentos'), { target: { value: 'loc-loja' } });

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('/movimentos'));
      expect(urls.at(-1)).toContain('local=loc-loja');
    });
  });

  it('só o administrador vê Transferir, que abre o modal de transferência', async () => {
    entrarComo(false);
    const { unmount } = renderizar();
    await screen.findByText('Saldo por local');
    expect(screen.queryByRole('button', { name: /Transferir/ })).toBeNull();
    unmount();

    entrarComo(true);
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: /Transferir/ }));

    expect(await screen.findByRole('dialog', { name: 'Transferir entre locais' })).toBeInTheDocument();
  });

  it('mostra o painel de reservas do produto', async () => {
    entrarComo(false);
    renderizar();

    expect(await screen.findByText('Nenhuma reserva ativa.')).toBeInTheDocument();
    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes('/api/v1/produtos/prod-1/reservas') && url.includes('status=ativa'))).toBe(true);
  });
});
