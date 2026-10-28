import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LeadFormModal } from './LeadFormModal';

const FUNIS = [
  { funil_id: 'f1', nome: 'Prospecção' },
  { funil_id: 'f2', nome: 'Pós-venda' },
];
const ETAPAS = [
  { etapa_id: 'e2', funil_id: 'f1', nome: 'Contato', ordem: 2, ativo: true },
  { etapa_id: 'e1', funil_id: 'f1', nome: 'Novo', ordem: 1, ativo: true },
  { etapa_id: 'e3', funil_id: 'f1', nome: 'Arquivada', ordem: 3, ativo: false },
  { etapa_id: 'e4', funil_id: 'f2', nome: 'Entrega', ordem: 1, ativo: true },
];

function abrir(props = {}) {
  const onSalvar = vi.fn().mockResolvedValue(undefined);
  render(<LeadFormModal funis={FUNIS} etapas={ETAPAS} onFechar={() => {}} onSalvar={onSalvar} {...props} />);
  const etapas = screen.getByRole('radiogroup', { name: 'Etapa no funil *' });
  return { onSalvar, etapas };
}

describe('LeadFormModal', () => {
  it('mostra as etapas ativas do funil em ordem com a primeira selecionada', () => {
    const { etapas } = abrir();

    const opcoes = within(etapas).getAllByRole('radio');
    expect(opcoes.map((opcao) => opcao.textContent)).toEqual(['1Novo', '2Contato']);
    expect(within(etapas).getByRole('radio', { name: /Novo/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('troca de funil e salva a etapa escolhida', async () => {
    const { onSalvar } = abrir();

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Funil' }), { target: { value: 'f2' } });
    const etapas = screen.getByRole('radiogroup', { name: 'Etapa no funil *' });
    expect(within(etapas).getByRole('radio', { name: /Entrega/ })).toHaveAttribute('aria-checked', 'true');

    fireEvent.change(screen.getByRole('combobox', { name: 'Funil' }), { target: { value: 'f1' } });
    fireEvent.click(within(etapas).getByRole('radio', { name: /Contato/ }));
    fireEvent.submit(document.getElementById('lead-form'));

    await waitFor(() => expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Maria', etapa_id: 'e2' })));
  });

  it('abre no funil inicial informado', () => {
    const { etapas } = abrir({ funilInicialId: 'f2' });

    expect(within(etapas).getByRole('radio', { name: /Entrega/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('na edição abre no funil da etapa do lead', () => {
    const lead = { id: 'l1', nome: 'João', etapa_id: 'e4' };
    const { etapas } = abrir({ lead });

    expect(screen.getByRole('combobox', { name: 'Funil' })).toHaveValue('f2');
    expect(within(etapas).getByRole('radio', { name: /Entrega/ })).toHaveAttribute('aria-checked', 'true');
  });
});
