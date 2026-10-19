/* ==========================================================================
   Sky-Myce — core utilities
   --------------------------------------------------------------------------
   Hashing, deterministic RNG, number/time formatting, and small DOM helpers
   shared by the homepage, the demo data generator, and the admin panel.
   Exposes: window.Sky
   ========================================================================== */

(() => {
  'use strict';

  /* ---------------------------------------------------------------- random */

  function hash(input) {
    let h = 2166136261;
    const str = String(input);
    for (let i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------ formatting */

  const numberFormat = new Intl.NumberFormat('en-US');
  const compactFormat = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

  function trimDigits(value) {
    return Number(value.toFixed(value < 10 ? 2 : 1)).toString();
  }

  function formatCoins(value) {
    const abs = Math.abs(value);
    if (abs >= 1e12) return `${trimDigits(value / 1e12)}T`;
    if (abs >= 1e9) return `${trimDigits(value / 1e9)}B`;
    if (abs >= 1e6) return `${trimDigits(value / 1e6)}M`;
    if (abs >= 1e3) return `${trimDigits(value / 1e3)}K`;
    return numberFormat.format(Math.round(value));
  }

  function formatTime(ms) {
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  function formatNumber(value) {
    return numberFormat.format(Math.round(value));
  }

  function formatCompact(value) {
    return compactFormat.format(value);
  }

  function formatValue(value, metric) {
    if (!metric) return formatNumber(value);
    if (metric.format === 'time') return formatTime(value);
    if (metric.format === 'coins') return formatCoins(value);
    if (metric.format === 'percent') return `${trimDigits(value)}%`;
    return formatNumber(value);
  }

  function formatRelative(timestamp) {
    const seconds = Math.max(0, Math.round((Date.now() - Number(timestamp)) / 1000));
    if (seconds < 45) return 'just now';
    const minutes = Math.round(seconds / 60);
    if (minutes < 2) return '1 min ago';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    const days = Math.round(hours / 24);
    return days === 1 ? 'yesterday' : `${days} days ago`;
  }

  function formatDateTime(timestamp) {
    if (!timestamp) return '—';
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
      }).format(new Date(Number(timestamp)));
    } catch {
      return '—';
    }
  }

  function initials(name) {
    const clean = String(name || '').replace(/[^a-z0-9]/gi, '');
    return (clean.slice(0, 2) || '??').toUpperCase();
  }

  function titleCase(value) {
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }

  /* ------------------------------------------------------------------- dom */

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value == null) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'html') node.innerHTML = value;
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
      else if (key in node) {
        try {
          node[key] = value;
        } catch {
          node.setAttribute(key, value);
        }
      }
      else node.setAttribute(key, value);
    }
    for (const child of children.flat()) {
      if (child == null) continue;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* --------------------------------------------------------------- timeouts */

  function debounce(fn, wait = 160) {
    let timer = 0;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), wait);
    };
  }

  window.Sky = {
    hash,
    mulberry32,
    numberFormat,
    trimDigits,
    formatCoins,
    formatTime,
    formatNumber,
    formatCompact,
    formatValue,
    formatRelative,
    formatDateTime,
    initials,
    titleCase,
    qs,
    qsa,
    el,
    escapeHtml,
    debounce
  };
})();
