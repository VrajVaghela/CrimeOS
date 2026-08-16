@echo off
title Ollama Server
echo Starting Ollama with models directory E:\models\ollama...
set OLLAMA_MODELS=E:\models\ollama
"E:\programs\ollama\ollama.exe" serve
pause
