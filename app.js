const CONFIG = {
    API_KEY: 'YOUR_GOOGLE_API_KEY',
    CAL_ID: 'YOUR_CALENDAR_ID',
    SQUARE_URL: 'https://get-loaded-256.square.site/s/order',
    BASE_ADDR: "1001 Ryland Pike Suite C, Huntsville, AL 35811"
};

let kbContent = "";

window.onload = () => {
    fetch('knowledge_base.md').then(r => r.text()).then(d => { kbContent = d; });
    updateLiveStatus();
};

function toggleChat() {
    const box = document.getElementById('chat-box');
    const icon = document.getElementById('launcher-icon');
    box.classList.toggle('chat-hidden');
    icon.innerText = box.classList.contains('chat-hidden') ? "💬" : "▼";
}

function quickReply(text) {
    document.getElementById('user-input').value = text;
    handleChat();
}

async function handleChat() {
    const inputEl = document.getElementById('user-input');
    const input = inputEl.value.trim().toLowerCase();
    const display = document.getElementById('chat-display');
    if(!input) return;

    display.innerHTML += `<div class="user-msg">${input}</div>`;
    let res = "I'm a BBQ bot, not a mind reader! Try asking about 'menu' or 'ordering'.";

    if (input.includes("menu") || input.includes("potato") || input.includes("fry")) {
        res = "🔥 <strong>THE MENU:</strong><br>" + extractSection("## 3. Menu Details");
    } 
    else if (input.includes("order") || input.includes("hungry") || input.includes("buy")) {
        res = `Skip the line! <a href="${CONFIG.SQUARE_URL}" target="_blank" class="btn-yellow">CLICK HERE TO ORDER</a>.`;
    }
    else if (input.includes("book") || input.includes("private") || input.includes("event")) {
        res = "<strong>Booking Info:</strong><br>" + extractSection("## 2. Private Booking Requirements");
    } 
    else if (input.includes("where") || input.includes("location") || input.includes("today")) {
        res = await getTruckLocation();
    }

    display.innerHTML += `<div class="bot-msg"><strong>Bot:</strong> ${res}</div>`;
    inputEl.value = "";
    display.scrollTop = display.scrollHeight;
}

function extractSection(header) {
    if(!kbContent) return "System loading...";
    const lines = kbContent.split('\n');
    let out = "", active = false;
    for (let l of lines) {
        if (l.toLowerCase().includes(header.toLowerCase())) { active = true; continue; }
        if (active && (l.startsWith('##') || l.startsWith('###'))) break;
        if (active) out += l.replace(/\*/g, '').trim() + "<br>";
    }
    return out;
}

async function getTruckLocation() {
    try {
        const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?timeMin=${new Date().toISOString()}&key=${CONFIG.API_KEY}&singleEvents=true&maxResults=1`);
        const d = await r.json();
        if (d.items && d.items.length > 0) {
            return `🚚 <strong>THE TRUCK IS OUT!</strong><br>${d.items[0].summary}<br>${d.items[0].location || 'Huntsville'}`;
        }
        return `Truck is at base today: ${CONFIG.BASE_ADDR}`;
    } catch { return `Find us at ${CONFIG.BASE_ADDR}`; }
}

async function updateLiveStatus() {
    document.getElementById('status').innerHTML = await getTruckLocation();
}