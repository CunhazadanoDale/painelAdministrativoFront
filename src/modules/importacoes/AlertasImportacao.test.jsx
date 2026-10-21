import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as empresasService from '../../services/empresas';
import * as importacoesService from '../../services/importacoes';
import * as produtosService from '../../services/produtos';
import AlertasImportacao from './AlertasImportacao';

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/produtos', () => ({ obterProduto: vi.fn() }));
vi.mock('../../services/importacoes', () => ({ obterAlertasImportacao: vi.fn() }));

const { obterAlertasImportacao } = importacoesService;

const ALERTAS = {
  folga_dias: 10,
  prazo_em_risco: [
    {
      importacao_id: 'imp-1',
      importacao_numero: 1,
      importacao_status: 'embarcada',
      empresa_id: 'emp-mia',
      chegada_prevista: '2027-05-07',
      chegada_em: null,
      pedido_id: 'ped-3',
      pedido_numero: 3,
      pedido_item_id: 'pi-3',
      produto_id: 'prod-porc',
      quantidade: 300,
      prazo_limite: '2027-02-16',
      chegada_com_folga: '2027-05-17',
      dias_de_atraso: 90,
    },
  ],
  sem_previsao: [
    {
      importacao_id: 'imp-2',
      importacao_numero: 2,
      importacao_status: 'aberta',
      empresa_id: 'emp-mia',
      chegada_prevista: null,
      chegada_em: null,
      pedido_id: 'ped-4',
      pedido_numero: 4,
      pedido_item_id: 'pi-4',
      produto_id: 'prod-porc',
      quantidade: 50,
      prazo_limite: null,
    },
  ],
  sem_importacao: [
    {
      pedido_id: 'ped-3',
      pedido_numero: 3,
      empresa_id: 'emp-mia',
      pedido_item_id: 'pi-3',
      produto_id: 'prod-porc',
      prazo_limite: '2027-02-16',
      restante: 600,
      reservado: 0,
      alocado: 400,
      sem_cobertura: 200,
    },
  ],
};

function renderizar() {
  return render(
    <MemoryRouter>
      <AlertasImportacao />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  empresasService.listarTodasEmpresas.mockResolvedValue([
    { id: 'emp-mia', nome_fantasia: 'MIA' },
    { id: 'emp-gig', nome_fantasia: 'Gigante' },
  ]);
  produtosService.obterProduto.mockResolvedValue({ dados: { id: 'prod-porc', nome: 'Porcelanato 60x60' } });
  obterAlertasImportacao.mockResolvedValue({ dados: ALERTAS });
});

describe('Alertas de importação', () => {
  it('mostra prazo em risco, sem previsão e sem cobertura com os links', async () => {
    renderizar();

    const risco = (await screen.findByText('Prazo em risco (1)')).closest('.panel');
    expect(within(risco).getByRole('link', { name: 'Pedido 3' })).toHaveAttribute('href', '/pedidos/ped-3');
    expect(within(risco).getByRole('link', { name: 'Importação 1' })).toHaveAttribute('href', '/importacoes/imp-1');
    expect(within(risco).getByText('Embarcada')).toBeInTheDocument();
    expect(within(risco).getByText('16/02/2027')).toBeInTheDocument();
    expect(within(risco).getByText('07/05/2027 (prevista)')).toBeInTheDocument();
    expect(within(risco).getByText('17/05/2027')).toBeInTheDocument();
    expect(within(risco).getByText('90 dias')).toBeInTheDocument();
    expect(await within(risco).findByText('Porcelanato 60x60')).toBeInTheDocument();
    expect(await within(risco).findByText('MIA')).toBeInTheDocument();

    const previsao = screen.getByText('Alocações sem previsão de chegada (1)').closest('.panel');
    expect(within(previsao).getByRole('link', { name: 'Importação 2' })).toBeInTheDocument();
    expect(within(previsao).getByText('Sem prazo')).toBeInTheDocument();

    const cobertura = screen.getByText('Pedidos de importação sem cobertura (1)').closest('.panel');
    const linha = within(cobertura).getByRole('link', { name: 'Pedido 3' }).closest('tr');
    expect(within(linha).getByText('600')).toBeInTheDocument();
    expect(within(linha).getByText('400')).toBeInTheDocument();
    expect(within(linha).getByText('200')).toHaveClass('importacoes-alerta');
    expect(screen.getByText(/mais 10 dias de folga/)).toBeInTheDocument();
  });

  it('mostra os vazios de cada lista', async () => {
    obterAlertasImportacao.mockResolvedValue({
      dados: { folga_dias: 10, prazo_em_risco: [], sem_previsao: [], sem_importacao: [] },
    });

    renderizar();

    expect(await screen.findByText('Nenhum pedido alocado com prazo em risco.')).toBeInTheDocument();
    expect(screen.getByText('Toda alocação tem chegada prevista.')).toBeInTheDocument();
    expect(screen.getByText('Todo pedido de importação está coberto por reserva ou importação.')).toBeInTheDocument();
  });

  it('filtra por empresa e folga validando de 0 a 90 dias', async () => {
    renderizar();
    await screen.findByText('Prazo em risco (1)');
    expect(obterAlertasImportacao).toHaveBeenCalledWith(expect.objectContaining({ empresa: '', folga: '10' }));
    await screen.findByRole('option', { name: 'Gigante' });

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-gig' } });
    await waitFor(() =>
      expect(obterAlertasImportacao).toHaveBeenLastCalledWith(expect.objectContaining({ empresa: 'emp-gig', folga: '10' }))
    );

    fireEvent.change(screen.getByLabelText('Folga (dias)'), { target: { value: '91' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(await screen.findByText('A folga vai de 0 a 90 dias.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Folga (dias)'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    await waitFor(() =>
      expect(obterAlertasImportacao).toHaveBeenLastCalledWith(expect.objectContaining({ empresa: 'emp-gig', folga: '0' }))
    );
    expect(screen.queryByText('A folga vai de 0 a 90 dias.')).toBeNull();
  });

  it('mostra o erro com nova tentativa', async () => {
    obterAlertasImportacao.mockRejectedValueOnce(new Error('perfil sem permissão para consultar importações'));

    renderizar();

    expect(await screen.findByText('perfil sem permissão para consultar importações')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Prazo em risco (1)')).toBeInTheDocument();
  });
});
