(()=>{
const db=window.supabase?.createClient('https://gkljzpwfmthzjgfzzeoy.supabase.co','sb_publishable_x6NB71lEqcvtxODHt-cdKQ_BMLVLA3o');
if(!db)return;
let user=null,profile=null;
const el=id=>document.getElementById(id);
const emailFromPhone=value=>{const n=value.replace(/\D/g,'');if(n.length<4||n.length>18)throw Error('Téléphone RP invalide');return n+'@client.auto-exotic.invalid'};
const message=s=>{if(el('authFeedback'))el('authFeedback').textContent=s};
async function loadOrders(){
 const container=el('ordersList');if(!container)return;
 if(!user){container.textContent='Connectez-vous pour retrouver vos commandes.';return;}
 const {data,error}=await db.from('ae_orders').select('id,quantity,unit_price,status,created_at').order('created_at',{ascending:false});
 if(error){container.textContent='Erreur de chargement : '+error.message;return;}
 container.replaceChildren();
 if(!data?.length){container.textContent='Aucune commande pour le moment.';return;}
 for(const o of data){const c=document.createElement('div');c.className='card';const title=document.createElement('h3');title.textContent='AE-'+String(o.id).padStart(4,'0');const detail=document.createElement('p');detail.textContent=o.quantity+' kit(s) moteur standard · '+(o.quantity*o.unit_price).toLocaleString('fr-FR')+' $ · '+o.status;const date=document.createElement('small');date.textContent=new Date(o.created_at).toLocaleString('fr-FR');c.append(title,detail,date);container.append(c);}
}
async function refresh(){
 const {data:{user:u}}=await db.auth.getUser();user=u;profile=null;
 if(user){const {data}=await db.from('ae_profiles').select('*').eq('user_id',user.id).maybeSingle();profile=data;}
 if(el('submitOrder'))el('submitOrder').style.display=user?'inline-flex':'none';
 if(el('orderLogin'))el('orderLogin').parentElement.style.display=user?'none':'flex';
 if(el('signOut'))el('signOut').style.display=user?'inline-flex':'none';
 if(user)message('Connecté : '+(profile?profile.first_name+' '+profile.last_name:'compte client'));
 await loadOrders();
}
el('loginForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const inputs=e.currentTarget.querySelectorAll('input');
 try{const {error}=await db.auth.signInWithPassword({email:emailFromPhone(inputs[0].value),password:inputs[1].value});if(error)throw error;await refresh();location.hash='#/commander';}catch(err){message('Connexion impossible : '+err.message);}
});
el('registerForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const a=[...e.currentTarget.querySelectorAll('input')].map(x=>x.value.trim());
 try{
  const {data,error}=await db.auth.signUp({email:emailFromPhone(a[2]),password:a[5]});if(error)throw error;
  if(!data.session){message('Supabase demande une confirmation email. La confirmation doit être désactivée dans Authentication > Providers > Email pour utiliser des téléphones RP.');return;}
  const {error:pe}=await db.from('ae_profiles').insert({user_id:data.user.id,first_name:a[0],last_name:a[1],phone:a[2],iban_rp:a[3],civil_id_rp:a[4]});if(pe)throw pe;
  await refresh();message('Compte créé !');location.hash='#/commander';
 }catch(err){message('Inscription impossible : '+err.message);}
});
el('submitOrder')?.addEventListener('click',async()=>{
 if(!user)return;
 if(!profile)return alert('Profil incomplet. Contactez la direction.');
 const quantity=Number(el('qty')?.textContent||1);
 if(!confirm('Confirmer '+quantity+' kit(s) moteur standard pour '+(quantity*750).toLocaleString('fr-FR')+' $ ?'))return;
 const {data,error}=await db.from('ae_orders').insert({user_id:user.id,quantity,unit_price:750}).select('id').single();
 if(error)return alert('Commande non enregistrée : '+error.message);
 alert('Commande AE-'+String(data.id).padStart(4,'0')+' enregistrée.');
 location.hash='#/commandes';await loadOrders();
});
el('signOut')?.addEventListener('click',async()=>{await db.auth.signOut();message('Déconnecté.');await refresh();});
db.auth.onAuthStateChange(()=>setTimeout(refresh,0));refresh();
})();