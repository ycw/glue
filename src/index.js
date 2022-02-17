import fs from 'fs';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import { posix } from 'path';

const path = posix;



const DTS_BASEPATH = 'datafile/three-ts-types/types/three/src/';
const DOCS_BASEPATH = 'datafile/three.js/docs/api/en/';



function is_dts_excluded(path_to_dts) {
  const basename = path.basename(path_to_dts);

  if (~[
    'constants.d.ts',
    'Three.d.ts',
    'Three.Legacy.d.ts',
    'utils.d.ts',
    'Curves.d.ts', // catalog; full coveraged by other .d.ts
    'Geometries.d.ts', // ditto
    'Materials.d.ts', // ditto
  ].indexOf(basename))
    return true;

  if (basename == 'WebGLProgram.d.ts')
    return false;

  if (new RegExp(`renderers${path.sep}webgl`).test(path_to_dts))
    return true;
}



function is_dts_missing_docs(path_to_dts) {
  if (~[
    'WebGLMultisampleRenderTarget.d.ts',
    'WebXR.d.ts',
    'WebXRController.d.ts',
    'ShaderChunk.d.ts', // has placeholder .html thu
  ].indexOf(path.basename(path_to_dts)))
    return true;
}



function get_path_to_docs(path_to_dts) {
  const map = {
    'DirectionalLightShadow.d.ts': 'shadows/DirectionalLightShadow.html',
    'LightShadow.d.ts': 'shadows/LightShadow.html',
    'PointLightShadow.d.ts': 'shadows/PointLightShadow.html',
    'SpotLightShadow.d.ts': 'shadows/SpotLightShadow.html',
    'LoadingManager.d.ts': 'managers/LoadingManager.html',
    'DefaultLoadingManager.d.ts': 'managers/DefaultLoadingManager.html',
  };

  const k = path.basename(path_to_dts);               // LightShadow.d.ts
  const p = path.relative(DTS_BASEPATH, path_to_dts); // lights/LightShadow.d.ts
  const q = p.replace(k, map[k] || k);                // lights/shadows/LightShadow.d.ts 
  return path.resolve(DOCS_BASEPATH, q).replace('.d.ts', '.html');
}



function get_canonical_name(path_to_dts_or_docs) {
  const is_dts = path_to_dts_or_docs.endsWith('.d.ts');
  const suffix = is_dts ? '.d.ts' : '.html';
  const basepath = is_dts ? DTS_BASEPATH : DOCS_BASEPATH;
  return path.relative(basepath, path_to_dts_or_docs).replace(suffix, '');
}



function DtsItem(name, items = []) {
  return { type: 'dts', name, items };
}

function DocsItem(name, items = []) {
  return { type: 'docs', name, items };
}

function Item(name) {
  return name;
}



/**
 * 
 * @param {ts.SourceFile} src 
 * @param {ts.Node} node 
 */
function has_deprecated_tag(src, node) {
  const t = src.text;
  const rs = ts.getLeadingCommentRanges(t, node.getFullStart());
  return rs?.some(r => {
    if (r.kind === ts.SyntaxKind.MultiLineCommentTrivia) {
      return /@deprecated/m.test(t.substring(r.pos, r.end));
    }
  });
}



function get_dts_item(path_to_dts) {
  const prog = ts.createProgram([path_to_dts], {});
  const src = prog.getSourceFile(path_to_dts);
  const name = get_canonical_name(path_to_dts);
  const item = DtsItem(name);
  const deprecated_items = new Set();
  const add_deprecated_item = (node) => node.name && deprecated_items.add(node.name.escapedText);
  const push_item = (node) => node.name && item.items.push(Item(node.name.escapedText));

  ts.forEachChild(src, node => {

    if (node.name) console.log(name, node.name.escapedText);

    if (has_deprecated_tag(src, node)) {
      add_deprecated_item(node);
      return;
    }

    if (ts.isModuleDeclaration(node)) { // namespace
      ts.forEachChild(node, (n) => {
        n.statements?.forEach(m => {
          if (has_deprecated_tag(src, m)) {
            add_deprecated_item(m);
            return;
          }
          push_item(m);
        });
      });
      return;
    }

    if (ts.isFunctionDeclaration(node)) {
      push_item(node);
      return;
    }

    if (
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) // LoaderUtils
    ) {
      ts.forEachChild(node, n => {
        if (has_deprecated_tag(src, n)) {
          add_deprecated_item(n);
          return;
        }
        if (
          ts.isMethodDeclaration(n) ||
          ts.isPropertyDeclaration(n) ||
          ts.isFunctionDeclaration(n) || 
          ts.isMethodSignature(n) // interface -> fn
        ) {
          push_item(n);
        }
      });
      return;
    }
  });
  item.items = item.items.filter(x => !deprecated_items.has(x));
  return item;
}



function get_doc_item(path_to_docs) {
  const html = fs.readFileSync(path_to_docs, { encoding: 'utf-8' });
  const doc = new JSDOM(html).window.document;
  const name = get_canonical_name(path_to_docs);
  const item = DocsItem(name);
  doc.querySelectorAll('h3').forEach(el => {
    const i0 = el.textContent.indexOf('[');
    const i1 = el.textContent.indexOf(']');
    if (~i0 && ~i1) {
      const substr = el.textContent.substring(i0, i1);
      const name = substr.match(/\s+\.?([\s\S]{1,})/); // DepthTexture `.flipY` 
      if (name) {
        item.items.push(Item(name[1].trim()));
      }
    }
  });
  return item;
}



function get_diff(path_to_dts, path_to_docs) {
  const dts_item = get_dts_item(path_to_dts);
  const docs_item = get_doc_item(path_to_docs);
  const undoc_items = dts_item.items.filter(x => docs_item.items.indexOf(x) === -1);
  const unty_items = docs_item.items.filter(x => dts_item.items.indexOf(x) === -1);
  return { undoc_items, unty_items };
}



function walk(dts_basepath, docs_basepath, result = []) {
  const dir = fs.readdirSync(dts_basepath);
  for (const entry of dir) {
    const path_to_dts = path.resolve(dts_basepath, entry);
    const path_to_docs = get_path_to_docs(path_to_dts);
    if (fs.statSync(path_to_dts).isDirectory()) {
      walk(path_to_dts, path_to_docs, result);
    } else {
      if (is_dts_excluded(path_to_dts)) continue;
      if (is_dts_missing_docs(path_to_dts)) continue;
      const { unty_items, undoc_items } = get_diff(path_to_dts, path_to_docs);
      result.push({
        name: get_canonical_name(path_to_dts),
        undoc_items,
        unty_items,
        path_to_dts: path.relative('.', path_to_dts),
        path_to_docs: path.relative('.', path_to_docs),
      });
    }
  }
  return result;
}



function get_json_report(walk_result) {
  return walk_result.filter(x => x.undoc_items.length || x.unty_items.length);
}



const dts_basepath = path.resolve(DTS_BASEPATH, ``);
const docs_basepath = get_path_to_docs(dts_basepath);
const walk_result = walk(dts_basepath, docs_basepath);
const report = get_json_report(walk_result);
const threejs_rev = JSON.parse(fs.readFileSync('datafile/three.js/package.json')).version;
const n_dts = report.length;
const n_undoc = report.reduce((o, r) => o + r.undoc_items.length, 0);
const n_unty = report.reduce((o, r) => o + r.unty_items.length, 0);
const result = {
  threejs_rev,
  n_dts,
  n_undoc,
  n_unty,
  report
};
fs.writeFileSync('www/a.json', JSON.stringify(result));

