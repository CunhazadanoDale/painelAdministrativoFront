import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AutenticacaoProvider } from '../../app/autenticacao/AutenticacaoProvider';
import Produtos from './Produtos';

const PRODUTO = {
  id: 'c806cba5-dd09-4b00-95e7-ff9f25eabb16',
  categoria_id: '9ff7c9e7-dcf3-421d-a863-cd99e09c2fe7',
  nome: 'teste apenas',
  slug: 'teste-apenas',
  descricao: '',
  codigo: null,
  unidade_medida: 'kg',
  preco_centavos: null,
  preco_promocional_centavos: null,
  saldo: 0,
  estoque_minimo: 11,
  estoque_baixo: true,
  peso_kg: null,
  destaque: true,
  ativo: true,
  imagens: [],
};

function responderPara(url) {
  const corpo = String(url).includes('/estoque/resumo')
    ? { dados: { total_produtos: 1, produtos_ativos: 1, valor_estoque_centavos: 0, produtos_estoque_baixo: 1 } }
    : String(url).includes('/api/v1/categorias')
      ? { dados: [] }
      : { dados: [PRODUTO], pagina: 1, tamanho: 21 };

  return { ok: true, status: 200, text: async () => JSON.stringify(corpo) };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    'mia.sessao',
    JSON.stringify({
      token: 'token-de-teste',
      expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      administrador: true,
      usuario: { usuario_id: 1, nome: 'Pessoa Teste', email: 'teste@exemplo.com' },
    })
  );
  vi.stubGlobal('fetch', vi.fn(async (url) => responderPara(url)));
});

describe('Produtos', () => {
  it('mostra o produto na grade ao lado do painel de filtros', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/produtos']}>
        <AutenticacaoProvider>
          <Produtos />
        </AutenticacaoProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('teste apenas')).toBeInTheDocument();

    // Regressão: o painel de filtros tem altura própria. Empilhado acima da
    // grade num contêiner de altura fixa, ele colapsava .produtos-conteudo
    // para zero e a tela ficava sem nenhuma linha de produto.
    const corpo = container.querySelector('.produtos-corpo');
    expect(corpo).toBeTruthy();
    expect(corpo.querySelector('.filter-panel')).toBeTruthy();
    expect(corpo.querySelector('.produtos-conteudo')).toBeTruthy();
    expect(corpo.querySelector('.datagrid tbody tr')).toBeTruthy();
    expect(screen.getByText('Produtos (1)')).toBeInTheDocument();
  });

  it('mostra só o erro, sem o aviso de lista vazia, quando a listagem falha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) =>
        String(url).includes('/api/v1/produtos')
          ? {
              ok: false,
              status: 500,
              text: async () => JSON.stringify({ erro: { mensagem: 'erro interno do servidor' } }),
            }
          : responderPara(url)
      )
    );

    render(
      <MemoryRouter initialEntries={['/produtos']}>
        <AutenticacaoProvider>
          <Produtos />
        </AutenticacaoProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('erro interno do servidor')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum produto encontrado.')).not.toBeInTheDocument();
  });

  it('avisa quando categorias ou resumo não carregam e permite tentar de novo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) =>
        String(url).includes('/estoque/resumo')
          ? {
              ok: false,
              status: 500,
              text: async () => JSON.stringify({ erro: { mensagem: 'erro interno do servidor' } }),
            }
          : responderPara(url)
      )
    );

    render(
      <MemoryRouter initialEntries={['/produtos']}>
        <AutenticacaoProvider>
          <Produtos />
        </AutenticacaoProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('teste apenas')).toBeInTheDocument();
    expect(
      await screen.findByText('Não foi possível carregar o resumo do estoque: erro interno do servidor')
    ).toBeInTheDocument();

    vi.stubGlobal('fetch', vi.fn(async (url) => responderPara(url)));
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Total de produtos')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText(/Não foi possível carregar o resumo/)).not.toBeInTheDocument()
    );
  });
});
