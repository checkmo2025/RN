import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

export function source(path) {
  const text = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes = [];
  function visit(node) { nodes.push(node); ts.forEachChild(node, visit); }
  visit(ast);
  return { text, ast, nodes };
}

export function listAttribute(file, marker, name) {
  const list = file.nodes.find((node) =>
    (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
    node.tagName.getText(file.ast) === 'FlatList' && node.attributes.getText(file.ast).includes(marker));
  assert.ok(list, `Missing FlatList: ${marker}`);
  const attr = list.attributes.properties.find((node) => node.name?.getText(file.ast) === name);
  assert.ok(attr?.initializer && ts.isJsxExpression(attr.initializer), `Missing ${name}`);
  return attr.initializer.expression.getText(file.ast);
}

export function evaluate(expression, values = {}) {
  const scope = {
    ...Object.fromEntries(['View', 'Text', 'Image', 'Pressable', 'FlatList', 'RefreshControl',
      'DefaultProfileAvatar', 'FormTextInput', 'ImageGallery', 'ImageAttachmentButton',
      'ImageAttachmentPreviewList', 'SkeletonBox', 'MaterialIcons', 'BookStoryFeedCard']
      .map((name) => [name, name])),
    styles: new Proxy({}, { get: (_, key) => key }),
    colors: {}, spacing: { sm: 8, md: 16 },
    l: (text, values = {}) => text.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? key)),
    ...values,
  };
  const code = `export const value = ((${Object.keys(scope).join(',')}) => (${expression}));`;
  const { outputText } = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  new Function('require', 'exports', outputText)(createRequire(import.meta.url), exports);
  return exports.value(...Object.values(scope));
}

export function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  return node?.props ? [node, ...elements(node.props.children)] : [];
}
