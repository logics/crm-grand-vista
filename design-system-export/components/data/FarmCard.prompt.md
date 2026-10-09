Fazenda card — photo with scrim, name, município, price in green mono, then up to four icon specs.

```jsx
<FarmCard name="Fazenda Boa Esperança" location="Jaborandi, BA · Oeste da Bahia"
  price="R$ 62.000" area="1.480 ha · 1.120 úteis" status="Disponível"
  specs={[{icon:'droplets',value:'Irrigável'},{icon:'wheat',value:'Soja + milho'}]} />
```

Never fabricate photos — leave `image` unset and the stone placeholder shows.
