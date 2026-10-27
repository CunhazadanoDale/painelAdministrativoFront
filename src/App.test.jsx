import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { AutenticacaoProvider } from './app/autenticacao/AutenticacaoProvider';
import { PreferenciasProvider } from './app/preferencias/PreferenciasProvider';

function Observador() {
  const localizacao = useLocation();
  return (
    <>
      <span data-testid="caminho">{localizacao.pathname}</span>
      <span data-testid="caminho-completo">{`${localizacao.pathname}${localizacao.search}`}</span>
    </>
  );
}

function renderizar(caminho) {
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <AutenticacaoProvider>
        <PreferenciasProvider>
          <Observador />
          <App />
        </PreferenciasProvider>
      </AutenticacaoProvider>
    </MemoryRouter>
  );
}

function gravarSessao(administrador) {
  localStorage.setItem(
    'mia.sessao',
    JSON.stringify({
      token: 'token-de-teste',
      expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      administrador,
      usuario: { usuario_id: 1, nome: 'Pessoa Teste', email: 'teste@exemplo.com' },
    })
  );
}

function gravarSessaoFinanceiro() {
  localStorage.setItem(
    'mia.sessao',
    JSON.stringify({
      token: 'token-de-teste',
      expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      administrador: false,
      financeiro: true,
      usuario: { usuario_id: 1, nome: 'Pessoa Teste', email: 'teste@exemplo.com' },
    })
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ dados: [] }),
    }))
  );
});

