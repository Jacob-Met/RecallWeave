const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto'), cp=require('node:child_process');
const root=__dirname, hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const assert=(x,m)=>{if(!x)throw Error(m);};
const admission=JSON.parse(fs.readFileSync(path.join(root,'transport-source-admission.json'),'utf8'));
const rows=JSON.parse(fs.readFileSync(path.join(root,'render-metadata.json'),'utf8'));
const fixture=JSON.parse(fs.readFileSync(path.join(root,'author-fixture.json'),'utf8'));
const normalized=s=>s.replace(/\s+/gu,' ').trim();
assert(rows.length===8,'eight rendered pages');
for(const row of rows){
 const b=Buffer.from(fs.readFileSync(path.join(root,row.png+'.b64'),'utf8').trim(),'base64');
 assert(b.length===row.png_bytes&&hash(b)===row.png_sha256,'rendered PNG transport '+row.png);
 fs.writeFileSync(path.join(root,row.png),b,{flag:'wx'});
 assert(row.page_count===2&&row.page_points[0]===612&&row.page_points[1]===792,'actual Letter print pages');
 assert(row.outside_page_spans.length===0,'all text spans inside PDF page');
 assert(row.renderer_stderr==='','renderer warnings');
}
const documents=[];
for(const original of admission.files.filter(x=>x.name.endsWith('.pdf'))){
 const pages=rows.filter(x=>x.pdf===original.name).sort((a,b)=>a.page-b.page);
 assert(pages.length===2,'two complete pages');
 const text=normalized(pages.map(x=>x.text).join('\n'));
 const isKey=original.name.includes('answer-key');
 assert(hash(fs.readFileSync(path.join(root,original.name)))===original.sha256,'copied original PDF unchanged');
 assert(hash(fs.readFileSync(path.join(admission.source,original.name)))===original.sha256,'author original PDF unchanged');
 for(const field of ['title','attribution','license'])assert(text.includes(normalized(fixture[field])),field+' complete');
 for(const index of [1,2]){
  const item=fixture.items[index];
  assert(text.includes(normalized(String(index+1)+'. '+item.prompt)),'original question number and full prompt');
  for(const option of item.options)assert(text.includes(normalized(option)),'complete option');
  assert(text.includes(normalized(item.transfer)),'complete transfer');
  if(isKey){
   assert(text.includes('ANSWER '+String.fromCharCode(65+item.answer)),'canonical answer label');
   assert(text.includes(normalized(item.options[item.answer]))&&text.includes(normalized(item.explanation)),'complete correct answer and explanation');
  }
 }
 for(const index of [0,3]){
  const item=fixture.items[index];
  for(const value of [item.prompt,...item.options,item.transfer,item.explanation])assert(!text.includes(normalized(value)),'unselected content absent');
 }
 assert(!text.includes('Unselected concept'),'unselected-only concept absent');
 assert(text.indexOf('2. SECOND_PUBLIC_PROMPT')<text.indexOf('3. THIRD_PUBLIC_PROMPT'),'original source question order');
 assert(text.indexOf('3. THIRD_PUBLIC_PROMPT')<text.indexOf('Source and permission'),'complete trailing credit');
 if(isKey)assert(text.includes('ANSWER KEY · CONTAINS ANSWERS'),'key role label');
 else{
  assert(text.includes('WORKSHEET · QUESTIONS ONLY'),'worksheet role label');
  for(const item of fixture.items)assert(!text.includes(item.explanation),'worksheet private explanation absent');
  assert(!/\bANSWER [A-F]\b/.test(text),'worksheet canonical answer labels absent');
 }
 documents.push({name:original.name,bytes:original.bytes,sha256:original.sha256,page_count:2,
  original_bytes_unchanged:true,complete_selected_content:true,private_role_separation:true,
  pages:pages.map(p=>({page:p.page,png:p.png,png_bytes:p.png_bytes,png_sha256:p.png_sha256,pixel_sha256:p.pixel_sha256,
   pixels:p.pixels,page_points:p.page_points,nonwhite_pixel_bbox:p.nonwhite_pixel_bbox,text_spans:p.spans.length,
   min_font_points:Math.min(...p.spans.filter(s=>s.text.trim()).map(s=>s.size)),outside_page_spans:0}))});
}
for(const type of ['worksheet','answer-key'])for(const page of [1,2]){
 const a=rows.find(x=>x.pdf==='modular-'+type+'.pdf'&&x.page===page);
 const b=rows.find(x=>x.pdf==='standalone-'+type+'.pdf'&&x.page===page);
 assert(a.png_sha256===b.png_sha256&&a.pixel_sha256===b.pixel_sha256&&a.text===b.text,'modular standalone print parity');
}
const receipt={format:'recall170-independent-print-receiving/1',at:new Date().toISOString(),status:'accepted',
 source:'35ba3fe7a611395016fc5c808604ea1a815dc81b',source_tree:'8c509b174be3e799d2265558c9e0b3720b0b63ad',
 author_browser_receipt_sha256:admission.files.find(x=>x.name==='receiving.json').sha256,
 route:{hostname:admission.hostname,user:admission.user,node:admission.node,node_sha256:admission.node_sha256},
 rendering:{host:'Codex primary runtime, memory-only stdin/stdout',renderer:'Poppler pdftoppm26.05.0',dpi:110,
  extractor:'PyMuPDF1.26.6',page_images:8,unique_page_images:4,all_render_processes_exit0:true},
 documents,modular_standalone_all_page_pixels_identical:true,original_pdfs_after_unchanged:true,
 visual_review:{all_eight_pages_inspected:true,clipping:false,overlap:false,missing_or_unreadable_glyphs:false,
  observations:['Both worksheets place complete selected questions2/3 on page1 and their intact Source and permission footer alone on page2.',
   'Both keys keep question2 and its AnswerC/explanation on page1; question3, AnswerA/explanation and source credit are together on page2.',
   'Literal angle-bracket/script-like wording and Japanese title render as visible text. Original question numbers, role labels, option lettering and response rules are readable.',
   'The worksheet-only footer page uses an extra sheet; recorded as a nonblocking pagination observation, not omitted content.']},
 limitations:['Original author PDFs only, no fresh browser execution or printing.','Eight raster pages inspected at110dpi; actual physical printer output, other paper sizes and arbitrary longer lessons are not qualified.',
  'No source edit, dependency install, cleanup, identity change, PowerShell script execution, Actions or ref publication.',
  'Complete original PDF bytes were transported by ordinary RDC into memory and hash-verified. PDF files were never regenerated. Page PNGs and evidence are retained in this owned native directory.',
  'Author browser acceptance, root browser acceptance, model-domain receiving and independent source review remain separate.']};
fs.writeFileSync(path.join(root,'print-receiving.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:receipt.status,documents:documents.length,pages:rows.length,parity:true,
 receipt_bytes:fs.statSync(path.join(root,'print-receiving.json')).size,receipt_sha256:hash(fs.readFileSync(path.join(root,'print-receiving.json')))}));
