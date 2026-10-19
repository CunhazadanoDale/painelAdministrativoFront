import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as clientesService from '../../services/clientes';
import * as contasService from '../../services/contasBancarias';
import * as empresasService from '../../services/empresas';
import * as titulosService from '../../services/titulosReceber';
import BoletosPendentes from './BoletosPendentes';
import { TAMANHO_PAGINA, useBoletosPendentes } from './useBoletosPendentes';

vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/clientes', () => ({ obterCliente: vi.fn() }));
vi.mock('../../services/contasBancarias', () => ({ obterContaBancaria: vi.fn() }));
vi.mock('../../services/titulosReceber', () => ({ listarBoletosPendentes: vi.fn(), registrarBoletoEnviado: vi.fn() }));

const svc = titulosService;

const TITULO = {
  id: 'tit-1',
  empresa_id: 'emp-mia',
  cliente_id: 'cli-aguia',
  origem: 'manual',
  numero: 'ALG-10',
  parcela: 1,
  vencimento: '2026-10-21',
  valor_centavos: 150000,
  recebido_centavos: 0,
  saldo_centavos: 150000,
  vencido: false,
  conta_bancaria_id: 'cb-itau',
  status: 'em_banco',
  versao: 3,
};

function renderizar() {
  return render(
    <MemoryRouter>
      <BoletosPendentes />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'));
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  clientesService.obterCliente.mockResolvedValue({ dados: { id: 'cli-aguia', nome: 'Construtora Águia' } });
  contasService.obterContaBancaria.mockResolvedValue({ dados: { id: 'cb-itau', apelido: 'Itaú cobrança', banco_nome: 'Itaú' } });
  svc.listarBoletosPendentes.mockResolvedValue({
    dados: [TITULO, { ...TITULO, id: 'tit-2', numero: 'ALG-9', vencimento: '2026-10-15', vencido: true }],
  });
  svc.registrarBoletoEnviado.mockResolvedValue({ dados: TITULO });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useBoletosPendentes', () => {
  it('busca com 5 dias por padrão e volta à primeira página ao trocar o prazo', async () => {
    svc.listarBoletosPendentes.mockResolvedValue({
      dados: Array.from({ length: TAMANHO_PAGINA + 1 }, (_, i) => ({ ...TITULO, id: `t-${i}` })),
    });
    const { result } = renderHook(() => useBoletosPendentes());
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(svc.listarBoletosPendentes).toHaveBeenCalledWith(expect.objectContaining({ dias: 5, pagina: 1 }));
    expect(result.current.temProxima).toBe(true);

    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.filtrar({ dias: 10 }));

    await waitFor(() =>
      expect(svc.listarBoletosPendentes).toHaveBeenLastCalledWith(expect.objectContaining({ dias: 10, pagina: 1 }))
    );
  });
});

describe('BoletosPendentes', () => {
  it('lista os títulos em banco sem boleto com cliente, conta e o selo de vencido', async () => {
    renderizar();

    const linha = (await screen.findByRole('link', { name: 'ALG-10' })).closest('tr');
    expect(within(linha).getByRole('link', { name: 'ALG-10' })).toHaveAttribute('href', '/titulos-receber/tit-1');
    expect(await within(linha).findByText('Construtora Águia')).toBeInTheDocument();
    expect(await within(linha).findByText('Itaú cobrança · Itaú')).toBeInTheDocument();
    expect(within(linha).getByText('21/10/2026')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 1.500,00')).toBeInTheDocument();
    const vencido = screen.getByRole('link', { name: 'ALG-9' }).closest('tr');
    expect(within(vencido).getByText('Vencido')).toBeInTheDocument();
  });

  it('valida o prazo de 0 a 90 dias antes de filtrar', async () => {
    renderizar();
    await screen.findByRole('link', { name: 'ALG-10' });

    fireEvent.change(screen.getByLabelText('Vencendo em até (dias)'), { target: { value: '91' } });
    expect(screen.getByText('O prazo vai de 0 a 90 dias.')).toBeInTheDocument();
    expect(svc.listarBoletosPendentes).not.toHaveBeenLastCalledWith(expect.objectContaining({ dias: 91 }));

    fireEvent.change(screen.getByLabelText('Vencendo em até (dias)'), { target: { value: '15' } });
    await screen.findByRole('option', { name: 'MIA' });
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-mia' } });

    await waitFor(() =>
      expect(svc.listarBoletosPendentes).toHaveBeenLastCalledWith(expect.objectContaining({ dias: 15, empresa: 'emp-mia' }))
    );
  });

  it('registra o envio do boleto pela lista com a versão e recarrega', async () => {
    renderizar();
    const linha = (await screen.findByRole('link', { name: 'ALG-10' })).closest('tr');
    fireEvent.click(within(linha).getByRole('button', { name: 'Registrar envio' }));
    const dialogo = screen.getByRole('dialog', { name: 'Boleto do título ALG-10' });
    fireEvent.change(within(dialogo).getByLabelText('Canal *'), { target: { value: 'whatsapp' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar' }));

    await waitFor(() =>
      expect(svc.registrarBoletoEnviado).toHaveBeenCalledWith('tit-1', {
        canal: 'whatsapp',
        enviado_em: '2026-10-19T12:00:00-03:00',
        versao: 3,
      })
    );
    await waitFor(() => expect(svc.listarBoletosPendentes).toHaveBeenCalledTimes(2));
  });

  it('mostra o vazio e o erro com nova tentativa', async () => {
    svc.listarBoletosPendentes.mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValue({ dados: [] });
    renderizar();

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhum boleto pendente de envio no prazo.')).toBeInTheDocument();
  });
});
