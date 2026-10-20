import React, { useCallback, useState } from 'react';
import { DataGrid } from '../../app/components/DataGrid';
import { SeletorRemoto } from '../../app/components/SeletorRemoto';
import { StatusBadge } from '../../app/components/StatusBadge';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import * as caixaService from '../../services/caixa';
import * as contasService from '../../services/contasBancarias';
import { Paginacao } from '../notas/Paginacao';
import { hojeEmBrasilia } from '../pedidos/pedidosUtils';
import { useConsulta } from '../pedidos/useConsulta';
import { ClassificarModal, DesfazerConciliacaoModal, TransferenciaModal } from './AcoesDoLancamento';
import { SITUACOES_LANCAMENTO, opcaoDeConta, primeiroDiaDoMes } from './caixaUtils';
import { ConciliarModal } from './ConciliarModal';
import { AlertCircle, Wand2 } from 'lucide-react';
import './Caixa.css';

const BOTAO_LINHA = { flex: 'none', width: 'auto', padding: '2px 8px' };

const carregarContas = (sinal) => contasService.listarTodasContasBancarias({ ativa: true, sinal });

function textoDoAutomatico(resultado) {
  return `Automática: ${resultado.conciliadas} conciliada(s), ${resultado.ambiguos} ambígua(s), ${resultado.sem_par} sem par, ${resultado.falhas} falha(s).`;
}

