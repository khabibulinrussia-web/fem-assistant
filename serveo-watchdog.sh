#!/bin/bash
LOG_FILE="/tmp/serveo_watchdog.log"
HEALTH_URL="http://localhost:8000/api/health"
VERCEL_TOKEN="your_vercel_token_here"

echo "$(date): Watchdog started" > "$LOG_FILE"

while true; do
    # Проверка uvicorn
    if ! curl -sf --max-time 5 "$HEALTH_URL" > /dev/null 2>&1; then
        echo "$(date): uvicorn DOWN, restarting..." >> "$LOG_FILE"
        pkill -f "uvicorn main:app" 2>/dev/null
        sleep 2
        cd /Users/dennai/Desktop/ФЭМ/fem-assistant/backend && \
        /usr/local/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/fem-api.log 2>&1 &
        echo "$(date): uvicorn restarted (PID: $!)" >> "$LOG_FILE"
        sleep 5
    fi

    # Получаем текущий URL serveo
    CUR_URL=$(cat /tmp/serveo_launchd.log 2>/dev/null | grep -o 'https://[a-z0-9.-]*\.serveousercontent\.com' | tail -1)
    
    if [ -n "$CUR_URL" ]; then
        VERCEL_URL=$(/usr/local/bin/vercel env ls SERVEO_URL --token "$VERCEL_TOKEN" -A /Users/dennai/Desktop/ФЭМ/fem-assistant/frontend/.vercel/project.json 2>/dev/null | grep -o 'https://[a-z0-9.-]*\.serveousercontent\.com' | head -1)
        
        if [ "$CUR_URL" != "$VERCEL_URL" ] && [ -n "$VERCEL_URL" ]; then
            echo "$(date): URL changed: $VERCEL_URL → $CUR_URL" >> "$LOG_FILE"
            echo "$CUR_URL" | /usr/local/bin/vercel env rm SERVEO_URL production --yes --token "$VERCEL_TOKEN" -A /Users/dennai/Desktop/ФЭМ/fem-assistant/frontend/.vercel/project.json 2>> "$LOG_FILE"
            sleep 2
            echo "$CUR_URL" | /usr/local/bin/vercel env add SERVEO_URL production --token "$VERCEL_TOKEN" -A /Users/dennai/Desktop/ФЭМ/fem-assistant/frontend/.vercel/project.json 2>> "$LOG_FILE"
            sleep 2
            cd /Users/dennai/Desktop/ФЭМ/fem-assistant/frontend && \
            /usr/local/bin/vercel deploy --prod --force --yes --token "$VERCEL_TOKEN" >> /tmp/vercel_redeploy.log 2>&1
            echo "$(date): Redeploy done" >> "$LOG_FILE"
        fi
    fi
    
    sleep 60
done
