import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ErroApi } from '../../lib/api';
import * as arquivosService from '../../services/arquivos';
import * as caixaService from '../../services/caixa';
import * as contasService from '../../services/contasBancarias';
import * as empresasService from '../../services/empresas';
import Caixa from './Caixa';

vi.mock('../../app/autenticacao/useAutenticacao', () => ({ useAutenticacao: vi.fn() }));
vi.mock('../../services/empresas', () => ({ listarTodasEmpresas: vi.fn() }));
vi.mock('../../services/arquivos', () => ({ removerArquivo: vi.fn(async () => null) }));
vi.mock('../../services/contasBancarias', () => ({ listarTodasContasBancarias: vi.fn(), obterContaBancaria: vi.fn() }));
vi.mock('../../services/caixa', () => ({
  listarSaldos: vi.fn(),
  listarImportacoes: vi.fn(),
  enviarOfx: vi.fn(),
  importarExtrato: vi.fn(),
  desfazerImportacao: vi.fn(),
}));

const svc = caixaService;

const IMPORTACAO = {
  id: 'imp-1',
  conta_bancaria_id: 'cb-sic',
  periodo_inicio: '2026-10-01',
  periodo_fim: '2026-10-15',
  saldo_banco_centavos: 1084567,
  saldo_banco_em: '2026-10-15',
  linhas_novas: 12,
  linhas_repetidas: 3,
  linhas_ignoradas: 1,
  criado_em: '2026-10-19T13:00:00Z',
};

const RELATORIO = {
  simulacao: false,
  importacao_id: 'imp-2',
  conta_bancaria_id: 'cb-sic',
  periodo_inicio: '2026-10-01',
  periodo_fim: '2026-10-15',
  saldo_banco_centavos: 1084567,
  saldo_banco_em: '2026-10-15',
  total: 3,
  novas: 1,
  repetidas: 1,
  ignoradas: [{ sequencia: 1, data: '2026-09-30', valor_centavos: -100, descricao: 'TARIFA', motivo: 'anterior_ao_saldo_inicial' }],
};

function perfil(administrador = false) {
  useAutenticacao.mockReturnValue({ financeiro: true, administrador });
}

async function abrirImportacoes() {
  render(
    <MemoryRouter>
      <Caixa />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('tab', { name: 'Importações' }));
  await screen.findByText('01/10/2026 a 15/10/2026');
}

function ofx(nome = 'extrato.ofx') {
  return new File(['OFXHEADER:100'], nome, { type: '' });
}

beforeEach(() => {
  vi.clearAllMocks();
  perfil();
  empresasService.listarTodasEmpresas.mockResolvedValue([{ id: 'emp-mia', nome_fantasia: 'MIA', ativa: true }]);
  contasService.obterContaBancaria.mockResolvedValue({ dados: { id: 'cb-sic', apelido: 'Sicredi movimento', banco_nome: 'Sicredi' } });
  contasService.listarTodasContasBancarias.mockResolvedValue([
    { id: 'cb-sic', apelido: 'Sicredi movimento', banco_nome: 'Sicredi' },
    { id: 'cb-itau', apelido: 'Itaú cobrança', banco_nome: 'Itaú' },
  ]);
  svc.listarSaldos.mockResolvedValue({ dados: [] });
  svc.listarImportacoes.mockResolvedValue({ dados: [IMPORTACAO] });
  svc.enviarOfx.mockResolvedValue({ id: 'arq-1' });
  svc.importarExtrato.mockResolvedValue({ dados: RELATORIO });
  svc.desfazerImportacao.mockResolvedValue(null);
});

