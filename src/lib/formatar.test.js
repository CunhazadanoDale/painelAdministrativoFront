import { describe, expect, it } from 'vitest';
import {
  centavosParaTexto,
  formatarData,
  formatarDataHora,
  formatarMoeda,
  formatarTamanho,
  paraCentavos,
} from './formatar';

describe('formatarMoeda', () => {
  it('formata centavos em reais', () => {
    expect(formatarMoeda(123456)).toMatch(/^R\$\s1\.234,56$/);
  });

  it('formata zero', () => {
    expect(formatarMoeda(0)).toMatch(/^R\$\s0,00$/);
  });

  it('devolve travessa em valor inválido', () => {
    expect(formatarMoeda('abc')).toBe('—');
    expect(formatarMoeda(Number.NaN)).toBe('—');
  });
});

describe('formatarData', () => {
  it('formata data ISO', () => {
    expect(formatarData('2026-10-09T12:00:00')).toBe('09/10/2026');
  });

  it('devolve travessa em data vazia ou inválida', () => {
    expect(formatarData('')).toBe('—');
    expect(formatarData('não é data')).toBe('—');
  });
});

describe('formatarDataHora', () => {
  it('formata data e hora ISO', () => {
    expect(formatarDataHora('2026-10-09T13:45:00')).toBe('09/10/2026, 13:45');
  });

  it('devolve travessa em data inválida', () => {
    expect(formatarDataHora('não é data')).toBe('—');
  });
});

describe('formatarTamanho', () => {
  it('formata bytes', () => {
    expect(formatarTamanho(512)).toBe('512 B');
  });

  it('formata kibibytes', () => {
    expect(formatarTamanho(2048)).toBe('2.0 kB');
  });

  it('formata mebibytes', () => {
    expect(formatarTamanho(3 * 1024 * 1024)).toBe('3.0 MB');
  });

  it('devolve travessa em valor inválido', () => {
    expect(formatarTamanho(-1)).toBe('—');
    expect(formatarTamanho('abc')).toBe('—');
  });
});

describe('paraCentavos', () => {
  it('converte valor brasileiro', () => {
    expect(paraCentavos('R$ 1.234,56')).toBe(123456);
    expect(paraCentavos('1234,56')).toBe(123456);
  });

  it('converte valor com ponto decimal', () => {
    expect(paraCentavos('1234.56')).toBe(123456);
    expect(paraCentavos('10')).toBe(1000);
  });

  it('devolve NaN em texto vazio ou não numérico', () => {
    expect(paraCentavos('')).toBeNaN();
    expect(paraCentavos('abc')).toBeNaN();
  });
});

describe('centavosParaTexto', () => {
  it('converte centavos em texto com vírgula', () => {
    expect(centavosParaTexto(1234)).toBe('12,34');
    expect(centavosParaTexto(5)).toBe('0,05');
  });

  it('devolve vazio em valor inválido', () => {
    expect(centavosParaTexto('abc')).toBe('');
  });
});
