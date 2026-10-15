import { render, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AutenticacaoProvider } from '../app/autenticacao/AutenticacaoProvider';
import { useAprovadores } from './aprovadores/useAprovadores';
import { useCargos } from './cargos/useCargos';
import { useDashboard } from './dashboard/useDashboard';
import { useEmpresas } from './empresas/useEmpresas';
import { useContasBancarias } from './financeiro/useContasBancarias';
import { useFornecedores } from './fornecedores/useFornecedores';
import { useFunis } from './funis/useFunis';
import { useKanban } from './leads/useKanban';
import { useLeadDetalhe } from './leads/useLeadDetalhe';
import { useLeads } from './leads/useLeads';
import { usePerfil } from './perfil/usePerfil';
import { MovimentoModal } from './produtos/MovimentoModal';
import { useCategorias } from './produtos/useCategorias';
import { useProdutoDetalhe } from './produtos/useProdutoDetalhe';
import { useProdutos } from './produtos/useProdutos';
import { useSolicitacaoDetalhe } from './solicitacoes/useSolicitacaoDetalhe';
import { useSolicitacoes } from './solicitacoes/useSolicitacoes';
import { useAcessoEmpresas } from './usuarios/useAcessoEmpresas';
import { useUsuarios } from './usuarios/useUsuarios';

let chamadas;

const FUNIS = [{ funil_id: 'f1', nome: 'Vendas' }];
const ETAPAS = [{ etapa_id: 'e1', funil_id: 'f1', ordem: 1 }];

function comAutenticacao({ children }) {
  return (
    <MemoryRouter>
      <AutenticacaoProvider>{children}</AutenticacaoProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.setItem(
    'mia.sessao',
    JSON.stringify({
      token: 'token-de-teste',
      expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      administrador: true,
      usuario: { usuario_id: 1, nome: 'Pessoa Teste', email: 'teste@exemplo.com' },
    })
  );
  chamadas = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url, opcoes = {}) => {
      chamadas.push({ url: String(url), sinal: opcoes.signal });
      return new Promise(() => {});
    })
  );
});

async function conferirCancelamento(desmontar) {
  await waitFor(() => expect(chamadas.length).toBeGreaterThan(0));
  desmontar();
  const semSinal = chamadas.filter((chamada) => !chamada.sinal).map((chamada) => chamada.url);
  expect(semSinal).toEqual([]);
  const ativas = chamadas.filter((chamada) => !chamada.sinal.aborted).map((chamada) => chamada.url);
  expect(ativas).toEqual([]);
}

describe('cancelamento das requisições ao desmontar', () => {
  it.each([
    ['AutenticacaoProvider', () => null],
    ['useProdutos', () => useProdutos()],
    ['useCategorias', () => useCategorias()],
    ['useProdutoDetalhe', () => useProdutoDetalhe('prod-1')],
    ['useSolicitacoes', () => useSolicitacoes()],
    ['useSolicitacaoDetalhe', () => useSolicitacaoDetalhe('sol-1')],
    ['useAprovadores', () => useAprovadores()],
    ['useCargos', () => useCargos()],
    ['useUsuarios', () => useUsuarios()],
    ['useAcessoEmpresas', () => useAcessoEmpresas('usr-1')],
    ['usePerfil', () => usePerfil()],
    ['useLeads', () => useLeads()],
    ['useKanban', () => useKanban({ funis: FUNIS, etapas: ETAPAS, ativo: true })],
    ['useLeadDetalhe', () => useLeadDetalhe('lead-1')],
    ['useFunis', () => useFunis()],
    ['useDashboard', () => useDashboard()],
    ['useEmpresas', () => useEmpresas()],
    ['useFornecedores', () => useFornecedores()],
    ['useContasBancarias', () => useContasBancarias()],
  ])('%s', async (_, usar) => {
    const { unmount } = renderHook(usar, { wrapper: comAutenticacao });

    await conferirCancelamento(unmount);
  });

  it('MovimentoModal', async () => {
    const { unmount } = render(
      <AutenticacaoProvider>
        <MovimentoModal produto={{ id: 'prod-1', nome: 'Cimento' }} onFechar={() => {}} onSalvar={() => {}} />
      </AutenticacaoProvider>
    );

    await conferirCancelamento(unmount);
  });
});
