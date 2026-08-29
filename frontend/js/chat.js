/* CodWay — AI-виджет поддержки + приём брифа из модалки заказа.
   Бэкенд: https://api.codway.su/api/chat */
(function () {
  'use strict';

  var API = 'https://api.codway.su/api/chat';
  var HISTORY_API = API.replace('/chat', '/chat/history');

  var fab = document.getElementById('chatFab');
  var panel = document.getElementById('chatPanel');
  var closeBtn = document.getElementById('chatClose');
  var body = document.getElementById('chatMessages');
  var quick = document.getElementById('chatQuick');
  var form = document.getElementById('chatForm');
  var input = document.getElementById('chatInput');
  var sendBtn = form.querySelector('.c-send');

  var sessionId = null;
  try {
    sessionId = localStorage.getItem('codway_sid');
    if (!sessionId) {
      sessionId =
        (window.crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'sid-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('codway_sid', sessionId);
    }
  } catch (e) { sessionId = 'sid-' + Date.now(); }

  var pending = false;
  var greeted = false;
  var reconnectAttempts = 0;
  var maxReconnectAttempts = 3;
  var isOnline = navigator.onLine;

  /* ---------- утилиты ---------- */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function mdLite(html) {
    return html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }
  function scrollDown() {
    if (body) body.scrollTop = body.scrollHeight;
  }
  function setFabBadge(show) {
    var badge = fab.querySelector('.fab-badge');
    if (badge) badge.classList.toggle('show', show);
  }
  function updateFabAria(expanded) {
    fab.setAttribute('aria-expanded', expanded);
  }

  /* ---------- рендер ---------- */
  function addBubble(text, who, estimate) {
    var div = document.createElement('div');
    div.className = 'msg msg-' + (who === 'user' ? 'user' : 'bot');
    div.setAttribute('role', who === 'user' ? 'log' : 'log');
    if (who === 'user') {
      div.textContent = text;
    } else {
      div.innerHTML = mdLite(escapeHtml(text));
    }
    if (estimate) {
      var est = document.createElement('div');
      est.className = 'estimate';
      var tag = document.createElement('span');
      tag.className = 'estimate-tag';
      tag.textContent = 'Смета';
      est.appendChild(tag);
      est.appendChild(document.createElement('br'));
      est.insertAdjacentHTML('beforeend', escapeHtml(estimate).replace(/\n/g, '<br>'));
      div.appendChild(est);
    }
    body.appendChild(div);
    scrollDown();
    return div;
  }

  function addSubmittedNote() {
    var d = document.createElement('div');
    d.className = 'sub-ok';
    d.textContent = 'Заявка отправлена · скоро свяжемся для уточнения оплаты';
    body.appendChild(d);
    scrollDown();
  }

  function showTyping() {
    hideTyping();
    var t = document.createElement('div');
    t.className = 'typing typing-indicator';
    t.id = 'typing';
    t.setAttribute('aria-live', 'polite');
    t.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(t);
    scrollDown();
  }
  function hideTyping() {
    var t = document.getElementById('typing');
    if (t) t.remove();
  }

  function showError(message) {
    hideTyping();
    var div = document.createElement('div');
    div.className = 'msg msg-bot msg-error';
    div.setAttribute('role', 'alert');
    div.textContent = message;
    body.appendChild(div);
    lastErrorBubble = div;
    scrollDown();
    return div;
  }

  function showOfflineNotice() {
    var div = document.createElement('div');
    div.className = 'msg msg-bot msg-offline';
    div.textContent = 'Нет соединения с сервером. Попытка переподключения...';
    body.appendChild(div);
    scrollDown();
    return div;
  }

  /* ---------- сетевой слой с ретраями ---------- */
  var lastErrorBubble = null;

  function apiSend(payload, attempt) {
    attempt = attempt || 1;
    if (pending) return;
    pending = true;
    input.disabled = true;
    sendBtn.disabled = true;
    if (lastErrorBubble && lastErrorBubble.parentNode) {
      lastErrorBubble.parentNode.removeChild(lastErrorBubble);
      lastErrorBubble = null;
    }
    showTyping();

    payload.session_id = sessionId;

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        hideTyping();
        reconnectAttempts = 0; // сброс счетчика при успехе
        addBubble(data.reply || '…', 'bot', data.estimate || null);
        if (data.submitted) addSubmittedNote();
      })
      .catch(function (err) {
        hideTyping();
        console.error('Chat API error:', err);
        
        if (!isOnline) {
          showOfflineNotice();
          return;
        }

        // Ретраи для сетевых ошибок и 5xx
        var isRetryable = err.message.indexOf('HTTP 5') === 0 || 
                          err.message.indexOf('Failed to fetch') === 0 ||
                          err.message.indexOf('NetworkError') === 0;

        if (isRetryable && attempt < maxReconnectAttempts) {
          reconnectAttempts = attempt;
          var delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // 2s, 4s, 8s
          showError('Сервер недоступен. Повторная попытка через ' + (delay / 1000) + ' сек...');
          setTimeout(function () {
            apiSend(payload, attempt + 1);
          }, delay);
        } else {
          showError(
            'Не удалось получить ответ — сервис на секунду задумался. ' +
            'Напишите ещё раз или попробуйте через минуту.'
          );
        }
      })
      .finally(function () {
        pending = false;
        input.disabled = false;
        sendBtn.disabled = false;
        if (panel.classList.contains('open')) {
          try { input.focus(); } catch (e) {}
        }
      });
  }

  function send(text) {
    text = (text || '').trim();
    if (!text || pending) return;
    addBubble(text, 'user');
    input.value = '';
    apiSend({ message: text });
  }

  /* ---------- события ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    send(input.value);
  });

  quick.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (chip) send(chip.textContent);
  });

  function openPanel(prefill) {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    updateFabAria(true);
    if (!greeted) {
      if (historyLoaded) {
        // История уже проверена (и пуста) — можно сразу просить приветствие.
        greeted = true;
        apiSend({ message: '' });
      } else {
        // История ещё грузится: подождём её, чтобы не показать приветствие
        // раньше восстановленной переписки (иначе порядок сообщений едет).
        pendingGreetOnHistory = true;
      }
    }
    if (prefill && prefill.trim()) {
      setTimeout(function () { send(prefill); }, 300);
    } else {
      setTimeout(function () { try { input.focus(); } catch (e) {} }, 350);
    }
  }
  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    updateFabAria(false);
  }

  fab.addEventListener('click', function () {
    if (panel.classList.contains('open')) closePanel();
    else openPanel('');
  });
  closeBtn.addEventListener('click', closePanel);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
  });

  /* ---------- Online/Offline detection ---------- */
  window.addEventListener('online', function () {
    isOnline = true;
    // Попытка восстановить историю при восстановлении связи
    if (panel.classList.contains('open') && !greeted) {
      loadHistory();
    }
  });
  window.addEventListener('offline', function () {
    isOnline = false;
  });

  /* ---------- восстановление истории после перезагрузки ---------- */
  var historyLoaded = false;
  var pendingGreetOnHistory = false;

  function loadHistory() {
    fetch(HISTORY_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.messages && data.messages.length) {
          data.messages.forEach(function (m) {
            addBubble(m.text, m.role, m.estimate || null);
            if (m.submitted) addSubmittedNote();
          });
          greeted = true;
        }
      })
      .catch(function () {})
      .finally(function () {
        historyLoaded = true;
        // Пользователь успел открыть чат, пока история ещё грузилась —
        // досылаем приветствие теперь, раз оказалось, что истории нет.
        if (pendingGreetOnHistory && !greeted) {
          greeted = true;
          apiSend({ message: '' });
        }
        pendingGreetOnHistory = false;
      });
  }

  loadHistory();

  /* ---------- публичный API ---------- */
  window.CodWayChat = {
    open: openPanel,
    close: closePanel,
    ask: function (text) {
      openPanel('');
      setTimeout(function () { send(text); }, 400);
    }
  };
})();