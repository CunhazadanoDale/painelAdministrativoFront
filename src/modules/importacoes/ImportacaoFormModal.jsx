import React, { useCallback, useEffect, useState } from 'react';
import { AvisoConflito } from '../../app/components/AvisoConflito';
import { BuscaRemota } from '../../app/components/BuscaRemota';
import { Modal } from '../../app/components/Modal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { ehConflitoDeConcorrencia } from '../../lib/api';
import { centavosParaTexto } from '../../lib/formatar';
import * as fornecedoresService from '../../services/fornecedores';
import * as importacoesService from '../../services/importacoes';
import * as produtosService from '../../services/produtos';
import {
  LIMITES,
  MOEDAS,
  VALOR_MAXIMO,
  dataParaCampo,
  formatarValorMoeda,
  nomeDoFornecedor,
  paraCentesimos,
} from './importacoesUtils';
import { Plus, Trash2 } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Importacoes.css';

const buscarFornecedores = (texto, sinal) =>
  fornecedoresService
    .listarFornecedores({ busca: texto, ativo: 'true', tamanho: 20, sinal })
    .then((resposta) => resposta?.dados ?? []);

const buscarProdutos = (texto, sinal) =>
  produtosService.listarProdutos({ busca: texto, ativo: 'true', tamanho: 20, sinal }).then((resposta) => resposta?.dados ?? []);

const opcaoDeFornecedor = (fornecedor) => ({
  valor: fornecedor.id,
  rotulo: `${nomeDoFornecedor(fornecedor)} · ${fornecedor.moeda_padrao}`,
});

const opcaoDeProduto = (produto) => ({
  valor: produto.id,
  rotulo: produto.codigo ? `${produto.nome} (${produto.codigo})` : produto.nome,
});

let proximaChave = 0;

function novoItem(base) {
  proximaChave += 1;
  return {
    chave: `item-${proximaChave}`,
    produto_id: base?.produto_id ?? '',
    quantidade: base ? String(base.quantidade) : '',
    valor: base ? centavosParaTexto(base.valor_moeda_centesimos) : '',
  };
}

function formularioDe(importacao) {
  return {
    empresa_id: importacao?.empresa_id ?? '',
    fornecedor_id: importacao?.fornecedor_id ?? '',
    moeda: importacao?.moeda ?? '',
    referencia: importacao?.referencia ?? '',
    embarque_previsto: dataParaCampo(importacao?.embarque_previsto),
    chegada_prevista: dataParaCampo(importacao?.chegada_prevista),
    observacoes: importacao?.observacoes ?? '',
  };
}

function valorDoItem(item) {
  const valor = paraCentesimos(item.valor);
  return item.valor.trim() && Number.isFinite(valor) ? valor : 0;
}

