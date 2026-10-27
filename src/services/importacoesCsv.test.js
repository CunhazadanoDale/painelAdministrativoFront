import { beforeEach, describe, expect, it, vi } from 'vitest';

import { baixarDoCaminho } from './arquivos';
import * as clientes from './clientes';
import * as fornecedores from './fornecedores';
import * as leads from './leads';
import * as produtos from './produtos';
import * as tabelaPrecos from './tabelaPrecos';

vi.mock('./arquivos', () => ({ baixarDoCaminho: vi.fn(async () => undefined) }));

let fetchMock;

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ dados: { simulacao: true, total: 0, importadas: 0, rejeitadas: [] } }),
  }));
  vi.stubGlobal('fetch', fetchMock);
});

function ultimaChamada() {
  const [url, opcoes] = fetchMock.mock.calls.at(-1);
  const endereco = new URL(String(url), 'http://local');
  return {
    caminho: endereco.pathname,
    consulta: Object.fromEntries(endereco.searchParams),
    metodo: opcoes.method,
    tipo: opcoes.headers['Content-Type'],
    corpo: opcoes.body,
  };
}

const arquivo = new File(['nome;email;telefone;origem\n'], 'dados.csv', { type: 'text/csv' });

describe('importações por CSV', () => {
  it.each([
    ['produtos', () => produtos.importarProdutos(arquivo, { simular: true }), '/api/v1/produtos/importacao'],
    ['tabela de preços', () => tabelaPrecos.importarTabelaPrecos(arquivo, { simular: true }), '/api/v1/tabela-precos/importacao'],
    ['fornecedores', () => fornecedores.importarFornecedores(arquivo, { simular: true }), '/api/v1/fornecedores/importacao'],
  ])('envia o CSV cru de %s com a simulação', async (_, importar, caminho) => {
    await importar();

    expect(ultimaChamada()).toEqual({ caminho, consulta: { simular: 'true' }, metodo: 'POST', tipo: 'text/csv', corpo: arquivo });
  });

  it('envia os leads com a etapa escolhida', async () => {
    await leads.importarLeads(arquivo, { etapaId: 'etapa-1' });

    expect(ultimaChamada()).toMatchObject({
      caminho: '/api/v1/leads/importacao',
      consulta: { etapa_id: 'etapa-1', simular: 'false' },
      metodo: 'POST',
      tipo: 'text/csv',
    });
  });

  it.each([
    ['clientes', clientes.baixarModeloImportacao, '/api/v1/clientes/importacao/modelo', 'modelo-clientes.csv'],
    ['leads', leads.baixarModeloImportacao, '/api/v1/leads/importacao/modelo', 'modelo-leads.csv'],
    ['produtos', produtos.baixarModeloImportacao, '/api/v1/produtos/importacao/modelo', 'modelo-produtos.csv'],
    ['tabela de preços', tabelaPrecos.baixarModeloImportacao, '/api/v1/tabela-precos/importacao/modelo', 'modelo-tabela-precos.csv'],
    ['fornecedores', fornecedores.baixarModeloImportacao, '/api/v1/fornecedores/importacao/modelo', 'modelo-fornecedores.csv'],
  ])('baixa o modelo de %s', async (_, baixar, caminho, nome) => {
    await baixar();

    expect(baixarDoCaminho).toHaveBeenCalledWith(caminho, nome);
  });
});
