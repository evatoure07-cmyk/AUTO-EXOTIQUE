(()=>{
const db=window.supabase?.createClient('https://gkljzpwfmthzjgfzzeoy.supabase.co','sb_publishable_x6NB71lEqcvtxODHt-cdKQ_BMLVLA3o');
if(!db)return;
const el=id=>document.getElementById(id);
let token=localStorage.getItem('ae_session')||'';
let account=null;
let myProfile=null;
let staffCache=[];
const managerRoles=['rh','assistant_direction','copatron','patron'];
const roleLabels={client:'Client',mecano_novice:'Mécano novice',mecano_intermediaire:'Mécano intermédiaire',mecano_experimente:'Mécano expérimenté',chef_equipe:"Chef d'équipe",rh:'RH',assistant_direction:'Assistant de direction',copatron:'Co-patron',patron:'Patron'};
const employeeRoles=['mecano_novice','mecano_intermediaire','mecano_experimente','chef_equipe','rh','assistant_direction','copatron','patron'];

async function rpc(name,args={}){const {data,error}=await db.rpc(name,args);if(error)throw error;return data}
function feedback(msg){if(el('authFeedback'))el('authFeedback').textContent=msg}
function saveSession(result){token=result?.token||'';account=result?.account||null;if(token)localStorage.setItem('ae_session',token);else localStorage.removeItem('ae_session')}
function money(v){return Number(v||0).toLocaleString('fr-FR')+' $'}
function esc(v){return String(v??'')}

function updateConnectedSpace(){
  const connected=!!account;
  el('connectedSpaceCard')?.classList.toggle('hidden',!connected);
  el('disconnectedSpaceGrid')?.classList.toggle('hidden',connected);
  el('accountStatus')?.classList.toggle('hidden',connected);

  if(!connected)return;

  const full=((myProfile?.first_name||account.first_name||'')+' '+(myProfile?.last_name||account.last_name||'')).trim();
  if(el('connectedSpaceName'))el('connectedSpaceName').textContent=full||'Mon compte';
  if(el('connectedSpaceMeta'))el('connectedSpaceMeta').textContent=(roleLabels[account.role]||account.role)+' · '+(myProfile?.login||account.login||'Compte Auto Exotic');

  const avatar=el('connectedSpaceAvatar');
  if(avatar){
    avatar.replaceChildren();
    if(myProfile?.avatar_url){const img=document.createElement('img');img.src=myProfile.avatar_url;img.alt='';avatar.append(img)}
    else avatar.textContent=initials(full);
  }

  el('connectedOrdersLink')?.classList.toggle('hidden',account.role!=='client');
  el('connectedAdminLink')?.classList.toggle('hidden',!managerRoles.includes(account.role));
  if(el('authFeedback'))el('authFeedback').textContent='';
}
async function refresh(){
  if(token){
    try{
      account=await rpc('ae_me',{p_token:token});
      if(!account){token='';localStorage.removeItem('ae_session')}
    }catch(_){token='';account=null;localStorage.removeItem('ae_session')}
  }
  const connected=!!account;
  if(connected){try{myProfile=await rpc('ae_my_profile',{p_token:token})}catch(_){myProfile=null}}else myProfile=null;
  const forcePassword=!!(connected&&account.role!=='client'&&account.must_change_password);
  el('forcedPasswordCard')?.classList.toggle('hidden',!forcePassword);
  document.body.classList.toggle('password-required',forcePassword);
  if(forcePassword&&!location.hash.startsWith('#/profil'))location.hash='#/profil';
  updateSidebarProfile();
  updateConnectedSpace();
  if(el('submitOrder'))el('submitOrder').style.display=connected&&account.role==='client'?'inline-flex':'none';
  if(el('orderLogin'))el('orderLogin').parentElement.style.display=connected?'none':'flex';
  if(el('signOut'))el('signOut').style.display=connected?'inline-flex':'none';
  if(!connected&&el('authFeedback'))el('authFeedback').textContent='';
  await Promise.all([loadOrders(),loadNotifications(),loadStaff(),loadNews(),loadMyProfile(),managerRefresh()]);
}

function initials(name){
  return String(name||'AE').split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase()||'AE';
}
function avatarNode(profile,className='profile-avatar-large'){
  if(profile?.avatar_url){
    const img=document.createElement('img');img.src=profile.avatar_url;img.alt='';img.className=className;return img;
  }
  const div=document.createElement('div');div.className=className;div.textContent=initials((profile?.first_name||'')+' '+(profile?.last_name||profile?.name||''));return div;
}
function updateSidebarProfile(){
  const connected=!!account;
  const quick=el('quickLogin'),user=el('sidebarUser');
  if(quick)quick.classList.toggle('hidden',connected);
  if(user)user.classList.toggle('hidden',!connected);
  if(!connected)return;
  const full=(myProfile?.first_name||account.first_name||'')+' '+(myProfile?.last_name||account.last_name||'');
  if(el('sidebarUserName'))el('sidebarUserName').textContent=full.trim()||'Mon profil';
  if(el('sidebarUserRole'))el('sidebarUserRole').textContent=roleLabels[account.role]||account.role;
  const avatar=el('sidebarAvatar');
  if(avatar){
    avatar.replaceChildren();
    if(myProfile?.avatar_url){const img=document.createElement('img');img.src=myProfile.avatar_url;img.alt='';avatar.append(img)}
    else avatar.textContent=initials(full);
  }
}
async function profileImageToDataUrl(file){
  if(!file||!String(file.type||'').startsWith('image/'))throw new Error('Choisissez une image valide.');
  if(file.size>8*1024*1024)throw new Error('Image trop lourde : 8 Mo maximum.');
  const dataUrl=await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(new Error('Lecture de l’image impossible.'));
    reader.readAsDataURL(file);
  });
  const img=await new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error('Image illisible.'));
    image.src=dataUrl;
  });
  const max=512;
  const scale=Math.min(1,max/Math.max(img.width,img.height));
  const width=Math.max(1,Math.round(img.width*scale));
  const height=Math.max(1,Math.round(img.height*scale));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  ctx.drawImage(img,0,0,width,height);
  return canvas.toDataURL('image/jpeg',0.84);
}
async function loadMyProfile(){
  const box=el('profileContent');if(!box)return;
  box.replaceChildren();
  if(!account||!myProfile){
    const card=document.createElement('div');card.className='card';card.innerHTML='<h3>Connexion requise</h3><p class="muted">Connectez-vous pour ouvrir votre profil Auto Exotic.</p><a class="btn" href="#/espace">Se connecter</a>';box.append(card);return;
  }

  const identity=document.createElement('article');identity.className='card profile-identity';
  identity.append(avatarNode(myProfile));
  const tag=document.createElement('span');tag.className='tag profile-role';tag.textContent=roleLabels[myProfile.role]||myProfile.role;
  const name=document.createElement('h2');name.textContent=(myProfile.first_name||'')+' '+(myProfile.last_name||'');
  identity.append(tag,name);
  if(myProfile.role!=='client'){
    const rating=document.createElement('div');rating.className='profile-rating';rating.textContent=(Number(myProfile.rating_avg||0)>0?Number(myProfile.rating_avg).toFixed(1):'—')+' ★';
    const rmeta=document.createElement('p');rmeta.className='muted small';rmeta.textContent=Number(myProfile.rating_count||0)+' avis client(s)';
    identity.append(rating,rmeta);
  }

  const details=document.createElement('div');details.className='card';
  const title=document.createElement('h3');title.textContent=myProfile.role==='client'?'Informations du compte':'Profil employé';
  details.append(title);
  const grid=document.createElement('div');grid.className='profile-info-grid';
  const info=(label,value)=>{const d=document.createElement('div');d.className='profile-info-item';const s=document.createElement('small');s.textContent=label;const st=document.createElement('strong');st.textContent=value||'—';d.append(s,st);grid.append(d)};
  info('Identifiant',myProfile.login);
  info('Rôle',roleLabels[myProfile.role]||myProfile.role);
  if(myProfile.role==='client'){
    info('Téléphone',myProfile.phone);
    info('IBAN RP',myProfile.iban_rp);
    info('ID RP',myProfile.civil_id_rp);
  }else{
    info('Dans l’équipe depuis',myProfile.joined_at?new Date(myProfile.joined_at+'T00:00:00').toLocaleDateString('fr-FR'):'—');
    info('Interventions',String(myProfile.interventions_count||0));
  }
  details.append(grid);

  if(myProfile.role!=='client'){
    const form=document.createElement('form');form.className='form';form.style.marginTop='22px';
    const sub=document.createElement('h3');sub.textContent='Personnaliser mon profil';

    let avatarValue=myProfile.avatar_url||'';
    const photoPicker=document.createElement('div');photoPicker.className='profile-photo-picker';
    const photoPreview=document.createElement('div');photoPreview.className='profile-photo-preview';
    const drawPhotoPreview=()=>{
      photoPreview.replaceChildren();
      if(avatarValue){const img=document.createElement('img');img.src=avatarValue;img.alt='Photo de profil';photoPreview.append(img)}
      else photoPreview.textContent=initials((myProfile.first_name||'')+' '+(myProfile.last_name||''));
    };
    drawPhotoPreview();

    const photoActions=document.createElement('div');photoActions.className='profile-photo-actions';
    const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='image/*';
    const chooseLabel=document.createElement('label');chooseLabel.className='btn secondary';chooseLabel.textContent='Choisir un fichier';chooseLabel.append(fileInput);
    const removePhoto=document.createElement('button');removePhoto.type='button';removePhoto.className='btn secondary';removePhoto.textContent='Retirer la photo';
    photoActions.append(chooseLabel,removePhoto);

    const pasteZone=document.createElement('div');pasteZone.className='profile-photo-drop';pasteZone.tabIndex=0;pasteZone.textContent='Ou copiez une image puis collez-la ici avec Ctrl+V / Cmd+V';
    const useImage=async file=>{
      try{avatarValue=await profileImageToDataUrl(file);drawPhotoPreview()}
      catch(err){alert(err.message)}
    };
    fileInput.addEventListener('change',()=>{const file=fileInput.files?.[0];if(file)useImage(file)});
    pasteZone.addEventListener('paste',e=>{
      const items=[...(e.clipboardData?.items||[])];
      const imageItem=items.find(item=>item.type?.startsWith('image/'));
      const file=imageItem?.getAsFile?.();
      if(file){e.preventDefault();useImage(file)}
      else alert('Aucune image trouvée dans le presse-papiers.');
    });
    removePhoto.onclick=()=>{avatarValue='';fileInput.value='';drawPhotoPreview()};
    photoPicker.append(photoPreview,photoActions,pasteZone);

    const bio=document.createElement('textarea');bio.placeholder='Petite présentation';bio.value=myProfile.bio||'';
    const dutyLabel=document.createElement('label');const duty=document.createElement('input');duty.type='checkbox';duty.checked=!!myProfile.on_duty;dutyLabel.append(duty,document.createTextNode(' En service'));
    const save=document.createElement('button');save.type='submit';save.className='btn';save.textContent='Enregistrer mon profil';
    form.append(sub,photoPicker,bio,dutyLabel,save);
    form.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{await rpc('ae_update_my_staff_profile',{p_token:token,p_avatar_url:avatarValue,p_bio:bio.value,p_on_duty:duty.checked});myProfile=await rpc('ae_my_profile',{p_token:token});updateSidebarProfile();await Promise.all([loadMyProfile(),loadStaff()]);alert('Profil mis à jour.')}catch(err){alert(err.message)}finally{save.disabled=false}};
    details.append(form);
  }

  if(!account.must_change_password){
    const security=document.createElement('form');security.className='form profile-password-form';security.style.marginTop='26px';
    const divider=document.createElement('div');divider.className='profile-security-divider';
    const securityTitle=document.createElement('h3');securityTitle.textContent='Modifier mon mot de passe';
    const securityText=document.createElement('p');securityText.className='muted small';securityText.textContent='Entrez votre mot de passe actuel puis choisissez le nouveau.';
    const oldPwd=document.createElement('input');oldPwd.type='password';oldPwd.autocomplete='current-password';oldPwd.required=true;oldPwd.placeholder='Ancien mot de passe';
    const newPwd=document.createElement('input');newPwd.type='password';newPwd.autocomplete='new-password';newPwd.required=true;newPwd.minLength=8;newPwd.placeholder='Nouveau mot de passe';
    const changePwd=document.createElement('button');changePwd.type='submit';changePwd.className='btn secondary';changePwd.textContent='Modifier mon mot de passe';
    security.append(divider,securityTitle,securityText,oldPwd,newPwd,changePwd);
    security.onsubmit=async e=>{
      e.preventDefault();
      if(newPwd.value.length<8){alert('Le nouveau mot de passe doit contenir au moins 8 caractères.');return}
      changePwd.disabled=true;
      try{
        await rpc('ae_change_password',{p_token:token,p_old:oldPwd.value,p_new:newPwd.value});
        security.reset();
        alert('Mot de passe modifié.');
      }catch(err){alert('Modification impossible : '+err.message)}
      finally{changePwd.disabled=false}
    };
    details.append(security);
  }

  box.append(identity,details);
}
function showEmployeeProfile(s){
  const modal=el('employeeProfileModal'),content=el('employeeProfileContent');if(!modal||!content)return;
  content.replaceChildren();
  const top=document.createElement('div');top.className='employee-profile-top';top.append(avatarNode({avatar_url:s.avatar_url,name:s.name}));
  const copy=document.createElement('div');const role=document.createElement('span');role.className='tag';role.textContent=roleLabels[s.role]||s.role;const name=document.createElement('h2');name.textContent=s.name;const rating=document.createElement('p');rating.className='profile-rating';rating.textContent=(Number(s.rating_avg||0)>0?Number(s.rating_avg).toFixed(1):'—')+' ★ · '+Number(s.rating_count||0)+' avis';copy.append(role,name,rating);top.append(copy);content.append(top);
  const grid=document.createElement('div');grid.className='profile-info-grid';
  const add=(label,value)=>{const d=document.createElement('div');d.className='profile-info-item';const a=document.createElement('small');a.textContent=label;const b=document.createElement('strong');b.textContent=value;d.append(a,b);grid.append(d)};
  add('Poste',roleLabels[s.role]||s.role);
  add('Ancienneté',s.joined_at?'Depuis le '+new Date(s.joined_at+'T00:00:00').toLocaleDateString('fr-FR'):'Non renseignée');
  add('Interventions',String(s.interventions_count||0));
  add('Service',s.on_duty?'En service':'Hors service');
  content.append(grid);
  if(s.bio){const bio=document.createElement('p');bio.className='muted';bio.style.marginTop='20px';bio.textContent=s.bio;content.append(bio)}
  modal.classList.remove('hidden');
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


let notificationCache=[];
let notificationFilter='all';
const notificationKindLabels={order:'Commandes',team:'Équipe',security:'Sécurité',account:'Compte',info:'Info',success:'Commandes',warning:'Commandes'};
function renderNotifications(){
  const list=el('notificationsList');if(!list)return;
  list.replaceChildren();
  const filtered=(notificationCache||[]).filter(n=>{
    if(notificationFilter==='all')return true;
    const kind=(n.kind==='success'||n.kind==='warning')?'order':(n.kind||'info');
    return kind===notificationFilter;
  });
  if(!filtered.length){
    const p=document.createElement('p');p.className='muted';p.textContent=notificationCache.length?'Aucune notification dans cette catégorie.':'Aucune notification.';list.append(p);return;
  }
  for(const n of filtered){
    const kind=(n.kind==='success'||n.kind==='warning')?'order':(n.kind||'info');
    const item=document.createElement('div');item.className='notification-item'+(!n.read_at?' unread':'');item.dataset.kind=kind;
    const kindTag=document.createElement('span');kindTag.className='notification-kind';kindTag.textContent=notificationKindLabels[kind]||'Info';
    const title=document.createElement('strong');title.textContent=n.title;
    const body=document.createElement('p');body.className='muted';body.textContent=n.body;
    const date=document.createElement('small');date.className='muted';date.textContent=new Date(n.created_at).toLocaleString('fr-FR');
    item.append(kindTag,title,body,date);list.append(item);
  }
}
async function loadNotifications(){
  const list=el('notificationsList'),badge=el('notificationBadge');if(!list||!badge)return;
  if(!token||!account){
    notificationCache=[];renderNotifications();
    const p=document.createElement('p');p.className='muted';p.textContent='Connectez-vous pour voir vos notifications.';list.replaceChildren(p);
    badge.classList.add('hidden');return;
  }
  try{
    const data=await rpc('ae_list_my_notifications',{p_token:token});
    notificationCache=data||[];
    const unread=notificationCache.filter(n=>!n.read_at).length;
    badge.textContent=String(unread);badge.classList.toggle('hidden',unread===0);
    renderNotifications();
  }catch(err){list.textContent='Notifications indisponibles : '+err.message}
}

async function loadStaff(){
  const box=el('staffList');if(!box)return;
  try{
    const staff=await rpc('ae_public_staff');
    staffCache=staff||[];
    box.replaceChildren();

    const reviewSelect=el('reviewStaff');
    if(reviewSelect){
      const current=reviewSelect.value;
      reviewSelect.replaceChildren();
      const first=document.createElement('option');first.value='';first.textContent='Choisir un employé';reviewSelect.append(first);
      for(const person of staff||[]){
        if(account&&person.account_id===account.id)continue;
        const opt=document.createElement('option');opt.value=person.account_id;opt.textContent=person.name+' — '+(roleLabels[person.role]||person.role);reviewSelect.append(opt);
      }
      if([...reviewSelect.options].some(o=>o.value===current))reviewSelect.value=current;
    }

    const hint=el('reviewHint');
    if(hint)hint.textContent=account?'Choisissez un membre de l’équipe et une note de 1 à 5 étoiles.':'Connectez-vous avec votre compte pour laisser un avis.';

    const totalReviews=(staff||[]).reduce((sum,s)=>sum+Number(s.rating_count||0),0);
    const weighted=(staff||[]).reduce((sum,s)=>sum+Number(s.rating_avg||0)*Number(s.rating_count||0),0);
    const rated=(staff||[]).filter(s=>Number(s.rating_count||0)>0);
    const overall=totalReviews?weighted/totalReviews:0;

    const reviewStats=el('reviewStats');
    if(reviewStats){
      reviewStats.replaceChildren();
      [['Note moyenne',overall?overall.toFixed(1)+' / 5':'—'],['Avis reçus',String(totalReviews)],['Employés notés',String(rated.length)]].forEach(([label,value])=>{
        const card=document.createElement('div');card.className='stat-card';
        const strong=document.createElement('strong');strong.textContent=value;
        const span=document.createElement('span');span.textContent=label;card.append(strong,span);reviewStats.append(card);
      });
    }

    const reviewTop=el('reviewTop');
    if(reviewTop){
      reviewTop.replaceChildren();
      const top=[...rated].sort((a,b)=>Number(b.rating_avg)-Number(a.rating_avg)||Number(b.rating_count)-Number(a.rating_count)).slice(0,3);
      if(!top.length){
        const card=document.createElement('div');card.className='card';card.innerHTML='<strong>Aucun avis pour le moment</strong><small>Le classement apparaîtra ici après les premières notes.</small>';reviewTop.append(card);
      }else{
        top.forEach((person,index)=>{
          const card=document.createElement('div');card.className='card';
          const strong=document.createElement('strong');strong.textContent=(index+1)+'. '+person.name;
          const small=document.createElement('small');small.textContent=Number(person.rating_avg).toFixed(1)+' ★ · '+Number(person.rating_count||0)+' avis';
          card.append(strong,small);reviewTop.append(card);
        });
      }
    }

    if(!staff?.length){
      const card=document.createElement('div');card.className='card';card.innerHTML='<h3>Équipe en préparation</h3><p class="muted">Les fiches apparaîtront ici dès que les comptes employés seront configurés.</p>';box.append(card);return;
    }

    for(const s of staff){
      const card=document.createElement('article');card.className='card staff-card reveal';
      const head=document.createElement('div');head.className='staff-head';
      const avatar=document.createElement('div');avatar.className='staff-avatar';
      if(s.avatar_url){const img=document.createElement('img');img.src=s.avatar_url;img.alt='';img.className='staff-avatar';head.append(img)}
      else{avatar.textContent=(s.name||'?').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();head.append(avatar)}
      const duty=document.createElement('span');duty.className='duty '+(s.on_duty?'on':'off');duty.textContent=s.on_duty?'En service':'Hors service';head.append(duty);
      const role=document.createElement('span');role.className='tag';role.textContent=roleLabels[s.role]||s.role;
      const name=document.createElement('h3');name.textContent=s.name;
      const meta=document.createElement('p');meta.className='muted';meta.textContent=(s.joined_at?'Depuis le '+new Date(s.joined_at+'T00:00:00').toLocaleDateString('fr-FR'):'Ancienneté non renseignée')+' · '+Number(s.interventions_count||0)+' intervention(s)';
      const rating=document.createElement('p');rating.className='muted';rating.textContent=(Number(s.rating_avg||0)>0?Number(s.rating_avg).toFixed(1):'—')+' / 5 · '+Number(s.rating_count||0)+' avis';
      card.append(head,role,name,meta,rating);
      if(s.bio){const bio=document.createElement('p');bio.className='muted';bio.textContent=s.bio;card.append(bio)}
      const open=document.createElement('button');open.type='button';open.className='btn secondary staff-profile-button';open.textContent='Voir le profil';open.onclick=()=>showEmployeeProfile(s);card.append(open);
      box.append(card);
    }
    revealNow();
  }catch(err){box.textContent='Impossible de charger l’équipe : '+err.message}
}

async function loadNews(){
  const box=el('newsList');if(!box)return;
  try{
    const news=await rpc('ae_public_news');box.replaceChildren();
    if(!news?.length){const c=document.createElement('article');c.className='card';c.innerHTML='<span class="tag">JOURNAL</span><h3>Le journal arrive bientôt</h3><p class="muted">La direction pourra publier ici les annonces, événements et nouveautés.</p>';box.append(c);return}
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
  try{const result=await rpc('ae_login',{p_login:i[0].value,p_password:i[1].value});saveSession(result);feedback('Connexion réussie.');await refresh();location.hash=account?.must_change_password?'#/profil':(account?.role==='client'?'#/commander':'#/direction')}
  catch(err){feedback('Connexion impossible : '+err.message)}
});

el('forcedPasswordForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  if(!account||!account.must_change_password)return;
  const inputs=form.querySelectorAll('input');
  const newPassword=inputs[0].value;
  const confirmPassword=inputs[1].value;
  if(newPassword!==confirmPassword){alert('Les deux nouveaux mots de passe ne correspondent pas.');return}
  if(newPassword.length<8){alert('Le nouveau mot de passe doit contenir au moins 8 caractères.');return}
  const button=form.querySelector('button');button.disabled=true;
  try{
    await rpc('ae_set_initial_password',{p_token:token,p_new:newPassword});
    account=await rpc('ae_me',{p_token:token});
    form.reset();
    document.body.classList.remove('password-required');
    el('forcedPasswordCard')?.classList.add('hidden');
    alert('Votre mot de passe est enregistré.');
    await refresh();
    location.hash='#/direction';
  }catch(err){alert('Modification impossible : '+err.message)}
  finally{button.disabled=false}
});

