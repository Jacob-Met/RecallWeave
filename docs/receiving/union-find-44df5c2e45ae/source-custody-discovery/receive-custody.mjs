import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const root = path.dirname(new URL(import.meta.url).pathname);
const producer = '/home/jacob/recallweave-union-find-44df5c2e45ae';
const baseline = '02618a196ee049e90059aca70b968260a097c11a';
const candidate = '2b8aafb30d6d7cd9fc7b1f7f9d6434c5abed17ab';
const original = '/home/jacob/recallweave-union-find-independent-handoff-44df5c2e45ae';
const prefix = 'docs/receiving/union-find-44df5c2e45ae/';
const pin = bytes => ({ bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
const git = (...args) => execFileSync('git', ['-C', producer, ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const blob = (rev, file) => execFileSync('git', ['-C', producer, 'show', rev + ':' + file], { maxBuffer: 16 * 1024 * 1024 });
const sourcePin = (rev, file) => ({ path: file, blob: git('rev-parse', rev + ':' + file).trim(), ...pin(blob(rev, file)) });
const result = {
  format: 'recallweave-discovery-source-custody/1',
  owner: 'estate-44df5c2e45ae/source_integration',
  started_at: new Date().toISOString(),
  node: process.version,
  producer_directory: producer,
  baseline, candidate,
  candidate_tree: git('rev-parse', candidate + '^{tree}').trim(),
  observed_head: git('rev-parse', 'HEAD').trim(),
  qualification: 'Exact committed-byte source custody and normal entry-link receiving. No algorithm, UI, browser, catalog build, source edit or publication is executed.'
};
try {
  const manifestBytes = fs.readFileSync(path.join(original, 'manifest.json'));
  assert.equal(pin(manifestBytes).sha256, 'a717003f71356d6a3e7d9a4b31f574e8058481d1de86cb85b3defbd56754ae75');
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.head, '2430eebee1dff17bf9b5f8111cd4345fc793e5a8');
  assert.equal(manifest.tree, '0f46c438c35e9fec3c07c85fd6308b7eaca68d49');
  assert.equal(manifest.files.length, 17);
  result.original_manifest = pin(manifestBytes);
  result.imported_files = manifest.files.map(expected => {
    const actual = sourcePin(candidate, prefix + 'source-integration/' + expected.path);
    assert.deepEqual({ bytes: actual.bytes, sha256: actual.sha256 }, { bytes: expected.bytes, sha256: expected.sha256 }, expected.path);
    return { ...actual, matches_original: true };
  });
  result.imported_artifacts = [
    ...manifest.artifacts.map(item => ({ name: path.basename(item.path), bytes: item.bytes, sha256: item.sha256 })),
    { name: 'source-integration-handoff.json', ...pin(manifestBytes) }
  ].map(expected => {
    const actual = sourcePin(candidate, prefix + expected.name);
    assert.deepEqual({ bytes: actual.bytes, sha256: actual.sha256 }, { bytes: expected.bytes, sha256: expected.sha256 }, expected.name);
    return { ...actual, matches_original: true };
  });
  const protectedPaths = [
    'src/union-find.mjs', 'src/union-find-ui.mjs',
    'courses/union-find-explorer.html', 'courses/union-find.json', 'courses/union-find.md',
    'templates/union-find-explorer.html', 'tools/build-union-find.mjs',
    'tests/union-find.test.mjs', 'demo.html'
  ];
  result.protected_source = protectedPaths.map(file => {
    const before = sourcePin(baseline, file), after = sourcePin(candidate, file);
    assert.deepEqual(after, before, file);
    return { ...after, unchanged_from_frozen_producer: true };
  });
  const baselineReadme = blob(baseline, 'README.md');
  const candidateReadme = blob(candidate, 'README.md');
  assert.equal(baselineReadme.length, 34315);
  assert.equal(candidateReadme.subarray(0, baselineReadme.length).equals(baselineReadme), true);
  const addition = candidateReadme.subarray(baselineReadme.length).toString('utf8');
  assert.equal(Buffer.byteLength(addition), 732);
  assert.equal(pin(candidateReadme).sha256, 'ceb771e5440a493e7aba841161de4a5d66c6f0f36cfa5d9431a73207887f2d1a');
  const links = [...addition.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map(m => ({ label: m[1], target: m[2] }));
  assert.deepEqual(links.map(item => item.target), [
    'courses/union-find-explorer.html', 'demo.html', 'courses/union-find.json', 'courses/union-find.md'
  ]);
  result.readme = {
    ...sourcePin(candidate, 'README.md'),
    original_prefix: pin(baselineReadme),
    original_prefix_exact: true, addition: pin(Buffer.from(addition)),
    addition_text: addition,
    links: links.map(link => ({ ...link, ...sourcePin(candidate, link.target), unchanged_from_baseline: blob(candidate, link.target).equals(blob(baseline, link.target)) }))
  };
  const catalogPaths = JSON.parse(blob(candidate, 'catalog/courses.json'));
  const catalogHtml = blob(candidate, 'catalog.html').toString('utf8');
  const embedded = JSON.parse(catalogHtml.match(/<script type="application\/json" id="course-data">([\s\S]*?)<\/script>/)[1]);
  result.catalog = {
    manifest: sourcePin(candidate, 'catalog/courses.json'),
    html: sourcePin(candidate, 'catalog.html'),
    paths: catalogPaths,
    count: catalogPaths.length,
    union_find_registered: catalogPaths.includes('courses/union-find.json'),
    embedded_paths_match_manifest: JSON.stringify(embedded.map(item => item.path)) === JSON.stringify(catalogPaths),
    embedded_sources: embedded.map(item => ({
      path: item.path, embedded: pin(Buffer.from(item.text)),
      committed: sourcePin(candidate, item.path),
      embedded_matches_committed: blob(candidate, item.path).equals(Buffer.from(item.text))
    })),
    inputs: ['tools/build-course-catalog.mjs', 'src/course-catalog.mjs', 'src/course-catalog-ui.mjs', 'catalog/template.html', 'catalog/catalog.css'].map(file => sourcePin(candidate, file)),
    sources_unchanged_from_baseline: ['catalog/courses.json', 'catalog.html', 'tools/build-course-catalog.mjs', 'src/course-catalog.mjs', 'src/course-catalog-ui.mjs', 'catalog/template.html', 'catalog/catalog.css'].every(file => blob(candidate, file).equals(blob(baseline, file))),
    behavior_read_from_source: 'The unchanged builder reads only the explicitly curated catalog/courses.json entries, not every JSON file in courses/.',
    ownership: {
      attribution: 'Current GitHub and native ownership observations independently read by estate_coordination and provided to this reviewer.',
      active_issue: 'https://github.com/Jacob-Met/RecallWeave/issues/39',
      active_owner: 'hamon-ultra-9319fb3272b2-20261008/root',
      active_native_record: '/srv/hamon-estate/coord/hamon-ultra-9319fb3272b2-20261008-root-recall-catalog.json',
      shared_completed_issue: 'https://github.com/Jacob-Met/RecallWeave/issues/40',
      shared_owner: 'hamon-ultra-ab529ac65023-20261008/root',
      shared_native_record: '/srv/hamon-estate/coord/hamon-ultra-ab529ac65023-20261008.json',
      shared_native_state: 'catalog_integrated_received_live_offline_pack_implementation',
      reconciliation_pr: 'https://github.com/Jacob-Met/RecallWeave/pull/63',
      comments: [6064492410, 6065744762, 6065745041],
      decision: 'Preserve both existing catalog owners. Do not infer vacancy from issue 40 closure. New-course registration remains an explicit owner handoff.'
    }
  };
  result.sparse_checkout = {
    enabled: git('config', '--get', 'core.sparseCheckout').trim(),
    patterns: git('sparse-checkout', 'list').trim().split('\n'),
    pages: ['catalog.html', 'handout.html'].map(file => ({ ...sourcePin(candidate, file), committed: true, materialized_in_producer_checkout: fs.existsSync(path.join(producer, file)) }))
  };
  const course = JSON.parse(blob(candidate, 'courses/union-find.json'));
  result.registration_handoff = {
    candidate, path: 'courses/union-find.json', ...sourcePin(candidate, 'courses/union-find.json'),
    title: course.title, questions: course.items.length, concepts: course.concepts,
    intended_action: 'Existing catalog owners can register these accepted exact bytes during their current shared reconciliation. This receiver has not edited their manifest, builder or generated catalog.',
    available_entry: ['README.md', 'courses/union-find-explorer.html', 'course JSON download', 'demo.html / Bring your own lesson'],
    catalog_registration_pending: true
  };
  result.source_custody_passed = true;
  result.normal_readme_entry_passed = true;
  result.catalog_writes = 0;
} catch (error) {
  result.source_custody_passed = false;
  result.error = String(error.stack || error);
  process.exitCode = 1;
} finally {
  result.finished_at = new Date().toISOString();
  fs.writeFileSync(path.join(root, 'SOURCE-CUSTODY-AND-DISCOVERY.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({
    passed: result.source_custody_passed,
    candidate, candidate_tree: result.candidate_tree,
    imported_files: result.imported_files?.length,
    imported_artifacts: result.imported_artifacts?.length,
    protected_product_paths: result.protected_source?.length,
    readme_links: result.readme?.links.length,
    catalog_count: result.catalog?.count,
    union_find_registered: result.catalog?.union_find_registered,
    stale_catalog_sources: result.catalog?.embedded_sources.filter(item => !item.embedded_matches_committed).map(item => item.path),
    receipt: path.join(root, 'SOURCE-CUSTODY-AND-DISCOVERY.json'),
    receipt_pin: pin(fs.readFileSync(path.join(root, 'SOURCE-CUSTODY-AND-DISCOVERY.json'))),
    error: result.error
  }, null, 2));
}
