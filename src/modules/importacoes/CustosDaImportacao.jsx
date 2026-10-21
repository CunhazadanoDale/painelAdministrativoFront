import React, { useState } from 'react';
import { AcaoModal } from '../../app/components/AcaoModal';
import { BuscaRemota } from '../../app/components/BuscaRemota';
import { StatusBadge } from '../../app/components/StatusBadge';
import { formatarData, formatarMoeda, paraCentavos } from '../../lib/formatar';
import * as fornecedoresService from '../../services/fornecedores';
import { SeletorCategoriaDespesa } from '../financeiro/SeletorCategoriaDespesa';
import { ContaAPagar } from './ParcelasDaImportacao';
import { LIMITES, TIPOS_CUSTO, VALOR_MAXIMO, hojeEmBrasilia, nomeDoFornecedor, rotuloTipoCusto } from './importacoesUtils';
import { Plus } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Importacoes.css';

const BOTAO = { flex: 'none', width: 'auto', padding: '2px 8px' };
const CONTA_ENCERRADA = ['cancelado', 'rejeitado'];

const buscarFornecedores = (texto, sinal) =>
  fornecedoresService
    .listarFornecedores({ busca: texto, ativo: 'true', tamanho: 20, sinal })
    .then((resposta) => resposta?.dados ?? []);

const opcaoDeFornecedor = (fornecedor) => ({ valor: fornecedor.id, rotulo: nomeDoFornecedor(fornecedor) });

