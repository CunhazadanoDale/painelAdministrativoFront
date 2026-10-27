import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { PreferenciasProvider } from '../../app/preferencias/PreferenciasProvider';
import * as empresasService from '../../services/empresas';
import Configuracoes from './Configuracoes';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));

const { listarTodasEmpresas } = empresasService;

const PERFIL_COMERCIAL = { usuario: { id: 'u-ana' }, administrador: false, comercial: true, financeiro: false };

function renderizar() {
  return render(
    <PreferenciasProvider>
      <Configuracoes />
    </PreferenciasProvider>
  );
}

function preferenciasSalvas() {
  return JSON.parse(localStorage.getItem('mia.preferencias.u-ana'));
}

beforeEach(() => {
  vi.clearAllMocks();
  useAutenticacao.mockReturnValue(PERFIL_COMERCIAL);
  listarTodasEmpresas.mockResolvedValue([
    { id: 'e-mia', nome_fantasia: 'MIA' },
    { id: 'e-gigante', nome_fantasia: 'Gigante' },
  ]);
});

describe('Configurações', () => {
  it('troca o tema na hora e guarda no aparelho', () => {
    renderizar();

    expect(screen.getByRole('radio', { name: 'Igual ao sistema' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Escuro' }));

    expect(screen.getByRole('radio', { name: 'Escuro' })).toBeChecked();
    expect(localStorage.getItem('mia.tema')).toBe('escuro');
    expect(document.documentElement.dataset.tema).toBe('escuro');
  });

  it('oferece como tela inicial só as telas do perfil e salva a escolha', () => {
    renderizar();

    const select = screen.getByLabelText('Tela inicial');
    expect(within(select).getByRole('option', { name: 'Leads' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'Minhas Comissões' })).toBeInTheDocument();
    expect(within(select).queryByRole('option', { name: 'Caixa' })).toBeNull();
    expect(within(select).queryByRole('option', { name: 'Usuários' })).toBeNull();

    fireEvent.change(select, { target: { value: '/leads' } });

    expect(select).toHaveValue('/leads');
    expect(preferenciasSalvas().telaInicial).toBe('/leads');
  });

  it('mostra o Dashboard quando a tela salva saiu do perfil', () => {
    localStorage.setItem('mia.preferencias.u-ana', JSON.stringify({ telaInicial: '/caixa' }));

    renderizar();

    expect(screen.getByLabelText('Tela inicial')).toHaveValue('/');
  });

  it('salva a empresa padrão e permite voltar para nenhuma', async () => {
    renderizar();

    const select = await screen.findByRole('combobox', { name: 'Empresa padrão' });
    await waitFor(() => expect(select).not.toBeDisabled());
    expect(select).toHaveValue('');

    fireEvent.change(select, { target: { value: 'e-gigante' } });
    expect(preferenciasSalvas().empresaPadrao).toBe('e-gigante');

    fireEvent.change(select, { target: { value: '' } });
    expect(preferenciasSalvas().empresaPadrao).toBe('');
  });

  it('não escolhe sozinha a empresa padrão quando o acesso tem uma empresa só', async () => {
    listarTodasEmpresas.mockResolvedValue([{ id: 'e-mia', nome_fantasia: 'MIA' }]);

    renderizar();

    const select = await screen.findByRole('combobox', { name: 'Empresa padrão' });
    await waitFor(() => expect(select).not.toBeDisabled());
    expect(select).toHaveValue('');
    expect(localStorage.getItem('mia.preferencias.u-ana')).toBeNull();
  });
});
