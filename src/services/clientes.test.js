import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ativarCliente,
  ativarObra,
  atualizarCliente,
  atualizarObra,
  converterLead,
  criarCliente,
  criarObra,
  desativarCliente,
  desativarObra,
  importarClientes,
  listarClientes,
  listarObras,
  obterCliente,
  obterObra,
  removerCliente,
} from './clientes';

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
  const json = opcoes.headers['Content-Type'] === 'application/json';
  return {
    url: String(url),
    metodo: opcoes.method,
    corpo: opcoes.body && json ? JSON.parse(opcoes.body) : opcoes.body,
    tipo: opcoes.headers['Content-Type'],
    sinal: opcoes.signal,
  };
}

function consulta() {
  return new URL(ultimaChamada().url, 'http://local').searchParams;
}

const CLIENTE = {
  documento: '11222333000181',
  nome: 'Construtora Águia LTDA',
  tipo: 'construtora',
  uf: 'PB',
  cidade: 'João Pessoa',
  exige_numero_pedido_na_nf: true,
  proibe_antecipacao: false,
  observacoes: '',
};

describe('services de clientes', () => {
  it('lista a página com todos os filtros e o sinal', async () => {
    const controle = new AbortController();

    await listarClientes({
      pagina: 2,
      tamanho: 21,
      busca: 'aguia',
      grupo: 'gru-1',
      representante: 'rep-1',
      tipo: 'construtora',
      uf: 'PB',
      ativo: false,
      lead: 'lead-1',
      sinal: controle.signal,
    });

    expect(ultimaChamada().url).toContain('/api/v1/clientes?');
    expect(Object.fromEntries(consulta())).toEqual({
      pagina: '2',
      tamanho: '21',
      busca: 'aguia',
      grupo: 'gru-1',
      representante: 'rep-1',
      tipo: 'construtora',
      uf: 'PB',
      ativo: 'false',
      lead: 'lead-1',
    });
    expect(ultimaChamada().sinal).toBe(controle.signal);
  });

  it('omite os filtros vazios', async () => {
    await listarClientes();

    expect([...consulta().keys()]).toEqual(['pagina', 'tamanho']);
  });

  it('obtém o cliente com o sinal', async () => {
    const controle = new AbortController();

    await obterCliente('cli-1', { sinal: controle.signal });

    expect(ultimaChamada().url).toMatch(/\/api\/v1\/clientes\/cli-1$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);
  });

  it('cria com o documento e altera sem ele', async () => {
    await criarCliente(CLIENTE);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: CLIENTE });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/clientes$/);

    await atualizarCliente('cli-1', CLIENTE);
    expect(ultimaChamada().metodo).toBe('PUT');
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/clientes\/cli-1$/);
    expect(ultimaChamada().corpo).not.toHaveProperty('documento');
    expect(ultimaChamada().corpo).toMatchObject({ nome: 'Construtora Águia LTDA' });
  });

  it('ativa, desativa e exclui pelo id', async () => {
    await ativarCliente('cli-1');
    expect(ultimaChamada()).toMatchObject({ metodo: 'PATCH' });
    expect(ultimaChamada().url).toMatch(/\/clientes\/cli-1\/ativar$/);

    await desativarCliente('cli-1');
    expect(ultimaChamada().url).toMatch(/\/clientes\/cli-1\/desativar$/);

    await removerCliente('cli-1');
    expect(ultimaChamada()).toMatchObject({ metodo: 'DELETE' });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/clientes\/cli-1$/);
  });

  it('converte o lead com o corpo do cliente', async () => {
    await converterLead('lead-1', CLIENTE);

    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: CLIENTE });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/leads\/lead-1\/converter$/);
  });

  it('importa o CSV cru, simulando ou gravando', async () => {
    const arquivo = new Blob(['documento;nome'], { type: 'text/csv' });

    await importarClientes(arquivo, { simular: true });
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', tipo: 'text/csv', corpo: arquivo });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/clientes\/importacao\?simular=true$/);

    await importarClientes(arquivo);
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/clientes\/importacao\?simular=false$/);
  });
});

describe('services de obras', () => {
  const OBRA = { nome: 'Residencial Mar Azul', logradouro: 'Av. Beira Mar', cidade: 'Cabedelo', uf: 'PB' };

  it('lista as obras do cliente com situação e o sinal', async () => {
    const controle = new AbortController();

    await listarObras('cli-1', { pagina: 1, tamanho: 21, ativas: true, sinal: controle.signal });

    expect(ultimaChamada().url).toContain('/api/v1/clientes/cli-1/obras?');
    expect(consulta().get('ativas')).toBe('true');
    expect(consulta().get('tamanho')).toBe('21');
    expect(ultimaChamada().sinal).toBe(controle.signal);
  });

  it('cria no cliente, altera, ativa e desativa pela obra', async () => {
    await criarObra('cli-1', OBRA);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: OBRA });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/clientes\/cli-1\/obras$/);

    await atualizarObra('obra-1', OBRA);
    expect(ultimaChamada()).toMatchObject({ metodo: 'PUT', corpo: OBRA });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/obras\/obra-1$/);

    await ativarObra('obra-1');
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/obras\/obra-1\/ativar$/);

    await desativarObra('obra-1');
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/obras\/obra-1\/desativar$/);
  });

  it('obtém uma obra pelo id com o sinal', async () => {
    const controle = new AbortController();

    await obterObra('obra-1', { sinal: controle.signal });

    expect(ultimaChamada().url).toMatch(/\/api\/v1\/obras\/obra-1$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);
  });
});
