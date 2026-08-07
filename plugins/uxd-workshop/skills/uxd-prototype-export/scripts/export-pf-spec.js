/**
 * PatternFly implementation-spec exporter.
 * Maps live DOM (OUIA + pf-v5/v6 CSS classes) to a clean PF component tree
 * for downstream implementation agents.
 *
 * Browser-safe core; Node module exports helpers for Playwright evaluate +
 * browser-bundle generation. Keep templates/export-pf-spec.browser.js in sync
 * via: node scripts/export-pf-spec.js --write-browser
 */

'use strict';

const CORE = '@patternfly/react-core';
const TABLE = '@patternfly/react-table';
const CHARTS = '@patternfly/react-charts';
const CODE_EDITOR = '@patternfly/react-code-editor';

/** @type {Record<string, { componentName: string, importFrom: string, isLayout?: boolean }>} */
const PF_CLASS_MAP = {
  'about-modal-box': { componentName: 'AboutModal', importFrom: CORE },
  accordion: { componentName: 'Accordion', importFrom: CORE },
  'action-list': { componentName: 'ActionList', importFrom: CORE },
  alert: { componentName: 'Alert', importFrom: CORE },
  'alert-group': { componentName: 'AlertGroup', importFrom: CORE },
  avatar: { componentName: 'Avatar', importFrom: CORE },
  badge: { componentName: 'Badge', importFrom: CORE },
  banner: { componentName: 'Banner', importFrom: CORE },
  brand: { componentName: 'Brand', importFrom: CORE },
  breadcrumb: { componentName: 'Breadcrumb', importFrom: CORE },
  button: { componentName: 'Button', importFrom: CORE },
  'calendar-month': { componentName: 'CalendarMonth', importFrom: CORE },
  card: { componentName: 'Card', importFrom: CORE },
  check: { componentName: 'Checkbox', importFrom: CORE },
  chip: { componentName: 'Chip', importFrom: CORE },
  'chip-group': { componentName: 'ChipGroup', importFrom: CORE },
  'clipboard-copy': { componentName: 'ClipboardCopy', importFrom: CORE },
  'code-block': { componentName: 'CodeBlock', importFrom: CORE },
  'code-editor': { componentName: 'CodeEditor', importFrom: CODE_EDITOR },
  content: { componentName: 'Content', importFrom: CORE },
  'data-list': { componentName: 'DataList', importFrom: CORE },
  'date-picker': { componentName: 'DatePicker', importFrom: CORE },
  'description-list': { componentName: 'DescriptionList', importFrom: CORE },
  divider: { componentName: 'Divider', importFrom: CORE },
  drawer: { componentName: 'Drawer', importFrom: CORE },
  dropdown: { componentName: 'Dropdown', importFrom: CORE },
  'dual-list-selector': { componentName: 'DualListSelector', importFrom: CORE },
  'empty-state': { componentName: 'EmptyState', importFrom: CORE },
  'expandable-section': { componentName: 'ExpandableSection', importFrom: CORE },
  'file-upload': { componentName: 'FileUpload', importFrom: CORE },
  form: { componentName: 'Form', importFrom: CORE },
  'helper-text': { componentName: 'HelperText', importFrom: CORE },
  hint: { componentName: 'Hint', importFrom: CORE },
  icon: { componentName: 'Icon', importFrom: CORE },
  'input-group': { componentName: 'InputGroup', importFrom: CORE },
  'jump-links': { componentName: 'JumpLinks', importFrom: CORE },
  label: { componentName: 'Label', importFrom: CORE },
  'label-group': { componentName: 'LabelGroup', importFrom: CORE },
  list: { componentName: 'List', importFrom: CORE },
  masthead: { componentName: 'Masthead', importFrom: CORE },
  menu: { componentName: 'Menu', importFrom: CORE },
  'menu-toggle': { componentName: 'MenuToggle', importFrom: CORE },
  'modal-box': { componentName: 'Modal', importFrom: CORE },
  nav: { componentName: 'Nav', importFrom: CORE },
  'number-input': { componentName: 'NumberInput', importFrom: CORE },
  'overflow-menu': { componentName: 'OverflowMenu', importFrom: CORE },
  page: { componentName: 'Page', importFrom: CORE },
  pagination: { componentName: 'Pagination', importFrom: CORE },
  panel: { componentName: 'Panel', importFrom: CORE },
  popover: { componentName: 'Popover', importFrom: CORE },
  progress: { componentName: 'Progress', importFrom: CORE },
  'progress-stepper': { componentName: 'ProgressStepper', importFrom: CORE },
  radio: { componentName: 'Radio', importFrom: CORE },
  'search-input': { componentName: 'SearchInput', importFrom: CORE },
  select: { componentName: 'Select', importFrom: CORE },
  sidebar: { componentName: 'Sidebar', importFrom: CORE },
  skeleton: { componentName: 'Skeleton', importFrom: CORE },
  slider: { componentName: 'Slider', importFrom: CORE },
  spinner: { componentName: 'Spinner', importFrom: CORE },
  switch: { componentName: 'Switch', importFrom: CORE },
  tabs: { componentName: 'Tabs', importFrom: CORE },
  'tab-content': { componentName: 'TabContent', importFrom: CORE },
  'text-input': { componentName: 'TextInput', importFrom: CORE },
  'text-area': { componentName: 'TextArea', importFrom: CORE },
  'text-input-group': { componentName: 'TextInputGroup', importFrom: CORE },
  'time-picker': { componentName: 'TimePicker', importFrom: CORE },
  title: { componentName: 'Title', importFrom: CORE },
  'toggle-group': { componentName: 'ToggleGroup', importFrom: CORE },
  toolbar: { componentName: 'Toolbar', importFrom: CORE },
  tooltip: { componentName: 'Tooltip', importFrom: CORE },
  'tree-view': { componentName: 'TreeView', importFrom: CORE },
  wizard: { componentName: 'Wizard', importFrom: CORE },
  table: { componentName: 'Table', importFrom: TABLE },
  chart: { componentName: 'Chart', importFrom: CHARTS },
};

