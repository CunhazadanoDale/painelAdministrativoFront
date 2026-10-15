import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ativarCategoriaFinanceira,
  atualizarCategoriaFinanceira,
  criarCategoriaFinanceira,
  desativarCategoriaFinanceira,
  obterArvoreFinanceira,
  obterCategoriaFinanceira,
  removerCategoriaFinanceira,
} from './categoriasFinanceiras';

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ dados: {} }),
  }));
  vi.stubGlobal('fetch', fetchMock);
});

function ultimaChamada() {
  const [url, opcoes] = fetchMock.mock.calls.at(-1);
  return {
    url: String(url),
    metodo: opcoes.method,
    corpo: opcoes.body ? JSON.parse(opcoes.body) : undefined,
    sinal: opcoes.signal,
  };
}

describe('services do plano de contas', () => {
  it('obtém a árvore inteira com o sinal', async () => {
    const controle = new AbortController();

    await obterArvoreFinanceira({ sinal: controle.signal });

    const chamada = ultimaChamada();
    expect(chamada.url).toMatch(/\/api\/v1\/categorias-financeiras\/arvore$/);
    expect(chamada.sinal).toBe(controle.signal);
  });

  it('obtém só as ativas da árvore', async () => {
    await obterArvoreFinanceira({ ativas: true });

    expect(ultimaChamada().url).toMatch(/\/categorias-financeiras\/arvore\?ativas=true$/);
  });

  it('obtém uma categoria com o sinal', async () => {
    const controle = new AbortController();

    await obterCategoriaFinanceira('cat-1', { sinal: controle.signal });

    const chamada = ultimaChamada();
    expect(chamada.url).toMatch(/\/api\/v1\/categorias-financeiras\/cat-1$/);
    expect(chamada.sinal).toBe(controle.signal);
  });

  it('cria a raiz com natureza e linha da DRE', async () => {
    const raiz = { nome: 'Despesas administrativas', natureza: 'despesa', linha_dre: 'despesa_fixa', codigo: '4.2', ordem: 3 };

    await criarCategoriaFinanceira(raiz);

    const chamada = ultimaChamada();
    expect(chamada.metodo).toBe('POST');
    expect(chamada.url).toMatch(/\/api\/v1\/categorias-financeiras$/);
    expect(chamada.corpo).toEqual(raiz);
  });

  it('cria a subcategoria sem natureza nem linha da DRE', async () => {
    await criarCategoriaFinanceira({
      nome: 'Aluguel',
      categoria_pai_id: 'cat-1',
      natureza: 'despesa',
      linha_dre: 'despesa_fixa',
      codigo: '4.2.01',
    });

    expect(ultimaChamada().corpo).toEqual({ nome: 'Aluguel', categoria_pai_id: 'cat-1', codigo: '4.2.01' });
  });

  it('altera só nome, código, ordem e versão', async () => {
    await atualizarCategoriaFinanceira('cat-1', {
      nome: 'Aluguel',
      codigo: '4.2.01',
      ordem: 2,
      natureza: 'despesa',
      linha_dre: 'despesa_fixa',
      categoria_pai_id: 'cat-0',
      versao: 3,
    });

    const chamada = ultimaChamada();
    expect(chamada.metodo).toBe('PUT');
    expect(chamada.url).toMatch(/\/api\/v1\/categorias-financeiras\/cat-1$/);
    expect(chamada.corpo).toEqual({ nome: 'Aluguel', codigo: '4.2.01', ordem: 2, versao: 3 });
  });

  it('ativa e desativa enviando a versão', async () => {
    await ativarCategoriaFinanceira('cat-1', 4);
    expect(ultimaChamada()).toMatchObject({ metodo: 'PATCH', corpo: { versao: 4 } });
    expect(ultimaChamada().url).toMatch(/\/categorias-financeiras\/cat-1\/ativar$/);

    await desativarCategoriaFinanceira('cat-1', 5);
    expect(ultimaChamada()).toMatchObject({ metodo: 'PATCH', corpo: { versao: 5 } });
    expect(ultimaChamada().url).toMatch(/\/categorias-financeiras\/cat-1\/desativar$/);
  });

  it('exclui pelo id', async () => {
    await removerCategoriaFinanceira('cat-1');

    const chamada = ultimaChamada();
    expect(chamada.metodo).toBe('DELETE');
    expect(chamada.url).toMatch(/\/api\/v1\/categorias-financeiras\/cat-1$/);
  });
});
