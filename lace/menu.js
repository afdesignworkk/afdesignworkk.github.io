// The phone menu (her frame 1131:10079): the button on the top bar opens the
// links as an ink panel under it, unrolling from the top like the Projects
// panel; the button turns into a cross. It closes on the button, Escape, a
// tap outside, or when the screen grows past phone width. Inside it the
// projects stay folded under Projects until its chevron is tapped (her ask);
// the chevron then turns up and the rows slide open.
const { gsap } = window;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const top = document.querySelector('.top'), btn = top?.querySelector('.burger'), nav = top?.querySelector('nav');
if (btn && nav) {
  const phone = matchMedia('(max-width: 600px)');
  const parts = () => [...nav.querySelectorAll(':scope > .tab, .drop__btn')];
  const drop = nav.querySelector('.drop'), proj = drop?.querySelector('.drop__btn'), list = drop?.querySelector('.drop__panel');
  let open = false, unfolded = false;
  const fold = (o, now) => {
    if (!drop || o === unfolded) return;
    unfolded = o; drop.classList.toggle('unfold', o); proj.setAttribute('aria-expanded', o);
    gsap.killTweensOf(list);
    if (now || reduce) { gsap.set(list, { height: o ? 'auto' : 0 }); return; }
    if (o) gsap.fromTo(list, { height: 0 }, { height: 'auto', duration: .5, ease: 'power3.out' });
    else gsap.to(list, { height: 0, duration: .35, ease: 'power2.inOut' });
  };
  // on a phone Projects folds the list here, before the page's own Projects
  // panel (the desktop dropdown) ever hears the tap
  if (drop) nav.addEventListener('click', (e) => { if (!phone.matches || !e.target.closest('.drop__btn')) return; e.stopPropagation(); fold(!unfolded); }, true);
  const set = (o) => {
    if (o === open) return;
    open = o; btn.setAttribute('aria-expanded', o); btn.setAttribute('aria-label', o ? 'Close menu' : 'Menu');
    gsap.killTweensOf([nav, ...parts()]);
    if (o) {
      top.classList.add('menu-open');
      gsap.set(nav, { opacity: 1 });   // opened during the page's entrance: the fade-in it just cut short must not leave the panel see-through
      if (reduce) return;
      gsap.fromTo(nav, { clipPath: 'inset(0% 0% 100% 0% round 16px)', y: -6 }, { clipPath: 'inset(0% 0% 0% 0% round 16px)', y: 0, duration: .55, ease: 'power3.out', clearProps: 'clipPath,transform' });
      gsap.fromTo(parts(), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .4, ease: 'power2.out', stagger: .04, delay: .08, clearProps: 'opacity,transform' });
    } else if (reduce) { top.classList.remove('menu-open'); fold(false, true); }
    else gsap.to(nav, { clipPath: 'inset(0% 0% 100% 0% round 16px)', duration: .3, ease: 'power2.in', onComplete: () => { if (!open) { top.classList.remove('menu-open'); fold(false, true); } gsap.set(nav, { clearProps: 'clipPath' }); } });
  };
  btn.addEventListener('click', () => set(!open));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) { set(false); btn.focus(); } });
  addEventListener('pointerdown', (e) => { if (open && !top.contains(e.target)) set(false); });
  phone.addEventListener('change', () => { if (!phone.matches) { set(false); fold(false, true); gsap.set(list, { clearProps: 'height' }); } });
}
