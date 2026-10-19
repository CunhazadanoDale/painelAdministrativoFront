import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  apurarComissoes,
  criarAjusteComissao,
  definirComissaoDoPedido,
  fecharComissoes,
  listarAjustesComissao,
  listarComissoes,
  listarFechamentosComissao,
  listarPendenciasComissao,
  obterComissaoDoPedido,
  obterFechamentoComissao,
  obterResumoComissoes,
} from './comissoes';
import { definirFornecedorDoRepresentante } from './representantes';

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

function consulta() {
  return Object.fromEntries(new URL(ultimaChamada().url, 'http://local').searchParams);
}

describe('services de comissões', () => {
  it('lê o percentual do pedido com o sinal', async () => {
    const controle = new AbortController();

    await obterComissaoDoPedido('ped-1', { sinal: controle.signal });

    expect(ultimaChamada().url).toMatch(/\/api\/v1\/pedidos\/ped-1\/comissao$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);
  });

  it('define o percentual sem versão na primeira vez e com versão depois', async () => {
    await definirComissaoDoPedido('ped-1', { percentual_bp: 450, versao: null });
    expect(ultimaChamada()).toMatchObject({ metodo: 'PUT', corpo: { percentual_bp: 450 } });
    expect(ultimaChamada().corpo).not.toHaveProperty('versao');

    await definirComissaoDoPedido('ped-1', { percentual_bp: 500, versao: 2 });
    expect(ultimaChamada().corpo).toEqual({ percentual_bp: 500, versao: 2 });
  });

  it('apura sem corpo vazio de campos e com empresa e competência quando vierem', async () => {
    await apurarComissoes();
    expect(ultimaChamada()).toMatchObject({ url: expect.stringMatching(/\/api\/v1\/comissoes\/apurar$/), metodo: 'POST', corpo: {} });

    await apurarComissoes({ empresa_id: 'emp-1', competencia: '2026-09' });
    expect(ultimaChamada().corpo).toEqual({ empresa_id: 'emp-1', competencia: '2026-09' });
  });

  it('lista comissões e ajustes com os filtros, convertendo aberta e aberto', async () => {
    await listarComissoes({ pagina: 2, tamanho: 21, empresa: 'emp-1', representante: 'rep-1', pedido: 'ped-1', competencia: '2026-09', aberta: true });
    expect(ultimaChamada().url).toContain('/api/v1/comissoes?');
    expect(consulta()).toEqual({
      pagina: '2',
      tamanho: '21',
      empresa: 'emp-1',
      representante: 'rep-1',
      pedido: 'ped-1',
      competencia: '2026-09',
      aberta: 'true',
    });

    await listarAjustesComissao({ aberto: false, competencia: '2026-09' });
    expect(ultimaChamada().url).toContain('/api/v1/comissoes/ajustes?');
    expect(consulta()).toMatchObject({ aberto: 'false', competencia: '2026-09' });

    await listarComissoes({ aberta: '' });
    expect(consulta()).not.toHaveProperty('aberta');
  });

  it('lista as pendências de apuração', async () => {
    await listarPendenciasComissao({ empresa: 'emp-1', competencia: '2026-09' });

    expect(ultimaChamada().url).toContain('/api/v1/comissoes/pendencias?');
    expect(consulta()).toMatchObject({ empresa: 'emp-1', competencia: '2026-09' });
  });

  it('cria o ajuste com o corpo informado', async () => {
    const ajuste = { empresa_id: 'emp-1', representante_id: 'rep-1', pedido_id: null, competencia: '2026-10', valor_centavos: -375, motivo: 'devolução' };

    await criarAjusteComissao(ajuste);

    expect(ultimaChamada()).toMatchObject({ url: expect.stringMatching(/\/comissoes\/ajustes$/), metodo: 'POST', corpo: ajuste });
  });

  it('fecha a competência com o representante opcional como nulo', async () => {
    await fecharComissoes({ empresa_id: 'emp-1', competencia: '2026-09', categoria_financeira_id: 'cat-1' });

    expect(ultimaChamada()).toMatchObject({
      url: expect.stringMatching(/\/comissoes\/fechamentos$/),
      metodo: 'POST',
      corpo: { empresa_id: 'emp-1', competencia: '2026-09', categoria_financeira_id: 'cat-1', representante_id: null },
    });
  });

  it('lista e obtém os fechamentos e lê o resumo da competência', async () => {
    await listarFechamentosComissao({ empresa: 'emp-1', representante: 'rep-1', competencia: '2026-09' });
    expect(ultimaChamada().url).toContain('/api/v1/comissoes/fechamentos?');
    expect(consulta()).toMatchObject({ empresa: 'emp-1', representante: 'rep-1', competencia: '2026-09' });

    await obterFechamentoComissao('fec-1');
    expect(ultimaChamada().url).toMatch(/\/comissoes\/fechamentos\/fec-1$/);

    await obterResumoComissoes({ competencia: '2026-09', empresa: 'emp-1' });
    expect(ultimaChamada().url).toContain('/api/v1/comissoes/resumo?');
    expect(consulta()).toEqual({ competencia: '2026-09', empresa: 'emp-1' });
  });

  it('define e tira o fornecedor do representante', async () => {
    await definirFornecedorDoRepresentante('rep-1', 'for-1');
    expect(ultimaChamada()).toMatchObject({
      url: expect.stringMatching(/\/api\/v1\/representantes\/rep-1\/fornecedor$/),
      metodo: 'PUT',
      corpo: { fornecedor_id: 'for-1' },
    });

    await definirFornecedorDoRepresentante('rep-1', '');
    expect(ultimaChamada().corpo).toEqual({ fornecedor_id: null });
  });
});
