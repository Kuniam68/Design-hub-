/* MediScript Pro · Seventh menu only.
   Opens an isolated settings dialog without touching any prescription, profile,
   history, patient directory, template logic, or saved data. */
const mssDefaults=Object.freeze({
  theme:'light',accent:'emerald',density:'comfortable',scale:'standard',
  reduceMotion:false,highContrast:false
});
const mssAccents={
  emerald:{name:'Emerald',hex:'#0e8275',rgb:'14,130,117'},
  ocean:{name:'Ocean',hex:'#1679a8',rgb:'22,121,168'},
  indigo:{name:'Indigo',hex:'#6557bf',rgb:'101,87,191'},
  rose:{name:'Rose',hex:'#be637e',rgb:'190,99,126'},
  slate:{name:'Slate',hex:'#466b78',rgb:'70,107,120'}
};
let mssDialog=null;
let mssState=null;
let mssStorageKey='';
let mssStorageAvailable=true;
let mssActiveTab='appearance';
let mssToastTimeout=null;
function mssSanitize(value){
  const input=value&&typeof value==='object'?value:{};
  const result={...mssDefaults};
  if(['light','dark','system'].includes(input.theme))result.theme=input.theme;
  if(Object.prototype.hasOwnProperty.call(mssAccents,input.accent))result.accent=input.accent;
  if(['comfortable','compact'].includes(input.density))result.density=input.density;
  if(['small','standard','large'].includes(input.scale))result.scale=input.scale;
  if(typeof input.reduceMotion==='boolean')result.reduceMotion=input.reduceMotion;
  if(typeof input.highContrast==='boolean')result.highContrast=input.highContrast;
  return result;
}
function mssAccountEmail(){
  try{return String(window.getDoctorAccountEmail?.()||'').trim().toLowerCase();}
  catch(_){return '';}
}
function mssLoad(){
  const email=mssAccountEmail();
  mssStorageKey='mediscript-settings-v1:'+(email||'device');
  mssStorageAvailable=true;
  try{mssState=mssSanitize(JSON.parse(localStorage.getItem(mssStorageKey)||'{}'));}
  catch(_){mssStorageAvailable=false;mssState={...mssDefaults};}
}
function mssPersist(){
  try{
    localStorage.setItem(mssStorageKey,JSON.stringify(mssState));
    mssStorageAvailable=true;
  }catch(_){mssStorageAvailable=false;}
  mssRefreshStatus();
}
function mssRefreshStatus(){
  if(!mssDialog)return;
  const value=mssStorageAvailable?'Preferences saved on this device':'Storage unavailable · changes for this session only';
  mssDialog.querySelectorAll('[data-ms-storage-status]').forEach(el=>{el.textContent=value;});
}
function mssToast(message){
  if(!mssDialog)return;
  const toast=mssDialog.querySelector('.mss-toast');
  toast.textContent=message;toast.hidden=false;
  clearTimeout(mssToastTimeout);
  mssToastTimeout=setTimeout(()=>{if(mssDialog)toast.hidden=true;},2800);
}
function mssSetTab(id){
  if(!['appearance','comfort','privacy'].includes(id))return;
  mssActiveTab=id;
  mssDialog.querySelectorAll('[data-ms-tab]').forEach(button=>{
    const active=button.dataset.msTab===id;
    button.setAttribute('aria-selected',String(active));
    button.tabIndex=active?0:-1;
  });
  mssDialog.querySelectorAll('[data-ms-panel]').forEach(panel=>{
    panel.hidden=panel.dataset.msPanel!==id;
  });
  const title=id==='appearance'?'Appearance':id==='comfort'?'Comfort & accessibility':'Privacy & data';
  mssDialog.querySelector('[data-ms-crumb]').textContent=title;
  mssDialog.querySelector('.mss-content').scrollTop=0;
}
function mssRender(){
  if(!mssDialog||!mssState)return;
  const isDark=mssState.theme==='dark'||(mssState.theme==='system'&&window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const accent=mssAccents[mssState.accent];
  mssDialog.dataset.mode=isDark?'dark':'light';
  mssDialog.dataset.density=mssState.density;
  mssDialog.dataset.scale=mssState.scale;
  mssDialog.dataset.motion=mssState.reduceMotion?'reduce':'normal';
  mssDialog.dataset.contrast=mssState.highContrast?'high':'normal';
  mssDialog.style.setProperty('--mss-accent',accent.hex);
  mssDialog.style.setProperty('--mss-accent-rgb',accent.rgb);
  mssDialog.querySelectorAll('[data-ms-theme]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.msTheme===mssState.theme)));
  mssDialog.querySelectorAll('[data-ms-accent]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.msAccent===mssState.accent)));
  mssDialog.querySelectorAll('[data-ms-density]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.msDensity===mssState.density)));
  mssDialog.querySelectorAll('[data-ms-scale]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.msScale===mssState.scale)));
  mssDialog.querySelectorAll('[data-ms-toggle]').forEach(el=>el.setAttribute('aria-checked',String(mssState[el.dataset.msToggle])));
  const p=mssDialog.querySelector('[data-ms-preview-caption]');
  if(p)p.textContent=(isDark?'Dark':'Light')+' appearance · '+accent.name+' accent';
  mssRefreshStatus();
}
function mssChange(field,value){
  mssState[field]=value;
  mssPersist();
  mssRender();
  mssToast('Preference saved · live preview updated');
}
function mssMarkup(){
  return [
'<div class="mss-layout">',
  '<aside class="mss-sidebar">',
    '<div class="mss-brand"><span class="mss-brand-mark" aria-hidden="true">✳</span><div><strong>MediScript Pro</strong><small>Settings studio</small></div></div>',
    '<span class="mss-side-caption">Personalize</span>',
    '<nav class="mss-side-nav" aria-label="Settings sections" role="tablist" aria-orientation="vertical">',
      '<button type="button" class="mss-side-link" role="tab" id="mssTabAppearance" aria-controls="mssPanelAppearance" aria-selected="true" data-ms-tab="appearance"><span class="mss-side-icon" aria-hidden="true">◐</span> Appearance</button>',
      '<button type="button" class="mss-side-link" role="tab" id="mssTabComfort" aria-controls="mssPanelComfort" aria-selected="false" data-ms-tab="comfort"><span class="mss-side-icon" aria-hidden="true">✦</span> Comfort & access</button>',
      '<button type="button" class="mss-side-link" role="tab" id="mssTabPrivacy" aria-controls="mssPanelPrivacy" aria-selected="false" data-ms-tab="privacy"><span class="mss-side-icon" aria-hidden="true">◇</span> Privacy & data</button>',
    '</nav>',
    '<div class="mss-side-spacer"></div>',
    '<div class="mss-safe-note"><strong>✓ Your work stays safe</strong>These appearance experiments do not change your prescriptions, medical records, doctor profile, or any of the first six workspace menus.</div>',
    '<div class="mss-side-bottom"><span class="mss-online-dot" aria-hidden="true"></span> Independent settings workspace</div>',
  '</aside>',
  '<div class="mss-main">',
    '<div class="mss-topbar">',
      '<div class="mss-breadcrumb"><span>SETTINGS</span><span aria-hidden="true">/</span><b data-ms-crumb>Appearance</b></div>',
      '<div class="mss-top-controls"><span class="mss-saved-pill">Local preferences</span><button class="mss-close" data-ms-close type="button" aria-label="Close Settings & Appearance">×</button></div>',
    '</div>',
    '<div class="mss-content">',
      '<section class="mss-panel" data-ms-panel="appearance" id="mssPanelAppearance" role="tabpanel" aria-labelledby="mssTabAppearance">',
        '<div class="mss-eyebrow">Make it yours</div><h2>Appearance, refined.</h2>',
        '<p class="mss-intro">A beautiful workspace starts with the details. Explore your ideal look in this live preview. Your first six menus remain visually unchanged.</p>',
        '<div class="mss-section"><div class="mss-heading-row"><div><h3>Choose an appearance</h3><p class="mss-hint">Light, dark, or follow your device. Changes are previewed here.</p></div></div>',
          '<div class="mss-theme-grid" role="group" aria-label="Choose appearance">',
            '<button type="button" class="mss-theme" data-ms-theme="light" aria-pressed="true"><span class="mss-mini"><span class="mss-mini-rail"></span><span class="mss-mini-lines"><i></i><i></i><i></i></span></span><span class="mss-theme-caption">Light <span class="mss-radio-indicator" aria-hidden="true"></span></span></button>',
            '<button type="button" class="mss-theme" data-ms-theme="dark" aria-pressed="false"><span class="mss-mini mss-mini-dark"><span class="mss-mini-rail"></span><span class="mss-mini-lines"><i></i><i></i><i></i></span></span><span class="mss-theme-caption">Dark <span class="mss-radio-indicator" aria-hidden="true"></span></span></button>',
            '<button type="button" class="mss-theme" data-ms-theme="system" aria-pressed="false"><span class="mss-mini mss-mini-system"><span class="mss-mini-rail"></span><span class="mss-mini-lines"><i></i><i></i><i></i></span></span><span class="mss-theme-caption">System <span class="mss-radio-indicator" aria-hidden="true"></span></span></button>',
          '</div>',
        '</div>',
        '<div class="mss-section"><div class="mss-heading-row"><div><h3>Signature accent</h3><p class="mss-hint">A subtle color identity for your settings and preview.</p></div></div>',
          '<div class="mss-accent-list" role="group" aria-label="Choose accent color">',
            '<button class="mss-accent-option" type="button" data-ms-accent="emerald"><span class="mss-accent-dot" style="--swatch:#0e8275"></span>Emerald</button>',
            '<button class="mss-accent-option" type="button" data-ms-accent="ocean"><span class="mss-accent-dot" style="--swatch:#1679a8"></span>Ocean</button>',
            '<button class="mss-accent-option" type="button" data-ms-accent="indigo"><span class="mss-accent-dot" style="--swatch:#6557bf"></span>Indigo</button>',
            '<button class="mss-accent-option" type="button" data-ms-accent="rose"><span class="mss-accent-dot" style="--swatch:#be637e"></span>Rose</button>',
            '<button class="mss-accent-option" type="button" data-ms-accent="slate"><span class="mss-accent-dot" style="--swatch:#466b78"></span>Slate</button>',
          '</div>',
        '</div>',
        '<div class="mss-preview-frame"><div class="mss-preview-cap"><span>Live workspace concept</span><span data-ms-preview-caption>Light appearance · Emerald accent</span></div>',
          '<div class="mss-preview" aria-label="Appearance example only">',
            '<div class="mss-preview-panel"><strong>Patient details</strong><div class="mss-preview-field">Patient name</div><div class="mss-preview-field">Age &amp; sex</div><span class="mss-preview-action">Continue editing</span></div>',
            '<div class="mss-preview-rx"><h4>Prescription preview</h4><p>Clear, focused medical writing</p><i></i><i></i><i></i><small>℞</small></div>',
          '</div>',
        '</div>',
        '<p class="mss-hint">To protect your existing prescription interface, appearance choices are applied only to this Settings studio and its preview. They are stored locally, ready for a later workspace-wide rollout if you approve it.</p>',
      '</section>',
      '<section class="mss-panel" data-ms-panel="comfort" id="mssPanelComfort" role="tabpanel" aria-labelledby="mssTabComfort" hidden>',
        '<div class="mss-eyebrow">Designed around you</div><h2>Comfort in every detail.</h2>',
        '<p class="mss-intro">Fine-tune your Settings studio for easier reading and a calmer experience without touching clinical fields or other menus.</p>',
        '<div class="mss-pair">',
          '<div class="mss-option-card"><h3>Layout density</h3><p class="mss-hint">Choose how much breathing room the preview uses.</p><div class="mss-choice-row" role="group" aria-label="Layout density"><button type="button" class="mss-density" data-ms-density="comfortable">Comfortable</button><button type="button" class="mss-density" data-ms-density="compact">Compact</button></div></div>',
          '<div class="mss-option-card"><h3>Reading size</h3><p class="mss-hint">Adjust the type size in your settings.</p><div class="mss-choice-row" role="group" aria-label="Reading size"><button type="button" class="mss-scale" data-ms-scale="small">Small</button><button type="button" class="mss-scale" data-ms-scale="standard">Standard</button><button type="button" class="mss-scale" data-ms-scale="large">Large</button></div></div>',
        '</div>',
        '<hr class="mss-divider">',
        '<div class="mss-switch-row"><div><h3>Reduce motion</h3><p class="mss-hint">Minimize animations and transitions inside Settings.</p></div><button type="button" class="mss-switch" role="switch" data-ms-toggle="reduceMotion" aria-checked="false" aria-label="Reduce motion"></button></div>',
        '<div class="mss-switch-row"><div><h3>Higher contrast</h3><p class="mss-hint">Increase the distinction between text, borders and surfaces here.</p></div><button type="button" class="mss-switch" role="switch" data-ms-toggle="highContrast" aria-checked="false" aria-label="Higher contrast"></button></div>',
        '<div class="mss-preview-frame"><div class="mss-preview-cap"><span>Reading sample</span><span data-ms-preview-caption>Light appearance · Emerald accent</span></div>',
          '<div class="mss-preview"><div class="mss-preview-panel"><strong>Clearer reading</strong><div class="mss-preview-field">Clinical information</div><div class="mss-preview-field">Input and review</div><span class="mss-preview-action">Sample control</span></div><div class="mss-preview-rx"><h4>Prescription preview</h4><p>Comfortable viewing</p><i></i><i></i><i></i><small>℞</small></div></div>',
        '</div>',
        '<p class="mss-hint">Keyboard support: use Tab to move, Enter or Space to choose a setting, and Escape to close Settings.</p>',
      '</section>',
      '<section class="mss-panel" data-ms-panel="privacy" id="mssPanelPrivacy" role="tabpanel" aria-labelledby="mssTabPrivacy" hidden>',
        '<div class="mss-eyebrow">Clear & under control</div><h2>Your choices. Your control.</h2>',
        '<p class="mss-intro">Inspect your account context and manage the appearance settings saved on this browser. No patient records are included.</p>',
        '<div class="mss-data-card"><div class="mss-data-icon" aria-hidden="true">♙</div><h3>Signed-in account</h3><p class="mss-account" data-ms-account>Doctor account</p><p class="mss-hint">Your clinician profile and saved prescription history are kept separate from these local interface preferences.</p></div>',
        '<div class="mss-data-card"><div class="mss-data-icon" aria-hidden="true">◇</div><h3>Preference storage</h3><p class="mss-hint" data-ms-storage-status>Preferences saved on this device</p><p class="mss-hint">Settings are stored in this browser, not synced through Firebase or across your devices. No patient, doctor, chamber, history, or template data is changed by this panel.</p></div>',
        '<div class="mss-privacy-grid">',
          '<button type="button" class="mss-data-action" data-ms-export><span><strong>Export preferences</strong><small>Download a lightweight JSON backup</small></span><span class="mss-action-arrow" aria-hidden="true">↧</span></button>',
          '<button type="button" class="mss-data-action" data-ms-import><span><strong>Import preferences</strong><small>Restore an exported settings file</small></span><span class="mss-action-arrow" aria-hidden="true">↥</span></button>',
          '<button type="button" class="mss-data-action" data-ms-reset><span><strong>Restore default settings</strong><small>Reset only appearance preferences</small></span><span class="mss-action-arrow" aria-hidden="true">↺</span></button>',
        '</div>',
        '<input type="file" id="mssImportInput" accept=".json,application/json" hidden aria-label="Import settings JSON">',
        '<hr class="mss-divider"><p class="mss-bullet-note"><strong>Privacy note:</strong> Export contains appearance preferences only, never personal health information. Reset does not sign you out or delete any prescription, template, history, doctor profile, or chamber information.</p>',
      '</section>',
    '</div>',
    '<div class="mss-footer"><span class="mss-footer-status"><b aria-hidden="true">✓</b><span data-ms-storage-status>Preferences saved on this device</span></span><button type="button" class="mss-done" data-ms-close>Done</button></div>',
  '</div>',
'</div>',
'<div class="mss-toast" role="status" aria-live="polite" hidden></div>'
  ].join('');
}
function mssApplyInput(button){
  if(button.hasAttribute('data-ms-theme'))mssChange('theme',button.dataset.msTheme);
  else if(button.hasAttribute('data-ms-accent'))mssChange('accent',button.dataset.msAccent);
  else if(button.hasAttribute('data-ms-density'))mssChange('density',button.dataset.msDensity);
  else if(button.hasAttribute('data-ms-scale'))mssChange('scale',button.dataset.msScale);
  else if(button.hasAttribute('data-ms-toggle')){
    const key=button.dataset.msToggle;
    if(key==='reduceMotion'||key==='highContrast')mssChange(key,!mssState[key]);
  }
}
function mssDownload(){
  const data={product:'MediScript Pro',type:'appearance-preferences-only',version:1,exportedAt:new Date().toISOString(),preferences:{...mssState}};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const objectUrl=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=objectUrl;a.download='mediscript-appearance-settings.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(objectUrl),5000);
  mssToast('Settings preferences exported');
}
async function mssImport(file){
  if(!file)return;
  if(file.size>32768){mssToast('The settings file is too large');return;}
  try{
    const raw=JSON.parse(await file.text());
    if(!raw||typeof raw!=='object'||(raw.type&&raw.type!=='appearance-preferences-only'))throw Error('Incorrect settings format');
    const incoming=raw.preferences||raw;
    if(!incoming||typeof incoming!=='object'||!['light','dark','system'].includes(incoming.theme))throw Error('Invalid appearance preferences');
    mssState=mssSanitize(incoming);
    mssPersist();mssRender();
    mssToast('Appearance preferences imported successfully');
  }catch(_){mssToast('Unable to import · select a valid settings JSON file');}
}
function mssCreate(){
  mssDialog=document.createElement('dialog');
  mssDialog.id='msSettingsDialog';
  mssDialog.setAttribute('aria-modal','true');
  mssDialog.setAttribute('aria-label','Settings and Appearance');
  mssDialog.innerHTML=mssMarkup();
  document.body.appendChild(mssDialog);
  mssDialog.addEventListener('click',event=>{
    const btn=event.target.closest('button');
    if(!btn)return;
    if(btn.hasAttribute('data-ms-close')){mssDialog.close();return;}
    if(btn.hasAttribute('data-ms-tab')){mssSetTab(btn.dataset.msTab);return;}
    if(btn.hasAttribute('data-ms-export')){mssDownload();return;}
    if(btn.hasAttribute('data-ms-import')){mssDialog.querySelector('#mssImportInput').click();return;}
    if(btn.hasAttribute('data-ms-reset')){
      if(!window.confirm('Restore default appearance preferences on this browser? Your prescriptions, profile, history and templates will not be changed.'))return;
      mssState={...mssDefaults};mssPersist();mssRender();mssToast('Appearance defaults restored');return;
    }
    mssApplyInput(btn);
  });
  mssDialog.querySelector('#mssImportInput').addEventListener('change',async event=>{
    const el=event.currentTarget;
    await mssImport(el.files?.[0]);
    el.value='';
  });
  mssDialog.addEventListener('keydown',event=>{
    const active=event.target.closest('[data-ms-tab]');
    if(!active||!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(event.key))return;
    event.preventDefault();
    const order=['appearance','comfort','privacy'];
    const index=order.indexOf(active.dataset.msTab);
    const step=['ArrowRight','ArrowDown'].includes(event.key)?1:-1;
    const next=order[(index+step+order.length)%order.length];
    mssSetTab(next);
    mssDialog.querySelector('[data-ms-tab="'+next+'"]').focus();
  });
  mssDialog.addEventListener('close',()=>{
    const opener=document.getElementById('workspaceMenuButton');
    if(opener)opener.focus({preventScroll:true});
  });
  const query=window.matchMedia?.('(prefers-color-scheme: dark)');
  if(query){
    const refresh=()=>{if(mssState?.theme==='system')mssRender();};
    if(query.addEventListener)query.addEventListener('change',refresh);
    else if(query.addListener)query.addListener(refresh);
  }
}
let mssStylePromise=null;
function mssEnsureStyle(){
  if(mssStylePromise)return mssStylePromise;
  mssStylePromise=new Promise(resolve=>{
    const link=document.createElement('link');
    link.id='mssSettingsStyles';link.rel='stylesheet';
    link.href=new URL('./settings-portal.css',import.meta.url).href;
    link.onload=()=>resolve();link.onerror=()=>resolve();
    document.head.appendChild(link);
    setTimeout(resolve,1500);
  });
  return mssStylePromise;
}
export async function openSettings(){
  await mssEnsureStyle();
  if(!mssDialog)mssCreate();
  mssLoad();mssSetTab('appearance');
  const email=mssAccountEmail();
  mssDialog.querySelector('[data-ms-account]').textContent=email||'Signed-in doctor account';
  mssRender();
  if(!mssDialog.open)mssDialog.showModal();
  mssDialog.querySelector('[data-ms-close]').focus({preventScroll:true});
}
