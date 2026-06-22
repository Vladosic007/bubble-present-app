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

      // Реферальный код (?ref=КОД) — запоминаем кто пригласил (first-touch)
      const refRaw = params.get('ref');
      if (refRaw) {
        const refCode = refRaw.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
        if (refCode && !localStorage.getItem('bubble_referred_by')) {
          localStorage.setItem('bubble_referred_by', refCode);
        }
      }

      // Источник трафика (?from / ?utm_source / ?ref)
      const raw = params.get('from') || params.get('utm_source') || (refRaw ? 'referral' : null);
      if (!raw) return;
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
