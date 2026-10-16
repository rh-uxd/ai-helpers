"""Run: python3 -m unittest discover -s plugins/uxd-prototype/skills/uxd-prototype-create/tests"""

from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/decision_kit.py'
SPEC = importlib.util.spec_from_file_location('decision_kit', SCRIPT)
kit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(kit)


def fixture():
    decisions = []
    for index, key in enumerate(['edit-context', 'bulk-actions'], 1):
        decisions.append({
            'id': key, 'title': key.replace('-', ' ').title(), 'context': 'Manage resources.',
            'status': 'pending', 'chosenOption': None, 'chosenTitle': None,
            'reasoning': '', 'options': ['A', 'B'], 'recommended': 'A',
            'recommendationReason': 'Preserves the resource list context.',
            'htmlFile': f'{index:02}-{key}.html', 'decidedAt': None, 'summary': '',
            'optionDetails': [
                {'id': letter, 'title': title, 'description': f'Edit in a {title.lower()}.',
                 'previewHtml': f'<form><label>Resource name <input value="Example resource"></label><button>Save in {title}</button></form>',
                 'pros': ['Keeps task context'], 'cons': ['Requires space'], 'whenToUse': 'Resource editing.'}
                for letter, title in [('A', 'Side panel'), ('B', 'Dedicated page')]]
        })
    return {'projectName': 'Resource settings', 'projectDescription': 'Choose how to edit resources.',
            'rfeKey': 'PROJ-298', 'createdAt': '2026-10-15T14:00:00Z', 'workspace': 'standalone', 'decisions': decisions}


