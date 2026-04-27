#!/bin/bash
# ================================================================
# FONSECA & MACEDO ADVOGADOS – Setup do Bot WhatsApp
# ================================================================

echo ""
echo "⚖️  Fonseca & Macedo Advogados – Chatbot WhatsApp"
echo "=================================================="
echo ""

# Verifica Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js não encontrado."
  echo "👉 Instale em: https://nodejs.org (versão 18 ou superior)"
  exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js versão $NODE_VER detectada. Necessário v18+."
  exit 1
fi

echo "✅ Node.js $(node -v) encontrado."
echo ""
echo "📦 Instalando dependências..."
npm install

if [ $? -ne 0 ]; then
  echo "❌ Erro ao instalar dependências."
  exit 1
fi

echo ""
echo "✅ Dependências instaladas!"
echo ""
echo "🚀 Iniciando o bot..."
echo ""
echo "👉 Acesse o painel em: http://localhost:3000"
echo "👉 Escaneie o QR Code que aparecerá no painel ou no terminal"
echo ""
echo "Para parar o bot: Ctrl+C"
echo ""

node src/bot.js
