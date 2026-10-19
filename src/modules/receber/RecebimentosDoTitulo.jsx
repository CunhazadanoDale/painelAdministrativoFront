import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { AcaoModal } from '../../app/components/AcaoModal';
import { SeletorRemoto } from '../../app/components/SeletorRemoto';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { centavosParaTexto, formatarData, formatarMoeda, paraCentavos } from '../../lib/formatar';
import * as contasService from '../../services/contasBancarias';
import { SeletorCategoriaDespesa } from '../financeiro/SeletorCategoriaDespesa';
import { hojeEmBrasilia } from '../pedidos/pedidosUtils';
import { numeroDoTitulo } from './receberUtils';
import { useRecebimentos } from './useRecebimentos';
import { AlertCircle } from 'lucide-react';
import '../../app/components/DataGrid.css';

const LIMITE_MOTIVO = 500;

const opcaoDeConta = (conta) => ({ valor: conta.id, rotulo: `${conta.apelido} · ${conta.banco_nome}` });
const nomeDaConta = (conta) => (conta ? `${conta.apelido} · ${conta.banco_nome}` : undefined);

function centavosOpcionais(texto) {
  return texto.trim() ? paraCentavos(texto) : 0;
}

export function RecebimentoModal({ titulo, onConfirmar, onFechar, onRecarregar }) {
  const antecipado = titulo.status === 'antecipado';
  const hoje = hojeEmBrasilia();
  const [tipo, setTipo] = useState('conta');
  const [contaId, setContaId] = useState('');
  const [recebidoEm, setRecebidoEm] = useState(hoje);
  const [valor, setValor] = useState(centavosParaTexto(titulo.saldo_centavos));
  const [juros, setJuros] = useState('');
  const [desconto, setDesconto] = useState('');
  const [repasseVencimento, setRepasseVencimento] = useState('');
  const [repasseCategoria, setRepasseCategoria] = useState('');
  const empresaId = titulo.empresa_id;
  const carregarContas = useCallback(
    (sinal) => contasService.listarTodasContasBancarias({ empresa: empresaId, ativa: true, sinal }),
    [empresaId]
  );
  const emConta = tipo === 'conta';
  const exigeRepasse = antecipado && emConta;
  const outraConta = emConta && titulo.conta_bancaria_id && contaId && contaId !== titulo.conta_bancaria_id;

  const validar = () => {
    const erros = [];
    if (emConta && !contaId) erros.push('Escolha a conta onde o dinheiro entrou.');
    if (!recebidoEm) erros.push('Informe a data do recebimento.');
    else if (recebidoEm > hoje) erros.push('A data do recebimento não pode estar no futuro.');
    const centavos = paraCentavos(valor);
    const centavosJuros = centavosOpcionais(juros);
    const centavosDesconto = centavosOpcionais(desconto);
    if (!valor.trim() || !Number.isFinite(centavos) || centavos <= 0) erros.push('Informe um valor recebido maior que zero.');
    if (!Number.isFinite(centavosJuros) || centavosJuros < 0) erros.push('Os juros não podem ser negativos.');
    if (!Number.isFinite(centavosDesconto) || centavosDesconto < 0) erros.push('O desconto não pode ser negativo.');
    else if (Number.isFinite(centavos) && centavos + centavosDesconto > titulo.saldo_centavos) {
      erros.push(`Valor mais desconto passa do saldo (${formatarMoeda(titulo.saldo_centavos)}).`);
    }
    if (exigeRepasse) {
      if (!repasseVencimento) erros.push('Informe o vencimento do repasse.');
      if (!repasseCategoria) erros.push('Escolha a categoria de despesa do repasse.');
    }
    return erros;
  };

  const confirmar = () =>
    onConfirmar({
      tipo,
      ...(emConta ? { conta_bancaria_id: contaId } : {}),
      recebido_em: recebidoEm,
      valor_centavos: paraCentavos(valor),
      juros_centavos: emConta ? centavosOpcionais(juros) : 0,
      desconto_centavos: centavosOpcionais(desconto),
      ...(exigeRepasse
        ? { repasse: { vencimento: repasseVencimento, categoria_financeira_id: repasseCategoria } }
        : {}),
    });

  return (
    <AcaoModal
      titulo={`Recebimento do título ${numeroDoTitulo(titulo)}`}
      rotuloConfirmar="Registrar"
      validar={validar}
      onConfirmar={confirmar}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
      largura="600px"
    >
      <p className="receber-texto">
        Saldo atual: {formatarMoeda(titulo.saldo_centavos)}. Quando o saldo zera, o título vira recebido.
      </p>
      <div className="receber-form-linha">
        {antecipado && (
          <div className="receber-form-campo">
            <label className="filter-label" htmlFor="recebimento-tipo">
              Tipo *
            </label>
            <select
              id="recebimento-tipo"
              className="filter-select"
              value={tipo}
              onChange={(evento) => setTipo(evento.target.value)}
            >
              <option value="conta">Em conta da empresa</option>
              <option value="fomento">Pago direto ao fomento</option>
            </select>
          </div>
        )}
        {emConta && (
          <div className="receber-form-campo">
            <label className="filter-label" htmlFor="recebimento-conta">
              Conta *
            </label>
            <SeletorRemoto
              id="recebimento-conta"
              className="filter-select"
              valor={contaId}
              onAlterar={setContaId}
              carregar={carregarContas}
              opcaoDe={opcaoDeConta}
              textoVazio="Nenhuma conta ativa nesta empresa"
              textoErro="Erro ao carregar as contas bancárias."
            />
          </div>
        )}
        <div className="receber-form-campo">
          <label className="filter-label" htmlFor="recebimento-data">
            Recebido em *
          </label>
          <input
            id="recebimento-data"
            className="filter-input"
            type="date"
            max={hoje}
            value={recebidoEm}
            onChange={(evento) => setRecebidoEm(evento.target.value)}
          />
        </div>
      </div>
      {outraConta && (
        <span className="receber-form-ajuda">Recebido numa conta diferente da conta de cobrança do título.</span>
      )}
      <div className="receber-form-linha">
        <div className="receber-form-campo">
          <label className="filter-label" htmlFor="recebimento-valor">
            Valor recebido *
          </label>
          <input
            id="recebimento-valor"
            className="filter-input"
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(evento) => setValor(evento.target.value)}
          />
        </div>
        {emConta && (
          <div className="receber-form-campo">
            <label className="filter-label" htmlFor="recebimento-juros">
              Juros e multa
            </label>
            <input
              id="recebimento-juros"
              className="filter-input"
              type="text"
              inputMode="decimal"
              value={juros}
              onChange={(evento) => setJuros(evento.target.value)}
            />
          </div>
        )}
        <div className="receber-form-campo">
          <label className="filter-label" htmlFor="recebimento-desconto">
            Desconto
          </label>
          <input
            id="recebimento-desconto"
            className="filter-input"
            type="text"
            inputMode="decimal"
            value={desconto}
            onChange={(evento) => setDesconto(evento.target.value)}
          />
        </div>
      </div>
      {exigeRepasse && (
        <>
          <p className="receber-texto">
            O título está antecipado: o dinheiro recebido em conta é do fomento, e a baixa gera a conta a pagar do
            repasse ao fomento no valor recebido (sem juros).
          </p>
          <div className="receber-form-linha">
            <div className="receber-form-campo">
              <label className="filter-label" htmlFor="recebimento-repasse-vencimento">
                Vencimento do repasse *
              </label>
              <input
                id="recebimento-repasse-vencimento"
                className="filter-input"
                type="date"
                value={repasseVencimento}
                onChange={(evento) => setRepasseVencimento(evento.target.value)}
              />
            </div>
            <div className="receber-form-campo">
              <label className="filter-label" htmlFor="recebimento-repasse-categoria">
                Categoria do repasse *
              </label>
              <SeletorCategoriaDespesa
                id="recebimento-repasse-categoria"
                valor={repasseCategoria}
                onAlterar={setRepasseCategoria}
                placeholder="Selecione…"
              />
            </div>
          </div>
        </>
      )}
    </AcaoModal>
  );
}

