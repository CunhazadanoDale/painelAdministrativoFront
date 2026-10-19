import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataGrid } from '../../app/components/DataGrid';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import * as clientesService from '../../services/clientes';
import * as contasService from '../../services/contasBancarias';
import * as titulosService from '../../services/titulosReceber';
import { BoletoEnviadoModal } from './AcoesDoTitulo';
import { numeroDoTitulo } from './receberUtils';
import { DIAS_PADRAO, useBoletosPendentes } from './useBoletosPendentes';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import './Receber.css';

const DIAS_MAXIMO = 90;
const nomeDaConta = (conta) => (conta ? `${conta.apelido} · ${conta.banco_nome}` : undefined);

export default function BoletosPendentes() {
  const nomeEmpresa = useNomesEmpresas();
  const {
    titulos,
    pagina,
    filtros,
    temProxima,
    carregando,
    erro,
    chaveDados,
    recarregar,
    irParaAnterior,
    irParaProxima,
    filtrar,
  } = useBoletosPendentes();
  const nomeCliente = useNomesPorId(
    titulos.map((titulo) => titulo.cliente_id),
    clientesService.obterCliente
  );
  const nomeConta = useNomesPorId(
    titulos.map((titulo) => titulo.conta_bancaria_id),
    contasService.obterContaBancaria,
    nomeDaConta
  );
  const [dias, setDias] = useState(String(DIAS_PADRAO));
  const [registrando, setRegistrando] = useState(null);
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);

  const diasNumero = Number(dias);
  const diasInvalido = dias.trim() === '' || !Number.isInteger(diasNumero) || diasNumero < 0 || diasNumero > DIAS_MAXIMO;

  const alterarDias = (evento) => {
    const valor = evento.target.value;
    setDias(valor);
    const numero = Number(valor);
    if (valor.trim() !== '' && Number.isInteger(numero) && numero >= 0 && numero <= DIAS_MAXIMO) filtrar({ dias: numero });
  };

  const registrarEnvio = async ({ canal, enviado_em }) => {
    await titulosService.registrarBoletoEnviado(registrando.id, { canal, enviado_em, versao: registrando.versao });
    recarregar();
  };

  const colunas = [
    {
      label: 'Número',
      field: 'numero',
      width: '12%',
      render: (_, titulo) => <Link to={`/titulos-receber/${titulo.id}`}>{numeroDoTitulo(titulo)}</Link>,
    },
    { label: 'Empresa', field: 'empresa_id', width: '12%', render: (empresaId) => nomeEmpresa(empresaId) },
    { label: 'Cliente', field: 'cliente_id', width: '22%', render: (clienteId) => nomeCliente(clienteId) },
    {
      label: 'Vencimento',
      field: 'vencimento',
      width: '15%',
      render: (vencimento, titulo) => (
        <span className="receber-celula">
          {formatarData(vencimento)}
          {titulo.vencido && <StatusBadge status="danger" label="Vencido" />}
        </span>
      ),
    },
    { label: 'Saldo', field: 'saldo_centavos', width: '12%', render: (saldo) => formatarMoeda(saldo) },
    { label: 'Conta de cobrança', field: 'conta_bancaria_id', width: '17%', render: (contaId) => nomeConta(contaId) },
    {
      label: 'Ações',
      field: 'id',
      width: '10%',
      render: (_, titulo) => (
        <button
          type="button"
          className="filter-btn filter-btn-secondary"
          style={{ flex: 'none', width: 'auto', padding: '2px 10px' }}
          onClick={() => setRegistrando(titulo)}
        >
          Registrar envio
        </button>
      ),
    },
  ];

  return (
    <div className="receber-container">
      <div className="receber-toolbar">
        <div className="receber-toolbar-titulo">Boletos pendentes de envio</div>
        <div className="receber-toolbar-acoes">
          <label className="filter-label" htmlFor="boletos-dias">
            Vencendo em até (dias)
          </label>
          <input
            id="boletos-dias"
            className="filter-input receber-filtro"
            type="number"
            min="0"
            max={DIAS_MAXIMO}
            value={dias}
            onChange={alterarDias}
            aria-invalid={diasInvalido || undefined}
          />
          <label className="filter-label" htmlFor="boletos-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="boletos-empresa"
            className="filter-input receber-filtro"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
        </div>
      </div>

      {diasInvalido && <span className="receber-form-erro">O prazo vai de 0 a {DIAS_MAXIMO} dias.</span>}
      <span className="receber-form-ajuda">
        Títulos em banco sem envio do boleto registrado, vencendo até o prazo escolhido, incluindo os já vencidos.
      </span>

      {erro && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}

      <div className="receber-conteudo">
        {carregando ? (
          <div className="receber-status">Carregando boletos pendentes…</div>
        ) : titulos.length > 0 ? (
          <>
            <DataGrid key={chaveDados ?? 'boletos'} columns={colunas} data={titulos} selectable={false} />
            {(temProxima || pagina > 1) && (
              <div className="receber-paginacao">
                <button
                  type="button"
                  className="filter-btn filter-btn-secondary"
                  style={{ flex: 'none', padding: '4px 10px' }}
                  title="Página anterior"
                  onClick={irParaAnterior}
                  disabled={pagina <= 1}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="receber-paginacao-texto">Página {pagina}</span>
                <button
                  type="button"
                  className="filter-btn filter-btn-secondary"
                  style={{ flex: 'none', padding: '4px 10px' }}
                  title="Próxima página"
                  onClick={irParaProxima}
                  disabled={!temProxima}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        ) : erro ? null : (
          <div className="receber-status">Nenhum boleto pendente de envio no prazo.</div>
        )}
      </div>

      {registrando && (
        <BoletoEnviadoModal
          titulo={registrando}
          onConfirmar={registrarEnvio}
          onFechar={() => setRegistrando(null)}
          onRecarregar={recarregar}
        />
      )}
    </div>
  );
}