const PF_LAYOUT_MAP = {
  bullseye: { componentName: 'Bullseye', importFrom: CORE, isLayout: true },
  flex: { componentName: 'Flex', importFrom: CORE, isLayout: true },
  gallery: { componentName: 'Gallery', importFrom: CORE, isLayout: true },
  grid: { componentName: 'Grid', importFrom: CORE, isLayout: true },
  level: { componentName: 'Level', importFrom: CORE, isLayout: true },
  split: { componentName: 'Split', importFrom: CORE, isLayout: true },
  stack: { componentName: 'Stack', importFrom: CORE, isLayout: true },
};

const LAYOUT_SUB_COMPONENT_MAP = {
  'flex__item': 'FlexItem',
  'stack__item': 'StackItem',
  'gallery__item': 'GalleryItem',
  'grid__item': 'GridItem',
  'split__item': 'SplitItem',
  'level__item': 'LevelItem',
};

const SUB_COMPONENT_MAP = {
  'form__group': 'FormGroup',
  'form__section': 'FormSection',
  'form__helper-text': 'FormHelperText',
  'form__actions': 'ActionGroup',
  'form__field-group': 'FormFieldGroup',
  'card__header': 'CardHeader',
  'card__title': 'CardTitle',
  'card__body': 'CardBody',
  'card__footer': 'CardFooter',
  'card__expandable-content': 'CardExpandableContent',
  'modal-box__header': 'ModalHeader',
  'modal-box__body': 'ModalBody',
  'modal-box__footer': 'ModalFooter',
  'page__sidebar': 'PageSidebar',
  'page__main-section': 'PageSection',
  'page__main-body': 'PageBody',
  'page__main-breadcrumb': 'PageBreadcrumb',
  'page__sidebar-body': 'PageSidebarBody',
  'toolbar__content': 'ToolbarContent',
  'toolbar__item': 'ToolbarItem',
  'toolbar__group': 'ToolbarGroup',
  'empty-state__body': 'EmptyStateBody',
  'empty-state__footer': 'EmptyStateFooter',
  'empty-state__actions': 'EmptyStateActions',
  'tabs__link': 'Tab',
  'accordion__toggle': 'AccordionToggle',
  'accordion__expanded-content': 'AccordionContent',
  'accordion__item': 'AccordionItem',
  'description-list__group': 'DescriptionListGroup',
  'description-list__term': 'DescriptionListTerm',
  'description-list__description': 'DescriptionListDescription',
  'drawer__panel': 'DrawerPanelContent',
  'drawer__content': 'DrawerContent',
  'drawer__body': 'DrawerContentBody',
  'drawer__head': 'DrawerHead',
  'drawer__actions': 'DrawerActions',
  'nav__item': 'NavItem',
  'nav__list': 'NavList',
  'nav__link': 'NavItem',
  'breadcrumb__item': 'BreadcrumbItem',
  'breadcrumb__link': 'BreadcrumbItem',
  'select__menu': 'SelectList',
  'select__menu-item': 'SelectOption',
  'menu__item': 'MenuItem',
  'menu__list': 'MenuList',
  'menu__content': 'MenuContent',
  'dropdown__menu-item': 'DropdownItem',
  'dropdown__menu': 'DropdownList',
  'masthead__brand': 'MastheadBrand',
  'masthead__content': 'MastheadContent',
  'masthead__main': 'MastheadMain',
  'masthead__toggle': 'MastheadToggle',
  'masthead__logo': 'MastheadLogo',
  'table__thead': 'Thead',
  'table__tbody': 'Tbody',
  'table__tr': 'Tr',
  'table__th': 'Th',
  'table__td': 'Td',
  'data-list__item': 'DataListItem',
  'data-list__item-row': 'DataListItemRow',
  'data-list__item-content': 'DataListContent',
  'data-list__cell': 'DataListCell',
  'helper-text__item': 'HelperTextItem',
  'input-group__item': 'InputGroupItem',
  'toggle-group__item': 'ToggleGroupItem',
  'wizard__main': 'WizardStep',
  'wizard__footer': 'WizardFooter',
  'wizard__header': 'WizardHeader',
  'text-input-group__main': 'TextInputGroupMain',
  'text-input-group__utilities': 'TextInputGroupUtilities',
};

