/* KUREKAM · Penyusun berkas Word (.docx) tanpa pustaka luar.
   Menerima daftar blok (judul, paragraf, tabel) lalu menghasilkan paket OOXML yang dibuka Word dan LibreOffice.
   Tabel memakai lebar tetap (dxa) sehingga rapi, tidak miring, dan tidak melebar saat dibuka.
   Sel: teks, atau objek { t, b, i, span, rs, skip, shade, al, va, color, img, sz }.
   Teks mendukung **tebal**, baris baru (\n), dan penanda {{HAL}} (jumlah halaman). */

const xe = (s) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const FONT = 'Times New Roman';

function run(t, o = {}) {
  const rpr = `${o.b ? '<w:b/><w:bCs/>' : ''}${o.i ? '<w:i/><w:iCs/>' : ''}${o.color ? `<w:color w:val="${o.color}"/>` : ''}${o.sz ? `<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>` : ''}`;
  return `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:t xml:space="preserve">${xe(t)}</w:t></w:r>`;
}
function fld(kode, o = {}) {
  const rpr = `${o.b ? '<w:b/>' : ''}${o.sz ? `<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>` : ''}`;
  const rp = rpr ? `<w:rPr>${rpr}</w:rPr>` : '';
  return `<w:r>${rp}<w:fldChar w:fldCharType="begin"/></w:r><w:r>${rp}<w:instrText xml:space="preserve"> ${kode} </w:instrText></w:r><w:r>${rp}<w:fldChar w:fldCharType="separate"/></w:r><w:r>${rp}<w:t>1</w:t></w:r><w:r>${rp}<w:fldChar w:fldCharType="end"/></w:r>`;
}
/** Teks berformat ringan menjadi deretan run. */
export function runs(text, o = {}) {
  const lines = String(text == null ? '' : text).split('\n');
  let out = '';
  lines.forEach((ln, li) => {
    if (li) out += '<w:r><w:br/></w:r>';
    ln.split('{{HAL}}').forEach((part, pi) => {
      if (pi) out += fld('NUMPAGES', o);
      part.split('**').forEach((seg, i) => { if (seg) out += run(seg, { ...o, b: o.b || i % 2 === 1 }); });
    });
  });
  return out;
}
function gambar(img, id) {
  const cx = Math.round(img.w * 360000 / 100), cy = Math.round(img.h * 360000 / 100); /* w dan h dalam 1/100 cm */
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Logo ${id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

function para(t, o = {}) {
  const ppr = `${o.keep ? '<w:keepNext/>' : ''}${o.pb ? '<w:pageBreakBefore/>' : ''}<w:spacing w:before="${o.sb || 0}" w:after="${o.sa == null ? 0 : o.sa}"${o.line ? ` w:line="${o.line}" w:lineRule="auto"` : ''}/>${o.ind || o.hang ? `<w:ind w:left="${(o.ind || 0) + (o.hang || 0)}"${o.hang ? ` w:hanging="${o.hang}"` : ''}/>` : ''}${o.al ? `<w:jc w:val="${{ c: 'center', r: 'right', j: 'both', l: 'left' }[o.al] || o.al}"/>` : ''}`;
  return `<w:p><w:pPr>${o.style ? `<w:pStyle w:val="${o.style}"/>` : ''}${ppr}</w:pPr>${o.img ? gambar(o.img, o.imgId || 1) : runs(t, o)}</w:p>`;
}

const BORDER = (c = '000000', sz = 4) => ['top', 'left', 'bottom', 'right'].map(k => `<w:${k} w:val="single" w:sz="${sz}" w:space="0" w:color="${c}"/>`).join('');

/** Tabel. spec: { w: [lebar kolom dxa], rows: [[sel]], head: jumlah baris judul yang diulang, sz: ukuran huruf (setengah poin) } */
function tabel(spec, state) {
  const W = spec.w, tot = W.reduce((a, b) => a + b, 0), sz = spec.sz || 18;
  let xml = `<w:tbl><w:tblPr><w:tblW w:w="${tot}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>${BORDER()}<w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="30" w:type="dxa"/><w:left w:w="70" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${W.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;
  spec.rows.forEach((row, ri) => {
    const head = ri < (spec.head || 0);
    xml += `<w:tr><w:trPr><w:cantSplit/>${head ? '<w:tblHeader/>' : ''}</w:trPr>`;
    let ci = 0;
    row.forEach((cell) => {
      const c = typeof cell === 'object' && cell !== null ? cell : { t: cell };
      const span = c.span || 1;
      const width = W.slice(ci, ci + span).reduce((a, b) => a + b, 0);
      ci += span;
      const shade = c.shade || (head ? 'D9E2F3' : '');
      const al = c.al || (head ? 'c' : '');
      let tcpr = `<w:tcW w:w="${width}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}${c.rs ? '<w:vMerge w:val="restart"/>' : c.skip ? '<w:vMerge/>' : ''}${shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${shade}"/>` : ''}<w:vAlign w:val="${c.va || (head ? 'center' : 'top')}"/>`;
      let inner;
      if (c.skip) inner = '<w:p/>';
      else if (c.img) inner = para('', { img: c.img, imgId: ++state.img, al: 'c' });
      else {
        const o = { b: c.b || head, i: c.i, color: c.color, sz: c.sz || sz, al };
        inner = String(c.t == null ? '' : c.t).split('\u00b6').map(blok => para(blok, o)).join('');
      }
      xml += `<w:tc><w:tcPr>${tcpr}</w:tcPr>${inner}</w:tc>`;
    });
    xml += '</w:tr>';
  });
  return xml + '</w:tbl>' + '<w:p><w:pPr><w:spacing w:before="0" w:after="60"/><w:rPr><w:sz w:val="8"/></w:rPr></w:pPr></w:p>';
}