function LancarCustoModal({ importacao, nomeFornecedor, onConfirmar, onFechar, onRecarregar }) {
  const posterior = importacao.status === 'recebida';
  const [tipo, setTipo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState(hojeEmBrasilia());
  const [compoeCusto, setCompoeCusto] = useState(!posterior);
  const [categoria, setCategoria] = useState('');

  const validar = () => {
    const erros = [];
    if (!tipo) erros.push('Escolha o tipo do custo.');
    if (descricao.trim().length > LIMITES.descricao_custo) {
      erros.push(`A descrição tem no máximo ${LIMITES.descricao_custo} caracteres.`);
    }
    if (!fornecedorId) erros.push('Escolha a quem se paga o custo.');
    const centavos = paraCentavos(valor);
    if (!Number.isFinite(centavos) || centavos < 1 || centavos > VALOR_MAXIMO) erros.push('Informe um valor maior que zero.');
    if (!vencimento) erros.push('Informe o vencimento.');
    if (!categoria) erros.push('Escolha a categoria de despesa.');
    return erros;
  };

  return (
    <AcaoModal
      titulo={`Lançar custo da importação ${importacao.numero}`}
      rotuloConfirmar="Lançar custo"
      validar={validar}
      onConfirmar={() =>
        onConfirmar({
          tipo,
          descricao: descricao.trim(),
          fornecedor_id: fornecedorId,
          valor_centavos: paraCentavos(valor),
          vencimento,
          compoe_custo: posterior ? false : compoeCusto,
          categoria_financeira_id: categoria,
        })
      }
      onFechar={onFechar}
      onRecarregar={onRecarregar}
      largura="620px"
    >
      <p className="importacoes-texto">
        O custo é em reais e gera a conta a pagar na mesma hora, pendente de aprovação.
        {posterior && ' A importação já foi recebida: o custo entra como posterior e não muda o custo dos lotes.'}
      </p>
      <div className="importacoes-form-linha">
        <div className="importacoes-form-campo">
          <label className="filter-label" htmlFor="custo-tipo">
            Tipo *
          </label>
          <select id="custo-tipo" className="filter-input" value={tipo} onChange={(evento) => setTipo(evento.target.value)}>
            <option value="">Selecione…</option>
            {TIPOS_CUSTO.map((item) => (
              <option key={item.valor} value={item.valor}>
                {item.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className="importacoes-form-campo">
          <label className="filter-label" htmlFor="custo-descricao">
            Descrição
          </label>
          <input
            id="custo-descricao"
            className="filter-input"
            type="text"
            placeholder={tipo ? rotuloTipoCusto(tipo) : 'Vazia usa o nome do tipo'}
            value={descricao}
            maxLength={LIMITES.descricao_custo}
            onChange={(evento) => setDescricao(evento.target.value)}
          />
        </div>
      </div>
      <div className="importacoes-form-campo">
        <label className="filter-label" htmlFor="custo-fornecedor">
          A quem se paga *
        </label>
        <BuscaRemota
          id="custo-fornecedor"
          nomeBusca="fornecedor do custo"
          valor={fornecedorId}
          rotuloAtual={nomeFornecedor(fornecedorId)}
          buscar={buscarFornecedores}
          opcaoDe={opcaoDeFornecedor}
          onEscolher={(fornecedor) => setFornecedorId(fornecedor ? fornecedor.id : '')}
          placeholderBusca="Transportadora, despachante, Receita…"
        />
      </div>
      <div className="importacoes-form-linha">
        <div className="importacoes-form-campo">
          <label className="filter-label" htmlFor="custo-valor">
            Valor em reais *
          </label>
          <input
            id="custo-valor"
            className="filter-input"
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(evento) => setValor(evento.target.value)}
          />
        </div>
        <div className="importacoes-form-campo">
          <label className="filter-label" htmlFor="custo-vencimento">
            Vencimento *
          </label>
          <input
            id="custo-vencimento"
            className="filter-input"
            type="date"
            value={vencimento}
            onChange={(evento) => setVencimento(evento.target.value)}
          />
        </div>
      </div>
      <div className="importacoes-form-campo">
        <label className="filter-label" htmlFor="custo-categoria">
          Categoria de despesa *
        </label>
        <SeletorCategoriaDespesa id="custo-categoria" valor={categoria} onAlterar={setCategoria} placeholder="Selecione…" />
      </div>
      <label className="importacoes-checkbox">
        <input
          type="checkbox"
          checked={posterior ? false : compoeCusto}
          disabled={posterior}
          onChange={(evento) => setCompoeCusto(evento.target.checked)}
        />
        Compõe o custo do produto
      </label>
      <span className="importacoes-form-ajuda">
        Desmarque o tributo que a empresa credita (ICMS, IPI, PIS/COFINS conforme o regime, conferido com a contabilidade).
      </span>
    </AcaoModal>
  );
}

function CancelarCustoModal({ custo, onConfirmar, onFechar, onRecarregar }) {
  return (
    <AcaoModal
      titulo={`Cancelar custo "${custo.descricao}"`}
      rotuloConfirmar="Cancelar custo"
      onConfirmar={onConfirmar}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="importacoes-texto">
        O custo fica marcado como cancelado e deixa de entrar no rateio; nada é apagado.
      </p>
    </AcaoModal>
  );
}

function podeCancelar(importacao, custo) {
  if (custo.cancelado || !CONTA_ENCERRADA.includes(custo.status_conta_a_pagar)) return false;
  return !(importacao.status === 'recebida' && custo.compoe_custo);
}

export function CustosDaImportacao({ importacao, acoes, nomeFornecedor, onRecarregar }) {
  const [aberto, setAberto] = useState(null);
  const custos = importacao.custos ?? [];
  const vigentes = custos.filter((custo) => !custo.cancelado);
  const noRateio = vigentes.filter((custo) => custo.compoe_custo).reduce((soma, custo) => soma + custo.valor_centavos, 0);
  const foraDoRateio = vigentes.filter((custo) => !custo.compoe_custo).reduce((soma, custo) => soma + custo.valor_centavos, 0);
  const podeEscrever = importacao.status !== 'cancelada';
  const fechar = () => setAberto(null);

  return (
    <div className="importacoes-itens">
      <div className="importacoes-painel-cabecalho">
        <span className="importacoes-texto">
          No custo do produto: <strong>{formatarMoeda(noRateio)}</strong> · fora do rateio: {formatarMoeda(foraDoRateio)}
        </span>
        {podeEscrever && (
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ ...BOTAO, display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setAberto({ tipo: 'lancar' })}
          >
            <Plus size={14} /> Lançar custo
          </button>
        )}
      </div>
      {custos.length === 0 ? (
        <div className="importacoes-secundario">Nenhum custo lançado.</div>
      ) : (
        <div className="datagrid-container">
          <table className="datagrid">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>A quem se paga</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Custo do produto</th>
                <th>Conta a pagar</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {custos.map((custo) => (
                <tr key={custo.id}>
                  <td>{rotuloTipoCusto(custo.tipo)}</td>
                  <td>
                    <span className="importacoes-selo">
                      {custo.descricao}
                      {custo.posterior && <StatusBadge status="info" label="Posterior" />}
                      {custo.cancelado && <StatusBadge status="danger" label="Cancelado" />}
                    </span>
                  </td>
                  <td>{nomeFornecedor(custo.fornecedor_id)}</td>
                  <td>{formatarMoeda(custo.valor_centavos)}</td>
                  <td>{formatarData(custo.vencimento)}</td>
                  <td>{custo.compoe_custo ? 'Compõe' : 'Fora do rateio'}</td>
                  <td>
                    <ContaAPagar solicitacaoId={custo.solicitacao_id} status={custo.status_conta_a_pagar} />
                  </td>
                  <td>
                    {podeEscrever && podeCancelar(importacao, custo) && (
                      <button
                        type="button"
                        className="filter-btn importacoes-perigo"
                        style={BOTAO}
                        onClick={() => setAberto({ tipo: 'cancelar', custo })}
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <span className="importacoes-form-ajuda">
        Para cancelar um custo, cancele ou rejeite antes a conta a pagar dele em Solicitações.
      </span>

      {aberto?.tipo === 'lancar' && (
        <LancarCustoModal
          importacao={importacao}
          nomeFornecedor={nomeFornecedor}
          onConfirmar={acoes.lancarCusto}
          onFechar={fechar}
          onRecarregar={onRecarregar}
        />
      )}
      {aberto?.tipo === 'cancelar' && (
        <CancelarCustoModal
          custo={aberto.custo}
          onConfirmar={() => acoes.cancelarCusto(aberto.custo.id)}
          onFechar={fechar}
          onRecarregar={onRecarregar}
        />
      )}
    </div>
  );
}
