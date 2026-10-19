import React, { useCallback, useEffect, useState } from 'react';
import { AvisoConflito } from '../../app/components/AvisoConflito';
import { BuscaRemota } from '../../app/components/BuscaRemota';
import { Modal } from '../../app/components/Modal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { ehConflitoDeConcorrencia } from '../../lib/api';
import { centavosParaTexto, formatarMoeda, paraCentavos } from '../../lib/formatar';
import * as clientesService from '../../services/clientes';
import * as pedidosService from '../../services/pedidos';
import * as produtosService from '../../services/produtos';
import * as precosService from '../../services/tabelaPrecos';
import { erroDoPercentual, paraPontosBase, pontosBaseParaTexto } from '../clientes/clientesUtils';
import { LIMITES, MODELOS, dataParaCampo, descricaoDoModelo, hojeEmBrasilia } from './pedidosUtils';
import { useModelosVenda } from './useModelosVenda';
import { Plus, Trash2 } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Pedidos.css';

const buscarClientes = (texto, sinal) =>
  clientesService.listarClientes({ busca: texto, ativo: 'true', tamanho: 20, sinal }).then((resposta) => resposta?.dados ?? []);

const buscarProdutos = (texto, sinal) =>
  produtosService.listarProdutos({ busca: texto, ativo: 'true', tamanho: 20, sinal }).then((resposta) => resposta?.dados ?? []);

const opcaoDeCliente = (cliente) => ({ valor: cliente.id, rotulo: cliente.nome });

const opcaoDeProduto = (produto) => ({
  valor: produto.id,
  rotulo: produto.codigo ? `${produto.nome} (${produto.codigo})` : produto.nome,
});

const DIAS_VALIDADE = 15;

function somarDias(data, dias) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

async function precoDoDia(modelo, produtoId) {
  try {
    const resposta = await precosService.listarPrecosVigentes({ modelo, produto: produtoId, tamanho: 1 });
    return resposta?.dados?.[0]?.preco_centavos ?? null;
  } catch {
    return null;
  }
}

function inteiroOpcional(texto) {
  return texto.trim() ? Number(texto) : null;
}

let proximaChave = 0;

function novoItem(base) {
  proximaChave += 1;
  return {
    chave: `item-${proximaChave}`,
    produto_id: base?.produto_id ?? '',
    quantidade: base ? String(base.quantidade) : '',
    preco: base ? centavosParaTexto(base.preco_unitario_centavos) : '',
    tabela: base?.preco_tabela_centavos ?? null,
  };
}

function formularioDe(pedido) {
  return {
    empresa_id: pedido?.empresa_id ?? '',
    cliente_id: pedido?.cliente_id ?? '',
    obra_id: pedido?.obra_id ?? '',
    representante_id: pedido?.representante_id ?? '',
    modelo: pedido?.modelo ?? 'pronta_entrega',
    prazo_limite: dataParaCampo(pedido?.prazo_limite),
    numero_pedido_cliente: pedido?.numero_pedido_cliente ?? '',
    observacoes: pedido?.observacoes ?? '',
    validade: pedido ? dataParaCampo(pedido.validade) : somarDias(hojeEmBrasilia(), DIAS_VALIDADE),
    entrada: pedido?.condicao ? pontosBaseParaTexto(pedido.condicao.entrada_bp) : '',
    prazo_boleto_dias: pedido?.condicao?.prazo_boleto_dias ? String(pedido.condicao.prazo_boleto_dias) : '',
    prazo_entrega_dias: pedido?.condicao?.prazo_entrega_dias ? String(pedido.condicao.prazo_entrega_dias) : '',
    frete_tipo: pedido?.frete_tipo ?? '',
    frete_estimado: pedido?.frete_estimado_centavos ? centavosParaTexto(pedido.frete_estimado_centavos) : '',
  };
}

function subtotalDe(item) {
  const quantidade = Number(item.quantidade);
  const preco = paraCentavos(item.preco);
  return Number.isInteger(quantidade) && quantidade > 0 && Number.isFinite(preco) ? quantidade * preco : 0;
}