describe('Importações de extrato', () => {
  it('lista as importações com conta, período, saldo do banco e linhas', async () => {
    await abrirImportacoes();

    const linha = screen.getByText('01/10/2026 a 15/10/2026').closest('tr');
    expect(await within(linha).findByText('Sicredi movimento · Sicredi')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 10.845,67 em 15/10/2026')).toBeInTheDocument();
    expect(within(linha).getByText('12 novas · 3 repetidas · 1 ignorada(s)')).toBeInTheDocument();
  });

  it('simula a importação sem gravar e depois importa o mesmo arquivo', async () => {
    svc.importarExtrato
      .mockResolvedValueOnce({ dados: { ...RELATORIO, simulacao: true, importacao_id: null } })
      .mockResolvedValueOnce({ dados: RELATORIO });
    await abrirImportacoes();
    fireEvent.click(screen.getByRole('button', { name: /Importar extrato/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Importar extrato OFX' });
    const arquivo = ofx();
    fireEvent.change(within(dialogo).getByLabelText('Arquivo OFX *'), { target: { files: [arquivo] } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Simular' }));

    expect(await within(dialogo).findByText('Simulação: nada foi gravado.')).toBeInTheDocument();
    expect(svc.enviarOfx).toHaveBeenCalledWith(arquivo, expect.anything());
    expect(svc.importarExtrato).toHaveBeenCalledWith({ arquivo_id: 'arq-1', conta_bancaria_id: null, simular: true });
    expect(within(dialogo).getByText('3 linha(s): 1 nova(s), 1 repetida(s), 1 ignorada(s).')).toBeInTheDocument();
    const ignorada = within(dialogo).getByText('TARIFA').closest('tr');
    expect(within(ignorada).getByText('Anterior ao saldo inicial')).toBeInTheDocument();
    expect(within(ignorada).getByText('-R$ 1,00')).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Importar' }));
    expect(await within(dialogo).findByText('Extrato importado.')).toBeInTheDocument();
    expect(svc.enviarOfx).toHaveBeenCalledTimes(1);
    expect(svc.importarExtrato).toHaveBeenLastCalledWith({ arquivo_id: 'arq-1', conta_bancaria_id: null, simular: false });
    await waitFor(() => expect(svc.listarImportacoes).toHaveBeenCalledTimes(2));
  });

  it('importa informando a conta e, se recusar, mostra o erro e apaga o arquivo enviado', async () => {
    svc.importarExtrato.mockRejectedValue(
      new ErroApi(400, 'erro de validação: conta sem saldo inicial; informe a abertura antes de importar o extrato')
    );
    await abrirImportacoes();
    fireEvent.click(screen.getByRole('button', { name: /Importar extrato/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Importar extrato OFX' });
    await within(dialogo).findByRole('option', { name: 'Itaú cobrança · Itaú' });
    fireEvent.change(within(dialogo).getByLabelText('Conta'), { target: { value: 'cb-itau' } });
    fireEvent.change(within(dialogo).getByLabelText('Arquivo OFX *'), { target: { files: [ofx()] } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Importar' }));

    expect(await within(dialogo).findByText(/conta sem saldo inicial/)).toBeInTheDocument();
    expect(svc.importarExtrato).toHaveBeenCalledWith({ arquivo_id: 'arq-1', conta_bancaria_id: 'cb-itau', simular: false });
    expect(arquivosService.removerArquivo).toHaveBeenCalledWith('arq-1');
  });

  it('recusa arquivo que não é OFX ou passa de 5 MB sem enviar', async () => {
    await abrirImportacoes();
    fireEvent.click(screen.getByRole('button', { name: /Importar extrato/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Importar extrato OFX' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Importar' }));
    expect(await within(dialogo).findByText('Escolha o arquivo OFX.')).toBeInTheDocument();

    fireEvent.change(within(dialogo).getByLabelText('Arquivo OFX *'), { target: { files: [new File(['a;b'], 'extrato.csv')] } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Importar' }));
    expect(await within(dialogo).findByText('O arquivo precisa ser um extrato OFX (.ofx).')).toBeInTheDocument();

    const grande = ofx();
    Object.defineProperty(grande, 'size', { value: 5 * 1024 * 1024 + 1 });
    fireEvent.change(within(dialogo).getByLabelText('Arquivo OFX *'), { target: { files: [grande] } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Importar' }));
    expect(await within(dialogo).findByText('O extrato tem mais de 5 MB.')).toBeInTheDocument();
    expect(svc.enviarOfx).not.toHaveBeenCalled();
  });

  it('o administrador desfaz a importação com confirmação e vê a recusa', async () => {
    perfil(true);
    svc.desfazerImportacao.mockRejectedValueOnce(new ErroApi(409, 'só a importação mais recente da conta pode ser desfeita'));
    await abrirImportacoes();
    const linha = screen.getByText('01/10/2026 a 15/10/2026').closest('tr');
    fireEvent.click(within(linha).getByRole('button', { name: 'Desfazer' }));
    fireEvent.click(within(linha).getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('só a importação mais recente da conta pode ser desfeita')).toBeInTheDocument();
    fireEvent.click(within(linha).getByRole('button', { name: 'Desfazer' }));
    fireEvent.click(within(linha).getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(svc.desfazerImportacao).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(svc.listarImportacoes).toHaveBeenCalledTimes(2));
  });

  it('o financeiro sem administrador não desfaz', async () => {
    await abrirImportacoes();

    expect(screen.queryByRole('button', { name: 'Desfazer' })).toBeNull();
  });
});
