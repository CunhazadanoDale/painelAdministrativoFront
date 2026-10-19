import React, { useCallback, useEffect, useState } from 'react';
import { AvisoConflito } from '../../app/components/AvisoConflito';
import { BuscaRemota } from '../../app/components/BuscaRemota';
import { Modal } from '../../app/components/Modal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { ehConflitoDeConcorrencia } from '../../lib/api';
import { centavosParaTexto, paraCentavos } from '../../lib/formatar';
import * as recorrentesService from '../../services/despesasRecorrentes';
import * as fornecedoresService from '../../services/fornecedores';
import { FORMAS_PAGAMENTO } from '../solicitacoes/solicitacoesUtils';
import { SeletorCategoriaDespesa } from './SeletorCategoriaDespesa';
import './Financeiro.css';

const LIMITE_DESCRICAO = 1000;

const buscarFornecedores = (texto, sinal) =>
  fornecedoresService
    .listarFornecedores({ busca: texto, ativo: 'true', tamanho: 20, sinal })
    .then((resposta) => resposta?.dados ?? []);

const opcaoDeFornecedor = (fornecedor) => ({ valor: fornecedor.id, rotulo: fornecedor.nome });

function formularioDe(despesa) {
  return {
    empresa_id: despesa?.empresa_id ?? '',
    fornecedor_id: despesa?.fornecedor_id ?? '',
    categoria_financeira_id: despesa?.categoria_financeira_id ?? '',
    descricao: despesa?.descricao ?? '',
    valor: despesa ? centavosParaTexto(despesa.valor_centavos) : '',
    estimado: !!despesa?.estimado,
    forma_pagamento: despesa?.forma_pagamento ?? 'boleto',
    dia_vencimento: despesa ? String(despesa.dia_vencimento) : '',
    vencimento_mes_seguinte: !!despesa?.vencimento_mes_seguinte,
    inicio: despesa?.inicio ?? '',
    fim: despesa?.fim ?? '',
  };
}

