(function (global) {
  'use strict';

  var CORE = "@patternfly/react-core";
  var TABLE = "@patternfly/react-table";
  var CHARTS = "@patternfly/react-charts";
  var CODE_EDITOR = "@patternfly/react-code-editor";
  var PF_CLASS_MAP = {"about-modal-box":{"componentName":"AboutModal","importFrom":"@patternfly/react-core"},"accordion":{"componentName":"Accordion","importFrom":"@patternfly/react-core"},"action-list":{"componentName":"ActionList","importFrom":"@patternfly/react-core"},"alert":{"componentName":"Alert","importFrom":"@patternfly/react-core"},"alert-group":{"componentName":"AlertGroup","importFrom":"@patternfly/react-core"},"avatar":{"componentName":"Avatar","importFrom":"@patternfly/react-core"},"badge":{"componentName":"Badge","importFrom":"@patternfly/react-core"},"banner":{"componentName":"Banner","importFrom":"@patternfly/react-core"},"brand":{"componentName":"Brand","importFrom":"@patternfly/react-core"},"breadcrumb":{"componentName":"Breadcrumb","importFrom":"@patternfly/react-core"},"button":{"componentName":"Button","importFrom":"@patternfly/react-core"},"calendar-month":{"componentName":"CalendarMonth","importFrom":"@patternfly/react-core"},"card":{"componentName":"Card","importFrom":"@patternfly/react-core"},"check":{"componentName":"Checkbox","importFrom":"@patternfly/react-core"},"chip":{"componentName":"Chip","importFrom":"@patternfly/react-core"},"chip-group":{"componentName":"ChipGroup","importFrom":"@patternfly/react-core"},"clipboard-copy":{"componentName":"ClipboardCopy","importFrom":"@patternfly/react-core"},"code-block":{"componentName":"CodeBlock","importFrom":"@patternfly/react-core"},"code-editor":{"componentName":"CodeEditor","importFrom":"@patternfly/react-code-editor"},"content":{"componentName":"Content","importFrom":"@patternfly/react-core"},"data-list":{"componentName":"DataList","importFrom":"@patternfly/react-core"},"date-picker":{"componentName":"DatePicker","importFrom":"@patternfly/react-core"},"description-list":{"componentName":"DescriptionList","importFrom":"@patternfly/react-core"},"divider":{"componentName":"Divider","importFrom":"@patternfly/react-core"},"drawer":{"componentName":"Drawer","importFrom":"@patternfly/react-core"},"dropdown":{"componentName":"Dropdown","importFrom":"@patternfly/react-core"},"dual-list-selector":{"componentName":"DualListSelector","importFrom":"@patternfly/react-core"},"empty-state":{"componentName":"EmptyState","importFrom":"@patternfly/react-core"},"expandable-section":{"componentName":"ExpandableSection","importFrom":"@patternfly/react-core"},"file-upload":{"componentName":"FileUpload","importFrom":"@patternfly/react-core"},"form":{"componentName":"Form","importFrom":"@patternfly/react-core"},"helper-text":{"componentName":"HelperText","importFrom":"@patternfly/react-core"},"hint":{"componentName":"Hint","importFrom":"@patternfly/react-core"},"icon":{"componentName":"Icon","importFrom":"@patternfly/react-core"},"input-group":{"componentName":"InputGroup","importFrom":"@patternfly/react-core"},"jump-links":{"componentName":"JumpLinks","importFrom":"@patternfly/react-core"},"label":{"componentName":"Label","importFrom":"@patternfly/react-core"},"label-group":{"componentName":"LabelGroup","importFrom":"@patternfly/react-core"},"list":{"componentName":"List","importFrom":"@patternfly/react-core"},"masthead":{"componentName":"Masthead","importFrom":"@patternfly/react-core"},"menu":{"componentName":"Menu","importFrom":"@patternfly/react-core"},"menu-toggle":{"componentName":"MenuToggle","importFrom":"@patternfly/react-core"},"modal-box":{"componentName":"Modal","importFrom":"@patternfly/react-core"},"nav":{"componentName":"Nav","importFrom":"@patternfly/react-core"},"number-input":{"componentName":"NumberInput","importFrom":"@patternfly/react-core"},"overflow-menu":{"componentName":"OverflowMenu","importFrom":"@patternfly/react-core"},"page":{"componentName":"Page","importFrom":"@patternfly/react-core"},"pagination":{"componentName":"Pagination","importFrom":"@patternfly/react-core"},"panel":{"componentName":"Panel","importFrom":"@patternfly/react-core"},"popover":{"componentName":"Popover","importFrom":"@patternfly/react-core"},"progress":{"componentName":"Progress","importFrom":"@patternfly/react-core"},"progress-stepper":{"componentName":"ProgressStepper","importFrom":"@patternfly/react-core"},"radio":{"componentName":"Radio","importFrom":"@patternfly/react-core"},"search-input":{"componentName":"SearchInput","importFrom":"@patternfly/react-core"},"select":{"componentName":"Select","importFrom":"@patternfly/react-core"},"sidebar":{"componentName":"Sidebar","importFrom":"@patternfly/react-core"},"skeleton":{"componentName":"Skeleton","importFrom":"@patternfly/react-core"},"slider":{"componentName":"Slider","importFrom":"@patternfly/react-core"},"spinner":{"componentName":"Spinner","importFrom":"@patternfly/react-core"},"switch":{"componentName":"Switch","importFrom":"@patternfly/react-core"},"tabs":{"componentName":"Tabs","importFrom":"@patternfly/react-core"},"tab-content":{"componentName":"TabContent","importFrom":"@patternfly/react-core"},"text-input":{"componentName":"TextInput","importFrom":"@patternfly/react-core"},"text-area":{"componentName":"TextArea","importFrom":"@patternfly/react-core"},"text-input-group":{"componentName":"TextInputGroup","importFrom":"@patternfly/react-core"},"time-picker":{"componentName":"TimePicker","importFrom":"@patternfly/react-core"},"title":{"componentName":"Title","importFrom":"@patternfly/react-core"},"toggle-group":{"componentName":"ToggleGroup","importFrom":"@patternfly/react-core"},"toolbar":{"componentName":"Toolbar","importFrom":"@patternfly/react-core"},"tooltip":{"componentName":"Tooltip","importFrom":"@patternfly/react-core"},"tree-view":{"componentName":"TreeView","importFrom":"@patternfly/react-core"},"wizard":{"componentName":"Wizard","importFrom":"@patternfly/react-core"},"table":{"componentName":"Table","importFrom":"@patternfly/react-table"},"chart":{"componentName":"Chart","importFrom":"@patternfly/react-charts"}};
  var PF_LAYOUT_MAP = {"bullseye":{"componentName":"Bullseye","importFrom":"@patternfly/react-core","isLayout":true},"flex":{"componentName":"Flex","importFrom":"@patternfly/react-core","isLayout":true},"gallery":{"componentName":"Gallery","importFrom":"@patternfly/react-core","isLayout":true},"grid":{"componentName":"Grid","importFrom":"@patternfly/react-core","isLayout":true},"level":{"componentName":"Level","importFrom":"@patternfly/react-core","isLayout":true},"split":{"componentName":"Split","importFrom":"@patternfly/react-core","isLayout":true},"stack":{"componentName":"Stack","importFrom":"@patternfly/react-core","isLayout":true}};
  var LAYOUT_SUB_COMPONENT_MAP = {"flex__item":"FlexItem","stack__item":"StackItem","gallery__item":"GalleryItem","grid__item":"GridItem","split__item":"SplitItem","level__item":"LevelItem"};
  var SUB_COMPONENT_MAP = {"form__group":"FormGroup","form__section":"FormSection","form__helper-text":"FormHelperText","form__actions":"ActionGroup","form__field-group":"FormFieldGroup","card__header":"CardHeader","card__title":"CardTitle","card__body":"CardBody","card__footer":"CardFooter","card__expandable-content":"CardExpandableContent","modal-box__header":"ModalHeader","modal-box__body":"ModalBody","modal-box__footer":"ModalFooter","page__sidebar":"PageSidebar","page__main-section":"PageSection","page__main-body":"PageBody","page__main-breadcrumb":"PageBreadcrumb","page__sidebar-body":"PageSidebarBody","toolbar__content":"ToolbarContent","toolbar__item":"ToolbarItem","toolbar__group":"ToolbarGroup","empty-state__body":"EmptyStateBody","empty-state__footer":"EmptyStateFooter","empty-state__actions":"EmptyStateActions","tabs__link":"Tab","accordion__toggle":"AccordionToggle","accordion__expanded-content":"AccordionContent","accordion__item":"AccordionItem","description-list__group":"DescriptionListGroup","description-list__term":"DescriptionListTerm","description-list__description":"DescriptionListDescription","drawer__panel":"DrawerPanelContent","drawer__content":"DrawerContent","drawer__body":"DrawerContentBody","drawer__head":"DrawerHead","drawer__actions":"DrawerActions","nav__item":"NavItem","nav__list":"NavList","nav__link":"NavItem","breadcrumb__item":"BreadcrumbItem","breadcrumb__link":"BreadcrumbItem","select__menu":"SelectList","select__menu-item":"SelectOption","menu__item":"MenuItem","menu__list":"MenuList","menu__content":"MenuContent","dropdown__menu-item":"DropdownItem","dropdown__menu":"DropdownList","masthead__brand":"MastheadBrand","masthead__content":"MastheadContent","masthead__main":"MastheadMain","masthead__toggle":"MastheadToggle","masthead__logo":"MastheadLogo","table__thead":"Thead","table__tbody":"Tbody","table__tr":"Tr","table__th":"Th","table__td":"Td","data-list__item":"DataListItem","data-list__item-row":"DataListItemRow","data-list__item-content":"DataListContent","data-list__cell":"DataListCell","helper-text__item":"HelperTextItem","input-group__item":"InputGroupItem","toggle-group__item":"ToggleGroupItem","wizard__main":"WizardStep","wizard__footer":"WizardFooter","wizard__header":"WizardHeader","text-input-group__main":"TextInputGroupMain","text-input-group__utilities":"TextInputGroupUtilities"};
  var MODIFIER_MAP = {"primary":{"prop":"variant","value":"primary"},"secondary":{"prop":"variant","value":"secondary"},"tertiary":{"prop":"variant","value":"tertiary"},"danger":{"prop":"variant","value":"danger"},"warning":{"prop":"variant","value":"warning"},"success":{"prop":"variant","value":"success"},"info":{"prop":"variant","value":"info"},"link":{"prop":"variant","value":"link"},"plain":{"prop":"variant","value":"plain"},"inline":{"prop":"isInline","value":true},"compact":{"prop":"isCompact","value":true},"disabled":{"prop":"isDisabled","value":true},"expanded":{"prop":"isExpanded","value":true},"selected":{"prop":"isSelected","value":true},"required":{"prop":"isRequired","value":true},"read-only":{"prop":"isReadOnly","value":true},"sm":{"prop":"size","value":"sm"},"md":{"prop":"size","value":"md"},"lg":{"prop":"size","value":"lg"},"xl":{"prop":"size","value":"xl"},"2xl":{"prop":"size","value":"2xl"},"typeahead":{"prop":"variant","value":"typeahead"}};
  var STRUCTURE_RULES = {"Toolbar":{"requireChild":"ToolbarContent","severity":"error"},"Nav":{"requireChild":"NavList","severity":"error"},"PageSidebar":{"requireChild":"PageSidebarBody","severity":"error"},"Card":{"allowChildren":["CardHeader","CardTitle","CardBody","CardFooter","CardExpandableContent"],"severity":"warning"},"Modal":{"preferChildren":["ModalHeader","ModalBody","ModalFooter"],"severity":"warning"},"DescriptionList":{"requireChild":"DescriptionListGroup","severity":"error"},"DataListItem":{"requireChild":"DataListItemRow","severity":"error"}};

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

  async function exportPfSpecFiles() {
    var result = exportPfSpec({});
    var api = global.UxdPrototypeExport || {};
    var base = 'current/page';
    try {
      var pathName = (location.pathname || 'page').replace(/\/+$/, '') || 'page';
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
