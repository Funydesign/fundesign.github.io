const drop = document.getElementById('drop');
const fileInput = document.getElementById('file');
const textInput = document.getElementById('text');
const preview = document.getElementById('preview');
const content = document.getElementById('content');
const meta = document.getElementById('meta');
const sourceCanvas = document.getElementById('sourceCanvas');
const renderCanvas = document.getElementById('renderCanvas');
const colorPicker = document.getElementById('colorPicker');
const colorHex = document.getElementById('colorHex');
const fontSize = document.getElementById('fontSize');

// Global error handler
window.onerror = function(msg, url, line, col, error) {
    reportError(msg || '脚本运行异常');
    return false;
};

const debugPanel = document.getElementById('debugPanel');
const debugContent = document.getElementById('debugContent');

let nine = null;
let originalUrl = null;
let lastImageW = 0, lastImageH = 0;

function logDebug(msg, data = null) {
    debugPanel.style.display = 'block';
    const time = new Date().toLocaleTimeString();
    let text = `[${time}] ${msg}`;
    debugContent.textContent += text + '\n\n';
}

function clearDebug() {
    debugContent.textContent = '';
    debugPanel.style.display = 'none';
}

function reportError(desc) {
    debugPanel.style.display = 'block';
    const time = new Date().toLocaleTimeString();
    debugContent.textContent += `[${time}] 错误：${desc}\n\n`;
}

function stretchSummary(runsArr) {
    if (!runsArr || !runsArr.length) return '无';
    const segs = runsArr.filter(r => r.stretch).map(r => `${r.start}–${r.end}`);
    return segs.length ? segs.join('，') : '无';
}

function reportSuccess(kind, nineObj) {
    debugPanel.style.display = 'block';
    const time = new Date().toLocaleTimeString();
    const md = minDims();
    const msg = [
        `[${time}] 显示正常（${kind}）`,
        `图片尺寸：${nineObj.W}×${nineObj.H}`,
        `横向拉伸规则：${stretchSummary(nineObj.hr)}`,
        `纵向拉伸规则：${stretchSummary(nineObj.vr)}`,
        `内容区域内边距：上下 ${nineObj.pad.top}、${nineObj.pad.bottom}；左右 ${nineObj.pad.left}、${nineObj.pad.right}`,
        `最小内部尺寸：${md.mw}×${md.mh}`
    ].join('\n');
    debugContent.textContent += msg + '\n\n';
}

function pickFile() {
    fileInput.click();
}

drop.addEventListener('click', pickFile);
drop.addEventListener('dragover', e => {
    e.preventDefault();
    drop.classList.add('drag');
});
drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('drag');
    handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', () => handleFiles(fileInput.files));

async function handleFiles(files) {
    if (!files || !files.length) return;
    clearDebug();
    
    const f = files[0];
    meta.textContent = `正在处理文件: ${f.name}...`;
    logDebug(`Processing file: ${f.name} (${f.type}, ${f.size} bytes)`);
    
    const isPng = f.name.endsWith('.png') || f.type === 'image/png';
    if (!isPng) {
        meta.textContent = '请拖入 .9.png 或编译后的 .png 图片';
        reportError('文件类型不是 PNG');
        return;
    }

    try {
        const arrayBuffer = await f.arrayBuffer();
        const compiledData = parseNpTcChunk(arrayBuffer);
        const url = URL.createObjectURL(f);
        loadImage(url, compiledData);
    } catch (e) {
        meta.textContent = '读取文件失败';
        reportError(e && e.message ? e.message : '读取文件失败');
    }
}

