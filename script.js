/* ═══════════════════════════════════════════════════════════════
   Memory Management Visualizer — script.js
   Handles: Paging (FIFO/LRU), Segmentation, Virtual Memory
═══════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────
   SHARED UTILITIES
────────────────────────────────────────────────────────────── */
function switchTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));   document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));   document.getElementById('tab-' + name).classList.add('active');   btn.classList.add('active');
}
 function showToast(msg, type = 'info') {   const existing = document.querySelector('.toast');
  if (existing) existing.remove();   const colors = { success: 'var(--green)', error: 'var(--red)', info: 'var(--cyan)', warn: 'var(--gold)' };   const toast = document.createElement('div');   toast.className = 'toast';
  toast.textContent = msg;
  Object.assign(toast.style, {     position:'fixed', bottom:'32px', left:'50%',     transform:'translateX(-50%) translateY(20px)',     background:'rgba(6,11,20,0.97)',
    border:`1px solid ${colors[type]}`,     color: colors[type], padding:'12px 24px',     borderRadius:'8px', fontFamily:'var(--fbody)',     fontSize:'12px', letterSpacing:'1px',     zIndex:'9999', opacity:'0', transition:'all 0.3s ease',
    boxShadow:`0 0 20px ${colors[type]}33`
  });
  document.body.appendChild(toast);
  requestAnimationFrame(() => {     toast.style.opacity = '1';     toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {     toast.style.opacity = '0';     toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
 function animateNumber(id, target, suffix = '') {
  const el = document.getElementById(id);
  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 20));

    const iv = setInterval(() => {
      cur = Math.min(cur + step, target);
      el.textContent = cur + suffix;
      if (cur >= target) clearInterval(iv);
    }, 40);
}

/* ──────────────────────────────────────────────────────────────
   TAB 1 — PAGING (FIFO / LRU via Flask backend)
────────────────────────────────────────────────────────────── */
let steps = [], currentStep = 0, chartInstance = null;

async function runAlgorithm() {   const pagesInput = document.getElementById('pages').value;   const capacity   = parseInt(document.getElementById('frames').value);   const algo       = document.getElementById('algo').value;

    if (!pagesInput || isNaN(capacity) || capacity < 1) {       showToast('Please enter a valid page string and frame count!', 'error'); return;
    }
     const pages = pagesInput.split(',').map(p => p.trim()).filter(p => p !== '').map(Number);
    if (pages.some(isNaN)) {       showToast('Page reference string must contain numbers only!', 'error'); return;
    }

    resetPagingDisplay();

    try {
      const response = await fetch(`/${algo}`, {         method: 'POST',         headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages, capacity })
      });       if (!response.ok) throw new Error('Server error');

      const data = await response.json();
      steps = data.steps;
      currentStep = 0;

      const hits   = steps.filter(s => s.hit).length;
      const faults = steps.filter(s => !s.hit).length;
      const ratio = ((hits / steps.length) * 100).toFixed(1);
       animateNumber('totalFaults', faults);       animateNumber('totalHits',   hits);       document.getElementById('hitRatio').textContent = ratio + '%';

      displayTable(data);
      drawComparisonChart(data, algo, pages, capacity);       showToast('Simulation complete! Use Next Step to step through.', 'success');
    } catch (err) {       showToast('Cannot connect to Flask server. Make sure app.py is running.', 'error');
    }
}

