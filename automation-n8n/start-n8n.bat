@echo off
REM =============================================================
REM  Lance n8n en local avec les variables d'environnement chatbot
REM  Pre-requis : Node.js >= 18 installe (npx dispo)
REM =============================================================

REM --- 1. Variables (alignees avec appsettings.json -> Chatbot:ApiKey) ---
set WEBAPI_BASE_URL=http://localhost:5123
set CHATBOT_API_KEY=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

REM --- 2. Si tu utilises HTTPS (port 7178), remplace l'URL ci-dessus
REM     par https://localhost:7178 ---

REM --- 3. Pour que n8n accepte le certif self-signed du backend ASP.NET ---
set NODE_TLS_REJECT_UNAUTHORIZED=0

echo.
echo ============================================================
echo  n8n va demarrer sur http://localhost:5678
echo  WEBAPI_BASE_URL = %WEBAPI_BASE_URL%
echo  CHATBOT_API_KEY = %CHATBOT_API_KEY%
echo ============================================================
echo.
echo  Premiere fois ? Cree ton compte admin n8n puis :
echo   1. Workflows  Import from File  admin-chatbot-workflow.json
echo   2. Credentials  New  Header Auth :
echo        Name        : Groq API Key
echo        Header Name : Authorization
echo        Header Value: Bearer gsk_xxx_TA_CLE_GROQ
echo   3. Activer le workflow (toggle en haut a droite)
echo   4. Lancer test-chatbot.bat dans une autre fenetre
echo.

npx n8n
