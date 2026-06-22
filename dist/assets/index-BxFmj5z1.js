(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const r of n)if(r.type==="childList")for(const u of r.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&a(u)}).observe(document,{childList:!0,subtree:!0});function s(n){const r={};return n.integrity&&(r.integrity=n.integrity),n.referrerPolicy&&(r.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?r.credentials="include":n.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function a(n){if(n.ep)return;n.ep=!0;const r=s(n);fetch(n.href,r)}})();const Jt="https://juquttlvkairdgdkzpke.supabase.co",Xt="sb_publishable_tKbsPXd1ZbT5E0Am7oAA6w_GMjeM1Is",{createClient:Qt}=supabase,f=Qt(Jt,Xt);async function te(){const{error:t}=await f.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin+window.location.pathname}});if(t)throw t}async function ee(){const{error:t}=await f.auth.signOut();if(t)throw t}async function ae(){const{data:{user:t}}=await f.auth.getUser();return t}function se(t){return f.auth.onAuthStateChange((e,s)=>{t((s==null?void 0:s.user)??null)})}function ne(t){t.innerHTML=`
    <div class="login-page">
      <h1>BREVIS</h1>
      <p>Sign in to manage your contacts</p>
      <button id="google-login" class="btn btn-primary">Sign in with Google</button>
    </div>`,t.querySelector("#google-login").addEventListener("click",async()=>{try{await te()}catch(e){alert("Login failed: "+e.message)}})}function G(t,e=300){let s;return(...a)=>{clearTimeout(s),s=setTimeout(()=>t(...a),e)}}function oe(t,e){const s=new Map;for(const l of e)s.set(l.id,l.name);const a=["First Name","Last Name","Email","Phone","Company","Notes","Created"],n=t.map(l=>[l.first_name,l.last_name,l.email||"",l.phone||"",l.company_id&&s.get(l.company_id)||"",(l.notes||"").replace(/\n/g," "),l.created_at?new Date(l.created_at).toLocaleDateString():""]),r=l=>{const v=String(l);return v.includes(",")||v.includes('"')||v.includes(`
`)?'"'+v.replace(/"/g,'""')+'"':v},u=[a,...n].map(l=>l.map(r).join(",")).join(`\r
`),d=new Blob(["\uFEFF"+u],{type:"text/csv;charset=utf-8;"}),i=URL.createObjectURL(d),c=document.createElement("a");c.href=i,c.download=`contacts_${new Date().toISOString().slice(0,10)}.csv`,c.click(),URL.revokeObjectURL(i)}function W(t){if(!t)return{days:null,css:"temp-dead",label:"! -"};const e=Math.floor((Date.now()-new Date(t).getTime())/864e5);return e<7?{days:e,css:"temp-hot",label:`· ${e}d`}:e<30?{days:e,css:"temp-warm",label:`${e}d`}:e<60?{days:e,css:"temp-cold",label:`* ${e}d`}:{days:e,css:"temp-dead",label:`! ${e}d`}}function re(){return'<span class="temp-legend">· fresh &nbsp; normal &nbsp; * cooling &nbsp; ! cold</span>'}const Ct=["open"];let P={col:"last_name",asc:!0},T="",D="all";async function ce(){let t=f.from("contacts").select("*, companies(name)");T&&(t=t.or(`first_name.ilike.%${T}%,last_name.ilike.%${T}%,email.ilike.%${T}%,notes.ilike.%${T}%`)),D==="with_email"&&(t=t.not("email","is",null).neq("email","")),D==="with_phone"&&(t=t.not("phone","is",null).neq("phone","")),D==="with_company"&&(t=t.not("company_id","is",null)),t=t.order(P.col,{ascending:P.asc});const{data:e,error:s}=await t;if(s)throw s;return e||[]}async function le(){const{data:t}=await f.from("companies").select("id, name").order("name");return t||[]}async function ie(){const{data:t}=await f.from("logs").select("contact_id, logged_at, content").not("contact_id","is",null).order("logged_at",{ascending:!1}),e=new Map;for(const s of t||[])e.has(s.contact_id)||e.set(s.contact_id,{date:s.logged_at,content:s.content});return Array.from(e.entries()).map(([s,a])=>({contact_id:s,last_date:a.date,content:a.content}))}async function de(){const{data:t}=await f.from("projects").select("contact_id").in("status",Ct).not("contact_id","is",null),{data:e}=await f.from("projects").select("company_id").in("status",Ct).not("company_id","is",null),s=new Set((t||[]).map(n=>n.contact_id)),a=new Set((e||[]).map(n=>n.company_id));return{contactsWithDeals:s,companiesWithDeals:a}}function it(t){return P.col!==t?"":P.asc?" ↑":" ↓"}async function et(t){t.innerHTML='<div class="loading">Loading contacts...</div>';try{const[e,s,a,n]=await Promise.all([ce(),le(),de(),ie()]),r=new Map;for(const l of n)l.contact_id&&r.set(l.contact_id,{date:l.last_date,content:l.content});const u=e.filter(l=>a.contactsWithDeals.has(l.id)||l.company_id&&a.companiesWithDeals.has(l.company_id)).sort((l,v)=>{const h=(l.last_name||"").localeCompare(v.last_name||"");return h!==0?h:(l.first_name||"").localeCompare(v.first_name||"")}),d=e.filter(l=>!a.contactsWithDeals.has(l.id)&&!(l.company_id&&a.companiesWithDeals.has(l.company_id))).sort((l,v)=>{const h=(l.last_name||"").localeCompare(v.last_name||"");return h!==0?h:(l.first_name||"").localeCompare(v.first_name||"")});t.innerHTML=`
      <div class="page-header">
        <h1>Contacts <span class="badge">${e.length}</span></h1>
        <div class="header-actions">
          <button id="csv-export" class="btn btn-secondary">Export CSV</button>
          <a href="https://www.icloud.com/contacts/" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Contacts</a>
          <a href="#/contacts/new" class="btn btn-primary">+ New Contact</a>
        </div>
      </div>

      <div class="toolbar">
        <input type="search" id="search-input" class="input" placeholder="Search name, email, notes..." value="${It(T)}">
        <select id="filter-select" class="input">
          <option value="all"${D==="all"?" selected":""}>All contacts</option>
          <option value="with_email"${D==="with_email"?" selected":""}>With email</option>
          <option value="with_phone"${D==="with_phone"?" selected":""}>With phone</option>
          <option value="with_company"${D==="with_company"?" selected":""}>With company</option>
        </select>
      </div>

      ${ue(u,d,r)}
    `;const i=t.querySelector("#search-input"),c=G(async()=>{T=i.value.trim(),await et(t)},350);i.addEventListener("input",c),t.querySelector("#filter-select").addEventListener("change",async l=>{D=l.target.value,await et(t)}),t.querySelectorAll(".sortable").forEach(l=>{l.addEventListener("click",async()=>{const v=l.dataset.col;P.col===v?P.asc=!P.asc:P={col:v,asc:!0},await et(t)})}),t.querySelectorAll(".clickable-row").forEach(l=>{l.addEventListener("click",()=>{window.location.hash=`#/contacts/${l.dataset.id}`})}),t.querySelector("#csv-export").addEventListener("click",()=>{oe(e,s)}),T&&(i.focus(),i.setSelectionRange(i.value.length,i.value.length))}catch(e){t.innerHTML=`<div class="error">Error: ${H(e.message)}</div>`}}function ue(t,e,s){let a="";return t.length>0&&(a+=`
      <div class="deal-group">
        <h2 class="group-heading">Open Projects <span class="badge">${t.length}</span></h2>
        ${xt(t,s)}
      </div>
    `),e.length>0&&(a+=`
      <div class="deal-group">
        <h2 class="group-heading">Other <span class="badge">${e.length}</span></h2>
        ${xt(e,s)}
      </div>
    `),t.length===0&&e.length===0&&(a='<div class="empty-state">No contacts. <a href="#/contacts/new">Create first</a>.</div>'),a}function xt(t,e){return`
    <div class="table-wrap">
      <table class="data-table table-contacts">
        <thead>
          <tr>
            <th class="sortable" data-col="last_name">Name${it("last_name")}</th>
            <th class="sortable" data-col="email">Email${it("email")}</th>
            <th class="sortable" data-col="phone">Phone${it("phone")}</th>
            <th>Company</th>
            <th>Temp</th>
          </tr>
        </thead>
        <tbody>
          ${t.map(s=>{var d;const a=e.get(s.id),n=W(a==null?void 0:a.date),r=a!=null&&a.content?pe(a.content,80):"",u=!s.email||!s.phone||!s.company_id;return`
            <tr class="clickable-row ${n.css}" data-id="${s.id}">
              <td>
                <strong>${H(s.first_name)} ${H(s.last_name)}</strong>${u?' <span class="incomplete-badge">[!]</span>':""}
                ${r?`<div class="log-snippet">${H(r)}</div>`:""}
              </td>
              <td>${s.email?`<a href="mailto:${It(s.email)}" onclick="event.stopPropagation()">${H(s.email)}</a>`:'<span class="muted">-</span>'}</td>
              <td>${s.phone?H(s.phone):'<span class="muted">-</span>'}</td>
              <td>${(d=s.companies)!=null&&d.name?H(s.companies.name):'<span class="muted">-</span>'}</td>
              <td class="${n.css}">${n.label}</td>
            </tr>
          `}).join("")}
        </tbody>
      </table>
    </div>
  `}function pe(t,e){return t?t.length>e?t.slice(0,e)+"...":t:""}function H(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}function It(t){return t?t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):""}function me(t){const e=Date.now(),s=new Date(t).getTime(),a=e-s,n=Math.floor(a/6e4);if(n<1)return"just now";if(n<60)return`${n}m ago`;const r=Math.floor(n/60);if(r<24)return`${r}h ago`;const u=Math.floor(r/24);return u<30?`${u}d ago`:new Date(t).toLocaleDateString()}const kt=1e4;let k=null;function fe(){let t=document.getElementById("undo-container");return t||(t=document.createElement("div"),t.id="undo-container",document.body.appendChild(t)),t}function ve(){k&&(clearTimeout(k.timer),k.el&&k.el.parentNode&&k.el.parentNode.removeChild(k.el),k=null)}async function z(t,e,s,a,n){ve();const{data:r,error:u}=await f.from(t).select("*").eq("id",e.id).single();if(u||!r){alert("Error: "+((u==null?void 0:u.message)||"Row not found"));return}const{error:d}=await f.from(t).delete().eq("id",e.id);if(d){alert("Error: "+d.message);return}a();const i=fe(),c=document.createElement("div");c.className="undo-toast",c.innerHTML=`
    <span class="undo-text">Deleted ${s}</span>
    <a href="#" class="undo-link">Undo</a>
    <span class="undo-timer-bar"></span>
  `,i.appendChild(c);const l=c.querySelector(".undo-link"),v=c.querySelector(".undo-timer-bar");requestAnimationFrame(()=>{v.style.transition=`width ${kt}ms linear`,v.style.width="0%"});const h=setTimeout(()=>{c.parentNode&&c.parentNode.removeChild(c),k=null},kt);k={el:c,timer:h},l.addEventListener("click",async S=>{S.preventDefault(),clearTimeout(h),c.parentNode&&c.parentNode.removeChild(c),k=null;const{error:p}=await f.from(t).insert(r);if(p){alert("Undo failed: "+p.message);return}n()})}function Ft(t,e="contact",s={}){return!t||t.length===0?'<div class="log-empty">No log entries yet.</div>':`<div class="log-timeline">${t.map(a=>{var d,i;const n=ge(a.logged_at);let r="";if(e==="contact"&&((d=a.projects)!=null&&d.title))r=` <a href="#/projects/${a.project_id}" class="log-tag">[${N(a.projects.title)}]</a>`;else if(e==="project"&&a.contacts){const c=`${a.contacts.first_name||""} ${a.contacts.last_name||""}`.trim();c&&(r=` <a href="#/contacts/${a.contact_id}" class="log-tag">[${N(c)}]</a>`)}return`
      <div class="log-entry${((i=a.content)==null?void 0:i.startsWith(">"))?" log-entry-next":""}" data-log-id="${a.id}">
        <div class="log-entry-view">
          <span class="log-date">${n} ───</span>
          <span class="log-content">${N(a.content)}</span>${r}
          <span class="log-actions">
            <button class="log-edit-btn" data-log-id="${a.id}" title="Edit">edit</button>
            <button class="log-delete-btn" data-log-id="${a.id}" title="Delete">&times;</button>
          </span>
        </div>
        <div class="log-entry-edit" style="display:none" data-log-id="${a.id}">
          <input type="date" class="input log-edit-date" value="${a.logged_at||""}">
          <textarea class="input log-edit-content" rows="2">${N(a.content||"")}</textarea>
          <div class="log-edit-row">
            ${e==="contact"?`
              <select class="input log-edit-project">
                <option value="">-- project --</option>
                ${(s.projects||[]).map(c=>`<option value="${c.id}"${a.project_id===c.id?" selected":""}>${N(c.title)}</option>`).join("")}
              </select>`:""}
            ${e==="project"?`
              <select class="input log-edit-contact">
                <option value="">-- contact --</option>
                ${(s.contacts||[]).map(c=>`<option value="${c.id}"${a.contact_id===c.id?" selected":""}>${N(c.first_name)} ${N(c.last_name)}</option>`).join("")}
              </select>`:""}
            <button class="btn btn-sm btn-primary log-edit-save" data-log-id="${a.id}">Save</button>
            <button class="btn btn-sm btn-secondary log-edit-cancel" data-log-id="${a.id}">Cancel</button>
          </div>
        </div>
      </div>`}).join("")}</div>`}function Ut(t,e){t.querySelectorAll(".log-edit-btn").forEach(s=>{s.addEventListener("click",a=>{a.stopPropagation();const n=s.dataset.logId,r=t.querySelector(`.log-entry[data-log-id="${n}"]`);r&&(r.querySelector(".log-entry-view").style.display="none",r.querySelector(".log-entry-edit").style.display="")})}),t.querySelectorAll(".log-edit-cancel").forEach(s=>{s.addEventListener("click",a=>{a.stopPropagation();const n=s.dataset.logId,r=t.querySelector(`.log-entry[data-log-id="${n}"]`);r&&(r.querySelector(".log-entry-view").style.display="",r.querySelector(".log-entry-edit").style.display="none")})}),t.querySelectorAll(".log-edit-save").forEach(s=>{s.addEventListener("click",async a=>{a.stopPropagation();const n=s.dataset.logId,r=t.querySelector(`.log-entry[data-log-id="${n}"]`);if(!r)return;const u=r.querySelector(".log-entry-edit"),d=u.querySelector(".log-edit-content").value.trim();if(!d)return;const i=u.querySelector(".log-edit-date").value,c=u.querySelector(".log-edit-project"),l=u.querySelector(".log-edit-contact"),v={content:d,logged_at:i||null};c&&(v.project_id=c.value||null),l&&(v.contact_id=l.value||null);const{error:h}=await f.from("logs").update(v).eq("id",n);!h&&e&&e()})}),t.querySelectorAll(".log-delete-btn").forEach(s=>{s.addEventListener("click",async a=>{a.stopPropagation();const n=s.dataset.logId;n&&await z("logs",{id:n},"log entry",()=>{e&&e()},()=>{e&&e()})})})}function ge(t){if(!t)return"";const e=new Date(t),s=String(e.getDate()).padStart(2,"0"),a=String(e.getMonth()+1).padStart(2,"0");return`${s}.${a}.`}function N(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}async function at(t,e){var s;t.innerHTML='<div class="loading">Loading...</div>';try{const[{data:a,error:n},{data:r},{data:u},{data:d}]=await Promise.all([f.from("contacts").select("*, companies(id, name)").eq("id",e).single(),f.from("logs").select("*, projects(title)").eq("contact_id",e).order("logged_at",{ascending:!1}).order("created_at",{ascending:!1}),f.from("companies").select("id, name").order("name"),f.from("projects").select("id, title").order("title")]);if(n||!a){t.innerHTML='<div class="error">Contact not found. <a href="#/contacts">Back to list</a></div>';return}const i=(r||[])[0],c=i?`Last contact: ${me(i.logged_at)}`:"Last contact: never",l=i?W(i.logged_at).css:"temp-dead",v=(r||[])[0],h=(s=v==null?void 0:v.content)!=null&&s.startsWith(">")?`<div class="next-step"><span class="next-step-label">NEXT:</span> ${O(v.content.slice(1).trim())} <span class="muted">${he(v.logged_at)}</span></div>`:"",S=(d||[]).filter(b=>(r||[]).some(C=>C.project_id===b.id)),{data:p}=await f.from("projects").select("id, title, status").eq("contact_id",e).order("title"),m=new Map;for(const b of p||[])m.set(b.id,b);for(const b of S)m.set(b.id,b);const g=Array.from(m.values()),$=Ft(r||[],"contact",{projects:d||[]});t.innerHTML=`
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-toolbar">
            <a href="#/contacts" class="btn btn-back">&larr; Back</a>
            <h1>${O(a.first_name)} ${O(a.last_name)}</h1>
            <div class="detail-actions">
              <button id="toggle-star" class="btn btn-sm btn-secondary">${a.starred_at?"★ Unstar":"☆ Star"}</button>
              <button id="delete-contact" class="btn btn-danger">Del</button>
            </div>
          </div>
        </div>

        <div class="last-contact ${l}">${c}</div>
        ${h}

        <div class="inline-fields-vertical">
          <label>Email <input type="email" id="f-email" class="input inline-input" value="${Mt(a.email||"")}" placeholder="add email"></label>
          <label>Phone <input type="tel" id="f-phone" class="input inline-input" value="${Mt(a.phone||"")}" placeholder="add phone"></label>
          <label>Company
            <select id="f-company" class="input inline-input">
              <option value="">—</option>
              ${(u||[]).map(b=>`<option value="${b.id}"${a.company_id===b.id?" selected":""}>${O(b.name)}</option>`).join("")}
            </select>
          </label>
          <span id="inline-status" class="inline-status"></span>
        </div>

        ${g.length>0?`
        <div class="related-entities">Projects: ${g.map(b=>`<a href="#/projects/${b.id}">${O(b.title)} <span class="muted">(${b.status})</span></a>`).join(" · ")}</div>`:""}

        <div class="section-bar">Log</div>
        ${$}
      </div>
    `;const _=t.querySelector("#inline-status");async function L(b,C){const{error:x}=await f.from("contacts").update({[b]:C||null}).eq("id",e);x?(_.textContent="Error",_.style.color="var(--danger)"):(_.textContent="Saved",_.style.color="var(--success)",setTimeout(()=>{_.textContent=""},2e3))}const w=G(()=>L("email",t.querySelector("#f-email").value.trim()),1e3),j=G(()=>L("phone",t.querySelector("#f-phone").value.trim()),1e3);t.querySelector("#f-email").addEventListener("input",w),t.querySelector("#f-phone").addEventListener("input",j),t.querySelector("#f-company").addEventListener("change",()=>{L("company_id",t.querySelector("#f-company").value)}),t.querySelector("#toggle-star").addEventListener("click",async()=>{const b=a.starred_at?null:new Date().toISOString();await f.from("contacts").update({starred_at:b}).eq("id",e),at(t,e)}),Ut(t,()=>at(t,e)),window.addEventListener("log-created",()=>at(t,e),{once:!0}),t.querySelector("#delete-contact").addEventListener("click",async()=>{await z("contacts",a,`"${a.first_name} ${a.last_name}"`,()=>{window.location.hash="#/contacts"},()=>{window.location.hash=`#/contacts/${e}`})})}catch(a){t.innerHTML=`<div class="error">Error: ${O(a.message)}</div>`}}function he(t){if(!t)return"";const e=new Date(t);return`${String(e.getDate()).padStart(2,"0")}.${String(e.getMonth()+1).padStart(2,"0")}.`}function O(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}function Mt(t){return t?t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):""}async function Tt(t,e=null){if(e){window.location.hash=`#/contacts/${e}`;return}t.innerHTML=`
    <div class="form-page">
      <a href="#/contacts" class="btn btn-back">&larr; Back</a>
      <h1>New Contact</h1>

      <form id="contact-form" class="card form-card" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label for="first_name">First Name *</label>
            <input type="text" id="first_name" class="input" required>
            <span class="field-error" id="err-first_name"></span>
          </div>
          <div class="form-group">
            <label for="last_name">Last Name *</label>
            <input type="text" id="last_name" class="input" required>
            <span class="field-error" id="err-last_name"></span>
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" id="submit-btn">Save</button>
          <a href="#/contacts" class="btn btn-secondary">Cancel</a>
        </div>
        <div class="form-error" id="form-error"></div>
      </form>
    </div>
  `,t.querySelector("#first_name").focus(),t.querySelector("#contact-form").addEventListener("submit",async s=>{s.preventDefault(),ye(t);const a=t.querySelector("#first_name").value.trim(),n=t.querySelector("#last_name").value.trim();let r=!0;if(a||(Dt(t,"first_name","Required"),r=!1),n||(Dt(t,"last_name","Required"),r=!1),!r)return;const u=t.querySelector("#submit-btn");u.disabled=!0,u.textContent="Saving...";try{const d=(await f.auth.getUser()).data.user,{data:i,error:c}=await f.from("contacts").insert({first_name:a,last_name:n,user_id:d.id}).select().single();if(c)throw c;window.location.hash=`#/contacts/${i.id}`}catch(d){t.querySelector("#form-error").textContent="Error: "+d.message,u.disabled=!1,u.textContent="Save"}})}function Dt(t,e,s){const a=t.querySelector(`#err-${e}`);a&&(a.textContent=s);const n=t.querySelector(`#${e}`);n&&n.classList.add("input-error")}function ye(t){t.querySelectorAll(".field-error").forEach(e=>e.textContent=""),t.querySelectorAll(".input-error").forEach(e=>e.classList.remove("input-error")),t.querySelector("#form-error").textContent=""}const be=["open"];async function st(t){t.innerHTML='<div class="loading">Loading companies...</div>';try{let h=function(p=null){l.style.display="",t.querySelector("#company-form-title").textContent=p?"Edit Company":"New Company",t.querySelector("#company-submit-btn").textContent=p?"Save Changes":"Create Company",t.querySelector("#company-edit-id").value=(p==null?void 0:p.id)||"",t.querySelector("#c-name").value=(p==null?void 0:p.name)||"",t.querySelector("#c-official-name").value=(p==null?void 0:p.official_name)||"",t.querySelector("#c-email").value=(p==null?void 0:p.email)||"",t.querySelector("#c-ico").value=(p==null?void 0:p.ico)||"",t.querySelector("#c-web").value=(p==null?void 0:p.web)||"",t.querySelector("#c-notes").value=(p==null?void 0:p.notes)||"",t.querySelector("#c-name").focus()},S=function(){l.style.display="none",v.reset(),t.querySelector("#company-edit-id").value="",t.querySelector("#company-form-error").textContent=""};var e=h,s=S;const{data:a,error:n}=await f.from("companies").select("*, contacts(id)").order("name");if(n)throw n;const{data:r}=await f.from("projects").select("company_id").in("status",be),u={};(r||[]).forEach(p=>{p.company_id&&(u[p.company_id]=(u[p.company_id]||0)+1)});const d=a||[],i=d.filter(p=>u[p.id]>0).sort((p,m)=>(p.name||"").localeCompare(m.name||"")),c=d.filter(p=>!u[p.id]).sort((p,m)=>(p.name||"").localeCompare(m.name||""));t.innerHTML=`
      <div class="page-header">
        <h1>Companies <span class="badge">${d.length}</span></h1>
        <div class="header-actions">
          <a href="#/contacts" class="btn btn-secondary">&larr; Contacts</a>
          <button id="add-company-btn" class="btn btn-primary">+ New Company</button>
        </div>
      </div>

      <div id="company-form-wrap" class="card form-card" style="display:none">
        <h2 id="company-form-title">New Company</h2>
        <form id="company-form">
          <input type="hidden" id="company-edit-id" value="">
          <div class="form-row">
            <div class="form-group">
              <label for="c-name">Company Name *</label>
              <input type="text" id="c-name" class="input" required>
            </div>
            <div class="form-group">
              <label for="c-official-name">Official Name</label>
              <input type="text" id="c-official-name" class="input">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="c-email">Email</label>
              <input type="email" id="c-email" class="input">
            </div>
            <div class="form-group">
              <label for="c-ico">Company ID (ICO)</label>
              <input type="text" id="c-ico" class="input" maxlength="20">
            </div>
          </div>
          <div class="form-group">
            <label for="c-web">Website</label>
            <input type="url" id="c-web" class="input" placeholder="https://...">
          </div>
          <div class="form-group">
            <label for="c-notes">Notes</label>
            <textarea id="c-notes" class="input" rows="3"></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="company-submit-btn">Create Company</button>
            <button type="button" id="company-cancel-btn" class="btn btn-secondary">Cancel</button>
          </div>
          <div class="form-error" id="company-form-error"></div>
        </form>
      </div>

      ${$e(i,c,u)}
    `;const l=t.querySelector("#company-form-wrap"),v=t.querySelector("#company-form");t.querySelector("#add-company-btn").addEventListener("click",()=>h()),t.querySelector("#company-cancel-btn").addEventListener("click",S),v.addEventListener("submit",async p=>{p.preventDefault();const m=t.querySelector("#c-name").value.trim();if(!m){t.querySelector("#company-form-error").textContent="Company name is required";return}const g=t.querySelector("#company-edit-id").value,$={name:m,official_name:t.querySelector("#c-official-name").value.trim()||null,email:t.querySelector("#c-email").value.trim()||null,ico:t.querySelector("#c-ico").value.trim()||null,web:t.querySelector("#c-web").value.trim()||null,notes:t.querySelector("#c-notes").value.trim()||null};try{if(g){const{error:_}=await f.from("companies").update($).eq("id",g);if(_)throw _}else{const _=(await f.auth.getUser()).data.user;$.user_id=_.id;const{error:L}=await f.from("companies").insert($);if(L)throw L}await st(t)}catch(_){t.querySelector("#company-form-error").textContent="Error: "+_.message}}),t.querySelectorAll(".edit-company").forEach(p=>{p.addEventListener("click",m=>{m.preventDefault();const g=d.find($=>$.id===p.dataset.id);g&&h(g)})}),t.querySelectorAll(".delete-company").forEach(p=>{p.addEventListener("click",async m=>{m.preventDefault();const g=d.find($=>$.id===p.dataset.id);g&&await z("companies",g,`"${g.name}"`,()=>st(t),()=>st(t))})}),t.querySelectorAll(".clickable-row").forEach(p=>{p.addEventListener("click",()=>{window.location.hash=`#/companies/${p.dataset.id}`})})}catch(a){t.innerHTML=`<div class="error">Error: ${U(a.message)}</div>`}}function $e(t,e,s){let a="";return t.length>0&&(a+=`
      <div class="deal-group">
        <h2 class="group-heading">Open Projects <span class="badge">${t.length}</span></h2>
        <div class="table-wrap">
          <table class="data-table table-companies">
            <thead>
              <tr>
                <th>Name</th>
                <th>Official</th>
                <th>Email</th>
                <th>Web</th>
                <th>ICO</th>
                <th>Contacts</th>
                <th>Open Projects</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${t.map(n=>Pt(n,s[n.id]||0)).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `),e.length>0&&(a+=`
      <div class="deal-group">
        <h2 class="group-heading">Other <span class="badge">${e.length}</span></h2>
        <div class="table-wrap">
          <table class="data-table table-companies">
            <thead>
              <tr>
                <th>Name</th>
                <th>Official</th>
                <th>Email</th>
                <th>Web</th>
                <th>ICO</th>
                <th>Contacts</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${e.map(n=>Pt(n,0)).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `),t.length===0&&e.length===0&&(a='<div class="empty-state">No companies.</div>'),a}function Pt(t,e){return`
    <tr class="clickable-row" data-id="${t.id}">
      <td><strong>${U(t.name)}</strong></td>
      <td>${t.official_name?U(t.official_name):'<span class="muted">-</span>'}</td>
      <td>${t.email?U(t.email):'<span class="muted">-</span>'}</td>
      <td>${t.web?`<a href="${Nt(t.web)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${U(t.web)}</a>`:'<span class="muted">-</span>'}</td>
      <td>${t.ico?U(t.ico):'<span class="muted">-</span>'}</td>
      <td>${t.contacts?t.contacts.length:0}</td>
      ${e>0?`<td><strong>${e}</strong></td>`:""}
      <td class="actions-cell" onclick="event.stopPropagation()">
        <a href="#" class="edit-company" data-id="${t.id}">Edit</a>
        <a href="#" class="danger-link delete-company" data-id="${t.id}" data-name="${Nt(t.name)}">Delete</a>
      </td>
    </tr>
  `}function U(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}function Nt(t){return t?t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):""}async function we(t,e){t.innerHTML='<div class="loading">Loading...</div>';try{const[{data:s,error:a},{data:n},{data:r}]=await Promise.all([f.from("companies").select("*").eq("id",e).single(),f.from("contacts").select("id, first_name, last_name").eq("company_id",e).order("last_name"),f.from("projects").select("id, title, amount, status, updated_at").eq("company_id",e).order("updated_at",{ascending:!1})]);if(a||!s){t.innerHTML='<div class="error">Company not found. <a href="#/companies">Back to list</a></div>';return}const u=(n||[]).map(m=>m.id),d=r||[];let i=[];if(u.length>0){const{data:m}=await f.from("logs").select("*, contacts(first_name, last_name), projects(title)").in("contact_id",u).order("logged_at",{ascending:!1}).order("created_at",{ascending:!1}).limit(30);i=m||[]}const c=new Map;for(const m of i)m.contact_id&&!c.has(m.contact_id)&&c.set(m.contact_id,m.logged_at);const l=(n||[]).map(m=>({...m,temp:W(c.get(m.id))})),v=i.length>0?i.map(m=>{var L;const g=_e(m.logged_at),$=m.contacts?`${M(m.contacts.first_name)} ${M(m.contacts.last_name)}`:"",_=(L=m.projects)!=null&&L.title?` <span class="log-tag">[${M(m.projects.title)}]</span>`:"";return`<div class="log-entry">
            <span class="log-date">${g} ───</span>
            <a href="#/contacts/${m.contact_id}" class="log-tag">[${$}]</a>
            <span class="log-content">${M(m.content)}</span>${_}
          </div>`}).join(""):'<div class="log-empty">No logs from contacts at this company.</div>';t.innerHTML=`
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-toolbar">
            <a href="#/companies" class="btn btn-back">&larr; Back</a>
            <h1>${M(s.name)}</h1>
            <div class="detail-actions">
              <button id="delete-company" class="btn btn-danger">Del</button>
            </div>
          </div>
        </div>

        <div class="inline-fields-vertical">
          <label>Official name <input type="text" id="f-official" class="input inline-input" value="${Q(s.official_name||"")}" placeholder="add official name"></label>
          <label>Email <input type="email" id="f-email" class="input inline-input" value="${Q(s.email||"")}" placeholder="add email"></label>
          <label>Web <input type="url" id="f-web" class="input inline-input" value="${Q(s.web||"")}" placeholder="add website"></label>
          <label>ICO <input type="text" id="f-ico" class="input inline-input" value="${Q(s.ico||"")}" placeholder="add ICO"></label>
          <span id="inline-status" class="inline-status"></span>
        </div>

        ${l.length>0?`
        <div class="section-bar section-bar-contacts">Contacts (${l.length})</div>
        <div class="compact-list">
          ${l.map(m=>`
            <div class="compact-list-item clickable-row ${m.temp.css}" data-href="#/contacts/${m.id}">
              <strong>${M(m.first_name)} ${M(m.last_name)}</strong> · ${m.temp.label}
            </div>
          `).join("")}
        </div>`:""}

        ${d.length>0?`
        <div class="section-bar section-bar-deals">Projects (${d.length})</div>
        <div class="compact-list">
          ${d.map(m=>`
            <div class="compact-list-item clickable-row" data-href="#/projects/${m.id}">
              <strong>${M(m.title)}</strong> · <span class="status-badge status-${m.status}">${Se(m.status)}</span>
              ${m.amount?` · ${Math.round(parseFloat(m.amount)/1e3)}K`:""}
            </div>
          `).join("")}
        </div>`:""}

        <div class="section-bar">Log</div>
        <div class="log-timeline">${v}</div>
      </div>
    `;const h=t.querySelector("#inline-status");async function S(m,g){const{error:$}=await f.from("companies").update({[m]:g||null}).eq("id",e);$?(h.textContent="Error",h.style.color="var(--danger)"):(h.textContent="Saved",h.style.color="var(--success)",setTimeout(()=>{h.textContent=""},2e3))}const p=(m,g)=>G(()=>S(m,t.querySelector(g).value.trim()),1e3);t.querySelector("#f-official").addEventListener("input",p("official_name","#f-official")),t.querySelector("#f-email").addEventListener("input",p("email","#f-email")),t.querySelector("#f-web").addEventListener("input",p("web","#f-web")),t.querySelector("#f-ico").addEventListener("input",p("ico","#f-ico")),t.querySelector("#delete-company").addEventListener("click",async()=>{await z("companies",s,`"${s.name}"`,()=>{window.location.hash="#/companies"},()=>{window.location.hash=`#/companies/${e}`})}),t.querySelectorAll(".clickable-row").forEach(m=>{m.addEventListener("click",()=>{const g=m.dataset.href;g&&(window.location.hash=g)})})}catch(s){t.innerHTML=`<div class="error">Error: ${M(s.message)}</div>`}}function Se(t){return{open:"Open",frozen:"Frozen",won:"Won",lost:"Lost"}[t]||t}function _e(t){if(!t)return"";const e=new Date(t);return`${String(e.getDate()).padStart(2,"0")}.${String(e.getMonth()+1).padStart(2,"0")}.`}function M(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}function Q(t){return t?t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):""}async function qe(t,e=null){if(e){window.location.hash=`#/companies/${e}`;return}t.innerHTML=`
    <div class="form-page">
      <a href="#/companies" class="btn btn-back">&larr; Back</a>
      <h1>New Company</h1>

      <form id="company-form" class="card form-card" novalidate>
        <div class="form-group">
          <label for="name">Company Name *</label>
          <input type="text" id="name" class="input" required>
          <span class="field-error" id="err-name"></span>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" id="submit-btn">Save</button>
          <a href="#/companies" class="btn btn-secondary">Cancel</a>
        </div>
        <div class="form-error" id="form-error"></div>
      </form>
    </div>
  `,t.querySelector("#name").focus(),t.querySelector("#company-form").addEventListener("submit",async s=>{s.preventDefault();const a=t.querySelector("#name").value.trim();if(!a){const r=t.querySelector("#err-name");r&&(r.textContent="Required");return}const n=t.querySelector("#submit-btn");n.disabled=!0,n.textContent="Saving...";try{const r=(await f.auth.getUser()).data.user,{data:u,error:d}=await f.from("companies").insert({name:a,user_id:r.id}).select().single();if(d)throw d;window.location.hash=`#/companies/${u.id}`}catch(r){t.querySelector("#form-error").textContent="Error: "+r.message,n.disabled=!1,n.textContent="Save"}})}const je=["open"],Ee=[{key:"open",title:"Open",statuses:["open"]},{key:"frozen",title:"Frozen",statuses:["frozen"]},{key:"won",title:"Won",statuses:["won"]},{key:"lost",title:"Lost",statuses:["lost"]}];async function K(t){t.innerHTML='<div class="loading">Loading projects...</div>';try{let _=function(){g.style.display="",t.querySelector("#d-title").value="",t.querySelector("#d-title").focus()},L=function(){g.style.display="none",$.reset(),t.querySelector("#project-form-error").textContent=""};var e=_,s=L;const[{data:a,error:n},{data:r},{data:u},{data:d}]=await Promise.all([f.from("projects").select("*, contacts(first_name, last_name), companies(name)").order("updated_at",{ascending:!1}),f.from("contacts").select("id, first_name, last_name").order("last_name"),f.from("companies").select("id, name").order("name"),f.from("logs").select("project_id, logged_at, content").not("project_id","is",null).order("logged_at",{ascending:!1})]);if(n)throw n;const i=new Map;for(const w of d||[])w.project_id&&!i.has(w.project_id)&&i.set(w.project_id,{date:w.logged_at,content:w.content});const c=a||[],l=r||[],v=u||[],h=c.reduce((w,j)=>w+(parseFloat(j.amount)||0),0),p=c.filter(w=>w.status==="frozen").reduce((w,j)=>w+(parseFloat(j.amount)||0),0),m=Le(c);t.innerHTML=`
      <div class="page-header">
        <h1>Projects <span class="badge">${c.length}</span> <span class="header-meta">Total ${h.toLocaleString("cs-CZ")} Kc / Frozen ${p.toLocaleString("cs-CZ")} Kc</span></h1>
        <div class="header-actions">
          <button id="add-project-btn" class="btn btn-primary">+ New Project</button>
        </div>
      </div>

      <div id="project-form-wrap" class="card form-card" style="display:none">
        <h2 id="project-form-title">New Project</h2>
        <form id="project-form">
          <input type="hidden" id="project-edit-id" value="">
          <div class="form-group">
            <label for="d-title">Title *</label>
            <input type="text" id="d-title" class="input" required>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="project-submit-btn">Save</button>
            <button type="button" id="project-cancel-btn" class="btn btn-secondary">Cancel</button>
          </div>
          <div class="form-error" id="project-form-error"></div>
        </form>
      </div>

      ${Ce(m,c,i)}
    `;const g=t.querySelector("#project-form-wrap"),$=t.querySelector("#project-form");t.querySelector("#add-project-btn").addEventListener("click",()=>_()),t.querySelector("#project-cancel-btn").addEventListener("click",L),$.addEventListener("submit",async w=>{w.preventDefault();const j=t.querySelector("#d-title").value.trim();if(!j){t.querySelector("#project-form-error").textContent="Title is required";return}try{const b=(await f.auth.getUser()).data.user,{data:C,error:x}=await f.from("projects").insert({title:j,status:"open",user_id:b.id}).select().single();if(x)throw x;window.location.hash=`#/projects/${C.id}`}catch(b){t.querySelector("#project-form-error").textContent="Error: "+b.message}}),t.querySelectorAll(".delete-project").forEach(w=>{w.addEventListener("click",async j=>{j.preventDefault();const b=c.find(C=>C.id===w.dataset.id);b&&await z("projects",b,`"${b.title}"`,()=>K(t),()=>K(t))})}),t.querySelectorAll(".freeze-project").forEach(w=>{w.addEventListener("click",async j=>{j.preventDefault();const b=w.dataset.id,C=w.dataset.status,{error:x}=await f.from("projects").update({status:"frozen",previous_status:C}).eq("id",b);if(x){alert("Error: "+x.message);return}await K(t)})}),t.querySelectorAll(".unfreeze-project").forEach(w=>{w.addEventListener("click",async j=>{j.preventDefault();const b=w.dataset.id,C="open",{error:x}=await f.from("projects").update({status:C,previous_status:null}).eq("id",b);if(x){alert("Error: "+x.message);return}await K(t)})}),t.querySelectorAll(".clickable-row").forEach(w=>{w.addEventListener("click",()=>{window.location.hash=`#/projects/${w.dataset.id}`})})}catch(a){t.innerHTML=`<div class="error">Error: ${Z(a.message)}</div>`}}function Le(t){const e={};return Ee.forEach(s=>{const a=t.filter(n=>s.statuses.includes(n.status));a.sort((n,r)=>n.updated_at!==r.updated_at?new Date(r.updated_at)-new Date(n.updated_at):n.created_at!==r.created_at?new Date(r.created_at)-new Date(n.created_at):(n.title||"").localeCompare(r.title||"")),e[s.key]={...s,projects:a}}),e}function Ce(t,e,s){return Object.values(t).map(a=>a.projects.length===0?"":`
      <div class="project-group">
        <h2 class="group-heading">${a.title} <span class="badge">${a.projects.length}</span></h2>
        <div class="table-wrap">
          <table class="data-table table-projects">
            <thead>
              <tr>
                <th>Project</th>
                <th>Value</th>
                <th>Contact</th>
                <th>Temp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${a.projects.map(n=>xe(n,s)).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `).join("")}function xe(t,e){const s=parseFloat(t.amount)||0,a=s?`${Math.round(s/1e3)}K`:"-",n=e.get(t.id),r=W(n==null?void 0:n.date),u=n!=null&&n.content?ke(n.content,80):"",d=je.includes(t.status),i=t.status==="frozen",c=t.contacts?`${Z(t.contacts.first_name)} ${Z(t.contacts.last_name)}`:'<span class="muted">-</span>';return`
    <tr class="clickable-row ${r.css}" data-id="${t.id}">
      <td>
        <strong>${Z(t.title)}</strong>
        ${u?`<div class="log-snippet">${Z(u)}</div>`:""}
      </td>
      <td>${a}</td>
      <td>${c}</td>
      <td class="${r.css}">${r.label}</td>
      <td class="actions-cell" onclick="event.stopPropagation()">
        ${d?`<a href="#" class="freeze-project" data-id="${t.id}" data-status="${t.status}">Freeze</a>`:""}
        ${i?`<a href="#" class="unfreeze-project" data-id="${t.id}">Unfreeze</a>`:""}
        <a href="#" class="danger-link delete-project" data-id="${t.id}" data-title="${Me(t.title)}">Delete</a>
      </td>
    </tr>
  `}function ke(t,e){return t?t.length>e?t.slice(0,e)+"...":t:""}function Z(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}function Me(t){return t?t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):""}const Te=["open","frozen","won","lost"];async function ft(t,e){var s;t.innerHTML='<div class="loading">Loading...</div>';try{const[{data:a,error:n},{data:r},{data:u},{data:d}]=await Promise.all([f.from("projects").select("*").eq("id",e).single(),f.from("logs").select("*, contacts(first_name, last_name)").eq("project_id",e).order("logged_at",{ascending:!1}).order("created_at",{ascending:!1}),f.from("contacts").select("id, first_name, last_name").order("last_name"),f.from("companies").select("id, name").order("name")]);if(n||!a){t.innerHTML='<div class="error">Project not found. <a href="#/projects">Back to list</a></div>';return}const i=(r||[])[0],c=(s=i==null?void 0:i.content)!=null&&s.startsWith(">")?`<div class="next-step"><span class="next-step-label">NEXT:</span> ${I(i.content.slice(1).trim())} <span class="muted">${De(i.logged_at)}</span></div>`:"",l=Ft(r||[],"project",{contacts:u||[]});t.innerHTML=`
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-toolbar">
            <a href="#/projects" class="btn btn-back">&larr; Back</a>
            <h1>${I(a.title)}</h1>
            <div class="detail-actions">
              <button id="delete-project" class="btn btn-danger">Del</button>
            </div>
          </div>
        </div>

        ${c}

        <div class="inline-fields-vertical">
          <label>Amount <input type="number" id="f-amount" class="input inline-input" value="${a.amount||""}" placeholder="—" step="1"></label>
          <label>Status
            <select id="f-status" class="input inline-input">
              ${Te.map(p=>`<option value="${p}"${a.status===p?" selected":""}>${p.charAt(0).toUpperCase()+p.slice(1)}</option>`).join("")}
            </select>
          </label>
          <label>Expected close <input type="date" id="f-expected" class="input inline-input" value="${a.expected_close||""}">${a.expected_close&&a.expected_close<new Date().toISOString().slice(0,10)?' <strong class="overdue-label">OVERDUE</strong>':""}</label>
          <label>Contact
            <select id="f-contact" class="input inline-input">
              <option value="">—</option>
              ${(u||[]).map(p=>`<option value="${p.id}"${a.contact_id===p.id?" selected":""}>${I(p.first_name)} ${I(p.last_name)}</option>`).join("")}
            </select>
          </label>
          <label>Company
            <select id="f-company" class="input inline-input">
              <option value="">—</option>
              ${(d||[]).map(p=>`<option value="${p.id}"${a.company_id===p.id?" selected":""}>${I(p.name)}</option>`).join("")}
            </select>
          </label>
          <span id="inline-status" class="inline-status"></span>
        </div>

        <div class="section-bar">Log</div>
        ${l}
      </div>
    `;const v=t.querySelector("#inline-status");async function h(p,m){const{error:g}=await f.from("projects").update({[p]:m||null}).eq("id",e);g?(v.textContent="Error",v.style.color="var(--danger)"):(v.textContent="Saved",v.style.color="var(--success)",setTimeout(()=>{v.textContent=""},2e3))}const S=G(()=>h("amount",t.querySelector("#f-amount").value),1e3);t.querySelector("#f-amount").addEventListener("input",S),t.querySelector("#f-status").addEventListener("change",()=>{h("status",t.querySelector("#f-status").value)}),t.querySelector("#f-expected").addEventListener("change",()=>{h("expected_close",t.querySelector("#f-expected").value)}),t.querySelector("#f-contact").addEventListener("change",()=>{h("contact_id",t.querySelector("#f-contact").value)}),t.querySelector("#f-company").addEventListener("change",()=>{h("company_id",t.querySelector("#f-company").value)}),Ut(t,()=>ft(t,e)),window.addEventListener("log-created",()=>ft(t,e),{once:!0}),t.querySelector("#delete-project").addEventListener("click",async()=>{await z("projects",a,`"${a.title}"`,()=>{window.location.hash="#/projects"},()=>{window.location.hash=`#/projects/${e}`})})}catch(a){t.innerHTML=`<div class="error">Error: ${I(a.message)}</div>`}}function De(t){if(!t)return"";const e=new Date(t);return`${String(e.getDate()).padStart(2,"0")}.${String(e.getMonth()+1).padStart(2,"0")}.`}function I(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}async function Ht(t,e=null){if(e){window.location.hash=`#/projects/${e}`;return}t.innerHTML=`
    <div class="form-page">
      <a href="#/projects" class="btn btn-back">&larr; Back</a>
      <h1>New Project</h1>

      <form id="project-form" class="card form-card" novalidate>
        <div class="form-group">
          <label for="title">Title *</label>
          <input type="text" id="title" class="input" required>
          <span class="field-error" id="err-title"></span>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" id="submit-btn">Save</button>
          <a href="#/projects" class="btn btn-secondary">Cancel</a>
        </div>
        <div class="form-error" id="form-error"></div>
      </form>
    </div>
  `,t.querySelector("#title").focus(),t.querySelector("#project-form").addEventListener("submit",async s=>{s.preventDefault();const a=t.querySelector("#title").value.trim();if(!a){const r=t.querySelector("#err-title");r&&(r.textContent="Required");return}const n=t.querySelector("#submit-btn");n.disabled=!0,n.textContent="Saving...";try{const r=(await f.auth.getUser()).data.user,{data:u,error:d}=await f.from("projects").insert({title:a,status:"open",user_id:r.id}).select().single();if(d)throw d;window.location.hash=`#/projects/${u.id}`}catch(r){t.querySelector("#form-error").textContent="Error: "+r.message,n.disabled=!1,n.textContent="Save"}})}async function Wt(t){var e;t.innerHTML='<div class="loading">Loading...</div>';try{const s=new Date,a=s.toISOString().slice(0,10),n=new Date(s-7*864e5).toISOString().slice(0,10),r=new Date(s-14*864e5).toISOString().slice(0,10),[{data:u},{data:d},{data:i},{data:c},{data:l},{data:v},{data:h}]=await Promise.all([f.from("contacts").select("id, first_name, last_name, email, phone, company_id, starred_at, companies(name)").order("last_name"),f.from("projects").select("id, title, amount, status, expected_close, updated_at, contact_id, contacts(first_name, last_name)").order("title"),f.from("logs").select("contact_id, logged_at, content").not("contact_id","is",null).order("logged_at",{ascending:!1}),f.from("logs").select("project_id, logged_at, content").not("project_id","is",null).order("logged_at",{ascending:!1}),f.from("logs").select("id, contact_id, logged_at").gte("logged_at",n),f.from("logs").select("id").gte("logged_at",r).lt("logged_at",n),f.from("projects").select("id, title, amount, updated_at").eq("status","won").gte("updated_at",new Date(s-7*864e5).toISOString())]),S=new Map;for(const o of i||[])o.contact_id&&!S.has(o.contact_id)&&S.set(o.contact_id,{date:o.logged_at,content:o.content});const p=new Map;for(const o of c||[])o.project_id&&!p.has(o.project_id)&&p.set(o.project_id,{date:o.logged_at,content:o.content});const m=(u||[]).map(o=>{const y=S.get(o.id);return{...o,temp:W(y==null?void 0:y.date),lastContent:(y==null?void 0:y.content)||""}}),g=(d||[]).filter(o=>o.status==="open"||o.status==="frozen").map(o=>{const y=p.get(o.id);return{...o,temp:W(y==null?void 0:y.date),lastContent:(y==null?void 0:y.content)||""}}),$=m.filter(o=>o.temp.css==="temp-hot").length,_=m.filter(o=>o.temp.css==="temp-warm").length,L=m.filter(o=>o.temp.css==="temp-cold"||o.temp.css==="temp-dead").length,w=(d||[]).filter(o=>o.status==="open"),j=(d||[]).filter(o=>o.status==="frozen"),b=w.reduce((o,y)=>o+(parseFloat(y.amount)||0),0),C=j.reduce((o,y)=>o+(parseFloat(y.amount)||0),0),x=b+C,Rt=(l||[]).length,Vt=new Set((l||[]).filter(o=>o.contact_id).map(o=>o.contact_id)).size,ht=(v||[]).length,Kt=new Set((l||[]).map(o=>o.logged_at));let ot=0;for(let o=0;o<7;o++){const y=new Date(s-o*864e5).toISOString().slice(0,10);if(Kt.has(y))ot++;else break}const yt=(h||[]).length>0?(h||[]).map(o=>`Won: ${q(o.title)} (${F(parseFloat(o.amount)||0)})`).join(" &middot; "):"",rt=m.filter(o=>o.temp.days===null).length,A=m.filter(o=>!o.email||!o.phone||!o.company_id).length,bt=g.filter(o=>o.expected_close&&o.expected_close<a),Zt=new Date(s-7*864e5).toISOString(),$t=m.filter(o=>{var X;if(!o.starred_at||o.starred_at<Zt)return!1;const y=(X=S.get(o.id))==null?void 0:X.date;return!(y&&new Date(y)>new Date(o.starred_at))}),wt=m.filter(o=>o.temp.days!==null&&o.temp.days>=14&&o.temp.days<60).sort((o,y)=>y.temp.days-o.temp.days).slice(0,5),ct=[],St=new Set;for(const o of i||[])if(o.contact_id&&!St.has(o.contact_id)&&(St.add(o.contact_id),(e=o.content)!=null&&e.startsWith(">"))){const y=m.find(X=>X.id===o.contact_id);y&&ct.push({contact:y,content:o.content.slice(1).trim(),date:o.logged_at})}const _t=[...m].sort((o,y)=>(y.temp.days??9999)-(o.temp.days??9999)).slice(0,15),qt=[...g].sort((o,y)=>(y.temp.days??9999)-(o.temp.days??9999)).slice(0,15),Yt=x>0?Math.round(b/x*100):0,lt=(d||[]).filter(o=>o.status==="won"||o.status==="lost"),jt=(d||[]).filter(o=>o.status==="won").length,Ve=(d||[]).filter(o=>o.status==="won").reduce((o,y)=>o+(parseFloat(y.amount)||0),0),Et=lt.length>0?Math.round(jt/lt.length*100):0,Lt=m.filter(o=>o.temp.days!==null&&o.temp.days<30).length,Gt=m.length>0?Math.round(Lt/m.length*100):0;t.innerHTML=`
      <div class="detail-page">
        <div class="dashboard-pulse">
          <span>${m.length} contacts &middot; <span class="temp-hot">${$} active</span> &middot; ${_} warm &middot; <strong>${L} cold</strong></span>
          <span>${w.length} open (${F(b)}) &middot; ${j.length} frozen (${F(C)})${yt?` &middot; ${yt}`:""}</span>
          <span>This week: ${Rt} logs &middot; ${Vt} contacts${ht?` &middot; last week: ${ht}`:""}${ot>1?` &middot; ${ot}-day streak`:""}</span>
          ${re()}
        </div>

        <div class="dashboard-main">
          <div class="dashboard-content">
            ${$t.length>0?`
            <div class="dashboard-starred">
              ${$t.map(o=>`
                <span class="starred-item clickable-row" data-href="#/contacts/${o.id}">★ <strong>${q(o.first_name)} ${q(o.last_name)}</strong></span>
              `).join("")}
            </div>
            `:""}

            ${wt.length>0||rt>0||A>0||bt.length>0?`
            <div class="dashboard-nudges">
              ${wt.map(o=>`
                <span class="nudge-item clickable-row" data-href="#/contacts/${o.id}"><strong>${q(o.first_name)} ${q(o.last_name)}</strong> ─── ${o.temp.label} without contact</span>
              `).join("")}
              ${bt.map(o=>`
                <span class="nudge-item clickable-row" data-href="#/projects/${o.id}"><strong>${q(o.title)}</strong> ─── OVERDUE (exp. ${o.expected_close})</span>
              `).join("")}
              ${rt>0?`<span class="nudge-meta clickable-row" data-href="#/contacts">${rt} contacts with zero history</span>`:""}
              ${A>0?`<span class="nudge-meta clickable-row" data-href="#/contacts">${A} incomplete contacts</span>`:""}
            </div>
            `:""}

            ${ct.length>0?`
            <div class="dashboard-nextsteps">
              <div class="section-bar">Next steps</div>
              ${ct.slice(0,5).map(o=>`
                <div class="next-step clickable-row" data-href="#/contacts/${o.contact.id}">
                  <strong>${q(o.contact.first_name)} ${q(o.contact.last_name)}</strong>: ${q(o.content)}
                </div>
              `).join("")}
            </div>
            `:""}

            <div class="dashboard-radar">
              <div class="dashboard-radar-col">
                <div class="section-bar section-bar-contacts">Contacts</div>
                ${_t.length===0?'<div class="empty-state">No logged contacts.</div>':`<div class="table-wrap">
                    <table class="data-table">
                      <thead><tr><th>Name</th><th>Company</th><th>Temp</th></tr></thead>
                      <tbody>
                        ${_t.map(o=>{var y;return`
                          <tr class="clickable-row ${o.temp.css}" data-href="#/contacts/${o.id}">
                            <td>
                              <strong>${q(o.first_name)} ${q(o.last_name)}</strong>
                              ${o.lastContent?`<div class="log-snippet">${q(At(o.lastContent,80))}</div>`:""}
                            </td>
                            <td>${(y=o.companies)!=null&&y.name?q(o.companies.name):'<span class="muted">-</span>'}</td>
                            <td class="${o.temp.css}">${o.temp.label}</td>
                          </tr>
                        `}).join("")}
                      </tbody>
                    </table>
                  </div>`}
              </div>

              <div class="dashboard-radar-col">
                <div class="section-bar section-bar-deals">Projects</div>
                ${qt.length===0?'<div class="empty-state">No open projects.</div>':`<div class="table-wrap">
                    <table class="data-table">
                      <thead><tr><th>Project</th><th>Value</th><th>Contact</th><th>Temp</th></tr></thead>
                      <tbody>
                        ${qt.map(o=>`
                          <tr class="clickable-row ${o.temp.css}" data-href="#/projects/${o.id}">
                            <td>
                              <strong>${q(o.title)}</strong>
                              ${o.lastContent?`<div class="log-snippet">${q(At(o.lastContent,80))}</div>`:""}
                            </td>
                            <td>${o.amount?F(parseFloat(o.amount)):"-"}</td>
                            <td>${o.contacts?`${q(o.contacts.first_name)} ${q(o.contacts.last_name)}`:'<span class="muted">-</span>'}</td>
                            <td class="${o.temp.css}">${o.temp.label}</td>
                          </tr>
                        `).join("")}
                      </tbody>
                    </table>
                  </div>`}
              </div>
            </div>
          </div>

          <div class="dashboard-sidebar">
            <div class="section-bar">Pipeline</div>
            <div class="progress-item">
              <span>Open ${F(b)} / ${F(x)}</span>
              <div class="progress-bar">${tt(Yt)}</div>
            </div>

            <div class="section-bar" style="margin-top:0.75rem">System health</div>
            <div class="progress-item clickable-row" data-href="#/contacts">
              <span>Contacts alive ${Lt}/${m.length}</span>
              <div class="progress-bar">${tt(Gt)}</div>
            </div>
            <div class="progress-item">
              <span>Win rate ${Et}% (${jt}/${lt.length})</span>
              <div class="progress-bar">${tt(Et)}</div>
            </div>
            ${A>0?`
            <div class="progress-item clickable-row" data-href="#/contacts">
              <span>Complete ${m.length-A}/${m.length}</span>
              <div class="progress-bar">${tt(Math.round((m.length-A)/Math.max(m.length,1)*100))}</div>
            </div>`:""}
          </div>
        </div>
      </div>
    `,window.addEventListener("log-created",()=>Wt(t),{once:!0}),t.querySelectorAll(".clickable-row").forEach(o=>{o.addEventListener("click",()=>{const y=o.dataset.href;y&&(window.location.hash=y)})})}catch(s){t.innerHTML=`<div class="error">Error: ${q(s.message)}</div>`}}function tt(t){const s=Math.round(t/100*20),a=20-s;return"█".repeat(s)+"░".repeat(a)+` ${t}%`}function F(t){return t?`${Math.round(t/1e3)}K`:"0"}function At(t,e){return t?t.length>e?t.slice(0,e)+"...":t:""}function q(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}let B="notes";async function zt(t){t.innerHTML='<div class="loading">Loading...</div>';try{const e=(await f.auth.getUser()).data.user;t.innerHTML=`
      <div class="page-header">
        <h1>Extra</h1>
      </div>
      <div class="extra-tabs">
        <a href="#" class="extra-tab${B==="notes"?" active":""}" data-tab="notes">Notes</a>
        <a href="#" class="extra-tab${B==="export"?" active":""}" data-tab="export">Export</a>
      </div>
      <div id="extra-content"></div>
    `,t.querySelectorAll(".extra-tab").forEach(a=>{a.addEventListener("click",n=>{n.preventDefault(),B=a.dataset.tab,zt(t)})});const s=t.querySelector("#extra-content");B==="notes"?await Pe(s,e):B==="export"&&await Ne(s,e)}catch(e){t.innerHTML=`<div class="error">Error: ${Bt(e.message)}</div>`}}async function Pe(t,e){const{data:s}=await f.from("inbox").select("content").eq("user_id",e.id).single(),a=(s==null?void 0:s.content)||"";let n=!!s;t.innerHTML=`
    <div class="notes-toolbar">
      <button id="add-timestamp-btn" class="btn btn-sm btn-secondary">Add timestamp</button>
      <span id="inbox-status"></span>
      <button id="inbox-save" class="btn btn-sm btn-primary">Save</button>
    </div>
    <textarea id="inbox-content" class="input inbox-textarea">${Bt(a)}</textarea>
  `,t.querySelector("#inbox-save").addEventListener("click",async()=>{const r=t.querySelector("#inbox-content").value,u=new Date().toISOString();let d;n?{error:d}=await f.from("inbox").update({content:r,updated_at:u}).eq("user_id",e.id):({error:d}=await f.from("inbox").insert({user_id:e.id,content:r,updated_at:u}),d||(n=!0));const i=t.querySelector("#inbox-status");d?(i.textContent="Error: "+d.message,i.style.color="var(--danger)"):(i.textContent="Saved",i.style.color="var(--success)",setTimeout(()=>{i.textContent=""},2e3))}),t.querySelector("#add-timestamp-btn").addEventListener("click",()=>{const r=t.querySelector("#inbox-content"),u=He(new Date),d=r.selectionStart,i=r.value.substring(0,d),c=r.value.substring(d),l=i&&!i.endsWith(`
`)?`
`:"";r.value=i+l+u+`
`+c;const v=i.length+l.length+u.length+1;r.focus(),r.setSelectionRange(v,v)})}async function Ne(t){t.innerHTML=`
    <div class="export-section">
      <div class="section-bar">Full export (JSON)</div>
      <p class="muted">All tables: contacts, companies, projects, inbox, logs.</p>
      <button id="export-json" class="btn btn-secondary">Export JSON</button>
      <span id="status-json"></span>
    </div>

    <div class="export-section">
      <div class="section-bar">Contacts (Markdown)</div>
      <p class="muted">All contacts with company, email, phone, last log.</p>
      <button id="export-contacts-md" class="btn btn-secondary">Export MD</button>
      <span id="status-contacts-md"></span>
    </div>

    <div class="export-section">
      <div class="section-bar">Open projects (Markdown)</div>
      <p class="muted">Open and frozen projects with contact, amount, last log.</p>
      <button id="export-projects-md" class="btn btn-secondary">Export MD</button>
      <span id="status-projects-md"></span>
    </div>
  `,t.querySelector("#export-json").addEventListener("click",async()=>{const e=t.querySelector("#export-json"),s=t.querySelector("#status-json");e.disabled=!0,s.textContent="Exporting...";try{const a=["contacts","companies","projects","inbox","logs"],n={exported_at:new Date().toISOString(),tables:{}};for(const r of a){const{data:u,error:d}=await f.from(r).select("*");if(d)throw new Error(`${r}: ${d.message}`);n.tables[r]=u||[]}dt(`crm-export-${R()}.json`,JSON.stringify(n,null,2),"application/json"),s.textContent="Done",s.style.color="var(--success)"}catch(a){s.textContent="Error: "+a.message,s.style.color="var(--danger)"}finally{e.disabled=!1}}),t.querySelector("#export-contacts-md").addEventListener("click",async()=>{var a;const e=t.querySelector("#export-contacts-md"),s=t.querySelector("#status-contacts-md");e.disabled=!0,s.textContent="Exporting...";try{const{data:n}=await f.from("contacts").select("*, companies(name)").order("last_name"),{data:r}=await f.from("logs").select("contact_id, logged_at, content").not("contact_id","is",null).order("logged_at",{ascending:!1}),u=new Map;for(const i of r||[])i.contact_id&&!u.has(i.contact_id)&&u.set(i.contact_id,i);let d=`# Contacts

Exported: ${R()}

`;for(const i of n||[]){d+=`## ${i.first_name} ${i.last_name}
`,(a=i.companies)!=null&&a.name&&(d+=`- Company: ${i.companies.name}
`),i.email&&(d+=`- Email: ${i.email}
`),i.phone&&(d+=`- Phone: ${i.phone}
`);const c=u.get(i.id);c&&(d+=`- Last log (${c.logged_at}): ${c.content}
`),d+=`
`}dt(`contacts-${R()}.md`,d,"text/markdown"),s.textContent="Done",s.style.color="var(--success)"}catch(n){s.textContent="Error: "+n.message,s.style.color="var(--danger)"}finally{e.disabled=!1}}),t.querySelector("#export-projects-md").addEventListener("click",async()=>{var a;const e=t.querySelector("#export-projects-md"),s=t.querySelector("#status-projects-md");e.disabled=!0,s.textContent="Exporting...";try{const{data:n}=await f.from("projects").select("*, contacts(first_name, last_name), companies(name)").in("status",["open","frozen"]).order("title"),{data:r}=await f.from("logs").select("project_id, logged_at, content").not("project_id","is",null).order("logged_at",{ascending:!1}),u=new Map;for(const i of r||[])i.project_id&&!u.has(i.project_id)&&u.set(i.project_id,i);let d=`# Open Projects

Exported: ${R()}

`;for(const i of n||[]){const c=i.amount?`${Math.round(parseFloat(i.amount)/1e3)}K`:"-";d+=`## ${i.title} (${i.status}, ${c})
`,i.contacts&&(d+=`- Contact: ${i.contacts.first_name} ${i.contacts.last_name}
`),(a=i.companies)!=null&&a.name&&(d+=`- Company: ${i.companies.name}
`),i.expected_close&&(d+=`- Expected close: ${i.expected_close}
`);const l=u.get(i.id);l&&(d+=`- Last log (${l.logged_at}): ${l.content}
`),d+=`
`}dt(`projects-open-${R()}.md`,d,"text/markdown"),s.textContent="Done",s.style.color="var(--success)"}catch(n){s.textContent="Error: "+n.message,s.style.color="var(--danger)"}finally{e.disabled=!1}})}function dt(t,e,s){const a=new Blob([e],{type:s}),n=URL.createObjectURL(a),r=document.createElement("a");r.href=n,r.download=t,r.click(),URL.revokeObjectURL(n)}function R(){return new Date().toISOString().slice(0,10)}function He(t){const e=String(t.getDate()).padStart(2,"0"),s=String(t.getMonth()+1).padStart(2,"0"),a=t.getFullYear();return`${e}.${s}.${a}`}function Bt(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}async function Ae(t){t.innerHTML='<div class="loading">Loading...</div>';try{const[{data:e},{data:s},{data:a}]=await Promise.all([f.from("contacts").select("id, first_name, last_name").order("last_name"),f.from("companies").select("id, name").order("name"),f.from("projects").select("id, title").order("title")]);t.innerHTML=`
      <div class="form-page">
        <h1>New Record</h1>

        <form id="combo-form" class="card form-card" novalidate>
          <div class="form-group">
            <label for="c-pick">Contact</label>
            <div class="combo-or-new">
              <select id="c-pick" class="input">
                <option value="">-- pick existing --</option>
                ${(e||[]).map(n=>`<option value="${n.id}">${V(n.first_name)} ${V(n.last_name)}</option>`).join("")}
              </select>
              <span class="muted">or new:</span>
              <input type="text" id="c-first" class="input" placeholder="first name">
              <input type="text" id="c-last" class="input" placeholder="last name">
            </div>
            <span class="field-error" id="err-c-contact"></span>
          </div>
          <div class="form-group">
            <label for="co-pick">Company</label>
            <div class="combo-or-new">
              <select id="co-pick" class="input">
                <option value="">-- pick existing --</option>
                ${(s||[]).map(n=>`<option value="${n.id}">${V(n.name)}</option>`).join("")}
              </select>
              <span class="muted">or</span>
              <input type="text" id="co-new" class="input" placeholder="new company name">
            </div>
          </div>
          <div class="form-group">
            <label for="p-pick">Project</label>
            <div class="combo-or-new">
              <select id="p-pick" class="input">
                <option value="">-- pick existing --</option>
                ${(a||[]).map(n=>`<option value="${n.id}">${V(n.title)}</option>`).join("")}
              </select>
              <span class="muted">or</span>
              <input type="text" id="p-new" class="input" placeholder="new project title">
            </div>
          </div>
          <div class="form-group">
            <label for="c-log">First log entry</label>
            <textarea id="c-log" class="input" rows="2" placeholder="What happened? Start with > for next step"></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="combo-submit">Save</button>
            <a href="#/" class="btn btn-secondary">Cancel</a>
          </div>
          <div class="form-error" id="combo-error"></div>
        </form>
      </div>
    `,t.querySelector("#c-pick").addEventListener("change",()=>{t.querySelector("#c-pick").value&&(t.querySelector("#c-first").value="",t.querySelector("#c-last").value="")}),t.querySelector("#c-first").addEventListener("input",()=>{t.querySelector("#c-first").value&&(t.querySelector("#c-pick").value="")}),t.querySelector("#c-last").addEventListener("input",()=>{t.querySelector("#c-last").value&&(t.querySelector("#c-pick").value="")}),t.querySelector("#co-pick").addEventListener("change",()=>{t.querySelector("#co-pick").value&&(t.querySelector("#co-new").value="")}),t.querySelector("#co-new").addEventListener("input",()=>{t.querySelector("#co-new").value&&(t.querySelector("#co-pick").value="")}),t.querySelector("#p-pick").addEventListener("change",()=>{t.querySelector("#p-pick").value&&(t.querySelector("#p-new").value="")}),t.querySelector("#p-new").addEventListener("input",()=>{t.querySelector("#p-new").value&&(t.querySelector("#p-pick").value="")}),t.querySelector("#combo-form").addEventListener("submit",async n=>{n.preventDefault(),Ie(t);const r=t.querySelector("#c-pick").value,u=t.querySelector("#c-first").value.trim(),d=t.querySelector("#c-last").value.trim();if(!r&&(!u||!d)){Oe(t,"c-contact","Pick existing or enter first + last name");return}const i=t.querySelector("#combo-submit");i.disabled=!0,i.textContent="Saving...";try{const c=(await f.auth.getUser()).data.user;let l=t.querySelector("#co-pick").value||null,v=t.querySelector("#p-pick").value||null;const h=t.querySelector("#co-new").value.trim();if(h&&!l){const{data:g,error:$}=await f.from("companies").insert({name:h,user_id:c.id}).select().single();if($)throw $;l=g.id}let S;if(r){const{data:g}=await f.from("contacts").select("id").eq("id",r).single();S=g,l&&await f.from("contacts").update({company_id:l}).eq("id",r)}else{const{data:g,error:$}=await f.from("contacts").insert({first_name:u,last_name:d,company_id:l,user_id:c.id}).select().single();if($)throw $;S=g}const p=t.querySelector("#p-new").value.trim();if(p&&!v){const{data:g,error:$}=await f.from("projects").insert({title:p,status:"open",contact_id:S.id,company_id:l,user_id:c.id}).select().single();if($)throw $;v=g.id}else v&&await f.from("projects").update({contact_id:S.id,company_id:l||void 0}).eq("id",v);const m=t.querySelector("#c-log").value.trim();m&&await f.from("logs").insert({user_id:c.id,contact_id:S.id,project_id:v||null,content:m,logged_at:new Date().toISOString().slice(0,10)}),window.location.hash=`#/contacts/${S.id}`}catch(c){t.querySelector("#combo-error").textContent="Error: "+c.message,i.disabled=!1,i.textContent="Save"}})}catch(e){t.innerHTML=`<div class="error">Error: ${V(e.message)}</div>`}}function Oe(t,e,s){const a=t.querySelector(`#err-${e}`);a&&(a.textContent=s)}function Ie(t){t.querySelectorAll(".field-error").forEach(e=>e.textContent=""),t.querySelector("#combo-error").textContent=""}function V(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}async function Fe(t){t.innerHTML='<div class="loading">Loading...</div>';try{const{data:e}=await f.from("projects").select("id, title, amount, status, updated_at, contact_id, contacts(first_name, last_name)").in("status",["won","lost"]).order("updated_at",{ascending:!1}),s=e||[],a=new Set;for(const c of s)if(c.updated_at){const l=new Date(c.updated_at);a.add(`${l.getFullYear()}-${String(l.getMonth()+1).padStart(2,"0")}`)}const n=Array.from(a).sort().reverse(),r=s.filter(c=>c.status==="won"),u=s.filter(c=>c.status==="lost"),d=new Set;for(const c of s)c.updated_at&&d.add(new Date(c.updated_at).getFullYear());const i=Array.from(d).sort().reverse().map(c=>{const l=r.filter(g=>new Date(g.updated_at).getFullYear()===c),v=u.filter(g=>new Date(g.updated_at).getFullYear()===c),h=l.reduce((g,$)=>g+(parseFloat($.amount)||0),0),S=v.reduce((g,$)=>g+(parseFloat($.amount)||0),0),p=l.length+v.length,m=p>0?Math.round(l.length/p*100):0;return`${c}: ${l.length} won (${vt(h)}) &middot; ${v.length} lost (${vt(S)}) &middot; win rate ${m}%`});t.innerHTML=`
      <div class="page-header">
        <h1>Heroes & Zeroes</h1>
        <div class="header-actions">
          <select id="month-filter" class="input">
            <option value="all">All time</option>
            ${n.map(c=>`<option value="${c}">${Ue(c)}</option>`).join("")}
          </select>
        </div>
      </div>

      <div class="heroes-stats">
        ${i.map(c=>`<div>${c}</div>`).join("")}
      </div>

      <div class="heroes-grid">
        <div class="heroes-col">
          <div class="section-bar section-bar-contacts">HEROES</div>
          ${r.length===0?'<div class="empty-state">No wins yet.</div>':`<div class="table-wrap">
              <table class="data-table" id="heroes-table">
                <thead><tr><th>Project</th><th>Value</th><th>Contact</th><th>Date</th></tr></thead>
                <tbody>
                  ${r.map(c=>Ot(c)).join("")}
                </tbody>
              </table>
            </div>`}
        </div>
        <div class="heroes-col">
          <div class="section-bar section-bar-deals">ZEROES</div>
          ${u.length===0?'<div class="empty-state">No losses.</div>':`<div class="table-wrap">
              <table class="data-table" id="zeroes-table">
                <thead><tr><th>Project</th><th>Value</th><th>Contact</th><th>Date</th></tr></thead>
                <tbody>
                  ${u.map(c=>Ot(c)).join("")}
                </tbody>
              </table>
            </div>`}
        </div>
      </div>
    `,t.querySelector("#month-filter").addEventListener("change",c=>{const l=c.target.value;t.querySelectorAll("#heroes-table tbody tr, #zeroes-table tbody tr").forEach(h=>{l==="all"?h.style.display="":h.style.display=h.dataset.month===l?"":"none"})}),t.querySelectorAll(".clickable-row").forEach(c=>{c.addEventListener("click",()=>{window.location.hash=`#/projects/${c.dataset.id}`})})}catch(e){t.innerHTML=`<div class="error">Error: ${nt(e.message)}</div>`}}function Ot(t){const e=t.updated_at?new Date(t.updated_at):null,s=e?`${String(e.getDate()).padStart(2,"0")}.${String(e.getMonth()+1).padStart(2,"0")}.${e.getFullYear()}`:"-",a=e?`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}`:"",n=t.contacts?`${nt(t.contacts.first_name)} ${nt(t.contacts.last_name)}`:"-";return`
    <tr class="clickable-row" data-id="${t.id}" data-month="${a}">
      <td><strong>${nt(t.title)}</strong></td>
      <td>${t.amount?vt(parseFloat(t.amount)):"-"}</td>
      <td>${n}</td>
      <td>${s}</td>
    </tr>
  `}function vt(t){return t?`${Math.round(t/1e3)}K`:"0"}function Ue(t){const[e,s]=t.split("-");return`${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(s)]} ${e}`}function nt(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}async function We(t,e={}){if(t)try{const[{data:s},{data:a}]=await Promise.all([f.from("contacts").select("id, first_name, last_name").order("last_name"),f.from("projects").select("id, title").order("title")]),n=new Date().toISOString().slice(0,10);t.innerHTML=`
      <div class="qe-separator">${"─".repeat(200)}</div>
      <div class="quick-entry">
        <input type="text" id="qe-content" class="input qe-input" placeholder="What happened? Start with > for next step">
        <select id="qe-contact" class="input qe-select">
          <option value="">-- contact --</option>
          ${(s||[]).map(r=>`<option value="${r.id}">${ut(r.first_name)} ${ut(r.last_name)}</option>`).join("")}
        </select>
        <select id="qe-project" class="input qe-select">
          <option value="">-- project --</option>
          ${(a||[]).map(r=>`<option value="${r.id}">${ut(r.title)}</option>`).join("")}
        </select>
        <input type="date" id="qe-date" class="input qe-date" value="${n}">
        <button id="qe-save" class="btn btn-sm btn-primary">Log</button>
        <span id="qe-status" class="qe-status"></span>
      </div>
    `,e.contactId&&(t.querySelector("#qe-contact").value=e.contactId),e.projectId&&(t.querySelector("#qe-project").value=e.projectId),t.querySelector("#qe-save").addEventListener("click",async()=>{const r=t.querySelector("#qe-content").value.trim();if(!r)return;const u=t.querySelector("#qe-status"),d=t.querySelector("#qe-contact").value,i=t.querySelector("#qe-project").value,c=t.querySelector("#qe-date").value;if(!d&&!i){u.textContent="Select contact or project",u.style.color="var(--danger)";return}const l=(await f.auth.getUser()).data.user;if(!l)return;const{error:v}=await f.from("logs").insert({user_id:l.id,content:r,contact_id:d||null,project_id:i||null,logged_at:c||n});v?(u.textContent="Error",u.style.color="var(--danger)"):(u.textContent="Saved",u.style.color="var(--success)",t.querySelector("#qe-content").value="",setTimeout(()=>{u.textContent=""},2e3),window.dispatchEvent(new CustomEvent("log-created")))}),t.querySelector("#qe-content").addEventListener("keydown",r=>{r.key==="Enter"&&!r.shiftKey&&(r.preventDefault(),t.querySelector("#qe-save").click())})}catch{t.innerHTML=""}}function ut(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}const E=document.getElementById("app"),Y=document.getElementById("brand"),pt=document.getElementById("quick-entry");let J=null,mt=null;function ze(){return(window.location.hash.replace(/^#\/?/,"")||"").split("/").filter(Boolean)}async function gt(){if(!J){Y.style.display="none",pt.style.display="none",ne(E);return}Y.style.display="",pt.style.display="",await Be();const t=ze();t[0]==="contacts"&&t[1]==="new"?await Tt(E):t[0]==="contacts"&&t[1]&&t[2]==="edit"?await Tt(E,t[1]):t[0]==="contacts"&&t[1]?await at(E,t[1]):t[0]==="companies"&&t[1]==="new"?await qe(E):t[0]==="companies"&&t[1]&&t[2]==="edit"?window.location.hash=`#/companies/${t[1]}`:t[0]==="companies"&&t[1]?await we(E,t[1]):t[0]==="companies"?await st(E):t[0]==="projects"&&t[1]==="new"?await Ht(E):t[0]==="projects"&&t[1]&&t[2]==="edit"?await Ht(E,t[1]):t[0]==="projects"&&t[1]?await ft(E,t[1]):t[0]==="projects"?await K(E):t[0]==="contacts"?await et(E):t[0]==="combo"?await Ae(E):t[0]==="heroes"?await Fe(E):t[0]==="extra"?await zt(E):await Wt(E);const e={};t[0]==="contacts"&&t[1]&&t[1]!=="new"&&t[2]!=="edit"?e.contactId=t[1]:t[0]==="projects"&&t[1]&&t[1]!=="new"&&t[2]!=="edit"&&(e.projectId=t[1]),We(pt,e)}async function Be(){const t=window.location.hash||"#/";let e="";try{const{data:c}=await f.from("projects").select("amount").in("status",["open"]),l=(c||[]).reduce((h,S)=>h+(parseFloat(S.amount)||0),0),v=Math.round(l/1e3);v>0&&(e=` ${v}K`)}catch{}const s=new Date,a=s.toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit",year:"numeric"}),n=s.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit",second:"2-digit"}),r=s.toLocaleDateString("en-US",{weekday:"long"}),u=`<span class="black">▓▓</span><span class="brown">▓▓</span><span class="black">▓▓</span><span class="brown">▓▓</span><span class="black">▓▓▓▓▓▓▓▓▓▓</span>
<span class="black">▓▓</span><span class="brown">▓▓▓▓▓▓</span><span class="black">▓▓▓▓▓▓▓▓▓▓</span>
<span class="black">▓▓</span><span class="dgray">▓▓</span><span class="white">▓▓</span><span class="dgray">▓▓</span><span class="black">▓▓▓▓▓▓▓▓▓▓</span>
<span class="black">▓▓</span><span class="brown">▓▓▓▓▓▓</span><span class="black">▓▓▓▓▓▓▓▓▓▓</span>
<span class="black">▓▓</span><span class="brown">▓▓▓▓▓▓</span><span class="black">▓▓▓▓▓▓▓▓▓▓</span>
<span class="black">▓▓</span><span class="brown">▓▓▓▓▓▓▓▓▓▓▓▓</span><span class="black">▓▓▓▓</span>
<span class="black">▓▓</span><span class="brown">▓▓▓▓▓▓▓▓▓▓▓▓▓▓</span><span class="black">▓▓</span>
<span class="black">▓▓</span><span class="brown">▓▓</span><span class="black">▓▓</span><span class="brown">▓▓</span><span class="black">▓▓▓▓</span><span class="brown">▓▓</span><span class="black">▓▓▓▓</span>
<span class="black">▓▓</span><span class="brown">▓▓</span><span class="black">▓▓</span><span class="brown">▓▓</span><span class="black">▓▓▓▓</span><span class="brown">▓▓</span><span class="black">▓▓▓▓</span>`;function d(c,l){const v=t.startsWith(c)||c==="#/"&&(t==="#/"||t==="");return`<a href="${c}" class="${v?"active":""}">${l}</a>`}Y.innerHTML=`
    <div class="brand-logo">${u}</div>
    <div class="brand-name">BREVIS</div>
    <div class="brand-time">
      <div id="brand-date">${a}</div>
      <div id="brand-time">${n}</div>
      <div>${r}</div>
    </div>
    <div class="brand-sep">────────────────</div>
    <div class="brand-nav">
      ${d("#/","Dashboard")}
      ${d("#/projects","Projects"+e)}
      ${d("#/contacts","Contacts")}
      ${d("#/companies","Companies")}
      ${d("#/heroes","Heroes")}
      ${d("#/combo","+ Combo")}
      ${d("#/extra","Extra")}
    </div>
    <div class="brand-sep">────────────────</div>
    <div class="brand-user">
      ${Re(J.email)}<br>
      <a id="sign-out-link" href="#">Sign out</a>
    </div>
    <div class="brand-fill"></div>
  `,Y.querySelector("#sign-out-link").addEventListener("click",async c=>{c.preventDefault(),await ee(),window.location.hash="#/"}),mt&&clearInterval(mt),mt=setInterval(()=>{const c=new Date,l=document.getElementById("brand-date"),v=document.getElementById("brand-time");l&&(l.textContent=c.toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit",year:"numeric"})),v&&(v.textContent=c.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit",second:"2-digit"}))},1e3);const i=Y.querySelector(".brand-fill");if(i){let c="";for(let l=0;l<500;l++)c+="░";i.textContent=c}}se(t=>{J=t,gt()});window.addEventListener("hashchange",()=>{J&&gt()});(async()=>(J=await ae(),gt()))();function Re(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}
