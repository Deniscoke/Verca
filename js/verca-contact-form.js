/**
 * Kontakt — odeslání formuláře na POST /api/contact/message (Resend na Vercelu).
 */
(function () {
  'use strict';

  var form = document.getElementById('verca-contact-form');
  var err = document.getElementById('err');
  if (!form || !err) return;

  function setMsg(text, ok) {
    err.textContent = text || '';
    err.classList.toggle('is-visible', !!text);
    err.classList.toggle('verca-contact-msg--ok', !!ok);
    err.setAttribute('role', ok ? 'status' : 'alert');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = form.querySelector('[type="submit"]');
    if (btn) btn.disabled = true;
    setMsg('');

    var payload = {
      name: (form.elements.namedItem('name') && form.elements.namedItem('name').value) || '',
      email: (form.elements.namedItem('email') && form.elements.namedItem('email').value) || '',
      message: (form.elements.namedItem('message') && form.elements.namedItem('message').value) || '',
      company: (form.elements.namedItem('company') && form.elements.namedItem('company').value) || '',
    };

    fetch('/api/contact/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, status: r.status, data: data || {} };
        });
      })
      .then(function (out) {
        if (out.ok && out.data && out.data.ok) {
          setMsg('Děkuji — zpráva byla odeslána. Ozvu se, jak bývá zvykem.', true);
          form.reset();
          return;
        }
        var msg =
          (out.data && out.data.message) ||
          (out.status === 501
            ? 'Formulář zatím není napojený na e-mail na serveru. Použijte tlačítko „Napsat e-mailem“ níže.'
            : 'Odeslání se nepodařilo. Zkuste to prosím znovu, nebo napište přímo na hello@verca.care.');
        setMsg(msg, false);
      })
      .catch(function () {
        setMsg(
          'Chyba spojení. Zkuste to znovu později nebo použijte odkaz na e-mail níže.',
          false
        );
      })
      .then(function () {
        if (btn) btn.disabled = false;
      });
  });
})();
