import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Modal } from './Modal';

function Formulario({ onFechar = () => {} }) {
  return (
    <Modal aberto titulo="Novo cargo" onFechar={onFechar} rodape={<button type="button">Salvar</button>}>
      <label htmlFor="nome-cargo">Nome</label>
      <input id="nome-cargo" />
      <select aria-label="Tipo" defaultValue="a">
        <option value="a">A</option>
        <option value="b">B</option>
      </select>
    </Modal>
  );
}

function ComAbertura() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)}>
        Abrir
      </button>
      <Modal aberto={aberto} titulo="Detalhe" onFechar={() => setAberto(false)}>
        <input aria-label="Campo" />
      </Modal>
    </>
  );
}

function overlay() {
  return screen.getByRole('dialog').parentElement;
}

describe('Modal', () => {
  it('identifica o diálogo pelo título', () => {
    render(<Formulario />);

    expect(screen.getByRole('dialog', { name: 'Novo cargo' })).toBeInTheDocument();
  });

  it('leva o foco para dentro ao abrir e devolve a quem abriu ao fechar', () => {
    render(<ComAbertura />);
    const abrir = screen.getByRole('button', { name: 'Abrir' });
    abrir.focus();

    fireEvent.click(abrir);
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(document.activeElement).toBe(abrir);
  });

  it('prende o foco: Tab no último volta ao primeiro e Shift+Tab no primeiro vai ao último', () => {
    render(<Formulario />);
    const primeiro = screen.getByRole('button', { name: 'Fechar' });
    const ultimo = screen.getByRole('button', { name: 'Salvar' });

    ultimo.focus();
    fireEvent.keyDown(ultimo, { key: 'Tab' });
    expect(document.activeElement).toBe(primeiro);

    fireEvent.keyDown(primeiro, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(ultimo);
  });

  it('fecha no clique fora quando nada foi preenchido', () => {
    const onFechar = vi.fn();
    render(<Formulario onFechar={onFechar} />);

    fireEvent.click(overlay());

    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it('não fecha no clique fora depois de preencher um campo', () => {
    const onFechar = vi.fn();
    render(<Formulario onFechar={onFechar} />);

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Gerente' } });
    fireEvent.click(overlay());

    expect(onFechar).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nome')).toHaveValue('Gerente');
  });

  it('não fecha no clique fora depois de trocar uma seleção', () => {
    const onFechar = vi.fn();
    render(<Formulario onFechar={onFechar} />);

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'b' } });
    fireEvent.click(overlay());

    expect(onFechar).not.toHaveBeenCalled();
  });

  it('o X e o Esc fecham mesmo com o formulário preenchido', () => {
    const onFechar = vi.fn();
    render(<Formulario onFechar={onFechar} />);
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Gerente' } });

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onFechar).toHaveBeenCalledTimes(2);
  });
});
