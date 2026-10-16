import React from 'react';
import { useNomesLocais } from '../../app/estoque/useNomesLocais';
import { formatarDataHora, formatarMoeda } from '../../lib/formatar';
import { useLotesProduto } from './useLotesProduto';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Produtos.css';

function custoConhecido(lote) {
  return lote.custo_unitario_centavos !== null && lote.custo_unitario_centavos !== undefined;
}

export function LotesProduto({ produtoId, geracao }) {
  const nomeLocal = useNomesLocais();
  const {
    lotes,
    pagina,
    soComSaldo,
    temProxima,
    carregando,
    erro,
    recarregar,
    irParaAnterior,
    irParaProxima,
    mostrarSoComSaldo,
  } = useLotesProduto(produtoId, geracao);

  return (
    <div className="produtos-reservas">
      <div className="produtos-movimentos-filtro">
        <label className="filter-label produtos-checkbox" htmlFor="produto-lotes-com-saldo">
          <input
            id="produto-lotes-com-saldo"
            type="checkbox"
            checked={soComSaldo}
            onChange={(evento) => mostrarSoComSaldo(evento.target.checked)}
          />
          Só lotes com saldo
        </label>
      </div>
      <span className="produtos-saldo-ajuda">
        Saídas consomem os lotes mais antigos primeiro. Custo desconhecido vem de implantação, devolução ou ajuste sem
        custo informado.
      </span>

      {erro ? (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      ) : carregando ? (
        <div className="produtos-imagens-vazio">Carregando lotes…</div>
      ) : lotes.length === 0 ? (
        <div className="produtos-imagens-vazio">
          {soComSaldo ? 'Nenhum lote com saldo nos locais do seu acesso.' : 'Nenhum lote nos locais do seu acesso.'}
        </div>
      ) : (
        <div className="datagrid-container">
          <table className="datagrid">
            <thead>
              <tr>
                <th>Entrada</th>
                <th>Local</th>
                <th>Custo unitário</th>
                <th>Inicial</th>
                <th>Atual</th>
                <th>Valor em estoque</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {lotes.map((lote) => (
                <tr key={lote.id}>
                  <td>{formatarDataHora(lote.entrada_em)}</td>
                  <td>{nomeLocal(lote.local_id)}</td>
                  <td>{custoConhecido(lote) ? formatarMoeda(lote.custo_unitario_centavos) : 'Desconhecido'}</td>
                  <td>{lote.quantidade_inicial}</td>
                  <td>{lote.quantidade_atual}</td>
                  <td>
                    {custoConhecido(lote)
                      ? formatarMoeda(lote.custo_unitario_centavos * lote.quantidade_atual)
                      : '—'}
                  </td>
                  <td>{lote.lote_origem_id ? 'Transferência' : 'Movimento'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!erro && (temProxima || pagina > 1) && (
        <div className="produtos-paginacao produtos-movimentos-paginacao">
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', padding: '4px 10px' }}
            title="Página anterior dos lotes"
            onClick={irParaAnterior}
            disabled={pagina <= 1}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="produtos-paginacao-texto">Página {pagina}</span>
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', padding: '4px 10px' }}
            title="Próxima página dos lotes"
            onClick={irParaProxima}
            disabled={!temProxima}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
