import { describe, expect, it } from 'vitest';
import {
  LIMITE_ARQUIVO,
  TAMANHO_PAGINA,
  arquivoPermitido,
  corStatus,
  hojeISO,
  rotuloFormaPagamento,
  rotuloOrigem,
  rotuloStatus,
  statusPermitidosNoEscopo,
} from './solicitacoesUtils';

describe('constantes', () => {
  it('mantém os limites de paginação e de arquivo', () => {
    expect(TAMANHO_PAGINA).toBe(20);
    expect(LIMITE_ARQUIVO).toBe(10 * 1024 * 1024);
  });
});

describe('rotuloStatus', () => {
  it('traduz status conhecidos', () => {
    expect(rotuloStatus('pendente_aprovacao')).toBe('Pendente de aprovação');
    expect(rotuloStatus('pago')).toBe('Pago');
  });

  it('devolve o próprio status ou travessa quando desconhecido', () => {
    expect(rotuloStatus('qualquer')).toBe('qualquer');
    expect(rotuloStatus(null)).toBe('—');
    expect(rotuloStatus('')).toBe('—');
  });
});

describe('corStatus', () => {
  it('usa as cores mapeadas', () => {
    expect(corStatus('pendente_aprovacao')).toBe('warning');
    expect(corStatus('rejeitado')).toBe('danger');
  });

  it('cai em neutral para status desconhecido', () => {
    expect(corStatus('inexistente')).toBe('neutral');
    expect(corStatus(undefined)).toBe('neutral');
  });
});

describe('rotuloFormaPagamento', () => {
  it('traduz as formas conhecidas', () => {
    expect(rotuloFormaPagamento('pix')).toBe('PIX');
    expect(rotuloFormaPagamento('cartao')).toBe('Cartão');
  });

  it('devolve o próprio valor ou travessa', () => {
    expect(rotuloFormaPagamento('tesouro')).toBe('tesouro');
    expect(rotuloFormaPagamento('')).toBe('—');
  });
});

describe('statusPermitidosNoEscopo', () => {
  it('restringe o escopo de aprovação ao pendente', () => {
    expect(statusPermitidosNoEscopo('aprovacao')).toEqual(['pendente_aprovacao']);
  });

  it('exclui o pendente do escopo financeiro', () => {
    expect(statusPermitidosNoEscopo('financeiro')).toEqual([
      'aprovado',
      'pago',
      'rejeitado',
      'cancelado',
    ]);
  });

  it('libera todos os status nos demais escopos', () => {
    const todos = ['pendente_aprovacao', 'aprovado', 'pago', 'rejeitado', 'cancelado'];
    expect(statusPermitidosNoEscopo('minhas')).toEqual(todos);
    expect(statusPermitidosNoEscopo('todas')).toEqual(todos);
    expect(statusPermitidosNoEscopo('')).toEqual(todos);
  });
});

describe('arquivoPermitido', () => {
  it('aceita formatos dentro do limite', () => {
    expect(arquivoPermitido({ type: 'application/pdf', size: 1024 })).toBeNull();
    expect(arquivoPermitido({ type: 'image/png', size: LIMITE_ARQUIVO })).toBeNull();
  });

  it('rejeita formato não suportado', () => {
    expect(arquivoPermitido({ type: 'text/plain', size: 1024 })).toBe(
      'Formato não aceito: envie um arquivo PDF, PNG, JPEG ou WEBP.'
    );
  });

  it('rejeita arquivo acima de 10MB', () => {
    expect(arquivoPermitido({ type: 'image/jpeg', size: LIMITE_ARQUIVO + 1 })).toBe(
      'arquivo excede o limite de 10MB'
    );
  });
});

describe('hojeISO', () => {
  it('devolve a data local no formato AAAA-MM-DD', () => {
    expect(hojeISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('rotuloOrigem', () => {
  it('nomeia as origens sistêmicas da comissão e da importação', () => {
    expect(rotuloOrigem('comissao')).toBe('Comissão');
    expect(rotuloOrigem('importacao_parcela')).toBe('Parcela de importação');
    expect(rotuloOrigem('divida_amortizacao')).toBe('Amortização de dívida');
    expect(rotuloOrigem('divida_juros')).toBe('Juros de dívida');
    expect(rotuloOrigem('importacao_custo')).toBe('Custo de importação');
    expect(rotuloOrigem('manual')).toBe('Manual');
  });
});
