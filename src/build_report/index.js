import fs from 'fs';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import { posix } from 'path';
import { gitToJs } from 'git-parse';

import { EXCLUDED_DTS, ROUTE_TO_DOCS } from './report_config.js';

const path = posix;



const DTS_BASEPATH = 'datafile/three-ts-types/types/three/src/';
const DOCS_BASEPATH = 'datafile/three.js/docs/api/en/';



function is_dts_excluded(path_to_dts) {
  return ~EXCLUDED_DTS.indexOf(path.relative(DTS_BASEPATH, path_to_dts));
}



function get_path_to_docs(path_to_dts) {
  const p = path.relative(DTS_BASEPATH, path_to_dts);
  return path.resolve(DOCS_BASEPATH,
    ROUTE_TO_DOCS[p] || p).replace('.d.ts', '.html');
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
 * @param {ts.Node} node 
 */
function has_static_mod(node) {
  return node.modifiers?.some(x => x.kind === ts.SyntaxKind.StaticKeyword);
}



function get_dts_item(path_to_dts) {
  const name = get_canonical_name(path_to_dts);
  const src = ts.createSourceFile(
    `${name}.d.ts`,
    fs.readFileSync(path_to_dts, { encoding: 'utf-8' }),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
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
    if (ts.getJSDocDeprecatedTag(node)) {
      push_deprecated_item(node);
      return;
    }

    if (ts.isModuleDeclaration(node)) { // namespace
      if (node.name && basename !== node.name.escapedText) {
        return;
      }
      console.log(name);
      ts.forEachChild(node, (n) => {
        n.statements?.forEach(stmt => {
          if (stmt.kind === ts.SyntaxKind.ExportDeclaration) { // export
            stmt.exportClause.elements.forEach(exp_spec => {
              const old = exp_spec.propertyName.escapedText;
              const nu = exp_spec.name.escapedText;
              const the_item = item.items.find(x => x.name === old);
              if (the_item) {
                the_item.name = nu;
              } else {
                push_item(Item(nu));
              }
            });
            return;
          }
          if (ts.getJSDocDeprecatedTag(stmt)) {
            push_deprecated_item(stmt);
            return;
          }
          push_item(stmt);
        });
      });
      return;
    }

    if (ts.isFunctionDeclaration(node)) {
      if (ts.getJSDocDeprecatedTag(node)) {
        push_deprecated_item(node);
        return;
      }
      push_item(node);
      return;
    }

    if (
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node)
    ) {
      if (node.name && basename !== node.name.escapedText) {
        return;
      }
      console.log(name);
      ts.forEachChild(node, n => {
        if (ts.getJSDocDeprecatedTag(n)) {
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
    is_missing_docs: true,
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
    is_ok: true,
    name,
    undoc_items: diff.undoc_items,
    unty_items: diff.unty_items,
    path_to_dts,
    path_to_docs
  };
}

function WalkExcludedDts({
  name,
  path_to_dts,
  path_to_docs
}) {
  return {
    is_excluded_dts: true,
    name,
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
      continue;
    }

    const o = {
      name: get_canonical_name(path_to_dts),
      path_to_dts: path.relative('.', path_to_dts),
      path_to_docs: path.relative('.', path_to_docs)
    };

    if (is_dts_excluded(path_to_dts)) {
      result.push(WalkExcludedDts(o));
    } else if (!fs.existsSync(path_to_docs)) {
      result.push(WalkMissingDocsErr(o));
    } else {
      result.push(WalkOk({
        ...o,
        diff: get_diff(path_to_dts, path_to_docs)
      }));
    }
  }
  return result;
}



async function get_json_report(walk_result) {
  const result = walk_result.filter(x => {
    if (x.is_missing_docs) return true;
    if (x.is_excluded_dts) return true;
    if (x.is_ok && (x.undoc_items.length || x.unty_items.length)) return true;
  });

  const missing_docs = result
    .filter(x => x.is_missing_docs)
    .map(({ name, path_to_dts }) => ({ name, path_to_dts }));

  const excluded_dts = result
    .filter(x => x.is_excluded_dts)
    .map(({ name, path_to_dts }) => ({ name, path_to_dts }));

  const records = result.filter(x => x.is_ok);
  const n_undoc = records.reduce((o, x) => o + x.undoc_items.length, 0);
  const n_unty = records.reduce((o, x) => o + x.unty_items.length, 0);

  const [threejs_head] = await gitToJs('datafile/three.js');
  const [threetstypes_head] = await gitToJs('datafile/three-ts-types');

  return {
    threejs_hash: threejs_head.hash,
    threetstypes_hash: threetstypes_head.hash,
    missing_docs,
    excluded_dts,
    records, 
    n_undoc,
    n_unty
  };
}



const dts_basepath = path.resolve(DTS_BASEPATH, ``);
const docs_basepath = get_path_to_docs(dts_basepath);
const walk_result = walk(dts_basepath, docs_basepath);
const report = await get_json_report(walk_result);
fs.writeFileSync('www/a.json', JSON.stringify(report));