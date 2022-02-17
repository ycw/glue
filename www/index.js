const result = await fetch('./a.json').then(r => r.json());


const render_missing_doc_item = ({
  name,
  path_to_dts
}) => {
  return `
<tr>
  <td>
    ${name}<br>
    <a href='../${path_to_dts}' data-open='${name}'>dts</a>
    <a>docs(missing)</a>
  </td>
  <td>(all)</td>
  <td></td>
</tr>
`;
}

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
  <td>  
    <ul>
      ${undoc_items.map(x => `<li>${x}</li>`).join('')}
    </ul>
  </td>
  <td>
    <ul>
      ${unty_items.map(x => `<li>${x}</li>`).join('')}
    </ul>
  </td>
</tr>`;
};



const render = (result) => {
  const el_threejs_ver = document.querySelector('#threejs_ver');
  el_threejs_ver.textContent = result.threejs_ver;

  const el_threejs_hash = document.querySelector('#threejs_hash');
  el_threejs_hash.textContent = result.threejs_hash;

  const el_threetstypes_hash = document.querySelector('#threetstypes_hash');
  el_threetstypes_hash.textContent = result.threetstypes_hash;

  document.querySelector('#n_missing_docs').textContent = result.missing_docs.length;
  document.querySelector('#n_dts').textContent = result.records.length;
  document.querySelector('#n_undoc').textContent = result.n_undoc;
  document.querySelector('#n_unty').textContent = result.n_unty;

  const el_body = document.querySelector('tbody');
  el_body.innerHTML = [
    result.records.map(render_item).join(''),
    result.missing_docs.map(render_missing_doc_item).join('')
  ].join('');

  el_body.addEventListener('click', async ev => {
    if ('open' in ev.target.dataset) {
      ev.preventDefault();
      const t = await fetch(ev.target.href).then(r => r.text());
      const w = window.open('');
      w.document.body.innerHTML = `<pre><code>${t}</pre><code>`;
      w.document.title = ev.target.dataset.open;
    }
  });

  document.title = `Report ${result.threejs_ver}`;
};



render(result);