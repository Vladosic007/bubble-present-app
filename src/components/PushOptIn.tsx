"use client";
import { useState, useEffect } from 'react';

// Регистрирует service worker и предлагает включить push-уведомления.
// Показывает аккуратную плашку только если: есть телефон, поддержка есть, разрешение ещё не дано/не отклонено навсегда, и пользователь не скрывал.
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushOptIn() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Регистрируем SW в фоне
    navigator.serviceWorker.register('/sw.js').catch(() => {});

    const phone = localStorage.getItem('bubble_user_phone');
    const dismissed = localStorage.getItem('bubble_push_dismissed');
    const perm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';

    // Показываем плашку только залогиненным, если ещё не решили и не скрывали
    if (phone && perm === 'default' && !dismissed) {
      const t = setTimeout(() => setShow(true), 2500); // не сразу, чтоб не раздражать
      return () => clearTimeout(t);
    }
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setShow(false); localStorage.setItem('bubble_push_dismissed', '1'); setBusy(false); return; }

      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch('/api/push/public-key').then(r => r.json());
      if (!keyRes.key) { setShow(false); setBusy(false); return; }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyRes.key),
      });

      const phone = localStorage.getItem('bubble_user_phone');
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, subscription: sub }),
      });
      setShow(false);
    } catch {
      setShow(false);
    }
    setBusy(false);
  };

  const dismiss = () => {
    localStorage.setItem('bubble_push_dismissed', '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-[90px] left-1/2 -translate-x-1/2 z-[9998] w-[340px] max-w-[92vw] bg-white rounded-[18px] shadow-[0_8px_30px_rgba(255,0,140,0.25)] border border-[#FF008C]/20 p-[14px] flex items-center gap-[12px]">
      <span className="text-[26px]">🔔</span>
      <div className="flex flex-col flex-1">
        <span className="font-['Benzin'] font-extrabold text-[11px] text-[#333] uppercase leading-tight">Уведомления о заказе</span>
        <span className="font-['Arial'] font-bold text-[9px] text-[#949494]">Сообщим, когда заказ готов, и о бонусах 🪙</span>
      </div>
      <div className="flex flex-col gap-[4px] shrink-0">
        <button onClick={enable} disabled={busy} className="h-[30px] px-[12px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white rounded-[10px] font-['Benzin'] font-extrabold text-[9px] uppercase active:scale-95 disabled:opacity-50">Включить</button>
        <button onClick={dismiss} className="h-[20px] text-[#949494] font-['Arial'] font-bold text-[8px] uppercase">Позже</button>
      </div>
    </div>
  );
}
