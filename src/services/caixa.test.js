import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  classificarLancamento,
  conciliarAutomatico,
  conciliarLancamento,
  definirAbertura,
  desfazerConciliacao,
  desfazerImportacao,
  enviarOfx,
  fecharMes,
  importarExtrato,
  listarFechamentosCaixa,
  listarImportacoes,
  listarLancamentosCaixa,
  listarLancamentosExtrato,
  listarMovimentoDiario,
  listarPagamentosSemConta,
  listarPendenciasSistema,
  listarSaldos,
  listarSugestoes,
  listarTransferencias,
  obterAbertura,
  obterConciliacao,
  obterFechamentoCaixa,
  obterPreviaFechamento,
  obterProjecao,
  reabrirFechamentoCaixa,
  transferirLancamento,
} from './caixa';

vi.mock('./arquivos', () => ({ enviarArquivo: vi.fn(async (arquivo) => ({ id: 'arq-1', tipo: arquivo.type })) }));

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

describe('services do caixa', () => {
  it('lê e define o saldo inicial, mandando a versão só quando existe', async () => {
    const controle = new AbortController();
    await obterAbertura('cb-1', { sinal: controle.signal });
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/caixa\/contas\/cb-1\/abertura$/);
    expect(ultimaChamada().sinal).toBe(controle.signal);

    await definirAbertura('cb-1', { data_corte: '2026-09-30', saldo_centavos: -5000, versao: null });
    expect(ultimaChamada()).toMatchObject({ metodo: 'PUT', corpo: { data_corte: '2026-09-30', saldo_centavos: -5000 } });
    expect(ultimaChamada().corpo).not.toHaveProperty('versao');

    await definirAbertura('cb-1', { data_corte: '2026-09-30', saldo_centavos: 100, versao: 2 });
    expect(ultimaChamada().corpo).toEqual({ data_corte: '2026-09-30', saldo_centavos: 100, versao: 2 });
  });

  it('lista os saldos por empresa', async () => {
    await listarSaldos({ empresa: 'emp-1' });
    expect(ultimaChamada().url).toContain('/api/v1/caixa/saldos?');
    expect(consulta()).toEqual({ empresa: 'emp-1' });
  });

  it('envia o OFX com tipo quando o navegador não informa e importa simulando ou não', async () => {
    expect(await enviarOfx(new File(['OFXHEADER'], 'extrato.ofx', { type: '' }))).toEqual({ id: 'arq-1', tipo: 'application/x-ofx' });

    await importarExtrato({ arquivo_id: 'arq-1', simular: true });
    expect(ultimaChamada()).toMatchObject({
      url: expect.stringMatching(/\/api\/v1\/extratos\/importacao$/),
      metodo: 'POST',
      corpo: { arquivo_id: 'arq-1', conta_bancaria_id: null, simular: true },
    });
  });

  it('lista e desfaz importações', async () => {
    await listarImportacoes({ conta: 'cb-1' });
    expect(ultimaChamada().url).toContain('/api/v1/extratos/importacoes?');
    expect(consulta()).toMatchObject({ conta: 'cb-1' });

    fetchMock.mockResolvedValueOnce({ ok: true, status: 204, text: async () => '' });
    await desfazerImportacao('imp-1');
    expect(ultimaChamada()).toMatchObject({ url: expect.stringMatching(/\/extratos\/importacoes\/imp-1$/), metodo: 'DELETE' });
  });

  it('lista os lançamentos do extrato e as sugestões', async () => {
    await listarLancamentosExtrato({ conta: 'cb-1', de: '2026-10-01', ate: '2026-10-31', situacao: 'pendente' });
    expect(ultimaChamada().url).toContain('/api/v1/extratos/lancamentos?');
    expect(consulta()).toEqual({ pagina: '1', tamanho: '20', conta: 'cb-1', de: '2026-10-01', ate: '2026-10-31', situacao: 'pendente' });

    await listarSugestoes('lan-1');
    expect(ultimaChamada().url).toMatch(/\/extratos\/lancamentos\/lan-1\/sugestoes$/);
  });

  it('concilia com os movimentos só por tipo e id', async () => {
    await conciliarLancamento('lan-1', [
      { tipo: 'pagamento', id: 'pag-1', valor_centavos: -100 },
      { tipo: 'pagamento', id: 'pag-2' },
    ]);
    expect(ultimaChamada()).toMatchObject({
      url: expect.stringMatching(/\/extratos\/lancamentos\/lan-1\/conciliacao$/),
      metodo: 'POST',
      corpo: { movimentos: [{ tipo: 'pagamento', id: 'pag-1' }, { tipo: 'pagamento', id: 'pag-2' }] },
    });
  });

  it('classifica e transfere com a descrição opcional', async () => {
    await classificarLancamento('lan-1', { categoria_financeira_id: 'cat-1' });
    expect(ultimaChamada().corpo).toEqual({ categoria_financeira_id: 'cat-1' });
    await classificarLancamento('lan-1', { categoria_financeira_id: 'cat-1', descricao: 'Tarifa' });
    expect(ultimaChamada().corpo).toEqual({ categoria_financeira_id: 'cat-1', descricao: 'Tarifa' });

    await transferirLancamento('lan-2', { conta_contraparte_id: 'cb-2', categoria_financeira_id: 'cat-t' });
    expect(ultimaChamada()).toMatchObject({
      url: expect.stringMatching(/\/extratos\/lancamentos\/lan-2\/transferencia$/),
      corpo: { conta_contraparte_id: 'cb-2', categoria_financeira_id: 'cat-t' },
    });
  });

  it('concilia automático, obtém e desfaz a conciliação', async () => {
    await conciliarAutomatico({ conta_bancaria_id: 'cb-1', de: '2026-10-01', ate: '2026-10-31' });
    expect(ultimaChamada().corpo).toEqual({ conta_bancaria_id: 'cb-1', de: '2026-10-01', ate: '2026-10-31' });

    await obterConciliacao('con-1');
    expect(ultimaChamada().url).toMatch(/\/api\/v1\/conciliacoes\/con-1$/);

    await desfazerConciliacao('con-1', 'par errado');
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: { motivo: 'par errado' } });
  });

  it('lista pendências, pagamentos sem conta, lançamentos de caixa e transferências', async () => {
    await listarPendenciasSistema({ conta: 'cb-1', de: '2026-10-01' });
    expect(ultimaChamada().url).toContain('/api/v1/caixa/pendencias-sistema?');
    await listarPagamentosSemConta({ empresa: 'emp-1' });
    expect(ultimaChamada().url).toContain('/api/v1/caixa/pagamentos-sem-conta?');
    await listarLancamentosCaixa({ conta: 'cb-1' });
    expect(ultimaChamada().url).toContain('/api/v1/caixa/lancamentos?');
    await listarTransferencias({ empresa: 'emp-1' });
    expect(ultimaChamada().url).toContain('/api/v1/caixa/transferencias?');
    expect(consulta()).toMatchObject({ empresa: 'emp-1' });
  });

  it('prévia, fecha com saldo do banco opcional, lista, obtém e reabre o fechamento', async () => {
    await obterPreviaFechamento({ conta: 'cb-1', competencia: '2026-09' });
    expect(ultimaChamada().url).toContain('/api/v1/caixa/fechamentos/previa?');
    expect(consulta()).toEqual({ conta: 'cb-1', competencia: '2026-09' });

    await fecharMes({ conta_bancaria_id: 'cb-1', competencia: '2026-09' });
    expect(ultimaChamada().corpo).toEqual({ conta_bancaria_id: 'cb-1', competencia: '2026-09' });
    await fecharMes({ conta_bancaria_id: 'cb-1', competencia: '2026-09', saldo_banco_centavos: 108710 });
    expect(ultimaChamada().corpo).toEqual({ conta_bancaria_id: 'cb-1', competencia: '2026-09', saldo_banco_centavos: 108710 });

    await listarFechamentosCaixa({ conta: 'cb-1' });
    expect(ultimaChamada().url).toContain('/api/v1/caixa/fechamentos?');
    await obterFechamentoCaixa('fec-1');
    expect(ultimaChamada().url).toMatch(/\/caixa\/fechamentos\/fec-1$/);
    await reabrirFechamentoCaixa('fec-1', 'extrato corrigido');
    expect(ultimaChamada()).toMatchObject({ url: expect.stringMatching(/\/fec-1\/reabrir$/), corpo: { motivo: 'extrato corrigido' } });
  });

  it('lê a projeção e o movimento diário', async () => {
    await obterProjecao({ empresa: 'emp-1', ate: '2026-11-18' });
    expect(ultimaChamada().url).toContain('/api/v1/caixa/projecao?');
    expect(consulta()).toEqual({ empresa: 'emp-1', ate: '2026-11-18' });

    await listarMovimentoDiario({ conta: 'cb-1', de: '2026-10-01', ate: '2026-10-19' });
    expect(ultimaChamada().url).toContain('/api/v1/caixa/movimento-diario?');
    expect(consulta()).toEqual({ conta: 'cb-1', de: '2026-10-01', ate: '2026-10-19' });
  });
});
