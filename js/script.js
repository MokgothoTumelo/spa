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

  function formatDate(dt, withYear) {
    if (!dt) return 'TBD';
    try {
      const d = new Date(dt);
      if (isNaN(d)) return dt;
      const opts = { weekday: 'short', day: 'numeric', month: 'short' };
      if (withYear) opts.year = 'numeric';
      return d.toLocaleDateString('en-GB', opts) + ' at ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
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

  function buildBookingMessage(app) {
    return `NEW BOOKING - LUMIERE SPA

━━━━━━━━━━━━━━━━━━━━
🔖 BOOKING CODE: ${app.code || app.id}
📋 SERVICE: ${app.productName}
💰 PRICE: ${app.productPrice}
👤 CLIENT: ${app.clientName}
📱 PHONE: ${app.clientPhone}
📅 DATE/TIME: ${formatDate(app.dateTime, true)}
━━━━━━━━━━━━━━━━━━━━

⚠️ PLEASE CONFIRM THIS BOOKING
Reply to this client to confirm.`;
  }

  function renderAppointments() {
    if (!appointmentList) return;
    if (appointments.length === 0) {
      appointmentList.innerHTML = `<p style="color:#6b5d4c; text-align:center; padding: 2rem 0;">No appointments yet. <a href="booking.html" style="color:#c4a88a; font-weight:500;">Book a service</a></p>`;
      if (appointmentCount) appointmentCount.textContent = '0';
      return;
    }

    appointmentList.innerHTML = appointments.map(app => `
      <div class="appointment-item">
        <div class="info">
          <strong>${esc(app.code || app.id)}</strong>
          <span>${esc(app.productName)}</span>
          <span>${esc(app.clientName)}</span>
          <span>${esc(formatDate(app.dateTime))}</span>
          <span class="badge">${esc(app.status)}</span>
        </div>
        <div class="actions">
          <button class="reschedule-btn" data-id="${esc(app.id)}"><i class="fas fa-rotate"></i></button>
          <button class="cancel-btn" data-id="${esc(app.id)}"><i class="fas fa-times"></i></button>
        </div>
      </div>
    `).join('');

    appointmentList.querySelectorAll('.reschedule-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = appointments.find(a => a.id === btn.dataset.id);
        rescheduleId.value = target ? (target.code || target.id) : btn.dataset.id;
        document.querySelector('#page-appointments')?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    appointmentList.querySelectorAll('.cancel-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Cancel this appointment?')) {
          appointments = appointments.filter(a => a.id !== btn.dataset.id);
          renderAppointments();
          saveAppointments();
        }
      });
    });

    if (appointmentCount) appointmentCount.textContent = appointments.length;
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

  function rescheduleAppointment() {
    const id = rescheduleId.value.trim();
    const newDt = rescheduleDatetime.value;
    if (!id || !newDt) {
      rescheduleMsg.textContent = '⚠️ Please fill both fields';
      rescheduleMsg.style.display = 'block';
      rescheduleMsg.style.color = '#b33c3c';
      return;
    }

    const key = id.toUpperCase();
    const app = appointments.find(a => a.id === id || (a.code || '').toUpperCase() === key);
    if (!app) {
      rescheduleMsg.textContent = '⚠️ Appointment not found';
      rescheduleMsg.style.display = 'block';
      rescheduleMsg.style.color = '#b33c3c';
      return;
    }

    app.dateTime = newDt;
    app.status = 'rescheduled';
    renderAppointments();
    saveAppointments();

    rescheduleMsg.textContent = `✅ ${app.code || app.id} rescheduled successfully!`;
    rescheduleMsg.style.display = 'block';
    rescheduleMsg.style.color = '#2d7d46';
    setTimeout(() => rescheduleMsg.style.display = 'none', 5000);

    const formattedDate = formatDate(newDt);
    const msg = `🔄 RESCHEDULED - LUMIERE SPA

🔖 BOOKING CODE: ${app.code || app.id}
📋 SERVICE: ${app.productName}
👤 CLIENT: ${app.clientName}
📅 NEW TIME: ${formattedDate}
📱 CLIENT PHONE: ${app.clientPhone}

⚠️ Please confirm this reschedule.`;

    window.open(`https://wa.me/${SPA_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
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
  const SERVICE_INFO = {
    p1: 'Essential oils for relaxation',
    p2: 'Warm stone therapy',
    p3: 'Intense muscle relief',
    p4: 'Skin rejuvenation'
  };

  function todayStr() {
    const n = new Date();
    return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
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
    if (!form || !submitBookingBtn) return;

    serviceSelect.dataset.err = 'service';
    clientName.dataset.err = 'name';
    clientPhone.dataset.err = 'phone';
    bookingDate.dataset.err = 'date';
    bookingTime.dataset.err = 'time';

    const summary = document.getElementById('service-summary');
    bookingDate.min = todayStr();

    function updateSummary() {
      const p = getProductFromSelect();
      if (!p) { summary.hidden = true; return; }
      document.getElementById('summary-name').textContent = p.name;
      document.getElementById('summary-desc').textContent = SERVICE_INFO[p.id] || '';
      document.getElementById('summary-price').textContent = p.price;
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

      if (val < todayStr()) {
        setTimeMessage('Choose another date');
        setError(bookingDate, 'That date has already passed.');
        return;
      }
      const [y, m, d] = val.split('-').map(Number);
      if (new Date(y, m - 1, d).getDay() === 0) {
        setTimeMessage('Closed on Sundays');
        setError(bookingDate, "We're closed on Sundays. Please choose another day.");
        return;
      }

      const now = new Date();
      const isToday = val === todayStr();
      const slots = [];
      for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
        if (isToday && h <= now.getHours()) continue;
        slots.push(h);
      }
      if (slots.length === 0) {
        setTimeMessage('No slots left today');
        setError(bookingDate, 'No more slots today. Please choose another day.');
        return;
      }

      bookingTime.disabled = false;
      bookingTime.innerHTML = '<option value="">Select a time...</option>' +
        slots.map(h => `<option value="${pad(h)}:00">${pad(h)}:00 – ${pad(h + 1)}:00</option>`).join('');
    }

    function validate() {
      let firstBad = null;
      const fail = (input, msg) => { setError(input, msg); if (!firstBad) firstBad = input; };

      if (!serviceSelect.value) fail(serviceSelect, 'Please choose a service.'); else setError(serviceSelect, '');
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
      document.getElementById('confirm-id').textContent = app.code || app.id;
      document.getElementById('confirm-service').textContent = app.productName;
      document.getElementById('confirm-when').textContent = formatDate(app.dateTime, true);
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
      serviceSelect.value = '';
      clientName.value = '';
      clientPhone.value = '';
      bookingDate.value = '';
      [serviceSelect, clientName, clientPhone, bookingDate, bookingTime].forEach(el => setError(el, ''));
      buildTimeSlots();
      updateSummary();
      confirmBox.hidden = true;
      form.hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    serviceSelect.addEventListener('change', () => { setError(serviceSelect, ''); updateSummary(); });
    clientName.addEventListener('input', () => setError(clientName, ''));
    clientPhone.addEventListener('input', () => setError(clientPhone, ''));
    bookingDate.addEventListener('change', buildTimeSlots);
    bookingTime.addEventListener('change', () => setError(bookingTime, ''));

    submitBookingBtn.addEventListener('click', () => {
      if (!validate()) return;
      const app = addAppointment(getProductFromSelect(), {
        clientName: clientName.value.trim(),
        clientPhone: clientPhone.value.trim(),
        dateTime: `${bookingDate.value}T${bookingTime.value}`
      });
      showConfirmation(app);
    });

    document.getElementById('book-another-btn').addEventListener('click', resetForm);
    document.getElementById('confirm-whatsapp').addEventListener('click', () => {
      document.getElementById('confirm-note').textContent =
        "Don't forget to press Send in WhatsApp. We'll reply to confirm your time.";
    });

    // Preselect the service when arriving from a "Book Now" card (booking.html?service=p1)
    const wanted = new URLSearchParams(window.location.search).get('service');
    if (wanted && serviceSelect.querySelector(`option[value="${wanted}"]`)) {
      serviceSelect.value = wanted;
    }
    updateSummary();
    buildTimeSlots();
  }

  function init() {
    loadAppointments();
    setupBookButtons();
    renderAppointments();
    renderReviews();

    setupBookingForm();

    if (rescheduleBtn) {
      rescheduleBtn.addEventListener('click', rescheduleAppointment);
    }

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