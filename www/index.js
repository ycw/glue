const result = await fetch('./a.json').then(r => r.json());

const render_item = ({
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
  const el_body = document.querySelector('tbody');
  el_body.innerHTML = result.report.map(render_item).join('');

  const el = document.querySelector('thead tr');
  el.children[0].textContent += ` (${result.n_dts}) `;
  el.children[1].textContent += ` (${result.n_undoc}) `;
  el.children[2].textContent += ` (${result.n_unty}) `;

  el_body.addEventListener('click', async ev => {
    if ('open' in ev.target.dataset) {
      ev.preventDefault();
      const t = await fetch(ev.target.href).then(r => r.text());
      const w = window.open('');
      w.document.body.innerHTML = `<pre><code>${t}</pre><code>`;
      w.document.title = ev.target.dataset.open;
    }
  });

  document.title = `Report ${result.threejs_rev}`;
};



render(result);