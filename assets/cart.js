(() => {
  const drawer = document.querySelector('[data-sv-drawer]');
  if (!drawer) return;
  const threshold = Number(drawer.dataset.shippingThreshold || 1200) * 100;
  const currency = drawer.dataset.currency || 'USD';
  const items = drawer.querySelector('[data-sv-items]');
  const count = document.querySelector('[data-sv-cart-count]');
  const drawerCount = drawer.querySelector('[data-sv-drawer-count]');
  const subtotal = drawer.querySelector('[data-sv-subtotal]');
  const fill = drawer.querySelector('[data-sv-ship-fill]');
  const message = drawer.querySelector('[data-sv-ship-message]');
  const emptyTemplate = drawer.querySelector('[data-sv-empty-template]');
  const money = value => new Intl.NumberFormat(document.documentElement.lang || 'en-PH', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value / 100);
  const render = cart => {
    const total = cart.item_count;
    if (count) { count.textContent = total; count.classList.toggle('is-empty', total === 0); }
    if (drawerCount) drawerCount.textContent = `(${total})`;
    if (subtotal) subtotal.textContent = money(cart.total_price);
    const remaining = threshold - cart.total_price;
    if (message) message.innerHTML = remaining <= 0 ? "You've unlocked <strong>Free Express Shipping</strong>" : `Add <span class="sv-amt">${money(remaining)}</span> more for Free Express Shipping`;
    if (fill) { fill.style.width = `${Math.min(100, cart.total_price / threshold * 100)}%`; fill.classList.toggle('is-complete', remaining <= 0); }
    if (!items) return;
    if (!cart.items.length) { items.innerHTML = emptyTemplate ? emptyTemplate.innerHTML : '<div class="sv-drawer-empty"><p>Your bag is empty</p></div>'; return; }
    items.innerHTML = cart.items.map(item => `<div class="sv-line-item" data-line-key="${item.key}"><div class="sv-item-thumb">${item.image ? `<img src="${item.image}" alt="${item.product_title}">` : ''}</div><div class="sv-item-info"><h3>${item.product_title}</h3><div class="sv-item-variant">${item.variant_title === 'Default Title' ? '' : item.variant_title}</div><div class="sv-qty-stepper"><button type="button" data-sv-qty="-1" aria-label="Decrease quantity">-</button><span>${item.quantity}</span><button type="button" data-sv-qty="1" aria-label="Increase quantity">+</button></div></div><div class="sv-item-right"><div class="sv-item-price">${money(item.final_line_price)}</div><button type="button" class="sv-item-remove" data-sv-remove>Remove</button></div></div>`).join('');
  };
  const getCart = () => fetch('/cart.js').then(response => response.json()).then(render);
  const change = (key, quantity) => fetch('/cart/change.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: key, quantity }) }).then(response => response.json()).then(render);
  const open = () => { drawer.classList.add('is-open'); drawer.querySelector('[data-sv-overlay]').classList.add('is-open'); document.body.style.overflow = 'hidden'; };
  const close = () => { drawer.classList.remove('is-open'); drawer.querySelector('[data-sv-overlay]').classList.remove('is-open'); document.body.style.overflow = ''; };
  document.addEventListener('click', event => {
    const card = event.target.closest('.sv-card');
    if (card && event.target.closest('.sv-card-quickadd-btn')) {
      document.querySelectorAll('.sv-card-media.is-open').forEach(media => media.classList.remove('is-open'));
      card.querySelector('.sv-card-media').classList.add('is-open');
      return;
    }
    if (card && event.target.closest('.sv-quickadd-close')) {
      card.querySelector('.sv-card-media').classList.remove('is-open');
      return;
    }
    const add = event.target.closest('[data-sv-add]');
    if (add) { event.preventDefault(); fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ id: Number(add.dataset.variantId), quantity: 1 }] }) }).then(() => getCart()).then(open); return; }
    if (event.target.closest('[data-sv-cart-open]')) open();
    if (event.target.closest('[data-sv-cart-close]') || event.target.closest('[data-sv-overlay]')) close();
    if (event.target.closest('[data-sv-announcement-close]')) event.target.closest('.sv-announce').classList.add('is-hidden');
    const row = event.target.closest('[data-line-key]');
    if (!row) return;
    if (event.target.closest('[data-sv-remove]')) change(row.dataset.lineKey, 0);
    const step = event.target.closest('[data-sv-qty]');
    if (step) change(row.dataset.lineKey, Number(row.querySelector('.sv-qty-stepper span').textContent) + Number(step.dataset.svQty));
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  document.querySelectorAll('.sv-reviews').forEach(section => {
    const track = section.querySelector('.sv-reviews-track');
    const cards = [...section.querySelectorAll('.sv-review-card')];
    if (!track || cards.length < 2) return;
    const step = () => cards[0].getBoundingClientRect().width + 20;
    const controls = document.createElement('div');
    controls.className = 'sv-reviews-nav';
    controls.innerHTML = '<button class="sv-reviews-arrow" type="button" aria-label="Previous reviews">&larr;</button><button class="sv-reviews-arrow" type="button" aria-label="Next reviews">&rarr;</button>';
    section.querySelector('.sv-reviews-head').append(controls);
    controls.firstElementChild.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    controls.lastElementChild.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  });
  getCart();
})();
