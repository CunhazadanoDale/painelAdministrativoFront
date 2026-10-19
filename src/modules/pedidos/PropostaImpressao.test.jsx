import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import * as pedidosService from '../../services/pedidos';
import PropostaImpressao from './PropostaImpressao';

vi.mock('../../services/pedidos', () => ({ obterDocumentoProposta: vi.fn() }));

const DOCUMENTO = {
  pedido_id: 'ped-57',
  numero: 57,
  revisao: 2,
  identificacao: 'Proposta 57-R2',
  status: 'proposta',
  modelo: 'importacao',
  emitido_em: '2026-10-19',
  validade: '2026-11-03',
  vencida: false,
  empresa: { razao_social: 'MIA Materiais Ltda', nome_fantasia: 'MIA', cnpj: '11.222.333/0001-81', uf: 'PB' },
  cliente: { nome: 'Construtora Alfa', documento: '11.444.777/0001-61', cidade: 'João Pessoa', uf: 'PB', telefone: null, email: 'nf@alfa.com' },
  obra: { nome: 'Residencial Alfa', endereco: 'Rua das Flores, 120 — Centro — João Pessoa/PB — CEP 58000-000' },
  representante: { nome: 'Ana Representações', email: null, telefone: null },
  itens: [
    {
      item_id: 'i-1',
      codigo: 'POR-60',
      nome: 'Porcelanato 60x60',
      unidade_medida: 'm2',
      quantidade: 10,
      preco_unitario_centavos: 1500,
      preco_tabela_centavos: 1800,
      desconto_unitario_centavos: 300,
      subtotal_centavos: 15000,
    },
  ],
  total_centavos: 15000,
  desconto_centavos: 3000,
  condicoes: ['Entrada de 30% na confirmação do pedido.', 'Proposta válida até 03/11/2026.'],
  frete_tipo: 'cif',
  frete_estimado_centavos: 18000,
  numero_pedido_cliente: 'OC-778',
  observacoes: 'Entregar pela manhã',
};

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/pedidos/ped-57/proposta']}>
      <Routes>
        <Route path="/pedidos/:id/proposta" element={<PropostaImpressao />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  pedidosService.obterDocumentoProposta.mockResolvedValue({ dados: DOCUMENTO });
  window.print = vi.fn();
});

afterEach(() => {
  delete window.print;
});

describe('PropostaImpressao', () => {
  it('monta o documento com empresa, cliente, obra, itens, condições e assinatura', async () => {
    renderizar();

    expect(await screen.findByRole('heading', { name: 'Proposta 57-R2' })).toBeInTheDocument();
    expect(screen.getByText('MIA Materiais Ltda')).toBeInTheDocument();
    expect(screen.getByText(/11\.222\.333\/0001-81/)).toBeInTheDocument();
    expect(screen.getByText('Construtora Alfa')).toBeInTheDocument();
    expect(screen.getByText(/Rua das Flores, 120/)).toBeInTheDocument();
    expect(screen.getByText('Ana Representações')).toBeInTheDocument();
    expect(screen.getByText('Emitida em 19/10/2026')).toBeInTheDocument();
    const item = screen.getByText('Porcelanato 60x60').closest('tr');
    expect(within(item).getByText('POR-60')).toBeInTheDocument();
    expect(within(item).getByText('R$ 18,00')).toBeInTheDocument();
    expect(within(item).getByText('R$ 3,00')).toBeInTheDocument();
    expect(screen.getByText('Desconto sobre a tabela: R$ 30,00')).toBeInTheDocument();
    expect(screen.getByText('Entrada de 30% na confirmação do pedido.')).toBeInTheDocument();
    expect(screen.getByText('Entregar pela manhã')).toBeInTheDocument();
    expect(screen.getByText('OC-778')).toBeInTheDocument();
    expect(screen.getByText('De acordo do cliente')).toBeInTheDocument();
  });

  it('avisa a proposta vencida e imprime pelo navegador', async () => {
    pedidosService.obterDocumentoProposta.mockResolvedValue({ dados: { ...DOCUMENTO, vencida: true } });
    renderizar();

    expect(await screen.findByText(/Proposta vencida/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Imprimir/ }));
    expect(window.print).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /Voltar ao pedido/ })).toHaveAttribute('href', '/pedidos/ped-57');
  });

  it('mostra o erro com nova tentativa', async () => {
    pedidosService.obterDocumentoProposta
      .mockRejectedValueOnce(new ErroApi(404, 'registro não encontrado'))
      .mockResolvedValue({ dados: DOCUMENTO });
    renderizar();

    expect(await screen.findByText('registro não encontrado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: 'Proposta 57-R2' })).toBeInTheDocument();
  });
});
