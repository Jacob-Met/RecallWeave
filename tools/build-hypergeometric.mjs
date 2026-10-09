import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseDeck } from "../src/deck.mjs";
const root=new URL("../",import.meta.url);
if(process.argv.slice(2).some(arg=>arg!=="--check"))throw new Error("Use no arguments, or --check.");
const read=path=>readFile(new URL(path,root),"utf8");
const [template,course,guide,core,ui]=await Promise.all([
  read("courses/hypergeometric-explorer.template.html"),read("courses/hypergeometric.json"),
  read("courses/hypergeometric.md"),read("src/hypergeometric.mjs"),read("src/hypergeometric-ui.mjs")
]);
const deck=parseDeck(course);if(deck.items.length!==14)throw new Error("Expected the original fourteen-question course.");
const importLine='import { parseWhole, distribution, observationJSON } from "./hypergeometric.mjs";\n';
if(!ui.startsWith(importLine)||/^\s*import\s/m.test(ui.slice(importLine.length)))throw new Error("Unexpected UI import boundary.");
const names=["MAX_POPULATION","parseWhole","admit","distribution","observationJSON"];
if(JSON.stringify([...core.matchAll(/^export (?:function|const) (\w+)/gm)].map(x=>x[1]))!==JSON.stringify(names))throw new Error("Unexpected core exports.");
const script="const { "+names.join(", ")+" } = (()=>{\n"+core.replace(/^export (?=function|const)/gm,"")+"\nreturn {"+names.join(",")+"};\n})();\n"+ui.slice(importLine.length);
if(/<\/script/i.test(script))throw new Error("Code must not close the embedded script element.");
let output=template;
for(const [marker,content] of Object.entries({"@@COURSE_BASE64@@":Buffer.from(course).toString("base64"),"@@GUIDE_BASE64@@":Buffer.from(guide).toString("base64"),"@@SCRIPT@@":script})){
  if(output.split(marker).length!==2)throw new Error("Missing/repeated marker "+marker);
  output=output.replace(marker,()=>content);
}
if(/@@(?:COURSE_BASE64|GUIDE_BASE64|SCRIPT)@@/.test(output))throw new Error("Unresolved template marker.");
const target=new URL("courses/hypergeometric-explorer.html",root);
if(process.argv.includes("--check")){
  if(await readFile(target,"utf8")!==output)throw new Error("Rebuild the hypergeometric explorer.");
  console.log("Exact model, UI, template, course and guide parity verified.");
}else{
  await writeFile(target,output,"utf8");console.log("Built "+fileURLToPath(target));
}
