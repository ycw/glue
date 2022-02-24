import fs from 'fs';
import { JSDOM } from 'jsdom';
import { posix } from 'path';

const path = posix;

const DOCS_BASEPATH = 'origins/three.js/docs/api/';
const DOCS_LANGS = ['en', 'ar', 'ko', 'zh'];
const PROP_PRED = { // yet translated, and translated
  en: (x) => x.includes('Properties'),
  ar: (x) => x.includes('Properties') || x.includes('الخصائص'),
  ko: (x) => x.includes('Properties') || x.includes('프로퍼티'),
  zh: (x) => x.includes('Properties') || x.includes('属性')
};
const METHOD_PRED = { // yet translated, and translated
  en: (x) => x.includes('Methods'),
  ar: (x) => x.includes('Methods') || x.includes('الوظائف'),
  ko: (x) => x.includes('Methods') || x.includes('메서드'),
  zh: (x) => x.includes('Methods') || x.includes('方法')
};



function InsertInfoPrev(el_outerHTML) {
  return { is_insert_before: true, el_outerHTML };
}

function InsertInfoReplace(el_outerHTML) {
  return { is_replace: true, el_outerHTML };
}



function get_next_elem_siblings(el) {
  const result = [];
  let el_next = el.nextElementSibling;
  while (el_next) {
    if (el_next.nodeName === 'H2') break; // end-of-sec
    result.push(el_next);
    el_next = el_next.nextElementSibling;
  }
  return result;
}


export function get_insert_info_prop({
  lang,
  html_file,
  new_prop_name,
}) {
  const jsdom = new JSDOM(html_file);
  const { document } = jsdom.window;

  // search for <h2>Properties</h2>
  const el_prop = Array.from(document.querySelectorAll('h2'))
    .find(x => PROP_PRED[lang](x.textContent));

  if (!el_prop) {
    console.log('missing <h2> for properties');
    return null;
  }

  // search for property items
  const siblings = get_next_elem_siblings(el_prop);

  // no property items at all -> insert prev to <h2>Methods</h2>
  if (!siblings.length) {
    // search for <h2>Mehtods</h2>
    const el_method = Array.from(document.querySelectorAll('h2'))
      .find(x => METHOD_PRED[lang](x.textContent));

    if (!el_method) {
      console.log('<h2>Methods</h2> doesnt exist');
    }

    return InsertInfoPrev(el_method.outerHTML);
  }

  // find <h3> having the new prop name -> replace 
  const el_prop_item = siblings.find(x => {
    if (x.nodeName !== 'H3') return false;
    const m = x.textContent.match(/\[property:\S+\s+(\S+)\]/);
    return m && m[1] === new_prop_name;
  });

  if (el_prop_item) {
    return InsertInfoReplace(el_prop_item.outerHTML);
  }

  // find <h3> the next item wrt prop name in alphabetical order
  const the_sibling = siblings.find(x => {
    if (x.nodeName !== 'H3') return false;
    const m = x.textContent.match(/\[property:\S+\s+(\S+)\]/);
    return m && m[1] > new_prop_name;
  });

  // tail -> insert prev to next section (<h2>Methods</h2>) 
  if (!the_sibling) {
    // search for <h2>Mehtods</h2>
    const el_method = Array.from(document.querySelectorAll('h2'))
      .find(x => METHOD_PRED[lang](x.textContent));

    if (!el_method) {
      console.log('<h2>Methods</h2> doesnt exist');
    }

    return InsertInfoPrev(el_method.outerHTML);
  }

  // prev to
  return InsertInfoPrev(the_sibling.outerHTML);
}



// keeps stepback until it finds a non-wsp char, then returns the idx. 
// i.e. `str[idx]` === the non-wsp char terminating the loop.
// returns -1 when str[0..=at-1] are all wsp chars
function stepback_wsp(str, at) {
  let i = at - 1;
  while (i >= 0) {
    if (/\s/.test(str[i])) {
      --i;
    } else {
      break;
    }
  }
  return i;
}



export function insert_new_prop({
  docs_list = [],
  new_prop_name_fn,
  new_full_text_fn,
  is_replace = false // true -> will overwrite all translated text in non en docs
}) {
  for (const relpath_to_docs of docs_list) {
    console.group(relpath_to_docs)
    for (const lang of DOCS_LANGS) {
      console.group(lang);

      const path_to_docs = path.resolve(DOCS_BASEPATH, lang, relpath_to_docs);

      if (!fs.existsSync(path_to_docs)) {
        console.log('missing html');
        console.groupEnd();
        continue;
      }

      const html_file = fs.readFileSync(path_to_docs, { encoding: 'utf-8' });
      const new_prop_name = new_prop_name_fn({ relpath_to_docs });
      const full_text = new_full_text_fn({ new_prop_name });

      // (!) jsdom .serialize will alter unrelated chg, use str maniplutaion instead. 
      const insert_info = get_insert_info_prop({ lang, html_file, new_prop_name });
      const idx = html_file.indexOf(insert_info.el_outerHTML);

      if (idx === -1) {
        console.log('irreversible');
        console.groupEnd();
        continue;
      }

      let nu_html_file = '';

      if (insert_info.is_replace) {
        if (is_replace) {
          const re = /<h[23]/ig; // <h2 or <h3 
          re.lastIndex = idx + insert_info.el_outerHTML.length; // skip self
          const exec = re.exec(html_file);
          const start_idx = stepback_wsp(html_file, idx) + 1; // includes leading wsp
          const end_idx = stepback_wsp(
            html_file,
            re.lastIndex - (exec ? exec[0].length : 0)
          ) + 1; // excludes trailing wsp

          nu_html_file = [
            html_file.substring(0, start_idx),
            full_text,
            html_file.substring(end_idx)
          ].join('');
        } else {
          console.log('skipped'); // =prop exists and disallow replace
          nu_html_file = html_file;
        }
      }

      if (insert_info.is_insert_before) {
        const i = stepback_wsp(html_file, idx);
        nu_html_file = [
          html_file.substring(0, i),
          full_text,
          html_file.substring(i)
        ].join('');
      }

      fs.writeFileSync(path_to_docs, nu_html_file);
      console.log('done');
      console.groupEnd();
    }
    console.groupEnd();
  }
}