const MODIFIER_MAP = {
  primary: { prop: 'variant', value: 'primary' },
  secondary: { prop: 'variant', value: 'secondary' },
  tertiary: { prop: 'variant', value: 'tertiary' },
  danger: { prop: 'variant', value: 'danger' },
  warning: { prop: 'variant', value: 'warning' },
  success: { prop: 'variant', value: 'success' },
  info: { prop: 'variant', value: 'info' },
  link: { prop: 'variant', value: 'link' },
  plain: { prop: 'variant', value: 'plain' },
  inline: { prop: 'isInline', value: true },
  compact: { prop: 'isCompact', value: true },
  disabled: { prop: 'isDisabled', value: true },
  expanded: { prop: 'isExpanded', value: true },
  selected: { prop: 'isSelected', value: true },
  required: { prop: 'isRequired', value: true },
  'read-only': { prop: 'isReadOnly', value: true },
  sm: { prop: 'size', value: 'sm' },
  md: { prop: 'size', value: 'md' },
  lg: { prop: 'size', value: 'lg' },
  xl: { prop: 'size', value: 'xl' },
  '2xl': { prop: 'size', value: '2xl' },
  typeahead: { prop: 'variant', value: 'typeahead' },
};

const STRUCTURE_RULES = {
  Toolbar: { requireChild: 'ToolbarContent', severity: 'error' },
  Nav: { requireChild: 'NavList', severity: 'error' },
  PageSidebar: { requireChild: 'PageSidebarBody', severity: 'error' },
  Card: {
    allowChildren: ['CardHeader', 'CardTitle', 'CardBody', 'CardFooter', 'CardExpandableContent'],
    severity: 'warning',
  },
  Modal: {
    preferChildren: ['ModalHeader', 'ModalBody', 'ModalFooter'],
    severity: 'warning',
  },
  DescriptionList: { requireChild: 'DescriptionListGroup', severity: 'error' },
  DataListItem: { requireChild: 'DataListItemRow', severity: 'error' },
};

