import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as funisService from '../../services/funis';
import * as leadsService from '../../services/leads';
import { TAMANHO_PAGINA, useLeads } from './useLeads';

function lead(indice) {
  return { id: `lead-${indice}`, nome: `Lead ${indice}`, etapa_id: 'e1', ativo: true };
}

function pagina(inicio, quantidade) {
  return { dados: Array.from({ length: quantidade }, (_, i) => lead(inicio + i)) };
}

function comRotas(entrada) {
  return function Envoltorio({ children }) {
    return <MemoryRouter initialEntries={[entrada]}>{children}</MemoryRouter>;
  };
}

function useLeadsComNavegacao() {
  return { leads: useLeads(), navegar: useNavigate() };
}

let listarFunis;
let listarLeads;

beforeEach(() => {
  vi.restoreAllMocks();
  listarFunis = vi.spyOn(funisService, 'listarTodosFunis').mockResolvedValue([{ funil_id: 'f1' }]);
  vi.spyOn(funisService, 'listarEtapasDoFunil').mockResolvedValue({ dados: [{ etapa_id: 'e1', funil_id: 'f1' }] });
  vi.spyOn(leadsService, 'contarLeadsPorFunil').mockResolvedValue({ dados: { total: 45 } });
  listarLeads = vi
    .spyOn(leadsService, 'listarLeads')
    .mockImplementation(async ({ pagina: numero }) => pagina((numero - 1) * TAMANHO_PAGINA, TAMANHO_PAGINA + 1));
});

describe('useLeads', () => {
  it('a busca global pela URL volta para a página 1', async () => {
    const { result } = renderHook(useLeadsComNavegacao, { wrapper: comRotas('/leads') });
    await waitFor(() => expect(result.current.leads.carregando).toBe(false));

    act(() => result.current.leads.irParaProxima());
    act(() => result.current.leads.irParaProxima());
    await waitFor(() => expect(result.current.leads.carregando).toBe(false));
    expect(result.current.leads.pagina).toBe(3);

    act(() => result.current.navegar('/leads?q=maria'));
    await waitFor(() => expect(result.current.leads.carregando).toBe(false));

    expect(result.current.leads.q).toBe('maria');
    expect(result.current.leads.pagina).toBe(1);
    expect(listarLeads).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1, q: 'maria' }));
    expect(listarLeads).not.toHaveBeenCalledWith(expect.objectContaining({ pagina: 3, q: 'maria' }));
  });

  it('recarregar busca os leads uma vez só e não refaz a estrutura', async () => {
    const { result } = renderHook(() => useLeads(), { wrapper: comRotas('/leads') });
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(listarLeads).toHaveBeenCalledTimes(1);
    expect(listarFunis).toHaveBeenCalledTimes(1);

    act(() => result.current.recarregar());
    await waitFor(() => expect(result.current.carregando).toBe(false));
    await new Promise((resolver) => setTimeout(resolver, 50));

    expect(listarLeads).toHaveBeenCalledTimes(2);
    expect(listarFunis).toHaveBeenCalledTimes(1);
  });

  it('criar recarrega a lista uma vez só', async () => {
    vi.spyOn(leadsService, 'criarLead').mockResolvedValue({ dados: lead(99) });
    const { result } = renderHook(() => useLeads(), { wrapper: comRotas('/leads') });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.criar({ nome: 'Novo' }));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    await new Promise((resolver) => setTimeout(resolver, 50));

    expect(listarLeads).toHaveBeenCalledTimes(2);
    expect(listarFunis).toHaveBeenCalledTimes(1);
  });

  it('tentar de novo refaz a estrutura quando foi ela que falhou', async () => {
    listarFunis.mockRejectedValueOnce(new Error('funis fora do ar'));
    const { result } = renderHook(() => useLeads(), { wrapper: comRotas('/leads') });
    await waitFor(() => expect(result.current.erro).toBe('funis fora do ar'));
    expect(listarLeads).not.toHaveBeenCalled();

    act(() => result.current.recarregar());
    await waitFor(() => expect(result.current.erro).toBeNull());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(listarFunis).toHaveBeenCalledTimes(2);
    expect(listarLeads).toHaveBeenCalledTimes(1);
  });
});