function parseNpTcChunk(buffer) {
    const view = new DataView(buffer);
    if (view.getUint32(0) !== 0x89504E47 || view.getUint32(4) !== 0x0D0A1A0A) {
        reportError('PNG 文件签名无效');
        return null;
    }

    let offset = 8;
    const foundChunks = [];
    while (offset < buffer.byteLength) {
        if (offset + 8 > buffer.byteLength) break;
        const length = view.getUint32(offset);
        const type = view.getUint32(offset + 4);
        const typeStr = String.fromCharCode(
            (type >> 24) & 0xFF,
            (type >> 16) & 0xFF,
            (type >> 8) & 0xFF,
            type & 0xFF
        );
        foundChunks.push(`${typeStr} (${length} bytes)`);

        if (type === 0x6E705463) {
            logDebug("已检测到编译 9-patch 数据，开始解析");
            return decodeNpTc(buffer, offset + 8, length);
        }
        
        offset += 8 + length + 4;
    }
    logDebug("npTc chunk not found. Found chunks:", foundChunks);
    return null;
}

function decodeNpTc(buffer, offset, length) {
    const view = new DataView(buffer);
    const baseOffset = offset;
    const leOffsets = true;
    const leData = false;

    const wasDeserialized = view.getInt8(baseOffset + 0);
    const numXDivs = view.getInt8(baseOffset + 1);
    const numYDivs = view.getInt8(baseOffset + 2);
    const numColors = view.getInt8(baseOffset + 3);
    
    let xDivsOffset = view.getUint32(baseOffset + 4, leOffsets);
    let yDivsOffset = view.getUint32(baseOffset + 8, leOffsets);
    
    if (xDivsOffset > length || yDivsOffset > length) {
        logDebug("Offsets huge with LE, trying BE for offsets...");
        xDivsOffset = view.getUint32(baseOffset + 4, !leOffsets);
        yDivsOffset = view.getUint32(baseOffset + 8, !leOffsets);
    }

    let paddingLeft = view.getInt32(baseOffset + 12, leData);
    let paddingRight = view.getInt32(baseOffset + 16, leData);
    let paddingTop = view.getInt32(baseOffset + 20, leData);
    let paddingBottom = view.getInt32(baseOffset + 24, leData);
    
    if (Math.abs(paddingLeft) > 10000 || Math.abs(paddingRight) > 10000) {
         logDebug("Padding huge with BE, trying LE...");
         paddingLeft = view.getInt32(baseOffset + 12, !leData);
         paddingRight = view.getInt32(baseOffset + 16, !leData);
         paddingTop = view.getInt32(baseOffset + 20, !leData);
         paddingBottom = view.getInt32(baseOffset + 24, !leData);
    }

    const colorsOffset = view.getUint32(baseOffset + 28, leOffsets);

    const xDivs = [];
    const yDivs = [];
    
    if (xDivsOffset + numXDivs * 4 > length) {
         throw new Error(`xDivsOffset ${xDivsOffset} out of bounds (length ${length})`);
    }
    
    for (let i = 0; i < numXDivs; i++) {
        xDivs.push(view.getInt32(baseOffset + xDivsOffset + i * 4, leData));
    }
    
    if (yDivsOffset + numYDivs * 4 > length) {
         throw new Error(`yDivsOffset ${yDivsOffset} out of bounds`);
    }
    
    for (let i = 0; i < numYDivs; i++) {
        yDivs.push(view.getInt32(baseOffset + yDivsOffset + i * 4, leData));
    }
    
    if (xDivs.length > 0 && Math.abs(xDivs[0]) > 10000) {
         logDebug("xDivs huge, trying swapped endianness...");
         for(let i=0; i<xDivs.length; i++) {
             xDivs[i] = view.getInt32(baseOffset + xDivsOffset + i * 4, !leData);
         }
    }
    if (yDivs.length > 0 && Math.abs(yDivs[0]) > 10000) {
         logDebug("yDivs huge, trying swapped endianness...");
         for(let i=0; i<yDivs.length; i++) {
             yDivs[i] = view.getInt32(baseOffset + yDivsOffset + i * 4, !leData);
         }
    }

    return {
        xDivs,
        yDivs,
        pad: {
            left: paddingLeft,
            right: paddingRight,
            top: paddingTop,
            bottom: paddingBottom
        }
    };
}

