import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../lib/api';
import * as empresasService from '../../services/empresas';
import Empresas from './Empresas';

vi.mock('../../services/empresas', () => ({
  listarEmpresas: vi.fn(),
  criarEmpresa: vi.fn(),
  atualizarEmpresa: vi.fn(),
  ativarEmpresa: vi.fn(),
  desativarEmpresa: vi.fn(),
  removerEmpresa: vi.fn(),
}));

const { listarEmpresas, criarEmpresa, atualizarEmpresa, ativarEmpresa, desativarEmpresa, removerEmpresa } =
  empresasService;

const MIA = {
  id: 'emp-mia',
  razao_social: 'MIA Construtora LTDA',
  nome_fantasia: 'MIA',
  cnpj: '11222333000181',
  cnpj_formatado: '11.222.333/0001-81',
  uf: 'PB',
  regime_tributario: 'presumido',
  ativa: true,
};

const GIGANTE = {
  ...MIA,
  id: 'emp-gigante',
  razao_social: 'Gigante CE LTDA',
  nome_fantasia: 'Gigante CE',
  cnpj_formatado: '12.ABC.345/01DE-35',
  uf: 'CE',
  regime_tributario: 'real',
  ativa: false,
};

function linhaDe(texto) {
  return screen.getByText(texto).closest('tr');
}

async function abrirNova() {
  render(<Empresas />);
  await screen.findByText('MIA');
  fireEvent.click(screen.getByRole('button', { name: /Nova Empresa/ }));
  return screen.getByRole('dialog');
}

