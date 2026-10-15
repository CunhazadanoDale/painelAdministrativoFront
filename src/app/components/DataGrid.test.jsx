import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { DataGrid } from './DataGrid';

const COLUNAS = [
  { label: 'Nome', field: 'nome' },
  { label: 'Nota', field: 'id', render: (id) => <input aria-label={`nota ${id}`} defaultValue="" /> },
];

const ANA = { id: 'ana', nome: 'Ana' };
const BRUNO = { id: 'bruno', nome: 'Bruno' };
const CARLA = { id: 'carla', nome: 'Carla' };

function linhaDe(nome) {
  return screen.getByText(nome).closest('tr');
}

describe('DataGrid', () => {
  it('mantém o estado da célula com a linha quando a lista muda de ordem', () => {
    const { rerender } = render(<DataGrid columns={COLUNAS} data={[ANA, BRUNO]} selectable={false} />);
    fireEvent.change(screen.getByLabelText('nota bruno'), { target: { value: 'ligar amanhã' } });

    rerender(<DataGrid columns={COLUNAS} data={[CARLA, ANA, BRUNO]} selectable={false} />);

    expect(screen.getByLabelText('nota bruno')).toHaveValue('ligar amanhã');
    expect(screen.getByLabelText('nota carla')).toHaveValue('');
  });

  it('mantém a seleção na mesma linha quando entra uma linha nova antes dela', () => {
    const { rerender } = render(<DataGrid columns={COLUNAS} data={[ANA, BRUNO]} />);
    fireEvent.click(linhaDe('Bruno'));
    expect(linhaDe('Bruno')).toHaveClass('selected');

    rerender(<DataGrid columns={COLUNAS} data={[CARLA, ANA, BRUNO]} />);

    expect(linhaDe('Bruno')).toHaveClass('selected');
    expect(linhaDe('Ana')).not.toHaveClass('selected');
  });

  it('seleciona e desmarca todas as linhas pelo cabeçalho', () => {
    render(<DataGrid columns={COLUNAS} data={[ANA, BRUNO]} />);
    const [todas] = screen.getAllByRole('checkbox');

    fireEvent.click(todas);
    expect(linhaDe('Ana')).toHaveClass('selected');
    expect(linhaDe('Bruno')).toHaveClass('selected');

    fireEvent.click(todas);
    expect(linhaDe('Ana')).not.toHaveClass('selected');
  });
});
