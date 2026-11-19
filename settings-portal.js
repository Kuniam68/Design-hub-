/* MediScript Pro | Settings & Appearance v2.
   Isolated module: changes only its own dialog and appearance preferences.
   No prescription, template, profile, history, or other menu handlers are modified. */
const MS_DEFAULTS=Object.freeze({
  theme:'light',accent:'emerald',customAccent:'#6958bf',nightStart:'19',nightEnd:'07',density:'comfortable',scale:'standard',
  typeface:'modern',lineSpacing:'comfortable',corners:'rounded',surface:'layered',
  contrast:false,reduceMotion:false,boldLabels:false,focusRing:true,readableLinks:false,underlineLinks:false,
  rememberSection:true,hotkeys:true,largeTargets:false,shortDescriptions:false
});
const MS_ACCENTS={
  emerald:{name:'Emerald',hex:'#0e8275',rgb:'14,130,117'},
  ocean:{name:'Ocean',hex:'#1679a8',rgb:'22,121,168'},
  indigo:{name:'Indigo',hex:'#6557bf',rgb:'101,87,191'},
  rose:{name:'Rose',hex:'#be637e',rgb:'190,99,126'},
  amber:{name:'Amber',hex:'#ad771c',rgb:'173,119,28'},
  slate:{name:'Slate',hex:'#466b78',rgb:'70,107,120'}
};
const MS_SECTIONS=['appearance','typography','layout','accessibility','preferences','backup'];
const MS_TITLES={appearance:'Appearance',typography:'Typography',layout:'Layout',accessibility:'Accessibility',preferences:'Preferences',backup:'Backup & reset'};
const MS_STORAGE_PREFIX='mediscript-settings-v1:';
let msDialog=null,msPrefs={...MS_DEFAULTS},msStorageKey='',msStorageOK=true,msCurrent='appearance',msToastTimer=null,msStylePromise=null;
function msAccount(){
  try{return String(window.getDoctorAccountEmail?.()||'').trim().toLowerCase();}
  catch(_){return '';}
}
function msSanitize(raw){
  const s=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const next={...MS_DEFAULTS};
  const allowed={
    theme:['light','dark','dim','system','scheduled'],accent:[...Object.keys(MS_ACCENTS),'custom'],nightStart:['18','19','20','21','22'],nightEnd:['05','06','07','08','09'],
    density:['comfortable','compact','spacious'],scale:['small','standard','large'],
    typeface:['modern','serif','poppins','arial','verdana','trebuchet','georgia','monospace','custom'],lineSpacing:['tight','comfortable','relaxed'],
    corners:['rounded','square','soft','pill'],surface:['layered','flat']
  };
  Object.keys(allowed).forEach(key=>{if(allowed[key].includes(s[key]))next[key]=s[key];});
  ['contrast','reduceMotion','boldLabels','focusRing','readableLinks','underlineLinks','rememberSection','hotkeys','largeTargets','shortDescriptions'].forEach(key=>{
    if(typeof s[key]==='boolean')next[key]=s[key];
  });
  if(typeof s.customAccent==='string'&&/^#[0-9a-fA-F]{6}$/.test(s.customAccent))next.customAccent=s.customAccent.toLowerCase();
  return next;
}
function msRead(){
  msStorageKey=MS_STORAGE_PREFIX+(msAccount()||'device');
  msStorageOK=true;
  try{
    const raw=JSON.parse(localStorage.getItem(msStorageKey)||'{}');
    msPrefs=msSanitize(raw);
    msCurrent=msPrefs.rememberSection&&MS_SECTIONS.includes(raw.lastSection)?raw.lastSection:'appearance';
  }catch(error){
    msPrefs={...MS_DEFAULTS};msCurrent='appearance';msStorageOK=false;
  }
}
function msWrite(){
  try{
    localStorage.setItem(msStorageKey,JSON.stringify({...msPrefs,lastSection:msPrefs.rememberSection?msCurrent:'appearance'}));
    msStorageOK=true;
  }catch(error){msStorageOK=false;}
  msStorageStatus();
}
function msStorageStatus(){
  if(!msDialog)return;
  const t=msStorageOK?'Saved on this device':'Storage blocked — changes remain until page reload';
  msDialog.querySelectorAll('[data-ms-storage-status]').forEach(el=>el.textContent=t);
}
function msToast(message){
  if(!msDialog)return;
  const el=msDialog.querySelector('[data-ms-toast]');
  if(!el)return;
  el.textContent=message;el.hidden=false;
  clearTimeout(msToastTimer);
  msToastTimer=setTimeout(()=>{el.hidden=true;},2400);
}
function msIsDark(){
  if(msPrefs.theme==='dark'||msPrefs.theme==='dim')return true;
  if(msPrefs.theme==='scheduled'){
    const h=new Date().getHours(),s=Number(msPrefs.nightStart),e=Number(msPrefs.nightEnd);
    return s>e?h>=s||h<e:h>=s&&h<e;
  }
  return msPrefs.theme==='system'&&Boolean(window.matchMedia?.('(prefers-color-scheme: dark)')?.matches);
}
function msAccent(){
  if(msPrefs.accent!=='custom')return MS_ACCENTS[msPrefs.accent];
  const hex=msPrefs.customAccent,n=parseInt(hex.slice(1),16);
  return {name:'Custom',hex,rgb:[n>>16&255,n>>8&255,n&255].join(',')};
}
function msFontFamily(){
  const fonts={modern:'system-ui, sans-serif',serif:'Georgia, serif',poppins:'Poppins, system-ui, sans-serif',arial:'Arial, sans-serif',verdana:'Verdana, sans-serif',trebuchet:'Trebuchet MS, sans-serif',georgia:'Georgia, serif',monospace:'ui-monospace, SFMono-Regular, Menlo, monospace'};
  return msPrefs.typeface==='custom'&&msFontUrl?'MediScriptCustomFont, system-ui, sans-serif':fonts[msPrefs.typeface]||fonts.modern;
}
let msFontUrl='';
async function msLoadFont(file){
  if(!file)return;
  const ext=file.name.split('.').pop().toLowerCase();
  if(!['woff','woff2','ttf','otf'].includes(ext)||file.size>3*1024*1024){msToast('Use a WOFF, WOFF2, TTF or OTF font under 3 MB');return;}
  const next=URL.createObjectURL(file);
  try{
    const face=new FontFace('MediScriptCustomFont',`url("${next}")`);
    await face.load();document.fonts.add(face);
    if(msFontUrl)URL.revokeObjectURL(msFontUrl);
    msFontUrl=next;msChange('typeface','custom');msToast('Custom font applied for this session');
  }catch(e){URL.revokeObjectURL(next);msToast('Cannot read that font file');}
}
function msRender(){
  if(!msDialog)return;
  const accent=msAccent();
  const dark=msIsDark(),mode=msPrefs.theme==='dim'?'dim':dark?'dark':'light';
  msDialog.dataset.mode=mode;
  msDialog.dataset.themeChoice=msPrefs.theme;
  msDialog.dataset.largeTargets=msPrefs.largeTargets?'true':'false';
  msDialog.dataset.shortDescriptions=msPrefs.shortDescriptions?'true':'false';
  // The application shell changes appearance; its six clinical editors do not.
  document.documentElement.dataset.msShellTheme=mode;
  document.documentElement.dataset.msUiContrast=msPrefs.contrast?'high':'normal';
  document.documentElement.dataset.msUiCorners=msPrefs.corners;
  document.documentElement.dataset.msUiLinks=msPrefs.underlineLinks?'underlined':'normal';
  document.documentElement.dataset.msUiLegibility=msPrefs.readableLinks?'enhanced':'normal';
  document.documentElement.style.setProperty('--ms-app-accent',accent.hex);
  document.documentElement.style.setProperty('--ms-app-font',msFontFamily());
  msDialog.dataset.density=msPrefs.density;
  msDialog.dataset.scale=msPrefs.scale;
  msDialog.dataset.font=msPrefs.typeface;
  msDialog.style.setProperty('--ms-app-font',msFontFamily());
  msDialog.dataset.spacing=msPrefs.lineSpacing;
  msDialog.dataset.corners=msPrefs.corners;
  msDialog.dataset.surface=msPrefs.surface;
  msDialog.dataset.motion=msPrefs.reduceMotion?'reduce':'normal';
  msDialog.dataset.contrast=msPrefs.contrast?'high':'normal';
  msDialog.dataset.bold=msPrefs.boldLabels?'true':'false';
  msDialog.dataset.focus=msPrefs.focusRing?'extra':'normal';
  msDialog.style.setProperty('--mss-accent',accent.hex);
  msDialog.style.setProperty('--mss-accent-rgb',accent.rgb);
  msDialog.querySelectorAll('[data-ms-set]').forEach(button=>{
    const key=button.dataset.msSet;
    button.setAttribute('aria-pressed',String(msPrefs[key]===button.dataset.msValue));
  });
  msDialog.querySelectorAll('[data-ms-toggle]').forEach(button=>{
    const key=button.dataset.msToggle;
    button.setAttribute('aria-checked',String(Boolean(msPrefs[key])));
  });
  const customLabel=msDialog.querySelector('[data-ms-font-status]');
  if(customLabel)customLabel.textContent=msPrefs.typeface==='custom'?(msFontUrl?'Custom font active for this session':'Upload a font to activate it'):'Choose a preset typeface or upload a font';
  const label=msPrefs.theme==='scheduled'?'Timed '+(dark?'night':'day'):msPrefs.theme==='dim'?'Soft dark':dark?'Dark':'Light';
  msDialog.querySelector('[data-ms-mode-label]').textContent=label+' · '+accent.name;
  msDialog.querySelector('[data-ms-summary]').textContent=
    label+' appearance, '+accent.name.toLowerCase()+' accent, '+msPrefs.density+' spacing';
  const picker=msDialog.querySelector('[data-ms-custom-color]');
  if(picker&&picker.value.toLowerCase()!==msPrefs.customAccent)picker.value=msPrefs.customAccent;
  const quick=msDialog.querySelector('[data-ms-quick-theme]');
  if(quick){quick.textContent=dark?'☀ Light':'☾ Dark';quick.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');}
  msStorageStatus();
}
function msSection(section){
  if(!MS_SECTIONS.includes(section))return;
  msCurrent=section;
  msDialog.querySelectorAll('[data-ms-tab]').forEach(button=>{
    const on=button.dataset.msTab===section;
    button.setAttribute('aria-selected',String(on));
    button.tabIndex=on?0:-1;
  });
  msDialog.querySelectorAll('[data-ms-panel]').forEach(panel=>{
    panel.hidden=panel.dataset.msPanel!==section;
  });
  msDialog.querySelector('[data-ms-crumb]').textContent=MS_TITLES[section];
  msDialog.querySelector('.mss-content').scrollTop=0;
  if(msPrefs.rememberSection)msWrite();
}
function msChange(key,value){
  if(!(key in MS_DEFAULTS))return;
  const changed={...msPrefs,[key]:value};
  msPrefs=msSanitize(changed);
  msWrite();msRender();
  msToast('Updated: '+key.replace(/([A-Z])/g,' $1').toLowerCase());
}
function msPreset(name){
  const preset={
    daylight:{theme:'light',accent:'emerald',density:'comfortable',contrast:false,reduceMotion:false,scale:'standard',surface:'layered'},
    midnight:{theme:'dark',accent:'ocean',density:'comfortable',contrast:false,reduceMotion:true,scale:'standard',surface:'layered'},
    clarity:{theme:'light',accent:'indigo',density:'spacious',contrast:true,scale:'large',boldLabels:true,focusRing:true},
    focus:{theme:'dark',accent:'slate',density:'compact',surface:'flat',reduceMotion:true,focusRing:true},
    twilight:{theme:'dim',accent:'rose',density:'comfortable',surface:'flat',reduceMotion:true},
    auto:{theme:'scheduled',accent:'ocean',nightStart:'19',nightEnd:'07'}
  }[name];
  if(!preset)return;
  msPrefs=msSanitize({...msPrefs,...preset});
  msWrite();msRender();msToast('Preset applied: '+name);
}
function msGroup(label,key,options){
  return '<div class="mss-section"><div class="mss-heading-row"><h3>'+label+'</h3></div>'+
    '<div class="mss-choice-row mss-choice-grid" role="group" aria-label="'+label+'">'+
    options.map(o=>'<button type="button" class="mss-density" data-ms-set="'+key+'" data-ms-value="'+o[0]+'" aria-pressed="false">'+o[1]+'</button>').join('')+
    '</div></div>';
}
function msToggle(label,details,key){
  return '<div class="mss-switch-row"><div><h3>'+label+'</h3><p class="mss-hint">'+details+'</p></div>'+
    '<button type="button" class="mss-switch" role="switch" data-ms-toggle="'+key+'" aria-label="'+label+'" aria-checked="false"></button></div>';
}
function msHeader(title,desc){
  return '<h2>'+title+'</h2><p class="mss-intro">'+desc+'</p>';
}
function msMarkup(){
  const sections=[
    ['appearance','◐','Appearance'],
    ['typography','T','Typography'],
    ['layout','▦','Layout'],
    ['accessibility','✦','Accessibility'],
    ['preferences','⚙','Preferences'],
    ['backup','↧','Backup & reset']
  ];
  const appearance=msHeader('A workspace that feels right.','Choose a distinct look. Every option immediately changes this settings workspace; none modifies the clinical editor.')+
    '<div class="mss-section"><h3>Color mode</h3><div class="mss-theme-grid" role="group" aria-label="Color mode">'+
    [['light','Light','mss-mini'],['dark','Dark','mss-mini mss-mini-dark'],['dim','Soft dark','mss-mini mss-mini-dim'],['system','System','mss-mini mss-mini-system'],['scheduled','Timed night','mss-mini mss-mini-scheduled']]
      .map(x=>'<button type="button" class="mss-theme" data-ms-set="theme" data-ms-value="'+x[0]+'" aria-pressed="false"><span class="'+x[2]+'"><span class="mss-mini-rail"></span><span class="mss-mini-lines"><i></i><i></i><i></i></span></span><span class="mss-theme-caption">'+x[1]+'<span class="mss-radio-indicator" aria-hidden="true"></span></span></button>').join('')+
    '</div></div><div class="mss-section mss-timed-night"><h3>Automatic night schedule</h3><p class="mss-hint">Based on the device clock. No location permission or patient information is used.</p>'+
    msGroup('Dark begins','nightStart',[['18','6 PM'],['19','7 PM'],['20','8 PM'],['21','9 PM'],['22','10 PM']])+
    msGroup('Light begins','nightEnd',[['05','5 AM'],['06','6 AM'],['07','7 AM'],['08','8 AM'],['09','9 AM']])+
    '</div><div class="mss-section"><h3>Accent palette</h3><div class="mss-accent-list" role="group" aria-label="Accent palette">'+
    Object.entries(MS_ACCENTS).map(([key,value])=>'<button type="button" class="mss-accent-option" data-ms-set="accent" data-ms-value="'+key+'" aria-pressed="false"><span class="mss-accent-dot" style="--swatch:'+value.hex+'"></span>'+value.name+'</button>').join('')+
    '<button type="button" class="mss-accent-option" data-ms-set="accent" data-ms-value="custom" aria-pressed="false"><span class="mss-accent-dot mss-custom-dot"></span>Custom</button>'+
    '</div><label class="mss-custom-picker"><span><strong>Custom accent color</strong><small>Choose any color for the Settings interface</small></span><input data-ms-custom-color type="color" aria-label="Choose custom accent color" value="#6958bf"></label></div>'+
    '<div class="mss-section"><h3>Professional presets</h3><div class="mss-presets">'+
    [['daylight','Day Shift','Bright and balanced'],['midnight','Midnight Rounds','Dark with reduced motion'],['clarity','High Clarity','Large text and contrast'],['focus','Quiet Focus','Compact, calm and dark'],['twilight','Twilight','Gentle low-glare mode'],['auto','Auto Night','Changes with the clock']]
      .map(p=>'<button type="button" class="mss-preset" data-ms-preset="'+p[0]+'"><strong>'+p[1]+'</strong><small>'+p[2]+'</small></button>').join('')+
    '</div></div>';
  const typography=msHeader('Readable by design.','Adjust the actual Settings interface, not a sample box.')+
    msGroup('Reading size','scale',[['small','Small'],['standard','Standard'],['large','Large']])+
    msGroup('Typeface','typeface',[['modern','Modern'],['poppins','Poppins'],['arial','Arial'],['verdana','Verdana'],['trebuchet','Trebuchet'],['serif','Editorial'],['georgia','Georgia'],['monospace','Monospace']])+
    '<div class="mss-font-import"><div><strong>Upload your own font</strong><small data-ms-font-status>Choose a preset typeface or upload a font</small></div><button type="button" class="mss-data-action" data-ms-font-upload>Choose font</button><input id="msFontUpload" type="file" accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2" hidden></div>'+
    msGroup('Line spacing','lineSpacing',[['tight','Tight'],['comfortable','Comfortable'],['relaxed','Relaxed']]);
  const layout=msHeader('Your preferred rhythm.','Refine spacing and surfaces in the Settings studio.')+
    msGroup('Interface density','density',[['compact','Compact'],['comfortable','Comfortable'],['spacious','Spacious']])+
    msGroup('Corners','corners',[['rounded','Rounded'],['soft','Soft'],['square','Crisp'],['pill','Pill-shaped']])+
    msGroup('Surface depth','surface',[['layered','Soft layers'],['flat','Minimal']]);
  const accessibility=msHeader('Accessible by choice.','Changes take effect immediately in every Settings section.')+
    msToggle('High contrast','Stronger outlines and clearer labels.','contrast')+
    msToggle('Reduce motion','Remove animations and transitions.','reduceMotion')+
    msToggle('Stronger labels','Make descriptions and control labels easier to read.','boldLabels')+
    msToggle('Prominent keyboard focus','Highlight the currently focused control.','focusRing')+
    msToggle('Larger touch targets','Make controls easier to tap on tablets and phones.','largeTargets')+
    msToggle('Underline links','Identify links without relying on color alone.','underlineLinks')+
    msToggle('Enhanced text legibility','Increase control label clarity across the workspace.','readableLinks');
  const preferences=msHeader('Useful personal controls.','These preferences are functional and never touch medical records.')+
    msToggle('Remember last Settings section','Reopen the section where you left off.','rememberSection')+
    msToggle('Keyboard section shortcuts','While Settings is open, use Alt+1 through Alt+6.','hotkeys')+
    msToggle('Compact explanations','Hide extra help text while retaining all functional controls.','shortDescriptions')+
    '<div class="mss-section"><h3>Current configuration</h3><p class="mss-current" data-ms-summary></p>'+
    '<button type="button" class="mss-data-action mss-inline-action" data-ms-copy><strong>Copy settings summary</strong><span aria-hidden="true">⧉</span></button></div>';
  const backup=msHeader('Keep your setup.','Back up only appearance preferences. Prescriptions, templates, patient history and doctor details are excluded.')+
    '<div class="mss-backup-actions">'+
      '<button type="button" class="mss-data-action" data-ms-export><strong>Export preferences</strong><small>JSON saves editable settings so you can restore them later</small></button>'+
      '<button type="button" class="mss-data-action" data-ms-import><strong>Import preferences</strong><small>Choose a saved JSON file and reapply your settings</small></button>'+
      '<button type="button" class="mss-data-action" data-ms-reset><strong>Restore defaults</strong><small>Reset appearance settings only</small></button>'+
    '</div>'+
    '<input id="msSettingsImport" type="file" accept=".json,application/json" hidden aria-label="Import appearance preferences">'+
    '<p class="mss-hint mss-backup-note">JSON is machine-readable and can restore settings. A PDF is readable, but cannot automatically restore preferences. No clinical data is included.</p>';
  const panels={appearance,typography,layout,accessibility,preferences,backup};
  return [
    '<div class="mss-layout"><aside class="mss-sidebar">',
    '<div class="mss-brand"><span class="mss-brand-mark" aria-hidden="true">✳</span><div><strong>MediScript Pro</strong><small>Settings & Appearance</small></div></div>',
    '<nav class="mss-side-nav" role="tablist" aria-label="Settings sections">',
    sections.map(([key,icon,label])=>'<button type="button" class="mss-side-link" role="tab" id="msTab-'+key+'" aria-controls="msPanel-'+key+'" data-ms-tab="'+key+'" aria-selected="false"><span class="mss-side-icon" aria-hidden="true">'+icon+'</span>'+label+'</button>').join(''),
    '</nav><div class="mss-side-spacer"></div>',
    '<p class="mss-safe-note"><strong>Clinical workspace protected</strong>Settings cannot modify prescriptions or saved templates.</p>',
    '</aside><div class="mss-main">',
    '<div class="mss-topbar"><div class="mss-breadcrumb"><span>SETTINGS</span><span aria-hidden="true">/</span><b data-ms-crumb>Appearance</b></div>',
    '<div class="mss-top-controls"><span class="mss-saved-pill" data-ms-mode-label></span><button type="button" class="mss-quick-theme" data-ms-quick-theme>☾ Dark</button><button type="button" class="mss-close" data-ms-close aria-label="Close Settings">×</button></div></div>',
    '<div class="mss-content">',
    MS_SECTIONS.map(key=>'<section class="mss-panel" role="tabpanel" id="msPanel-'+key+'" aria-labelledby="msTab-'+key+'" data-ms-panel="'+key+'" hidden>'+panels[key]+'</section>').join(''),
    '</div><div class="mss-footer"><span class="mss-footer-status" data-ms-storage-status>Saved on this device</span>',
    '<button type="button" class="mss-done" data-ms-close>Done</button></div></div></div>',
    '<div class="mss-toast" data-ms-toast role="status" aria-live="polite" hidden></div>'
  ].join('');
}
async function msExport(){
  const data={type:'appearance-preferences-only',version:2,product:'MediScript Pro',savedAt:new Date().toISOString(),preferences:{...msPrefs}};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  try{
    const a=document.createElement('a');a.download='mediscript-settings.json';a.href=url;
    document.body.appendChild(a);a.click();a.remove();
    msToast('Appearance preferences exported');
  }finally{setTimeout(()=>URL.revokeObjectURL(url),7000);}
}
async function msImport(file){
  if(!file)return;
  if(file.size>32768){msToast('Settings file is too large');return;}
  try{
    const raw=JSON.parse(await file.text());
    if(!raw||raw.type!=='appearance-preferences-only'||!raw.preferences||typeof raw.preferences!=='object')throw Error('Incorrect settings backup');
    const data=raw.preferences;
    if(!['light','dark','dim','system','scheduled'].includes(data.theme))throw Error('Invalid theme');
    msPrefs=msSanitize(data);
    msWrite();msRender();
    msToast('Preferences restored');
  }catch(error){msToast('Invalid Settings JSON file');}
}
async function msCopy(){
  const text='MediScript Pro — '+(msIsDark()?'Dark':'Light')+'; accent: '+msPrefs.accent+
    '; text: '+msPrefs.scale+'; density: '+msPrefs.density+'; contrast: '+(msPrefs.contrast?'high':'normal');
  try{
    if(!navigator.clipboard?.writeText)throw Error('Clipboard not available');
    await navigator.clipboard.writeText(text);msToast('Settings summary copied');
  }catch(error){msToast('Clipboard blocked by browser');}
}
function msHandleClick(event){
  const target=event.target?.nodeType===1?event.target:event.target?.parentElement;
  const button=target?.closest('button');
  if(!button||!msDialog.contains(button))return;
  event.stopPropagation();
  if(button.hasAttribute('data-ms-quick-theme')){msChange('theme',msIsDark()?'light':'dark');return;}
  if(button.hasAttribute('data-ms-close')){msDialog.close();return;}
  if(button.hasAttribute('data-ms-tab')){msSection(button.dataset.msTab);return;}
  if(button.hasAttribute('data-ms-set')){msChange(button.dataset.msSet,button.dataset.msValue);return;}
  if(button.hasAttribute('data-ms-toggle')){
    const key=button.dataset.msToggle;
    msChange(key,!msPrefs[key]);return;
  }
  if(button.hasAttribute('data-ms-preset')){msPreset(button.dataset.msPreset);return;}
  if(button.hasAttribute('data-ms-font-upload')){msDialog.querySelector('#msFontUpload').click();return;}
  if(button.hasAttribute('data-ms-export')){void msExport();return;}
  if(button.hasAttribute('data-ms-import')){msDialog.querySelector('#msSettingsImport').click();return;}
  if(button.hasAttribute('data-ms-copy')){void msCopy();return;}
  if(button.hasAttribute('data-ms-reset')){
    if(!window.confirm('Reset only Settings & Appearance to defaults? Prescriptions and templates are untouched.'))return;
    msPrefs={...MS_DEFAULTS};msCurrent='appearance';msWrite();msSection('appearance');msRender();msToast('Default settings restored');
  }
}
function msCreate(){
  msDialog=document.createElement('dialog');
  msDialog.id='msSettingsDialog';
  msDialog.setAttribute('aria-label','Settings & Appearance');
  msDialog.setAttribute('aria-modal','true');
  msDialog.innerHTML=msMarkup();
  document.body.appendChild(msDialog);
  msDialog.addEventListener('click',msHandleClick,true);
  const onColor=event=>{
    if(!event.target?.matches?.('[data-ms-custom-color]'))return;
    msPrefs=msSanitize({...msPrefs,accent:'custom',customAccent:event.target.value});
    msWrite();msRender();
  };
  msDialog.addEventListener('input',onColor);
  msDialog.addEventListener('change',onColor);
  msDialog.querySelector('#msFontUpload').addEventListener('change',async event=>{await msLoadFont(event.target.files?.[0]);event.target.value='';});
  msDialog.querySelector('#msSettingsImport').addEventListener('change',async event=>{
    await msImport(event.target.files?.[0]);event.target.value='';
  });
  msDialog.addEventListener('keydown',event=>{
    if(event.key==='Escape')return;
    if(msPrefs.hotkeys&&event.altKey&&!event.ctrlKey&&!event.metaKey&&/^[1-6]$/.test(event.key)){
      event.preventDefault();msSection(MS_SECTIONS[Number(event.key)-1]);return;
    }
    const tab=event.target.closest('[data-ms-tab]');
    if(!tab||!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(event.key))return;
    event.preventDefault();
    const i=MS_SECTIONS.indexOf(tab.dataset.msTab);
    const next=MS_SECTIONS[(i+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+MS_SECTIONS.length)%MS_SECTIONS.length];
    msSection(next);msDialog.querySelector('[data-ms-tab="'+next+'"]').focus();
  });
  msDialog.addEventListener('close',()=>document.getElementById('workspaceMenuButton')?.focus({preventScroll:true}));
  window.setInterval(()=>{if(msPrefs.theme==='scheduled')msRender();},60000);
  const media=window.matchMedia?.('(prefers-color-scheme: dark)');
  if(media){
    const change=()=>{if(msPrefs.theme==='system')msRender();};
    if(media.addEventListener)media.addEventListener('change',change);
    else if(media.addListener)media.addListener(change);
  }
}
function msEnsureCss(){
  if(msStylePromise)return msStylePromise;
  msStylePromise=new Promise(resolve=>{
    const existing=document.getElementById('mssSettingsStyles');
    if(existing){resolve();return;}
    const link=document.createElement('link');
    link.id='mssSettingsStyles';link.rel='stylesheet';
    link.href=new URL('./settings-portal.css?v=6',import.meta.url).href;
    link.onload=resolve;link.onerror=resolve;
    document.head.appendChild(link);
    setTimeout(resolve,2000);
  });
  return msStylePromise;
}
export async function openSettings(){
  await msEnsureCss();
  if(!msDialog)msCreate();
  msRead();msRender();msSection(msCurrent);
  if(!msDialog.open)msDialog.showModal();
  msDialog.querySelector('[data-ms-close]').focus({preventScroll:true});
}