class DecisionKitTests(unittest.TestCase):
    def test_partial_then_complete_preserves_other_answers(self):
        original = fixture()
        partial = kit.apply_choices(original, {'prototypeId': 'PROJ-298', 'choices': {'edit-context': 'B'}})
        self.assertEqual(original['decisions'][0]['status'], 'pending')
        self.assertEqual(partial['decisions'][0]['chosenTitle'], 'Dedicated page')
        self.assertEqual(partial['decisions'][1], original['decisions'][1])
        complete = kit.apply_choices(partial, {'prototypeId': 'PROJ-298', 'choices': {'bulk-actions': 'A'}})
        self.assertEqual(complete['decisions'][0], partial['decisions'][0])
        self.assertTrue(all(item['status'] == 'user-decided' for item in complete['decisions']))

    def test_invalid_batch_rejects_all_changes(self):
        original = fixture()
        before = deepcopy(original)
        for response in [
            {'prototypeId': 'OTHER-298', 'choices': {'edit-context': 'A'}},
            {'prototypeId': 'PROJ-298', 'choices': {'edit-context': 'A', 'bulk-actions': 'Z'}},
            {'prototypeId': 'PROJ-298', 'choices': {'unknown': 'A'}},
            {'prototypeId': 'PROJ-298', 'choices': {}},
            {'prototypeId': 'PROJ-298', 'choices': {'edit-context': {'option': 'custom', 'title': 'Something'}}},
        ]:
            with self.subTest(response=response), self.assertRaises(ValueError):
                kit.apply_choices(original, response)
        self.assertEqual(original, before)

    def test_auto_choices_keep_provenance_on_batch_acceptance(self):
        data = fixture()
        data['decisions'][0].update(status='auto-resolved', chosenOption='A', chosenTitle='Side panel',
                                    reasoning='Preserves context.', decidedAt='2026-10-15T14:00:00Z')
        result = kit.apply_choices(data, {'prototypeId': 'PROJ-298', 'choices': {'edit-context': 'A'}})
        self.assertEqual(result['decisions'][0], data['decisions'][0])
        result = kit.apply_choices(data, {'prototypeId': 'PROJ-298', 'choices': {'edit-context': 'B'}})
        self.assertEqual(result['decisions'][0]['status'], 'user-decided')
        self.assertEqual(result['decisions'][0]['recommended'], 'A')

    def test_legacy_records_can_accept_answers_before_page_content_is_migrated(self):
        data = fixture()
        for item in data['decisions']:
            del item['recommendationReason']
            del item['optionDetails']
        result = kit.apply_choices(data, {'prototypeId': 'PROJ-298', 'choices': {'edit-context': 'B'}})
        self.assertEqual(result['decisions'][0]['chosenOption'], 'B')
        self.assertEqual(result['decisions'][1]['status'], 'pending')

    def test_invalid_page_content_writes_no_partial_kit(self):
        data = fixture()
        del data['decisions'][1]['optionDetails'][0]['previewHtml']
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(ValueError):
                kit.render(data, Path(folder))
            self.assertEqual(list(Path(folder).iterdir()), [])

    def test_custom_choice_is_recorded_and_renders(self):
        result = kit.apply_choices(fixture(), {'prototypeId': 'PROJ-298', 'choices': {
            'edit-context': {'option': 'custom', 'title': 'Inline editor', 'reasoning': 'Only one short field.'}}})
        self.assertEqual(result['decisions'][0]['chosenOption'], 'custom')
        with tempfile.TemporaryDirectory() as folder:
            kit.render(result, Path(folder))
            self.assertIn('Inline editor', (Path(folder) / 'index.html').read_text())

    def test_render_accepts_variable_options_and_preserves_json(self):
        data = fixture()
        data['decisions'][0]['options'].append('C')
        data['decisions'][0]['optionDetails'].append({**data['decisions'][0]['optionDetails'][0], 'id': 'C', 'title': 'Inline editor'})
        before = deepcopy(data)
        with tempfile.TemporaryDirectory() as folder:
            directory = Path(folder)
            self.assertEqual(kit.render(data, directory), ['index.html'])
            html = (directory / 'index.html').read_text()
            self.assertEqual(html.count('type="radio"'), 5)
            self.assertEqual([file.name for file in directory.glob('*.html')], ['index.html'])
            self.assertNotIn('<nav', html)
            for item in data['decisions']:
                self.assertIn(f'id="{item["id"]}"', html)
                self.assertIn(item['title'], html)
            self.assertEqual(html.count('AI suggestion'), len(data['decisions']))
            self.assertNotIn('use-suggestions', html)
            self.assertNotIn('Selections become accepted', html)
            self.assertEqual(data, before)

    def test_no_tradeoffs_needs_no_pages(self):
        data = fixture()
        data['decisions'] = []
        with tempfile.TemporaryDirectory() as folder:
            self.assertEqual(kit.render(data, Path(folder)), [])
            self.assertEqual(list(Path(folder).iterdir()), [])

    def test_duplicate_decision_ids_are_rejected(self):
        data = fixture()
        data['decisions'][1]['id'] = data['decisions'][0]['id']
        with self.assertRaises(ValueError):
            kit.validate(data)

    def test_legacy_html_paths_are_unused_and_fragment_links_are_supported(self):
        data = fixture()
        data['decisions'][0]['htmlFile'] = '../ignored.html'
        data['decisions'][1]['htmlFile'] = 'index.html#bulk-actions'
        with tempfile.TemporaryDirectory() as folder:
            kit.render(data, Path(folder))
            self.assertEqual([file.name for file in Path(folder).iterdir()], ['index.html'])

    def test_source_copy_is_escaped(self):
        data = fixture()
        data['projectDescription'] = '<script>alert("source")</script>'
        data['decisions'][0]['title'] = '<img src=x onerror=alert(1)>'
        with tempfile.TemporaryDirectory() as folder:
            kit.render(data, Path(folder))
            html = (Path(folder) / 'index.html').read_text()
            self.assertNotIn('<script>alert', html)
            self.assertNotIn('<img src=x', html)
            self.assertIn('&lt;img', html)

    def test_cli_records_without_rebuilding_and_invalid_response_leaves_disk_intact(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'decisions.json'
            response = Path(folder) / 'response.json'
            kit.atomic_json(path, fixture())
            subprocess.run([sys.executable, str(SCRIPT), 'render', str(path)], check=True, capture_output=True)
            index = Path(folder) / 'index.html'
            html, modified = index.read_bytes(), index.stat().st_mtime_ns
            response.write_text(json.dumps({'prototypeId': 'PROJ-298', 'choices': {'edit-context': 'B'}}))
            subprocess.run([sys.executable, str(SCRIPT), 'apply', str(path), '--response', str(response)], check=True, capture_output=True)
            self.assertEqual(json.loads(path.read_text())['decisions'][0]['chosenOption'], 'B')
            self.assertEqual(index.read_bytes(), html)
            self.assertEqual(index.stat().st_mtime_ns, modified)
            before = path.read_bytes()
            response.write_text(json.dumps({'prototypeId': 'PROJ-298', 'choices': {'bulk-actions': 'Z'}}))
            run = subprocess.run([sys.executable, str(SCRIPT), 'apply', str(path), '--response', str(response)], capture_output=True)
            self.assertNotEqual(run.returncode, 0)
            self.assertEqual(path.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
