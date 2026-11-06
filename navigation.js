/* 简记 V1.1.1: navigation/UI only. Does not access or modify ledger storage. */
(() => {
  'use strict';
  const pages = ['home','ledger','stats','manage'];
  const pageEls = Object.fromEntries(pages.map(name=>[name,document.getElementById(name+'Page')]));
  const positions = Object.fromEntries(pages.map(name=>[name,0]));
  let current = 'home';
  const pageFromHash = () => {
    const key=location.hash.slice(1).toLowerCase();
    return pages.includes(key)?key:'home';
  };
  function navigate(name, push=false) {
    if(!pages.includes(name)) return;
    if(name!==current) positions[current]=window.scrollY;
    current=name;
    pages.forEach(p=> {pageEls[p].hidden=(p!==name);});
    document.querySelectorAll('[data-page-nav]').forEach(btn=>{
      const selected=btn.dataset.pageNav===name;
      btn.classList.toggle('active',selected);
      btn.setAttribute('aria-current',selected?'page':'false');
    });
    if(push && location.hash!=='#'+name) history.pushState({jianjiPage:name},'', '#'+name);
    requestAnimationFrame(()=>{window.scrollTo({top:positions[name]||0,behavior:'instant'});});
  }
  document.querySelectorAll('[data-page-nav]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.pageNav,true)));
  document.getElementById('mobileAddBtn').addEventListener('click',()=>document.getElementById('fabBtn').click());
  document.querySelectorAll('[data-existing-trigger]').forEach(btn=>btn.addEventListener('click',()=>{
    const original=document.getElementById(btn.dataset.existingTrigger);
    if(original) original.click();
    if(btn.dataset.focus==='pwa') requestAnimationFrame(()=>{
      document.getElementById('pwaOfflineStatus')?.scrollIntoView({block:'center',behavior:'instant'});
    });
  }));
  document.querySelectorAll('[data-forward]').forEach(btn=>btn.addEventListener('click',()=>{
    const original=document.getElementById(btn.dataset.forward);
    if(original) original.click();
  }));
  // The original business code updates monthLabel whenever month changes.
  const monthLabel=document.getElementById('monthLabel');
  function reflectMonth(){
    ['ledgerMonthLabel','statsMonthLabel'].forEach(id=>{
      const label=document.getElementById(id);
      if(label) label.textContent=monthLabel.textContent||'—';
    });
  }
  new MutationObserver(reflectMonth).observe(monthLabel,{childList:true,characterData:true,subtree:true});
  reflectMonth();
  const monthly=document.getElementById('jianjiMonthlyStats');
  const yearly=document.getElementById('jianjiYearlyStats');
  document.querySelectorAll('[data-stats-mode]').forEach(btn=>btn.addEventListener('click',()=>{
    const year=btn.dataset.statsMode==='year';
    monthly.hidden=year;yearly.hidden=!year;
    document.querySelectorAll('[data-stats-mode]').forEach(x=>{
      const on=x===btn;
      x.classList.toggle('active',on);x.setAttribute('aria-pressed',on?'true':'false');
    });
  }));
  // A dialog owns a browser history entry. Android Back closes the dialog first,
  // rather than navigating the page behind it. Ordinary close/save consumes the
  // same entry without leaving an invisible extra Back step.
  const overlayNames=['entry','refund','settings','templates','categories','budget','recurring'];
  const overlays=Object.fromEntries(overlayNames.map(n=>[n,document.getElementById(n+'Overlay')]));
  const activeOverlay=()=>overlayNames.find(n=>!overlays[n].classList.contains('hidden'))||null;
  const formSnapshots=new Map();
  let closingFromHistory=false;
  let consumingClosedModal=false;
  const formSnapshot=name=>JSON.stringify(Array.from(overlays[name].querySelectorAll('input,select,textarea'))
    .filter(el=>el.type!=='file')
    .map(el=>[el.id||el.name,el.type,el.type==='checkbox'||el.type==='radio'?el.checked:el.value]));
  const isDirty=name=>['entry','refund','budget','recurring','categories'].includes(name)
    && formSnapshots.has(name) && formSnapshots.get(name)!==formSnapshot(name);
  function reconcileModalHistory(){
    if(closingFromHistory)return;
    const name=activeOverlay();
    const historyModal=history.state?.jianjiModal;
    if(name){
      if(!formSnapshots.has(name))formSnapshots.set(name,formSnapshot(name));
      if(historyModal===name)return;
      const state={...(history.state||{}),jianjiPage:current,jianjiModal:name};
      if(historyModal)history.replaceState(state,'',location.href);
      else history.pushState(state,'',location.href);
    }else if(historyModal && !consumingClosedModal){
      consumingClosedModal=true;
      history.back();
    }
    for(const n of overlayNames)if(n!==name)formSnapshots.delete(n);
  }
  const modalObserver=new MutationObserver(reconcileModalHistory);
  overlayNames.forEach(n=>modalObserver.observe(overlays[n],{attributes:true,attributeFilter:['class']}));
  function onHistoryPop(){
    consumingClosedModal=false;
    const modal=activeOverlay();
    if(modal && history.state?.jianjiModal!==modal){
      // The Back button was used with a dialog open.
      if(isDirty(modal) && !window.confirm('当前窗口有尚未保存的修改。确定放弃修改并返回吗？')){
        history.pushState({...(history.state||{}),jianjiPage:current,jianjiModal:modal},'',location.href);
        return;
      }
      closingFromHistory=true;
      overlays[modal].querySelector('[data-close="'+modal+'"]')?.click();
      formSnapshots.delete(modal);
      // Let the MutationObserver consume the close while the guard is active.
      queueMicrotask(()=>{closingFromHistory=false;});
    }
    navigate(pageFromHash());
  }
  window.addEventListener('popstate',onHistoryPop);
  window.addEventListener('hashchange',()=>{if(!activeOverlay())navigate(pageFromHash());});
  navigate(pageFromHash());
})();
