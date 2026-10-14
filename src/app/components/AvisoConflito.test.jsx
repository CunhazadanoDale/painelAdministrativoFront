import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AvisoConflito } from './AvisoConflito';

describe('AvisoConflito', () => {
  it('mostra a mensagem da API e recarrega pelo botão', () => {
    const onRecarregar = vi.fn();

    render(
      <AvisoConflito
        mensagem="o fornecedor foi alterado por outra pessoa; recarregue e tente de novo"
        onRecarregar={onRecarregar}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('o fornecedor foi alterado por outra pessoa');
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar dados' }));
    expect(onRecarregar).toHaveBeenCalledTimes(1);
  });

  it('desabilita o botão enquanto recarrega', () => {
    render(<AvisoConflito mensagem="alterado" onRecarregar={() => {}} recarregando />);

    expect(screen.getByRole('button', { name: 'Recarregando…' })).toBeDisabled();
  });
});
