(()=>{
const db=window.supabase?.createClient('https://gkljzpwfmthzjgfzzeoy.supabase.co','sb_publishable_x6NB71lEqcvtxODHt-cdKQ_BMLVLA3o');
if(!db)return;
const el=id=>document.getElementById(id);
let token=localStorage.getItem('ae_session')||'';
let account=null;
const managerRoles=['rh','assistant_direction','copatron','patron'];
const roleLabels={client:'Client',mecano_novice:'Mécano novice',mecano_intermediaire:'Mécano intermédiaire',mecano_experimente:'Mécano expérimenté',chef_equipe:"Chef d'équipe",rh:'RH',assistant_direction:'Assistant de direction',copatron:'Co-patron',patron:'Patron'};

async function rpc(name,args={}){const {data,error}=await db.rpc(name,args);if(error)throw error;return data}
function feedback(msg){if(el('authFeedback'))el('authFeedback').textContent=msg}
function saveSession(result){token=result?.token||'';account=result?.account||null;if(token)localStorage.setItem('ae_session',token);else localStorage.removeItem('ae_session')}
function money(v){return Number(v||0).toLocaleString('fr-FR')+' $'}
function esc(v){return String(v??'')}

async function refresh(){
  if(token){
    try{
      account=await rpc('ae_me',{p_token:token});
      if(!account){token='';localStorage.removeItem('ae_session')}
    }catch(_){token='';account=null;localStorage.removeItem('ae_session')}
  }
  const connected=!!account;
  if(el('submitOrder'))el('submitOrder').style.display=connected&&account.role==='client'?'inline-flex':'none';
  if(el('orderLogin'))el('orderLogin').parentElement.style.display=connected?'none':'flex';
  if(el('signOut'))el('signOut').style.display=connected?'inline-flex':'none';
  if(connected)feedback('Connecté : '+account.first_name+' '+account.last_name+' — '+(roleLabels[account.role]||account.role));
  await Promise.all([loadOrders(),loadNotifications(),loadStaff(),loadNews(),managerRefresh()]);
}

async function loadOrders(){
  const box=el('ordersList');if(!box)return;
  box.replaceChildren();
  if(!token||!account){
    const c=document.createElement('div');c.className='card';c.textContent='Connectez-vous pour retrouver vos commandes.';box.append(c);return;
  }
  if(account.role!=='client'){
    const c=document.createElement('div');c.className='card';c.textContent='Cet espace est réservé aux comptes clients.';box.append(c);return;
  }
  try{
    const data=await rpc('ae_list_my_orders',{p_token:token});
    if(!data?.length){const c=document.createElement('div');c.className='card';c.textContent='Aucune commande pour le moment.';box.append(c);return}
    for(const o of data){
      const card=document.createElement('article');card.className='order-card reveal';
      const top=document.createElement('div');top.className='order-top';
      const left=document.createElement('div');
      const tag=document.createElement('span');tag.className='tag';tag.textContent=o.status;
      const title=document.createElement('h3');title.textContent='Commande AE-'+String(o.id).padStart(4,'0');
      const meta=document.createElement('p');meta.className='muted';meta.textContent=o.quantity+' kit(s) moteur standard · '+new Date(o.created_at).toLocaleString('fr-FR');
      left.append(tag,title,meta);
      const total=document.createElement('div');total.className='order-total';total.textContent=money(o.quantity*o.unit_price);
      top.append(left,total);

      const timeline=document.createElement('div');timeline.className='timeline';
      const steps=[
        ['Commande reçue',true],
        ['En attente de préparation',o.status!=='Annulée' || true],
        [o.status==='Annulée'?'Annulée':'Livrée',o.status==='Livrée'||o.status==='Annulée']
      ];
      steps.forEach((s,i)=>{
        const st=document.createElement('div');st.className='timeline-step';
        if(i===0|| (i===1 && o.status!=='Annulée') || (i===2&&s[1]))st.classList.add('done');
        if(i===2&&o.status==='Annulée')st.classList.add('cancelled');
        st.textContent=s[0];timeline.append(st);
      });

      card.append(top,timeline);
      if(o.cancel_reason){const reason=document.createElement('p');reason.className='notice';reason.textContent='Motif d’annulation : '+o.cancel_reason;card.append(reason)}
      const actions=document.createElement('div');actions.className='auth-actions';
      const reorder=document.createElement('button');reorder.className='btn secondary';reorder.type='button';reorder.textContent='Recommander';
      reorder.onclick=()=>{if(window.setOrderQty)window.setOrderQty(o.quantity);location.hash='#/commander'};
      actions.append(reorder);card.append(actions);box.append(card);
    }
    revealNow();
  }catch(err){const c=document.createElement('div');c.className='card';c.textContent='Impossible de charger les commandes : '+err.message;box.append(c)}
}

async function loadNotifications(){
  const list=el('notificationsList'),badge=el('notificationBadge');if(!list||!badge)return;
  list.replaceChildren();
  if(!token||!account){const p=document.createElement('p');p.className='muted';p.textContent='Connectez-vous pour voir vos notifications.';list.append(p);badge.classList.add('hidden');return}
  try{
    const data=await rpc('ae_list_my_notifications',{p_token:token});
    const unread=(data||[]).filter(n=>!n.read_at).length;
    badge.textContent=String(unread);badge.classList.toggle('hidden',unread===0);
    if(!data?.length){const p=document.createElement('p');p.className='muted';p.textContent='Aucune notification.';list.append(p);return}
    for(const n of data){
      const item=document.createElement('div');item.className='notification-item'+(!n.read_at?' unread':'');
      const title=document.createElement('strong');title.textContent=n.title;
      const body=document.createElement('p');body.className='muted';body.textContent=n.body;
      const date=document.createElement('small');date.className='muted';date.textContent=new Date(n.created_at).toLocaleString('fr-FR');
      item.append(title,body,date);list.append(item);
    }
  }catch(err){list.textContent='Notifications indisponibles : '+err.message}
}

async function loadStaff(){
  const box=el('staffList');if(!box)return;
  try{
    const staff=await rpc('ae_public_staff');
    box.replaceChildren();
    const reviewSelect=el('reviewStaff');
    if(reviewSelect){
      const current=reviewSelect.value;
      reviewSelect.replaceChildren();
      const first=document.createElement('option');first.value='';first.textContent='Choisir un employé';reviewSelect.append(first);
      for(const person of staff||[]){const opt=document.createElement('option');opt.value=person.account_id;opt.textContent=person.name+' — '+(roleLabels[person.role]||person.role);reviewSelect.append(opt)}
      if([...reviewSelect.options].some(o=>o.value===current))reviewSelect.value=current;
    }
    const hint=el('reviewHint');
    if(hint)hint.textContent=account?.role==='client'?'Choisissez un employé et une note de 1 à 5 étoiles.':'Vous devez être connecté avec un compte client pour noter un employé.';
    if(!staff?.length){const c=document.createElement('div');c.className='card';c.innerHTML='<h3>Équipe en préparation</h3><p class="muted">Les fiches apparaîtront ici dès que les comptes employés seront configurés.</p>';box.append(c);return}
    for(const s of staff){
      const card=document.createElement('article');card.className='card staff-card reveal';
      const head=document.createElement('div');head.className='staff-head';
      const avatar=document.createElement('div');avatar.className='staff-avatar';
      if(s.avatar_url){const img=document.createElement('img');img.src=s.avatar_url;img.alt='';img.className='staff-avatar';avatar.replaceWith(img);head.append(img)}else{avatar.textContent=(s.name||'?').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();head.append(avatar)}
      const duty=document.createElement('span');duty.className='duty '+(s.on_duty?'on':'off');duty.textContent=s.on_duty?'En service':'Hors service';head.append(duty);
      const role=document.createElement('span');role.className='tag';role.textContent=roleLabels[s.role]||s.role;
      const name=document.createElement('h3');name.textContent=s.name;
      const meta=document.createElement('p');meta.className='muted';meta.textContent=(s.joined_at?'Depuis le '+new Date(s.joined_at+'T00:00:00').toLocaleDateString('fr-FR'):'Ancienneté non renseignée')+' · '+Number(s.interventions_count||0)+' intervention(s)';
      const rating=document.createElement('p');rating.className='muted';rating.textContent=(Number(s.rating_avg||0)>0?Number(s.rating_avg).toFixed(1):'—')+' / 5 · '+Number(s.rating_count||0)+' avis';
      card.append(head,role,name,meta,rating);
      if(s.bio){const bio=document.createElement('p');bio.className='muted';bio.textContent=s.bio;card.append(bio)}
      box.append(card);
    }
    revealNow();
  }catch(err){box.textContent='Impossible de charger l’équipe : '+err.message}
}

async function loadNews(){
  const box=el('newsList');if(!box)return;
  try{
    const news=await rpc('ae_public_news');box.replaceChildren();
    if(!news?.length){const c=document.createElement('article');c.className='card';c.innerHTML='<span class="tag">JOURNAL</span><h3>Le journal arrive bientôt</h3><p class="muted">La direction pourra publier ici les annonces, événements, nouveautés et recrutements.</p>';box.append(c);return}
    for(const n of news){
      const card=document.createElement('article');card.className='card news-card reveal'+(n.cover_url?' has-cover':'');
      if(n.cover_url)card.style.backgroundImage='url("'+String(n.cover_url).replaceAll('"','')+'")';
      const tag=document.createElement('span');tag.className='tag';tag.textContent=n.category;
      const title=document.createElement('h3');title.textContent=n.title;
      const body=document.createElement('p');body.className='muted';body.textContent=n.body;
      const date=document.createElement('small');date.className='muted';date.textContent=new Date(n.created_at).toLocaleDateString('fr-FR');
      card.append(tag,title,body,date);
      if(account&&managerRoles.includes(account.role)){
        const del=document.createElement('button');del.type='button';del.className='btn secondary';del.textContent='Supprimer';del.onclick=async()=>{if(!confirm('Supprimer cette publication ?'))return;try{await rpc('ae_manager_delete_news',{p_token:token,p_id:n.id});await loadNews()}catch(err){alert(err.message)}};card.append(del);
      }
      box.append(card);
    }
    revealNow();
  }catch(err){box.textContent='Journal indisponible : '+err.message}
}

el('loginForm')?.addEventListener('submit',async e=>{
  e.preventDefault();const i=e.currentTarget.querySelectorAll('input');
  try{const result=await rpc('ae_login',{p_login:i[0].value,p_password:i[1].value});saveSession(result);feedback('Connexion réussie.');await refresh();location.hash=account?.role==='client'?'#/commander':'#/direction'}
  catch(err){feedback('Connexion impossible : '+err.message)}
});

el('registerForm')?.addEventListener('submit',async e=>{
  e.preventDefault();const a=[...e.currentTarget.querySelectorAll('input')].map(x=>x.value.trim());
  try{
    const result=await rpc('ae_register_client',{p_first_name:a[0],p_last_name:a[1],p_phone:a[2],p_iban_rp:a[3],p_civil_id_rp:a[4],p_password:a[5]});
    saveSession(result);e.currentTarget.reset();feedback('Compte créé ! Vous êtes connecté.');await refresh();location.hash='#/commander';
  }catch(err){feedback('Inscription impossible : '+err.message)}
});

el('submitOrder')?.addEventListener('click',async()=>{
  if(!account||account.role!=='client')return;
  const quantity=Math.max(1,Number(el('qty')?.textContent||1));
  if(!confirm('Confirmer '+quantity+' kit(s) moteur standard pour '+money(quantity*750)+' ?'))return;
  try{
    const result=await rpc('ae_create_order',{p_token:token,p_quantity:quantity});
    alert('Commande AE-'+String(result.id).padStart(4,'0')+' enregistrée !');
    location.hash='#/commandes';await Promise.all([loadOrders(),loadNotifications()]);
  }catch(err){alert('Commande impossible : '+err.message)}
});

el('signOut')?.addEventListener('click',async()=>{try{if(token)await rpc('ae_logout',{p_token:token})}catch(_){}token='';account=null;localStorage.removeItem('ae_session');feedback('Déconnecté.');await refresh()});

const requestForms=[];
if(el('recruit'))requestForms.push([el('recruit'),'recrutement']);
document.querySelectorAll('form.simpleform').forEach((f,i)=>requestForms.push([f,i===0?'partenariat':'evenement']));
for(const [form,kind] of requestForms){
  form.addEventListener('submit',async e=>{
    e.preventDefault();const payload={};
    [...form.querySelectorAll('input,textarea')].forEach((input,i)=>{const key=input.placeholder||input.previousElementSibling?.textContent||('champ_'+(i+1));payload[key]=input.value.trim()});
    const button=form.querySelector('[type=submit]');button.disabled=true;
    try{const result=await rpc('ae_submit_request',{p_kind:kind,p_payload:payload});form.reset();alert('Demande envoyée ! Numéro #'+result.id)}
    catch(err){alert('Envoi impossible : '+err.message)}
    finally{button.disabled=false}
  });
}

let selectedReviewRating=0;
document.querySelectorAll('#reviewStars [data-rating]').forEach(button=>button.addEventListener('click',()=>{
  selectedReviewRating=Number(button.dataset.rating);
  if(el('reviewRating'))el('reviewRating').value=String(selectedReviewRating);
  document.querySelectorAll('#reviewStars [data-rating]').forEach(star=>star.classList.toggle('active',Number(star.dataset.rating)<=selectedReviewRating));
}));
el('reviewForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!account||account.role!=='client'){location.hash='#/espace';feedback('Connectez-vous avec un compte client pour laisser un avis.');return}
  const staffId=el('reviewStaff')?.value;
  if(!staffId||selectedReviewRating<1){alert('Choisissez un employé et une note de 1 à 5 étoiles.');return}
  try{
    await rpc('ae_rate_staff',{p_token:token,p_staff_account_id:staffId,p_stars:selectedReviewRating});
    alert('Votre avis a bien été enregistré.');
    selectedReviewRating=0;if(el('reviewRating'))el('reviewRating').value='0';
    document.querySelectorAll('#reviewStars [data-rating]').forEach(star=>star.classList.remove('active'));
    if(el('reviewStaff'))el('reviewStaff').value='';
    await loadStaff();
  }catch(err){alert('Avis impossible : '+err.message)}
});

el('newsForm')?.addEventListener('submit',async e=>{
  e.preventDefault();if(!account||!managerRoles.includes(account.role))return;
  const fields=e.currentTarget.querySelectorAll('input,select,textarea');
  try{
    await rpc('ae_manager_create_news',{p_token:token,p_title:fields[0].value,p_category:fields[1].value,p_cover_url:fields[2].value,p_body:fields[3].value});
    e.currentTarget.reset();alert('Publication ajoutée au journal.');await loadNews();
  }catch(err){alert('Publication impossible : '+err.message)}
});

async function managerRefresh(){
  const panel=el('managerPanel');if(!panel)return;
  const manager=!!account&&managerRoles.includes(account.role);
  panel.classList.toggle('hidden',!manager);if(!manager)return;

  try{
    const stats=await rpc('ae_manager_stats',{p_token:token});const box=el('managerStats');box.replaceChildren();
    [['Commandes livrées',stats.delivered_orders],['Kits moteur vendus',stats.kits_sold],['CA livré',money(stats.revenue)]].forEach(([label,value])=>{
      const c=document.createElement('div');c.className='stat-card reveal';const strong=document.createElement('strong');strong.textContent=value;const span=document.createElement('span');span.textContent=label;c.append(strong,span);box.append(c)
    });
  }catch(err){el('managerStats').textContent='Statistiques indisponibles : '+err.message}

  try{
    const req=await rpc('ae_manager_list_requests',{p_token:token});const requestBox=el('managerRequests');requestBox.replaceChildren();
    if(!req?.length)requestBox.textContent='Aucune demande.';
    for(const item of req||[]){
      const box=document.createElement('div');box.className='manager-item';
      const title=document.createElement('strong');title.textContent=item.kind+' #'+item.id+' — '+item.status;
      const p=document.createElement('p');p.textContent=Object.entries(item.payload||{}).map(([k,v])=>k+': '+v).join(' · ');
      box.append(title,p);
      for(const [label,status] of [['Accepter','acceptee'],['Refuser','refusee']]){
        const b=document.createElement('button');b.className='btn secondary';b.textContent=label;b.onclick=async()=>{try{await rpc('ae_manager_update_request',{p_token:token,p_id:item.id,p_status:status});await managerRefresh()}catch(err){alert(err.message)}};box.append(b)
      }
      requestBox.append(box);
    }
  }catch(err){el('managerRequests').textContent='Accès impossible : '+err.message}

  try{
    const orders=await rpc('ae_manager_list_orders',{p_token:token});const orderBox=el('managerOrders');orderBox.replaceChildren();
    if(!orders?.length)orderBox.textContent='Aucune commande.';
    for(const item of orders||[]){
      const box=document.createElement('div');box.className='manager-item';
      const title=document.createElement('strong');title.textContent='AE-'+String(item.id).padStart(4,'0')+' — '+item.status;
      const p=document.createElement('p');p.textContent=item.customer+' · '+(item.phone||'sans téléphone')+' · '+item.quantity+' kit(s) · '+money(item.quantity*item.unit_price);
      box.append(title,p);
      if(item.status==='En attente de préparation'){
        const delivered=document.createElement('button');delivered.className='btn secondary';delivered.textContent='Livrée';delivered.onclick=async()=>{try{await rpc('ae_manager_update_order',{p_token:token,p_id:item.id,p_status:'Livrée',p_reason:null});await managerRefresh()}catch(err){alert(err.message)}};
        const cancel=document.createElement('button');cancel.className='btn secondary';cancel.textContent='Annuler';cancel.onclick=async()=>{const reason=prompt('Motif de l’annulation (obligatoire) :')?.trim();if(!reason)return;try{await rpc('ae_manager_update_order',{p_token:token,p_id:item.id,p_status:'Annulée',p_reason:reason});await managerRefresh()}catch(err){alert(err.message)}};
        box.append(delivered,cancel);
      }
      orderBox.append(box);
    }
  }catch(err){el('managerOrders').textContent='Accès impossible : '+err.message}

  try{
    const customers=await rpc('ae_manager_list_customers',{p_token:token});const box=el('managerCustomers');box.replaceChildren();
    if(!customers?.length)box.textContent='Aucun client.';
    for(const c of customers||[]){
      const details=document.createElement('details');details.className='client-file';
      const summary=document.createElement('summary');summary.textContent=c.name+' · '+(c.phone||'sans téléphone');
      const meta=document.createElement('div');meta.className='client-meta';
      const spent=document.createElement('div');spent.innerHTML='<small>Total dépensé</small><strong>'+money(c.total_spent)+'</strong>';
      const last=document.createElement('div');last.innerHTML='<small>Dernière commande</small><strong>'+(c.last_order_at?new Date(c.last_order_at).toLocaleDateString('fr-FR'):'Aucune')+'</strong>';
      meta.append(spent,last);
      const ids=document.createElement('p');ids.className='muted';ids.textContent='IBAN RP : '+(c.iban_rp||'—')+' · ID RP : '+(c.civil_id_rp||'—');
      details.append(summary,meta,ids);
      for(const o of c.orders||[]){const row=document.createElement('p');row.className='small muted';row.textContent='AE-'+String(o.id).padStart(4,'0')+' · '+o.quantity+' kit(s) · '+o.status+' · '+money(o.quantity*o.unit_price);details.append(row)}
      box.append(details);
    }
  }catch(err){el('managerCustomers').textContent='Fiches clients indisponibles : '+err.message}

  try{
    const employees=await rpc('ae_manager_list_employees',{p_token:token});const box=el('managerEmployees');box.replaceChildren();
    if(!employees?.length)box.textContent='Aucun compte employé configuré.';
    for(const emp of employees||[]){
      const wrap=document.createElement('details');wrap.className='client-file';
      const summary=document.createElement('summary');summary.textContent=emp.name+' · '+(roleLabels[emp.role]||emp.role);
      const form=document.createElement('form');form.className='form';form.innerHTML='<input placeholder="URL avatar" value="'+esc(emp.avatar_url||'').replaceAll('"','&quot;')+'"><label>Date d’arrivée</label><input type="date" value="'+esc(emp.joined_at||'')+'"><input type="number" min="0" placeholder="Nombre d’interventions" value="'+Number(emp.interventions_count||0)+'"><label><input type="checkbox" '+(emp.on_duty?'checked':'')+'> En service</label><textarea placeholder="Petite présentation">'+esc(emp.bio||'')+'</textarea><button class="btn secondary" type="submit">Enregistrer la fiche</button>';
      form.onsubmit=async e=>{e.preventDefault();const f=form.querySelectorAll('input,textarea');try{await rpc('ae_manager_update_staff_profile',{p_token:token,p_account_id:emp.account_id,p_avatar_url:f[0].value,p_joined_at:f[1].value||null,p_interventions_count:Number(f[2].value||0),p_on_duty:f[3].checked,p_bio:f[4].value});alert('Fiche employé mise à jour.');await Promise.all([managerRefresh(),loadStaff()])}catch(err){alert(err.message)}};
      wrap.append(summary,form);box.append(wrap);
    }
  }catch(err){el('managerEmployees').textContent='Fiches employés indisponibles : '+err.message}
  revealNow();
}

el('notificationToggle')?.addEventListener('click',()=>el('notificationsPanel')?.classList.toggle('hidden'));
el('closeNotifications')?.addEventListener('click',()=>el('notificationsPanel')?.classList.add('hidden'));
el('markNotificationsRead')?.addEventListener('click',async()=>{if(!token)return;try{await rpc('ae_mark_notifications_read',{p_token:token});await loadNotifications()}catch(err){alert(err.message)}});

function revealNow(){
  document.querySelectorAll('.section .card,.order-card,.stat-card,.staff-card,.news-card').forEach(node=>{
    if(!node.classList.contains('reveal'))node.classList.add('reveal');
    observer.observe(node);
  });
}
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});
window.addEventListener('hashchange',()=>setTimeout(revealNow,80));
setTimeout(revealNow,100);
setInterval(()=>{if(account)loadNotifications()},60000);
refresh();
})();