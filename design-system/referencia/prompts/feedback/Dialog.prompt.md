Centered modal on a green scrim. Used for enviar oportunidade, confirmar exclusão, cadastro rápido.

```jsx
<Dialog eyebrow="Oportunidade" title="Enviar ao comprador" onClose={close}
  footer={<><Button variant="secondary" onClick={close}>Cancelar</Button><Button icon="send">Enviar</Button></>}>
  …
</Dialog>
```

The overlay is `position:absolute` — render it inside a `position:relative` app shell.
