import React, { useCallback, useEffect, useState } from 'react';
import { AvisoConflito } from '../../app/components/AvisoConflito';
import { BuscaRemota } from '../../app/components/BuscaRemota';
import { Modal } from '../../app/components/Modal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { SeletorRemoto } from '../../app/components/SeletorRemoto';
import { ehConflitoDeConcorrencia } from '../../lib/api';
import { centavosParaTexto, paraCentavos } from '../../lib/formatar';
import * as clientesService from '../../services/clientes';
import * as contasService from '../../services/contasBancarias';
import * as titulosService from '../../services/titulosReceber';
import { SeletorCategoriaReceita } from '../financeiro/SeletorCategoriaDespesa';
import { hojeEmBrasilia } from '../pedidos/pedidosUtils';
import { numeroDoTitulo } from './receberUtils';
import './Receber.css';

const LIMITE_NUMERO = 30;
const LIMITE_OBSERVACAO = 1000;

const buscarClientes = (texto, sinal) =>
  clientesService
    .listarClientes({ busca: texto, ativo: 'true', tamanho: 20, sinal })
    .then((resposta) => resposta?.dados ?? []);

const opcaoDeCliente = (cliente) => ({ valor: cliente.id, rotulo: cliente.nome });
const opcaoDeConta = (conta) => ({ valor: conta.id, rotulo: `${conta.apelido} · ${conta.banco_nome}` });

function formularioDe(titulo, hoje) {
  return {
    empresa_id: titulo?.empresa_id ?? '',
    cliente_id: titulo?.cliente_id ?? '',
    numero: titulo?.numero ?? '',
    parcela: titulo ? String(titulo.parcela) : '1',
    vencimento: titulo?.vencimento ?? hoje,
    valor: titulo ? centavosParaTexto(titulo.valor_centavos) : '',
    categoria_financeira_id: titulo?.categoria_financeira_id ?? '',
    competencia: titulo?.competencia ?? '',
    conta_bancaria_id: '',
    observacao: titulo?.observacao ?? '',
  };
}

