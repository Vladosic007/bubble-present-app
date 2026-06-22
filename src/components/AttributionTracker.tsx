"use client";
import { useEffect } from 'react';

// Ловит источник трафика из ссылки и запоминает САМЫЙ ПЕРВЫЙ (first-touch).
// Поддерживает ?from=vk_ads и стандартные UTM (?utm_source=...).
// Пример ссылок:
//   bubblepresent.ru/?from=vk_ads
//   bubblepresent.ru/?from=bloger_ivan
//   bubblepresent.ru/?utm_source=instagram&utm_campaign=stories
export default function AttributionTracker() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get('from') || params.get('utm_source') || params.get('ref');
      if (!raw) return;

      // Чистим метку: только латиница/цифры/_/-, до 40 символов
      const source = raw.toLowerCase().replace(/[^a-z0-9_\-]/g, '').slice(0, 40);
      if (!source) return;

      // First-touch: пишем только если источника ещё нет
      if (!localStorage.getItem('bubble_source')) {
        localStorage.setItem('bubble_source', source);
        localStorage.setItem('bubble_source_at', new Date().toISOString());
      }
    } catch {}
  }, []);

  return null;
}
