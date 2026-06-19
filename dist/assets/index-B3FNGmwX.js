(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const u of r.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&n(u)}).observe(document,{childList:!0,subtree:!0});function a(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(s){if(s.ep)return;s.ep=!0;const r=a(s);fetch(s.href,r)}})();const Gt="https://juquttlvkairdgdkzpke.supabase.co",Jt="sb_publishable_tKbsPXd1ZbT5E0Am7oAA6w_GMjeM1Is",{createClient:Zt}=supabase,m=Zt(Gt,Jt);async function Xt(){const{error:t}=await m.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin+window.location.pathname}});if(t)throw t}async function Qt(){const{error:t}=await m.auth.signOut();if(t)throw t}async function te(){const{data:{user:t}}=await m.auth.getUser();return t}function ee(t){return m.auth.onAuthStateChange((e,a)=>{t((a==null?void 0:a.user)??null)})}function ae(t){t.innerHTML=`
    <div class="login-page">
      <div class="login-card">
        <h1>CRM Mini</h1>
        <p>Sign in to manage your contacts</p>
        <button id="google-login" class="btn btn-primary btn-google">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>`,t.querySelector("#google-login").addEventListener("click",async()=>{try{await Xt()}catch(e){alert("Login failed: "+e.message)}})}function G(t,e=300){let a;return(...n)=>{clearTimeout(a),a=setTimeout(()=>t(...n),e)}}function se(t,e){const a=new Map;for(const i of e)a.set(i.id,i.name);const n=["First Name","Last Name","Email","Phone","Company","Notes","Created"],s=t.map(i=>[i.first_name,i.last_name,i.email||"",i.phone||"",i.company_id&&a.get(i.company_id)||"",(i.notes||"").replace(/\n/g," "),i.created_at?new Date(i.created_at).toLocaleDateString():""]),r=i=>{const v=String(i);return v.includes(",")||v.includes('"')||v.includes(`
`)?'"'+v.replace(/"/g,'""')+'"':v},u=[n,...s].map(i=>i.map(r).join(",")).join(`\r
`),l=new Blob(["\uFEFF"+u],{type:"text/csv;charset=utf-8;"}),d=URL.createObjectURL(l),c=document.createElement("a");c.href=d,c.download=`contacts_${new Date().toISOString().slice(0,10)}.csv`,c.click(),URL.revokeObjectURL(d)}function U(t){if(!t)return{days:null,css:"temp-dead",label:"-"};const e=Math.floor((Date.now()-new Date(t).getTime())/864e5);return e<7?{days:e,css:"temp-hot",label:`${e}d`}:e<30?{days:e,css:"temp-warm",label:`${e}d`}:e<60?{days:e,css:"temp-cold",label:`${e}d`}:{days:e,css:"temp-dead",label:`${e}d`}}const Et=["open"];let P={col:"last_name",asc:!0},T="",D="all";async function ne(){let t=m.from("contacts").select("*, companies(name)");T&&(t=t.or(`first_name.ilike.%${T}%,last_name.ilike.%${T}%,email.ilike.%${T}%,notes.ilike.%${T}%`)),D==="with_email"&&(t=t.not("email","is",null).neq("email","")),D==="with_phone"&&(t=t.not("phone","is",null).neq("phone","")),D==="with_company"&&(t=t.not("company_id","is",null)),t=t.order(P.col,{ascending:P.asc});const{data:e,error:a}=await t;if(a)throw a;return e||[]}async function oe(){const{data:t}=await m.from("companies").select("id, name").order("name");return t||[]}async function re(){const{data:t}=await m.from("logs").select("contact_id, logged_at, content").not("contact_id","is",null).order("logged_at",{ascending:!1}),e=new Map;for(const a of t||[])e.has(a.contact_id)||e.set(a.contact_id,{date:a.logged_at,content:a.content});return Array.from(e.entries()).map(([a,n])=>({contact_id:a,last_date:n.date,content:n.content}))}async function ce(){const{data:t}=await m.from("projects").select("contact_id").in("status",Et).not("contact_id","is",null),{data:e}=await m.from("projects").select("company_id").in("status",Et).not("company_id","is",null),a=new Set((t||[]).map(s=>s.contact_id)),n=new Set((e||[]).map(s=>s.company_id));return{contactsWithDeals:a,companiesWithDeals:n}}function it(t){return P.col!==t?"":P.asc?" ↑":" ↓"}async function tt(t){t.innerHTML='<div class="loading">Loading contacts...</div>';try{const[e,a,n,s]=await Promise.all([ne(),oe(),ce(),re()]),r=new Map;for(const i of s)i.contact_id&&r.set(i.contact_id,{date:i.last_date,content:i.content});const u=e.filter(i=>n.contactsWithDeals.has(i.id)||i.company_id&&n.companiesWithDeals.has(i.company_id)).sort((i,v)=>{const b=(i.last_name||"").localeCompare(v.last_name||"");return b!==0?b:(i.first_name||"").localeCompare(v.first_name||"")}),l=e.filter(i=>!n.contactsWithDeals.has(i.id)&&!(i.company_id&&n.companiesWithDeals.has(i.company_id))).sort((i,v)=>{const b=(i.last_name||"").localeCompare(v.last_name||"");return b!==0?b:(i.first_name||"").localeCompare(v.first_name||"")});t.innerHTML=`
      <div class="page-header">
        <h1>Contacts <span class="badge">${e.length}</span></h1>
        <div class="header-actions">
          <button id="csv-export" class="btn btn-secondary">Export CSV</button>
          <a href="https://www.icloud.com/contacts/" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Contacts</a>
          <a href="#/contacts/new" class="btn btn-primary">+ New Contact</a>
        </div>
      </div>

      <div class="toolbar">
        <input type="search" id="search-input" class="input" placeholder="Search name, email, notes..." value="${Nt(T)}">
        <select id="filter-select" class="input">
          <option value="all"${D==="all"?" selected":""}>All contacts</option>
          <option value="with_email"${D==="with_email"?" selected":""}>With email</option>
          <option value="with_phone"${D==="with_phone"?" selected":""}>With phone</option>
          <option value="with_company"${D==="with_company"?" selected":""}>With company</option>
        </select>
      </div>

      ${ie(u,l,r)}
    `;const d=t.querySelector("#search-input"),c=G(async()=>{T=d.value.trim(),await tt(t)},350);d.addEventListener("input",c),t.querySelector("#filter-select").addEventListener("change",async i=>{D=i.target.value,await tt(t)}),t.querySelectorAll(".sortable").forEach(i=>{i.addEventListener("click",async()=>{const v=i.dataset.col;P.col===v?P.asc=!P.asc:P={col:v,asc:!0},await tt(t)})}),t.querySelectorAll(".clickable-row").forEach(i=>{i.addEventListener("click",()=>{window.location.hash=`#/contacts/${i.dataset.id}`})}),t.querySelector("#csv-export").addEventListener("click",()=>{se(e,a)}),T&&(d.focus(),d.setSelectionRange(d.value.length,d.value.length))}catch(e){t.innerHTML=`<div class="error">Error: ${H(e.message)}</div>`}}function ie(t,e,a){let n="";return t.length>0&&(n+=`
      <div class="deal-group">
        <h2 class="group-heading">Open Projects <span class="badge">${t.length}</span></h2>
        ${Lt(t,a)}
      </div>
    `),e.length>0&&(n+=`
      <div class="deal-group">
        <h2 class="group-heading">Other <span class="badge">${e.length}</span></h2>
        ${Lt(e,a)}
      </div>
    `),t.length===0&&e.length===0&&(n='<div class="empty-state">No contacts. <a href="#/contacts/new">Create first</a>.</div>'),n}function Lt(t,e){return`
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
          ${t.map(a=>{var l;const n=e.get(a.id),s=U(n==null?void 0:n.date),r=n!=null&&n.content?le(n.content,50):"",u=!a.email||!a.phone||!a.company_id;return`
            <tr class="clickable-row ${s.css}" data-id="${a.id}">
              <td>
                <strong>${H(a.first_name)} ${H(a.last_name)}</strong>${u?' <span class="incomplete-badge">[!]</span>':""}
                ${r?`<div class="log-snippet">${H(r)}</div>`:""}
              </td>
              <td>${a.email?`<a href="mailto:${Nt(a.email)}" onclick="event.stopPropagation()">${H(a.email)}</a>`:'<span class="muted">-</span>'}</td>
              <td>${a.phone?H(a.phone):'<span class="muted">-</span>'}</td>
              <td>${(l=a.companies)!=null&&l.name?H(a.companies.name):'<span class="muted">-</span>'}</td>
              <td class="${s.css}">${s.label}</td>
            </tr>
          `}).join("")}
        </tbody>
      </table>
    </div>
  `}function le(t,e){return t?t.length>e?t.slice(0,e)+"...":t:""}function H(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}function Nt(t){return t?t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):""}function de(t){const e=Date.now(),a=new Date(t).getTime(),n=e-a,s=Math.floor(n/6e4);if(s<1)return"just now";if(s<60)return`${s}m ago`;const r=Math.floor(s/60);if(r<24)return`${r}h ago`;const u=Math.floor(r/24);return u<30?`${u}d ago`:new Date(t).toLocaleDateString()}const Ct=1e4;let k=null;function ue(){let t=document.getElementById("undo-container");return t||(t=document.createElement("div"),t.id="undo-container",document.body.appendChild(t)),t}function pe(){k&&(clearTimeout(k.timer),k.el&&k.el.parentNode&&k.el.parentNode.removeChild(k.el),k=null)}async function z(t,e,a,n,s){pe();const{data:r,error:u}=await m.from(t).select("*").eq("id",e.id).single();if(u||!r){alert("Error: "+((u==null?void 0:u.message)||"Row not found"));return}const{error:l}=await m.from(t).delete().eq("id",e.id);if(l){alert("Error: "+l.message);return}n();const d=ue(),c=document.createElement("div");c.className="undo-toast",c.innerHTML=`
    <span class="undo-text">Deleted ${a}</span>
    <a href="#" class="undo-link">Undo</a>
    <span class="undo-timer-bar"></span>
  `,d.appendChild(c);const i=c.querySelector(".undo-link"),v=c.querySelector(".undo-timer-bar");requestAnimationFrame(()=>{v.style.transition=`width ${Ct}ms linear`,v.style.width="0%"});const b=setTimeout(()=>{c.parentNode&&c.parentNode.removeChild(c),k=null},Ct);k={el:c,timer:b},i.addEventListener("click",async h=>{h.preventDefault(),clearTimeout(b),c.parentNode&&c.parentNode.removeChild(c),k=null;const{error:f}=await m.from(t).insert(r);if(f){alert("Undo failed: "+f.message);return}s()})}function Ot(t,e="contact",a={}){return!t||t.length===0?'<div class="log-empty">No log entries yet.</div>':`<div class="log-timeline">${t.map(n=>{var l,d;const s=me(n.logged_at);let r="";if(e==="contact"&&((l=n.projects)!=null&&l.title))r=` <a href="#/projects/${n.project_id}" class="log-tag">[${A(n.projects.title)}]</a>`;else if(e==="project"&&n.contacts){const c=`${n.contacts.first_name||""} ${n.contacts.last_name||""}`.trim();c&&(r=` <a href="#/contacts/${n.contact_id}" class="log-tag">[${A(c)}]</a>`)}return`
      <div class="log-entry${((d=n.content)==null?void 0:d.startsWith(">"))?" log-entry-next":""}" data-log-id="${n.id}">
        <div class="log-entry-view">
          <span class="log-date">${s} ───</span>
          <span class="log-content">${A(n.content)}</span>${r}
          <span class="log-actions">
            <button class="log-edit-btn" data-log-id="${n.id}" title="Edit">edit</button>
            <button class="log-delete-btn" data-log-id="${n.id}" title="Delete">&times;</button>
          </span>
        </div>
        <div class="log-entry-edit" style="display:none" data-log-id="${n.id}">
          <input type="date" class="input log-edit-date" value="${n.logged_at||""}">
          <textarea class="input log-edit-content" rows="2">${A(n.content||"")}</textarea>
          <div class="log-edit-row">
            ${e==="contact"?`
              <select class="input log-edit-project">
                <option value="">-- project --</option>
                ${(a.projects||[]).map(c=>`<option value="${c.id}"${n.project_id===c.id?" selected":""}>${A(c.title)}</option>`).join("")}
              </select>`:""}
            ${e==="project"?`
              <select class="input log-edit-contact">
                <option value="">-- contact --</option>
                ${(a.contacts||[]).map(c=>`<option value="${c.id}"${n.contact_id===c.id?" selected":""}>${A(c.first_name)} ${A(c.last_name)}</option>`).join("")}
              </select>`:""}
            <button class="btn btn-sm btn-primary log-edit-save" data-log-id="${n.id}">Save</button>
            <button class="btn btn-sm btn-secondary log-edit-cancel" data-log-id="${n.id}">Cancel</button>
          </div>
        </div>
      </div>`}).join("")}</div>`}function It(t,e){t.querySelectorAll(".log-edit-btn").forEach(a=>{a.addEventListener("click",n=>{n.stopPropagation();const s=a.dataset.logId,r=t.querySelector(`.log-entry[data-log-id="${s}"]`);r&&(r.querySelector(".log-entry-view").style.display="none",r.querySelector(".log-entry-edit").style.display="")})}),t.querySelectorAll(".log-edit-cancel").forEach(a=>{a.addEventListener("click",n=>{n.stopPropagation();const s=a.dataset.logId,r=t.querySelector(`.log-entry[data-log-id="${s}"]`);r&&(r.querySelector(".log-entry-view").style.display="",r.querySelector(".log-entry-edit").style.display="none")})}),t.querySelectorAll(".log-edit-save").forEach(a=>{a.addEventListener("click",async n=>{n.stopPropagation();const s=a.dataset.logId,r=t.querySelector(`.log-entry[data-log-id="${s}"]`);if(!r)return;const u=r.querySelector(".log-entry-edit"),l=u.querySelector(".log-edit-content").value.trim();if(!l)return;const d=u.querySelector(".log-edit-date").value,c=u.querySelector(".log-edit-project"),i=u.querySelector(".log-edit-contact"),v={content:l,logged_at:d||null};c&&(v.project_id=c.value||null),i&&(v.contact_id=i.value||null);const{error:b}=await m.from("logs").update(v).eq("id",s);!b&&e&&e()})}),t.querySelectorAll(".log-delete-btn").forEach(a=>{a.addEventListener("click",async n=>{n.stopPropagation();const s=a.dataset.logId;s&&await z("logs",{id:s},"log entry",()=>{e&&e()},()=>{e&&e()})})})}function me(t){if(!t)return"";const e=new Date(t),a=String(e.getDate()).padStart(2,"0"),n=String(e.getMonth()+1).padStart(2,"0");return`${a}.${n}.`}function A(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}async function et(t,e){t.innerHTML='<div class="loading">Loading...</div>';try{const[{data:a,error:n},{data:s},{data:r},{data:u}]=await Promise.all([m.from("contacts").select("*, companies(id, name)").eq("id",e).single(),m.from("logs").select("*, projects(title)").eq("contact_id",e).order("logged_at",{ascending:!1}).order("created_at",{ascending:!1}),m.from("companies").select("id, name").order("name"),m.from("projects").select("id, title").order("title")]);if(n||!a){t.innerHTML='<div class="error">Contact not found. <a href="#/contacts">Back to list</a></div>';return}const l=(s||[])[0],d=l?`Last contact: ${de(l.logged_at)}`:"Last contact: never",c=l?U(l.logged_at).css:"temp-dead",i=(s||[]).find($=>{var _;return(_=$.content)==null?void 0:_.startsWith(">")}),v=i?`<div class="next-step"><span class="next-step-label">NEXT:</span> ${O(i.content.slice(1).trim())} <span class="muted">${fe(i.logged_at)}</span></div>`:"",b=(u||[]).filter($=>(s||[]).some(_=>_.project_id===$.id)),{data:h}=await m.from("projects").select("id, title, status").eq("contact_id",e).order("title"),f=new Map;for(const $ of h||[])f.set($.id,$);for(const $ of b)f.set($.id,$);const p=Array.from(f.values()),g=Ot(s||[],"contact",{projects:u||[]});t.innerHTML=`
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

        <div class="last-contact ${c}">${d}</div>
        ${v}

        <div class="inline-fields-vertical">
          <label>Email <input type="email" id="f-email" class="input inline-input" value="${xt(a.email||"")}" placeholder="add email"></label>
          <label>Phone <input type="tel" id="f-phone" class="input inline-input" value="${xt(a.phone||"")}" placeholder="add phone"></label>
          <label>Company
            <select id="f-company" class="input inline-input">
              <option value="">—</option>
              ${(r||[]).map($=>`<option value="${$.id}"${a.company_id===$.id?" selected":""}>${O($.name)}</option>`).join("")}
            </select>
          </label>
          <span id="inline-status" class="inline-status"></span>
        </div>

        ${p.length>0?`
        <div class="related-entities">Projects: ${p.map($=>`<a href="#/projects/${$.id}">${O($.title)} <span class="muted">(${$.status})</span></a>`).join(" · ")}</div>`:""}

        <div class="section-bar">Log</div>
        ${g}
      </div>
    `;const w=t.querySelector("#inline-status");async function j($,_){const{error:C}=await m.from("contacts").update({[$]:_||null}).eq("id",e);C?(w.textContent="Error",w.style.color="var(--danger)"):(w.textContent="Saved",w.style.color="var(--success)",setTimeout(()=>{w.textContent=""},2e3))}const L=G(()=>j("email",t.querySelector("#f-email").value.trim()),1e3),S=G(()=>j("phone",t.querySelector("#f-phone").value.trim()),1e3);t.querySelector("#f-email").addEventListener("input",L),t.querySelector("#f-phone").addEventListener("input",S),t.querySelector("#f-company").addEventListener("change",()=>{j("company_id",t.querySelector("#f-company").value)}),t.querySelector("#toggle-star").addEventListener("click",async()=>{const $=a.starred_at?null:new Date().toISOString();await m.from("contacts").update({starred_at:$}).eq("id",e),et(t,e)}),It(t,()=>et(t,e)),window.addEventListener("log-created",()=>et(t,e),{once:!0}),t.querySelector("#delete-contact").addEventListener("click",async()=>{await z("contacts",a,`"${a.first_name} ${a.last_name}"`,()=>{window.location.hash="#/contacts"},()=>{window.location.hash=`#/contacts/${e}`})})}catch(a){t.innerHTML=`<div class="error">Error: ${O(a.message)}</div>`}}function fe(t){if(!t)return"";const e=new Date(t);return`${String(e.getDate()).padStart(2,"0")}.${String(e.getMonth()+1).padStart(2,"0")}.`}function O(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}function xt(t){return t?t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):""}async function kt(t,e=null){if(e){window.location.hash=`#/contacts/${e}`;return}t.innerHTML=`
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
  `,t.querySelector("#first_name").focus(),t.querySelector("#contact-form").addEventListener("submit",async a=>{a.preventDefault(),ve(t);const n=t.querySelector("#first_name").value.trim(),s=t.querySelector("#last_name").value.trim();let r=!0;if(n||(Mt(t,"first_name","Required"),r=!1),s||(Mt(t,"last_name","Required"),r=!1),!r)return;const u=t.querySelector("#submit-btn");u.disabled=!0,u.textContent="Saving...";try{const l=(await m.auth.getUser()).data.user,{data:d,error:c}=await m.from("contacts").insert({first_name:n,last_name:s,user_id:l.id}).select().single();if(c)throw c;window.location.hash=`#/contacts/${d.id}`}catch(l){t.querySelector("#form-error").textContent="Error: "+l.message,u.disabled=!1,u.textContent="Save"}})}function Mt(t,e,a){const n=t.querySelector(`#err-${e}`);n&&(n.textContent=a);const s=t.querySelector(`#${e}`);s&&s.classList.add("input-error")}function ve(t){t.querySelectorAll(".field-error").forEach(e=>e.textContent=""),t.querySelectorAll(".input-error").forEach(e=>e.classList.remove("input-error")),t.querySelector("#form-error").textContent=""}const ge=["open"];async function at(t){t.innerHTML='<div class="loading">Loading companies...</div>';try{let b=function(f=null){i.style.display="",t.querySelector("#company-form-title").textContent=f?"Edit Company":"New Company",t.querySelector("#company-submit-btn").textContent=f?"Save Changes":"Create Company",t.querySelector("#company-edit-id").value=(f==null?void 0:f.id)||"",t.querySelector("#c-name").value=(f==null?void 0:f.name)||"",t.querySelector("#c-official-name").value=(f==null?void 0:f.official_name)||"",t.querySelector("#c-email").value=(f==null?void 0:f.email)||"",t.querySelector("#c-ico").value=(f==null?void 0:f.ico)||"",t.querySelector("#c-web").value=(f==null?void 0:f.web)||"",t.querySelector("#c-notes").value=(f==null?void 0:f.notes)||"",t.querySelector("#c-name").focus()},h=function(){i.style.display="none",v.reset(),t.querySelector("#company-edit-id").value="",t.querySelector("#company-form-error").textContent=""};var e=b,a=h;const{data:n,error:s}=await m.from("companies").select("*, contacts(id)").order("name");if(s)throw s;const{data:r}=await m.from("projects").select("company_id").in("status",ge),u={};(r||[]).forEach(f=>{f.company_id&&(u[f.company_id]=(u[f.company_id]||0)+1)});const l=n||[],d=l.filter(f=>u[f.id]>0).sort((f,p)=>(f.name||"").localeCompare(p.name||"")),c=l.filter(f=>!u[f.id]).sort((f,p)=>(f.name||"").localeCompare(p.name||""));t.innerHTML=`
      <div class="page-header">
        <h1>Companies <span class="badge">${l.length}</span></h1>
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

      ${he(d,c,u)}
    `;const i=t.querySelector("#company-form-wrap"),v=t.querySelector("#company-form");t.querySelector("#add-company-btn").addEventListener("click",()=>b()),t.querySelector("#company-cancel-btn").addEventListener("click",h),v.addEventListener("submit",async f=>{f.preventDefault();const p=t.querySelector("#c-name").value.trim();if(!p){t.querySelector("#company-form-error").textContent="Company name is required";return}const g=t.querySelector("#company-edit-id").value,w={name:p,official_name:t.querySelector("#c-official-name").value.trim()||null,email:t.querySelector("#c-email").value.trim()||null,ico:t.querySelector("#c-ico").value.trim()||null,web:t.querySelector("#c-web").value.trim()||null,notes:t.querySelector("#c-notes").value.trim()||null};try{if(g){const{error:j}=await m.from("companies").update(w).eq("id",g);if(j)throw j}else{const j=(await m.auth.getUser()).data.user;w.user_id=j.id;const{error:L}=await m.from("companies").insert(w);if(L)throw L}await at(t)}catch(j){t.querySelector("#company-form-error").textContent="Error: "+j.message}}),t.querySelectorAll(".edit-company").forEach(f=>{f.addEventListener("click",p=>{p.preventDefault();const g=l.find(w=>w.id===f.dataset.id);g&&b(g)})}),t.querySelectorAll(".delete-company").forEach(f=>{f.addEventListener("click",async p=>{p.preventDefault();const g=l.find(w=>w.id===f.dataset.id);g&&await z("companies",g,`"${g.name}"`,()=>at(t),()=>at(t))})}),t.querySelectorAll(".clickable-row").forEach(f=>{f.addEventListener("click",()=>{window.location.hash=`#/companies/${f.dataset.id}`})})}catch(n){t.innerHTML=`<div class="error">Error: ${W(n.message)}</div>`}}function he(t,e,a){let n="";return t.length>0&&(n+=`
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
              ${t.map(s=>Tt(s,a[s.id]||0)).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `),e.length>0&&(n+=`
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
              ${e.map(s=>Tt(s,0)).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `),t.length===0&&e.length===0&&(n='<div class="empty-state">No companies.</div>'),n}function Tt(t,e){return`
    <tr class="clickable-row" data-id="${t.id}">
      <td><strong>${W(t.name)}</strong></td>
      <td>${t.official_name?W(t.official_name):'<span class="muted">-</span>'}</td>
      <td>${t.email?W(t.email):'<span class="muted">-</span>'}</td>
      <td>${t.web?`<a href="${Dt(t.web)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${W(t.web)}</a>`:'<span class="muted">-</span>'}</td>
      <td>${t.ico?W(t.ico):'<span class="muted">-</span>'}</td>
      <td>${t.contacts?t.contacts.length:0}</td>
      ${e>0?`<td><strong>${e}</strong></td>`:""}
      <td class="actions-cell" onclick="event.stopPropagation()">
        <a href="#" class="edit-company" data-id="${t.id}">Edit</a>
        <a href="#" class="danger-link delete-company" data-id="${t.id}" data-name="${Dt(t.name)}">Delete</a>
      </td>
    </tr>
  `}function W(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}function Dt(t){return t?t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):""}async function ye(t,e){t.innerHTML='<div class="loading">Loading...</div>';try{const[{data:a,error:n},{data:s},{data:r}]=await Promise.all([m.from("companies").select("*").eq("id",e).single(),m.from("contacts").select("id, first_name, last_name").eq("company_id",e).order("last_name"),m.from("projects").select("id, title, amount, status, updated_at").eq("company_id",e).order("updated_at",{ascending:!1})]);if(n||!a){t.innerHTML='<div class="error">Company not found. <a href="#/companies">Back to list</a></div>';return}const u=(s||[]).map(p=>p.id),l=r||[];let d=[];if(u.length>0){const{data:p}=await m.from("logs").select("*, contacts(first_name, last_name), projects(title)").in("contact_id",u).order("logged_at",{ascending:!1}).order("created_at",{ascending:!1}).limit(30);d=p||[]}const c=new Map;for(const p of d)p.contact_id&&!c.has(p.contact_id)&&c.set(p.contact_id,p.logged_at);const i=(s||[]).map(p=>({...p,temp:U(c.get(p.id))})),v=d.length>0?d.map(p=>{var L;const g=$e(p.logged_at),w=p.contacts?`${M(p.contacts.first_name)} ${M(p.contacts.last_name)}`:"",j=(L=p.projects)!=null&&L.title?` <span class="log-tag">[${M(p.projects.title)}]</span>`:"";return`<div class="log-entry">
            <span class="log-date">${g} ───</span>
            <a href="#/contacts/${p.contact_id}" class="log-tag">[${w}]</a>
            <span class="log-content">${M(p.content)}</span>${j}
          </div>`}).join(""):'<div class="log-empty">No logs from contacts at this company.</div>';t.innerHTML=`
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-toolbar">
            <a href="#/companies" class="btn btn-back">&larr; Back</a>
            <h1>${M(a.name)}</h1>
            <div class="detail-actions">
              <button id="delete-company" class="btn btn-danger">Del</button>
            </div>
          </div>
        </div>

        <div class="inline-fields-vertical">
          <label>Official name <input type="text" id="f-official" class="input inline-input" value="${X(a.official_name||"")}" placeholder="add official name"></label>
          <label>Email <input type="email" id="f-email" class="input inline-input" value="${X(a.email||"")}" placeholder="add email"></label>
          <label>Web <input type="url" id="f-web" class="input inline-input" value="${X(a.web||"")}" placeholder="add website"></label>
          <label>ICO <input type="text" id="f-ico" class="input inline-input" value="${X(a.ico||"")}" placeholder="add ICO"></label>
          <span id="inline-status" class="inline-status"></span>
        </div>

        ${i.length>0?`
        <div class="section-bar section-bar-contacts">Contacts (${i.length})</div>
        <div class="compact-list">
          ${i.map(p=>`
            <div class="compact-list-item clickable-row ${p.temp.css}" data-href="#/contacts/${p.id}">
              <strong>${M(p.first_name)} ${M(p.last_name)}</strong> · ${p.temp.label}
            </div>
          `).join("")}
        </div>`:""}

        ${l.length>0?`
        <div class="section-bar section-bar-deals">Projects (${l.length})</div>
        <div class="compact-list">
          ${l.map(p=>`
            <div class="compact-list-item clickable-row" data-href="#/projects/${p.id}">
              <strong>${M(p.title)}</strong> · <span class="status-badge status-${p.status}">${be(p.status)}</span>
              ${p.amount?` · ${Math.round(parseFloat(p.amount)/1e3)}K`:""}
            </div>
          `).join("")}
        </div>`:""}

        <div class="section-bar">Log</div>
        <div class="log-timeline">${v}</div>
      </div>
    `;const b=t.querySelector("#inline-status");async function h(p,g){const{error:w}=await m.from("companies").update({[p]:g||null}).eq("id",e);w?(b.textContent="Error",b.style.color="var(--danger)"):(b.textContent="Saved",b.style.color="var(--success)",setTimeout(()=>{b.textContent=""},2e3))}const f=(p,g)=>G(()=>h(p,t.querySelector(g).value.trim()),1e3);t.querySelector("#f-official").addEventListener("input",f("official_name","#f-official")),t.querySelector("#f-email").addEventListener("input",f("email","#f-email")),t.querySelector("#f-web").addEventListener("input",f("web","#f-web")),t.querySelector("#f-ico").addEventListener("input",f("ico","#f-ico")),t.querySelector("#delete-company").addEventListener("click",async()=>{await z("companies",a,`"${a.name}"`,()=>{window.location.hash="#/companies"},()=>{window.location.hash=`#/companies/${e}`})}),t.querySelectorAll(".clickable-row").forEach(p=>{p.addEventListener("click",()=>{const g=p.dataset.href;g&&(window.location.hash=g)})})}catch(a){t.innerHTML=`<div class="error">Error: ${M(a.message)}</div>`}}function be(t){return{open:"Open",frozen:"Frozen",won:"Won",lost:"Lost"}[t]||t}function $e(t){if(!t)return"";const e=new Date(t);return`${String(e.getDate()).padStart(2,"0")}.${String(e.getMonth()+1).padStart(2,"0")}.`}function M(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}function X(t){return t?t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):""}async function we(t,e=null){if(e){window.location.hash=`#/companies/${e}`;return}t.innerHTML=`
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
  `,t.querySelector("#name").focus(),t.querySelector("#company-form").addEventListener("submit",async a=>{a.preventDefault();const n=t.querySelector("#name").value.trim();if(!n){const r=t.querySelector("#err-name");r&&(r.textContent="Required");return}const s=t.querySelector("#submit-btn");s.disabled=!0,s.textContent="Saving...";try{const r=(await m.auth.getUser()).data.user,{data:u,error:l}=await m.from("companies").insert({name:n,user_id:r.id}).select().single();if(l)throw l;window.location.hash=`#/companies/${u.id}`}catch(r){t.querySelector("#form-error").textContent="Error: "+r.message,s.disabled=!1,s.textContent="Save"}})}const Se=["open"],_e=[{key:"open",title:"Open",statuses:["open"]},{key:"frozen",title:"Frozen",statuses:["frozen"]},{key:"won",title:"Won",statuses:["won"]},{key:"lost",title:"Lost",statuses:["lost"]}];async function K(t){t.innerHTML='<div class="loading">Loading projects...</div>';try{let j=function(){g.style.display="",t.querySelector("#d-title").value="",t.querySelector("#d-title").focus()},L=function(){g.style.display="none",w.reset(),t.querySelector("#project-form-error").textContent=""};var e=j,a=L;const[{data:n,error:s},{data:r},{data:u},{data:l}]=await Promise.all([m.from("projects").select("*, contacts(first_name, last_name), companies(name)").order("updated_at",{ascending:!1}),m.from("contacts").select("id, first_name, last_name").order("last_name"),m.from("companies").select("id, name").order("name"),m.from("logs").select("project_id, logged_at, content").not("project_id","is",null).order("logged_at",{ascending:!1})]);if(s)throw s;const d=new Map;for(const S of l||[])S.project_id&&!d.has(S.project_id)&&d.set(S.project_id,{date:S.logged_at,content:S.content});const c=n||[],i=r||[],v=u||[],b=c.reduce((S,$)=>S+(parseFloat($.amount)||0),0),f=c.filter(S=>S.status==="frozen").reduce((S,$)=>S+(parseFloat($.amount)||0),0),p=qe(c);t.innerHTML=`
      <div class="page-header">
        <h1>Projects <span class="badge">${c.length}</span> <span class="header-meta">Total ${b.toLocaleString("cs-CZ")} Kc / Frozen ${f.toLocaleString("cs-CZ")} Kc</span></h1>
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

      ${je(p,c,d)}
    `;const g=t.querySelector("#project-form-wrap"),w=t.querySelector("#project-form");t.querySelector("#add-project-btn").addEventListener("click",()=>j()),t.querySelector("#project-cancel-btn").addEventListener("click",L),w.addEventListener("submit",async S=>{S.preventDefault();const $=t.querySelector("#d-title").value.trim();if(!$){t.querySelector("#project-form-error").textContent="Title is required";return}try{const _=(await m.auth.getUser()).data.user,{data:C,error:x}=await m.from("projects").insert({title:$,status:"open",user_id:_.id}).select().single();if(x)throw x;window.location.hash=`#/projects/${C.id}`}catch(_){t.querySelector("#project-form-error").textContent="Error: "+_.message}}),t.querySelectorAll(".delete-project").forEach(S=>{S.addEventListener("click",async $=>{$.preventDefault();const _=c.find(C=>C.id===S.dataset.id);_&&await z("projects",_,`"${_.title}"`,()=>K(t),()=>K(t))})}),t.querySelectorAll(".freeze-project").forEach(S=>{S.addEventListener("click",async $=>{$.preventDefault();const _=S.dataset.id,C=S.dataset.status,{error:x}=await m.from("projects").update({status:"frozen",previous_status:C}).eq("id",_);if(x){alert("Error: "+x.message);return}await K(t)})}),t.querySelectorAll(".unfreeze-project").forEach(S=>{S.addEventListener("click",async $=>{$.preventDefault();const _=S.dataset.id,C="open",{error:x}=await m.from("projects").update({status:C,previous_status:null}).eq("id",_);if(x){alert("Error: "+x.message);return}await K(t)})}),t.querySelectorAll(".clickable-row").forEach(S=>{S.addEventListener("click",()=>{window.location.hash=`#/projects/${S.dataset.id}`})})}catch(n){t.innerHTML=`<div class="error">Error: ${Y(n.message)}</div>`}}function qe(t){const e={};return _e.forEach(a=>{const n=t.filter(s=>a.statuses.includes(s.status));n.sort((s,r)=>s.updated_at!==r.updated_at?new Date(r.updated_at)-new Date(s.updated_at):s.created_at!==r.created_at?new Date(r.created_at)-new Date(s.created_at):(s.title||"").localeCompare(r.title||"")),e[a.key]={...a,projects:n}}),e}function je(t,e,a){return Object.values(t).map(n=>n.projects.length===0?"":`
      <div class="project-group">
        <h2 class="group-heading">${n.title} <span class="badge">${n.projects.length}</span></h2>
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
              ${n.projects.map(s=>Ee(s,a)).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `).join("")}function Ee(t,e){const a=parseFloat(t.amount)||0,n=a?`${Math.round(a/1e3)}K`:"-",s=e.get(t.id),r=U(s==null?void 0:s.date),u=s!=null&&s.content?Le(s.content,50):"",l=Se.includes(t.status),d=t.status==="frozen",c=t.contacts?`${Y(t.contacts.first_name)} ${Y(t.contacts.last_name)}`:'<span class="muted">-</span>';return`
    <tr class="clickable-row ${r.css}" data-id="${t.id}">
      <td>
        <strong>${Y(t.title)}</strong>
        ${u?`<div class="log-snippet">${Y(u)}</div>`:""}
      </td>
      <td>${n}</td>
      <td>${c}</td>
      <td class="${r.css}">${r.label}</td>
      <td class="actions-cell" onclick="event.stopPropagation()">
        ${l?`<a href="#" class="freeze-project" data-id="${t.id}" data-status="${t.status}">Freeze</a>`:""}
        ${d?`<a href="#" class="unfreeze-project" data-id="${t.id}">Unfreeze</a>`:""}
        <a href="#" class="danger-link delete-project" data-id="${t.id}" data-title="${Ce(t.title)}">Delete</a>
      </td>
    </tr>
  `}function Le(t,e){return t?t.length>e?t.slice(0,e)+"...":t:""}function Y(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}function Ce(t){return t?t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):""}const xe=["open","frozen","won","lost"];async function pt(t,e){t.innerHTML='<div class="loading">Loading...</div>';try{const[{data:a,error:n},{data:s},{data:r},{data:u}]=await Promise.all([m.from("projects").select("*").eq("id",e).single(),m.from("logs").select("*, contacts(first_name, last_name)").eq("project_id",e).order("logged_at",{ascending:!1}).order("created_at",{ascending:!1}),m.from("contacts").select("id, first_name, last_name").order("last_name"),m.from("companies").select("id, name").order("name")]);if(n||!a){t.innerHTML='<div class="error">Project not found. <a href="#/projects">Back to list</a></div>';return}const l=(s||[]).find(h=>{var f;return(f=h.content)==null?void 0:f.startsWith(">")}),d=l?`<div class="next-step"><span class="next-step-label">NEXT:</span> ${I(l.content.slice(1).trim())} <span class="muted">${ke(l.logged_at)}</span></div>`:"",c=Ot(s||[],"project",{contacts:r||[]});t.innerHTML=`
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

        ${d}

        <div class="inline-fields-vertical">
          <label>Amount <input type="number" id="f-amount" class="input inline-input" value="${a.amount||""}" placeholder="—" step="1"></label>
          <label>Status
            <select id="f-status" class="input inline-input">
              ${xe.map(h=>`<option value="${h}"${a.status===h?" selected":""}>${h.charAt(0).toUpperCase()+h.slice(1)}</option>`).join("")}
            </select>
          </label>
          <label>Expected close <input type="date" id="f-expected" class="input inline-input" value="${a.expected_close||""}">${a.expected_close&&a.expected_close<new Date().toISOString().slice(0,10)?' <strong class="overdue-label">OVERDUE</strong>':""}</label>
          <label>Contact
            <select id="f-contact" class="input inline-input">
              <option value="">—</option>
              ${(r||[]).map(h=>`<option value="${h.id}"${a.contact_id===h.id?" selected":""}>${I(h.first_name)} ${I(h.last_name)}</option>`).join("")}
            </select>
          </label>
          <label>Company
            <select id="f-company" class="input inline-input">
              <option value="">—</option>
              ${(u||[]).map(h=>`<option value="${h.id}"${a.company_id===h.id?" selected":""}>${I(h.name)}</option>`).join("")}
            </select>
          </label>
          <span id="inline-status" class="inline-status"></span>
        </div>

        <div class="section-bar">Log</div>
        ${c}
      </div>
    `;const i=t.querySelector("#inline-status");async function v(h,f){const{error:p}=await m.from("projects").update({[h]:f||null}).eq("id",e);p?(i.textContent="Error",i.style.color="var(--danger)"):(i.textContent="Saved",i.style.color="var(--success)",setTimeout(()=>{i.textContent=""},2e3))}const b=G(()=>v("amount",t.querySelector("#f-amount").value),1e3);t.querySelector("#f-amount").addEventListener("input",b),t.querySelector("#f-status").addEventListener("change",()=>{v("status",t.querySelector("#f-status").value)}),t.querySelector("#f-expected").addEventListener("change",()=>{v("expected_close",t.querySelector("#f-expected").value)}),t.querySelector("#f-contact").addEventListener("change",()=>{v("contact_id",t.querySelector("#f-contact").value)}),t.querySelector("#f-company").addEventListener("change",()=>{v("company_id",t.querySelector("#f-company").value)}),It(t,()=>pt(t,e)),window.addEventListener("log-created",()=>pt(t,e),{once:!0}),t.querySelector("#delete-project").addEventListener("click",async()=>{await z("projects",a,`"${a.title}"`,()=>{window.location.hash="#/projects"},()=>{window.location.hash=`#/projects/${e}`})})}catch(a){t.innerHTML=`<div class="error">Error: ${I(a.message)}</div>`}}function ke(t){if(!t)return"";const e=new Date(t);return`${String(e.getDate()).padStart(2,"0")}.${String(e.getMonth()+1).padStart(2,"0")}.`}function I(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}async function Pt(t,e=null){if(e){window.location.hash=`#/projects/${e}`;return}t.innerHTML=`
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
  `,t.querySelector("#title").focus(),t.querySelector("#project-form").addEventListener("submit",async a=>{a.preventDefault();const n=t.querySelector("#title").value.trim();if(!n){const r=t.querySelector("#err-title");r&&(r.textContent="Required");return}const s=t.querySelector("#submit-btn");s.disabled=!0,s.textContent="Saving...";try{const r=(await m.auth.getUser()).data.user,{data:u,error:l}=await m.from("projects").insert({title:n,status:"open",user_id:r.id}).select().single();if(l)throw l;window.location.hash=`#/projects/${u.id}`}catch(r){t.querySelector("#form-error").textContent="Error: "+r.message,s.disabled=!1,s.textContent="Save"}})}async function Ft(t){var e;t.innerHTML='<div class="loading">Loading...</div>';try{const a=new Date,n=a.toISOString().slice(0,10),s=new Date(a-7*864e5).toISOString().slice(0,10),r=new Date(a-14*864e5).toISOString().slice(0,10),[{data:u},{data:l},{data:d},{data:c},{data:i},{data:v},{data:b}]=await Promise.all([m.from("contacts").select("id, first_name, last_name, email, phone, company_id, starred_at, companies(name)").order("last_name"),m.from("projects").select("id, title, amount, status, expected_close, updated_at, contact_id, contacts(first_name, last_name)").order("title"),m.from("logs").select("contact_id, logged_at, content").not("contact_id","is",null).order("logged_at",{ascending:!1}),m.from("logs").select("project_id, logged_at, content").not("project_id","is",null).order("logged_at",{ascending:!1}),m.from("logs").select("id, contact_id, logged_at").gte("logged_at",s),m.from("logs").select("id").gte("logged_at",r).lt("logged_at",s),m.from("projects").select("id, title, amount, updated_at").eq("status","won").gte("updated_at",new Date(a-7*864e5).toISOString())]),h=new Map;for(const o of d||[])o.contact_id&&!h.has(o.contact_id)&&h.set(o.contact_id,{date:o.logged_at,content:o.content});const f=new Map;for(const o of c||[])o.project_id&&!f.has(o.project_id)&&f.set(o.project_id,{date:o.logged_at,content:o.content});const p=(u||[]).map(o=>{const y=h.get(o.id);return{...o,temp:U(y==null?void 0:y.date),lastContent:(y==null?void 0:y.content)||""}}),g=(l||[]).filter(o=>o.status==="open"||o.status==="frozen").map(o=>{const y=f.get(o.id);return{...o,temp:U(y==null?void 0:y.date),lastContent:(y==null?void 0:y.content)||""}}),w=p.filter(o=>o.temp.css==="temp-hot").length,j=p.filter(o=>o.temp.css==="temp-warm").length,L=p.filter(o=>o.temp.css==="temp-cold"||o.temp.css==="temp-dead").length,S=(l||[]).filter(o=>o.status==="open"),$=(l||[]).filter(o=>o.status==="frozen"),_=S.reduce((o,y)=>o+(parseFloat(y.amount)||0),0),C=$.reduce((o,y)=>o+(parseFloat(y.amount)||0),0),x=_+C,zt=(i||[]).length,Bt=new Set((i||[]).filter(o=>o.contact_id).map(o=>o.contact_id)).size,vt=(v||[]).length,Rt=new Set((i||[]).map(o=>o.logged_at));let nt=0;for(let o=0;o<7;o++){const y=new Date(a-o*864e5).toISOString().slice(0,10);if(Rt.has(y))nt++;else break}const gt=(b||[]).length>0?(b||[]).map(o=>`Won: ${q(o.title)} (${F(parseFloat(o.amount)||0)})`).join(" &middot; "):"",ot=p.filter(o=>o.temp.days===null).length,N=p.filter(o=>!o.email||!o.phone||!o.company_id).length,ht=g.filter(o=>o.expected_close&&o.expected_close<n),Vt=new Date(a-7*864e5).toISOString(),yt=p.filter(o=>{var Z;if(!o.starred_at||o.starred_at<Vt)return!1;const y=(Z=h.get(o.id))==null?void 0:Z.date;return!(y&&new Date(y)>new Date(o.starred_at))}),bt=p.filter(o=>o.temp.days!==null&&o.temp.days>=14&&o.temp.days<60).sort((o,y)=>y.temp.days-o.temp.days).slice(0,5),rt=[],$t=new Set;for(const o of d||[])if((e=o.content)!=null&&e.startsWith(">")&&o.contact_id&&!$t.has(o.contact_id)){$t.add(o.contact_id);const y=p.find(Z=>Z.id===o.contact_id);y&&rt.push({contact:y,content:o.content.slice(1).trim(),date:o.logged_at})}const wt=[...p].sort((o,y)=>(y.temp.days??9999)-(o.temp.days??9999)).slice(0,15),St=[...g].sort((o,y)=>(y.temp.days??9999)-(o.temp.days??9999)).slice(0,15),Kt=x>0?Math.round(_/x*100):0,ct=(l||[]).filter(o=>o.status==="won"||o.status==="lost"),_t=(l||[]).filter(o=>o.status==="won").length,ze=(l||[]).filter(o=>o.status==="won").reduce((o,y)=>o+(parseFloat(y.amount)||0),0),qt=ct.length>0?Math.round(_t/ct.length*100):0,jt=p.filter(o=>o.temp.days!==null&&o.temp.days<30).length,Yt=p.length>0?Math.round(jt/p.length*100):0;t.innerHTML=`
      <div class="detail-page">
        <div class="dashboard-pulse">
          <span>${p.length} contacts &middot; <span class="temp-hot">${w} active</span> &middot; ${j} warm &middot; <strong>${L} cold</strong></span>
          <span>${S.length} open (${F(_)}) &middot; ${$.length} frozen (${F(C)})${gt?` &middot; ${gt}`:""}</span>
          <span>This week: ${zt} logs &middot; ${Bt} contacts${vt?` &middot; last week: ${vt}`:""}${nt>1?` &middot; ${nt}-day streak`:""}</span>
        </div>

        <div class="dashboard-main">
          <div class="dashboard-content">
            ${yt.length>0?`
            <div class="dashboard-starred">
              ${yt.map(o=>`
                <span class="starred-item clickable-row" data-href="#/contacts/${o.id}">★ <strong>${q(o.first_name)} ${q(o.last_name)}</strong></span>
              `).join("")}
            </div>
            `:""}

            ${bt.length>0||ot>0||N>0||ht.length>0?`
            <div class="dashboard-nudges">
              ${bt.map(o=>`
                <span class="nudge-item clickable-row" data-href="#/contacts/${o.id}"><strong>${q(o.first_name)} ${q(o.last_name)}</strong> ─── ${o.temp.label} without contact</span>
              `).join("")}
              ${ht.map(o=>`
                <span class="nudge-item clickable-row" data-href="#/projects/${o.id}"><strong>${q(o.title)}</strong> ─── OVERDUE (exp. ${o.expected_close})</span>
              `).join("")}
              ${ot>0?`<span class="nudge-meta clickable-row" data-href="#/contacts">${ot} contacts with zero history</span>`:""}
              ${N>0?`<span class="nudge-meta clickable-row" data-href="#/contacts">${N} incomplete contacts</span>`:""}
            </div>
            `:""}

            ${rt.length>0?`
            <div class="dashboard-nextsteps">
              <div class="section-bar">Next steps</div>
              ${rt.slice(0,5).map(o=>`
                <div class="next-step clickable-row" data-href="#/contacts/${o.contact.id}">
                  <strong>${q(o.contact.first_name)} ${q(o.contact.last_name)}</strong>: ${q(o.content)}
                </div>
              `).join("")}
            </div>
            `:""}

            <div class="dashboard-radar">
              <div class="dashboard-radar-col">
                <div class="section-bar section-bar-contacts">Contacts</div>
                ${wt.length===0?'<div class="empty-state">No logged contacts.</div>':`<div class="table-wrap">
                    <table class="data-table">
                      <thead><tr><th>Name</th><th>Company</th><th>Temp</th></tr></thead>
                      <tbody>
                        ${wt.map(o=>{var y;return`
                          <tr class="clickable-row ${o.temp.css}" data-href="#/contacts/${o.id}">
                            <td>
                              <strong>${q(o.first_name)} ${q(o.last_name)}</strong>
                              ${o.lastContent?`<div class="log-snippet">${q(At(o.lastContent,40))}</div>`:""}
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
                ${St.length===0?'<div class="empty-state">No open projects.</div>':`<div class="table-wrap">
                    <table class="data-table">
                      <thead><tr><th>Project</th><th>Value</th><th>Contact</th><th>Temp</th></tr></thead>
                      <tbody>
                        ${St.map(o=>`
                          <tr class="clickable-row ${o.temp.css}" data-href="#/projects/${o.id}">
                            <td>
                              <strong>${q(o.title)}</strong>
                              ${o.lastContent?`<div class="log-snippet">${q(At(o.lastContent,40))}</div>`:""}
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
              <span>Open ${F(_)} / ${F(x)}</span>
              <div class="progress-bar">${Q(Kt)}</div>
            </div>

            <div class="section-bar" style="margin-top:0.75rem">System health</div>
            <div class="progress-item clickable-row" data-href="#/contacts">
              <span>Contacts alive ${jt}/${p.length}</span>
              <div class="progress-bar">${Q(Yt)}</div>
            </div>
            <div class="progress-item">
              <span>Win rate ${qt}% (${_t}/${ct.length})</span>
              <div class="progress-bar">${Q(qt)}</div>
            </div>
            ${N>0?`
            <div class="progress-item clickable-row" data-href="#/contacts">
              <span>Complete ${p.length-N}/${p.length}</span>
              <div class="progress-bar">${Q(Math.round((p.length-N)/Math.max(p.length,1)*100))}</div>
            </div>`:""}
          </div>
        </div>
      </div>
    `,window.addEventListener("log-created",()=>Ft(t),{once:!0}),t.querySelectorAll(".clickable-row").forEach(o=>{o.addEventListener("click",()=>{const y=o.dataset.href;y&&(window.location.hash=y)})})}catch(a){t.innerHTML=`<div class="error">Error: ${q(a.message)}</div>`}}function Q(t){const a=Math.round(t/100*20),n=20-a;return"█".repeat(a)+"░".repeat(n)+` ${t}%`}function F(t){return t?`${Math.round(t/1e3)}K`:"0"}function At(t,e){return t?t.length>e?t.slice(0,e)+"...":t:""}function q(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}let B="notes";async function Wt(t){t.innerHTML='<div class="loading">Loading...</div>';try{const e=(await m.auth.getUser()).data.user;t.innerHTML=`
      <div class="page-header">
        <h1>Extra</h1>
      </div>
      <div class="extra-tabs">
        <a href="#" class="extra-tab${B==="notes"?" active":""}" data-tab="notes">Notes</a>
        <a href="#" class="extra-tab${B==="export"?" active":""}" data-tab="export">Export</a>
      </div>
      <div id="extra-content"></div>
    `,t.querySelectorAll(".extra-tab").forEach(n=>{n.addEventListener("click",s=>{s.preventDefault(),B=n.dataset.tab,Wt(t)})});const a=t.querySelector("#extra-content");B==="notes"?await Me(a,e):B==="export"&&await Te(a,e)}catch(e){t.innerHTML=`<div class="error">Error: ${Ut(e.message)}</div>`}}async function Me(t,e){const{data:a}=await m.from("inbox").select("content").eq("user_id",e.id).single(),n=(a==null?void 0:a.content)||"";let s=!!a;t.innerHTML=`
    <div class="notes-toolbar">
      <button id="add-timestamp-btn" class="btn btn-sm btn-secondary">Add timestamp</button>
      <span id="inbox-status"></span>
      <button id="inbox-save" class="btn btn-sm btn-primary">Save</button>
    </div>
    <textarea id="inbox-content" class="input inbox-textarea">${Ut(n)}</textarea>
  `,t.querySelector("#inbox-save").addEventListener("click",async()=>{const r=t.querySelector("#inbox-content").value,u=new Date().toISOString();let l;s?{error:l}=await m.from("inbox").update({content:r,updated_at:u}).eq("user_id",e.id):({error:l}=await m.from("inbox").insert({user_id:e.id,content:r,updated_at:u}),l||(s=!0));const d=t.querySelector("#inbox-status");l?(d.textContent="Error: "+l.message,d.style.color="var(--danger)"):(d.textContent="Saved",d.style.color="var(--success)",setTimeout(()=>{d.textContent=""},2e3))}),t.querySelector("#add-timestamp-btn").addEventListener("click",()=>{const r=t.querySelector("#inbox-content"),u=De(new Date),l=r.selectionStart,d=r.value.substring(0,l),c=r.value.substring(l),i=d&&!d.endsWith(`
`)?`
`:"";r.value=d+i+u+`
`+c;const v=d.length+i.length+u.length+1;r.focus(),r.setSelectionRange(v,v)})}async function Te(t){t.innerHTML=`
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
  `,t.querySelector("#export-json").addEventListener("click",async()=>{const e=t.querySelector("#export-json"),a=t.querySelector("#status-json");e.disabled=!0,a.textContent="Exporting...";try{const n=["contacts","companies","projects","inbox","logs"],s={exported_at:new Date().toISOString(),tables:{}};for(const r of n){const{data:u,error:l}=await m.from(r).select("*");if(l)throw new Error(`${r}: ${l.message}`);s.tables[r]=u||[]}lt(`crm-export-${R()}.json`,JSON.stringify(s,null,2),"application/json"),a.textContent="Done",a.style.color="var(--success)"}catch(n){a.textContent="Error: "+n.message,a.style.color="var(--danger)"}finally{e.disabled=!1}}),t.querySelector("#export-contacts-md").addEventListener("click",async()=>{var n;const e=t.querySelector("#export-contacts-md"),a=t.querySelector("#status-contacts-md");e.disabled=!0,a.textContent="Exporting...";try{const{data:s}=await m.from("contacts").select("*, companies(name)").order("last_name"),{data:r}=await m.from("logs").select("contact_id, logged_at, content").not("contact_id","is",null).order("logged_at",{ascending:!1}),u=new Map;for(const d of r||[])d.contact_id&&!u.has(d.contact_id)&&u.set(d.contact_id,d);let l=`# Contacts

Exported: ${R()}

`;for(const d of s||[]){l+=`## ${d.first_name} ${d.last_name}
`,(n=d.companies)!=null&&n.name&&(l+=`- Company: ${d.companies.name}
`),d.email&&(l+=`- Email: ${d.email}
`),d.phone&&(l+=`- Phone: ${d.phone}
`);const c=u.get(d.id);c&&(l+=`- Last log (${c.logged_at}): ${c.content}
`),l+=`
`}lt(`contacts-${R()}.md`,l,"text/markdown"),a.textContent="Done",a.style.color="var(--success)"}catch(s){a.textContent="Error: "+s.message,a.style.color="var(--danger)"}finally{e.disabled=!1}}),t.querySelector("#export-projects-md").addEventListener("click",async()=>{var n;const e=t.querySelector("#export-projects-md"),a=t.querySelector("#status-projects-md");e.disabled=!0,a.textContent="Exporting...";try{const{data:s}=await m.from("projects").select("*, contacts(first_name, last_name), companies(name)").in("status",["open","frozen"]).order("title"),{data:r}=await m.from("logs").select("project_id, logged_at, content").not("project_id","is",null).order("logged_at",{ascending:!1}),u=new Map;for(const d of r||[])d.project_id&&!u.has(d.project_id)&&u.set(d.project_id,d);let l=`# Open Projects

Exported: ${R()}

`;for(const d of s||[]){const c=d.amount?`${Math.round(parseFloat(d.amount)/1e3)}K`:"-";l+=`## ${d.title} (${d.status}, ${c})
`,d.contacts&&(l+=`- Contact: ${d.contacts.first_name} ${d.contacts.last_name}
`),(n=d.companies)!=null&&n.name&&(l+=`- Company: ${d.companies.name}
`),d.expected_close&&(l+=`- Expected close: ${d.expected_close}
`);const i=u.get(d.id);i&&(l+=`- Last log (${i.logged_at}): ${i.content}
`),l+=`
`}lt(`projects-open-${R()}.md`,l,"text/markdown"),a.textContent="Done",a.style.color="var(--success)"}catch(s){a.textContent="Error: "+s.message,a.style.color="var(--danger)"}finally{e.disabled=!1}})}function lt(t,e,a){const n=new Blob([e],{type:a}),s=URL.createObjectURL(n),r=document.createElement("a");r.href=s,r.download=t,r.click(),URL.revokeObjectURL(s)}function R(){return new Date().toISOString().slice(0,10)}function De(t){const e=String(t.getDate()).padStart(2,"0"),a=String(t.getMonth()+1).padStart(2,"0"),n=t.getFullYear();return`${e}.${a}.${n}`}function Ut(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}async function Pe(t){t.innerHTML='<div class="loading">Loading...</div>';try{const[{data:e},{data:a},{data:n}]=await Promise.all([m.from("contacts").select("id, first_name, last_name").order("last_name"),m.from("companies").select("id, name").order("name"),m.from("projects").select("id, title").order("title")]);t.innerHTML=`
      <div class="form-page">
        <h1>New Record</h1>

        <form id="combo-form" class="card form-card" novalidate>
          <div class="form-group">
            <label for="c-pick">Contact</label>
            <div class="combo-or-new">
              <select id="c-pick" class="input">
                <option value="">-- pick existing --</option>
                ${(e||[]).map(s=>`<option value="${s.id}">${V(s.first_name)} ${V(s.last_name)}</option>`).join("")}
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
                ${(a||[]).map(s=>`<option value="${s.id}">${V(s.name)}</option>`).join("")}
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
                ${(n||[]).map(s=>`<option value="${s.id}">${V(s.title)}</option>`).join("")}
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
    `,t.querySelector("#c-pick").addEventListener("change",()=>{t.querySelector("#c-pick").value&&(t.querySelector("#c-first").value="",t.querySelector("#c-last").value="")}),t.querySelector("#c-first").addEventListener("input",()=>{t.querySelector("#c-first").value&&(t.querySelector("#c-pick").value="")}),t.querySelector("#c-last").addEventListener("input",()=>{t.querySelector("#c-last").value&&(t.querySelector("#c-pick").value="")}),t.querySelector("#co-pick").addEventListener("change",()=>{t.querySelector("#co-pick").value&&(t.querySelector("#co-new").value="")}),t.querySelector("#co-new").addEventListener("input",()=>{t.querySelector("#co-new").value&&(t.querySelector("#co-pick").value="")}),t.querySelector("#p-pick").addEventListener("change",()=>{t.querySelector("#p-pick").value&&(t.querySelector("#p-new").value="")}),t.querySelector("#p-new").addEventListener("input",()=>{t.querySelector("#p-new").value&&(t.querySelector("#p-pick").value="")}),t.querySelector("#combo-form").addEventListener("submit",async s=>{s.preventDefault(),He(t);const r=t.querySelector("#c-pick").value,u=t.querySelector("#c-first").value.trim(),l=t.querySelector("#c-last").value.trim();if(!r&&(!u||!l)){Ae(t,"c-contact","Pick existing or enter first + last name");return}const d=t.querySelector("#combo-submit");d.disabled=!0,d.textContent="Saving...";try{const c=(await m.auth.getUser()).data.user;let i=t.querySelector("#co-pick").value||null,v=t.querySelector("#p-pick").value||null;const b=t.querySelector("#co-new").value.trim();if(b&&!i){const{data:g,error:w}=await m.from("companies").insert({name:b,user_id:c.id}).select().single();if(w)throw w;i=g.id}let h;if(r){const{data:g}=await m.from("contacts").select("id").eq("id",r).single();h=g,i&&await m.from("contacts").update({company_id:i}).eq("id",r)}else{const{data:g,error:w}=await m.from("contacts").insert({first_name:u,last_name:l,company_id:i,user_id:c.id}).select().single();if(w)throw w;h=g}const f=t.querySelector("#p-new").value.trim();if(f&&!v){const{data:g,error:w}=await m.from("projects").insert({title:f,status:"open",contact_id:h.id,company_id:i,user_id:c.id}).select().single();if(w)throw w;v=g.id}else v&&await m.from("projects").update({contact_id:h.id,company_id:i||void 0}).eq("id",v);const p=t.querySelector("#c-log").value.trim();p&&await m.from("logs").insert({user_id:c.id,contact_id:h.id,project_id:v||null,content:p,logged_at:new Date().toISOString().slice(0,10)}),window.location.hash=`#/contacts/${h.id}`}catch(c){t.querySelector("#combo-error").textContent="Error: "+c.message,d.disabled=!1,d.textContent="Save"}})}catch(e){t.innerHTML=`<div class="error">Error: ${V(e.message)}</div>`}}function Ae(t,e,a){const n=t.querySelector(`#err-${e}`);n&&(n.textContent=a)}function He(t){t.querySelectorAll(".field-error").forEach(e=>e.textContent=""),t.querySelector("#combo-error").textContent=""}function V(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}async function Ne(t){t.innerHTML='<div class="loading">Loading...</div>';try{const{data:e}=await m.from("projects").select("id, title, amount, status, updated_at, contact_id, contacts(first_name, last_name)").in("status",["won","lost"]).order("updated_at",{ascending:!1}),a=e||[],n=new Set;for(const c of a)if(c.updated_at){const i=new Date(c.updated_at);n.add(`${i.getFullYear()}-${String(i.getMonth()+1).padStart(2,"0")}`)}const s=Array.from(n).sort().reverse(),r=a.filter(c=>c.status==="won"),u=a.filter(c=>c.status==="lost"),l=new Set;for(const c of a)c.updated_at&&l.add(new Date(c.updated_at).getFullYear());const d=Array.from(l).sort().reverse().map(c=>{const i=r.filter(g=>new Date(g.updated_at).getFullYear()===c),v=u.filter(g=>new Date(g.updated_at).getFullYear()===c),b=i.reduce((g,w)=>g+(parseFloat(w.amount)||0),0),h=v.reduce((g,w)=>g+(parseFloat(w.amount)||0),0),f=i.length+v.length,p=f>0?Math.round(i.length/f*100):0;return`${c}: ${i.length} won (${mt(b)}) &middot; ${v.length} lost (${mt(h)}) &middot; win rate ${p}%`});t.innerHTML=`
      <div class="page-header">
        <h1>Heroes & Zeroes</h1>
        <div class="header-actions">
          <select id="month-filter" class="input">
            <option value="all">All time</option>
            ${s.map(c=>`<option value="${c}">${Oe(c)}</option>`).join("")}
          </select>
        </div>
      </div>

      <div class="heroes-stats">
        ${d.map(c=>`<div>${c}</div>`).join("")}
      </div>

      <div class="heroes-grid">
        <div class="heroes-col">
          <div class="section-bar section-bar-contacts">HEROES</div>
          ${r.length===0?'<div class="empty-state">No wins yet.</div>':`<div class="table-wrap">
              <table class="data-table" id="heroes-table">
                <thead><tr><th>Project</th><th>Value</th><th>Contact</th><th>Date</th></tr></thead>
                <tbody>
                  ${r.map(c=>Ht(c)).join("")}
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
                  ${u.map(c=>Ht(c)).join("")}
                </tbody>
              </table>
            </div>`}
        </div>
      </div>
    `,t.querySelector("#month-filter").addEventListener("change",c=>{const i=c.target.value;t.querySelectorAll("#heroes-table tbody tr, #zeroes-table tbody tr").forEach(b=>{i==="all"?b.style.display="":b.style.display=b.dataset.month===i?"":"none"})}),t.querySelectorAll(".clickable-row").forEach(c=>{c.addEventListener("click",()=>{window.location.hash=`#/projects/${c.dataset.id}`})})}catch(e){t.innerHTML=`<div class="error">Error: ${st(e.message)}</div>`}}function Ht(t){const e=t.updated_at?new Date(t.updated_at):null,a=e?`${String(e.getDate()).padStart(2,"0")}.${String(e.getMonth()+1).padStart(2,"0")}.${e.getFullYear()}`:"-",n=e?`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}`:"",s=t.contacts?`${st(t.contacts.first_name)} ${st(t.contacts.last_name)}`:"-";return`
    <tr class="clickable-row" data-id="${t.id}" data-month="${n}">
      <td><strong>${st(t.title)}</strong></td>
      <td>${t.amount?mt(parseFloat(t.amount)):"-"}</td>
      <td>${s}</td>
      <td>${a}</td>
    </tr>
  `}function mt(t){return t?`${Math.round(t/1e3)}K`:"0"}function Oe(t){const[e,a]=t.split("-");return`${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(a)]} ${e}`}function st(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}async function Ie(t,e={}){if(t)try{const[{data:a},{data:n}]=await Promise.all([m.from("contacts").select("id, first_name, last_name").order("last_name"),m.from("projects").select("id, title").order("title")]),s=new Date().toISOString().slice(0,10);t.innerHTML=`
      <div class="quick-entry">
        <input type="text" id="qe-content" class="input qe-input" placeholder="What happened? Start with > for next step">
        <select id="qe-contact" class="input qe-select">
          <option value="">-- contact --</option>
          ${(a||[]).map(r=>`<option value="${r.id}">${dt(r.first_name)} ${dt(r.last_name)}</option>`).join("")}
        </select>
        <select id="qe-project" class="input qe-select">
          <option value="">-- project --</option>
          ${(n||[]).map(r=>`<option value="${r.id}">${dt(r.title)}</option>`).join("")}
        </select>
        <input type="date" id="qe-date" class="input qe-date" value="${s}">
        <button id="qe-save" class="btn btn-sm btn-primary">Log</button>
        <span id="qe-status" class="qe-status"></span>
      </div>
    `,e.contactId&&(t.querySelector("#qe-contact").value=e.contactId),e.projectId&&(t.querySelector("#qe-project").value=e.projectId),t.querySelector("#qe-save").addEventListener("click",async()=>{const r=t.querySelector("#qe-content").value.trim();if(!r)return;const u=t.querySelector("#qe-status"),l=t.querySelector("#qe-contact").value,d=t.querySelector("#qe-project").value,c=t.querySelector("#qe-date").value;if(!l&&!d){u.textContent="Select contact or project",u.style.color="var(--danger)";return}const i=(await m.auth.getUser()).data.user;if(!i)return;const{error:v}=await m.from("logs").insert({user_id:i.id,content:r,contact_id:l||null,project_id:d||null,logged_at:c||s});v?(u.textContent="Error",u.style.color="var(--danger)"):(u.textContent="Saved",u.style.color="var(--success)",t.querySelector("#qe-content").value="",setTimeout(()=>{u.textContent=""},2e3),window.dispatchEvent(new CustomEvent("log-created")))}),t.querySelector("#qe-content").addEventListener("keydown",r=>{r.key==="Enter"&&!r.shiftKey&&(r.preventDefault(),t.querySelector("#qe-save").click())})}catch{t.innerHTML=""}}function dt(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}const E=document.getElementById("app"),ut=document.getElementById("quick-entry");let J=null;function Fe(){return(window.location.hash.replace(/^#\/?/,"")||"").split("/").filter(Boolean)}async function ft(){if(!J){document.getElementById("nav").style.display="none",ut.style.display="none",ae(E);return}ut.style.display="",document.getElementById("nav").style.display="",await We();const t=Fe();t[0]==="contacts"&&t[1]==="new"?await kt(E):t[0]==="contacts"&&t[1]&&t[2]==="edit"?await kt(E,t[1]):t[0]==="contacts"&&t[1]?await et(E,t[1]):t[0]==="companies"&&t[1]==="new"?await we(E):t[0]==="companies"&&t[1]&&t[2]==="edit"?window.location.hash=`#/companies/${t[1]}`:t[0]==="companies"&&t[1]?await ye(E,t[1]):t[0]==="companies"?await at(E):t[0]==="projects"&&t[1]==="new"?await Pt(E):t[0]==="projects"&&t[1]&&t[2]==="edit"?await Pt(E,t[1]):t[0]==="projects"&&t[1]?await pt(E,t[1]):t[0]==="projects"?await K(E):t[0]==="contacts"?await tt(E):t[0]==="combo"?await Pe(E):t[0]==="heroes"?await Ne(E):t[0]==="extra"?await Wt(E):await Ft(E);const e={};t[0]==="contacts"&&t[1]&&t[1]!=="new"&&t[2]!=="edit"?e.contactId=t[1]:t[0]==="projects"&&t[1]&&t[1]!=="new"&&t[2]!=="edit"&&(e.projectId=t[1]),Ie(ut,e)}async function We(){const t=document.getElementById("nav"),e=window.location.hash||"#/";let a="";try{const{data:n}=await m.from("projects").select("amount").in("status",["open"]),s=(n||[]).reduce((u,l)=>u+(parseFloat(l.amount)||0),0),r=Math.round(s/1e3);r>0&&(a=` (${r}k)`)}catch{a=""}t.innerHTML=`
    <div class="nav-inner">
      <div class="nav-left">
        <a href="#/" class="nav-brand">CRM Mini</a>
        <a href="#/projects" class="nav-link${e.startsWith("#/projects")?" active":""}">Projects${a}</a>
        <a href="#/contacts" class="nav-link${e.startsWith("#/contacts")?" active":""}">Contacts</a>
        <a href="#/companies" class="nav-link${e.startsWith("#/companies")?" active":""}">Companies</a>
        <a href="#/heroes" class="nav-link${e.startsWith("#/heroes")?" active":""}">Heroes</a>
        <a href="#/combo" class="nav-link${e.startsWith("#/combo")?" active":""}">+ Combo</a>
        <a href="#/extra" class="nav-link${e.startsWith("#/extra")?" active":""}">Extra</a>
      </div>
      <div class="nav-right">
        <span class="nav-user">${Ue(J.email)}</span>
        <button id="sign-out-btn" class="btn btn-sm btn-secondary">Sign out</button>
      </div>
    </div>
  `,t.querySelector("#sign-out-btn").addEventListener("click",async()=>{await Qt(),window.location.hash="#/"})}ee(t=>{J=t,ft()});window.addEventListener("hashchange",()=>{J&&ft()});(async()=>(J=await te(),ft()))();function Ue(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}
