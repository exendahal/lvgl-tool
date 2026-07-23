import{u as F}from"./index-rbrdAi8M.js";function R(r){return r.replace(/\/\*[\s\S]*?\*\//g," ").replace(/\/\/.*$/gm," ")}function N(r,e,a){const i=new RegExp(`${e}\\s+${a}\\s*\\[\\]\\s*=\\s*\\{([\\s\\S]*?)\\}\\s*;`),c=r.match(i);return c?c[1]:null}function C(r){const e=r.match(/-?0[xX][0-9a-fA-F]+|-?\d+/g);return e?e.map(Number):[]}function S(r,e){const a=r.match(new RegExp(`\\.${e}\\s*=\\s*&?(\\w+)`));return a?a[1]==="NULL"?null:a[1]:null}function T(r){const e=R(r),a=e.match(/lv_font_fmt_txt_dsc_t\s+(\w+)\s*=\s*\{([\s\S]*?)\};/);if(!a)return{ok:!1,error:"Could not find an `lv_font_fmt_txt_dsc_t ... = { ... };` block — doesn't look like a recognized LVGL font source."};const i=a[2],c=S(i,"glyph_bitmap"),l=S(i,"glyph_dsc"),s=S(i,"cmaps"),u=i.match(/\.bpp\s*=\s*(\d+)/);if(!c||!l||!s||!u)return{ok:!1,error:"font_dsc block is missing one of .glyph_bitmap / .glyph_dsc / .cmaps / .bpp — unrecognized or malformed layout."};const d=Number(u[1]),o=i.match(/\.kern_dsc\s*=\s*(\w+)/),p=!!o&&o[1]!=="NULL",n=N(e,"uint8_t",c);if(n===null)return{ok:!1,error:`Could not find the referenced bitmap array \`${c}\`.`};const h=Uint8Array.from(C(n).map(t=>t&255)),f=N(e,"lv_font_fmt_txt_glyph_dsc_t",l);if(f===null)return{ok:!1,error:`Could not find the referenced glyph_dsc array \`${l}\`.`};const L=f.match(/\{[^{}]*\}/g)??[],v=[];for(const t of L){const m=t.match(/\.bitmap_index\s*=\s*(\d+)/),g=t.match(/\.adv_w\s*=\s*(-?\d+)/),y=t.match(/\.box_w\s*=\s*(\d+)/),_=t.match(/\.box_h\s*=\s*(\d+)/),k=t.match(/\.ofs_x\s*=\s*(-?\d+)/),b=t.match(/\.ofs_y\s*=\s*(-?\d+)/);!m||!g||!y||!_||!k||!b||v.push({bitmapIndex:Number(m[1]),advW:Number(g[1]),boxW:Number(y[1]),boxH:Number(_[1]),ofsX:Number(k[1]),ofsY:Number(b[1])})}if(v.length===0)return{ok:!1,error:"glyph_dsc array parsed but yielded no valid entries — unrecognized field layout."};const w=v.slice(1),x=N(e,"lv_font_fmt_txt_cmap_t",s);if(x===null)return{ok:!1,error:`Could not find the referenced cmap array \`${s}\`.`};const B=x.match(/\.range_start\s*=\s*(\d+)/),H=x.match(/\.range_length\s*=\s*(\d+)/),I=x.match(/\.glyph_id_start\s*=\s*(\d+)/);if(!B||!H||!I)return{ok:!1,error:"cmap entry is missing .range_start / .range_length / .glyph_id_start."};const E=Number(B[1]),D=Number(I[1]),P=/SPARSE/.test(x),M=new Map;if(P){const t=S(x,"unicode_list"),m=S(x,"glyph_id_ofs_list");if(!t||!m)return{ok:!1,error:"Sparse cmap is missing .unicode_list / .glyph_id_ofs_list references."};const g=N(e,"uint16_t",t),y=N(e,"uint16_t",m);if(g===null||y===null)return{ok:!1,error:"Could not locate the sparse cmap unicode_list / glyph_id_ofs_list array bodies."};const _=C(g),k=C(y);for(let b=0;b<_.length;b++){const A=E+_[b],G=D+(k[b]??b);M.set(G-1,A)}}else{const t=Number(H[1]);for(let m=0;m<t;m++){const g=D+m;M.set(g-1,E+m)}}const $=[];if(w.forEach((t,m)=>{const g=M.get(m);if(g===void 0)return;let y=new Uint8Array(0);if(t.boxW>0&&t.boxH>0){const _=Math.ceil(t.boxW*d/8)*t.boxH,k=h.slice(t.bitmapIndex,t.bitmapIndex+_);y=F(k,t.boxW,t.boxH,d)}$.push({codepoint:g,boxW:t.boxW,boxH:t.boxH,ofsX:t.ofsX,ofsY:t.ofsY,advWPx:t.advW/16,levels:y})}),$.length===0)return{ok:!1,error:"Parsed the font structure but could not resolve any codepoint → glyph mapping — cmap format may be unrecognized."};const U=e.match(/lv_font_t\s+\w+\s*=\s*\{([\s\S]*?)\};/),W=U?.[1].match(/\.line_height\s*=\s*(\d+)/),z=U?.[1].match(/\.base_line\s*=\s*(\d+)/);return{ok:!0,font:{bpp:d,lineHeight:W?Number(W[1]):void 0,baseLine:z?Number(z[1]):void 0,kerningPresent:p,glyphBitmapByteSize:h.length,glyphs:$,versionNote:"Font glyph/bitmap/cmap layout is shared across v7/v8/v9 in this tool’s architecture, so decoding does not depend on picking the right version — only kerning-table/fallback presence hints at v8+."}}}function O(){return`
  <div class="grid">
    <div>
      <fieldset>
        <legend>Load an existing LVGL font source</legend>
        <div class="field">
          <label for="font-import-file-input">Upload a font .c source</label>
          <input type="file" id="font-import-file-input" accept=".c,.h,text/plain" />
        </div>
        <div class="field">
          <label for="font-import-text-area">…or paste .c source text directly</label>
          <textarea id="font-import-text-area" rows="10" style="width:100%; font-family: Consolas, monospace; font-size: 0.8rem;" placeholder="static const lv_font_fmt_txt_dsc_t my_font_dsc = { ... };"></textarea>
        </div>
        <div class="actions">
          <button class="primary" id="font-import-decode-btn">Decode &amp; preview</button>
        </div>
        <p class="status" id="font-import-status"></p>
      </fieldset>
    </div>
    <div>
      <fieldset>
        <legend>Metadata</legend>
        <div id="font-import-metadata" class="note">Load and decode a font source to see metadata here.</div>
      </fieldset>
      <fieldset>
        <legend>Glyph grid</legend>
        <div id="font-import-glyph-grid" style="display:flex; flex-wrap:wrap; gap:6px; max-height: 480px; overflow:auto;"></div>
      </fieldset>
    </div>
  </div>`}function V(r){const e=o=>r.querySelector("#"+o),a=e("font-import-file-input"),i=e("font-import-text-area"),c=e("font-import-decode-btn"),l=e("font-import-status"),s=e("font-import-metadata"),u=e("font-import-glyph-grid");function d(o,p=""){l.textContent=o,l.className=`status ${p}`}a.addEventListener("change",async()=>{const o=a.files?.[0];o&&(i.value=await o.text(),d(`Loaded ${o.name} — click Decode & preview.`))}),c.addEventListener("click",()=>{const o=i.value;if(!o.trim()){d("Paste a font .c source or upload a file first.","error");return}const p=T(o);if(!p.ok){d(p.error,"error"),s.textContent="Decode failed — see error above.",u.innerHTML="";return}const n=p.font,h=n.glyphs.map(v=>v.codepoint),f=Math.min(...h),L=Math.max(...h);s.innerHTML=`
      <div><strong>Glyph count:</strong> ${n.glyphs.length}</div>
      <div><strong>Bits per pixel:</strong> ${n.bpp}</div>
      <div><strong>Line height:</strong> ${n.lineHeight??"unknown"}px</div>
      <div><strong>Base line:</strong> ${n.baseLine??"unknown"}px</div>
      <div><strong>Kerning table present:</strong> ${n.kerningPresent?"yes":"no"}</div>
      <div><strong>Character range:</strong> U+${f.toString(16).toUpperCase()}–U+${L.toString(16).toUpperCase()}</div>
      <div><strong>Bitmap array size (flash footprint):</strong> ${n.glyphBitmapByteSize.toLocaleString()} bytes</div>
      <p class="note">${n.versionNote}</p>
    `,X(u,n.glyphs,n.bpp),d(`Decoded ${n.glyphs.length} glyph(s) successfully.`,"ok")})}function X(r,e,a){r.innerHTML="";const i=(1<<a)-1;for(const c of e){const l=document.createElement("div");l.style.textAlign="center",l.style.fontSize="0.7rem",l.style.color="var(--muted)";const s=document.createElement("canvas"),u=Math.max(1,c.boxW),d=Math.max(1,c.boxH);s.width=u,s.height=d,s.style.width=Math.max(16,u*2)+"px",s.style.height=Math.max(16,d*2)+"px",s.style.background="#fff",s.style.border="1px solid var(--border)";const o=s.getContext("2d"),p=o.createImageData(u,d);for(let f=0;f<u*d;f++){const L=c.levels[f]??0,v=i>0?L/i:0,w=Math.round(255*(1-v));p.data[f*4]=w,p.data[f*4+1]=w,p.data[f*4+2]=w,p.data[f*4+3]=255}o.putImageData(p,0,0);const n=document.createElement("div"),h=c.codepoint;n.textContent=h>=32&&h!==127&&h<196607?String.fromCodePoint(h):`U+${h.toString(16).toUpperCase()}`,l.appendChild(s),l.appendChild(n),r.appendChild(l)}}export{O as renderFontImportPanelHtml,V as wireFontImportPanel};
