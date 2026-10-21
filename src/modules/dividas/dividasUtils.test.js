import { describe, expect, it } from 'vitest';
import {
  CREDOR_TIPOS,
  INDEXADORES,
  erroDaTaxa,
  formatarTaxa,
  paraTaxaBp,
  preencherParcelas,
  rotuloAcaoHistorico,
  rotuloCredorTipo,
  situacaoDaParcela,
  somarAmortizacoes,
  statusDaDivida,
  taxaParaTexto,
} from './dividasUtils';

describe('dividasUtils', () => {
  it('lista os quatro tipos de credor na ordem da API e os rotula', () => {
    expect(CREDOR_TIPOS.map((tipo) => tipo.valor)).toEqual(['banco', 'investidor', 'fisco', 'fornecedor']);
    expect(rotuloCredorTipo('fisco')).toBe('Fisco');
    expect(rotuloCredorTipo('outro')).toBe('outro');
    expect(INDEXADORES.map((item) => item.valor)).toEqual(['prefixado', 'cdi', 'selic', 'ipca', 'tr', 'outro']);
  });

  it('mostra a dívida ativa sem nada em aberto como quitada', () => {
    expect(statusDaDivida({ status: 'ativa', quitada: false })).toMatchObject({ rotulo: 'Ativa' });
    expect(statusDaDivida({ status: 'ativa', quitada: true })).toMatchObject({ rotulo: 'Quitada', cor: 'success' });
    expect(statusDaDivida({ status: 'renegociada', quitada: false })).toMatchObject({ rotulo: 'Renegociada' });
    expect(statusDaDivida({ status: 'cancelada' })).toMatchObject({ rotulo: 'Cancelada', cor: 'danger' });
  });

  it('rotula a situação da parcela', () => {
    expect(situacaoDaParcela('a_vencer').rotulo).toBe('A vencer');
    expect(situacaoDaParcela('vencida')).toMatchObject({ rotulo: 'Vencida', cor: 'danger' });
    expect(situacaoDaParcela('paga').rotulo).toBe('Paga');
    expect(situacaoDaParcela('conta_cancelada').rotulo).toBe('Conta cancelada');
    expect(situacaoDaParcela('cancelada').rotulo).toBe('Cancelada');
  });

  it('lê a taxa em pontos-base com vírgula e até duas casas', () => {
    expect(paraTaxaBp('1,85')).toBe(185);
    expect(paraTaxaBp('12')).toBe(1200);
    expect(paraTaxaBp('1000')).toBe(100000);
    expect(paraTaxaBp('')).toBeNull();
    expect(paraTaxaBp('1000,01')).toBeNaN();
    expect(paraTaxaBp('1,853')).toBeNaN();
    expect(paraTaxaBp('abc')).toBeNaN();
    expect(erroDaTaxa('1,85', 'mensal')).toBeNull();
    expect(erroDaTaxa('', '')).toBeNull();
    expect(erroDaTaxa('1,85', '')).toBe('Escolha se a taxa é mensal ou anual.');
    expect(erroDaTaxa('', 'anual')).toBe('Informe a taxa ou deixe o período em branco.');
    expect(erroDaTaxa('x', 'anual')).toBe('Taxa inválida: de 0 a 1000%, com até duas casas.');
    expect(taxaParaTexto(185)).toBe('1,85');
    expect(taxaParaTexto(null)).toBe('');
  });

  it('descreve a taxa com o indexador e o período', () => {
    expect(formatarTaxa({ taxa_bp: 185, taxa_periodo: 'mensal', indexador: 'prefixado' })).toBe('1,85% a.m.');
    expect(formatarTaxa({ taxa_bp: 80, taxa_periodo: 'anual', indexador: 'cdi' })).toBe('CDI + 0,80% a.a.');
    expect(formatarTaxa({ taxa_bp: null, taxa_periodo: null, indexador: 'selic' })).toBe('Selic');
    expect(formatarTaxa({ taxa_bp: null, taxa_periodo: null, indexador: 'prefixado' })).toBe('—');
  });

  it('preenche parcelas mensais com a amortização dividida e a sobra na última', () => {
    expect(preencherParcelas({ quantidade: 3, primeiroVencimento: '2026-11-10', saldoCentavos: 100000 })).toEqual([
      { vencimento: '2026-11-10', amortizacao_centavos: 33333 },
      { vencimento: '2026-12-10', amortizacao_centavos: 33333 },
      { vencimento: '2027-01-10', amortizacao_centavos: 33334 },
    ]);
  });

  it('mantém o dia do primeiro vencimento e encosta no fim do mês curto', () => {
    const parcelas = preencherParcelas({ quantidade: 4, primeiroVencimento: '2027-01-31', saldoCentavos: 400 });
    expect(parcelas.map((parcela) => parcela.vencimento)).toEqual([
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
      '2027-04-30',
    ]);
    expect(parcelas.every((parcela) => parcela.amortizacao_centavos === 100)).toBe(true);
  });

  it('soma as amortizações ignorando texto inválido', () => {
    expect(somarAmortizacoes(['1.000,00', '500', '', 'x'])).toBe(150000);
  });

  it('rotula as ações do histórico', () => {
    expect(rotuloAcaoHistorico('contas_geradas')).toBe('Contas a pagar geradas');
    expect(rotuloAcaoHistorico('parcela_reaberta')).toBe('Parcela reaberta');
    expect(rotuloAcaoHistorico('desconhecida')).toBe('desconhecida');
  });
});