export function DespesaRecorrenteFormModal({ despesa, nomeEmpresa, nomeFornecedor, onFechar, onSalvar }) {
  const editando = !!despesa;
  const [form, setForm] = useState(() => formularioDe(despesa));
  const [versao, setVersao] = useState(despesa?.versao ?? null);
  const [erros, setErros] = useState([]);
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [conflito, setConflito] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [recarregando, setRecarregando] = useState(false);
  const [recarregado, setRecarregado] = useState(false);

  const despesaId = despesa?.id ?? null;

  useEffect(() => {
    if (!despesaId || recarga === 0) return undefined;
    const controle = new AbortController();
    recorrentesService
      .obterDespesaRecorrente(despesaId, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setVersao(resposta?.dados?.versao ?? null);
        setConflito(null);
        setRecarregado(true);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setConflito(null);
        setErroApi(e.message || 'Erro ao recarregar a despesa recorrente.');
      })
      .finally(() => {
        if (!controle.signal.aborted) setRecarregando(false);
      });
    return () => controle.abort();
  }, [despesaId, recarga]);

  const recarregar = () => {
    setRecarregando(true);
    setRecarga((valor) => valor + 1);
  };

  const alterar = (campo) => (evento) => setForm((atual) => ({ ...atual, [campo]: evento.target.value }));
  const marcar = (campo) => (evento) => setForm((atual) => ({ ...atual, [campo]: evento.target.checked }));
  const alterarEmpresa = useCallback((valor) => setForm((atual) => ({ ...atual, empresa_id: valor })), []);
  const alterarCategoria = useCallback(
    (valor) => setForm((atual) => ({ ...atual, categoria_financeira_id: valor })),
    []
  );

  const validar = () => {
    const novos = [];
    if (!editando && !form.empresa_id) novos.push('Selecione a empresa.');
    if (!form.descricao.trim()) novos.push('Informe a descrição.');
    else if (form.descricao.trim().length > LIMITE_DESCRICAO) {
      novos.push(`A descrição tem no máximo ${LIMITE_DESCRICAO} caracteres.`);
    }
    const centavos = paraCentavos(form.valor);
    if (!form.valor.trim() || !Number.isFinite(centavos) || centavos <= 0) novos.push('Informe um valor maior que zero.');
    if (!form.categoria_financeira_id) novos.push('Escolha a categoria financeira.');
    const dia = Number(form.dia_vencimento);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) novos.push('O dia do vencimento vai de 1 a 31.');
    if (!form.inicio) novos.push('Informe a competência de início.');
    else if (form.fim && form.fim < form.inicio) novos.push('O fim não pode ser antes do início.');
    setErros(novos);
    return novos.length === 0;
  };

  const salvar = async (evento) => {
    evento.preventDefault();
    if (!validar()) return;

    const dados = {
      fornecedor_id: form.fornecedor_id || null,
      categoria_financeira_id: form.categoria_financeira_id,
      descricao: form.descricao.trim(),
      valor_centavos: paraCentavos(form.valor),
      estimado: form.estimado,
      forma_pagamento: form.forma_pagamento,
      dia_vencimento: Number(form.dia_vencimento),
      vencimento_mes_seguinte: form.vencimento_mes_seguinte,
      inicio: form.inicio,
      fim: form.fim || null,
    };
    const corpo = editando ? { ...dados, versao } : { empresa_id: form.empresa_id, ...dados };

    setSalvando(true);
    setErroApi(null);
    setConflito(null);
    setRecarregado(false);
    try {
      await onSalvar(corpo);
      onFechar();
    } catch (e) {
      if (ehConflitoDeConcorrencia(e)) setConflito(e.message);
      else setErroApi(e.message || 'Erro ao salvar a despesa recorrente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo={editando ? 'Editar despesa recorrente' : 'Nova despesa recorrente'}
      onFechar={salvando ? () => {} : onFechar}
      largura="640px"
      rodape={
        <>
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', padding: '8px 16px' }}
            onClick={onFechar}
            disabled={salvando}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="despesa-recorrente-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando || recarregando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="despesa-recorrente-form" className="financeiro-form" onSubmit={salvar} noValidate>
        {erroApi && (
          <div className="financeiro-form-erro-api" role="alert">
            {erroApi}
          </div>
        )}
        {conflito && <AvisoConflito mensagem={conflito} onRecarregar={recarregar} recarregando={recarregando} />}
        {recarregado && (
          <div className="financeiro-form-ajuda" role="status">
            Dados recarregados (versão {versao}). Confira o formulário e salve de novo para gravar por cima da outra
            alteração.
          </div>
        )}
        {erros.length > 0 && (
          <ul className="financeiro-form-erros" role="alert">
            {erros.map((erro) => (
              <li key={erro}>{erro}</li>
            ))}
          </ul>
        )}

        <div className="financeiro-form-linha">
          <div className="financeiro-form-campo">
            <label className="filter-label" htmlFor="recorrente-empresa">
              Empresa *
            </label>
            {editando ? (
              <span id="recorrente-empresa">{nomeEmpresa(despesa.empresa_id)}</span>
            ) : (
              <SeletorEmpresa
                id="recorrente-empresa"
                className="filter-input"
                valor={form.empresa_id}
                onAlterar={alterarEmpresa}
                disabled={salvando}
              />
            )}
          </div>
          <div className="financeiro-form-campo">
            <label className="filter-label" htmlFor="recorrente-forma">
              Forma de pagamento *
            </label>
            <select
              id="recorrente-forma"
              className="filter-input"
              value={form.forma_pagamento}
              onChange={alterar('forma_pagamento')}
              disabled={salvando}
            >
              {FORMAS_PAGAMENTO.map((forma) => (
                <option key={forma.valor} value={forma.valor}>
                  {forma.rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="financeiro-form-campo">
          <label className="filter-label" htmlFor="recorrente-descricao">
            Descrição *
          </label>
          <input
            id="recorrente-descricao"
            className="filter-input"
            type="text"
            placeholder="Ex.: Aluguel do galpão"
            value={form.descricao}
            onChange={alterar('descricao')}
            maxLength={LIMITE_DESCRICAO}
            disabled={salvando}
          />
          <span className="financeiro-form-ajuda">Vira a observação de cada solicitação gerada.</span>
        </div>

        <div className="financeiro-form-linha">
          <div className="financeiro-form-campo">
            <label className="filter-label" htmlFor="recorrente-valor">
              Valor *
            </label>
            <input
              id="recorrente-valor"
              className="filter-input"
              type="text"
              inputMode="decimal"
              value={form.valor}
              onChange={alterar('valor')}
              disabled={salvando}
            />
            <label className="financeiro-checkbox" htmlFor="recorrente-estimado">
              <input
                id="recorrente-estimado"
                type="checkbox"
                checked={form.estimado}
                onChange={marcar('estimado')}
                disabled={salvando}
              />
              Valor variável (estimado)
            </label>
          </div>
          <div className="financeiro-form-campo">
            <label className="filter-label" htmlFor="recorrente-dia">
              Dia do vencimento *
            </label>
            <input
              id="recorrente-dia"
              className="filter-input"
              type="number"
              min="1"
              max="31"
              value={form.dia_vencimento}
              onChange={alterar('dia_vencimento')}
              disabled={salvando}
            />
            <label className="financeiro-checkbox" htmlFor="recorrente-mes-seguinte">
              <input
                id="recorrente-mes-seguinte"
                type="checkbox"
                checked={form.vencimento_mes_seguinte}
                onChange={marcar('vencimento_mes_seguinte')}
                disabled={salvando}
              />
              Vence no mês seguinte à competência
            </label>
          </div>
        </div>

        <div className="financeiro-form-linha">
          <div className="financeiro-form-campo">
            <label className="filter-label" htmlFor="recorrente-fornecedor">
              Fornecedor
            </label>
            <BuscaRemota
              id="recorrente-fornecedor"
              nomeBusca="fornecedor da despesa"
              valor={form.fornecedor_id}
              rotuloAtual={nomeFornecedor(form.fornecedor_id)}
              buscar={buscarFornecedores}
              opcaoDe={opcaoDeFornecedor}
              onEscolher={(fornecedor) =>
                setForm((atual) => ({ ...atual, fornecedor_id: fornecedor ? fornecedor.id : '' }))
              }
              placeholderBusca="Nome ou documento"
              disabled={salvando}
            />
          </div>
          <div className="financeiro-form-campo">
            <label className="filter-label" htmlFor="recorrente-categoria">
              Categoria financeira *
            </label>
            <SeletorCategoriaDespesa
              id="recorrente-categoria"
              valor={form.categoria_financeira_id}
              onAlterar={alterarCategoria}
              placeholder="Selecione…"
              disabled={salvando}
            />
          </div>
        </div>

        <div className="financeiro-form-linha">
          <div className="financeiro-form-campo">
            <label className="filter-label" htmlFor="recorrente-inicio">
              Início *
            </label>
            <input
              id="recorrente-inicio"
              className="filter-input"
              type="month"
              value={form.inicio}
              onChange={alterar('inicio')}
              disabled={salvando}
            />
          </div>
          <div className="financeiro-form-campo">
            <label className="filter-label" htmlFor="recorrente-fim">
              Fim
            </label>
            <input
              id="recorrente-fim"
              className="filter-input"
              type="month"
              value={form.fim}
              onChange={alterar('fim')}
              disabled={salvando}
            />
            <span className="financeiro-form-ajuda">Vazio: sem data para acabar.</span>
          </div>
        </div>
        {editando && (
          <span className="financeiro-form-ajuda">Editar não muda as solicitações já geradas.</span>
        )}
      </form>
    </Modal>
  );
}
