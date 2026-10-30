#!/usr/bin/env python3
"""Render local decision reviews and record submitted choices (Python 3, stdlib)."""

import argparse
from copy import deepcopy
from datetime import datetime, timezone
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import tempfile


TEMPLATE = Path(__file__).resolve().parent.parent / 'references/decision-page-template.html'


def validate(data):
    """Validate identities and the existing downstream decision contract."""
    if not isinstance(data, dict):
        raise ValueError('Decision kit must be a JSON object')
    if not isinstance(data.get('rfeKey'), str) or not data['rfeKey']:
        raise ValueError('rfeKey must identify this prototype')
    if not isinstance(data.get('decisions'), list):
        raise ValueError('decisions must be a list')
    ids = set()
    for item in data['decisions']:
        if not isinstance(item, dict):
            raise ValueError('Each decision must be a JSON object')
        key = item.get('id', '')
        if not isinstance(key, str) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', key) or key in ids:
            raise ValueError('Decision IDs must be unique, lowercase slugs')
        ids.add(key)
        options = item.get('options')
        if not isinstance(options, list) or len(options) < 2 or any(not isinstance(opt, str) or not opt or opt == 'custom' for opt in options) or len(set(options)) != len(options):
            raise ValueError(f'{key}: options must contain at least two unique nonempty strings')
        if item.get('recommended') not in options:
            raise ValueError(f'{key}: AI suggestion needs a valid option')
        status = item.get('status')
        chosen = item.get('chosenOption')
        if status not in ('pending', 'auto-resolved', 'user-decided'):
            raise ValueError(f'{key}: invalid status')
        if status == 'pending' and chosen is not None:
            raise ValueError(f'{key}: pending decisions cannot have accepted choices')
        if status != 'pending' and chosen not in options + ['custom']:
            raise ValueError(f'{key}: invalid accepted choice')
        if chosen == 'custom' and not item.get('chosenTitle'):
            raise ValueError(f'{key}: custom choice needs a description')


def apply_choices(data, response):
    """Return an updated copy; validate the entire batch before any disk write."""
    validate(data)
    if not isinstance(response, dict):
        raise ValueError('Response must be a JSON object')
    if response.get('prototypeId') != data['rfeKey']:
        raise ValueError('Response belongs to a different prototype')
    choices = response.get('choices')
    if not isinstance(choices, dict) or not choices:
        raise ValueError('Response needs at least one choice')
    result = deepcopy(data)
    by_id = {item['id']: item for item in result['decisions']}
    for key, choice in choices.items():
        if key not in by_id:
            raise ValueError(f'Unknown decision: {key}')
        item = by_id[key]
        custom = isinstance(choice, dict) and choice.get('option') == 'custom'
        if custom:
            title = choice.get('title')
            reasoning = choice.get('reasoning')
            if not isinstance(title, str) or not title.strip() or not isinstance(reasoning, str) or not reasoning.strip():
                raise ValueError(f'{key}: custom answer needs title and reasoning')
            title = title.strip()
            selected, summary = 'custom', title
        else:
            if not isinstance(choice, str) or choice not in item['options']:
                raise ValueError(f'{key}: unknown option')
            selected = choice
            detail = next((opt for opt in item.get('optionDetails', []) if opt['id'] == choice), {})
            title = detail.get('title', choice)
            summary = detail.get('description', title)
            reasoning = 'Selected by the user during review.'
        # Batch-copying an unchanged AI pick does not relabel it as a human decision.
        if item.get('chosenOption') == selected and item['status'] != 'pending' and (selected != 'custom' or item.get('chosenTitle') == title):
            continue
        item.update(chosenOption=selected, chosenTitle=title, reasoning=reasoning,
                    summary=summary, status='user-decided',
                    decidedAt=datetime.now(timezone.utc).isoformat())
    validate(result)
    return result


def atomic_json(path, data):
    """Replace only after a complete JSON file has been written beside the original."""
    temporary = None
    try:
        with tempfile.NamedTemporaryFile('w', dir=path.parent, encoding='utf-8', delete=False) as handle:
            temporary = Path(handle.name)
            json.dump(data, handle, indent=2, ensure_ascii=False)
            handle.write('\n')
        temporary.replace(path)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()


def text(value):
    return escape(str(value), quote=True)


_DROPPED_TAGS = {'script', 'iframe', 'object', 'embed'}


