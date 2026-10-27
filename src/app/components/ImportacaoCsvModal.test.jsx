import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import { ImportacaoCsvModal } from './ImportacaoCsvModal';

const RELATORIO = {
  simulacao: false,
  total: 2,
  importadas: 1,
  rejeitadas: [{ linha: 3, chave: 'CIM-50', motivo: 'já existe um produto com este código' }],
};

function abrir(props = {}) {
  const importar = props.importar ?? vi.fn(async () => ({ dados: RELATORIO }));
  const onImportado = vi.fn();
  render(
    <ImportacaoCsvModal
      titulo="Importar produtos"
      cabecalho="nome;codigo"
      rotuloChave="Código"
      importar={importar}
      onFechar={() => {}}
      onImportado={onImportado}
      {...props}
    />
  );
  return { importar, onImportado, dialogo: screen.getByRole('dialog', { name: 'Importar produtos' }) };
}

function escolher(dialogo) {
  const arquivo = new File(['nome;codigo\n'], 'produtos.csv', { type: 'text/csv' });
  fireEvent.change(within(dialogo).getByLabelText('Arquivo CSV *'), { target: { files: [arquivo] } });
  return arquivo;
}

describe('ImportacaoCsvModal', () => {
  it('mostra a chave genérica do relatório com o rótulo da tela', async () => {
    const { dialogo, importar, onImportado } = abrir();
    const arquivo = escolher(dialogo);

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Importar' }));

    await waitFor(() => expect(importar).toHaveBeenCalledWith(arquivo, { simular: false }));
    expect(await within(dialogo).findByText('1 de 2 linhas importadas.')).toBeInTheDocument();
    expect(within(dialogo).getByRole('columnheader', { name: 'Código' })).toBeInTheDocument();
    const linha = within(dialogo).getByText('já existe um produto com este código').closest('tr');
    expect(within(linha).getByText('CIM-50')).toBeInTheDocument();
    expect(onImportado).toHaveBeenCalled();
  });

  it('baixa o modelo e mostra a falha do download', async () => {
    const baixarModelo = vi.fn().mockRejectedValueOnce(new ErroApi(403, 'perfil sem permissão')).mockResolvedValue(undefined);
    const { dialogo } = abrir({ baixarModelo });

    fireEvent.click(within(dialogo).getByRole('button', { name: /Baixar modelo/ }));
    expect(await within(dialogo).findByText('perfil sem permissão')).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole('button', { name: /Baixar modelo/ }));
    await waitFor(() => expect(baixarModelo).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(within(dialogo).queryByText('perfil sem permissão')).toBeNull());
  });

  it('esconde o botão de modelo quando a tela não tem modelo', () => {
    const { dialogo } = abrir();

    expect(within(dialogo).queryByRole('button', { name: /Baixar modelo/ })).toBeNull();
  });

  it('não envia enquanto a tela não liberar e mostra o aviso dela', async () => {
    const { dialogo, importar } = abrir({ podeEnviar: false, avisoSemEnvio: 'Escolha a etapa dos leads.' });
    escolher(dialogo);

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Simular' }));

    expect(await within(dialogo).findByText('Escolha a etapa dos leads.')).toBeInTheDocument();
    expect(importar).not.toHaveBeenCalled();
  });
});