el('registerForm')?.addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget;const a=[...form.querySelectorAll('input')].map(x=>x.value.trim());
  try{
    const result=await rpc('ae_register_client',{p_first_name:a[0],p_last_name:a[1],p_phone:a[2],p_iban_rp:a[3],p_civil_id_rp:a[4],p_password:a[5]});
    saveSession(result);form.reset();feedback('Compte créé ! Vous êtes connecté.');await refresh();location.hash='#/commander';
  }catch(err){feedback('Inscription impossible : '+err.message)}
});

el('submitOrder')?.addEventListener('click',async()=>{
  if(!account||account.role!=='client')return;
  const quantity=Math.max(1,Number(el('qty')?.textContent||1));
  if(!confirm('Confirmer '+quantity+' kit(s) moteur standard pour '+money(quantity*750)+' ?'))return;
  try{
    const result=await rpc('ae_create_order',{p_token:token,p_quantity:quantity});
    alert('Commande AE-'+String(result.id).padStart(4,'0')+' enregistrée !');
    triggerDiscordSync(false).catch(()=>{});location.hash='#/commandes';await Promise.all([loadOrders(),loadNotifications()]);
  }catch(err){alert('Commande impossible : '+err.message)}
});

el('signOut')?.addEventListener('click',async()=>{try{if(token)await rpc('ae_logout',{p_token:token})}catch(_){}token='';account=null;myProfile=null;localStorage.removeItem('ae_session');feedback('Déconnecté.');await refresh()});

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

