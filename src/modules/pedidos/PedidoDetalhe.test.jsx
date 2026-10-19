import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as gruposService from '../../services/clienteGrupos';
import * as clientesService from '../../services/clientes';
import * as comissoesService from '../../services/comissoes';
import * as contasService from '../../services/contasBancarias';
import * as empresasService from '../../services/empresas';
import * as pedidosService from '../../services/pedidos';
import * as produtosService from '../../services/produtos';
import * as representantesService from '../../services/representantes';
import * as titulosService from '../../services/titulosReceber';
import PedidoDetalhe from './PedidoDetalhe';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/locais', () => ({ listarTodosLocais: vi.fn(async () => []) }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/clienteGrupos', () => ({ listarTodosGrupos: vi.fn() }));
vi.mock('../../services/representantes', () => ({ listarTodosRepresentantes: vi.fn() }));
vi.mock('../../services/clientes', () => ({
  listarClientes: vi.fn(),
  obterCliente: vi.fn(),
  listarObras: vi.fn(),
  obterObra: vi.fn(),
}));
vi.mock('../../services/produtos', () => ({ listarProdutos: vi.fn(), obterProduto: vi.fn() }));
vi.mock('../../services/pedidos', () => ({
  obterPedido: vi.fn(),
  atualizarPedido: vi.fn(),
  confirmarPedido: vi.fn(),
  reservarPendencias: vi.fn(),
  registrarEntrada: vi.fn(),
  cancelarPedido: vi.fn(),
  listarHistoricoPedido: vi.fn(),
  listarEntregasDoPedido: vi.fn(),
  gerarTituloEntrada: vi.fn(),
  listarModelosVenda: vi.fn(async () => ({ dados: [] })),
}));
vi.mock('../../services/tabelaPrecos', () => ({ listarPrecosVigentes: vi.fn(async () => ({ dados: [] })) }));
vi.mock('../../services/titulosReceber', () => ({ listarTitulos: vi.fn() }));
vi.mock('../../services/contasBancarias', () => ({ listarTodasContasBancarias: vi.fn() }));
vi.mock('../../services/comissoes', () => ({ obterComissaoDoPedido: vi.fn(), definirComissaoDoPedido: vi.fn() }));

const svc = pedidosService;
const CONFLITO = 'o pedido foi alterado por outra pessoa; recarregue e tente de novo';

const PROPOSTA = {
  id: 'ped-12',
  empresa_id: 'emp-mia',
  numero: 12,
  cliente_id: 'cli-aguia',
  obra_id: 'obra-mar',
  representante_id: 'rep-jose',
  modelo: 'pronta_entrega',
  condicao: { entrada_bp: 0, prazo_boleto_dias: 30, prazo_entrega_dias: null },
  prazo_limite: '2026-12-20T00:00:00Z',
  numero_pedido_cliente: 'OC-778',
  observacoes: 'Entregar pela manhã',
  status: 'proposta',
  valor_total_centavos: 359000,
  entrada_paga_em: null,
  entrada_paga_centavos: null,
  cancelado_motivo: null,
  valor_a_devolver_centavos: null,
  versao: 3,
  itens: [
    {
      id: 'item-1',
      produto_id: 'prod-cimento',
      quantidade: 100,
      preco_unitario_centavos: 3590,
      subtotal_centavos: 359000,
      quantidade_entregue: 0,
      restante: 100,
      reservado: 0,
      falta_cobrir: 100,
    },
  ],
  reservas: [],
};

const IMPORTACAO = {
  ...PROPOSTA,
  modelo: 'importacao',
  condicao: { entrada_bp: 3000, prazo_boleto_dias: null, prazo_entrega_dias: 120 },
  prazo_limite: null,
  status: 'confirmado',
  valor_total_centavos: 100001,
  itens: [{ ...PROPOSTA.itens[0], reservado: 60, falta_cobrir: 40 }],
};

