import React from 'react';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useSaldoProduto } from './useSaldoProduto';
import '../../app/components/DataGrid.css';
import '../../app/components/SeletorRemoto.css';
import './Produtos.css';

export function SaldoPorLocal({ produtoId, geracao }) {
  const nomeEmpresa = useNomesEmpresas();
  const { saldo, carregando, erro, recarregar } = useSaldoProduto(produtoId, geracao);

  if (erro) {
    return (
      <div className="seletor-remoto-erro" role="alert">
        <span>{erro}</span>
        <button type="button" className="seletor-remoto-tentar" onClick={recarregar}>
          Tentar de novo
        </button>
      </div>
    );
  }

  if (carregando && !saldo) {
    return <div className="produtos-imagens-vazio">Carregando saldo por local…</div>;
  }

  if (!saldo) return null;

  const locais = saldo.locais ?? [];

  return (
    <section className="produtos-saldo-local" aria-labelledby="produto-saldo-local-titulo">
      <h3 id="produto-saldo-local-titulo" className="produtos-saldo-local-titulo">
        Saldo por local
      </h3>
      <dl className="produtos-saldo-totais">
        <div>
          <dt>Reservado</dt>
          <dd>{saldo.reservado}</dd>
        </div>
        <div>
          <dt>Disponível</dt>
          <dd>{saldo.disponivel}</dd>
        </div>
        <div>
          <dt>Não alocado</dt>
          <dd>{saldo.nao_alocado}</dd>
        </div>
      </dl>
      {saldo.nao_alocado > 0 && (
        <span className="produtos-saldo-ajuda">
          Não alocado é o saldo anterior aos locais; registre uma implantação para colocá-lo num local.
        </span>
      )}
      {locais.length === 0 ? (
        <div className="produtos-imagens-vazio">Nenhum saldo nos locais do seu acesso.</div>
      ) : (
        <div className="datagrid-container">
          <table className="datagrid">
            <thead>
              <tr>
                <th>Local</th>
                <th>Empresa</th>
                <th>Saldo</th>
                <th>Reservado</th>
                <th>Disponível</th>
              </tr>
            </thead>
            <tbody>
              {locais.map((local) => (
                <tr key={local.local_id}>
                  <td>{local.local_nome}</td>
                  <td>{nomeEmpresa(local.empresa_id)}</td>
                  <td>{local.quantidade}</td>
                  <td>{local.reservado}</td>
                  <td>{local.disponivel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
