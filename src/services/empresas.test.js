import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ativarEmpresa,
  atualizarEmpresa,
  criarEmpresa,
  definirEmpresasDoUsuario,
  desativarEmpresa,
  listarEmpresas,
  obterEmpresasDoUsuario,
  removerEmpresa,
} from './empresas';

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

const DADOS = {
  cnpj: '11.222.333/0001-81',
  razao_social: 'MIA Construtora LTDA',
  nome_fantasia: 'MIA',
  uf: 'PB',
  regime_tributario: 'presumido',
};

describe('services de empresas', () => {
  it('lista a página com o filtro de ativas e o sinal', async () => {
    const controle = new AbortController();

    await listarEmpresas({ pagina: 2, tamanho: 21, ativas: false, sinal: controle.signal });

    const chamada = ultimaChamada();
    expect(chamada.url).toContain('/api/v1/empresas?');
    expect(chamada.url).toContain('pagina=2');
    expect(chamada.url).toContain('tamanho=21');
    expect(chamada.url).toContain('ativas=false');
    expect(chamada.sinal).toBe(controle.signal);
  });

  it('cria com POST e o corpo completo', async () => {
    await criarEmpresa(DADOS);

    expect(ultimaChamada()).toMatchObject({ url: '/api/v1/empresas', metodo: 'POST', corpo: DADOS });
  });

  it('atualiza com PUT sem o cnpj', async () => {
    await atualizarEmpresa('emp-1', DADOS);

    const chamada = ultimaChamada();
    expect(chamada).toMatchObject({ url: '/api/v1/empresas/emp-1', metodo: 'PUT' });
    expect(chamada.corpo).toEqual({
      razao_social: 'MIA Construtora LTDA',
      nome_fantasia: 'MIA',
      uf: 'PB',
      regime_tributario: 'presumido',
    });
  });

  it.each([
    ['ativa', () => ativarEmpresa('emp-1'), '/api/v1/empresas/emp-1/ativar', 'PATCH'],
    ['desativa', () => desativarEmpresa('emp-1'), '/api/v1/empresas/emp-1/desativar', 'PATCH'],
    ['remove', () => removerEmpresa('emp-1'), '/api/v1/empresas/emp-1', 'DELETE'],
  ])('%s a empresa', async (_, executar, url, metodo) => {
    await executar();

    expect(ultimaChamada()).toMatchObject({ url, metodo });
  });

  it('lê os vínculos do usuário com o sinal', async () => {
    const controle = new AbortController();

    await obterEmpresasDoUsuario('usr-1', { sinal: controle.signal });

    expect(ultimaChamada()).toMatchObject({
      url: '/api/v1/usuarios/usr-1/empresas',
      metodo: 'GET',
      sinal: controle.signal,
    });
  });

  it('substitui os vínculos do usuário com PUT', async () => {
    await definirEmpresasDoUsuario('usr-1', { acesso_todas: false, empresa_ids: ['emp-1'] });

    expect(ultimaChamada()).toMatchObject({
      url: '/api/v1/usuarios/usr-1/empresas',
      metodo: 'PUT',
      corpo: { acesso_todas: false, empresa_ids: ['emp-1'] },
    });
  });
});
