import React, { useCallback, useEffect, useState } from 'react';
import { AvisoConflito } from '../../app/components/AvisoConflito';
import { BuscaRemota } from '../../app/components/BuscaRemota';
import { Modal } from '../../app/components/Modal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { ehConflitoDeConcorrencia } from '../../lib/api';
import { centavosParaTexto, formatarData, formatarMoeda, paraCentavos } from '../../lib/formatar';
import * as contasService from '../../services/contasBancarias';
import * as dividasService from '../../services/dividas';
import * as fornecedoresService from '../../services/fornecedores';
import { SeletorCategoriaDespesa } from '../financeiro/SeletorCategoriaDespesa';
import {
  CREDOR_TIPOS,
  INDEXADORES,
  LIMITES,
  PERIODOS_TAXA,
  VALOR_MAXIMO,
  dataParaCampo,
  erroDaTaxa,
  hojeEmBrasilia,
  nomeDaConta,
  nomeDoFornecedor,
  paraTaxaBp,
  preencherParcelas,
  somarAmortizacoes,
  taxaParaTexto,
} from './dividasUtils';
import { Plus, Trash2 } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Dividas.css';

const buscarFornecedores = (texto, sinal) =>
  fornecedoresService
    .listarFornecedores({ busca: texto, ativo: 'true', tamanho: 20, sinal })
    .then((resposta) => resposta?.dados ?? []);

const opcaoDeFornecedor = (fornecedor) => ({ valor: fornecedor.id, rotulo: nomeDoFornecedor(fornecedor) });

const TITULOS = { criar: 'Nova dívida', editar: 'Editar dívida' };

let proximaChave = 0;

function novaParcela(base) {
  proximaChave += 1;
  return {
    chave: `parcela-${proximaChave}`,
    vencimento: base?.vencimento ?? '',
    amortizacao: base ? centavosParaTexto(base.amortizacao_centavos) : '',
    juros: base?.juros_centavos ? centavosParaTexto(base.juros_centavos) : '',
  };
}

function formularioDe(divida, modo, hoje) {
  const renegociando = modo === 'renegociar';
  return {
    empresa_id: divida?.empresa_id ?? '',
    fornecedor_id: divida?.fornecedor_id ?? '',
    credor_tipo: divida?.credor_tipo ?? '',
    descricao: divida?.descricao ?? '',
    contrato: renegociando ? '' : (divida?.contrato ?? ''),
    valor_original: !renegociando && divida?.valor_original_centavos ? centavosParaTexto(divida.valor_original_centavos) : '',
    contratada_em: renegociando ? '' : dataParaCampo(divida?.contratada_em),
    taxa: renegociando ? '' : taxaParaTexto(divida?.taxa_bp),
    taxa_periodo: renegociando ? '' : (divida?.taxa_periodo ?? ''),
    indexador: renegociando ? 'prefixado' : (divida?.indexador ?? 'prefixado'),
    conta_liberacao_id: renegociando ? '' : (divida?.conta_liberacao_id ?? ''),
    liberada_em: renegociando ? '' : dataParaCampo(divida?.liberada_em),
    categoria_amortizacao_id: divida?.categoria_amortizacao_id ?? '',
    categoria_juros_id: divida?.categoria_juros_id ?? '',
    observacoes: renegociando ? '' : (divida?.observacoes ?? ''),
    saldo: renegociando && divida?.saldo_devedor_centavos ? centavosParaTexto(divida.saldo_devedor_centavos) : '',
    data_saldo: renegociando ? hoje : '',
  };
}

function valorOpcional(texto) {
  return texto.trim() ? paraCentavos(texto) : null;
}

function jurosDe(texto) {
  return texto.trim() ? paraCentavos(texto) : 0;
}

function useContasDaEmpresa(empresaId) {
  const [contas, setContas] = useState([]);

  useEffect(() => {
    if (!empresaId) return undefined;
    const controle = new AbortController();
    contasService
      .listarTodasContasBancarias({ empresa: empresaId, sinal: controle.signal })
      .then((lista) => {
        if (!controle.signal.aborted) setContas(lista ?? []);
      })
      .catch(() => {
        if (!controle.signal.aborted) setContas([]);
      });
    return () => controle.abort();
  }, [empresaId]);

  return empresaId ? contas : [];
}