class _PreviewFilter(HTMLParser):
    """Keep preview markup and drop tags and attributes that can run code."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        self._start(tag, attrs, False)

    def handle_startendtag(self, tag, attrs):
        self._start(tag, attrs, True)

    def handle_endtag(self, tag):
        if tag in _DROPPED_TAGS:
            if self._skip:
                self._skip -= 1
            return
        if not self._skip:
            self.parts.append(f'</{tag}>')

    def handle_data(self, data):
        if not self._skip:
            self.parts.append(escape(data))

    def _start(self, tag, attrs, empty):
        if tag in _DROPPED_TAGS:
            if not empty:
                self._skip += 1
            return
        if self._skip:
            return
        kept = []
        for name, value in attrs:
            if name.startswith('on'):
                continue
            if value is not None and value.strip().lower().startswith('javascript:'):
                continue
            if value is None:
                kept.append(escape(name, quote=True))
            else:
                kept.append(f'{escape(name, quote=True)}="{escape(value, quote=True)}"')
        attributes = f' {" ".join(kept)}' if kept else ''
        closing = ' /' if empty else ''
        self.parts.append(f'<{tag}{attributes}{closing}>')


def preview(value):
    parser = _PreviewFilter()
    parser.feed(str(value))
    parser.close()
    return ''.join(parser.parts)


def badge(label, color='blue'):
    return (f'<span class="pf-v6-c-label pf-m-{color}"><span class="pf-v6-c-label__content">'
            f'<span class="pf-v6-c-label__text">{text(label)}</span></span></span>')


def option_card(item, option):
    key, letter = item['id'], option['id']
    selected = item.get('chosenOption') == letter
    suggested = item['recommended'] == letter
    input_id = f'choice-{key}-{letter}'
    suggestion = badge('AI suggestion') if suggested else ''
    rationale = (f'<p class="suggestion-reason"><strong>Why this fits:</strong> '
                 f'{text(item["recommendationReason"])}</p>') if suggested else ''
    lists = ''.join(f'<div><h4 class="tradeoff-heading">{heading}</h4><ul class="pf-v6-c-list">' +
                    ''.join(f'<li>{text(value)}</li>' for value in option.get(field, [])) + '</ul></div>'
                    for heading, field in [('Benefits', 'pros'), ('Tradeoffs', 'cons')])
    return (f'<article class="pf-v6-c-card pf-m-selectable option-card">'
            f'<div class="pf-v6-c-card__header">'
            f'<div class="pf-v6-c-card__header-main choice-heading">'
            f'<input class="pf-v6-c-radio__input" id="{text(input_id)}" type="radio" '
            f'name="{text(key)}" data-decision="{text(key)}" value="{text(letter)}"'
            f'{" checked" if selected else ""}>'
            f'<div class="pf-v6-c-card__title"><p class="option-letter">Option {text(letter)}</p>'
            f'<h3 class="pf-v6-c-card__title-text"><label for="{text(input_id)}">{text(option["title"])}</label></h3>'
            f'</div></div>{suggestion}</div>'
            f'<div class="pf-v6-c-card__body"><p class="option-description">{text(option.get("description", ""))}</p>'
            f'<div class="visual-preview" inert aria-label="{text(option["title"])} preview">{preview(option["previewHtml"])}</div>'
            f'{rationale}<div class="tradeoffs">{lists}</div></div>'
            f'<div class="pf-v6-c-card__footer"><p class="when-to-use"><strong>Best for:</strong> '
            f'{text(option.get("whenToUse", ""))}</p></div></article>')


def decision_section(item, number, total):
    if not item.get('recommendationReason'):
        raise ValueError(f'{item["id"]}: add an AI suggestion rationale before rendering')
    details = item.get('optionDetails', [])
    if [opt['id'] for opt in details] != item['options'] or any(not opt.get('previewHtml', '').strip() for opt in details):
        raise ValueError(f'{item["id"]}: optionDetails must match options and include rendered previews')
    cards = ''.join(option_card(item, option) for option in details)
    head = ''.join(f'<th scope="col">{text(opt["title"])}</th>' for opt in details)
    comparison_rows = item.get('comparison', [])
    if not isinstance(comparison_rows, list):
        raise ValueError(f'{item["id"]}: comparison must be a list')
    for row_number, row in enumerate(comparison_rows, 1):
        if not isinstance(row, dict) or not isinstance(row.get('dimension'), str) or not row['dimension'].strip():
            raise ValueError(f'{item["id"]}: comparison row {row_number} needs a dimension')
        if not isinstance(row.get('values'), dict) or any(letter not in row['values'] for letter in item['options']):
            raise ValueError(f'{item["id"]}: comparison row {row_number} needs values for every option')
    rows = ''.join('<tr><th scope="row">' + text(row['dimension']) + '</th>' +
                   ''.join(f'<td>{text(row["values"][letter])}</td>' for letter in item['options']) + '</tr>'
                   for row in comparison_rows)
    comparison = (f'<div class="comparison"><h3 class="comparison-heading">Compare the options</h3>'
                  f'<div class="table-scroll"><table class="pf-v6-c-table pf-m-compact">'
                  f'<caption class="pf-v6-u-screen-reader">Compare options for {text(item["title"])}</caption><thead><tr>'
                  f'<th scope="col">Consideration</th>{head}</tr></thead><tbody>{rows}</tbody></table></div></div>') if rows else ''
    custom = f'<p class="custom-choice">Your custom choice: {text(item["chosenTitle"])}</p>' if item.get('chosenOption') == 'custom' else ''
    return (f'<section class="decision" id="{text(item["id"])}" aria-labelledby="heading-{text(item["id"])}">'
            f'<header class="decision-heading"><p class="eyebrow">Decision {number} of {total}</p>'
            f'<h2 id="heading-{text(item["id"])}" class="pf-v6-c-title pf-m-xl">{text(item["title"])}</h2>'
            f'<p class="decision-context">{text(item.get("context", ""))}</p>{custom}</header>'
            f'<fieldset class="decision-options"><legend class="pf-v6-u-screen-reader">{text(item["title"])}</legend>'
            f'<div class="options-grid">{cards}</div></fieldset>{comparison}</section>')


RESPONSE = '''<section class="pf-v6-c-card response-panel" aria-labelledby="response-heading">
  <div class="pf-v6-c-card__title">
    <h2 id="response-heading" class="pf-v6-c-card__title-text">Send your choices back to the agent</h2>
  </div>
  <div class="pf-v6-c-card__body">
    <p class="response-instructions">Copy your response and paste it into your conversation.</p>
    <p id="choice-progress" class="choice-progress" role="status" aria-live="polite"></p>
    <label class="pf-v6-u-screen-reader" for="choice-response">Your response</label>
    <textarea id="choice-response" class="response-text" readonly spellcheck="false" rows="5"></textarea>
  </div>
  <div class="pf-v6-c-card__footer response-actions">
    <button type="button" id="copy-response" class="pf-v6-c-button pf-m-primary"><span class="pf-v6-c-button__text">Copy response</span></button>
    <p id="copy-status" role="status" aria-live="polite"></p>
  </div>
</section>'''


def render(data, directory):
    """Render one report. Legacy htmlFile values are ignored, never used as paths."""
    validate(data)
    decisions = data['decisions']
    if not decisions:
        (directory / 'index.html').unlink(missing_ok=True)
        return []
    template = TEMPLATE.read_text(encoding='utf-8')
    payload = {
        'prototypeId': data['rfeKey'],
        'decisions': [{
            'id': item['id'], 'title': item['title'],
            'options': [{'id': option['id'], 'title': option['title']} for option in item.get('optionDetails', [])],
            'custom': {'title': item['chosenTitle'], 'reasoning': item.get('reasoning', '')}
            if item.get('chosenOption') == 'custom' else None,
        } for item in decisions],
    }
    # Script data must not terminate its HTML container, even with source-derived copy.
    encoded = json.dumps(payload).replace('&', '\\u0026').replace('<', '\\u003c').replace('>', '\\u003e')
    sections = ''.join(decision_section(item, number, len(decisions)) for number, item in enumerate(decisions, 1))
    replacements = {
        'TITLE': 'Review design choices',
        'PROJECT': text(data.get('projectName', data['rfeKey'])),
        'DESCRIPTION': text(data.get('projectDescription', '')),
        'CONTENT': sections, 'RESPONSE': RESPONSE, 'DATA': encoded,
    }
    # Prepare the complete report before writing; invalid content leaves existing output intact.
    page = re.sub(r'@@(TITLE|PROJECT|DESCRIPTION|CONTENT|RESPONSE|DATA)@@', lambda match: replacements[match[1]], template)
    directory.mkdir(parents=True, exist_ok=True)
    (directory / 'index.html').write_text(page, encoding='utf-8')
    return ['index.html']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['render', 'apply'])
    parser.add_argument('decisions', type=Path)
    parser.add_argument('--response', type=Path, help='Submitted or normalized response JSON (apply only)')
    args = parser.parse_args()
    try:
        data = json.loads(args.decisions.read_text(encoding='utf-8'))
        if args.command == 'render':
            paths = render(data, args.decisions.parent)
            print(f'Rendered {len(paths)} review report(s) in {args.decisions.parent.resolve()}')
        else:
            if not args.response:
                parser.error('apply requires --response')
            response = json.loads(args.response.read_text(encoding='utf-8'))
            updated = apply_choices(data, response)
            atomic_json(args.decisions, updated)
            pending = sum(item['status'] == 'pending' for item in updated['decisions'])
            print(f'Choices recorded. {pending} pending. Review pages were not rebuilt.')
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f'Error: {error}\n')


if __name__ == '__main__':
    main()
