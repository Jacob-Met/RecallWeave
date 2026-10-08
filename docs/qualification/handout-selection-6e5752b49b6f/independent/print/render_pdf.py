import base64,hashlib,io,json,subprocess,sys
import pymupdf
from PIL import Image,ImageChops
data=base64.b64decode(sys.argv[1],validate=True)
index=int(sys.argv[2])
doc=pymupdf.open(stream=data,filetype="pdf")
assert 0<=index<len(doc)
page=doc[index]
result=subprocess.run(["/opt/codex/runtimes/codex-primary-runtime/dependencies/bin/override/pdftoppm","-r","110","-f",str(index+1),"-l",str(index+1),"-singlefile","-png","-"],input=data,capture_output=True,timeout=25)
assert result.returncode==0,(result.returncode,result.stderr.decode(errors="replace"))
png=result.stdout
image=Image.open(io.BytesIO(png)).convert("RGB")
spans=[s for b in page.get_text("dict")["blocks"] if "lines" in b for line in b["lines"] for s in line["spans"]]
outside=[{"text":s["text"],"bbox":s["bbox"]} for s in spans if s["bbox"][0]<-0.5 or s["bbox"][1]<-0.5 or s["bbox"][2]>page.rect.width+0.5 or s["bbox"][3]>page.rect.height+0.5]
payload={"pdf_bytes":len(data),"pdf_sha256":hashlib.sha256(data).hexdigest(),"page_count":len(doc),"page":index+1,"page_points":[page.rect.width,page.rect.height],"png_bytes":len(png),"png_sha256":hashlib.sha256(png).hexdigest(),"pixel_sha256":hashlib.sha256(image.tobytes()).hexdigest(),"pixels":list(image.size),"text":page.get_text(),"spans":spans,"outside_page_spans":outside,"nonwhite_pixel_bbox":ImageChops.difference(image,Image.new("RGB",image.size,"white")).getbbox(),"renderer":"pdftoppm Poppler via stdin,110dpi","renderer_stderr":result.stderr.decode(errors="replace"),"pymupdf":pymupdf.VersionBind,"png_base64":base64.b64encode(png).decode()}
print(json.dumps(payload,ensure_ascii=True))
