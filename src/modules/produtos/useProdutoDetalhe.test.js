import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as arquivosService from '../../services/arquivos';
import * as categoriasService from '../../services/categorias';
import * as produtosService from '../../services/produtos';
import { useProdutoDetalhe } from './useProdutoDetalhe';

const PRODUTO = { id: 'prod-1', nome: 'Cimento', imagens: [{ id: 'img-0', arquivo_id: 'arq-0' }] };
const ARQUIVO = new File(['png'], 'foto.png', { type: 'image/png' });

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(produtosService, 'obterProduto').mockResolvedValue({ dados: PRODUTO });
  vi.spyOn(produtosService, 'listarMovimentos').mockResolvedValue({ dados: [] });
  vi.spyOn(categoriasService, 'listarTodasCategorias').mockResolvedValue([]);
  vi.spyOn(arquivosService, 'enviarArquivo').mockResolvedValue({ id: 'arq-novo' });
});

async function renderizar() {
  const hook = renderHook(() => useProdutoDetalhe('prod-1'));
  await waitFor(() => expect(hook.result.current.carregando).toBe(false));
  return hook;
}

describe('useProdutoDetalhe.movimentos', () => {
  it('filtra os movimentos por local voltando para a página 1 e avança a geração ao movimentar', async () => {
    vi.spyOn(produtosService, 'movimentar').mockResolvedValue({ dados: {} });
    const { result } = await renderizar();
    const geracaoInicial = result.current.geracao;

    act(() => result.current.filtrarMovimentosPorLocal('loc-1'));

    await waitFor(() =>
      expect(produtosService.listarMovimentos).toHaveBeenLastCalledWith(
        'prod-1',
        expect.objectContaining({ pagina: 1, local: 'loc-1' })
      )
    );
    expect(result.current.localMovimentos).toBe('loc-1');

    await act(() => result.current.movimentar({ tipo: 'entrada' }));

    expect(result.current.geracao).toBeGreaterThan(geracaoInicial);
  });
});

describe('useProdutoDetalhe.transferir', () => {
  it('transfere, volta os movimentos para a página 1 e recarrega', async () => {
    const transferir = vi.spyOn(produtosService, 'transferir').mockResolvedValue({ dados: {} });
    const { result } = await renderizar();
    const geracaoInicial = result.current.geracao;
    const dados = { local_origem_id: 'loc-1', local_destino_id: 'loc-2', quantidade: 2, observacao: '' };

    await act(() => result.current.transferir(dados));

    expect(transferir).toHaveBeenCalledWith('prod-1', dados);
    expect(result.current.geracao).toBeGreaterThan(geracaoInicial);
    expect(result.current.paginaMovimentos).toBe(1);
  });
});

describe('useProdutoDetalhe.reservas', () => {
  it('reserva e libera pelo id da reserva, recarregando o detalhe', async () => {
    const reservar = vi.spyOn(produtosService, 'reservar').mockResolvedValue({ dados: {} });
    const liberar = vi.spyOn(produtosService, 'liberarReserva').mockResolvedValue({ dados: {} });
    const { result } = await renderizar();
    const geracaoInicial = result.current.geracao;

    await act(() => result.current.reservar({ local_id: 'loc-1', quantidade: 2, observacao: '' }));
    await act(() => result.current.liberarReserva({ id: 'res-1' }));

    expect(reservar).toHaveBeenCalledWith('prod-1', { local_id: 'loc-1', quantidade: 2, observacao: '' });
    expect(liberar).toHaveBeenCalledWith('res-1');
    expect(result.current.geracao).toBe(geracaoInicial + 2);
  });
});

describe('useProdutoDetalhe.anexarImagem', () => {
  it('anexa o arquivo enviado na próxima ordem', async () => {
    const anexar = vi.spyOn(produtosService, 'anexarImagem').mockResolvedValue({ dados: {} });
    const remover = vi.spyOn(arquivosService, 'removerArquivo').mockResolvedValue(null);
    const { result } = await renderizar();

    await act(() => result.current.anexarImagem(ARQUIVO, 'foto'));

    expect(anexar).toHaveBeenCalledWith('prod-1', { arquivo_id: 'arq-novo', ordem: 1, alt: 'foto' });
    expect(remover).not.toHaveBeenCalled();
  });

  it('apaga o arquivo enviado quando o anexo falha e repassa o erro', async () => {
    vi.spyOn(produtosService, 'anexarImagem').mockRejectedValue(new Error('arquivo deve ser uma imagem'));
    const remover = vi.spyOn(arquivosService, 'removerArquivo').mockResolvedValue(null);
    const { result } = await renderizar();

    await expect(
      act(() => result.current.anexarImagem(ARQUIVO, 'foto'))
    ).rejects.toThrow('arquivo deve ser uma imagem');

    expect(remover).toHaveBeenCalledWith('arq-novo');
  });

  it('mantém o erro do anexo mesmo se apagar o arquivo também falhar', async () => {
    vi.spyOn(produtosService, 'anexarImagem').mockRejectedValue(new Error('produto não encontrado'));
    vi.spyOn(arquivosService, 'removerArquivo').mockRejectedValue(new Error('sem conexão'));
    const { result } = await renderizar();

    await expect(
      act(() => result.current.anexarImagem(ARQUIVO, 'foto'))
    ).rejects.toThrow('produto não encontrado');
  });

  it('não tenta apagar nada quando o próprio envio falha', async () => {
    arquivosService.enviarArquivo.mockRejectedValue(new Error('arquivo excede o limite de 10MB'));
    const anexar = vi.spyOn(produtosService, 'anexarImagem');
    const remover = vi.spyOn(arquivosService, 'removerArquivo');
    const { result } = await renderizar();

    await expect(
      act(() => result.current.anexarImagem(ARQUIVO, 'foto'))
    ).rejects.toThrow('arquivo excede o limite de 10MB');

    expect(anexar).not.toHaveBeenCalled();
    expect(remover).not.toHaveBeenCalled();
  });
});