function showTemporaryCredential(login,password,label='Mot de passe temporaire'){
  const box=el('temporaryCredential');if(!box)return;
  box.classList.remove('hidden');box.replaceChildren();
  const title=document.createElement('strong');title.textContent=label;
  const note=document.createElement('p');note.className='muted small';note.textContent='Copiez les accès maintenant : le mot de passe ne sera plus affiché ensuite.';
  const loginRow=document.createElement('div');loginRow.className='credential-row';
  const loginValue=document.createElement('div');loginValue.className='credential-value';loginValue.textContent='Identifiant : '+login;
  const passRow=document.createElement('div');passRow.className='credential-row';
  const passValue=document.createElement('div');passValue.className='credential-value';passValue.textContent='Mot de passe : '+password;
  const copyAll=document.createElement('button');copyAll.type='button';copyAll.className='btn';copyAll.textContent='Copier les accès';
  copyAll.onclick=async()=>{
    const value='Identifiant : '+login+'\nMot de passe temporaire : '+password;
    try{await navigator.clipboard.writeText(value);copyAll.textContent='Accès copiés ✓'}
    catch(_){alert(value)}
  };
  loginRow.append(loginValue);passRow.append(passValue);box.append(title,note,loginRow,passRow,copyAll);
}

function canAssignRoleUI(role){
  if(!account)return false;
  if(['patron','copatron'].includes(account.role))return employeeRoles.includes(role);
  if(account.role==='assistant_direction')return ['mecano_novice','mecano_intermediaire','mecano_experimente','chef_equipe','rh'].includes(role);
  if(account.role==='rh')return ['mecano_novice','mecano_intermediaire','mecano_experimente','chef_equipe'].includes(role);
  return false;
}

