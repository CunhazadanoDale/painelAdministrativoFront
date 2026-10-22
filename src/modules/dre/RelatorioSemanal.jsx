import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from '../../app/components/Panel';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import * as dreService from '../../services/dre';
import { rotuloCredorTipo } from '../dividas/dividasUtils';
import { rotuloNatureza } from '../notas/notasUtils';
import { numeroDoTitulo, statusDoTitulo } from '../receber/receberUtils';
import { corStatus, rotuloStatus } from '../solicitacoes/solicitacoesUtils';
import { rotuloLinhaPagamento, somarDias } from './dreUtils';
import { useConsultaDre } from './useConsultaDre';
import { AlertCircle, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Dre.css';

const BOTAO = { flex: 'none', width: 'auto', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 };

const TIPOS_RECEBIMENTO = { conta: 'Em conta', fomento: 'Pelo fomento' };

const FAIXAS_DIVIDA = [
  ['vencido', 'Vencido'],
  ['a_vencer_30', 'Próximos 30 dias'],
  ['a_vencer_90', 'Próximos 90 dias'],
  ['a_vencer_365', 'Próximos 365 dias'],
  ['a_vencer', 'A vencer (total)'],
];

function plural(quantidade, singular, varios) {
  return `${quantidade} ${quantidade === 1 ? singular : varios}`;
}

function Total({ quantidade, singular, varios, valor }) {
  return (
    <p className="dre-texto">
      <strong>{`${plural(quantidade, singular, varios)} · ${formatarMoeda(valor)}`}</strong>
    </p>
  );
}

function Bloco({ titulo, children }) {
  return (
    <Panel title={titulo}>
      <section aria-label={titulo} className="dre-itens">
        {children}
      </section>
    </Panel>
  );
}

function Tabela({ titulo, colunas, vazio, linhas }) {
  if (linhas.length === 0) return <div className="dre-secundario">{vazio}</div>;
  return (
    <div className="datagrid-container">
      <table className="datagrid" aria-label={titulo}>
        <thead>
          <tr>
            {colunas.map((coluna) => (
              <th key={coluna}>{coluna}</th>
            ))}
          </tr>
        </thead>
        <tbody>{linhas}</tbody>
      </table>
    </div>
  );
}

function AvisoCorte({ mostrados, total }) {
  if (total <= mostrados) return null;
  return <span className="dre-form-ajuda">{`Mostrando ${mostrados} de ${total}, os mais antigos.`}</span>;
}

export default function RelatorioSemanal() {
  const [semana, setSemana] = useState('');
  const [empresa, setEmpresa] = useState('');
  const nomeEmpresa = useNomesEmpresas();
  const { dados, carregando, erro, recarregar } = useConsultaDre(
    dreService.obterRelatorioSemanal,
    { semana, empresa },
    'Erro ao carregar o relatório semanal.'
  );
  const alterarEmpresa = useCallback((valor) => setEmpresa(valor), []);

  const proximaBloqueada = !dados?.inicio || somarDias(dados.inicio, 7) > dados.hoje;

  return (
    <div className="dre-container">
      <div className="dre-toolbar">
        <div className="dre-toolbar-titulo">Relatório semanal</div>
        <div className="dre-toolbar-acoes dre-nao-imprimir">
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={BOTAO}
            onClick={() => setSemana(somarDias(dados.inicio, -7))}
            disabled={!dados?.inicio}
          >
            <ChevronLeft size={14} /> Semana anterior
          </button>
          <label className="filter-label" htmlFor="relatorio-semana">
            Semana de
          </label>
          <input
            id="relatorio-semana"
            className="filter-input dre-periodo-campo"
            type="date"
            value={semana || dados?.inicio || ''}
            max={dados?.hoje}
            onChange={(evento) => setSemana(evento.target.value)}
          />
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={BOTAO}
            onClick={() => setSemana(somarDias(dados.inicio, 7))}
            disabled={proximaBloqueada}
          >
            Próxima semana <ChevronRight size={14} />
          </button>
          <label className="filter-label" htmlFor="relatorio-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="relatorio-empresa"
            className="filter-input dre-filtro"
            valor={empresa}
            onAlterar={alterarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
          <button type="button" className="filter-btn filter-btn-primary" style={BOTAO} onClick={() => window.print()}>
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>

      {erro && (
        <div className="leads-erro dre-nao-imprimir">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}

      {carregando && !dados ? (
        <div className="dre-status">Carregando relatório…</div>
      ) : dados?.inicio && !erro ? (
        <>
          <span className="dre-texto">
            {`Semana de ${formatarData(dados.inicio)} a ${formatarData(dados.fim)}, com a posição de ${formatarData(
              dados.hoje
            )}.`}
          </span>

          <div className="dre-detalhe-paineis">
            <Bloco titulo="Notas emitidas">
              <Total
                quantidade={dados.notas_emitidas.total_venda.quantidade}
                singular="nota de venda"
                varios="notas de venda"
                valor={dados.notas_emitidas.total_venda.valor_centavos}
              />
              <Tabela
                titulo="Notas por empresa"
                colunas={['Empresa', 'Natureza', 'Notas', 'Valor']}
                vazio="Nenhuma nota emitida na semana."
                linhas={dados.notas_emitidas.por_empresa.map((item) => (
                  <tr key={`${item.empresa_id}-${item.natureza}`}>
                    <td>{nomeEmpresa(item.empresa_id)}</td>
                    <td>{rotuloNatureza(item.natureza)}</td>
                    <td>{item.quantidade}</td>
                    <td>{formatarMoeda(item.valor_centavos)}</td>
                  </tr>
                ))}
              />
            </Bloco>

            <Bloco titulo="Pagamentos feitos">
              <Total
                quantidade={dados.pagamentos.total.quantidade}
                singular="pagamento"
                varios="pagamentos"
                valor={dados.pagamentos.total.valor_centavos}
              />
              <Tabela
                titulo="Pagamentos por empresa"
                colunas={['Empresa', 'Linha da DRE', 'Pagamentos', 'Valor']}
                vazio="Nenhum pagamento na semana."
                linhas={dados.pagamentos.por_empresa.map((item) => (
                  <tr key={`${item.empresa_id}-${item.linha_dre}`}>
                    <td>{nomeEmpresa(item.empresa_id)}</td>
                    <td>{rotuloLinhaPagamento(item.linha_dre)}</td>
                    <td>{item.quantidade}</td>
                    <td>{formatarMoeda(item.valor_centavos)}</td>
                  </tr>
                ))}
              />
            </Bloco>

            <Bloco titulo="Recebimentos">
              <Total
                quantidade={dados.recebimentos.total.quantidade}
                singular="recebimento em conta"
                varios="recebimentos em conta"
                valor={dados.recebimentos.total.valor_centavos}
              />
              <Tabela
                titulo="Recebimentos por empresa"
                colunas={['Empresa', 'Tipo', 'Recebimentos', 'Valor', 'Juros']}
                vazio="Nenhum recebimento na semana."
                linhas={dados.recebimentos.por_empresa.map((item) => (
                  <tr key={`${item.empresa_id}-${item.tipo}`}>
                    <td>{nomeEmpresa(item.empresa_id)}</td>
                    <td>{TIPOS_RECEBIMENTO[item.tipo] ?? item.tipo}</td>
                    <td>{item.quantidade}</td>
                    <td>{formatarMoeda(item.valor_centavos)}</td>
                    <td>{formatarMoeda(item.juros_centavos)}</td>
                  </tr>
                ))}
              />
              <span className="dre-form-ajuda">O total soma só o recebido em conta; o fomento foi pago direto a ele.</span>
            </Bloco>

            <Bloco titulo="Títulos vencidos">
              <Total
                quantidade={dados.titulos_vencidos.total.quantidade}
                singular="título"
                varios="títulos"
                valor={dados.titulos_vencidos.total.valor_centavos}
              />
              <Tabela
                titulo="Títulos vencidos a receber"
                colunas={['Título', 'Cliente', 'Empresa', 'Status', 'Vencimento', 'Saldo']}
                vazio="Nenhum título vencido."
                linhas={dados.titulos_vencidos.itens.map((item) => {
                  const status = statusDoTitulo(item.status);
                  return (
                    <tr key={item.id}>
                      <td>
                        <Link to={`/titulos-receber/${item.id}`}>{numeroDoTitulo(item)}</Link>
                      </td>
                      <td>{item.cliente_nome}</td>
                      <td>{nomeEmpresa(item.empresa_id)}</td>
                      <td>
                        <StatusBadge status={status.cor} label={status.rotulo} />
                      </td>
                      <td>{formatarData(item.vencimento)}</td>
                      <td>{formatarMoeda(item.saldo_centavos)}</td>
                    </tr>
                  );
                })}
              />
              <AvisoCorte mostrados={dados.titulos_vencidos.itens.length} total={dados.titulos_vencidos.total.quantidade} />
            </Bloco>

            <Bloco titulo="Contas a pagar vencidas">
              <Total
                quantidade={dados.contas_vencidas.total.quantidade}
                singular="conta"
                varios="contas"
                valor={dados.contas_vencidas.total.valor_centavos}
              />
              <Tabela
                titulo="Contas a pagar vencidas"
                colunas={['Conta', 'Empresa', 'Status', 'Vencimento', 'Valor']}
                vazio="Nenhuma conta a pagar vencida."
                linhas={dados.contas_vencidas.itens.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`/solicitacoes/${item.id}`}>{item.fornecedor_nome || item.observacao || 'Ver conta'}</Link>
                    </td>
                    <td>{nomeEmpresa(item.empresa_id)}</td>
                    <td>
                      <StatusBadge status={corStatus(item.status)} label={rotuloStatus(item.status)} />
                    </td>
                    <td>{formatarData(item.vencimento)}</td>
                    <td>{formatarMoeda(item.valor_centavos)}</td>
                  </tr>
                ))}
              />
              <AvisoCorte mostrados={dados.contas_vencidas.itens.length} total={dados.contas_vencidas.total.quantidade} />
            </Bloco>

            <Bloco titulo="Estoque baixo">
              <p className="dre-texto">
                <strong>{plural(dados.estoque_baixo.total, 'produto', 'produtos')}</strong> no mínimo ou abaixo, no grupo
                todo.
              </p>
              <Tabela
                titulo="Produtos com estoque baixo"
                colunas={['Produto', 'Código', 'Atual', 'Mínimo']}
                vazio="Nenhum produto com estoque baixo."
                linhas={dados.estoque_baixo.itens.map((item) => (
                  <tr key={item.produto_id}>
                    <td>
                      <Link to={`/produtos/${item.produto_id}`}>{item.nome}</Link>
                    </td>
                    <td>{item.codigo || '—'}</td>
                    <td>{item.quantidade_atual}</td>
                    <td>{item.estoque_minimo}</td>
                  </tr>
                ))}
              />
              <AvisoCorte mostrados={dados.estoque_baixo.itens.length} total={dados.estoque_baixo.total} />
            </Bloco>

            <Bloco titulo="Saldos bancários">
              <p className="dre-texto">
                <strong>{`Saldo total: ${formatarMoeda(dados.saldos_bancarios.saldo_total_centavos)}`}</strong>
              </p>
              <Tabela
                titulo="Saldos por conta"
                colunas={['Conta', 'Empresa', 'Saldo atual', 'Último lançamento']}
                vazio="Nenhuma conta bancária."
                linhas={dados.saldos_bancarios.contas.map((conta) => (
                  <tr key={conta.conta_bancaria_id}>
                    <td>{`${conta.apelido} · ${conta.banco_nome}`}</td>
                    <td>{nomeEmpresa(conta.empresa_id)}</td>
                    <td>
                      {conta.saldo_atual_centavos === null || conta.saldo_atual_centavos === undefined
                        ? 'Sem saldo inicial'
                        : formatarMoeda(conta.saldo_atual_centavos)}
                    </td>
                    <td>{formatarData(conta.ultimo_lancamento_em)}</td>
                  </tr>
                ))}
              />
              {dados.saldos_bancarios.contas_sem_abertura > 0 && (
                <span className="dre-form-ajuda">
                  {`${plural(
                    dados.saldos_bancarios.contas_sem_abertura,
                    'conta sem saldo inicial fica',
                    'contas sem saldo inicial ficam'
                  )} fora do total.`}
                </span>
              )}
            </Bloco>

            <Bloco titulo="Endividamento">
              <p className="dre-texto">
                <strong>{`Saldo devedor: ${formatarMoeda(dados.endividamento.saldo_devedor_centavos)}`}</strong>
                {` em ${plural(dados.endividamento.dividas, 'dívida ativa', 'dívidas ativas')}.`}
              </p>
              <Tabela
                titulo="Vencimentos das dívidas"
                colunas={['Faixa', 'Amortização', 'Juros', 'Total', 'Parcelas']}
                vazio=""
                linhas={FAIXAS_DIVIDA.map(([campo, rotulo]) => {
                  const faixa = dados.endividamento[campo];
                  return (
                    <tr key={campo}>
                      <td>{rotulo}</td>
                      <td>{formatarMoeda(faixa.amortizacao_centavos)}</td>
                      <td>{formatarMoeda(faixa.juros_centavos)}</td>
                      <td>{formatarMoeda(faixa.amortizacao_centavos + faixa.juros_centavos)}</td>
                      <td>{faixa.parcelas}</td>
                    </tr>
                  );
                })}
              />
              <Tabela
                titulo="Saldo devedor por tipo de credor"
                colunas={['Tipo de credor', 'Saldo devedor', 'Dívidas']}
                vazio=""
                linhas={dados.endividamento.por_credor.map((item) => (
                  <tr key={item.credor_tipo}>
                    <td>{rotuloCredorTipo(item.credor_tipo)}</td>
                    <td>{formatarMoeda(item.saldo_devedor_centavos)}</td>
                    <td>{item.dividas}</td>
                  </tr>
                ))}
              />
              <Link className="dre-nao-imprimir" to="/dividas/resumo">
                Ver o resumo de dívidas
              </Link>
            </Bloco>
          </div>
        </>
      ) : null}
    </div>
  );
}
