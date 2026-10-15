Label/value grid for the ficha técnica (solo, topografia, água, infraestrutura, produtividade).

```jsx
<SpecList columns={3} items={[
  {label:'Área total', value:'1.480 ha', mono:true},
  {label:'Disponibilidade hídrica', value:'Rio perene + 2 açudes'},
  {label:'Situação documental', value:'Regular'}]} />
```

Missing values render an em dash — never invent data.
