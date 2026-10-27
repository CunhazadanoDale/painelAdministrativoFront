import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../autenticacao/useAutenticacao';
import { PreferenciasProvider } from './PreferenciasProvider';
import { usePreferencias } from './usePreferencias';

vi.mock('../autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));

const ANA = { id: 'u-ana', nome: 'Ana' };
const BRUNO = { id: 'u-bruno', nome: 'Bruno' };

function renderizar() {
  return renderHook(() => usePreferencias(), {
    wrapper: ({ children }) => <PreferenciasProvider>{children}</PreferenciasProvider>,
  });
}

function simularSistema(escuro) {
  const ouvintes = new Set();
  const consulta = {
    matches: escuro,
    addEventListener: (_tipo, ouvinte) => ouvintes.add(ouvinte),
    removeEventListener: (_tipo, ouvinte) => ouvintes.delete(ouvinte),
  };
  vi.stubGlobal('matchMedia', vi.fn(() => consulta));
  return (novo) => {
    consulta.matches = novo;
    ouvintes.forEach((ouvinte) => ouvinte({ matches: novo }));
  };
}

beforeEach(() => {
  useAutenticacao.mockReturnValue({ usuario: ANA });
});

afterEach(() => {
  delete document.documentElement.dataset.tema;
});

describe('PreferenciasProvider', () => {
  it('começa com os padrões e aplica o tema claro sem preferência salva', () => {
    const { result } = renderizar();

    expect(result.current.preferencias).toEqual({ tema: 'sistema', telaInicial: '/', empresaPadrao: '' });
    expect(document.documentElement.dataset.tema).toBe('claro');
  });

  it('salva as preferências por usuário, sem misturar quem usa o mesmo navegador', () => {
    const { result, rerender } = renderizar();

    act(() => result.current.alterar('telaInicial', '/caixa'));
    act(() => result.current.alterar('empresaPadrao', 'e-mia'));
    expect(JSON.parse(localStorage.getItem('mia.preferencias.u-ana'))).toEqual({
      tema: 'sistema',
      telaInicial: '/caixa',
      empresaPadrao: 'e-mia',
    });

    useAutenticacao.mockReturnValue({ usuario: BRUNO });
    rerender();
    expect(result.current.preferencias.telaInicial).toBe('/');

    useAutenticacao.mockReturnValue({ usuario: ANA });
    rerender();
    expect(result.current.preferencias).toMatchObject({ telaInicial: '/caixa', empresaPadrao: 'e-mia' });
  });

  it('ignora preferência corrompida ou com valores de tipo errado', () => {
    localStorage.setItem('mia.preferencias.u-ana', '{quebrado');
    const { result, unmount } = renderizar();
    expect(result.current.preferencias.telaInicial).toBe('/');
    unmount();

    localStorage.setItem('mia.preferencias.u-ana', JSON.stringify({ telaInicial: 42, empresaPadrao: 'e-mia' }));
    localStorage.setItem('mia.tema', 'roxo');
    const segundo = renderizar();
    expect(segundo.result.current.preferencias).toEqual({ tema: 'sistema', telaInicial: '/', empresaPadrao: 'e-mia' });
  });

  it('continua funcionando quando o navegador bloqueia o armazenamento', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    const { result } = renderizar();
    act(() => result.current.alterar('telaInicial', '/caixa'));
    act(() => result.current.alterar('tema', 'escuro'));

    expect(result.current.preferencias).toMatchObject({ tema: 'escuro', telaInicial: '/caixa' });
    expect(document.documentElement.dataset.tema).toBe('escuro');
    vi.restoreAllMocks();
  });

  it('guarda o tema no aparelho, valendo também sem ninguém logado', () => {
    const { result, unmount } = renderizar();
    act(() => result.current.alterar('tema', 'escuro'));
    expect(localStorage.getItem('mia.tema')).toBe('escuro');
    unmount();

    useAutenticacao.mockReturnValue({ usuario: null });
    const semLogin = renderizar();
    expect(semLogin.result.current.preferencias.tema).toBe('escuro');
    expect(document.documentElement.dataset.tema).toBe('escuro');
  });

  it('no tema do sistema acompanha a troca de claro para escuro', () => {
    const mudarSistema = simularSistema(false);
    renderizar();
    expect(document.documentElement.dataset.tema).toBe('claro');

    act(() => mudarSistema(true));
    expect(document.documentElement.dataset.tema).toBe('escuro');
  });
});
