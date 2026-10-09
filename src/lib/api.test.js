import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi, aoFalharSessao, definirToken, montarConsulta, obterToken, requisitar } from './api';

function resposta(status, corpo) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (corpo === undefined ? '' : JSON.stringify(corpo)),
  };
}

let fetchMock;

beforeEach(() => {
  definirToken(null);
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  definirToken(null);
});

describe('requisitar', () => {
  it('envia Authorization quando há token', async () => {
    definirToken('token-abc');
    fetchMock.mockResolvedValue(resposta(200, { dados: { ok: true } }));

    const resultado = await requisitar('/api/v1/teste');

    expect(resultado).toEqual({ dados: { ok: true } });
    expect(obterToken()).toBe('token-abc');
    const [url, opcoes] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/teste');
    expect(opcoes.headers.Authorization).toBe('Bearer token-abc');
  });

  it('não envia Authorization sem token', async () => {
    fetchMock.mockResolvedValue(resposta(200, { dados: null }));

    await requisitar('/api/v1/teste');

    const [, opcoes] = fetchMock.mock.calls[0];
    expect(opcoes.headers.Authorization).toBeUndefined();
  });

  it('envia corpo JSON com Content-Type', async () => {
    fetchMock.mockResolvedValue(resposta(200, { dados: null }));

    await requisitar('/api/v1/teste', { metodo: 'POST', corpo: { nome: 'abc' } });

    const [, opcoes] = fetchMock.mock.calls[0];
    expect(opcoes.headers['Content-Type']).toBe('application/json');
    expect(opcoes.body).toBe(JSON.stringify({ nome: 'abc' }));
  });

  it('não define Content-Type para FormData', async () => {
    fetchMock.mockResolvedValue(resposta(200, { dados: null }));
    const formulario = new FormData();
    formulario.append('arquivo', 'conteudo');

    await requisitar('/api/v1/teste', { metodo: 'POST', corpo: formulario });

    const [, opcoes] = fetchMock.mock.calls[0];
    expect(opcoes.headers['Content-Type']).toBeUndefined();
    expect(opcoes.body).toBe(formulario);
  });

  it('devolve null em resposta 204', async () => {
    fetchMock.mockResolvedValue(resposta(204));

    await expect(requisitar('/api/v1/teste', { metodo: 'DELETE' })).resolves.toBeNull();
  });

  it('transforma o envelope de erro em ErroApi', async () => {
    fetchMock.mockResolvedValue(
      resposta(400, { erro: { codigo: 'validacao', mensagem: 'erro de validação: nome' } })
    );

    const erro = await requisitar('/api/v1/teste').catch((e) => e);

    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro.name).toBe('ErroApi');
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('erro de validação: nome');
  });

  it('usa mensagem padrão quando a resposta não traz erro', async () => {
    fetchMock.mockResolvedValue(resposta(500));

    const erro = await requisitar('/api/v1/teste').catch((e) => e);

    expect(erro.status).toBe(500);
    expect(erro.message).toBe('Falha na requisição (status 500)');
  });

  it('notifica os ouvintes de sessão em 401 e permite remover o ouvinte', async () => {
    const ouvinte = vi.fn();
    const remover = aoFalharSessao(ouvinte);
    fetchMock.mockResolvedValue(
      resposta(401, { erro: { codigo: 'nao_autenticado', mensagem: 'token inválido' } })
    );

    await expect(requisitar('/api/v1/teste')).rejects.toMatchObject({ status: 401 });
    expect(ouvinte).toHaveBeenCalledTimes(1);

    remover();

    await expect(requisitar('/api/v1/teste')).rejects.toMatchObject({ status: 401 });
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it('traduz falha de rede em erro de conexão', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const erro = await requisitar('/api/v1/teste').catch((e) => e);

    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro.status).toBe(0);
    expect(erro.message).toContain('Não foi possível conectar ao servidor');
  });

  it('propaga AbortError sem virar ErroApi', async () => {
    const aborto = Object.assign(new Error('abortado'), { name: 'AbortError' });
    fetchMock.mockRejectedValue(aborto);

    await expect(requisitar('/api/v1/teste', { sinal: new AbortController().signal })).rejects.toBe(
      aborto
    );
  });

  it('devolve null quando a resposta não é JSON', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '<html></html>' });

    await expect(requisitar('/api/v1/teste')).resolves.toBeNull();
  });
});

describe('montarConsulta', () => {
  it('devolve vazio sem parâmetros', () => {
    expect(montarConsulta()).toBe('');
    expect(montarConsulta({})).toBe('');
  });

  it('ignora valores nulos, indefinidos e strings vazias', () => {
    expect(montarConsulta({ pagina: 2, escopo: '', status: undefined, q: '   ' })).toBe('?pagina=2');
  });

  it('mantém zeros e valores preenchidos', () => {
    expect(montarConsulta({ pagina: 0, status: 'pago' })).toBe('?pagina=0&status=pago');
  });
});
