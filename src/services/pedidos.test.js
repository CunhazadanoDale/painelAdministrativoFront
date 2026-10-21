import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  atualizarPedido,
  cancelarEntrega,
  cancelarPedido,
  confirmarPedido,
  criarEntrega,
  criarPedido,
  listarCancelamentos,
  listarEntregas,
  listarEntregasDoPedido,
  listarHistoricoPedido,
  listarPedidos,
  listarPendencias,
  listarTodasPendencias,
  listarPrazos,
  marcarEntregue,
  marcarSaida,
  obterEntrega,
  obterPedido,
  registrarEntrada,
  reservarPendencias,
} from './pedidos';

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

const PROPOSTA = {
  empresa_id: 'emp-1',
  cliente_id: 'cli-1',
  obra_id: null,
  representante_id: null,
  modelo: 'pronta_entrega',
  prazo_limite: '2026-12-20',
  numero_pedido_cliente: 'OC-778',
  observacoes: '',
  itens: [{ produto_id: 'prod-1', quantidade: 10, preco_unitario_centavos: 1500 }],
};

describe('services de pedidos', () => {
  it('lista com todos os filtros e o sinal, omitindo os vazios', async () => {
    const controle = new AbortController();

    await listarPedidos({
      pagina: 2,
      tamanho: 21,
      empresa: 'emp-1',
      cliente: 'cli-1',
      representante: 'rep-1',
      status: 'confirmado',
      modelo: 'importacao',
      numero: 42,
      sinal: controle.signal,
    });

    expect(ultimaChamada().url).toContain('/api/v1/pedidos?');
    expect(Object.fromEntries(consulta())).toEqual({
      pagina: '2',
      tamanho: '21',
      empresa: 'emp-1',
      cliente: 'cli-1',
      representante: 'rep-1',
      status: 'confirmado',
      modelo: 'importacao',
      numero: '42',
    });
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await listarPedidos();
    expect([...consulta().keys()]).toEqual(['pagina', 'tamanho']);
  });

  it('obtém o pedido e o histórico com o sinal', async () => {
    const controle = new AbortController();

    await obterPedido('ped-1', { sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/pedidos\/ped-1$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await listarHistoricoPedido('ped-1', { sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/pedidos\/ped-1\/historico$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);
  });

  it('cria a proposta com a empresa e altera sem ela, com a versão', async () => {
    await criarPedido(PROPOSTA);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: PROPOSTA });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/pedidos$/);

    await atualizarPedido('ped-1', { ...PROPOSTA, versao: 3 });
    expect(ultimaChamada().metodo).toBe('PUT');
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/pedidos\/ped-1$/);
    expect(ultimaChamada().corpo).not.toHaveProperty('empresa_id');
    expect(ultimaChamada().corpo).toMatchObject({ cliente_id: 'cli-1', versao: 3 });
  });

  it('confirma, reserva pendências, registra a entrada e cancela com a versão', async () => {
    await confirmarPedido('ped-1', 3);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: { versao: 3 } });
    expect(ultimaChamada().url).toMatch(/\/pedidos\/ped-1\/confirmar$/);

    await reservarPendencias('ped-1', 4);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: { versao: 4 } });
    expect(ultimaChamada().url).toMatch(/\/pedidos\/ped-1\/reservar-pendencias$/);

    await registrarEntrada('ped-1', { versao: 5, pago_em: '2026-10-15', valor_centavos: 30000 });
    expect(ultimaChamada()).toMatchObject({
      metodo: 'POST',
      corpo: { versao: 5, pago_em: '2026-10-15', valor_centavos: 30000 },
    });
    expect(ultimaChamada().url).toMatch(/\/pedidos\/ped-1\/entrada$/);

    await cancelarPedido('ped-1', { versao: 6, motivo: 'desistiu', valor_a_devolver_centavos: 0 });
    expect(ultimaChamada()).toMatchObject({
      metodo: 'POST',
      corpo: { versao: 6, motivo: 'desistiu', valor_a_devolver_centavos: 0 },
    });
    expect(ultimaChamada().url).toMatch(/\/pedidos\/ped-1\/cancelar$/);
  });
});

