(()=>{
const db=window.supabase?.createClient('https://gkljzpwfmthzjgfzzeoy.supabase.co','sb_publishable_x6NB71lEqcvtxODHt-cdKQ_BMLVLA3o');
if(!db)return;
const el=id=>document.getElementById(id);
const safeReset=form=>{try{if(form&&typeof form.reset==='function')form.reset()}catch(_){}};
let token=localStorage.getItem('ae_session')||'';
let account=null;
let myProfile=null;
let staffCache=[];
let cartQuantity=Math.max(0,Math.min(999,Math.trunc(Number(localStorage.getItem('ae_cart_qty')||0))));
const CART_UNIT_PRICE=750;
function saveCart(){
 if(cartQuantity>0)localStorage.setItem('ae_cart_qty',String(cartQuantity));
 else localStorage.removeItem('ae_cart_qty');
}
function renderCart(){
 const badge=el('cartBadge'),empty=el('cartEmpty'),content=el('cartContent');
 if(badge){badge.textContent=String(cartQuantity);badge.classList.toggle('hidden',cartQuantity===0)}
 if(empty)empty.classList.toggle('hidden',cartQuantity>0);
 if(content)content.classList.toggle('hidden',cartQuantity===0);
 if(el('cartQuantityLabel'))el('cartQuantityLabel').textContent=cartQuantity+' ×';
 if(el('cartLineTotal'))el('cartLineTotal').textContent=money(cartQuantity*CART_UNIT_PRICE);
 if(el('cartTotal'))el('cartTotal').textContent=money(cartQuantity*CART_UNIT_PRICE);
}
function openCart(){
 renderCart();
 el('cartPanel')?.classList.remove('hidden');
 el('cartPanel')?.setAttribute('aria-hidden','false');
 document.body.classList.add('dialog-open');
}
function closeCart(){
 el('cartPanel')?.classList.add('hidden');
 el('cartPanel')?.setAttribute('aria-hidden','true');
 el('checkoutArea')?.classList.add('hidden');
 document.body.classList.remove('dialog-open');
}
function updateCheckoutState(){
 const logged=!!account;
 el('checkoutLoginNotice')?.classList.toggle('hidden',logged);
 el('checkoutForm')?.classList.toggle('hidden',!logged);
 if(logged){
 if(el('checkoutPhone'))el('checkoutPhone').value=myProfile?.phone||account.phone||'';
 if(el('checkoutIban'))el('checkoutIban').value=myProfile?.iban_rp||'';
 }
}
const managerRoles=['rh','drh','assistant_direction','copatron','patron'];
const roleLabels={client:'Client',mecano_novice:'Mécano novice',mecano_intermediaire:'Mécano intermédiaire',mecano_experimente:'Mécano expérimenté',chef_equipe:"Chef d'équipe",rh:'RH',drh:'DRH',assistant_direction:'Assistante de direction',copatron:'Co-patron',patron:'Patron'};
const employeeRoles=['mecano_novice','mecano_intermediaire','mecano_experimente','chef_equipe','rh','drh','assistant_direction','copatron','patron'];

async function rpc(name,args={}){
  const {data,error}=await db.rpc(name,args);
  if(error){
    const cleanMessage=String(error.message||error).replace(/\bRP\b/gi,'').replace(/\s{2,}/g,' ').replace(/\s+([,.;:!?])/g,'$1').trim();
    const cleanError=new Error(cleanMessage);
    cleanError.details=error.details;
    cleanError.hint=error.hint;
    throw cleanError;
  }
  return data;
}
function feedback(msg){if(el('authFeedback'))el('authFeedback').textContent=msg}
function saveSession(result){token=result?.token||'';account=result?.account||null;if(token)localStorage.setItem('ae_session',token);else localStorage.removeItem('ae_session')}
function money(v){return Number(v||0).toLocaleString('fr-FR')+' $'}
function esc(v){return String(v??'')}
let siteDialogResolve=null;
function closeSiteDialog(value){
 const modal=el('siteDialog');if(!modal)return;
 modal.classList.add('hidden');
 document.body.classList.remove('dialog-open');
 const resolve=siteDialogResolve;siteDialogResolve=null;
 if(resolve)resolve(value);
}
function siteToast(message,type='info',title='Auto Exotic'){
 const stack=el('siteToastStack');if(!stack)return;
 const text=String(message??'');
 if(type==='info'&&/(impossible|erreur|introuvable|invalide|obligatoire|refusé|aucune image)/i.test(text))type='error';
 if(type==='info'&&/(enregistré|mise à jour|modifié|envoyée|créé|réussie|copié|synchronisé)/i.test(text))type='success';
 const toast=document.createElement('div');toast.className='site-toast '+type;
 const mark=document.createElement('span');mark.className='site-toast-mark';
 const copy=document.createElement('div');copy.className='site-toast-copy';
 const strong=document.createElement('strong');strong.textContent=title;
 const p=document.createElement('p');p.textContent=text;
 copy.append(strong,p);toast.append(mark,copy);stack.append(toast);
 setTimeout(()=>{toast.style.opacity='0';toast.style.transform='translateY(8px)';setTimeout(()=>toast.remove(),180)},4200);
}
function openSiteDialog({title='Confirmation',message='',confirmText='Confirmer',cancelText='Annuler',field=false,fieldLabel='Information',fieldRequired=false,fieldValue='' }={}){
 const modal=el('siteDialog');
 if(!modal)return Promise.resolve(field?null:false);
 if(siteDialogResolve)closeSiteDialog(field?null:false);
 el('siteDialogTitle').textContent=title;
 el('siteDialogMessage').textContent=message;
 el('siteDialogConfirm').textContent=confirmText;
 el('siteDialogCancel').textContent=cancelText;
 const wrap=el('siteDialogFieldWrap'),input=el('siteDialogField'),label=el('siteDialogFieldLabel'),error=el('siteDialogFieldError');
 wrap.classList.toggle('hidden',!field);
 error.classList.add('hidden');error.textContent='';
 input.value=fieldValue||'';label.textContent=fieldLabel;
 modal.classList.remove('hidden');document.body.classList.add('dialog-open');
 if(field)setTimeout(()=>input.focus(),40);
 else setTimeout(()=>el('siteDialogConfirm')?.focus(),40);
 return new Promise(resolve=>{
 siteDialogResolve=resolve;
 el('siteDialogConfirm').onclick=()=>{
 if(field){
 const value=input.value.trim();
 if(fieldRequired&&!value){error.textContent='Ce champ est obligatoire.';error.classList.remove('hidden');input.focus();return}
 closeSiteDialog(value);
 }else closeSiteDialog(true);
 };
 el('siteDialogCancel').onclick=()=>closeSiteDialog(field?null:false);
 el('siteDialogClose').onclick=()=>closeSiteDialog(field?null:false);
 modal.querySelector('.site-dialog-backdrop').onclick=()=>closeSiteDialog(field?null:false);
 });
}
function siteConfirm(message,options={}){return openSiteDialog({title:options.title||'Confirmation',message,confirmText:options.confirmText||'Confirmer',cancelText:options.cancelText||'Annuler'});}
function sitePrompt(message,options={}){return openSiteDialog({title:options.title||'Information requise',message,confirmText:options.confirmText||'Valider',cancelText:options.cancelText||'Annuler',field:true,fieldLabel:options.label||'Information',fieldRequired:!!options.required,fieldValue:options.value||''});}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!el('siteDialog')?.classList.contains('hidden'))closeSiteDialog(null)});

