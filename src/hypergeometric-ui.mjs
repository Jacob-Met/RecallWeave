import { parseWhole, distribution, observationJSON } from "./hypergeometric.mjs";
const $=id=>document.getElementById(id);
const form=$("population-form"), fields=["population","marked","draws","lower","upper"];
let applied=null, inspected=2;
const exact=f=>f.denominator==="1"?f.numerator:f.numerator+"/"+f.denominator;
const decimal=value=>value===0?"0":Number(value.toPrecision(7)).toString();
function element(tag,text,className) {
  const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;
}
function invalidate(message="Draft changed. Apply the population to calculate a new distribution.") {
  applied=null;$("results").hidden=true;$("download-observation").disabled=true;$("status").textContent=message;
  $("error").textContent="";fields.forEach(id=>$(id).removeAttribute("aria-invalid"));
}
fields.forEach(id=>$(id).addEventListener("input",()=>invalidate()));
const presets=[
  {population:8,marked:3,draws:4,lower:2,upper:3},
  {population:10,marked:8,draws:7,lower:0,upper:4},
  {population:9,marked:4,draws:9,lower:4,upper:4},
  {population:200,marked:80,draws:50,lower:18,upper:22}
];
document.querySelectorAll("[data-preset]").forEach(button=>button.addEventListener("click",()=>{
  const p=presets[Number(button.dataset.preset)];fields.forEach(id=>$(id).value=String(p[id]));
  invalidate("Worked inputs loaded as a draft. Apply the population to inspect them.");$("apply").focus();
}));
function paintPopulation() {
  const {population:N,marked:K}=applied.config, row=applied.rows[inspected], list=$("tokens");list.replaceChildren();
  $("population-caption").textContent=N+" distinct tokens: "+K+" marked and "+(N-K)+" unmarked.";
  $("sample-caption").textContent=row.possible ?
    "One illustrative compatible subset: "+inspected+" marked + "+row.unmarkedCount+" unmarked. Outlined tokens are chosen deterministically for illustration; this is not a random draw." :
    "No compatible subset exists for X="+inspected+". There are not enough tokens in one of the categories.";
  for(let i=0;i<N;i++){
    const marked=i<K,index=marked?i+1:i-K+1;
    const selected=row.possible && (marked?i<inspected:i-K<row.unmarkedCount);
    const token=element("span",(marked?"M":"U")+index,"token "+(marked?"marked":"unmarked")+(selected?" selected":""));
    token.setAttribute("role","listitem");
    token.setAttribute("aria-label",(marked?"Marked ":"Unmarked ")+index+(selected?", included in illustrative subset":", not included in illustrative subset"));
    list.append(token);
  }
}
function inspect(k,focus=false) {
  if(!applied)return;
  inspected=k;$("inspect").value=String(k);
  const row=applied.rows[k], {marked:K,population:N,draws:n}=applied.config;
  $("inspected-title").textContent="Inspect X = "+k;
  $("factors").textContent="C("+K+", "+k+") × C("+(N-K)+", "+(n-k)+") = "+row.markedWays+" × "+row.unmarkedWays+" = "+row.favourableSubsets+" favourable subsets.";
  $("inspected-probability").textContent=row.favourableSubsets+" / "+applied.totalSubsets+" = "+exact(row.probability)+" ≈ "+decimal(row.probability.approximate*100)+"%.";
  $("possibility").textContent=row.possible?"This count is possible. "+(row.inEvent?"It is inside the selected event.":"It is outside the selected event."):"This count is impossible: its probability is exactly zero.";
  document.querySelectorAll("#distribution-body tr").forEach(tr=>tr.classList.toggle("inspected",Number(tr.dataset.k)===k));
  paintPopulation();
  if(focus)$("inspected-title").focus();
}
function render() {
  const {population:N,marked:K,draws:n,lower,upper}=applied.config;
  $("applied-inputs").textContent="Applied: N="+N+", K="+K+", n="+n+"; event "+lower+" ≤ X ≤ "+upper+".";
  $("event-label").textContent="P("+lower+" ≤ X ≤ "+upper+")";
  $("event-fraction").textContent=exact(applied.event.probability);
  $("event-count").textContent=applied.event.favourableSubsets+" of "+applied.totalSubsets+" equally likely subsets";
  $("event-percent").textContent="≈ "+decimal(applied.event.probability.approximate*100)+"%";
  $("support").textContent=applied.support.minimum+" through "+applied.support.maximum;
  $("mean").textContent=exact(applied.mean)+" ≈ "+decimal(applied.mean.approximate);
  $("variance").textContent=exact(applied.variance)+" ≈ "+decimal(applied.variance.approximate);
  $("total").textContent=applied.totalSubsets;
  const body=$("distribution-body"),select=$("inspect");body.replaceChildren();select.replaceChildren();
  for(const row of applied.rows){
    const option=element("option","X = "+row.markedCount+(row.possible?"":" (impossible)"));option.value=String(row.markedCount);select.append(option);
    const tr=element("tr");tr.dataset.k=String(row.markedCount);if(row.inEvent)tr.classList.add("event-row");if(!row.possible)tr.classList.add("impossible");
    const cell=element("th");cell.scope="row";const button=element("button",String(row.markedCount),"inspect-row");button.type="button";button.setAttribute("aria-label","Inspect X = "+row.markedCount);button.addEventListener("click",()=>inspect(row.markedCount,true));cell.append(button);tr.append(cell);
    tr.append(element("td",row.favourableSubsets,"integer"));
    tr.append(element("td",exact(row.probability),"integer"));
    const chance=element("td");const track=element("div",undefined,"bar-track");const bar=element("span",undefined,"bar");bar.style.width=(row.probability.approximate*100)+"%";track.append(bar);chance.append(track,element("span",decimal(row.probability.approximate*100)+"%","percent"));tr.append(chance);
    tr.append(element("td",row.inEvent?"Included":"Outside"));body.append(tr);
  }
  $("results").hidden=false;$("download-observation").disabled=false;
  inspected=Math.min(Math.max(inspected,0),n);inspect(inspected);
}
form.addEventListener("submit",event=>{
  event.preventDefault();
  invalidate("");
  let activeField=null;
  try{
    const config={};for(const id of fields){activeField=id;config[id]=parseWhole($(id).value,$(id).dataset.name);}
    activeField=null;applied=distribution(config);render();$("status").textContent="Distribution applied. Exact counts and fractions are ready.";
  }catch(error){
    applied=null;$("results").hidden=true;$("download-observation").disabled=true;
    $("error").textContent=error.message;$("status").textContent="Inputs were not applied.";
    const mapping=[["Population","population"],["Marked","marked"],["Sample","draws"],["lower","lower"],["upper","upper"]];
    const target=activeField??mapping.find(([name])=>error.message.includes(name))?.[1]??"population";
    $(target).setAttribute("aria-invalid","true");$(target).focus();
  }
});
$("inspect").addEventListener("change",()=>inspect(Number($("inspect").value)));
function download(text,name,type) {
  const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=element("a");a.href=url;a.download=name;
  document.body.append(a);try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
function decoded(id) {return new TextDecoder().decode(Uint8Array.from(atob($(id).textContent.trim()),c=>c.charCodeAt(0)));}
$("download-observation").addEventListener("click",()=>{if(applied)download(observationJSON(applied.config,inspected),"hypergeometric-observation.json","application/json");});
$("download-course").addEventListener("click",()=>download(decoded("course-data"),"hypergeometric.json","application/json"));
$("download-guide").addEventListener("click",()=>download(decoded("guide-data"),"hypergeometric.md","text/markdown"));
form.requestSubmit();