export function TituloFormModal({ titulo, nomeEmpresa, nomeCliente, onFechar, onSalvar }) {
  const editando = !!titulo;
  const hoje = hojeEmBrasilia();
  const [form, setForm] = useState(() => formularioDe(titulo, hoje));
  const [clienteNome, setClienteNome] = useState('');
  const [erros, setErros] = useState([]);
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [versao, setVersao] = useState(titulo?.versao ?? null);
  const [conflito, setConflito] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [recarregando, setRecarregando] = useState(false);
  const [recarregado, setRecarregado] = useState(false);

  const tituloId = titulo?.id ?? null;

  useEffect(() => {
    if (!tituloId || recarga === 0) return undefined;
    const controle = new AbortController();
    titulosService
      .obterTitulo(tituloId, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setVersao(resposta?.dados?.versao ?? null);
        setConflito(null);
        setRecarregado(true);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setConflito(null);
        setErroApi(e.message || 'Erro ao recarregar o título.');
      })
      .finally(() => {
        if (!controle.signal.aborted) setRecarregando(false);
      });
    return () => controle.abort();
  }, [tituloId, recarga]);

  const recarregar = () => {
    setRecarregando(true);
    setRecarga((valor) => valor + 1);
  };

  const empresaId = form.empresa_id;
  const carregarContas = useCallback(
    (sinal) => contasService.listarTodasContasBancarias({ empresa: empresaId, ativa: true, sinal }),
    [empresaId]
  );

  const alterar = (campo) => (evento) => setForm((atual) => ({ ...atual, [campo]: evento.target.value }));
  const alterarEmpresa = useCallback(
    (valor) => setForm((atual) => (atual.empresa_id === valor ? atual : { ...atual, empresa_id: valor, conta_bancaria_id: '' })),
    []
  );
  const alterarCategoria = useCallback(
    (valor) => setForm((atual) => ({ ...atual, categoria_financeira_id: valor })),
    []
  );
  const alterarConta = useCallback((valor) => setForm((atual) => ({ ...atual, conta_bancaria_id: valor })), []);

  const validar = () => {
    const novos = [];
    if (!editando && !form.empresa_id) novos.push('Selecione a empresa.');
    if (!editando && !form.cliente_id) novos.push('Selecione o cliente.');
    if (!form.numero.trim()) novos.push('Informe o número do documento.');
    else if (form.numero.trim().length > LIMITE_NUMERO) novos.push(`O número tem no máximo ${LIMITE_NUMERO} caracteres.`);
    const parcela = Number(form.parcela);
    if (!Number.isInteger(parcela) || parcela < 1 || parcela > 999) novos.push('A parcela vai de 1 a 999.');
    if (!form.vencimento) novos.push('Informe o vencimento.');
    else if (form.vencimento < hoje && form.vencimento !== titulo?.vencimento) novos.push('O vencimento não pode ser antes de hoje.');
    const centavos = paraCentavos(form.valor);
    if (!form.valor.trim() || !Number.isFinite(centavos) || centavos <= 0) novos.push('Informe um valor maior que zero.');
    if (!form.categoria_financeira_id) novos.push('Escolha a categoria de receita.');
    if (form.observacao.trim().length > LIMITE_OBSERVACAO) {
      novos.push(`A observação tem no máximo ${LIMITE_OBSERVACAO} caracteres.`);
    }
    setErros(novos);
    return novos.length === 0;
  };

  const salvar = async (evento) => {
    evento.preventDefault();
    if (!validar()) return;

    const dados = {
      numero: form.numero.trim(),
      parcela: Number(form.parcela),
      vencimento: form.vencimento,
      valor_centavos: paraCentavos(form.valor),
      categoria_financeira_id: form.categoria_financeira_id,
      ...(form.competencia ? { competencia: form.competencia } : {}),
      observacao: form.observacao.trim(),
    };
    const corpo = editando
      ? { ...dados, versao }
      : {
          empresa_id: form.empresa_id,
          cliente_id: form.cliente_id,
          ...dados,
          ...(form.conta_bancaria_id ? { conta_bancaria_id: form.conta_bancaria_id } : {}),
        };

    setSalvando(true);
    setErroApi(null);
    setConflito(null);
    setRecarregado(false);
    try {
      await onSalvar(corpo);
      onFechar();
    } catch (e) {
      if (ehConflitoDeConcorrencia(e)) setConflito(e.message);
      else setErroApi(e.message || 'Erro ao salvar o título.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo={editando ? `Editar título ${numeroDoTitulo(titulo)}` : 'Novo título a receber'}
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
            form="titulo-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando || recarregando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="titulo-form" className="receber-form" onSubmit={salvar} noValidate>
        {erroApi && (
          <div className="receber-form-erro-api" role="alert">
            {erroApi}
          </div>
        )}
        {conflito && <AvisoConflito mensagem={conflito} onRecarregar={recarregar} recarregando={recarregando} />}
        {recarregado && (
          <div className="receber-form-ajuda" role="status">
            Dados recarregados (versão {versao}). Confira o formulário e salve de novo para gravar por cima da outra
            alteração.
          </div>
        )}
        {erros.length > 0 && (
          <ul className="receber-form-erros" role="alert">
            {erros.map((erro) => (
              <li key={erro}>{erro}</li>
            ))}
          </ul>
        )}

        {editando ? (
          <div className="receber-form-linha">
            <div className="receber-form-campo">
              <span className="filter-label">Empresa</span>
              <span>{nomeEmpresa(titulo.empresa_id)}</span>
            </div>
            <div className="receber-form-campo">
              <span className="filter-label">Cliente</span>
              <span>{nomeCliente(titulo.cliente_id)}</span>
            </div>
          </div>
        ) : (
          <div className="receber-form-linha">
            <div className="receber-form-campo">
              <label className="filter-label" htmlFor="titulo-empresa">
                Empresa *
              </label>
              <SeletorEmpresa
                id="titulo-empresa"
                className="filter-input"
                valor={form.empresa_id}
                onAlterar={alterarEmpresa}
                disabled={salvando}
              />
            </div>
            <div className="receber-form-campo">
              <label className="filter-label" htmlFor="titulo-cliente">
                Cliente *
              </label>
              <BuscaRemota
                id="titulo-cliente"
                nomeBusca="cliente do título"
                valor={form.cliente_id}
                rotuloAtual={clienteNome}
                buscar={buscarClientes}
                opcaoDe={opcaoDeCliente}
                onEscolher={(cliente) => {
                  setClienteNome(cliente ? cliente.nome : '');
                  setForm((atual) => ({ ...atual, cliente_id: cliente ? cliente.id : '' }));
                }}
                placeholderBusca="Nome ou documento"
                disabled={salvando}
              />
            </div>
          </div>
        )}

        <div className="receber-form-linha">
          <div className="receber-form-campo">
            <label className="filter-label" htmlFor="titulo-numero">
              Número *
            </label>
            <input
              id="titulo-numero"
              className="filter-input"
              type="text"
              value={form.numero}
              onChange={alterar('numero')}
              maxLength={LIMITE_NUMERO}
              disabled={salvando}
            />
          </div>
          <div className="receber-form-campo">
            <label className="filter-label" htmlFor="titulo-parcela">
              Parcela *
            </label>
            <input
              id="titulo-parcela"
              className="filter-input"
              type="number"
              min="1"
              max="999"
              value={form.parcela}
              onChange={alterar('parcela')}
              disabled={salvando}
            />
          </div>
        </div>

        <div className="receber-form-linha">
          <div className="receber-form-campo">
            <label className="filter-label" htmlFor="titulo-vencimento">
              Vencimento *
            </label>
            <input
              id="titulo-vencimento"
              className="filter-input"
              type="date"
              min={hoje}
              value={form.vencimento}
              onChange={alterar('vencimento')}
              disabled={salvando}
            />
          </div>
          <div className="receber-form-campo">
            <label className="filter-label" htmlFor="titulo-valor">
              Valor *
            </label>
            <input
              id="titulo-valor"
              className="filter-input"
              type="text"
              inputMode="decimal"
              value={form.valor}
              onChange={alterar('valor')}
              disabled={salvando}
            />
          </div>
        </div>

        <div className="receber-form-linha">
          <div className="receber-form-campo">
            <label className="filter-label" htmlFor="titulo-categoria">
              Categoria de receita *
            </label>
            <SeletorCategoriaReceita
              id="titulo-categoria"
              valor={form.categoria_financeira_id}
              onAlterar={alterarCategoria}
              placeholder="Selecione…"
              disabled={salvando}
            />
          </div>
          <div className="receber-form-campo">
            <label className="filter-label" htmlFor="titulo-competencia">
              Competência
            </label>
            <input
              id="titulo-competencia"
              className="filter-input"
              type="month"
              value={form.competencia}
              onChange={alterar('competencia')}
              disabled={salvando}
            />
            <span className="receber-form-ajuda">Vazio: o mês do vencimento.</span>
          </div>
        </div>

        {!editando && (
          <div className="receber-form-campo">
            <label className="filter-label" htmlFor="titulo-conta">
              Conta de cobrança
            </label>
            {empresaId ? (
              <SeletorRemoto
                id="titulo-conta"
                className="filter-select"
                valor={form.conta_bancaria_id}
                onAlterar={alterarConta}
                carregar={carregarContas}
                opcaoDe={opcaoDeConta}
                placeholder="Sem conta (fica em carteira)"
                textoVazio="Nenhuma conta ativa nesta empresa"
                textoErro="Erro ao carregar as contas bancárias."
                selecionarUnica={false}
                disabled={salvando}
              />
            ) : (
              <select id="titulo-conta" className="filter-select" value="" disabled>
                <option value="">Escolha a empresa primeiro</option>
              </select>
            )}
            <span className="receber-form-ajuda">
              {form.conta_bancaria_id ? 'Com a conta, o título nasce em banco.' : 'Sem conta, o título fica em carteira.'}
            </span>
          </div>
        )}

        <div className="receber-form-campo">
          <label className="filter-label" htmlFor="titulo-observacao">
            Observação
          </label>
          <textarea
            id="titulo-observacao"
            className="filter-input receber-form-observacoes"
            rows={3}
            value={form.observacao}
            onChange={alterar('observacao')}
            maxLength={LIMITE_OBSERVACAO}
            disabled={salvando}
          />
        </div>
      </form>
    </Modal>
  );
}
