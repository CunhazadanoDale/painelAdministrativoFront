import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BuscaRemota } from './BuscaRemota';

const CLIENTES = [
  { id: 'cli-1', nome: 'Construtora Águia' },
  { id: 'cli-2', nome: 'Loja do João' },
];

let buscar;

function Exemplo({ inicial = '', rotuloAtual, onEscolher = () => {} }) {
  const [valor, setValor] = useState(inicial);
  return (
    <>
      <label htmlFor="cliente">Cliente</label>
      <BuscaRemota
        id="cliente"
        nomeBusca="cliente"
        valor={valor}
        rotuloAtual={rotuloAtual}
        buscar={buscar}
        opcaoDe={(item) => ({ valor: item.id, rotulo: item.nome })}
        onEscolher={(item) => {
          setValor(item ? item.id : '');
          onEscolher(item);
        }}
      />
    </>
  );
}

beforeEach(() => {
  buscar = vi.fn(async (texto) => CLIENTES.filter((cliente) => cliente.nome.toLowerCase().includes(texto.toLowerCase())));
});

describe('BuscaRemota', () => {
  it('busca a primeira página ao abrir e lista as opções', async () => {
    render(<Exemplo />);

    expect(await screen.findByRole('option', { name: 'Construtora Águia' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Loja do João' })).toBeInTheDocument();
    expect(buscar).toHaveBeenCalledWith('', expect.anything());
  });

  it('busca de novo pelo texto digitado e cancela a busca anterior', async () => {
    render(<Exemplo />);
    await screen.findByRole('option', { name: 'Loja do João' });

    fireEvent.change(screen.getByLabelText('Buscar cliente'), { target: { value: 'águia' } });

    await waitFor(() => expect(buscar).toHaveBeenLastCalledWith('águia', expect.anything()));
    await waitFor(() => expect(screen.queryByRole('option', { name: 'Loja do João' })).toBeNull());
    expect(buscar.mock.calls[0][1].aborted).toBe(true);
  });

  it('devolve o item escolhido inteiro e nulo ao limpar', async () => {
    const onEscolher = vi.fn();
    render(<Exemplo onEscolher={onEscolher} />);
    await screen.findByRole('option', { name: 'Loja do João' });

    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'cli-2' } });
    expect(onEscolher).toHaveBeenLastCalledWith(CLIENTES[1]);
    expect(screen.getByLabelText('Cliente')).toHaveValue('cli-2');

    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '' } });
    expect(onEscolher).toHaveBeenLastCalledWith(null);
  });

  it('mantém o valor atual como opção mesmo fora dos resultados', async () => {
    buscar.mockResolvedValue([]);
    render(<Exemplo inicial="cli-9" rotuloAtual="Cliente antigo" />);

    expect(await screen.findByRole('option', { name: 'Cliente antigo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cliente')).toHaveValue('cli-9');
  });

  it('mostra a falha da busca', async () => {
    buscar.mockRejectedValue(new Error('falha de rede'));
    render(<Exemplo />);

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
  });
});
