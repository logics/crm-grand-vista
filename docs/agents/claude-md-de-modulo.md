# Modelo de `CLAUDE.md` de módulo

Cada pasta de módulo (`apps/api/src/modules/<nome>`, `apps/web/src/modules/<nome>`, `packages/<nome>`) carrega um `CLAUDE.md` curto, carregado automaticamente quando um agente trabalha ali.

É **ponteiro, não spec**. Se começar a crescer, o conteúdo pertence à spec do módulo em `docs/specs/`. Seção sem conteúdo é omitida.

Copie o bloco abaixo e preencha:

```markdown
# <nome do módulo>

<Uma frase: o que este módulo faz.>

- **Spec:** `docs/specs/<spec>.md`
- **Tabelas que possui:** `<tabela>`, `<tabela>` — colunas em `docs/specs/modelo-de-dados.md`
- **Depende de:** `<módulo ou pacote>`

## Convenções locais

- <Só o que vale aqui e não está no `CLAUDE.md` da raiz.>
```
