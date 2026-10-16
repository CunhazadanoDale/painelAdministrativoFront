import React, { useCallback, useState } from 'react';
import { Modal } from '../../app/components/Modal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import {
  TIPOS_CLIENTE,
  UFS,
  erroDoDocumento,
  erroDoEmail,
  erroDoTipoComDocumento,
  normalizarDocumento,
} from './clientesUtils';
import './Clientes.css';

const LIMITES = { nome: 200, nome_fantasia: 120, cidade: 120, email_nf: 255, telefone: 40, observacoes: 2000 };

function formularioDe(base) {
  return {
    documento: base?.documento_formatado ?? base?.documento ?? '',
    nome: base?.nome ?? '',
    nome_fantasia: base?.nome_fantasia ?? '',
    tipo: base?.tipo ?? 'construtora',
    grupo_id: base?.grupo_id ?? '',
    uf: base?.uf ?? '',
    cidade: base?.cidade ?? '',
    empresa_relacionamento_id: base?.empresa_relacionamento_id ?? '',
    representante_id: base?.representante_id ?? '',
    email_nf: base?.email_nf ?? '',
    telefone: base?.telefone ?? '',
    observacoes: base?.observacoes ?? '',
    exige_numero_pedido_na_nf: !!base?.exige_numero_pedido_na_nf,
    proibe_antecipacao: !!base?.proibe_antecipacao,
  };
}

function textoOuNulo(texto) {
  const valor = texto.trim();
  return valor || null;
}

function opcoesComAtual(itens, atual) {
  return (itens || []).filter((item) => item.ativo || item.id === atual);
}