function updateConnectedSpace(){
 const connected=!!account;
 el('managerAccessNotice')?.classList.toggle('hidden',!!(connected&&managerRoles.includes(account.role)));
 el('adminPurchaseTab')?.classList.toggle('hidden',!(connected&&['assistant_direction','copatron','patron'].includes(account.role)));
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

 el('connectedOrdersLink')?.classList.remove('hidden');
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
 if(el('signOut'))el('signOut').style.display=connected?'inline-flex':'none';
 el('sidebarSignOut')?.classList.toggle('hidden',!connected);
 updateCheckoutState();
 renderCart();
 if(!connected&&el('authFeedback'))el('authFeedback').textContent='';
 await Promise.all([loadOrders(),loadNotifications(),loadStaff(),loadNews(),loadMyProfile(),loadStaffSpace(),loadStaffProduction(),loadPartnerDeclarations(),managerRefresh(),loadManagerPartners(),loadStaffExpenseNotes(),loadManagerPayroll(),loadManagerExpenseNotes()]);
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
 const employeeConnected=connected&&account.role!=='client';
 const quick=el('quickLogin'),user=el('sidebarUser');
 document.body.classList.toggle('employee-session',employeeConnected);
 if(quick)quick.classList.toggle('hidden',connected);
 if(user)user.classList.toggle('hidden',!connected);
 el('staffSidebarNav')?.classList.toggle('hidden',!employeeConnected);
 el('staffAdminLink')?.classList.toggle('hidden',!employeeConnected||!managerRoles.includes(account?.role));
 el('staffSpaceAdminLink')?.classList.toggle('hidden',!employeeConnected||!managerRoles.includes(account?.role));
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
 info('IBAN',myProfile.iban_rp);
 info('ID',myProfile.civil_id_rp);
 }else{
 info('Dans l’équipe depuis',myProfile.joined_at?new Date(myProfile.joined_at+'T00:00:00').toLocaleDateString('fr-FR'):'—');
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
 catch(err){siteToast(err.message)}
 };
 fileInput.addEventListener('change',()=>{const file=fileInput.files?.[0];if(file)useImage(file)});
 pasteZone.addEventListener('paste',e=>{
 const items=[...(e.clipboardData?.items||[])];
 const imageItem=items.find(item=>item.type?.startsWith('image/'));
 const file=imageItem?.getAsFile?.();
 if(file){e.preventDefault();useImage(file)}
 else siteToast('Aucune image trouvée dans le presse-papiers.');
 });
 removePhoto.onclick=()=>{avatarValue='';fileInput.value='';drawPhotoPreview()};
 photoPicker.append(photoPreview,photoActions,pasteZone);

 const bio=document.createElement('textarea');bio.placeholder='Petite présentation';bio.value=myProfile.bio||'';
 const save=document.createElement('button');save.type='submit';save.className='btn';save.textContent='Enregistrer mon profil';
 form.append(sub,photoPicker,bio,save);
 form.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{await rpc('ae_update_my_staff_profile',{p_token:token,p_avatar_url:avatarValue,p_bio:bio.value,p_on_duty:false});myProfile=await rpc('ae_my_profile',{p_token:token});updateSidebarProfile();await Promise.all([loadMyProfile(),loadStaff()]);siteToast('Profil mis à jour.')}catch(err){siteToast(err.message)}finally{save.disabled=false}};
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
 if(newPwd.value.length<8){siteToast('Le nouveau mot de passe doit contenir au moins 8 caractères.');return}
 changePwd.disabled=true;
 try{
 await rpc('ae_change_password',{p_token:token,p_old:oldPwd.value,p_new:newPwd.value});
 safeReset(security);
 siteToast('Mot de passe modifié.');
 }catch(err){siteToast('Modification impossible : '+err.message)}
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
 content.append(grid);
 if(s.bio){const bio=document.createElement('p');bio.className='muted';bio.style.marginTop='20px';bio.textContent=s.bio;content.append(bio)}
 modal.classList.remove('hidden');
}
async function loadOrders(){
 const box=el('ordersList');if(!box)return;
 box.replaceChildren();
 if(!token||!account){
   const card=document.createElement('div');card.className='card';card.textContent='Connectez-vous pour retrouver vos commandes.';box.append(card);return;
 }
 try{
   const data=await rpc('ae_list_my_orders',{p_token:token});
   if(!data?.length){const card=document.createElement('div');card.className='card';card.textContent='Aucune commande pour le moment.';box.append(card);return}
   for(const o of data){
     const details=document.createElement('details');details.className='compact-order-card';
     const summary=document.createElement('summary');
     const main=document.createElement('div');main.className='compact-order-main';
     const title=document.createElement('strong');title.textContent='AE-'+String(o.id).padStart(4,'0');
     const meta=document.createElement('small');meta.textContent=o.quantity+' kit(s) moteur · '+new Date(o.created_at).toLocaleString('fr-FR');
     main.append(title,meta);
     const status=document.createElement('span');status.className='compact-order-status';status.textContent=o.status;
     const total=document.createElement('div');total.className='compact-order-total';total.textContent=money(o.quantity*o.unit_price);
     const chevron=document.createElement('span');chevron.className='order-chevron';chevron.textContent='⌄';
     summary.append(main,status,total,chevron);

     const body=document.createElement('div');body.className='compact-order-body';
     const timeline=document.createElement('div');timeline.className='timeline';
     const steps=[
       ['Commande reçue',true],
       ['En attente de préparation',o.status!=='Annulée'],
       [o.status==='Annulée'?'Annulée':'Livrée',o.status==='Livrée'||o.status==='Annulée']
     ];
     steps.forEach((step,index)=>{
       const node=document.createElement('div');node.className='timeline-step';
       if(index===0||(index===1&&step[1])||(index===2&&step[1]))node.classList.add('done');
       if(index===2&&o.status==='Annulée')node.classList.add('cancelled');
       node.textContent=step[0];timeline.append(node);
     });
     body.append(timeline);

     if(o.contact_phone||o.billing_iban){
       const billing=document.createElement('p');billing.className='small muted';
       billing.textContent='Facturation : '+(o.contact_phone||'—')+' · IBAN '+(o.billing_iban||'—');body.append(billing);
     }
     if(o.status==='En attente de préparation'){
       const payment=document.createElement('p');payment.className='notice';payment.textContent='La préparation commence après règlement de la facture reçue.';body.append(payment);
     }
     if(o.cancel_reason){
       const reason=document.createElement('p');reason.className='notice';reason.textContent='Motif d’annulation : '+o.cancel_reason;body.append(reason);
     }
     const actions=document.createElement('div');actions.className='auth-actions';
     const reorder=document.createElement('button');reorder.className='btn secondary';reorder.type='button';reorder.textContent='Recommander';
     reorder.onclick=()=>{if(window.setOrderQty)window.setOrderQty(o.quantity);cartQuantity=o.quantity;saveCart();renderCart();location.hash='#/commander'};
     actions.append(reorder);body.append(actions);

     details.append(summary,body);box.append(details);
   }
 }catch(err){const card=document.createElement('div');card.className='card';card.textContent='Impossible de charger les commandes : '+err.message;box.append(card)}
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
async function loadStaffSpace(){
 const gate=el('staffSpaceGate'),content=el('staffSpaceContent'),list=el('staffInternalAnnouncements');
 if(!gate||!content||!list)return;

 const employeeConnected=!!account&&account.role!=='client';
 gate.classList.toggle('hidden',employeeConnected);
 content.classList.toggle('hidden',!employeeConnected);

 if(!employeeConnected){
 list.replaceChildren();
 if(location.hash.startsWith('#/espace-employe'))location.hash='#/espace';
 return;
 }

 const full=((myProfile?.first_name||account.first_name||'')+' '+(myProfile?.last_name||account.last_name||'')).trim();
 if(el('staffSpaceFirstName'))el('staffSpaceFirstName').textContent=myProfile?.first_name||account.first_name||'Employé';
 if(el('staffSpaceRole'))el('staffSpaceRole').textContent=roleLabels[account.role]||account.role;
 el('staffSpaceAdminLink')?.classList.toggle('hidden',!managerRoles.includes(account.role));

 try{
 const rows=await rpc('ae_staff_internal_announcements',{p_token:token});
 list.replaceChildren();

 if(!rows?.length){
 const empty=document.createElement('div');empty.className='news-empty';
 const copy=document.createElement('div');copy.className='news-empty-copy';
 const kicker=document.createElement('span');kicker.className='news-empty-kicker';kicker.textContent='Interne';
 const title=document.createElement('h3');title.textContent='Aucune annonce pour le moment.';
 copy.append(kicker,title);empty.append(copy);list.append(empty);return;
 }

 for(const row of rows){
 const item=document.createElement('article');item.className='internal-announcement';
 const top=document.createElement('div');top.className='internal-announcement-top';
 const title=document.createElement('h4');title.textContent=row.title;
 top.append(title);
 if(row.pinned){const pin=document.createElement('span');pin.className='internal-pin';pin.textContent='ÉPINGLÉE';top.append(pin)}
 const body=document.createElement('p');body.className='muted';body.textContent=row.body;
 const meta=document.createElement('small');meta.textContent=row.author+' · '+new Date(row.created_at).toLocaleString('fr-FR');
 item.append(top,body,meta);list.append(item);
 }
 }catch(err){
 list.textContent='Annonces internes indisponibles : '+err.message;
 }
}

el('quickDeclareProduction')?.addEventListener('click',()=>el('productionDeclareCard')?.scrollIntoView({behavior:'smooth',block:'start'}));
el('quickProductionHistory')?.addEventListener('click',()=>el('productionHistoryCard')?.scrollIntoView({behavior:'smooth',block:'start'}));
el('quickInternalNews')?.addEventListener('click',()=>el('internalNewsCard')?.scrollIntoView({behavior:'smooth',block:'start'}));

let productionProducts=[];
async function loadStaffProduction(){
 const select=el('productionProduct'),history=el('staffProductionHistory');
 if(!select||!history)return;
 if(!account||account.role==='client'){
 productionProducts=[];
 select.innerHTML='<option value="">Choisir un objet fabriqué</option>';
 history.replaceChildren();
 return;
 }

 try{
 const [products,rows]=await Promise.all([
 rpc('ae_staff_production_products',{p_token:token}),
 rpc('ae_staff_my_production_declarations',{p_token:token,p_limit:50})
 ]);
 productionProducts=products||[];

 const current=select.value;
 select.replaceChildren();
 const first=document.createElement('option');first.value='';first.textContent='Choisir un objet fabriqué';select.append(first);
 for(const product of productionProducts){
 const option=document.createElement('option');
 option.value=String(product.id);
 option.textContent=product.name;
 select.append(option);
 }
 if([...select.options].some(o=>o.value===current))select.value=current;

 history.replaceChildren();
 if(!rows?.length){
 const p=document.createElement('p');p.className='muted';p.textContent='Aucune fabrication déclarée pour le moment.';history.append(p);
 return;
 }
 for(const row of rows){
 const item=document.createElement('div');item.className='production-row';
 const copy=document.createElement('div');
 const strong=document.createElement('strong');strong.textContent=row.product_name;
 const small=document.createElement('small');small.textContent=new Date(row.created_at).toLocaleString('fr-FR');
 copy.append(strong,small);
 const qty=document.createElement('div');qty.className='production-qty';qty.textContent='× '+Number(row.quantity||0).toLocaleString('fr-FR');
 item.append(copy,qty);history.append(item);
 }
 }catch(err){
 history.textContent='Historique des fabrications indisponible : '+err.message;
 }
}

el('productionDeclarationForm')?.addEventListener('submit',async e=>{
 e.preventDefault();
 const form=e.currentTarget;
 const button=form?.querySelector('[type=submit]');
 if(!account||account.role==='client'){siteToast('Connexion employé requise.','error');return}
 const productId=Number(el('productionProduct')?.value||0);
 const quantity=Math.trunc(Number(el('productionQuantity')?.value||0));
 if(!productId){siteToast('Choisissez un objet fabriqué.','error');return}
 if(quantity<1){siteToast('Indiquez une quantité valide.','error');return}

 const product=productionProducts.find(p=>Number(p.id)===productId);
 const ok=await siteConfirm(
 'Déclarer '+quantity.toLocaleString('fr-FR')+' × '+(product?.name||'cet objet')+' ?',
 {title:'Confirmer la fabrication',confirmText:'Enregistrer'}
 );
 if(!ok)return;

 if(button)button.disabled=true;
 try{
 const saved=await rpc('ae_staff_add_production_declaration',{p_token:token,p_product_id:productId,p_quantity:quantity});
 el('productionQuantity').value='';
 siteToast((saved?.product_name||product?.name||'Fabrication')+' × '+quantity.toLocaleString('fr-FR')+' enregistrée.','success');
 await loadStaffProduction();
 await loadManagerProductionDeclarations();
 el('productionHistoryCard')?.scrollIntoView({behavior:'smooth',block:'nearest'});
 }catch(err){
 siteToast('Déclaration impossible : '+err.message,'error');
 }finally{
 if(button)button.disabled=false;
 }
});

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
 const [staff,reviewStaff]=await Promise.all([rpc('ae_public_staff'),rpc('ae_public_review_staff')]);
 staffCache=reviewStaff||[];
 box.replaceChildren();

 const reviewSelect=el('reviewStaff');
 if(reviewSelect){
 const current=reviewSelect.value;
 reviewSelect.replaceChildren();
 const first=document.createElement('option');first.value='';first.textContent='Choisir un employé';reviewSelect.append(first);
 for(const person of reviewStaff||[]){
 if(account&&person.account_id===account.id)continue;
 const opt=document.createElement('option');opt.value=person.account_id;opt.textContent=person.name+' — '+(roleLabels[person.role]||person.role);reviewSelect.append(opt);
 }
 if([...reviewSelect.options].some(o=>o.value===current))reviewSelect.value=current;
 }

 const hint=el('reviewHint');
 if(hint)hint.textContent=account?'Choisissez un membre de l’équipe et une note de 1 à 5 étoiles.':'Connectez-vous avec votre compte pour laisser un avis.';

 const all=reviewStaff||[];
 const totalReviews=all.reduce((sum,s)=>sum+Number(s.rating_count||0),0);
 const weighted=all.reduce((sum,s)=>sum+Number(s.rating_avg||0)*Number(s.rating_count||0),0);
 const rated=all.filter(s=>Number(s.rating_count||0)>0);
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
 const card=document.createElement('div');card.className='card';card.innerHTML='<h3>Équipe en préparation</h3><p class="muted">Les membres de l’équipe apparaîtront ici.</p>';box.append(card);return;
 }

 for(const s of staff){
 const card=document.createElement('article');card.className='team-face-card';
 const photo=document.createElement('div');photo.className='team-face-photo';
 if(s.avatar_url){
 const img=document.createElement('img');img.src=s.avatar_url;img.alt='Photo de '+s.name;photo.append(img);
 }else{
 photo.textContent=initials(s.name);
 }
 const name=document.createElement('h3');name.textContent=s.name;
 const role=document.createElement('span');role.className='team-face-role';role.textContent=roleLabels[s.role]||s.role;
 card.append(photo,name,role);
 box.append(card);
 }
 revealNow();
 }catch(err){box.textContent='Impossible de charger l’équipe : '+err.message}
}

async function loadNews(){
 const box=el('newsList');if(!box)return;
 try{
 const news=await rpc('ae_public_news');box.replaceChildren();
 if(!news?.length){
 const empty=document.createElement('div');empty.className='news-empty';
 const copy=document.createElement('div');copy.className='news-empty-copy';
 const kicker=document.createElement('span');kicker.className='news-empty-kicker';kicker.textContent='Aucune publication';
 const title=document.createElement('h3');title.textContent='Le journal est à jour.';
 const mark=document.createElement('div');mark.className='news-empty-mark';mark.textContent='AE';
 copy.append(kicker,title);empty.append(copy,mark);box.append(empty);return
 }
 for(const n of news){
 const card=document.createElement('article');card.className='card news-card reveal'+(n.cover_url?' has-cover':'');
 if(n.cover_url)card.style.setProperty('background-image','url("'+String(n.cover_url).replaceAll('"','')+'")','important');
 const tag=document.createElement('span');tag.className='tag';tag.textContent=n.category;
 const title=document.createElement('h3');title.textContent=n.title;
 const body=document.createElement('p');body.className='muted';body.textContent=n.body;
 const date=document.createElement('small');date.className='muted';date.textContent=new Date(n.created_at).toLocaleDateString('fr-FR');
 card.append(tag,title,body,date);
 if(account&&managerRoles.includes(account.role)){
 const del=document.createElement('button');del.type='button';del.className='btn secondary';del.textContent='Supprimer';del.onclick=async()=>{if(!await siteConfirm('Supprimer cette publication ?',{title:'Supprimer la publication',confirmText:'Supprimer'}))return;try{await rpc('ae_manager_delete_news',{p_token:token,p_id:n.id});siteToast('Publication supprimée.','success');await loadNews()}catch(err){siteToast(err.message,'error')}};card.append(del);
 }
 box.append(card);
 }
 revealNow();
 }catch(err){box.textContent='Journal indisponible : '+err.message}
}


el('loginForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const i=e.currentTarget.querySelectorAll('input');
 try{const result=await rpc('ae_login',{p_login:i[0].value,p_password:i[1].value});saveSession(result);feedback('Connexion réussie.');await refresh();location.hash=account?.must_change_password?'#/profil':(account?.role==='client'?'#/commander':'#/espace-employe')}
 catch(err){feedback('Connexion impossible : '+err.message)}
});

el('forcedPasswordForm')?.addEventListener('submit',async e=>{
 e.preventDefault();
 const form=e.currentTarget;
 if(!account||!account.must_change_password)return;
 const inputs=form.querySelectorAll('input');
 const newPassword=inputs[0].value;
 const confirmPassword=inputs[1].value;
 if(newPassword!==confirmPassword){siteToast('Les deux nouveaux mots de passe ne correspondent pas.');return}
 if(newPassword.length<8){siteToast('Le nouveau mot de passe doit contenir au moins 8 caractères.');return}
 const button=form.querySelector('button');button.disabled=true;
 try{
 await rpc('ae_set_initial_password',{p_token:token,p_new:newPassword});
 account=await rpc('ae_me',{p_token:token});
 safeReset(form);
 document.body.classList.remove('password-required');
 el('forcedPasswordCard')?.classList.add('hidden');
 siteToast('Votre mot de passe est enregistré.');
 await refresh();
 location.hash=account?.role==='client'?'#/commander':'#/espace-employe';
 }catch(err){siteToast('Modification impossible : '+err.message)}
 finally{button.disabled=false}
});

el('registerForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const form=e.currentTarget;const a=[...form.querySelectorAll('input')].map(x=>x.value.trim());
 try{
 const result=await rpc('ae_register_client',{p_first_name:a[0],p_last_name:a[1],p_phone:a[2],p_iban_rp:a[3],p_civil_id_rp:a[4],p_password:a[5]});
 saveSession(result);safeReset(form);feedback('Compte créé ! Vous êtes connecté.');await refresh();location.hash='#/commander';
 }catch(err){feedback('Inscription impossible : '+err.message)}
});

el('addToCart')?.addEventListener('click',()=>{
 const quantity=Math.max(1,Math.min(999,Math.floor(Number(el('qty')?.value||1))));
 cartQuantity=Math.min(999,cartQuantity+quantity);
 saveCart();renderCart();
 siteToast(quantity+' kit(s) ajouté(s) au panier.','success');
});
el('openCartFromPage')?.addEventListener('click',openCart);
el('cartToggle')?.addEventListener('click',openCart);
el('cartClose')?.addEventListener('click',closeCart);
el('cartPanel')?.querySelectorAll('[data-close-cart]').forEach(node=>node.addEventListener('click',closeCart));
el('cartClear')?.addEventListener('click',()=>{
 cartQuantity=0;saveCart();renderCart();el('checkoutArea')?.classList.add('hidden');
 siteToast('Panier vidé.','success');
});
el('cartCheckout')?.addEventListener('click',()=>{
 if(cartQuantity<1)return;
 el('checkoutArea')?.classList.remove('hidden');
 updateCheckoutState();
 setTimeout(()=>el('checkoutArea')?.scrollIntoView({behavior:'smooth',block:'nearest'}),40);
});
el('cartGoLogin')?.addEventListener('click',()=>{closeCart()});
el('checkoutForm')?.addEventListener('submit',async e=>{
 e.preventDefault();
 if(!account){siteToast('Connectez-vous pour valider votre panier.','error');return}
 if(cartQuantity<1){siteToast('Votre panier est vide.','error');return}
 const phone=el('checkoutPhone')?.value.trim()||'';
 const iban=el('checkoutIban')?.value.trim()||'';
 if(!phone||!iban){siteToast('Téléphone et IBAN obligatoires.','error');return}
 const button=e.currentTarget.querySelector('[type=submit]');button.disabled=true;
 try{
 const result=await rpc('ae_create_order_checkout',{p_token:token,p_quantity:cartQuantity,p_phone:phone,p_iban:iban});
 cartQuantity=0;saveCart();renderCart();closeCart();
 siteToast('Commande AE-'+String(result.id).padStart(4,'0')+' enregistrée. La préparation commencera après paiement de la facture.','success');
 triggerDiscordSync(false).catch(()=>{});
 await Promise.all([refresh(),loadOrders(),loadNotifications()]);
 location.hash='#/commandes';
 }catch(err){siteToast('Commande impossible : '+err.message,'error')}
 finally{button.disabled=false}
});

