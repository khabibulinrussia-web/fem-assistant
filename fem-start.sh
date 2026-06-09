#!/bin/bash
# Скрипт запуска всех процессов ФЭМ через tmux

SESSION="fem"
cd /Users/dennai/Desktop/ФЭМ/fem-assistant/backend

# Убить старую сессию если есть
tmux kill-session -t "$SESSION" 2>/dev/null
sleep 1

# Создать новую сессию, detached
tmux new-session -d -s "$SESSION" -n "uvicorn"

# Панель 0: uvicorn
tmux send-keys -t "$SESSION:0.0" "cd /Users/dennai/Desktop/ФЭМ/fem-assistant/backend && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000" Enter
sleep 2

# Панель 1: serveo tunnel
tmux split-window -h -t "$SESSION:0"
tmux send-keys -t "$SESSION:0.1" "ssh -o ServerAliveInterval=30 -R 80:localhost:8000 serveo.net" Enter
sleep 1

# Панель 2: watchdog (следит за uvicorn и serveo)
tmux split-window -v -t "$SESSION:0.0"
tmux send-keys -t "$SESSION:0.2" "while true; do
  # Проверка uvicorn
  if ! curl -sf --max-time 3 http://127.0.0.1:8000/api/health > /dev/null 2>&1; then
    echo \"[\$(date '+%H:%M:%S')] uvicorn DOWN, перезапуск...\" >> /tmp/watchdog.log
    cd /Users/dennai/Desktop/ФЭМ/fem-assistant/backend && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &
    sleep 5
  fi
  sleep 30
done" Enter

echo "✅ Все процессы запущены"
tmux ls
echo "---"
echo "Команды:"
echo "  tmux attach -t fem     — посмотреть что происходит"
echo "  Ctrl+B, затем 0/1/2    — переключение между панелями"
echo "  Ctrl+B, затем :kill-session — остановить всё"
