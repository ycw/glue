require.config({
  paths: {
    'vs': 'https://unpkg.com/monaco-editor@0.32.1/min/vs'
  }
});

function require_async(deps) {
  return new Promise((resolve) => require(deps, resolve));
}

const [monaco, three_dts, sample_code] = await Promise.all([
  require_async(['vs/editor/editor.main']),
  fetch('../../artifacts/three.d.ts').then(r => r.text()),
  fetch('./sample_code.js').then(r => r.text())
]);

monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ES2020,
	allowNonTsExtensions: true,
});

monaco.languages.typescript.typescriptDefaults.addExtraLib(three_dts);

const ed1 = monaco.editor.create(document.getElementById('consumer'), {
  theme: 'vs-dark',
  language: 'typescript',
  value: sample_code
});

const ed2 = monaco.editor.create(document.getElementById('three_dts'), {
  theme: 'vs-dark',
  language: 'typescript',
  value: three_dts,
  readOnly: true,
});

window.onresize = () => {
  ed1.layout();
  ed2.layout();
}