async function signOutEverywhere(){
 try{if(token)await rpc('ae_logout',{p_token:token})}catch(_){}
 token='';account=null;myProfile=null;localStorage.removeItem('ae_session');
 feedback('Déconnecté.');
 siteToast('Vous êtes déconnecté.','success');
 await refresh();
 location.hash='#/accueil';
}
el('signOut')?.addEventListener('click',signOutEverywhere);
el('sidebarSignOut')?.addEventListener('click',signOutEverywhere);



const requestForms=[];
document.querySelectorAll('form.simpleform').forEach((f,i)=>requestForms.push([f,i===0?'partenariat':'evenement']));
for(const [form,kind] of requestForms){
 form.addEventListener('submit',async e=>{
 e.preventDefault();const payload={};
 [...form.querySelectorAll('input,textarea')].forEach((input,i)=>{const key=input.placeholder||input.previousElementSibling?.textContent||('champ_'+(i+1));payload[key]=input.value.trim()});
 const button=form.querySelector('[type=submit]');button.disabled=true;
 try{const result=await rpc('ae_submit_request',{p_kind:kind,p_payload:payload});safeReset(form);siteToast('Demande envoyée ! Numéro #'+result.id)}
 catch(err){siteToast('Envoi impossible : '+err.message)}
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
 catch(_){siteToast(value)}
 };
 loginRow.append(loginValue);passRow.append(passValue);box.append(title,note,loginRow,passRow,copyAll);
}

function canAssignRoleUI(role){
 if(!account)return false;
 if(['assistant_direction','copatron','patron'].includes(account.role))return employeeRoles.includes(role);
 if(account.role==='drh')return ['mecano_novice','mecano_intermediaire','mecano_experimente','chef_equipe','rh'].includes(role);
 if(account.role==='rh')return ['mecano_novice','mecano_intermediaire','mecano_experimente','chef_equipe'].includes(role);
 return false;
}

el('employeeAccountForm')?.addEventListener('submit',async e=>{
 e.preventDefault();
 const form=e.currentTarget;
 if(!account||!managerRoles.includes(account.role)){siteToast('Accès administration requis.');return}
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
 safeReset(form);
 showTemporaryCredential(result.login,result.temporary_password);
 await Promise.all([managerRefresh(),loadStaff(),loadNotifications()]);
 }catch(err){siteToast('Création impossible : '+err.message)}
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
 if(!staffId||selectedReviewRating<1){siteToast('Choisissez un employé et une note de 1 à 5 étoiles.');return}
 try{
 await rpc('ae_rate_staff',{p_token:token,p_staff_account_id:staffId,p_stars:selectedReviewRating});
 siteToast('Votre avis a bien été enregistré.');
 selectedReviewRating=0;if(el('reviewRating'))el('reviewRating').value='0';
 document.querySelectorAll('#reviewStars [data-rating]').forEach(star=>star.classList.remove('active'));
 if(el('reviewStaff'))el('reviewStaff').value='';
 await loadStaff();
 }catch(err){siteToast('Avis impossible : '+err.message)}
});

el('newsForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const form=e.currentTarget;if(!account||!managerRoles.includes(account.role))return;
 const fields=form.querySelectorAll('input,select,textarea');
 try{
 await rpc('ae_manager_create_news',{p_token:token,p_title:fields[0].value,p_category:fields[1].value,p_cover_url:fields[2].value,p_body:fields[3].value});
 safeReset(form);siteToast('Publication ajoutée au journal.');await loadNews();
 }catch(err){siteToast('Publication impossible : '+err.message)}
});



let partnerCatalog=[];
let partnerMemoCatalog=[];
let managerPartnerCatalog=[];
let selectedAdminPartnerId=null;

const partnerGroupLabels={
 all_staff:'Tous les employés',
 mecanos:'Employés',
 chef_equipe:'Chef d’équipe',
 gestion:'Gestion',
 direction:'Direction'
};
const partnerServiceTypeLabels={totale:'Totale',moteur:'Moteur',custom:'Custom'};

function calcCustomPartnerPrice(factoryPrice,discountPercent){
 const factory=Math.max(0,Math.trunc(Number(factoryPrice)||0));
 const discount=Math.min(100,Math.max(0,Math.trunc(Number(discountPercent)||0)));
 const baseMargin=Math.min(Math.round(factory*2.5),10000);
 const discountedMargin=Math.round(baseMargin*((100-discount)/100));
 return {factory,discount,baseMargin,discountedMargin,final:factory+discountedMargin};
}

function selectedPartnerService(){
 const serviceId=Number(el('partnerDeclarationService')?.value||0);
 for(const partner of partnerCatalog||[]){
   const service=(partner.services||[]).find(s=>Number(s.id)===serviceId);
   if(service)return {partner,service};
 }
 return null;
}

function renderPartnerBillingPreview(){
 const box=el('partnerBillingPreview'),factoryWrap=el('partnerCustomFactoryWrap'),factoryInput=el('partnerCustomFactoryPrice');
 if(!box)return;
 const chosen=selectedPartnerService();
 const qty=Math.max(1,Math.trunc(Number(el('partnerDeclarationQuantity')?.value||1)));
 const custom=false;
 factoryWrap?.classList.add('hidden');
 if(factoryInput)factoryInput.required=false;

 box.replaceChildren();
 if(!chosen){
   const span=document.createElement('span');span.textContent='Sélectionnez une prestation à déclarer pour afficher le montant de fin de semaine.';box.append(span);return;
 }

 const {service}=chosen;
 if(service.service_type==='custom'){
   const note=document.createElement('strong');
   note.textContent='Customisation : paiement immédiat obligatoire.';
   box.append(note);
 }else{
   const total=Number(service.partner_price||0)*qty;
   const title=document.createElement('strong');title.textContent='À ajouter à la facture de fin de semaine : '+money(total);
   const detail=document.createElement('small');detail.textContent=(partnerServiceTypeLabels[service.service_type]||service.name)+' · '+money(service.partner_price)+' par prestation · quantité '+qty+'.';
   box.append(title,detail);
 }
}

function populatePartnerServices(){
 const partnerId=Number(el('partnerDeclarationPartner')?.value||0);
 const select=el('partnerDeclarationService');if(!select)return;
 const current=select.value;
 select.replaceChildren();
 const first=document.createElement('option');first.value='';first.textContent='Choisir une prestation';select.append(first);
 const partner=(partnerCatalog||[]).find(p=>Number(p.id)===partnerId);
 for(const service of partner?.services||[]){
   const option=document.createElement('option');option.value=String(service.id);
   option.textContent=service.service_type==='custom'
     ?'Custom — réduction '+Number(service.discount_percent||0)+' %'
     :(partnerServiceTypeLabels[service.service_type]||service.name)+' — '+money(service.partner_price);
   select.append(option);
 }
 select.disabled=!partnerId||!(partner?.services||[]).length;
 if([...select.options].some(o=>o.value===current))select.value=current;
 renderPartnerBillingPreview();
}

const moAudienceColumns=[
 ['employee','Employés'],
 ['direction','Direction']
];

function moGroupAllowsAudience(groups,audience){
 const set=new Set(groups||[]);
 if(set.has('all_staff'))return true;
 if(audience==='employee')return set.has('mecanos')||set.has('chef_equipe')||set.has('gestion');
 if(audience==='direction')return set.has('direction');
 return false;
}

function moRepairLabel(type){
 if(type==='totale')return 'Totale';
 if(type==='moteur')return 'Moteur';
 return 'Réparation';
}

function appendMoEmpty(td){
 const dash=document.createElement('span');
 dash.className='mo-no';
 dash.textContent='—';
 td.append(dash);
}

function appendMoRepairRates(td,services){
 if(!services.length){appendMoEmpty(td);return}
 const stack=document.createElement('div');stack.className='mo-rate-stack';
 const sorted=[...services].sort((a,b)=>{
   const rank={totale:1,moteur:2};
   return (rank[a.service_type]||9)-(rank[b.service_type]||9);
 });
 for(const service of sorted){
   const line=document.createElement('div');line.className='mo-rate-line';
   const label=document.createElement('small');label.textContent=moRepairLabel(service.service_type);
   const value=document.createElement('strong');value.textContent=service.billing_mode==='weekly_invoice'?'Déclaration':money(service.partner_price);
   line.append(label,value);stack.append(line);
 }
 td.append(stack);
}

function appendMoCustomRates(td,services){
 if(!services.length){appendMoEmpty(td);return}
 const values=[...new Set(services.map(service=>'−'+Number(service.discount_percent||0)+' % marge'))];
 const stack=document.createElement('div');stack.className='mo-rate-stack';
 for(const valueText of values){
   const badge=document.createElement('span');badge.className='mo-discount';badge.textContent=valueText;
   stack.append(badge);
 }
 td.append(stack);
}

function renderPartnerMemo(){
 const body=el('partnerMoTableBody');
 if(!body)return;
 const term=String(el('memoCompanySearch')?.value||'').trim().toLocaleLowerCase('fr');
 body.replaceChildren();

 const partners=(partnerMemoCatalog||[]).filter(partner=>!term||String(partner.name||'').toLocaleLowerCase('fr').includes(term));
 if(!partners.length){
   const tr=document.createElement('tr');
   const td=document.createElement('td');td.colSpan=5;td.className='mo-empty';td.textContent=term?'Aucune entreprise trouvée.':'Aucun tarif MO personnel configuré.';
   tr.append(td);body.append(tr);return;
 }

 for(const partner of partners){
   const services=partner.services||[];
   const repairs=services.filter(service=>service.service_type!=='custom');
   const customs=services.filter(service=>service.service_type==='custom');

   const repairEmployee=repairs.filter(service=>moGroupAllowsAudience(service.access_groups,'employee'));
   const repairDirection=repairs.filter(service=>moGroupAllowsAudience(service.access_groups,'direction'));
   const customEmployee=customs.filter(service=>moGroupAllowsAudience(service.access_groups,'employee'));
   const customDirection=customs.filter(service=>moGroupAllowsAudience(service.access_groups,'direction'));

   const tr=document.createElement('tr');

   const company=document.createElement('td');
   const name=document.createElement('span');name.className='mo-company';name.textContent=partner.name;
   company.append(name);tr.append(company);

   const employeeRepairTd=document.createElement('td');appendMoRepairRates(employeeRepairTd,repairEmployee);tr.append(employeeRepairTd);
   const directionRepairTd=document.createElement('td');appendMoRepairRates(directionRepairTd,repairDirection);tr.append(directionRepairTd);
   const employeeCustomTd=document.createElement('td');appendMoCustomRates(employeeCustomTd,customEmployee);tr.append(employeeCustomTd);
   const directionCustomTd=document.createElement('td');appendMoCustomRates(directionCustomTd,customDirection);tr.append(directionCustomTd);

   body.append(tr);
 }
}

el('memoCompanySearch')?.addEventListener('input',renderPartnerMemo);

async function loadPartnerDeclarations(){
 const gate=el('partnerDeclarationGate'),content=el('partnerDeclarationContent');
 const memoGate=el('partnerMemoGate'),memoContent=el('partnerMemoContent');
 const partnerSelect=el('partnerDeclarationPartner'),history=el('partnerDeclarationHistory');
 if(!gate||!content||!partnerSelect||!history)return;

 const staff=!!account&&account.role!=='client';
 gate.classList.toggle('hidden',staff);
 content.classList.toggle('hidden',!staff);
 memoGate?.classList.toggle('hidden',staff);
 memoContent?.classList.toggle('hidden',!staff);
 if(!staff){
   partnerCatalog=[];partnerMemoCatalog=[];partnerSelect.replaceChildren();
   const opt=document.createElement('option');opt.value='';opt.textContent='Choisir un partenaire';partnerSelect.append(opt);
   history.replaceChildren();renderPartnerMemo();
   el('partnerCustomFactoryWrap')?.classList.add('hidden');
   if(location.hash.startsWith('#/declaration-partenaires')||location.hash.startsWith('#/tarifs-memo'))location.hash='#/espace';
   return;
 }

 try{
   const [catalog,memo,rows]=await Promise.all([
     rpc('ae_staff_partner_catalog',{p_token:token}),
     rpc('ae_staff_partner_memo',{p_token:token}),
     rpc('ae_staff_my_partner_declarations',{p_token:token,p_limit:150})
   ]);
   partnerCatalog=catalog||[];
   partnerMemoCatalog=memo||[];

   const currentPartner=partnerSelect.value;
   partnerSelect.replaceChildren();
   const first=document.createElement('option');first.value='';first.textContent='Choisir un partenaire';partnerSelect.append(first);
   for(const partner of partnerCatalog){
     const option=document.createElement('option');option.value=String(partner.id);option.textContent=partner.name;partnerSelect.append(option);
   }
   if([...partnerSelect.options].some(o=>o.value===currentPartner))partnerSelect.value=currentPartner;
   populatePartnerServices();
   renderPartnerMemo();

   history.replaceChildren();
   if(!rows?.length){
     const p=document.createElement('p');p.className='muted';p.textContent='Aucune prestation à règlement fin de semaine déclarée pour le moment.';history.append(p);
   }else{
     for(const row of rows){
       const item=document.createElement('div');item.className='partner-declaration-row';
       const main=document.createElement('div');main.className='partner-declaration-main';
       const strong=document.createElement('strong');strong.textContent=row.partner_name+' — '+(partnerServiceTypeLabels[row.service_type]||row.service_name);
       const meta=document.createElement('small');
       let metaText='× '+Number(row.quantity||0).toLocaleString('fr-FR')+' · '+new Date(row.created_at).toLocaleString('fr-FR')+' · Règlement fin de semaine';
       if(row.service_type==='custom')metaText+=' · usine '+money(row.factory_price)+' · −'+Number(row.discount_percent||0)+' % · marge '+money(row.margin);
       meta.textContent=metaText;
       main.append(strong,meta);
       const amount=document.createElement('div');amount.className='partner-declaration-money';
       const total=document.createElement('strong');total.textContent=money(row.weekly_due_total);
       const small=document.createElement('small');small.textContent='à facturer au partenaire';
       amount.append(total,small);item.append(main,amount);history.append(item);
     }
   }
 }catch(err){
   history.textContent='Déclarations partenaires indisponibles : '+err.message;
 }
}

