import { describe, expect, it } from 'vitest';
import {
  CAMBIO_BRL,
  cambioParaTexto,
  erroDoCambio,
  formatarCambio,
  formatarValorMoeda,
  paraCambioMicro,
  paraCentesimos,
  rotuloAcaoHistorico,
  rotuloTipoCusto,
  statusDaImportacao,
  statusDaParcela,
  valorEmReais,
} from './importacoesUtils';

describe('câmbio em micro', () => {
  it('converte o texto com vírgula sem float, até seis casas', () => {
    expect(paraCambioMicro('5,4321')).toBe(5432100);
    expect(paraCambioMicro('5,432100')).toBe(5432100);
    expect(paraCambioMicro(' 5,123456 ')).toBe(5123456);
    expect(paraCambioMicro('0,000001')).toBe(1);
    expect(paraCambioMicro('1.000,5')).toBe(1000500000);
    expect(paraCambioMicro('5.4321')).toBe(5432100);
    expect(paraCambioMicro('6')).toBe(6000000);
    expect(paraCambioMicro('0,1')).toBe(100000);
  });

  it('recusa mais de seis casas, letras e vazio', () => {
    expect(paraCambioMicro('5,1234567')).toBeNaN();
    expect(paraCambioMicro('abc')).toBeNaN();
    expect(paraCambioMicro('')).toBeNaN();
    expect(paraCambioMicro('-5,2')).toBeNaN();
    expect(paraCambioMicro('5,2,1')).toBeNaN();
  });

  it('formata e volta para o texto', () => {
    expect(formatarCambio(5432100)).toBe('5,432100');
    expect(formatarCambio(1)).toBe('0,000001');
    expect(formatarCambio(null)).toBe('—');
    expect(cambioParaTexto(5432100)).toBe('5,4321');
    expect(cambioParaTexto(6000000)).toBe('6,00');
    expect(cambioParaTexto(null)).toBe('');
  });

  it('valida a faixa e o câmbio fixo do real', () => {
    expect(erroDoCambio('5,4321', 'USD')).toBeNull();
    expect(erroDoCambio('', 'USD')).toMatch(/Informe o câmbio/);
    expect(erroDoCambio('5,1234567', 'USD')).toMatch(/seis casas/);
    expect(erroDoCambio('0', 'USD')).toMatch(/maior que zero/);
    expect(erroDoCambio('1000,000001', 'USD')).toMatch(/até 1000/);
    expect(erroDoCambio('1', 'BRL')).toBeNull();
    expect(erroDoCambio('1,5', 'BRL')).toMatch(/real/);
    expect(CAMBIO_BRL).toBe(1000000);
  });
});

describe('valores', () => {
  it('converte centésimos para reais arredondando meio para cima', () => {
    expect(valorEmReais(135000, 5432100)).toBe(733334);
    expect(valorEmReais(1, 500000)).toBe(1);
    expect(valorEmReais(1, 499999)).toBe(0);
    expect(valorEmReais(1000000000000000, 1000000000)).toBe(1000000000000000000);
    expect(valorEmReais(100, null)).toBeNull();
  });

  it('lê o valor na moeda como os centavos', () => {
    expect(paraCentesimos('4.500,00')).toBe(450000);
    expect(paraCentesimos('1234.56')).toBe(123456);
    expect(paraCentesimos('')).toBeNaN();
  });

  it('formata na moeda da importação', () => {
    expect(formatarValorMoeda(450000, 'USD')).toMatch(/US\$\s?4\.500,00/);
    expect(formatarValorMoeda(450000, 'BRL')).toMatch(/R\$\s?4\.500,00/);
    expect(formatarValorMoeda(null, 'USD')).toBe('—');
  });
});

describe('rótulos', () => {
  it('traz status, tipos de custo e ações do histórico', () => {
    expect(statusDaImportacao('desembaracada')).toMatchObject({ rotulo: 'Desembaraçada' });
    expect(statusDaImportacao('outro')).toMatchObject({ rotulo: 'outro', cor: 'neutral' });
    expect(statusDaParcela('cambio_fechado')).toMatchObject({ rotulo: 'Câmbio fechado' });
    expect(rotuloTipoCusto('despachante')).toBe('Despachante aduaneiro');
    expect(rotuloTipoCusto('taxa_siscomex')).toBe('Taxa Siscomex');
    expect(rotuloAcaoHistorico('parcela_cambio_fechado')).toBe('Câmbio da parcela fechado');
    expect(rotuloAcaoHistorico('nova')).toBe('nova');
  });
});
