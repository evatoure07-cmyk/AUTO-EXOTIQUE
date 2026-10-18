(()=>{
const db=window.supabase?.createClient('https://gkljzpwfmthzjgfzzeoy.supabase.co','sb_publishable_x6NB71lEqcvtxODHt-cdKQ_BMLVLA3o');
if(!db)return;
const el=id=>document.getElementById(id);
let token=localStorage.getItem('ae_session')||'';
let account=null;

async function rpc(name,args={}){const {data,error}=await db.rpc(name,args);if(error)throw error;return data}
function feedback(msg){if(el('authFeedback'))el('authFeedback').textContent=msg}
function saveSession(result){token=result?.token||'';account=result?.account||null;if(token)localStorage.setItem('ae_session',token);else localStorage.removeItem('ae_session')}
async function refresh(){
  if(token){try{account=await rpc('ae_me',{p_token:token});if(!account){token='';localStorage.removeItem('ae_session')}}catch(_){token='';account=null;localStorage.removeItem('ae_session')}}
  const connected=!!account;
  if(el('submitOrder'))el('submitOrder').style.display=connected&&account.role==='client'?'inline-flex':'none';
  if(el('orderLogin'))el('orderLogin').parentElement.style.display=connected?'none':'flex';
  if(el('signOut'))el('signOut').style.display=connected?'inline-flex':'none';
  if(connected)feedback('Connecté : '+account.first_name+' '+account.last_name+' — '+account.role.replaceAll('_',' '));
  await loadOrders();
  await managerRefresh();
}
async function loadOrders(){
  const box=el('ordersList');if(!box)return;
  if(!token||!account){box.textContent='Connectez-vous pour voir vos commandes.';return}
  if(account.role!=='client'){box.textContent='Cet espace est réservé aux comptes clients.';return}
  try{
    const data=await rpc('ae_list_my_orders',{p_token:token});
    box.replaceChildren();
    if(!data?.length){box.textContent='Aucune commande pour le moment.';return}
    for(const o of data){
      const c=document.createElement('div');c.className='card';
      const h=document.createElement('h3');h.textContent='Commande AE-'+String(o.id).padStart(4,'0');
      const p=document.createElement('p');p.textContent=o.quantity+' kit(s) moteur standard · '+(o.quantity*o.unit_price).toLocaleString('fr-FR')+' $ · '+o.status;
      c.append(h,p);
      if(o.cancel_reason){const r=document.createElement('small');r.textContent='Motif : '+o.cancel_reason;c.append(r)}
      const dt=document.createElement('small');dt.textContent=new Date(o.created_at).toLocaleString('fr-FR');c.append(dt);box.append(c);
    }
  }catch(err){box.textContent='Impossible de charger les commandes : '+err.message}
}
el('loginForm')?.addEventListener('submit',async e=>{
  e.preventDefault();const i=e.currentTarget.querySelectorAll('input');
  try{const result=await rpc('ae_login',{p_login:i[0].value,p_password:i[1].value});saveSession(result);feedback('Connexion réussie.');await refresh();location.hash=account?.role==='client'?'#/commander':'#/direction';}
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
  if(!confirm('Confirmer '+quantity+' kit(s) moteur standard pour '+(quantity*750).toLocaleString('fr-FR')+' $ ?'))return;
  try{const result=await rpc('ae_create_order',{p_token:token,p_quantity:quantity});alert('Commande AE-'+String(result.id).padStart(4,'0')+' enregistrée !');location.hash='#/commandes';await loadOrders()}
  catch(err){alert('Commande impossible : '+err.message)}
});
el('signOut')?.addEventListener('click',async()=>{try{if(token)await rpc('ae_logout',{p_token:token})}catch(_){}token='';account=null;localStorage.removeItem('ae_session');feedback('Déconnecté.');await refresh()});

const requestForms=[];
if(el('recruit'))requestForms.push([el('recruit'),'recrutement']);
document.querySelectorAll('form.simpleform').forEach((f,i)=>requestForms.push([f,i===0?'partenariat':'evenement']));
for(const [form,kind] of requestForms){
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const payload={};
    [...form.querySelectorAll('input,textarea')].forEach((input,i)=>{const key=input.placeholder||input.previousElementSibling?.textContent||('champ_'+(i+1));payload[key]=input.value.trim()});
    const button=form.querySelector('[type=submit]');button.disabled=true;
    try{const result=await rpc('ae_submit_request',{p_kind:kind,p_payload:payload});form.reset();alert('Demande envoyée ! Numéro #'+result.id)}
    catch(err){alert('Envoi impossible : '+err.message)}
    finally{button.disabled=false}
  });
}
async function managerRefresh(){
  const panel=el('managerPanel');if(!panel)return;
  const manager=!!account&&['rh','assistant_direction','copatron','patron'].includes(account.role);
  panel.classList.toggle('hidden',!manager);if(!manager)return;
  const requestBox=el('managerRequests'),orderBox=el('managerOrders');
  try{
    const req=await rpc('ae_manager_list_requests',{p_token:token});requestBox.replaceChildren();
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
  }catch(err){requestBox.textContent='Accès impossible : '+err.message}
  try{
    const orders=await rpc('ae_manager_list_orders',{p_token:token});orderBox.replaceChildren();
    if(!orders?.length)orderBox.textContent='Aucune commande.';
    for(const item of orders||[]){
      const box=document.createElement('div');box.className='manager-item';
      const title=document.createElement('strong');title.textContent='AE-'+String(item.id).padStart(4,'0')+' — '+item.status;
      const p=document.createElement('p');p.textContent=item.customer+' · '+(item.phone||'sans téléphone')+' · '+item.quantity+' kit(s) · '+(item.quantity*item.unit_price).toLocaleString('fr-FR')+' $';
      box.append(title,p);
      const delivered=document.createElement('button');delivered.className='btn secondary';delivered.textContent='Livrée';delivered.onclick=async()=>{try{await rpc('ae_manager_update_order',{p_token:token,p_id:item.id,p_status:'Livrée',p_reason:null});await managerRefresh()}catch(err){alert(err.message)}};
      const cancel=document.createElement('button');cancel.className='btn secondary';cancel.textContent='Annuler';cancel.onclick=async()=>{const reason=prompt('Motif de l’annulation (obligatoire) :')?.trim();if(!reason)return;try{await rpc('ae_manager_update_order',{p_token:token,p_id:item.id,p_status:'Annulée',p_reason:reason});await managerRefresh()}catch(err){alert(err.message)}};
      box.append(delivered,cancel);orderBox.append(box);
    }
  }catch(err){orderBox.textContent='Accès impossible : '+err.message}
}
refresh();
})();