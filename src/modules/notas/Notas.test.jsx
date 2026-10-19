import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as arquivosService from '../../services/arquivos';
import * as empresasService from '../../services/empresas';
import * as notasService from '../../services/notasFiscais';
import Notas from './Notas';
import { TAMANHO_PAGINA, useNotas } from './useNotas';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/arquivos', () => ({ removerArquivo: vi.fn(async () => null) }));
vi.mock('../../services/notasFiscais', () => ({
  listarNotas: vi.fn(),
  enviarXml: vi.fn(),
  importarNota: vi.fn(),
  importarEventoNota: vi.fn(),
}));

const svc = notasService;

const VENDA = {
  id: 'nf-1',
  empresa_id: 'emp-mia',
  numero: 123,
  serie: 1,
  emitida_em: '2026-10-10T12:30:00Z',
  natureza: 'venda',
  entre_empresas: false,
  destinatario_nome: 'Construtora Águia',
  valor_total_centavos: 109000,
  status: 'autorizada',
  pedido_id: 'ped-12',
};

const TRANSFERENCIA = {
  ...VENDA,
  id: 'nf-2',
  numero: 124,
  emitida_em: '2026-10-11T02:30:00Z',
  natureza: 'transferencia',
  entre_empresas: true,
  destinatario_nome: 'Gigante Filial',
  status: 'cancelada',
  pedido_id: null,
};

function perfil(financeiro = true) {
  useAutenticacao.mockReturnValue({ financeiro, administrador: false, comercial: false });
}

function renderizar() {
  return render(
    <MemoryRouter>
      <Notas />
    </MemoryRouter>
  );
}

function arquivoXml(nome = 'nota.xml') {
  return new File(['<nfeProc/>'], nome, { type: 'text/xml' });
}

beforeEach(() => {
  vi.clearAllMocks();
  perfil();
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  svc.listarNotas.mockResolvedValue({ dados: [VENDA, TRANSFERENCIA] });
  svc.enviarXml.mockResolvedValue({ id: 'arq-1' });
  svc.importarNota.mockResolvedValue({ dados: { ...VENDA, avisos: [] } });
  svc.importarEventoNota.mockResolvedValue({
    dados: { evento: { tipo: 'cancelamento' }, nota_fiscal: { ...VENDA, status: 'cancelada' }, titulos_cancelados: ['t-1', 't-2'], titulos_marcados: ['t-3'], avisos: [] },
  });
});

describe('useNotas', () => {
  it('carrega a primeira página e filtra voltando para a página 1', async () => {
    svc.listarNotas.mockResolvedValue({ dados: Array.from({ length: TAMANHO_PAGINA + 1 }, (_, i) => ({ ...VENDA, id: `n-${i}` })) });
    const { result } = renderHook(() => useNotas());
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.notas).toHaveLength(TAMANHO_PAGINA);

    act(() => result.current.irParaProxima());
    await waitFor(() => expect(result.current.pagina).toBe(2));
    act(() => result.current.filtrar({ natureza: 'venda', semPedido: true }));

    await waitFor(() =>
      expect(svc.listarNotas).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1, natureza: 'venda', semPedido: true }))
    );
  });
});