function LancamentosDaConta({ conta }) {
  const hoje = hojeEmBrasilia();
  const { itens, pagina, filtros, temProxima, carregando, erro, recarregar, irParaAnterior, irParaProxima, filtrar } =
    useConsulta(caixaService.listarLancamentosExtrato, { conta, de: primeiroDiaDoMes(hoje), ate: hoje, situacao: '' });
  const [periodo, setPeriodo] = useState({ de: filtros.de, ate: filtros.ate });
  const [acao, setAcao] = useState(null);
  const [automatico, setAutomatico] = useState(null);
  const [rodando, setRodando] = useState(false);
  const periodoInvalido = periodo.de && periodo.ate && periodo.ate < periodo.de;

  const alterarPeriodo = (campo) => (evento) => {
    const novo = { ...periodo, [campo]: evento.target.value };
    setPeriodo(novo);
    if (!(novo.de && novo.ate && novo.ate < novo.de)) filtrar({ de: novo.de, ate: novo.ate });
  };

  const rodarAutomatico = async () => {
    setRodando(true);
    setAutomatico(null);
    try {
      const resposta = await caixaService.conciliarAutomatico({ conta_bancaria_id: conta, de: filtros.de, ate: filtros.ate });
      setAutomatico({ resultado: resposta?.dados ?? null, erro: null });
      recarregar();
    } catch (e) {
      setAutomatico({ resultado: null, erro: e.message || 'Erro na conciliação automática.' });
    } finally {
      setRodando(false);
    }
  };

  const concluir = () => {
    setAcao(null);
    recarregar();
  };

  const colunas = [
    { label: 'Data', field: 'data', width: '10%', render: (data) => formatarData(data) },
    {
      label: 'Descrição',
      field: 'descricao',
      render: (descricao, lancamento) => (
        <span className="caixa-empilhado">
          {descricao}
          {lancamento.documento && <span className="caixa-secundario">Doc. {lancamento.documento}</span>}
        </span>
      ),
    },
    {
      label: 'Valor',
      field: 'valor_centavos',
      width: '13%',
      render: (valor) => <span className={valor < 0 ? 'caixa-negativo' : 'caixa-positivo'}>{formatarMoeda(valor)}</span>,
    },
    {
      label: 'Situação',
      field: 'situacao',
      width: '12%',
      render: (situacao) => {
        const item = SITUACOES_LANCAMENTO[situacao] ?? { rotulo: situacao, cor: 'neutral' };
        return <StatusBadge status={item.cor} label={item.rotulo} />;
      },
    },
    {
      label: 'Ações',
      field: 'id',
      width: '290px',
      render: (_, lancamento) =>
        lancamento.situacao === 'pendente' ? (
          <span className="caixa-celula">
            <button type="button" className="filter-btn filter-btn-primary" style={BOTAO_LINHA} onClick={() => setAcao({ tipo: 'conciliar', lancamento })}>
              Conciliar
            </button>
            <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO_LINHA} onClick={() => setAcao({ tipo: 'classificar', lancamento })}>
              Classificar
            </button>
            <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO_LINHA} onClick={() => setAcao({ tipo: 'transferencia', lancamento })}>
              Transferência
            </button>
          </span>
        ) : (
          lancamento.conciliacao_id && (
            <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO_LINHA} onClick={() => setAcao({ tipo: 'desfazer', lancamento })}>
              Desfazer
            </button>
          )
        ),
    },
  ];

  return (
    <>
      <div className="caixa-filtros-extras">
        <div className="caixa-filtro-campo">
          <label className="filter-label" htmlFor="conciliacao-de">
            De
          </label>
          <input id="conciliacao-de" className="filter-input" type="date" value={periodo.de} onChange={alterarPeriodo('de')} />
        </div>
        <div className="caixa-filtro-campo">
          <label className="filter-label" htmlFor="conciliacao-ate">
            Até
          </label>
          <input
            id="conciliacao-ate"
            className="filter-input"
            type="date"
            value={periodo.ate}
            onChange={alterarPeriodo('ate')}
            aria-invalid={periodoInvalido || undefined}
          />
        </div>
        <div className="caixa-filtro-campo">
          <label className="filter-label" htmlFor="conciliacao-situacao">
            Situação
          </label>
          <select
            id="conciliacao-situacao"
            className="filter-select"
            value={filtros.situacao}
            onChange={(evento) => filtrar({ situacao: evento.target.value })}
          >
            <option value="">Todas</option>
            {Object.entries(SITUACOES_LANCAMENTO).map(([valor, item]) => (
              <option key={valor} value={valor}>
                {item.rotulo}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="filter-btn filter-btn-secondary"
          style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={rodarAutomatico}
          disabled={rodando || !filtros.de || !filtros.ate}
        >
          <Wand2 size={14} /> Conciliar automático
        </button>
        {periodoInvalido && <span className="caixa-form-erro">O fim do período não pode ser antes do início.</span>}
      </div>
      <span className="caixa-form-ajuda">
        A automática concilia só os pares exatos e únicos (mesmo dia e mesmo valor) do período, até 92 dias. Linha sem par
        no sistema: classifique (tarifa, rendimento) ou registre como transferência entre contas.
      </span>

      {automatico && (
        <div className={automatico.erro ? 'caixa-form-erro-api' : 'caixa-resultado'} role="status">
          {automatico.erro ?? textoDoAutomatico(automatico.resultado)}
          {automatico.resultado?.restam_linhas && ' Ainda há linhas no período; rode de novo.'}
        </div>
      )}

      {erro && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}

      <div className="caixa-conteudo">
        {carregando ? (
          <div className="caixa-status">Carregando extrato…</div>
        ) : itens.length > 0 ? (
          <>
            <DataGrid columns={colunas} data={itens} selectable={false} />
            <Paginacao pagina={pagina} temProxima={temProxima} irParaAnterior={irParaAnterior} irParaProxima={irParaProxima} />
          </>
        ) : erro ? null : (
          <div className="caixa-status">Nenhuma linha do extrato no período.</div>
        )}
      </div>

      {acao?.tipo === 'conciliar' && <ConciliarModal lancamento={acao.lancamento} onConciliado={concluir} onFechar={() => setAcao(null)} />}
      {acao?.tipo === 'classificar' && <ClassificarModal lancamento={acao.lancamento} onFeito={concluir} onFechar={() => setAcao(null)} />}
      {acao?.tipo === 'transferencia' && <TransferenciaModal lancamento={acao.lancamento} onFeito={concluir} onFechar={() => setAcao(null)} />}
      {acao?.tipo === 'desfazer' && <DesfazerConciliacaoModal lancamento={acao.lancamento} onFeito={concluir} onFechar={() => setAcao(null)} />}
    </>
  );
}

export function ConciliacaoExtrato() {
  const [conta, setConta] = useState('');
  const alterarConta = useCallback((valor) => setConta(valor), []);

  return (
    <>
      <div className="caixa-filtros-extras">
        <div className="caixa-filtro-campo">
          <label className="filter-label" htmlFor="conciliacao-conta">
            Conta *
          </label>
          <SeletorRemoto
            id="conciliacao-conta"
            className="filter-select"
            valor={conta}
            onAlterar={alterarConta}
            carregar={carregarContas}
            opcaoDe={opcaoDeConta}
            textoVazio="Nenhuma conta ativa"
            textoErro="Erro ao carregar as contas bancárias."
            selecionarUnica={false}
          />
        </div>
      </div>
      {conta ? (
        <LancamentosDaConta key={conta} conta={conta} />
      ) : (
        <div className="caixa-status">Escolha a conta para ver o extrato.</div>
      )}
    </>
  );
}