export function EstornoRecebimentoModal({ recebimento, onConfirmar, onFechar, onRecarregar }) {
  const hoje = hojeEmBrasilia();
  const [motivo, setMotivo] = useState('');
  const [data, setData] = useState(hoje);

  const validar = () => {
    const erros = [];
    if (!motivo.trim()) erros.push('Informe o motivo do estorno.');
    else if (motivo.trim().length > LIMITE_MOTIVO) erros.push(`O motivo tem no máximo ${LIMITE_MOTIVO} caracteres.`);
    if (!data) erros.push('Informe a data do estorno.');
    else if (data > hoje) erros.push('A data do estorno não pode estar no futuro.');
    else if (data < recebimento.recebido_em) erros.push('A data do estorno não pode ser antes do recebimento.');
    return erros;
  };

  return (
    <AcaoModal
      titulo={`Estornar recebimento de ${formatarData(recebimento.recebido_em)}`}
      rotuloConfirmar="Estornar"
      validar={validar}
      onConfirmar={() => onConfirmar(recebimento.id, { motivo: motivo.trim(), estornado_em: data })}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="receber-texto">
        O recebimento fica registrado, marcado como estornado, e o saldo volta para o título. Título recebido volta ao
        status de antes da baixa.
      </p>
      <div className="receber-form-campo">
        <label className="filter-label" htmlFor="estorno-recebimento-motivo">
          Motivo *
        </label>
        <textarea
          id="estorno-recebimento-motivo"
          className="filter-input"
          rows={3}
          maxLength={LIMITE_MOTIVO}
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
        />
      </div>
      <div className="receber-form-campo">
        <label className="filter-label" htmlFor="estorno-recebimento-data">
          Data do estorno *
        </label>
        <input
          id="estorno-recebimento-data"
          className="filter-input"
          type="date"
          min={recebimento.recebido_em}
          max={hoje}
          value={data}
          onChange={(evento) => setData(evento.target.value)}
        />
      </div>
    </AcaoModal>
  );
}

