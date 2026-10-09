// Shared demo data for the CRM v2 and site kits (pt-BR).
window.GV_DATA = {
  nav: [{
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'layout-dashboard'
  }, {
    section: 'Comercial'
  }, {
    id: 'fazendas',
    label: 'Fazendas',
    icon: 'tractor',
    badge: 128
  }, {
    id: 'compradores',
    label: 'Compradores',
    icon: 'users',
    badge: 342
  }, {
    id: 'oportunidades',
    label: 'Oportunidades',
    icon: 'handshake',
    badge: 47
  }, {
    id: 'pipeline',
    label: 'Pipeline',
    icon: 'kanban'
  }, {
    section: 'Operação'
  }, {
    id: 'diligence',
    label: 'Due diligence',
    icon: 'shield-check',
    badge: 7
  }, {
    id: 'agenda',
    label: 'Agenda',
    icon: 'calendar-clock',
    badge: 3
  }, {
    id: 'relatorios',
    label: 'Relatórios',
    icon: 'file-bar-chart'
  }, {
    section: 'Administração'
  }, {
    id: 'usuarios',
    label: 'Usuários e perfis',
    icon: 'user-cog'
  }, {
    id: 'auditoria',
    label: 'Logs de auditoria',
    icon: 'history'
  }],
  stages: ['Lead recebido', 'Qualificação', 'Levantamento de perfil', 'Apresentação de opções', 'Visita técnica', 'Pré-negociação', 'Due diligence', 'Estruturação contratual', 'Fechamento', 'Pós-venda'],
  fazendas: [{
    id: 'F-118',
    nome: 'Fazenda Três Barras',
    mun: 'Jaborandi, BA',
    regiao: 'Oeste da Bahia',
    area: '1.480',
    util: '1.120',
    ha: '62.000',
    sacas: '1.240',
    status: 'Disponível',
    tone: 'success',
    apt: 'Lavoura',
    corretor: 'Milson',
    prior: 'Alta',
    agua: 'Rio perene + 2 açudes',
    irrig: 'Alto',
    rodovia: '12 km',
    armazem: '18 km',
    doc: 'Regular'
  }, {
    id: 'F-102',
    nome: 'Fazenda Santa Rita',
    mun: 'Uberaba, MG',
    regiao: 'Alto Paranaíba',
    area: '820',
    util: '690',
    ha: '88.500',
    sacas: '1.770',
    status: 'Em negociação',
    tone: 'info',
    apt: 'Mista',
    corretor: 'Renata C.',
    prior: 'Alta',
    agua: 'Poços artesianos',
    irrig: 'Médio',
    rodovia: '4 km',
    armazem: '9 km',
    doc: 'Regular'
  }, {
    id: 'F-131',
    nome: 'Fazenda Boa Esperança',
    mun: 'Bom Jesus, PI',
    regiao: 'Sul do Piauí',
    area: '2.140',
    util: '1.680',
    ha: '41.200',
    sacas: '824',
    status: 'Doc. pendente',
    tone: 'warning',
    apt: 'Lavoura',
    corretor: 'Milson',
    prior: 'Média',
    agua: 'Riacho intermitente',
    irrig: 'Baixo',
    rodovia: '31 km',
    armazem: '44 km',
    doc: 'Em regularização'
  }, {
    id: 'F-097',
    nome: 'Fazenda Vale do Cedro',
    mun: 'Sorriso, MT',
    regiao: 'Médio-Norte MT',
    area: '3.260',
    util: '2.980',
    ha: '115.000',
    sacas: '2.300',
    status: 'Disponível',
    tone: 'success',
    apt: 'Lavoura',
    corretor: 'Diego A.',
    prior: 'Alta',
    agua: '2 rios perenes',
    irrig: 'Alto',
    rodovia: '8 km',
    armazem: '6 km',
    doc: 'Regular'
  }, {
    id: 'F-076',
    nome: 'Fazenda Serra Azul',
    mun: 'Chapadão do Sul, MS',
    regiao: 'Bolsão MS',
    area: '640',
    util: '520',
    ha: '96.400',
    sacas: '1.930',
    status: 'Reservada',
    tone: 'neutral',
    apt: 'Pecuária',
    corretor: 'Renata C.',
    prior: 'Baixa',
    agua: 'Nascentes',
    irrig: 'Médio',
    rodovia: '15 km',
    armazem: '22 km',
    doc: 'Regular'
  }, {
    id: 'F-142',
    nome: 'Fazenda Nova Aliança',
    mun: 'Formosa do Rio Preto, BA',
    regiao: 'Oeste da Bahia',
    area: '1.910',
    util: '1.540',
    ha: '58.700',
    sacas: '1.174',
    status: 'Disponível',
    tone: 'success',
    apt: 'Mista',
    corretor: 'Diego A.',
    prior: 'Média',
    agua: 'Açude + poço',
    irrig: 'Médio',
    rodovia: '22 km',
    armazem: '27 km',
    doc: 'Regular'
  }],
  compradores: [{
    nome: 'Agro Holding Bertoldi',
    tipo: 'PJ',
    ticket: 'R$ 25 mi',
    regioes: ['Oeste da Bahia', 'Sul do Piauí'],
    culturas: ['Soja', 'Milho'],
    hectares: '1.000 – 2.500 ha',
    urgencia: 'Alta',
    qualificacao: 'Quente',
    score: 92
  }, {
    nome: 'Família Nakamura',
    tipo: 'PF',
    ticket: 'R$ 12 mi',
    regioes: ['Alto Paranaíba'],
    culturas: ['Café', 'Milho'],
    hectares: '400 – 900 ha',
    urgencia: 'Média',
    qualificacao: 'Morno',
    score: 74
  }, {
    nome: 'Fundo Terra Firme',
    tipo: 'PJ',
    ticket: 'R$ 60 mi',
    regioes: ['Médio-Norte MT', 'Bolsão MS'],
    culturas: ['Soja', 'Algodão'],
    hectares: '2.000 – 5.000 ha',
    urgencia: 'Baixa',
    qualificacao: 'Frio',
    score: 58
  }, {
    nome: 'Pecuária São Judas',
    tipo: 'PJ',
    ticket: 'R$ 9 mi',
    regioes: ['Bolsão MS'],
    culturas: ['Pecuária'],
    hectares: '300 – 800 ha',
    urgencia: 'Alta',
    qualificacao: 'Quente',
    score: 41
  }],
  pipeline: [{
    stage: 'Lead recebido',
    pct: 9,
    index: 1,
    total: 'R$ 14,2 mi',
    deals: [{
      client: 'Pecuária São Judas',
      farm: 'Fazenda Serra Azul',
      value: 'R$ 6,1 mi',
      probability: 15,
      owner: 'RC',
      nextAction: 'Primeiro contato · hoje'
    }, {
      client: 'Investidor — indicação Milson',
      farm: 'Sem fazenda associada',
      value: 'R$ 8,1 mi',
      probability: 10,
      owner: 'MS',
      nextAction: 'Qualificar · 26/07'
    }]
  }, {
    stage: 'Qualificação',
    pct: 14,
    index: 2,
    total: 'R$ 21,5 mi',
    deals: [{
      client: 'Família Nakamura',
      farm: 'Fazenda Santa Rita',
      value: 'R$ 11,0 mi',
      probability: 30,
      owner: 'RC',
      nextAction: 'Levantar perfil · 27/07'
    }, {
      client: 'Grupo Vilela',
      farm: '2 fazendas',
      value: 'R$ 10,5 mi',
      probability: 25,
      owner: 'DA',
      nextAction: 'Retorno atrasado · 09/07',
      overdue: true
    }]
  }, {
    stage: 'Apresentação de opções',
    pct: 22,
    index: 4,
    total: 'R$ 33,8 mi',
    deals: [{
      client: 'Fundo Terra Firme',
      farm: '3 fazendas',
      value: 'R$ 33,8 mi',
      probability: 45,
      owner: 'DA',
      nextAction: 'Enviar dossiê · 25/07'
    }]
  }, {
    stage: 'Visita técnica',
    pct: 12,
    index: 5,
    total: 'R$ 18,4 mi',
    deals: [{
      client: 'Agro Holding Bertoldi',
      farm: 'Fazenda Três Barras',
      value: 'R$ 18,4 mi',
      probability: 70,
      owner: 'MS',
      nextAction: 'Visita · 28/07'
    }]
  }, {
    stage: 'Due diligence',
    pct: 27,
    index: 7,
    total: 'R$ 42,1 mi',
    deals: [{
      client: 'Cooperativa Alto Vale',
      farm: 'Fazenda Vale do Cedro',
      value: 'R$ 34,7 mi',
      probability: 80,
      owner: 'DA',
      nextAction: 'Laudo ambiental · 30/07'
    }, {
      client: 'Bertoldi Participações',
      farm: 'Fazenda Nova Aliança',
      value: 'R$ 7,4 mi',
      probability: 65,
      owner: 'MS',
      nextAction: 'Sem atividade há 18 dias',
      overdue: true
    }]
  }, {
    stage: 'Fechamento',
    pct: 17,
    index: 9,
    total: 'R$ 26,9 mi',
    deals: [{
      client: 'Grupo Nakamura Agro',
      farm: 'Fazenda Santa Rita',
      value: 'R$ 26,9 mi',
      probability: 90,
      owner: 'RC',
      nextAction: 'Assinatura · 31/07'
    }]
  }],
  atividades: [{
    kind: 'visita',
    title: 'Visita técnica à Fazenda Três Barras',
    date: '24/07 · 09h00',
    detail: 'Comprador acompanhou a colheita e solicitou laudo de solo atualizado.',
    author: 'Milson'
  }, {
    kind: 'mensagem',
    title: 'Oportunidade enviada por WhatsApp',
    date: '21/07 · 18h20',
    detail: 'Fazenda Nova Aliança enviada a 4 compradores compatíveis.',
    author: 'Sistema'
  }, {
    kind: 'ligacao',
    title: 'Retorno ao Fundo Terra Firme',
    date: '19/07 · 16h10',
    detail: 'Fundo pediu comparativo de valor por hectare útil entre MT e BA.',
    author: 'Diego A.'
  }, {
    kind: 'nota',
    title: 'Proprietário aceita negociar prazo',
    date: '17/07 · 11h05',
    detail: 'Até 30% em sacas de soja, safra 26/27.',
    author: 'Milson'
  }],
  diligence: [{
    state: 'ok',
    label: 'Matrícula atualizada',
    meta: 'Anexada em 12/03 · Cartório de Barreiras',
    badge: 'Concluído'
  }, {
    state: 'ok',
    label: 'CAR e CCIR',
    meta: 'Validados em 02/04',
    badge: 'Concluído'
  }, {
    state: 'pending',
    label: 'Licença ambiental',
    meta: 'Aguardando órgão estadual desde 28/06',
    badge: 'Em análise'
  }, {
    state: 'blocked',
    label: 'Georreferenciamento',
    meta: 'Divergência de 4,2 ha na divisa norte',
    badge: 'Pendência'
  }, {
    state: 'empty',
    label: 'Certidões fiscais',
    meta: 'Não iniciado'
  }],
  documentos: [{
    cat: 'Matrículas',
    qtd: 4,
    atualizado: '12/03/2026'
  }, {
    cat: 'CAR / CCIR',
    qtd: 2,
    atualizado: '02/04/2026'
  }, {
    cat: 'Georreferenciamento',
    qtd: 3,
    atualizado: '19/05/2026'
  }, {
    cat: 'Mapas',
    qtd: 5,
    atualizado: '19/05/2026'
  }, {
    cat: 'Laudos',
    qtd: 2,
    atualizado: '01/07/2026'
  }, {
    cat: 'Contratos',
    qtd: 1,
    atualizado: '11/07/2026'
  }],
  regioes: [{
    nome: 'Oeste da Bahia',
    buscas: 38,
    pct: 100
  }, {
    nome: 'Médio-Norte MT',
    buscas: 31,
    pct: 82
  }, {
    nome: 'Alto Paranaíba',
    buscas: 24,
    pct: 63
  }, {
    nome: 'Sul do Piauí',
    buscas: 17,
    pct: 45
  }, {
    nome: 'Bolsão MS',
    buscas: 11,
    pct: 29
  }]
};
