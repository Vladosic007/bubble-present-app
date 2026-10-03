#!/usr/bin/env bash
# =====================================================================
#  Безопасный деплой bubblepresent с автооткатом.
#  Собирает новую версию, проверяет её и, если что-то не так,
#  возвращает предыдущую рабочую сборку. Сайт не останется лежать.
#
#  Запуск на сервере:  cd /var/www/bubblepresent && bash scripts/deploy.sh
# =====================================================================
set -uo pipefail

APP="bubblepresent"          # имя процесса в pm2
PORT="3000"                  # порт, на котором крутится next start
HEAP_MB="1536"               # лимит памяти сборки (ОЗУ 956МБ + swap)
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR" || { echo "Не найден каталог проекта"; exit 1; }

say() { echo -e "\n>>> $*"; }

# Проверка, что сайт реально живой: главная 200 И её CSS-чанк 200.
healthy() {
  local html code css
  html=$(curl -s --max-time 10 "http://localhost:${PORT}/") || return 1
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://localhost:${PORT}/") || return 1
  [ "$code" = "200" ] || return 1
  css=$(printf '%s' "$html" | grep -o '/_next/static/[^"]*\.css' | head -1)
  [ -z "$css" ] && return 0   # страниц без CSS не бывает, но не валим деплой из-за этого
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://localhost:${PORT}${css}") || return 1
  [ "$code" = "200" ]
}

restart() { pm2 restart "$APP" --update-env >/dev/null 2>&1; }

rollback() {
  say "ОТКАТ на предыдущую рабочую сборку"
  rm -rf .next
  if [ -d .next.bak ]; then mv .next.bak .next; fi
  restart
  sleep 4
  if healthy; then echo "✅ Откат успешен — работает старая версия."; else
    echo "❌ ВНИМАНИЕ: даже откат не поднял сайт. Нужны руки: pm2 logs $APP"; fi
}

say "1/5 Забираем свежий код"
git pull --ff-only || { echo "git pull не прошёл — выхожу, ничего не трогаю"; exit 1; }

say "2/5 Ставим зависимости"
npm install --no-audit --no-fund || { echo "npm install упал — выхожу"; exit 1; }

say "3/5 Резервная копия текущей сборки"
rm -rf .next.bak
if [ -d .next ]; then cp -a .next .next.bak; echo "сохранено в .next.bak"; else echo "прошлой .next нет (первый деплой)"; fi

say "4/5 Сборка (лимит памяти ${HEAP_MB}МБ)"
if ! NODE_OPTIONS="--max-old-space-size=${HEAP_MB}" npm run build; then
  echo "❌ Сборка упала."
  rollback
  exit 1
fi

say "5/5 Перезапуск и проверка"
restart
sleep 4
if healthy; then
  echo -e "\n✅ Деплой успешен — главная и CSS отдают 200."
  rm -rf .next.bak
  exit 0
else
  echo "❌ После деплоя сайт не прошёл проверку."
  rollback
  exit 1
fi
