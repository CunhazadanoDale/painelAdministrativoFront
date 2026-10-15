import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as funisService from '../../services/funis';
import * as leadsService from '../../services/leads';
import { useLeadDetalhe } from './useLeadDetalhe';

const LEAD = { id: 'lead-1', nome: 'Maria', etapa_id: 'e1', ativo: true };

let obterLead;
let listarFunis;

beforeEach(() => {
  vi.restoreAllMocks();
  listarFunis = vi.spyOn(funisService, 'listarTodosFunis').mockResolvedValue([{ funil_id: 'f1' }]);
  vi.spyOn(funisService, 'listarEtapasDoFunil').mockResolvedValue({ dados: [{ etapa_id: 'e1', funil_id: 'f1' }] });
  vi.spyOn(leadsService, 'listarHistoricoDoLead').mockResolvedValue({ dados: [] });
  obterLead = vi.spyOn(leadsService, 'obterLead');
});

describe('useLeadDetalhe', () => {
  it('limpa o erro do lead ao tentar de novo e mostra o carregamento', async () => {
    obterLead.mockRejectedValueOnce(new Error('servidor fora do ar'));
    let liberar;
    obterLead.mockImplementationOnce(() => new Promise((resolver) => (liberar = resolver)));
    const { result } = renderHook(() => useLeadDetalhe('lead-1'));
    await waitFor(() => expect(result.current.erroLead).toBe('servidor fora do ar'));

    act(() => result.current.recarregar());

    expect(result.current.erroLead).toBeNull();
    expect(result.current.carregando).toBe(true);

    await act(async () => liberar({ dados: LEAD }));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.lead).toEqual(LEAD);
  });

  it('não leva o erro de um lead para outro', async () => {
    obterLead.mockRejectedValueOnce(Object.assign(new Error('não encontrado'), { status: 404 }));
    obterLead.mockResolvedValue({ dados: { ...LEAD, id: 'lead-2' } });
    const { result, rerender } = renderHook(({ id }) => useLeadDetalhe(id), {
      initialProps: { id: 'lead-1' },
    });
    await waitFor(() => expect(result.current.erroLead).toContain('Lead não encontrado'));

    rerender({ id: 'lead-2' });

    expect(result.current.erroLead).toBeNull();
    await waitFor(() => expect(result.current.lead?.id).toBe('lead-2'));
  });

  it('limpa o erro da estrutura ao tentar de novo', async () => {
    obterLead.mockResolvedValue({ dados: LEAD });
    listarFunis.mockRejectedValueOnce(new Error('funis fora do ar'));
    const { result } = renderHook(() => useLeadDetalhe('lead-1'));
    await waitFor(() => expect(result.current.erroEstrutura).toBe('funis fora do ar'));

    act(() => result.current.recarregar());

    expect(result.current.erroEstrutura).toBeNull();
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.erroEstrutura).toBeNull();
  });
});