function textoDoDesconto(item) {
  const preco = paraCentavos(item.preco);
  if (item.tabela === null || !item.preco.trim() || !Number.isFinite(preco)) return '—';
  const desconto = item.tabela - preco;
  if (desconto === 0) return '—';
  return desconto > 0 ? formatarMoeda(desconto) : `${formatarMoeda(-desconto)} acima`;
}

function useObrasDoCliente(clienteId) {
  const [estado, setEstado] = useState({ clienteId: null, obras: [] });

  useEffect(() => {
    if (!clienteId) return undefined;
    const controle = new AbortController();
    clientesService
      .listarObras(clienteId, { ativas: 'true', tamanho: 100, sinal: controle.signal })
      .then((resposta) => {
        if (!controle.signal.aborted) setEstado({ clienteId, obras: resposta?.dados ?? [] });
      })
      .catch(() => {
        if (!controle.signal.aborted) setEstado({ clienteId, obras: [] });
      });
    return () => controle.abort();
  }, [clienteId]);

  return estado.clienteId === clienteId ? estado.obras : [];
}

export function PropostaFormModal({ pedido, representantes, nomeCliente, nomeProduto, nomeEmpresa, onFechar, onSalvar }) {
  const editando = !!pedido;
  const [form, setForm] = useState(() => formularioDe(pedido));
  const [itens, setItens] = useState(() => (pedido?.itens?.length ? pedido.itens.map(novoItem) : [novoItem()]));
  const [versao, setVersao] = useState(pedido?.versao ?? null);
  const [erros, setErros] = useState([]);
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [conflito, setConflito] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [recarregando, setRecarregando] = useState(false);
  const [recarregado, setRecarregado] = useState(false);
  const obras = useObrasDoCliente(form.cliente_id);
  const modelosVenda = useModelosVenda();

  const pedidoId = pedido?.id ?? null;

  useEffect(() => {
    if (!pedidoId || recarga === 0) return undefined;
    const controle = new AbortController();
    pedidosService
      .obterPedido(pedidoId, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setVersao(resposta?.dados?.versao ?? null);
        setConflito(null);
        setRecarregado(true);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setConflito(null);
        setErroApi(e.message || 'Erro ao recarregar o pedido.');
      })
      .finally(() => {
        if (!controle.signal.aborted) setRecarregando(false);
      });
    return () => controle.abort();
  }, [pedidoId, recarga]);

  const recarregar = () => {
    setRecarregando(true);
    setRecarga((valor) => valor + 1);
  };

  const alterar = (campo) => (event) => setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const alterarModelo = async (event) => {
    const modelo = event.target.value;
    setForm((atual) => ({ ...atual, modelo, entrada: '', prazo_boleto_dias: '', prazo_entrega_dias: '' }));
    const comProduto = itens.filter((item) => item.produto_id);
    const tabelas = await Promise.all(comProduto.map((item) => precoDoDia(modelo, item.produto_id)));
    const porProduto = Object.fromEntries(comProduto.map((item, indice) => [item.produto_id, tabelas[indice]]));
    setItens((atual) =>
      atual.map((item) => (item.produto_id in porProduto ? { ...item, tabela: porProduto[item.produto_id] } : item))
    );
  };
  const alterarEmpresa = useCallback((valor) => setForm((atual) => ({ ...atual, empresa_id: valor })), []);

  const escolherCliente = (cliente) =>
    setForm((atual) => ({
      ...atual,
      cliente_id: cliente ? cliente.id : '',
      obra_id: '',
      representante_id: cliente?.representante_id ?? '',
    }));

  const alterarItem = (chave, mudancas) =>
    setItens((atual) => atual.map((item) => (item.chave === chave ? { ...item, ...mudancas } : item)));

  const escolherProduto = async (chave, produto) => {
    if (!produto) {
      alterarItem(chave, { produto_id: '', tabela: null });
      return;
    }
    alterarItem(chave, { produto_id: produto.id });
    const tabela = await precoDoDia(form.modelo, produto.id);
    const sugerido = tabela ?? produto.preco_centavos ?? null;
    const mudancas = { tabela: sugerido };
    if (sugerido !== null) mudancas.preco = centavosParaTexto(sugerido);
    alterarItem(chave, mudancas);
  };

  const total = itens.reduce((soma, item) => soma + subtotalDe(item), 0);
  const prontaEntrega = form.modelo === 'pronta_entrega';

  const validar = () => {
    const novosErros = [];
    if (!editando && !form.empresa_id) novosErros.push('Selecione a empresa.');
    if (!form.cliente_id) novosErros.push('Selecione o cliente.');
    if (itens.length === 0) novosErros.push('Inclua pelo menos um item.');
    const vistos = new Set();
    itens.forEach((item, indice) => {
      const rotulo = `Item ${indice + 1}`;
      if (!item.produto_id) novosErros.push(`${rotulo}: escolha o produto.`);
      else if (vistos.has(item.produto_id)) novosErros.push(`${rotulo}: produto repetido no pedido.`);
      vistos.add(item.produto_id);
      const quantidade = Number(item.quantidade);
      if (!Number.isInteger(quantidade) || quantidade <= 0) {
        novosErros.push(`${rotulo}: quantidade inteira maior que zero.`);
      }
      const preco = paraCentavos(item.preco);
      if (!item.preco.trim() || !Number.isFinite(preco) || preco < 0) novosErros.push(`${rotulo}: preço inválido.`);
    });
    const hoje = hojeEmBrasilia();
    if (!editando && !form.validade) novosErros.push('Informe a validade da proposta.');
    else if (form.validade && form.validade < hoje && form.validade !== dataParaCampo(pedido?.validade)) {
      novosErros.push('A validade não pode ser antes de hoje.');
    }
    if (prontaEntrega) {
      const boleto = inteiroOpcional(form.prazo_boleto_dias);
      if (boleto !== null && (!Number.isInteger(boleto) || boleto < 1 || boleto > 365)) {
        novosErros.push('O prazo do boleto vai de 1 a 365 dias.');
      }
    } else {
      if (erroDoPercentual(form.entrada)) novosErros.push('A entrada vai de 0 a 100%, com até duas casas.');
      const entrega = inteiroOpcional(form.prazo_entrega_dias);
      if (entrega !== null && (!Number.isInteger(entrega) || entrega < 1 || entrega > 730)) {
        novosErros.push('O prazo de entrega vai de 1 a 730 dias.');
      }
    }
    const frete = form.frete_estimado.trim() ? paraCentavos(form.frete_estimado) : null;
    if (frete !== null && (!Number.isFinite(frete) || frete < 0)) novosErros.push('Informe um frete estimado válido.');
    else if (form.frete_tipo === 'cif' && frete === null) novosErros.push('Informe o frete estimado do CIF.');
    if (form.numero_pedido_cliente.trim().length > LIMITES.numero_pedido_cliente) {
      novosErros.push(`O número do pedido do cliente tem no máximo ${LIMITES.numero_pedido_cliente} caracteres.`);
    }
    setErros(novosErros);
    return novosErros.length === 0;
  };

  const salvar = async (event) => {
    event.preventDefault();
    if (!validar()) return;

    const dados = {
      empresa_id: form.empresa_id,
      cliente_id: form.cliente_id,
      obra_id: form.obra_id || null,
      representante_id: form.representante_id || null,
      modelo: form.modelo,
      prazo_limite: prontaEntrega && form.prazo_limite ? form.prazo_limite : null,
      numero_pedido_cliente: form.numero_pedido_cliente.trim() || null,
      observacoes: form.observacoes.trim(),
      frete_tipo: form.frete_tipo || null,
      frete_estimado_centavos: form.frete_tipo && form.frete_estimado.trim() ? paraCentavos(form.frete_estimado) : null,
      itens: itens.map((item) => ({
        produto_id: item.produto_id,
        quantidade: Number(item.quantidade),
        preco_unitario_centavos: paraCentavos(item.preco),
      })),
    };
    if (form.validade) dados.validade = form.validade;
    if (prontaEntrega) {
      if (form.prazo_boleto_dias.trim()) dados.prazo_boleto_dias = Number(form.prazo_boleto_dias);
    } else {
      if (form.entrada.trim()) dados.entrada_bp = paraPontosBase(form.entrada);
      if (form.prazo_entrega_dias.trim()) dados.prazo_entrega_dias = Number(form.prazo_entrega_dias);
    }
    if (editando) dados.versao = versao;

    setSalvando(true);
    setErroApi(null);
    setConflito(null);
    setRecarregado(false);
    try {
      await onSalvar(dados);
      onFechar();
    } catch (e) {
      if (ehConflitoDeConcorrencia(e)) setConflito(e.message);
      else setErroApi(e.message || 'Erro ao salvar a proposta.');
    } finally {
      setSalvando(false);
    }
  };

  const opcoesRepresentante = (representantes || []).filter(
    (representante) => representante.ativo || representante.id === form.representante_id
  );
  const obraAtualForaDaLista = form.obra_id && !obras.some((obra) => obra.id === form.obra_id);

  return (
    <Modal
      aberto
      titulo={editando ? `Editar Proposta ${pedido.numero}` : 'Nova Proposta'}
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
            form="proposta-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando || recarregando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="proposta-form" className="pedidos-form" onSubmit={salvar} noValidate>
        {erroApi && (
          <div className="pedidos-form-erro-api" role="alert">
            {erroApi}
          </div>
        )}
        {conflito && <AvisoConflito mensagem={conflito} onRecarregar={recarregar} recarregando={recarregando} />}
        {recarregado && (
          <div className="pedidos-form-ajuda" role="status">
            Dados recarregados (versão {versao}). Confira a proposta e salve de novo para gravar por cima da outra
            alteração.
          </div>
        )}
        {erros.length > 0 && (
          <ul className="pedidos-form-erros" role="alert">
            {erros.map((erro) => (
              <li key={erro}>{erro}</li>
            ))}
          </ul>
        )}

        <div className="pedidos-form-linha">
          <div className="pedidos-form-campo">
            <label className="filter-label" htmlFor="proposta-empresa">
              Empresa *
            </label>
            {editando ? (
              <span id="proposta-empresa">{nomeEmpresa(pedido.empresa_id)}</span>
            ) : (
              <SeletorEmpresa
                id="proposta-empresa"
                className="filter-input"
                valor={form.empresa_id}
                onAlterar={alterarEmpresa}
                disabled={salvando}
              />
            )}
          </div>
          <div className="pedidos-form-campo">
            <label className="filter-label" htmlFor="proposta-cliente">
              Cliente *
            </label>
            <BuscaRemota
              id="proposta-cliente"
              nomeBusca="cliente do pedido"
              valor={form.cliente_id}
              rotuloAtual={nomeCliente(form.cliente_id)}
              buscar={buscarClientes}
              opcaoDe={opcaoDeCliente}
              onEscolher={escolherCliente}
              placeholderBusca="Nome ou documento"
              disabled={salvando}
            />
          </div>
        </div>

        <div className="pedidos-form-linha">
          <div className="pedidos-form-campo">
            <label className="filter-label" htmlFor="proposta-obra">
              Obra
            </label>
            <select
              id="proposta-obra"
              className="filter-input"
              value={form.obra_id}
              onChange={alterar('obra_id')}
              disabled={salvando || !form.cliente_id}
            >
              <option value="">{form.cliente_id ? 'Sem obra' : 'Escolha o cliente primeiro'}</option>
              {obraAtualForaDaLista && <option value={form.obra_id}>Obra atual</option>}
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="pedidos-form-campo">
            <label className="filter-label" htmlFor="proposta-representante">
              Representante do pedido
            </label>
            <select
              id="proposta-representante"
              className="filter-input"
              value={form.representante_id}
              onChange={alterar('representante_id')}
              disabled={salvando || !representantes}
            >
              <option value="">Padrão do cliente</option>
              {opcoesRepresentante.map((representante) => (
                <option key={representante.id} value={representante.id}>
                  {representante.ativo ? representante.nome : `${representante.nome} (inativo)`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pedidos-form-linha">
          <div className="pedidos-form-campo">
            <label className="filter-label" htmlFor="proposta-modelo">
              Modelo *
            </label>
            <select
              id="proposta-modelo"
              className="filter-input"
              value={form.modelo}
              onChange={alterarModelo}
              disabled={salvando}
            >
              {MODELOS.map((modelo) => (
                <option key={modelo.valor} value={modelo.valor}>
                  {modelo.rotulo}
                </option>
              ))}
            </select>
            <span className="pedidos-form-ajuda">
              {modelosVenda[form.modelo]?.condicoes?.join(' ') ?? descricaoDoModelo(form.modelo)}
            </span>
          </div>
          {prontaEntrega ? (
            <div className="pedidos-form-campo">
              <label className="filter-label" htmlFor="proposta-prazo">
                Prazo limite
              </label>
              <input
                id="proposta-prazo"
                className="filter-input"
                type="date"
                value={form.prazo_limite}
                onChange={alterar('prazo_limite')}
                disabled={salvando}
              />
            </div>
          ) : (
            <div className="pedidos-form-campo">
              <span className="filter-label">Prazo limite</span>
              <span className="pedidos-form-ajuda">Calculado quando a entrada for paga.</span>
            </div>
          )}
        </div>

        <div className="pedidos-form-linha">
          <div className="pedidos-form-campo">
            <label className="filter-label" htmlFor="proposta-validade">
              Validade da proposta{editando ? '' : ' *'}
            </label>
            <input
              id="proposta-validade"
              className="filter-input"
              type="date"
              value={form.validade}
              onChange={alterar('validade')}
              disabled={salvando}
            />
            <span className="pedidos-form-ajuda">
              {editando ? 'Vazia: renova para hoje + 15 dias.' : 'Padrão: hoje + 15 dias. Vencida, não confirma.'}
            </span>
          </div>
          {prontaEntrega ? (
            <div className="pedidos-form-campo">
              <label className="filter-label" htmlFor="proposta-boleto">
                Prazo do boleto (dias)
              </label>
              <input
                id="proposta-boleto"
                className="filter-input"
                type="number"
                min="1"
                max="365"
                placeholder={String(modelosVenda.pronta_entrega?.condicao?.prazo_boleto_dias ?? 30)}
                value={form.prazo_boleto_dias}
                onChange={alterar('prazo_boleto_dias')}
                disabled={salvando}
              />
            </div>
          ) : (
            <div className="pedidos-form-campo pedidos-form-linha">
              <div className="pedidos-form-campo">
                <label className="filter-label" htmlFor="proposta-entrada">
                  Entrada (%)
                </label>
                <input
                  id="proposta-entrada"
                  className="filter-input"
                  type="text"
                  inputMode="decimal"
                  placeholder={pontosBaseParaTexto(modelosVenda.importacao?.condicao?.entrada_bp ?? 3000)}
                  value={form.entrada}
                  onChange={alterar('entrada')}
                  disabled={salvando}
                />
              </div>
              <div className="pedidos-form-campo">
                <label className="filter-label" htmlFor="proposta-prazo-entrega">
                  Prazo de entrega (dias)
                </label>
                <input
                  id="proposta-prazo-entrega"
                  className="filter-input"
                  type="number"
                  min="1"
                  max="730"
                  placeholder={String(modelosVenda.importacao?.condicao?.prazo_entrega_dias ?? 120)}
                  value={form.prazo_entrega_dias}
                  onChange={alterar('prazo_entrega_dias')}
                  disabled={salvando}
                />
              </div>
            </div>
          )}
        </div>
        <span className="pedidos-form-ajuda">Condições vazias ficam com o padrão do modelo.</span>

        <div className="pedidos-form-linha">
          <div className="pedidos-form-campo">
            <label className="filter-label" htmlFor="proposta-frete-tipo">
              Frete
            </label>
            <select
              id="proposta-frete-tipo"
              className="filter-input"
              value={form.frete_tipo}
              onChange={alterar('frete_tipo')}
              disabled={salvando}
            >
              <option value="">Sem frete na proposta</option>
              <option value="cif">CIF (por conta do vendedor)</option>
              <option value="fob">FOB (por conta do cliente)</option>
            </select>
          </div>
          <div className="pedidos-form-campo">
            <label className="filter-label" htmlFor="proposta-frete-valor">
              Frete estimado
            </label>
            <input
              id="proposta-frete-valor"
              className="filter-input"
              type="text"
              inputMode="decimal"
              value={form.frete_estimado}
              onChange={alterar('frete_estimado')}
              disabled={salvando || !form.frete_tipo}
            />
            <span className="pedidos-form-ajuda">Informativo: não soma ao total; o frete real fica na entrega.</span>
          </div>
        </div>

        <div className="pedidos-form-linha">
          <div className="pedidos-form-campo">
            <label className="filter-label" htmlFor="proposta-numero-cliente">
              Nº do pedido do cliente
            </label>
            <input
              id="proposta-numero-cliente"
              className="filter-input"
              type="text"
              placeholder="Ordem de compra"
              value={form.numero_pedido_cliente}
              onChange={alterar('numero_pedido_cliente')}
              maxLength={LIMITES.numero_pedido_cliente}
              disabled={salvando}
            />
          </div>
          <div className="pedidos-form-campo">
            <label className="filter-label" htmlFor="proposta-observacoes">
              Observações
            </label>
            <input
              id="proposta-observacoes"
              className="filter-input"
              type="text"
              value={form.observacoes}
              onChange={alterar('observacoes')}
              maxLength={LIMITES.observacoes}
              disabled={salvando}
            />
          </div>
        </div>

        <div className="pedidos-itens">
          <div className="pedidos-itens-cabecalho">
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
            <table className="datagrid pedidos-itens-tabela">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Quantidade</th>
                  <th>Preço unitário</th>
                  <th>Tabela</th>
                  <th>Desconto</th>
                  <th>Subtotal</th>
                  <th aria-label="Remover" />
                </tr>
              </thead>
              <tbody>
                {itens.map((item, indice) => (
                  <tr key={item.chave}>
                    <td className="pedidos-itens-produto">
                      <BuscaRemota
                        id={`proposta-produto-${item.chave}`}
                        nomeBusca={`produto do item ${indice + 1}`}
                        rotuloSelecao={`Produto do item ${indice + 1}`}
                        valor={item.produto_id}
                        rotuloAtual={nomeProduto(item.produto_id)}
                        buscar={buscarProdutos}
                        opcaoDe={opcaoDeProduto}
                        onEscolher={(produto) => escolherProduto(item.chave, produto)}
                        placeholderBusca="Nome ou código"
                        disabled={salvando}
                      />
                    </td>
                    <td>
                      <input
                        className="filter-input pedidos-itens-numero"
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
                        className="filter-input pedidos-itens-numero"
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        aria-label={`Preço do item ${indice + 1}`}
                        value={item.preco}
                        onChange={(evento) => alterarItem(item.chave, { preco: evento.target.value })}
                        disabled={salvando}
                      />
                    </td>
                    <td>{item.tabela === null ? '—' : formatarMoeda(item.tabela)}</td>
                    <td>{textoDoDesconto(item)}</td>
                    <td>{formatarMoeda(subtotalDe(item))}</td>
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
          <div className="pedidos-itens-total">
            Total: <strong>{formatarMoeda(total)}</strong>
          </div>
        </div>
      </form>
    </Modal>
  );
}
