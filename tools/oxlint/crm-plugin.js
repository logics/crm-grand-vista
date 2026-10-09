// Plugin local do oxlint. O oxlint não implementa `no-restricted-syntax` do
// ESLint, e é nessa regra que vivem quase todas as regras de aderência ao
// Design System vindas do export (cor hex crua, px cru, fonte fora do DS,
// props e variantes de cada componente). Esta é a mesma regra do ESLint —
// seletor AST + mensagem —, rodando pela API de plugins JS do oxlint.
export default {
  meta: { name: 'crm' },
  rules: {
    'no-restricted-syntax': {
      meta: {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: { selector: { type: 'string' }, message: { type: 'string' } },
            required: ['selector'],
            additionalProperties: false,
          },
        },
      },
      create(context) {
        const visitor = {};
        for (const { selector, message } of context.options) {
          visitor[selector] = (node) =>
            context.report({ node, message: message ?? `Sintaxe restrita: ${selector}` });
        }
        return visitor;
      },
    },
  },
};