function mapCssClassToComponent(cssClass) {
  const compMatch = cssClass.match(/^pf-v[56]-c-(.+)/);
  if (compMatch && compMatch[1]) {
    const slug = compMatch[1];
    if (SUB_COMPONENT_MAP[slug]) {
      const base = slug.split('__')[0];
      const parent = PF_CLASS_MAP[base];
      return {
        componentName: SUB_COMPONENT_MAP[slug],
        importFrom: (parent && parent.importFrom) || CORE,
        isLayout: false,
        classPrefix: cssClass,
      };
    }
    const baseSlug = slug.split('__')[0];
    const entry = PF_CLASS_MAP[baseSlug];
    if (entry) {
      return {
        componentName: entry.componentName,
        importFrom: entry.importFrom,
        isLayout: false,
        classPrefix: cssClass,
      };
    }
  }

  const layoutMatch = cssClass.match(/^pf-v[56]-l-(.+)/);
  if (layoutMatch && layoutMatch[1]) {
    const slug = layoutMatch[1];
    if (LAYOUT_SUB_COMPONENT_MAP[slug]) {
      return {
        componentName: LAYOUT_SUB_COMPONENT_MAP[slug],
        importFrom: CORE,
        isLayout: true,
        classPrefix: cssClass,
      };
    }
    const baseSlug = slug.split('__')[0];
    const entry = PF_LAYOUT_MAP[baseSlug];
    if (entry) {
      return {
        componentName: entry.componentName,
        importFrom: entry.importFrom,
        isLayout: true,
        classPrefix: cssClass,
      };
    }
  }
  return null;
}

function extractPFComponentFromClasses(classes) {
  let best = null;
  for (const cls of classes) {
    const mapping = mapCssClassToComponent(cls);
    if (mapping && (!best || cls.length > best.classPrefix.length)) {
      best = mapping;
    }
  }
  if (!best) return null;
  const modifiers = [];
  for (const cls of classes) {
    if (cls.indexOf('pf-m-') === 0) modifiers.push(cls.slice(5));
  }
  return {
    componentName: best.componentName,
    importFrom: best.importFrom,
    modifiers: modifiers,
    isLayout: best.isLayout,
  };
}

function parseModifiers(modifiers) {
  const props = {};
  for (const mod of modifiers) {
    const mapped = MODIFIER_MAP[mod];
    if (mapped) props[mapped.prop] = mapped.value;
  }
  return props;
}

function resolveComponentFromOuia(ouiaType) {
  const match = String(ouiaType || '').match(/^PF[56]?\/(.+)/);
  if (!match || !match[1]) return null;
  const name = match[1];
  for (const key of Object.keys(PF_CLASS_MAP)) {
    if (PF_CLASS_MAP[key].componentName === name) {
      return { componentName: name, importFrom: PF_CLASS_MAP[key].importFrom, isLayout: false };
    }
  }
  for (const key of Object.keys(PF_LAYOUT_MAP)) {
    if (PF_LAYOUT_MAP[key].componentName === name) {
      return { componentName: name, importFrom: PF_LAYOUT_MAP[key].importFrom, isLayout: true };
    }
  }
  return { componentName: name, importFrom: CORE, isLayout: false };
}

function directText(el) {
  let text = '';
  for (const node of Array.from(el.childNodes || [])) {
    if (node.nodeType === 3) text += node.textContent || '';
  }
  return text.replace(/\s+/g, ' ').trim();
}

function collectAttrs(el) {
  const attrs = {};
  if (!el || !el.attributes) return attrs;
  for (const a of Array.from(el.attributes)) {
    if (!a || !a.name) continue;
    if (a.name === 'class' || a.name === 'style') continue;
    attrs[a.name] = a.value;
  }
  return attrs;
}

