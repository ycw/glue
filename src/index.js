import fs from 'fs';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import { posix } from 'path';
import { gitToJs } from 'git-parse';

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
    'DataTexture2DArray.d.ts'
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

function Item(name, is_static) {
  return { name, is_static };
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


/**
 * 
 * @param {ts.Node} node 
 */
function has_static_mod(node) {
  return node.modifiers?.some(x => x.kind === ts.SyntaxKind.StaticKeyword);
}



function get_dts_item(path_to_dts) {
  const prog = ts.createProgram([path_to_dts], {});
  const src = prog.getSourceFile(path_to_dts);
  const name = get_canonical_name(path_to_dts);
  const item = DtsItem(name);
  const deprecated_items = [];
  const push_deprecated_item = (node) => {
    if (node.name) {
      const name = node.name.escapedText;
      const is_static = has_static_mod(node);
      deprecated_items.push(Item(name, is_static));
    }
  };
  const push_item = (node) => {
    if (node.name) {
      const name = node.name.escapedText;
      const is_static = has_static_mod(node);
      item.items.push(Item(name, is_static));
    }
  };
  const basename = path.basename(name);

  ts.forEachChild(src, node => {

    if (has_deprecated_tag(src, node)) {
      push_deprecated_item(node);
      return;
    }

    if (ts.isModuleDeclaration(node)) { // namespace
      if (node.name && basename !== node.name.escapedText) {
        return;
      }
      console.log(name);
      ts.forEachChild(node, (n) => {
        n.statements?.forEach(m => {
          if (has_deprecated_tag(src, m)) {
            push_deprecated_item(m);
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
      if (node.name && basename !== node.name.escapedText) {
        return;
      }
      console.log(name);
      ts.forEachChild(node, n => {
        if (has_deprecated_tag(src, n)) {
          push_deprecated_item(n);
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

  // rm @deprecated overloading fns manually. 
  // (!) leading comments belong to the 1st fn decl only
  // (!) must distinguish static from instance (math/Quaternion .slerp) 
  item.items = item.items.filter(x =>
    !deprecated_items.some(y =>
      y.name === x.name && y.is_static === x.is_static 
    )
  );
  return item;
}



function get_docs_item(path_to_docs) {
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
  const docs_item = get_docs_item(path_to_docs);

  const undoc_items = dts_item.items.filter(x =>
    !docs_item.items.some(y => y.name === x.name)
  ).map(({ name }) => name);

  const unty_items = docs_item.items.filter(x =>
    !dts_item.items.some(y => y.name === x.name)
  ).map(({ name }) => name);

  return { undoc_items, unty_items };
}



function WalkMissingDocsErr({
  name,
  path_to_dts,
  path_to_docs,
}) {
  return {
    err: 'missing_docs',
    name,
    path_to_dts,
    path_to_docs
  };
}

function WalkOk({
  name,
  diff,
  path_to_dts,
  path_to_docs
}) {
  return {
    name,
    undoc_items: diff.undoc_items,
    unty_items: diff.unty_items,
    path_to_dts,
    path_to_docs
  };
}



function walk(dts_basepath, docs_basepath, result = []) {
  const dir = fs.readdirSync(dts_basepath);
  for (const entry of dir) {
    const path_to_dts = path.resolve(dts_basepath, entry);
    const path_to_docs = get_path_to_docs(path_to_dts);
    if (fs.statSync(path_to_dts).isDirectory()) {
      walk(path_to_dts, path_to_docs, result);
    } else {
      if (is_dts_excluded(path_to_dts)) {
        continue;
      } else {
        const name = get_canonical_name(path_to_dts);
        const relpath_to_dts = path.relative('.', path_to_dts);
        const relpath_to_docs = path.relative('.', path_to_docs);

        if (!fs.existsSync(path_to_docs)) {
          result.push(WalkMissingDocsErr({
            name,
            path_to_dts: relpath_to_dts,
            path_to_docs: relpath_to_docs
          }));
          continue;
        }

        result.push(WalkOk({
          name,
          path_to_dts: relpath_to_dts,
          path_to_docs: relpath_to_docs,
          diff: get_diff(path_to_dts, path_to_docs)
        }));
      }
    }
  }
  return result;
}



async function get_json_report(walk_result) {
  const result = walk_result.filter(x => {
    if (x.err) return true;
    if (x.undoc_items.length || x.unty_items.length) return true;
  });

  const missing_docs = result
    .filter(x => x.err === 'missing_docs')
    .map(({ name, path_to_dts }) => ({ name, path_to_dts }));

  const records = result.filter(x => !x.err);
  const n_undoc = records.reduce((o, x) => o + x.undoc_items.length, 0);
  const n_unty = records.reduce((o, x) => o + x.unty_items.length, 0);

  const threejs_ver = JSON.parse(
    fs.readFileSync('datafile/three.js/package.json')
  ).version;

  const [threejs_head] = await gitToJs('datafile/three.js');
  const [threetstypes_head] = await gitToJs('datafile/three-ts-types');

  return {
    threejs_ver,
    threejs_hash: threejs_head.hash,
    threetstypes_hash: threetstypes_head.hash,
    missing_docs, // no .html for .d.ts
    records, // undocumented and/or untyped
    n_undoc, // count
    n_unty // count
  };
}



const dts_basepath = path.resolve(DTS_BASEPATH, `math`);
const docs_basepath = get_path_to_docs(dts_basepath);
const walk_result = walk(dts_basepath, docs_basepath);
const report = await get_json_report(walk_result);
fs.writeFileSync('www/a.json', JSON.stringify(report));