el('partnerDeclarationPartner')?.addEventListener('change',populatePartnerServices);
el('partnerDeclarationService')?.addEventListener('change',renderPartnerBillingPreview);
el('partnerDeclarationQuantity')?.addEventListener('input',renderPartnerBillingPreview);
el('partnerCustomFactoryPrice')?.addEventListener('input',renderPartnerBillingPreview);
el('partnerDeclarationForm')?.addEventListener('submit',async e=>{
 e.preventDefault();
 if(!account||account.role==='client'){siteToast('Connexion employé requise.','error');return}
 const form=e.currentTarget;
 const button=form.querySelector('[type=submit]');
 const chosen=selectedPartnerService();
 const quantity=Math.max(0,Math.trunc(Number(el('partnerDeclarationQuantity')?.value||0)));
 if(!chosen){siteToast('Choisissez une prestation à déclarer.','error');return}
 if(quantity<1){siteToast('Indiquez une quantité valide.','error');return}

 const custom=chosen.service.service_type==='custom';
 const factoryPrice=custom?Math.max(0,Math.trunc(Number(el('partnerCustomFactoryPrice')?.value||0))):null;
 if(custom&&factoryPrice<=0){siteToast('Indiquez le prix d’usine du custom.','error');return}
 const unitPrice=custom?calcCustomPartnerPrice(factoryPrice,chosen.service.discount_percent).final:Number(chosen.service.partner_price||0);
 const weeklyDue=unitPrice*quantity;
 const detail=custom?'\nPrix d’usine : '+money(factoryPrice)+' · réduction '+Number(chosen.service.discount_percent||0)+' %':'';
 const message=chosen.partner.name+' — '+(partnerServiceTypeLabels[chosen.service.service_type]||chosen.service.name)+' × '+quantity+detail+'\nMontant ajouté à la facture de fin de semaine : '+money(weeklyDue);
 const ok=await siteConfirm(message,{title:'Confirmer la déclaration partenaire',confirmText:'Déclarer'});
 if(!ok)return;

 if(button)button.disabled=true;
 try{
   await rpc('ae_staff_declare_partner_service',{
     p_token:token,
     p_service_id:Number(chosen.service.id),
     p_quantity:quantity,
     p_factory_price:factoryPrice
   });
   el('partnerDeclarationQuantity').value='1';
   if(el('partnerCustomFactoryPrice'))el('partnerCustomFactoryPrice').value='';
   siteToast('Prestation partenaire déclarée.','success');
   await Promise.all([loadPartnerDeclarations(),loadManagerPartners()]);
 }catch(err){siteToast('Déclaration impossible : '+err.message,'error')}
 finally{if(button)button.disabled=false}
});

function currentIsoWeekValue(date=new Date()){
 const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
 const day=d.getUTCDay()||7;
 d.setUTCDate(d.getUTCDate()+4-day);
 const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));
 const week=Math.ceil((((d-yearStart)/86400000)+1)/7);
 return d.getUTCFullYear()+'-W'+String(week).padStart(2,'0');
}
function isoWeekMonday(value){
 const match=/^(\d{4})-W(\d{2})$/.exec(String(value||''));
 if(!match)return null;
 const year=Number(match[1]),week=Number(match[2]);
 const jan4=new Date(Date.UTC(year,0,4));
 const day=jan4.getUTCDay()||7;
 const monday=new Date(jan4);
 monday.setUTCDate(jan4.getUTCDate()-day+1+(week-1)*7);
 return monday.toISOString().slice(0,10);
}
function ensurePartnerWeek(){
 const input=el('partnerWeekPicker');if(!input)return null;
 if(!input.value)input.value=currentIsoWeekValue();
 return isoWeekMonday(input.value);
}
function canConfigurePartners(){
 return !!account&&['assistant_direction','copatron','patron'].includes(account.role);
}
function selectedPartnerAccessGroups(){
 const values=[...document.querySelectorAll('#partnerAccessGroups input[type=checkbox]:checked')].map(input=>input.value);
 return values.includes('all_staff')?['all_staff']:values;
}
function updatePartnerAccessCount(){
 const count=selectedPartnerAccessGroups().length;
 const target=el('partnerAccessCount');
 if(!target)return;
 target.textContent=count===0?'0 groupe sélectionné':count===1?'1 groupe sélectionné':count+' groupes sélectionnés';
}
function selectedPartnerServiceType(){
 return document.querySelector('input[name="partnerServiceType"]:checked')?.value||'totale';
}
function accessGroupText(groups){
 return (groups||[]).map(g=>partnerGroupLabels[g]||g).join(', ')||'—';
}
function renderPartnerAdminCustomExample(){
 const out=el('partnerCustomExample');if(!out)return;
 const discount=Math.min(100,Math.max(0,Math.trunc(Number(el('partnerServiceDiscountPercent')?.value||0))));
 out.textContent=money(calcCustomPartnerPrice(4000,discount).final);
}
function updateDirectionBillingModeUI(){
 const mode=el('partnerServiceDirectionBillingMode');
 const input=el('partnerServiceDirectionPrice');
 const note=input?.closest('.partner-rate-box')?.querySelector('small');
 if(!mode||!input)return;
 const weekly=mode.value==='weekly_invoice';
 if(weekly){
   const type=document.querySelector('input[name="partnerServiceType"]:checked')?.value||'totale';
   const partner=managerPartnerCatalog.find(p=>Number(p.id)===Number(selectedAdminPartnerId));
   const companyService=(partner?.services||[]).find(s=>s.active&&s.service_type===type&&(s.access_groups||[]).includes('all_staff')&&s.billing_mode==='weekly_invoice');
   input.readOnly=true;
   input.value=companyService?String(companyService.partner_price):'';
   if(note)note.textContent=companyService?'Déclaration : reprend le tarif véhicule entreprise ('+money(companyService.partner_price)+').':'Déclaration : configurez d’abord le tarif véhicule entreprise.';
 }else{
   input.readOnly=false;
   if(note)note.textContent='Réparation véhicule personnel';
 }
}

function updatePartnerServiceTypeUI(){
 const type=selectedPartnerServiceType();
 const custom=type==='custom';
 const mode=el('partnerServiceBillingMode');

 if(custom&&mode){
   mode.value='direct_discount';
   mode.disabled=true;
 }else if(mode){
   mode.disabled=false;
 }

 const personal=custom||mode?.value==='direct_discount';

 el('partnerCompanyFixedPrice')?.classList.toggle('hidden',custom||personal);
 el('partnerPersonalFixedPrices')?.classList.toggle('hidden',custom||!personal);
 el('partnerCustomConfig')?.classList.toggle('hidden',!custom);
 el('partnerCustomGenericRate')?.classList.add('hidden');
 el('partnerPersonalCustomRates')?.classList.toggle('hidden',!custom);

 if(el('partnerServicePartnerPrice'))el('partnerServicePartnerPrice').required=!custom&&!personal;
 if(el('partnerServiceEmployeePrice'))el('partnerServiceEmployeePrice').required=false;
 if(el('partnerServiceDirectionPrice'))el('partnerServiceDirectionPrice').required=false;
 if(el('partnerServiceDiscountPercent'))el('partnerServiceDiscountPercent').required=false;

 const help=el('partnerServiceModeHelp');
 if(help)help.textContent=custom
   ?'Customisation : paiement immédiat obligatoire. La réduction s’applique uniquement sur la marge (prix usine × 2,5, marge plafonnée à 10 000 $).'
   :personal
     ?'Véhicule personnel : paiement immédiat pour les Employés. Pour la Direction, une déclaration reprend automatiquement le tarif véhicule entreprise.'
     :'Véhicule entreprise : la réparation est déclarée puis réglée en fin de semaine.';

 renderPartnerAdminCustomExample();
}

el('partnerServiceDirectionBillingMode')?.addEventListener('change',updateDirectionBillingModeUI);
document.querySelectorAll('input[name="partnerServiceType"]').forEach(input=>input.addEventListener('change',updateDirectionBillingModeUI));

document.querySelectorAll('#partnerAccessGroups input[type=checkbox]').forEach(input=>{
 input.addEventListener('change',()=>{
   const all=el('partnerAccessGroups')?.querySelector('input[value="all_staff"]');
   if(input.value==='all_staff'&&input.checked){
     document.querySelectorAll('#partnerAccessGroups input[type=checkbox]').forEach(other=>{if(other!==input)other.checked=false});
   }else if(input.checked&&all){
     all.checked=false;
   }
   updatePartnerAccessCount();
 });
});
updatePartnerAccessCount();
document.querySelectorAll('input[name="partnerServiceType"]').forEach(input=>input.addEventListener('change',updatePartnerServiceTypeUI));
el('partnerServiceDiscountPercent')?.addEventListener('input',renderPartnerAdminCustomExample);
updatePartnerServiceTypeUI();

function setPartnerAdminTab(tab){
 const chosen=['summary','configure','history','requests'].includes(tab)?tab:'summary';
 document.querySelectorAll('[data-partner-tab]').forEach(button=>{
   const active=button.dataset.partnerTab===chosen;
   button.classList.toggle('active',active);
   button.setAttribute('aria-selected',String(active));
 });
 document.querySelectorAll('[data-partner-panel]').forEach(panel=>{
   panel.classList.toggle('hidden',panel.dataset.partnerPanel!==chosen);
 });
 localStorage.setItem('ae_partner_admin_tab',chosen);
}
document.querySelectorAll('[data-partner-tab]').forEach(button=>{
 button.addEventListener('click',()=>setPartnerAdminTab(button.dataset.partnerTab));
});
setPartnerAdminTab(localStorage.getItem('ae_partner_admin_tab')||'summary');

el('partnerDirectorySearch')?.addEventListener('input',()=>loadManagerPartners());
el('partnerShowInactive')?.addEventListener('change',()=>loadManagerPartners());

