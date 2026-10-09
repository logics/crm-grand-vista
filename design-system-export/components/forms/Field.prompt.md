Label + hint + error wrapper for any form control. Cadastro de fazendas has ~30 fields, so always wrap.

```jsx
<Field label="Valor por hectare útil" hint="Em R$, sem centavos" required>
  <Input prefix="R$" value={v} onChange={…} />
</Field>
```
