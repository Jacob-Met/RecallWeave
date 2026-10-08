"""Independent analytic CSV and existing study-notes consumer, run only after freeze."""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import math
from pathlib import Path
import subprocess
import sys
import unittest


HERE = Path(__file__).resolve().parent
HEADER = [
    'sample_index', 'time_seconds', 'reference_hz', 'sample_rate_hz',
    'comparison_hz', 'lowest_alias_hz', 'reference_value', 'comparison_value',
]
BOUNDARY_ID = 'sampling-assumption-boundary'
TOLERANCE = 2e-12
RUN = {}


def identity(data):
    return {
        'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
        'git_blob': hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest(),
    }


def write_json(path, value):
    with path.open('x', encoding='utf-8') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')


def source_map(candidate):
    mapped = {}
    for path in sorted(candidate.rglob('*')):
        if path.is_symlink():
            raise RuntimeError(f'Unexpected candidate symlink: {path}')
        if path.is_file():
            mapped[path.relative_to(candidate).as_posix()] = identity(path.read_bytes())
    return mapped


class SamplingConsumer(unittest.TestCase):
    def consume(self, operation, **payload):
        directory = RUN['output'] / self._testMethodName
        directory.mkdir()
        request = {'operation': operation, **payload}
        request_path = directory / 'request.json'
        write_json(request_path, request)
        child_output = directory / 'native'
        command = [RUN['node'], str(HERE / 'consume_native.mjs'), str(RUN['candidate']), str(request_path), str(child_output)]
        process = subprocess.run(command, text=True, capture_output=True, check=False)
        write_json(directory / 'invocation.json', {
            'command': command, 'returncode': process.returncode,
            'stdout': process.stdout, 'stderr': process.stderr,
        })
        RUN['native_processes'] += 1
        self.assertEqual(process.returncode, 0, process.stderr)
        result = json.loads((child_output / 'result.json').read_text())
        metadata = json.loads((child_output / 'process.json').read_text())
        self.assertTrue(metadata['loadedSources'])
        for name, digest in metadata['loadedSources'].items():
            self.assertEqual(digest, RUN['source_before'][name]['sha256'], name)
        RUN['processes'].append(metadata)
        return result, child_output

    def check_samples_and_csv(self, observation, directory, frequency, alias, comparison, expected):
        snapshot = observation['snapshot']
        self.assertEqual(observation['parameters'], {'frequencyHz':frequency, 'sampleRateHz':12})
        for field, value in {
            'format':'recallweave-sampling/1', 'frequencyHz':frequency,
            'sampleRateHz':12, 'aliasHz':alias, 'comparisonHz':comparison,
            'durationSeconds':1, 'halfSampleRateHz':6,
        }.items():
            self.assertEqual(snapshot[field], value, field)
        self.assertAlmostEqual(snapshot['intervalSeconds'], 1 / 12, delta=1e-15)
        self.assertNotEqual(snapshot['comparisonHz'], frequency)
        self.assertEqual(len(snapshot['samples']), 13)
        self.assertEqual(len(expected), 13)
        raw_csv = (directory / observation['csvName']).read_bytes()
        self.assertTrue(raw_csv.endswith(b'\n'))
        parsed = list(csv.reader(io.StringIO(raw_csv.decode('utf-8'), newline='')))
        self.assertEqual(parsed[0], HEADER)
        self.assertEqual(len(parsed), 14)
        for index, (sample, record, value) in enumerate(zip(snapshot['samples'], parsed[1:], expected)):
            with self.subTest(frequency=frequency, index=index):
                self.assertEqual(len(record), len(HEADER))
                numbers = [float(cell) for cell in record]
                self.assertTrue(all(math.isfinite(number) for number in numbers))
                self.assertEqual(sample['index'], index)
                self.assertAlmostEqual(sample['timeSeconds'], index / 12, delta=1e-15)
                self.assertAlmostEqual(sample['reference'], value, delta=TOLERANCE)
                self.assertAlmostEqual(sample['comparison'], value, delta=TOLERANCE)
                self.assertEqual(numbers[:6], [index, sample['timeSeconds'], frequency, 12, comparison, alias])
                self.assertEqual(numbers[6], sample['reference'])
                self.assertEqual(numbers[7], sample['comparison'])
        self.assertEqual(snapshot['samples'][0]['timeSeconds'], 0)
        self.assertEqual(snapshot['samples'][-1]['timeSeconds'], 1)
        RUN['csv_files'] += 1
        RUN['numeric_rows'] += 13

    def test_alias_periods_survive_native_csv_file_consumption(self):
        specifications = [
            ('base-2', 2, 2, 14), ('reflected-10', 10, 2, 2),
            ('shifted-14', 14, 2, 2), ('shifted-26', 26, 2, 2),
            ('dc-0', 0, 0, 12), ('dc-12', 12, 0, 0), ('dc-24', 24, 0, 0),
        ]
        cases = [{'name':name, 'parameters':{'frequencyHz':frequency, 'sampleRateHz':12}}
                 for name, frequency, _, _ in specifications]
        result, directory = self.consume('samples', cases=cases)
        self.assertEqual(len(result['observations']), len(specifications))
        period = [1, 0.5, -0.5, -1, -0.5, 0.5]
        expected_sinusoid = [period[index % 6] for index in range(13)]
        for observation, (name, frequency, alias, comparison) in zip(result['observations'], specifications):
            self.assertEqual(observation['name'], name)
            self.check_samples_and_csv(observation, directory, frequency, alias, comparison,
                                       expected_sinusoid if alias == 2 else [1] * 13)
            self.assertEqual(observation['snapshot']['relation'], 'below' if frequency in (0, 2) else 'above')
        write_json(directory.parent / 'analytic-expected.json', {
            'derivation':'Zero-phase 2 Hz at 12 samples/s has a six-point exact cosine period. Whole sample-rate shifts and cosine reflection preserve every integer sample; sample-rate multiples give DC.',
            'period':period, 'inclusive_samples':expected_sinusoid,
            'dc_inclusive_samples':[1] * 13, 'tolerance':TOLERANCE,
        })

    def test_boundary_status_and_export_keep_identical_observations_distinct(self):
        specifications = [('below', 5.5, 5.5, 17.5), ('at', 6, 6, 18), ('above', 6.5, 5.5, 5.5)]
        cases = [{'name':name, 'parameters':{'frequencyHz':frequency, 'sampleRateHz':12}}
                 for name, frequency, _, _ in specifications]
        result, directory = self.consume('samples', cases=cases)
        cosine_15 = (math.sqrt(6) + math.sqrt(2)) / 4
        cosine_75 = (math.sqrt(6) - math.sqrt(2)) / 4
        cosine_values = [1, cosine_15, math.sqrt(3)/2, math.sqrt(2)/2, 0.5, cosine_75,
                         0, -cosine_75, -0.5, -math.sqrt(2)/2, -math.sqrt(3)/2, -cosine_15, -1]
        side_values = [(-1 if index % 2 else 1) * value for index, value in enumerate(cosine_values)]
        at_values = [(-1 if index % 2 else 1) for index in range(13)]
        self.assertEqual(len(result['observations']), 3)
        for observation, (relation, frequency, alias, comparison) in zip(result['observations'], specifications):
            self.assertEqual(observation['name'], relation)
            self.assertEqual(observation['snapshot']['relation'], relation)
            self.check_samples_and_csv(observation, directory, frequency, alias, comparison,
                                       at_values if relation == 'at' else side_values)
        below, _, above = result['observations']
        for left, right in zip(below['snapshot']['samples'], above['snapshot']['samples']):
            self.assertAlmostEqual(left['reference'], right['reference'], delta=TOLERANCE)
        write_json(directory.parent / 'analytic-expected.json', {
            'derivation':'cos((pi +/- pi/12)n) = (-1)^n cos(pi*n/12). Radical values for 15-degree steps avoid using native cosine/alias helpers. At the boundary, the zero-phase cosine is (-1)^n.',
            'below_and_above':side_values, 'at_boundary':at_values, 'tolerance':TOLERANCE,
            'boundary_phase_limit':'A sine at fs/2 gives sin(pi*n)=0. The native lab fixes zero-phase cosine; its course explicitly supplies the arbitrary-phase counterexample.',
        })

    def test_course_missed_boundary_reaches_separate_retry_and_saved_notes(self):
        course_review = json.loads((HERE / 'content-review.json').read_text())
        original = (RUN['candidate'] / 'courses/sampling-aliasing.json').read_bytes()
        self.assertEqual(identity(original)['sha256'], course_review['draft_identity']['sha256'])
        original_course = json.loads(original)
        expected = {item['id']: item for item in course_review['questions']}
        self.assertEqual(len(expected), 12)
        self.assertEqual({item['id'] for item in original_course['items']}, set(expected))
        first_answers = []
        for item in original_course['items']:
            oracle = expected[item['id']]
            self.assertEqual(item['answer'], oracle['expected_answer'], item['id'])
            self.assertEqual(item['options'][oracle['expected_answer']], oracle['expected_correct_option'], item['id'])
            first_answers.append({'item':item['id'], 'choice':1 if item['id'] == BOUNDARY_ID else oracle['expected_answer']})
        result, directory = self.consume(
            'course', firstAnswers=first_answers,
            retry={'item':BOUNDARY_ID, 'choice':expected[BOUNDARY_ID]['expected_answer']},
            syntheticExportedAt='2026-10-08T12:00:00.000Z',
        )
        self.assertEqual((directory / 'course-original.json').read_bytes(), original)
        self.assertEqual(json.loads((directory / 'course-roundtrip.json').read_text()), original_course)
        self.assertEqual(result['originalReview'], result['finalReview'])
        self.assertEqual(result['originalMastery'], result['finalMastery'])
        self.assertEqual(sum(item['correct'] for item in result['originalReview']), 11)
        self.assertEqual([item['id'] for item in result['originalReview'] if not item['correct']], [BOUNDARY_ID])
        self.assertEqual(result['currentPracticeId'], BOUNDARY_ID)
        self.assertIsNone(result['nextPracticeId'])
        self.assertEqual(result['initialPractice']['answers'], [])
        self.assertEqual(result['finalPractice']['answers'], [{'item':BOUNDARY_ID, 'choice':3, 'correct':True}])
        notes_before = (directory / 'study-notes-before.txt').read_text()
        notes_after = (directory / 'study-notes-after.txt').read_text()
        self.assertEqual(notes_before, result['notesBefore']['text'])
        self.assertEqual(notes_after, result['notesAfter']['text'])
        self.assertIn('11 of 12 connections correct on the first try.', notes_before)
        self.assertIn('11 of 12 connections correct on the first try.', notes_after)
        self.assertIn('Not started. 1 missed connection is available for practice.', notes_before)
        self.assertIn('Complete: 1 of 1 practice answers recorded; 1 correct on retry.', notes_after)
        self.assertEqual(notes_after.count('Practice result: correct on retry'), 1)
        for item in original_course['items']:
            for content in [item['prompt'], item['explanation'], item['transfer'],
                            'Correct answer: ' + expected[item['id']]['expected_correct_option']]:
                self.assertIn(content, notes_before, item['id'])
                self.assertIn(content, notes_after, item['id'])
        for content in [original_course['title'], original_course['attribution'], original_course['license'],
                        'ESTIMATED MASTERY — MODEL STATE, NOT A GRADE',
                        'Practice does not change the first-session estimates.']:
            self.assertIn(content, notes_after)
        self.assertEqual(result['notesAfter']['filename'], 'recallweave-study-notes-2026-10-08.txt')
        RUN['course_consumer'] = {'questions':12, 'first_correct':11, 'retries':1, 'retry_correct':1,
                                  'first_review_and_mastery_preserved':True,
                                  'interpretation':'Explicit synthetic answers, not learner outcome data or importer/browser acceptance.'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--candidate', required=True, type=Path)
    parser.add_argument('--source-manifest', required=True, type=Path)
    parser.add_argument('--node', required=True)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    before = source_map(args.candidate)
    manifest = json.loads(args.source_manifest.read_text())
    expected = {entry['path']:entry for entry in manifest['files']}
    if set(expected) != set(before):
        raise RuntimeError('Candidate file inventory differs from frozen independent source manifest')
    for name, actual in before.items():
        if actual['sha256'] != expected[name]['sha256'] or actual['bytes'] != expected[name]['bytes']:
            raise RuntimeError(f'Candidate identity differs before native execution: {name}')
    args.output.mkdir()
    RUN.update(candidate=args.candidate.resolve(), output=args.output.resolve(), node=args.node,
               source_before=before, native_processes=0, csv_files=0, numeric_rows=0, processes=[])
    write_json(args.output / 'source-before.json', before)
    frozen_receiver = {name:identity((HERE / name).read_bytes()) for name in
                       ('receive_sampling.py', 'consume_native.mjs', 'content-review.json', 'ORACLE.md')}
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(SamplingConsumer)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    after = source_map(args.candidate)
    write_json(args.output / 'source-after.json', after)
    receiver_after = {name:identity((HERE / name).read_bytes()) for name in frozen_receiver}
    passed = result.wasSuccessful() and before == after and frozen_receiver == receiver_after
    write_json(args.output / 'receipt.json', {
        'schema':'recallweave.independent-receiving.v1', 'status':'passed' if passed else 'failed',
        'methods':result.testsRun, 'failures':len(result.failures), 'errors':len(result.errors),
        'skips':len(result.skipped), 'native_node_processes':RUN['native_processes'],
        'python_standard_csv_reader_processes':1, 'csv_files':RUN['csv_files'],
        'numeric_rows':RUN['numeric_rows'], 'course_consumer':RUN.get('course_consumer'),
        'source_files':len(before), 'source_unchanged':before == after,
        'source_manifest':identity(args.source_manifest.read_bytes()),
        'receiver_before':frozen_receiver, 'receiver_after':receiver_after,
        'receiver_unchanged':frozen_receiver == receiver_after,
        'python':sys.version, 'python_executable':sys.executable,
        'native_processes':RUN['processes'],
        'author_suite_replays':0, 'baseline_replays':0, 'browser_runs':0,
        'interpretation':'Native numeric snapshot rows, emitted CSV and existing course/review/study-notes APIs. No authored UI/browser scenario replay, real learner data, model-validity or importer-adoption claim.',
    })
    return 0 if passed else 1


if __name__ == '__main__':
    raise SystemExit(main())
