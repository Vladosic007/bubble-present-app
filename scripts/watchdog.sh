#!/usr/bin/env bash
# =====================================================================
#  Сторож bubblepresent. Запускается кроном раз в минуту.
#  Проверяет, что сайт жив (главная + CSS отдают 200). Если лёг:
#   1) шлёт владельцу сообщение в ВК,
#   2) пытается поднять процесс,
#   3) отписывает результат.
#  Сообщения шлёт ТОЛЬКО на смене состояния (лёг / поднялся) — не спамит.
#
#  Установка крона (один раз, на сервере):
#    (crontab -l 2>/dev/null; echo "* * * * * cd /var/www/bubblepresent && bash scripts/watchdog.sh >> /var/log/bubble-watchdog.log 2>&1") | crontab -
# =====================================================================
set -uo pipefail

APP="bubblepresent"
URL="https://bubblepresent.ru/"
PORT="3000"
STATE_FILE=".watchdog_state"      # UP / DOWN — чтобы не слать одно и то же каждую минуту
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR" || exit 1

# --- читаем токен и получателя из .env.local (без выполнения файла) ---
getenv() { grep -E "^$1=" .env.local 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"'\''\r'; }
VK_TOKEN="$(getenv VK_TOKEN)"
ALERT_PEER="$(getenv VK_ALERT_PEER)"
[ -z "$ALERT_PEER" ] && ALERT_PEER="$(getenv VK_PEER_ID | tr ',' '\n' | head -1)"   # запасной: первый из списка баристов

now() { TZ='Europe/Moscow' date '+%d.%m %H:%M'; }

vk_alert() {
  local msg="$1"
  [ -z "$VK_TOKEN" ] && return 0
  [ -z "$ALERT_PEER" ] && return 0
  curl -s --max-time 10 'https://api.vk.com/method/messages.send' \
    --data-urlencode "peer_id=${ALERT_PEER}" \
    --data-urlencode "message=${msg}" \
    --data-urlencode "random_id=$(date +%s%N | cut -c1-15)" \
    --data-urlencode "access_token=${VK_TOKEN}" \
    --data-urlencode 'v=5.131' >/dev/null 2>&1
}

# --- проверка здоровья: 3 попытки, чтобы не ловить случайный блип ---
check_once() {
  local html code css
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$URL") || return 1
  [ "$code" = "200" ] || return 1
  html=$(curl -s --max-time 10 "$URL") || return 1
  css=$(printf '%s' "$html" | grep -o '/_next/static/[^"]*\.css' | head -1)
  [ -z "$css" ] && return 0
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://bubblepresent.ru${css}") || return 1
  [ "$code" = "200" ]
}
is_healthy() {
  for i in 1 2 3; do
    if check_once; then return 0; fi
    sleep 5
  done
  return 1
}

PREV="UP"
[ -f "$STATE_FILE" ] && PREV="$(cat "$STATE_FILE")"

if is_healthy; then
  if [ "$PREV" = "DOWN" ]; then
    vk_alert "✅ Bubble Present снова работает ($(now))."
  fi
  echo "UP" > "$STATE_FILE"
  exit 0
fi

# --- сайт не прошёл проверку ---
if [ "$PREV" = "DOWN" ]; then
  # уже знали, что лежит — не спамим, просто выходим
  echo "DOWN" > "$STATE_FILE"
  exit 0
fi

# первая фиксация падения
echo "DOWN" > "$STATE_FILE"
vk_alert "🔴 Bubble Present ЛЁГ ($(now)). Пробую поднять автоматически…"

pm2 restart "$APP" --update-env >/dev/null 2>&1
sleep 8

if is_healthy; then
  echo "UP" > "$STATE_FILE"
  vk_alert "✅ Поднял автоматически, сайт работает ($(now))."
else
  vk_alert "⚠️ Автоматически поднять НЕ удалось ($(now)). Нужны руки: зайди на сервер и глянь pm2 logs ${APP}."
fi
