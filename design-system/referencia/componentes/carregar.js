// Substitui o `_ds_bundle.js` do export (interno do Claude Design, descartado).
// Compila no navegador os `.jsx` de referência desta pasta e expõe os
// componentes em `window.GrandVistaDesignSystem`, para os cartões e o kit do
// site. Exige React, ReactDOM e @babel/standalone carregados antes, e uma
// página servida por HTTP — `file://` bloqueia a leitura dos `.jsx`.
//
// Referência visual apenas: nada de `packages/ui` importa daqui.
(function () {
  var COMPONENTS = [
    'core/Badge', 'core/Button', 'core/Card', 'core/Icon', 'core/IconButton', 'core/Tag', 'core/Wordmark',
    'data/ActivityTimeline', 'data/ChecklistItem', 'data/DataTable', 'data/DealCard', 'data/FarmCard',
    'data/MatchScore', 'data/PipelineColumn', 'data/ProgressBar', 'data/SpecList', 'data/StatCard',
    'feedback/Dialog', 'feedback/EmptyState', 'feedback/Toast',
    'forms/Checkbox', 'forms/Field', 'forms/Input', 'forms/SearchBar', 'forms/Select', 'forms/Switch', 'forms/Textarea',
    'navigation/SidebarNav', 'navigation/StageStepper', 'navigation/Tabs', 'navigation/TopBar',
  ];
  var base = new URL('.', document.currentScript.src);
  var modules = {};

  function read(url) {
    // Síncrono de propósito: os componentes precisam existir antes de o
    // @babel/standalone executar os scripts `text/babel` da página.
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send();
    if (xhr.status !== 200 && xhr.status !== 0) throw new Error('Falha ao ler ' + url + ' (' + xhr.status + ')');
    return xhr.responseText;
  }

  function load(url) {
    if (modules[url]) return modules[url].exports;
    var module = { exports: {} };
    modules[url] = module;
    var code = Babel.transform(read(url), {
      filename: url,
      presets: ['react'],
      plugins: ['transform-modules-commonjs'],
    }).code;
    var require = function (spec) {
      if (spec === 'react') return React;
      return load(new URL(spec, url).href);
    };
    new Function('require', 'module', 'exports', 'React', code)(require, module, module.exports, React);
    return module.exports;
  }

  var ns = (window.GrandVistaDesignSystem = window.GrandVistaDesignSystem || {});
  COMPONENTS.forEach(function (path) {
    Object.assign(ns, load(new URL(path + '.jsx', base).href));
  });
})();
