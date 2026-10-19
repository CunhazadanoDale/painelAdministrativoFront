import React, { useCallback, useState } from 'react';
import { AcaoModal } from '../../app/components/AcaoModal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { SeletorRemoto } from '../../app/components/SeletorRemoto';
import { paraCentavos } from '../../lib/formatar';
import * as comissoesService from '../../services/comissoes';
import * as pedidosService from '../../services/pedidos';
import { carregarRepresentantes, mesAtualEmBrasilia, opcaoDeRepresentante } from './comissoesUtils';
import './Comissoes.css';

const LIMITE_MOTIVO = 1000;
const STATUS_COM_COMISSAO = ['confirmado', 'parcialmente_entregue', 'entregue', 'cancelado'];

const opcaoDePedido = (pedido) => ({ valor: pedido.id, rotulo: `Pedido ${pedido.numero}` });

export function AjusteModal({ onCriado, onFechar }) {
  const mesAtual = mesAtualEmBrasilia();
  const [empresa, setEmpresa] = useState('');
  const [representante, setRepresentante] = useState('');
  const [pedido, setPedido] = useState('');
  const [competencia, setCompetencia] = useState(mesAtual);
  const [tipo, setTipo] = useState('acrescimo');
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');

  const carregarPedidos = useCallback(
    (sinal) =>
      pedidosService
        .listarPedidos({ empresa, representante, tamanho: 100, sinal })
        .then((resposta) => (resposta?.dados ?? []).filter((item) => STATUS_COM_COMISSAO.includes(item.status))),
    [empresa, representante]
  );

  const alterarEmpresa = useCallback((novo) => {
    setEmpresa(novo);
    setPedido('');
  }, []);
  const alterarRepresentante = useCallback((novo) => {
    setRepresentante(novo);
    setPedido('');
  }, []);

  const validar = () => {
    const erros = [];
    if (!empresa) erros.push('Selecione a empresa.');
    if (!representante) erros.push('Escolha o representante.');
    if (!competencia) erros.push('Informe a competência.');
    else if (competencia > mesAtual) erros.push('A competência não pode ser posterior ao mês corrente.');
    const centavos = paraCentavos(valor);
    if (!valor.trim() || !Number.isFinite(centavos) || centavos <= 0) erros.push('Informe um valor maior que zero.');
    if (!motivo.trim()) erros.push('Informe o motivo do ajuste.');
    else if (motivo.trim().length > LIMITE_MOTIVO) erros.push(`O motivo tem no máximo ${LIMITE_MOTIVO} caracteres.`);
    return erros;
  };

  const lancar = async () => {
    const centavos = paraCentavos(valor);
    await comissoesService.criarAjusteComissao({
      empresa_id: empresa,
      representante_id: representante,
      pedido_id: pedido || null,
      competencia,
      valor_centavos: tipo === 'desconto' ? -centavos : centavos,
      motivo: motivo.trim(),
    });
    onCriado();
  };

  return (
    <AcaoModal
      titulo="Novo ajuste de comissão"
      rotuloConfirmar="Lançar ajuste"
      validar={validar}
      onConfirmar={lancar}
      onFechar={onFechar}
      onRecarregar={onFechar}
      largura="600px"
    >
      <p className="comissoes-texto">
        Para o que a apuração não cobre: devolução, desconto concedido depois da saída, prêmio ou correção. Não há
        edição nem exclusão; desfazer é lançar o ajuste inverso. Entra no primeiro fechamento que cobrir a competência.
      </p>
      <div className="comissoes-form-linha">
        <div className="comissoes-form-campo">
          <label className="filter-label" htmlFor="ajuste-empresa">
            Empresa *
          </label>
          <SeletorEmpresa id="ajuste-empresa" className="filter-input" valor={empresa} onAlterar={alterarEmpresa} />
        </div>
        <div className="comissoes-form-campo">
          <label className="filter-label" htmlFor="ajuste-representante">
            Representante *
          </label>
          <SeletorRemoto
            id="ajuste-representante"
            className="filter-select"
            valor={representante}
            onAlterar={alterarRepresentante}
            carregar={carregarRepresentantes}
            opcaoDe={opcaoDeRepresentante}
            textoVazio="Nenhum representante"
            textoErro="Erro ao carregar os representantes."
            selecionarUnica={false}
          />
        </div>
      </div>
      <div className="comissoes-form-linha">
        <div className="comissoes-form-campo">
          <label className="filter-label" htmlFor="ajuste-pedido">
            Pedido
          </label>
          {empresa && representante ? (
            <SeletorRemoto
              id="ajuste-pedido"
              className="filter-select"
              valor={pedido}
              onAlterar={setPedido}
              carregar={carregarPedidos}
              opcaoDe={opcaoDePedido}
              placeholder="Sem pedido"
              textoVazio="O representante não tem pedidos nesta empresa"
              textoErro="Erro ao carregar os pedidos."
              selecionarUnica={false}
            />
          ) : (
            <select id="ajuste-pedido" className="filter-select" value="" disabled>
              <option value="">Escolha a empresa e o representante</option>
            </select>
          )}
        </div>
        <div className="comissoes-form-campo">
          <label className="filter-label" htmlFor="ajuste-competencia">
            Competência *
          </label>
          <input
            id="ajuste-competencia"
            className="filter-input"
            type="month"
            max={mesAtual}
            value={competencia}
            onChange={(evento) => setCompetencia(evento.target.value)}
          />
        </div>
      </div>
      <div className="comissoes-form-linha">
        <div className="comissoes-form-campo">
          <label className="filter-label" htmlFor="ajuste-tipo">
            Tipo *
          </label>
          <select id="ajuste-tipo" className="filter-select" value={tipo} onChange={(evento) => setTipo(evento.target.value)}>
            <option value="acrescimo">Acréscimo (aumenta a comissão)</option>
            <option value="desconto">Desconto (reduz a comissão)</option>
          </select>
        </div>
        <div className="comissoes-form-campo">
          <label className="filter-label" htmlFor="ajuste-valor">
            Valor *
          </label>
          <input
            id="ajuste-valor"
            className="filter-input"
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(evento) => setValor(evento.target.value)}
          />
        </div>
      </div>
      <div className="comissoes-form-campo">
        <label className="filter-label" htmlFor="ajuste-motivo">
          Motivo *
        </label>
        <textarea
          id="ajuste-motivo"
          className="filter-input"
          rows={3}
          maxLength={LIMITE_MOTIVO}
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
        />
      </div>
    </AcaoModal>
  );
}
