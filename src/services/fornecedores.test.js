import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ativarFornecedor,
  atualizarFornecedor,
  criarFornecedor,
  desativarFornecedor,
  listarFornecedores,
  obterFornecedor,
  removerFornecedor,
} from './fornecedores';

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

const NACIONAL = {
  pais: 'BR',
  documento: '11222333000181',
  nome: 'Cerâmica Paraíba LTDA',
  nome_fantasia: 'Cerâmica PB',
  moeda_padrao: 'BRL',
  uf: 'PB',
  cidade: 'João Pessoa',
  contato_nome: 'Maria',
  email: 'vendas@ceramicapb.com.br',
  telefone: '83 3333-0000',
  observacoes: '',
};

describe('services de fornecedores', () => {
  it('lista a página com os filtros e o sinal', async () => {
    const controle = new AbortController();

    await listarFornecedores({
      pagina: 2,
      tamanho: 21,
      busca: 'ceram',
      moeda: 'USD',
      ativo: false,
      sinal: controle.signal,
    });

    const chamada = ultimaChamada();
    expect(chamada.url).toContain('/api/v1/fornecedores?');
    const consulta = new URL(chamada.url, 'http://local').searchParams;
    expect(consulta.get('pagina')).toBe('2');
    expect(consulta.get('tamanho')).toBe('21');
    expect(consulta.get('busca')).toBe('ceram');
    expect(consulta.get('moeda')).toBe('USD');
    expect(consulta.get('ativo')).toBe('false');
    expect(chamada.sinal).toBe(controle.signal);
  });

  it('omite os filtros vazios', async () => {
    await listarFornecedores();

    const consulta = new URL(ultimaChamada().url, 'http://local').searchParams;
    expect(consulta.has('busca')).toBe(false);
    expect(consulta.has('moeda')).toBe(false);
    expect(consulta.has('ativo')).toBe(false);
  });

  it('obtém um fornecedor com o sinal', async () => {
    const controle = new AbortController();

    await obterFornecedor('for-1', { sinal: controle.signal });

    const chamada = ultimaChamada();
    expect(chamada.url).toMatch(/\/api\/v1\/fornecedores\/for-1$/);
    expect(chamada.sinal).toBe(controle.signal);
  });

  it('cria com país e documento', async () => {
    await criarFornecedor(NACIONAL);

    const chamada = ultimaChamada();
    expect(chamada.metodo).toBe('POST');
    expect(chamada.url).toMatch(/\/api\/v1\/fornecedores$/);
    expect(chamada.corpo).toEqual(NACIONAL);
  });

  it('altera com a versão e sem país nem documento', async () => {
    await atualizarFornecedor('for-1', { ...NACIONAL, identificacao_estrangeira: '', versao: 3 });

    const chamada = ultimaChamada();
    expect(chamada.metodo).toBe('PUT');
    expect(chamada.url).toMatch(/\/api\/v1\/fornecedores\/for-1$/);
    expect(chamada.corpo).not.toHaveProperty('pais');
    expect(chamada.corpo).not.toHaveProperty('documento');
    expect(chamada.corpo).toMatchObject({ nome: 'Cerâmica Paraíba LTDA', identificacao_estrangeira: '', versao: 3 });
  });

  it('ativa e desativa enviando a versão', async () => {
    await ativarFornecedor('for-1', 4);
    expect(ultimaChamada()).toMatchObject({ metodo: 'PATCH', corpo: { versao: 4 } });
    expect(ultimaChamada().url).toMatch(/\/fornecedores\/for-1\/ativar$/);

    await desativarFornecedor('for-1', 5);
    expect(ultimaChamada()).toMatchObject({ metodo: 'PATCH', corpo: { versao: 5 } });
    expect(ultimaChamada().url).toMatch(/\/fornecedores\/for-1\/desativar$/);
  });

  it('exclui pelo id', async () => {
    await removerFornecedor('for-1');

    const chamada = ultimaChamada();
    expect(chamada.metodo).toBe('DELETE');
    expect(chamada.url).toMatch(/\/api\/v1\/fornecedores\/for-1$/);
  });
});