async function loadManagerPartners(){
 const catalogBox=el('managerPartnerCatalog');
 const declarationsBox=el('managerPartnerDeclarations');
 const partnerList=el('managerPartnerList');
 if(!catalogBox||!declarationsBox)return;

 const manager=!!account&&managerRoles.includes(account.role);
 if(!manager){
   catalogBox.replaceChildren();
   declarationsBox.replaceChildren();
   partnerList?.replaceChildren();
   return;
 }
 const weekStart=ensurePartnerWeek();
 el('partnerConfigZone')?.classList.toggle('hidden',!canConfigurePartners());

 try{
   const [catalog,summary,rows]=await Promise.all([
     rpc('ae_manager_partner_catalog',{p_token:token}),
     rpc('ae_manager_partner_week_summary',{p_token:token,p_week_start:weekStart}),
     rpc('ae_manager_partner_declarations',{p_token:token,p_week_start:weekStart,p_limit:1000})
   ]);

   const allPartners=catalog||[];
   managerPartnerCatalog=allPartners;
   const activePartners=allPartners.filter(partner=>partner.active);
   if(selectedAdminPartnerId&&!allPartners.some(partner=>Number(partner.id)===Number(selectedAdminPartnerId))){
     selectedAdminPartnerId=null;
   }
   if(!selectedAdminPartnerId&&allPartners.length){
     selectedAdminPartnerId=Number((activePartners[0]||allPartners[0]).id);
   }
   const selectedPartner=allPartners.find(partner=>Number(partner.id)===Number(selectedAdminPartnerId))||null;


   if(partnerList){
     partnerList.replaceChildren();
     const term=String(el('partnerDirectorySearch')?.value||'').trim().toLocaleLowerCase('fr');
     const showInactive=el('partnerShowInactive')?.checked!==false;
     const visible=allPartners.filter(partner=>
       (!term||String(partner.name||'').toLocaleLowerCase('fr').includes(term)) &&
       (showInactive||partner.active)
     );
     if(!visible.length){
       const empty=document.createElement('p');empty.className='partner-directory-empty';
       empty.textContent=allPartners.length?'Aucun partenaire ne correspond à votre recherche.':'Aucun partenaire. Créez-en un ci-dessous.';
       partnerList.append(empty);
     }
     for(const partner of visible){
       const row=document.createElement('div');
       row.className='partner-directory-row'+(Number(partner.id)===Number(selectedAdminPartnerId)?' active':'')+(partner.active?'':' is-inactive');

       const button=document.createElement('button');
       button.type='button';button.className='partner-directory-item';
       const name=document.createElement('span');name.textContent=partner.name;
       const count=document.createElement('small');
       count.textContent=(partner.active?'● Actif':'○ Désactivé')+' · '+(partner.services||[]).filter(service=>service.active).length+' prestation(s)';
       button.append(name,count);
       button.onclick=()=>{selectedAdminPartnerId=Number(partner.id);loadManagerPartners()};
       row.append(button);

       if(canConfigurePartners()){
         const actions=document.createElement('div');actions.className='partner-directory-row-actions';
         const toggle=document.createElement('button');toggle.type='button';toggle.className='partner-directory-action';
         toggle.title=partner.active?'Désactiver':'Réactiver';
         toggle.setAttribute('aria-label',(partner.active?'Désactiver ':'Réactiver ')+partner.name);
         toggle.textContent=partner.active?'Ⅱ':'✓';
         toggle.onclick=async event=>{
           event.stopPropagation();
           toggle.disabled=true;
           try{
             await rpc('ae_manager_set_partner_active',{p_token:token,p_partner_id:partner.id,p_active:!partner.active});
             siteToast(partner.active?'Partenaire désactivé.':'Partenaire réactivé.','success');
             await Promise.all([loadManagerPartners(),loadPartnerDeclarations()]);
           }catch(err){toggle.disabled=false;siteToast('Modification impossible : '+err.message,'error')}
         };
         const remove=document.createElement('button');remove.type='button';
         remove.className='partner-directory-action danger';remove.textContent='×';
         remove.title='Supprimer définitivement';
         remove.setAttribute('aria-label','Supprimer '+partner.name);
         remove.onclick=async event=>{
           event.stopPropagation();
           if(!await siteConfirm('Supprimer définitivement '+partner.name+' ? Les anciennes déclarations empêchent la suppression afin de conserver l’historique.',{title:'Supprimer le partenaire',confirmText:'Supprimer'}))return;
           remove.disabled=true;
           try{
             await rpc('ae_manager_delete_partner',{p_token:token,p_partner_id:partner.id});
             if(Number(selectedAdminPartnerId)===Number(partner.id))selectedAdminPartnerId=null;
             siteToast('Partenaire supprimé.','success');
             await Promise.all([loadManagerPartners(),loadPartnerDeclarations()]);
           }catch(err){remove.disabled=false;siteToast('Suppression impossible : '+err.message,'error')}
         };
         actions.append(toggle,remove);
         row.append(actions);
       }
       partnerList.append(row);
     }
   }

   const servicePartner=el('partnerServicePartner');
   if(servicePartner){
     servicePartner.replaceChildren();
     const first=document.createElement('option');first.value='';first.textContent='Choisir le partenaire';servicePartner.append(first);
     for(const partner of activePartners){
       const option=document.createElement('option');option.value=String(partner.id);option.textContent=partner.name;servicePartner.append(option);
     }
     if(selectedPartner)servicePartner.value=String(selectedPartner.id);
   }

   const selectedBanner=el('partnerServiceSelectedPartner');
   if(selectedBanner){
     selectedBanner.replaceChildren();
     if(selectedPartner){
       const label=document.createElement('span');label.textContent='Partenaire sélectionné : ';
       const strong=document.createElement('strong');strong.textContent=selectedPartner.name;
       selectedBanner.append(label,strong);
     }else{
       selectedBanner.textContent='Sélectionnez ou créez un partenaire.';
     }
   }

   const stats=el('partnerWeekStats');
   if(stats){
     stats.replaceChildren();
     [
       ['Prestations déclarées',Number(summary?.declaration_count||0).toLocaleString('fr-FR')],
       ['À facturer fin de semaine',money(summary?.weekly_due_total||0)],
       ['Partenaires concernés',String((summary?.partners||[]).length)]
     ].forEach(([label,value])=>{
       const card=document.createElement('div');card.className='stat-card';
       const strong=document.createElement('strong');strong.textContent=value;
       const span=document.createElement('span');span.textContent=label;
       card.append(strong,span);stats.append(card);
     });
   }

   const weekly=el('partnerWeeklyCards');
   if(weekly){
     weekly.replaceChildren();
     const summaries=new Map((summary?.partners||[]).map(p=>[Number(p.partner_id),p]));
     const allPartners=(catalog||[]).filter(p=>p.active);
     const table=document.createElement('div');table.className='partner-week-table';
     const header=document.createElement('div');header.className='partner-week-table-row partner-week-table-header';
     for(const heading of ['Entreprise','Prestations','Total à facturer']){
       const cell=document.createElement('span');cell.textContent=heading;header.append(cell);
     }
     table.append(header);
     let grandTotal=0;
     for(const partner of allPartners){
       const entry=summaries.get(Number(partner.id))||
         (summary?.partners||[]).find(p=>p.partner_name===partner.name);
       const count=Number(entry?.prestation_count||0);
       const due=Number(entry?.weekly_due_total||0);
       grandTotal+=due;
       const row=document.createElement('div');row.className='partner-week-table-row';
       const name=document.createElement('strong');name.textContent=partner.name;
       const quantity=document.createElement('span');quantity.textContent=String(count);
       const amount=document.createElement('strong');amount.textContent=money(due);
       if(count===0){row.classList.add('partner-week-zero');amount.classList.add('muted')}
       row.append(name,quantity,amount);table.append(row);
     }
     if(!allPartners.length){
       const empty=document.createElement('p');empty.className='muted';empty.textContent='Aucun partenaire actif à afficher.';table.append(empty);
     }else{
       const totalRow=document.createElement('div');totalRow.className='partner-week-table-row partner-week-table-total';
       const label=document.createElement('strong');label.textContent='TOTAL DE LA SEMAINE';
       const count=document.createElement('span');count.textContent=String(summary?.declaration_count||0);
       const total=document.createElement('strong');total.textContent=money(grandTotal);
       totalRow.append(label,count,total);table.append(totalRow);
     }
     weekly.append(table);
   }

   catalogBox.replaceChildren();
   if(!selectedPartner){
     const p=document.createElement('p');p.className='muted';p.textContent='Sélectionnez un partenaire dans la colonne de gauche.';catalogBox.append(p);
   }else{
     const wrapper=document.createElement('div');wrapper.className='partner-config-groups';

     const makeActions=(service)=>{
       if(!canConfigurePartners())return null;
       const actions=document.createElement('div');actions.className='partner-service-actions-inline';

       const toggle=document.createElement('button');
       toggle.type='button';
       toggle.className='btn secondary';
       toggle.textContent=service.active?'Suspendre':'Réactiver';
       toggle.onclick=async()=>{
         toggle.disabled=true;
         try{
           await rpc('ae_manager_set_partner_service_active',{p_token:token,p_service_id:service.id,p_active:!service.active});
           siteToast(service.active?'Tarif suspendu.':'Tarif réactivé.','success');
           await Promise.all([loadManagerPartners(),loadPartnerDeclarations()]);
         }catch(err){
           toggle.disabled=false;
           siteToast('Modification impossible : '+err.message,'error');
         }
       };

       const remove=document.createElement('button');
       remove.type='button';
       remove.className='btn danger';
       remove.textContent='Supprimer';
       remove.onclick=async()=>{
         const label=partnerServiceTypeLabels[service.service_type]||service.name;
         if(!await siteConfirm('Supprimer définitivement ce tarif '+label+' ?',{title:'Supprimer le tarif',confirmText:'Supprimer'}))return;
         remove.disabled=true;
         try{
           await rpc('ae_manager_delete_partner_service',{p_token:token,p_service_id:service.id});
           siteToast('Tarif supprimé.','success');
           await Promise.all([loadManagerPartners(),loadPartnerDeclarations()]);
         }catch(err){
           remove.disabled=false;
           siteToast('Suppression impossible : '+err.message,'error');
         }
       };

       actions.append(toggle,remove);
       return actions;
     };

     const audienceService=(services,audience)=>services.find(service=>moGroupAllowsAudience(service.access_groups,audience))||null;

     const addSection=(title,help,rows)=>{
       const section=document.createElement('section');section.className='partner-config-section';
       const head=document.createElement('div');head.className='partner-config-section-head';
       const strong=document.createElement('strong');strong.textContent=title;
       const small=document.createElement('small');small.textContent=help;
       head.append(strong,small);section.append(head);

       if(!rows.length){
         const empty=document.createElement('div');empty.className='partner-config-empty';empty.textContent='Aucun tarif configuré.';section.append(empty);
       }else{
         const table=document.createElement('div');table.className='partner-config-table';
         for(const rowData of rows)table.append(rowData);
         section.append(table);
       }
       wrapper.append(section);
     };

     const makeAudienceRow=(label,employeeService,directionService,isCustom=false)=>{
       const row=document.createElement('div');row.className='partner-config-row';
       const copy=document.createElement('div');copy.className='partner-config-label';
       const st=document.createElement('strong');st.textContent=label;
       const sm=document.createElement('small');sm.textContent=isCustom?'Paiement immédiat · remise sur la marge':'Véhicule personnel · règlement configurable par groupe';
       copy.append(st,sm);

       const makeCell=(service,audienceLabel)=>{
         const cell=document.createElement('div');cell.className='partner-config-cell';
         const value=document.createElement('div');value.className='partner-config-value'+(service?'':' muted');
         value.textContent=service?(isCustom?'−'+Number(service.discount_percent||0)+' % marge':service.billing_mode==='weekly_invoice'?'Déclaration · tarif entreprise':money(service.partner_price)):'—';
         const meta=document.createElement('small');meta.className='muted';meta.textContent=audienceLabel;
         const valueWrap=document.createElement('div');valueWrap.append(value,meta);
         cell.append(valueWrap);
         const actions=service?makeActions(service):null;if(actions)cell.append(actions);
         return cell;
       };

       row.append(copy,makeCell(employeeService,'Employés'),makeCell(directionService,'Direction'));
       return row;
     };

     const personal=(selectedPartner.services||[]).filter(s=>s.service_type==='custom'?s.billing_mode==='direct_discount':!(s.access_groups||[]).includes('all_staff'));
     const company=(selectedPartner.services||[]).filter(s=>s.billing_mode==='weekly_invoice'&&s.service_type!=='custom'&&(s.access_groups||[]).includes('all_staff'));

     const customServices=personal.filter(s=>s.service_type==='custom');
     addSection(
       'Customisations personnelles',
       'Toujours payées immédiatement',
       customServices.length?[makeAudienceRow('Customisation',audienceService(customServices,'employee'),audienceService(customServices,'direction'),true)]:[]
     );

     const repairRows=[];
     for(const type of ['totale','moteur']){
       const services=personal.filter(s=>s.service_type===type);
       if(services.length)repairRows.push(makeAudienceRow(partnerServiceTypeLabels[type],audienceService(services,'employee'),audienceService(services,'direction'),false));
     }
     addSection('Réparations personnelles','Tarifs Employés / Direction séparés',repairRows);

     const companyRows=[];
     for(const service of company){
       const row=document.createElement('div');row.className='partner-config-row';
       const copy=document.createElement('div');copy.className='partner-config-label';
       const st=document.createElement('strong');st.textContent=partnerServiceTypeLabels[service.service_type]||service.name;
       const sm=document.createElement('small');sm.textContent='Véhicule entreprise · déclaration fin de semaine';
       copy.append(st,sm);

       const price=document.createElement('div');price.className='partner-config-value';price.textContent=money(service.partner_price);
       const badge=document.createElement('div');badge.className='partner-config-cell';
       const status=document.createElement('small');status.className='muted';status.textContent=service.active?'Actif':'Désactivé';
       badge.append(status);
       const actions=makeActions(service);if(actions)badge.append(actions);
       row.append(copy,price,badge);companyRows.push(row);
     }
     addSection('Réparations entreprise','Déclaration puis règlement fin de semaine',companyRows);

     if(canConfigurePartners()){
       const danger=document.createElement('div');danger.className='partner-danger-zone';
       const copy=document.createElement('div');
       const title=document.createElement('strong');title.textContent='Zone danger';
       const help=document.createElement('small');help.textContent='Supprime définitivement tout l’historique de prestations de '+selectedPartner.name+'.';
       copy.append(title,help);

       const clearButton=document.createElement('button');clearButton.type='button';clearButton.className='btn danger';clearButton.textContent='Vider l’historique';
       clearButton.onclick=async()=>{
         const ok=await siteConfirm('Supprimer définitivement tout l’historique de prestations de '+selectedPartner.name+' ? Cette action est irréversible.',{title:'Vider l’historique',confirmText:'Tout supprimer'});
         if(!ok)return;
         clearButton.disabled=true;
         try{
           const count=await rpc('ae_manager_clear_partner_history',{p_token:token,p_partner_id:selectedPartner.id});
           siteToast(Number(count||0)+' prestation(s) supprimée(s) de l’historique.','success');
           await Promise.all([loadManagerPartners(),loadPartnerDeclarations()]);
         }catch(err){clearButton.disabled=false;siteToast('Suppression impossible : '+err.message,'error')}
       };
       danger.append(copy,clearButton);wrapper.append(danger);
     }

     catalogBox.append(wrapper);
   }
   declarationsBox.replaceChildren();
   if(!rows?.length){
     const p=document.createElement('p');p.className='muted';p.textContent='Aucune prestation à règlement fin de semaine déclarée sur cette semaine.';declarationsBox.append(p);
   }else{
     for(const row of rows){
       const item=document.createElement('div');item.className='partner-admin-declaration';
       const copy=document.createElement('div');
       const strong=document.createElement('strong');strong.textContent=row.partner_name+' — '+(partnerServiceTypeLabels[row.service_type]||row.service_name);
       const small=document.createElement('small');
       let details=row.employee+' · '+(roleLabels[row.role]||row.role)+' · '+new Date(row.created_at).toLocaleString('fr-FR')+' · × '+Number(row.quantity||0).toLocaleString('fr-FR');
       if(row.service_type==='custom')details+=' · usine '+money(row.factory_price)+' · −'+Number(row.discount_percent||0)+' % · marge '+money(row.margin);
       small.textContent=details;copy.append(strong,small);
       const due=document.createElement('div');due.className='partner-admin-amount';
       const dueLabel=document.createElement('small');dueLabel.textContent='À facturer';
       const dueValue=document.createElement('strong');dueValue.textContent=money(row.weekly_due_total);
       due.append(dueLabel,dueValue);item.append(copy,due);
       if(canConfigurePartners()){
         const actions=document.createElement('div');actions.className='partner-history-actions';
         const remove=document.createElement('button');remove.type='button';remove.className='btn danger';remove.textContent='Supprimer';
         remove.onclick=async()=>{
           const ok=await siteConfirm('Supprimer cette prestation de l’historique de '+row.partner_name+' ? Cette action est irréversible.',{title:'Supprimer de l’historique',confirmText:'Supprimer'});
           if(!ok)return;
           remove.disabled=true;
           try{
             await rpc('ae_manager_delete_partner_declaration',{p_token:token,p_declaration_id:row.id});
             siteToast('Prestation supprimée de l’historique.','success');
             await Promise.all([loadManagerPartners(),loadPartnerDeclarations()]);
           }catch(err){remove.disabled=false;siteToast('Suppression impossible : '+err.message,'error')}
         };
         actions.append(remove);item.append(actions);
       }
       declarationsBox.append(item);
     }
   }
 }catch(err){
   catalogBox.textContent='Partenaires indisponibles : '+err.message;
   declarationsBox.textContent='';
   if(partnerList)partnerList.textContent='Liste indisponible.';
 }
}

