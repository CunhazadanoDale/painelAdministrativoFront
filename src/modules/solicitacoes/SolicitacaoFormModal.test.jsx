import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as empresasService from '../../services/empresas';
import { SolicitacaoFormModal } from './SolicitacaoFormModal';

vi.mock('../../services/empresas', () => ({
  listarTodasEmpresas: vi.fn(),
}));

vi.mock('../../services/arquivos', () => ({
  enviarArquivo: vi.fn(),
  removerArquivo: vi.fn(),
}));

const { listarTodasEmpresas } = empresasService;

const MIA = { id: 'e-mia', nome_fantasia: 'MIA' };
const GIGANTE = { id: 'e-gigante', nome_fantasia: 'Gigante' };

function preencher() {
  fireEvent.change(screen.getByLabelText('Valor *'), { target: { value: '1.500' } });
  fireEvent.change(screen.getByLabelText('Observação *'), { target: { value: 'Compra de cimento' } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SolicitacaoFormModal', () => {
  it('exige a empresa antes de salvar', async () => {
    listarTodasEmpresas.mockResolvedValue([MIA, GIGANTE]);
    const onSalvar = vi.fn();

    render(<SolicitacaoFormModal onFechar={() => {}} onSalvar={onSalvar} />);
    await screen.findByRole('option', { name: 'MIA' });
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Selecione a empresa da solicitação.')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('envia a empresa escolhida com o valor em centavos', async () => {
    listarTodasEmpresas.mockResolvedValue([MIA, GIGANTE]);
    const onSalvar = vi.fn().mockResolvedValue(null);
    const onFechar = vi.fn();

    render(<SolicitacaoFormModal onFechar={onFechar} onSalvar={onSalvar} />);
    await screen.findByRole('option', { name: 'MIA' });
    fireEvent.change(screen.getByLabelText('Empresa *'), { target: { value: 'e-gigante' } });
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({ empresa_id: 'e-gigante', valor_centavos: 150000 })
    );
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
  });

  it('usa a única empresa do acesso sem pedir escolha', async () => {
    listarTodasEmpresas.mockResolvedValue([MIA]);
    const onSalvar = vi.fn().mockResolvedValue(null);

    render(<SolicitacaoFormModal onFechar={() => {}} onSalvar={onSalvar} />);
    await waitFor(() => expect(screen.getByLabelText('Empresa *')).toHaveValue('e-mia'));
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ empresa_id: 'e-mia' }))
    );
  });
});
