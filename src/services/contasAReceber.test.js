import { beforeEach, describe, expect, it, vi } from 'vitest';

import { criarAntecipacao, estornarAntecipacao, listarAntecipacoes, obterAntecipacao } from './antecipacoes';
import { gerarTituloEntrada } from './pedidos';
import {
  atualizarTitulo,
  cancelarTitulo,
  criarTitulo,
  enviarAoBanco,
  estornarRecebimento,
  listarBoletosPendentes,
  listarHistoricoTitulo,
  listarRecebimentos,
  listarTitulos,
  listarTitulosAntecipaveis,
  obterResumoContasAReceber,
  obterTitulo,
  prorrogarTitulo,
  recomprarTitulo,
  registrarBoletoEnviado,
  registrarRecebimento,
  retirarDoBanco,
} from './titulosReceber';

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

const MANUAL = {
  empresa_id: 'emp-1',
  cliente_id: 'cli-1',
  numero: 'ALG-10',
  parcela: 1,
  vencimento: '2026-11-10',
  valor_centavos: 150000,
  categoria_financeira_id: 'cat-1',
  competencia: '2026-11',
  conta_bancaria_id: 'cb-1',
  observacao: 'aluguel do galpão',
};

describe('services de títulos a receber', () => {
  it('lista com todos os filtros e o sinal, omitindo os vazios', async () => {
    const controle = new AbortController();

    await listarTitulos({
      pagina: 2,
      tamanho: 21,
      empresa: 'emp-1',
      cliente: 'cli-1',
      status: 'em_banco',
      origem: 'manual',
      conta: 'cb-1',
      vencimento_de: '2026-10-01',
      vencimento_ate: '2026-10-31',
      vencidos: true,
      origemCancelada: true,
      sinal: controle.signal,
    });

    expect(ultimaChamada().url).toContain('/api/v1/titulos-receber?');
    expect(Object.fromEntries(consulta())).toEqual({
      pagina: '2',
      tamanho: '21',
      empresa: 'emp-1',
      cliente: 'cli-1',
      status: 'em_banco',
      origem: 'manual',
      conta: 'cb-1',
      vencimento_de: '2026-10-01',
      vencimento_ate: '2026-10-31',
      vencidos: 'true',
      origem_cancelada: 'true',
    });
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await listarTitulos();
    expect([...consulta().keys()]).toEqual(['pagina', 'tamanho']);
  });

  it('obtém o título e o histórico com o sinal', async () => {
    const controle = new AbortController();

    await obterTitulo('tit-1', { sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/titulos-receber\/tit-1$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await listarHistoricoTitulo('tit-1', { sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/titulos-receber\/tit-1\/historico$/);
  });

  it('cria o manual com tudo e edita sem empresa, cliente nem conta', async () => {
    await criarTitulo(MANUAL);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: MANUAL });

    await atualizarTitulo('tit-1', { ...MANUAL, versao: 2 });
    expect(ultimaChamada().metodo).toBe('PUT');
    expect(ultimaChamada().corpo).toEqual({
      numero: 'ALG-10',
      parcela: 1,
      vencimento: '2026-11-10',
      valor_centavos: 150000,
      categoria_financeira_id: 'cat-1',
      competencia: '2026-11',
      observacao: 'aluguel do galpão',
      versao: 2,
    });
  });

  it('prorroga, envia e retira do banco, registra o boleto e cancela com a versão', async () => {
    await prorrogarTitulo('tit-1', { vencimento: '2026-11-20', motivo: 'pediu prazo', versao: 2 });
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: { vencimento: '2026-11-20', motivo: 'pediu prazo', versao: 2 } });
    expect(ultimaChamada().url).toMatch(/\/titulos-receber\/tit-1\/prorrogar$/);

    await enviarAoBanco('tit-1', { conta_bancaria_id: 'cb-1', versao: 3 });
    expect(ultimaChamada()).toMatchObject({ corpo: { conta_bancaria_id: 'cb-1', versao: 3 } });
    expect(ultimaChamada().url).toMatch(/\/titulos-receber\/tit-1\/enviar-banco$/);

    await retirarDoBanco('tit-1', 4);
    expect(ultimaChamada()).toMatchObject({ corpo: { versao: 4 } });
    expect(ultimaChamada().url).toMatch(/\/titulos-receber\/tit-1\/retirar-banco$/);

    await registrarBoletoEnviado('tit-1', { canal: 'email', enviado_em: '2026-10-15T12:30:00.000Z', versao: 5 });
    expect(ultimaChamada()).toMatchObject({ corpo: { canal: 'email', enviado_em: '2026-10-15T12:30:00.000Z', versao: 5 } });
    expect(ultimaChamada().url).toMatch(/\/titulos-receber\/tit-1\/boleto-enviado$/);

    await cancelarTitulo('tit-1', { motivo: 'lançado errado', versao: 6 });
    expect(ultimaChamada()).toMatchObject({ corpo: { motivo: 'lançado errado', versao: 6 } });
    expect(ultimaChamada().url).toMatch(/\/titulos-receber\/tit-1\/cancelar$/);
  });

  it('registra, lista e estorna recebimentos e recompra o título', async () => {
    const controle = new AbortController();
    const recebimento = { versao: 1, tipo: 'conta', conta_bancaria_id: 'cb-1', recebido_em: '2026-10-15', valor_centavos: 95000 };

    await registrarRecebimento('tit-1', recebimento);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: recebimento });
    expect(ultimaChamada().url).toMatch(/\/titulos-receber\/tit-1\/recebimentos$/);

    await listarRecebimentos('tit-1', { sinal: controle.signal });
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await estornarRecebimento('tit-1', 'rec-1', { motivo: 'cheque devolvido', estornado_em: '2026-10-16', versao: 2 });
    expect(ultimaChamada()).toMatchObject({ corpo: { motivo: 'cheque devolvido', estornado_em: '2026-10-16', versao: 2 } });
    expect(ultimaChamada().url).toMatch(/\/titulos-receber\/tit-1\/recebimentos\/rec-1\/estorno$/);

    const recompra = { versao: 2, recomprado_em: '2026-10-15', encargos_centavos: 4500, vencimento: '2026-10-20', categoria_financeira_id: 'cat-2', motivo: 'não pagou' };
    await recomprarTitulo('tit-1', recompra);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: recompra });
    expect(ultimaChamada().url).toMatch(/\/titulos-receber\/tit-1\/recompra$/);
  });

  it('lista os boletos pendentes e obtém o resumo', async () => {
    await listarBoletosPendentes({ pagina: 1, tamanho: 21, dias: 10, empresa: 'emp-1' });
    expect(ultimaChamada().url).toContain('/api/v1/titulos-receber/boletos-pendentes?');
    expect(consulta().get('dias')).toBe('10');

    await obterResumoContasAReceber({ de: '2026-10-12', ate: '2026-12-06', empresa: 'emp-1' });
    expect(ultimaChamada().url).toContain('/api/v1/contas-a-receber/resumo?');
    expect(consulta().get('de')).toBe('2026-10-12');

    await obterResumoContasAReceber();
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/contas-a-receber\/resumo$/);
  });

  it('gera o título de entrada do pedido', async () => {
    await gerarTituloEntrada('ped-1', { vencimento: '2026-10-25', conta_bancaria_id: null });

    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: { vencimento: '2026-10-25', conta_bancaria_id: null } });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/pedidos\/ped-1\/titulo-entrada$/);
  });
});

