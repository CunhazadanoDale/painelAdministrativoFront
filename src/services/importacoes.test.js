import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  atualizarImportacao,
  atualizarParcela,
  cancelarCusto,
  cancelarImportacao,
  criarImportacao,
  definirAlocacoes,
  desembaracarImportacao,
  embarcarImportacao,
  fecharCambio,
  incluirParcela,
  lancarCusto,
  listarHistoricoImportacao,
  listarImportacoes,
  listarImportacoesDoPedido,
  obterAlertasImportacao,
  obterCustoPrevisto,
  obterImportacao,
  reabrirParcela,
  receberImportacao,
  removerParcela,
} from './importacoes';

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
  return new URL(ultimaChamada().url, 'http://local').searchParams;
}

const IMPORTACAO = {
  empresa_id: 'emp-1',
  fornecedor_id: 'for-1',
  moeda: 'USD',
  referencia: 'PI-1',
  embarque_previsto: '2026-11-05',
  chegada_prevista: '2026-12-20',
  observacoes: '',
  itens: [{ produto_id: 'prod-1', quantidade: 1000, valor_moeda_centesimos: 450000 }],
};

describe('services de importações', () => {
  it('lista com todos os filtros e o sinal, omitindo os vazios', async () => {
    const controle = new AbortController();

    await listarImportacoes({
      pagina: 2,
      tamanho: 21,
      empresa: 'emp-1',
      fornecedor: 'for-1',
      status: 'embarcada',
      numero: 7,
      chegada_ate: '2026-12-31',
      sinal: controle.signal,
    });

    expect(ultimaChamada().url).toContain('/api/v1/importacoes?');
    expect(Object.fromEntries(consulta())).toEqual({
      pagina: '2',
      tamanho: '21',
      empresa: 'emp-1',
      fornecedor: 'for-1',
      status: 'embarcada',
      numero: '7',
      chegada_ate: '2026-12-31',
    });
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await listarImportacoes();
    expect([...consulta().keys()]).toEqual(['pagina', 'tamanho']);
  });

  it('obtém a importação e o histórico com o sinal', async () => {
    const controle = new AbortController();

    await obterImportacao('imp-1', { sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/importacoes\/imp-1$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await listarHistoricoImportacao('imp-1', { sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/importacoes\/imp-1\/historico$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);
  });

  it('cria com a empresa e altera sem ela, com a versão', async () => {
    await criarImportacao(IMPORTACAO);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: IMPORTACAO });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/importacoes$/);

    await atualizarImportacao('imp-1', { ...IMPORTACAO, versao: 3 });
    expect(ultimaChamada().metodo).toBe('PUT');
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/importacoes\/imp-1$/);
    expect(ultimaChamada().corpo).not.toHaveProperty('empresa_id');
    expect(ultimaChamada().corpo).toMatchObject({ fornecedor_id: 'for-1', versao: 3 });
  });

  it('embarca, desembaraça e cancela com a versão', async () => {
    await embarcarImportacao('imp-1', {
      versao: 2,
      embarcada_em: '2026-10-09',
      chegada_prevista: '2026-11-18',
      documento_embarque: 'BL-778',
    });
    expect(ultimaChamada()).toMatchObject({
      metodo: 'POST',
      corpo: { versao: 2, embarcada_em: '2026-10-09', chegada_prevista: '2026-11-18', documento_embarque: 'BL-778' },
    });
    expect(ultimaChamada().url).toMatch(/\/importacoes\/imp-1\/embarcar$/);

    await desembaracarImportacao('imp-1', {
      versao: 3,
      chegada_em: '2026-11-17',
      desembaracada_em: '2026-11-19',
      declaracao: '26/0001234-5',
    });
    expect(ultimaChamada()).toMatchObject({
      metodo: 'POST',
      corpo: { versao: 3, chegada_em: '2026-11-17', desembaracada_em: '2026-11-19', declaracao: '26/0001234-5' },
    });
    expect(ultimaChamada().url).toMatch(/\/importacoes\/imp-1\/desembaracar$/);

    await cancelarImportacao('imp-1', { versao: 4, motivo: 'fornecedor desistiu' });
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: { versao: 4, motivo: 'fornecedor desistiu' } });
    expect(ultimaChamada().url).toMatch(/\/importacoes\/imp-1\/cancelar$/);
  });

  it('recebe com o câmbio só quando informado', async () => {
    const itens = [{ item_id: 'item-1', quantidade_recebida: 950 }];

    await receberImportacao('imp-1', {
      versao: 4,
      recebida_em: '2026-11-20',
      local_id: 'loc-1',
      cambio_micro: 5500000,
      itens,
    });
    expect(ultimaChamada()).toMatchObject({
      metodo: 'POST',
      corpo: { versao: 4, recebida_em: '2026-11-20', local_id: 'loc-1', cambio_micro: 5500000, itens },
    });
    expect(ultimaChamada().url).toMatch(/\/importacoes\/imp-1\/receber$/);

    await receberImportacao('imp-1', { versao: 4, recebida_em: '2026-11-20', local_id: 'loc-1', cambio_micro: null, itens });
    expect(ultimaChamada().corpo).not.toHaveProperty('cambio_micro');
  });

  it('inclui, altera, remove, fecha o câmbio e reabre a parcela', async () => {
    const parcela = { versao: 1, descricao: 'Sinal 30%', valor_moeda_centesimos: 135000, vencimento_previsto: '2026-10-20' };

    await incluirParcela('imp-1', parcela);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: parcela });
    expect(ultimaChamada().url).toMatch(/\/importacoes\/imp-1\/parcelas$/);

    await atualizarParcela('imp-1', 'par-1', { ...parcela, versao: 2 });
    expect(ultimaChamada()).toMatchObject({ metodo: 'PUT', corpo: { ...parcela, versao: 2 } });
    expect(ultimaChamada().url).toMatch(/\/importacoes\/imp-1\/parcelas\/par-1$/);

    await removerParcela('imp-1', 'par-1', 3);
    expect(ultimaChamada().metodo).toBe('DELETE');
    expect(ultimaChamada().url).toMatch(/\/importacoes\/imp-1\/parcelas\/par-1\?versao=3$/);
    expect(ultimaChamada().corpo).toBeUndefined();

    const cambio = { versao: 4, cambio_micro: 5432100, vencimento: '2026-10-20', categoria_financeira_id: 'cat-1' };
    await fecharCambio('imp-1', 'par-1', cambio);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: cambio });
    expect(ultimaChamada().url).toMatch(/\/importacoes\/imp-1\/parcelas\/par-1\/cambio$/);

    await reabrirParcela('imp-1', 'par-1', 5);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: { versao: 5 } });
    expect(ultimaChamada().url).toMatch(/\/importacoes\/imp-1\/parcelas\/par-1\/reabrir$/);
  });

  it('lança e cancela o custo e pede o custo previsto', async () => {
    const custo = {
      versao: 3,
      tipo: 'despachante',
      descricao: '',
      fornecedor_id: 'for-2',
      valor_centavos: 250000,
      vencimento: '2026-11-10',
      compoe_custo: true,
      categoria_financeira_id: 'cat-1',
    };

    await lancarCusto('imp-1', custo);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: custo });
    expect(ultimaChamada().url).toMatch(/\/importacoes\/imp-1\/custos$/);

    await cancelarCusto('imp-1', 'cus-1', 4);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: { versao: 4 } });
    expect(ultimaChamada().url).toMatch(/\/importacoes\/imp-1\/custos\/cus-1\/cancelar$/);

    const controle = new AbortController();
    await obterCustoPrevisto('imp-1', { cambio_micro: 5500000, sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/importacoes\/imp-1\/custo-previsto\?cambio_micro=5500000$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await obterCustoPrevisto('imp-1');
    expect(ultimaChamada().url).toMatch(/\/importacoes\/imp-1\/custo-previsto$/);
  });

  it('substitui as alocações com a versão', async () => {
    const alocacoes = [{ importacao_item_id: 'item-1', pedido_item_id: 'pi-1', quantidade: 600 }];

    await definirAlocacoes('imp-1', { versao: 2, alocacoes });
    expect(ultimaChamada()).toMatchObject({ metodo: 'PUT', corpo: { versao: 2, alocacoes } });
    expect(ultimaChamada().url).toMatch(/\/importacoes\/imp-1\/alocacoes$/);
  });

  it('consulta os alertas e as importações do pedido com o sinal', async () => {
    const controle = new AbortController();

    await obterAlertasImportacao({ empresa: 'emp-1', folga: 15, sinal: controle.signal });
    expect(ultimaChamada().url).toContain('/api/v1/importacoes/alertas?');
    expect(Object.fromEntries(consulta())).toEqual({ empresa: 'emp-1', folga: '15' });
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await obterAlertasImportacao();
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/importacoes\/alertas$/);

    await listarImportacoesDoPedido('ped-1', { sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/pedidos\/ped-1\/importacoes$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);
  });
});
