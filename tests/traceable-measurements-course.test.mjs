import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parseDeck, serializeDeck} from '../src/deck.mjs';
import {buildTraceableCourse} from '../tools/build_traceable_measurements.mjs';

const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const source=JSON.parse(read('courses/traceable-measurements.source.json'));
const courseText=read('courses/traceable-measurements.json');
const deck=parseDeck(courseText);
const byId=new Map(deck.items.map(item=>[item.id,item]));
const facts=source.measurement_case;
const records=facts.native_event_records.records;
const chosen=id=>{const item=byId.get(id);return item.options[item.answer];};
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,String(actual)+' differs from '+expected);

test('original course builds through the native author/parser without losing content',()=>{
  assert.equal(buildTraceableCourse(source),courseText);
  assert.equal(serializeDeck(deck),courseText);
  assert.equal(deck.items.length,12);
  assert.equal(deck.concepts.length,6);
  assert.equal(new Set(deck.items.map(item=>item.id)).size,12);
  for(const concept of deck.concepts) assert.equal(deck.items.filter(item=>item.concept===concept).length,2);
  const counts=[0,0,0,0];
  for(const item of deck.items) {
    assert.equal(item.options.length,4);
    counts[item.answer]++;
    assert.ok(item.explanation.length>80);
    assert.ok(item.transfer.length>30);
  }
  assert.deepEqual(counts,[3,3,3,3]);
});

test('measurement case is an exact factual projection of the immutable received report',()=>{
  const bytes=fs.readFileSync(new URL('docs/receiving/traceable-measurements-9d2f71701d2e/measurement-report.json',root));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),facts.report_sha256);
  assert.equal(bytes.length,facts.published_report.bytes);
  const report=JSON.parse(bytes);
  for(const key of ['source','derivative','normalization','configured_api','default_pipeline','native_event_records','excluded_from_interpretation','acceptance']) {
    assert.deepEqual(facts[key],report[key],key);
  }
  assert.equal(facts.source.sha256,'f4030190c25bfd34fc99b2979c80e3498f11347ee294d863b3c642710526abec');
  assert.equal(facts.derivative.sha256,'b5767714eaad342ddb66a7978a49e80bcf8fba4966219663baa91cf2ec8bf216');
  assert.equal(facts.default_pipeline.status,'refused');
  assert.equal(facts.default_pipeline.min_peak_distance_frames,85);
  assert.equal(facts.configured_api.min_peak_distance_frames,51);
  assert.equal(records.length,6);
});

test('crop, sample clocks and paired-grid answers follow the stated origins and rates',()=>{
  const f=facts.configured_api.marker_rate_hz;
  const a=facts.configured_api.analog_rate_hz;
  const [p0,pEnd]=facts.normalization.point_window_zero_based_half_open;
  const [a0,aEnd]=facts.normalization.analog_window_zero_based_half_open;
  assert.equal(pEnd-p0,133);
  assert.equal(aEnd-a0,2394);
  near(p0/f,a0/a);
  assert.equal(a/f,18);
  assert.equal(facts.native_event_records.sample_index_origin,0);
  assert.equal(facts.native_event_records.time_origin,'first_loaded_marker_sample');
  near(facts.native_event_records.original_first_sample_offset_s,p0/f);
  for(const row of records) near(row.time_from_first_sample_s,row.marker_sample_index/f);
  const first=records.find(row=>row.marker_sample_index===27);
  assert.equal(chosen('trace-clock-crop'),(first.marker_sample_index/f).toFixed(6)+' s, then '+((first.marker_sample_index+p0)/f).toFixed(6)+' s.');
  assert.equal(chosen('trace-grid-crop'),a/f+' analog samples.');
  const rhs=records.find(row=>row.marker_sample_index===59);
  const retained=rhs.marker_sample_index*a/f;
  assert.equal(chosen('trace-grid-index'),retained+' retained, '+(retained+a0)+' original.');
  near((133-1)/f,2.2);
});

test('signed conversion and the explicitly fictional comparison use distinct summary operations',()=>{
  const row=records.find(row=>row.marker_sample_index===27);
  assert.equal(chosen('trace-signed-units'),(row.mos_ap_m*1000).toFixed(3)+' mm.');
  const ap=records.map(row=>row.mos_ap_m).filter(value=>value!==null);
  assert.equal(ap.length,4);
  assert.ok(ap.every(value=>value<0));
  near(ap.reduce((sum,value)=>sum+Math.abs(value),0)/ap.length*1000,facts.native_mos_summary.mean_MOS_AP);
  const pair=facts.authored_comparison.values_m;
  assert.deepEqual(pair,[-0.04,0.02]);
  assert.match(facts.authored_comparison.description,/Fictional/);
  const signed=pair.reduce((sum,value)=>sum+value,0)/pair.length;
  const magnitude=pair.reduce((sum,value)=>sum+Math.abs(value),0)/pair.length*1000;
  assert.equal(chosen('trace-absolute-summary'),signed.toFixed(2)+' m, then '+magnitude+' mm.');
  assert.equal(magnitude,30);
  assert.equal(Math.abs(signed)*1000,10);
  assert.notEqual(magnitude,Math.abs(signed)*1000);
});

test('event, detector, reference and unavailable-field identities stay distinct',()=>{
  const lhs=records.find(row=>row.marker_sample_index===27);
  assert.deepEqual([lhs.detector,lhs.side,lhs.mos_reference_foot],['LHS','L','R']);
  const rhs=records.find(row=>row.marker_sample_index===126);
  assert.deepEqual([rhs.event_index,rhs.detector_index,rhs.mos_index,rhs.marker_sample_index],[5,1,3,126]);
  assert.equal(chosen('trace-three-indices'),rhs.detector_index+'.');
  const toe=records.find(row=>row.marker_sample_index===66);
  assert.equal(toe.detector,'LTO');
  assert.equal(toe.hcv_mm_s,null);
  assert.ok(toe.unavailable_fields.includes('hcv_mm_s'));
  assert.deepEqual(toe.nonfinite_fields,[]);
  for(const row of records.filter(row=>row.hcv_mm_s!==null)) assert.equal(row.detector,'RHS');
  for(const row of records.filter(row=>row.next_same_side_marker_sample_index===null)) assert.equal(row.inter_stride_interval_s,null);
  assert.equal(facts.excluded_from_interpretation.pipeline_force_mean_mass_kg,0);
  assert.match(facts.excluded_from_interpretation.reason,/no calibration matrix is applied/);
  assert.equal(facts.acceptance.clinical_validation,false);
  assert.equal(facts.acceptance.reference_event_accuracy,false);
});
