import React, { useCallback, useState } from 'react';
import { BuscaRemota } from '../../app/components/BuscaRemota';
import { Modal } from '../../app/components/Modal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { SeletorRemoto } from '../../app/components/SeletorRemoto';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData, formatarMoeda, paraCentavos } from '../../lib/formatar';
import * as clientesService from '../../services/clientes';
import * as contasService from '../../services/contasBancarias';
import * as fornecedoresService from '../../services/fornecedores';
import { hojeEmBrasilia } from '../pedidos/pedidosUtils';
import { numeroDoTitulo, taxaParaPontosBase } from './receberUtils';
import { useTitulosAntecipaveis } from './useTitulosAntecipaveis';
import '../../app/components/DataGrid.css';
import './Receber.css';

const LIMITE_NUMERO = 30;
const LIMITE_TITULOS = 200;

const buscarFomentos = (texto, sinal) =>
  fornecedoresService
    .listarFornecedores({ busca: texto, ativo: 'true', tamanho: 20, sinal })
    .then((resposta) => resposta?.dados ?? []);

const opcaoDeFornecedor = (fornecedor) => ({ valor: fornecedor.id, rotulo: fornecedor.nome });
const opcaoDeConta = (conta) => ({ valor: conta.id, rotulo: `${conta.apelido} · ${conta.banco_nome}` });

