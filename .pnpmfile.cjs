// O `drizzle-orm` declara `kysely` como peer opcional, e o Better Auth traz o
// kysely como dependência. Sem este gancho o pnpm instala duas cópias do
// drizzle-orm — uma para `@crm/db`, outra (com kysely) para `@crm/api` — e os
// tipos de uma não casam com os da outra. O projeto não usa kysely com o
// Drizzle: removendo o peer, o workspace inteiro compartilha uma instância só.
function readPackage(pkg) {
  if (pkg.name === 'drizzle-orm') {
    delete pkg.peerDependencies?.kysely;
    delete pkg.peerDependenciesMeta?.kysely;
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