describe('roteamento do App', () => {
  it('mostra o login para visitante desautenticado', async () => {
    renderizar('/usuarios');

    expect(await screen.findByRole('heading', { name: 'Entrar no painel' })).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent('/login');
    expect(screen.queryByText('Novo Usuário')).toBeNull();
  });

  it('redireciona usuário comum que acessa rota administrativa', async () => {
    gravarSessao(false);

    renderizar('/usuarios');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/'));
    expect(screen.queryByRole('heading', { name: 'Entrar no painel' })).toBeNull();
    expect(screen.queryByText('Novo Usuário')).toBeNull();
  });

  it('libera rota administrativa para administrador', async () => {
    gravarSessao(true);

    renderizar('/usuarios');

    expect(await screen.findByText('Novo Usuário')).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent('/usuarios');
  });

  it('redireciona usuário comum que acessa /empresas', async () => {
    gravarSessao(false);

    renderizar('/empresas');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent(/^\/$/));
    expect(screen.queryByText('Nova Empresa')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Empresas' })).toBeNull();
  });

  it('libera /empresas e a entrada na sidebar para administrador', async () => {
    gravarSessao(true);

    renderizar('/empresas');

    expect(await screen.findByText('Nova Empresa')).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent('/empresas');
    expect(screen.getByRole('link', { name: 'Empresas' })).toHaveAttribute('href', '/empresas');
  });

  it('libera /fornecedores e a entrada na sidebar para qualquer autenticado, só para leitura', async () => {
    gravarSessao(false);

    renderizar('/fornecedores');

    expect(await screen.findByText('Nenhum fornecedor cadastrado.')).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent('/fornecedores');
    expect(screen.getByRole('link', { name: 'Fornecedores' })).toHaveAttribute('href', '/fornecedores');
    expect(screen.queryByText('Novo Fornecedor')).toBeNull();
  });

  it('mostra o cadastro de fornecedor para o financeiro', async () => {
    localStorage.setItem(
      'mia.sessao',
      JSON.stringify({
        token: 'token-de-teste',
        expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        administrador: false,
        financeiro: true,
        usuario: { usuario_id: 1, nome: 'Pessoa Teste', email: 'teste@exemplo.com' },
      })
    );

    renderizar('/fornecedores');

    expect(await screen.findByText('Novo Fornecedor')).toBeInTheDocument();
  });

  it('redireciona quem não é financeiro que acessa /contas-bancarias e esconde a entrada', async () => {
    gravarSessao(false);

    renderizar('/contas-bancarias');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent(/^\/$/));
    expect(screen.queryByText('Nova Conta')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Contas Bancárias' })).toBeNull();
  });

  it('libera /contas-bancarias e a entrada na sidebar para o financeiro', async () => {
    gravarSessaoFinanceiro();

    renderizar('/contas-bancarias');

    expect(await screen.findByText('Nova Conta')).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent('/contas-bancarias');
    expect(screen.getByRole('link', { name: 'Contas Bancárias' })).toHaveAttribute('href', '/contas-bancarias');
  });

  it('libera /contas-bancarias para o administrador', async () => {
    gravarSessao(true);

    renderizar('/contas-bancarias');

    expect(await screen.findByText('Nova Conta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contas Bancárias' })).toBeInTheDocument();
  });

  it('libera /plano-de-contas e a entrada na sidebar para qualquer autenticado, só para leitura', async () => {
    gravarSessao(false);

    renderizar('/plano-de-contas');

    expect(await screen.findByText('Nenhuma categoria no plano de contas.')).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent('/plano-de-contas');
    expect(screen.getByRole('link', { name: 'Plano de Contas' })).toHaveAttribute('href', '/plano-de-contas');
    expect(screen.queryByText('Nova Categoria')).toBeNull();
  });

  it('mostra o cadastro do plano de contas para o financeiro', async () => {
    gravarSessaoFinanceiro();

    renderizar('/plano-de-contas');

    expect(await screen.findByText('Nova Categoria')).toBeInTheDocument();
  });

  it('libera /locais-estoque e a entrada na sidebar para qualquer autenticado, só para consulta', async () => {
    gravarSessao(false);

    renderizar('/locais-estoque');

    expect(await screen.findByText('Nenhum local de estoque nas empresas do seu acesso.')).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent('/locais-estoque');
    expect(screen.getByRole('link', { name: 'Locais de Estoque' })).toHaveAttribute('href', '/locais-estoque');
    expect(screen.queryByText('Novo Local')).toBeNull();
  });

  it('mostra o cadastro de locais para o administrador', async () => {
    gravarSessao(true);

    renderizar('/locais-estoque');

    expect(await screen.findByText('Novo Local')).toBeInTheDocument();
  });

  it('libera /clientes, o detalhe e /grupos-clientes para qualquer autenticado, só para leitura', async () => {
    gravarSessao(false);

    renderizar('/clientes');

    expect(await screen.findByText('Nenhum cliente cadastrado.')).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent('/clientes');
    expect(screen.getByRole('link', { name: 'Clientes' })).toHaveAttribute('href', '/clientes');
    expect(screen.getByRole('link', { name: 'Grupos de Clientes' })).toHaveAttribute('href', '/grupos-clientes');
    expect(screen.queryByText('Novo Cliente')).toBeNull();
  });

  it('abre o detalhe do cliente pela rota com o id', async () => {
    gravarSessao(false);

    renderizar('/clientes/cli-1');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/clientes/cli-1'));
    await waitFor(() =>
      expect(fetch.mock.calls.some(([url]) => String(url).includes('/api/v1/clientes/cli-1'))).toBe(true)
    );
  });

  it('redireciona quem não é comercial que acessa /representantes e esconde a entrada', async () => {
    gravarSessao(false);

    renderizar('/representantes');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent(/^\/$/));
    expect(screen.queryByRole('link', { name: 'Representantes' })).toBeNull();
  });

  it('libera /representantes para o comercial, sem o cadastro do administrador', async () => {
    localStorage.setItem(
      'mia.sessao',
      JSON.stringify({
        token: 'token-de-teste',
        expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        administrador: false,
        comercial: true,
        usuario: { usuario_id: 1, nome: 'Pessoa Teste', email: 'teste@exemplo.com' },
      })
    );

    renderizar('/representantes');

    expect(await screen.findByText('Nenhum representante cadastrado.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Representantes' })).toHaveAttribute('href', '/representantes');
    expect(screen.queryByText('Novo Representante')).toBeNull();
  });

  it('libera /pedidos, /entregas e as consultas para qualquer autenticado, com entradas na sidebar', async () => {
    gravarSessao(false);

    renderizar('/pedidos');

    expect(await screen.findByText('Nenhum pedido nas empresas do seu acesso.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedidos' })).toHaveAttribute('href', '/pedidos');
    expect(screen.getByRole('link', { name: 'Entregas' })).toHaveAttribute('href', '/entregas');
    expect(screen.getByRole('link', { name: 'Consultas de Pedidos' })).toHaveAttribute('href', '/pedidos/consultas');
    expect(screen.queryByText('Nova Proposta')).toBeNull();
  });

  it('abre as consultas pela rota fixa antes do detalhe do pedido', async () => {
    gravarSessao(false);

    renderizar('/pedidos/consultas');

    expect(await screen.findByRole('tab', { name: 'Pendências' })).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent('/pedidos/consultas');
  });

  it('abre o detalhe do pedido pela rota com o id', async () => {
    gravarSessao(false);

    renderizar('/pedidos/ped-1');

    await waitFor(() =>
      expect(fetch.mock.calls.some(([url]) => String(url).includes('/api/v1/pedidos/ped-1'))).toBe(true)
    );
  });

  it('abre /entregas e mostra a nova proposta para o comercial', async () => {
    localStorage.setItem(
      'mia.sessao',
      JSON.stringify({
        token: 'token-de-teste',
        expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        administrador: false,
        comercial: true,
        usuario: { usuario_id: 1, nome: 'Pessoa Teste', email: 'teste@exemplo.com' },
      })
    );

    renderizar('/entregas');

    expect(await screen.findByText('Nenhuma entrega nas empresas do seu acesso.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Pedidos' }));
    expect(await screen.findByText('Nova Proposta')).toBeInTheDocument();
  });

  it('redireciona quem não é financeiro das despesas recorrentes e do resumo, sem as entradas', async () => {
    gravarSessao(false);

    renderizar('/despesas-recorrentes');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent(/^\/$/));
    expect(screen.queryByRole('link', { name: 'Despesas Recorrentes' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Resumo a Pagar' })).toBeNull();
  });

  it('libera as despesas recorrentes e o resumo para o financeiro, com entradas na sidebar', async () => {
    gravarSessaoFinanceiro();

    renderizar('/despesas-recorrentes');

    expect(await screen.findByText('Nenhuma despesa recorrente cadastrada.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Despesas Recorrentes' })).toHaveAttribute('href', '/despesas-recorrentes');
    expect(screen.getByRole('link', { name: 'Resumo a Pagar' })).toHaveAttribute('href', '/contas-a-pagar/resumo');
  });

  it('abre o resumo de contas a pagar pela rota', async () => {
    gravarSessaoFinanceiro();

    renderizar('/contas-a-pagar/resumo');

    expect(await screen.findByText('Resumo de Contas a Pagar')).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent('/contas-a-pagar/resumo');
  });

  it('redireciona quem não é financeiro das telas de contas a receber, sem as entradas', async () => {
    gravarSessao(false);

    renderizar('/titulos-receber');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent(/^\/$/));
    for (const nome of ['Contas a Receber', 'Antecipações', 'Resumo a Receber', 'Boletos Pendentes']) {
      expect(screen.queryByRole('link', { name: nome })).toBeNull();
    }
  });

  it.each([
    ['/titulos-receber/tit-1'],
    ['/antecipacoes'],
    ['/antecipacoes/ant-1'],
    ['/contas-a-receber/resumo'],
    ['/contas-a-receber/boletos'],
  ])('redireciona quem não é financeiro de %s', async (caminho) => {
    gravarSessao(false);

    renderizar(caminho);

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent(/^\/$/));
  });

  it('libera os títulos a receber para o financeiro, com as entradas na sidebar', async () => {
    gravarSessaoFinanceiro();

    renderizar('/titulos-receber');

    expect(await screen.findByText('Nenhum título a receber nas empresas do seu acesso.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contas a Receber' })).toHaveAttribute('href', '/titulos-receber');
    expect(screen.getByRole('link', { name: 'Antecipações' })).toHaveAttribute('href', '/antecipacoes');
    expect(screen.getByRole('link', { name: 'Resumo a Receber' })).toHaveAttribute('href', '/contas-a-receber/resumo');
    expect(screen.getByRole('link', { name: 'Boletos Pendentes' })).toHaveAttribute('href', '/contas-a-receber/boletos');
  });

  it.each([
    ['/antecipacoes', 'Nenhuma antecipação registrada.'],
    ['/contas-a-receber/resumo', 'Resumo de Contas a Receber'],
    ['/contas-a-receber/boletos', 'Nenhum boleto pendente de envio no prazo.'],
  ])('abre %s para o financeiro', async (caminho, texto) => {
    gravarSessaoFinanceiro();

    renderizar(caminho);

    expect(await screen.findByText(texto)).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent(caminho);
  });

  it.each([
    ['/notas-fiscais', 'Nenhuma nota fiscal nas empresas do seu acesso.'],
    ['/notas-fiscais/itens-sem-produto', 'Nenhum item de nota sem produto.'],
    ['/notas-fiscais/entregas-sem-nota', 'Todas as entregas que saíram têm nota fiscal.'],
  ])('abre %s para qualquer autenticado', async (caminho, texto) => {
    gravarSessao(false);

    renderizar(caminho);

    expect(await screen.findByText(texto)).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent(caminho);
  });

  it('mostra Notas Fiscais a todos e as pendências de nota só ao financeiro', async () => {
    gravarSessao(false);

    const { unmount } = renderizar('/notas-fiscais');

    expect(await screen.findByRole('link', { name: 'Notas Fiscais' })).toHaveAttribute('href', '/notas-fiscais');
    expect(screen.queryByRole('link', { name: 'Itens sem Produto' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Entregas sem NF' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Importar NF-e/ })).toBeNull();
    unmount();

    gravarSessaoFinanceiro();
    renderizar('/notas-fiscais');

    expect(await screen.findByRole('button', { name: /Importar NF-e/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Itens sem Produto' })).toHaveAttribute('href', '/notas-fiscais/itens-sem-produto');
    expect(screen.getByRole('link', { name: 'Entregas sem NF' })).toHaveAttribute('href', '/notas-fiscais/entregas-sem-nota');
  });

  it('abre as comissões para o financeiro, com a entrada na sidebar', async () => {
    gravarSessaoFinanceiro();

    renderizar('/comissoes');

    expect(await screen.findByRole('heading', { name: 'Comissões' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Comissões' })).toHaveAttribute('href', '/comissoes');
    expect(screen.queryByRole('link', { name: 'Minhas Comissões' })).toBeNull();
  });

  it('mostra Minhas Comissões ao comercial sem financeiro e nada a quem não é nenhum dos dois', async () => {
    localStorage.setItem(
      'mia.sessao',
      JSON.stringify({
        token: 'token-de-teste',
        expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        administrador: false,
        comercial: true,
        usuario: { usuario_id: 1, nome: 'Pessoa Teste', email: 'teste@exemplo.com' },
      })
    );
    const { unmount } = renderizar('/comissoes');

    expect(await screen.findByRole('heading', { name: 'Minhas comissões' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Minhas Comissões' })).toHaveAttribute('href', '/comissoes');
    unmount();

    gravarSessao(false);
    renderizar('/');
    await screen.findByTestId('caminho');
    expect(screen.queryByRole('link', { name: 'Minhas Comissões' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Comissões' })).toBeNull();
  });

  it('abre o detalhe do fechamento de comissão pela rota', async () => {
    gravarSessaoFinanceiro();

    renderizar('/comissoes/fechamentos/fec-1');

    expect(await screen.findByRole('link', { name: /Voltar/ })).toHaveAttribute('href', '/comissoes');
    expect(screen.getByTestId('caminho')).toHaveTextContent('/comissoes/fechamentos/fec-1');
  });

  it('redireciona da tabela de preços quem não é comercial nem financeiro, sem a entrada', async () => {
    gravarSessao(false);

    renderizar('/tabela-precos');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent(/^\/$/));
    expect(screen.queryByRole('link', { name: 'Tabela de Preços' })).toBeNull();
  });

  it('abre a tabela de preços para o financeiro, com a entrada na sidebar', async () => {
    gravarSessaoFinanceiro();

    renderizar('/tabela-precos');

    expect(await screen.findByRole('heading', { name: 'Tabela de preços' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tabela de Preços' })).toHaveAttribute('href', '/tabela-precos');
  });

  it('abre a página de impressão da proposta pela rota', async () => {
    gravarSessao(false);

    renderizar('/pedidos/ped-1/proposta');

    expect(await screen.findByRole('link', { name: /Voltar ao pedido/ })).toHaveAttribute('href', '/pedidos/ped-1');
    expect(screen.getByTestId('caminho')).toHaveTextContent('/pedidos/ped-1/proposta');
  });

  it('redireciona do caixa quem não é financeiro, sem a entrada', async () => {
    gravarSessao(false);

    renderizar('/caixa');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent(/^\/$/));
    expect(screen.queryByRole('link', { name: 'Caixa' })).toBeNull();
  });

  it('abre o caixa para o financeiro, com a entrada na sidebar', async () => {
    gravarSessaoFinanceiro();

    renderizar('/caixa');

    expect(await screen.findByRole('heading', { name: 'Caixa' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Caixa' })).toHaveAttribute('href', '/caixa');
  });

  it('redireciona das importações quem não é comercial nem financeiro, sem as entradas', async () => {
    gravarSessao(false);

    renderizar('/importacoes/alertas');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent(/^\/$/));
    expect(screen.queryByRole('link', { name: 'Importações' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Alertas de Importação' })).toBeNull();
  });

  it('abre as importações, os alertas e o detalhe para o comercial, com as entradas na sidebar', async () => {
    localStorage.setItem(
      'mia.sessao',
      JSON.stringify({
        token: 'token-de-teste',
        expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        administrador: false,
        comercial: true,
        usuario: { usuario_id: 1, nome: 'Pessoa Teste', email: 'teste@exemplo.com' },
      })
    );
    const { unmount } = renderizar('/importacoes');

    expect(await screen.findByText('Nenhuma importação nas empresas do seu acesso.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Importações' })).toHaveAttribute('href', '/importacoes');
    expect(screen.getByRole('link', { name: 'Alertas de Importação' })).toHaveAttribute('href', '/importacoes/alertas');
    unmount();

    const alertas = renderizar('/importacoes/alertas');
    expect(await screen.findByText('Alertas de importação')).toBeInTheDocument();
    alertas.unmount();

    renderizar('/importacoes/imp-1');
    expect(await screen.findByRole('link', { name: /Voltar/ })).toHaveAttribute('href', '/importacoes');
    expect(screen.getByTestId('caminho')).toHaveTextContent('/importacoes/imp-1');
  });

  it('redireciona das dívidas quem não é financeiro, sem as entradas', async () => {
    gravarSessao(false);

    renderizar('/dividas/resumo');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent(/^\/$/));
    expect(screen.queryByRole('link', { name: 'Dívidas' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Resumo de Dívidas' })).toBeNull();
  });

  it('abre as dívidas e o detalhe para o financeiro, com as entradas na sidebar', async () => {
    gravarSessaoFinanceiro();
    const { unmount } = renderizar('/dividas');

    expect(await screen.findByText('Nenhuma dívida nas empresas do seu acesso.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dívidas' })).toHaveAttribute('href', '/dividas');
    expect(screen.getByRole('link', { name: 'Resumo de Dívidas' })).toHaveAttribute('href', '/dividas/resumo');
    unmount();

    renderizar('/dividas/div-1');
    expect(await screen.findByRole('link', { name: /Voltar/ })).toHaveAttribute('href', '/dividas');
    expect(screen.getByTestId('caminho')).toHaveTextContent('/dividas/div-1');
  });

  it('redireciona da DRE quem não é financeiro, sem as entradas', async () => {
    gravarSessao(false);

    renderizar('/dre/faturamento');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent(/^\/$/));
    expect(screen.queryByRole('link', { name: 'DRE' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Faturamento' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Relatórios' })).toBeNull();
  });

  it('abre a DRE, o faturamento e o relatório semanal para o financeiro, com as entradas na sidebar', async () => {
    gravarSessaoFinanceiro();
    const { unmount } = renderizar('/dre');

    expect(await screen.findByText('DRE', { selector: '.dre-toolbar-titulo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'DRE' })).toHaveAttribute('href', '/dre');
    expect(screen.getByRole('link', { name: 'Faturamento' })).toHaveAttribute('href', '/dre/faturamento');
    expect(screen.getByRole('link', { name: 'Relatórios' })).toHaveAttribute('href', '/dre/relatorio-semanal');
    unmount();

    const faturamento = renderizar('/dre/faturamento');
    expect(await screen.findByText('Faturamento', { selector: '.dre-toolbar-titulo' })).toBeInTheDocument();
    faturamento.unmount();

    renderizar('/relatorios');
    expect(await screen.findByText('Relatório semanal', { selector: '.dre-toolbar-titulo' })).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent('/dre/relatorio-semanal');
  });

  it('redireciona /pagamentos para /solicitacoes', async () => {
    gravarSessao(false);

    renderizar('/pagamentos');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/solicitacoes'));
    expect(await screen.findByText('Nova Solicitação')).toBeInTheDocument();
  });

  it('depois do login volta para o link de origem', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify(
            String(url).includes('/usuarios/autenticar')
              ? {
                  dados: {
                    token: 'token-novo',
                    expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                    administrador: false,
                    usuario: { usuario_id: 1, nome: 'Pessoa Teste' },
                  },
                }
              : { dados: [] }
          ),
      }))
    );

    renderizar('/solicitacoes?escopo=minhas');
    expect(await screen.findByRole('heading', { name: 'Entrar no painel' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'pessoa@exemplo.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(screen.getByTestId('caminho-completo')).toHaveTextContent('/solicitacoes?escopo=minhas')
    );
  });

  describe('tela inicial preferida', () => {
    function simularLogin(perfil) {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url) => ({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify(
              String(url).includes('/usuarios/autenticar')
                ? { dados: { token: 'token-novo', ...perfil, usuario: { id: 'u-1', nome: 'Pessoa Teste' } } }
                : { dados: [] }
            ),
        }))
      );
    }

    async function entrar(caminho) {
      renderizar(caminho);
      fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'pessoa@exemplo.com' } });
      fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo' } });
      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    }

    beforeEach(() => {
      localStorage.setItem('mia.preferencias.u-1', JSON.stringify({ telaInicial: '/caixa' }));
    });

    it('sem link de origem leva para a tela inicial escolhida', async () => {
      simularLogin({ financeiro: true });

      await entrar('/');

      await waitFor(() => expect(screen.getByTestId('caminho-completo')).toHaveTextContent(/^\/caixa$/));
    });

    it('o link de origem tem prioridade sobre a tela inicial', async () => {
      simularLogin({ financeiro: true });

      await entrar('/fornecedores');

      await waitFor(() => expect(screen.getByTestId('caminho-completo')).toHaveTextContent(/^\/fornecedores$/));
    });

    it('volta para a raiz quando a tela escolhida saiu do perfil', async () => {
      simularLogin({ comercial: true });

      await entrar('/login');

      await waitFor(() => expect(screen.getByTestId('caminho-completo')).toHaveTextContent(/^\/$/));
    });
  });

  it('sem link de origem o login leva para a raiz', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify(
            String(url).includes('/usuarios/autenticar')
              ? { dados: { token: 'token-novo', usuario: { usuario_id: 1, nome: 'Pessoa Teste' } } }
              : { dados: [] }
          ),
      }))
    );

    renderizar('/login');
    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'pessoa@exemplo.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(screen.getByTestId('caminho-completo')).toHaveTextContent(/^\/$/));
  });

  it('leva qualquer rota desconhecida para a raiz', async () => {
    gravarSessao(true);

    renderizar('/rota-que-nao-existe');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/'));
  });
});
