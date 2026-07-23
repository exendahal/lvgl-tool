var ut=Object.defineProperty;var ht=(e,t,o)=>t in e?ut(e,t,{enumerable:!0,configurable:!0,writable:!0,value:o}):e[t]=o;var ye=(e,t,o)=>ht(e,typeof t!="symbol"?t+"":t,o);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&r(a)}).observe(document,{childList:!0,subtree:!0});function o(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(n){if(n.ep)return;n.ep=!0;const s=o(n);fetch(n.href,s)}})();const ft="modulepreload",gt=function(e){return"/"+e},we={},Pe=function(t,o,r){let n=Promise.resolve();if(o&&o.length>0){document.getElementsByTagName("link");const a=document.querySelector("meta[property=csp-nonce]"),c=a?.nonce||a?.getAttribute("nonce");n=Promise.allSettled(o.map(i=>{if(i=gt(i),i in we)return;we[i]=!0;const d=i.endsWith(".css"),l=d?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${i}"]${l}`))return;const u=document.createElement("link");if(u.rel=d?"stylesheet":ft,d||(u.as="script"),u.crossOrigin="",u.href=i,c&&u.setAttribute("nonce",c),document.head.appendChild(u),d)return new Promise((h,f)=>{u.addEventListener("load",h),u.addEventListener("error",()=>f(new Error(`Unable to preload CSS for ${i}`)))})}))}function s(a){const c=new Event("vite:preloadError",{cancelable:!0});if(c.payload=a,window.dispatchEvent(c),!c.defaultPrevented)throw a}return n.then(a=>{for(const c of a||[])c.status==="rejected"&&s(c.reason);return t().catch(s)})},Te="image/svg+xml";function mt(e){return e.type===Te||e.name.toLowerCase().endsWith(".svg")}function vt(e){return new Promise((t,o)=>{const r=new Image;r.onload=()=>t(r),r.onerror=()=>o(new Error("Failed to decode image data.")),r.src=e})}function _e(e,t,o){const r=document.createElement("canvas");r.width=t,r.height=o;const n=r.getContext("2d",{willReadFrequently:!0});if(!n)throw new Error("Canvas 2D context unavailable.");n.clearRect(0,0,t,o),n.drawImage(e,0,0,t,o);const{data:s}=n.getImageData(0,0,t,o);return{width:t,height:o,data:s,sourceName:""}}async function Ge(e,t){const o=URL.createObjectURL(e);try{const r=await vt(o),n=r.naturalWidth||r.width,s=r.naturalHeight||r.height;if(mt(e)){const c=t?.width??n??256,i=t?.height??s??256,d=_e(r,Math.max(1,Math.round(c)),Math.max(1,Math.round(i)));return d.sourceName=e.name,d}const a=_e(r,n,s);return a.sourceName=e.name,a}finally{URL.revokeObjectURL(o)}}async function bt(e){const t=await e.text(),r=new DOMParser().parseFromString(t,Te).documentElement;if(!r||r.nodeName.toLowerCase()!=="svg")return null;const n=r.getAttribute("width"),s=r.getAttribute("height"),a=n?parseFloat(n):NaN,c=s?parseFloat(s):NaN;if(!Number.isNaN(a)&&!Number.isNaN(c))return{width:a,height:c};const i=r.getAttribute("viewBox");if(i){const d=i.trim().split(/\s+/).map(Number);if(d.length===4&&d.every(l=>!Number.isNaN(l)))return{width:d[2],height:d[3]}}return null}class G{constructor(){ye(this,"chunks",[])}u8(t){this.chunks.push(t&255)}u16le(t){this.chunks.push(t&255,t>>>8&255)}u16be(t){this.chunks.push(t>>>8&255,t&255)}u32le(t){this.chunks.push(t&255,t>>>8&255,t>>>16&255,t>>>24&255)}bytes(t){for(let o=0;o<t.length;o++)this.chunks.push(t[o]&255)}toUint8Array(){return Uint8Array.from(this.chunks)}get length(){return this.chunks.length}}function yt(e,t=16){const o=[];for(let r=0;r<e.length;r+=t){const n=Array.from(e.slice(r,r+t)).map(s=>"0x"+s.toString(16).padStart(2,"0")).join(", ");o.push("    "+n+",")}return o.join(`
`)}function V(e,t="img"){let o=e.replace(/\.[^/.]+$/,"").replace(/[^a-zA-Z0-9_]/g,"_").replace(/^[0-9]/,"_$&");return o||(o=t),o}const Se=[{id:"true_color",label:"True color",macro:"LV_IMG_CF_TRUE_COLOR",category:"trueColor",bpp:16,supportsAlpha:!1,supportsChroma:!1},{id:"true_color_alpha",label:"True color + alpha",macro:"LV_IMG_CF_TRUE_COLOR_ALPHA",category:"trueColor",bpp:16,supportsAlpha:!0,supportsChroma:!1},{id:"true_color_chroma",label:"True color + chroma key",macro:"LV_IMG_CF_TRUE_COLOR_CHROMA",category:"trueColor",bpp:16,supportsAlpha:!1,supportsChroma:!0},{id:"indexed_1bit",label:"Indexed 1-bit (2 colors)",macro:"LV_IMG_CF_INDEXED_1BIT",category:"indexed",bpp:1,supportsAlpha:!0,supportsChroma:!1,paletteSize:2},{id:"indexed_2bit",label:"Indexed 2-bit (4 colors)",macro:"LV_IMG_CF_INDEXED_2BIT",category:"indexed",bpp:2,supportsAlpha:!0,supportsChroma:!1,paletteSize:4},{id:"indexed_4bit",label:"Indexed 4-bit (16 colors)",macro:"LV_IMG_CF_INDEXED_4BIT",category:"indexed",bpp:4,supportsAlpha:!0,supportsChroma:!1,paletteSize:16},{id:"indexed_8bit",label:"Indexed 8-bit (256 colors)",macro:"LV_IMG_CF_INDEXED_8BIT",category:"indexed",bpp:8,supportsAlpha:!0,supportsChroma:!1,paletteSize:256},{id:"alpha_1bit",label:"Alpha-only 1-bit",macro:"LV_IMG_CF_ALPHA_1BIT",category:"alpha",bpp:1,supportsAlpha:!0,supportsChroma:!1},{id:"alpha_2bit",label:"Alpha-only 2-bit",macro:"LV_IMG_CF_ALPHA_2BIT",category:"alpha",bpp:2,supportsAlpha:!0,supportsChroma:!1},{id:"alpha_4bit",label:"Alpha-only 4-bit",macro:"LV_IMG_CF_ALPHA_4BIT",category:"alpha",bpp:4,supportsAlpha:!0,supportsChroma:!1},{id:"alpha_8bit",label:"Alpha-only 8-bit",macro:"LV_IMG_CF_ALPHA_8BIT",category:"alpha",bpp:8,supportsAlpha:!0,supportsChroma:!1},{id:"raw",label:"Raw (passthrough, app-decoded)",macro:"LV_IMG_CF_RAW",category:"raw",bpp:0,supportsAlpha:!1,supportsChroma:!1,isRawPassthrough:!0},{id:"raw_alpha",label:"Raw + alpha (passthrough, app-decoded)",macro:"LV_IMG_CF_RAW_ALPHA",category:"raw",bpp:0,supportsAlpha:!0,supportsChroma:!1,isRawPassthrough:!0},{id:"raw_chroma",label:"Raw + chroma key (passthrough, app-decoded)",macro:"LV_IMG_CF_RAW_CHROMA",category:"raw",bpp:0,supportsAlpha:!1,supportsChroma:!0,isRawPassthrough:!0}],wt=[...Se,{id:"rgb565a8",label:"RGB565 + separate A8 alpha plane",macro:"LV_IMG_CF_RGB565A8",category:"trueColor",bpp:24,supportsAlpha:!0,supportsChroma:!1}],_t=[{id:"rgb565",label:"RGB565",macro:"LV_COLOR_FORMAT_RGB565",category:"trueColor",bpp:16,supportsAlpha:!1,supportsChroma:!0,supportsRle:!0},{id:"rgb888",label:"RGB888",macro:"LV_COLOR_FORMAT_RGB888",category:"trueColor",bpp:24,supportsAlpha:!1,supportsChroma:!0,supportsRle:!0},{id:"argb8888",label:"ARGB8888",macro:"LV_COLOR_FORMAT_ARGB8888",category:"trueColor",bpp:32,supportsAlpha:!0,supportsChroma:!1,supportsRle:!0},{id:"xrgb8888",label:"XRGB8888",macro:"LV_COLOR_FORMAT_XRGB8888",category:"trueColor",bpp:32,supportsAlpha:!1,supportsChroma:!1,supportsRle:!0},{id:"indexed_1bit",label:"Indexed 1-bit (2 colors)",macro:"LV_COLOR_FORMAT_I1",category:"indexed",bpp:1,supportsAlpha:!0,supportsChroma:!1,paletteSize:2,supportsRle:!0},{id:"indexed_2bit",label:"Indexed 2-bit (4 colors)",macro:"LV_COLOR_FORMAT_I2",category:"indexed",bpp:2,supportsAlpha:!0,supportsChroma:!1,paletteSize:4,supportsRle:!0},{id:"indexed_4bit",label:"Indexed 4-bit (16 colors)",macro:"LV_COLOR_FORMAT_I4",category:"indexed",bpp:4,supportsAlpha:!0,supportsChroma:!1,paletteSize:16,supportsRle:!0},{id:"indexed_8bit",label:"Indexed 8-bit (256 colors)",macro:"LV_COLOR_FORMAT_I8",category:"indexed",bpp:8,supportsAlpha:!0,supportsChroma:!1,paletteSize:256,supportsRle:!0},{id:"l8",label:"L8 (grayscale, no alpha)",macro:"LV_COLOR_FORMAT_L8",category:"grayscale",bpp:8,supportsAlpha:!1,supportsChroma:!1,supportsRle:!0},{id:"a8",label:"Alpha-only (A8)",macro:"LV_COLOR_FORMAT_A8",category:"alpha",bpp:8,supportsAlpha:!0,supportsChroma:!1,supportsRle:!0}],pe={v7:{version:"v7",label:"LVGL v7",formats:Se,structName:"lv_img_dsc_t",isV9Model:!1},v8:{version:"v8",label:"LVGL v8",formats:wt,structName:"lv_img_dsc_t",isV9Model:!1},v9:{version:"v9",label:"LVGL v9",formats:_t,structName:"lv_image_dsc_t",isV9Model:!0}};function Lt(e){return pe[e].formats}function Fe(e,t){return pe[e].formats.find(o=>o.id===t)}function xt(e,t){return pe[e].formats.find(o=>o.macro===t)}function $e(e,t,o,r){const n=Math.ceil(t*r/8),s=new Uint8Array(n*o),a=(1<<r)-1;for(let c=0;c<o;c++){let i=0;const d=c*n;for(let l=0;l<t;l++){const u=e[c*t+l]&a,h=d+(i>>3),f=8-r-i%8;s[h]|=u<<f,i+=r}}return{data:s,stride:n}}function Ne(e,t,o,r,n){const s=n??Math.ceil(t*r/8),a=new Uint8Array(t*o),c=(1<<r)-1;for(let i=0;i<o;i++){let d=0;const l=i*s;for(let u=0;u<t;u++){const h=l+(d>>3),f=8-r-d%8;a[i*t+u]=e[h]>>f&c,d+=r}}return a}function Ue(e){let t=[255,255,255,255],o=[0,0,0,0];for(const a of e.colors){const c=[a.r,a.g,a.b,a.a];for(let i=0;i<4;i++)c[i]<t[i]&&(t[i]=c[i]),c[i]>o[i]&&(o[i]=c[i])}const r=[o[0]-t[0],o[1]-t[1],o[2]-t[2],o[3]-t[3]];let n=0,s=r[0];for(let a=1;a<4;a++)r[a]>s&&(s=r[a],n=a);return{channel:n,range:s}}function Rt(e){const{channel:t}=Ue(e),o=["r","g","b","a"][t],r=[...e.colors].sort((h,f)=>h[o]-f[o]),n=e.count;let s=0,a=r.length-1;for(let h=0;h<r.length;h++)if(s+=r[h].count,s>=n/2){a=h;break}const c=r.slice(0,a+1),i=r.slice(a+1),d=i.length?i:[r[r.length-1]],l=i.length?c:r.slice(0,-1).length?r.slice(0,-1):c,u=h=>h.reduce((f,g)=>f+g.count,0);return[{colors:l,count:u(l)},{colors:d,count:u(d)}]}function Ct(e){let t=0,o=0,r=0,n=0,s=0;for(const a of e.colors)t+=a.r*a.count,o+=a.g*a.count,r+=a.b*a.count,n+=a.a*a.count,s+=a.count;return s===0?[0,0,0,255]:[Math.round(t/s),Math.round(o/s),Math.round(r/s),Math.round(n/s)]}function De(e,t){const o=new Map,{data:r,width:n,height:s}=e;for(let i=0;i<n*s;i++){const d=i*4,l=r[d]<<24|r[d+1]<<16|r[d+2]<<8|r[d+3];o.set(l,(o.get(l)??0)+1)}const a=[...o.entries()].map(([i,d])=>({r:i>>>24&255,g:i>>>16&255,b:i>>>8&255,a:i&255,count:d}));if(a.length<=t)return a.map(i=>[i.r,i.g,i.b,i.a]);let c=[{colors:a,count:a.reduce((i,d)=>i+d.count,0)}];for(;c.length<t;){let i=-1,d=-1;if(c.forEach((h,f)=>{if(h.colors.length<=1)return;const{range:g}=Ue(h);g>d&&(d=g,i=f)}),i===-1)break;const[l,u]=Rt(c[i]);c.splice(i,1,l,u)}return c.map(Ct)}function ue(e,t,o,r,n){let s=0,a=1/0;for(let c=0;c<e.length;c++){const[i,d,l,u]=e[c],h=i-t,f=d-o,g=l-r,m=u-n,y=h*h+f*f+g*g+m*m*2;y<a&&(a=y,s=c)}return s}const At=[[1,0,7/16],[-1,1,3/16],[0,1,5/16],[1,1,1/16]];function ze(e,t,o,r,n,s,a,c,i,d,l,u){for(const[h,f,g]of At){const m=a+h,y=c+f;if(m<0||m>=n||y>=s)continue;const b=y*n+m;e[b]+=i*g,t[b]+=d*g,o[b]+=l*g,r[b]+=u*g}}function He(e,t){const{width:o,height:r,data:n}=e,s=o*r,a=new Float32Array(s),c=new Float32Array(s),i=new Float32Array(s),d=new Float32Array(s),l=new Uint8Array(s);for(let u=0;u<r;u++)for(let h=0;h<o;h++){const f=u*o+h,g=f*4,m=I(n[g]+a[f]),y=I(n[g+1]+c[f]),b=I(n[g+2]+i[f]),L=I(n[g+3]+d[f]),w=ue(t,m,y,b,L);l[f]=w;const[k,R,x,_]=t[w];ze(a,c,i,d,o,r,h,u,m-k,y-R,b-x,L-_)}return l}function I(e){return e<0?0:e>255?255:e}function z(e,t){const{width:o,height:r,data:n}=e,s=o*r,a=new Float32Array(s),c=new Float32Array(s),i=new Float32Array(s),d=new Float32Array(s),l=new Uint8ClampedArray(n.length),u=t.map(h=>255/(h-1));for(let h=0;h<r;h++)for(let f=0;f<o;f++){const g=h*o+f,m=g*4,y=[I(n[m]+a[g]),I(n[m+1]+c[g]),I(n[m+2]+i[g]),I(n[m+3]+d[g])],b=y.map((L,w)=>Math.round(Math.round(L/u[w])*u[w]));l[m]=b[0],l[m+1]=b[1],l[m+2]=b[2],l[m+3]=b[3],ze(a,c,i,d,o,r,f,h,y[0]-b[0],y[1]-b[1],y[2]-b[2],y[3]-b[3])}return l}function he(e,t,o){const r=(e&248)<<8|(t&252)<<3|o>>3;return[r&255,r>>>8&255]}function kt(e,t,o){const r=1<<t,n=e.width*e.height,s=new Uint8Array(n);if(o&&t<8){const c=z(e,[255,255,255,r]);for(let i=0;i<n;i++)s[i]=Math.round(c[i*4+3]/255*((1<<t)-1));return s}const a=255/(r-1);for(let c=0;c<n;c++){const i=e.data[c*4+3];s[c]=Math.round(i/a)}return s}function It(e,t,o){const r=t.paletteSize??1<<t.bpp,n=De(e,r),s=e.width*e.height,a=new Uint8Array(s);if(o){const l=He(e,n);a.set(l)}else for(let l=0;l<s;l++){const u=l*4;a[l]=ue(n,e.data[u],e.data[u+1],e.data[u+2],e.data[u+3])}const{data:c,stride:i}=$e(a,e.width,e.height,t.bpp),d=new Uint8Array(n.length*4);return n.forEach(([l,u,h,f],g)=>{d[g*4]=h,d[g*4+1]=u,d[g*4+2]=l,d[g*4+3]=f}),{data:c,palette:d,stride:i}}function Mt(e,t,o){const r=kt(e,t.bpp,o);if(t.bpp===8)return{data:r,stride:e.width};const{data:n,stride:s}=$e(r,e.width,e.height,t.bpp);return{data:n,stride:s}}function Et(e){const t=e.width*e.height,o=new Uint8Array(t);for(let r=0;r<t;r++){const n=r*4;o[r]=Math.round(.299*e.data[n]+.587*e.data[n+1]+.114*e.data[n+2])}return{data:o,stride:e.width}}function Ot(e,t,o){const{width:r,height:n,data:s}=e,a=t.id==="true_color_alpha",c=new G,i=o.dithering&&o.colorDepth===16?z(e,[32,64,32,256]):s;for(let l=0;l<r*n;l++){const u=l*4,h=i[u],f=i[u+1],g=i[u+2],m=i[u+3];if(o.colorDepth===16){const[y,b]=he(h,f,g);c.u8(y),c.u8(b),a&&c.u8(m)}else c.u8(g),c.u8(f),c.u8(h),c.u8(a?m:255)}const d=o.colorDepth===16?a?3:2:4;return{data:c.toUint8Array(),stride:r*d}}function Vt(e,t){const{width:o,height:r,data:n}=e,s=o*r,a=new G,c=new Uint8Array(s),i=t.dithering?z(e,[32,64,32,256]):n;for(let l=0;l<s;l++){const u=l*4,[h,f]=he(i[u],i[u+1],i[u+2]);a.u8(h),a.u8(f),c[l]=i[u+3]}const d=new Uint8Array(a.length+c.length);return d.set(a.toUint8Array(),0),d.set(c,a.length),{data:d,stride:o*3}}function Bt(e,t,o){const{width:r,height:n,data:s}=e,a=new G,i=t.id==="rgb565"&&o.dithering?z(e,[32,64,32,256]):s;for(let l=0;l<r*n;l++){const u=l*4,h=i[u],f=i[u+1],g=i[u+2],m=i[u+3];switch(t.id){case"rgb565":{const[y,b]=he(h,f,g);a.u8(y),a.u8(b);break}case"rgb888":a.u8(g),a.u8(f),a.u8(h);break;case"argb8888":a.u8(g),a.u8(f),a.u8(h),a.u8(m);break;case"xrgb8888":a.u8(g),a.u8(f),a.u8(h),a.u8(0);break}}const d=t.bpp/8;return{data:a.toUint8Array(),stride:r*d}}function Pt(e,t,o){if(t.isRawPassthrough)throw new Error("Raw passthrough formats must be encoded via encodeRawPassthrough(), not packPixels().");switch(t.category){case"indexed":return It(e,t,o.dithering);case"alpha":return Mt(e,t,o.dithering);case"grayscale":return Et(e);case"trueColor":return t.id==="rgb565a8"?Vt(e,o):["rgb565","rgb888","argb8888","xrgb8888"].includes(t.id)?Bt(e,t,o):Ot(e,t,o);default:throw new Error(`Unhandled color format category: ${t.category}`)}}async function Tt(e){return{data:new Uint8Array(await e.arrayBuffer()),stride:0}}function P(e,t){return t>=8?e:e<<8-t|e>>2*t-8}function Gt(e,t,o){const{width:r,height:n,data:s}=e,a=new Uint8ClampedArray(s.length);if(t.isRawPassthrough)return a.set(s),{width:r,height:n,data:a,sourceName:e.sourceName};switch(t.category){case"indexed":{const c=t.paletteSize??1<<t.bpp,i=De(e,c),d=o.dithering?He(e,i):new Uint8Array(r*n);if(!o.dithering)for(let l=0;l<r*n;l++){const u=l*4;d[l]=ue(i,s[u],s[u+1],s[u+2],s[u+3])}for(let l=0;l<r*n;l++){const[u,h,f,g]=i[d[l]],m=l*4;a[m]=u,a[m+1]=h,a[m+2]=f,a[m+3]=g}break}case"alpha":{const i=255/((1<<t.bpp)-1);for(let d=0;d<r*n;d++){const l=d*4,u=Math.round(s[l+3]/i);a[l]=255,a[l+1]=255,a[l+2]=255,a[l+3]=Math.round(u*i)}break}case"grayscale":{for(let c=0;c<r*n;c++){const i=c*4,d=Math.round(.299*s[i]+.587*s[i+1]+.114*s[i+2]);a[i]=d,a[i+1]=d,a[i+2]=d,a[i+3]=255}break}case"trueColor":{const c=t.id==="rgb565"||t.id==="rgb565a8"||["true_color","true_color_alpha","true_color_chroma"].includes(t.id)&&o.colorDepth===16,i=t.id==="true_color_alpha"||t.id==="rgb565a8"||t.id==="argb8888";for(let d=0;d<r*n;d++){const l=d*4;let u=s[l],h=s[l+1],f=s[l+2];c&&(u=P((u&248)>>3,5),h=P((h&252)>>2,6),f=P((f&248)>>3,5)),a[l]=u,a[l+1]=h,a[l+2]=f,a[l+3]=i?s[l+3]:255}break}}return{width:r,height:n,data:a,sourceName:e.sourceName}}function H(e){return{...e,data:new Uint8ClampedArray(e.data)}}function We(e,t,o,r,n,s){const a=e-r,c=t-n,i=o-s;return Math.sqrt(a*a+c*c+i*i)/Math.sqrt(3)}function je(e,t,o){const r=(Math.min(e.height-1,Math.max(0,o))*e.width+Math.min(e.width-1,Math.max(0,t)))*4;return[e.data[r],e.data[r+1],e.data[r+2]]}function St(e){return je(e,0,0)}function qe(e,t){if(t<=0)return;const{width:o,height:r,data:n}=e,s=new Uint8ClampedArray(o*r);for(let i=0;i<o*r;i++)s[i]=n[i*4+3];const a=(i,d)=>{const l=new Uint8ClampedArray(o*r);for(let u=0;u<r;u++)for(let h=0;h<o;h++){let f=0,g=0;for(let m=-t;m<=t;m++){const y=d?h+m:h,b=d?u:u+m;y<0||y>=o||b<0||b>=r||(f+=i[b*o+y],g++)}l[u*o+h]=Math.round(f/g)}return l},c=a(a(s,!0),!1);for(let i=0;i<o*r;i++)n[i*4+3]=c[i]}function Ft(e,t){const{width:o,height:r,data:n}=e,[s,a,c]=t;for(let i=0;i<o*r;i++){const d=i*4,l=n[d+3];if(l===0||l===255)continue;const u=l/255;n[d]=Math.round((n[d]-(1-u)*s)/u),n[d+1]=Math.round((n[d+1]-(1-u)*a)/u),n[d+2]=Math.round((n[d+2]-(1-u)*c)/u)}}function $t(e,t){const o=H(e),[r,n,s]=t.pickedColor,{width:a,height:c,data:i}=o;for(let d=0;d<a*c;d++){const l=d*4;We(i[l],i[l+1],i[l+2],r,n,s)<=t.tolerance&&(i[l+3]=0)}return t.feather>0&&(qe(o,t.feather),Ft(o,t.pickedColor)),o}function Nt(e,t){const o=H(e),[r,n,s]=t.pickedColor,{width:a,height:c,data:i}=o;for(let d=0;d<a*c;d++){const l=d*4;We(i[l],i[l+1],i[l+2],r,n,s)<=t.tolerance&&(i[l]=r,i[l+1]=n,i[l+2]=s),i[l+3]=255}return o}function Le(e){const t=H(e);for(let o=3;o<t.data.length;o+=4)t.data[o]=255;return t}function Ut(e,t,o){if(!o.supportsAlpha&&!o.supportsChroma)return Le(e);switch(t.mode){case"none":return Le(e);case"existingAlpha":{const r=H(e);return t.feather>0&&qe(r,t.feather),r}case"colorPick":return $t(e,t);case"chromaKey":return Nt(e,t)}}const Dt=[255,0,255];function zt(e){const t=[];let o=0;const r=e.length;for(;o<r;){let n=1;for(;o+n<r&&e[o+n]===e[o]&&n<128;)n++;if(n>=2){t.push(257-n),t.push(e[o]),o+=n;continue}const s=o;let a=1;for(o++;o<r&&a<128&&!(o+1<r&&e[o+1]===e[o]);)a++,o++;t.push(a-1);for(let c=0;c<a;c++)t.push(e[s+c])}return Uint8Array.from(t)}function Xe(e,t){const o=new Uint8Array((e?.length??0)+t.length);return e&&o.set(e,0),o.set(t,e?.length??0),o}function Ke(e,t){return t?zt(e):e}function Ht(e){return`#if defined(LV_LVGL_H_INCLUDE_SIMPLE)
#include "lvgl.h"
#else
#include "lvgl/lvgl.h"
#endif

#ifndef LV_ATTRIBUTE_MEM_ALIGN
#define LV_ATTRIBUTE_MEM_ALIGN
#endif

#ifndef LV_ATTRIBUTE_IMG_${e.toUpperCase()}
#define LV_ATTRIBUTE_IMG_${e.toUpperCase()}
#endif
`}function xe(e){const t=V(e.variableName),o=`${t}_map`,r=!e.isRawPassthrough&&e.rle&&!!e.format.supportsRle&&e.version==="v9",n=Xe(e.paletteData,e.pixelData),s=Ke(n,r),a=[Ht(t)];return r&&a.push(`/* NOTE: pixel data below is RLE-compressed with this tool's own experimental scheme
 * (see src/lib/rle.ts) — it is NOT LVGL's native v9 on-device compression format.
 * Decompress with the matching decoder before handing bytes to LVGL, or disable
 * the RLE option when generating this asset for direct LVGL consumption. */
`),a.push(`const LV_ATTRIBUTE_MEM_ALIGN LV_ATTRIBUTE_IMG_${t.toUpperCase()} uint8_t ${o}[] = {
${yt(s)}
};
`),e.version==="v9"?a.push(`const lv_image_dsc_t ${t} = {
  .header.magic = LV_IMAGE_HEADER_MAGIC,
  .header.cf = ${e.format.macro},
  .header.flags = 0,
  .header.w = ${e.width},
  .header.h = ${e.height},
  .header.stride = ${e.stride},
  .data_size = sizeof(${o}),
  .data = ${o},
};
`):a.push(`const lv_img_dsc_t ${t} = {
  .header.cf = ${e.format.macro},
  .header.always_zero = 0,
  .header.reserved = 0,
  .header.w = ${e.width},
  .header.h = ${e.height},
  .data_size = sizeof(${o}),
  .data = ${o},
};
`),a.join(`
`)}function Wt(e,t){const{width:o,height:r,data:n}=e,s=new G;for(let a=0;a<o*r;a++){const c=a*4,i=n[c],d=n[c+1],l=n[c+2];switch(t){case"RGB332":{const u=i&224|(d&224)>>3|l>>6;s.u8(u);break}case"RGB565":{const u=(i&248)<<8|(d&252)<<3|l>>3;s.u16le(u);break}case"RGB565_SWAPPED":{const u=(i&248)<<8|(d&252)<<3|l>>3;s.u16be(u);break}case"RGB888":s.u8(i),s.u8(d),s.u8(l);break}}return s.toUint8Array()}const q=25;function jt(e,t,o,r,n){const s=new G,a=Ye[e.id];if(a===void 0)throw new Error(`No numeric LV_COLOR_FORMAT_* value known for '${e.id}' — cannot emit a .bin header.`);return s.u8(q),s.u8(a),s.u16le(0),s.u16le(t),s.u16le(o),s.u16le(r),s.u16le(0),s.bytes(n),s.toUint8Array()}const Ye={rgb565:18,rgb888:15,argb8888:16,xrgb8888:17,indexed_1bit:32,indexed_2bit:33,indexed_4bit:34,indexed_8bit:35,l8:6,a8:14};function qt(e,t){Ze(e,new Blob([t],{type:"text/plain;charset=utf-8"}))}function Xt(e,t){Ze(e,new Blob([t],{type:"application/octet-stream"}))}function Ze(e,t){const o=URL.createObjectURL(t),r=document.createElement("a");r.href=o,r.download=e,document.body.appendChild(r),r.click(),r.remove(),URL.revokeObjectURL(o)}function F(e,t,o=8){t.width=e.width,t.height=e.height;const r=t.getContext("2d");if(!r)return;for(let a=0;a<e.height;a+=o)for(let c=0;c<e.width;c+=o){const i=(c/o+a/o)%2===0;r.fillStyle=i?"#e5e7eb":"#9ca3af",r.fillRect(c,a,o,o)}const n=document.createElement("canvas");n.width=e.width,n.height=e.height,n.getContext("2d").putImageData(new ImageData(e.data,e.width,e.height),0,0),r.drawImage(n,0,0)}function Kt(){return`
  <div class="docs">
    <h2>Why the version selector matters</h2>
    <p>LVGL's on-disk image and font formats changed meaningfully across v7, v8 and v9.
    Picking the wrong version's output for your firmware's actual LVGL version will fail to
    compile or, worse, compile but render garbage. This page summarizes the structural
    differences this tool accounts for.</p>

    <h3>Image color formats</h3>
    <table>
      <thead><tr><th>Feature</th><th>v7</th><th>v8</th><th>v9</th></tr></thead>
      <tbody>
        <tr>
          <td>Color formats</td>
          <td>TRUE_COLOR, TRUE_COLOR_ALPHA, TRUE_COLOR_CHROMA, INDEXED 1/2/4/8-bit, ALPHA 1/2/4/8-bit, RAW / RAW_CHROMA / RAW_ALPHA (passthrough)</td>
          <td>Same as v7, plus RGB565A8</td>
          <td>New <code>LV_COLOR_FORMAT_*</code> model: RGB565, RGB888, ARGB8888, XRGB8888, indexed I1/I2/I4/I8, L8, A8</td>
        </tr>
        <tr>
          <td>Output struct</td>
          <td><code>lv_img_dsc_t</code></td>
          <td><code>lv_img_dsc_t</code> (compatible with v7)</td>
          <td><code>lv_image_dsc_t</code>, C array or standalone <code>.bin</code> for LV_FS loading</td>
        </tr>
        <tr>
          <td>Compression</td>
          <td>None</td>
          <td>None</td>
          <td>Optional RLE (this tool's RLE is an original scheme requiring app-side decompression — see the generated file's comment header)</td>
        </tr>
      </tbody>
    </table>

    <h3>Transparency approaches</h3>
    <table>
      <thead><tr><th>Approach</th><th>v7</th><th>v8</th><th>v9</th></tr></thead>
      <tbody>
        <tr><td>Chroma key</td><td>TRUE_COLOR_CHROMA</td><td>Same as v7</td><td>Chroma-key flag on RGB formats</td></tr>
        <tr><td>Per-pixel alpha</td><td>TRUE_COLOR_ALPHA</td><td>Same as v7</td><td>ARGB8888</td></tr>
        <tr><td>Alpha-only mask</td><td>ALPHA_1/2/4/8BIT</td><td>Same as v7</td><td>A8</td></tr>
      </tbody>
    </table>

    <h3>Struct layout notes</h3>
    <p><strong>v7/v8</strong> <code>lv_img_dsc_t</code> packs a bitfield header (cf : 5, always_zero : 3,
    reserved : 2, w : 11, h : 11) followed by <code>data_size</code> and a <code>data</code> pointer.</p>
    <p><strong>v9</strong> <code>lv_image_dsc_t</code> instead nests an <code>lv_image_header_t</code>
    (magic : 8, cf : 8, flags : 16, w : 16, h : 16, stride : 16, reserved : 16) ahead of
    <code>data_size</code> and <code>data</code> — the explicit <code>stride</code> field is new in v9
    and matters for anything other than tightly-packed rows.</p>

    <h3>What this tool doesn't guarantee yet</h3>
    <ul>
      <li>The v9 <code>.bin</code> header's numeric <code>LV_COLOR_FORMAT_*</code> and magic values are
      taken from the LVGL v9 sources at time of writing, but LVGL minor releases have shifted these
      before — cross-check against the exact point release you target before shipping a generated
      <code>.bin</code> to production.</li>
      <li>RLE compression is this tool's own scheme, not LVGL's native v9 compressed format — it needs
      a matching decompressor in your app.</li>
      <li>"True color" in v7/v8 depends on your firmware's <code>LV_COLOR_DEPTH</code> build setting;
      pick the matching color depth (16 or 32-bit) in the converter or the packed bytes won't match
      what your LVGL build expects.</li>
      <li>The <strong>Import &amp; Inspect</strong> tab can't tell v7 apart from v8 source files (they
      share an identical struct/macro surface) — it defaults to v8 and lets you override manually.
      It also assumes this tool's own palette byte order ([B,G,R,A]); a file from a different
      generator may decode with swapped colors if its convention differs. Re-exporting a decoded
      image to a different target version isn't implemented yet (tracked as a stretch goal).</li>
    </ul>

    <h3>Font converter — how it works</h3>
    <p>Rather than a WASM-ported FreeType, this tool rasterizes each glyph with the browser's own
    native (antialiased, hinted) text renderer via a temporary <code>FontFace</code> + Canvas, and
    reads real metrics — advance width, glyph existence, and kerning — directly from the font's
    tables via <a href="https://github.com/opentypejs/opentype.js" target="_blank" rel="noopener">opentype.js</a>,
    exactly the "opentype.js + custom rasterizer" fallback the PRD itself proposed. One generated
    <code>.c</code> file targets v7/v8/v9 simultaneously using the same
    <code>LV_VERSION_CHECK(...)</code> preprocessor guards LVGL's own headers provide and the
    official <code>lv_font_conv</code> tool relies on — fonts didn't get a wholesale struct
    replacement in v9 the way images did, so a single adaptive emitter is more trustworthy here
    than three hand-diverged generators.</p>

    <h3>Font converter — known limitations</h3>
    <ul>
      <li><strong>Not implemented:</strong> 3bpp compression-gated glyphs, horizontal subpixel
      rendering, and color-glyph/grayscale icon extraction from color/emoji fonts. v9's "improved
      compression" for font bitmaps is also not reproduced — output is always uncompressed.</li>
      <li><strong><code>LV_SYMBOL_*</code> icons aren't bundled</strong> — this tool doesn't ship
      LVGL's private-use-area icon font. Merge your own copy of it as a second source (the
      "merge an additional font source" option) and reference its codepoints in the explicit
      character list instead.</li>
      <li><strong>Kerning is best-effort</strong>: it reads whatever legacy <code>kern</code> table
      or GPOS pair-adjustment data opentype.js can find in the source font, capped at 500 combined
      glyphs (pairwise lookup is O(n²)). The exact binary layout of
      <code>lv_font_fmt_txt_kern_pair_t</code> and the sparse <code>lv_font_fmt_txt_cmap_t</code>
      struct emitted here are this tool's best recollection of <code>lv_font_fmt_txt.h</code>,
      <strong>not verified against a specific LVGL checkout</strong> — if glyphs render blank or
      kerning looks wrong, check those sections first.</li>
      <li><strong>Glyph vertical positioning</strong> (<code>ofs_x</code>/<code>ofs_y</code>) is
      derived from Canvas coordinate math rather than a verified on-device convention — glyph
      shapes, coverage, and bpp packing are solid, but a small vertical nudge is the most likely
      thing to need correcting if you compare against official-tool output.</li>
      <li>The "fallback font" field only emits a <code>.fallback = &amp;your_name;</code> pointer
      to an <em>already-compiled</em> separate <code>lv_font_t</code> you provide elsewhere — it
      doesn't chain fonts within this tool itself.</li>
      <li>Font <strong>Binary</strong> output is this tool's own experimental format for
      round-tripping, not LVGL's native binary font loader (<code>lv_binfont_create()</code>)
      layout — same caveat as the image path's v9 <code>.bin</code>.</li>
    </ul>
  </div>`}function Je(e){return e.replace(/\/\*[\s\S]*?\*\//g," ").replace(/\/\/.*$/gm," ")}function Yt(e){const t=e.match(/uint8_t\s+(\w+)\s*\[\]\s*=\s*\{([\s\S]*?)\}\s*;/);if(!t)return null;const[,o,r]=t,s=Je(r).match(/0[xX][0-9a-fA-F]+|\d+/g);if(!s||s.length===0)return null;const a=Uint8Array.from(s.map(c=>Number(c)&255));return{name:o,bytes:a}}function W(e,t){const o=new RegExp(`\\.${t.replace(".","\\.")}\\s*=\\s*(\\d+)`),r=e.match(o);return r?Number(r[1]):void 0}function Zt(e){const t=e.match(/\.header\.cf\s*=\s*([A-Za-z0-9_]+)/);return t?t[1]:void 0}function Jt(e){const t=Je(e),o=/lv_image_dsc_t\s+\w+\s*=/.test(t)||/\.header\.magic\s*=/.test(t),r=/lv_img_dsc_t\s+\w+\s*=/.test(t);if(!o&&!r)return{ok:!1,error:"Doesn't match a recognized lv_img_dsc_t (v7/v8) or lv_image_dsc_t (v9) initializer — is this really an LVGL image source file?"};const n=Yt(t);if(!n)return{ok:!1,error:"Could not find a `uint8_t ...[] = { ... };` pixel data array in the source."};const s=Zt(t);if(!s)return{ok:!1,error:"Could not find a `.header.cf = LV_..._CF_*` (or LV_COLOR_FORMAT_*) field — header initializer looks malformed or uses an unrecognized layout."};const a=W(t,"header.w"),c=W(t,"header.h");if(a===void 0||c===void 0)return{ok:!1,error:"Could not find `.header.w` / `.header.h` dimension fields."};const i=o?W(t,"header.stride"):void 0;return{ok:!0,parsed:{versionGuess:o?"v9":"v8",versionAmbiguous:!o,macro:s,width:a,height:c,stride:i,bytes:n.bytes,arrayVariableName:n.name}}}const Qt=Object.fromEntries(Object.entries(Ye).map(([e,t])=>[t,e]));function eo(e){if(e.length<12)return{ok:!1,error:"File is too short to contain a 12-byte v9 image header."};const t=new DataView(e.buffer,e.byteOffset,e.byteLength),o=t.getUint8(0);if(o!==q)return{ok:!1,error:`Header magic byte 0x${o.toString(16)} doesn't match the expected v9 magic (0x${q.toString(16)}) — this may not be a v9 image .bin, or uses a different LVGL point release's header layout.`};const r=t.getUint8(1),n=Qt[r];if(!n)return{ok:!1,error:`Unrecognized numeric color format 0x${r.toString(16)} in header — doesn't match any LV_COLOR_FORMAT_* value this tool knows.`};const s=t.getUint16(4,!0),a=t.getUint16(6,!0),c=t.getUint16(8,!0),i=e.slice(12);return{ok:!0,parsed:{formatId:n,width:s,height:a,stride:c,bytes:i}}}function T(e,t){return new Uint8ClampedArray(e*t*4)}function to(e){const{format:t,width:o,height:r,bytes:n}=e,s=t.paletteSize??1<<t.bpp,a=s*4;if(n.length<a)return{ok:!1,error:`Array is too short to hold a ${s}-entry palette (need at least ${a} bytes, got ${n.length}).`};const c=n.slice(0,a),i=n.slice(a),d=[];for(let h=0;h<s;h++){const f=h*4;d.push([c[f+2],c[f+1],c[f],c[f+3]])}const l=Ne(i,o,r,t.bpp,e.stride),u=T(o,r);for(let h=0;h<o*r;h++){const[f,g,m,y]=d[l[h]]??[0,0,0,0];u[h*4]=f,u[h*4+1]=g,u[h*4+2]=m,u[h*4+3]=y}return{ok:!0,result:{image:{width:o,height:r,data:u,sourceName:""},palette:d,notes:[]}}}function oo(e){const{format:t,width:o,height:r,bytes:n}=e,s=(1<<t.bpp)-1,a=t.bpp===8?n:Ne(n,o,r,t.bpp,e.stride),c=T(o,r);for(let i=0;i<o*r;i++){const d=Math.round(a[i]*255/s);c[i*4]=255,c[i*4+1]=255,c[i*4+2]=255,c[i*4+3]=d}return{ok:!0,result:{image:{width:o,height:r,data:c,sourceName:""},notes:[]}}}function ro(e){const{width:t,height:o,bytes:r}=e;if(r.length<t*o)return{ok:!1,error:`L8 data too short: need ${t*o} bytes, got ${r.length}.`};const n=T(t,o);for(let s=0;s<t*o;s++){const a=r[s];n[s*4]=a,n[s*4+1]=a,n[s*4+2]=a,n[s*4+3]=255}return{ok:!0,result:{image:{width:t,height:o,data:n,sourceName:""},notes:[]}}}function $(e,t){const o=e|t<<8;return[P(o>>11&31,5),P(o>>5&63,6),P(o&31,5)]}const j=[255,0,255];function Qe(e,t,o,r){let n=0;for(let s=0;s<t*o;s++){const a=s*4;e[a]===j[0]&&e[a+1]===j[1]&&e[a+2]===j[2]&&(e[a+3]=0,n++)}n>0&&r.push(`Chroma-key preview: ${n} pixel(s) matching the conventional magenta (#FF00FF) were rendered transparent for visualization. The actual on-device magic color may differ if this asset used a custom chroma key.`)}function no(e){const{format:t,width:o,height:r,bytes:n}=e,s=t.bpp/8,a=e.stride??o*s,c=T(o,r);for(let d=0;d<r;d++)for(let l=0;l<o;l++){const u=d*a+l*s,h=(d*o+l)*4;switch(t.id){case"rgb565":{const[f,g,m]=$(n[u],n[u+1]);c[h]=f,c[h+1]=g,c[h+2]=m,c[h+3]=255;break}case"rgb888":c[h]=n[u+2],c[h+1]=n[u+1],c[h+2]=n[u],c[h+3]=255;break;case"argb8888":c[h]=n[u+2],c[h+1]=n[u+1],c[h+2]=n[u],c[h+3]=n[u+3];break;case"xrgb8888":c[h]=n[u+2],c[h+1]=n[u+1],c[h+2]=n[u],c[h+3]=255;break}}const i=[];return t.id==="rgb565"&&t.supportsChroma&&Qe(c,o,r,i),{ok:!0,result:{image:{width:o,height:r,data:c,sourceName:""},notes:i}}}function ao(e){const{width:t,height:o,bytes:r}=e,n=t*o;if(r.length<n*3)return{ok:!1,error:`RGB565A8 data too short: need ${n*3} bytes (color plane + alpha plane), got ${r.length}.`};const s=T(t,o);for(let a=0;a<n;a++){const[c,i,d]=$(r[a*2],r[a*2+1]),l=r[n*2+a];s[a*4]=c,s[a*4+1]=i,s[a*4+2]=d,s[a*4+3]=l}return{ok:!0,result:{image:{width:t,height:o,data:s,sourceName:""},notes:[]}}}function so(e){const{format:t,width:o,height:r,bytes:n}=e,s=o*r;if(n.length%s!==0)return{ok:!1,error:`True-color data length (${n.length} bytes) isn't an even multiple of the pixel count (${s}) — can't infer bytes-per-pixel / color depth.`};const a=n.length/s,c=T(o,r);let i;if(a===2){i=16;for(let l=0;l<s;l++){const[u,h,f]=$(n[l*2],n[l*2+1]);c[l*4]=u,c[l*4+1]=h,c[l*4+2]=f,c[l*4+3]=255}}else if(a===3){i=16;for(let l=0;l<s;l++){const[u,h,f]=$(n[l*3],n[l*3+1]);c[l*4]=u,c[l*4+1]=h,c[l*4+2]=f,c[l*4+3]=n[l*3+2]}}else if(a===4){i=32;const l=t.id==="true_color_alpha";for(let u=0;u<s;u++){const h=u*4;c[h]=n[h+2],c[h+1]=n[h+1],c[h+2]=n[h],c[h+3]=l?n[h+3]:255}}else return{ok:!1,error:`Unexpected ${a} bytes/pixel for true-color data — doesn't match a 16-bit (2-3 bytes/px) or 32-bit (4 bytes/px) LV_COLOR_DEPTH packing.`};const d=[`Color depth (${i}-bit) was inferred from data size ÷ pixel count — v7/v8 true-color formats don't record LV_COLOR_DEPTH anywhere in the file itself.`];return t.id==="true_color_chroma"&&Qe(c,o,r,d),{ok:!0,result:{image:{width:o,height:r,data:c,sourceName:""},inferredColorDepth:i,notes:d}}}function Re(e){const{format:t,width:o,height:r}=e;if(o<=0||r<=0)return{ok:!1,error:`Invalid dimensions ${o}x${r}.`};switch(t.category){case"indexed":return to(e);case"alpha":return oo(e);case"grayscale":return ro(e);case"trueColor":return t.id==="rgb565a8"?ao(e):["rgb565","rgb888","argb8888","xrgb8888"].includes(t.id)?no(e):so(e);default:return{ok:!1,error:`Unhandled color format category '${t.category}'.`}}}async function io(e){const t=new Blob([e]),o=URL.createObjectURL(t);try{const r=await new Promise((c,i)=>{const d=new Image;d.onload=()=>c(d),d.onerror=()=>i(new Error("Browser could not decode the embedded bytes as an image (unsupported or corrupted passthrough payload).")),d.src=o}),n=document.createElement("canvas");n.width=r.naturalWidth,n.height=r.naturalHeight;const s=n.getContext("2d");s.drawImage(r,0,0);const a=s.getImageData(0,0,n.width,n.height).data;return{ok:!0,result:{image:{width:n.width,height:n.height,data:a,sourceName:""},notes:["Raw passthrough: decoded by handing the embedded bytes to the browser’s own image decoder, since CF_RAW* formats store the original compressed file verbatim."]}}}catch(r){return{ok:!1,error:r.message}}finally{URL.revokeObjectURL(o)}}function co(){return`
  <div class="grid">
    <div>
      <fieldset>
        <legend>Load an existing LVGL image source</legend>
        <div class="field">
          <label for="import-file-input">Upload a .c/.h source, or a v9 .bin file</label>
          <input type="file" id="import-file-input" accept=".c,.h,.bin,text/plain,application/octet-stream" />
        </div>
        <div class="field">
          <label for="import-text-area">…or paste .c source text directly</label>
          <textarea id="import-text-area" rows="8" style="width:100%; font-family: Consolas, monospace; font-size: 0.8rem;" placeholder="const lv_img_dsc_t my_icon = { ... };"></textarea>
        </div>
        <div class="row field">
          <div>
            <label for="import-version-select">LVGL version (auto-detected — override if wrong)</label>
            <select id="import-version-select">
              <option value="v7">v7</option>
              <option value="v8" selected>v8</option>
              <option value="v9">v9</option>
            </select>
          </div>
          <div>
            <label for="import-zoom-slider">Zoom (<span id="import-zoom-value">4</span>x)</label>
            <input type="range" id="import-zoom-slider" min="1" max="16" value="4" />
          </div>
        </div>
        <div class="actions">
          <button class="primary" id="import-decode-btn">Decode &amp; preview</button>
        </div>
        <p class="status" id="import-status"></p>
      </fieldset>
    </div>
    <div>
      <fieldset>
        <legend>Decoded preview</legend>
        <div class="preview-row">
          <div class="preview-box" style="flex:2;">
            <div style="overflow:auto; max-height:420px; border:1px solid var(--border); border-radius:6px; display:inline-block;">
              <canvas id="import-preview-canvas" style="image-rendering pixelated;"></canvas>
            </div>
          </div>
        </div>
      </fieldset>
      <fieldset>
        <legend>Metadata</legend>
        <div id="import-metadata" class="note">Load and decode a file to see metadata here.</div>
        <div id="import-palette" style="display:flex; flex-wrap:wrap; gap:2px; margin-top:0.5rem;"></div>
        <ul id="import-notes" class="note" style="padding-left: 1.1rem;"></ul>
      </fieldset>
    </div>
  </div>`}function lo(e){const t=b=>e.querySelector("#"+b),o=t("import-file-input"),r=t("import-text-area"),n=t("import-version-select"),s=t("import-zoom-slider"),a=t("import-zoom-value"),c=t("import-decode-btn"),i=t("import-status"),d=t("import-preview-canvas"),l=t("import-metadata"),u=t("import-palette"),h=t("import-notes");let f=null,g=4;function m(b,L=""){i.textContent=b,i.className=`status ${L}`}o.addEventListener("change",async()=>{const b=o.files?.[0];if(!b)return;b.name.toLowerCase().endsWith(".bin")?(f=new Uint8Array(await b.arrayBuffer()),r.value="",n.value="v9",m(`Loaded ${b.name} (${f.length} bytes) — click Decode & preview.`)):(f=null,r.value=await b.text(),m(`Loaded ${b.name} as text — click Decode & preview.`))}),r.addEventListener("input",()=>{f=null}),s.addEventListener("input",()=>{g=parseInt(s.value,10),a.textContent=String(g),d.style.width=d.width*g+"px",d.style.height=d.height*g+"px"});function y(b,L,w,k,R,x,_){const C=[`<div><strong>Resolution:</strong> ${w}×${k}px</div>`,`<div><strong>Color format:</strong> ${b} (<code>${L}</code>)</div>`,`<div><strong>Array size:</strong> ${R.toLocaleString()} bytes</div>`];if(_!==void 0&&C.push(`<div><strong>Stride:</strong> ${_} bytes/row</div>`),x.inferredColorDepth&&C.push(`<div><strong>Inferred LV_COLOR_DEPTH:</strong> ${x.inferredColorDepth}-bit</div>`),x.palette&&C.push(`<div><strong>Palette entries:</strong> ${x.palette.length}</div>`),l.innerHTML=C.join(""),u.innerHTML="",x.palette)for(const[A,me,ve,be]of x.palette){const O=document.createElement("div");O.title=`rgba(${A}, ${me}, ${ve}, ${(be/255).toFixed(2)})`,O.style.width="18px",O.style.height="18px",O.style.border="1px solid var(--border)",O.style.background=`rgba(${A}, ${me}, ${ve}, ${be/255})`,u.appendChild(O)}h.innerHTML=x.notes.map(A=>`<li>${A}</li>`).join("")}c.addEventListener("click",async()=>{const b=n.value;try{if(f){const _=eo(f);if(!_.ok){m(_.error,"error");return}const C=Fe("v9",_.parsed.formatId);if(!C){m(`Internal error: unresolved format id '${_.parsed.formatId}'.`,"error");return}const A=Re({format:C,width:_.parsed.width,height:_.parsed.height,stride:_.parsed.stride,bytes:_.parsed.bytes});if(!A.ok){m(A.error,"error");return}F(A.result.image,d),d.style.width=d.width*g+"px",d.style.height=d.height*g+"px",y(C.label,C.macro,_.parsed.width,_.parsed.height,_.parsed.bytes.length,A.result,_.parsed.stride),m("Decoded v9 .bin successfully.","ok");return}const L=r.value;if(!L.trim()){m("Paste a .c source or upload a file first.","error");return}const w=Jt(L);if(!w.ok){m(w.error,"error");return}const k=w.parsed.versionAmbiguous?b:w.parsed.versionGuess;w.parsed.versionAmbiguous||(n.value=k);const R=xt(k,w.parsed.macro);if(!R){m(`'${w.parsed.macro}' isn't a recognized color format for LVGL ${k} — try a different version above (v7/v8 share the same macros; this file may target the other one).`,"error");return}const x=R.isRawPassthrough?await io(w.parsed.bytes):Re({format:R,width:w.parsed.width,height:w.parsed.height,stride:w.parsed.stride,bytes:w.parsed.bytes});if(!x.ok){m(x.error,"error");return}F(x.result.image,d),d.style.width=d.width*g+"px",d.style.height=d.height*g+"px",y(R.label,R.macro,w.parsed.width,w.parsed.height,w.parsed.bytes.length,x.result,w.parsed.stride),m(`Decoded successfully (detected LVGL ${k}${w.parsed.versionAmbiguous?", ambiguous vs v7 — override above if wrong":""}).`,"ok")}catch(L){m(`Unexpected error: ${L.message}`,"error")}})}const et="lvgl-tool.version";function po(){const e=localStorage.getItem(et);return e==="v7"||e==="v8"||e==="v9"?e:"v9"}const p={version:po(),file:null,decodedImage:null,svgWidth:256,svgHeight:256,formatId:"",colorDepth:16,dithering:!1,transparencyMode:"none",pickedColor:[...Dt],tolerance:24,feather:0,varName:"img",fileNameBase:"img",outputMode:"carray",binaryVariant:"RGB565",rle:!1,result:null,pickingFromImage:!1},uo=document.querySelector("#app");uo.innerHTML=`
  <header class="app-header">
    <h1>LVGL Asset Converter</h1>
    <div class="trust-banner">🔒 100% client-side — nothing you upload ever leaves your browser</div>
  </header>

  <div class="version-select">
    <label for="version-select" style="margin:0;">LVGL version</label>
    <select id="version-select">
      <option value="v7">v7</option>
      <option value="v8">v8</option>
      <option value="v9">v9</option>
    </select>
  </div>

  <div class="tabs">
    <button id="tab-convert-btn" class="active">Image Converter</button>
    <button id="tab-import-btn">Import &amp; Inspect</button>
    <button id="tab-font-btn">Font Converter</button>
    <button id="tab-font-import-btn">Font Import &amp; Inspect</button>
    <button id="tab-docs-btn">Format Reference</button>
  </div>

  <section id="panel-convert" class="panel active">
    <div class="grid">
      <div>
        <fieldset>
          <legend>Source image</legend>
          <div id="drop-zone">Drop a PNG / JPG / BMP / SVG here, or click to choose a file</div>
          <input type="file" id="file-input" accept=".png,.jpg,.jpeg,.bmp,.svg,image/*" style="display:none" />
          <div class="row" id="svg-size-row" style="display:none">
            <div class="field">
              <label for="svg-width">SVG target width (px)</label>
              <input type="number" id="svg-width" min="1" value="256" />
            </div>
            <div class="field">
              <label for="svg-height">SVG target height (px)</label>
              <input type="number" id="svg-height" min="1" value="256" />
            </div>
          </div>
          <p class="note" id="file-info"></p>
        </fieldset>

        <fieldset>
          <legend>Color format</legend>
          <div class="field">
            <label for="format-select">Color format (options shown are only those valid for the selected LVGL version)</label>
            <select id="format-select"></select>
          </div>
          <div class="row field" id="color-depth-row" style="display:none">
            <div>
              <label><input type="radio" name="color-depth" value="16" checked /> 16-bit (RGB565) — matches LV_COLOR_DEPTH 16</label>
            </div>
            <div>
              <label><input type="radio" name="color-depth" value="32" /> 32-bit — matches LV_COLOR_DEPTH 32</label>
            </div>
          </div>
          <div class="checkbox-field field">
            <input type="checkbox" id="dithering-checkbox" />
            <label for="dithering-checkbox" style="margin:0">Enable dithering (Floyd–Steinberg) for color-reduced/indexed formats</label>
          </div>
          <p class="note" id="raw-passthrough-note" style="display:none">Raw passthrough formats embed the original file bytes unmodified — color/dithering/transparency options don't apply.</p>
        </fieldset>

        <fieldset id="transparency-fieldset">
          <legend>Transparency</legend>
          <div class="field">
            <label for="transparency-mode">Approach</label>
            <select id="transparency-mode">
              <option value="none">None (fully opaque)</option>
              <option value="existingAlpha">Existing-alpha passthrough (use the source PNG's alpha channel)</option>
              <option value="colorPick">Color-pick transparency (pick a background color + tolerance)</option>
              <option value="chromaKey">Chroma-key (magic transparent color)</option>
            </select>
          </div>
          <div id="transparency-controls" style="display:none">
            <div class="row field" id="color-pick-row">
              <div>
                <label for="chroma-color">Picked / chroma color</label>
                <input type="color" id="chroma-color" value="#ff00ff" style="width:100%; height:2.2rem;" />
              </div>
              <div>
                <label>&nbsp;</label>
                <button type="button" class="secondary" id="pick-from-image-btn">Pick from preview →</button>
              </div>
            </div>
            <div class="field" id="tolerance-row">
              <label for="tolerance-slider">Tolerance (<span id="tolerance-value">24</span>)</label>
              <input type="range" id="tolerance-slider" min="0" max="150" value="24" />
            </div>
            <div class="field" id="feather-row">
              <label for="feather-slider">Edge feather / despill radius (<span id="feather-value">0</span>px)</label>
              <input type="range" id="feather-slider" min="0" max="8" value="0" />
            </div>
          </div>
          <p class="note warn" id="transparency-disabled-note" style="display:none">This color format has no alpha or chroma-key support for the selected LVGL version — transparency controls are disabled.</p>
        </fieldset>

        <fieldset>
          <legend>Output</legend>
          <div class="row field">
            <div>
              <label for="var-name-input">C variable name</label>
              <input type="text" id="var-name-input" value="img" />
            </div>
            <div>
              <label for="file-name-input">Output file name (no extension)</label>
              <input type="text" id="file-name-input" value="img" />
            </div>
          </div>
          <div class="field">
            <label for="output-mode-select">Output mode</label>
            <select id="output-mode-select">
              <option value="carray">C array (.c file)</option>
              <option value="binaryRaw">Raw binary (no C wrapper)</option>
              <option value="bin9">v9 .bin (LV_FS-loadable, header + data)</option>
            </select>
          </div>
          <div class="field" id="binary-variant-row" style="display:none">
            <label for="binary-variant-select">Raw binary variant</label>
            <select id="binary-variant-select">
              <option value="RGB332">RGB332 (1 byte/pixel)</option>
              <option value="RGB565">RGB565 (2 bytes/pixel, little-endian)</option>
              <option value="RGB565_SWAPPED">RGB565 byte-swapped (big-endian)</option>
              <option value="RGB888">RGB888 (3 bytes/pixel)</option>
            </select>
            <p class="note">Raw binary output packs straight R,G,B channel order and is not dithered in this version — pick a color format above for a dithered, transparency-aware C array instead.</p>
          </div>
          <div class="checkbox-field field" id="rle-row" style="display:none">
            <input type="checkbox" id="rle-checkbox" />
            <label for="rle-checkbox" style="margin:0">RLE-compress (experimental, custom scheme — see Format Reference)</label>
          </div>
        </fieldset>

        <div class="actions">
          <button class="primary" id="convert-btn" disabled>Convert</button>
          <button class="secondary" id="download-btn" disabled>Download</button>
          <button class="secondary" id="copy-btn" disabled>Copy to clipboard</button>
        </div>
        <p class="status" id="status-msg"></p>
      </div>

      <div>
        <fieldset>
          <legend>Preview</legend>
          <div class="preview-row">
            <div class="preview-box">
              <canvas id="preview-before"></canvas>
              <div class="caption">Source (click to pick a transparency color)</div>
            </div>
            <div class="preview-box">
              <canvas id="preview-after"></canvas>
              <div class="caption">Converted (simulated at target format precision)</div>
            </div>
          </div>
        </fieldset>
        <fieldset>
          <legend>Generated output</legend>
          <textarea id="output-text" readonly placeholder="Convert an image to see the generated C array here. Binary outputs won't render as text — use Download."></textarea>
        </fieldset>
      </div>
    </div>
  </section>

  <section id="panel-import" class="panel">
    ${co()}
  </section>

  <section id="panel-font" class="panel">
    <p class="note" id="font-panel-loading">Loading font engine (opentype.js)…</p>
  </section>

  <section id="panel-font-import" class="panel">
    <p class="note">Loading…</p>
  </section>

  <section id="panel-docs" class="panel">
    ${Kt()}
  </section>

  <footer class="app-footer">LVGL Asset Converter — static, client-side, open-source. See the Format Reference tab for known limitations before shipping generated assets to production firmware.</footer>
`;const v=e=>document.getElementById(e),X=v("version-select"),K=v("tab-convert-btn"),Y=v("tab-import-btn"),Z=v("tab-font-btn"),J=v("tab-font-import-btn"),Q=v("tab-docs-btn"),ho=v("panel-convert"),tt=v("panel-import"),ee=v("panel-font"),te=v("panel-font-import"),fo=v("panel-docs"),E=v("drop-zone"),oe=v("file-input"),go=v("svg-size-row"),re=v("svg-width"),ne=v("svg-height"),ot=v("file-info"),N=v("format-select"),rt=v("color-depth-row"),ae=v("dithering-checkbox"),mo=v("raw-passthrough-note"),B=v("transparency-mode"),nt=v("transparency-controls"),vo=v("transparency-disabled-note"),U=v("chroma-color"),bo=v("pick-from-image-btn"),Ce=v("tolerance-slider"),yo=v("tolerance-value"),Ae=v("feather-slider"),wo=v("feather-value"),se=v("var-name-input"),ie=v("file-name-input"),D=v("output-mode-select"),_o=v("binary-variant-row"),ke=v("binary-variant-select"),Lo=v("rle-row"),Ie=v("rle-checkbox"),at=v("convert-btn"),st=v("download-btn"),ce=v("copy-btn"),Me=v("status-msg"),le=v("preview-before"),xo=v("preview-after"),Ee=v("output-text");function it(){return Fe(p.version,p.formatId)}function M(e,t=""){Me.textContent=e,Me.className=`status ${t}`}function ct(){const e=Lt(p.version),t=p.formatId;N.innerHTML=e.map(r=>`<option value="${r.id}">${r.label}</option>`).join("");const o=e.some(r=>r.id===t);p.formatId=o?t:e[0].id,N.value=p.formatId,fe()}function fe(){const e=it();if(!e)return;const t=e.category==="trueColor"&&["true_color","true_color_alpha","true_color_chroma"].includes(e.id)&&p.version!=="v9";rt.style.display=t?"flex":"none",mo.style.display=e.isRawPassthrough?"block":"none",ae.disabled=!!e.isRawPassthrough;const o=e.supportsAlpha||e.supportsChroma;B.disabled=!o||!!e.isRawPassthrough,vo.style.display=o?"none":"block",o||(nt.style.display="none");const r=B.querySelector('option[value="chromaKey"]');r.disabled=!e.supportsChroma,["existingAlpha","colorPick"].forEach(c=>{const i=B.querySelector(`option[value="${c}"]`);i.disabled=!e.supportsAlpha}),p.transparencyMode==="none"||p.transparencyMode==="chromaKey"&&e.supportsChroma||["existingAlpha","colorPick"].includes(p.transparencyMode)&&e.supportsAlpha||(p.transparencyMode="none",B.value="none",ge()),Lo.style.display=p.version==="v9"&&e.supportsRle&&p.outputMode!=="binaryRaw"?"flex":"none";const a=D.querySelector('option[value="bin9"]');a.disabled=p.version!=="v9"||!!e.isRawPassthrough,a.disabled&&p.outputMode==="bin9"&&(p.outputMode="carray",D.value="carray"),_o.style.display=p.outputMode==="binaryRaw"?"block":"none"}function lt(){p.decodedImage&&F(p.decodedImage,le)}async function dt(e){p.file=e;const t=e.name.toLowerCase().endsWith(".svg")||e.type==="image/svg+xml";if(go.style.display=t?"flex":"none",t){const o=await bt(e);o&&(p.svgWidth=Math.round(o.width),p.svgHeight=Math.round(o.height),re.value=String(p.svgWidth),ne.value=String(p.svgHeight))}try{const o=await Ge(e,t?{width:p.svgWidth,height:p.svgHeight}:void 0);p.decodedImage=o,ot.textContent=`${e.name} — ${o.width}×${o.height}px`;const r=V(e.name.replace(/\.[^/.]+$/,""));p.varName=r,p.fileNameBase=r,se.value=r,ie.value=r,p.pickedColor=St(o),U.value="#"+p.pickedColor.map(n=>n.toString(16).padStart(2,"0")).join(""),lt(),at.disabled=!1,M("Image loaded. Adjust options and click Convert.","ok")}catch(o){M(`Failed to load image: ${o.message}`,"error")}}async function pt(){if(!p.file||!p.file.name.toLowerCase().endsWith(".svg"))return;const t=await Ge(p.file,{width:p.svgWidth,height:p.svgHeight});p.decodedImage=t,ot.textContent=`${p.file.name} — ${t.width}×${t.height}px`,lt()}function Ro(){if(!p.decodedImage||!p.file){M("Load an image first.","error");return}const e=it();if(e)try{if(p.outputMode==="binaryRaw"){const t=Wt(p.decodedImage,p.binaryVariant);p.result={fileName:`${V(p.fileNameBase)}_${p.binaryVariant}.bin`,kind:"binary",bytes:t,previewRgba:p.decodedImage}}else if(e.isRawPassthrough){Tt(p.file).then(t=>{const o=xe({version:p.version,format:e,variableName:p.varName,width:p.decodedImage.width,height:p.decodedImage.height,pixelData:t.data,stride:0,isRawPassthrough:!0,rle:!1});p.result={fileName:`${V(p.varName)}.c`,kind:"text",text:o,previewRgba:p.decodedImage},Oe()});return}else{const t=Ut(p.decodedImage,{mode:p.transparencyMode,pickedColor:p.pickedColor,tolerance:p.tolerance,feather:p.feather},e),o={colorDepth:p.colorDepth,dithering:p.dithering},r=Pt(t,e,o),n=Gt(t,e,o);if(p.outputMode==="bin9"){const s=Xe(r.palette,r.data),a=Ke(s,p.rle&&!!e.supportsRle),c=jt(e,p.decodedImage.width,p.decodedImage.height,r.stride,a);p.result={fileName:`${V(p.varName)}.bin`,kind:"binary",bytes:c,previewRgba:n}}else{const s=xe({version:p.version,format:e,variableName:p.varName,width:p.decodedImage.width,height:p.decodedImage.height,pixelData:r.data,paletteData:r.palette,stride:r.stride,isRawPassthrough:!1,rle:p.rle});p.result={fileName:`${V(p.varName)}.c`,kind:"text",text:s,previewRgba:n}}}Oe()}catch(t){M(`Conversion failed: ${t.message}`,"error")}}function Oe(){p.result&&(F(p.result.previewRgba,xo),p.result.kind==="text"?(Ee.value=p.result.text??"",ce.disabled=!1):(Ee.value=`(binary output — ${p.result.bytes?.length??0} bytes — use Download)`,ce.disabled=!0),st.disabled=!1,M(`Converted successfully → ${p.result.fileName}`,"ok"))}let de=null,Ve=!1;X.value=p.version;X.addEventListener("change",()=>{p.version=X.value,localStorage.setItem(et,p.version),ct(),de?.onVersionChange()});const Co=[{btn:K,panel:ho},{btn:Y,panel:tt},{btn:Z,panel:ee},{btn:J,panel:te},{btn:Q,panel:fo}];function S(e){for(const{btn:t,panel:o}of Co){const r=t===e;t.classList.toggle("active",r),o.classList.toggle("active",r)}}K.addEventListener("click",()=>S(K));Y.addEventListener("click",()=>S(Y));Q.addEventListener("click",()=>S(Q));Z.addEventListener("click",()=>{S(Z),!(de||Ve)&&(Ve=!0,Pe(async()=>{const{renderFontPanelHtml:e,wireFontPanel:t}=await import("./fontPanel-C20aX90a.js");return{renderFontPanelHtml:e,wireFontPanel:t}},[]).then(({renderFontPanelHtml:e,wireFontPanel:t})=>{ee.innerHTML=e(),de=t(ee,()=>p.version)}))});let Be=!1;J.addEventListener("click",()=>{S(J),!Be&&(Be=!0,Pe(async()=>{const{renderFontImportPanelHtml:e,wireFontImportPanel:t}=await import("./fontImportPanel-VI2aBLYo.js");return{renderFontImportPanelHtml:e,wireFontImportPanel:t}},[]).then(({renderFontImportPanelHtml:e,wireFontImportPanel:t})=>{te.innerHTML=e(),t(te)}))});lo(tt);E.addEventListener("click",()=>oe.click());E.addEventListener("dragover",e=>{e.preventDefault(),E.classList.add("dragover")});E.addEventListener("dragleave",()=>E.classList.remove("dragover"));E.addEventListener("drop",e=>{e.preventDefault(),E.classList.remove("dragover");const t=e.dataTransfer?.files?.[0];t&&dt(t)});oe.addEventListener("change",()=>{const e=oe.files?.[0];e&&dt(e)});re.addEventListener("change",()=>{p.svgWidth=Math.max(1,parseInt(re.value,10)||1),pt()});ne.addEventListener("change",()=>{p.svgHeight=Math.max(1,parseInt(ne.value,10)||1),pt()});N.addEventListener("change",()=>{p.formatId=N.value,fe()});rt.addEventListener("change",e=>{const t=e.target;t.name==="color-depth"&&(p.colorDepth=t.value==="32"?32:16)});ae.addEventListener("change",()=>{p.dithering=ae.checked});B.addEventListener("change",()=>{p.transparencyMode=B.value,ge()});const Ao=v("tolerance-row"),ko=v("feather-row"),Io=v("color-pick-row");function ge(){nt.style.display=p.transparencyMode==="none"?"none":"block";const e=p.transparencyMode==="colorPick"||p.transparencyMode==="chromaKey";Io.style.display=e?"flex":"none",Ao.style.display=e?"block":"none",ko.style.display=p.transparencyMode==="colorPick"||p.transparencyMode==="existingAlpha"?"block":"none"}U.addEventListener("input",()=>{const e=U.value.replace("#","");p.pickedColor=[parseInt(e.slice(0,2),16),parseInt(e.slice(2,4),16),parseInt(e.slice(4,6),16)]});bo.addEventListener("click",()=>{p.pickingFromImage=!0,M("Click a pixel on the source preview to pick its color…")});le.addEventListener("click",e=>{if(!p.pickingFromImage||!p.decodedImage)return;const t=le.getBoundingClientRect(),o=p.decodedImage.width/t.width,r=p.decodedImage.height/t.height,n=Math.floor((e.clientX-t.left)*o),s=Math.floor((e.clientY-t.top)*r),a=je(p.decodedImage,n,s);p.pickedColor=a,U.value="#"+a.map(c=>c.toString(16).padStart(2,"0")).join(""),p.pickingFromImage=!1,M("Color picked.","ok")});Ce.addEventListener("input",()=>{p.tolerance=parseInt(Ce.value,10),yo.textContent=String(p.tolerance)});Ae.addEventListener("input",()=>{p.feather=parseInt(Ae.value,10),wo.textContent=String(p.feather)});se.addEventListener("input",()=>{p.varName=se.value});ie.addEventListener("input",()=>{p.fileNameBase=ie.value});D.addEventListener("change",()=>{p.outputMode=D.value,fe()});ke.addEventListener("change",()=>{p.binaryVariant=ke.value});Ie.addEventListener("change",()=>{p.rle=Ie.checked});at.addEventListener("click",Ro);st.addEventListener("click",()=>{p.result&&(p.result.kind==="text"?qt(p.result.fileName,p.result.text??""):Xt(p.result.fileName,p.result.bytes??new Uint8Array))});ce.addEventListener("click",async()=>{p.result?.text&&(await navigator.clipboard.writeText(p.result.text),M("Copied to clipboard.","ok"))});ct();ge();export{G as B,Xt as a,yt as b,qt as d,$e as p,V as t,Ne as u};
