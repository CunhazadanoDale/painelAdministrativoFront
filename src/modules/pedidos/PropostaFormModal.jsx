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
import { LIMITES, MODELOS, dataParaCampo, descricaoDoModelo } from './pedidosUtils';
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

let proximaChave = 0;

function novoItem(base) {
  proximaChave += 1;
  return {
    chave: `item-${proximaChave}`,
    produto_id: base?.produto_id ?? '',
    quantidade: base ? String(base.quantidade) : '',
    preco: base ? centavosParaTexto(base.preco_unitario_centavos) : '',
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
  };
}

function subtotalDe(item) {
  const quantidade = Number(item.quantidade);
  const preco = paraCentavos(item.preco);
  return Number.isInteger(quantidade) && quantidade > 0 && Number.isFinite(preco) ? quantidade * preco : 0;
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

  const escolherProduto = (chave, produto) => {
    const mudancas = { produto_id: produto ? produto.id : '' };
    const sugerido = produto?.preco_centavos;
    if (sugerido !== null && sugerido !== undefined) mudancas.preco = centavosParaTexto(sugerido);
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
      itens: itens.map((item) => ({
        produto_id: item.produto_id,
        quantidade: Number(item.quantidade),
        preco_unitario_centavos: paraCentavos(item.preco),
      })),
    };
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
              onChange={alterar('modelo')}
              disabled={salvando}
            >
              {MODELOS.map((modelo) => (
                <option key={modelo.valor} value={modelo.valor}>
                  {modelo.rotulo}
                </option>
              ))}
            </select>
            <span className="pedidos-form-ajuda">{descricaoDoModelo(form.modelo)}</span>
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