describe('services de entregas', () => {
  const ENTREGA = {
    transportadora: 'Rodonaves',
    frete_tipo: 'cif',
    frete_centavos: 18000,
    previsao: '2026-10-20',
    itens: [{ pedido_item_id: 'item-1', local_id: 'loc-1', quantidade: 5 }],
  };

  it('cria e lista as entregas do pedido', async () => {
    const controle = new AbortController();

    await criarEntrega('ped-1', ENTREGA);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: ENTREGA });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/pedidos\/ped-1\/entregas$/);

    await listarEntregasDoPedido('ped-1', { sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/pedidos\/ped-1\/entregas$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);
  });

  it('lista as entregas com filtros e obtém uma entrega', async () => {
    const controle = new AbortController();

    await listarEntregas({ pagina: 1, tamanho: 21, empresa: 'emp-1', status: 'pendente', previsao_ate: '2026-10-31', sinal: controle.signal });
    expect(ultimaChamada().url).toContain('/api/v1/entregas?');
    expect(consulta().get('status')).toBe('pendente');
    expect(consulta().get('previsao_ate')).toBe('2026-10-31');
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await obterEntrega('ent-1', { sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/entregas\/ent-1$/);
  });

  it('dá saída, conclui e cancela com a versão e a data', async () => {
    await marcarSaida('ent-1', { versao: 2, saiu_em: '2026-10-16' });
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: { versao: 2, saiu_em: '2026-10-16' } });
    expect(ultimaChamada().url).toMatch(/\/entregas\/ent-1\/saiu$/);

    await marcarEntregue('ent-1', { versao: 3, entregue_em: '2026-10-17' });
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: { versao: 3, entregue_em: '2026-10-17' } });
    expect(ultimaChamada().url).toMatch(/\/entregas\/ent-1\/entregue$/);

    await cancelarEntrega('ent-1', 4);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: { versao: 4 } });
    expect(ultimaChamada().url).toMatch(/\/entregas\/ent-1\/cancelar$/);
  });
});

describe('consultas de pedidos', () => {
  it('lista pendências, prazos e cancelamentos com os filtros', async () => {
    await listarPendencias({ pagina: 1, tamanho: 21, empresa: 'emp-1', cliente: 'cli-1', produto: 'prod-1' });
    expect(ultimaChamada().url).toContain('/api/v1/pedidos/pendencias?');
    expect(consulta().get('produto')).toBe('prod-1');

    await listarPrazos({ situacao: 'vencido', dias: 15, empresa: 'emp-1' });
    expect(ultimaChamada().url).toContain('/api/v1/pedidos/prazos?');
    expect(consulta().get('situacao')).toBe('vencido');
    expect(consulta().get('dias')).toBe('15');

    await listarCancelamentos({ comDevolucao: true, de: '2026-10-01', ate: '2026-10-31' });
    expect(ultimaChamada().url).toContain('/api/v1/pedidos/cancelamentos?');
    expect(consulta().get('com_devolucao')).toBe('true');
    expect(consulta().get('de')).toBe('2026-10-01');

    await listarCancelamentos();
    expect(consulta().has('com_devolucao')).toBe(false);
  });
});

describe('pendências completas', () => {
  it('percorre as páginas de pendências da empresa com o sinal', async () => {
    const controle = new AbortController();
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify({ dados: [] }) });

    await listarTodasPendencias({ empresa: 'emp-1', sinal: controle.signal });

    expect(ultimaChamada().url).toContain('/api/v1/pedidos/pendencias?');
    expect(Object.fromEntries(consulta())).toEqual({ empresa: 'emp-1', pagina: '1', tamanho: '100' });
    expect(ultimaChamada().sinal).toBe(controle.signal);
  });
});
