import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as leadsService from '../../services/leads';
import { ImportacaoLeadsModal } from './ImportacaoLeadsModal';

vi.mock('../../services/leads', () => ({ importarLeads: vi.fn(), baixarModeloImportacao: vi.fn() }));

const { importarLeads } = leadsService;

const FUNIS = [{ funil_id: 'f1', nome: 'Prospecção' }];
const ETAPAS = [
  { etapa_id: 'e1', funil_id: 'f1', nome: 'Novo', ativo: true },
  { etapa_id: 'e2', funil_id: 'f1', nome: 'Arquivada', ativo: false },
];

beforeEach(() => {
  vi.clearAllMocks();
  importarLeads.mockResolvedValue({ dados: { simulacao: true, total: 1, importadas: 1, rejeitadas: [] } });
});

function abrir() {
  render(<ImportacaoLeadsModal funis={FUNIS} etapas={ETAPAS} onFechar={() => {}} onImportado={vi.fn()} />);
  const dialogo = screen.getByRole('dialog', { name: 'Importar leads' });
  const arquivo = new File(['nome;email;telefone;origem\n'], 'leads.csv', { type: 'text/csv' });
  fireEvent.change(within(dialogo).getByLabelText('Arquivo CSV *'), { target: { files: [arquivo] } });
  return { dialogo, arquivo };
}

describe('ImportacaoLeadsModal', () => {
  it('exige a etapa e só oferece etapas ativas com o nome do funil', async () => {
    const { dialogo } = abrir();

    expect(within(dialogo).getByRole('option', { name: 'Prospecção — Novo' })).toBeInTheDocument();
    expect(within(dialogo).queryByRole('option', { name: /Arquivada/ })).toBeNull();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Simular' }));

    expect(await within(dialogo).findByText('Escolha a etapa dos leads.')).toBeInTheDocument();
    expect(importarLeads).not.toHaveBeenCalled();
  });

  it('envia o arquivo para a etapa escolhida', async () => {
    const { dialogo, arquivo } = abrir();
    fireEvent.change(within(dialogo).getByLabelText('Etapa *'), { target: { value: 'e1' } });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Simular' }));

    await waitFor(() => expect(importarLeads).toHaveBeenCalledWith(arquivo, { etapaId: 'e1', simular: true }));
    expect(await within(dialogo).findByText('1 de 1 linhas seriam importadas.')).toBeInTheDocument();
  });
});
