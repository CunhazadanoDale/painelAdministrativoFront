import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import * as categoriasService from '../../services/categoriasFinanceiras';
import * as clientesService from '../../services/clientes';
import * as contasService from '../../services/contasBancarias';
import * as empresasService from '../../services/empresas';
import * as titulosService from '../../services/titulosReceber';
import TituloDetalhe from './TituloDetalhe';

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/clientes', () => ({ listarClientes: vi.fn(), obterCliente: vi.fn() }));
vi.mock('../../services/categoriasFinanceiras', () => ({
  obterArvoreFinanceira: vi.fn(),
  obterCategoriaFinanceira: vi.fn(),
}));
vi.mock('../../services/contasBancarias', () => ({
  listarTodasContasBancarias: vi.fn(),
  obterContaBancaria: vi.fn(),
}));
vi.mock('../../services/titulosReceber', () => ({
  obterTitulo: vi.fn(),
  listarHistoricoTitulo: vi.fn(),
  atualizarTitulo: vi.fn(),
  prorrogarTitulo: vi.fn(),
  enviarAoBanco: vi.fn(),
  retirarDoBanco: vi.fn(),
  registrarBoletoEnviado: vi.fn(),
  cancelarTitulo: vi.fn(),
}));

const svc = titulosService;
const CONFLITO = 'o título foi alterado por outra pessoa; recarregue e tente de novo';

const CARTEIRA = {
  id: 'tit-1',
  empresa_id: 'emp-mia',
  cliente_id: 'cli-aguia',
  origem: 'manual',
  origem_id: null,
  numero: 'ALG-10',
  parcela: 1,
  vencimento: '2026-11-10',
  valor_centavos: 150000,
  recebido_centavos: 0,
  saldo_centavos: 150000,
  vencido: false,
  categoria_financeira_id: 'sub-aluguel',
  competencia: '2026-11',
  conta_bancaria_id: null,
  status: 'carteira',
  boleto_enviado_em: null,
  boleto_canal: null,
  origem_cancelada_em: null,
  cancelado_motivo: null,
  observacao: 'aluguel do galpão',
  versao: 4,
};

const EM_BANCO = {
  ...CARTEIRA,
  status: 'em_banco',
  conta_bancaria_id: 'cb-itau',
  boleto_enviado_em: '2026-10-15T12:30:00Z',
  boleto_canal: 'whatsapp',
};

const HISTORICO = [
  { id: 'h1', evento: 'criado', de_status: null, para_status: 'carteira', descricao: null, criado_em: '2026-10-01T13:00:00Z' },
  { id: 'h2', evento: 'prorrogado', de_status: 'carteira', para_status: 'carteira', descricao: 'cliente pediu', criado_em: '2026-10-05T13:00:00Z' },
];

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/titulos-receber/tit-1']}>
      <Routes>
        <Route path="/titulos-receber/:id" element={<TituloDetalhe />} />
      </Routes>
    </MemoryRouter>
  );
}