function buildPFTreeFromDom(el, depth, maxDepth) {
  if (!el || el.nodeType !== 1 || depth > maxDepth) return null;
  if (el.id === 'uxd-prototype-bar') return null;
  if (el.getAttribute && el.getAttribute('data-uxd-prototype-bar') != null) return null;

  const tag = (el.tagName || '').toLowerCase();
  const className = typeof el.className === 'string' ? el.className : el.getAttribute('class') || '';
  const classes = className.split(/\s+/).filter(Boolean);
  const attrs = collectAttrs(el);
  const text = directText(el);

  const childNodes = [];
  for (const child of Array.from(el.children || [])) {
    const built = buildPFTreeFromDom(child, depth + 1, maxDepth);
    if (!built) continue;
    if (built.component === '_wrapper' && built.children && built.children.length && !built.textContent) {
      childNodes.push.apply(childNodes, built.children);
    } else if (built.component !== '_wrapper' || built.textContent || (built.children && built.children.length)) {
      childNodes.push(built);
    }
  }

  const ouiaType = attrs['data-ouia-component-type'];
  if (ouiaType) {
    const ouia = resolveComponentFromOuia(ouiaType);
    if (ouia) {
      const props = {};
      if (el.id) props.id = el.id;
      if (attrs['aria-label']) props['aria-label'] = attrs['aria-label'];
      if (attrs['aria-labelledby']) props['aria-labelledby'] = attrs['aria-labelledby'];
      if (attrs.role) props.role = attrs.role;
      if (attrs['data-ouia-component-id']) props['data-ouia-component-id'] = attrs['data-ouia-component-id'];
      return {
        component: ouia.componentName,
        importFrom: ouia.importFrom,
        props: props,
        textContent: text || undefined,
        children: childNodes,
      };
    }
  }

  const pfInfo = extractPFComponentFromClasses(classes);
  if (pfInfo) {
    const props = parseModifiers(pfInfo.modifiers);
    if (el.id) props.id = el.id;
    if (attrs['aria-label']) props['aria-label'] = attrs['aria-label'];
    if (attrs['aria-labelledby']) props['aria-labelledby'] = attrs['aria-labelledby'];
    if (attrs.role) props.role = attrs.role;
    if (attrs.type) props.type = attrs.type;
    if (attrs.placeholder) props.placeholder = attrs.placeholder;
    if (attrs.href) props.href = attrs.href;
    if (attrs.disabled != null) props.isDisabled = true;
    if (attrs.required != null) props.isRequired = true;
    if (attrs['aria-expanded'] != null) props.isExpanded = attrs['aria-expanded'] === 'true';
    if (attrs['aria-selected'] != null) props.isSelected = attrs['aria-selected'] === 'true';
    return {
      component: pfInfo.componentName,
      importFrom: pfInfo.importFrom,
      props: props,
      textContent: text || undefined,
      children: childNodes,
    };
  }

  const isFormInput = tag === 'input' || tag === 'select' || tag === 'textarea';
  const hasMeaningful = Boolean(text) || isFormInput;
  const props = {};
  if (el.id) props.id = el.id;
  if (attrs['aria-label']) props['aria-label'] = attrs['aria-label'];
  if (attrs.role) props.role = attrs.role;
  if (isFormInput) {
    if (attrs.type) props.type = attrs.type;
    if (attrs.name) props.name = attrs.name;
    if (attrs.placeholder) props.placeholder = attrs.placeholder;
  }

  return {
    component: hasMeaningful ? tag : '_wrapper',
    importFrom: '',
    props: props,
    textContent: text || undefined,
    children: childNodes,
  };
}

function flattenPFTree(tree, out) {
  const result = out || [];
  if (!tree) return result;
  if (tree.component && tree.component !== '_wrapper') result.push(tree);
  for (const child of tree.children || []) flattenPFTree(child, result);
  return result;
}

function summarizePFTree(tree, indent) {
  indent = indent || 0;
  if (!tree) return '';
  if (tree.component === '_wrapper') {
    return (tree.children || [])
      .map(function (c) {
        return summarizePFTree(c, indent);
      })
      .filter(Boolean)
      .join('\n');
  }
  const prefix = indent === 0 ? '' : '  '.repeat(indent - 1) + '|- ';
  let label = tree.component;
  if (tree.textContent) {
    const t = tree.textContent.length > 40 ? tree.textContent.slice(0, 40) + '…' : tree.textContent;
    label += ' "' + t + '"';
  }
  if (tree.props && tree.props['aria-label']) label += ' [' + tree.props['aria-label'] + ']';
  if (tree.props && tree.props.variant) label += ' (' + tree.props.variant + ')';
  if (tree.props && tree.props.isRequired) label += ' *required';
  if (tree.props && tree.props.isDisabled) label += ' [disabled]';
  const lines = [prefix + label];
  for (const child of tree.children || []) {
    const s = summarizePFTree(child, indent + 1);
    if (s) lines.push(s);
  }
  return lines.join('\n');
}