describe('services de antecipações', () => {
  it('cria, lista com filtros, obtém e estorna', async () => {
    const controle = new AbortController();
    const bordero = {
      empresa_id: 'emp-1',
      fornecedor_id: 'for-1',
      numero: 'B-77',
      operado_em: '2026-10-15',
      taxa_bp: 300,
      valor_liquido_centavos: 294000,
      conta_bancaria_id: 'cb-1',
      titulo_ids: ['tit-1', 'tit-2'],
    };

    await criarAntecipacao(bordero);
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: bordero });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/antecipacoes$/);

    await listarAntecipacoes({ pagina: 1, tamanho: 21, empresa: 'emp-1', fornecedor: 'for-1', status: 'ativa', de: '2026-10-01', ate: '2026-10-31', sinal: controle.signal });
    expect(ultimaChamada().url).toContain('/api/v1/antecipacoes?');
    expect(consulta().get('fornecedor')).toBe('for-1');
    expect(consulta().get('status')).toBe('ativa');
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await obterAntecipacao('ant-1', { sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/antecipacoes\/ant-1$/);

    await estornarAntecipacao('ant-1', { motivo: 'lançado errado', versao: 2 });
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: { motivo: 'lançado errado', versao: 2 } });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/antecipacoes\/ant-1\/estorno$/);
  });
});

describe('listarTitulosAntecipaveis', () => {
  it('junta carteira e em banco da empresa, sem origem cancelada nem saldo zerado, por vencimento', async () => {
    fetchMock.mockImplementation(async (url) => {
      const status = new URL(String(url), 'http://local').searchParams.get('status');
      const dados =
        status === 'carteira'
          ? [
              { id: 't-2', vencimento: '2026-11-20', saldo_centavos: 100, origem_cancelada_em: null },
              { id: 't-x', vencimento: '2026-11-01', saldo_centavos: 100, origem_cancelada_em: '2026-10-01T00:00:00Z' },
            ]
          : [
              { id: 't-1', vencimento: '2026-11-10', saldo_centavos: 100, origem_cancelada_em: null },
              { id: 't-0', vencimento: '2026-11-05', saldo_centavos: 0, origem_cancelada_em: null },
            ];
      return { ok: true, status: 200, text: async () => JSON.stringify({ dados }) };
    });

    const titulos = await listarTitulosAntecipaveis({ empresa: 'emp-1' });

    expect(titulos.map((titulo) => titulo.id)).toEqual(['t-1', 't-2']);
    const urls = fetchMock.mock.calls.map(([url]) => new URL(String(url), 'http://local').searchParams);
    expect(urls.map((consulta) => consulta.get('status')).sort()).toEqual(['carteira', 'em_banco']);
    expect(urls.every((consulta) => consulta.get('empresa') === 'emp-1')).toBe(true);
  });
});
