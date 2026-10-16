(function () {
  const deck = JSON.parse(document.getElementById('deck-data').textContent);
  const slides = Array.isArray(deck.slides) ? deck.slides : [];
  const viewport = document.getElementById('viewport');
  const title = document.getElementById('deck-title');
  const count = document.getElementById('count');
  const notes = document.getElementById('notes');
  const notesBody = document.getElementById('notes-body');
  const notesToggle = document.getElementById('notes-toggle');
  const presentButton = document.getElementById('present');
  const progress = document.getElementById('progress');
  const banner = document.getElementById('banner');
  let index = initialIndex();

  title.textContent = deck.title || 'Slide deck';
  document.title = deck.title || 'Slide deck';
  renderBanner();
  slides.forEach((slide, slideIndex) => viewport.appendChild(renderSlide(slide, slideIndex)));
  if (slides.length === 0) {
    viewport.appendChild(Object.assign(document.createElement('p'), {
      textContent: 'This deck has no slides.',
      style: 'padding: 48px; color: #151515;'
    }));
  }

  document.getElementById('prev').addEventListener('click', () => go(index - 1));
  document.getElementById('next').addEventListener('click', () => go(index + 1));
  notesToggle.addEventListener('click', toggleNotes);
  presentButton.addEventListener('click', togglePresent);
  window.addEventListener('resize', fit);
  window.addEventListener('hashchange', () => go(initialIndex(), { updateHash: false }));
  window.addEventListener('keydown', onKey);
  viewport.addEventListener('click', (event) => {
    if (event.target.closest('a, button')) return;
    const rect = viewport.getBoundingClientRect();
    go(index + (event.clientX - rect.left > rect.width / 2 ? 1 : -1));
  });

  go(index, { updateHash: false });
  fit();

  function initialIndex() {
    const hashed = Number(location.hash.replace('#', ''));
    if (!Number.isInteger(hashed) || hashed < 1) return 0;
    return Math.min(slides.length - 1, hashed - 1);
  }

  function go(nextIndex, { updateHash = true } = {}) {
    if (slides.length === 0) return;
    index = Math.max(0, Math.min(slides.length - 1, nextIndex));
    viewport.querySelectorAll('.slide').forEach((slide, slideIndex) => {
      slide.classList.toggle('is-active', slideIndex === index);
      slide.hidden = slideIndex !== index;
    });
    count.textContent = `${index + 1} / ${slides.length}`;
    progress.style.transform = `scaleX(${(index + 1) / slides.length})`;
    notesBody.textContent = slides[index].notes || 'No speaker notes for this slide.';
    if (updateHash) history.replaceState(null, '', `#${index + 1}`);
  }

  function toggleNotes() {
    const open = notes.hidden;
    notes.hidden = !open;
    notesToggle.setAttribute('aria-pressed', open ? 'true' : 'false');
    fit();
  }

  function togglePresent() {
    const on = !document.body.classList.contains('is-present');
    document.body.classList.toggle('is-present', on);
    presentButton.setAttribute('aria-pressed', on ? 'true' : 'false');
    fit();
  }

  function onKey(event) {
    const key = event.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(key)) {
      event.preventDefault();
      go(index + 1);
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(key)) {
      event.preventDefault();
      go(index - 1);
    } else if (key === 'Home') go(0);
    else if (key === 'End') go(slides.length - 1);
    else if (key === 's' || key === 'S') toggleNotes();
    else if (key === 'f' || key === 'F') togglePresent();
    else if (key === 'Escape') {
      document.body.classList.remove('is-present');
      presentButton.setAttribute('aria-pressed', 'false');
      fit();
    }
  }

  function fit() {
    const stage = document.querySelector('.stage');
    const scale = Math.min(stage.clientWidth / 1920, stage.clientHeight / 1080);
    viewport.style.transform = `translate(-50%, -50%) scale(${scale || 1})`;
  }

  function renderBanner() {
    const url = safeUrl(deck.canonical && deck.canonical.url);
    if (!url) return;
    const label = deck.canonical.target === 'figma-slides' ? 'Figma Slides' : 'Google Slides';
    banner.hidden = false;
    banner.textContent = '';
    const stale = deck.status !== 'published';
    banner.append(stale
      ? 'This local deck has changed since it was shared. Last shared copy: '
      : 'Shared copy: ');
    const link = document.createElement('a');
    link.href = url;
    link.textContent = label;
    banner.append(link);
  }

  function renderSlide(slide, slideIndex) {
    const section = document.createElement('section');
    section.className = `slide slide-${slide.type || 'content'}`;
    section.id = `slide-${slide.order || slideIndex + 1}`;
    section.hidden = true;
    section.setAttribute('aria-label', `Slide ${slideIndex + 1} of ${slides.length}: ${slide.heading || slide.type}`);
    const inner = document.createElement('div');
    inner.className = 'slide-inner';
    section.appendChild(inner);

    if (slide.type === 'split') {
      const copy = document.createElement('div');
      copy.className = 'copy-col';
      appendHeading(copy, slide);
      copy.appendChild(renderBlocks(slide.blocks));
      inner.append(copy, renderMedia(slide.media));
      return section;
    }

    if (slide.type === 'beat') {
      renderBeat(inner, slide);
      return section;
    }

    if (slide.type === 'agenda') {
      renderAgenda(inner, slide, slideIndex);
      return section;
    }

    if (slide.type === 'persona') {
      renderPersona(inner, slide, slideIndex);
      return section;
    }

    if (slide.type === 'stages') {
      renderStages(inner, slide, slideIndex);
      return section;
    }

    if (slide.type === 'scene') {
      renderScene(inner, slide, slideIndex);
      return section;
    }

    if (slide.type === 'compare') {
      renderCompare(inner, slide, slideIndex);
      return section;
    }

    if (slide.type === 'quote') {
      appendKicker(inner, slide.kicker);
      const quote = slide.blocks.find((block) => block.type === 'quote');
      const quoteText = document.createElement('blockquote');
      quoteText.innerHTML = inline(quote ? quote.text : slide.heading);
      inner.appendChild(quoteText);
      if (quote && slide.heading) {
        const attribution = document.createElement('p');
        attribution.className = 'attribution';
        attribution.innerHTML = inline(slide.heading);
        inner.appendChild(attribution);
      }
      return section;
    }

    appendHeading(inner, slide, { bar: slide.type === 'title' || slide.type === 'closing' || slide.type === 'section' });
    if (slide.blocks.length > 0) inner.appendChild(renderBlocks(slide.blocks));
    return section;
  }

  function appendHeading(parent, slide, { bar = false } = {}) {
    appendKicker(parent, slide.kicker);
    if (bar) {
      const accent = document.createElement('span');
      accent.className = 'accent-bar';
      accent.setAttribute('aria-hidden', 'true');
      parent.appendChild(accent);
    }
    if (slide.heading) parent.appendChild(textEl('h1', slide.heading));
    if (slide.subheading) parent.appendChild(textEl('h2', slide.subheading));
  }

  function appendKicker(parent, kicker) {
    if (kicker) parent.appendChild(textEl('p', kicker, 'kicker'));
  }

  function renderBlocks(blocks) {
    const copy = document.createElement('div');
    copy.className = 'slide-copy';
    for (const block of blocks) {
      if (block.type === 'h3') copy.appendChild(textEl('h3', block.text));
      else if (block.type === 'paragraph') copy.appendChild(textEl('p', block.text));
      else if (block.type === 'quote') copy.appendChild(textEl('blockquote', block.text));
      else if (block.type === 'bullets') {
        const list = document.createElement('ul');
        for (const item of block.items) list.appendChild(textEl('li', item));
        copy.appendChild(list);
      } else if (block.type === 'code') {
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = block.text;
        pre.appendChild(code);
        copy.appendChild(pre);
      } else if (block.type === 'image') {
        copy.appendChild(renderImage(block.src, block.alt, 'inline-image'));
      }
    }
    return copy;
  }

  function renderBeat(inner, slide) {
    const story = document.createElement('div');
    story.className = 'story';
    const label = slide.kicker || slide.heading;
    if (label) {
      const part = document.createElement('p');
      part.className = 'part-label';
      part.textContent = label;
      story.appendChild(part);
    }
    const storyBlocks = Array.isArray(slide.story) ? slide.story : [];
    if (storyBlocks.length > 0) story.appendChild(renderBlocks(storyBlocks));
    story.appendChild(renderMedia(slide.media, 'Concept sketch'));

    const rail = document.createElement('div');
    rail.className = 'rail';
    for (const group of slide.rail || []) {
      const section = document.createElement('section');
      section.className = `rail-section rail-${group.kind || 'notes'}`;
      section.appendChild(renderRailLabel(group));
      const list = document.createElement('ul');
      for (const item of group.items || []) {
        list.appendChild(group.kind === 'users' ? renderBeatPersona(itemText(item)) : renderRailItem(item));
      }
      section.appendChild(list);
      rail.appendChild(section);
    }
    inner.append(story, rail);
  }

  function renderRailLabel(group) {
    const heading = document.createElement('h3');
    const label = group.label || '';
    const keywordLength = railKeywordLength(group.kind, label);
    const keyword = document.createElement('span');
    keyword.className = 'rail-keyword';
    keyword.textContent = label.slice(0, keywordLength);
    heading.appendChild(keyword);
    if (keywordLength < label.length) heading.appendChild(document.createTextNode(label.slice(keywordLength)));
    return heading;
  }

  function railKeywordLength(kind, label) {
    const text = String(label || '').trim().toLowerCase();
    if (kind === 'users' && text.startsWith('users')) return 5;
    if (kind === 'users' && text.startsWith('people')) return 6;
    if (kind === 'needs' && text.startsWith('unmet needs')) return 'unmet needs'.length;
    if (kind === 'needs' && text.startsWith('needs')) return 5;
    if (kind === 'solutions' && text.startsWith('solutions')) return 9;
    if (kind === 'solutions' && text.startsWith('solution')) return 8;
    return String(label || '').length;
  }

  function renderRailItem(item) {
    const line = textEl('li', itemText(item));
    if (itemDepth(item)) line.classList.add('is-nested');
    return line;
  }

  function itemText(item) {
    return typeof item === 'string' ? item : String(item && item.text || '');
  }

  function itemDepth(item) {
    return typeof item === 'string' ? 0 : Number(item && item.depth || 0);
  }

  function renderBeatPersona(item) {
    const line = document.createElement('li');
    line.className = 'persona';
    const parts = String(item).match(/^(.*?)\s+[—–-]\s+(.*)$/);
    const nameText = parts ? parts[1] : item;
    const avatar = document.createElement('span');
    avatar.className = 'persona-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = initials(nameText);
    avatar.style.background = avatarColor(nameText);
    line.appendChild(avatar);
    const name = document.createElement('span');
    name.className = 'persona-name';
    name.innerHTML = inline(nameText);
    line.appendChild(name);
    if (parts) {
      const role = document.createElement('span');
      role.className = 'persona-role';
      role.innerHTML = inline(parts[2]);
      line.appendChild(role);
    }
    return line;
  }

  function initials(name) {
    const words = plainName(name).split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  }

  function avatarColor(name) {
    const palette = ['#f6d7a8', '#c9d7f0', '#f3c1c8', '#d5ead8', '#e4d4f5'];
    const plain = plainName(name);
    const index = [...plain].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
    return palette[index];
  }

  function plainName(name) {
    return String(name).replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  }

  function renderMedia(media, placeholder = 'Add a screenshot in assets/') {
    const figure = document.createElement('figure');
    figure.className = 'media';
    if (media && media.src) figure.appendChild(renderImage(media.src, ''));
    else figure.textContent = placeholder;
    return figure;
  }

  function renderImage(src, alt, className) {
    const image = document.createElement('img');
    image.src = src;
    image.alt = alt || '';
    if (className) image.className = className;
    image.addEventListener('error', () => {
      const fallback = document.createElement('p');
      fallback.textContent = src;
      image.replaceWith(fallback);
    });
    return image;
  }

  function renderAgenda(inner, slide, slideIndex) {
    const body = document.createElement('div');
    body.className = 'agenda-body';
    const copy = document.createElement('div');
    copy.className = 'agenda-copy';
    appendKicker(copy, slide.kicker);
    if (slide.heading) copy.appendChild(textEl('h1', slide.heading));
    if (slide.subheading) copy.appendChild(textEl('h2', slide.subheading));
    const rail = document.createElement('div');
    rail.className = 'agenda-rail';
    const { sections } = sectionBlocks(slide.blocks);
    sections.forEach((section) => {
      const step = document.createElement('div');
      step.className = 'agenda-step';
      step.appendChild(textEl('p', section.title, 'agenda-num'));
      const title = section.blocks.find((block) => block.type === 'paragraph');
      if (title) step.appendChild(textEl('p', title.text, 'agenda-name'));
      rail.appendChild(step);
    });
    body.append(copy, rail);
    inner.append(body, renderFooter(slideIndex));
  }

  function renderPersona(inner, slide, slideIndex) {
    const head = document.createElement('div');
    head.className = 'persona-head';
    appendKicker(head, slide.kicker);
    if (slide.heading) head.appendChild(textEl('h1', slide.heading));
    inner.appendChild(head);

    const { sections } = sectionBlocks(slide.blocks);
    const goal = sections.find((section) => /goal/i.test(section.title));
    const stat = sections.find((section) => /^\d+\s+of\s+\d+$/i.test(section.title));
    const flow = sections.find((section) => section !== goal && section !== stat && !reservedTitle(section.title));
    const lanes = sections.filter((section) => section !== goal && section !== stat && section !== flow && !reservedTitle(section.title));
    const note = sections.find((section) => reservedTitle(section.title) === 'caption');

    const layout = document.createElement('div');
    layout.className = 'persona-layout';
    const identity = document.createElement('div');
    identity.className = 'persona-identity';
    if (slide.subheading) identity.appendChild(textEl('h2', slide.subheading));
    const roleBlocks = [];
    for (const block of slide.blocks) {
      if (block.type === 'h3') break;
      if (block.type === 'paragraph') roleBlocks.push(block);
    }
    if (roleBlocks.length) {
      const role = document.createElement('p');
      role.className = 'persona-role';
      role.innerHTML = roleBlocks.map((block) => inline(block.text)).join('<br>');
      identity.appendChild(role);
    }
    if (goal) {
      identity.appendChild(textEl('p', goal.title, 'persona-goal-label'));
      const goalText = goal.blocks.find((block) => block.type === 'paragraph');
      if (goalText) identity.appendChild(textEl('p', goalText.text, 'persona-goal'));
    }
    if (stat) {
      identity.appendChild(textEl('p', stat.title, 'persona-stat'));
      identity.appendChild(renderStatGrid(stat.title));
      const caption = stat.blocks.find((block) => block.type === 'paragraph');
      if (caption) identity.appendChild(textEl('p', caption.text, 'persona-stat-caption'));
    }
    const work = document.createElement('div');
    work.className = 'persona-work';
    if (flow) {
      work.appendChild(textEl('h3', flow.title));
      const steps = document.createElement('div');
      steps.className = 'persona-steps';
      for (const item of bulletItems(flow.blocks)) {
        const step = document.createElement('div');
        step.className = 'persona-step';
        const parts = itemText(item).match(/^(\d+)\s+(.*)$/);
        step.appendChild(textEl('span', parts ? parts[1] : '', 'persona-pill'));
        step.appendChild(textEl('p', parts ? parts[2] : itemText(item)));
        steps.appendChild(step);
      }
      work.appendChild(steps);
    }
    for (const lane of lanes) {
      const row = document.createElement('div');
      row.className = `persona-lane ${laneClass(lane.title)}`.trim();
      row.appendChild(textEl('h4', lane.title));
      const actions = document.createElement('div');
      actions.className = 'persona-actions';
      for (const item of bulletItems(lane.blocks)) {
        const pieces = itemText(item).split(/\s*(?:→|->)\s*/);
        pieces.forEach((piece, index) => {
          if (index > 0) {
            const arrow = document.createElement('span');
            arrow.className = 'persona-arrow';
            arrow.setAttribute('aria-hidden', 'true');
            arrow.textContent = '→';
            actions.appendChild(arrow);
          }
          actions.appendChild(textEl('p', piece));
        });
      }
      row.appendChild(actions);
      work.appendChild(row);
    }
    if (note) {
      const caption = note.blocks.find((block) => block.type === 'paragraph');
      if (caption) work.appendChild(textEl('p', caption.text, 'persona-note'));
    }
    layout.append(identity, work);
    inner.append(layout, renderFooter(slideIndex));
  }

  function renderStages(inner, slide, slideIndex) {
    const { lead, sections } = sectionBlocks(slide.blocks);
    const columns = sections.filter((section) => !reservedTitle(section.title));
    const current = columns.some((column) => column.blocks.some((block) => block.type === 'quote' && /^pain\b/i.test(block.text)));
    if (current) inner.closest('.slide').classList.add('is-current');
    appendKicker(inner, slide.kicker);
    if (slide.heading) inner.appendChild(textEl('h1', slide.heading));
    if (slide.subheading) inner.appendChild(textEl('h2', slide.subheading));
    for (const block of lead) {
      if (block.type === 'paragraph') inner.appendChild(textEl('p', block.text, 'stages-lead'));
    }
    const path = sections.find((section) => reservedTitle(section.title) === 'path');
    if (path) {
      const trail = path.blocks.find((block) => block.type === 'paragraph');
      if (trail) inner.appendChild(renderPath(trail.text));
    }
    const grid = document.createElement('div');
    grid.className = 'stages-grid';
    for (const column of columns) grid.appendChild(renderStageColumn(column, current));
    inner.appendChild(grid);
    appendReserved(inner, sections);
    inner.appendChild(renderFooter(slideIndex));
  }

  function renderStageColumn(column, current) {
    const cell = document.createElement('div');
    cell.className = 'stage-col';
    cell.appendChild(textEl('h3', column.title));
    const { intro, groups } = panels(column.blocks);
    const introNodes = consumeCards(intro);
    for (const node of introNodes) cell.appendChild(renderStageNode(node, current));
    for (const group of groups) {
      cell.appendChild(textEl('h4', group.title));
      for (const node of consumeCards(group.blocks)) cell.appendChild(renderStageNode(node, current));
    }
    return cell;
  }

  function renderStageNode(node, current) {
    if (node.type === 'card') {
      const card = document.createElement('div');
      card.className = current || /^pain\b/i.test(node.label) ? 'stage-card is-pain' : 'stage-card is-gain';
      card.appendChild(textEl('p', node.label, 'stage-card-label'));
      if (node.body) card.appendChild(textEl('p', node.body, 'stage-card-body'));
      return card;
    }
    if (node.type === 'bullets') {
      const list = document.createElement('ul');
      list.className = 'stage-meta';
      for (const item of node.items) {
        const line = document.createElement('li');
        const parts = itemText(item).split(/\s+[—–]\s+/);
        if (parts.length > 1) {
          const name = document.createElement('strong');
          name.innerHTML = inline(parts[0]);
          const detail = document.createElement('span');
          detail.className = 'meta-detail';
          detail.innerHTML = inline(parts.slice(1).join(' — '));
          line.append(name, detail);
        } else line.innerHTML = inline(itemText(item));
        list.appendChild(line);
      }
      return list;
    }
    if (node.type === 'paragraph') return textEl('p', node.text, 'stage-copy');
    return textEl('p', node.text || '');
  }

  function renderScene(inner, slide, slideIndex) {
    appendKicker(inner, slide.kicker);
    if (slide.heading) inner.appendChild(textEl('h1', slide.heading));
    const { lead, sections } = sectionBlocks(slide.blocks);
    const frameSection = sections.find((section) => !reservedTitle(section.title));
    const row = document.createElement('div');
    row.className = 'scene-row';
    const callout = document.createElement('div');
    callout.className = 'scene-callout';
    if (slide.subheading) callout.appendChild(textEl('p', slide.subheading, 'scene-label'));
    for (const block of lead) {
      if (block.type === 'paragraph') callout.appendChild(textEl('p', block.text, 'scene-statement'));
    }
    row.appendChild(callout);
    if (frameSection) row.appendChild(renderConsole(frameSection));
    inner.appendChild(row);
    appendReserved(inner, sections);
    inner.appendChild(renderFooter(slideIndex));
  }

  function renderConsole(section) {
    const frame = document.createElement('div');
    frame.className = 'console';
    const bar = document.createElement('div');
    bar.className = 'console-bar';
    bar.appendChild(textEl('p', section.title, 'console-crumb'));
    const { intro, groups } = panels(section.blocks);
    const rest = [];
    for (const block of intro) {
      if (block.type === 'paragraph' && !bar.querySelector('.console-tag') && block.text.length < 42) {
        bar.appendChild(textEl('p', block.text, 'console-tag'));
      } else rest.push(block);
    }
    frame.appendChild(bar);
    const body = document.createElement('div');
    body.className = 'console-body';
    const mains = [];
    const cards = [];
    const asides = [];
    const below = [];
    for (const group of groups) {
      if (group.title.includes('|')) {
        const host = cards[cards.length - 1] || mains[mains.length - 1] || asides[asides.length - 1];
        if (host) host.table = group;
        continue;
      }
      if (/^below$/i.test(group.title)) {
        below.push(...group.blocks);
        continue;
      }
      const aside = /^aside:\s*/i.test(group.title);
      const card = /^card:\s*/i.test(group.title);
      const panel = {
        title: group.title.replace(/^(aside|card):\s*/i, ''),
        blocks: group.blocks,
        aside,
        table: null
      };
      if (aside) asides.push(panel);
      else if (card) cards.push(panel);
      else mains.push(panel);
    }
    const primary = document.createElement('div');
    primary.className = 'console-primary';
    for (const block of rest) primary.appendChild(renderRichBlock(block));
    mains.forEach((panel, index) => primary.appendChild(renderPanel(panel, index)));
    if (cards.length) {
      const pair = document.createElement('div');
      pair.className = 'console-primary is-pair';
      cards.forEach((panel, index) => pair.appendChild(renderPanel(panel, index)));
      primary.appendChild(pair);
    }
    body.appendChild(primary);
    if (asides.length) {
      const side = document.createElement('div');
      side.className = 'console-side';
      for (const panel of asides) side.appendChild(renderPanel(panel, 0));
      body.appendChild(side);
    }
    frame.appendChild(body);
    if (below.length) {
      const foot = document.createElement('div');
      foot.className = 'console-below';
      for (const block of below) foot.appendChild(renderRichBlock(block));
      frame.appendChild(foot);
    }
    return frame;
  }

  function renderPanel(panel, index) {
    const node = document.createElement('section');
    const warn = /scan|flag/i.test(panel.title);
    node.className = panel.aside ? 'console-panel is-aside' : `console-panel${warn ? ' is-warn' : ''}${index === 1 && !panel.aside ? ' is-second' : ''}`;
    const head = document.createElement('div');
    head.className = 'panel-head';
    if (panel.title) head.appendChild(textEl('h4', panel.title));
    const edit = panel.blocks.find((block) => block.type === 'paragraph' && /^edit$/i.test(block.text.trim()));
    if (edit) head.appendChild(textEl('p', edit.text, 'panel-edit'));
    if (head.childNodes.length) node.appendChild(head);
    let titled = false;
    for (const block of panel.blocks) {
      if (block === edit) continue;
      if (!titled && block.type === 'paragraph' && /^\*\*[^*]+\*\*$/.test(block.text.trim())) {
        node.appendChild(textEl('p', block.text, 'panel-title'));
        titled = true;
        continue;
      }
      node.appendChild(renderRichBlock(block));
    }
    if (panel.table) node.appendChild(renderTable(panel.table));
    return node;
  }

  function renderTable(group) {
    const headers = group.title.split('|').map((cell) => cell.trim());
    const table = document.createElement('table');
    const head = document.createElement('tr');
    for (const header of headers) head.appendChild(textEl('th', header));
    table.appendChild(head);
    for (const item of bulletItems(group.blocks)) {
      const row = document.createElement('tr');
      for (const cell of itemText(item).split('|').map((part) => part.trim())) {
        const data = textEl('td', cell);
        if (/affected/i.test(cell)) data.classList.add('is-affected');
        row.appendChild(data);
      }
      table.appendChild(row);
    }
    return table;
  }

  function renderCompare(inner, slide, slideIndex) {
    appendKicker(inner, slide.kicker);
    if (slide.heading) inner.appendChild(textEl('h1', slide.heading));
    if (slide.subheading) inner.appendChild(textEl('h2', slide.subheading));
    const { sections } = sectionBlocks(slide.blocks);
    const cols = document.createElement('div');
    cols.className = 'compare-cols';
    sections.filter((section) => !reservedTitle(section.title)).forEach((section, index) => {
      const col = document.createElement('div');
      col.className = `compare-col ${index === 0 ? 'is-today' : 'is-next'}`;
      col.appendChild(textEl('h3', section.title));
      let lede = false;
      let pending = null;
      const steps = [];
      for (const block of section.blocks) {
        if (!lede && block.type === 'paragraph') {
          col.appendChild(textEl('p', block.text, 'compare-lede'));
          lede = true;
          continue;
        }
        if (block.type === 'quote') {
          if (pending) steps.push(pending);
          pending = { label: block.text, body: '' };
          continue;
        }
        if (pending && block.type === 'paragraph' && !pending.body) {
          pending.body = block.text;
          steps.push(pending);
          pending = null;
        }
      }
      if (pending) steps.push(pending);
      const list = document.createElement('div');
      list.className = 'compare-steps';
      for (const step of steps) {
        const outcome = /case submitted/i.test(step.label);
        const card = document.createElement('div');
        card.className = outcome ? 'compare-outcome' : 'compare-step';
        card.appendChild(textEl('p', step.label, outcome ? 'compare-outcome-label' : 'compare-label'));
        if (step.body && !outcome) card.appendChild(textEl('p', step.body, 'compare-body'));
        list.appendChild(card);
      }
      col.appendChild(list);
      cols.appendChild(col);
    });
    inner.append(cols, renderFooter(slideIndex));
  }

  function renderRichBlock(block) {
    if (block.type === 'quote') return textEl('blockquote', block.text);
    if (block.type === 'h4') return textEl('h4', block.text);
    if (block.type === 'bullets') {
      const list = document.createElement('ul');
      const items = block.items.map(itemText);
      if (items.every((item) => /^(\[[ xX]\]|\d+)\b/.test(item))) list.className = 'check-list';
      for (const item of items) {
        const line = document.createElement('li');
        const check = item.match(/^\[([ xX])\]\s*(.*)$/);
        const numbered = item.match(/^(\d+)\s+(.*)$/);
        if (check) {
          line.className = 'is-check';
          const box = document.createElement('span');
          box.className = check[1].toLowerCase() === 'x' ? 'check is-on' : 'check';
          box.setAttribute('aria-hidden', 'true');
          line.appendChild(box);
          const body = document.createElement('span');
          body.innerHTML = inline(check[2]);
          line.appendChild(body);
        } else if (numbered && list.className === 'check-list') {
          line.className = 'is-num';
          const badge = document.createElement('span');
          badge.className = 'num-badge';
          badge.textContent = numbered[1];
          line.appendChild(badge);
          const body = document.createElement('span');
          body.innerHTML = inline(numbered[2]);
          line.appendChild(body);
        } else {
          line.innerHTML = inline(item);
        }
        list.appendChild(line);
      }
      return list;
    }
    if (block.type === 'paragraph' && /\.[a-z]{2,}/i.test(block.text) && !block.text.includes('**') && block.text.length < 90) {
      return textEl('p', block.text, 'domain-line');
    }
    if (block.type === 'paragraph' && /^\*\*[^*]+\*\*$/.test(block.text.trim())) {
      return textEl('p', block.text, buttonClass(block.text));
    }
    if (block.type === 'paragraph' && /vendor verification needed/i.test(block.text)) {
      return textEl('p', block.text, 'vendor-label');
    }
    return textEl('p', block.text);
  }

  function buttonClass(text) {
    const label = text.replace(/\*/g, '').trim().toLowerCase();
    if (/edit/.test(label) && !/submit/.test(label)) return 'text-btn is-secondary';
    return 'text-btn is-primary';
  }

  function renderPath(text) {
    const path = document.createElement('p');
    path.className = 'stages-path';
    const parts = text.split(/\s+\/\s+/);
    parts.forEach((part, index) => {
      if (index > 0) {
        const slash = document.createElement('span');
        slash.className = 'path-slash';
        slash.textContent = '/';
        path.appendChild(slash);
      }
      const item = document.createElement('span');
      item.textContent = part;
      if (index === 0) item.className = 'is-strong';
      path.appendChild(item);
    });
    return path;
  }

  function appendReserved(parent, sections) {
    const banner = sections.find((section) => reservedTitle(section.title) === 'banner');
    const caption = sections.find((section) => reservedTitle(section.title) === 'caption');
    if (banner) {
      const text = banner.blocks.find((block) => block.type === 'paragraph');
      if (text) parent.appendChild(textEl('p', text.text, 'slide-banner'));
    }
    if (caption) {
      const text = caption.blocks.find((block) => block.type === 'paragraph');
      if (text) parent.appendChild(textEl('p', text.text, 'slide-caption'));
    }
  }

  function renderFooter(slideIndex) {
    const footer = document.createElement('footer');
    footer.className = 'slide-footer';
    footer.appendChild(textEl('p', '', 'slide-footer-label'));
    footer.appendChild(textEl('p', String(slideIndex + 1).padStart(2, '0'), 'slide-footer-num'));
    return footer;
  }

  function renderStatGrid(title) {
    const match = String(title).match(/^(\d+)\s+of\s+(\d+)$/i);
    const filled = match ? Number(match[1]) : 0;
    const total = match ? Number(match[2]) : 0;
    const grid = document.createElement('div');
    grid.className = 'stat-grid';
    grid.style.setProperty('--stat-cols', '10');
    for (let index = 0; index < total; index += 1) {
      const cell = document.createElement('span');
      if (index < filled) cell.className = 'is-on';
      grid.appendChild(cell);
    }
    return grid;
  }

  function sectionBlocks(blocks) {
    const lead = [];
    const sections = [];
    let current = null;
    for (const block of blocks || []) {
      if (block.type === 'h3') {
        current = { title: block.text, blocks: [] };
        sections.push(current);
      } else if (current) current.blocks.push(block);
      else lead.push(block);
    }
    return { lead, sections };
  }

  function panels(blocks) {
    const intro = [];
    const groups = [];
    let current = null;
    for (const block of blocks || []) {
      if (block.type === 'h4') {
        current = { title: block.text, blocks: [] };
        groups.push(current);
      } else if (current) current.blocks.push(block);
      else intro.push(block);
    }
    return { intro, groups };
  }

  function consumeCards(blocks) {
    const nodes = [];
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      if (block.type === 'quote') {
        const next = blocks[index + 1];
        const body = next && next.type === 'paragraph' ? next.text : '';
        if (body) index += 1;
        nodes.push({ type: 'card', label: block.text, body });
      } else nodes.push(block);
    }
    return nodes;
  }

  function bulletItems(blocks) {
    return (blocks || []).filter((block) => block.type === 'bullets').flatMap((block) => block.items);
  }

  function reservedTitle(title) {
    const name = String(title || '').trim().toLowerCase();
    if (name === 'path' || name === 'banner' || name === 'caption') return name;
    return '';
  }

  function laneClass(title) {
    if (/support/i.test(title)) return 'is-support';
    if (/security/i.test(title)) return 'is-security';
    return '';
  }

  function textEl(tag, value, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.innerHTML = inline(value);
    return node;
  }

  function inline(value) {
    return escapeHtml(value)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function safeUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' ? parsed.href : '';
    } catch {
      return '';
    }
  }
}());
