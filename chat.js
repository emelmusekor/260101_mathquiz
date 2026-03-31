const SUPABASE_URL = 'https://rafkwpixyuuyotebeqgj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZmt3cGl4eXV1eW90ZWJlcWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5Mzk1MTIsImV4cCI6MjA5MDUxNTUxMn0.xmMuiKJZz47QEXmhgkrR1Iw25FzAbAulOgIbt3RXZpM';

const chatNicknameInput = document.getElementById('chat-nickname');
const chatMessagesContainer = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const btnChatSend = document.getElementById('btn-chat-send');
const chatForm = document.getElementById('chat-form');

let supabaseClient = null;
const recentLocalMessages = [];

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

function updateSendButtonState() {
  const hasNickname = chatNicknameInput.value.trim().length > 0;
  const hasMessage = chatInput.value.trim().length > 0;
  btnChatSend.disabled = !(supabaseClient && hasNickname && hasMessage && !chatInput.disabled);
}

function setChatAvailability(enabled) {
  chatInput.disabled = !enabled;
  updateSendButtonState();
}

function showChatInfo(message, isError = false) {
  chatMessagesContainer.innerHTML = `
    <div class="chat-info"${isError ? ' style="color:#ef4444;"' : ''}>${escapeHTML(message)}</div>
  `;
}

function scrollToBottom() {
  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

function appendMessage(chatRow) {
  const nickname = chatRow.nickname || 'Anonymous';
  const message = chatRow.messege || chatRow.message || '';

  const messageElement = document.createElement('div');
  messageElement.className = 'chat-msg';
  messageElement.innerHTML = `
    <span class="author">${escapeHTML(nickname)}</span>
    <span>${escapeHTML(message)}</span>
  `;

  chatMessagesContainer.appendChild(messageElement);
}

function markLocalMessage(nickname, message) {
  recentLocalMessages.push({
    nickname,
    message,
    timestamp: Date.now()
  });

  while (recentLocalMessages.length > 20) {
    recentLocalMessages.shift();
  }
}

function isDuplicateRealtimeMessage(chatRow) {
  const now = Date.now();
  const message = chatRow.messege || chatRow.message || '';

  const matchedIndex = recentLocalMessages.findIndex((item) => {
    return item.nickname === chatRow.nickname
      && item.message === message
      && now - item.timestamp < 5000;
  });

  if (matchedIndex === -1) {
    return false;
  }

  recentLocalMessages.splice(matchedIndex, 1);
  return true;
}

async function loadInitialMessages() {
  const { data, error } = await supabaseClient
    .from('chat_server')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Initial chat load failed:', error);
    showChatInfo('Could not load previous messages. Check the table and RLS policy.', true);
    return;
  }

  chatMessagesContainer.innerHTML = '';
  data.reverse().forEach((row) => appendMessage(row));
  scrollToBottom();
}

function subscribeToChat() {
  supabaseClient
    .channel('public:chat_server')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_server' },
      (payload) => {
        if (isDuplicateRealtimeMessage(payload.new)) {
          return;
        }

        appendMessage(payload.new);
        scrollToBottom();
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED' && chatMessagesContainer.children.length === 0) {
        showChatInfo('No chat messages yet. Send the first one.');
      }
    });
}

async function initializeChat() {
  if (!window.supabase?.createClient) {
    showChatInfo('Supabase client library could not be loaded.', true);
    return;
  }

  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    setChatAvailability(true);
    await loadInitialMessages();
    subscribeToChat();
  } catch (error) {
    console.error('Chat initialization failed:', error);
    showChatInfo('Could not connect to Supabase chat.', true);
    setChatAvailability(false);
  }
}

chatNicknameInput.addEventListener('input', updateSendButtonState);
chatInput.addEventListener('input', updateSendButtonState);

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const nickname = chatNicknameInput.value.trim();
  const message = chatInput.value.trim();

  if (!nickname) {
    alert('Please enter a nickname first.');
    chatNicknameInput.focus();
    return;
  }

  if (!message || !supabaseClient) {
    return;
  }

  chatInput.value = '';
  updateSendButtonState();

  markLocalMessage(nickname, message);
  appendMessage({ nickname, messege: message });
  scrollToBottom();

  const { error } = await supabaseClient
    .from('chat_server')
    .insert([{ nickname, messege: message }]);

  if (error) {
    console.error('Message send failed:', error);
    appendMessage({
      nickname: 'System',
      messege: 'Message send failed. Check your Supabase table and RLS policy.'
    });
    scrollToBottom();
  }
});

initializeChat();
