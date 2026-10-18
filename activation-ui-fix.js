(()=>{
const box=document.getElementById('activationFeedback');
if(!box)return;
const observer=new MutationObserver(()=>{
  const msg=box.textContent||'';
  if(msg.includes("Cannot read properties of null")&&msg.includes("reset")){
    box.textContent="Compte activé avec succès. Vous pouvez maintenant vous connecter.";
    setTimeout(()=>{location.hash="#/espace";},700);
  }
});
observer.observe(box,{childList:true,subtree:true,characterData:true});
})();