const result = await fetch('../a.json').then(r => r.json());



const render_item = ({
  err,
  name,
  undoc_items,
  unty_items,
  path_to_docs,
  path_to_dts
}) => {
  return `
<tr>
  <td>
    ${name}<br>
    <a href='../${path_to_dts}' data-open='${name}'>dts</a>
    <a href='../${path_to_docs}'>docs</a>
  </td>
  <td>${undoc_items.join('\n')}</td>
  <td>${unty_items.join('\n')}</td>
</tr>`;
};



const render = (result) => {
  document.querySelector('#threejs_hash a').textContent = result.threejs_hash;
  document.querySelector('#threejs_hash a').href = `https://github.com/mrdoob/three.js/commits/${result.threejs_hash}`;
  document.querySelector('#threetstypes_hash a').textContent = result.threetstypes_hash;
  document.querySelector('#threetstypes_hash a').href = `https://github.com/three-types/three-ts-types/commits/${result.threetstypes_hash}`;

  document.querySelector('#n_dts').textContent = result.records.length;
  document.querySelector('#n_undoc').textContent = result.n_undoc;
  document.querySelector('#n_unty').textContent = result.n_unty;

  document.querySelector('#n_missing_docs').textContent = result.missing_docs.length;
  document.querySelector('#missing_docs').textContent = result.missing_docs.map(x => x.name).join('\n');
  document.querySelector('#n_excluded_dts').textContent = result.excluded_dts.length;
  document.querySelector('#excluded_dts').textContent = result.excluded_dts.map(x => x.name).join('\n');
  
  const el_tbody = document.querySelector('tbody');
  el_tbody.innerHTML = result.records.map(render_item).join('');
  el_tbody.addEventListener('click', async ev => {
    if ('open' in ev.target.dataset) {
      ev.preventDefault();
      const t = await fetch(ev.target.href).then(r => r.text());
      const w = window.open('');
      w.document.body.innerHTML = `<pre><code>${t}</pre><code>`;
      w.document.title = ev.target.dataset.open;
    }
  });
};



render(result);