el('employeeAccountForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  if(!account||!managerRoles.includes(account.role)){alert('Accès administration requis.');return}
  const fields=form.querySelectorAll('input,select');
  const button=form.querySelector('button');button.disabled=true;
  try{
    const result=await rpc('ae_manager_create_employee',{
      p_token:token,
      p_first_name:fields[0].value.trim(),
      p_last_name:fields[1].value.trim(),
      p_login:fields[2].value.trim().toLowerCase(),
      p_role:fields[3].value
    });
    form.reset();
    showTemporaryCredential(result.login,result.temporary_password);
    await Promise.all([managerRefresh(),loadStaff(),loadNotifications()]);
  }catch(err){alert('Création impossible : '+err.message)}
  finally{button.disabled=false}
});

let selectedReviewRating=0;
document.querySelectorAll('#reviewStars [data-rating]').forEach(button=>button.addEventListener('click',()=>{
  selectedReviewRating=Number(button.dataset.rating);
  if(el('reviewRating'))el('reviewRating').value=String(selectedReviewRating);
  document.querySelectorAll('#reviewStars [data-rating]').forEach(star=>star.classList.toggle('active',Number(star.dataset.rating)<=selectedReviewRating));
}));
el('reviewForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!account){location.hash='#/espace';feedback('Connectez-vous pour laisser un avis.');return}
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
  e.preventDefault();const form=e.currentTarget;if(!account||!managerRoles.includes(account.role))return;
  const fields=form.querySelectorAll('input,select,textarea');
  try{
    await rpc('ae_manager_create_news',{p_token:token,p_title:fields[0].value,p_category:fields[1].value,p_cover_url:fields[2].value,p_body:fields[3].value});
    form.reset();alert('Publication ajoutée au journal.');await loadNews();
  }catch(err){alert('Publication impossible : '+err.message)}
});


