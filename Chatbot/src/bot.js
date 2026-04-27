const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const qrcodeLib = require('qrcode');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// ─── CONFIGURAÇÕES DO ESCRITÓRIO ──────────────────────────────
const ESCRITORIO = {
  nome: 'Fonseca & Macedo Advogados',
  numero: '98933005417',
  horario: 'Segunda a Sexta, das 8h às 18h',
  email: 'vitoria.mdds@gmail.com',
  endereco: 'São Luís - MA',
  areas: ['Direito Civil', 'Direito Trabalhista', 'Direito Previdenciário', 'Direito do Consumidor']
  // ↑ "Direito de Família" removido conforme solicitado
};

// ─── ESTADO DAS CONVERSAS ────────────────────────────────────
const sessoes = new Map();

// Controle anti-duplicata: impede processar a mesma mensagem enquanto já está respondendo
const processando = new Set();

const logs = [];

function logMsg(tipo, numero, msg) {
  const entrada = {
    hora: new Date().toLocaleTimeString('pt-BR'),
    data: new Date().toLocaleDateString('pt-BR'),
    tipo,
    numero: numero.replace('@c.us', ''),
    msg: msg.substring(0, 100)
  };
  logs.unshift(entrada);
  if (logs.length > 200) logs.pop();
  io.emit('novo_log', entrada);
  io.emit('stats', getStats());
}

function getStats() {
  return {
    total: logs.filter(l => l.tipo === 'recebido').length,
    enviadas: logs.filter(l => l.tipo === 'enviado').length,
    sessoes: sessoes.size,
    uptime: process.uptime()
  };
}

// ─── HELPERS ─────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Envia mensagem com animação "digitando..." antes
async function sendWithTyping(client, to, message, typingMs = 1500) {
  const chat = await client.getChatById(to);
  await chat.sendStateTyping();
  await sleep(typingMs);
  await chat.clearState();
  await client.sendMessage(to, message);
  logMsg('enviado', to, message);
}

// ─── MENSAGEM DE BOAS-VINDAS DO ESCRITÓRIO ───────────────────
function msgBoasVindas() {
  return (
    `🏛️ *${ESCRITORIO.nome}*\n\n` +
    `📍 *Localização:* ${ESCRITORIO.endereco}\n` +
    `📞 *WhatsApp:* (${ESCRITORIO.numero.slice(0, 2)}) ${ESCRITORIO.numero.slice(2, 7)}-${ESCRITORIO.numero.slice(7)}\n` +
    `📧 *E-mail:* ${ESCRITORIO.email}\n` +
    `🕐 *Horário de atendimento:* ${ESCRITORIO.horario}\n\n` +
    `⚖️ *Áreas de atuação:*\n` +
    ESCRITORIO.areas.map(a => `   • ${a}`).join('\n') + '\n\n' +
    `_Comprometidos com a defesa dos seus direitos com ética e excelência._`
  );
}

// ─── MENU PRINCIPAL ──────────────────────────────────────────
function menuPrincipal(nome) {
  return (
    `Olá, *${nome}*! 👋\n\n` +
    `Seja bem-vindo ao atendimento do escritório *${ESCRITORIO.nome}*.\n\n` +
    `Por favor, escolha uma opção abaixo:\n\n` +
    `1️⃣ – Consulta jurídica\n` +
    `2️⃣ – Agendar reunião\n` +
    `3️⃣ – Acompanhar processo\n` +
    `4️⃣ – Nossas áreas de atuação\n` +
    `5️⃣ – Honorários e pagamentos\n` +
    `6️⃣ – Falar com um advogado\n` +
    `0️⃣ – Encerrar atendimento\n\n` +
    `_Digite o número da opção desejada._`
  );
}

function menuAreas() {
  const lista = ESCRITORIO.areas.map((a, i) => `${i + 1}️⃣ ${a}`).join('\n');
  return `📚 *Nossas áreas de atuação:*\n\n${lista}\n\n_Digite o número da área para saber mais, ou *menu* para voltar._`;
}