function isBlack(p) {
    return p[3] > 0 && p[0] === 0 && p[1] === 0 && p[2] === 0;
}

function runs(arr) {
    const out = [];
    let i = 0;
    while (i < arr.length) {
        let v = arr[i];
        let j = i + 1;
        while (j < arr.length && arr[j] === v) j++;
        out.push({
            start: i,
            end: j,
            stretch: !!v
        });
        i = j;
    }
    return out;
}

function getDivsAsRuns(divs, max) {
    if (!divs || divs.length === 0) {
        return [{start: 0, end: max, stretch: false}];
    }
    
    const out = [];
    let cursor = 0;
    const len = divs.length % 2 === 0 ? divs.length : divs.length - 1;
    if (len !== divs.length) {
        logDebug("Warning: Odd number of divs, ignoring last one", divs);
    }
    
    for (let i = 0; i < len; i += 2) {
        const start = divs[i];
        const end = divs[i+1];
        if (start > cursor) {
            out.push({start: cursor, end: start, stretch: false});
        }
        if (end > start) {
            out.push({start: start, end: end, stretch: true});
        }
        cursor = end;
    }
    
    if (cursor < max) {
        out.push({start: cursor, end: max, stretch: false});
    }
    
    return out;
}

function validateCompiledData(data, W, H) {
    if (!data) return false;
    const x = data.xDivs || [];
    const y = data.yDivs || [];
    if (x.length < 2 || y.length < 2) return false;
    if (x.length % 2 !== 0 || y.length % 2 !== 0) return false;
    for (let i = 0; i < x.length; i++) {
        if (x[i] < 0 || x[i] > W) return false;
    }
    for (let i = 0; i < y.length; i++) {
        if (y[i] < 0 || y[i] > H) return false;
    }
    for (let i = 0; i < x.length; i += 2) {
        if (x[i] >= x[i+1]) return false;
    }
    for (let i = 0; i < y.length; i += 2) {
        if (y[i] >= y[i+1]) return false;
    }
    const pad = data.pad || {left:0,right:0,top:0,bottom:0};
    if (pad.left < 0 || pad.right < 0 || pad.top < 0 || pad.bottom < 0) return false;
    if (pad.left + pad.right > W) return false;
    if (pad.top + pad.bottom > H) return false;
    return true;
}

function minDims() {
    if (!nine) return { mw: 0, mh: 0 };
    let fixedW = 0;
    nine.hr.forEach(r => {
        const w = r.end - r.start;
        if (!r.stretch) fixedW += w;
    });
    let fixedH = 0;
    nine.vr.forEach(r => {
        const h = r.end - r.start;
        if (!r.stretch) fixedH += h;
    });
    return { mw: fixedW, mh: fixedH };
}

function normalizeHex(v) {
    if (!v) return null;
    let s = v.trim();
    if (s[0] !== '#') s = '#' + s;
    const m = s.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    if (!m) return null;
    if (m[1].length === 3) {
        const a = m[1];
        s = '#' + a[0] + a[0] + a[1] + a[1] + a[2] + a[2];
    }
    return s.toLowerCase();
}

