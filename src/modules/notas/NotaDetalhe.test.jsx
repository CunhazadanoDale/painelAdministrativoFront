import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as empresasService from '../../services/empresas';
import * as notasService from '../../services/notasFiscais';
import * as pedidosService from '../../services/pedidos';
import * as produtosService from '../../services/produtos';
import * as titulosService from '../../services/titulosReceber';
import NotaDetalhe from './NotaDetalhe';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/produtos', () => ({ listarProdutos: vi.fn(), obterProduto: vi.fn() }));
vi.mock('../../services/titulosReceber', () => ({ listarTitulos: vi.fn() }));
vi.mock('../../services/pedidos', () => ({ obterPedido: vi.fn(), obterEntrega: vi.fn() }));
vi.mock('../../services/notasFiscais', () => ({
  obterNota: vi.fn(),
  listarEventosNota: vi.fn(),
  ligarItemAoProduto: vi.fn(),
  sincronizarTitulosNota: vi.fn(),
  baixarXmlNota: vi.fn(),
}));

const svc = notasService;
const CONFLITO = 'a nota fiscal foi alterada por outra pessoa; recarregue e tente de novo';

const NOTA = {
  id: 'nf-1',
  chave: '25261011444777000161550010000001231000001237',
  empresa_id: 'emp-mia',
  numero: 123,
  serie: 1,
  emitida_em: '2026-10-10T12:30:00Z',
  tipo_operacao: 'saida',
  finalidade: 'normal',
  natureza: 'venda',
  natureza_operacao: 'VENDA DE MERCADORIA',
  entre_empresas: false,
  cliente_id: 'cli-aguia',
  empresa_destinataria_id: null,
  destinatario_documento: '11444777000161',
  destinatario_nome: 'Construtora Águia',
  cfop_predominante: '5102',
  valor_total_centavos: 109000,
  valor_produtos_centavos: 105000,
  valor_frete_centavos: 3500,
  valor_desconto_centavos: 0,
  numero_pedido_cliente: 'PC-77',
  protocolo: '325260000012345',
  autorizada_em: '2026-10-10T12:31:02Z',
  status: 'autorizada',
  pedido_id: 'ped-12',
  entrega_id: null,
  versao: 2,
  itens: [
    {
      numero_item: 1,
      codigo: 'PISO-01',
      descricao: 'PISO PORCELANATO 60X60',
      produto_id: 'prod-piso',
      ncm: '69072100',
      cfop: '5102',
      unidade: 'M2',
      quantidade: '10.5000',
      valor_unitario: '100.0000000000',
      valor_centavos: 105000,
      desconto_centavos: 0,
    },
    {
      numero_item: 2,
      codigo: 'XYZ-9',
      descricao: 'REJUNTE CINZA',
      produto_id: null,
      ncm: '32149000',
      cfop: '5102',
      unidade: 'UN',
      quantidade: '2.0000',
      valor_unitario: '20.0000000000',
      valor_centavos: 4000,
      desconto_centavos: 0,
    },
  ],
  duplicatas: [
    { id: 'dup-1', numero: '001', vencimento: '2026-11-09T00:00:00Z', valor_centavos: 54500 },
    { id: 'dup-2', numero: '002', vencimento: '2026-12-09T00:00:00Z', valor_centavos: 54500 },
  ],
};

const EVENTOS = [
  { id: 'ev-1', tipo: 'carta_correcao', sequencia: 1, ocorrido_em: '2026-10-11T13:00:00Z', protocolo: '325260000099999', justificativa: 'Corrige o endereço de entrega' },
];

function perfil(financeiro = true) {
  useAutenticacao.mockReturnValue({ financeiro, administrador: false, comercial: false });
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/notas-fiscais/nf-1']}>
      <Routes>
        <Route path="/notas-fiscais/:id" element={<NotaDetalhe />} />
      </Routes>
    </MemoryRouter>
  );
}

async function abrir(nota = NOTA) {
  svc.obterNota.mockResolvedValue({ dados: nota });
  renderizar();
  await screen.findByRole('heading', { name: /NF-e/ });
}