function activateAdminTab(name){
  const target=name||'dashboard';
  document.querySelectorAll('[data-admin-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.adminTab===target));
  document.querySelectorAll('[data-admin-panel]').forEach(panel=>panel.classList.toggle('hidden',panel.dataset.adminPanel!==target));
  localStorage.setItem('ae_admin_tab',target);
}
document.querySelectorAll('[data-admin-tab]').forEach(btn=>btn.addEventListener('click',()=>activateAdminTab(btn.dataset.adminTab)));
activateAdminTab(localStorage.getItem('ae_admin_tab')||'dashboard');

function filterManagerClients(){
  const q=(el('managerCustomerSearch')?.value||'').trim().toLowerCase();
  document.querySelectorAll('#managerCustomers .client-file').forEach(card=>card.classList.toggle('is-filtered',q&&!String(card.dataset.search||'').includes(q)));
}
function filterManagerEmployees(){
  const q=(el('managerEmployeeSearch')?.value||'').trim().toLowerCase();
  const role=el('managerEmployeeRole')?.value||'';
  const status=el('managerEmployeeStatus')?.value||'';
  document.querySelectorAll('#managerEmployees .employee-account-card').forEach(card=>{
    const matchText=!q||String(card.dataset.search||'').includes(q);
    const matchRole=!role||card.dataset.role===role;
    const statuses=String(card.dataset.status||'').split(' ');
    const matchStatus=!status||statuses.includes(status);
    card.classList.toggle('is-filtered',!(matchText&&matchRole&&matchStatus));
  });
}
el('managerCustomerSearch')?.addEventListener('input',filterManagerClients);
el('managerEmployeeSearch')?.addEventListener('input',filterManagerEmployees);
el('managerEmployeeRole')?.addEventListener('change',filterManagerEmployees);
el('managerEmployeeStatus')?.addEventListener('change',filterManagerEmployees);

const discordFunctionUrl='https://gkljzpwfmthzjgfzzeoy.supabase.co/functions/v1/auto-exotic-discord';
async function triggerDiscordSync(retryFailed=false){
  if(!token)return null;
  const res=await fetch(discordFunctionUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,retry_failed:retryFailed})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||'Synchronisation Discord impossible');
  return data;
}
async function refreshDiscordAdmin(){
  if(!account||!managerRoles.includes(account.role))return;
  const state=el('discordConnectionState'),statsBox=el('discordQueueStats');
  try{
    const [edgeRes,queue]=await Promise.all([
      fetch(discordFunctionUrl).then(r=>r.json()),
      rpc('ae_manager_discord_queue_status',{p_token:token})
    ]);
    if(state){
      state.classList.toggle('connected',!!edgeRes.configured);
      state.textContent=edgeRes.configured?'Discord connecté — bot, salon et interactions prêts':'Discord non connecté — configurez le bot côté Supabase pour activer l’envoi';
    }
    if(statsBox){
      statsBox.replaceChildren();
      [['En attente',queue.pending],['Envoyés',queue.sent],['Échecs',queue.failed]].forEach(([label,value])=>{
        const card=document.createElement('div');card.className='stat-card';
        const strong=document.createElement('strong');strong.textContent=String(value||0);
        const span=document.createElement('span');span.textContent=label;card.append(strong,span);statsBox.append(card);
      });
    }
  }catch(err){if(state)state.textContent='Statut Discord indisponible : '+err.message}
}
el('discordSyncButton')?.addEventListener('click',async e=>{
  const button=e.currentTarget;button.disabled=true;
  try{
    const result=await triggerDiscordSync(true);
    alert((result?.sent||0)+' événement(s) Discord synchronisé(s).');
    await refreshDiscordAdmin();
  }catch(err){alert(err.message)}
  finally{button.disabled=false}
});

