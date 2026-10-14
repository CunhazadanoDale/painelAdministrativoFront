import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AutenticacaoProvider } from '../app/autenticacao/AutenticacaoProvider';
import { useAprovadores } from './aprovadores/useAprovadores';
import { usePerfil } from './perfil/usePerfil';
import { useCategorias } from './produtos/useCategorias';
import { useSolicitacaoDetalhe } from './solicitacoes/useSolicitacaoDetalhe';

const TOTAL = 150;

function json(corpo, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(corpo) };
}

function paginado(url) {
  const consulta = new URL(String(url), 'http://localhost').searchParams;
  const pagina = Number(consulta.get('pagina') || 1);
  const tamanho = Number(consulta.get('tamanho') || 20);
  const inicio = (pagina - 1) * tamanho;
  const quantidade = Math.max(0, Math.min(tamanho, TOTAL - inicio));
  return json({
    dados: Array.from({ length: quantidade }, (_, i) => ({
      id: `item-${inicio + i}`,
      usuario_id: `usuario-${inicio + i}`,
      nome: `Item ${inicio + i}`,
      ordem: inicio + i,
      ativo: true,
    })),
  });
}

function responder(url) {
  const texto = String(url);
  if (texto.includes('/api/v1/sessao')) return json({ dados: { id: 'eu', cargo_id: 'item-149' } });
  if (texto.endsWith('/api/v1/solicitacoes/sol-1')) return json({ dados: { id: 'sol-1' } });
  if (texto.includes('/pagamento')) return json({ erro: { mensagem: 'não encontrado' } }, 404);
  return paginado(url);
}

function entrarComoAdministrador() {
  localStorage.setItem(
    'mia.sessao',
    JSON.stringify({
      token: 'token-de-teste',
      expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      administrador: true,
      usuario: { usuario_id: 1, nome: 'Pessoa Teste', email: 'teste@exemplo.com' },
    })
  );
}

function comAutenticacao({ children }) {
  return <AutenticacaoProvider>{children}</AutenticacaoProvider>;
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async (url) => responder(url)));
});

describe('listas que passavam de 100', () => {
  it('aprovadores e usuários disponíveis vêm completos', async () => {
    const { result } = renderHook(() => useAprovadores());

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.aprovadores).toHaveLength(TOTAL);
    expect(result.current.usuarios).toHaveLength(TOTAL);
  });

  it('categorias vêm completas', async () => {
    const { result } = renderHook(() => useCategorias());

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.categorias).toHaveLength(TOTAL);
  });

  it('o perfil encontra cargo além do centésimo', async () => {
    entrarComoAdministrador();
    const { result } = renderHook(() => usePerfil(), { wrapper: comAutenticacao });

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.cargoMapa['item-149']).toBeDefined();
  });

  it('o detalhe da solicitação traz histórico, anexos e nomes completos', async () => {
    entrarComoAdministrador();
    const { result } = renderHook(() => useSolicitacaoDetalhe('sol-1'), { wrapper: comAutenticacao });

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.erro).toBeNull();
    expect(result.current.historico).toHaveLength(TOTAL);
    expect(result.current.arquivos).toHaveLength(TOTAL);
    expect(result.current.usuarios['item-149']).toBeDefined();
  });
});
