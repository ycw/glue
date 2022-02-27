import fs from 'fs';
import { posix as path } from 'path';
import { EXCLUDED_DTS, ROUTE_TO_DOCS } from './config.js';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import dts_bundle from 'dts-bundle';


const DOCS_BASEPATH = 'datafile/three.js/docs/api/en';
const DTS_BASEPATH = 'datafile/three-ts-types/types/three/src/';
const TMP_DTS_BASEPATH = 'artifacts/tmp_dts/src/';
const PATH_TO_ARTIFACT_DTS = 'artifacts/three.d.ts';

const PROP_PRED = {
  en: (x) => x.includes('Properties')
};
const METHOD_PRED = {
  en: (x) => x.includes('Methods')
};
const FUNC_PRED = {
  en: (x) => x.includes('Functions')
};
const STATIC_PROP_PRED = {
  en: (x) => x.includes('Static Properties')
};
const STATIC_METHOD_PRED = {
  en: (x) => x.includes('Static Methods')
};



function has_static_mod(node) {
  return node.modifiers?.some(x => x.kind === ts.SyntaxKind.StaticKeyword);
}

function has_override_mod(node) {
  return node.modifiers?.some(x => x.kind === ts.SyntaxKind.OverrideKeyword);
}

function get_src_file(path_to_dts) {
  return ts.createSourceFile(
    `${get_canonical_name(path_to_dts)}.d.ts`,
    fs.readFileSync(path_to_dts, { encoding: 'utf-8' }),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
}

function get_canonical_name(path_to_dts_or_docs) {
  const is_dts = path_to_dts_or_docs.endsWith('.d.ts');
  const suffix = is_dts ? '.d.ts' : '.html';
  const basepath = is_dts ? DTS_BASEPATH : DOCS_BASEPATH;
  return path.relative(basepath, path_to_dts_or_docs).replace(suffix, '');
}

function get_canonical_item_name(node_path) {
  return node_path.join('::');
}

function get_tag_comment(tag) {
  if (tag.comment === undefined) return '';
  else if (typeof tag.comment === 'string') return tag.comment;
  else return tag.comment.map(x => x.text || x.name.escapedText).join('');
}



// ---
// dts item
// ---

function DtsItem({
  item_name, // ex 'audio/Audio::Audio::load'
  is_override = false,
  is_static = false,
  is_deprecated = false,
  deprecated_comment = '',
  has_default_tag = false,
  default_comment = ''
}) {
  return {
    item_name,
    is_override,
    is_static,
    is_deprecated,
    deprecated_comment,
    has_default_tag,
    default_comment
  };
}

function get_dts_items(path_to_dts) {
  const items = [];
  const src = get_src_file(path_to_dts);
  const walk = (node, node_path) => {

    if (ts.isSourceFile(node)) {
      ts.forEachChild(node, (child) => walk(child, [...node_path]));
      return;
    }

    if (
      !ts.isMethodDeclaration(node) &&
      !ts.isPropertyDeclaration(node) &&
      !ts.isClassDeclaration(node) &&
      !ts.isModuleDeclaration(node) &&
      !ts.isFunctionDeclaration(node)
    ) { return; }

    if (node.name) {
      const item_name = get_canonical_item_name([...node_path, node.name.escapedText]);
      const is_static = has_static_mod(node);
      const is_override = has_override_mod(node);
      const tag = ts.getJSDocDeprecatedTag(node);
      const is_deprecated = Boolean(tag);
      const deprecated_comment = is_deprecated ? get_tag_comment(tag) : '';

      const default_tag = ts.getAllJSDocTags(node, tag => tag.tagName.escapedText === 'default');
      const has_default_tag = default_tag.length > 0;
      const default_comment = has_default_tag ? get_tag_comment(default_tag[0]) : '';

      items.push(DtsItem({
        item_name,
        is_static,
        is_override,
        is_deprecated,
        deprecated_comment,
        has_default_tag,
        default_comment
      }));


      // next
      if (ts.isModuleDeclaration(node) && node.body) {
        ts.forEachChild(node.body, child => walk(child, [...node_path, node.name.escapedText]));
      } else {
        ts.forEachChild(node, child => walk(child, [...node_path, node.name.escapedText]));
      }
    }
  };
  walk(src, [get_canonical_name(path_to_dts)]);
  return items;
}

function walk_all_dts(path_to_dir, cb) {
  for (const entry of fs.readdirSync(path_to_dir)) {
    const p = path.resolve(path_to_dir, entry);
    const relpath = path.relative(DTS_BASEPATH, p);

    if (~EXCLUDED_DTS.indexOf(relpath)) {
      continue;
    }

    if (fs.statSync(p).isDirectory()) {
      walk_all_dts(p, cb);
    } else {
      cb?.(p);
    }
  }
}

function walk_dts_items(node, node_path, cb) {
  if (ts.isSourceFile(node)) {
    ts.forEachChild(node, (child) => walk_dts_items(child, [...node_path], cb));
    return;
  }
  if (
    !ts.isMethodDeclaration(node) &&
    !ts.isPropertyDeclaration(node) &&
    !ts.isClassDeclaration(node) &&
    !ts.isModuleDeclaration(node) &&
    !ts.isFunctionDeclaration(node)
  ) { return; }
  if (node.name) {
    const item_name = get_canonical_item_name([...node_path, node.name.escapedText]);
    cb?.({ item_name, node });
  }
  // next
  if (ts.isModuleDeclaration(node) && node.body) {
    ts.forEachChild(node.body, child =>
      walk_dts_items(child, [...node_path, node.name.escapedText], cb)
    );
  } else {
    ts.forEachChild(node, child =>
      walk_dts_items(child, [...node_path, node.name.escapedText], cb)
    );
  }
}



// ---
// docs item
// ---

function DocsItem({
  item_name,
  is_static,
}) {
  return { item_name, is_static };
}

function walk_all_docs(path_to_dir, cb) {
  for (const entry of fs.readdirSync(path_to_dir)) {
    const p = path.resolve(path_to_dir, entry);
    const relpath = path.relative(path_to_dir, p);

    if (fs.statSync(p).isDirectory()) {
      walk_all_docs(p, cb);
    } else {
      cb?.(p);
    }
  }
}

function get_docs_items(path_to_dir) {
  const docs_items = [];
  walk_all_docs(path_to_dir, (path_to_docs) => {
    const canonical_name = get_canonical_name(path_to_docs);
    const class_name = path.basename(canonical_name);
    docs_items.push({
      item_name: get_canonical_item_name([canonical_name, class_name]),
      is_static: false
    });

    const html_file = fs.readFileSync(path_to_docs, { encoding: 'utf-8' });
    const document = new JSDOM(html_file).window.document;

    const all_h2_elems = [...document.querySelectorAll('h2')];

    const el_prop = all_h2_elems.find(x => PROP_PRED['en'](x.textContent));
    if (el_prop) {
      docs_items.push(...get_docs_items_of({
        section: el_prop,
        class_name,
        canonical_name,
        is_static: false
      }));
    }

    const el_method = all_h2_elems.find(x => METHOD_PRED['en'](x.textContent));
    if (el_method) {
      docs_items.push(...get_docs_items_of({
        section: el_method,
        class_name,
        canonical_name,
        is_static: false
      }));
    }

    const el_static_prop = all_h2_elems.find(x => STATIC_PROP_PRED['en'](x.textContent));
    if (el_static_prop) {
      docs_items.push(...get_docs_items_of({
        section: el_static_prop,
        class_name,
        canonical_name,
        is_static: true
      }));
    }

    const el_static_method = all_h2_elems.find(x => STATIC_METHOD_PRED['en'](x.textContent));
    if (el_static_method) {
      docs_items.push(...get_docs_items_of({
        section: el_static_method,
        class_name,
        canonical_name,
        is_static: true
      }));
    }

    const el_func = all_h2_elems.find(x => FUNC_PRED['en'](x.textContent));
    if (el_func) {
      docs_items.push(...get_docs_items_of({
        section: el_func,
        class_name,
        canonical_name,
        is_static: false
      }));
    }

  });
  return docs_items;
}

function get_docs_items_of({
  section,
  class_name,
  canonical_name,
  is_static
}) {
  const siblings = [];
  let el_next = section.nextElementSibling;
  while (el_next) {
    if (el_next.nodeName === 'H2') break; // end-of-sec
    siblings.push(el_next);
    el_next = el_next.nextElementSibling;
  }
  const docs_items = [];
  let docs_item = null;
  for (const sibling of siblings) {
    if (sibling.nodeName === 'H3') {
      const re = /^\[\S+\s+(\S+)\s*?\]/;
      const n = sibling.textContent.match(re);

      if (!n) { // patch
        continue; // renderers/WebGL3DRenderTarget wrongly used <h3> for supporting paragraph
      };

      if (class_name === 'MathUtils') { // patch
        docs_item = DocsItem({
          item_name: [canonical_name, n[1]].join('::'),
          is_static
        });
        docs_items.push(docs_item);
        continue;
      }
      docs_item = DocsItem({
        item_name: [canonical_name, class_name, n[1]].join('::'),
        is_static
      });
      docs_items.push(docs_item);
    }
  }
  return docs_items;
}



// ---
// nodejs utils 
// ---

function clear_tmp_dts_dir() {
  fs.rmSync(TMP_DTS_BASEPATH, { recursive: true, force: true });
}

function write_to_tmp_dts(the_path, content) {
  const dirname = path.dirname(the_path);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
  fs.writeFileSync(the_path, content, { flag: 'w' });
}

function copy_dts(from_path, to_path) {
  const to_path_dirname = path.dirname(to_path);
  if (!fs.existsSync(to_path_dirname)) {
    fs.mkdirSync(to_path_dirname, { recursive: true });
  }
  fs.copyFileSync(from_path, to_path);
}

function copy_required_dts() {
  for (const relpath_to_dts of EXCLUDED_DTS) {
    copy_dts(
      path.resolve(DTS_BASEPATH, relpath_to_dts),
      path.resolve(TMP_DTS_BASEPATH, relpath_to_dts)
    );
  }

  // index
  copy_dts(
    path.resolve(DTS_BASEPATH, '../index.d.ts'),
    path.resolve(TMP_DTS_BASEPATH, '../index.d.ts')
  );
}



// ---
// main
// ---

const dir_to_docs = path.resolve(DOCS_BASEPATH, ``);
const docs_items = get_docs_items(dir_to_docs);
const dir_to_dts = path.resolve(DTS_BASEPATH, ``);

clear_tmp_dts_dir();
copy_required_dts();
walk_all_dts(dir_to_dts, (path_to_dts) => {

  const dts_items = get_dts_items(path_to_dts); // hold info of org dts 
  const org_src_file = get_src_file(path_to_dts);

  const printer = ts.createPrinter({ removeComments: true });
  const canonical_name = get_canonical_name(path_to_dts);
  const src_file = ts.createSourceFile(
    `${canonical_name}.d.ts`,
    printer.printFile(org_src_file),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  walk_dts_items(src_file, [canonical_name], ({ item_name, node }) => {
    let docs_comments = [];

    const dts_item = dts_items.find(x => x.item_name === item_name);
    if (dts_item.has_default_tag) {
      docs_comments.push(`@default ${dts_item.default_comment}`);
    }

    if (dts_item.is_deprecated) {
      docs_comments.push(`@deprecated ${dts_item.deprecated_comment}`);
    } else {
      if (!dts_item.is_override) { // non-override item
        const docs_item = docs_items.find(x => x.item_name === item_name);
        if (!docs_item) { // non-override item and undocumented
          docs_comments.push(`@internal`);
        }
      }
    }

    if (docs_comments.length) {
      const text = [
        '*',
        docs_comments.map(x => ` * ${x}`).join('\n'),
        ' '
      ].join('\n');
      const comments = [{
        text,
        kind: ts.SyntaxKind.MultiLineCommentTrivia,
        hasTrailingNewLine: true
      }];
      ts.setSyntheticLeadingComments(node, comments);
    }

  });

  const src = ts.createPrinter().printFile(src_file);
  const p = path.resolve(TMP_DTS_BASEPATH, `${canonical_name}.d.ts`);
  write_to_tmp_dts(p, src);
});


// ---
// rollup dts
// ---

dts_bundle.bundle({
  name: 'three',
  main: path.resolve(TMP_DTS_BASEPATH + '../index.d.ts'),
  out: path.resolve(PATH_TO_ARTIFACT_DTS)
});