function validateStructure(tree, warnings, path) {
  if (!tree || tree.component === '_wrapper') {
    for (const child of (tree && tree.children) || []) validateStructure(child, warnings, path);
    return;
  }
  const here = path ? path + ' > ' + tree.component : tree.component;
  const rule = STRUCTURE_RULES[tree.component];
  const childNames = (tree.children || []).map(function (c) {
    return c.component;
  });
  if (rule) {
    if (rule.requireChild) {
      const has = childNames.indexOf(rule.requireChild) !== -1;
      if (!has && childNames.some(function (n) { return n && n !== '_wrapper'; })) {
        warnings.push({
          severity: rule.severity || 'warning',
          message: '<' + tree.component + '> is missing required child <' + rule.requireChild + '>',
          path: here,
          suggestion: 'Wrap children in <' + rule.requireChild + '>',
        });
      }
    }
    if (rule.allowChildren) {
      for (const name of childNames) {
        if (!name || name === '_wrapper') continue;
        if (name.charAt(0) === name.charAt(0).toLowerCase()) continue;
        if (rule.allowChildren.indexOf(name) === -1 && name.indexOf(tree.component) !== 0) {
          warnings.push({
            severity: rule.severity || 'warning',
            message: '<' + tree.component + '> has unexpected child <' + name + '>',
            path: here,
            suggestion: 'Prefer ' + rule.allowChildren.join(', '),
          });
        }
      }
    }
    if (rule.preferChildren) {
      const missing = rule.preferChildren.filter(function (n) {
        return childNames.indexOf(n) === -1;
      });
      if (missing.length === rule.preferChildren.length && childNames.length) {
        warnings.push({
          severity: rule.severity || 'warning',
          message: '<' + tree.component + '> is missing typical children (' + rule.preferChildren.join(', ') + ')',
          path: here,
        });
      }
    }
  }
  if (tree.component === 'Chip') {
    warnings.push({
      severity: 'warning',
      message: 'Chip is deprecated in PF v6 — use Label instead',
      path: here,
      suggestion: 'Label',
    });
  }
  for (const child of tree.children || []) validateStructure(child, warnings, here);
}

function componentListFromTree(tree) {
  const seen = new Set();
  const list = [];
  for (const c of flattenPFTree(tree)) {
    if (!c.component || c.component === '_wrapper') continue;
    if (c.component.indexOf('(') !== -1) continue;
    if (c.component.charAt(0) === c.component.charAt(0).toLowerCase()) continue;
    if (!c.importFrom) continue;
    if (seen.has(c.component)) continue;
    seen.add(c.component);
    list.push({ name: c.component, importFrom: c.importFrom });
  }
  list.sort(function (a, b) {
    return a.name.localeCompare(b.name);
  });
  return list;
}

function activeScenarioId() {
  try {
    if (typeof window !== 'undefined' && window.UxdScenario && typeof window.UxdScenario.get === 'function') {
      return window.UxdScenario.get() || 'default';
    }
    if (typeof location !== 'undefined' && location.search) {
      const params = new URLSearchParams(location.search);
      return params.get('scenario') || 'default';
    }
  } catch (e) {
    /* ignore */
  }
  return 'default';
}

/**
 * @param {object} [options]
 * @param {number} [options.maxDepth=30]
 * @param {string} [options.scenarioId]
 * @returns {object} Implementation spec (PageSpec-like)
 */
