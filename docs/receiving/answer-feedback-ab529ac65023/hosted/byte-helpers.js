
const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function decode64(s){if(s.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw Error("bad base64");const out=[];for(let i=0;i<s.length;i+=4){const a=alphabet.indexOf(s[i]),b=alphabet.indexOf(s[i+1]),c=alphabet.indexOf(s[i+2]),d=alphabet.indexOf(s[i+3]);out.push((a<<2)|(b>>4));if(c>=0)out.push(((b&15)<<4)|(c>>2));if(d>=0)out.push(((c&3)<<6)|d);}return Uint8Array.from(out);}
function utf8(s){return Uint8Array.from(unescape(encodeURIComponent(s)),c=>c.charCodeAt(0));}
function decodeUtf8(b){return decodeURIComponent(Array.from(b,x=>"%"+x.toString(16).padStart(2,"0")).join(""));}
function sha256(data){
 const k=[],h=[];let n=2;while(k.length<64){let prime=true;for(let d=2;d*d<=n;d++)if(n%d===0){prime=false;break;}if(prime){if(h.length<8)h.push((Math.sqrt(n)%1*4294967296)|0);k.push((Math.cbrt(n)%1*4294967296)|0);}n++;}
 const size=Math.ceil((data.length+9)/64)*64,b=new Uint8Array(size);b.set(data);b[data.length]=128;const view=new DataView(b.buffer);view.setUint32(size-8,Math.floor(data.length/536870912));view.setUint32(size-4,(data.length*8)>>>0);
 const rr=(x,n)=>(x>>>n)|(x<<(32-n)),w=new Int32Array(64);
 for(let off=0;off<size;off+=64){for(let i=0;i<16;i++)w[i]=view.getInt32(off+4*i);for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(rr(x,7)^rr(x,18)^(x>>>3))+w[i-7]+(rr(y,17)^rr(y,19)^(y>>>10)))|0;}
 let[a,b,c,d,e,f,g,hh]=h;
 for(let i=0;i<64;i++){const t1=(hh+(rr(e,6)^rr(e,11)^rr(e,25))+((e&f)^(~e&g))+k[i]+w[i])|0;const t2=((rr(a,2)^rr(a,13)^rr(a,22))+((a&b)^(a&c)^(b&c)))|0;hh=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;}
 [a,b,c,d,e,f,g,hh].forEach((x,i)=>h[i]=(h[i]+x)|0);
 }return h.map(x=>(x>>>0).toString(16).padStart(8,"0")).join("");
}
return {decode64,utf8,decodeUtf8,sha256};
