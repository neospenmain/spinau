const navToggle=document.querySelector('[data-nav-toggle]');
const navMenu=document.querySelector('[data-nav-menu]');
if(navToggle&&navMenu){
  navToggle.addEventListener('click',()=>{
    navMenu.classList.toggle('open');
    if(navMenu.classList.contains('open')){
      navMenu.style.display='flex';
    }else{
      navMenu.style.display='';
    }
  });
}

document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    const href=a.getAttribute('href');
    if(href&&href.startsWith('#')){
      const el=document.querySelector(href);
      if(el){
        e.preventDefault();
        el.scrollIntoView({behavior:'smooth',block:'start'});
      }
    }
  });
});

const form=document.querySelector('#contact-form');
if(form){
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const data=Object.fromEntries(new FormData(form).entries());
    alert(`Thanks ${data.name||'there'}! We'll reply to ${data.email||'your inbox'} soon.`);
    form.reset();
  });
}

(function(){
  const path=window.location.pathname;
const isHome = path === '' || /^(\/|index\.html)$/.test(path);
  if(!isHome)return;
  if(sessionStorage.getItem('sl_age_shown')==='1')return;
  sessionStorage.setItem('sl_age_shown','1');

  const bd=document.createElement('div');
  bd.className='modal-backdrop';
  bd.innerHTML=`<div class="modal">
    <h3>Are you 18+?</h3>
    <p>Please confirm to continue.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn" id="age-yes">Yes</button>
      <button class="btn ghost" id="age-no">No</button>
    </div>
  </div>`;
  document.body.appendChild(bd);
  bd.style.display='flex';

  function close(){
    bd.style.display='none';
    bd.remove();
  }

  const yes=bd.querySelector('#age-yes');
  const no=bd.querySelector('#age-no');
  if(yes) yes.addEventListener('click',close);
  if(no) no.addEventListener('click',close);
})();


(function(){
  const path = window.location.pathname;
const isHome = /\/lander\.html$/.test(path);
  if(!isHome) return;
 
  const bd = document.createElement('div');
  bd.className = 'modal-backdrop';
  bd.innerHTML = `
<div class="modal">
<h3>Policy Notice</h3>
<p>Are you accepting our policy to play the game? This notice is informational and does not block access.</p>
<div style="display:flex;gap:10px;flex-wrap:wrap">
<button class="btn" id="age-yes">Yes, Accept</button>
<button class="btn ghost" id="age-no">Close</button>
</div>
</div>`;
  document.body.appendChild(bd);
  bd.style.display='flex';
 
  function closeGate(){ bd.style.display='none'; bd.remove(); }  
  // ✅ Redirect when "Yes" is clicked
  bd.querySelector('#age-yes').addEventListener('click', closeGate);
  //                                               function(){
  //   window.location.href = "http://p8r9.com/?utm_campaign=WV47m11tE6&v1=[v1]&v2=[v2]&v3=[v3]"; // change to your target page
  // });
 
  // ✅ Just close modal when "No" is clicked
  bd.querySelector('#age-no').addEventListener('click', closeGate);
  //                                              function(){
  //   window.location.href = "http://p8r9.com/?utm_campaign=WV47m11tE6&v1=[v1]&v2=[v2]&v3=[v3]"; // change to your target page
  // });
})();