function exportPfSpec(options) {
  const opts = options || {};
  const maxDepth = typeof opts.maxDepth === 'number' ? opts.maxDepth : 30;
  const root = typeof document !== 'undefined' ? document.body : null;
  if (!root) {
    return {
      source: 'dom-pf',
      url: '',
      title: '',
      scenarioId: opts.scenarioId || 'default',
      componentList: [],
      layout: '',
      tree: null,
      warnings: [{ severity: 'error', message: 'document.body not available' }],
      extractedAt: new Date().toISOString(),
    };
  }

  const tree = buildPFTreeFromDom(root, 0, maxDepth);
  const warnings = [];
  validateStructure(tree, warnings, '');
  const layout = summarizePFTree(tree, 0);
  const components = flattenPFTree(tree);
  const titleNode = components.find(function (c) {
    return c.component === 'Title' && c.textContent;
  });
  const breadcrumb = components
    .filter(function (c) {
      return c.component === 'BreadcrumbItem' && c.textContent;
    })
    .map(function (c) {
      return c.textContent;
    });

  return {
    source: 'dom-pf',
    url: typeof location !== 'undefined' ? location.href : '',
    title: (titleNode && titleNode.textContent) || (typeof document !== 'undefined' ? document.title : '') || '',
    breadcrumb: breadcrumb.length ? breadcrumb : undefined,
    scenarioId: opts.scenarioId || activeScenarioId(),
    componentList: componentListFromTree(tree),
    layout: layout,
    tree: tree,
    warnings: warnings,
    extractedAt: new Date().toISOString(),
  };
}

function getExportPfSpecFnSource() {
  const maps = {
    CORE: CORE,
    TABLE: TABLE,
    CHARTS: CHARTS,
    CODE_EDITOR: CODE_EDITOR,
    PF_CLASS_MAP: PF_CLASS_MAP,
    PF_LAYOUT_MAP: PF_LAYOUT_MAP,
    LAYOUT_SUB_COMPONENT_MAP: LAYOUT_SUB_COMPONENT_MAP,
    SUB_COMPONENT_MAP: SUB_COMPONENT_MAP,
    MODIFIER_MAP: MODIFIER_MAP,
    STRUCTURE_RULES: STRUCTURE_RULES,
  };
  return `
function __uxdExportPfSpec(options) {
  const CORE = ${JSON.stringify(maps.CORE)};
  const TABLE = ${JSON.stringify(maps.TABLE)};
  const CHARTS = ${JSON.stringify(maps.CHARTS)};
  const CODE_EDITOR = ${JSON.stringify(maps.CODE_EDITOR)};
  const PF_CLASS_MAP = ${JSON.stringify(maps.PF_CLASS_MAP)};
  const PF_LAYOUT_MAP = ${JSON.stringify(maps.PF_LAYOUT_MAP)};
  const LAYOUT_SUB_COMPONENT_MAP = ${JSON.stringify(maps.LAYOUT_SUB_COMPONENT_MAP)};
  const SUB_COMPONENT_MAP = ${JSON.stringify(maps.SUB_COMPONENT_MAP)};
  const MODIFIER_MAP = ${JSON.stringify(maps.MODIFIER_MAP)};
  const STRUCTURE_RULES = ${JSON.stringify(maps.STRUCTURE_RULES)};
  ${mapCssClassToComponent.toString()}
  ${extractPFComponentFromClasses.toString()}
  ${parseModifiers.toString()}
  ${resolveComponentFromOuia.toString()}
  ${directText.toString()}
  ${collectAttrs.toString()}
  ${buildPFTreeFromDom.toString()}
  ${flattenPFTree.toString()}
  ${summarizePFTree.toString()}
  ${validateStructure.toString()}
  ${componentListFromTree.toString()}
  ${activeScenarioId.toString()}
  const exportPfSpec = ${exportPfSpec.toString()};
  return exportPfSpec(options);
}
__uxdExportPfSpec
`.trim();
}