function infoArea(area) {
  const infos = {
    'Direito Civil':
      `⚖️ *Direito Civil*\n\nAtuamos em contratos, indenizações, responsabilidade civil, questões imobiliárias, heranças e inventários.\n\nAgendamos uma consulta para analisar seu caso de forma personalizada.`,
    'Direito Trabalhista':
      `👷 *Direito Trabalhista*\n\nDefendemos trabalhadores e empregadores em demissões, horas extras, desvio de função, assédio moral, rescisões e reclamatórias trabalhistas.`,
    'Direito Previdenciário':
      `🏥 *Direito Previdenciário*\n\nAuxiliamos em aposentadorias, benefícios do INSS, auxílio-doença, pensão por morte e recursos administrativos.`,
    'Direito do Consumidor':
      `🛒 *Direito do Consumidor*\n\nAtuamos em cobranças indevidas, danos morais, produtos defeituosos, propaganda enganosa e contratos abusivos.`
  };
  return (infos[area] || `Informações sobre *${area}* em breve.`) + '\n\n_Digite *menu* para voltar ao início._';
}

// ─── LÓGICA DO CHATBOT ────────────────────────────────────────
async function processarMensagem(client, msg) {
  const from = msg.from;
  const texto = msg.body.trim().toLowerCase();
  const contact = await msg.getContact();
  const nome = contact.pushname || 'Cliente';

  if (from.endsWith('@g.us')) return; // Ignorar grupos

  // ── Anti-duplicata: se já está processando este número, ignora novas msgs ──
  if (processando.has(from)) {
    console.log(`⏳ [${from}] Mensagem ignorada – ainda processando a anterior.`);
    return;
  }
  processando.add(from);

  try {
    let sessao = sessoes.get(from) || { etapa: 'inicio', dados: {} };

    // ── ENCERRADO: só responde se digitar "atendimento" ──
    if (sessao.etapa === 'encerrado') {
      if (texto === 'atendimento') {
        sessao = { etapa: 'menu', dados: { nome } };
        sessoes.set(from, sessao);
        await sendWithTyping(client, from, menuPrincipal(nome), 1500);
      }
      // Qualquer outra mensagem: silêncio total
      return;
    }

    // ── INÍCIO: boas-vindas → 3s digitando → menu ──
    if (sessao.etapa === 'inicio') {
      // 1. Envia informações do escritório com "digitando..." curto
      await sendWithTyping(client, from, msgBoasVindas(), 2500);

      // 2. Simula "digitando..." por 10 segundos antes do menu
      const chat = await client.getChatById(from);
      await chat.sendStateTyping();
      await sleep(3000);
      await chat.clearState();

      // 3. Envia o menu de atendimento
      const textoMenu = menuPrincipal(nome);
      await client.sendMessage(from, textoMenu);
      logMsg('enviado', from, textoMenu);

      sessao = { etapa: 'menu', dados: { nome } };
      sessoes.set(from, sessao);
      return;
    }

    // ── Comandos globais de reset (apenas palavras exatas ou início de frase) ──
    const palavrasReset = ['menu', 'inicio', 'início', 'voltar', 'oi', 'olá', 'ola', 'boa tarde', 'bom dia', 'boa noite'];
    if (palavrasReset.some(p => texto === p || texto.startsWith(p + ' '))) {
      sessao = { etapa: 'menu', dados: { nome } };
      sessoes.set(from, sessao);
      await sendWithTyping(client, from, menuPrincipal(nome), 1500);
      return;
    }

    let resposta = '';

    if (sessao.etapa === 'menu') {
      switch (msg.body.trim()) {
        case '1':
          sessao.etapa = 'consulta';
          resposta =
            `⚖️ *Consulta Jurídica*\n\n` +
            `Para realizarmos uma triagem do seu caso, descreva brevemente a situação que precisa de orientação jurídica.\n\n` +
            `_Seja o mais detalhado possível. Tudo é sigiloso._`;
          break;
        case '2':
          sessao.etapa = 'agendar_nome';
          resposta =
            `📅 *Agendamento de Reunião*\n\n` +
            `Vamos agendar uma consulta presencial ou por videoconferência.\n\n` +
            `Primeiro, confirme seu nome completo:`;
          break;
        case '3':
          sessao.etapa = 'processo';
          resposta =
            `🔍 *Acompanhar Processo*\n\n` +
            `Informe o *número do seu processo* (ex: 0001234-56.2024.8.10.0001) para verificarmos a situação:\n\n` +
            `_Ou informe seu CPF para busca pelo nome._`;
          break;
        case '4':
          sessao.etapa = 'areas';
          resposta = menuAreas();
          break;
        case '5':
          sessao.etapa = 'menu';
          resposta =
            `💰 *Honorários e Pagamentos*\n\n` +
            `Nossos honorários variam de acordo com a complexidade do caso e são definidos em contrato.\n\n` +
            `✅ Consulta inicial: a partir de R$ 150,00\n` +
            `✅ Parcelamento disponível\n` +
            `✅ Casos previdenciários: êxito (sem custo inicial)\n` +
            `✅ Formas de pagamento: PIX, cartão ou boleto\n\n` +
            `Agende uma consulta para análise do seu caso sem compromisso.\n\n` +
            `_Digite *menu* para voltar._`;
          break;
        case '6':
          sessao.etapa = 'advogado';
          resposta =
            `👨‍⚖️ *Falar com um Advogado*\n\n` +
            `Estamos registrando seu contato. Um de nossos advogados retornará em breve.\n\n` +
            `*Horário de atendimento:* ${ESCRITORIO.horario}\n\n` +
            `Enquanto isso, informe brevemente o assunto:`;
          break;
        case '0':
          sessao = { etapa: 'encerrado', dados: {} };
          resposta =
            `Obrigado por entrar em contato com o escritório *${ESCRITORIO.nome}*.\n\n` +
            `Se precisar de mais informações, é só nos chamar! ⚖️\n\n` +
            `_Até breve!_`;
          break;
        default:
          resposta =
            `❓ Opção não reconhecida. Por favor, digite um número de *1 a 6* ou *0* para encerrar.\n\n` +
            menuPrincipal(nome);
      }
    } else if (sessao.etapa === 'consulta') {
      sessao.etapa = 'encerrado';
      resposta =
        `✅ *Sua consulta foi registrada!*\n\n` +
        `Recebemos sua mensagem e um advogado especializado irá analisá-la.\n\n` +
        `📞 Entraremos em contato em até *1 dia útil*.\n\n` +
        `*Horário de atendimento:* ${ESCRITORIO.horario}\n` +
        `📧 ${ESCRITORIO.email}\n\n` +
        `_Se precisar de mais alguma coisa, envie *Atendimento* para reiniciar._`;
    } else if (sessao.etapa === 'agendar_nome') {
      sessao.dados.nomeAgendamento = msg.body.trim();
      sessao.etapa = 'agendar_tel';
      resposta = `📞 Qual o melhor telefone para contato, *${sessao.dados.nomeAgendamento}*?\n_(pode ser este mesmo WhatsApp)_`;
    } else if (sessao.etapa === 'agendar_tel') {
      sessao.dados.tel = msg.body.trim();
      sessao.etapa = 'agendar_assunto';
      resposta =
        `📋 Qual é o assunto da consulta?\n\n` +
        ESCRITORIO.areas.map((a, i) => `${i + 1}. ${a}`).join('\n') +
        `\n\n_Digite o número ou descreva brevemente._`;
    } else if (sessao.etapa === 'agendar_assunto') {
      sessao.dados.assunto = msg.body.trim();
      sessao.etapa = 'encerrado';
      resposta =
        `🎉 *Agendamento solicitado com sucesso!*\n\n` +
        `👤 Nome: ${sessao.dados.nomeAgendamento}\n` +
        `📞 Telefone: ${sessao.dados.tel}\n` +
        `📋 Assunto: ${sessao.dados.assunto}\n\n` +
        `Nossa equipe entrará em contato para confirmar data e horário.\n\n` +
        `*Horário de funcionamento:* ${ESCRITORIO.horario}\n\n` +
        `_Se precisar de mais alguma coisa, envie *Atendimento* para reiniciar._`;
    } else if (sessao.etapa === 'processo') {
      sessao.etapa = 'encerrado';
      resposta =
        `🔍 *Consulta de Processo*\n\n` +
        `Registramos sua solicitação de acompanhamento processual.\n\n` +
        `Um advogado verificará e te informará sobre o andamento em breve.\n\n` +
        `_Para consulta em tempo real, acesse:_\nhttps://esaj.tjma.jus.br\n\n` +
        `_Se precisar de mais alguma coisa, envie *Atendimento* para reiniciar._`;
    } else if (sessao.etapa === 'areas') {
      const idx = parseInt(msg.body.trim()) - 1;
      if (idx >= 0 && idx < ESCRITORIO.areas.length) {
        resposta = infoArea(ESCRITORIO.areas[idx]);
      } else {
        resposta = `Por favor, digite um número de *1 a ${ESCRITORIO.areas.length}* ou *menu* para voltar.`;
      }
    } else if (sessao.etapa === 'advogado') {
      sessao.etapa = 'encerrado';
      resposta =
        `📝 *Mensagem registrada!*\n\n` +
        `Assunto: _${msg.body.trim()}_\n\n` +
        `Um de nossos advogados entrará em contato o mais breve possível.\n\n` +
        `*Atendimento:* ${ESCRITORIO.horario}\n` +
        `📧 ${ESCRITORIO.email}\n\n` +
        `_Se precisar de mais alguma coisa, envie *Atendimento* para reiniciar._`;
    } else {
      sessao = { etapa: 'menu', dados: { nome } };
      resposta = menuPrincipal(nome);
    }

    sessoes.set(from, sessao);

    if (resposta) {
      await sendWithTyping(client, from, resposta, 1500);
    }

  } finally {
    // Libera o bloqueio após concluir (com margem para evitar race condition)
    setTimeout(() => processando.delete(from), 800);
  }
}