el('partnerWeekPicker')?.addEventListener('change',loadManagerPartners);
el('partnerCurrentWeek')?.addEventListener('click',()=>{if(el('partnerWeekPicker'))el('partnerWeekPicker').value=currentIsoWeekValue();loadManagerPartners()});
el('partnerServiceBillingMode')?.addEventListener('change',updatePartnerServiceTypeUI);
el('partnerCreateForm')?.addEventListener('submit',async e=>{
 e.preventDefault();if(!canConfigurePartners()){siteToast('Accès direction requis.','error');return}
 const form=e.currentTarget;
 if(!form)return;
 const button=form.querySelector('[type=submit]');if(button)button.disabled=true;
 const name=el('partnerCreateName')?.value.trim()||'';
 try{
   const created=await rpc('ae_manager_create_partner',{p_token:token,p_name:name});
   selectedAdminPartnerId=Number(created.id);
   safeReset(form);
   siteToast('Partenaire créé.','success');
   await Promise.all([loadManagerPartners(),loadPartnerDeclarations()]);
 }catch(err){siteToast('Création impossible : '+err.message,'error')}
 finally{if(button)button.disabled=false}
});
el('partnerServiceForm')?.addEventListener('submit',async e=>{
 e.preventDefault();
 if(!canConfigurePartners()){siteToast('Accès direction requis.','error');return}

 const form=e.currentTarget;
 if(!selectedAdminPartnerId){siteToast('Sélectionnez un partenaire dans la liste à gauche.','error');return}

 const type=selectedPartnerServiceType();
 const billingMode=type==='custom'?'direct_discount':(el('partnerServiceBillingMode')?.value||'weekly_invoice');
 const personal=billingMode==='direct_discount';
 const button=form.querySelector('[type=submit]');
 if(button)button.disabled=true;

 try{
   if(personal){
     const payloads=[];

     if(type==='custom'){
       const employeeRaw=String(el('partnerServiceEmployeeDiscountPercent')?.value||'').trim();
       const directionRaw=String(el('partnerServiceDirectionDiscountPercent')?.value||'').trim();

       if(!employeeRaw&&!directionRaw)throw new Error('Indiquez au moins un pourcentage Employés ou Direction.');

       if(employeeRaw){
         const value=Math.trunc(Number(employeeRaw));
         if(!Number.isFinite(value)||value<0||value>100)throw new Error('La réduction Employés doit être comprise entre 0 et 100 %.');
         payloads.push({price:0,discount:value,groups:['mecanos','chef_equipe','gestion']});
       }
       if(directionRaw){
         const value=Math.trunc(Number(directionRaw));
         if(!Number.isFinite(value)||value<0||value>100)throw new Error('La réduction Direction doit être comprise entre 0 et 100 %.');
         payloads.push({price:0,discount:value,groups:['direction']});
       }
     }else{
       const employeeRaw=String(el('partnerServiceEmployeePrice')?.value||'').trim();
       const directionRaw=String(el('partnerServiceDirectionPrice')?.value||'').trim();

       if(!employeeRaw&&!directionRaw)throw new Error('Indiquez au moins un tarif Employés ou Direction.');

       if(employeeRaw){
         const value=Math.trunc(Number(employeeRaw));
         if(!Number.isFinite(value)||value<0)throw new Error('Le tarif Employés est invalide.');
         payloads.push({price:value,discount:0,groups:['mecanos','chef_equipe','gestion'],billing_mode:'direct_discount'});
       }
       if(directionRaw){
         let value=Math.trunc(Number(directionRaw));
         const directionBillingMode=el('partnerServiceDirectionBillingMode')?.value||'direct_discount';
         if(directionBillingMode==='weekly_invoice'){
           const managerPartner=managerPartnerCatalog.find(p=>Number(p.id)===Number(selectedAdminPartnerId));
           const companyService=(managerPartner?.services||[]).find(s=>s.active&&s.service_type===type&&(s.access_groups||[]).includes('all_staff')&&s.billing_mode==='weekly_invoice');
           if(!companyService)throw new Error('Configurez d’abord le tarif véhicule entreprise pour cette prestation.');
           value=Math.trunc(Number(companyService.partner_price));
         }
         if(!Number.isFinite(value)||value<0)throw new Error('Le tarif Direction est invalide.');
         payloads.push({price:value,discount:0,groups:['direction'],billing_mode:directionBillingMode});
       }
     }

     for(const payload of payloads){
       await rpc('ae_manager_add_partner_service',{
         p_token:token,
         p_partner_id:Number(selectedAdminPartnerId),
         p_service_type:type,
         p_partner_price:payload.price,
         p_discount_percent:payload.discount,
         p_billing_mode:payload.billing_mode||'direct_discount',
         p_access_groups:payload.groups
       });
     }
   }else{
     const partnerPrice=type==='custom'?0:Math.trunc(Number(el('partnerServicePartnerPrice')?.value));
     const discount=type==='custom'?Math.trunc(Number(el('partnerServiceDiscountPercent')?.value)):0;

     if(type!=='custom'&&(!Number.isFinite(partnerPrice)||partnerPrice<0))throw new Error('Indiquez le tarif de la réparation entreprise.');
     if(type==='custom'&&(!Number.isFinite(discount)||discount<0||discount>100))throw new Error('Indiquez une réduction Custom entreprise entre 0 et 100 %.');

     await rpc('ae_manager_add_partner_service',{
       p_token:token,
       p_partner_id:Number(selectedAdminPartnerId),
       p_service_type:type,
       p_partner_price:partnerPrice,
       p_discount_percent:discount,
       p_billing_mode:'weekly_invoice',
       p_access_groups:['all_staff']
     });
   }

   safeReset(form);
   document.querySelector('input[name="partnerServiceType"][value="totale"]')?.click();
   const mode=el('partnerServiceBillingMode');if(mode)mode.value='weekly_invoice';
   if(el('partnerServiceDirectionBillingMode'))el('partnerServiceDirectionBillingMode').value='direct_discount';
   updateDirectionBillingModeUI();

   for(const id of [
     'partnerServiceEmployeePrice',
     'partnerServiceDirectionPrice',
     'partnerServiceEmployeeDiscountPercent',
     'partnerServiceDirectionDiscountPercent'
   ]) if(el(id))el(id).value='';

   updatePartnerServiceTypeUI();
   siteToast(personal?'Tarifs personnels ajoutés.':'Prestation entreprise ajoutée.','success');
   await Promise.all([loadManagerPartners(),loadPartnerDeclarations()]);
 }catch(err){
   siteToast('Ajout impossible : '+err.message,'error');
 }finally{
   if(button)button.disabled=false;
 }
});

function activateAdminTab(name){
 const target=(name==='purchase'&&!['assistant_direction','copatron','patron'].includes(account?.role))?'dashboard':(name||'dashboard');
 document.querySelectorAll('[data-admin-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.adminTab===target));
 document.querySelectorAll('[data-admin-panel]').forEach(panel=>panel.classList.toggle('hidden',panel.dataset.adminPanel!==target));
 localStorage.setItem('ae_admin_tab',target);
}
document.querySelectorAll('[data-admin-tab]').forEach(btn=>btn.addEventListener('click',()=>activateAdminTab(btn.dataset.adminTab)));
{
 const savedAdminTab=localStorage.getItem('ae_admin_tab');
 const migratedAdminTab=savedAdminTab==='team'?'rh':savedAdminTab==='requests'?'partners':(savedAdminTab||'dashboard');
 activateAdminTab(migratedAdminTab);
}

function filterManagerClients(){
 const q=(el('managerCustomerSearch')?.value||'').trim().toLowerCase();
 document.querySelectorAll('#managerCustomers .client-file').forEach(card=>card.classList.toggle('is-filtered',q&&!String(card.dataset.search||'').includes(q)));
}
function filterManagerEmployees(){
 const q=(el('managerEmployeeSearch')?.value||'').trim().toLowerCase();
 const role=el('managerEmployeeRole')?.value||'';
 document.querySelectorAll('#managerEmployees .employee-account-card').forEach(card=>{
 const matchText=!q||String(card.dataset.search||'').includes(q);
 const matchRole=!role||card.dataset.role===role;
 card.classList.toggle('is-filtered',!(matchText&&matchRole));
 });
}
el('managerCustomerSearch')?.addEventListener('input',filterManagerClients);
el('managerEmployeeSearch')?.addEventListener('input',filterManagerEmployees);
el('managerEmployeeRole')?.addEventListener('change',filterManagerEmployees);

function filterManagerProduction(){
 const q=(el('managerProductionSearch')?.value||'').trim().toLowerCase();
 document.querySelectorAll('#managerProductionDeclarations .production-admin-row').forEach(row=>{
 row.classList.toggle('is-filtered',q&&!String(row.dataset.search||'').includes(q));
 });
}
el('managerProductionSearch')?.addEventListener('input',filterManagerProduction);

async function loadManagerProductionDeclarations(){
 const box=el('managerProductionDeclarations');
 if(!box||!account||!managerRoles.includes(account.role))return;
 try{
 const rows=await rpc('ae_manager_production_declarations',{p_token:token,p_limit:250});
 box.replaceChildren();
 if(!rows?.length){
 const p=document.createElement('p');p.className='muted';p.textContent='Aucune fabrication déclarée.';box.append(p);return;
 }
 for(const row of rows){
 const item=document.createElement('div');item.className='production-admin-row';
 item.dataset.search=((row.employee||'')+' '+(row.product_name||'')+' '+(roleLabels[row.role]||row.role)).toLowerCase();
 const top=document.createElement('div');top.className='production-admin-top';
 const left=document.createElement('div');
 const strong=document.createElement('strong');strong.textContent=row.employee;
 const meta=document.createElement('div');meta.className='production-admin-meta';meta.textContent=(roleLabels[row.role]||row.role)+' · '+row.product_name+' · '+new Date(row.created_at).toLocaleString('fr-FR');
 left.append(strong,meta);
 const qty=document.createElement('div');qty.className='production-qty';qty.textContent='× '+Number(row.quantity||0).toLocaleString('fr-FR');
 top.append(left,qty);item.append(top);box.append(item);
 }
 filterManagerProduction();
 }catch(err){box.textContent='Fabrications indisponibles : '+err.message}
}

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
 siteToast((result?.sent||0)+' événement(s) Discord synchronisé(s).');
 await refreshDiscordAdmin();
 }catch(err){siteToast(err.message)}
 finally{button.disabled=false}
});

async function loadManagerInternalAnnouncements(){
 const box=el('managerInternalAnnouncements');if(!box||!account||!managerRoles.includes(account.role))return;
 try{
 const rows=await rpc('ae_staff_internal_announcements',{p_token:token});
 box.replaceChildren();
 if(!rows?.length){const p=document.createElement('p');p.className='muted';p.textContent='Aucune annonce interne.';box.append(p);return}
 for(const row of rows){
 const item=document.createElement('article');item.className='internal-announcement';
 const top=document.createElement('div');top.className='internal-announcement-top';
 const title=document.createElement('h4');title.textContent=row.title;
 top.append(title);
 if(row.pinned){const pin=document.createElement('span');pin.className='internal-pin';pin.textContent='ÉPINGLÉE';top.append(pin)}
 const body=document.createElement('p');body.className='muted';body.textContent=row.body;
 const meta=document.createElement('small');meta.textContent=row.author+' · '+new Date(row.created_at).toLocaleString('fr-FR');
 const del=document.createElement('button');del.type='button';del.className='btn secondary';del.style.marginTop='10px';del.textContent='Supprimer';
 del.onclick=async()=>{
 if(!await siteConfirm('Supprimer cette annonce interne ?',{title:'Supprimer l’annonce',confirmText:'Supprimer'}))return;
 try{
 await rpc('ae_manager_delete_internal_announcement',{p_token:token,p_id:row.id});
 siteToast('Annonce interne supprimée.','success');
 await Promise.all([loadManagerInternalAnnouncements(),loadStaffSpace()]);
 }catch(err){siteToast(err.message,'error')}
 };
 item.append(top,body,meta,del);box.append(item);
 }
 }catch(err){box.textContent='Annonces internes indisponibles : '+err.message}
}

