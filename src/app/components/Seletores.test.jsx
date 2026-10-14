import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as empresasService from '../../services/empresas';
import * as locaisService from '../../services/locais';
import { SeletorEmpresa } from './SeletorEmpresa';
import { SeletorLocal } from './SeletorLocal';

vi.mock('../../services/empresas', () => ({
  listarTodasEmpresas: vi.fn(),
}));

vi.mock('../../services/locais', () => ({
  listarTodosLocais: vi.fn(),
}));

const { listarTodasEmpresas } = empresasService;
const { listarTodosLocais } = locaisService;

const MIA = { id: 'e-mia', nome_fantasia: 'MIA', ativa: true };
const GIGANTE = { id: 'e-gigante', nome_fantasia: 'Gigante', ativa: true };

function Controlado({ Componente, inicial = '', aoAlterar = () => {}, ...props }) {
  const [valor, setValor] = useState(inicial);
  return (
    <>
      <Componente
        id="seletor"
        valor={valor}
        onAlterar={(novo) => {
          setValor(novo);
          aoAlterar(novo);
        }}
        {...props}
      />
      <output data-testid="valor">{valor}</output>
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SeletorEmpresa', () => {
  it('lista só as empresas ativas do acesso em ordem alfabética', async () => {
    listarTodasEmpresas.mockResolvedValue([MIA, GIGANTE]);
    const aoAlterar = vi.fn();

    render(<Controlado Componente={SeletorEmpresa} aoAlterar={aoAlterar} />);

    await screen.findByRole('option', { name: 'MIA' });
    const opcoes = screen.getAllByRole('option');
    expect(opcoes.map((opcao) => opcao.textContent)).toEqual(['Selecione…', 'Gigante', 'MIA']);
    expect(listarTodasEmpresas).toHaveBeenCalledWith(expect.objectContaining({ ativas: true }));

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e-mia' } });
    expect(aoAlterar).toHaveBeenLastCalledWith('e-mia');
  });

  it('seleciona sozinha quando o usuário só tem uma empresa', async () => {
    listarTodasEmpresas.mockResolvedValue([MIA]);

    render(<Controlado Componente={SeletorEmpresa} />);

    await waitFor(() => expect(screen.getByTestId('valor')).toHaveTextContent('e-mia'));
  });

  it('avisa quando não há empresa no acesso', async () => {
    listarTodasEmpresas.mockResolvedValue([]);

    render(<Controlado Componente={SeletorEmpresa} />);

    expect(await screen.findByRole('option', { name: 'Nenhuma empresa no seu acesso' })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('mostra o erro e tenta de novo', async () => {
    listarTodasEmpresas
      .mockRejectedValueOnce(new Error('Não foi possível conectar ao servidor.'))
      .mockResolvedValueOnce([MIA, GIGANTE]);

    render(<Controlado Componente={SeletorEmpresa} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar ao servidor.');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('option', { name: 'MIA' })).toBeInTheDocument();
    expect(listarTodasEmpresas).toHaveBeenCalledTimes(2);
  });

  it('desmarca a empresa que não está mais na lista', async () => {
    listarTodasEmpresas.mockResolvedValue([MIA, GIGANTE]);

    render(<Controlado Componente={SeletorEmpresa} inicial="e-inativa" />);

    await screen.findByRole('option', { name: 'MIA' });
    await waitFor(() => expect(screen.getByTestId('valor')).toHaveTextContent(''));
  });
});

describe('SeletorLocal', () => {
  it('filtra pela empresa e recarrega quando ela muda', async () => {
    listarTodosLocais.mockImplementation(async ({ empresa }) =>
      empresa === 'e-mia'
        ? [
            { id: 'l-cabedelo', nome: 'Galpão Cabedelo', empresa_id: 'e-mia' },
            { id: 'l-centro', nome: 'Centro', empresa_id: 'e-mia' },
          ]
        : [
            { id: 'l-recife', nome: 'Recife', empresa_id: 'e-gigante' },
            { id: 'l-olinda', nome: 'Olinda', empresa_id: 'e-gigante' },
          ]
    );

    const { rerender } = render(
      <Controlado Componente={SeletorLocal} empresaId="e-mia" inicial="l-cabedelo" />
    );

    expect(await screen.findByRole('option', { name: 'Galpão Cabedelo' })).toBeInTheDocument();
    expect(listarTodosLocais).toHaveBeenCalledWith(
      expect.objectContaining({ empresa: 'e-mia', ativos: true })
    );
    expect(screen.getByTestId('valor')).toHaveTextContent('l-cabedelo');

    rerender(<Controlado Componente={SeletorLocal} empresaId="e-gigante" inicial="l-cabedelo" />);

    expect(await screen.findByRole('option', { name: 'Recife' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('valor')).toHaveTextContent(''));
  });

  it('avisa quando não há local disponível', async () => {
    listarTodosLocais.mockResolvedValue([]);

    render(<Controlado Componente={SeletorLocal} />);

    expect(
      await screen.findByRole('option', { name: 'Nenhum local de estoque disponível' })
    ).toBeInTheDocument();
  });
});
