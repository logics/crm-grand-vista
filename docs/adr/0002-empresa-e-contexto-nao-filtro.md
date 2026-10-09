# Empresa é contexto da requisição, nunca filtro de consulta

O isolamento entre empresas é garantido pelo Row-Level Security do Postgres, que define **uma** empresa por transação via `SET LOCAL app.tenant_id`. Por isso a empresa ativa é contexto da requisição — resolvida a partir do slug na URL (`/e/<empresa>/...`), validada contra o vínculo do usuário logado e aplicada antes de qualquer consulta — e nunca um campo na barra de filtros de um módulo. Um seletor de empresa dentro de um filtro implicaria que a consulta pode atravessar empresas e que só o filtro a contém, que é exatamente a consulta que vaza quando alguém esquece o filtro.

## Considered Options

Guardar a empresa ativa apenas na sessão, sem expô-la na URL, foi a primeira decisão e foi revista: um link compartilhado (`/fazendas/123`) passa a depender do contexto de quem abre, e o colega que estiver em outra empresa recebe "não encontrado" sem entender por quê. Numa corretora que troca link de fazenda por WhatsApp o dia inteiro, isso aparece rápido. A empresa no caminho também permite duas abas abertas em empresas diferentes, impossível com contexto único de sessão, e transforma a empresa ativa de estado invisível em estado diagnosticável.

Subdomínio por empresa (`grandvista.crm.com`) resolveria o mesmo problema, mas exige trabalho de DNS e certificado por cliente que não se justifica enquanto o licenciamento para outras corretoras é hipótese.

## Consequences

A URL **pede** uma empresa, nunca autoriza: o fluxo por requisição é resolver o slug, verificar o vínculo do usuário, e só então aplicar o contexto. Sem vínculo, a resposta é **404 e não 403** — um 403 confirmaria que aquela empresa existe, permitindo a alguém varrer slugs e descobrir a carteira de clientes da plataforma.

Consultas que agregam entre empresas — uma visão da plataforma para o super admin, por exemplo — não são um filtro afrouxado nos módulos do CRM, e sim uma superfície de relatório separada, com caminho de acesso próprio.
