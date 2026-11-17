# Fluxo de push e PR ao fim da rodada

Regra aprovada pelo Romeu em 16/11/2026. Vale para toda rodada de agentes que implementa uma issue.

## Quando a rodada publica

A rodada só publica o trabalho quando duas condições são verdadeiras ao mesmo tempo:

- a revisão do Opus terminou com `VEREDITO: PASS`;
- todos os gates passaram (typecheck, lint, testes unitários e de integração).

Se qualquer uma falhar, a rodada não faz push nem abre PR. Ela corrige e revisa de novo.

## O que a rodada faz

1. **Varredura de segredos.** Antes do push, roda `gitleaks git --redact --no-banner --log-opts="origin/main..HEAD" .`. Qualquer achado interrompe o fluxo: nada é enviado.
2. **Push da branch.** Push normal da branch da issue. Nunca `--force`, nunca rebase e nunca push direto na `main`.
3. **PR.** Abre o PR da branch. Se o PR já existe, o próprio push o atualiza e nada novo é aberto.

## Corpo do PR

- `Closes #N` em linha própria, em inglês (ver `issue-tracker.md`, seção "Vínculo entre issue e PR").
- A revisão do Opus (veredito e achados relevantes).
- As provas: resultado dos gates e o que foi exercitado no navegador, quando houver tela.
- Sem a linha "Generated with Claude Code" e sem `Co-Authored-By`.

## O que a rodada nunca faz

- **Merge.** O Romeu faz todo merge, sem exceção.
- **Fechar issue à mão.** A issue fecha pelo `Closes #N` quando o Romeu mergeia o PR.

## Conflito com a main

Se a `main` andou e a branch conflita, a rodada faz merge commit da `main` na branch (nunca rebase), resolve os conflitos, roda os gates de novo e pede nova revisão. Só então volta ao fluxo acima.

## Antes de seguir para a próxima issue

Não há aviso automático de merge.

Se a próxima issue depende de um PR ainda aberto (mesmos arquivos, migrations em sequência ou dependência declarada na issue), o agente confere no GitHub com `gh pr view <n>` ou `gh pr list` e só começa depois do merge, ou parte de uma base combinada com o Romeu.

Issues sem dependência partem da `main` atualizada e podem ter PRs abertos em paralelo.

Quando um PR mergeia e outro PR aberto passa a conflitar, aplica-se a seção "Conflito com a main": merge commit da `main`, gates e nova revisão.
