// script.js — Complete functionality for Lumiere Spa booking website

(function() {
  "use strict";

  const SPA_WHATSAPP = '27673666047';

  let appointments = [];
  let idCounter = 1;
  let selectedStar = 0;

  let reviews = [
    { name: 'Sarah J.', stars: 5, text: 'The best spa experience I\'ve ever had! The ambience, the staff, everything was perfect. I left feeling completely refreshed.', date: '2 weeks ago' },
    { name: 'Marcus', stars: 4, text: 'Very relaxing atmosphere. Will come again.', date: '1 week ago' }
  ];

  // DOM REFS
  const appointmentList = document.getElementById('appointment-list');
  const appointmentCount = document.getElementById('appointment-count');

  const serviceSelect = document.getElementById('service-select');
  const clientName = document.getElementById('client-name');
  const clientPhone = document.getElementById('client-phone');
  const bookingDate = document.getElementById('booking-date');
  const bookingTime = document.getElementById('booking-time');
  const submitBookingBtn = document.getElementById('submit-booking-btn');

  const rescheduleId = document.getElementById('reschedule-id');
  const rescheduleDatetime = document.getElementById('reschedule-datetime');
  const rescheduleBtn = document.getElementById('reschedule-btn');
  const rescheduleMsg = document.getElementById('reschedule-msg');

  const starBtns = document.querySelectorAll('.star-btn');
  const reviewText = document.getElementById('review-text');
  const submitReviewBtn = document.getElementById('submit-review-btn');
  const reviewList = document.getElementById('review-list');

  // HELPERS
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  // Booking code like LUM-7K4Q (no 0/O/1/I so it is easy to read out)
  function generateBookingCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
      const bytes = new Uint8Array(4);
      (window.crypto || window.msCrypto).getRandomValues(bytes);
      code = 'LUM-' + Array.from(bytes, b => chars[b % chars.length]).join('');
    } while (appointments.some(a => a.code === code));
    return code;
  }

  function formatDate(dt, withYear, hours) {
    if (!dt) return 'TBD';
    try {
      const d = new Date(dt);
      if (isNaN(d)) return dt;
      const opts = { weekday: 'short', day: 'numeric', month: 'short' };
      if (withYear) opts.year = 'numeric';
      let out = d.toLocaleDateString('en-GB', opts) + ' at ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
      if (hours > 1) out += ' – ' + pad(d.getHours() + hours) + ':' + pad(d.getMinutes());
      return out;
    } catch { return dt; }
  }

  function getTodayMinDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function getProductFromSelect() {
    const selected = serviceSelect.options[serviceSelect.selectedIndex];
    if (!selected || !selected.value) return null;
    
    const text = selected.text;
    const parts = text.split(' - ');
    return {
      id: selected.value,
      name: parts[0] || 'Service',
      price: parts[1] || 'R0'
    };
  }

  function setupBookButtons() {
    document.querySelectorAll('.book-from-card').forEach(btn => {
      btn.addEventListener('click', function() {
        const productId = this.dataset.id;
        const currentPage = window.location.pathname;
        
        if (currentPage.includes('booking.html')) {
          if (serviceSelect) {
            serviceSelect.value = productId;
            document.querySelector('.booking-panel')?.scrollIntoView({ behavior: 'smooth' });
          }
        } else {
          window.location.href = `booking.html?service=${productId}`;
        }
      });
    });
  }

  function addAppointment(product, customData = {}) {
    const dateStr = customData.dateTime || new Date(Date.now() + 2*60*60*1000).toISOString().slice(0,16);
    
    const newApp = {
      id: '#' + (idCounter++),
      code: generateBookingCode(),
      services: customData.services || null,
      productName: product.name,
      productPrice: product.price,
      dateTime: dateStr,
      clientName: customData.clientName || 'Guest',
      clientPhone: customData.clientPhone || 'Not provided',
      status: 'pending'
    };

    appointments.push(newApp);
    renderAppointments();
    saveAppointments();

    return newApp;
  }

  function appServices(app) {
    if (app.services && app.services.length) return app.services.map(x => ({ name: x.name, price: 'R' + x.price }));
    return [{ name: app.productName, price: app.productPrice }];
  }

  function appHours(app) {
    return app.services && app.services.length ? app.services.length : 1;
  }

  function buildBookingMessage(app) {
    const list = appServices(app);
    const services = list.length > 1
      ? `📋 SERVICES:\n${list.map(x => `   • ${x.name} - ${x.price}`).join('\n')}\n💰 TOTAL: ${app.productPrice}`
      : `📋 SERVICE: ${list[0].name}\n💰 PRICE: ${app.productPrice}`;
    return `NEW BOOKING - LUMIERE SPA

━━━━━━━━━━━━━━━━━━━━
🔖 BOOKING CODE: ${app.code || app.id}
${services}
👤 CLIENT: ${app.clientName}
📱 PHONE: ${app.clientPhone}
📅 DATE/TIME: ${formatDate(app.dateTime, true, appHours(app))}
━━━━━━━━━━━━━━━━━━━━

⚠️ PLEASE CONFIRM THIS BOOKING
Reply to this client to confirm.`;
  }

  const STATUS_LABELS = {
    'pending': 'Waiting for confirmation',
    'reschedule requested': 'Change requested',
    'cancelled': 'Cancelled'
  };
  let openPanel = null; // { id, mode: 'reschedule' | 'cancel' }

  function buildChangeMessage(app, type) {
    if (type === 'cancel') {
      return `CANCELLATION - LUMIERE SPA\n\n🔖 BOOKING CODE: ${app.code || app.id}\n📋 SERVICE: ${app.productName}\n👤 CLIENT: ${app.clientName}\n📅 WAS BOOKED FOR: ${formatDate(app.dateTime, true, appHours(app))}\n📱 PHONE: ${app.clientPhone}\n\nI would like to cancel this booking.`;
    }
    return `RESCHEDULE REQUEST - LUMIERE SPA\n\n🔖 BOOKING CODE: ${app.code || app.id}\n📋 SERVICE: ${app.productName}\n👤 CLIENT: ${app.clientName}\n📅 NEW TIME: ${formatDate(app.dateTime, true, appHours(app))}\n📱 PHONE: ${app.clientPhone}\n\nPlease confirm this new time.`;
  }

  function renderAppointments() {
    if (!appointmentList) return;
    const active = appointments.filter(a => a.status !== 'cancelled').length;
    if (appointmentCount) appointmentCount.textContent = active;

    if (appointments.length === 0) {
      appointmentList.innerHTML = `<div class="appt-empty"><i class="far fa-calendar"></i><p>No appointments yet.</p><a href="booking.html" class="btn btn-primary">Book a service</a></div>`;
      return;
    }

    appointmentList.innerHTML = appointments.map(app => {
      const cancelled = app.status === 'cancelled';
      const stClass = 'st-' + app.status.replace(/\s+/g, '-');
      const panel = openPanel && openPanel.id === app.id ? openPanel.mode : null;
      let body = '';

      if (app.notice) {
        const url = `https://wa.me/${SPA_WHATSAPP}?text=${encodeURIComponent(buildChangeMessage(app, app.notice))}`;
        body += `<div class="appt-notice"><p>${app.notice === 'cancel' ? 'Tell us you are cancelling so we can free your time.' : 'Send your new time to us to finish. It is not final until we reply.'}</p><a class="btn btn-whatsapp btn-block" href="${url}" target="_blank" rel="noopener" data-act="sent" data-id="${esc(app.id)}"><i class="fab fa-whatsapp"></i> Send on WhatsApp</a></div>`;
      }

      if (panel === 'reschedule') {
        body += `<div class="appt-panel" data-hours="${appHours(app)}"><div class="form-row"><div class="form-group"><label>New date</label><input type="date" class="rs-date" min="${todayStr()}" /></div><div class="form-group"><label>New time</label><select class="rs-time" disabled><option value="">Choose a date first</option></select></div></div><div class="field-error rs-error"></div><div class="appt-btns"><button class="btn btn-primary" data-act="save-reschedule" data-id="${esc(app.id)}">Request new time</button><button class="link-btn" data-act="close">Close</button></div></div>`;
      } else if (panel === 'cancel') {
        body += `<div class="appt-panel"><p>Cancel this booking?</p><div class="appt-btns"><button class="btn btn-danger" data-act="confirm-cancel" data-id="${esc(app.id)}">Yes, cancel it</button><button class="link-btn" data-act="close">Keep it</button></div></div>`;
      } else if (cancelled) {
        body += `<div class="appt-btns"><button class="link-btn" data-act="remove" data-id="${esc(app.id)}">Remove from list</button></div>`;
      } else {
        body += `<div class="appt-btns"><button class="btn btn-outline" data-act="reschedule" data-id="${esc(app.id)}"><i class="fas fa-rotate"></i> Reschedule</button><button class="link-btn" data-act="cancel" data-id="${esc(app.id)}">Cancel booking</button></div>`;
      }

      return `<div class="appt-card${cancelled ? ' is-cancelled' : ''}">
        <div class="appt-top"><span class="appt-code">${esc(app.code || app.id)}</span><span class="appt-status ${stClass}">${esc(STATUS_LABELS[app.status] || app.status)}</span></div>
        <div class="appt-service">${esc(app.productName)} <span class="appt-price">${esc(app.productPrice)}</span></div>
        <div class="appt-meta"><span><i class="far fa-calendar"></i> ${esc(formatDate(app.dateTime, true, appHours(app)))}</span><span><i class="far fa-user"></i> ${esc(app.clientName)}</span></div>
        ${body}
      </div>`;
    }).join('');
  }

  function setupAppointmentActions() {
    if (!appointmentList) return;

    appointmentList.addEventListener('change', e => {
      if (!e.target.classList.contains('rs-date')) return;
      const panel = e.target.closest('.appt-panel');
      const time = panel.querySelector('.rs-time');
      const err = panel.querySelector('.rs-error');
      const hours = parseInt(panel.dataset.hours) || 1;
      const r = getAvailableSlots(e.target.value, hours);
      err.textContent = r.msg || '';
      if (r.msg) { time.innerHTML = `<option value="">${r.label}</option>`; time.disabled = true; }
      else { time.innerHTML = slotOptionsHTML(r.slots, hours); time.disabled = false; }
    });

    appointmentList.addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      const app = appointments.find(a => a.id === btn.dataset.id);

      if (act === 'sent') {
        if (app) { app.notice = null; saveAppointments(); }
        setTimeout(renderAppointments, 400);
        return;
      }
      if (act === 'reschedule' || act === 'cancel') { openPanel = { id: app.id, mode: act }; }
      else if (act === 'close') { openPanel = null; }
      else if (act === 'remove') { appointments = appointments.filter(a => a.id !== app.id); saveAppointments(); }
      else if (act === 'confirm-cancel') { app.status = 'cancelled'; app.notice = 'cancel'; openPanel = null; saveAppointments(); }
      else if (act === 'save-reschedule') {
        const panel = btn.closest('.appt-panel');
        const date = panel.querySelector('.rs-date').value;
        const time = panel.querySelector('.rs-time').value;
        const err = panel.querySelector('.rs-error');
        if (!date) { err.textContent = 'Please choose a date.'; return; }
        if (!time) { err.textContent = err.textContent || 'Please choose a time.'; return; }
        app.dateTime = `${date}T${time}`;
        app.status = 'reschedule requested';
        app.notice = 'reschedule';
        openPanel = null;
        saveAppointments();
      }
      renderAppointments();
    });
  }

  function setupNavToggle() {
    const nav = document.querySelector('.nav');
    const toggle = document.getElementById('nav-toggle');
    if (!nav || !toggle) return;
    const setOpen = open => {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      toggle.innerHTML = `<i class="fas ${open ? 'fa-xmark' : 'fa-bars'}"></i>`;
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    document.addEventListener('click', e => { if (!nav.contains(e.target)) setOpen(false); });
  }

  function saveAppointments() {
    try {
      localStorage.setItem('spa_appointments', JSON.stringify(appointments));
      localStorage.setItem('spa_idCounter', String(idCounter));
    } catch (e) {}
  }

  function loadAppointments() {
    try {
      const saved = localStorage.getItem('spa_appointments');
      if (saved) {
        appointments = JSON.parse(saved);
        const savedId = localStorage.getItem('spa_idCounter');
        if (savedId) idCounter = parseInt(savedId) || 1;
      }
    } catch (e) {}
  }

  function renderReviews() {
    if (!reviewList) return;
    reviewList.innerHTML = reviews.map(r => `
      <div class="review-item">
        <div class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</div>
        <div class="review-meta"><span>${esc(r.name)}</span><span>· ${esc(r.date)}</span></div>
        <p>${esc(r.text)}</p>
      </div>
    `).join('');
  }

  if (starBtns.length > 0) {
    starBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        selectedStar = parseInt(btn.dataset.star);
        starBtns.forEach(b => {
          b.classList.toggle('active', parseInt(b.dataset.star) <= selectedStar);
        });
      });
    });
  }

  function submitReview() {
    if (selectedStar === 0 || !reviewText.value.trim()) {
      alert('Please select stars and write a review');
      return;
    }

    reviews.push({
      name: 'Guest',
      stars: selectedStar,
      text: reviewText.value.trim(),
      date: 'just now'
    });

    renderReviews();
    reviewText.value = '';
    selectedStar = 0;
    starBtns.forEach(b => b.classList.remove('active'));
    alert('Thank you for your review!');
  }


  // ---------- BOOKING FORM ----------
  const OPEN_HOUR = 9;     // first slot starts 09:00
  const CLOSE_HOUR = 17;   // last slot ends 17:00
  const SERVICES = [
    { id: 'p1', name: 'Aromatherapy', price: 75,  desc: 'Essential oils for relaxation' },
    { id: 'p2', name: 'Hot Stone',    price: 95,  desc: 'Warm stone therapy' },
    { id: 'p3', name: 'Deep Tissue',  price: 110, desc: 'Intense muscle relief' },
    { id: 'p4', name: 'Facial & Glow', price: 85, desc: 'Skin rejuvenation' }
  ];

  function todayStr() {
    const n = new Date();
    return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
  }

  function getAvailableSlots(val, hours) {
    hours = hours || 1;
    if (val < todayStr()) return { slots: [], msg: 'That date has already passed.', label: 'Choose another date' };
    const [y, m, d] = val.split('-').map(Number);
    if (new Date(y, m - 1, d).getDay() === 0) return { slots: [], msg: "We're closed on Sundays. Please choose another day.", label: 'Closed on Sundays' };
    const now = new Date(), isToday = val === todayStr(), slots = [];
    for (let h = OPEN_HOUR; h + hours <= CLOSE_HOUR; h++) {
      if (isToday && h <= now.getHours()) continue;
      slots.push(h);
    }
    if (!slots.length) return { slots, msg: 'No more slots today. Please choose another day.', label: 'No slots left today' };
    return { slots };
  }

  function slotOptionsHTML(slots, hours) {
    hours = hours || 1;
    return '<option value="">Select a time...</option>' +
      slots.map(h => `<option value="${pad(h)}:00">${pad(h)}:00 – ${pad(h + hours)}:00</option>`).join('');
  }

  function setError(input, message) {
    const err = document.getElementById('err-' + input.dataset.err);
    if (err) err.textContent = message || '';
    input.classList.toggle('has-error', !!message);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function isValidPhone(raw) {
    return /^(\+?27|0)\d{9}$/.test(raw.replace(/[\s\-()]/g, ''));
  }

  function setupBookingForm() {
    const form = document.getElementById('booking-form');
    const confirmBox = document.getElementById('booking-confirm');
    const optionsBox = document.getElementById('service-options');
    if (!form || !submitBookingBtn || !optionsBox) return;

    clientName.dataset.err = 'name';
    clientPhone.dataset.err = 'phone';
    bookingDate.dataset.err = 'date';
    bookingTime.dataset.err = 'time';

    const summary = document.getElementById('service-summary');
    const errServices = document.getElementById('err-services');
    bookingDate.min = todayStr();

    optionsBox.innerHTML = SERVICES.map(sv => `
      <label class="service-option">
        <input type="checkbox" value="${sv.id}" />
        <span class="so-check"><i class="fas fa-check"></i></span>
        <span class="so-body"><strong>${esc(sv.name)}</strong><small>${esc(sv.desc)}</small></span>
        <span class="so-price">R${sv.price}</span>
      </label>`).join('');
    const boxes = Array.from(optionsBox.querySelectorAll('input'));
    const selected = () => SERVICES.filter(sv => boxes.some(b => b.checked && b.value === sv.id));

    function updateSummary() {
      const sel = selected();
      boxes.forEach(b => b.closest('.service-option').classList.toggle('is-selected', b.checked));
      if (!sel.length) { summary.hidden = true; return; }
      document.getElementById('summary-lines').innerHTML = sel.map(sv =>
        `<div class="summary-line"><span>${esc(sv.name)}</span><span>R${sv.price}</span></div>`).join('');
      document.getElementById('summary-duration').textContent =
        'About ' + (sel.length === 1 ? '1 hour' : sel.length + ' hours');
      document.getElementById('summary-price').textContent =
        'Total R' + sel.reduce((t, sv) => t + sv.price, 0);
      summary.hidden = false;
    }

    function setTimeMessage(text) {
      bookingTime.innerHTML = '';
      const o = document.createElement('option');
      o.value = '';
      o.textContent = text;
      bookingTime.appendChild(o);
      bookingTime.disabled = true;
    }

    function buildTimeSlots() {
      setError(bookingDate, '');
      setError(bookingTime, '');
      const val = bookingDate.value;
      if (!val) { setTimeMessage('Choose a date first'); return; }
      const hours = Math.max(1, selected().length);
      const r = getAvailableSlots(val, hours);
      if (r.msg) { setTimeMessage(r.label); setError(bookingDate, r.msg); return; }
      bookingTime.disabled = false;
      bookingTime.innerHTML = slotOptionsHTML(r.slots, hours);
    }

    function validate() {
      let firstBad = null;
      const fail = (input, msg) => { setError(input, msg); if (!firstBad) firstBad = input; };

      if (!selected().length) { errServices.textContent = 'Please choose at least one service.'; firstBad = boxes[0]; }
      else errServices.textContent = '';

      if (!clientName.value.trim()) fail(clientName, 'Please enter your name.'); else setError(clientName, '');

      const phone = clientPhone.value.trim();
      if (!phone) fail(clientPhone, 'Please enter your WhatsApp number.');
      else if (!isValidPhone(phone)) fail(clientPhone, 'Please enter a valid number, e.g. 082 123 4567.');
      else setError(clientPhone, '');

      if (!bookingDate.value) fail(bookingDate, 'Please choose a date.');
      else if (bookingDate.classList.contains('has-error')) { if (!firstBad) firstBad = bookingDate; }
      if (!bookingTime.disabled && !bookingTime.value) fail(bookingTime, 'Please choose a time.');

      if (firstBad) firstBad.focus();
      return !firstBad;
    }

    function showConfirmation(app) {
      const list = appServices(app);
      document.getElementById('confirm-id').textContent = app.code || app.id;
      document.getElementById('confirm-service').innerHTML = list.map(x => esc(x.name)).join('<br>');
      document.getElementById('confirm-when').textContent = formatDate(app.dateTime, true, appHours(app));
      document.getElementById('confirm-name').textContent = app.clientName;
      document.getElementById('confirm-price').textContent = app.productPrice;
      document.getElementById('confirm-whatsapp').href =
        `https://wa.me/${SPA_WHATSAPP}?text=${encodeURIComponent(buildBookingMessage(app))}`;
      document.getElementById('confirm-note').textContent = "We'll reply on WhatsApp to confirm your time.";
      form.hidden = true;
      confirmBox.hidden = false;
      confirmBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      confirmBox.focus({ preventScroll: true });
    }

    function resetForm() {
      boxes.forEach(b => { b.checked = false; });
      clientName.value = '';
      clientPhone.value = '';
      bookingDate.value = '';
      errServices.textContent = '';
      [clientName, clientPhone, bookingDate, bookingTime].forEach(el => setError(el, ''));
      buildTimeSlots();
      updateSummary();
      confirmBox.hidden = true;
      form.hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    boxes.forEach(b => b.addEventListener('change', () => {
      errServices.textContent = '';
      updateSummary();
      const prev = bookingTime.value;
      buildTimeSlots();
      if (prev && Array.from(bookingTime.options).some(o => o.value === prev)) bookingTime.value = prev;
    }));
    clientName.addEventListener('input', () => setError(clientName, ''));
    clientPhone.addEventListener('input', () => setError(clientPhone, ''));
    bookingDate.addEventListener('change', buildTimeSlots);
    bookingTime.addEventListener('change', () => setError(bookingTime, ''));

    submitBookingBtn.addEventListener('click', () => {
      if (!validate()) return;
      const sel = selected();
      const total = sel.reduce((t, sv) => t + sv.price, 0);
      const app = addAppointment(
        { name: sel.map(sv => sv.name).join(' + '), price: 'R' + total },
        {
          clientName: clientName.value.trim(),
          clientPhone: clientPhone.value.trim(),
          dateTime: `${bookingDate.value}T${bookingTime.value}`,
          services: sel.map(sv => ({ id: sv.id, name: sv.name, price: sv.price }))
        }
      );
      showConfirmation(app);
    });

    document.getElementById('book-another-btn').addEventListener('click', resetForm);
    document.getElementById('confirm-whatsapp').addEventListener('click', () => {
      document.getElementById('confirm-note').textContent =
        "Don't forget to press Send in WhatsApp. We'll reply to confirm your time.";
    });

    // Preselect a service when arriving from a "Book Now" card (booking.html?service=p1)
    const wanted = new URLSearchParams(window.location.search).get('service');
    boxes.forEach(b => { if (b.value === wanted) b.checked = true; });
    updateSummary();
    buildTimeSlots();
  }

  function init() {
    loadAppointments();
    setupBookButtons();
    renderAppointments();
    renderReviews();

    setupBookingForm();

    setupAppointmentActions();
    setupNavToggle();

    if (submitReviewBtn) {
      submitReviewBtn.addEventListener('click', submitReview);
    }
  }

  init();

})();
window.addEventListener('scroll', function() {
  const nav = document.querySelector('.nav');
  if (window.scrollY > 50) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
});