function situacaoDoRecebimento(recebimento) {
  if (recebimento.estornado) {
    return (
      <span className="receber-empilhado">
        <StatusBadge status="danger" label="Estornado" />
        {recebimento.estorno && (
          <span className="receber-secundario">
            {formatarData(recebimento.estorno.estornado_em)}: {recebimento.estorno.motivo}
          </span>
        )}
      </span>
    );
  }
  if (recebimento.repasse) {
    return <Link to={`/solicitacoes/${recebimento.repasse.solicitacao_id}`}>Repasse ao fomento</Link>;
  }
  if (recebimento.registrou_entrada_pedido) return 'Registrou a entrada do pedido';
  return <StatusBadge status="success" label="Vigente" />;
}

export function RecebimentosDoTitulo({ titulo, geracao, onEstornar, onRecarregar }) {
  const { recebimentos, carregando, erro, recarregar } = useRecebimentos(titulo.id, geracao);
  const nomeConta = useNomesPorId(
    recebimentos.map((recebimento) => recebimento.conta_bancaria_id),
    contasService.obterContaBancaria,
    nomeDaConta
  );
  const [estornando, setEstornando] = useState(null);

  if (erro) {
    return (
      <div className="leads-erro">
        <AlertCircle size={16} />
        <span>{erro}</span>
        <button type="button" onClick={recarregar}>
          Tentar novamente
        </button>
      </div>
    );
  }
  if (carregando && recebimentos.length === 0) return <div className="receber-secundario">Carregando recebimentos…</div>;
  if (recebimentos.length === 0) return <div className="receber-secundario">Nenhum recebimento registrado.</div>;

  return (
    <>
      <div className="datagrid-container">
        <table className="datagrid" aria-label="Recebimentos do título">
          <thead>
            <tr>
              <th>Recebido em</th>
              <th>Onde</th>
              <th>Valor</th>
              <th>Juros</th>
              <th>Desconto</th>
              <th>Entrada no caixa</th>
              <th>Situação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {recebimentos.map((recebimento) => {
              const estornavel =
                !recebimento.estornado && !recebimento.repasse && !recebimento.registrou_entrada_pedido;
              return (
                <tr key={recebimento.id}>
                  <td>{formatarData(recebimento.recebido_em)}</td>
                  <td>{recebimento.tipo === 'fomento' ? 'Direto no fomento' : nomeConta(recebimento.conta_bancaria_id)}</td>
                  <td>{formatarMoeda(recebimento.valor_centavos)}</td>
                  <td>{formatarMoeda(recebimento.juros_centavos)}</td>
                  <td>{formatarMoeda(recebimento.desconto_centavos)}</td>
                  <td>{formatarMoeda(recebimento.entrada_no_caixa_centavos)}</td>
                  <td>{situacaoDoRecebimento(recebimento)}</td>
                  <td>
                    {estornavel && (
                      <button
                        type="button"
                        className="filter-btn filter-btn-secondary"
                        style={{ flex: 'none', width: 'auto', padding: '2px 10px' }}
                        onClick={() => setEstornando(recebimento)}
                      >
                        Estornar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {estornando && (
        <EstornoRecebimentoModal
          recebimento={estornando}
          onConfirmar={onEstornar}
          onFechar={() => setEstornando(null)}
          onRecarregar={onRecarregar}
        />
      )}
    </>
  );
}
