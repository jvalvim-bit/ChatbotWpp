# ⚖️ Fonseca & Macedo Advogados – Chatbot WhatsApp

Bot de atendimento automático via WhatsApp para o escritório **Fonseca & Macedo Advogados**.
Funciona 100% gratuito usando o seu PC como servidor.

---

## 🚀 Como instalar e usar

### Pré-requisitos
- **Node.js v18 ou superior** → [Baixar em nodejs.org](https://nodejs.org)
- Google Chrome ou Chromium instalado no PC
- O PC deve estar ligado e conectado à internet durante o atendimento

### Instalação (primeira vez)

**No Windows:**
1. Abra o **Prompt de Comando** (cmd) ou PowerShell
2. Navegue até a pasta do bot:
   ```
   cd C:\caminho\para\fonseca-macedo-bot
   ```
3. Instale as dependências:
   ```
   npm install
   ```
4. Inicie o bot:
   ```
   node src/bot.js
   ```

**No Linux/Mac:**
1. Abra o terminal
2. Navegue até a pasta:
   ```
   cd /caminho/para/fonseca-macedo-bot
   ```
3. Dê permissão e execute:
   ```
   chmod +x iniciar.sh
   ./iniciar.sh
   ```

### Conectar o WhatsApp
1. Após iniciar, abra o navegador em: **http://localhost:3000**
2. Um QR Code aparecerá na tela (e também no terminal)
3. No WhatsApp do número **(98) 93300-5417**:
   - Toque em ⋮ (três pontinhos) → **Dispositivos Conectados**
   - Toque em **Conectar dispositivo**
   - Escaneie o QR Code
4. O painel ficará verde: **Bot Online!** ✅

---

## 💬 Fluxo do atendimento

Quando um cliente envia qualquer mensagem, recebe:

```
Olá, [Nome]! 👋

Seja bem-vindo ao atendimento do escritório Fonseca & Macedo Advogados.

1️⃣ – Consulta jurídica
2️⃣ – Agendar reunião
3️⃣ – Acompanhar processo
4️⃣ – Nossas áreas de atuação
5️⃣ – Honorários e pagamentos
6️⃣ – Falar com um advogado
0️⃣ – Encerrar atendimento
```

### Opções disponíveis:
| Opção | Função |
|-------|--------|
| 1 | Coleta a descrição do caso e registra para retorno |
| 2 | Coleta nome, telefone e assunto para agendamento |
| 3 | Orienta sobre acompanhamento processual |
| 4 | Lista as 5 áreas de atuação com detalhes |
| 5 | Informa sobre honorários e formas de pagamento |
| 6 | Registra mensagem para retorno do advogado |

---

## 🖥️ Painel de controle (http://localhost:3000)

- **QR Code** para conectar o WhatsApp
- **Estatísticas** em tempo real (mensagens, sessões ativas)
- **Log** de todas as conversas
- **Envio manual** de mensagens para qualquer número

---

## ⚙️ Personalização

Edite o arquivo `src/bot.js` e altere a seção `ESCRITORIO`:

```javascript
const ESCRITORIO = {
  nome: 'Fonseca & Macedo Advogados',
  numero: '98933005417',
  horario: 'Segunda a Sexta, das 8h às 18h',
  email: 'contato@fonsecaemacedo.adv.br',
  endereco: 'São Luís - MA',
  areas: ['Direito Civil', 'Direito Trabalhista', ...]
};
```

---

## 🔄 Manter o bot rodando

Para que o bot fique ativo mesmo ao fechar o terminal:

**Com PM2 (recomendado):**
```bash
npm install -g pm2
pm2 start src/bot.js --name "bot-fonseca"
pm2 startup   # inicia automaticamente ao ligar o PC
pm2 save
```

---

## ❓ Problemas comuns

| Problema | Solução |
|----------|---------|
| "Chrome not found" | Instale o Google Chrome |
| QR Code não aparece | Aguarde 30s e recarregue a página |
| Bot desconectou | Delete a pasta `.wwebjs_auth` e reconecte |
| Porta 3000 ocupada | Altere `PORT = 3000` no bot.js |

---

## 📁 Estrutura dos arquivos

```
fonseca-macedo-bot/
├── src/
│   └── bot.js          ← Lógica principal do bot
├── public/
│   └── index.html      ← Painel web de controle
├── package.json        ← Configurações e dependências
├── iniciar.sh          ← Script de inicialização (Linux/Mac)
└── README.md           ← Este arquivo
```

---

**Fonseca & Macedo Advogados** | (98) 93300-5417 | São Luís – MA
