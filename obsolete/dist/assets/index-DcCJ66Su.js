(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))o(n);new MutationObserver(n=>{for(const r of n)if(r.type==="childList")for(const u of r.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&o(u)}).observe(document,{childList:!0,subtree:!0});function a(n){const r={};return n.integrity&&(r.integrity=n.integrity),n.referrerPolicy&&(r.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?r.credentials="include":n.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(n){if(n.ep)return;n.ep=!0;const r=a(n);fetch(n.href,r)}})();const ke="https://juquttlvkairdgdkzpke.supabase.co",De="sb_publishable_tKbsPXd1ZbT5E0Am7oAA6w_GMjeM1Is",{createClient:Te}=supabase,g=Te(ke,De);async function Me(){const{error:t}=await g.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin+window.location.pathname}});if(t)throw t}async function Ae(){const{error:t}=await g.auth.signOut();if(t)throw t}async function Pe(){const{data:{user:t}}=await g.auth.getUser();return t}function He(t){return g.auth.onAuthStateChange((e,a)=>{t((a==null?void 0:a.user)??null)})}const j="black",M="brown",Vt="dgray",Ne="white",$=(t,e)=>`<span class="${t}">${"▓".repeat(e)}</span>`,Kt={default:[$(j,2)+$(M,2)+$(j,2)+$(M,2)+$(j,10),$(j,2)+$(M,6)+$(j,10),$(j,2)+$(Vt,2)+$(Ne,2)+$(Vt,2)+$(j,10),$(j,2)+$(M,6)+$(j,10),$(j,2)+$(M,6)+$(j,10),$(j,2)+$(M,12)+$(j,4),$(j,2)+$(M,14)+$(j,2),$(j,2)+$(M,2)+$(j,2)+$(M,2)+$(j,4)+$(M,2)+$(j,4),$(j,2)+$(M,2)+$(j,2)+$(M,2)+$(j,4)+$(M,2)+$(j,4)].join(`
`)};let Ie="default";function Oe(t){return Kt[Ie]||Kt.default}function We(t){t.innerHTML=`
    <div class="login-page">
      <h1>BREVIS</h1>
      <p>Sign in to manage your contacts</p>
      <button id="google-login" class="btn btn-primary">Sign in with Google</button>
    </div>`,t.querySelector("#google-login").addEventListener("click",async()=>{try{await Me()}catch(e){alert("Login failed: "+e.message)}})}function st(t,e=300){let a;return(...o)=>{clearTimeout(a),a=setTimeout(()=>t(...o),e)}}function Ue(t,e){const a=new Map;for(const c of e)a.set(c.id,c.name);const o=["First Name","Last Name","Email","Phone","Company","Notes","Created"],n=t.map(c=>[c.first_name,c.last_name,c.email||"",c.phone||"",c.company_id&&a.get(c.company_id)||"",(c.notes||"").replace(/\n/g," "),c.created_at?new Date(c.created_at).toLocaleDateString():""]),r=c=>{const p=String(c);return p.includes(",")||p.includes('"')||p.includes(`
`)?'"'+p.replace(/"/g,'""')+'"':p},u=[o,...n].map(c=>c.map(r).join(",")).join(`\r
`),d=new Blob(["\uFEFF"+u],{type:"text/csv;charset=utf-8;"}),l=URL.createObjectURL(d),i=document.createElement("a");i.href=l,i.download=`contacts_${new Date().toISOString().slice(0,10)}.csv`,i.click(),URL.revokeObjectURL(l)}function G(t){if(!t)return{days:null,css:"temp-dead",label:"! -"};const e=Math.floor((Date.now()-new Date(t).getTime())/864e5);return e<7?{days:e,css:"temp-hot",label:`· ${e}d`}:e<30?{days:e,css:"temp-warm",label:`${e}d`}:e<60?{days:e,css:"temp-cold",label:`* ${e}d`}:{days:e,css:"temp-dead",label:`! ${e}d`}}function Fe(){return'<span class="temp-legend">· fresh &nbsp; normal &nbsp; * cooling &nbsp; ! cold</span>'}const Gt=["open"];let W={col:"last_name",asc:!0},I="",O="all";async function ze(){let t=g.from("contacts").select("*, companies(name)");I&&(t=t.or(`first_name.ilike.%${I}%,last_name.ilike.%${I}%,email.ilike.%${I}%,notes.ilike.%${I}%`)),O==="with_email"&&(t=t.not("email","is",null).neq("email","")),O==="with_phone"&&(t=t.not("phone","is",null).neq("phone","")),O==="with_company"&&(t=t.not("company_id","is",null)),t=t.order(W.col,{ascending:W.asc});const{data:e,error:a}=await t;if(a)throw a;return e||[]}async function Be(){const{data:t}=await g.from("companies").select("id, name").order("name");return t||[]}async function Re(){const{data:t}=await g.from("logs").select("contact_id, logged_at, content").not("contact_id","is",null).order("logged_at",{ascending:!1}),e=new Map;for(const a of t||[])e.has(a.contact_id)||e.set(a.contact_id,{date:a.logged_at,content:a.content});return Array.from(e.entries()).map(([a,o])=>({contact_id:a,last_date:o.date,content:o.content}))}async function Ve(){const{data:t}=await g.from("projects").select("contact_id").in("status",Gt).not("contact_id","is",null),{data:e}=await g.from("projects").select("company_id").in("status",Gt).not("company_id","is",null),a=new Set((t||[]).map(n=>n.contact_id)),o=new Set((e||[]).map(n=>n.company_id));return{contactsWithDeals:a,companiesWithDeals:o}}function qt(t){return W.col!==t?"":W.asc?" ↑":" ↓"}async function dt(t){t.innerHTML='<div class="loading">Loading contacts...</div>';try{const[e,a,o,n]=await Promise.all([ze(),Be(),Ve(),Re()]),r=new Map;for(const c of n)c.contact_id&&r.set(c.contact_id,{date:c.last_date,content:c.content});const u=e.filter(c=>o.contactsWithDeals.has(c.id)||c.company_id&&o.companiesWithDeals.has(c.company_id)).sort((c,p)=>{const m=(c.last_name||"").localeCompare(p.last_name||"");return m!==0?m:(c.first_name||"").localeCompare(p.first_name||"")}),d=e.filter(c=>!o.contactsWithDeals.has(c.id)&&!(c.company_id&&o.companiesWithDeals.has(c.company_id))).sort((c,p)=>{const m=(c.last_name||"").localeCompare(p.last_name||"");return m!==0?m:(c.first_name||"").localeCompare(p.first_name||"")});t.innerHTML=`
      <div class="page-header">
        <h1>Contacts <span class="badge">${e.length}</span></h1>
        <div class="header-actions">
          <button id="csv-export" class="btn btn-secondary">Export CSV</button>
          <a href="https://www.icloud.com/contacts/" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Contacts</a>
          <a href="#/contacts/new" class="btn btn-primary">+ New Contact</a>
        </div>
      </div>

      <div class="toolbar">
        <input type="search" id="search-input" class="input" placeholder="Search name, email, notes..." value="${ue(I)}">
        <select id="filter-select" class="input">
          <option value="all"${O==="all"?" selected":""}>All contacts</option>
          <option value="with_email"${O==="with_email"?" selected":""}>With email</option>
          <option value="with_phone"${O==="with_phone"?" selected":""}>With phone</option>
          <option value="with_company"${O==="with_company"?" selected":""}>With company</option>
        </select>
      </div>

      ${Ke(u,d,r)}
    `;const l=t.querySelector("#search-input"),i=st(async()=>{I=l.value.trim(),await dt(t)},350);l.addEventListener("input",i),t.querySelector("#filter-select").addEventListener("change",async c=>{O=c.target.value,await dt(t)}),t.querySelectorAll(".sortable").forEach(c=>{c.addEventListener("click",async()=>{const p=c.dataset.col;W.col===p?W.asc=!W.asc:W={col:p,asc:!0},await dt(t)})}),t.querySelectorAll(".clickable-row").forEach(c=>{c.addEventListener("click",()=>{window.location.hash=`#/contacts/${c.dataset.id}`})}),t.querySelector("#csv-export").addEventListener("click",()=>{Ue(e,a)}),I&&(l.focus(),l.setSelectionRange(l.value.length,l.value.length))}catch(e){t.innerHTML=`<div class="error">Error: ${B(e.message)}</div>`}}function Ke(t,e,a){let o="";return t.length>0&&(o+=`
      <div class="deal-group">
        <h2 class="group-heading">Open Projects <span class="badge">${t.length}</span></h2>
        ${Zt(t,a)}
      </div>
    `),e.length>0&&(o+=`
      <div class="deal-group">
        <h2 class="group-heading">Other <span class="badge">${e.length}</span></h2>
        ${Zt(e,a)}
      </div>
    `),t.length===0&&e.length===0&&(o='<div class="empty-state">No contacts. <a href="#/contacts/new">Create first</a>.</div>'),o}function Zt(t,e){return`
    <div class="table-wrap">
      <table class="data-table table-contacts">
        <thead>
          <tr>
            <th class="sortable" data-col="last_name">Name${qt("last_name")}</th>
            <th class="sortable" data-col="email">Email${qt("email")}</th>
            <th class="sortable" data-col="phone">Phone${qt("phone")}</th>
            <th>Company</th>
            <th>Temp</th>
          </tr>
        </thead>
        <tbody>
          ${t.map(a=>{var d;const o=e.get(a.id),n=G(o==null?void 0:o.date),r=o!=null&&o.content?Ge(o.content,80):"",u=!a.email||!a.phone||!a.company_id;return`
            <tr class="clickable-row ${n.css}" data-id="${a.id}">
              <td>
                <strong>${B(a.first_name)} ${B(a.last_name)}</strong>${u?' <span class="incomplete-badge">[!]</span>':""}
                ${r?`<div class="log-snippet">${B(r)}</div>`:""}
              </td>
              <td>${a.email?`<a href="mailto:${ue(a.email)}" onclick="event.stopPropagation()">${B(a.email)}</a>`:'<span class="muted">-</span>'}</td>
              <td>${a.phone?B(a.phone):'<span class="muted">-</span>'}</td>
              <td>${(d=a.companies)!=null&&d.name?B(a.companies.name):'<span class="muted">-</span>'}</td>
              <td class="${n.css}">${n.label}</td>
            </tr>
          `}).join("")}
        </tbody>
      </table>
    </div>
  `}function Ge(t,e){return t?t.length>e?t.slice(0,e)+"...":t:""}function B(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}function ue(t){return t?t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):""}function Ze(t){const e=Date.now(),a=new Date(t).getTime(),o=e-a,n=Math.floor(o/6e4);if(n<1)return"just now";if(n<60)return`${n}m ago`;const r=Math.floor(n/60);if(r<24)return`${r}h ago`;const u=Math.floor(r/24);return u<30?`${u}d ago`:new Date(t).toLocaleDateString()}const Yt=1e4;let P=null;function Ye(){let t=document.getElementById("undo-container");return t||(t=document.createElement("div"),t.id="undo-container",document.body.appendChild(t)),t}function Je(){P&&(clearTimeout(P.timer),P.el&&P.el.parentNode&&P.el.parentNode.removeChild(P.el),P=null)}async function Z(t,e,a,o,n){Je();const{data:r,error:u}=await g.from(t).select("*").eq("id",e.id).single();if(u||!r){alert("Error: "+((u==null?void 0:u.message)||"Row not found"));return}const{error:d}=await g.from(t).delete().eq("id",e.id);if(d){alert("Error: "+d.message);return}o();const l=Ye(),i=document.createElement("div");i.className="undo-toast",i.innerHTML=`
    <span class="undo-text">Deleted ${a}</span>
    <a href="#" class="undo-link">Undo</a>
    <span class="undo-timer-bar"></span>
  `,l.appendChild(i);const c=i.querySelector(".undo-link"),p=i.querySelector(".undo-timer-bar");requestAnimationFrame(()=>{p.style.transition=`width ${Yt}ms linear`,p.style.width="0%"});const m=setTimeout(()=>{i.parentNode&&i.parentNode.removeChild(i),P=null},Yt);P={el:i,timer:m},c.addEventListener("click",async h=>{h.preventDefault(),clearTimeout(m),i.parentNode&&i.parentNode.removeChild(i),P=null;const{error:f}=await g.from(t).insert(r);if(f){alert("Undo failed: "+f.message);return}n()})}function pe(t,e="contact",a={}){return!t||t.length===0?'<div class="log-empty">No log entries yet.</div>':`<div class="log-timeline">${t.map(o=>{var i,c,p;const n=Xe(o.logged_at);let r="";if(e==="contact"&&((i=o.projects)!=null&&i.title))r=` <a href="#/projects/${o.project_id}" class="log-tag">[${U(o.projects.title)}]</a>`;else if(e==="project"&&o.contacts){const m=`${o.contacts.first_name||""} ${o.contacts.last_name||""}`.trim();m&&(r=` <a href="#/contacts/${o.contact_id}" class="log-tag">[${U(m)}]</a>`)}const u=(c=o.content)==null?void 0:c.startsWith(">"),d=(p=o.content)==null?void 0:p.startsWith("?");return`
      <div class="log-entry${u?" log-entry-next":d?" log-entry-waiting":""}" data-log-id="${o.id}">
        <div class="log-entry-view">
          <span class="log-date">${n} ───</span>
          <span class="log-content">${U(o.content)}</span>${r}
          <span class="log-actions">
            <button class="log-edit-btn" data-log-id="${o.id}" title="Edit">edit</button>
            <button class="log-delete-btn" data-log-id="${o.id}" title="Delete">&times;</button>
          </span>
        </div>
        <div class="log-entry-edit" style="display:none" data-log-id="${o.id}">
          <input type="date" class="input log-edit-date" value="${o.logged_at||""}">
          <textarea class="input log-edit-content" rows="4">${U(o.content||"")}</textarea>
          <div class="log-edit-row">
            ${e==="contact"?`
              <select class="input log-edit-project">
                <option value="">-- project --</option>
                ${(a.projects||[]).map(m=>`<option value="${m.id}"${o.project_id===m.id?" selected":""}>${U(m.title)}</option>`).join("")}
              </select>`:""}
            ${e==="project"?`
              <select class="input log-edit-contact">
                <option value="">-- contact --</option>
                ${(a.contacts||[]).map(m=>`<option value="${m.id}"${o.contact_id===m.id?" selected":""}>${U(m.first_name)} ${U(m.last_name)}</option>`).join("")}
              </select>`:""}
            <button class="btn btn-sm btn-primary log-edit-save" data-log-id="${o.id}">Save</button>
            <button class="btn btn-sm btn-secondary log-edit-cancel" data-log-id="${o.id}">Cancel</button>
          </div>
        </div>
      </div>`}).join("")}</div>`}function me(t,e){t.querySelectorAll(".log-edit-btn").forEach(a=>{a.addEventListener("click",o=>{o.stopPropagation();const n=a.dataset.logId,r=t.querySelector(`.log-entry[data-log-id="${n}"]`);r&&(r.querySelector(".log-entry-view").style.display="none",r.querySelector(".log-entry-edit").style.display="")})}),t.querySelectorAll(".log-edit-cancel").forEach(a=>{a.addEventListener("click",o=>{o.stopPropagation();const n=a.dataset.logId,r=t.querySelector(`.log-entry[data-log-id="${n}"]`);r&&(r.querySelector(".log-entry-view").style.display="",r.querySelector(".log-entry-edit").style.display="none")})}),t.querySelectorAll(".log-edit-save").forEach(a=>{a.addEventListener("click",async o=>{o.stopPropagation();const n=a.dataset.logId,r=t.querySelector(`.log-entry[data-log-id="${n}"]`);if(!r)return;const u=r.querySelector(".log-entry-edit"),d=u.querySelector(".log-edit-content").value.trim();if(!d)return;const l=u.querySelector(".log-edit-date").value,i=u.querySelector(".log-edit-project"),c=u.querySelector(".log-edit-contact"),p={content:d,logged_at:l||null};i&&(p.project_id=i.value||null),c&&(p.contact_id=c.value||null);const{error:m}=await g.from("logs").update(p).eq("id",n);!m&&e&&e()})}),t.querySelectorAll(".log-delete-btn").forEach(a=>{a.addEventListener("click",async o=>{o.stopPropagation();const n=a.dataset.logId;n&&await Z("logs",{id:n},"log entry",()=>{e&&e()},()=>{e&&e()})})})}function Xe(t){if(!t)return"";const e=new Date(t),a=String(e.getDate()).padStart(2,"0"),o=String(e.getMonth()+1).padStart(2,"0");return`${a}.${o}.`}function U(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}async function ut(t,e){var a,o;t.innerHTML='<div class="loading">Loading...</div>';try{const[{data:n,error:r},{data:u},{data:d},{data:l}]=await Promise.all([g.from("contacts").select("*, companies(id, name)").eq("id",e).single(),g.from("logs").select("*, projects(title)").eq("contact_id",e).order("logged_at",{ascending:!1}).order("created_at",{ascending:!1}),g.from("companies").select("id, name").order("name"),g.from("projects").select("id, title").order("title")]);if(r||!n){t.innerHTML='<div class="error">Contact not found. <a href="#/contacts">Back to list</a></div>';return}const i=(u||[])[0],c=i?`Last contact: ${Ze(i.logged_at)}`:"Last contact: never",p=i?G(i.logged_at).css:"temp-dead",m=(u||[])[0],h=(a=m==null?void 0:m.content)!=null&&a.startsWith(">")?`<div class="next-step"><span class="next-step-label">NEXT:</span> ${F(m.content.slice(1).trim())} <span class="muted">${Jt(m.logged_at)}</span></div>`:(o=m==null?void 0:m.content)!=null&&o.startsWith("?")?`<div class="next-step waiting-step"><span class="waiting-step-label">WAITING:</span> ${F(m.content.slice(1).trim())} <span class="muted">${Jt(m.logged_at)}</span></div>`:"",f=(l||[]).filter(S=>(u||[]).some(D=>D.project_id===S.id)),{data:v}=await g.from("projects").select("id, title, status").eq("contact_id",e).order("title"),y=new Map;for(const S of v||[])y.set(S.id,S);for(const S of f)y.set(S.id,S);const w=Array.from(y.values()),_=pe(u||[],"contact",{projects:l||[]});t.innerHTML=`
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-toolbar">
            <a href="#/contacts" class="btn btn-back">&larr; Back</a>
            <h1>${F(n.first_name)} ${F(n.last_name)}</h1>
            <div class="detail-actions">
              <button id="toggle-star" class="btn btn-sm btn-secondary">${n.starred_at?"★ Unstar":"☆ Star"}</button>
              <button id="delete-contact" class="btn btn-danger">Del</button>
            </div>
          </div>
        </div>

        <div class="last-contact ${p}">${c}</div>
        ${h}

        <div class="inline-fields-vertical">
          <label>Email <input type="email" id="f-email" class="input inline-input" value="${Xt(n.email||"")}" placeholder="add email"></label>
          <label>Phone <input type="tel" id="f-phone" class="input inline-input" value="${Xt(n.phone||"")}" placeholder="add phone"></label>
          <label>Company
            <select id="f-company" class="input inline-input">
              <option value="">—</option>
              ${(d||[]).map(S=>`<option value="${S.id}"${n.company_id===S.id?" selected":""}>${F(S.name)}</option>`).join("")}
            </select>
          </label>
          <span id="inline-status" class="inline-status"></span>
        </div>

        ${w.length>0?`
        <div class="related-entities">Projects: ${w.map(S=>`<a href="#/projects/${S.id}">${F(S.title)} <span class="muted">(${S.status})</span></a>`).join(" · ")}</div>`:""}

        <div class="section-bar">Log</div>
        ${_}
      </div>
    `;const C=t.querySelector("#inline-status");async function A(S,D){const{error:k}=await g.from("contacts").update({[S]:D||null}).eq("id",e);k?(C.textContent="Error",C.style.color="var(--danger)"):(C.textContent="Saved",C.style.color="var(--success)",setTimeout(()=>{C.textContent=""},2e3))}const q=st(()=>A("email",t.querySelector("#f-email").value.trim()),1e3),E=st(()=>A("phone",t.querySelector("#f-phone").value.trim()),1e3);t.querySelector("#f-email").addEventListener("input",q),t.querySelector("#f-phone").addEventListener("input",E),t.querySelector("#f-company").addEventListener("change",()=>{A("company_id",t.querySelector("#f-company").value)}),t.querySelector("#toggle-star").addEventListener("click",async()=>{const S=n.starred_at?null:new Date().toISOString();await g.from("contacts").update({starred_at:S}).eq("id",e),ut(t,e)}),me(t,()=>ut(t,e)),window.addEventListener("log-created",()=>ut(t,e),{once:!0}),t.querySelector("#delete-contact").addEventListener("click",async()=>{await Z("contacts",n,`"${n.first_name} ${n.last_name}"`,()=>{window.location.hash="#/contacts"},()=>{window.location.hash=`#/contacts/${e}`})})}catch(n){t.innerHTML=`<div class="error">Error: ${F(n.message)}</div>`}}function Jt(t){if(!t)return"";const e=new Date(t);return`${String(e.getDate()).padStart(2,"0")}.${String(e.getMonth()+1).padStart(2,"0")}.`}function F(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}function Xt(t){return t?t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):""}async function Qt(t,e=null){if(e){window.location.hash=`#/contacts/${e}`;return}t.innerHTML=`
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
  `,t.querySelector("#first_name").focus(),t.querySelector("#contact-form").addEventListener("submit",async a=>{a.preventDefault(),Qe(t);const o=t.querySelector("#first_name").value.trim(),n=t.querySelector("#last_name").value.trim();let r=!0;if(o||(te(t,"first_name","Required"),r=!1),n||(te(t,"last_name","Required"),r=!1),!r)return;const u=t.querySelector("#submit-btn");u.disabled=!0,u.textContent="Saving...";try{const d=(await g.auth.getUser()).data.user,{data:l,error:i}=await g.from("contacts").insert({first_name:o,last_name:n,user_id:d.id}).select().single();if(i)throw i;window.location.hash=`#/contacts/${l.id}`}catch(d){t.querySelector("#form-error").textContent="Error: "+d.message,u.disabled=!1,u.textContent="Save"}})}function te(t,e,a){const o=t.querySelector(`#err-${e}`);o&&(o.textContent=a);const n=t.querySelector(`#${e}`);n&&n.classList.add("input-error")}function Qe(t){t.querySelectorAll(".field-error").forEach(e=>e.textContent=""),t.querySelectorAll(".input-error").forEach(e=>e.classList.remove("input-error")),t.querySelector("#form-error").textContent=""}const ta=["open"];async function pt(t){t.innerHTML='<div class="loading">Loading companies...</div>';try{let m=function(f=null){c.style.display="",t.querySelector("#company-form-title").textContent=f?"Edit Company":"New Company",t.querySelector("#company-submit-btn").textContent=f?"Save Changes":"Create Company",t.querySelector("#company-edit-id").value=(f==null?void 0:f.id)||"",t.querySelector("#c-name").value=(f==null?void 0:f.name)||"",t.querySelector("#c-official-name").value=(f==null?void 0:f.official_name)||"",t.querySelector("#c-email").value=(f==null?void 0:f.email)||"",t.querySelector("#c-ico").value=(f==null?void 0:f.ico)||"",t.querySelector("#c-web").value=(f==null?void 0:f.web)||"",t.querySelector("#c-notes").value=(f==null?void 0:f.notes)||"",t.querySelector("#c-name").focus()},h=function(){c.style.display="none",p.reset(),t.querySelector("#company-edit-id").value="",t.querySelector("#company-form-error").textContent=""};var e=m,a=h;const{data:o,error:n}=await g.from("companies").select("*, contacts(id)").order("name");if(n)throw n;const{data:r}=await g.from("projects").select("company_id").in("status",ta),u={};(r||[]).forEach(f=>{f.company_id&&(u[f.company_id]=(u[f.company_id]||0)+1)});const d=o||[],l=d.filter(f=>u[f.id]>0).sort((f,v)=>(f.name||"").localeCompare(v.name||"")),i=d.filter(f=>!u[f.id]).sort((f,v)=>(f.name||"").localeCompare(v.name||""));t.innerHTML=`
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

      ${ea(l,i,u)}
    `;const c=t.querySelector("#company-form-wrap"),p=t.querySelector("#company-form");t.querySelector("#add-company-btn").addEventListener("click",()=>m()),t.querySelector("#company-cancel-btn").addEventListener("click",h),p.addEventListener("submit",async f=>{f.preventDefault();const v=t.querySelector("#c-name").value.trim();if(!v){t.querySelector("#company-form-error").textContent="Company name is required";return}const y=t.querySelector("#company-edit-id").value,w={name:v,official_name:t.querySelector("#c-official-name").value.trim()||null,email:t.querySelector("#c-email").value.trim()||null,ico:t.querySelector("#c-ico").value.trim()||null,web:t.querySelector("#c-web").value.trim()||null,notes:t.querySelector("#c-notes").value.trim()||null};try{if(y){const{error:_}=await g.from("companies").update(w).eq("id",y);if(_)throw _}else{const _=(await g.auth.getUser()).data.user;w.user_id=_.id;const{error:C}=await g.from("companies").insert(w);if(C)throw C}await pt(t)}catch(_){t.querySelector("#company-form-error").textContent="Error: "+_.message}}),t.querySelectorAll(".edit-company").forEach(f=>{f.addEventListener("click",v=>{v.preventDefault();const y=d.find(w=>w.id===f.dataset.id);y&&m(y)})}),t.querySelectorAll(".delete-company").forEach(f=>{f.addEventListener("click",async v=>{v.preventDefault();const y=d.find(w=>w.id===f.dataset.id);y&&await Z("companies",y,`"${y.name}"`,()=>pt(t),()=>pt(t))})}),t.querySelectorAll(".clickable-row").forEach(f=>{f.addEventListener("click",()=>{window.location.hash=`#/companies/${f.dataset.id}`})})}catch(o){t.innerHTML=`<div class="error">Error: ${K(o.message)}</div>`}}function ea(t,e,a){let o="";return t.length>0&&(o+=`
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
              ${t.map(n=>ee(n,a[n.id]||0)).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `),e.length>0&&(o+=`
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
              ${e.map(n=>ee(n,0)).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `),t.length===0&&e.length===0&&(o='<div class="empty-state">No companies.</div>'),o}function ee(t,e){return`
    <tr class="clickable-row" data-id="${t.id}">
      <td><strong>${K(t.name)}</strong></td>
      <td>${t.official_name?K(t.official_name):'<span class="muted">-</span>'}</td>
      <td>${t.email?K(t.email):'<span class="muted">-</span>'}</td>
      <td>${t.web?`<a href="${ae(t.web)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${K(t.web)}</a>`:'<span class="muted">-</span>'}</td>
      <td>${t.ico?K(t.ico):'<span class="muted">-</span>'}</td>
      <td>${t.contacts?t.contacts.length:0}</td>
      ${e>0?`<td><strong>${e}</strong></td>`:""}
      <td class="actions-cell" onclick="event.stopPropagation()">
        <a href="#" class="edit-company" data-id="${t.id}">Edit</a>
        <a href="#" class="danger-link delete-company" data-id="${t.id}" data-name="${ae(t.name)}">Delete</a>
      </td>
    </tr>
  `}function K(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}function ae(t){return t?t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):""}async function aa(t,e){t.innerHTML='<div class="loading">Loading...</div>';try{const[{data:a,error:o},{data:n},{data:r}]=await Promise.all([g.from("companies").select("*").eq("id",e).single(),g.from("contacts").select("id, first_name, last_name").eq("company_id",e).order("last_name"),g.from("projects").select("id, title, amount, status, updated_at").eq("company_id",e).order("updated_at",{ascending:!1})]);if(o||!a){t.innerHTML='<div class="error">Company not found. <a href="#/companies">Back to list</a></div>';return}const u=(n||[]).map(v=>v.id),d=r||[];let l=[];if(u.length>0){const{data:v}=await g.from("logs").select("*, contacts(first_name, last_name), projects(title)").in("contact_id",u).order("logged_at",{ascending:!1}).order("created_at",{ascending:!1}).limit(30);l=v||[]}const i=new Map;for(const v of l)v.contact_id&&!i.has(v.contact_id)&&i.set(v.contact_id,v.logged_at);const c=(n||[]).map(v=>({...v,temp:G(i.get(v.id))})),p=l.length>0?l.map(v=>{var C;const y=sa(v.logged_at),w=v.contacts?`${N(v.contacts.first_name)} ${N(v.contacts.last_name)}`:"",_=(C=v.projects)!=null&&C.title?` <span class="log-tag">[${N(v.projects.title)}]</span>`:"";return`<div class="log-entry">
            <span class="log-date">${y} ───</span>
            <a href="#/contacts/${v.contact_id}" class="log-tag">[${w}]</a>
            <span class="log-content">${N(v.content)}</span>${_}
          </div>`}).join(""):'<div class="log-empty">No logs from contacts at this company.</div>';t.innerHTML=`
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-toolbar">
            <a href="#/companies" class="btn btn-back">&larr; Back</a>
            <h1>${N(a.name)}</h1>
            <div class="detail-actions">
              <button id="delete-company" class="btn btn-danger">Del</button>
            </div>
          </div>
        </div>

        <div class="inline-fields-vertical">
          <label>Official name <input type="text" id="f-official" class="input inline-input" value="${ct(a.official_name||"")}" placeholder="add official name"></label>
          <label>Email <input type="email" id="f-email" class="input inline-input" value="${ct(a.email||"")}" placeholder="add email"></label>
          <label>Web <input type="url" id="f-web" class="input inline-input" value="${ct(a.web||"")}" placeholder="add website"></label>
          <label>ICO <input type="text" id="f-ico" class="input inline-input" value="${ct(a.ico||"")}" placeholder="add ICO"></label>
          <span id="inline-status" class="inline-status"></span>
        </div>

        ${c.length>0?`
        <div class="section-bar section-bar-contacts">Contacts (${c.length})</div>
        <div class="compact-list">
          ${c.map(v=>`
            <div class="compact-list-item clickable-row ${v.temp.css}" data-href="#/contacts/${v.id}">
              <strong>${N(v.first_name)} ${N(v.last_name)}</strong> · ${v.temp.label}
            </div>
          `).join("")}
        </div>`:""}

        ${d.length>0?`
        <div class="section-bar section-bar-deals">Projects (${d.length})</div>
        <div class="compact-list">
          ${d.map(v=>`
            <div class="compact-list-item clickable-row" data-href="#/projects/${v.id}">
              <strong>${N(v.title)}</strong> · <span class="status-badge status-${v.status}">${na(v.status)}</span>
              ${v.amount?` · ${Math.round(parseFloat(v.amount)/1e3)}K`:""}
            </div>
          `).join("")}
        </div>`:""}

        <div class="section-bar">Log</div>
        <div class="log-timeline">${p}</div>
      </div>
    `;const m=t.querySelector("#inline-status");async function h(v,y){const{error:w}=await g.from("companies").update({[v]:y||null}).eq("id",e);w?(m.textContent="Error",m.style.color="var(--danger)"):(m.textContent="Saved",m.style.color="var(--success)",setTimeout(()=>{m.textContent=""},2e3))}const f=(v,y)=>st(()=>h(v,t.querySelector(y).value.trim()),1e3);t.querySelector("#f-official").addEventListener("input",f("official_name","#f-official")),t.querySelector("#f-email").addEventListener("input",f("email","#f-email")),t.querySelector("#f-web").addEventListener("input",f("web","#f-web")),t.querySelector("#f-ico").addEventListener("input",f("ico","#f-ico")),t.querySelector("#delete-company").addEventListener("click",async()=>{await Z("companies",a,`"${a.name}"`,()=>{window.location.hash="#/companies"},()=>{window.location.hash=`#/companies/${e}`})}),t.querySelectorAll(".clickable-row").forEach(v=>{v.addEventListener("click",()=>{const y=v.dataset.href;y&&(window.location.hash=y)})})}catch(a){t.innerHTML=`<div class="error">Error: ${N(a.message)}</div>`}}function na(t){return{open:"Open",frozen:"Frozen",won:"Won",lost:"Lost"}[t]||t}function sa(t){if(!t)return"";const e=new Date(t);return`${String(e.getDate()).padStart(2,"0")}.${String(e.getMonth()+1).padStart(2,"0")}.`}function N(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}function ct(t){return t?t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):""}async function oa(t,e=null){if(e){window.location.hash=`#/companies/${e}`;return}t.innerHTML=`
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
  `,t.querySelector("#name").focus(),t.querySelector("#company-form").addEventListener("submit",async a=>{a.preventDefault();const o=t.querySelector("#name").value.trim();if(!o){const r=t.querySelector("#err-name");r&&(r.textContent="Required");return}const n=t.querySelector("#submit-btn");n.disabled=!0,n.textContent="Saving...";try{const r=(await g.auth.getUser()).data.user,{data:u,error:d}=await g.from("companies").insert({name:o,user_id:r.id}).select().single();if(d)throw d;window.location.hash=`#/companies/${u.id}`}catch(r){t.querySelector("#form-error").textContent="Error: "+r.message,n.disabled=!1,n.textContent="Save"}})}const ra=["open"],ca=[{key:"open",title:"Open",statuses:["open"]},{key:"frozen",title:"Frozen",statuses:["frozen"]},{key:"won",title:"Won",statuses:["won"]},{key:"lost",title:"Lost",statuses:["lost"]}];async function Q(t){t.innerHTML='<div class="loading">Loading projects...</div>';try{let _=function(){y.style.display="",t.querySelector("#d-title").value="",t.querySelector("#d-title").focus()},C=function(){y.style.display="none",w.reset(),t.querySelector("#project-form-error").textContent=""};var e=_,a=C;const[{data:o,error:n},{data:r},{data:u},{data:d}]=await Promise.all([g.from("projects").select("*, contacts(first_name, last_name), companies(name)").order("updated_at",{ascending:!1}),g.from("contacts").select("id, first_name, last_name").order("last_name"),g.from("companies").select("id, name").order("name"),g.from("logs").select("project_id, logged_at, content").not("project_id","is",null).order("logged_at",{ascending:!1})]);if(n)throw n;const l=new Map;for(const q of d||[])q.project_id&&!l.has(q.project_id)&&l.set(q.project_id,{date:q.logged_at,content:q.content});const i=o||[],c=r||[],p=u||[],m=i.reduce((q,E)=>q+(parseFloat(E.amount)||0),0),f=i.filter(q=>q.status==="frozen").reduce((q,E)=>q+(parseFloat(E.amount)||0),0),v=ia(i);t.innerHTML=`
      <div class="page-header">
        <h1>Projects <span class="badge">${i.length}</span> <span class="header-meta">Total ${m.toLocaleString("cs-CZ")} Kc / Frozen ${f.toLocaleString("cs-CZ")} Kc</span></h1>
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

      ${la(v,i,l)}
    `;const y=t.querySelector("#project-form-wrap"),w=t.querySelector("#project-form");t.querySelector("#add-project-btn").addEventListener("click",()=>_()),t.querySelector("#project-cancel-btn").addEventListener("click",C),w.addEventListener("submit",async q=>{q.preventDefault();const E=t.querySelector("#d-title").value.trim();if(!E){t.querySelector("#project-form-error").textContent="Title is required";return}try{const S=(await g.auth.getUser()).data.user,{data:D,error:k}=await g.from("projects").insert({title:E,status:"open",user_id:S.id}).select().single();if(k)throw k;window.location.hash=`#/projects/${D.id}`}catch(S){t.querySelector("#project-form-error").textContent="Error: "+S.message}}),t.querySelectorAll(".delete-project").forEach(q=>{q.addEventListener("click",async E=>{E.preventDefault();const S=i.find(D=>D.id===q.dataset.id);S&&await Z("projects",S,`"${S.title}"`,()=>Q(t),()=>Q(t))})}),t.querySelectorAll(".freeze-project").forEach(q=>{q.addEventListener("click",async E=>{E.preventDefault();const S=q.dataset.id,D=q.dataset.status,{error:k}=await g.from("projects").update({status:"frozen",previous_status:D}).eq("id",S);if(k){alert("Error: "+k.message);return}await Q(t)})}),t.querySelectorAll(".unfreeze-project").forEach(q=>{q.addEventListener("click",async E=>{E.preventDefault();const S=q.dataset.id,D="open",{error:k}=await g.from("projects").update({status:D,previous_status:null}).eq("id",S);if(k){alert("Error: "+k.message);return}await Q(t)})}),t.querySelectorAll(".clickable-row").forEach(q=>{q.addEventListener("click",()=>{window.location.hash=`#/projects/${q.dataset.id}`})});const A=t.querySelector("#toggle-closed");A&&A.addEventListener("click",q=>{q.preventDefault();const E=t.querySelector("#closed-projects");if(E.style.display==="none")E.style.display="",A.textContent="Hide closed";else{E.style.display="none";const S=E.querySelectorAll(".clickable-row").length;A.textContent=`Show closed (${S})`}})}catch(o){t.innerHTML=`<div class="error">Error: ${tt(o.message)}</div>`}}function ia(t){const e={};return ca.forEach(a=>{const o=t.filter(n=>a.statuses.includes(n.status));o.sort((n,r)=>n.updated_at!==r.updated_at?new Date(r.updated_at)-new Date(n.updated_at):n.created_at!==r.created_at?new Date(r.created_at)-new Date(n.created_at):(n.title||"").localeCompare(r.title||"")),e[a.key]={...a,projects:o}}),e}function la(t,e,a){const o=["won","lost"],n=Object.values(t).filter(l=>!o.includes(l.key)),r=Object.values(t).filter(l=>o.includes(l.key)),u=r.reduce((l,i)=>l+i.projects.length,0);let d=n.map(l=>ne(l,a)).join("");return u>0&&(d+=`
      <div class="closed-toggle">
        <a href="#" id="toggle-closed" class="muted">Show closed (${u})</a>
      </div>
      <div id="closed-projects" style="display:none">
        ${r.map(l=>ne(l,a)).join("")}
      </div>
    `),d}function ne(t,e){return t.projects.length===0?"":`
    <div class="project-group">
      <h2 class="group-heading">${t.title} <span class="badge">${t.projects.length}</span></h2>
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
            ${t.projects.map(a=>da(a,e)).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `}function da(t,e){const a=parseFloat(t.amount)||0,o=a?`${Math.round(a/1e3)}K`:"-",n=e.get(t.id),r=G(n==null?void 0:n.date),u=n!=null&&n.content?ua(n.content,80):"",d=ra.includes(t.status),l=t.status==="frozen",i=t.contacts?`${tt(t.contacts.first_name)} ${tt(t.contacts.last_name)}`:'<span class="muted">-</span>';return`
    <tr class="clickable-row ${r.css}" data-id="${t.id}">
      <td>
        <strong>${tt(t.title)}</strong>
        ${u?`<div class="log-snippet">${tt(u)}</div>`:""}
      </td>
      <td>${o}</td>
      <td>${i}</td>
      <td class="${r.css}">${r.label}</td>
      <td class="actions-cell" onclick="event.stopPropagation()">
        ${d?`<a href="#" class="freeze-project" data-id="${t.id}" data-status="${t.status}">Freeze</a>`:""}
        ${l?`<a href="#" class="unfreeze-project" data-id="${t.id}">Unfreeze</a>`:""}
        <a href="#" class="danger-link delete-project" data-id="${t.id}" data-title="${pa(t.title)}">Delete</a>
      </td>
    </tr>
  `}function ua(t,e){return t?t.length>e?t.slice(0,e)+"...":t:""}function tt(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}function pa(t){return t?t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):""}const ma=["open","frozen","won","lost"];async function Ct(t,e){var a,o;t.innerHTML='<div class="loading">Loading...</div>';try{const[{data:n,error:r},{data:u},{data:d},{data:l}]=await Promise.all([g.from("projects").select("*").eq("id",e).single(),g.from("logs").select("*, contacts(first_name, last_name)").eq("project_id",e).order("logged_at",{ascending:!1}).order("created_at",{ascending:!1}),g.from("contacts").select("id, first_name, last_name").order("last_name"),g.from("companies").select("id, name").order("name")]);if(r||!n){t.innerHTML='<div class="error">Project not found. <a href="#/projects">Back to list</a></div>';return}const i=(u||[])[0],c=(a=i==null?void 0:i.content)!=null&&a.startsWith(">")?`<div class="next-step"><span class="next-step-label">NEXT:</span> ${z(i.content.slice(1).trim())} <span class="muted">${se(i.logged_at)}</span></div>`:(o=i==null?void 0:i.content)!=null&&o.startsWith("?")?`<div class="next-step waiting-step"><span class="waiting-step-label">WAITING:</span> ${z(i.content.slice(1).trim())} <span class="muted">${se(i.logged_at)}</span></div>`:"",p=pe(u||[],"project",{contacts:d||[]});t.innerHTML=`
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-toolbar">
            <a href="#/projects" class="btn btn-back">&larr; Back</a>
            <h1>${z(n.title)}</h1>
            <div class="detail-actions">
              <button id="delete-project" class="btn btn-danger">Del</button>
            </div>
          </div>
        </div>

        ${c}

        <div class="inline-fields-vertical">
          <label>Amount <input type="number" id="f-amount" class="input inline-input" value="${n.amount||""}" placeholder="—" step="1"></label>
          <label>Status
            <select id="f-status" class="input inline-input">
              ${ma.map(v=>`<option value="${v}"${n.status===v?" selected":""}>${v.charAt(0).toUpperCase()+v.slice(1)}</option>`).join("")}
            </select>
          </label>
          <label>Expected close <input type="date" id="f-expected" class="input inline-input" value="${n.expected_close||""}">${n.expected_close&&n.expected_close<new Date().toISOString().slice(0,10)?' <strong class="overdue-label">OVERDUE</strong>':""}</label>
          <label>Contact
            <select id="f-contact" class="input inline-input">
              <option value="">—</option>
              ${(d||[]).map(v=>`<option value="${v.id}"${n.contact_id===v.id?" selected":""}>${z(v.first_name)} ${z(v.last_name)}</option>`).join("")}
            </select>
          </label>
          <label>Company
            <select id="f-company" class="input inline-input">
              <option value="">—</option>
              ${(l||[]).map(v=>`<option value="${v.id}"${n.company_id===v.id?" selected":""}>${z(v.name)}</option>`).join("")}
            </select>
          </label>
          <span id="inline-status" class="inline-status"></span>
        </div>

        <div class="section-bar">Log</div>
        ${p}
      </div>
    `;const m=t.querySelector("#inline-status");async function h(v,y){const{error:w}=await g.from("projects").update({[v]:y||null}).eq("id",e);w?(m.textContent="Error",m.style.color="var(--danger)"):(m.textContent="Saved",m.style.color="var(--success)",setTimeout(()=>{m.textContent=""},2e3))}const f=st(()=>h("amount",t.querySelector("#f-amount").value),1e3);t.querySelector("#f-amount").addEventListener("input",f),t.querySelector("#f-status").addEventListener("change",()=>{h("status",t.querySelector("#f-status").value)}),t.querySelector("#f-expected").addEventListener("change",()=>{h("expected_close",t.querySelector("#f-expected").value)}),t.querySelector("#f-contact").addEventListener("change",()=>{h("contact_id",t.querySelector("#f-contact").value)}),t.querySelector("#f-company").addEventListener("change",()=>{h("company_id",t.querySelector("#f-company").value)}),me(t,()=>Ct(t,e)),window.addEventListener("log-created",()=>Ct(t,e),{once:!0}),t.querySelector("#delete-project").addEventListener("click",async()=>{await Z("projects",n,`"${n.title}"`,()=>{window.location.hash="#/projects"},()=>{window.location.hash=`#/projects/${e}`})})}catch(n){t.innerHTML=`<div class="error">Error: ${z(n.message)}</div>`}}function se(t){if(!t)return"";const e=new Date(t);return`${String(e.getDate()).padStart(2,"0")}.${String(e.getMonth()+1).padStart(2,"0")}.`}function z(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}async function oe(t,e=null){if(e){window.location.hash=`#/projects/${e}`;return}t.innerHTML=`
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
  `,t.querySelector("#title").focus(),t.querySelector("#project-form").addEventListener("submit",async a=>{a.preventDefault();const o=t.querySelector("#title").value.trim();if(!o){const r=t.querySelector("#err-title");r&&(r.textContent="Required");return}const n=t.querySelector("#submit-btn");n.disabled=!0,n.textContent="Saving...";try{const r=(await g.auth.getUser()).data.user,{data:u,error:d}=await g.from("projects").insert({title:o,status:"open",user_id:r.id}).select().single();if(d)throw d;window.location.hash=`#/projects/${u.id}`}catch(r){t.querySelector("#form-error").textContent="Error: "+r.message,n.disabled=!1,n.textContent="Save"}})}async function fe(t){var e,a;t.innerHTML='<div class="loading">Loading...</div>';try{const o=new Date,n=o.toISOString().slice(0,10),r=new Date(o-7*864e5).toISOString().slice(0,10),u=new Date(o-14*864e5).toISOString().slice(0,10),[{data:d},{data:l},{data:i},{data:c},{data:p},{data:m},{data:h},{data:f}]=await Promise.all([g.from("contacts").select("id, first_name, last_name, email, phone, company_id, starred_at, companies(name)").order("last_name"),g.from("projects").select("id, title, amount, status, expected_close, updated_at, contact_id, contacts(first_name, last_name)").order("title"),g.from("logs").select("contact_id, project_id, logged_at, content").not("contact_id","is",null).order("logged_at",{ascending:!1}),g.from("logs").select("project_id, logged_at, content").not("project_id","is",null).order("logged_at",{ascending:!1}),g.from("logs").select("id, contact_id, logged_at").gte("logged_at",r),g.from("logs").select("id").gte("logged_at",u).lt("logged_at",r),g.from("projects").select("id, title, amount, updated_at").eq("status","won").gte("updated_at",new Date(o-7*864e5).toISOString()),g.from("logs").select("id, content, logged_at").is("contact_id",null).is("project_id",null).order("logged_at",{ascending:!1})]),v=new Map,y=new Map;for(const s of i||[])s.contact_id&&!v.has(s.contact_id)&&v.set(s.contact_id,{date:s.logged_at,content:s.content}),s.contact_id&&!s.project_id&&!y.has(s.contact_id)&&y.set(s.contact_id,s.content);const w=new Map;for(const s of c||[])s.project_id&&!w.has(s.project_id)&&w.set(s.project_id,{date:s.logged_at,content:s.content});const _=(d||[]).map(s=>{const b=v.get(s.id);return{...s,temp:G(b==null?void 0:b.date),lastContent:(b==null?void 0:b.content)||"",ownContent:y.get(s.id)||""}}),C=(l||[]).filter(s=>s.status==="open"||s.status==="frozen").map(s=>{const b=w.get(s.id);return{...s,temp:G(b==null?void 0:b.date),lastContent:(b==null?void 0:b.content)||""}}),A=_.filter(s=>s.temp.css==="temp-hot").length,q=_.filter(s=>s.temp.css==="temp-warm").length,E=_.filter(s=>s.temp.css==="temp-cold"||s.temp.css==="temp-dead").length,S=(l||[]).filter(s=>s.status==="open"),D=(l||[]).filter(s=>s.status==="frozen"),k=S.reduce((s,b)=>s+(parseFloat(b.amount)||0),0),Tt=D.reduce((s,b)=>s+(parseFloat(b.amount)||0),0),gt=k+Tt,ye=(p||[]).length,he=new Set((p||[]).filter(s=>s.contact_id).map(s=>s.contact_id)).size,Mt=(m||[]).length,be=new Set((p||[]).map(s=>s.logged_at));let yt=0;for(let s=0;s<7;s++){const b=new Date(o-s*864e5).toISOString().slice(0,10);if(be.has(b))yt++;else break}const At=(h||[]).length>0?(h||[]).map(s=>`Won: ${L(s.title)} (${V(parseFloat(s.amount)||0)})`).join(" &middot; "):"",ht=_.filter(s=>s.temp.days===null).length,R=_.filter(s=>!s.email||!s.phone||!s.company_id).length,Pt=C.filter(s=>s.expected_close&&s.expected_close<n),$e=new Date(o-7*864e5).toISOString(),Ht=_.filter(s=>{var H;if(!s.starred_at||s.starred_at<$e)return!1;const b=(H=v.get(s.id))==null?void 0:H.date;return!(b&&new Date(b)>new Date(s.starred_at))}),Nt=_.filter(s=>s.temp.days!==null&&s.temp.days>=14&&s.temp.days<60).sort((s,b)=>b.temp.days-s.temp.days).slice(0,5),bt=[],$t=[],It=new Set;for(const s of i||[])if(s.contact_id&&!It.has(s.contact_id)){It.add(s.contact_id);const b=_.find(H=>H.id===s.contact_id);if(!b)continue;(e=s.content)!=null&&e.startsWith(">")?bt.push({contact:b,content:s.content.slice(1).trim(),date:s.logged_at}):(a=s.content)!=null&&a.startsWith("?")&&$t.push({contact:b,content:s.content.slice(1).trim(),date:s.logged_at})}const Ot=[..._].sort((s,b)=>(b.temp.days??9999)-(s.temp.days??9999)).slice(0,15),Wt=[...C].sort((s,b)=>(b.temp.days??9999)-(s.temp.days??9999)).slice(0,15),we=gt>0?Math.round(k/gt*100):0,wt=(l||[]).filter(s=>s.status==="won"||s.status==="lost"),Ut=(l||[]).filter(s=>s.status==="won").length,xa=(l||[]).filter(s=>s.status==="won").reduce((s,b)=>s+(parseFloat(b.amount)||0),0),Ft=wt.length>0?Math.round(Ut/wt.length*100):0,zt=_.filter(s=>s.temp.days!==null&&s.temp.days<30).length,Se=_.length>0?Math.round(zt/_.length*100):0,St=f||[],_e=St.length>0?`
      <div class="triage-section">
        <div class="section-bar">${St.length} unassigned — assign contact/project</div>
        ${St.map(s=>`
          <div class="triage-row" data-log-id="${s.id}">
            <span class="triage-date">${fa(s.logged_at)}</span>
            <span class="triage-content">${L(s.content)}</span>
            <div class="triage-ac-wrap">
              <input type="text" class="input triage-ac-input triage-contact" placeholder="contact" autocomplete="off">
              <div class="qe-ac-list triage-contact-list"></div>
            </div>
            <div class="triage-ac-wrap">
              <input type="text" class="input triage-ac-input triage-project" placeholder="project" autocomplete="off">
              <div class="qe-ac-list triage-project-list"></div>
            </div>
            <button class="btn btn-sm btn-primary triage-save">ok</button>
            <button class="btn btn-sm btn-secondary triage-delete">&times;</button>
          </div>
        `).join("")}
      </div>
    `:"";t.innerHTML=`
      <div class="detail-page">
        ${_e}
        <div class="dashboard-pulse">
          <span>${_.length} contacts &middot; <span class="temp-hot">${A} active</span> &middot; ${q} warm &middot; <strong>${E} cold</strong></span>
          <span>${S.length} open (${V(k)}) &middot; ${D.length} frozen (${V(Tt)})${At?` &middot; ${At}`:""}</span>
          <span>This week: ${ye} logs &middot; ${he} contacts${Mt?` &middot; last week: ${Mt}`:""}${yt>1?` &middot; ${yt}-day streak`:""}</span>
          ${Fe()}
        </div>

        <div class="dashboard-main">
          <div class="dashboard-content">

            ${Ht.length>0?`
            <div class="dashboard-starred">
              ${Ht.map(s=>`
                <span class="starred-item clickable-row" data-href="#/contacts/${s.id}">★ <strong>${L(s.first_name)} ${L(s.last_name)}</strong></span>
              `).join("")}
            </div>
            `:""}

            ${bt.length>0?`
            <div class="dashboard-nextsteps">
              <div class="section-bar">Next steps</div>
              ${bt.slice(0,5).map(s=>`
                <div class="next-step clickable-row" data-href="#/contacts/${s.contact.id}">
                  <strong>${L(s.contact.first_name)} ${L(s.contact.last_name)}</strong>: ${L(s.content)}
                </div>
              `).join("")}
            </div>
            `:""}

            ${$t.length>0?`
            <div class="dashboard-waiting">
              <div class="section-bar">Waiting on</div>
              ${$t.slice(0,5).map(s=>`
                <div class="next-step waiting-step clickable-row" data-href="#/contacts/${s.contact.id}">
                  <strong>${L(s.contact.first_name)} ${L(s.contact.last_name)}</strong>: ${L(s.content)}
                </div>
              `).join("")}
            </div>
            `:""}

            ${Nt.length>0||Pt.length>0?`
            <div class="dashboard-nudges">
              ${Nt.map(s=>`
                <span class="nudge-item clickable-row" data-href="#/contacts/${s.id}"><strong>${L(s.first_name)} ${L(s.last_name)}</strong> ─── ${s.temp.label} without contact</span>
              `).join("")}
              ${Pt.map(s=>`
                <span class="nudge-item clickable-row" data-href="#/projects/${s.id}"><strong>${L(s.title)}</strong> ─── OVERDUE (exp. ${s.expected_close})</span>
              `).join("")}
            </div>
            `:""}

            ${ht>0||R>0?`
            <div class="dashboard-hygiene">
              <div class="section-bar">Hygiene</div>
              ${ht>0?`<span class="nudge-meta clickable-row" data-href="#/contacts">${ht} contacts with zero history</span>`:""}
              ${R>0?`<span class="nudge-meta clickable-row" data-href="#/contacts">${R} incomplete contacts</span>`:""}
            </div>
            `:""}

            <div class="dashboard-radar">
              <div class="dashboard-radar-col">
                <div class="section-bar section-bar-contacts">Contacts</div>
                ${Ot.length===0?'<div class="empty-state">No logged contacts.</div>':`<div class="table-wrap">
                    <table class="data-table">
                      <thead><tr><th>Name</th><th>Company</th><th>Temp</th></tr></thead>
                      <tbody>
                        ${Ot.map(s=>{var b;return`
                          <tr class="clickable-row ${s.temp.css}" data-href="#/contacts/${s.id}">
                            <td>
                              <strong>${L(s.first_name)} ${L(s.last_name)}</strong>
                              ${s.ownContent?`<div class="log-snippet">${L(re(s.ownContent,80))}</div>`:""}
                            </td>
                            <td>${(b=s.companies)!=null&&b.name?L(s.companies.name):'<span class="muted">-</span>'}</td>
                            <td class="${s.temp.css}">${s.temp.label}</td>
                          </tr>
                        `}).join("")}
                      </tbody>
                    </table>
                  </div>`}
              </div>

              <div class="dashboard-radar-col">
                <div class="section-bar section-bar-deals">Projects</div>
                ${Wt.length===0?'<div class="empty-state">No open projects.</div>':`<div class="table-wrap">
                    <table class="data-table">
                      <thead><tr><th>Project</th><th>Value</th><th>Contact</th><th>Temp</th></tr></thead>
                      <tbody>
                        ${Wt.map(s=>`
                          <tr class="clickable-row ${s.temp.css}" data-href="#/projects/${s.id}">
                            <td>
                              <strong>${L(s.title)}</strong>
                              ${s.lastContent?`<div class="log-snippet">${L(re(s.lastContent,80))}</div>`:""}
                            </td>
                            <td>${s.amount?V(parseFloat(s.amount)):"-"}</td>
                            <td>${s.contacts?`${L(s.contacts.first_name)} ${L(s.contacts.last_name)}`:'<span class="muted">-</span>'}</td>
                            <td class="${s.temp.css}">${s.temp.label}</td>
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
              <span>Open ${V(k)} / ${V(gt)}</span>
              <div class="progress-bar">${it(we)}</div>
            </div>

            <div class="section-bar" style="margin-top:0.75rem">System health</div>
            <div class="progress-item clickable-row" data-href="#/contacts">
              <span>Contacts alive ${zt}/${_.length}</span>
              <div class="progress-bar">${it(Se)}</div>
            </div>
            <div class="progress-item">
              <span>Win rate ${Ft}% (${Ut}/${wt.length})</span>
              <div class="progress-bar">${it(Ft)}</div>
            </div>
            ${R>0?`
            <div class="progress-item clickable-row" data-href="#/contacts">
              <span>Complete ${_.length-R}/${_.length}</span>
              <div class="progress-bar">${it(Math.round((_.length-R)/Math.max(_.length,1)*100))}</div>
            </div>`:""}
          </div>
        </div>
      </div>
    `,window.addEventListener("log-created",()=>fe(t),{once:!0}),t.querySelectorAll(".clickable-row").forEach(s=>{s.addEventListener("click",()=>{const b=s.dataset.href;b&&(window.location.hash=b)})});const qe=d||[],je=(l||[]).filter(s=>s.status==="open");t.querySelectorAll(".triage-row").forEach(s=>{const b=s.dataset.logId;let H=null,rt=null;const Le=s.querySelector(".triage-contact"),Ee=s.querySelector(".triage-contact-list");ie(Le,Ee,qe,T=>`${T.first_name} ${T.last_name}`,T=>{H=T});const Ce=s.querySelector(".triage-project"),xe=s.querySelector(".triage-project-list");ie(Ce,xe,je,T=>T.title,T=>{rt=T}),s.querySelector(".triage-save").addEventListener("click",async()=>{if(!H&&!rt)return;const T={};H&&(T.contact_id=H),rt&&(T.project_id=rt);const{error:Bt}=await g.from("logs").update(T).eq("id",b);if(!Bt&&(s.style.display="none",t.querySelectorAll('.triage-row:not([style*="display: none"])').length===0)){const Rt=t.querySelector(".triage-section");Rt&&(Rt.style.display="none")}}),s.querySelector(".triage-delete").addEventListener("click",async()=>{const{error:T}=await g.from("logs").delete().eq("id",b);if(!T&&(s.style.display="none",t.querySelectorAll('.triage-row:not([style*="display: none"])').length===0)){const _t=t.querySelector(".triage-section");_t&&(_t.style.display="none")}})})}catch(o){t.innerHTML=`<div class="error">Error: ${L(o.message)}</div>`}}function it(t){const a=Math.round(t/100*20),o=20-a;return"█".repeat(a)+"░".repeat(o)+` ${t}%`}function V(t){return t?`${Math.round(t/1e3)}K`:"0"}function re(t,e){return t?t.length>e?t.slice(0,e)+"...":t:""}function L(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}function ce(t){return(t||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}function fa(t){if(!t)return"";const e=new Date(t);return`${String(e.getDate()).padStart(2,"0")}.${String(e.getMonth()+1).padStart(2,"0")}.`}function ie(t,e,a,o,n){let r=-1,u=[];function d(c){if(u=c,r=-1,c.length===0){e.style.display="none";return}e.innerHTML=c.slice(0,6).map((p,m)=>`<div class="qe-ac-item" data-idx="${m}">${L(o(p))}</div>`).join(""),e.style.display=""}function l(c){t.value=o(c),n(c.id),e.style.display="none",u=[]}function i(c){const p=e.querySelectorAll(".qe-ac-item");p.forEach(m=>m.classList.remove("qe-ac-active")),c>=0&&c<p.length?(p[c].classList.add("qe-ac-active"),r=c):r=-1}t.addEventListener("input",()=>{const c=ce(t.value.trim());if(n(null),c.length===0){e.style.display="none";return}d(a.filter(p=>ce(o(p)).includes(c)))}),t.addEventListener("keydown",c=>{e.style.display==="none"||u.length===0||(c.key==="ArrowDown"?(c.preventDefault(),i(Math.min(r+1,u.length-1))):c.key==="ArrowUp"?(c.preventDefault(),i(Math.max(r-1,0))):(c.key==="Enter"||c.key==="Tab")&&r>=0?(c.preventDefault(),l(u[r])):c.key==="Escape"&&(e.style.display="none"))}),e.addEventListener("mousedown",c=>{const p=c.target.closest(".qe-ac-item");if(!p)return;c.preventDefault();const m=parseInt(p.dataset.idx);u[m]&&l(u[m])}),t.addEventListener("blur",()=>{setTimeout(()=>{e.style.display="none"},150)})}let Y="notes";async function ve(t){t.innerHTML='<div class="loading">Loading...</div>';try{const e=(await g.auth.getUser()).data.user;t.innerHTML=`
      <div class="page-header">
        <h1>Extra</h1>
      </div>
      <div class="extra-tabs">
        <a href="#" class="extra-tab${Y==="notes"?" active":""}" data-tab="notes">Notes</a>
        <a href="#" class="extra-tab${Y==="export"?" active":""}" data-tab="export">Export</a>
      </div>
      <div id="extra-content"></div>
    `,t.querySelectorAll(".extra-tab").forEach(o=>{o.addEventListener("click",n=>{n.preventDefault(),Y=o.dataset.tab,ve(t)})});const a=t.querySelector("#extra-content");Y==="notes"?await va(a,e):Y==="export"&&await ga(a,e)}catch(e){t.innerHTML=`<div class="error">Error: ${ge(e.message)}</div>`}}async function va(t,e){const{data:a}=await g.from("inbox").select("content").eq("user_id",e.id).single(),o=(a==null?void 0:a.content)||"";let n=!!a;t.innerHTML=`
    <div class="notes-toolbar">
      <button id="add-timestamp-btn" class="btn btn-sm btn-secondary">Add timestamp</button>
      <span id="inbox-status"></span>
      <button id="inbox-save" class="btn btn-sm btn-primary">Save</button>
    </div>
    <textarea id="inbox-content" class="input inbox-textarea">${ge(o)}</textarea>
  `,t.querySelector("#inbox-save").addEventListener("click",async()=>{const r=t.querySelector("#inbox-content").value,u=new Date().toISOString();let d;n?{error:d}=await g.from("inbox").update({content:r,updated_at:u}).eq("user_id",e.id):({error:d}=await g.from("inbox").insert({user_id:e.id,content:r,updated_at:u}),d||(n=!0));const l=t.querySelector("#inbox-status");d?(l.textContent="Error: "+d.message,l.style.color="var(--danger)"):(l.textContent="Saved",l.style.color="var(--success)",setTimeout(()=>{l.textContent=""},2e3))}),t.querySelector("#add-timestamp-btn").addEventListener("click",()=>{const r=t.querySelector("#inbox-content"),u=ya(new Date),d=r.selectionStart,l=r.value.substring(0,d),i=r.value.substring(d),c=l&&!l.endsWith(`
`)?`
`:"";r.value=l+c+u+`
`+i;const p=l.length+c.length+u.length+1;r.focus(),r.setSelectionRange(p,p)})}async function ga(t){t.innerHTML=`
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
  `,t.querySelector("#export-json").addEventListener("click",async()=>{const e=t.querySelector("#export-json"),a=t.querySelector("#status-json");e.disabled=!0,a.textContent="Exporting...";try{const o=["contacts","companies","projects","inbox","logs"],n={exported_at:new Date().toISOString(),tables:{}};for(const r of o){const{data:u,error:d}=await g.from(r).select("*");if(d)throw new Error(`${r}: ${d.message}`);n.tables[r]=u||[]}jt(`crm-export-${J()}.json`,JSON.stringify(n,null,2),"application/json"),a.textContent="Done",a.style.color="var(--success)"}catch(o){a.textContent="Error: "+o.message,a.style.color="var(--danger)"}finally{e.disabled=!1}}),t.querySelector("#export-contacts-md").addEventListener("click",async()=>{var o;const e=t.querySelector("#export-contacts-md"),a=t.querySelector("#status-contacts-md");e.disabled=!0,a.textContent="Exporting...";try{const{data:n}=await g.from("contacts").select("*, companies(name)").order("last_name"),{data:r}=await g.from("logs").select("contact_id, logged_at, content").not("contact_id","is",null).order("logged_at",{ascending:!1}),u=new Map;for(const l of r||[])l.contact_id&&!u.has(l.contact_id)&&u.set(l.contact_id,l);let d=`# Contacts

Exported: ${J()}

`;for(const l of n||[]){d+=`## ${l.first_name} ${l.last_name}
`,(o=l.companies)!=null&&o.name&&(d+=`- Company: ${l.companies.name}
`),l.email&&(d+=`- Email: ${l.email}
`),l.phone&&(d+=`- Phone: ${l.phone}
`);const i=u.get(l.id);i&&(d+=`- Last log (${i.logged_at}): ${i.content}
`),d+=`
`}jt(`contacts-${J()}.md`,d,"text/markdown"),a.textContent="Done",a.style.color="var(--success)"}catch(n){a.textContent="Error: "+n.message,a.style.color="var(--danger)"}finally{e.disabled=!1}}),t.querySelector("#export-projects-md").addEventListener("click",async()=>{var o;const e=t.querySelector("#export-projects-md"),a=t.querySelector("#status-projects-md");e.disabled=!0,a.textContent="Exporting...";try{const{data:n}=await g.from("projects").select("*, contacts(first_name, last_name), companies(name)").in("status",["open","frozen"]).order("title"),{data:r}=await g.from("logs").select("project_id, logged_at, content").not("project_id","is",null).order("logged_at",{ascending:!1}),u=new Map;for(const l of r||[])l.project_id&&!u.has(l.project_id)&&u.set(l.project_id,l);let d=`# Open Projects

Exported: ${J()}

`;for(const l of n||[]){const i=l.amount?`${Math.round(parseFloat(l.amount)/1e3)}K`:"-";d+=`## ${l.title} (${l.status}, ${i})
`,l.contacts&&(d+=`- Contact: ${l.contacts.first_name} ${l.contacts.last_name}
`),(o=l.companies)!=null&&o.name&&(d+=`- Company: ${l.companies.name}
`),l.expected_close&&(d+=`- Expected close: ${l.expected_close}
`);const c=u.get(l.id);c&&(d+=`- Last log (${c.logged_at}): ${c.content}
`),d+=`
`}jt(`projects-open-${J()}.md`,d,"text/markdown"),a.textContent="Done",a.style.color="var(--success)"}catch(n){a.textContent="Error: "+n.message,a.style.color="var(--danger)"}finally{e.disabled=!1}})}function jt(t,e,a){const o=new Blob([e],{type:a}),n=URL.createObjectURL(o),r=document.createElement("a");r.href=n,r.download=t,r.click(),URL.revokeObjectURL(n)}function J(){return new Date().toISOString().slice(0,10)}function ya(t){const e=String(t.getDate()).padStart(2,"0"),a=String(t.getMonth()+1).padStart(2,"0"),o=t.getFullYear();return`${e}.${a}.${o}`}function ge(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}async function ha(t){t.innerHTML='<div class="loading">Loading...</div>';try{const[{data:e},{data:a},{data:o}]=await Promise.all([g.from("contacts").select("id, first_name, last_name").order("last_name"),g.from("companies").select("id, name").order("name"),g.from("projects").select("id, title").order("title")]);t.innerHTML=`
      <div class="form-page">
        <h1>New Record</h1>

        <form id="combo-form" class="card form-card" novalidate>
          <div class="form-group">
            <label for="c-pick">Contact</label>
            <div class="combo-or-new">
              <select id="c-pick" class="input">
                <option value="">-- pick existing --</option>
                ${(e||[]).map(n=>`<option value="${n.id}">${X(n.first_name)} ${X(n.last_name)}</option>`).join("")}
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
                ${(a||[]).map(n=>`<option value="${n.id}">${X(n.name)}</option>`).join("")}
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
                ${(o||[]).map(n=>`<option value="${n.id}">${X(n.title)}</option>`).join("")}
              </select>
              <span class="muted">or</span>
              <input type="text" id="p-new" class="input" placeholder="new project title">
            </div>
          </div>
          <div class="form-group">
            <label for="c-log">First log entry</label>
            <textarea id="c-log" class="input" rows="2" placeholder="What happened? > next step, ? waiting on them"></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="combo-submit">Save</button>
            <a href="#/" class="btn btn-secondary">Cancel</a>
          </div>
          <div class="form-error" id="combo-error"></div>
        </form>
      </div>
    `,t.querySelector("#c-pick").addEventListener("change",()=>{t.querySelector("#c-pick").value&&(t.querySelector("#c-first").value="",t.querySelector("#c-last").value="")}),t.querySelector("#c-first").addEventListener("input",()=>{t.querySelector("#c-first").value&&(t.querySelector("#c-pick").value="")}),t.querySelector("#c-last").addEventListener("input",()=>{t.querySelector("#c-last").value&&(t.querySelector("#c-pick").value="")}),t.querySelector("#co-pick").addEventListener("change",()=>{t.querySelector("#co-pick").value&&(t.querySelector("#co-new").value="")}),t.querySelector("#co-new").addEventListener("input",()=>{t.querySelector("#co-new").value&&(t.querySelector("#co-pick").value="")}),t.querySelector("#p-pick").addEventListener("change",()=>{t.querySelector("#p-pick").value&&(t.querySelector("#p-new").value="")}),t.querySelector("#p-new").addEventListener("input",()=>{t.querySelector("#p-new").value&&(t.querySelector("#p-pick").value="")}),t.querySelector("#combo-form").addEventListener("submit",async n=>{n.preventDefault(),$a(t);const r=t.querySelector("#c-pick").value,u=t.querySelector("#c-first").value.trim(),d=t.querySelector("#c-last").value.trim();if(!r&&(!u||!d)){ba(t,"c-contact","Pick existing or enter first + last name");return}const l=t.querySelector("#combo-submit");l.disabled=!0,l.textContent="Saving...";try{const i=(await g.auth.getUser()).data.user;let c=t.querySelector("#co-pick").value||null,p=t.querySelector("#p-pick").value||null;const m=t.querySelector("#co-new").value.trim();if(m&&!c){const{data:y,error:w}=await g.from("companies").insert({name:m,user_id:i.id}).select().single();if(w)throw w;c=y.id}let h;if(r){const{data:y}=await g.from("contacts").select("id").eq("id",r).single();h=y,c&&await g.from("contacts").update({company_id:c}).eq("id",r)}else{const{data:y,error:w}=await g.from("contacts").insert({first_name:u,last_name:d,company_id:c,user_id:i.id}).select().single();if(w)throw w;h=y}const f=t.querySelector("#p-new").value.trim();if(f&&!p){const{data:y,error:w}=await g.from("projects").insert({title:f,status:"open",contact_id:h.id,company_id:c,user_id:i.id}).select().single();if(w)throw w;p=y.id}else p&&await g.from("projects").update({contact_id:h.id,company_id:c||void 0}).eq("id",p);const v=t.querySelector("#c-log").value.trim();v&&await g.from("logs").insert({user_id:i.id,contact_id:h.id,project_id:p||null,content:v,logged_at:new Date().toISOString().slice(0,10)}),window.location.hash=`#/contacts/${h.id}`}catch(i){t.querySelector("#combo-error").textContent="Error: "+i.message,l.disabled=!1,l.textContent="Save"}})}catch(e){t.innerHTML=`<div class="error">Error: ${X(e.message)}</div>`}}function ba(t,e,a){const o=t.querySelector(`#err-${e}`);o&&(o.textContent=a)}function $a(t){t.querySelectorAll(".field-error").forEach(e=>e.textContent=""),t.querySelector("#combo-error").textContent=""}function X(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}async function wa(t){t.innerHTML='<div class="loading">Loading...</div>';try{const{data:e}=await g.from("projects").select("id, title, amount, status, updated_at, contact_id, contacts(first_name, last_name)").in("status",["won","lost"]).order("updated_at",{ascending:!1}),a=e||[],o=new Set;for(const i of a)if(i.updated_at){const c=new Date(i.updated_at);o.add(`${c.getFullYear()}-${String(c.getMonth()+1).padStart(2,"0")}`)}const n=Array.from(o).sort().reverse(),r=a.filter(i=>i.status==="won"),u=a.filter(i=>i.status==="lost"),d=new Set;for(const i of a)i.updated_at&&d.add(new Date(i.updated_at).getFullYear());const l=Array.from(d).sort().reverse().map(i=>{const c=r.filter(y=>new Date(y.updated_at).getFullYear()===i),p=u.filter(y=>new Date(y.updated_at).getFullYear()===i),m=c.reduce((y,w)=>y+(parseFloat(w.amount)||0),0),h=p.reduce((y,w)=>y+(parseFloat(w.amount)||0),0),f=c.length+p.length,v=f>0?Math.round(c.length/f*100):0;return`${i}: ${c.length} won (${xt(m)}) &middot; ${p.length} lost (${xt(h)}) &middot; win rate ${v}%`});t.innerHTML=`
      <div class="page-header">
        <h1>Heroes & Zeroes</h1>
        <div class="header-actions">
          <select id="month-filter" class="input">
            <option value="all">All time</option>
            ${n.map(i=>`<option value="${i}">${Sa(i)}</option>`).join("")}
          </select>
        </div>
      </div>

      <div class="heroes-stats">
        ${l.map(i=>`<div>${i}</div>`).join("")}
      </div>

      <div class="heroes-grid">
        <div class="heroes-col">
          <div class="section-bar section-bar-contacts">HEROES</div>
          ${r.length===0?'<div class="empty-state">No wins yet.</div>':`<div class="table-wrap">
              <table class="data-table" id="heroes-table">
                <thead><tr><th>Project</th><th>Value</th><th>Contact</th><th>Date</th></tr></thead>
                <tbody>
                  ${r.map(i=>le(i)).join("")}
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
                  ${u.map(i=>le(i)).join("")}
                </tbody>
              </table>
            </div>`}
        </div>
      </div>
    `,t.querySelector("#month-filter").addEventListener("change",i=>{const c=i.target.value;t.querySelectorAll("#heroes-table tbody tr, #zeroes-table tbody tr").forEach(m=>{c==="all"?m.style.display="":m.style.display=m.dataset.month===c?"":"none"})}),t.querySelectorAll(".clickable-row").forEach(i=>{i.addEventListener("click",()=>{window.location.hash=`#/projects/${i.dataset.id}`})})}catch(e){t.innerHTML=`<div class="error">Error: ${mt(e.message)}</div>`}}function le(t){const e=t.updated_at?new Date(t.updated_at):null,a=e?`${String(e.getDate()).padStart(2,"0")}.${String(e.getMonth()+1).padStart(2,"0")}.${e.getFullYear()}`:"-",o=e?`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}`:"",n=t.contacts?`${mt(t.contacts.first_name)} ${mt(t.contacts.last_name)}`:"-";return`
    <tr class="clickable-row" data-id="${t.id}" data-month="${o}">
      <td><strong>${mt(t.title)}</strong></td>
      <td>${t.amount?xt(parseFloat(t.amount)):"-"}</td>
      <td>${n}</td>
      <td>${a}</td>
    </tr>
  `}function xt(t){return t?`${Math.round(t/1e3)}K`:"0"}function Sa(t){const[e,a]=t.split("-");return`${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(a)]} ${e}`}function mt(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}let ft=null,vt=null,et=null,at=null;async function _a(){if(!ft||!vt){const[{data:t},{data:e}]=await Promise.all([g.from("contacts").select("id, first_name, last_name").order("last_name"),g.from("projects").select("id, title").eq("status","open").order("title")]);ft=t||[],vt=e||[]}return{contacts:ft,projects:vt}}window.addEventListener("log-created",()=>{ft=null,vt=null});async function qa(t,e={}){if(t)try{const{contacts:a,projects:o}=await _a();e.contactId&&(et=e.contactId),e.projectId&&(at=e.projectId);const n=et?(()=>{const f=a.find(v=>v.id===et);return f?`${f.first_name} ${f.last_name}`:""})():"",r=at?(()=>{const f=o.find(v=>v.id===at);return f?f.title:""})():"";t.innerHTML=`
      <div class="quick-entry">
        <div class="qe-ac-wrap">
          <input type="text" id="qe-contact" class="input qe-ac-input" placeholder="contact" value="${kt(n)}" autocomplete="off">
          <input type="hidden" id="qe-contact-id" value="${et||""}">
          <div class="qe-ac-list" id="qe-contact-list"></div>
        </div>
        <div class="qe-ac-wrap">
          <input type="text" id="qe-project" class="input qe-ac-input" placeholder="project" value="${kt(r)}" autocomplete="off">
          <input type="hidden" id="qe-project-id" value="${at||""}">
          <div class="qe-ac-list" id="qe-project-list"></div>
        </div>
        <input type="text" id="qe-content" class="input qe-input" placeholder="what happened?  (> next step, ? waiting on them)" autocomplete="off">
        <span id="qe-status" class="qe-status"></span>
      </div>
    `;const u=t.querySelector("#qe-content"),d=t.querySelector("#qe-contact"),l=t.querySelector("#qe-contact-id"),i=t.querySelector("#qe-contact-list"),c=t.querySelector("#qe-project"),p=t.querySelector("#qe-project-id"),m=t.querySelector("#qe-project-list"),h=t.querySelector("#qe-status");de(d,l,i,a,f=>`${f.first_name} ${f.last_name}`,"id"),de(c,p,m,o,f=>f.title,"id"),u.addEventListener("keydown",async f=>{f.key==="Enter"&&!f.shiftKey&&(f.preventDefault(),await ja(t))}),d.addEventListener("keydown",f=>{f.key==="Enter"&&!i.querySelector(".qe-ac-item.qe-ac-active")&&(f.preventDefault(),c.focus())}),c.addEventListener("keydown",f=>{f.key==="Enter"&&!m.querySelector(".qe-ac-item.qe-ac-active")&&(f.preventDefault(),u.focus())})}catch{t.innerHTML=""}}function de(t,e,a,o,n,r){let u=-1,d=[];function l(p){if(d=p,u=-1,p.length===0){a.style.display="none";return}a.innerHTML=p.slice(0,6).map((m,h)=>`<div class="qe-ac-item" data-idx="${h}">${kt(n(m))}</div>`).join(""),a.style.display=""}function i(p){t.value=n(p),e.value=p[r],a.style.display="none",d=[]}function c(p){const m=a.querySelectorAll(".qe-ac-item");m.forEach(h=>h.classList.remove("qe-ac-active")),p>=0&&p<m.length?(m[p].classList.add("qe-ac-active"),u=p):u=-1}t.addEventListener("input",()=>{const p=lt(t.value.trim());if(e.value="",p.length===0){a.style.display="none";return}const m=o.filter(h=>lt(n(h)).includes(p));l(m)}),t.addEventListener("keydown",p=>{a.style.display==="none"||d.length===0||(p.key==="ArrowDown"?(p.preventDefault(),c(Math.min(u+1,d.length-1))):p.key==="ArrowUp"?(p.preventDefault(),c(Math.max(u-1,0))):(p.key==="Enter"||p.key==="Tab")&&u>=0?(p.preventDefault(),i(d[u])):p.key==="Escape"&&(a.style.display="none"))}),a.addEventListener("mousedown",p=>{const m=p.target.closest(".qe-ac-item");if(!m)return;p.preventDefault();const h=parseInt(m.dataset.idx);d[h]&&i(d[h])}),t.addEventListener("blur",()=>{setTimeout(()=>{a.style.display="none"},150)}),t.addEventListener("focus",()=>{if(t.value.trim()&&e.value)return;const p=lt(t.value.trim());if(p.length>0){const m=o.filter(h=>lt(n(h)).includes(p));l(m)}})}async function ja(t){const e=t.querySelector("#qe-content"),a=e.value.trim();if(!a)return;const o=t.querySelector("#qe-contact-id").value||null,n=t.querySelector("#qe-project-id").value||null,r=t.querySelector("#qe-status"),u=new Date().toISOString().slice(0,10),d=(await g.auth.getUser()).data.user;if(!d)return;const{error:l}=await g.from("logs").insert({user_id:d.id,content:a,contact_id:o,project_id:n,logged_at:u});l?(r.textContent="Error",r.style.color="var(--danger)"):(r.textContent="Saved",r.style.color="var(--success)",e.value="",et=o,at=n,setTimeout(()=>{r.textContent=""},2e3),window.dispatchEvent(new CustomEvent("log-created")),e.focus())}function lt(t){return(t||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}function kt(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}const x=document.getElementById("app"),nt=document.getElementById("brand"),Lt=document.getElementById("quick-entry");let ot=null,Et=null;function La(){return(window.location.hash.replace(/^#\/?/,"")||"").split("/").filter(Boolean)}async function Dt(){if(!ot){nt.style.display="none",Lt.style.display="none",We(x);return}nt.style.display="",Lt.style.display="",await Ea();const t=La();t[0]==="contacts"&&t[1]==="new"?await Qt(x):t[0]==="contacts"&&t[1]&&t[2]==="edit"?await Qt(x,t[1]):t[0]==="contacts"&&t[1]?await ut(x,t[1]):t[0]==="companies"&&t[1]==="new"?await oa(x):t[0]==="companies"&&t[1]&&t[2]==="edit"?window.location.hash=`#/companies/${t[1]}`:t[0]==="companies"&&t[1]?await aa(x,t[1]):t[0]==="companies"?await pt(x):t[0]==="projects"&&t[1]==="new"?await oe(x):t[0]==="projects"&&t[1]&&t[2]==="edit"?await oe(x,t[1]):t[0]==="projects"&&t[1]?await Ct(x,t[1]):t[0]==="projects"?await Q(x):t[0]==="contacts"?await dt(x):t[0]==="combo"?await ha(x):t[0]==="heroes"?await wa(x):t[0]==="extra"?await ve(x):await fe(x);const e={};t[0]==="contacts"&&t[1]&&t[1]!=="new"&&t[2]!=="edit"?e.contactId=t[1]:t[0]==="projects"&&t[1]&&t[1]!=="new"&&t[2]!=="edit"&&(e.projectId=t[1]),qa(Lt,e)}async function Ea(){const t=window.location.hash||"#/";let e="";try{const{data:i}=await g.from("projects").select("amount").in("status",["open"]),c=(i||[]).reduce((m,h)=>m+(parseFloat(h.amount)||0),0),p=Math.round(c/1e3);p>0&&(e=`${p} $`)}catch{}const a=new Date,o=a.toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit",year:"numeric"}),n=a.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit",second:"2-digit"}),r=a.toLocaleDateString("en-US",{weekday:"long"}),u=Oe();function d(i,c,p){const m=i==="#/"?t==="#/"||t==="":t.startsWith(i),h=p?` <span class="nav-metric${m?" nav-metric-active":""}">(${p})</span>`:"";return`<a href="${i}" class="${m?"active":""}"><span class="nav-label">${c}</span>${h}</a>`}nt.innerHTML=`
    <div class="brand-logo">${u}</div>
    <div class="brand-name">CRM Brevis</div>
    <div class="brand-time">
      <div id="brand-date">${o}</div>
      <div id="brand-time">${n}</div>
      <div>${r}</div>
    </div>
    <div class="brand-sep">────────────────</div>
    <div class="brand-nav">
      ${d("#/","Dashboard")}
      ${d("#/projects","Projects",e)}
      ${d("#/contacts","Contacts")}
      ${d("#/companies","Companies")}
      ${d("#/heroes","Heroes")}
      ${d("#/combo","+ Combo")}
      ${d("#/extra","Extra")}
    </div>
    <div class="brand-sep">────────────────</div>
    <div class="brand-user">
      ${Ca(ot.email)}<br>
      <a id="sign-out-link" href="#">Sign out</a>
    </div>
    <div class="brand-fill"></div>
  `,nt.querySelector("#sign-out-link").addEventListener("click",async i=>{i.preventDefault(),await Ae(),window.location.hash="#/"}),Et&&clearInterval(Et),Et=setInterval(()=>{const i=new Date,c=document.getElementById("brand-date"),p=document.getElementById("brand-time");c&&(c.textContent=i.toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit",year:"numeric"})),p&&(p.textContent=i.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit",second:"2-digit"}))},1e3);const l=nt.querySelector(".brand-fill");if(l){let i="";for(let c=0;c<500;c++)i+="░";l.textContent=i}}He(t=>{ot=t,Dt()});window.addEventListener("hashchange",()=>{ot&&Dt()});(async()=>(ot=await Pe(),Dt()))();function Ca(t){if(!t)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}
