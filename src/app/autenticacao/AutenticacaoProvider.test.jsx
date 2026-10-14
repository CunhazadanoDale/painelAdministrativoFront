import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { obterToken } from '../../lib/api';
import * as autenticacaoService from '../../services/autenticacao';
import * as sessaoService from '../../services/sessao';
import * as solicitacoesService from '../../services/solicitacoes';
import { AutenticacaoProvider } from './AutenticacaoProvider';
import { useAutenticacao } from './useAutenticacao';

vi.mock('../../services/autenticacao', () => ({
  autenticar: vi.fn(),
}));

vi.mock('../../services/solicitacoes', () => ({
  listarSolicitacoes: vi.fn(),
}));

vi.mock('../../services/sessao', () => ({
  encerrarSessao: vi.fn(),
}));

const { autenticar } = autenticacaoService;
const { listarSolicitacoes } = solicitacoesService;
const { encerrarSessao } = sessaoService;

const CHAVE_SESSAO = 'mia.sessao';
const EXPIRA_FUTURA = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const SEM_PERMISSAO = { aprovacao: false, financeiro: false };

function gravarSessao(opcoes = {}) {
  localStorage.setItem(
    CHAVE_SESSAO,
    JSON.stringify({
      token: 'token-valido',
      expira_em: EXPIRA_FUTURA,
      administrador: false,
      usuario: { usuario_id: 1, nome: 'Ana' },
      ...opcoes,
    })
  );
}