function preencher(dialogo, campos) {
  Object.entries(campos).forEach(([rotulo, valor]) => {
    fireEvent.change(within(dialogo).getByLabelText(rotulo), { target: { value: valor } });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  listarEmpresas.mockResolvedValue({ dados: [MIA, GIGANTE] });
  criarEmpresa.mockResolvedValue({ dados: MIA });
  atualizarEmpresa.mockResolvedValue({ dados: MIA });
  ativarEmpresa.mockResolvedValue({ dados: GIGANTE });
  desativarEmpresa.mockResolvedValue({ dados: MIA });
  removerEmpresa.mockResolvedValue(null);
});

describe('Empresas', () => {
  it('lista as empresas com cnpj formatado, uf, regime e situação', async () => {
    render(<Empresas />);

    const linha = (await screen.findByText('MIA')).closest('tr');
    expect(within(linha).getByText('11.222.333/0001-81')).toBeInTheDocument();
    expect(within(linha).getByText('PB')).toBeInTheDocument();
    expect(within(linha).getByText('Lucro presumido')).toBeInTheDocument();
    expect(within(linha).getByText('Ativa')).toBeInTheDocument();
    expect(within(linhaDe('Gigante CE')).getByText('Inativa')).toBeInTheDocument();
  });

  it('mostra o vazio quando não há empresas', async () => {
    listarEmpresas.mockResolvedValue({ dados: [] });

    render(<Empresas />);

    expect(await screen.findByText('Nenhuma empresa cadastrada.')).toBeInTheDocument();
  });

  it('mostra o erro sem o vazio e tenta de novo', async () => {
    listarEmpresas.mockRejectedValueOnce(new Error('falha de rede'));

    render(<Empresas />);

    expect(await screen.findByText('falha de rede')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma empresa cadastrada.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('MIA')).toBeInTheDocument();
  });

  it('filtra pela situação', async () => {
    render(<Empresas />);
    await screen.findByText('MIA');

    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'false' } });

    await waitFor(() =>
      expect(listarEmpresas).toHaveBeenLastCalledWith(expect.objectContaining({ ativas: 'false', pagina: 1 }))
    );
  });

  it('valida os campos obrigatórios e o cnpj antes de enviar', async () => {
    const dialogo = await abrirNova();
    preencher(dialogo, { 'CNPJ *': '11.222.333/0001' });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText('O CNPJ tem 14 caracteres.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe a razão social.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Informe o nome fantasia.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Escolha a UF.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Escolha o regime tributário.')).toBeInTheDocument();
    expect(criarEmpresa).not.toHaveBeenCalled();
  });

  it('cria a empresa com o cnpj sem máscara e em maiúsculas', async () => {
    const dialogo = await abrirNova();
    preencher(dialogo, {
      'CNPJ *': '12.abc.345/01de-35',
      'Razão social *': '  Gigante CE LTDA ',
      'Nome fantasia *': 'Gigante CE',
      'UF *': 'CE',
      'Regime tributário *': 'real',
    });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(criarEmpresa).toHaveBeenCalledWith({
        cnpj: '12ABC34501DE35',
        razao_social: 'Gigante CE LTDA',
        nome_fantasia: 'Gigante CE',
        uf: 'CE',
        regime_tributario: 'real',
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('mantém o formulário e mostra a mensagem da API quando o cnpj já existe', async () => {
    criarEmpresa.mockRejectedValue(new ErroApi(409, 'já existe uma empresa com este cnpj'));
    const dialogo = await abrirNova();
    preencher(dialogo, {
      'CNPJ *': '11222333000181',
      'Razão social *': 'MIA Construtora LTDA',
      'Nome fantasia *': 'MIA',
      'UF *': 'PB',
      'Regime tributário *': 'presumido',
    });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText('já existe uma empresa com este cnpj')).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Nome fantasia *')).toHaveValue('MIA');
  });

  it('edita sem deixar mudar o cnpj e sem enviá-lo', async () => {
    render(<Empresas />);
    await screen.findByText('MIA');

    fireEvent.click(within(linhaDe('MIA')).getByRole('button', { name: 'Editar empresa' }));
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByLabelText('CNPJ *')).toBeDisabled();
    expect(within(dialogo).getByLabelText('CNPJ *')).toHaveValue('11.222.333/0001-81');
    preencher(dialogo, { 'Nome fantasia *': 'MIA PB' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(atualizarEmpresa).toHaveBeenCalledWith('emp-mia', {
        razao_social: 'MIA Construtora LTDA',
        nome_fantasia: 'MIA PB',
        uf: 'PB',
        regime_tributario: 'presumido',
      })
    );
  });

  it('desativa a ativa e ativa a inativa', async () => {
    render(<Empresas />);
    await screen.findByText('MIA');

    fireEvent.click(within(linhaDe('MIA')).getByRole('button', { name: 'Desativar empresa' }));
    await waitFor(() => expect(desativarEmpresa).toHaveBeenCalledWith('emp-mia'));
    await screen.findByText('Gigante CE');
    fireEvent.click(within(linhaDe('Gigante CE')).getByRole('button', { name: 'Ativar empresa' }));

    await waitFor(() => expect(ativarEmpresa).toHaveBeenCalledWith('emp-gigante'));
  });

  it('mostra o erro da troca de situação', async () => {
    desativarEmpresa.mockRejectedValue(new ErroApi(403, 'perfil sem permissão para esta operação'));
    render(<Empresas />);
    await screen.findByText('MIA');

    fireEvent.click(within(linhaDe('MIA')).getByRole('button', { name: 'Desativar empresa' }));

    expect(await screen.findByText('perfil sem permissão para esta operação')).toBeInTheDocument();
  });

  it('exclui depois de confirmar e mostra o erro de empresa em uso', async () => {
    removerEmpresa.mockRejectedValueOnce(
      new ErroApi(400, 'erro de validação: registro em uso por outros dados e não pode ser excluído')
    );
    render(<Empresas />);
    await screen.findByText('MIA');

    fireEvent.click(within(linhaDe('MIA')).getByRole('button', { name: 'Excluir empresa' }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));

    expect(
      await within(dialogo).findByText(/registro em uso por outros dados/)
    ).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(removerEmpresa).toHaveBeenCalledTimes(2);
  });
});