describe('Notas', () => {
  it('lista as notas com série-número, data em Brasília, destinatário, natureza, valor, status e pedido', async () => {
    renderizar();

    const venda = (await screen.findByRole('link', { name: '1-123' })).closest('tr');
    expect(within(venda).getByRole('link', { name: '1-123' })).toHaveAttribute('href', '/notas-fiscais/nf-1');
    expect(within(venda).getByText('10/10/2026')).toBeInTheDocument();
    expect(within(venda).getByText('Construtora Águia')).toBeInTheDocument();
    expect(within(venda).getByText('Venda')).toBeInTheDocument();
    expect(within(venda).getByText('R$ 1.090,00')).toBeInTheDocument();
    expect(within(venda).getByText('Autorizada')).toBeInTheDocument();
    expect(within(venda).getByRole('link', { name: 'Ver pedido' })).toHaveAttribute('href', '/pedidos/ped-12');

    const transferencia = screen.getByRole('link', { name: '1-124' }).closest('tr');
    expect(within(transferencia).getByText('10/10/2026')).toBeInTheDocument();
    expect(within(transferencia).getByText('Entre empresas')).toBeInTheDocument();
    expect(within(transferencia).getByText('Cancelada')).toBeInTheDocument();
  });

  it('filtra por empresa, natureza, status, entre empresas, sem pedido, número, emissão e chave', async () => {
    renderizar();
    await screen.findByRole('link', { name: '1-123' });
    await screen.findByRole('option', { name: 'MIA' });

    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'emp-mia' } });
    fireEvent.change(screen.getByLabelText('Natureza'), { target: { value: 'remessa' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'autorizada' } });
    fireEvent.change(screen.getByLabelText('Entre empresas'), { target: { value: 'false' } });
    fireEvent.click(screen.getByLabelText('Sem pedido'));
    fireEvent.change(screen.getByLabelText('Buscar pelo número'), { target: { value: ' 123 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    fireEvent.click(screen.getByRole('button', { name: /Mais filtros/ }));
    fireEvent.change(screen.getByLabelText('Emitida de'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Emitida até'), { target: { value: '2026-10-31' } });
    fireEvent.change(screen.getByLabelText('Chave de acesso'), { target: { value: ' 2526 ' } });
    fireEvent.blur(screen.getByLabelText('Chave de acesso'));

    await waitFor(() =>
      expect(svc.listarNotas).toHaveBeenLastCalledWith(
        expect.objectContaining({
          empresa: 'emp-mia',
          natureza: 'remessa',
          status: 'autorizada',
          entreEmpresas: 'false',
          semPedido: true,
          numero: '123',
          emitida_de: '2026-10-01',
          emitida_ate: '2026-10-31',
          chave: '2526',
          pagina: 1,
        })
      )
    );
  });

  it('mostra o vazio conforme o filtro e o erro com nova tentativa', async () => {
    svc.listarNotas.mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValue({ dados: [] });
    renderizar();

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhuma nota fiscal nas empresas do seu acesso.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'cancelada' } });
    expect(await screen.findByText('Nenhuma nota fiscal encontrada com estes filtros.')).toBeInTheDocument();
  });

  it('quem não é financeiro só lê, sem importar', async () => {
    perfil(false);
    renderizar();
    await screen.findByRole('link', { name: '1-123' });

    expect(screen.queryByRole('button', { name: /Importar NF-e/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Importar evento/ })).toBeNull();
  });

  it('importa o XML da nota, mostra os avisos e recarrega a lista', async () => {
    svc.importarNota.mockResolvedValue({ dados: { ...VENDA, avisos: ['itens_sem_produto', 'cliente_criado'] } });
    renderizar();
    await screen.findByRole('link', { name: '1-123' });
    fireEvent.click(screen.getByRole('button', { name: /Importar NF-e/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Importar NF-e' });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Importar' }));
    expect(await within(dialogo).findByText('Escolha o arquivo XML.')).toBeInTheDocument();

    const xml = arquivoXml();
    fireEvent.change(within(dialogo).getByLabelText('XML da nota *'), { target: { files: [xml] } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Importar' }));

    expect(await within(dialogo).findByText('Nota 1-123 importada.')).toBeInTheDocument();
    expect(svc.enviarXml).toHaveBeenCalledWith(xml, expect.anything());
    expect(svc.importarNota).toHaveBeenCalledWith({ arquivo_id: 'arq-1' });
    expect(within(dialogo).getByText(/itens sem produto cadastrado/)).toBeInTheDocument();
    expect(within(dialogo).getByText(/cliente foi criado/)).toBeInTheDocument();
    expect(within(dialogo).getByRole('link', { name: 'Abrir a nota' })).toHaveAttribute('href', '/notas-fiscais/nf-1');
    await waitFor(() => expect(svc.listarNotas).toHaveBeenCalledTimes(2));
  });

  it('na recusa da importação mostra o erro e apaga o arquivo enviado', async () => {
    svc.importarNota.mockRejectedValue(new ErroApi(409, 'já existe uma nota fiscal com esta chave de acesso'));
    renderizar();
    await screen.findByRole('link', { name: '1-123' });
    fireEvent.click(screen.getByRole('button', { name: /Importar NF-e/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Importar NF-e' });
    fireEvent.change(within(dialogo).getByLabelText('XML da nota *'), { target: { files: [arquivoXml()] } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Importar' }));

    expect(await within(dialogo).findByText('já existe uma nota fiscal com esta chave de acesso')).toBeInTheDocument();
    expect(arquivosService.removerArquivo).toHaveBeenCalledWith('arq-1');
  });

  it('recusa arquivo que não é XML ou passa de 10 MB sem enviar', async () => {
    renderizar();
    await screen.findByRole('link', { name: '1-123' });
    fireEvent.click(screen.getByRole('button', { name: /Importar NF-e/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Importar NF-e' });

    fireEvent.change(within(dialogo).getByLabelText('XML da nota *'), {
      target: { files: [new File(['%PDF'], 'nota.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Importar' }));
    expect(await within(dialogo).findByText('O arquivo precisa ser o XML da NF-e (.xml).')).toBeInTheDocument();

    const grande = arquivoXml();
    Object.defineProperty(grande, 'size', { value: 10 * 1024 * 1024 + 1 });
    fireEvent.change(within(dialogo).getByLabelText('XML da nota *'), { target: { files: [grande] } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Importar' }));
    expect(await within(dialogo).findByText('O XML tem mais de 10 MB.')).toBeInTheDocument();
    expect(svc.enviarXml).not.toHaveBeenCalled();
  });

  it('importa o XML do evento e resume o efeito nos títulos', async () => {
    renderizar();
    await screen.findByRole('link', { name: '1-123' });
    fireEvent.click(screen.getByRole('button', { name: /Importar evento/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Importar evento da NF-e' });
    fireEvent.change(within(dialogo).getByLabelText('XML do evento *'), { target: { files: [arquivoXml('cancelamento.xml')] } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Importar' }));

    expect(await within(dialogo).findByText('Cancelamento registrado na nota 1-123.')).toBeInTheDocument();
    expect(svc.importarEventoNota).toHaveBeenCalledWith('arq-1');
    expect(within(dialogo).getByText('2 título(s) cancelado(s) e 1 marcado(s) para o financeiro resolver.')).toBeInTheDocument();
    expect(within(dialogo).getByRole('link', { name: 'Abrir a nota' })).toHaveAttribute('href', '/notas-fiscais/nf-1');
  });
});