function getBrowserBundleSource() {
  const maps = {
    CORE: CORE,
    TABLE: TABLE,
    CHARTS: CHARTS,
    CODE_EDITOR: CODE_EDITOR,
    PF_CLASS_MAP: PF_CLASS_MAP,
    PF_LAYOUT_MAP: PF_LAYOUT_MAP,
    LAYOUT_SUB_COMPONENT_MAP: LAYOUT_SUB_COMPONENT_MAP,
    SUB_COMPONENT_MAP: SUB_COMPONENT_MAP,
    MODIFIER_MAP: MODIFIER_MAP,
    STRUCTURE_RULES: STRUCTURE_RULES,
  };
  return `(function (global) {
  'use strict';

  var CORE = ${JSON.stringify(maps.CORE)};
  var TABLE = ${JSON.stringify(maps.TABLE)};
  var CHARTS = ${JSON.stringify(maps.CHARTS)};
  var CODE_EDITOR = ${JSON.stringify(maps.CODE_EDITOR)};
  var PF_CLASS_MAP = ${JSON.stringify(maps.PF_CLASS_MAP)};
  var PF_LAYOUT_MAP = ${JSON.stringify(maps.PF_LAYOUT_MAP)};
  var LAYOUT_SUB_COMPONENT_MAP = ${JSON.stringify(maps.LAYOUT_SUB_COMPONENT_MAP)};
  var SUB_COMPONENT_MAP = ${JSON.stringify(maps.SUB_COMPONENT_MAP)};
  var MODIFIER_MAP = ${JSON.stringify(maps.MODIFIER_MAP)};
  var STRUCTURE_RULES = ${JSON.stringify(maps.STRUCTURE_RULES)};

  ${mapCssClassToComponent.toString()}
  ${extractPFComponentFromClasses.toString()}
  ${parseModifiers.toString()}
  ${resolveComponentFromOuia.toString()}
  ${directText.toString()}
  ${collectAttrs.toString()}
  ${buildPFTreeFromDom.toString()}
  ${flattenPFTree.toString()}
  ${summarizePFTree.toString()}
  ${validateStructure.toString()}
  ${componentListFromTree.toString()}
  ${activeScenarioId.toString()}
  ${exportPfSpec.toString()}

  async function exportPfSpecFiles() {
    var result = exportPfSpec({});
    var api = global.UxdPrototypeExport || {};
    var base = 'current/page';
    try {
      var pathName = (location.pathname || 'page').replace(/\\/+$/, '') || 'page';
      var slug = pathName
        .split('/')
        .filter(Boolean)
        .join('-')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      base = 'current/' + (slug || 'page') + '-' + new Date().toISOString().replace(/[:.]/g, '-');
    } catch (e) { /* keep default */ }
    var jsonBody = JSON.stringify(result, null, 2);
    var textBody = result.layout || '';
    if (typeof api.deliverExport === 'function') {
      var d1 = await api.deliverExport(base + '.pf-spec.json', jsonBody, 'json');
      var d2 = await api.deliverExport(base + '.pf-spec.txt', textBody, 'txt');
      return { source: result.source, scenarioId: result.scenarioId, delivery: [d1, d2], warnings: result.warnings };
    }
    return { source: result.source, scenarioId: result.scenarioId, spec: result, warnings: result.warnings };
  }

  global.UxdPrototypeExport = global.UxdPrototypeExport || {};
  global.UxdPrototypeExport.exportPfSpec = exportPfSpec;
  global.UxdPrototypeExport.exportPfSpecFiles = exportPfSpecFiles;
})(typeof window !== 'undefined' ? window : globalThis);
`;
}

function writeBrowserBundle() {
  const fs = require('fs');
  const path = require('path');
  const out = path.join(__dirname, '../templates/export-pf-spec.browser.js');
  fs.writeFileSync(out, getBrowserBundleSource(), 'utf8');
  return out;
}

module.exports = {
  exportPfSpec,
  getExportPfSpecFnSource,
  getBrowserBundleSource,
  writeBrowserBundle,
  summarizePFTree,
  componentListFromTree,
  PF_CLASS_MAP,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--write-browser')) {
    const out = writeBrowserBundle();
    console.log('Wrote', out);
  }
  const src = getExportPfSpecFnSource();
  if (!src.includes('exportPfSpec') || !src.includes('PF_CLASS_MAP')) {
    console.error('export-pf-spec smoke failed');
    process.exit(1);
  }
  console.log('export-pf-spec.js OK');
  console.log('source length:', src.length);
  console.log('mapped components:', Object.keys(PF_CLASS_MAP).length);
}
