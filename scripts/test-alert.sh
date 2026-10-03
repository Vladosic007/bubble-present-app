#!/usr/bin/env bash
# Разовая проверка: доходит ли алерт в ВК. Запуск: bash scripts/test-alert.sh
set -uo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"; cd "$DIR" || exit 1

# tail -1 — берём последнее значение; tr -d '\042\047\r' снимает кавычки и CR без возни с кавычками в консоли
getenv() { grep -E "^$1=" .env.local 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\042\047\r'; }
T="$(getenv VK_TOKEN)"
P="$(getenv VK_ALERT_PEER)"
[ -z "$P" ] && P="$(getenv VK_PEER_ID | tr ',' '\n' | head -1)"

echo "peer_id = ${P:-<ПУСТО>}"
if [ -z "$T" ]; then echo "НЕТ VK_TOKEN в .env.local"; exit 1; fi
if [ -z "$P" ]; then echo "НЕТ получателя (VK_ALERT_PEER)"; exit 1; fi

echo "Ответ ВК:"
curl -s 'https://api.vk.com/method/messages.send' \
  --data-urlencode "peer_id=${P}" \
  --data-urlencode "message=Проверка сторожа Bubble Present — если видишь это, алерты работают" \
  --data-urlencode "random_id=$(date +%s%N | cut -c1-15)" \
  --data-urlencode "access_token=${T}" \
  --data-urlencode 'v=5.131'
echo
echo "---"
echo "Если выше {\"response\":<число>} — сообщение ушло, проверь ВК."
echo "Если {\"error\"...\"901\"...} — сначала сам напиши сообществу в ВК, потом повтори."
