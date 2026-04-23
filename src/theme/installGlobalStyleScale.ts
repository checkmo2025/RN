import { StyleSheet } from 'react-native';

import { scaleFont, scaleSize } from './responsive';

const LAYOUT_PROPS = new Set([
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'top',
  'right',
  'bottom',
  'left',
  'start',
  'end',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'marginHorizontal',
  'marginVertical',
  'marginStart',
  'marginEnd',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'paddingHorizontal',
  'paddingVertical',
  'paddingStart',
  'paddingEnd',
  'gap',
  'rowGap',
  'columnGap',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderTopStartRadius',
  'borderTopEndRadius',
  'borderBottomStartRadius',
  'borderBottomEndRadius',
  'borderWidth',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStartWidth',
  'borderEndWidth',
  'shadowRadius',
  'textShadowRadius',
  'flexBasis',
]);

const FONT_PROPS = new Set(['fontSize', 'lineHeight', 'letterSpacing']);

function scaleStyleValue(prop: string, value: unknown): unknown {
  if (typeof value !== 'number') return value;
  if (FONT_PROPS.has(prop)) return scaleFont(value);
  if (LAYOUT_PROPS.has(prop)) return scaleSize(value);
  return value;
}

function scaleOffset(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  return {
    ...record,
    width: typeof record.width === 'number' ? scaleSize(record.width) : record.width,
    height: typeof record.height === 'number' ? scaleSize(record.height) : record.height,
  };
}

function scaleTransform(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    const record = item as Record<string, unknown>;
    const key = Object.keys(record)[0];
    if (!key) return item;
    const raw = record[key];
    if ((key === 'translateX' || key === 'translateY') && typeof raw === 'number') {
      return { [key]: scaleSize(raw) };
    }
    return item;
  });
}

function scaleStyleObject(style: unknown): unknown {
  if (!style || typeof style !== 'object' || Array.isArray(style)) return style;
  const record = style as Record<string, unknown>;
  const scaled: Record<string, unknown> = {};

  Object.entries(record).forEach(([prop, value]) => {
    if (prop === 'shadowOffset' || prop === 'textShadowOffset') {
      scaled[prop] = scaleOffset(value);
      return;
    }
    if (prop === 'transform') {
      scaled[prop] = scaleTransform(value);
      return;
    }
    scaled[prop] = scaleStyleValue(prop, value);
  });

  return scaled;
}

export function installGlobalStyleScale() {
  const styleSheet = StyleSheet as unknown as {
    create: typeof StyleSheet.create & { __checkmoScaled?: boolean };
  };

  if (styleSheet.create.__checkmoScaled) return;

  const originalCreate = styleSheet.create.bind(StyleSheet);
  const patchedCreate = ((styles: Record<string, unknown>) => {
    if (!styles || typeof styles !== 'object') {
      return originalCreate(styles as never);
    }

    const scaledStyles: Record<string, unknown> = {};
    Object.entries(styles).forEach(([name, style]) => {
      scaledStyles[name] = scaleStyleObject(style);
    });

    return originalCreate(scaledStyles as never);
  }) as typeof StyleSheet.create & { __checkmoScaled?: boolean };

  patchedCreate.__checkmoScaled = true;
  styleSheet.create = patchedCreate;
}

installGlobalStyleScale();
