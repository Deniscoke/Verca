/**
 * Rezervační kalendář — Esencia Viva (Verca).
 * Načte volné termíny z GET /api/booking/availability, po výběru slotu odešle
 * žádost na POST /api/booking/request. Datum/čas se zobrazuje v Europe/Prague.
 * Bez Calendly, bez závislostí.
 */
(function () {
  'use strict';

  var statusEl = document.getElementById('booking-status');
  var daysEl = document.getElementById('booking-days');
  var form = document.getElementById('booking-form');
  if (!statusEl || !daysEl || !form) return;

  var chosenEl = document.getElementById('booking-chosen');
  var slotInput = document.getElementById('booking-slot');
  var msgEl = document.getElementById('booking-msg');
  var submitBtn = document.getElementById('booking-submit');

  var TZ = 'Europe/Prague';
  var dayKeyFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  var dayLabelFmt = new Intl.DateTimeFormat('cs-CZ', {
    timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  var timeFmt = new Intl.DateTimeFormat('cs-CZ', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit',
  });

  var selectedBtn = null;

  function cap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  function setStatus(text) {
    if (!text) {
      statusEl.hidden = true;
      statusEl.textContent = '';
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = text;
  }

  function setMsg(text, kind) {
    if (!text) {
      msgEl.hidden = true;
      msgEl.textContent = '';
      return;
    }
    msgEl.hidden = false;
    msgEl.textContent = text;
    msgEl.className = 'booking__msg ' + (kind === 'ok' ? 'booking__msg--ok' : 'booking__msg--err');
  }

  function groupByDay(slots) {
    var groups = [];
    var index = {};
    slots.forEach(function (s) {
      var d = new Date(s.at);
      if (isNaN(d.getTime())) return;
      var key = dayKeyFmt.format(d);
      if (index[key] == null) {
        index[key] = groups.length;
        groups.push({ key: key, label: cap(dayLabelFmt.format(d)), items: [] });
      }
      groups[index[key]].items.push({ at: s.at, time: timeFmt.format(d) });
    });
    return groups;
  }

  function selectSlot(btn, dayLabel, item) {
    if (selectedBtn) selectedBtn.classList.remove('is-selected');
    selectedBtn = btn;
    btn.classList.add('is-selected');
    slotInput.value = item.at;
    chosenEl.textContent = 'Vybraný termín: ' + dayLabel + ' v ' + item.time;
    form.hidden = false;
    setMsg('');
    var nameField = document.getElementById('booking-name');
    if (nameField) {
      try { nameField.focus({ preventScroll: true }); } catch (e) { nameField.focus(); }
    }
    if (form.scrollIntoView) {
      form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function render(slots) {
    var groups = groupByDay(slots);
    daysEl.textContent = '';
    if (!groups.length) {
      daysEl.hidden = true;
      setStatus('Momentálně nejsou vypsané žádné volné termíny. Napište mi prosím přes formulář výše a domluvíme se osobně.');
      return;
    }
    groups.forEach(function (g) {
      var day = document.createElement('div');
      day.className = 'booking__day';

      var label = document.createElement('p');
      label.className = 'booking__day-label';
      label.textContent = g.label;
      day.appendChild(label);

      var slotsWrap = document.createElement('div');
      slotsWrap.className = 'booking__slots';

      g.items.forEach(function (item) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'booking__slot';
        btn.textContent = item.time;
        btn.setAttribute('aria-label', g.label + ' v ' + item.time);
        btn.addEventListener('click', function () {
          selectSlot(btn, g.label, item);
        });
        slotsWrap.appendChild(btn);
      });

      day.appendChild(slotsWrap);
      daysEl.appendChild(day);
    });
    daysEl.hidden = false;
    setStatus('');
  }

  function resetSelection() {
    slotInput.value = '';
    if (selectedBtn) {
      selectedBtn.classList.remove('is-selected');
      selectedBtn = null;
    }
    form.hidden = true;
  }

  function loadAvailability() {
    setStatus('Načítám volné termíny …');
    daysEl.hidden = true;
    fetch('/api/booking/availability', { headers: { Accept: 'application/json' } })
      .then(function (r) {
        return r.json().then(function (d) {
          return { ok: r.ok, status: r.status, data: d || {} };
        });
      })
      .then(function (out) {
        if (out.ok && out.data && out.data.ok && Array.isArray(out.data.slots)) {
          render(out.data.slots);
        } else if (out.status === 503) {
          setStatus('Online rezervace se právě připravuje. Napište mi prosím přes formulář výše.');
        } else {
          setStatus('Termíny se teď nepodařilo načíst. Zkuste to prosím za chvíli, nebo napište přes formulář výše.');
        }
      })
      .catch(function () {
        setStatus('Termíny se teď nepodařilo načíst. Zkuste to prosím za chvíli, nebo napište přes formulář výše.');
      });
  }

  function fieldValue(name) {
    var el = form.elements.namedItem(name);
    return el && el.value ? el.value : '';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!slotInput.value) {
      setMsg('Vyberte prosím nejdřív termín.', 'err');
      return;
    }
    submitBtn.disabled = true;
    setMsg('');

    var payload = {
      name: fieldValue('name'),
      email: fieldValue('email'),
      phone: fieldValue('phone'),
      note: fieldValue('note'),
      company: fieldValue('company'),
      slot: slotInput.value,
    };

    fetch('/api/booking/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        return r.json().then(function (d) {
          return { ok: r.ok, status: r.status, data: d || {} };
        });
      })
      .then(function (out) {
        if (out.ok && out.data && out.data.ok) {
          resetSelection();
          daysEl.hidden = true;
          setStatus('');
          var when = out.data.when ? ' (' + out.data.when + ')' : '';
          setMsg('Děkuji — vaši žádost o termín' + when + ' jsem přijala. Brzy se vám ozvu s potvrzením e-mailem.', 'ok');
          return;
        }
        if (out.status === 409) {
          setMsg('Tento termín byl právě obsazen. Vyberte prosím jiný — seznam termínů jsem obnovila.', 'err');
          resetSelection();
          loadAvailability();
          return;
        }
        setMsg((out.data && out.data.message) || 'Žádost se nepodařilo odeslat. Zkuste to prosím znovu.', 'err');
      })
      .catch(function () {
        setMsg('Chyba spojení. Zkuste to prosím znovu později.', 'err');
      })
      .then(function () {
        submitBtn.disabled = false;
      });
  });

  loadAvailability();
})();
