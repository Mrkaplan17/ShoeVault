(() => {
  'use strict';

  const WISHLIST_KEY = 'sv-wishlist';

  const drawer = document.querySelector('[data-sv-drawer]');
  const drawerOverlay = document.querySelector('[data-sv-overlay]');
  const drawerItems = document.querySelector('[data-sv-items]');
  const drawerCount = document.querySelector('[data-sv-drawer-count]');
  const subtotalEl = document.querySelector('[data-sv-subtotal]');
  const checkoutBtn = document.querySelector('[data-sv-checkout]');
  const cartBadge = document.querySelector('[data-sv-cart-count]');
  const cartOpenBtn = document.querySelector('[data-sv-cart-open]');
  const shipMsg = document.querySelector('[data-sv-ship-message]');
  const shipFill = document.querySelector('[data-sv-ship-fill]');
  const wishBadge = document.querySelector('[data-sv-wish-badge]');
  const emptyTemplate = drawer ? drawer.querySelector('[data-sv-empty-template]') : null;

  const moneyFormat = drawer ? drawer.dataset.moneyFormat : '{{amount}}';
  const thresholdCents = drawer ? Number(drawer.dataset.shippingThreshold || 1200) * 100 : 120000;
  const checkoutUrl = drawer ? drawer.dataset.checkoutUrl : '/checkout';

  function formatMoney(cents) {
    const amount = (Number(cents) / 100).toLocaleString(document.documentElement.lang || 'en-PH', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    });
    if (!moneyFormat) return amount;
    return moneyFormat
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/g, amount)
      .replace(/\{\{\s*amount\s*\}\}/g, amount);
  }

  function wishlistIds() {
    try {
      const parsed = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (error) {
      return [];
    }
  }

  function saveWishlist(ids) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  }

  function syncWishlistUI() {
    const ids = wishlistIds();
    if (wishBadge) {
      wishBadge.textContent = String(ids.length);
      wishBadge.classList.toggle('is-empty', ids.length === 0);
    }
    const headerWish = document.querySelector('[data-sv-wishlist-toggle]');
    if (headerWish) headerWish.classList.toggle('is-active', ids.length > 0);
    document.querySelectorAll('[data-sv-wish]').forEach((button) => {
      button.classList.toggle('is-active', ids.includes(String(button.dataset.svWish)));
    });
  }

  function toggleWishlist(productId) {
    const ids = wishlistIds();
    const key = String(productId);
    const index = ids.indexOf(key);
    if (index >= 0) ids.splice(index, 1);
    else ids.push(key);
    saveWishlist(ids);
    syncWishlistUI();
  }

  function pulseCartButton() {
    if (!cartOpenBtn) return;
    cartOpenBtn.classList.remove('sv-pulse');
    void cartOpenBtn.offsetWidth;
    cartOpenBtn.classList.add('sv-pulse');
  }

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('is-open');
    if (drawerOverlay) drawerOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    if (drawerOverlay) drawerOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function renderCart(cart) {
    const totalQty = cart.item_count;
    if (cartBadge) {
      cartBadge.textContent = String(totalQty);
      cartBadge.classList.toggle('is-empty', totalQty === 0);
    }
    if (drawerCount) drawerCount.textContent = '(' + totalQty + ')';
    if (subtotalEl) subtotalEl.textContent = formatMoney(cart.total_price);
    if (checkoutBtn) {
      const disabled = totalQty === 0;
      checkoutBtn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      if (disabled) checkoutBtn.removeAttribute('href');
      else checkoutBtn.setAttribute('href', checkoutUrl);
    }

    const remaining = thresholdCents - cart.total_price;
    if (shipMsg) {
      if (remaining <= 0) {
        shipMsg.innerHTML = "You've unlocked <strong>Free Express Shipping</strong>";
      } else {
        shipMsg.innerHTML = 'Add <span class="sv-amt">' + formatMoney(remaining) + '</span> more for Free Express Shipping';
      }
    }
    if (shipFill) {
      shipFill.style.width = Math.min(100, (cart.total_price / thresholdCents) * 100) + '%';
      shipFill.classList.toggle('is-complete', remaining <= 0);
    }

    if (!drawerItems) return;
    if (!cart.items.length) {
      drawerItems.innerHTML = emptyTemplate
        ? emptyTemplate.innerHTML
        : '<div class="sv-drawer-empty"><p>Your bag is empty</p></div>';
      return;
    }

    drawerItems.innerHTML = cart.items.map((item) => {
      const variant = item.variant_title && item.variant_title !== 'Default Title' ? item.variant_title : '';
      const image = item.image
        ? '<img src="' + item.image + '" alt="' + (item.product_title || '') + '">'
        : '<svg viewBox="0 0 24 24" fill="none"><path d="M3 15l3-5 4 2 4-6 4 4 3-2v6H3z" stroke="currentColor" stroke-width="1.5"/></svg>';
      return (
        '<div class="sv-line-item" data-line-key="' + item.key + '">' +
          '<div class="sv-item-thumb">' + image + '</div>' +
          '<div class="sv-item-info">' +
            '<h3>' + item.product_title + '</h3>' +
            '<div class="sv-item-variant">' + variant + '</div>' +
            '<div class="sv-qty-stepper">' +
              '<button type="button" class="sv-qty-minus" data-sv-qty="-1" aria-label="Decrease quantity">−</button>' +
              '<span>' + item.quantity + '</span>' +
              '<button type="button" class="sv-qty-plus" data-sv-qty="1" aria-label="Increase quantity">+</button>' +
            '</div>' +
          '</div>' +
          '<div class="sv-item-right">' +
            '<div class="sv-item-price">' + formatMoney(item.final_line_price) + '</div>' +
            '<button type="button" class="sv-item-remove" data-sv-remove>Remove</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function getCart() {
    return fetch('/cart.js').then((response) => response.json()).then(renderCart);
  }

  function addToCart(variantId) {
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: Number(variantId), quantity: 1 }] })
    }).then((response) => {
      if (!response.ok) return response.json().then((error) => Promise.reject(error));
      return getCart();
    }).then(() => {
      openDrawer();
      pulseCartButton();
    });
  }

  function changeQty(key, quantity) {
    return fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: quantity })
    }).then((response) => response.json()).then(renderCart);
  }

  function openSearch() {
    const overlay = document.querySelector('[data-sv-search]');
    const input = overlay && overlay.querySelector('input[name="q"]');
    if (!overlay) return;
    overlay.classList.add('is-open');
    closeMenu();
    setTimeout(() => { if (input) input.focus(); }, 150);
  }

  function closeSearch() {
    const overlay = document.querySelector('[data-sv-search]');
    if (overlay) overlay.classList.remove('is-open');
  }

  function closeAllSubmenus(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-sv-submenu-toggle]').forEach((button) => {
      button.setAttribute('aria-expanded', 'false');
      const item = button.closest('.has-children');
      if (item) item.classList.remove('is-open');
    });
  }

  function closeMenu() {
    const nav = document.querySelector('[data-sv-nav]');
    const menuToggle = document.querySelector('[data-sv-menu-toggle]');
    if (nav) nav.classList.remove('is-open');
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open menu');
    }
    document.body.classList.remove('sv-nav-lock');
    closeAllSubmenus();
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-sv-menu-toggle]')) {
      const nav = document.querySelector('[data-sv-nav]');
      const menuToggle = document.querySelector('[data-sv-menu-toggle]');
      if (!nav || !menuToggle) return;
      const open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('sv-nav-lock', open);
      if (open) closeSearch();
      else closeAllSubmenus(nav);
      return;
    }
    const submenuToggle = event.target.closest('[data-sv-submenu-toggle]');
    if (submenuToggle) {
      event.preventDefault();
      event.stopPropagation();
      const item = submenuToggle.closest('.has-children');
      if (!item) return;
      const parentList = item.parentElement;
      if (parentList) {
        parentList.querySelectorAll(':scope > .has-children.is-open').forEach((openItem) => {
          if (openItem === item) return;
          openItem.classList.remove('is-open');
          const openBtn = openItem.querySelector(':scope > .sv-nav-linkwrap [data-sv-submenu-toggle]');
          if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
        });
      }
      const open = item.classList.toggle('is-open');
      submenuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!open) closeAllSubmenus(item);
      return;
    }

    if (!event.target.closest('[data-sv-nav]') && !event.target.closest('[data-sv-menu-toggle]')) {
      const nav = document.querySelector('[data-sv-nav]');
      if (nav && window.matchMedia('(min-width: 990px)').matches) {
        closeAllSubmenus(nav);
      }
    }

    if (event.target.closest('[data-sv-announcement-close]')) {
      const bar = event.target.closest('.sv-announce');
      if (bar) bar.classList.add('is-hidden');
    }

    if (event.target.closest('[data-sv-search-open]')) openSearch();
    if (event.target.closest('[data-sv-search-close]')) closeSearch();
    const searchOverlay = document.querySelector('[data-sv-search]');
    if (searchOverlay && event.target === searchOverlay) closeSearch();

    if (event.target.closest('[data-sv-cart-open]')) { closeMenu(); openDrawer(); }
    if (event.target.closest('[data-sv-cart-close]') || event.target === drawerOverlay) closeDrawer();
    if (event.target.closest('[data-sv-empty-browse]')) closeDrawer();

    const wishBtn = event.target.closest('[data-sv-wish]');
    if (wishBtn) {
      event.preventDefault();
      toggleWishlist(wishBtn.dataset.svWish);
      return;
    }

    const card = event.target.closest('.sv-card');
    if (card) {
      const media = card.querySelector('.sv-card-media');
      if (event.target.closest('.sv-card-quickadd-btn')) {
        document.querySelectorAll('.sv-card-media.is-open').forEach((openMedia) => {
          if (openMedia !== media) openMedia.classList.remove('is-open');
        });
        if (media) media.classList.add('is-open');
        return;
      }
      if (event.target.closest('.sv-quickadd-close') && media) {
        media.classList.remove('is-open');
        return;
      }
      const sizeChip = event.target.closest('[data-sv-add]');
      if (sizeChip && !sizeChip.disabled) {
        const btn = card.querySelector('.sv-card-quickadd-btn');
        const originalLabel = btn ? btn.textContent : '';
        addToCart(sizeChip.dataset.variantId).then(() => {
          if (media) media.classList.remove('is-open');
          if (btn) {
            btn.textContent = 'Added';
            btn.classList.add('sv-added');
            setTimeout(() => {
              btn.textContent = originalLabel;
              btn.classList.remove('sv-added');
            }, 1200);
          }
        }).catch(() => {});
        return;
      }
    } else {
      document.querySelectorAll('.sv-card-media.is-open').forEach((media) => media.classList.remove('is-open'));
    }

    const row = event.target.closest('[data-line-key]');
    if (row) {
      if (event.target.closest('[data-sv-remove]')) changeQty(row.dataset.lineKey, 0);
      const step = event.target.closest('[data-sv-qty]');
      if (step) {
        const current = Number(row.querySelector('.sv-qty-stepper span').textContent);
        changeQty(row.dataset.lineKey, current + Number(step.dataset.svQty));
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeDrawer();
    closeSearch();
    closeMenu();
  });

  document.querySelectorAll('.sv-reviews').forEach((section) => {
    const track = section.querySelector('[data-sv-reviews-track]') || section.querySelector('.sv-reviews-track');
    const prevBtn = section.querySelector('[data-sv-review-prev]');
    const nextBtn = section.querySelector('[data-sv-review-next]');
    const dotsWrap = section.querySelector('[data-sv-reviews-dots]') || section.querySelector('.sv-reviews-dots');
    if (!track) return;
    const cards = Array.from(track.querySelectorAll('.sv-review-card'));
    if (!cards.length) return;

    if (dotsWrap && !dotsWrap.children.length) {
      cards.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'sv-reviews-dot';
        dot.setAttribute('aria-label', 'Go to review ' + (index + 1));
        dotsWrap.appendChild(dot);
      });
    }
    const dots = dotsWrap ? Array.from(dotsWrap.children) : [];

    function cardStep() {
      const style = getComputedStyle(track);
      const gap = parseFloat(style.columnGap || style.gap || 20);
      return cards[0].getBoundingClientRect().width + gap;
    }

    function scrollToCard(index) {
      track.scrollTo({ left: index * cardStep(), behavior: 'smooth' });
    }

    function updateSliderUI() {
      const step = cardStep();
      const index = Math.round(track.scrollLeft / step);
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
      const maxScroll = track.scrollWidth - track.clientWidth - 2;
      if (prevBtn) prevBtn.disabled = track.scrollLeft <= 2;
      if (nextBtn) nextBtn.disabled = track.scrollLeft >= maxScroll;
    }

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => scrollToCard(index));
    });

    let scrollRaf;
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(updateSliderUI);
    });
    if (prevBtn) prevBtn.addEventListener('click', () => track.scrollBy({ left: -cardStep(), behavior: 'smooth' }));
    if (nextBtn) nextBtn.addEventListener('click', () => track.scrollBy({ left: cardStep(), behavior: 'smooth' }));
    window.addEventListener('resize', updateSliderUI);
    updateSliderUI();
  });

  syncWishlistUI();
  if (drawer) getCart();
})();