async function abrir(titulo = CARTEIRA) {
  svc.obterTitulo.mockResolvedValue({ dados: titulo });
  renderizar();
  await screen.findByRole('heading', { name: /Título/ });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-18T15:00:00Z'));
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  clientesService.obterCliente.mockResolvedValue({ dados: { id: 'cli-aguia', nome: 'Construtora Águia' } });
  clientesService.listarClientes.mockResolvedValue({ dados: [] });
  categoriasService.obterCategoriaFinanceira.mockResolvedValue({ dados: { id: 'sub-aluguel', nome: 'Aluguel recebido' } });
  categoriasService.obterArvoreFinanceira.mockResolvedValue({
    dados: [{ id: 'raiz', nome: 'Receitas', natureza: 'receita', subcategorias: [{ id: 'sub-aluguel', nome: 'Aluguel recebido', lancavel: true }] }],
  });
  contasService.obterContaBancaria.mockResolvedValue({ dados: { id: 'cb-itau', apelido: 'Itaú cobrança', banco_nome: 'Itaú' } });
  contasService.listarTodasContasBancarias.mockResolvedValue([
    { id: 'cb-sic', apelido: 'Sicredi movimento', banco_nome: 'Sicredi' },
    { id: 'cb-itau', apelido: 'Itaú cobrança', banco_nome: 'Itaú' },
  ]);
  svc.listarHistoricoTitulo.mockResolvedValue({ dados: HISTORICO });
  for (const nome of ['atualizarTitulo', 'prorrogarTitulo', 'enviarAoBanco', 'retirarDoBanco', 'registrarBoletoEnviado', 'cancelarTitulo']) {
    svc[nome].mockResolvedValue({ dados: CARTEIRA });
  }
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TituloDetalhe', () => {
  it('mostra os dados do título e o histórico do mais novo para o mais antigo', async () => {
    await abrir();

    expect(screen.getByRole('heading', { name: 'Título ALG-10' })).toBeInTheDocument();
    expect(screen.getByText('Em carteira')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Construtora Águia' })).toHaveAttribute('href', '/clientes/cli-aguia');
    expect(await screen.findByText('Aluguel recebido')).toBeInTheDocument();
    expect(screen.getByText('10/11/2026')).toBeInTheDocument();
    expect(screen.getByText('11/2026')).toBeInTheDocument();
    expect(screen.getByText('aluguel do galpão')).toBeInTheDocument();
    const itens = within(await screen.findByRole('list', { name: 'Histórico do título' })).getAllByRole('listitem');
    expect(itens[0]).toHaveTextContent('Vencimento prorrogado');
    expect(itens[0]).toHaveTextContent('cliente pediu');
    expect(itens[1]).toHaveTextContent('Título criado');
  });

  it('em carteira oferece editar, prorrogar, enviar ao banco e cancelar', async () => {
    await abrir();

    for (const nome of ['Editar', 'Prorrogar', 'Enviar ao banco', 'Cancelar título']) {
      expect(screen.getByRole('button', { name: nome })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Retirar do banco' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Registrar boleto enviado' })).toBeNull();
  });

  it('em banco mostra a conta e o último boleto e oferece retirar, boleto, prorrogar e cancelar', async () => {
    await abrir(EM_BANCO);

    expect(await screen.findByText('Itaú cobrança · Itaú')).toBeInTheDocument();
    expect(screen.getByText(/WhatsApp em 15\/10\/2026/)).toBeInTheDocument();
    for (const nome of ['Retirar do banco', 'Registrar boleto enviado', 'Prorrogar', 'Cancelar título']) {
      expect(screen.getByRole('button', { name: nome })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Enviar ao banco' })).toBeNull();
  });

  it('não oferece edição em título que não é manual nem com recebimento, e cancelado mostra o motivo', async () => {
    await abrir({ ...CARTEIRA, origem: 'pedido', origem_id: 'ped-12' });
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Ver pedido' })).toHaveAttribute('href', '/pedidos/ped-12');
  });

  it('título cancelado não tem ações e mostra o motivo', async () => {
    await abrir({ ...CARTEIRA, status: 'cancelado', cancelado_motivo: 'lançado em duplicidade' });

    expect(screen.getByText('lançado em duplicidade')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Prorrogar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancelar título' })).toBeNull();
  });

  it('com a origem cancelada avisa e não deixa enviar ao banco', async () => {
    await abrir({ ...CARTEIRA, origem: 'nota_fiscal_duplicata', origem_cancelada_em: '2026-10-16T12:00:00Z' });

    expect(screen.getByText(/A origem deste título foi cancelada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar ao banco' })).toBeNull();
  });

  it('prorroga com novo vencimento posterior e motivo', async () => {
    await abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Prorrogar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Prorrogar título ALG-10' });
    fireEvent.change(within(dialogo).getByLabelText('Novo vencimento *'), { target: { value: '2026-11-10' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Prorrogar' }));
    expect(await within(dialogo).findByText('O novo vencimento precisa ser depois de 10/11/2026.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Novo vencimento *'), { target: { value: '2026-12-10' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Prorrogar' }));
    expect(await within(dialogo).findByText('Informe o motivo da prorrogação.')).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('Motivo *'), { target: { value: ' cliente pediu ' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Prorrogar' }));

    await waitFor(() =>
      expect(svc.prorrogarTitulo).toHaveBeenCalledWith('tit-1', { vencimento: '2026-12-10', motivo: 'cliente pediu', versao: 4 })
    );
    await waitFor(() => expect(svc.obterTitulo).toHaveBeenCalledTimes(2));
  });

  it('envia ao banco escolhendo a conta de cobrança', async () => {
    await abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar ao banco' }));
    const dialogo = screen.getByRole('dialog', { name: 'Enviar título ALG-10 ao banco' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Enviar' }));
    expect(await within(dialogo).findByText('Escolha a conta de cobrança.')).toBeInTheDocument();

    await within(dialogo).findByRole('option', { name: 'Itaú cobrança · Itaú' });
    fireEvent.change(within(dialogo).getByLabelText('Conta de cobrança *'), { target: { value: 'cb-itau' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(svc.enviarAoBanco).toHaveBeenCalledWith('tit-1', { conta_bancaria_id: 'cb-itau', versao: 4 }));
    expect(contasService.listarTodasContasBancarias).toHaveBeenCalledWith(
      expect.objectContaining({ empresa: 'emp-mia', ativa: true })
    );
  });

  it('retira do banco com a versão', async () => {
    await abrir(EM_BANCO);
    fireEvent.click(screen.getByRole('button', { name: 'Retirar do banco' }));
    const dialogo = screen.getByRole('dialog', { name: 'Retirar título ALG-10 do banco' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Retirar' }));

    await waitFor(() => expect(svc.retirarDoBanco).toHaveBeenCalledWith('tit-1', 4));
  });

  it('registra o boleto enviado com o canal e o instante em Brasília', async () => {
    await abrir(EM_BANCO);
    fireEvent.click(screen.getByRole('button', { name: 'Registrar boleto enviado' }));
    const dialogo = screen.getByRole('dialog', { name: 'Boleto do título ALG-10' });
    expect(within(dialogo).getByLabelText('Enviado em *')).toHaveValue('2026-10-18T12:00');

    fireEvent.change(within(dialogo).getByLabelText('Enviado em *'), { target: { value: '2026-10-19T08:00' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar' }));
    expect(await within(dialogo).findByText('O envio não pode estar no futuro.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Canal *'), { target: { value: 'email' } });
    fireEvent.change(within(dialogo).getByLabelText('Enviado em *'), { target: { value: '2026-10-18T09:30' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar' }));

    await waitFor(() =>
      expect(svc.registrarBoletoEnviado).toHaveBeenCalledWith('tit-1', {
        canal: 'email',
        enviado_em: '2026-10-18T09:30:00-03:00',
        versao: 4,
      })
    );
  });

  it('cancela com motivo e trata o conflito de versão recarregando', async () => {
    svc.cancelarTitulo.mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    await abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar título' }));
    const dialogo = screen.getByRole('dialog', { name: 'Cancelar título ALG-10' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar o título' }));
    expect(await within(dialogo).findByText('Informe o motivo do cancelamento.')).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('Motivo *'), { target: { value: 'lançado em duplicidade' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar o título' }));

    await waitFor(() =>
      expect(svc.cancelarTitulo).toHaveBeenCalledWith('tit-1', { motivo: 'lançado em duplicidade', versao: 4 })
    );
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Recarregar dados' }));
    await waitFor(() => expect(svc.obterTitulo).toHaveBeenCalledTimes(2));
  });

  it('edita o título manual mantendo o vencimento vencido e enviando a versão', async () => {
    await abrir({ ...CARTEIRA, vencimento: '2026-10-10', vencido: true });
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Editar título ALG-10' });
    expect(within(dialogo).getByLabelText('Número *')).toHaveValue('ALG-10');
    expect(within(dialogo).queryByLabelText('Conta de cobrança')).toBeNull();
    await within(dialogo).findByRole('option', { name: 'Aluguel recebido' });

    fireEvent.change(within(dialogo).getByLabelText('Valor *'), { target: { value: '1.600,00' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(svc.atualizarTitulo).toHaveBeenCalledWith('tit-1', {
        numero: 'ALG-10',
        parcela: 1,
        vencimento: '2026-10-10',
        valor_centavos: 160000,
        categoria_financeira_id: 'sub-aluguel',
        competencia: '2026-11',
        observacao: 'aluguel do galpão',
        versao: 4,
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('na edição com conflito recarrega só a versão e mantém o formulário', async () => {
    svc.atualizarTitulo.mockRejectedValueOnce(new ErroApi(409, CONFLITO));
    await abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Editar título ALG-10' });
    await within(dialogo).findByRole('option', { name: 'Aluguel recebido' });
    fireEvent.change(within(dialogo).getByLabelText('Número *'), { target: { value: 'ALG-11' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    svc.obterTitulo.mockResolvedValue({ dados: { ...CARTEIRA, versao: 5 } });
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Recarregar dados' }));
    expect(await within(dialogo).findByText(/versão 5/)).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Número *')).toHaveValue('ALG-11');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(svc.atualizarTitulo).toHaveBeenLastCalledWith('tit-1', expect.objectContaining({ numero: 'ALG-11', versao: 5 }))
    );
  });

  it('mostra o erro de carga com nova tentativa', async () => {
    svc.obterTitulo.mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValue({ dados: CARTEIRA });
    renderizar();

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: 'Título ALG-10' })).toBeInTheDocument();
  });
});