function badan(blocks, state) {
  return blocks.map(b => {
    if (b.k === 'tbl') return tabel(b, state);
    if (b.k === 'h') return para(b.t, { style: 'Judul' + (b.lvl || 1), b: true, sz: b.sz || (b.lvl === 2 ? 22 : 24), sb: b.sb == null ? 160 : b.sb, sa: 80, keep: true, pb: b.pb, al: b.al });
    if (b.k === 'br') return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    return para(b.t, { sz: b.sz || 20, al: b.al || 'j', ind: b.ind, hang: b.hang, sa: b.sa == null ? 60 : b.sa, sb: b.sb, i: b.i, b: b.b, keep: b.keep, line: 250, color: b.color });
  }).join('');
}

/* ---------- Penyusun ZIP (tanpa kompresi) ---------- */
let CRC = null;
function crc32(u8) {
  if (!CRC) { CRC = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } }
  let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
export function zip(files) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  const u16 = (v) => [v & 255, (v >> 8) & 255], u32 = (v) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
  files.forEach(f => {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
    const lh = new Uint8Array([0x50, 0x4b, 3, 4, 20, 0, 0, 8, 0, 0, 0, 0, 0x76, 0x5D, ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), 0, 0]);
    parts.push(lh, name, data);
    central.push(new Uint8Array([0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 8, 0, 0, 0, 0, 0x76, 0x5D, ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(off)]), name);
    off += lh.length + name.length + data.length;
  });
  const cdSize = central.reduce((a, p) => a + p.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(off), 0, 0]);
  return new Blob([...parts, ...central, end], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';

/** Hasilkan Blob .docx. opsi: { blocks, logo (Uint8Array png), footer, landscape, margin (dxa), judul } */
export function buatDocx(o) {
  const land = o.landscape !== false, m = o.margin == null ? 510 : o.margin, state = { img: 0 };
  const sect = `<w:sectPr><w:footerReference w:type="default" r:id="rIdFoot"/><w:pgSz w:w="${land ? 16838 : 11906}" w:h="${land ? 11906 : 16838}"${land ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="${m}" w:right="${m}" w:bottom="${m + 200}" w:left="${m}" w:header="283" w:footer="283" w:gutter="0"/></w:sectPr>`;
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${badan(o.blocks, state)}${sect}</w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:eastAsia="${FONT}" w:cs="${FONT}"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="paragraph" w:styleId="Judul1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Judul2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/></w:rPr></w:style></w:styles>`;
  const foot = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${runs((o.footer || '') + ' · Halaman ', { sz: 16, color: '555555' })}${fld('PAGE', { sz: 16 })}${runs(' dari ', { sz: 16, color: '555555' })}${fld('NUMPAGES', { sz: 16 })}</w:p></w:ftr>`;
  const files = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>` },
    { name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xe(o.judul || 'Dokumen KUREKAM')}</dc:title><dc:creator>KUREKAM</dc:creator></cp:coreProperties>` },
    { name: 'word/document.xml', data: doc },
    { name: 'word/styles.xml', data: styles },
    { name: 'word/footer1.xml', data: foot },
    { name: 'word/_rels/document.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdSt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFoot" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>${o.logo ? '<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>' : ''}</Relationships>` },
  ];
  if (o.logo) files.push({ name: 'word/media/logo.png', data: o.logo });
  return zip(files);
}

/** Muat berkas gambar sebagai Uint8Array (null bila gagal). */
export async function muatBerkas(url) {
  try { const r = await fetch(url); if (!r.ok) return null; return new Uint8Array(await r.arrayBuffer()); } catch (e) { return null; }
}
