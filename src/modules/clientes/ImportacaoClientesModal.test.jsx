import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import * as clientesService from '../../services/clientes';
import { CABECALHO_IMPORTACAO } from './clientesUtils';
import { ImportacaoClientesModal } from './ImportacaoClientesModal';

vi.mock('../../services/clientes', () => ({ importarClientes: vi.fn() }));

const { importarClientes } = clientesService;

const RELATORIO = {
  simulacao: true,
  total: 4,
  importadas: 2,
  rejeitadas: [
    { linha: 4, documento: '11222333000181', motivo: 'documento repetido no arquivo (linha 2)' },
    { linha: 5, documento: '111.444.777-35', motivo: 'cliente do tipo pf exige CPF, e CPF exige o tipo pf' },
  ],
};

function arquivo(conteudo = `${CABECALHO_IMPORTACAO}\n`, nome = 'clientes.csv') {
  return new File([conteudo], nome, { type: 'text/csv' });
}

function abrir(onImportado = vi.fn()) {
  render(<ImportacaoClientesModal onFechar={() => {}} onImportado={onImportado} />);
  return { onImportado, dialogo: screen.getByRole('dialog', { name: 'Importar clientes' }) };
}

function escolher(dialogo, escolhido) {
  fireEvent.change(within(dialogo).getByLabelText('Arquivo CSV *'), { target: { files: [escolhido] } });
}

beforeEach(() => {
  vi.clearAllMocks();
  importarClientes.mockResolvedValue({ dados: RELATORIO });
});

describe('ImportacaoClientesModal', () => {
  it('mostra o cabeçalho esperado e exige o arquivo', async () => {
    const { dialogo } = abrir();

    expect(within(dialogo).getByText(CABECALHO_IMPORTACAO)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Simular' }));

    expect(await within(dialogo).findByText('Escolha o arquivo CSV.')).toBeInTheDocument();
    expect(importarClientes).not.toHaveBeenCalled();
  });

  it('recusa arquivo acima de 5 MB antes de enviar', async () => {
    const { dialogo } = abrir();
    const grande = arquivo('x');
    Object.defineProperty(grande, 'size', { value: 5 * 1024 * 1024 + 1 });
    escolher(dialogo, grande);

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Simular' }));

    expect(await within(dialogo).findByText('O arquivo tem mais de 5 MB; divida em partes.')).toBeInTheDocument();
    expect(importarClientes).not.toHaveBeenCalled();
  });

  it('simula sem gravar e mostra o relatório com as linhas rejeitadas', async () => {
    const { dialogo, onImportado } = abrir();
    const escolhido = arquivo();
    escolher(dialogo, escolhido);

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Simular' }));

    await waitFor(() => expect(importarClientes).toHaveBeenCalledWith(escolhido, { simular: true }));
    expect(await within(dialogo).findByText(/Simulação: nada foi gravado/)).toBeInTheDocument();
    expect(within(dialogo).getByText('2 de 4 linhas seriam importadas.')).toBeInTheDocument();
    const linha = within(dialogo).getByText('documento repetido no arquivo (linha 2)').closest('tr');
    expect(within(linha).getByText('4')).toBeInTheDocument();
    expect(within(linha).getByText('11222333000181')).toBeInTheDocument();
    expect(onImportado).not.toHaveBeenCalled();
  });

  it('importa de verdade e avisa a lista para recarregar', async () => {
    importarClientes.mockResolvedValue({ dados: { simulacao: false, total: 3, importadas: 3, rejeitadas: [] } });
    const { dialogo, onImportado } = abrir();
    const escolhido = arquivo();
    escolher(dialogo, escolhido);

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Importar' }));

    await waitFor(() => expect(importarClientes).toHaveBeenCalledWith(escolhido, { simular: false }));
    expect(await within(dialogo).findByText('3 de 3 linhas importadas.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Nenhuma linha rejeitada.')).toBeInTheDocument();
    expect(onImportado).toHaveBeenCalled();
  });

  it('mostra o arquivo recusado inteiro pela API sem relatório', async () => {
    importarClientes.mockRejectedValue(
      new ErroApi(400, 'erro de validação: linha 3 não está em UTF-8; salve o arquivo como CSV UTF-8')
    );
    const { dialogo, onImportado } = abrir();
    escolher(dialogo, arquivo());

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Importar' }));

    expect(await within(dialogo).findByText(/salve o arquivo como CSV UTF-8/)).toBeInTheDocument();
    expect(onImportado).not.toHaveBeenCalled();
  });

  it('limpa o relatório quando outro arquivo é escolhido', async () => {
    const { dialogo } = abrir();
    escolher(dialogo, arquivo());
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Simular' }));
    await within(dialogo).findByText(/Simulação: nada foi gravado/);

    escolher(dialogo, arquivo('outro', 'outro.csv'));

    expect(within(dialogo).queryByText(/Simulação: nada foi gravado/)).toBeNull();
  });
});