export function ImportacaoFormModal({ importacao, nomeEmpresa, nomeFornecedor, nomeProduto, onFechar, onSalvar }) {
  const editando = !!importacao;
  const [form, setForm] = useState(() => formularioDe(importacao));
  const [itens, setItens] = useState(() =>
    importacao?.itens?.length ? importacao.itens.map(novoItem) : [novoItem()]
  );
  const [versao, setVersao] = useState(importacao?.versao ?? null);
  const [erros, setErros] = useState([]);
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [conflito, setConflito] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [recarregando, setRecarregando] = useState(false);
  const [recarregado, setRecarregado] = useState(false);

  const importacaoId = importacao?.id ?? null;
  const aberta = !editando || importacao.status === 'aberta';
  const parcelasAtivas = (importacao?.parcelas ?? []).filter((parcela) => parcela.status !== 'cancelada');
  const comCambioFechado = parcelasAtivas.some((parcela) => parcela.status === 'cambio_fechado');
  const podeTrocarFornecedor = aberta && !comCambioFechado;
  const podeTrocarMoeda = aberta && parcelasAtivas.length === 0;
  const exigeChegada = editando && importacao.status !== 'aberta';

  useEffect(() => {
    if (!importacaoId || recarga === 0) return undefined;
    const controle = new AbortController();
    importacoesService
      .obterImportacao(importacaoId, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setVersao(resposta?.dados?.versao ?? null);
        setConflito(null);
        setRecarregado(true);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setConflito(null);
        setErroApi(e.message || 'Erro ao recarregar a importação.');
      })
      .finally(() => {
        if (!controle.signal.aborted) setRecarregando(false);
      });
    return () => controle.abort();
  }, [importacaoId, recarga]);

  const recarregar = () => {
    setRecarregando(true);
    setRecarga((valor) => valor + 1);
  };

  const alterar = (campo) => (evento) => setForm((atual) => ({ ...atual, [campo]: evento.target.value }));
  const alterarEmpresa = useCallback((valor) => setForm((atual) => ({ ...atual, empresa_id: valor })), []);

  const escolherFornecedor = (fornecedor) =>
    setForm((atual) => ({
      ...atual,
      fornecedor_id: fornecedor ? fornecedor.id : '',
      moeda: fornecedor && podeTrocarMoeda ? fornecedor.moeda_padrao : atual.moeda,
    }));

  const alterarItem = (chave, mudancas) =>
    setItens((atual) => atual.map((item) => (item.chave === chave ? { ...item, ...mudancas } : item)));

  const moeda = form.moeda || 'BRL';
  const total = itens.reduce((soma, item) => soma + valorDoItem(item), 0);

  const validar = () => {
    const novosErros = [];
    if (!editando && !form.empresa_id) novosErros.push('Selecione a empresa importadora.');
    if (!form.fornecedor_id) novosErros.push('Selecione o fornecedor.');
    if (!form.moeda) novosErros.push('Selecione a moeda.');
    if (form.referencia.trim().length > LIMITES.referencia) {
      novosErros.push(`A referência tem no máximo ${LIMITES.referencia} caracteres.`);
    }
    if (exigeChegada && !form.chegada_prevista) novosErros.push('Depois do embarque, a chegada prevista é obrigatória.');
    if (form.embarque_previsto && form.chegada_prevista && form.chegada_prevista < form.embarque_previsto) {
      novosErros.push('A chegada prevista não pode ser antes do embarque previsto.');
    }
    if (itens.length === 0) novosErros.push('Inclua pelo menos um item.');
    const vistos = new Set();
    itens.forEach((item, indice) => {
      const rotulo = `Item ${indice + 1}`;
      if (!item.produto_id) novosErros.push(`${rotulo}: escolha o produto.`);
      else if (vistos.has(item.produto_id)) novosErros.push(`${rotulo}: produto repetido na importação.`);
      vistos.add(item.produto_id);
      const quantidade = Number(item.quantidade);
      if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 2147483647) {
        novosErros.push(`${rotulo}: quantidade inteira maior que zero.`);
      }
      const valor = paraCentesimos(item.valor);
      if (!item.valor.trim() || !Number.isFinite(valor) || valor < 0) novosErros.push(`${rotulo}: valor inválido.`);
      else if (valor > VALOR_MAXIMO) novosErros.push(`${rotulo}: valor acima do limite permitido.`);
    });
    if (total > VALOR_MAXIMO) novosErros.push('O total da importação passa do limite permitido.');
    setErros(novosErros);
    return novosErros.length === 0;
  };

  const salvar = async (evento) => {
    evento.preventDefault();
    if (!validar()) return;

    const dados = {
      fornecedor_id: form.fornecedor_id,
      moeda: form.moeda,
      referencia: form.referencia.trim() || null,
      embarque_previsto: form.embarque_previsto || null,
      chegada_prevista: form.chegada_prevista || null,
      observacoes: form.observacoes.trim(),
      itens: itens.map((item) => ({
        produto_id: item.produto_id,
        quantidade: Number(item.quantidade),
        valor_moeda_centesimos: paraCentesimos(item.valor),
      })),
    };
    if (editando) dados.versao = versao;
    else dados.empresa_id = form.empresa_id;

    setSalvando(true);
    setErroApi(null);
    setConflito(null);
    setRecarregado(false);
    try {
      await onSalvar(dados);
      onFechar();
    } catch (e) {
      if (ehConflitoDeConcorrencia(e)) setConflito(e.message);
      else setErroApi(e.message || 'Erro ao salvar a importação.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo={editando ? `Editar Importação ${importacao.numero}` : 'Nova Importação'}
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
            form="importacao-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando || recarregando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="importacao-form" className="importacoes-form" onSubmit={salvar} noValidate>
        {erroApi && (
          <div className="importacoes-form-erro-api" role="alert">
            {erroApi}
          </div>
        )}
        {conflito && <AvisoConflito mensagem={conflito} onRecarregar={recarregar} recarregando={recarregando} />}
        {recarregado && (
          <div className="importacoes-form-ajuda" role="status">
            Dados recarregados (versão {versao}). Confira a importação e salve de novo para gravar por cima da outra
            alteração.
          </div>
        )}
        {erros.length > 0 && (
          <ul className="importacoes-form-erros" role="alert">
            {erros.map((erro) => (
              <li key={erro}>{erro}</li>
            ))}
          </ul>
        )}

        <div className="importacoes-form-linha">
          <div className="importacoes-form-campo">
            <label className="filter-label" htmlFor="importacao-empresa">
              Empresa importadora *
            </label>
            {editando ? (
              <span id="importacao-empresa">{nomeEmpresa(importacao.empresa_id)}</span>
            ) : (
              <SeletorEmpresa
                id="importacao-empresa"
                className="filter-input"
                valor={form.empresa_id}
                onAlterar={alterarEmpresa}
                disabled={salvando}
              />
            )}
          </div>
          <div className="importacoes-form-campo">
            <label className="filter-label" htmlFor="importacao-fornecedor">
              Fornecedor *
            </label>
            {podeTrocarFornecedor ? (
              <BuscaRemota
                id="importacao-fornecedor"
                nomeBusca="fornecedor da importação"
                valor={form.fornecedor_id}
                rotuloAtual={nomeFornecedor(form.fornecedor_id)}
                buscar={buscarFornecedores}
                opcaoDe={opcaoDeFornecedor}
                onEscolher={escolherFornecedor}
                placeholderBusca="Nome ou documento"
                disabled={salvando}
              />
            ) : (
              <span id="importacao-fornecedor">{nomeFornecedor(form.fornecedor_id)}</span>
            )}
            {editando && !podeTrocarFornecedor && (
              <span className="importacoes-form-ajuda">
                {aberta ? 'Não muda com parcela de câmbio fechado.' : 'Só muda com a importação aberta.'}
              </span>
            )}
          </div>
          <div className="importacoes-form-campo">
            <label className="filter-label" htmlFor="importacao-moeda">
              Moeda *
            </label>
            <select
              id="importacao-moeda"
              className="filter-input"
              value={form.moeda}
              onChange={alterar('moeda')}
              disabled={salvando || !podeTrocarMoeda}
            >
              <option value="">Selecione…</option>
              {MOEDAS.map((codigo) => (
                <option key={codigo} value={codigo}>
                  {codigo}
                </option>
              ))}
            </select>
            <span className="importacoes-form-ajuda">
              {editando && !podeTrocarMoeda
                ? aberta
                  ? 'Não muda com parcelas lançadas.'
                  : 'Só muda com a importação aberta.'
                : 'Vem da moeda padrão do fornecedor.'}
            </span>
          </div>
        </div>

        <div className="importacoes-form-linha">
          <div className="importacoes-form-campo">
            <label className="filter-label" htmlFor="importacao-referencia">
              Referência (proforma / invoice)
            </label>
            <input
              id="importacao-referencia"
              className="filter-input"
              type="text"
              value={form.referencia}
              maxLength={LIMITES.referencia}
              onChange={alterar('referencia')}
              disabled={salvando}
            />
          </div>
          <div className="importacoes-form-campo">
            <label className="filter-label" htmlFor="importacao-embarque">
              Embarque previsto
            </label>
            <input
              id="importacao-embarque"
              className="filter-input"
              type="date"
              value={form.embarque_previsto}
              onChange={alterar('embarque_previsto')}
              disabled={salvando}
            />
          </div>
          <div className="importacoes-form-campo">
            <label className="filter-label" htmlFor="importacao-chegada">
              Chegada prevista{exigeChegada ? ' *' : ''}
            </label>
            <input
              id="importacao-chegada"
              className="filter-input"
              type="date"
              value={form.chegada_prevista}
              onChange={alterar('chegada_prevista')}
              disabled={salvando}
            />
          </div>
        </div>

        <div className="importacoes-form-campo">
          <label className="filter-label" htmlFor="importacao-observacoes">
            Observações
          </label>
          <textarea
            id="importacao-observacoes"
            className="filter-input"
            rows={2}
            value={form.observacoes}
            maxLength={LIMITES.observacoes}
            onChange={alterar('observacoes')}
            disabled={salvando}
          />
        </div>

        <div className="importacoes-itens">
          <div className="importacoes-itens-cabecalho">
            <span className="filter-label">Itens</span>
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', width: 'auto', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setItens((atual) => [...atual, novoItem()])}
              disabled={salvando}
            >
              <Plus size={14} /> Adicionar item
            </button>
          </div>
          <div className="datagrid-container">
            <table className="datagrid">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Quantidade</th>
                  <th>Valor total na moeda</th>
                  <th aria-label="Remover" />
                </tr>
              </thead>
              <tbody>
                {itens.map((item, indice) => (
                  <tr key={item.chave}>
                    <td className="importacoes-itens-produto">
                      <BuscaRemota
                        id={`importacao-produto-${item.chave}`}
                        nomeBusca={`produto do item ${indice + 1}`}
                        rotuloSelecao={`Produto do item ${indice + 1}`}
                        valor={item.produto_id}
                        rotuloAtual={nomeProduto(item.produto_id)}
                        buscar={buscarProdutos}
                        opcaoDe={opcaoDeProduto}
                        onEscolher={(produto) => alterarItem(item.chave, { produto_id: produto ? produto.id : '' })}
                        placeholderBusca="Nome ou código"
                        disabled={salvando}
                      />
                    </td>
                    <td>
                      <input
                        className="filter-input importacoes-numero"
                        type="number"
                        min="1"
                        step="1"
                        aria-label={`Quantidade do item ${indice + 1}`}
                        value={item.quantidade}
                        onChange={(evento) => alterarItem(item.chave, { quantidade: evento.target.value })}
                        disabled={salvando}
                      />
                    </td>
                    <td>
                      <input
                        className="filter-input importacoes-numero"
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        aria-label={`Valor do item ${indice + 1}`}
                        value={item.valor}
                        onChange={(evento) => alterarItem(item.chave, { valor: evento.target.value })}
                        disabled={salvando}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="leads-acao-btn leads-acao-perigo"
                        title={`Remover o item ${indice + 1}`}
                        aria-label={`Remover o item ${indice + 1}`}
                        onClick={() => setItens((atual) => atual.filter((outro) => outro.chave !== item.chave))}
                        disabled={salvando || itens.length === 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <span className="importacoes-form-ajuda">
            Valor total do item na moeda, como na invoice; zero é bonificação. O custo unitário sai no recebimento.
          </span>
          <div className="importacoes-itens-total">
            Total: <strong>{formatarValorMoeda(total, moeda)}</strong>
          </div>
        </div>
      </form>
    </Modal>
  );
}
