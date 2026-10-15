import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as cargosService from '../../services/cargos';
import * as empresasService from '../../services/empresas';
import * as usuariosService from '../../services/usuarios';
import Usuarios from './Usuarios';

vi.mock('../../services/usuarios', () => ({
  listarUsuarios: vi.fn(),
}));

vi.mock('../../services/cargos', () => ({
  listarTodosCargos: vi.fn(),
}));

vi.mock('../../services/empresas', () => ({
  listarTodasEmpresas: vi.fn(),
  obterEmpresasDoUsuario: vi.fn(),
  definirEmpresasDoUsuario: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  usuariosService.listarUsuarios.mockResolvedValue({
    dados: [
      { id: 'usr-1', nome: 'Ana Souza', email: 'ana@exemplo.com', cargo_id: 'c-comum', ativo: true },
      { id: 'usr-2', nome: 'Bruno Lima', email: 'bruno@exemplo.com', cargo_id: 'c-admin', ativo: true },
    ],
  });
  cargosService.listarTodosCargos.mockResolvedValue([
    { id: 'c-comum', nome: 'Compras', administrador: false },
    { id: 'c-admin', nome: 'Diretoria', administrador: true },
  ]);
  empresasService.listarTodasEmpresas.mockResolvedValue([
    { id: 'emp-mia', nome_fantasia: 'MIA', ativa: true },
  ]);
  empresasService.obterEmpresasDoUsuario.mockResolvedValue({
    dados: { acesso_todas: false, empresa_ids: ['emp-mia'] },
  });
});

function linhaDe(nome) {
  return screen.getByText(nome).closest('tr');
}

describe('Usuarios', () => {
  it('abre as empresas do usuário escolhido', async () => {
    render(<Usuarios />);
    await screen.findByText('Ana Souza');

    fireEvent.click(within(linhaDe('Ana Souza')).getByRole('button', { name: 'Empresas do usuário' }));

    const dialogo = screen.getByRole('dialog', { name: 'Empresas de Ana Souza' });
    expect(await within(dialogo).findByLabelText('MIA')).toBeChecked();
    expect(empresasService.obterEmpresasDoUsuario).toHaveBeenCalledWith('usr-1', expect.anything());
    expect(within(dialogo).queryByText(/cargo de administrador/)).toBeNull();
  });

  it('avisa no modal quando o cargo do usuário é de administrador', async () => {
    render(<Usuarios />);
    await screen.findByText('Bruno Lima');

    fireEvent.click(within(linhaDe('Bruno Lima')).getByRole('button', { name: 'Empresas do usuário' }));

    expect(await screen.findByText(/cargo de administrador/)).toBeInTheDocument();
  });
});
