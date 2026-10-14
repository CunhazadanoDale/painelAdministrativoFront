import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErroApi, definirToken } from '../lib/api';
import { enviarArquivo } from './arquivos';

function simularXhr(status, responseText) {
  const instancias = [];
  class XhrFalso {
    constructor() {
      this.upload = {};
      this.cabecalhos = {};
      instancias.push(this);
    }

    open(metodo, url) {
      this.metodo = metodo;
      this.url = url;
    }

    setRequestHeader(nome, valor) {
      this.cabecalhos[nome] = valor;
    }

    send(corpo) {
      this.corpo = corpo;
      this.status = status;
      this.responseText = responseText;
      queueMicrotask(() => this.onload());
    }
  }
  vi.stubGlobal('XMLHttpRequest', XhrFalso);
  return instancias;
}

const ARQUIVO = new File(['conteudo'], 'foto.png', { type: 'image/png' });

beforeEach(() => {
  definirToken(null);
});

describe('enviarArquivo', () => {
  it('devolve os dados do arquivo enviado com o token', async () => {
    definirToken('token-abc');
    const instancias = simularXhr(201, JSON.stringify({ dados: { id: 'arq-1' } }));

    await expect(enviarArquivo(ARQUIVO)).resolves.toEqual({ id: 'arq-1' });
    expect(instancias[0].metodo).toBe('POST');
    expect(instancias[0].cabecalhos.Authorization).toBe('Bearer token-abc');
    expect(instancias[0].corpo.get('arquivo')).toBeInstanceOf(File);
  });

  it('sinaliza erro quando a resposta 2xx é o HTML do fallback do SPA', async () => {
    simularXhr(200, '<!doctype html><html></html>');

    const erro = await enviarArquivo(ARQUIVO).catch((e) => e);

    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro.status).toBe(200);
    expect(erro.message).toContain('A API não devolveu JSON');
  });

  it('sinaliza erro quando a resposta 2xx vem vazia ou sem dados', async () => {
    simularXhr(201, '');
    await expect(enviarArquivo(ARQUIVO)).rejects.toBeInstanceOf(ErroApi);

    simularXhr(201, JSON.stringify({ dados: null }));
    await expect(enviarArquivo(ARQUIVO)).rejects.toBeInstanceOf(ErroApi);
  });

  it('usa a mensagem do envelope de erro da API', async () => {
    simularXhr(413, JSON.stringify({ erro: { mensagem: 'erro de validação: arquivo grande demais' } }));

    const erro = await enviarArquivo(ARQUIVO).catch((e) => e);

    expect(erro.status).toBe(413);
    expect(erro.message).toBe('erro de validação: arquivo grande demais');
  });
});