export function DividaFormModal({ modo, divida, hoje: hojeInformado, nomeEmpresa, nomeFornecedor, onFechar, onSalvar }) {
  const editando = modo === 'editar';
  const renegociando = modo === 'renegociar';
  const comCronograma = !editando;
  const [hoje] = useState(() => hojeInformado ?? hojeEmBrasilia());
  const [form, setForm] = useState(() => formularioDe(divida, modo, hoje));
  const [parcelas, setParcelas] = useState(() => [novaParcela()]);
  const [preencher, setPreencher] = useState({ quantidade: '', primeiro: '' });
  const [erroPreencher, setErroPreencher] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [versao, setVersao] = useState(divida?.versao ?? null);
  const [erros, setErros] = useState([]);
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [conflito, setConflito] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [recarregando, setRecarregando] = useState(false);
  const [recarregado, setRecarregado] = useState(false);

  const dividaId = divida?.id ?? null;
  const empresaId = editando || renegociando ? divida.empresa_id : form.empresa_id;
  const contas = useContasDaEmpresa(empresaId);

  useEffect(() => {
    if (!dividaId || recarga === 0) return undefined;
    const controle = new AbortController();
    dividasService
      .obterDivida(dividaId, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setVersao(resposta?.dados?.versao ?? null);
        setConflito(null);
        setRecarregado(true);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setConflito(null);
        setErroApi(e.message || 'Erro ao recarregar a dívida.');
      })
      .finally(() => {
        if (!controle.signal.aborted) setRecarregando(false);
      });
    return () => controle.abort();
  }, [dividaId, recarga]);

  const recarregar = () => {
    setRecarregando(true);
    setRecarga((valor) => valor + 1);
  };

  const alterar = (campo) => (evento) => setForm((atual) => ({ ...atual, [campo]: evento.target.value }));
  const alterarValor = (campo) => (valor) => setForm((atual) => ({ ...atual, [campo]: valor }));
  const alterarEmpresa = useCallback(
    (valor) => setForm((atual) => ({ ...atual, empresa_id: valor, conta_liberacao_id: '' })),
    []
  );

  const alterarParcela = (chave, mudancas) =>
    setParcelas((atual) => atual.map((parcela) => (parcela.chave === chave ? { ...parcela, ...mudancas } : parcela)));

  const saldo = paraCentavos(form.saldo);
  const somaAmortizacoes = somarAmortizacoes(parcelas.map((parcela) => parcela.amortizacao));
  const saldoValido = Number.isFinite(saldo) && saldo > 0;

  const preencherCronograma = () => {
    const quantidade = Number(preencher.quantidade);
    if (!saldoValido) {
      setErroPreencher('Informe antes o saldo devedor.');
      return;
    }
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > LIMITES.parcelas) {
      setErroPreencher(`Informe de 1 a ${LIMITES.parcelas} parcelas.`);
      return;
    }
    if (!preencher.primeiro) {
      setErroPreencher('Informe o primeiro vencimento.');
      return;
    }
    setErroPreencher(null);
    setParcelas(
      preencherParcelas({ quantidade, primeiroVencimento: preencher.primeiro, saldoCentavos: saldo }).map(novaParcela)
    );
  };

  const validar = () => {
    const novosErros = [];
    if (modo === 'criar' && !form.empresa_id) novosErros.push('Selecione a empresa devedora.');
    if (!editando && !form.fornecedor_id) novosErros.push('Selecione o credor.');
    if (!form.credor_tipo) novosErros.push('Escolha o tipo de credor.');
    if (!form.descricao.trim()) novosErros.push('Informe a descrição.');
    else if (form.descricao.trim().length > LIMITES.descricao) {
      novosErros.push(`A descrição tem no máximo ${LIMITES.descricao} caracteres.`);
    }
    if (form.contrato.trim().length > LIMITES.contrato) {
      novosErros.push(`O contrato tem no máximo ${LIMITES.contrato} caracteres.`);
    }
    const valorOriginal = valorOpcional(form.valor_original);
    if (valorOriginal !== null && (!Number.isFinite(valorOriginal) || valorOriginal < 1 || valorOriginal > VALOR_MAXIMO)) {
      novosErros.push('O valor original tem de ser maior que zero.');
    }
    if (form.contratada_em && form.contratada_em > hoje) novosErros.push('A data da contratação não pode ser futura.');
    const erroTaxa = erroDaTaxa(form.taxa, form.taxa_periodo);
    if (erroTaxa) novosErros.push(erroTaxa);
    if (!!form.conta_liberacao_id !== !!form.liberada_em) {
      novosErros.push('Conta e data da liberação vão juntas: informe as duas ou nenhuma.');
    }
    if (form.liberada_em && form.liberada_em > hoje) novosErros.push('A data da liberação não pode ser futura.');
    if (!form.categoria_amortizacao_id) novosErros.push('Escolha a categoria da amortização.');
    if (!form.categoria_juros_id) novosErros.push('Escolha a categoria dos juros.');
    if (form.observacoes.length > LIMITES.observacoes) {
      novosErros.push(`As observações têm no máximo ${LIMITES.observacoes} caracteres.`);
    }

    if (comCronograma) {
      if (!saldoValido || saldo > VALOR_MAXIMO) novosErros.push('Informe o saldo devedor maior que zero.');
      if (!form.data_saldo) novosErros.push('Informe a data do saldo.');
      else if (form.data_saldo > hoje) novosErros.push('A data do saldo não pode ser futura.');
      else if (renegociando && form.data_saldo < dataParaCampo(divida.data_saldo)) {
        novosErros.push(
          `A data do saldo da nova dívida não pode ser antes da data do saldo da original (${formatarData(
            divida.data_saldo
          )}).`
        );
      }
      if (parcelas.length === 0) novosErros.push('Inclua pelo menos uma parcela.');
      if (parcelas.length > LIMITES.parcelas) novosErros.push(`A dívida tem no máximo ${LIMITES.parcelas} parcelas.`);
      const vistos = new Set();
      let somaValida = true;
      parcelas.forEach((parcela, indice) => {
        const rotulo = `Parcela ${indice + 1}`;
        if (!parcela.vencimento) novosErros.push(`${rotulo}: informe o vencimento.`);
        else {
          if (form.data_saldo && parcela.vencimento <= form.data_saldo) {
            novosErros.push(`${rotulo}: o vencimento tem de ser depois da data do saldo.`);
          }
          if (vistos.has(parcela.vencimento)) novosErros.push(`${rotulo}: vencimento repetido.`);
          vistos.add(parcela.vencimento);
        }
        const amortizacao = paraCentavos(parcela.amortizacao);
        const juros = jurosDe(parcela.juros);
        const amortizacaoValida = Number.isFinite(amortizacao) && amortizacao >= 0 && amortizacao <= VALOR_MAXIMO;
        const jurosValido = Number.isFinite(juros) && juros >= 0 && juros <= VALOR_MAXIMO;
        if (!amortizacaoValida) {
          novosErros.push(`${rotulo}: amortização inválida.`);
          somaValida = false;
        }
        if (!jurosValido) novosErros.push(`${rotulo}: juros inválidos.`);
        if (amortizacaoValida && jurosValido && amortizacao === 0 && juros === 0) {
          novosErros.push(`${rotulo}: amortização e juros não podem ser os dois zero.`);
        }
      });
      if (saldoValido && somaValida && somaAmortizacoes !== saldo) {
        novosErros.push(
          `A soma das amortizações (${formatarMoeda(somaAmortizacoes)}) tem de ser igual ao saldo devedor (${formatarMoeda(
            saldo
          )}).`
        );
      }
    }

    if (renegociando) {
      if (!motivo.trim()) novosErros.push('Informe o motivo da renegociação.');
      else if (motivo.trim().length > LIMITES.motivo) {
        novosErros.push(`O motivo tem no máximo ${LIMITES.motivo} caracteres.`);
      }
    }

    setErros(novosErros);
    return novosErros.length === 0;
  };

  const dadosInformativos = () => ({
    credor_tipo: form.credor_tipo,
    descricao: form.descricao.trim(),
    contrato: form.contrato.trim() || null,
    valor_original_centavos: valorOpcional(form.valor_original),
    contratada_em: form.contratada_em || null,
    taxa_bp: paraTaxaBp(form.taxa),
    taxa_periodo: form.taxa_periodo || null,
    indexador: form.indexador,
    conta_liberacao_id: form.conta_liberacao_id || null,
    liberada_em: form.liberada_em || null,
    categoria_amortizacao_id: form.categoria_amortizacao_id,
    categoria_juros_id: form.categoria_juros_id,
    observacoes: form.observacoes.trim(),
  });

  const dadosDaDividaNova = () => ({
    fornecedor_id: form.fornecedor_id,
    ...dadosInformativos(),
    saldo_inicial_centavos: saldo,
    data_saldo: form.data_saldo,
    parcelas: [...parcelas]
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
      .map((parcela) => ({
        vencimento: parcela.vencimento,
        amortizacao_centavos: paraCentavos(parcela.amortizacao),
        juros_centavos: jurosDe(parcela.juros),
      })),
  });

  const montar = () => {
    if (editando) return { versao, ...dadosInformativos() };
    if (renegociando) return { versao, motivo: motivo.trim(), nova: dadosDaDividaNova() };
    const { fornecedor_id, ...resto } = dadosDaDividaNova();
    return { empresa_id: form.empresa_id, fornecedor_id, ...resto };
  };

  const salvar = async (evento) => {
    evento.preventDefault();
    if (!validar()) return;

    setSalvando(true);
    setErroApi(null);
    setConflito(null);
    setRecarregado(false);
    try {
      await onSalvar(montar());
      onFechar();
    } catch (e) {
      if (ehConflitoDeConcorrencia(e)) setConflito(e.message);
      else setErroApi(e.message || 'Erro ao salvar a dívida.');
    } finally {
      setSalvando(false);
    }
  };

  const titulo = renegociando ? `Renegociar "${divida.descricao}"` : TITULOS[modo];

  return (
    <Modal
      aberto
      titulo={titulo}
      onFechar={salvando ? () => {} : onFechar}
      largura="900px"
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
            form="divida-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando || recarregando}
          >
            {salvando ? 'Salvando…' : renegociando ? 'Renegociar' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="divida-form" className="dividas-form" onSubmit={salvar} noValidate>
        {erroApi && (
          <div className="dividas-form-erro-api" role="alert">
            {erroApi}
          </div>
        )}
        {conflito && <AvisoConflito mensagem={conflito} onRecarregar={recarregar} recarregando={recarregando} />}
        {recarregado && (
          <div className="dividas-form-ajuda" role="status">
            Dados recarregados (versão {versao}). Confira a dívida e salve de novo para gravar por cima da outra
            alteração.
          </div>
        )}
        {erros.length > 0 && (
          <div role="alert">
            <ul className="dividas-form-erros" aria-label="Erros do formulário">
              {erros.map((erro) => (
                <li key={erro}>{erro}</li>
              ))}
            </ul>
          </div>
        )}

        {renegociando && (
          <p className="dividas-texto">
            A original fica renegociada e as contas a pagar ainda não pagas dela são canceladas. A nova dívida é da mesma
            empresa ({nomeEmpresa(divida.empresa_id)}).{' '}
            <strong>Saldo devedor da original: {formatarMoeda(divida.saldo_devedor_centavos)}</strong>
          </p>
        )}

        <div className="dividas-form-linha">
          <div className="dividas-form-campo">
            <label className="filter-label" htmlFor="divida-empresa">
              Empresa devedora *
            </label>
            {modo === 'criar' ? (
              <SeletorEmpresa
                id="divida-empresa"
                className="filter-input"
                valor={form.empresa_id}
                onAlterar={alterarEmpresa}
                disabled={salvando}
              />
            ) : (
              <span id="divida-empresa">{nomeEmpresa(divida.empresa_id)}</span>
            )}
          </div>
          <div className="dividas-form-campo">
            <label className="filter-label" htmlFor="divida-credor">
              Credor *
            </label>
            {editando ? (
              <span id="divida-credor">{nomeFornecedor(divida.fornecedor_id)}</span>
            ) : (
              <BuscaRemota
                id="divida-credor"
                nomeBusca="credor da dívida"
                valor={form.fornecedor_id}
                rotuloAtual={nomeFornecedor(form.fornecedor_id)}
                buscar={buscarFornecedores}
                opcaoDe={opcaoDeFornecedor}
                onEscolher={(fornecedor) => setForm((atual) => ({ ...atual, fornecedor_id: fornecedor ? fornecedor.id : '' }))}
                placeholderBusca="Nome ou documento"
                disabled={salvando}
              />
            )}
            <span className="dividas-form-ajuda">
              {editando ? 'O credor não muda.' : 'Banco, investidor e Receita também são cadastrados em fornecedores.'}
            </span>
          </div>
          <div className="dividas-form-campo">
            <label className="filter-label" htmlFor="divida-credor-tipo">
              Tipo de credor *
            </label>
            <select
              id="divida-credor-tipo"
              className="filter-input"
              value={form.credor_tipo}
              onChange={alterar('credor_tipo')}
              disabled={salvando}
            >
              <option value="">Selecione…</option>
              {CREDOR_TIPOS.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="dividas-form-linha">
          <div className="dividas-form-campo">
            <label className="filter-label" htmlFor="divida-descricao">
              Descrição *
            </label>
            <input
              id="divida-descricao"
              className="filter-input"
              type="text"
              placeholder="Capital de giro Sicredi"
              value={form.descricao}
              maxLength={LIMITES.descricao}
              onChange={alterar('descricao')}
              disabled={salvando}
            />
          </div>
          <div className="dividas-form-campo">
            <label className="filter-label" htmlFor="divida-contrato">
              Contrato
            </label>
            <input
              id="divida-contrato"
              className="filter-input"
              type="text"
              value={form.contrato}
              maxLength={LIMITES.contrato}
              onChange={alterar('contrato')}
              disabled={salvando}
            />
          </div>
          <div className="dividas-form-campo">
            <label className="filter-label" htmlFor="divida-valor-original">
              Valor original
            </label>
            <input
              id="divida-valor-original"
              className="filter-input"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={form.valor_original}
              onChange={alterar('valor_original')}
              disabled={salvando}
            />
          </div>
          <div className="dividas-form-campo">
            <label className="filter-label" htmlFor="divida-contratada-em">
              Contratada em
            </label>
            <input
              id="divida-contratada-em"
              className="filter-input"
              type="date"
              value={form.contratada_em}
              max={hoje}
              onChange={alterar('contratada_em')}
              disabled={salvando}
            />
          </div>
        </div>

        <div className="dividas-form-linha">
          <div className="dividas-form-campo">
            <label className="filter-label" htmlFor="divida-taxa">
              Taxa (%)
            </label>
            <input
              id="divida-taxa"
              className="filter-input"
              type="text"
              inputMode="decimal"
              placeholder="1,85"
              value={form.taxa}
              onChange={alterar('taxa')}
              disabled={salvando}
            />
          </div>
          <div className="dividas-form-campo">
            <label className="filter-label" htmlFor="divida-taxa-periodo">
              Período da taxa
            </label>
            <select
              id="divida-taxa-periodo"
              className="filter-input"
              value={form.taxa_periodo}
              onChange={alterar('taxa_periodo')}
              disabled={salvando}
            >
              <option value="">—</option>
              {PERIODOS_TAXA.map((periodo) => (
                <option key={periodo.valor} value={periodo.valor}>
                  {periodo.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div className="dividas-form-campo">
            <label className="filter-label" htmlFor="divida-indexador">
              Indexador
            </label>
            <select
              id="divida-indexador"
              className="filter-input"
              value={form.indexador}
              onChange={alterar('indexador')}
              disabled={salvando}
            >
              {INDEXADORES.map((indexador) => (
                <option key={indexador.valor} value={indexador.valor}>
                  {indexador.rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>
        <span className="dividas-form-ajuda">
          Valor original, contrato, taxa e liberação são só informativos: o que vale é o saldo e o cronograma.
        </span>

        <div className="dividas-form-linha">
          <div className="dividas-form-campo">
            <label className="filter-label" htmlFor="divida-conta-liberacao">
              Conta da liberação
            </label>
            <select
              id="divida-conta-liberacao"
              className="filter-input"
              value={form.conta_liberacao_id}
              onChange={alterar('conta_liberacao_id')}
              disabled={salvando || !empresaId}
            >
              <option value="">Nenhuma</option>
              {form.conta_liberacao_id && !contas.some((conta) => conta.id === form.conta_liberacao_id) && (
                <option value={form.conta_liberacao_id}>Conta atual</option>
              )}
              {contas.map((conta) => (
                <option key={conta.id} value={conta.id}>
                  {nomeDaConta(conta)}
                </option>
              ))}
            </select>
            <span className="dividas-form-ajuda">O crédito é classificado no caixa como captação.</span>
          </div>
          <div className="dividas-form-campo">
            <label className="filter-label" htmlFor="divida-liberada-em">
              Liberada em
            </label>
            <input
              id="divida-liberada-em"
              className="filter-input"
              type="date"
              value={form.liberada_em}
              max={hoje}
              onChange={alterar('liberada_em')}
              disabled={salvando}
            />
          </div>
        </div>

        <div className="dividas-form-linha">
          <div className="dividas-form-campo">
            <label className="filter-label" htmlFor="divida-categoria-amortizacao">
              Categoria da amortização *
            </label>
            <SeletorCategoriaDespesa
              id="divida-categoria-amortizacao"
              linhaDre="fora_dre"
              valor={form.categoria_amortizacao_id}
              onAlterar={alterarValor('categoria_amortizacao_id')}
              placeholder="Selecione…"
              disabled={salvando}
            />
            <span className="dividas-form-ajuda">Despesa fora da DRE.</span>
          </div>
          <div className="dividas-form-campo">
            <label className="filter-label" htmlFor="divida-categoria-juros">
              Categoria dos juros *
            </label>
            <SeletorCategoriaDespesa
              id="divida-categoria-juros"
              linhaDre="resultado_financeiro"
              valor={form.categoria_juros_id}
              onAlterar={alterarValor('categoria_juros_id')}
              placeholder="Selecione…"
              disabled={salvando}
            />
            <span className="dividas-form-ajuda">
              {editando ? 'Vale para as contas ainda não geradas.' : 'Resultado financeiro: juros, encargos e IOF.'}
            </span>
          </div>
        </div>

        <div className="dividas-form-campo">
          <label className="filter-label" htmlFor="divida-observacoes">
            Observações
          </label>
          <textarea
            id="divida-observacoes"
            className="filter-input"
            rows={2}
            value={form.observacoes}
            maxLength={LIMITES.observacoes}
            onChange={alterar('observacoes')}
            disabled={salvando}
          />
        </div>

        {comCronograma && (
          <>
            <div className="dividas-form-linha">
              <div className="dividas-form-campo">
                <label className="filter-label" htmlFor="divida-saldo">
                  Saldo devedor na data do saldo *
                </label>
                <input
                  id="divida-saldo"
                  className="filter-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={form.saldo}
                  onChange={alterar('saldo')}
                  disabled={salvando}
                />
              </div>
              <div className="dividas-form-campo">
                <label className="filter-label" htmlFor="divida-data-saldo">
                  Data do saldo *
                </label>
                <input
                  id="divida-data-saldo"
                  className="filter-input"
                  type="date"
                  value={form.data_saldo}
                  max={hoje}
                  onChange={alterar('data_saldo')}
                  disabled={salvando}
                />
              </div>
            </div>
            <span className="dividas-form-ajuda">
              Dívida já existente entra pelo saldo na data de corte, só com as parcelas que vencem depois dela. Na dívida
              nova, use o valor e a data da liberação.
            </span>

            <div className="dividas-itens">
              <div className="dividas-itens-cabecalho">
                <span className="filter-label">Cronograma</span>
                <button
                  type="button"
                  className="filter-btn filter-btn-secondary"
                  style={{ flex: 'none', width: 'auto', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => setParcelas((atual) => [...atual, novaParcela()])}
                  disabled={salvando}
                >
                  <Plus size={14} /> Adicionar parcela
                </button>
              </div>
              <div className="dividas-form-linha">
                <div className="dividas-form-campo">
                  <label className="filter-label" htmlFor="divida-preencher-quantidade">
                    Quantidade de parcelas
                  </label>
                  <input
                    id="divida-preencher-quantidade"
                    className="filter-input"
                    type="number"
                    min="1"
                    max={LIMITES.parcelas}
                    step="1"
                    value={preencher.quantidade}
                    onChange={(evento) => setPreencher((atual) => ({ ...atual, quantidade: evento.target.value }))}
                    disabled={salvando}
                  />
                </div>
                <div className="dividas-form-campo">
                  <label className="filter-label" htmlFor="divida-preencher-primeiro">
                    Primeiro vencimento
                  </label>
                  <input
                    id="divida-preencher-primeiro"
                    className="filter-input"
                    type="date"
                    value={preencher.primeiro}
                    onChange={(evento) => setPreencher((atual) => ({ ...atual, primeiro: evento.target.value }))}
                    disabled={salvando}
                  />
                </div>
                <div className="dividas-form-campo dividas-form-campo-botao">
                  <button
                    type="button"
                    className="filter-btn filter-btn-secondary"
                    style={{ flex: 'none', width: 'auto', padding: '6px 12px' }}
                    onClick={preencherCronograma}
                    disabled={salvando}
                  >
                    Preencher parcelas
                  </button>
                </div>
              </div>
              {erroPreencher && (
                <div className="dividas-form-erro-api" role="alert">
                  {erroPreencher}
                </div>
              )}
              <span className="dividas-form-ajuda">
                Preencher monta parcelas mensais com a amortização dividida igualmente (a sobra de centavos vai na última)
                e troca as linhas atuais; digite os juros de cada uma. Juros vazio vale zero.
              </span>
              <div className="datagrid-container">
                <table className="datagrid">
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th>Vencimento</th>
                      <th>Amortização</th>
                      <th>Juros, encargos e IOF</th>
                      <th aria-label="Remover" />
                    </tr>
                  </thead>
                  <tbody>
                    {parcelas.map((parcela, indice) => (
                      <tr key={parcela.chave}>
                        <td>{indice + 1}</td>
                        <td>
                          <input
                            className="filter-input"
                            type="date"
                            aria-label={`Vencimento da parcela ${indice + 1}`}
                            value={parcela.vencimento}
                            onChange={(evento) => alterarParcela(parcela.chave, { vencimento: evento.target.value })}
                            disabled={salvando}
                          />
                        </td>
                        <td>
                          <input
                            className="filter-input dividas-numero"
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            aria-label={`Amortização da parcela ${indice + 1}`}
                            value={parcela.amortizacao}
                            onChange={(evento) => alterarParcela(parcela.chave, { amortizacao: evento.target.value })}
                            disabled={salvando}
                          />
                        </td>
                        <td>
                          <input
                            className="filter-input dividas-numero"
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            aria-label={`Juros da parcela ${indice + 1}`}
                            value={parcela.juros}
                            onChange={(evento) => alterarParcela(parcela.chave, { juros: evento.target.value })}
                            disabled={salvando}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="leads-acao-btn leads-acao-perigo"
                            title={`Remover a parcela ${indice + 1}`}
                            aria-label={`Remover a parcela ${indice + 1}`}
                            onClick={() => setParcelas((atual) => atual.filter((outra) => outra.chave !== parcela.chave))}
                            disabled={salvando || parcelas.length === 1}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="dividas-itens-total">
                Soma das amortizações: <strong>{formatarMoeda(somaAmortizacoes)}</strong>{' '}
                {saldoValido &&
                  (somaAmortizacoes === saldo ? (
                    <span className="dividas-soma-ok">— confere com o saldo</span>
                  ) : (
                    <span className="dividas-soma-diferente">
                      — difere do saldo em {formatarMoeda(Math.abs(saldo - somaAmortizacoes))}
                    </span>
                  ))}
              </div>
            </div>
          </>
        )}

        {renegociando && (
          <div className="dividas-form-campo">
            <label className="filter-label" htmlFor="divida-motivo">
              Motivo da renegociação *
            </label>
            <textarea
              id="divida-motivo"
              className="filter-input"
              rows={2}
              value={motivo}
              maxLength={LIMITES.motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              disabled={salvando}
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
