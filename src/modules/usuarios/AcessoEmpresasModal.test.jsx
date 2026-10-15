import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import * as empresasService from '../../services/empresas';
import { AcessoEmpresasModal } from './AcessoEmpresasModal';

vi.mock('../../services/empresas', () => ({
  listarTodasEmpresas: vi.fn(),
  obterEmpresasDoUsuario: vi.fn(),
  definirEmpresasDoUsuario: vi.fn(),
}));

const { listarTodasEmpresas, obterEmpresasDoUsuario, definirEmpresasDoUsuario } = empresasService;

const USUARIO = { id: 'usr-1', nome: 'Ana Souza' };

const EMPRESAS = [
  { id: 'emp-mia', nome_fantasia: 'MIA', ativa: true },
  { id: 'emp-gigante', nome_fantasia: 'Gigante CE', ativa: true },
  { id: 'emp-red', nome_fantasia: 'Red Diamond', ativa: false },
];

function renderizar(props = {}) {
  const onFechar = vi.fn();
  render(<AcessoEmpresasModal usuario={USUARIO} onFechar={onFechar} {...props} />);
  return { onFechar };
}

beforeEach(() => {
  vi.clearAllMocks();
  listarTodasEmpresas.mockResolvedValue(EMPRESAS);
  obterEmpresasDoUsuario.mockResolvedValue({
    dados: { acesso_todas: false, empresa_ids: ['emp-gigante'] },
  });
  definirEmpresasDoUsuario.mockImplementation(async (_, dados) => ({ dados }));
});

describe('AcessoEmpresasModal', () => {
  it('marca as empresas vinculadas e identifica a inativa', async () => {
    renderizar();

    const dialogo = screen.getByRole('dialog', { name: 'Empresas de Ana Souza' });
    expect(await within(dialogo).findByLabelText('Gigante CE')).toBeChecked();
    expect(within(dialogo).getByLabelText('MIA')).not.toBeChecked();
    expect(within(dialogo).getByLabelText('Red Diamond (inativa)')).not.toBeChecked();
    expect(within(dialogo).getByLabelText(/Acesso a todas as empresas/)).not.toBeChecked();
    expect(listarTodasEmpresas).toHaveBeenCalledWith(expect.objectContaining({ sinal: expect.any(AbortSignal) }));
    expect(obterEmpresasDoUsuario).toHaveBeenCalledWith(
      'usr-1',
      expect.objectContaining({ sinal: expect.any(AbortSignal) })
    );
  });

  it('grava o conjunto inteiro na ordem da lista e fecha', async () => {
    const { onFechar } = renderizar();
    fireEvent.click(await screen.findByLabelText('MIA'));
    fireEvent.click(screen.getByLabelText('Red Diamond (inativa)'));
    fireEvent.click(screen.getByLabelText('Gigante CE'));

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(definirEmpresasDoUsuario).toHaveBeenCalledWith('usr-1', {
        acesso_todas: false,
        empresa_ids: ['emp-mia', 'emp-red'],
      })
    );
    expect(onFechar).toHaveBeenCalled();
  });

  it('com acesso a todas trava a lista mas guarda os vínculos', async () => {
    renderizar();
    fireEvent.click(await screen.findByLabelText(/Acesso a todas as empresas/));

    expect(screen.getByLabelText('MIA')).toBeDisabled();
    expect(screen.getByLabelText('Gigante CE')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(definirEmpresasDoUsuario).toHaveBeenCalledWith('usr-1', {
        acesso_todas: true,
        empresa_ids: ['emp-gigante'],
      })
    );
  });

  it('mantém vínculo gravado com empresa que não veio na lista', async () => {
    obterEmpresasDoUsuario.mockResolvedValue({
      dados: { acesso_todas: false, empresa_ids: ['emp-sumida', 'emp-mia'] },
    });
    renderizar();
    await screen.findByLabelText('MIA');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(definirEmpresasDoUsuario).toHaveBeenCalledWith('usr-1', {
        acesso_todas: false,
        empresa_ids: ['emp-mia', 'emp-sumida'],
      })
    );
  });

  it('avisa quando o usuário não terá acesso a nenhuma empresa', async () => {
    obterEmpresasDoUsuario.mockResolvedValue({ dados: { acesso_todas: false, empresa_ids: [] } });

    renderizar();

    expect(await screen.findByText(/não enxerga nenhuma empresa/)).toBeInTheDocument();
  });

  it('avisa que o administrador enxerga todas mesmo sem vínculo', async () => {
    renderizar({ administrador: true });

    expect(await screen.findByText(/cargo de administrador/)).toBeInTheDocument();
    expect(screen.queryByText(/não enxerga nenhuma empresa/)).toBeNull();
  });

  it('mostra a falha ao carregar sem permitir salvar e tenta de novo', async () => {
    obterEmpresasDoUsuario.mockRejectedValueOnce(new Error('falha de rede'));

    renderizar();

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByLabelText('Gigante CE')).toBeChecked();
  });

  it('mostra o erro da gravação sem perder as marcações', async () => {
    definirEmpresasDoUsuario.mockRejectedValue(
      new ErroApi(400, 'erro de validação: registro relacionado não encontrado')
    );
    const { onFechar } = renderizar();
    fireEvent.click(await screen.findByLabelText('MIA'));

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText(/registro relacionado não encontrado/)).toBeInTheDocument();
    expect(screen.getByLabelText('MIA')).toBeChecked();
    expect(onFechar).not.toHaveBeenCalled();
  });
});
