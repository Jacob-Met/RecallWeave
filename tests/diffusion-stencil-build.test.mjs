import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {buildDiffusion} from '../tools/build-diffusion-stencil.mjs';
test('committed self-contained artifact matches deterministic sources and exact literal downloads',()=>{
 const html=fs.readFileSync(new URL('../courses/diffusion-stencil-lab.html',import.meta.url),'utf8');assert.equal(html,buildDiffusion());
 assert.equal((html.match(/<script>/g)||[]).length,1);assert.equal((html.match(/<\/script>/g)||[]).length,1);
 assert.ok(!/\b(?:src|href)=["']https?:/i.test(html));assert.ok(!html.includes('/*MODEL*/'));
 const course=html.match(/const DIFFUSION_COURSE_TEXT = (.*);\n/)[1],guide=html.match(/const DIFFUSION_GUIDE_TEXT = (.*);\n/)[1];
 assert.equal(JSON.parse(course),fs.readFileSync(new URL('../courses/diffusion-stencil.json',import.meta.url),'utf8'));
 assert.equal(JSON.parse(guide),fs.readFileSync(new URL('../courses/diffusion-stencil.md',import.meta.url),'utf8'));
 new vm.Script(html.split('<script>')[1].split('</script>')[0]);
});
