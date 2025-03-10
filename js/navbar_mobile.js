document.querySelector('.header__nav-toggle').addEventListener('click', function() {
    this.classList.toggle('active');
    document.querySelector('.header__nav').classList.toggle('active');
    document.querySelector('.menu-overlay').classList.toggle('active');
  });

  document.querySelector('.menu-overlay').addEventListener('click', function() {
    this.classList.remove('active');
    document.querySelector('.header__nav').classList.remove('active');
    document.querySelector('.header__nav-toggle').classList.remove('active');
  });
  // Cierra el menú cuando se hace clic en un link (solo en vista mobile)
document.querySelectorAll('.header__nav-link').forEach(link => {
link.addEventListener('click', function() {
  if (window.innerWidth <= 768) {
    document.querySelector('.menu-overlay').classList.remove('active');
    document.querySelector('.header__nav').classList.remove('active');
    document.querySelector('.header__nav-toggle').classList.remove('active');
  }
});
});
