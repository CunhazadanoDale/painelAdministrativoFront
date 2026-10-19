import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { baixarDoCaminho } from './arquivos';
import {
  atualizarVinculoNota,
  baixarXmlNota,
  enviarXml,
  importarEventoNota,
  importarNota,
  ligarItemAoProduto,
  listarEntregasSemNota,
  listarEventosNota,
  listarItensSemProduto,
  listarNotas,
  obterNota,
  sincronizarTitulosNota,
} from './notasFiscais';

vi.mock('./arquivos', () => ({ baixarDoCaminho: vi.fn(), enviarArquivo: vi.fn(async (arquivo) => ({ id: 'arq-1', tipo: arquivo.type })) }));

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ dados: {} }),
  }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.clearAllMocks();
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

function consulta() {
  return new URL(ultimaChamada().url, 'http://local').searchParams;
}

describe('services de notas fiscais', () => {
  it('lista com todos os filtros e o sinal, omitindo os vazios', async () => {
    const controle = new AbortController();

    await listarNotas({
      pagina: 2,
      tamanho: 21,
      empresa: 'emp-1',
      cliente: 'cli-1',
      pedido: 'ped-1',
      natureza: 'venda',
      status: 'autorizada',
      entreEmpresas: 'false',
      semPedido: true,
      emitida_de: '2026-10-01',
      emitida_ate: '2026-10-31',
      numero: '123',
      chave: '',
      sinal: controle.signal,
    });

    expect(ultimaChamada().url).toContain('/api/v1/notas-fiscais?');
    expect(Object.fromEntries(consulta())).toEqual({
      pagina: '2',
      tamanho: '21',
      empresa: 'emp-1',
      cliente: 'cli-1',
      pedido: 'ped-1',
      natureza: 'venda',
      status: 'autorizada',
      entre_empresas: 'false',
      sem_pedido: 'true',
      emitida_de: '2026-10-01',
      emitida_ate: '2026-10-31',
      numero: '123',
    });
    expect(ultimaChamada().sinal).toBe(controle.signal);
  });

  it('importa a nota com o arquivo e os vínculos opcionais', async () => {
    await importarNota({ arquivo_id: 'arq-1', pedido_id: 'ped-1', entrega_id: null });

    expect(ultimaChamada()).toMatchObject({
      url: expect.stringMatching(/\/api\/v1\/notas-fiscais\/importacao$/),
      metodo: 'POST',
      corpo: { arquivo_id: 'arq-1', pedido_id: 'ped-1', entrega_id: null },
    });
  });

  it('obtém o detalhe e os eventos com o sinal', async () => {
    const controle = new AbortController();

    await obterNota('nf-1', { sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/notas-fiscais\/nf-1$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await listarEventosNota('nf-1', { sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/notas-fiscais\/nf-1\/eventos$/);
  });

  it('atualiza o vínculo com a versão e aceita desfazer com nulos', async () => {
    await atualizarVinculoNota('nf-1', { versao: 3, pedido_id: null, entrega_id: null });

    expect(ultimaChamada()).toMatchObject({
      url: expect.stringMatching(/\/api\/v1\/notas-fiscais\/nf-1\/vinculo$/),
      metodo: 'PUT',
      corpo: { versao: 3, pedido_id: null, entrega_id: null },
    });
  });

  it('liga o item ao produto pela nota e pelo número do item', async () => {
    await ligarItemAoProduto('nf-1', 2, { versao: 4, produto_id: 'prod-1' });

    expect(ultimaChamada()).toMatchObject({
      url: expect.stringMatching(/\/api\/v1\/notas-fiscais\/nf-1\/itens\/2\/produto$/),
      metodo: 'PUT',
      corpo: { versao: 4, produto_id: 'prod-1' },
    });
  });

  it('importa o evento e sincroniza os títulos', async () => {
    await importarEventoNota('arq-9');
    expect(ultimaChamada()).toMatchObject({
      url: expect.stringMatching(/\/api\/v1\/notas-fiscais\/eventos$/),
      metodo: 'POST',
      corpo: { arquivo_id: 'arq-9' },
    });

    await sincronizarTitulosNota('nf-1');
    expect(ultimaChamada()).toMatchObject({
      url: expect.stringMatching(/\/api\/v1\/notas-fiscais\/nf-1\/titulos$/),
      metodo: 'POST',
      corpo: undefined,
    });
  });

  it('lista os itens sem produto e as entregas sem nota pelos filtros', async () => {
    await listarItensSemProduto({ pagina: 1, tamanho: 21, empresa: 'emp-1' });
    expect(ultimaChamada().url).toContain('/api/v1/notas-fiscais/itens-sem-produto?');
    expect(consulta().get('empresa')).toBe('emp-1');

    await listarEntregasSemNota({ pagina: 1, tamanho: 21, empresa: 'emp-1', cliente: 'cli-1' });
    expect(ultimaChamada().url).toContain('/api/v1/entregas/sem-nota-fiscal?');
    expect(consulta().get('cliente')).toBe('cli-1');
  });

  it('baixa o XML original pela rota da nota', async () => {
    await baixarXmlNota('nf-1', 'NF 1-123.xml');

    expect(baixarDoCaminho).toHaveBeenCalledWith('/api/v1/notas-fiscais/nf-1/xml', 'NF 1-123.xml');
  });

  it('envia o XML com o tipo application/xml quando o navegador não informa o tipo', async () => {
    const semTipo = new File(['<nfeProc/>'], 'nota.xml', { type: '' });
    const comTipo = new File(['<nfeProc/>'], 'nota.xml', { type: 'text/xml' });

    expect(await enviarXml(semTipo)).toEqual({ id: 'arq-1', tipo: 'application/xml' });
    expect(await enviarXml(comTipo)).toEqual({ id: 'arq-1', tipo: 'text/xml' });
  });
});
