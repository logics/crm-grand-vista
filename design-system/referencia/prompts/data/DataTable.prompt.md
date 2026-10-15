The workhorse list. Stone header band with 12px grey sentence-case labels, 56px rows, hairline rules, hover tint. Put it in a `Card padding="0"`; on mobile render record cards instead.

```jsx
<DataTable
  columns={[{key:'nome',label:'Fazenda',wrap:true},{key:'area',label:'Área útil',mono:true,align:'right'},
            {key:'status',label:'Status',render:r=><Badge tone={r.tone} dot>{r.status}</Badge>}]}
  rows={fazendas} onRowClick={openFazenda} />
```

Numeric columns: `mono` + `align:'right'`, always.