function perfil({ comercial = true, financeiro = false } = {}) {
  useAutenticacao.mockReturnValue({ comercial, financeiro, administrador: false });
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/pedidos/ped-12']}>
      <Routes>
        <Route path="/pedidos/:id" element={<PedidoDetalhe />} />
      </Routes>
    </MemoryRouter>
  );
}

async function carregar() {
  renderizar();
  await screen.findByRole('heading', { name: /Pedido 12/ });
}

function botao(nome) {
  return screen.getByRole('button', { name: nome });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-18T15:00:00Z'));
  perfil();
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  gruposService.listarTodosGrupos.mockResolvedValue([]);
  representantesService.listarTodosRepresentantes.mockResolvedValue([{ id: 'rep-jose', nome: 'José Vendas', ativo: true }]);
  clientesService.obterCliente.mockResolvedValue({ dados: { id: 'cli-aguia', nome: 'Construtora Águia' } });
  clientesService.obterObra.mockResolvedValue({ dados: { id: 'obra-mar', nome: 'Residencial Mar Azul' } });
  clientesService.listarClientes.mockResolvedValue({ dados: [] });
  clientesService.listarObras.mockResolvedValue({ dados: [] });
  produtosService.obterProduto.mockResolvedValue({ dados: { id: 'prod-cimento', nome: 'Cimento CP II 50' } });
  produtosService.listarProdutos.mockResolvedValue({ dados: [] });
  svc.obterPedido.mockResolvedValue({ dados: PROPOSTA });
  svc.listarHistoricoPedido.mockResolvedValue({
    dados: [{ id: 'h1', acao: 'criado', status_anterior: null, status_novo: 'proposta', detalhe: '', criado_em: '2026-10-10T13:00:00Z' }],
  });
  svc.listarEntregasDoPedido.mockResolvedValue({ dados: [] });
  svc.gerarTituloEntrada.mockResolvedValue({ dados: { id: 'tit-9' } });
  titulosService.listarTitulos.mockResolvedValue({ dados: [] });
  comissoesService.obterComissaoDoPedido.mockResolvedValue({
    dados: { pedido_id: 'ped-12', representante_id: 'rep-jose', percentual_bp: 300, origem: 'padrao', definido: false, versao: null },
  });
  contasService.listarTodasContasBancarias.mockResolvedValue([
    { id: 'cb-sic', apelido: 'Sicredi movimento', banco_nome: 'Sicredi' },
    { id: 'cb-itau', apelido: 'Itaú cobrança', banco_nome: 'Itaú' },
  ]);
  [svc.atualizarPedido, svc.confirmarPedido, svc.reservarPendencias, svc.registrarEntrada, svc.cancelarPedido].forEach(
    (funcao) => funcao.mockResolvedValue({ dados: PROPOSTA })
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PedidoDetalhe', () => {
  it('mostra o cabeçalho, as condições, os itens com a cobertura e o histórico', async () => {
    await carregar();

    expect(screen.getByText('Proposta')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Construtora Águia' })).toHaveAttribute('href', '/clientes/cli-aguia');
    expect(await screen.findByText('Residencial Mar Azul')).toBeInTheDocument();
    expect(await screen.findByText('José Vendas')).toBeInTheDocument();
    expect(await screen.findByText('MIA')).toBeInTheDocument();
    expect(screen.getByText('Boleto em 30 dias')).toBeInTheDocument();
    expect(screen.getByText('20/12/2026')).toBeInTheDocument();
    expect(screen.getByText('OC-778')).toBeInTheDocument();
    const item = (await screen.findByText('Cimento CP II 50')).closest('tr');
    expect(within(item).getByText('R$ 35,90')).toBeInTheDocument();
    expect(within(item).getAllByText('100')).toHaveLength(3);
    expect(await screen.findByText('Proposta criada')).toBeInTheDocument();
  });

  it('mostra o erro de acesso e tenta de novo', async () => {
    svc.obterPedido.mockRejectedValueOnce(new ErroApi(403, 'perfil sem acesso a esta empresa'));

    renderizar();

    expect(await screen.findByText('perfil sem acesso a esta empresa')).toBeInTheDocument();
    fireEvent.click(botao('Tentar novamente'));
    expect(await screen.findByRole('heading', { name: /Pedido 12/ })).toBeInTheDocument();
  });

  it('oferece editar, confirmar e cancelar na proposta para o comercial', async () => {
    await carregar();

    expect(botao('Editar proposta')).toBeInTheDocument();
    expect(botao('Confirmar')).toBeInTheDocument();
    expect(botao('Cancelar pedido')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reservar pendências' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Registrar entrada' })).toBeNull();
  });

  it('quem não é comercial nem financeiro só lê', async () => {
    perfil({ comercial: false });

    await carregar();

    expect(screen.queryByRole('button', { name: 'Editar proposta' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Confirmar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancelar pedido' })).toBeNull();
  });

  it('edita a proposta pelo formulário com a versão lida', async () => {
    await carregar();

    fireEvent.click(botao('Editar proposta'));
    const dialogo = screen.getByRole('dialog', { name: 'Editar Proposta 12' });
    fireEvent.change(within(dialogo).getByLabelText('Nº do pedido do cliente'), { target: { value: 'OC-779' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(svc.atualizarPedido).toHaveBeenCalledWith(
        'ped-12',
        expect.objectContaining({
          numero_pedido_cliente: 'OC-779',
          versao: 3,
          itens: [{ produto_id: 'prod-cimento', quantidade: 100, preco_unitario_centavos: 3590 }],
        })
      )
    );
  });

  it('mostra a revisão, a validade, o frete estimado e o desconto de cada item da proposta', async () => {
    svc.obterPedido.mockResolvedValue({
      dados: {
        ...PROPOSTA,
        revisao: 2,
        validade: '2026-11-03T00:00:00Z',
        vencida: false,
        frete_tipo: 'cif',
        frete_estimado_centavos: 18000,
        itens: [{ ...PROPOSTA.itens[0], preco_tabela_centavos: 3800, desconto_unitario_centavos: 210 }],
      },
    });
    await carregar();

    expect(screen.getByText('Proposta 12-R2')).toBeInTheDocument();
    expect(screen.getByText('03/11/2026')).toBeInTheDocument();
    expect(screen.getByText('CIF, estimado em R$ 180,00')).toBeInTheDocument();
    const item = (await screen.findByText('Cimento CP II 50')).closest('tr');
    expect(within(item).getByText('R$ 38,00')).toBeInTheDocument();
    expect(within(item).getByText('R$ 2,10')).toBeInTheDocument();
  });

  it('marca a proposta vencida e avisa na confirmação', async () => {
    svc.obterPedido.mockResolvedValue({ dados: { ...PROPOSTA, validade: '2026-10-10T00:00:00Z', vencida: true } });
    await carregar();

    expect(screen.getByText('Vencida')).toBeInTheDocument();
    fireEvent.click(botao('Confirmar'));
    const dialogo = screen.getByRole('dialog', { name: 'Confirmar pedido 12' });
    expect(within(dialogo).getByText(/venceu em 10\/10\/2026/)).toBeInTheDocument();
  });

  it('confirma o pedido depois de avisar sobre a reserva', async () => {
    await carregar();

    fireEvent.click(botao('Confirmar'));
    const dialogo = screen.getByRole('dialog', { name: 'Confirmar pedido 12' });
    expect(within(dialogo).getByText(/reserva o disponível/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar pedido' }));

    await waitFor(() => expect(svc.confirmarPedido).toHaveBeenCalledWith('ped-12', 3));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(svc.obterPedido).toHaveBeenCalledTimes(2));
  });

  it('no conflito de versão avisa e recarrega o pedido', async () => {
    svc.confirmarPedido.mockRejectedValue(new ErroApi(409, CONFLITO));
    await carregar();

    fireEvent.click(botao('Confirmar'));
    const dialogo = screen.getByRole('dialog', { name: 'Confirmar pedido 12' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar pedido' }));
    expect(await within(dialogo).findByText(CONFLITO)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Recarregar dados' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(svc.obterPedido).toHaveBeenCalledTimes(2));
  });

  it('cancela a proposta exigindo o motivo, sem valor a devolver', async () => {
    await carregar();

    fireEvent.click(botao('Cancelar pedido'));
    const dialogo = screen.getByRole('dialog', { name: 'Cancelar pedido 12' });
    expect(within(dialogo).queryByLabelText('Valor a devolver')).toBeNull();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar o pedido' }));
    expect(await within(dialogo).findByText('Informe o motivo do cancelamento.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Motivo *'), { target: { value: ' cliente desistiu ' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar o pedido' }));

    await waitFor(() =>
      expect(svc.cancelarPedido).toHaveBeenCalledWith('ped-12', {
        versao: 3,
        motivo: 'cliente desistiu',
        valor_a_devolver_centavos: null,
      })
    );
  });

  it('com entrada paga sugere devolver a entrada e não deixa passar dela', async () => {
    svc.obterPedido.mockResolvedValue({
      dados: { ...IMPORTACAO, entrada_paga_em: '2026-10-10T00:00:00Z', entrada_paga_centavos: 30000 },
    });
    await carregar();

    fireEvent.click(botao('Cancelar pedido'));
    const dialogo = screen.getByRole('dialog', { name: 'Cancelar pedido 12' });
    expect(within(dialogo).getByLabelText('Valor a devolver')).toHaveValue('300,00');
    fireEvent.change(within(dialogo).getByLabelText('Motivo *'), { target: { value: 'atraso' } });
    fireEvent.change(within(dialogo).getByLabelText('Valor a devolver'), { target: { value: '400,00' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar o pedido' }));
    expect(await within(dialogo).findByText('O valor a devolver vai de zero até a entrada paga (R$ 300,00).')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Valor a devolver'), { target: { value: '250,00' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar o pedido' }));

    await waitFor(() =>
      expect(svc.cancelarPedido).toHaveBeenCalledWith('ped-12', {
        versao: 3,
        motivo: 'atraso',
        valor_a_devolver_centavos: 25000,
      })
    );
  });

  it('reserva as pendências do pedido confirmado com falta a cobrir', async () => {
    svc.obterPedido.mockResolvedValue({ dados: IMPORTACAO });
    await carregar();

    expect(screen.queryByRole('button', { name: 'Editar proposta' })).toBeNull();
    fireEvent.click(botao('Reservar pendências'));
    const dialogo = screen.getByRole('dialog', { name: 'Reservar pendências do pedido 12' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reservar' }));

    await waitFor(() => expect(svc.reservarPendencias).toHaveBeenCalledWith('ped-12', 3));
  });

  it('o financeiro registra a entrada da importação com a data de hoje e o valor sugerido', async () => {
    perfil({ comercial: false, financeiro: true });
    svc.obterPedido.mockResolvedValue({ dados: IMPORTACAO });
    await carregar();

    expect(screen.queryByRole('button', { name: 'Reservar pendências' })).toBeNull();
    fireEvent.click(botao('Registrar entrada'));
    const dialogo = screen.getByRole('dialog', { name: 'Registrar entrada do pedido 12' });
    expect(within(dialogo).getByLabelText('Pago em *')).toHaveValue('2026-10-18');
    expect(within(dialogo).getByLabelText('Valor pago *')).toHaveValue('300,00');

    fireEvent.change(within(dialogo).getByLabelText('Pago em *'), { target: { value: '2026-10-19' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar' }));
    expect(await within(dialogo).findByText('A data do pagamento não pode estar no futuro.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Pago em *'), { target: { value: '2026-10-15' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar' }));

    await waitFor(() =>
      expect(svc.registrarEntrada).toHaveBeenCalledWith('ped-12', {
        versao: 3,
        pago_em: '2026-10-15',
        valor_centavos: 30000,
      })
    );
  });

  it('mostra a entrada registrada e o cancelamento com o valor a devolver', async () => {
    svc.obterPedido.mockResolvedValue({
      dados: {
        ...IMPORTACAO,
        status: 'cancelado',
        entrada_paga_em: '2026-10-10T00:00:00Z',
        entrada_paga_centavos: 30000,
        prazo_limite: '2027-02-07T00:00:00Z',
        cancelado_motivo: 'cliente desistiu',
        valor_a_devolver_centavos: 25000,
      },
    });

    await carregar();

    expect(screen.getByText('R$ 300,00 em 10/10/2026')).toBeInTheDocument();
    expect(screen.getByText('cliente desistiu')).toBeInTheDocument();
    expect(screen.getByText('R$ 250,00')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar pedido' })).toBeNull();
  });

  it('o financeiro gera o título de entrada da importação com vencimento e conta de cobrança', async () => {
    perfil({ comercial: false, financeiro: true });
    svc.obterPedido.mockResolvedValue({ dados: IMPORTACAO });
    await carregar();

    expect(await screen.findByText('Não gerado')).toBeInTheDocument();
    expect(titulosService.listarTitulos).toHaveBeenCalledWith(
      expect.objectContaining({ origem: 'pedido', origem_id: 'ped-12' })
    );
    fireEvent.click(botao('Gerar título de entrada'));
    const dialogo = screen.getByRole('dialog', { name: 'Título de entrada do pedido 12' });
    expect(within(dialogo).getByText(/R\$ 300,00/)).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Vencimento *')).toHaveValue('2026-10-18');
    fireEvent.change(within(dialogo).getByLabelText('Vencimento *'), { target: { value: '2026-10-25' } });
    await within(dialogo).findByRole('option', { name: 'Itaú cobrança · Itaú' });
    fireEvent.change(within(dialogo).getByLabelText('Conta de cobrança'), { target: { value: 'cb-itau' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Gerar título' }));

    await waitFor(() =>
      expect(svc.gerarTituloEntrada).toHaveBeenCalledWith('ped-12', { vencimento: '2026-10-25', conta_bancaria_id: 'cb-itau' })
    );
    expect(contasService.listarTodasContasBancarias).toHaveBeenCalledWith(
      expect.objectContaining({ empresa: 'emp-mia', ativa: true })
    );
    await waitFor(() => expect(titulosService.listarTitulos).toHaveBeenCalledTimes(2));
  });

  it('com o título de entrada já gerado mostra o link e não oferece gerar de novo', async () => {
    perfil({ comercial: false, financeiro: true });
    svc.obterPedido.mockResolvedValue({ dados: IMPORTACAO });
    titulosService.listarTitulos.mockResolvedValue({
      dados: [{ id: 'tit-9', numero: 'PED-12', parcela: 1, origem: 'pedido', status: 'em_banco' }],
    });
    await carregar();

    expect(await screen.findByRole('link', { name: 'PED-12' })).toHaveAttribute('href', '/titulos-receber/tit-9');
    expect(screen.getByText('Em banco')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gerar título de entrada' })).toBeNull();
  });

  it('o comercial não consulta o título de entrada', async () => {
    svc.obterPedido.mockResolvedValue({ dados: IMPORTACAO });
    await carregar();

    expect(screen.queryByText('Título de entrada')).toBeNull();
    expect(titulosService.listarTitulos).not.toHaveBeenCalled();
  });

  it('mostra a comissão do representante para o comercial', async () => {
    await carregar();
    expect(await screen.findByText('3,00%')).toBeInTheDocument();
    expect(comissoesService.obterComissaoDoPedido).toHaveBeenCalledWith('ped-12', expect.anything());
  });

  it('não consulta a comissão para quem não é comercial nem financeiro', async () => {
    perfil({ comercial: false });
    await carregar();

    expect(screen.queryByText('Comissão do representante')).toBeNull();
    expect(comissoesService.obterComissaoDoPedido).not.toHaveBeenCalled();
  });

  it('mostra o painel de entregas do pedido', async () => {
    await carregar();

    expect(await screen.findByText('Nenhuma entrega programada.')).toBeInTheDocument();
    expect(svc.listarEntregasDoPedido).toHaveBeenCalledWith('ped-12', expect.anything());
  });
});