function renderAutenticacao() {
  return renderHook(() => useAutenticacao(), {
    wrapper: ({ children }) => <AutenticacaoProvider>{children}</AutenticacaoProvider>,
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  listarSolicitacoes.mockResolvedValue({ dados: [] });
  encerrarSessao.mockResolvedValue(null);
});

describe('AutenticacaoProvider', () => {
  it('começa desautenticado sem sessão gravada', () => {
    const { result } = renderAutenticacao();

    expect(result.current.autenticado).toBe(false);
    expect(result.current.usuario).toBeNull();
    expect(result.current.administrador).toBe(false);
    expect(result.current.permissoes).toEqual(SEM_PERMISSAO);
    expect(listarSolicitacoes).not.toHaveBeenCalled();
  });

  it('descarta sessão já expirada', () => {
    gravarSessao({ expira_em: new Date(Date.now() - 1000).toISOString() });

    const { result } = renderAutenticacao();

    expect(result.current.autenticado).toBe(false);
    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();
  });

  it('restaura sessão válida e sonda só o escopo de aprovação', async () => {
    gravarSessao({ administrador: true });

    const { result } = renderAutenticacao();

    expect(result.current.autenticado).toBe(true);
    expect(result.current.administrador).toBe(true);
    expect(result.current.usuario.nome).toBe('Ana');
    expect(obterToken()).toBe('token-valido');
    await waitFor(() =>
      expect(result.current.permissoes).toEqual({ aprovacao: true, financeiro: true })
    );
    expect(listarSolicitacoes).toHaveBeenCalledTimes(1);
    expect(listarSolicitacoes).toHaveBeenCalledWith(
      expect.objectContaining({ escopo: 'aprovacao' })
    );
  });

  it('marca a aprovação como falsa quando a API responde 403', async () => {
    listarSolicitacoes.mockRejectedValue({ status: 403 });
    gravarSessao({ financeiro: true });

    const { result } = renderAutenticacao();

    await waitFor(() => expect(listarSolicitacoes).toHaveBeenCalledTimes(1));
    expect(result.current.permissoes).toEqual({ aprovacao: false, financeiro: true });
  });

  it('nega a aprovação em erro de rede ou do servidor', async () => {
    listarSolicitacoes.mockRejectedValue({ status: 0 });
    gravarSessao();
    const rede = renderAutenticacao();
    await waitFor(() => expect(listarSolicitacoes).toHaveBeenCalledTimes(1));
    expect(rede.result.current.permissoes).toEqual(SEM_PERMISSAO);
    rede.unmount();

    localStorage.clear();
    listarSolicitacoes.mockRejectedValue({ status: 500 });
    gravarSessao();
    const servidor = renderAutenticacao();
    await waitFor(() => expect(listarSolicitacoes).toHaveBeenCalledTimes(2));
    expect(servidor.result.current.permissoes).toEqual(SEM_PERMISSAO);
  });

  it('lê o perfil financeiro da sessão e o herda do administrador', async () => {
    gravarSessao({ financeiro: true });
    const financeiro = renderAutenticacao();
    expect(financeiro.result.current.financeiro).toBe(true);
    await waitFor(() =>
      expect(financeiro.result.current.permissoes).toEqual({ aprovacao: true, financeiro: true })
    );
    financeiro.unmount();

    localStorage.clear();
    gravarSessao({ administrador: true });
    const administrador = renderAutenticacao();
    expect(administrador.result.current.financeiro).toBe(true);
    administrador.unmount();

    localStorage.clear();
    gravarSessao();
    const comum = renderAutenticacao();
    expect(comum.result.current.financeiro).toBe(false);
    await waitFor(() =>
      expect(comum.result.current.permissoes).toEqual({ aprovacao: true, financeiro: false })
    );
  });

  it('entrar grava o perfil financeiro da resposta do login', async () => {
    autenticar.mockResolvedValue({
      dados: {
        token: 'token-novo',
        expira_em: EXPIRA_FUTURA,
        administrador: false,
        comercial: false,
        financeiro: true,
        usuario: { id: 'u2', nome: 'Carla' },
      },
    });
    const { result } = renderAutenticacao();

    await act(async () => {
      await result.current.entrar('carla@exemplo.com', 'segredo');
    });

    expect(result.current.financeiro).toBe(true);
    expect(JSON.parse(localStorage.getItem(CHAVE_SESSAO)).financeiro).toBe(true);
    await waitFor(() => expect(result.current.permissoes.financeiro).toBe(true));
  });

  it('entrar grava a sessão e o token', async () => {
    autenticar.mockResolvedValue({
      dados: {
        token: 'token-novo',
        expira_em: EXPIRA_FUTURA,
        administrador: false,
        usuario: { usuario_id: 7, nome: 'Bruno' },
      },
    });
    const { result } = renderAutenticacao();

    await act(async () => {
      await result.current.entrar('bruno@exemplo.com', 'segredo');
    });

    expect(autenticar).toHaveBeenCalledWith('bruno@exemplo.com', 'segredo');
    expect(result.current.autenticado).toBe(true);
    expect(result.current.usuario.nome).toBe('Bruno');
    expect(obterToken()).toBe('token-novo');
    expect(JSON.parse(localStorage.getItem(CHAVE_SESSAO)).token).toBe('token-novo');
  });

  it('entrar rejeita resposta de autenticação inválida', async () => {
    autenticar.mockResolvedValue({ dados: {} });
    const { result } = renderAutenticacao();

    await expect(result.current.entrar('ana@exemplo.com', 'errada')).rejects.toThrow(
      'Resposta de autenticação inválida.'
    );
    expect(result.current.autenticado).toBe(false);
    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();
  });

  it('encerrar limpa sessão, token e permissões', async () => {
    gravarSessao({ administrador: true });
    const { result } = renderAutenticacao();
    await waitFor(() => expect(listarSolicitacoes).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.encerrar();
    });

    expect(result.current.autenticado).toBe(false);
    expect(result.current.permissoes).toEqual(SEM_PERMISSAO);
    expect(obterToken()).toBeNull();
    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();
  });

  it('expõe o perfil comercial da sessão e o herda do administrador', () => {
    gravarSessao({ comercial: true });
    const { result, unmount } = renderAutenticacao();

    expect(result.current.comercial).toBe(true);
    expect(result.current.administrador).toBe(false);
    unmount();

    localStorage.clear();
    gravarSessao({ administrador: true });
    const administrador = renderAutenticacao();
    expect(administrador.result.current.comercial).toBe(true);

    localStorage.clear();
    gravarSessao();
    const comum = renderAutenticacao();
    expect(comum.result.current.comercial).toBe(false);
  });

  it('sair encerra a sessão no servidor e limpa a local', async () => {
    gravarSessao();
    const { result } = renderAutenticacao();

    await act(async () => {
      await result.current.sair();
    });

    expect(encerrarSessao).toHaveBeenCalledTimes(1);
    expect(result.current.autenticado).toBe(false);
    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();
  });

  it('sair limpa a sessão local mesmo com falha no servidor', async () => {
    gravarSessao();
    encerrarSessao.mockRejectedValue(new Error('offline'));
    const { result } = renderAutenticacao();

    await act(async () => {
      await result.current.sair();
    });

    expect(result.current.autenticado).toBe(false);
    expect(obterToken()).toBeNull();
  });

  it('encerrarComAviso guarda o aviso até o próximo login', async () => {
    gravarSessao();
    autenticar.mockResolvedValue({
      dados: {
        token: 'token-novo',
        expira_em: EXPIRA_FUTURA,
        administrador: false,
        usuario: { id: 'u1', nome: 'Ana' },
      },
    });
    const { result } = renderAutenticacao();

    act(() => {
      result.current.encerrarComAviso('Senha alterada.');
    });

    expect(result.current.autenticado).toBe(false);
    expect(result.current.aviso).toBe('Senha alterada.');

    await act(async () => {
      await result.current.entrar('ana@exemplo.com', 'senhaNova123');
    });

    expect(result.current.aviso).toBeNull();
  });
});