beforeEach(() => {
  vi.clearAllMocks();
  perfil();
  empresasService.listarTodasEmpresas.mockResolvedValue([
    { id: 'emp-mia', nome_fantasia: 'MIA', ativa: true },
    { id: 'emp-gig', nome_fantasia: 'Gigante', ativa: true },
  ]);
  produtosService.obterProduto.mockResolvedValue({ dados: { id: 'prod-piso', nome: 'Porcelanato 60x60', codigo: 'PISO-01' } });
  produtosService.listarProdutos.mockResolvedValue({ dados: [{ id: 'prod-rejunte', nome: 'Rejunte cinza', codigo: 'REJ-1' }] });
  titulosService.listarTitulos.mockImplementation(async ({ origem_id }) => ({
    dados:
      origem_id === 'dup-1'
        ? [{ id: 'tit-1', numero: 'NF 1-123', parcela: 1, origem: 'nota_fiscal_duplicata', status: 'recebido' }]
        : [],
  }));
  svc.listarEventosNota.mockResolvedValue({ dados: EVENTOS });
  pedidosService.obterPedido.mockResolvedValue({ dados: { id: 'ped-12', numero: 12 } });
  svc.ligarItemAoProduto.mockResolvedValue({ dados: NOTA });
  svc.sincronizarTitulosNota.mockResolvedValue({
    dados: { gerados: ['tit-2'], ja_existentes: ['tit-1'], cancelados: [], marcados: [], ignorados: 0 },
  });
  svc.baixarXmlNota.mockResolvedValue(undefined);
});

