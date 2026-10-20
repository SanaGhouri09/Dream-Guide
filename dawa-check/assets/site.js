/* Shared by every page: site settings, language memory, footer, cookie consent,
   analytics loader and the back-to-top button. Edit SITE before going live. */
const SITE={
  gaId:"G-F15W4XSLPM",  // Google Analytics 4 measurement ID, e.g. "G-ABC123XYZ". Empty = no analytics at all.
  email:"hello@dawacheck.pk",     // Contact email shown in the footer card and in form error messages.
  formEmail:"hello@dawacheck.pk", //         // Inbox that receives the "missing medicine" and feedback forms (sent via formsubmit.co). Empty = forms can't send.
  formEndpoint:"",      // Optional: your own form endpoint (Formspree, Web3Forms...). Overrides formEmail.
  updated:"18 Oct 2026" // Last data update, shown in the footer.
};

const DC=(()=>{
  const store={
    get(k){try{return localStorage.getItem(k)}catch(e){return null}},
    set(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  };
  const S={
    ru:{cardH:"Galat qeemat ya missing alert dekha?",cardP:"Dawa ka naam, pack aur screenshot bhejein. Hum DRAP ke asal source se mila kar theek kar dete hain.",
      mailBtn:"Email karein",copyMail:"Email copy karein",copiedMail:"Copy ho gaya",
      colTool:"Tool",colPol:"Policies",price:"Qeemat check",batch:"Batch check",latest:"Naye alerts",faq:"Sawal jawab",allMeds:"Sab dawaon ki qeemat (A-Z)",fakeList:"Naqli dawaon ki list",complain:"Complaint kaise karein",missing:"Missing dawa batayein",feedback:"Feedback",
      privacy:"Privacy",terms:"Terms",cookies:"Cookies",verify:"Hum data kaise check karte hain",cset:"Cookie settings",
      about:"Pakistan ke liye banaya gaya. Hum dawa nahi bechte aur koi commission nahi lete. Sirf DRAP ka public data, asaan zaban mein.",
      notDrap:"DRAP ya government ka hissa nahi",updated:"Data update",
      bannerP:"<b>Analytics cookies?</b> Hum Google Analytics se sirf yeh count karte hain ke kaun se features use hue aur kaun si dawaein search huin. Aap ka naam, phone ya CNIC kabhi nahi.",
      yes:"Theek hai",no:"Nahi chahiye",more:"Detail",
      dlgH:"Cookie settings",need:"Zaroori",needP:"Aap ki language, install reminder aur yeh choice. Sirf aap ke phone par save hoti hain.",
      ana:"Analytics",anaP:"Google Analytics: page views aur features ka count. Band karne se tool par koi farq nahi parta.",
      anaOff:"Abhi site par analytics laga hua nahi.",save:"Save karein",close:"Band karein",top:"Upar jayein",
      toast:"Website ab Roman Urdu mein hai",back:"← Tool par wapas jayein"},
    en:{cardH:"Spotted a wrong price or a missing alert?",cardP:"Send the medicine name, pack size and a screenshot. We check it against DRAP's original source and fix it.",
      mailBtn:"Email us",copyMail:"Copy email",copiedMail:"Copied",
      colTool:"Tool",colPol:"Policies",price:"Price check",batch:"Batch check",latest:"Latest alerts",faq:"FAQ",allMeds:"All medicine prices (A-Z)",fakeList:"Fake medicine list",complain:"How to complain",missing:"Report a missing medicine",feedback:"Feedback",
      privacy:"Privacy",terms:"Terms",cookies:"Cookies",verify:"How we verify",cset:"Cookie settings",
      about:"Made for Pakistan. We don't sell medicines and we take no commission. Just DRAP's public data, in plain language.",
      notDrap:"Not affiliated with DRAP or any government body",updated:"Data updated",
      bannerP:"<b>Analytics cookies?</b> We use Google Analytics only to count which features and medicine names get searched. Never your name, phone or CNIC.",
      yes:"Allow",no:"No thanks",more:"Details",
      dlgH:"Cookie settings",need:"Essential",needP:"Your language, the install reminder and this choice. Stored only on your device.",
      ana:"Analytics",anaP:"Google Analytics: counts page views and feature use. Turning it off doesn't change how the tool works.",
      anaOff:"Analytics isn't installed on the site right now.",save:"Save",close:"Close",top:"Back to top",
      toast:"Website is now in English",back:"← Back to the tool"}
  };
  let lang=store.get("dc-lang")==="en"?"en":"ru";
  const t=k=>S[lang][k];
  const base=document.body.dataset.base||"";
  const home=document.body.dataset.home||base+"index.html";

  /* consent: Pakistan and most countries default to on; EU/UK/Swiss time zones are asked first */
  const tz=(()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||""}catch(e){return""}})();
  const askFirst=/^Europe\//.test(tz)||/^Atlantic\/(Reykjavik|Canary|Madeira|Azores)$/.test(tz);
  const choice=()=>store.get("dc-consent"); // "granted" | "denied" | null
  const allowed=()=>{const c=choice();return c?c==="granted":!askFirst};
  let gaOn=false;
  function loadGA(){
    if(!SITE.gaId||gaOn)return;gaOn=true;
    window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};
    gtag("consent","default",{analytics_storage:"granted",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});
    gtag("js",new Date());gtag("config",SITE.gaId,{anonymize_ip:true});
    const s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(SITE.gaId);document.head.appendChild(s);
  }
  function stopGA(){
    if(window.gtag)gtag("consent","update",{analytics_storage:"denied"});
    document.cookie.split(";").map(c=>c.split("=")[0].trim()).filter(n=>/^_ga/.test(n)).forEach(n=>{
      const host=location.hostname,parts=host.split(".");
      [host,"."+parts.slice(-2).join("."),""].forEach(d=>{document.cookie=n+"=; Max-Age=0; path=/"+(d?"; domain="+d:"")});
    });
  }
  function setConsent(v){store.set("dc-consent",v);v==="granted"?loadGA():stopGA();hideBanner()}
  /* forms: POST JSON to formsubmit.co (or SITE.formEndpoint). Resolves true only when the service accepted it. */
  async function send(subject,fields){
    const ep=SITE.formEndpoint||(SITE.formEmail?"https://formsubmit.co/ajax/"+encodeURIComponent(SITE.formEmail):"");
    if(!ep)return false;
    const body={_subject:subject,_template:"table",_captcha:"false",...fields,page:location.href};
    if(fields.email)body._replyto=fields.email;
    try{
      const r=await fetch(ep,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(body)});
      if(!r.ok)return false;
      const j=await r.json().catch(()=>({}));
      return j.success===undefined||j.success===true||j.success==="true";
    }catch(e){return false}
  }
  function track(name,params){if(gaOn&&window.gtag)try{gtag("event",name,params||{})}catch(e){}}

  /* footer */
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const MAIL_ICON='<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function renderFooter(){
    const f=document.getElementById("site-foot");if(!f)return;
    const subj=encodeURIComponent(lang==="en"?"Dawa Check: price or alert correction":"Dawa Check: qeemat ya alert ki correction");
    const btns=SITE.email?`<a class="fbtn primary" href="mailto:${esc(SITE.email)}?subject=${subj}">${MAIL_ICON}${esc(SITE.email)}</a><button type="button" class="fbtn" data-copymail>${t("copyMail")}</button>`:"";
    f.innerHTML=`<div class="wrap">
      ${btns?`<div class="foot-card"><div><h2>${t("cardH")}</h2><p>${t("cardP")}</p></div><div class="foot-btns">${btns}</div></div>`:""}
      <div class="foot-grid">
        <div class="foot-about"><span class="wm"><span class="w-dawa">dawa</span><span class="w-check">check</span></span><p>${t("about")}</p></div>
        <nav aria-label="${t("colTool")}"><h3>${t("colTool")}</h3><ul>
          <li><a href="${home}#check">${t("price")}</a></li><li><a href="${home}#batch">${t("batch")}</a></li>
          <li><a href="${home}#latest">${t("latest")}</a></li><li><a href="${home}#complain">${t("complain")}</a></li>
          <li><a href="${home}#missing">${t("missing")}</a></li><li><a href="${base}feedback.html">${t("feedback")}</a></li>
          <li><a href="${home}#faq">${t("faq")}</a></li>
          <li><a href="${base}medicines/">${t("allMeds")}</a></li><li><a href="${base}fake-medicines">${t("fakeList")}</a></li></ul></nav>
        <nav aria-label="${t("colPol")}"><h3>${t("colPol")}</h3><ul>
          <li><a href="${base}privacy.html">${t("privacy")}</a></li><li><a href="${base}terms.html">${t("terms")}</a></li>
          <li><a href="${base}cookies.html">${t("cookies")}</a></li><li><a href="${base}how-we-verify.html">${t("verify")}</a></li>
          <li><button type="button" class="linkish" data-cset>${t("cset")}</button></li></ul></nav>
      </div>
      <div class="foot-base"><p>© 2026 Dawa Check · Made for Pakistan 🇵🇰</p><p>${t("notDrap")}</p><p>${t("updated")}: ${esc(SITE.updated)}</p></div>
    </div>`;
  }

  /* cookie banner + dialog */
  let bar=null;
  function hideBanner(){if(bar){bar.remove();bar=null}}
  function showBanner(){
    if(bar)return;
    bar=document.createElement("div");bar.className="cbar";bar.setAttribute("role","region");bar.setAttribute("aria-label","Cookies");
    bar.innerHTML=`<div class="cbar-in"><p>${t("bannerP")}</p><div class="cbtns"><button class="cb yes" data-c="granted">${t("yes")}</button><button class="cb" data-c="denied">${t("no")}</button><button class="cb" data-cset>${t("more")}</button></div></div>`;
    bar.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>setConsent(b.dataset.c));
    document.body.appendChild(bar);
  }
  function openSettings(){
    const prev=document.activeElement;
    const d=document.createElement("div");d.className="cdlg";
    d.innerHTML=`<div class="cdlg-in" role="dialog" aria-modal="true" aria-labelledby="cdlg-h">
      <h2 id="cdlg-h">${t("dlgH")}</h2>
      <div class="crow"><div><b>${t("need")}</b><span>${t("needP")}</span></div><input type="checkbox" class="sw" checked disabled aria-label="${t("need")}"></div>
      <div class="crow"><div><b>${t("ana")}</b><span>${t("anaP")}${SITE.gaId?"":" "+t("anaOff")}</span></div><input type="checkbox" class="sw" id="sw-ana" aria-label="${t("ana")}" ${allowed()?"checked":""}></div>
      <div class="cbtns"><button class="cb yes" id="cdlg-save">${t("save")}</button><button class="cb" id="cdlg-x">${t("close")}</button></div></div>`;
    const close=()=>{d.remove();document.removeEventListener("keydown",esc_);prev&&prev.focus&&prev.focus()};
    const esc_=e=>{if(e.key==="Escape")close()};
    d.addEventListener("click",e=>{if(e.target===d)close()});
    document.addEventListener("keydown",esc_);
    document.body.appendChild(d);
    d.querySelector("#cdlg-save").onclick=()=>{setConsent(d.querySelector("#sw-ana").checked?"granted":"denied");close()};
    d.querySelector("#cdlg-x").onclick=close;
    d.querySelector("#sw-ana").focus();
  }
  document.addEventListener("click",e=>{if(e.target.closest("[data-cset]")){e.preventDefault();openSettings()}});
  document.addEventListener("click",async e=>{const b=e.target.closest("[data-copymail]");if(!b)return;let ok=false;try{await navigator.clipboard.writeText(SITE.email);ok=true}catch(_){}b.textContent=ok?t("copiedMail"):SITE.email;track("copy_email");setTimeout(()=>b.textContent=t("copyMail"),2500)});

  /* back to top */
  function initTop(){
    const b=document.createElement("button");b.className="totop";b.type="button";b.setAttribute("aria-label",t("top"));
    b.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    b.onclick=()=>window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
    document.body.appendChild(b);
    const on=()=>b.classList.toggle("on",scrollY>700);addEventListener("scroll",on,{passive:true});on();
  }

  function markLang(){
    document.documentElement.dataset.lang=lang;
    document.querySelectorAll(".lang button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.lang===lang));
    document.querySelectorAll("[data-t]").forEach(el=>el.textContent=t(el.dataset.t));
    if(document.body.dataset.page==="doc")document.documentElement.lang=lang==="en"?"en":"ur-Latn";
  }
  let toastEl=null,toastTimer=0;
  function toast(msg){
    if(!toastEl){toastEl=document.createElement("div");toastEl.className="toast";toastEl.setAttribute("role","status");document.body.appendChild(toastEl)}
    toastEl.textContent=msg;toastEl.classList.remove("on");void toastEl.offsetWidth;toastEl.classList.add("on");
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove("on"),2200);
  }
  document.querySelectorAll(".lang[data-auto] button").forEach(b=>b.onclick=()=>setLang(b.dataset.lang));
  function setLang(l){const was=lang;lang=l==="en"?"en":"ru";store.set("dc-lang",lang);renderFooter();markLang();if(was!==lang){toast(t("toast"));document.dispatchEvent(new CustomEvent("dc:lang",{detail:lang}))}const tb=document.querySelector(".totop");if(tb)tb.setAttribute("aria-label",t("top"));if(bar){hideBanner();showBanner()}}

  renderFooter();markLang();initTop();
  if(allowed())loadGA();
  if(SITE.gaId&&askFirst&&!choice())showBanner();

  return{get lang(){return lang},setLang,track,send,toast,openSettings,SITE};
})();