// ─── WHATSAPP CLIENT ──────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'fonseca-macedo' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  }
});

let qrDataUrl = null;
let statusBot = 'aguardando';

client.on('qr', async (qr) => {
  qrcode.generate(qr, { small: true });
  qrDataUrl = await qrcodeLib.toDataURL(qr);
  statusBot = 'aguardando_qr';
  io.emit('qr', qrDataUrl);
  io.emit('status', statusBot);
  console.log('\n📱 QR Code gerado! Escaneie pelo WhatsApp.\n');
});

client.on('ready', () => {
  statusBot = 'online';
  qrDataUrl = null;
  io.emit('status', statusBot);
  io.emit('qr', null);
  console.log(`\n✅ Bot online! Escritório: ${ESCRITORIO.nome}\n`);
});

client.on('disconnected', () => {
  statusBot = 'desconectado';
  io.emit('status', statusBot);
  console.log('\n❌ Bot desconectado.\n');
});

client.on('message', async (msg) => {
  logMsg('recebido', msg.from, msg.body);
  try {
    await processarMensagem(client, msg);
  } catch (err) {
    console.error('Erro ao processar mensagem:', err.message);
  }
});

// ─── API REST ─────────────────────────────────────────────────
app.get('/api/status', (_, res) => res.json({ status: statusBot, qr: qrDataUrl }));
app.get('/api/logs', (_, res) => res.json(logs));
app.get('/api/stats', (_, res) => res.json(getStats()));

app.post('/api/enviar', async (req, res) => {
  const { numero, mensagem } = req.body;
  if (!numero || !mensagem) return res.status(400).json({ erro: 'número e mensagem são obrigatórios' });
  try {
    const numFormatado = numero.includes('@c.us') ? numero : `55${numero.replace(/\D/g, '')}@c.us`;
    await client.sendMessage(numFormatado, mensagem);
    logMsg('enviado', numFormatado, mensagem);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ─── SOCKET.IO ────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.emit('status', statusBot);
  socket.emit('logs', logs);
  socket.emit('stats', getStats());
  if (qrDataUrl) socket.emit('qr', qrDataUrl);
});

// ─── START ────────────────────────────────────────────────────
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 Painel disponível em: http://localhost:${PORT}`);
  console.log(`📊 Escritório: ${ESCRITORIO.nome}`);
  console.log(`📱 Número: ${ESCRITORIO.numero}\n`);
});

client.initialize();
