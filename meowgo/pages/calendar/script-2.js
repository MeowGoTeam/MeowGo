let lastScrollTop = 0;
const navbar = document.querySelector('.navbar');
const delta = 10;

window.addEventListener('scroll', () => {
  let scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
  let bodyHeight = document.documentElement.scrollHeight;
  let windowHeight = window.innerHeight;

  if (scrollTop <= 0 || scrollTop + windowHeight >= bodyHeight) {
    navbar.classList.remove('navbar-hidden');
    return;
  }

  if (Math.abs(lastScrollTop - scrollTop) <= delta) return;

  if (scrollTop > lastScrollTop && scrollTop > 60) {
    navbar.classList.add('navbar-hidden');
  } else {
    navbar.classList.remove('navbar-hidden');
  }

  lastScrollTop = scrollTop;
}, { passive: true });
