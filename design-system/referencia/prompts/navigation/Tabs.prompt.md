Default `segmented`: pill track with a raised white thumb — filters, periods, views. `variant="underline"` (ink rule) splits a fazenda or comprador record into panels. Both scroll horizontally on narrow screens.

```jsx
<Tabs active={tab} onSelect={setTab} items={[
  {id:'ficha', label:'Ficha técnica'}, {id:'docs', label:'Documentos', count:14},
  {id:'match', label:'Compradores compatíveis', count:6}, {id:'hist', label:'Histórico'}]} />
```