el('internalAnnouncementForm')?.addEventListener('submit',async e=>{
 e.preventDefault();
 if(!account||!managerRoles.includes(account.role))return;
 const form=e.currentTarget;
 const title=form.querySelector('input[placeholder="Titre de l\'annonce"]')?.value.trim()||'';
 const body=form.querySelector('textarea')?.value.trim()||'';
 const pinned=!!el('internalAnnouncementPinned')?.checked;
 const button=form.querySelector('[type=submit]');button.disabled=true;
 try{
 await rpc('ae_manager_create_internal_announcement',{p_token:token,p_title:title,p_body:body,p_pinned:pinned});
 safeReset(form);
 siteToast('Annonce interne publiée.','success');
 await Promise.all([loadManagerInternalAnnouncements(),loadStaffSpace(),loadNotifications()]);
 }catch(err){siteToast('Publication impossible : '+err.message,'error')}
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
 [['Employés',stats.employees],['Note moyenne',Number(stats.rating_avg||0)>0?Number(stats.rating_avg).toFixed(1)+' / 5':'—'],['MDP temporaires',stats.temporary_passwords]].forEach(([label,value])=>{
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
 ?['Voir les profils','Créer/gérer les mécanos','Gérer chefs d’équipe','Clients & commandes']
 :account.role==='drh'
 ?['Voir les profils','Créer/gérer les mécanos','Gérer chefs d’équipe','Gérer RH','Clients & commandes']
 :account.role==='assistant_direction'
 ?['Voir les profils','Créer les comptes','Gérer RH & DRH','Clients & commandes','Partenariats','Journal']
 :['Accès complet','Tous les grades','Clients & commandes','Partenariats','Journal','Historique','Discord'];
 p.textContent=account.role==='rh'?'Les postes supérieurs restent en lecture seule.':account.role==='drh'?'Vous gérez l’équipe RH et les grades opérationnels.':'Vous pouvez créer et gérer les comptes de direction ainsi que les autres grades.';
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
 b.onclick=async()=>{try{await rpc('ae_manager_update_request',{p_token:token,p_id:item.id,p_status:status});await managerRefresh()}catch(err){siteToast(err.message)}};
 box.append(b);
 }
 requestBox.append(box);
 }
 }catch(err){el('managerRequests').textContent='Accès impossible : '+err.message}

 try{
 const orders=await rpc('ae_manager_list_orders',{p_token:token});const orderBox=el('managerOrders');orderBox.replaceChildren();
 if(!orders?.length)orderBox.textContent='Aucune commande.';
 for(const item of orders||[]){
   const details=document.createElement('details');details.className='manager-order-compact';
   const summary=document.createElement('summary');
   const main=document.createElement('div');main.className='compact-order-main';
   const title=document.createElement('strong');title.textContent='AE-'+String(item.id).padStart(4,'0')+' · '+item.customer;
   const meta=document.createElement('small');meta.textContent=item.quantity+' kit(s) moteur';
   main.append(title,meta);
   const status=document.createElement('span');status.className='compact-order-status';status.textContent=item.status;
   const total=document.createElement('div');total.className='compact-order-total';total.textContent=money(item.quantity*item.unit_price);
   const chevron=document.createElement('span');chevron.className='order-chevron';chevron.textContent='⌄';
   summary.append(main,status,total,chevron);

   const body=document.createElement('div');body.className='compact-order-body';
   const info=document.createElement('div');info.className='manager-order-meta';
   const addInfo=(label,value)=>{const div=document.createElement('div');const small=document.createElement('small');small.textContent=label;const strong=document.createElement('strong');strong.textContent=value;div.append(small,strong);info.append(div)};
   addInfo('Client',item.customer||'—');addInfo('Téléphone',item.phone||'—');addInfo('Quantité',String(item.quantity));addInfo('Total',money(item.quantity*item.unit_price));
   body.append(info);

   if(item.status==='En attente de préparation'){
     const actions=document.createElement('div');actions.className='manager-order-actions';
     const delivered=document.createElement('button');delivered.type='button';delivered.className='btn secondary';delivered.textContent='Marquer livrée';
     delivered.onclick=async()=>{try{await rpc('ae_manager_update_order',{p_token:token,p_id:item.id,p_status:'Livrée',p_reason:null});triggerDiscordSync(false).catch(()=>{});await Promise.all([managerRefresh(),loadNotifications(),loadStaffSpace()])}catch(err){siteToast(err.message)}};
     const cancel=document.createElement('button');cancel.type='button';cancel.className='btn danger';cancel.textContent='Annuler';
     cancel.onclick=async()=>{const reason=await sitePrompt('Indiquez pourquoi cette commande est annulée.',{title:'Annuler AE-'+String(item.id).padStart(4,'0'),label:'Motif d’annulation',required:true,confirmText:'Annuler la commande'});if(!reason)return;try{await rpc('ae_manager_update_order',{p_token:token,p_id:item.id,p_status:'Annulée',p_reason:reason});siteToast('Commande annulée.','success');triggerDiscordSync(false).catch(()=>{});await Promise.all([managerRefresh(),loadNotifications()])}catch(err){siteToast(err.message,'error')}};
     actions.append(delivered,cancel);body.append(actions);
   }
   details.append(summary,body);orderBox.append(details);
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
 const ids=document.createElement('p');ids.className='muted';ids.textContent='IBAN : '+(customer.iban_rp||'—')+' · ID : '+(customer.civil_id_rp||'—')+' · Compte créé le '+(customer.created_at?new Date(customer.created_at).toLocaleDateString('fr-FR'):'—');
 details.append(summary,meta,ids);
 for(const o of customer.orders||[]){
 const row=document.createElement('p');row.className='small muted';row.textContent='AE-'+String(o.id).padStart(4,'0')+' · '+o.quantity+' kit(s) · '+o.status+' · '+money(o.quantity*o.unit_price);details.append(row);
 }
 if(['assistant_direction','copatron','patron'].includes(account.role)){
   const actions=document.createElement('div');actions.className='client-file-actions';
   const remove=document.createElement('button');remove.type='button';remove.className='btn danger';remove.textContent='Supprimer le compte client';
   remove.onclick=async()=>{
     if(!await siteConfirm('Supprimer le compte de '+customer.name+' ? Ses anciennes commandes seront conservées.',{title:'Supprimer le compte client',confirmText:'Supprimer'}))return;
     try{
       await rpc('ae_manager_delete_client',{p_token:token,p_account_id:customer.id});
       siteToast('Compte client supprimé.','success');
       await Promise.all([managerRefresh(),loadNotifications()]);
     }catch(err){siteToast('Suppression impossible : '+err.message,'error')}
   };
   actions.append(remove);details.append(actions);
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

 const top=document.createElement('div');top.className='employee-account-top';
 const identity=document.createElement('div');identity.className='employee-account-identity';
 const avatar=document.createElement('div');avatar.className='employee-account-avatar';
 if(emp.avatar_url){
   const img=document.createElement('img');img.src=emp.avatar_url;img.alt='';avatar.append(img);
 }else avatar.textContent=initials(emp.name);
 const title=document.createElement('div');title.className='employee-account-copy';
 const strong=document.createElement('strong');strong.textContent=emp.name;
 const login=document.createElement('small');login.className='muted';login.textContent=emp.login;
 title.append(strong,login);
 identity.append(avatar,title);

 const controls=document.createElement('div');controls.className='employee-account-controls';
 const badge=document.createElement('span');badge.className='tag';badge.textContent=roleLabels[emp.role]||emp.role;
 const manageToggle=document.createElement('button');manageToggle.type='button';manageToggle.className='employee-manage-toggle';manageToggle.setAttribute('aria-expanded','false');manageToggle.innerHTML='<span>Gérer</span><b>⌄</b>';
 controls.append(badge,manageToggle);
 top.append(identity,controls);

 const meta=document.createElement('div');meta.className='employee-account-meta';
 if(emp.must_change_password){const change=document.createElement('span');change.className='force-change-badge';change.textContent='Mot de passe temporaire';meta.append(change)}
 if(emp.joined_at){const joined=document.createElement('span');joined.className='employee-joined-compact';joined.textContent='Depuis le '+new Date(emp.joined_at+'T00:00:00').toLocaleDateString('fr-FR');meta.append(joined)}
 const body=document.createElement('div');body.className='employee-account-body hidden';
 manageToggle.onclick=()=>{
   const opening=body.classList.contains('hidden');
   body.classList.toggle('hidden',!opening);
   wrap.classList.toggle('is-open',opening);
   manageToggle.setAttribute('aria-expanded',opening?'true':'false');
   manageToggle.querySelector('span').textContent=opening?'Fermer':'Gérer';
   manageToggle.querySelector('b').textContent=opening?'⌃':'⌄';
 };
 wrap.append(top,meta,body);

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
 const reason=await sitePrompt('Vous pouvez ajouter un motif pour ce changement de grade.',{title:'Changer le grade de '+emp.name,label:'Motif (facultatif)',confirmText:'Continuer'});
 if(reason===null){select.value=emp.role;return}
 const ok=await siteConfirm('Passer '+emp.name+' de '+(roleLabels[emp.role]||emp.role)+' à '+(roleLabels[select.value]||select.value)+' ?',{title:'Confirmer le changement de grade',confirmText:'Modifier le grade'});
 if(!ok){select.value=emp.role;return}
 try{await rpc('ae_manager_update_employee_role',{p_token:token,p_account_id:emp.account_id,p_new_role:select.value,p_reason:reason});siteToast('Grade de '+emp.name+' modifié.','success');await Promise.all([managerRefresh(),loadStaff(),loadNotifications()])}catch(err){siteToast(err.message,'error');select.value=emp.role}
 };
 const reset=document.createElement('button');reset.type='button';reset.className='btn secondary';reset.textContent='Nouveau MDP temporaire';
 reset.onclick=async()=>{
 if(!await siteConfirm('Réinitialiser le mot de passe de '+emp.name+' ?',{title:'Nouveau mot de passe temporaire',confirmText:'Réinitialiser'}))return;
 try{
 const result=await rpc('ae_manager_reset_employee_password',{p_token:token,p_account_id:emp.account_id});
 showTemporaryCredential(emp.login,result.temporary_password,'Nouveau mot de passe temporaire');
 siteToast('Nouveau mot de passe temporaire créé.','success');
 await Promise.all([managerRefresh(),loadNotifications()]);
 }catch(err){siteToast(err.message,'error')}
 };
 const remove=document.createElement('button');remove.type='button';remove.className='btn danger';remove.textContent='Supprimer le compte';
 remove.onclick=async()=>{
   const ok=await siteConfirm('Supprimer le compte de '+emp.name+' ? La personne ne pourra plus se connecter mais son historique sera conservé.',{title:'Supprimer le compte employé',confirmText:'Supprimer'});
   if(!ok)return;
   try{
     await rpc('ae_manager_delete_employee',{p_token:token,p_account_id:emp.account_id});
     siteToast('Compte de '+emp.name+' supprimé.','success');
     await Promise.all([managerRefresh(),loadStaff(),loadNotifications()]);
   }catch(err){siteToast('Suppression impossible : '+err.message,'error')}
 };
 actions.append(select,roleBtn,reset,remove);body.append(actions);

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
 }catch(err){siteToast(err.message)}
 };
 body.append(historyBtn,history);
 }else if(emp.account_id!==account.id){
 const readOnly=document.createElement('p');readOnly.className='small muted';readOnly.textContent='Compte en lecture seule pour votre niveau d’accès.';body.append(readOnly);
 }

 const canEditProfile=emp.account_id===account.id||canAssignRoleUI(emp.role);
 if(canEditProfile){
 const details=document.createElement('details');details.style.marginTop='12px';
 const summary=document.createElement('summary');summary.textContent='Modifier la fiche publique';
 const form=document.createElement('form');form.className='form';form.style.marginTop='12px';
 form.innerHTML='<input placeholder="URL avatar" value="'+esc(emp.avatar_url||'').replaceAll('"','&quot;')+'"><label>Date d’arrivée</label><input type="date" value="'+esc(emp.joined_at||'')+'"><textarea placeholder="Petite présentation">'+esc(emp.bio||'')+'</textarea><button class="btn secondary" type="submit">Enregistrer la fiche</button>';
 form.onsubmit=async e=>{
 e.preventDefault();const f=form.querySelectorAll('input,textarea');
 try{
 await rpc('ae_manager_update_staff_profile',{p_token:token,p_account_id:emp.account_id,p_avatar_url:f[0].value,p_joined_at:f[1].value||null,p_interventions_count:0,p_on_duty:false,p_bio:f[2].value});
 siteToast('Fiche employé mise à jour.');
 await Promise.all([managerRefresh(),loadStaff(),loadNotifications()]);
 }catch(err){siteToast(err.message)}
 };
 details.append(summary,form);body.append(details);
 }

 if(!body.childElementCount)manageToggle.classList.add('hidden');
 box.append(wrap);
 }
 filterManagerEmployees();
 }catch(err){el('managerEmployees').textContent='Fiches employés indisponibles : '+err.message}

 try{
 const rows=await rpc('ae_manager_audit_log',{p_token:token,p_limit:100});const box=el('managerAuditLog');box.replaceChildren();
 if(!rows?.length)box.textContent='Aucune action enregistrée.';
 const actionLabels={employee_created:'Compte employé créé',employee_deleted:'Compte employé supprimé',password_reset:'Mot de passe réinitialisé',role_changed:'Grade modifié',profile_updated:'Profil employé modifié',order_status_changed:'Statut de commande modifié',discord_order_delivered:'Commande livrée depuis Discord',discord_order_cancelled:'Commande annulée depuis Discord',internal_announcement_created:'Annonce interne publiée',internal_announcement_deleted:'Annonce interne supprimée'};
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

 await Promise.all([refreshDiscordAdmin(),loadManagerInternalAnnouncements(),loadManagerProductionDeclarations()]);
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
el('markNotificationsRead')?.addEventListener('click',async()=>{if(!token)return;try{await rpc('ae_mark_notifications_read',{p_token:token});await loadNotifications()}catch(err){siteToast(err.message)}});
function payrollWeekStart(){
 const input=el('payrollWeekPicker');
 if(!input)return null;
 if(!input.value)input.value=currentIsoWeekValue();
 return isoWeekMonday(input.value);
}
function expenseIsInCurrentWeek(row){
 const value=row?.created_at;
 if(!value)return false;
 const created=new Date(value);
 if(Number.isNaN(created.getTime()))return false;
 const now=new Date();
 const start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 const day=(start.getDay()+6)%7;
 start.setDate(start.getDate()-day);
 const end=new Date(start);end.setDate(end.getDate()+7);
 return created>=start&&created<end;
}
function expenseRowsForSelectedPeriod(box,rows){
 let controls=box.previousElementSibling;
 if(!controls||controls.dataset.expensePeriodControls!=='true'){
  controls=document.createElement('div');
  controls.dataset.expensePeriodControls='true';
  controls.className='admin-toolbar';
  controls.style.marginTop='14px';
  const label=document.createElement('label');
  label.textContent='Période';
  const select=document.createElement('select');
  select.setAttribute('aria-label','Période des notes de frais');
  select.innerHTML='<option value="current">Semaine en cours</option><option value="all">Tout l’historique</option>';
  select.addEventListener('change',()=>{if(box.id==='staffExpenseHistory')loadStaffExpenseNotes();else loadManagerExpenseNotes()});
  controls.append(label,select);
  box.parentNode.insertBefore(controls,box);
 }
 const select=controls.querySelector('select');
 const all=select?.value==='all';
 return all?(rows||[]):(rows||[]).filter(expenseIsInCurrentWeek);
}
async function loadStaffExpenseNotes(){
 const box=el('staffExpenseHistory');
 if(!box)return;
 if(!account||account.role==='client'){box.replaceChildren();return}
 try{
  const rows=await rpc('ae_staff_expense_notes',{p_token:token,p_limit:100});
  const currentWeekRows=expenseRowsForSelectedPeriod(box,rows);
  box.replaceChildren();
  if(!currentWeekRows.length){const p=document.createElement('p');p.className='muted';p.textContent=(box.previousElementSibling?.querySelector('select')?.value==='all')?'Aucune note de frais dans l’historique.':'Aucune note de frais cette semaine.';box.append(p);return}
  const labels={pending:'En attente',approved:'Acceptée',rejected:'Refusée'};
  for(const row of currentWeekRows){
   const item=document.createElement('article');item.className='expense-note-card';
   const top=document.createElement('div');top.className='expense-note-top';
   const title=document.createElement('strong');title.className='expense-note-title expense-note-amount';title.textContent=money(row.amount);
   const status=document.createElement('span');status.className='expense-note-status '+(row.status||'pending');status.textContent=labels[row.status]||row.status;
   top.append(title,status);
   const reason=document.createElement('p');reason.className='expense-note-reason';reason.textContent=row.reason;
   const meta=document.createElement('div');meta.className='expense-note-meta';
   const date=document.createElement('span');date.textContent=new Date(row.created_at).toLocaleString('fr-FR');meta.append(date);
   if(row.receipt_url){const a=document.createElement('button');a.type='button';a.className='expense-receipt-open';a.textContent='Voir le justificatif';a.addEventListener('click',()=>openExpenseReceipt(row.receipt_url));meta.append(a)}
   item.append(top,reason,meta);box.append(item);
  }
 }catch(err){box.textContent='Impossible de charger les notes de frais : '+err.message}
}
function openExpenseReceipt(src){
 const modal=el('expenseReceiptModal'),wrap=el('expenseReceiptModalImage'),link=el('expenseReceiptModalLink');
 if(!modal||!wrap)return;
 wrap.replaceChildren();
 const img=document.createElement('img');img.alt='Justificatif de dépense';img.src=src;
 img.onerror=()=>{wrap.textContent='Impossible d’afficher cette image. Vérifie que le lien mène directement à une image accessible.'};
 wrap.append(img);
 if(link){link.href=src;link.classList.toggle('hidden',String(src).startsWith('data:'))}
 modal.classList.remove('hidden');document.body.style.overflow='hidden';
}
function closeExpenseReceipt(){el('expenseReceiptModal')?.classList.add('hidden');document.body.style.overflow=''}
el('expenseReceiptModal')?.querySelectorAll('[data-close-expense-receipt]').forEach(node=>node.addEventListener('click',closeExpenseReceipt));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeExpenseReceipt()});
function resetExpenseReceipt(){
 const hidden=el('expenseReceipt'),link=el('expenseReceiptLink'),preview=el('expenseReceiptPreview'),clear=el('expenseReceiptClear');
 if(hidden)hidden.value='';if(link)link.value='';if(preview){preview.replaceChildren();preview.classList.add('hidden')}if(clear)clear.classList.add('hidden');
}
function showExpenseReceiptPreview(src,label){
 const preview=el('expenseReceiptPreview'),clear=el('expenseReceiptClear');
 if(!preview)return;preview.replaceChildren();
 const img=document.createElement('img');img.alt='Aperçu du justificatif';img.src=src;preview.append(img);
 const caption=document.createElement('small');caption.textContent=label;preview.append(caption);preview.classList.remove('hidden');if(clear)clear.classList.remove('hidden');
}
el('expenseReceiptLink')?.addEventListener('input',e=>{
 const value=e.currentTarget.value.trim();
 if(el('expenseReceipt'))el('expenseReceipt').value='';
 const preview=el('expenseReceiptPreview');if(preview){preview.replaceChildren();preview.classList.add('hidden')}
 el('expenseReceiptClear')?.classList.add('hidden');
 if(value.startsWith('https://')||value.startsWith('http://'))showExpenseReceiptPreview(value,'Aperçu du lien (si l’image est accessible).');
});
el('expensePasteZone')?.addEventListener('click',e=>{if(e.target.closest('button'))return;e.currentTarget.focus()});
el('expensePasteZone')?.addEventListener('paste',async e=>{
 const items=Array.from(e.clipboardData?.items||[]),item=items.find(x=>x.type.startsWith('image/'));
 if(!item){siteToast('Aucune image détectée. Copie une capture ou colle un lien dans le champ au-dessus.','error');return}
 e.preventDefault();
 try{
  const file=item.getAsFile();if(!file)throw new Error('Image indisponible');
  const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=reader.result};reader.onerror=reject;reader.readAsDataURL(file)});
  const scale=Math.min(1,1200/image.width,1200/image.height),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  let data=canvas.toDataURL('image/jpeg',.68);
  if(data.length>450000)data=canvas.toDataURL('image/jpeg',.48);
  if(data.length>600000)throw new Error('Capture trop lourde. Réduis sa taille puis réessaie.');
  el('expenseReceipt').value=data;el('expenseReceiptLink').value='';
  showExpenseReceiptPreview(data,'Capture prête à être envoyée avec la note de frais.');
  siteToast('Capture ajoutée au justificatif.','success');
 }catch(err){siteToast(err.message||'Impossible de lire cette image.','error')}
});
el('expenseReceiptClear')?.addEventListener('click',resetExpenseReceipt);
el('expenseNoteForm')?.addEventListener('submit',async e=>{
 e.preventDefault();
 if(!account||account.role==='client'){siteToast('Connexion employé requise.','error');return}
 const form=e.currentTarget,button=form.querySelector('button[type=submit]');
 const amount=Number(el('expenseAmount')?.value),reason=String(el('expenseReason')?.value||'').trim();
 const receipt=String(el('expenseReceipt')?.value||'').trim()||String(el('expenseReceiptLink')?.value||'').trim()||null;
 if(!Number.isInteger(amount)||amount<=0||reason.length<3){siteToast('Vérifie le montant et le motif.','error');return}
 if(receipt&&!receipt.startsWith('data:image/')&&!receipt.startsWith('https://')&&!receipt.startsWith('http://')){siteToast('Colle un lien d’image valide ou ajoute une capture avec Ctrl + V.','error');return}
 if(button)button.disabled=true;
 try{
  await rpc('ae_staff_create_expense_note',{p_token:token,p_amount:amount,p_reason:reason,p_receipt_url:receipt});
  form.reset();resetExpenseReceipt();siteToast('Note de frais envoyée à la direction.','success');await loadStaffExpenseNotes();
 }catch(err){siteToast('Envoi impossible : '+err.message,'error')}
 finally{if(button)button.disabled=false}
});
async function loadManagerPayroll(){
 const stats=el('managerPayrollStats'),table=el('managerPayrollTable');
 if(!stats||!table)return;
 if(!account||!managerRoles.includes(account.role)){stats.replaceChildren();table.replaceChildren();return}
 const week=payrollWeekStart();
 try{
  const data=await rpc('ae_manager_partner_ca_by_employee',{p_token:token,p_week_start:week});
  stats.replaceChildren();
  [['CA partenaire',money(data.ca_total)],['Salaire estimé (15 %)',money(data.salary_total)],['Employés concernés',String((data.employees||[]).filter(x=>Number(x.ca_total)>0).length)]].forEach(([label,value])=>{
   const card=document.createElement('div');card.className='stat-card';const strong=document.createElement('strong');strong.textContent=value;const span=document.createElement('span');span.textContent=label;card.append(strong,span);stats.append(card)
  });
  const wrap=document.createElement('div');wrap.className='table-wrap';
  const t=document.createElement('table');t.className='admin-table';
  const thead=document.createElement('thead');const hr=document.createElement('tr');
  ['Employé','Grade','Déclarations','Prestations','CA partenaire','Salaire estimé'].forEach(label=>{const th=document.createElement('th');th.textContent=label;hr.append(th)});thead.append(hr);t.append(thead);
  const body=document.createElement('tbody');
  for(const row of data.employees||[]){
   const tr=document.createElement('tr');
   [row.employee_name||'Employé',roleLabels[row.role]||row.role,String(row.declaration_count||0),String(row.prestation_count||0),money(row.ca_total),money(row.salary_estimate)].forEach((value,index)=>{const td=document.createElement('td');td.textContent=value;if(index>=2)td.style.whiteSpace='nowrap';tr.append(td)});
   body.append(tr)
  }
  if(!(data.employees||[]).length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent='Aucun employé à afficher.';tr.append(td);body.append(tr)}
  t.append(body);wrap.append(t);table.replaceChildren(wrap);
 }catch(err){stats.replaceChildren();table.textContent='Impossible de charger le bilan : '+err.message}
}
async function loadManagerExpenseNotes(){
 const box=el('managerExpenseNotes');if(!box)return;
 if(!account||!managerRoles.includes(account.role)){box.replaceChildren();return}
 try{
  const filter=el('expenseStatusFilter')?.value||null;
  const rows=await rpc('ae_manager_expense_notes',{p_token:token,p_status:filter,p_limit:500});
  const currentWeekRows=(rows||[]).filter(expenseIsInCurrentWeek);
  box.replaceChildren();
  if(!currentWeekRows.length){const p=document.createElement('p');p.className='muted';p.textContent=(box.previousElementSibling?.querySelector('select')?.value==='all')?'Aucune note de frais dans l’historique pour ce filtre.':'Aucune note de frais cette semaine pour ce filtre.';box.append(p);return}
  const labels={pending:'En attente',approved:'Acceptée',rejected:'Refusée'};
  for(const row of currentWeekRows){
   const item=document.createElement('article');item.className='expense-note-card';
   const top=document.createElement('div');top.className='expense-note-top';
   const title=document.createElement('strong');title.className='expense-note-title';title.textContent=(row.employee_name||'Employé')+' · '+money(row.amount);
   const status=document.createElement('span');status.className='expense-note-status '+(row.status||'pending');status.textContent=labels[row.status]||row.status;
   top.append(title,status);
   const reason=document.createElement('p');reason.className='expense-note-reason';reason.textContent=row.reason;
   const meta=document.createElement('div');meta.className='expense-note-meta';
   const date=document.createElement('span');date.textContent=new Date(row.created_at).toLocaleString('fr-FR');meta.append(date);
   if(row.receipt_url){const a=document.createElement('button');a.type='button';a.className='expense-receipt-open';a.textContent='Ouvrir le justificatif';a.addEventListener('click',()=>openExpenseReceipt(row.receipt_url));meta.append(a)}
   item.append(top,reason,meta);
   if(row.status==='pending'){
    const actions=document.createElement('div');actions.className='expense-note-actions';
    for(const [label,statusValue] of [['Accepter','approved'],['Refuser','rejected']]){
     const btn=document.createElement('button');btn.type='button';btn.className='btn'+(statusValue==='rejected'?' secondary':'');btn.textContent=label;
     btn.addEventListener('click',async()=>{btn.disabled=true;try{await rpc('ae_manager_review_expense_note',{p_token:token,p_note_id:row.id,p_status:statusValue});siteToast(statusValue==='approved'?'Note de frais acceptée.':'Note de frais refusée.','success');await Promise.all([loadManagerExpenseNotes(),loadStaffExpenseNotes()])}catch(err){siteToast(err.message,'error');btn.disabled=false}});
     actions.append(btn)
    }
    item.append(actions)
   }
   box.append(item)
  }
 }catch(err){box.textContent='Impossible de charger les notes de frais : '+err.message}
}
el('payrollWeekPicker')?.addEventListener('change',loadManagerPayroll);
el('payrollCurrentWeek')?.addEventListener('click',()=>{if(el('payrollWeekPicker'))el('payrollWeekPicker').value=currentIsoWeekValue();loadManagerPayroll()});
el('expenseStatusFilter')?.addEventListener('change',loadManagerExpenseNotes);
document.querySelectorAll('[data-admin-tab="payroll"]').forEach(btn=>btn.addEventListener('click',()=>{loadManagerPayroll();loadManagerExpenseNotes()}));

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
/* Keep expense notes and the related weekly totals in sync without a manual page reload. */
let expenseAutoRefreshBusy=false;
setInterval(async()=>{
 if(document.hidden||!token||!account||expenseAutoRefreshBusy)return;
 const employeePage=document.querySelector('[data-view="espace-employe"]');
 const directionPage=document.querySelector('[data-view="direction"]');
 const payrollPanel=document.querySelector('[data-admin-panel="payroll"]');
 const employeeViewOpen=!!employeePage?.classList.contains('active')&&account.role!=='client';
 const managerPayrollOpen=!!directionPage?.classList.contains('active')&&!!payrollPanel&&!payrollPanel.classList.contains('hidden')&&managerRoles.includes(account.role);
 if(!employeeViewOpen&&!managerPayrollOpen)return;
 expenseAutoRefreshBusy=true;
 try{
  const tasks=[];
  if(employeeViewOpen)tasks.push(loadStaffExpenseNotes());
  if(managerPayrollOpen)tasks.push(loadManagerExpenseNotes(),loadManagerPayroll());
  await Promise.all(tasks);
 }finally{expenseAutoRefreshBusy=false}
},10000);
refresh();
renderCart();
})();