import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listarTodosAprovadores } from './aprovadores';
import { listarTodosCargos } from './cargos';
import { listarTodasCategorias } from './categorias';
import { listarTodosFunis } from './funis';
import { listarArquivos, listarHistorico } from './solicitacoes';
import { listarTodosUsuarios } from './usuarios';

const TOTAL = 150;

function responderPaginado(url) {
  const consulta = new URL(String(url), 'http://localhost').searchParams;
  const pagina = Number(consulta.get('pagina'));
  const tamanho = Number(consulta.get('tamanho'));
  const inicio = (pagina - 1) * tamanho;
  const quantidade = Math.max(0, Math.min(tamanho, TOTAL - inicio));
  const dados = Array.from({ length: quantidade }, (_, i) => ({ id: `item-${inicio + i}` }));
  return { ok: true, status: 200, text: async () => JSON.stringify({ dados }) };
}

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn(async (url) => responderPaginado(url));
  vi.stubGlobal('fetch', fetchMock);
});

function urlsChamadas() {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

describe('listas completas', () => {
  it.each([
    ['aprovadores', () => listarTodosAprovadores(), '/api/v1/aprovadores'],
    ['usuários', () => listarTodosUsuarios(), '/api/v1/usuarios'],
    ['cargos', () => listarTodosCargos(), '/api/v1/cargos'],
    ['categorias', () => listarTodasCategorias(), '/api/v1/categorias'],
    ['funis', () => listarTodosFunis(), '/api/v1/funils'],
    ['histórico da solicitação', () => listarHistorico('sol-1'), '/api/v1/solicitacoes/sol-1/historico'],
    ['anexos da solicitação', () => listarArquivos('sol-1'), '/api/v1/solicitacoes/sol-1/arquivos'],
  ])('%s percorre todas as páginas', async (_, listar, caminho) => {
    const itens = await listar();

    expect(itens).toHaveLength(TOTAL);
    expect(urlsChamadas()).toHaveLength(2);
    expect(urlsChamadas().every((url) => url.includes(caminho))).toBe(true);
  });

  it('funis só ativos envia ativos=true e todos não envia o filtro', async () => {
    await listarTodosFunis({ ativos: true });
    await listarTodosFunis({ ativos: false });

    const [primeira, , terceira] = urlsChamadas();
    expect(primeira).toContain('ativos=true');
    expect(terceira).not.toContain('ativos=');
  });

  it('repassa o sinal de cancelamento', async () => {
    const controle = new AbortController();

    await listarTodasCategorias({ sinal: controle.signal });

    expect(fetchMock.mock.calls[0][1].signal).toBe(controle.signal);
  });
});
