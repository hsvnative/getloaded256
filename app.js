const CONFIG = {
    API_KEY: 'REPLACED_BY_GITHUB_ACTION', 
    CAL_ID: 'aee6168afa0d10e2d826bf94cca06f6ceb5226e6e42ccaf903b285aa403c4aad@group.calendar.google.com',
    SQUARE_URL: 'https://get-loaded-256.square.site/s/order'
};

let kbContent = "";
let hasGreeted = false;

window.onload = () => {
    fetch('knowledge_base.md').then(r => r.text()).then(d => { kbContent = d; });
    updateLiveStatus();
};

function toggleChat() {
    const box = document.getElementById('chat-box');
    const display = document.getElementById('chat-display');
    box.classList.toggle('chat-hidden');
    
    if (!box.classList.contains('chat-hidden') && !hasGreeted) {
        setTimeout(() => {
            // Greeting without "PAYLOAD:" prefix
            display.innerHTML += `<div class="bot-msg">Scheduling and most questions can be found right here in this chat. If you need to contact us directly, click the <strong>CONTACT & CATERING</strong> button below.</div>`;
            display.scrollTop = display.scrollHeight;
            hasGreeted = true;
        }, 500);
    }
}

function openContact() {
    const display = document.getElementById('chat-display');
    // Direct contact info WITH "PAYLOAD:" prefix as requested
    display.innerHTML += `<div class="bot-msg"><strong>PAYLOAD:</strong> You can reach us directly at <strong>(256) 652-9028</strong> or email <strong>Getloaded256@gmail.com</strong></div>`;
    display.scrollTop = display.scrollHeight;
}

async function handleChat() {
    const inputEl = document.getElementById('user-input');
    const input = inputEl.value.trim().toLowerCase();
    const display = document.getElementById('chat-display');
    if(!input) return;

    display.innerHTML += `<div class="user-msg">${input}</div>`;
    let res = "I didn't recognize that. Please ask about our 'menu', 'hours', or 'location'.";

    if (input.includes("menu") || input.includes("potato") || input.includes("fry")) {
        res = "<strong>CURRENT MENU:</strong><br>" + extractSection("## 3. Menu Details");
    } else if (input.includes("hours") || input.includes("open") || input.includes("time")) {
        res = "<strong>OPERATING HOURS:</strong><br>" + extractSection("## 1c. Hours");
    } else if (input.includes("order")) {
        res = `You can <a href="${CONFIG.SQUARE_URL}" target="_blank" style="color:var(--get-loaded-yellow); font-weight:bold;">ORDER HERE</a> for pickup`;
    } else if (input.includes("where") || input.includes("location") || input.includes("today")) {
        res = await getTruckLocation();
    }

    display.innerHTML += `<div class="bot-msg"><strong>PAYLOAD:</strong> ${res}</div>`;
    inputEl.value = "";
    display.scrollTop = display.scrollHeight;
}

// Logic for Calendar Status
async function getTruckLocation() {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?timeMin=${startOfDay}&singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}`;
        
        const r = await fetch(url);
        const d = await r.json();
        
        if (d.items && d.items.length > 0) {
            const liveEvent = d.items.find(e => {
                const s = new Date(e.start.dateTime || e.start.date);
                const n = new Date(e.end.dateTime || e.end.date);
                return now >= s && now <= n;
            });

            if (liveEvent) {
                const loc = liveEvent.location || "";
                return `STATUS: 🟢 LIVE<br><strong>Location: ${liveEvent.summary}</strong><br>${loc}`;
            }

            const nextEvent = d.items.find(e => {
                const s = new Date(e.start.dateTime || e.start.date);
                return s > now;
            });

            if (nextEvent) {
                const s = new Date(nextEvent.start.dateTime || nextEvent.start.date);
                return `STATUS: 🏠 AT KITCHEN<br><strong>Next Stop:</strong> ${nextEvent.summary}<br>Arrival: ${s.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            }
        }
        return `STATUS: 🏠 AT KITCHEN<br>Preparing for the next run.`;
    } catch (e) {
        return `STATUS: 🏠 AT KITCHEN`;
    }
}

function updateLiveStatus() {
    getTruckLocation().then(status => {
        document.getElementById('status').innerHTML = status;
    });
}

function extractSection(header) {
    if(!kbContent) return "Loading data...";
    const lines = kbContent.split('\n');
    let out = "", active = false;
    for (let l of lines) {
        if (l.toLowerCase().includes(header.toLowerCase())) { active = true; continue; }
        if (active && (l.startsWith('##'))) break;
        if (active) out += l.replace(/\*/g, '').trim() + "<br>";
    }
    return out;
}