function parseNine(ctx, w, h) {
    const img = ctx.getImageData(0, 0, w, h).data;
    const W = w - 2, H = h - 2;
    const top = [];
    for (let x = 1; x < w - 1; x++) {
        const idx = (0 * w + x) * 4;
        top.push(isBlack([img[idx], img[idx + 1], img[idx + 2], img[idx + 3]]));
    }
    const left = [];
    for (let y = 1; y < h - 1; y++) {
        const idx = (y * w + 0) * 4;
        left.push(isBlack([img[idx], img[idx + 1], img[idx + 2], img[idx + 3]]));
    }
    const right = [];
    for (let y = 1; y < h - 1; y++) {
        const idx = (y * w + (w - 1)) * 4;
        right.push(isBlack([img[idx], img[idx + 1], img[idx + 2], img[idx + 3]]));
    }
    const bottom = [];
    for (let x = 1; x < w - 1; x++) {
        const idx = ((h - 1) * w + x) * 4;
        bottom.push(isBlack([img[idx], img[idx + 1], img[idx + 2], img[idx + 3]]));
    }
    let cx0 = 0, cx1 = W;
    for (let i = 0; i < bottom.length; i++) {
        if (bottom[i]) { cx0 = i; break; }
    }
    for (let i = bottom.length - 1; i >= 0; i--) {
        if (bottom[i]) { cx1 = i + 1; break; }
    }
    let cy0 = 0, cy1 = H;
    for (let i = 0; i < right.length; i++) {
        if (right[i]) { cy0 = i; break; }
    }
    for (let i = right.length - 1; i >= 0; i--) {
        if (right[i]) { cy1 = i + 1; break; }
    }
    const pad = { left: cx0, top: cy0, right: W - cx1, bottom: H - cy1 };
    const hr = runs(top);
    const vr = runs(left);
    return { W, H, hr, vr, pad, isCompiled: false };
}

function loadImage(url, compiledData) {
    const img = new Image();
    originalUrl = url;
    img.onload = () => {
        lastImageW = img.width;
        lastImageH = img.height;
        sourceCanvas.width = img.width;
        sourceCanvas.height = img.height;
        const sctx = sourceCanvas.getContext('2d');
        sctx.clearRect(0, 0, img.width, img.height);
        sctx.drawImage(img, 0, 0);
        
        if (compiledData) {
            const isValid = validateCompiledData(compiledData, img.width, img.height);
            if (isValid) {
                nine = {
                    W: img.width,
                    H: img.height,
                    hr: getDivsAsRuns(compiledData.xDivs, img.width),
                    vr: getDivsAsRuns(compiledData.yDivs, img.height),
                    pad: compiledData.pad,
                    isCompiled: true
                };
                reportSuccess('编译版', nine);
                const md = minDims();
                meta.textContent = `编译版 .9.png 尺寸 ${img.width}×${img.height} 内边距 L${nine.pad.left} T${nine.pad.top} R${nine.pad.right} B${nine.pad.bottom} 最小内部 ${md.mw}×${md.mh}`;
            } else {
                reportError('9-patch 数据解析异常，已降级为普通图片显示');
                nine = null;
                meta.textContent = `[警告] 9-patch 数据解析异常，已降级为普通图片显示。尺寸 ${img.width}×${img.height}`;
            }
        } else {
            nine = parseNine(sctx, img.width, img.height);
            reportSuccess('源版', nine);
            const md = minDims();
            meta.textContent = `源 .9.png 尺寸 ${img.width}×${img.height} 内部 ${nine.W}×${nine.H} 内边距 L${nine.pad.left} T${nine.pad.top} R${nine.pad.right} B${nine.pad.bottom} 最小内部 ${md.mw}×${md.mh}`;
        }
        updateRender();
    };
    img.src = url;
}

function measureContent() {
    if (!nine) {
        content.textContent = textInput.value;
        return { tw: 0, th: 0 };
    }
    const pad = nine.pad;
    content.style.paddingLeft = `${pad.left}px`;
    content.style.paddingRight = `${pad.right}px`;
    content.style.paddingTop = `${pad.top}px`;
    content.style.paddingBottom = `${pad.bottom}px`;
    content.textContent = textInput.value;
    const fz = `${fontSize.value}px`;
    content.style.fontSize = fz;
    const md = minDims();
    const m = document.createElement('div');
    m.style.position = 'absolute';
    m.style.visibility = 'hidden';
    m.style.left = '-10000px';
    m.style.top = '-10000px';
    m.style.whiteSpace = 'pre';
    m.style.display = 'inline-block';
    m.style.paddingLeft = `${pad.left}px`;
    m.style.paddingRight = `${pad.right}px`;
    m.style.paddingTop = `${pad.top}px`;
    m.style.paddingBottom = `${pad.bottom}px`;
    m.textContent = textInput.value;
    m.style.fontSize = fz;
    document.body.appendChild(m);
    let tw = Math.max(m.offsetWidth, md.mw, pad.left + pad.right);
    m.style.whiteSpace = 'pre-wrap';
    m.style.width = `${tw}px`;
    let thCandidate = m.offsetHeight;
    document.body.removeChild(m);
    let th = Math.max(thCandidate, md.mh, pad.top + pad.bottom);
    content.style.width = `${tw}px`;
    return { tw, th };
}

