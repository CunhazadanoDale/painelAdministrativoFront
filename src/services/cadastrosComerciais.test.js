import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ativarGrupo,
  criarGrupo,
  desativarGrupo,
  listarGrupos,
  listarTodosGrupos,
  renomearGrupo,
} from './clienteGrupos';
import {
  ativarRepresentante,
  atualizarRepresentante,
  criarRepresentante,
  desativarRepresentante,
  listarRepresentantes,
  listarTodosRepresentantes,
  obterRepresentante,
} from './representantes';

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ dados: [] }),
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

function consulta() {
  return new URL(ultimaChamada().url, 'http://local').searchParams;
}

describe('services de grupos de clientes', () => {
  it('lista com busca, situação e o sinal, e lista todos para seletor', async () => {
    const controle = new AbortController();

    await listarGrupos({ pagina: 2, tamanho: 21, busca: 'aguia', ativos: false, sinal: controle.signal });
    expect(ultimaChamada().url).toContain('/api/v1/cliente-grupos?');
    expect(consulta().get('busca')).toBe('aguia');
    expect(consulta().get('ativos')).toBe('false');
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await listarTodosGrupos({ ativos: true, sinal: controle.signal });
    expect(consulta().get('ativos')).toBe('true');
    expect(consulta().get('tamanho')).toBe('100');
  });

  it('cria, renomeia, ativa e desativa', async () => {
    await criarGrupo('Grupo Águia');
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: { nome: 'Grupo Águia' } });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/cliente-grupos$/);

    await renomearGrupo('gru-1', 'Águia');
    expect(ultimaChamada()).toMatchObject({ metodo: 'PUT', corpo: { nome: 'Águia' } });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/cliente-grupos\/gru-1$/);

    await ativarGrupo('gru-1');
    expect(ultimaChamada().url).toMatch(/\/cliente-grupos\/gru-1\/ativar$/);

    await desativarGrupo('gru-1');
    expect(ultimaChamada()).toMatchObject({ metodo: 'PATCH' });
    expect(ultimaChamada().url).toMatch(/\/cliente-grupos\/gru-1\/desativar$/);
  });
});

describe('services de representantes', () => {
  const REPRESENTANTE = {
    nome: 'José Vendas',
    documento: '52998224725',
    usuario_id: 'usr-1',
    comissao_pronta_entrega_bp: 300,
    comissao_importacao_bp: 150,
  };

  it('lista com busca, situação e o sinal, e lista todos para seletor', async () => {
    const controle = new AbortController();

    await listarRepresentantes({ pagina: 1, tamanho: 21, busca: 'jose', ativos: true, sinal: controle.signal });
    expect(ultimaChamada().url).toContain('/api/v1/representantes?');
    expect(consulta().get('busca')).toBe('jose');
    expect(consulta().get('ativos')).toBe('true');
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await listarTodosRepresentantes({ sinal: controle.signal });
    expect(consulta().has('ativos')).toBe(false);
    expect(consulta().get('tamanho')).toBe('100');
  });

  it('obtém, cria, altera, ativa e desativa', async () => {
    const controle = new AbortController();

    await obterRepresentante('rep-1', { sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/representantes\/rep-1$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await criarRepresentante(REPRESENTANTE);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: REPRESENTANTE });

    await atualizarRepresentante('rep-1', REPRESENTANTE);
    expect(ultimaChamada()).toMatchObject({ metodo: 'PUT', corpo: REPRESENTANTE });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/representantes\/rep-1$/);

    await ativarRepresentante('rep-1');
    expect(ultimaChamada().url).toMatch(/\/representantes\/rep-1\/ativar$/);

    await desativarRepresentante('rep-1');
    expect(ultimaChamada().url).toMatch(/\/representantes\/rep-1\/desativar$/);
  });
});
