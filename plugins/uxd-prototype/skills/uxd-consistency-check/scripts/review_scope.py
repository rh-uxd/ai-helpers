"""Small shared contracts for approved paths and frozen Markdown sections."""
from pathlib import Path, PurePosixPath
import re
import unicodedata
from urllib.parse import unquote


def code_scope(value, workspace):
    from guideline_resolver import _confined
    if (not isinstance(value, dict) or set(value) != {'kind', 'directories', 'files'}
            or value['kind'] != 'code_paths'):
        raise ValueError('structured approved code-path scope required')
    result = {'kind': 'code_paths'}
    for field in ('directories', 'files'):
        paths = value[field]
        if not isinstance(paths, list) or any(not isinstance(p, str) or not p for p in paths):
            raise ValueError('scope paths must be explicit relative path arrays')
        normalized = []
        for path in paths:
            if (Path(path).is_absolute() or '\\' in path or '..' in Path(path).parts
                    or ':' in path or PurePosixPath(path).as_posix() != path):
                raise ValueError('scope paths must be canonical workspace-relative paths')
            _confined(path, Path(workspace))
            normalized.append(path)
        if len(set(normalized)) != len(normalized):
            raise ValueError('duplicate approved scope path')
        result[field] = sorted(normalized)
    if not result['directories'] and not result['files']:
        raise ValueError('approved code scope cannot be empty')
    return result


def in_code_scope(name, scope):
    path = PurePosixPath(name)
    return name in scope['files'] or any(path.is_relative_to(PurePosixPath(p)) for p in scope['directories'])


def normalized_text(text):
    # Hashing uses original bytes elsewhere. Only this location view is normalized.
    return text.replace('\r\n', '\n').replace('\r', '\n')


def heading_sections(text):
    """ATX headings outside fenced code, with GitHub-style duplicate suffixes."""
    view = normalized_text(text)
    entries, counts = [], {}
    fence = None
    offset = 0
    for line in view.splitlines(keepends=True):
        marker = re.match(r'^\s{0,3}(`{3,}|~{3,})', line)
        if marker:
            token = marker.group(1)
            if fence is None:
                fence = (token[0], len(token))
            elif token[0] == fence[0] and len(token) >= fence[1]:
                fence = None
        elif fence is None:
            match = re.match(r'^\s{0,3}(#{1,6})[ \t]+(.+?)[ \t]*\n?$', line)
            if match:
                title = re.sub(r'[ \t]+#+[ \t]*$', '', match.group(2)).strip()
                slug = ''.join(c for c in title.lower() if c in '-_ ' or unicodedata.category(c)[0] in 'LN')
                slug = slug.replace(' ', '-')
                number = counts.get(slug, 0)
                counts[slug] = number + 1
                entries.append({'heading': title, 'anchor': slug + (f'-{number}' if number else ''),
                                'start': offset, 'level': len(match.group(1))})
        offset += len(line)
    for index, entry in enumerate(entries):
        entry['end'] = next((later['start'] for later in entries[index + 1:] if later['level'] <= entry['level']), len(view))
    return view, entries


def section_scope(text, value):
    view, entries = heading_sections(text)
    if value == {'kind': 'whole_document'}:
        return {'kind': 'whole_document', 'start': 0, 'end': len(view)}
    if not isinstance(value, dict) or set(value) != {'kind', 'anchor'} or value['kind'] != 'section':
        raise ValueError('explicit whole-document or selected section scope required')
    anchor = unquote(value['anchor']) if isinstance(value['anchor'], str) else ''
    matches = [entry for entry in entries if entry['anchor'] == anchor]
    if not anchor or len(matches) != 1:
        raise ValueError('selected guideline anchor is missing or invalid')
    entry = matches[0]
    return {'kind': 'section', 'anchor': anchor, 'heading': entry['heading'], 'start': entry['start'], 'end': entry['end']}
