The CRM's floating white navigation card. Active item = near-black green pill with white text; Jost wordmark in the header. `collapsed` = 76px icon rail (tablet). On mobile use a bottom tab bar instead.

```jsx
<SidebarNav active="fazendas" onSelect={setView} items={[
  {id:'dashboard', label:'Dashboard', icon:'layout-dashboard'},
  {section:'Comercial'},
  {id:'fazendas', label:'Fazendas', icon:'tractor', badge:128},
  {id:'compradores', label:'Compradores', icon:'users'},
  {id:'pipeline', label:'Pipeline', icon:'kanban'}]} />
```