function displayTable(data) {   const tbody = document.getElementById('resultBody');   tbody.innerHTML = '';
  data.steps.forEach((step, i) => {     const tr = document.createElement('tr');
    tr.style.animation = `fadeUp 0.35s ease ${i * 0.025}s both`;
    tr.innerHTML = `
      <td style="color:var(--muted)">${i + 1}</td>
      <td style="font-family:var(--fhead);color:var(--cyan)">${step.page}</td>       <td style="font-family:var(--fhead);letter-spacing:2px">${step.frames.join(' → ')}</td>
        <td>${step.hit ? '<span class="badge-hit">✓ HIT</span>' : '<span class="badge-fault">✕ FAULT</span>'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function showMemory(current, prev) {   const memDiv = document.getElementById('memory');   memDiv.innerHTML = '';
  current.frames.forEach((f, i) => {     const box = document.createElement('div');     box.className = 'frame';
    const isNew      = !prev || !prev.frames.includes(f);
    const isReplaced = prev && prev.frames.length === current.frames.length
                       && prev.frames.find(p => !current.frames.includes(p))
                       && f === current.page;
    const isHit      = current.hit && f === current.page;     if (isReplaced)   box.classList.add('replaced');     else if (isNew)   box.classList.add('new');     else if (isHit)   box.classList.add('hit');
    box.innerHTML = `${f}<span class="frame-label">F${i + 1}</span>`;
    memDiv.appendChild(box);
  });
  const pct = (currentStep / steps.length * 100).toFixed(1);   document.getElementById('stepFill').style.width = pct + '%';   document.getElementById('stepInfo').textContent =     `Step ${currentStep} of ${steps.length} · Page: ${current.page} · ${current.hit ? 'HIT' : 'FAULT'}`;
}

function nextStep() {   if (!steps.length) { showToast('Run the simulation first!', 'error'); return; }   if (currentStep >= steps.length) { showToast('All steps complete!', 'success'); return; }
  const current = steps[currentStep];
  const prev     = currentStep > 0 ? steps[currentStep - 1] : null;
  showMemory(current, prev);
  currentStep++;
}

function resetPaging() {
  steps = []; currentStep = 0;
  resetPagingDisplay();   showToast('Simulation reset.', 'info');
}

function resetPagingDisplay() {   document.getElementById('memory').innerHTML = '<div class="empty-state">Run the simulation to visualize memory frames</div>';
  document.getElementById('resultBody').innerHTML = '<tr><td colspan="4" class="empty-state">No data yet</td></tr>';
  document.getElementById('totalFaults').textContent = '—';   document.getElementById('totalHits').textContent   = '—';   document.getElementById('hitRatio').textContent    = '—';   document.getElementById('stepInfo').textContent    = '';   document.getElementById('stepFill').style.width    = '0%';
}

async function drawComparisonChart(currentData, currentAlgo, pages, capacity) {   const other = currentAlgo === 'fifo' ? 'lru' : 'fifo';
  let otherFaults = 0;
  try {
    const r = await fetch(`/${other}`, {       method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ pages, capacity })
    });

    otherFaults = (await r.json()).faults;
  } catch(_) {}
   const values = currentAlgo === 'fifo'
    ? [currentData.faults, otherFaults]
    : [otherFaults, currentData.faults];

  if (chartInstance) chartInstance.destroy();   chartInstance = new Chart(document.getElementById('chart').getContext('2d'), {     type: 'bar',
    data: {        labels: ['FIFO','LRU'],
       datasets: [{           label: 'Page Faults',
          data: values,           backgroundColor: ['rgba(0,210,255,0.15)','rgba(0,255,148,0.15)'],           borderColor: ['rgba(0,210,255,0.9)','rgba(0,255,148,0.9)'],
          borderWidth: 2, borderRadius: 10, borderSkipped: false
       }]
    },
    options: {
       responsive:true, maintainAspectRatio:true,
       plugins: {
          legend: { display:false },
          tooltip: {             backgroundColor:'rgba(6,11,20,0.95)',             borderColor:'rgba(0,210,255,0.3)', borderWidth:1,             titleColor:'#00d2ff', bodyColor:'#cde3f7', padding:12,             callbacks:{ label: c => ` ${c.parsed.y} page fault${c.parsed.y!==1?'s':''}` }
          }
       },
       scales: {           x: { grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#4a6a8a',font:{family:"'Orbitron',monospace",size:10}}, border:{color:'rgba(255,255,255,0.06)'} },           y: { beginAtZero:true, grid:{color:'rgba(255,255,255,0.05)'}, ticks:{color:'#4a6a8a',stepSize:1,font:{family:"'JetBrains Mono',monospace",size:11}}, border:{color:'rgba(255,255,255,0.06)'} }
       },        animation:{ duration:800, easing:'easeOutQuart' }
    }
  });
}


/* ──────────────────────────────────────────────────────────────
   TAB 2 — SEGMENTATION
   Pure JavaScript simulation — no backend needed
────────────────────────────────────────────────────────────── */

let segmentList = [];      // user-defined segments: [{name, size}]
let allocatedSegs = [];    // after allocation: [{name, size, base, limit}]
const SEG_COLORS = ['#b48eff','#00d2ff','#00ff94','#ffd166','#ff9f43','#ff4d6a','#7ee8ff','#c9f0a8'];

function addSegment() {   const name = document.getElementById('segName').value.trim();   const size = parseInt(document.getElementById('segSize').value);   const memSize = parseInt(document.getElementById('memSize').value);
   if (!name)          { showToast('Enter a segment name!', 'error'); return; }   if (!size || size < 1) { showToast('Enter a valid segment size!', 'error'); return; }   if (!memSize || memSize < 1) { showToast('Enter total memory size first!', 'error'); return; }

  const totalUsed = segmentList.reduce((a, s) => a + s.size, 0);
  if (totalUsed + size > memSize) {
         showToast(`Not enough memory! Available: ${memSize - totalUsed} bytes`, 'warn'); return;
    }

    segmentList.push({ name, size });     document.getElementById('segName').value = '';     document.getElementById('segSize').value = '';
    renderSegList();     showToast(`Segment "${name}" added (${size} bytes)`, 'success');
}

function removeSegment(i) {
  segmentList.splice(i, 1);
  renderSegList();
}

function renderSegList() {   const el = document.getElementById('segList');
  if (segmentList.length === 0) {     el.innerHTML = '<div class="empty-state" style="padding:14px">No segments added yet</div>';
    return;
  }
  el.innerHTML = segmentList.map((s, i) => `
    <div class="seg-item">
      <div class="seg-info" style="display:flex;align-items:center;gap:10px">
        <div style="width:12px;height:12px;border-radius:3px;background:${SEG_COLORS[i %
SEG_COLORS.length]};flex-shrink:0"></div>
        <span class="seg-name">SEG ${i} — ${s.name}</span>
      </div>
      <div style="display:flex;align-items:center;gap:16px">
        <span class="seg-size">${s.size} bytes</span>
        <button class="seg-del" onclick="removeSegment(${i})">✕</button>
      </div>
    </div>   `).join('');
}

function allocateSegments() {   const memSize = parseInt(document.getElementById('memSize').value);   const strategy = document.getElementById('allocStrategy').value;
     if (!memSize || memSize < 1) { showToast('Enter total memory size!', 'error'); return; }     if (segmentList.length === 0) { showToast('Add at least one segment!', 'error'); return; }

    // Run allocation algorithm
    // We represent free blocks as [{start, size}]
    let freeBlocks = [{ start: 0, size: memSize }];
    allocatedSegs = [];
    let failed     = [];

    for (let i = 0; i < segmentList.length; i++) {
      const seg = segmentList[i];
      let chosen = null;
         if (strategy === 'first') {
          // First Fit: pick the first block that fits
          chosen = freeBlocks.find(b => b.size >= seg.size) || null;
        } else {
          // Best Fit: pick the smallest block that fits
          const fits = freeBlocks.filter(b => b.size >= seg.size);
          if (fits.length) chosen = fits.reduce((a, b) => b.size < a.size ? b : a);
        }

        if (!chosen) { failed.push(seg.name); continue; }

        allocatedSegs.push({
          segNum: i, name: seg.name,

          base: chosen.start, size: seg.size,
          limit: chosen.start + seg.size - 1,
          color: SEG_COLORS[i % SEG_COLORS.length]
        });

        // Remove used portion from free block
        const idx = freeBlocks.indexOf(chosen);
        if (chosen.size === seg.size) {
          freeBlocks.splice(idx, 1);
        } else {
          freeBlocks[idx] = { start: chosen.start + seg.size, size: chosen.size - seg.size };
        }
    }

    if (failed.length) {       showToast(`Could not allocate: ${failed.join(', ')} — not enough contiguous memory`, 'warn');
    } else {       showToast(`All ${allocatedSegs.length} segments allocated successfully!`, 'success');
    }

    // Render results
    const used = allocatedSegs.reduce((a, s) => a + s.size, 0);     document.getElementById('segTotalMem').textContent = memSize;     document.getElementById('segUsed').textContent     = used;     document.getElementById('segFree').textContent     = memSize - used;     document.getElementById('segCount').textContent    = allocatedSegs.length;

    renderSegTable();
    renderMemoryMap(memSize, freeBlocks);
     document.getElementById('segResultPanel').style.display = 'block';     document.getElementById('segTransPanel').style.display = 'block';
}

function renderSegTable() {   const tbody = document.getElementById('segTableBody');
  tbody.innerHTML = allocatedSegs.map(s => `
    <tr>
      <td style="color:var(--muted)">${s.segNum}</td>
      <td style="font-family:var(--fhead);font-size:11px;letter-spacing:1px">
         <span style="color:${s.color}">${s.name}</span>
      </td>
      <td style="color:var(--purple)">${s.base}</td>
      <td style="color:var(--text)">${s.limit}</td>
      <td style="color:var(--text)">${s.size} bytes</td>
      <td><span class="badge-ok">✓ Allocated</span></td>
    </tr>   `).join('');
}

function renderMemoryMap(memSize, freeBlocks) {   const mapEl = document.getElementById('memMap');
  // Sort all items (allocated + free) by base address
  let items = [     ...allocatedSegs.map(s => ({ type:'seg', base:s.base, size:s.size, name:s.name, color:s.color,
limit:s.limit })),     ...freeBlocks.map(b    => ({ type:'free', base:b.start, size:b.size }))
  ].sort((a,b) => a.base - b.base);

  mapEl.innerHTML = items.map(item => {
    const pct = ((item.size / memSize) * 100).toFixed(1);
    const minH = Math.max(36, Math.round((item.size / memSize) * 300));     if (item.type === 'seg') {
      return `
        <div class="mem-seg-block" style="min-height:${minH}px;background:${item.color}18;border-
left:3px solid ${item.color}">

          <div class="seg-info">
             <div class="seg-dot" style="background:${item.color}"></div>
             <span style="font-family:var(--fhead);font-size:11px;letter-
spacing:1px;color:${item.color}">${item.name}</span>
             <span style="font-size:11px;color:var(--muted)">${item.size} bytes (${pct}%)</span>
          </div>
          <span class="seg-addr">${item.base} – ${item.limit}</span>
        </div>`;
    } else {
      return `
        <div class="mem-free-block" style="min-height:${Math.max(24,minH/2)}px">
          <span>FREE &nbsp;·&nbsp; ${item.size} bytes (${pct}%) &nbsp;·&nbsp; ${item.base} –
${item.base+item.size-1}</span>
        </div>`;
    }   }).join('');
}

function translateAddress() {   const segNum = parseInt(document.getElementById('transSegNum').value);   const offset = parseInt(document.getElementById('transOffset').value);   const res   = document.getElementById('transResult');

  if (isNaN(segNum) || isNaN(offset)) {     showToast('Enter both segment number and offset!', 'error'); return;
  }
  if (segNum < 0 || segNum >= allocatedSegs.length) {     res.className = 'translate-result translate-err';     res.style.display = 'block';
    res.innerHTML = `✕ SEGMENT FAULT — Segment ${segNum} does not exist. Valid segments: 0 to
${allocatedSegs.length - 1}`;
    return;
  }

  const seg = allocatedSegs[segNum];
  if (offset < 0 || offset >= seg.size) {     res.className = 'translate-result translate-err';     res.style.display = 'block';
    res.innerHTML = `✕ SEGMENT FAULT — Offset ${offset} exceeds segment "${seg.name}" limit (size
= ${seg.size} bytes, valid offsets: 0 to ${seg.size - 1})`;
    return;
  }

  const physical = seg.base + offset;   res.className = 'translate-result translate-ok';   res.style.display = 'block';
  res.innerHTML = `
     ✓ Translation Successful
     <br><br>
     Segment: <strong>${seg.name}</strong> (Seg #${segNum})
     &nbsp;·&nbsp; Base: <strong>${seg.base}</strong>
     &nbsp;·&nbsp; Offset: <strong>${offset}</strong>
     <br>
     <strong style="font-size:15px">Physical Address = ${seg.base} + ${offset} =
${physical}</strong>
  `;
}

function resetSegmentation() {
  segmentList   = [];
  allocatedSegs = [];
  renderSegList();   document.getElementById('segResultPanel').style.display = 'none';   document.getElementById('segTransPanel').style.display = 'none';   document.getElementById('transResult').style.display   = 'none';   document.getElementById('memSize').value = '';
     document.getElementById('segName').value = '';     document.getElementById('segSize').value = '';     showToast('Segmentation reset.', 'info');
}


/* ──────────────────────────────────────────────────────────────
   TAB 3 — VIRTUAL MEMORY
   Pure JavaScript simulation — no backend needed
────────────────────────────────────────────────────────────── */

// VM State
let vmState = {    vPages: 0, frames: 0, pageSize: 0, algo: 'fifo',
   pageTable: [],     // [{virtualPage, frame, valid}]
   ramFrames: [],     // array of size `frames`, each = virtualPage or null
   queue: [],         // for FIFO: insertion order; for LRU: access order
   tlb: [],           // [{vPage, frame}] max 4 entries
   faults: 0, hits: 0, tlbHits: 0,
   log: []
};

function initVirtualMemory() {   const vPages   = parseInt(document.getElementById('vmVPages').value);   const frames   = parseInt(document.getElementById('vmFrames').value);   const pageSize = parseInt(document.getElementById('vmPageSize').value);   const algo     = document.getElementById('vmAlgo').value;

    if (!vPages || !frames || !pageSize || vPages < 1 || frames < 1 || pageSize < 1) {       showToast('Fill in all Virtual Memory fields!', 'error'); return;
    }
    if (frames > vPages) {       showToast('Physical frames cannot exceed virtual pages!', 'warn'); return;
    }

    vmState = {
       vPages, frames, pageSize, algo,
       pageTable: Array.from({length: vPages}, (_, i) => ({ vPage: i, frame: -1, valid: false })),
       ramFrames: Array(frames).fill(null),
       queue:      [],
       tlb:        [],
       faults: 0, hits: 0, tlbHits: 0,
       log: []
    };
     document.getElementById('vmMainPanel').style.display = 'block';     document.getElementById('vmVisPanel').style.display = 'block';     document.getElementById('vmAccessPage').max = vPages - 1;

  renderVMAll();
  showToast(`Virtual Memory initialized! ${vPages} pages, ${frames} frames, ${pageSize}B pages.`, 'success');
}

function accessPage() {   const vp = parseInt(document.getElementById('vmAccessPage').value);
  if (isNaN(vp) || vp < 0 || vp >= vmState.vPages) {     showToast(`Page number must be 0 to ${vmState.vPages - 1}!`, 'error'); return;
  }
     let logMsg = '', logClass = '';

    // 1. Check TLB
    const tlbEntry = vmState.tlb.find(t => t.vPage === vp);
    if (tlbEntry) {
      // TLB HIT

    vmState.tlbHits++;
    vmState.hits++;
    logMsg   = `TLB Hit → Frame ${tlbEntry.frame} · Physical addr = ${tlbEntry.frame *
vmState.pageSize}`;     logClass = 'log-hit';
    // LRU: move to front of queue     if (vmState.algo === 'lru') updateLRU(vp);
    addLog(vp, logMsg, logClass);
  } else if (vmState.pageTable[vp].valid) {
    // PAGE TABLE HIT
    vmState.hits++;
    const frame = vmState.pageTable[vp].frame;
    logMsg   = `Page Hit (Page Table) → Frame ${frame} · Physical addr = ${frame *
vmState.pageSize}`;     logClass = 'log-hit';
    // Update TLB
    addToTLB(vp, frame);     if (vmState.algo === 'lru') updateLRU(vp);
    addLog(vp, logMsg, logClass);
  } else {
    // PAGE FAULT
    vmState.faults++;     logClass = 'log-fault';
    let frame, evictedPage = null;

      const emptyFrame = vmState.ramFrames.indexOf(null);
      if (emptyFrame !== -1) {
        // Free frame available
        frame = emptyFrame;
      } else {
        // Need to evict
        let victimPage;         if (vmState.algo === 'fifo') {
          victimPage = vmState.queue[0];
          vmState.queue.shift();
        } else {
          victimPage = vmState.queue[0]; // LRU: front = least recently used
          vmState.queue.shift();
        }
        evictedPage = victimPage;
        frame = vmState.pageTable[victimPage].frame;
        // Invalidate evicted page
        vmState.pageTable[victimPage].valid = false;
        vmState.pageTable[victimPage].frame = -1;
        // Remove from TLB
        vmState.tlb = vmState.tlb.filter(t => t.vPage !== victimPage);
        logMsg = `Page Fault → Evicted Page ${victimPage} · Loaded Page ${vp} → Frame ${frame}`;
      }

      if (!logMsg) logMsg = `Page Fault → Loaded Page ${vp} → Frame ${frame} (free frame)`;

      // Load new page
      vmState.ramFrames[frame]          = vp;
      vmState.pageTable[vp].frame       = frame;
      vmState.pageTable[vp].valid       = true;
      vmState.queue.push(vp);
      addToTLB(vp, frame);
      addLog(vp, logMsg, logClass, evictedPage);
  }

  // Update stats   document.getElementById('vmFaults').textContent = vmState.faults;   document.getElementById('vmHits').textContent     = vmState.hits;   document.getElementById('vmTlbHits').textContent = vmState.tlbHits;
  const total = vmState.faults + vmState.hits;   document.getElementById('vmRatio').textContent    = total ?
 ((vmState.hits/total)*100).toFixed(1)+'%' : '—';

    renderVMAll();     document.getElementById('vmAccessPage').value = '';
}

function updateLRU(vp) {
  // Move vp to end of queue (most recently used)
  vmState.queue = vmState.queue.filter(p => p !== vp);
  vmState.queue.push(vp);
}

function addToTLB(vp, frame) {
  // Remove existing entry for this page if any
  vmState.tlb = vmState.tlb.filter(t => t.vPage !== vp);
  // Add to front
  vmState.tlb.unshift({ vPage: vp, frame });
  // Keep only 4 entries
  if (vmState.tlb.length > 4) vmState.tlb = vmState.tlb.slice(0, 4);
}

function addLog(vp, msg, cls, evicted = null) {
  vmState.log.unshift({ vp, msg, cls, evicted });
  if (vmState.log.length > 30) vmState.log.pop();
}

/* ── Each render function runs independently.    If one crashes it won't block the others. ── */
function renderVMAll() {
  try { renderRAMGrid();    } catch(e) { console.error('renderRAMGrid failed:', e); }   try { renderDiskGrid();   } catch(e) { console.error('renderDiskGrid failed:', e); }   try { renderPageTable(); } catch(e) { console.error('renderPageTable failed:', e); }   try { renderTLB();        } catch(e) { console.error('renderTLB failed:', e); }   try { renderAccessLog(); } catch(e) { console.error('renderAccessLog failed:', e); }
}

function renderRAMGrid() {   const grid = document.getElementById('vmRamGrid');
  if (!grid) return;
  if (!vmState.ramFrames || vmState.ramFrames.length === 0) {     grid.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:10px">No frames yet</div>';
    return;
  }
  grid.innerHTML = vmState.ramFrames.map((vp, fi) => {
    if (vp === null) {
      return `<div class="vm-frame-cell">
        <span class="frame-num">F${fi}</span>
        <span class="page-val" style="color:var(--muted);font-size:11px">—</span>
      </div>`;
    }
    const lastLog   = vmState.log && vmState.log.length > 0 ? vmState.log[0] : null;
    const isLatest = lastLog && lastLog.vp === vp;
    const isEvicted = lastLog && lastLog.evicted !== null && lastLog.evicted === vp;     let cls = 'occupied';     if (isEvicted)     cls = 'evicted';     else if (isLatest) cls = 'just-loaded';
    return `<div class="vm-frame-cell ${cls}">
      <span class="frame-num">F${fi}</span>
      <span class="page-val">P${vp}</span>
    </div>`;   }).join('');
}

function renderDiskGrid() {   const grid = document.getElementById('vmDiskGrid');

  if (!grid) return;
  const totalPages = vmState.pageTable ? vmState.pageTable.length : 0;
  if (totalPages === 0) {     grid.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:10px">No pages yet</div>';
    return;
  }
  grid.innerHTML = vmState.pageTable.map((entry, i) => {
    const inRam = entry && entry.valid;     return `<div class="disk-page ${inRam ? 'in-ram' : 'on-disk'}">P${i}</div>`;   }).join('');
}

function renderPageTable() {   const tbody = document.getElementById('vmPageTable');
  if (!tbody) return;
  if (!vmState.pageTable || vmState.pageTable.length === 0) {     tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:16px;font-size:11px">Initialize the system first</td></tr>';
    return;
  }
  tbody.innerHTML = vmState.pageTable.map(entry => `
    <tr>
      <td style="font-family:var(--fhead);color:var(--orange)">P${entry.vPage}</td>       <td style="color:var(--text)">${entry.valid ? entry.frame : '—'}</td>
      <td>${entry.valid          ? '<span class="badge-in">1 — Valid</span>'          : '<span class="badge-disk">0 — Invalid</span>'}</td>
      <td>${entry.valid          ? '<span class="badge-in">RAM</span>'          : '<span class="badge-disk">Disk</span>'}</td>
    </tr>   `).join('');
}

function renderTLB() {   const el = document.getElementById('vmTlbList');
  if (!el) return;
  if (!vmState.tlb || vmState.tlb.length === 0) {     el.innerHTML = '<div class="empty-state" style="padding:16px;font-size:11px">TLB is empty — will populate after first page access</div>';
    return;
  }
  const lastLog = vmState.log && vmState.log.length > 0 ? vmState.log[0] : null;
  el.innerHTML = vmState.tlb.map((t, i) => {
    const isJustHit = i === 0 && lastLog && lastLog.vp === t.vPage;
    return `<div class="tlb-row">
      <span style="font-family:var(--fhead);color:var(--orange)">P${t.vPage}</span>
      <span style="color:var(--text)">F${t.frame}</span>       <span class="${isJustHit ? 'tlb-hit-badge' : 'tlb-miss-badge'}">         ${isJustHit ? '✓ Hit' : 'Cached'}
      </span>
    </div>`;   }).join('');
}

function renderAccessLog() {   const el = document.getElementById('vmAccessLog');
  if (!el) return;
  if (!vmState.log || vmState.log.length === 0) {     el.innerHTML = '<div class="empty-state" style="padding:12px;font-size:11px">No accesses yet — enter a page number above and click Access Page</div>';
    return;
  }
  el.innerHTML = vmState.log.map(entry => `
    <div class="log-entry ${entry.cls}">

        <span class="log-page">P${entry.vp}</span>
        <span class="log-msg">${entry.msg}</span>         ${entry.cls === 'log-fault'           ? '<span class="badge-fault" style="flex-shrink:0">FAULT</span>'           : '<span class="badge-hit"   style="flex-shrink:0">HIT</span>'}
      </div>     `).join('');
}

function resetVirtualMemory() {   vmState = { vPages:0, frames:0, pageSize:0, algo:'fifo', pageTable:[], ramFrames:[], queue:[],
tlb:[], faults:0, hits:0, tlbHits:0, log:[] };   document.getElementById('vmMainPanel').style.display = 'none';   document.getElementById('vmVisPanel').style.display = 'none';   ['vmVPages','vmFrames','vmPageSize','vmAccessPage'].forEach(id => document.getElementById(id).value = '');   showToast('Virtual Memory reset.', 'info');
}
