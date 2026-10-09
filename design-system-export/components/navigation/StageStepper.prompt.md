Shows where one opportunity stands in the funil. Concluded = green bar + check, current = gold bar, upcoming = grey.
In a narrow column (side panel, card), use `compact` — the labelled variant needs ~960px.

```jsx
<StageStepper compact current={6} stages={etapas} />
```

```jsx
<StageStepper current={6} stages={['Lead recebido','Qualificação','Levantamento de perfil','Apresentação de opções','Visita técnica','Pré-negociação','Due diligence','Estruturação contratual','Fechamento','Pós-venda']} />
```
