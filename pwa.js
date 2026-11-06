/* 简记 v1.1.0: standalone PWA lifecycle. Does not read or transmit ledger contents. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const status = {registration: null, installPrompt: null, applyingUpdate: false, updated: false};
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const setLine = (id, dot, message, kind) => {
    $(id).textContent = message;
    $(dot).classList.remove('ok','warn');
    if (kind) $(dot).classList.add(kind);
  };
  function connectivity() {
    setLine('pwaNetworkStatus','pwaNetworkDot', navigator.onLine ? '当前联网；账目依旧只存储在本机，不会上传。' : '当前离线；可继续在本机记账。',navigator.onLine?'ok':'warn');
  }
  function installState() {
    const installed = standalone();
    $('pwaInstallBtn').disabled = installed;
    if (installed) {
      setLine('pwaInstallStatus','pwaInstallDot','已通过手机桌面 / 独立窗口打开。','ok');
    } else if(status.installPrompt){
      setLine('pwaInstallStatus','pwaInstallDot','浏览器已支持应用安装，可点击下方按钮。','ok');
    }else{
      setLine('pwaInstallStatus','pwaInstallDot','可以尝试浏览器菜单中的「添加到主屏幕 / 安装应用」。','warn');
    }
  }
  function offlineState(message,kind) {setLine('pwaOfflineStatus','pwaOfflineDot',message,kind);}
  function waitingUpdate() {
    if (status.registration?.waiting && navigator.serviceWorker.controller && !status.updated) {
      $('pwaUpdateBanner').hidden = false;
      $('pwaUpdateMessage').textContent='发现新的简记版本。请先保存正在填写的账目，再更新应用。';
      return true;
    }
    return false;
  }
  function hasOpenForm() {
    const modals=['entry','refund','templates','budget','recurring','categories'];
    return modals.some(n=>{const e=$(n+'Overlay');return e && !e.classList.contains('hidden')});
  }
  async function applyUpdate() {
    if (!status.registration?.waiting) return;
    const message = hasOpenForm()
      ? '当前有打开的编辑窗口。更新会刷新页面，未保存的输入将丢失。请先保存，或确认立即更新。'
      : '更新将刷新简记页面。请确认没有尚未保存的输入。';
    if (!window.confirm(message)) return;
    status.applyingUpdate = true;
    $('pwaApplyUpdate').disabled = true;
    status.registration.waiting.postMessage({type:'SKIP_WAITING'});
  }
  async function checkUpdate() {
    if (!status.registration) {window.alert('目前没有可检查的 PWA 更新。请通过 HTTPS 地址访问并先完成安装。');return;}
    if (!navigator.onLine){window.alert('当前离线，无法在线检查更新；仍可继续使用已缓存版本。');return;}
    const btn=$('pwaCheckUpdateBtn');btn.disabled=true;btn.textContent='正在检查…';
    try {
      await status.registration.update();
      // installing worker may need time to download. Let updatefound show the notice.
      if (!waitingUpdate()) $('pwaHelpText').textContent='已发起更新检查。如有新版，下载完成后会出现更新提示。账目仍保存在本机，建议定期导出 JSON 备份。';
    } catch(e) {
      $('pwaHelpText').textContent='更新检查失败：可能是网络不稳定。你可以稍后重试，现有版本和本地账目不受影响。';
      console.warn('PWA 更新检查失败',e);
    } finally {btn.disabled=false;btn.textContent='检查程序更新';}
  }
  async function installApp() {
    if (standalone()) return;
    if (status.installPrompt) {
      const prompt = status.installPrompt;status.installPrompt=null;
      try {await prompt.prompt();await prompt.userChoice;}catch(e){console.warn('安装提示无法显示',e)}
      installState();return;
    }
    window.alert('请先通过 HTTPS 地址在 Chrome 或 Edge 中打开简记，然后点击浏览器菜单「添加到主屏幕 / 安装应用」。国内部分 Android 浏览器只提供桌面快捷方式，属于正常现象。');
  }
  function attach() {
    $('pwaInstallBtn').addEventListener('click', installApp);
    $('pwaCheckUpdateBtn').addEventListener('click', checkUpdate);
    $('pwaApplyUpdate').addEventListener('click', applyUpdate);
    $('pwaDismissUpdate').addEventListener('click',()=>{$('pwaUpdateBanner').hidden=true;});
    window.addEventListener('online',()=>{connectivity();if(status.registration)checkUpdatesSilently()});
    window.addEventListener('offline',connectivity);
    window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();status.installPrompt=event;installState()});
    window.addEventListener('appinstalled',()=>{status.installPrompt=null;installState()});
    connectivity();installState();
  }
  async function checkUpdatesSilently(){
    if(status.registration&&navigator.onLine){try{await status.registration.update()}catch(e){console.warn('自动检查 PWA 更新失败',e)}}
  }
  async function initialize(){
    attach();
    if(location.protocol==='file:'){
      offlineState('目前通过本地 HTML 文件打开。请上传 PWA 文件夹并使用 HTTPS 地址，以启用桌面安装和离线缓存。','warn');return;
    }
    if(!window.isSecureContext){offlineState('此页面不是安全 HTTPS 环境，无法启用离线缓存。','warn');return;}
    if(!('serviceWorker' in navigator)){
      offlineState('当前浏览器不支持 Service Worker；建议使用 Chrome 或 Edge。','warn');return;
    }
    offlineState('正在注册离线缓存……',null);
    try{
      const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
      status.registration=reg;
      reg.addEventListener('updatefound',()=>{
        const worker=reg.installing;
        if(!worker)return;
        worker.addEventListener('statechange',()=>{
          if(worker.state==='installed'){
            if(navigator.serviceWorker.controller) waitingUpdate();
            else offlineState('离线文件已缓存完成，可通过飞行模式测试。','ok');
          }else if(worker.state==='redundant'&&!reg.active){offlineState('离线缓存下载失败；请联网重新打开并重试。','warn');}
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(status.applyingUpdate&&!status.updated){status.updated=true;window.location.reload();return}
        offlineState('离线缓存已准备好，可以断网打开应用。','ok');
      });
      const ready=await navigator.serviceWorker.ready;
      if(ready.active)offlineState('离线文件已准备好；建议用飞行模式实际验证一次。','ok');
      waitingUpdate();
      if(navigator.onLine)checkUpdatesSilently();
      document.addEventListener('visibilitychange',()=>{if(!document.hidden&&navigator.onLine)checkUpdatesSilently()});
      window.setInterval(()=>{if(!document.hidden&&navigator.onLine)checkUpdatesSilently()},30*60*1000);
    }catch(e){
      offlineState('离线缓存无法启用。请检查 HTTPS、网络以及浏览器设置。','warn');
      console.error('简记 PWA 注册失败',e);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
