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
  const bookingDatetime = document.getElementById('booking-datetime');
  const submitBookingBtn = document.getElementById('submit-booking-btn');
  const bookingMsg = document.getElementById('booking-msg');

  const rescheduleId = document.getElementById('reschedule-id');
  const rescheduleDatetime = document.getElementById('reschedule-datetime');
  const rescheduleBtn = document.getElementById('reschedule-btn');
  const rescheduleMsg = document.getElementById('reschedule-msg');

  const starBtns = document.querySelectorAll('.star-btn');
  const reviewText = document.getElementById('review-text');
  const submitReviewBtn = document.getElementById('submit-review-btn');
  const reviewList = document.getElementById('review-list');

  // HELPERS
  function formatDate(dt) {
    if (!dt) return 'TBD';
    try {
      const d = new Date(dt);
      return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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

    const formattedDate = formatDate(dateStr);
    const msg = `🕊️ NEW BOOKING - LUMIERE SPA

━━━━━━━━━━━━━━━━━━━━
📋 SERVICE: ${product.name}
💰 PRICE: ${product.price}
👤 CLIENT: ${newApp.clientName}
📱 PHONE: ${newApp.clientPhone}
📅 DATE/TIME: ${formattedDate}
━━━━━━━━━━━━━━━━━━━━

⚠️ PLEASE CONFIRM THIS BOOKING
Reply to this client to confirm.`;

    window.open(`https://wa.me/${SPA_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');

    if (bookingMsg) {
      bookingMsg.innerHTML = `✅ ${product.name} booked successfully!<br><small>WhatsApp message sent to spa owner for confirmation.</small>`;
      bookingMsg.style.display = 'block';
      bookingMsg.style.color = '#2d7d46';
      setTimeout(() => bookingMsg.style.display = 'none', 8000);
    }
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
          <strong>${app.id}</strong>
          <span>${app.productName}</span>
          <span>${app.clientName}</span>
          <span>${formatDate(app.dateTime)}</span>
          <span class="badge">${app.status}</span>
        </div>
        <div class="actions">
          <button class="reschedule-btn" data-id="${app.id}"><i class="fas fa-rotate"></i></button>
          <button class="cancel-btn" data-id="${app.id}"><i class="fas fa-times"></i></button>
        </div>
      </div>
    `).join('');

    appointmentList.querySelectorAll('.reschedule-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        rescheduleId.value = btn.dataset.id;
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

    const app = appointments.find(a => a.id === id);
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

    rescheduleMsg.textContent = `✅ ${id} rescheduled successfully!`;
    rescheduleMsg.style.display = 'block';
    rescheduleMsg.style.color = '#2d7d46';
    setTimeout(() => rescheduleMsg.style.display = 'none', 5000);

    const formattedDate = formatDate(newDt);
    const msg = `🔄 RESCHEDULED - LUMIERE SPA

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
        <div class="review-meta"><span>${r.name}</span><span>· ${r.date}</span></div>
        <p>${r.text}</p>
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

  function init() {
    loadAppointments();
    setupBookButtons();
    renderAppointments();
    renderReviews();

    if (bookingDatetime) {
      bookingDatetime.min = getTodayMinDateTime();
    }

    if (submitBookingBtn) {
      submitBookingBtn.addEventListener('click', () => {
        const product = getProductFromSelect();
        if (!product) {
          alert('Please select a service');
          return;
        }
        if (!clientName.value.trim()) {
          alert('Please enter your name');
          return;
        }
        if (!clientPhone.value.trim()) {
          alert('Please enter your WhatsApp number');
          return;
        }
        if (!bookingDatetime.value) {
          alert('Please select a date and time');
          return;
        }

        addAppointment(product, {
          clientName: clientName.value.trim(),
          clientPhone: clientPhone.value.trim(),
          dateTime: bookingDatetime.value
        });

        clientName.value = '';
        clientPhone.value = '';
        bookingDatetime.value = '';
        serviceSelect.value = '';
      });
    }

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