export function AntecipacaoFormModal({ onFechar, onSalvar }) {
  const hoje = hojeEmBrasilia();
  const [form, setForm] = useState({
    empresa_id: '',
    fornecedor_id: '',
    numero: '',
    operado_em: hoje,
    taxa: '',
    conta_bancaria_id: '',
    liquido: '',
  });
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [selecionados, setSelecionados] = useState([]);
  const [erros, setErros] = useState([]);
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const empresaId = form.empresa_id;
  const { titulos, erro: erroTitulos, carregando: carregandoTitulos } = useTitulosAntecipaveis(empresaId);
  const nomeCliente = useNomesPorId(
    titulos.map((titulo) => titulo.cliente_id),
    clientesService.obterCliente
  );
  const carregarContas = useCallback(
    (sinal) => contasService.listarTodasContasBancarias({ empresa: empresaId, ativa: true, sinal }),
    [empresaId]
  );

  const marcados = titulos.filter((titulo) => selecionados.includes(titulo.id));
  const bruto = marcados.reduce((soma, titulo) => soma + titulo.saldo_centavos, 0);
  const liquido = paraCentavos(form.liquido);
  const encargos = Number.isFinite(liquido) && form.liquido.trim() ? bruto - liquido : null;

  const alterar = (campo) => (evento) => setForm((atual) => ({ ...atual, [campo]: evento.target.value }));
  const alterarEmpresa = useCallback((valor) => {
    setForm((atual) => (atual.empresa_id === valor ? atual : { ...atual, empresa_id: valor, conta_bancaria_id: '' }));
    setSelecionados((atual) => (atual.length ? [] : atual));
  }, []);
  const alterarConta = useCallback((valor) => setForm((atual) => ({ ...atual, conta_bancaria_id: valor })), []);

  const alternar = (id) =>
    setSelecionados((atual) => (atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]));

  const validar = () => {
    const novos = [];
    if (!form.empresa_id) novos.push('Selecione a empresa.');
    if (!form.fornecedor_id) novos.push('Escolha o fomento.');
    if (form.numero.trim().length > LIMITE_NUMERO) novos.push(`O número tem no máximo ${LIMITE_NUMERO} caracteres.`);
    if (!form.operado_em) novos.push('Informe a data da operação.');
    else if (form.operado_em > hoje) novos.push('A data da operação não pode estar no futuro.');
    const taxa = taxaParaPontosBase(form.taxa);
    if (!Number.isFinite(taxa) || taxa < 0 || taxa > 10000) novos.push('A taxa vai de 0 a 100% ao mês.');
    if (!form.conta_bancaria_id) novos.push('Escolha a conta onde o líquido entrou.');
    if (marcados.length === 0) novos.push('Selecione ao menos um título.');
    else if (marcados.length > LIMITE_TITULOS) novos.push(`O borderô aceita no máximo ${LIMITE_TITULOS} títulos.`);
    if (marcados.length > 0 && (!Number.isFinite(liquido) || liquido <= 0 || liquido > bruto)) {
      novos.push(`O líquido precisa ser maior que zero e no máximo o bruto (${formatarMoeda(bruto)}).`);
    }
    setErros(novos);
    return novos.length === 0;
  };

  const salvar = async (evento) => {
    evento.preventDefault();
    if (!validar()) return;

    const corpo = {
      empresa_id: form.empresa_id,
      fornecedor_id: form.fornecedor_id,
      numero: form.numero.trim() || null,
      operado_em: form.operado_em,
      taxa_bp: taxaParaPontosBase(form.taxa),
      valor_liquido_centavos: liquido,
      conta_bancaria_id: form.conta_bancaria_id,
      titulo_ids: marcados.map((titulo) => titulo.id),
    };

    setSalvando(true);
    setErroApi(null);
    try {
      await onSalvar(corpo);
      onFechar();
    } catch (e) {
      setErroApi(e.message || 'Erro ao salvar a antecipação.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo="Nova antecipação"
      onFechar={salvando ? () => {} : onFechar}
      largura="760px"
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
            form="antecipacao-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="antecipacao-form" className="receber-form" onSubmit={salvar} noValidate>
        {erroApi && (
          <div className="receber-form-erro-api" role="alert">
            {erroApi}
          </div>
        )}
        {erros.length > 0 && (
          <ul className="receber-form-erros" role="alert">
            {erros.map((erro) => (
              <li key={erro}>{erro}</li>
            ))}
          </ul>
        )}

        <div className="receber-form-linha">
          <div className="receber-form-campo">
            <label className="filter-label" htmlFor="antecipacao-empresa">
              Empresa *
            </label>
            <SeletorEmpresa
              id="antecipacao-empresa"
              className="filter-input"
              valor={form.empresa_id}
              onAlterar={alterarEmpresa}
              disabled={salvando}
            />
          </div>
          <div className="receber-form-campo">
            <label className="filter-label" htmlFor="antecipacao-fomento">
              Fomento *
            </label>
            <BuscaRemota
              id="antecipacao-fomento"
              nomeBusca="fomento"
              valor={form.fornecedor_id}
              rotuloAtual={fornecedorNome}
              buscar={buscarFomentos}
              opcaoDe={opcaoDeFornecedor}
              onEscolher={(fornecedor) => {
                setFornecedorNome(fornecedor ? fornecedor.nome : '');
                setForm((atual) => ({ ...atual, fornecedor_id: fornecedor ? fornecedor.id : '' }));
              }}
              placeholderBusca="Nome ou documento"
              disabled={salvando}
            />
          </div>
        </div>

        <div className="receber-form-linha">
          <div className="receber-form-campo">
            <label className="filter-label" htmlFor="antecipacao-numero">
              Número do borderô
            </label>
            <input
              id="antecipacao-numero"
              className="filter-input"
              type="text"
              value={form.numero}
              onChange={alterar('numero')}
              maxLength={LIMITE_NUMERO}
              disabled={salvando}
            />
          </div>
          <div className="receber-form-campo">
            <label className="filter-label" htmlFor="antecipacao-operado-em">
              Operado em *
            </label>
            <input
              id="antecipacao-operado-em"
              className="filter-input"
              type="date"
              max={hoje}
              value={form.operado_em}
              onChange={alterar('operado_em')}
              disabled={salvando}
            />
          </div>
        </div>

        <div className="receber-form-linha">
          <div className="receber-form-campo">
            <label className="filter-label" htmlFor="antecipacao-taxa">
              Taxa ao mês (%)
            </label>
            <input
              id="antecipacao-taxa"
              className="filter-input"
              type="text"
              inputMode="decimal"
              placeholder="Ex.: 2,5"
              value={form.taxa}
              onChange={alterar('taxa')}
              disabled={salvando}
            />
            <span className="receber-form-ajuda">Informativa; os encargos saem do bruto menos o líquido.</span>
          </div>
          <div className="receber-form-campo">
            <label className="filter-label" htmlFor="antecipacao-conta">
              Conta do crédito *
            </label>
            {empresaId ? (
              <SeletorRemoto
                id="antecipacao-conta"
                className="filter-select"
                valor={form.conta_bancaria_id}
                onAlterar={alterarConta}
                carregar={carregarContas}
                opcaoDe={opcaoDeConta}
                textoVazio="Nenhuma conta ativa nesta empresa"
                textoErro="Erro ao carregar as contas bancárias."
                disabled={salvando}
              />
            ) : (
              <select id="antecipacao-conta" className="filter-select" value="" disabled>
                <option value="">Escolha a empresa primeiro</option>
              </select>
            )}
          </div>
        </div>

        <div className="receber-form-campo">
          <span className="filter-label">Títulos em carteira ou em banco *</span>
          {!empresaId ? (
            <span className="receber-secundario">Escolha a empresa para ver os títulos.</span>
          ) : erroTitulos ? (
            <span className="receber-form-erro" role="alert">
              {erroTitulos}
            </span>
          ) : carregandoTitulos ? (
            <span className="receber-secundario">Carregando títulos…</span>
          ) : titulos.length === 0 ? (
            <span className="receber-secundario">Nenhum título com saldo para antecipar nesta empresa.</span>
          ) : (
            <div className="datagrid-container receber-selecao">
              <table className="datagrid" aria-label="Títulos para antecipar">
                <thead>
                  <tr>
                    <th aria-label="Selecionar" />
                    <th>Número</th>
                    <th>Cliente</th>
                    <th>Vencimento</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {titulos.map((titulo) => {
                    const numero = numeroDoTitulo(titulo);
                    return (
                      <tr key={titulo.id}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Antecipar ${numero}`}
                            checked={selecionados.includes(titulo.id)}
                            onChange={() => alternar(titulo.id)}
                            disabled={salvando}
                          />
                        </td>
                        <td>{numero}</td>
                        <td>{nomeCliente(titulo.cliente_id)}</td>
                        <td>{formatarData(titulo.vencimento)}</td>
                        <td>{formatarMoeda(titulo.saldo_centavos)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="receber-form-linha">
          <div className="receber-form-campo">
            <label className="filter-label" htmlFor="antecipacao-liquido">
              Valor líquido *
            </label>
            <input
              id="antecipacao-liquido"
              className="filter-input"
              type="text"
              inputMode="decimal"
              value={form.liquido}
              onChange={alterar('liquido')}
              disabled={salvando}
            />
          </div>
          <div className="receber-form-campo">
            <span className="filter-label">Resumo</span>
            <span>
              {marcados.length} título(s) · Bruto: {formatarMoeda(bruto)}
              {encargos !== null && ` · Encargos: ${formatarMoeda(encargos)}`}
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
