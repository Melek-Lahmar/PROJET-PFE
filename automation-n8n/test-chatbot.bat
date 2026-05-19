@echo off
REM =============================================================
REM  Teste le chatbot via le webhook n8n
REM  Pre-requis : n8n lance (start-n8n.bat) + workflow active
REM =============================================================

set WEBHOOK_URL=http://localhost:5678/webhook/chatbot

echo.
echo ===== Test 1 : count commandes =====
curl -s -X POST %WEBHOOK_URL% -H "Content-Type: application/json" -d "{\"question\": \"Combien de commandes livrees ce mois ?\"}"
echo.
echo.

echo ===== Test 2 : list commandes en attente =====
curl -s -X POST %WEBHOOK_URL% -H "Content-Type: application/json" -d "{\"question\": \"Liste-moi les commandes en attente\"}"
echo.
echo.

echo ===== Test 3 : reclamations non traitees =====
curl -s -X POST %WEBHOOK_URL% -H "Content-Type: application/json" -d "{\"question\": \"Combien de reclamations non traitees ?\"}"
echo.
echo.

echo ===== Test 4 : top produits =====
curl -s -X POST %WEBHOOK_URL% -H "Content-Type: application/json" -d "{\"question\": \"Quels sont les meilleurs produits ?\"}"
echo.
echo.

echo ===== Test 5 : stats gouvernorats =====
curl -s -X POST %WEBHOOK_URL% -H "Content-Type: application/json" -d "{\"question\": \"Quel gouvernorat performe le mieux ?\"}"
echo.
echo.

echo ===== Test 6 : detail commande BCTEST001 =====
curl -s -X POST %WEBHOOK_URL% -H "Content-Type: application/json" -d "{\"question\": \"Donne-moi les details de la commande BCTEST001\"}"
echo.
echo.

echo ===== Test 7 : fallback (question hors-scope) =====
curl -s -X POST %WEBHOOK_URL% -H "Content-Type: application/json" -d "{\"question\": \"Quel temps fait-il ?\"}"
echo.
echo.

pause
