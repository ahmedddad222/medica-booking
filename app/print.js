(() => {
  const TEMPLATE_IDS = new Set([
    'clinical_clean','minimal_white','executive_teal','soft_cards','framed_medical',
    'split_accent','elegant_center','compact_pro','modern_grid','doctor_signature'
  ]);

  const $ = id => document.getElementById(id);
  const val = value => value == null || value === '' ? '—' : String(value);
  const make = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined && value !== null) el.textContent = String(value);
    return el;
  };

  function samplePayload(templateId) {
    return {
      templateId: templateId,
      clinic: {
        name: 'عيادة الابتسام',
        doctorName: 'أحمد محمد',
        specialty: 'طب الأسنان',
        phone: '0780 000 0000',
        address: 'بغداد - العراق',
        brandColor: '#0e9384',
        logoUrl: ''
      },
      document: {
        kind: 'report',
        title: 'التقرير الشهري',
        subtitle: 'سبتمبر 2026',
        orientation: 'portrait',
        blocks: [
          {type:'stats',items:[
            {label:'الحجوزات',value:'42'},
            {label:'الزيارات المكتملة',value:'38'},
            {label:'الدخل',value:'4,000,000 د.ع'},
            {label:'صافي التشغيل',value:'3,500,000 د.ع'}
          ]},
          {type:'heading',title:'ملخص المصاريف'},
          {type:'table',columns:['النوع','المبلغ'],rows:[
            ['تشغيل','500,000 د.ع'],['رواتب','800,000 د.ع'],['إلغاء','2'],['لم يحضر','3']
          ]}
        ]
      }
    };
  }

  function parsePayload() {
    const params = new URLSearchParams(location.search);
    const preview = params.get('preview') === '1';
    if (preview) {
      const requested = params.get('template');
      const id = TEMPLATE_IDS.has(requested) ? requested : 'clinical_clean';
      return {payload: samplePayload(id), preview:true};
    }

    const injected = window.__MEDICA_PRINT_PAYLOAD__;
    if (injected && typeof injected === 'object') {
      return {payload: injected, preview:false};
    }
    if (typeof injected === 'string' && injected) {
      try { return {payload: JSON.parse(injected), preview:false}; }
      catch (e) {}
    }

    return {payload:null,preview:false};
  }

  function setPageRule(orientation) {
    const landscape = orientation === 'landscape';
    document.documentElement.dataset.orientation = landscape ? 'landscape' : 'portrait';
    const style = document.createElement('style');
    style.textContent = landscape
      ? '@page{size:A4 landscape;margin:0}'
      : '@page{size:A4 portrait;margin:0}';
    document.head.appendChild(style);
  }

  function buildHeader(payload) {
    const clinic = payload.clinic || {};
    const doc = payload.document || {};
    const header = make('header','doc-header');

    const clinicBlock = make('div','clinic-block');
    if (clinic.logoUrl) {
      const img = make('img','clinic-logo');
      img.alt = '';
      img.src = clinic.logoUrl;
      clinicBlock.appendChild(img);
    } else {
      const first = val(clinic.name).trim().charAt(0) || 'M';
      clinicBlock.appendChild(make('div','clinic-logo-fallback',first));
    }

    const copy = make('div','clinic-copy');
    const name = make('h2','clinic-name',val(clinic.name));
    name.dataset.doctor = clinic.doctorName || '';
    copy.appendChild(name);
    if (clinic.specialty) copy.appendChild(make('div','clinic-specialty',clinic.specialty));
    const meta = make('div','clinic-meta');
    if (clinic.phone) meta.appendChild(make('span','',clinic.phone));
    if (clinic.address) meta.appendChild(make('span','',clinic.address));
    if (meta.childNodes.length) copy.appendChild(meta);
    clinicBlock.appendChild(copy);

    const heading = make('div','doc-heading');
    heading.appendChild(make('h1','',val(doc.title)));
    if (doc.subtitle) heading.appendChild(make('p','',doc.subtitle));

    header.appendChild(clinicBlock);
    header.appendChild(heading);
    return header;
  }

  function renderStats(block) {
    const grid = make('section','block summary-grid');
    (block.items || []).forEach(item => {
      const card = make('div','summary-card');
      card.appendChild(make('span','',val(item.label)));
      card.appendChild(make('strong','',val(item.value)));
      grid.appendChild(card);
    });
    return grid;
  }

  function renderInfo(block) {
    const grid = make('section','block info-grid ' + (block.className || ''));
    (block.items || []).forEach(item => {
      const cell = make('div','info-cell');
      cell.appendChild(make('span','',val(item.label)));
      cell.appendChild(make('strong','',val(item.value)));
      grid.appendChild(cell);
    });
    return grid;
  }

  function renderHeading(block) {
    return make('h3','section-title',val(block.title));
  }

  function renderText(block) {
    const card = make('section','block note-card ' + (block.className || ''));
    if (block.label) card.appendChild(make('span','note-label',block.label));
    card.appendChild(make('p','',val(block.text)));
    return card;
  }

  function renderAmount(block) {
    const card = make('section','block amount-card');
    card.appendChild(make('span','',val(block.label)));
    card.appendChild(make('strong','',val(block.value)));
    return card;
  }

  function renderTable(block) {
    const wrap = make('section','block table-wrap');
    const table = make('table','doc-table ' + (block.className || ''));
    const thead = make('thead');
    const headRow = make('tr');
    (block.columns || []).forEach(c => headRow.appendChild(make('th','',val(c))));
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = make('tbody');
    const rows = block.rows || [];
    if (!rows.length) {
      const tr = make('tr');
      const td = make('td','empty-row',block.emptyText || 'لا توجد بيانات');
      td.colSpan = Math.max(1,(block.columns || []).length);
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      rows.forEach(row => {
        const tr = make('tr');
        row.forEach((cell,ci) => {
          const td = make('td', block.rx && ci === 0 ? 'rx-number' : '');
          if (block.rx && ci === 1) {
            td.appendChild(make('strong','',val(cell)));
          } else {
            td.textContent = val(cell);
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function renderSignatures(block) {
    const wrap = make('section','signatures');
    (block.items || []).forEach(item => wrap.appendChild(make('div','signature',val(item))));
    return wrap;
  }

  function renderBlock(block) {
    if (!block || !block.type) return document.createDocumentFragment();
    if (block.type === 'stats') return renderStats(block);
    if (block.type === 'info') return renderInfo(block);
    if (block.type === 'heading') return renderHeading(block);
    if (block.type === 'text') return renderText(block);
    if (block.type === 'amount') return renderAmount(block);
    if (block.type === 'table') return renderTable(block);
    if (block.type === 'signatures') return renderSignatures(block);
    if (block.type === 'rxmark') return make('div','rx-mark','Rx');
    return document.createDocumentFragment();
  }

  function render(payload) {
    const root = $('printRoot');
    $('printLoading')?.classList.add('hidden');
    const clinic = payload.clinic || {};
    const doc = payload.document || {};
    const template = TEMPLATE_IDS.has(payload.templateId) ? payload.templateId : 'clinical_clean';
    const brand = /^#[0-9a-f]{6}$/i.test(clinic.brandColor || '') ? clinic.brandColor : '#0e9384';

    document.documentElement.style.setProperty('--brand',brand);
    document.documentElement.style.setProperty('--brand-strong',brand);
    document.documentElement.style.setProperty('--brand-soft',brand + '14');
    setPageRule(doc.orientation);
    document.title = '';

    const paper = make('article','paper');
    paper.dataset.template = template;
    paper.appendChild(buildHeader(payload));

    const body = make('div','document-body');
    (doc.blocks || []).forEach(block => body.appendChild(renderBlock(block)));
    paper.appendChild(body);

    if (doc.footer !== false) {
      const footer = make('footer','doc-footer');
      footer.appendChild(make('span','',val(clinic.name)));
      footer.appendChild(make('span','',new Date().toLocaleString('ar-IQ',{dateStyle:'medium',timeStyle:'short'})));
      paper.appendChild(footer);
    }

    root.replaceChildren(paper);
  }

  async function waitForAssets() {
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (e) {}
    }
    const images = Array.from(document.images);
    await Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
      img.addEventListener('load',resolve,{once:true});
      img.addEventListener('error',resolve,{once:true});
    })));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  async function init() {
    const parsed = parsePayload();
    if (!parsed.payload) {
      $('printLoading')?.classList.add('hidden');
      $('printRoot').classList.add('hidden');
      $('printError').classList.remove('hidden');
      return;
    }
    render(parsed.payload);
    await waitForAssets();
    if (parsed.preview) return;

    window.addEventListener('afterprint',() => {
      setTimeout(() => {
        try { window.close(); } catch (e) {}
      },120);
    },{once:true});

    setTimeout(() => {
      try { window.print(); } catch (e) {}
    },120);
  }

  init();
})();