async function managerRefresh(){
  const panel=el('managerPanel');if(!panel)return;
  const manager=!!account&&managerRoles.includes(account.role);
  panel.classList.toggle('hidden',!manager);if(!manager)return;

  try{
    const stats=await rpc('ae_manager_stats',{p_token:token});const box=el('managerStats');box.replaceChildren();
    [['Commandes livrées',stats.delivered_orders],['Kits moteur vendus',stats.kits_sold],['CA livré',money(stats.revenue)]].forEach(([label,value])=>{
      const card=document.createElement('div');card.className='stat-card reveal';
      const strong=document.createElement('strong');strong.textContent=value;
      const span=document.createElement('span');span.textContent=label;card.append(strong,span);box.append(card);
    });
  }catch(err){el('managerStats').textContent='Statistiques indisponibles : '+err.message}

  try{
    const stats=await rpc('ae_manager_team_stats',{p_token:token});const box=el('managerTeamStats');box.replaceChildren();
    [['Employés',stats.employees],['En service',stats.on_duty],['MDP temporaires',stats.temporary_passwords]].forEach(([label,value])=>{
      const card=document.createElement('div');card.className='stat-card';
      const strong=document.createElement('strong');strong.textContent=String(value||0);
      const span=document.createElement('span');span.textContent=label;card.append(strong,span);box.append(card);
    });
  }catch(err){if(el('managerTeamStats'))el('managerTeamStats').textContent='Statistiques équipe indisponibles.'}

  const permissionCard=el('adminPermissionCard');
  if(permissionCard){
    permissionCard.replaceChildren();
    const h=document.createElement('h3');h.textContent='Vos permissions — '+(roleLabels[account.role]||account.role);
    const p=document.createElement('p');p.className='muted';
    const chips=document.createElement('div');chips.className='permission-chips';
    const permissions=account.role==='rh'
      ?['Voir tous les profils','Clients & commandes','Créer/gérer les mécanos','Gérer chefs d’équipe','Partenariats']
      :account.role==='assistant_direction'
      ?['Voir tous les profils','Clients & commandes','Créer/gérer les mécanos','Gérer RH','Partenariats','Journal']
      :['Accès complet','Tous les grades','Clients & commandes','Partenariats','Journal','Historique','Discord'];
    p.textContent=account.role==='rh'?'Les comptes de direction restent en lecture seule.':account.role==='assistant_direction'?'Les grades Assistante, Co-patron et Patron restent protégés.':'Vous pouvez gérer l’ensemble des comptes et grades.';
    permissions.forEach(label=>{const chip=document.createElement('span');chip.className='permission-chip';chip.textContent=label;chips.append(chip)});
    permissionCard.append(h,p,chips);
  }

  try{
    const req=await rpc('ae_manager_list_requests',{p_token:token});const requestBox=el('managerRequests');requestBox.replaceChildren();
    const filtered=(req||[]).filter(item=>item.kind!=='recrutement');
    if(!filtered.length)requestBox.textContent='Aucune demande.';
    for(const item of filtered){
      const box=document.createElement('div');box.className='manager-item';
      const title=document.createElement('strong');title.textContent=item.kind+' #'+item.id+' — '+item.status;
      const p=document.createElement('p');p.textContent=Object.entries(item.payload||{}).map(([k,v])=>k+': '+v).join(' · ');
      box.append(title,p);
      for(const [label,status] of [['Accepter','acceptee'],['Refuser','refusee']]){
        const b=document.createElement('button');b.className='btn secondary';b.textContent=label;
        b.onclick=async()=>{try{await rpc('ae_manager_update_request',{p_token:token,p_id:item.id,p_status:status});await managerRefresh()}catch(err){alert(err.message)}};
        box.append(b);
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
        const delivered=document.createElement('button');delivered.className='btn secondary';delivered.textContent='Livrée';
        delivered.onclick=async()=>{try{await rpc('ae_manager_update_order',{p_token:token,p_id:item.id,p_status:'Livrée',p_reason:null});triggerDiscordSync(false).catch(()=>{});await Promise.all([managerRefresh(),loadNotifications()])}catch(err){alert(err.message)}};
        const cancel=document.createElement('button');cancel.className='btn secondary';cancel.textContent='Annuler';
        cancel.onclick=async()=>{const reason=prompt('Motif de l’annulation (obligatoire) :')?.trim();if(!reason)return;try{await rpc('ae_manager_update_order',{p_token:token,p_id:item.id,p_status:'Annulée',p_reason:reason});triggerDiscordSync(false).catch(()=>{});await Promise.all([managerRefresh(),loadNotifications()])}catch(err){alert(err.message)}};
        box.append(delivered,cancel);
      }
      orderBox.append(box);
    }
  }catch(err){el('managerOrders').textContent='Accès impossible : '+err.message}

  try{
    const customers=await rpc('ae_manager_list_customers',{p_token:token});const box=el('managerCustomers');box.replaceChildren();
    if(!customers?.length)box.textContent='Aucun client.';
    for(const customer of customers||[]){
      const details=document.createElement('details');details.className='client-file';
      details.dataset.search=((customer.name||'')+' '+(customer.phone||'')+' '+(customer.iban_rp||'')+' '+(customer.civil_id_rp||'')).toLowerCase();
      const summary=document.createElement('summary');summary.textContent=customer.name+' · '+(customer.phone||'sans téléphone');
      const meta=document.createElement('div');meta.className='client-meta';
      const spent=document.createElement('div');spent.innerHTML='<small>Total dépensé</small><strong>'+money(customer.total_spent)+'</strong>';
      const last=document.createElement('div');last.innerHTML='<small>Dernière commande</small><strong>'+(customer.last_order_at?new Date(customer.last_order_at).toLocaleDateString('fr-FR'):'Aucune')+'</strong>';
      meta.append(spent,last);
      const ids=document.createElement('p');ids.className='muted';ids.textContent='IBAN RP : '+(customer.iban_rp||'—')+' · ID RP : '+(customer.civil_id_rp||'—')+' · Compte créé le '+(customer.created_at?new Date(customer.created_at).toLocaleDateString('fr-FR'):'—');
      details.append(summary,meta,ids);
      for(const o of customer.orders||[]){
        const row=document.createElement('p');row.className='small muted';row.textContent='AE-'+String(o.id).padStart(4,'0')+' · '+o.quantity+' kit(s) · '+o.status+' · '+money(o.quantity*o.unit_price);details.append(row);
      }
      box.append(details);
    }
    filterManagerClients();
  }catch(err){el('managerCustomers').textContent='Fiches clients indisponibles : '+err.message}

  try{
    const employees=await rpc('ae_manager_list_employees',{p_token:token});const box=el('managerEmployees');box.replaceChildren();
    document.querySelector('.account-management')?.classList.toggle('hidden',!managerRoles.includes(account.role));

    const roleSelect=el('employeeRoleSelect');
    if(roleSelect)[...roleSelect.options].forEach(opt=>opt.disabled=!canAssignRoleUI(opt.value));

    if(!employees?.length)box.textContent='Aucun compte employé configuré.';
    for(const emp of employees||[]){
      const wrap=document.createElement('div');wrap.className='employee-account-card';
      wrap.dataset.search=((emp.name||'')+' '+(emp.login||'')+' '+(roleLabels[emp.role]||emp.role)).toLowerCase();
      wrap.dataset.role=emp.role;
      wrap.dataset.status=(emp.on_duty?'on':'off')+(emp.must_change_password?' temp':'');

      const top=document.createElement('div');top.className='employee-account-top';
      const title=document.createElement('div');
      const strong=document.createElement('strong');strong.textContent=emp.name;
      const login=document.createElement('p');login.className='small muted';login.textContent='Identifiant : '+emp.login;
      const extra=document.createElement('p');extra.className='small muted';extra.textContent=(emp.joined_at?'Depuis le '+new Date(emp.joined_at+'T00:00:00').toLocaleDateString('fr-FR'):'Date inconnue')+' · '+Number(emp.interventions_count||0)+' intervention(s) · '+(Number(emp.rating_avg||0)>0?Number(emp.rating_avg).toFixed(1)+' ★':'Aucun avis');
      title.append(strong,login,extra);
      const badge=document.createElement('span');badge.className='tag';badge.textContent=roleLabels[emp.role]||emp.role;
      top.append(title,badge);

      const meta=document.createElement('div');meta.className='employee-account-meta';
      if(emp.must_change_password){const change=document.createElement('span');change.className='force-change-badge';change.textContent='Mot de passe temporaire';meta.append(change)}
      const service=document.createElement('span');service.className='small muted';service.textContent=emp.on_duty?'● En service':'○ Hors service';meta.append(service);
      wrap.append(top,meta);

      const canManage=emp.account_id!==account.id&&canAssignRoleUI(emp.role);
      if(canManage){
        const actions=document.createElement('div');actions.className='employee-role-actions';
        const select=document.createElement('select');
        for(const role of employeeRoles){
          const o=document.createElement('option');o.value=role;o.textContent=roleLabels[role];o.selected=role===emp.role;o.disabled=!canAssignRoleUI(role);select.append(o);
        }
        const roleBtn=document.createElement('button');roleBtn.type='button';roleBtn.className='btn secondary';roleBtn.textContent='Modifier le grade';
        roleBtn.onclick=async()=>{
          if(select.value===emp.role)return;
          const reason=prompt('Motif de la promotion / rétrogradation (facultatif) :')||'';
          if(!confirm('Passer '+emp.name+' de '+(roleLabels[emp.role]||emp.role)+' à '+(roleLabels[select.value]||select.value)+' ?')){select.value=emp.role;return}
          try{await rpc('ae_manager_update_employee_role',{p_token:token,p_account_id:emp.account_id,p_new_role:select.value,p_reason:reason});await Promise.all([managerRefresh(),loadStaff(),loadNotifications()])}catch(err){alert(err.message);select.value=emp.role}
        };
        const reset=document.createElement('button');reset.type='button';reset.className='btn secondary';reset.textContent='Nouveau MDP temporaire';
        reset.onclick=async()=>{
          if(!confirm('Réinitialiser le mot de passe de '+emp.name+' ?'))return;
          try{
            const result=await rpc('ae_manager_reset_employee_password',{p_token:token,p_account_id:emp.account_id});
            showTemporaryCredential(emp.login,result.temporary_password,'Nouveau mot de passe temporaire');
            await Promise.all([managerRefresh(),loadNotifications()]);
          }catch(err){alert(err.message)}
        };
        actions.append(select,roleBtn,reset);wrap.append(actions);

        const historyBtn=document.createElement('button');historyBtn.type='button';historyBtn.className='btn secondary';historyBtn.style.marginTop='10px';historyBtn.textContent='Historique des grades';
        const history=document.createElement('div');history.className='role-history hidden';
        historyBtn.onclick=async()=>{
          if(!history.classList.contains('hidden')){history.classList.add('hidden');return}
          try{
            const rows=await rpc('ae_manager_role_history',{p_token:token,p_account_id:emp.account_id});history.replaceChildren();
            if(!rows?.length)history.textContent='Aucun changement de grade.';
            for(const row of rows||[]){
              const p=document.createElement('div');p.className='role-history-item';
              p.textContent=(row.old_role?(roleLabels[row.old_role]||row.old_role)+' → ':'Création → ')+(roleLabels[row.new_role]||row.new_role)+' · '+new Date(row.created_at).toLocaleString('fr-FR')+' · '+row.changed_by+(row.reason?' · '+row.reason:'');
              history.append(p);
            }
            history.classList.remove('hidden');
          }catch(err){alert(err.message)}
        };
        wrap.append(historyBtn,history);
      }else if(emp.account_id!==account.id){
        const readOnly=document.createElement('p');readOnly.className='small muted';readOnly.textContent='Compte en lecture seule pour votre niveau d’accès.';wrap.append(readOnly);
      }

      const canEditProfile=emp.account_id===account.id||canAssignRoleUI(emp.role);
      if(canEditProfile){
        const details=document.createElement('details');details.style.marginTop='12px';
        const summary=document.createElement('summary');summary.textContent='Modifier la fiche publique';
        const form=document.createElement('form');form.className='form';form.style.marginTop='12px';
        form.innerHTML='<input placeholder="URL avatar" value="'+esc(emp.avatar_url||'').replaceAll('"','&quot;')+'"><label>Date d’arrivée</label><input type="date" value="'+esc(emp.joined_at||'')+'"><input type="number" min="0" placeholder="Nombre d’interventions" value="'+Number(emp.interventions_count||0)+'"><label><input type="checkbox" '+(emp.on_duty?'checked':'')+'> En service</label><textarea placeholder="Petite présentation">'+esc(emp.bio||'')+'</textarea><button class="btn secondary" type="submit">Enregistrer la fiche</button>';
        form.onsubmit=async e=>{
          e.preventDefault();const f=form.querySelectorAll('input,textarea');
          try{
            await rpc('ae_manager_update_staff_profile',{p_token:token,p_account_id:emp.account_id,p_avatar_url:f[0].value,p_joined_at:f[1].value||null,p_interventions_count:Number(f[2].value||0),p_on_duty:f[3].checked,p_bio:f[4].value});
            alert('Fiche employé mise à jour.');
            await Promise.all([managerRefresh(),loadStaff(),loadNotifications()]);
          }catch(err){alert(err.message)}
        };
        details.append(summary,form);wrap.append(details);
      }

      box.append(wrap);
    }
    filterManagerEmployees();
  }catch(err){el('managerEmployees').textContent='Fiches employés indisponibles : '+err.message}

  try{
    const rows=await rpc('ae_manager_audit_log',{p_token:token,p_limit:100});const box=el('managerAuditLog');box.replaceChildren();
    if(!rows?.length)box.textContent='Aucune action enregistrée.';
    const actionLabels={employee_created:'Compte employé créé',password_reset:'Mot de passe réinitialisé',role_changed:'Grade modifié',profile_updated:'Profil employé modifié',order_status_changed:'Statut de commande modifié',discord_order_delivered:'Commande livrée depuis Discord',discord_order_cancelled:'Commande annulée depuis Discord'};
    for(const row of rows||[]){
      const item=document.createElement('div');item.className='audit-item';
      const strong=document.createElement('strong');strong.textContent=actionLabels[row.action]||row.action;
      const meta=document.createElement('small');meta.textContent=new Date(row.created_at).toLocaleString('fr-FR')+' · '+row.actor+(row.target?' → '+row.target:'');
      const details=document.createElement('p');details.className='small muted';
      const d=row.details||{};
      details.textContent=[d.old_role&&d.new_role?(roleLabels[d.old_role]||d.old_role)+' → '+(roleLabels[d.new_role]||d.new_role):'',d.order_id?'AE-'+String(d.order_id).padStart(4,'0'):'',d.reason||''].filter(Boolean).join(' · ');
      item.append(strong,meta);if(details.textContent)item.append(details);box.append(item);
    }
  }catch(err){if(el('managerAuditLog'))el('managerAuditLog').textContent='Historique indisponible : '+err.message}

  await refreshDiscordAdmin();
  revealNow();
}

document.querySelectorAll('[data-notification-filter]').forEach(button=>button.addEventListener('click',()=>{
  notificationFilter=button.dataset.notificationFilter||'all';
  document.querySelectorAll('[data-notification-filter]').forEach(b=>b.classList.toggle('active',b===button));
  renderNotifications();
}));

el('closeEmployeeProfile')?.addEventListener('click',()=>el('employeeProfileModal')?.classList.add('hidden'));
el('employeeProfileModal')?.addEventListener('click',e=>{if(e.target===el('employeeProfileModal'))el('employeeProfileModal').classList.add('hidden')});
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