describe('NotaDetalhe', () => {
  it('mostra os dados da nota, o destinatário e os valores', async () => {
    await abrir();

    expect(screen.getByRole('heading', { name: 'NF-e 1-123' })).toBeInTheDocument();
    expect(screen.getByText('Autorizada')).toBeInTheDocument();
    expect(await screen.findByText('MIA')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Construtora Águia' })).toHaveAttribute('href', '/clientes/cli-aguia');
    expect(screen.getByText('11.444.777/0001-61')).toBeInTheDocument();
    expect(screen.getByText('Venda · VENDA DE MERCADORIA')).toBeInTheDocument();
    expect(screen.getByText('2526 1011 4447 7700 0161 5500 1000 0001 2310 0000 1237')).toBeInTheDocument();
    expect(screen.getByText('10/10/2026 09:30')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.090,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 35,00')).toBeInTheDocument();
    expect(screen.getByText('PC-77')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Pedido 12' })).toHaveAttribute('href', '/pedidos/ped-12');
  });

  it('mostra a nota entre empresas com a empresa destinatária', async () => {
    await abrir({ ...NOTA, entre_empresas: true, natureza: 'transferencia', cliente_id: null, empresa_destinataria_id: 'emp-gig', pedido_id: null });

    expect(await screen.findByText('Gigante')).toBeInTheDocument();
    expect(screen.getByText(/entre empresas do grupo/)).toBeInTheDocument();
  });

  it('lista os itens com o produto ligado e marca os sem produto', async () => {
    await abrir();

    const tabela = screen.getByRole('table', { name: 'Itens da nota' });
    const piso = within(tabela).getByText('PISO-01').closest('tr');
    expect(await within(piso).findByRole('link', { name: 'Porcelanato 60x60' })).toHaveAttribute('href', '/produtos/prod-piso');
    expect(within(piso).getByText('10,5')).toBeInTheDocument();
    expect(within(piso).getByText('R$ 1.050,00')).toBeInTheDocument();
    const rejunte = within(tabela).getByText('XYZ-9').closest('tr');
    expect(within(rejunte).getByText('Sem produto')).toBeInTheDocument();
    expect(within(rejunte).getByRole('button', { name: 'Ligar produto' })).toBeInTheDocument();
  });

  it('liga o item ao produto com a versão da nota e recarrega', async () => {
    await abrir();
    const rejunte = within(screen.getByRole('table', { name: 'Itens da nota' })).getByText('XYZ-9').closest('tr');
    fireEvent.click(within(rejunte).getByRole('button', { name: 'Ligar produto' }));
    const dialogo = screen.getByRole('dialog', { name: 'Ligar o item 2 a um produto' });
    expect(within(dialogo).getByText(/XYZ-9/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Ligar' }));
    expect(await within(dialogo).findByText('Escolha o produto.')).toBeInTheDocument();

    await within(dialogo).findByRole('option', { name: 'Rejunte cinza (REJ-1)' });
    fireEvent.change(within(dialogo).getByLabelText('Produto *'), { target: { value: 'prod-rejunte' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Ligar' }));

    await waitFor(() =>
      expect(svc.ligarItemAoProduto).toHaveBeenCalledWith('nf-1', 2, { versao: 2, produto_id: 'prod-rejunte' })
    );
    await waitFor(() => expect(svc.obterNota).toHaveBeenCalledTimes(2));
  });

  it('trata o conflito ao ligar o produto recarregando a nota', async () => {
    svc.ligarItemAoProduto.mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    await abrir();
    const rejunte = within(screen.getByRole('table', { name: 'Itens da nota' })).getByText('XYZ-9').closest('tr');
    fireEvent.click(within(rejunte).getByRole('button', { name: 'Ligar produto' }));
    const dialogo = screen.getByRole('dialog', { name: 'Ligar o item 2 a um produto' });
    await within(dialogo).findByRole('option', { name: 'Rejunte cinza (REJ-1)' });
    fireEvent.change(within(dialogo).getByLabelText('Produto *'), { target: { value: 'prod-rejunte' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Ligar' }));

    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Recarregar dados' }));
    await waitFor(() => expect(svc.obterNota).toHaveBeenCalledTimes(2));
  });

  it('mostra as duplicatas com o título a receber de cada uma', async () => {
    await abrir();

    const tabela = screen.getByRole('table', { name: 'Duplicatas da nota' });
    const primeira = within(tabela).getByText('001').closest('tr');
    expect(within(primeira).getByText('09/11/2026')).toBeInTheDocument();
    expect(within(primeira).getByText('R$ 545,00')).toBeInTheDocument();
    expect(await within(primeira).findByRole('link', { name: 'NF 1-123/1' })).toHaveAttribute('href', '/titulos-receber/tit-1');
    expect(within(primeira).getByText('Recebido')).toBeInTheDocument();
    const segunda = within(tabela).getByText('002').closest('tr');
    expect(await within(segunda).findByText('Sem título')).toBeInTheDocument();
    expect(titulosService.listarTitulos).toHaveBeenCalledWith(
      expect.objectContaining({ origem: 'nota_fiscal_duplicata', origem_id: 'dup-2' })
    );
  });

  it('sincroniza os títulos e resume o resultado', async () => {
    await abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Sincronizar títulos' }));
    const dialogo = screen.getByRole('dialog', { name: 'Sincronizar os títulos da NF-e 1-123' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Sincronizar' }));

    await waitFor(() => expect(svc.sincronizarTitulosNota).toHaveBeenCalledWith('nf-1'));
    expect(await screen.findByText('Títulos sincronizados: 1 gerado(s), 1 já existente(s), 0 cancelado(s), 0 marcado(s).')).toBeInTheDocument();
    await waitFor(() => expect(titulosService.listarTitulos.mock.calls.length).toBeGreaterThan(2));
  });

  it('não oferece sincronizar títulos em remessa nem em nota entre empresas', async () => {
    await abrir({ ...NOTA, natureza: 'remessa' });

    expect(screen.queryByRole('button', { name: 'Sincronizar títulos' })).toBeNull();
  });

  it('mostra os eventos e baixa o XML original', async () => {
    await abrir();

    const eventos = await screen.findByRole('list', { name: 'Eventos da nota' });
    expect(within(eventos).getByText('Carta de correção')).toBeInTheDocument();
    expect(within(eventos).getByText('Corrige o endereço de entrega')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Baixar XML' }));

    await waitFor(() => expect(svc.baixarXmlNota).toHaveBeenCalledWith('nf-1', 'NF-e 1-123.xml'));
  });

  it('quem não é financeiro só lê: sem ligar produto nem sincronizar', async () => {
    perfil(false);
    await abrir();

    expect(screen.queryByRole('button', { name: 'Ligar produto' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sincronizar títulos' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Baixar XML' })).toBeInTheDocument();
  });

  it('nota cancelada não liga produto e mostra o aviso', async () => {
    await abrir({ ...NOTA, status: 'cancelada' });

    expect(screen.getByText('Cancelada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ligar produto' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Sincronizar títulos' })).toBeInTheDocument();
  });

  it('mostra o erro de carga com nova tentativa', async () => {
    svc.obterNota.mockRejectedValueOnce(new ErroApi(403, 'perfil sem acesso a esta empresa')).mockResolvedValue({ dados: NOTA });
    renderizar();

    expect(await screen.findByText('perfil sem acesso a esta empresa')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: 'NF-e 1-123' })).toBeInTheDocument();
  });
});