function drawNine(targetW, targetH) {
    const sctx = sourceCanvas.getContext('2d');
    const rctx = renderCanvas.getContext('2d');
    renderCanvas.width = targetW;
    renderCanvas.height = targetH;
    rctx.clearRect(0, 0, targetW, targetH);
    const W = nine.W, H = nine.H;
    const sx0 = nine.isCompiled ? 0 : 1;
    const sy0 = nine.isCompiled ? 0 : 1;
    const hr = nine.hr, vr = nine.vr;
    let fixedW = 0, stretchW = 0;
    hr.forEach(r => {
        const w = r.end - r.start;
        if (r.stretch) stretchW += w;
        else fixedW += w;
    });
    let fixedH = 0, stretchH = 0;
    vr.forEach(r => {
        const h = r.end - r.start;
        if (r.stretch) stretchH += h;
        else fixedH += h;
    });
    const extraW = Math.max(0, targetW - fixedW);
    const extraH = Math.max(0, targetH - fixedH);
    let dx = 0;
    hr.forEach(r => {
        const sw = r.end - r.start;
        let dw = sw;
        if (r.stretch) {
            if (stretchW > 0) dw = Math.max(0, Math.floor(sw / stretchW * extraW));
            else dw = sw;
        }
        let dy = 0;
        vr.forEach(c => {
            const sh = c.end - c.start;
            let dh = sh;
            if (c.stretch) {
                if (stretchH > 0) dh = Math.max(0, Math.floor(sh / stretchH * extraH));
                else dh = sh;
            }
            if (sw > 0 && sh > 0 && dw > 0 && dh > 0) {
                 rctx.drawImage(sourceCanvas, sx0 + r.start, sy0 + c.start, sw, sh, dx, dy, dw, dh);
            }
            dy += dh;
        });
        dx += dw;
    });
}

function updateRender() {
    if (!nine) {
        preview.style.width = `${lastImageW}px`;
        preview.style.height = `${lastImageH}px`;
        preview.style.backgroundImage = originalUrl ? `url(${originalUrl})` : '';
        content.style.padding = '0';
        return;
    }
    const m = measureContent();
    drawNine(m.tw, m.th);
    preview.style.width = `${renderCanvas.width}px`;
    preview.style.height = `${renderCanvas.height}px`;
    preview.style.backgroundImage = `url(${renderCanvas.toDataURL()})`;
}

textInput.addEventListener('input', updateRender);
fontSize.addEventListener('input', updateRender);

function applyPicker() {
    const v = colorPicker.value;
    colorHex.value = v;
    content.style.color = v;
}

function applyHexLive() {
    const raw = colorHex.value.trim();
    const full6 = raw.match(/^#?[0-9a-fA-F]{6}$/);
    const full3 = raw.match(/^#?[0-9a-fA-F]{3}$/);
    if (full6) {
        const v = normalizeHex(raw);
        if (v) {
            content.style.color = v;
            colorPicker.value = v;
        }
    } else if (full3) {
        const v = raw[0] === '#' ? raw : '#' + raw;
        content.style.color = v;
    }
}

function applyHexFinalize() {
    const v = normalizeHex(colorHex.value);
    if (v) {
        colorHex.value = v;
        colorPicker.value = v;
        content.style.color = v;
    }
}
colorPicker.addEventListener('input', applyPicker);
colorHex.addEventListener('input', applyHexLive);
colorHex.addEventListener('blur', applyHexFinalize);
applyHexFinalize();