export function ClienteFormModal({
  cliente,
  inicial,
  grupos,
  representantes,
  titulo,
  ajuda,
  onFechar,
  onSalvar,
}) {
  const editando = !!cliente;
  const [form, setForm] = useState(() => formularioDe(cliente ?? inicial));
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const alterar = (campo) => (event) => setForm((atual) => ({ ...atual, [campo]: event.target.value }));
  const marcar = (campo) => (event) => setForm((atual) => ({ ...atual, [campo]: event.target.checked }));
  const alterarEmpresa = useCallback(
    (valor) => setForm((atual) => ({ ...atual, empresa_relacionamento_id: valor })),
    []
  );

  const validar = () => {
    const novosErros = {};
    if (!editando) {
      const erroDocumento = erroDoDocumento(form.documento);
      if (erroDocumento) novosErros.documento = erroDocumento;
      else {
        const erroTipo = erroDoTipoComDocumento(form.tipo, normalizarDocumento(form.documento));
        if (erroTipo) novosErros.tipo = erroTipo;
      }
    }
    const verificarTamanho = (campo, rotulo) => {
      if (!novosErros[campo] && form[campo].trim().length > LIMITES[campo]) {
        novosErros[campo] = `${rotulo} tem no máximo ${LIMITES[campo]} caracteres.`;
      }
    };
    if (!form.nome.trim()) novosErros.nome = 'Informe o nome ou a razão social.';
    if (!form.cidade.trim()) novosErros.cidade = 'Informe a cidade.';
    if (!form.uf) novosErros.uf = 'Selecione a UF.';
    verificarTamanho('nome', 'O nome');
    verificarTamanho('nome_fantasia', 'O nome fantasia');
    verificarTamanho('cidade', 'A cidade');
    verificarTamanho('telefone', 'O telefone');
    verificarTamanho('observacoes', 'As observações');
    const erroEmail = erroDoEmail(form.email_nf);
    if (erroEmail) novosErros.email_nf = erroEmail;
    else verificarTamanho('email_nf', 'O e-mail');
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const salvar = async (event) => {
    event.preventDefault();
    if (!validar()) return;

    const dados = {
      documento: normalizarDocumento(form.documento),
      nome: form.nome.trim(),
      nome_fantasia: textoOuNulo(form.nome_fantasia),
      tipo: form.tipo,
      grupo_id: form.grupo_id || null,
      uf: form.uf,
      cidade: form.cidade.trim(),
      empresa_relacionamento_id: form.empresa_relacionamento_id || null,
      representante_id: form.representante_id || null,
      email_nf: textoOuNulo(form.email_nf),
      telefone: textoOuNulo(form.telefone),
      observacoes: form.observacoes.trim(),
      exige_numero_pedido_na_nf: form.exige_numero_pedido_na_nf,
      proibe_antecipacao: form.proibe_antecipacao,
    };

    setSalvando(true);
    setErroApi(null);
    try {
      await onSalvar(dados);
      onFechar();
    } catch (e) {
      setErroApi(e.message || 'Erro ao salvar o cliente.');
    } finally {
      setSalvando(false);
    }
  };

  const erroDe = (campo) => erros[campo] && <span className="clientes-form-erro">{erros[campo]}</span>;

  const campoTexto = (campo, rotulo, { obrigatorio = false, tipo = 'text', desabilitado = false, placeholder } = {}) => (
    <div className="clientes-form-campo">
      <label className="filter-label" htmlFor={`cliente-${campo}`}>
        {obrigatorio ? `${rotulo} *` : rotulo}
      </label>
      <input
        id={`cliente-${campo}`}
        className="filter-input"
        type={tipo}
        placeholder={placeholder}
        value={form[campo]}
        onChange={alterar(campo)}
        maxLength={LIMITES[campo]}
        disabled={salvando || desabilitado}
        aria-invalid={!!erros[campo] || undefined}
      />
      {erroDe(campo)}
    </div>
  );

  const seletor = (campo, rotulo, itens, vazio) => (
    <div className="clientes-form-campo">
      <label className="filter-label" htmlFor={`cliente-${campo}`}>
        {rotulo}
      </label>
      <select
        id={`cliente-${campo}`}
        className="filter-input"
        value={form[campo]}
        onChange={alterar(campo)}
        disabled={salvando || !itens}
      >
        <option value="">{itens ? vazio : 'Carregando…'}</option>
        {opcoesComAtual(itens, (cliente ?? inicial)?.[campo]).map((item) => (
          <option key={item.id} value={item.id}>
            {item.ativo ? item.nome : `${item.nome} (inativo)`}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <Modal
      aberto
      titulo={titulo ?? (editando ? 'Editar Cliente' : 'Novo Cliente')}
      onFechar={salvando ? () => {} : onFechar}
      largura="680px"
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
            form="cliente-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="cliente-form" className="clientes-form" onSubmit={salvar} noValidate>
        {erroApi && (
          <div className="clientes-form-erro-api" role="alert">
            {erroApi}
          </div>
        )}
        {ajuda && <span className="clientes-form-ajuda">{ajuda}</span>}

        <div className="clientes-form-linha">
          {campoTexto('documento', 'CPF ou CNPJ', {
            obrigatorio: true,
            desabilitado: editando,
            placeholder: '000.000.000-00 ou 00.000.000/0000-00',
          })}
          <div className="clientes-form-campo">
            <label className="filter-label" htmlFor="cliente-tipo">
              Tipo *
            </label>
            <select
              id="cliente-tipo"
              className="filter-input"
              value={form.tipo}
              onChange={alterar('tipo')}
              disabled={salvando}
              aria-invalid={!!erros.tipo || undefined}
            >
              {TIPOS_CLIENTE.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.rotulo}
                </option>
              ))}
            </select>
            {erroDe('tipo')}
          </div>
        </div>
        {editando && (
          <span className="clientes-form-ajuda">
            O documento não muda. Para corrigir, desative este cliente e cadastre outro.
          </span>
        )}

        {campoTexto('nome', 'Nome ou razão social', { obrigatorio: true })}
        {campoTexto('nome_fantasia', 'Nome fantasia')}

        <div className="clientes-form-linha">
          <div className="clientes-form-campo">
            <label className="filter-label" htmlFor="cliente-uf">
              UF *
            </label>
            <select
              id="cliente-uf"
              className="filter-input"
              value={form.uf}
              onChange={alterar('uf')}
              disabled={salvando}
              aria-invalid={!!erros.uf || undefined}
            >
              <option value="">Selecione…</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
            {erroDe('uf')}
          </div>
          {campoTexto('cidade', 'Cidade', { obrigatorio: true })}
        </div>

        <div className="clientes-form-linha">
          {seletor('grupo_id', 'Grupo', grupos, 'Sem grupo')}
          {seletor('representante_id', 'Representante do cliente', representantes, 'Sem representante')}
        </div>

        <div className="clientes-form-campo">
          <label className="filter-label" htmlFor="cliente-empresa">
            Empresa de relacionamento
          </label>
          <SeletorEmpresa
            id="cliente-empresa"
            className="filter-input"
            valor={form.empresa_relacionamento_id}
            onAlterar={alterarEmpresa}
            apenasAtivas={!editando}
            selecionarUnica={false}
            placeholder="Nenhuma"
            disabled={salvando}
          />
        </div>

        <div className="clientes-form-linha">
          {campoTexto('email_nf', 'E-mail para NF', { tipo: 'email' })}
          {campoTexto('telefone', 'Telefone')}
        </div>

        <div className="clientes-form-campo">
          <span className="filter-label">Regras comerciais</span>
          <label className="clientes-checkbox" htmlFor="cliente-exige-pedido">
            <input
              id="cliente-exige-pedido"
              type="checkbox"
              checked={form.exige_numero_pedido_na_nf}
              onChange={marcar('exige_numero_pedido_na_nf')}
              disabled={salvando}
            />
            Exige número do pedido na NF
          </label>
          <label className="clientes-checkbox" htmlFor="cliente-proibe-antecipacao">
            <input
              id="cliente-proibe-antecipacao"
              type="checkbox"
              checked={form.proibe_antecipacao}
              onChange={marcar('proibe_antecipacao')}
              disabled={salvando}
            />
            Proíbe antecipação dos títulos
          </label>
        </div>

        <div className="clientes-form-campo">
          <label className="filter-label" htmlFor="cliente-observacoes">
            Observações
          </label>
          <textarea
            id="cliente-observacoes"
            className="filter-input clientes-form-observacoes"
            rows={3}
            value={form.observacoes}
            onChange={alterar('observacoes')}
            maxLength={LIMITES.observacoes}
            disabled={salvando}
          />
          {erroDe('observacoes')}
        </div>
      </form>
    </Modal>
  );
}
