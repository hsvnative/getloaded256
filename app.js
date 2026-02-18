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
            display.innerHTML += `<div class="bot-msg"><strong>PAYLOAD:</strong> System active. How can I help you today?</div>`;
            display.scrollTop = display.scrollHeight;
            hasGreeted = true;
        }, 500);
    }
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
    let res = "I didn't recognize that. Please ask about our 'menu', 'hours', or 'location'.";

    if (input.includes("menu") || input.includes("potato") || input.includes("fry")) {
        res = "<strong>CURRENT MENU:</strong><br>" + extractSection("## 3. Menu Details");
    } else if (input.includes("hours") || input.includes("open") || input.includes("time")) {
        res = "<strong>OPERATING HOURS:</strong><br>" + extractSection("## 1c. Hours");
    } else if (input.includes("order")) {
        res = `You can <a href="${CONFIG.SQUARE_URL}" target="_blank" style="color:var(--get-loaded-yellow); font-weight:bold;">ORDER HERE</a> for pickup`;
    } else if (input.includes("where") || input.includes("location") || input.includes("today")) {
        res = await getTruckLocation();
    } else if (input.includes("contact") || input.includes("phone") || input.includes("catering")) {
        res = `📞 Phone: <a href="tel:2566529028" style="color:var(--get-loaded-yellow)">(256) 652-9028</a><br>📧 Email: <a href="mailto:Getloaded256@gmail.com" style="color:var(--get-loaded-yellow)">Getloaded256@gmail.com</a>`;
    }

    display.innerHTML += `<div class="bot-msg"><strong>PAYLOAD:</strong> ${res}</div>`;
    inputEl.value = "";
    display.scrollTop = display.scrollHeight;
}

function openContact() {
    const box = document.getElementById('chat-box');
    if (box.classList.contains('chat-hidden')) toggleChat();
    const display = document.getElementById('chat-display');
    display.innerHTML += `<div class="bot-msg"><strong>PAYLOAD:</strong> For catering or questions, call <strong>(256) 652-9028</strong> or email <strong>Getloaded256@gmail.com</strong></div>`;
    display.scrollTop = display.scrollHeight;
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
                const mapBtn = loc ? `<br><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}" target="_blank" class="btn-yellow" style="margin-top:10px; font-size:0.8rem; padding:5px 10px; display:inline-block;">📍 GET DIRECTIONS</a>` : "";
                return `STATUS: 🟢 LIVE<br><strong>Location: ${liveEvent.summary}</strong><br>${loc}${mapBtn}`;
            }

            const nextEvent = d.items.find(e => {
                const s = new Date(e.start.dateTime || e.start.date);
                return s > now;
            });

            if (nextEvent) {
                const s = new Date(nextEvent.start.dateTime || nextEvent.start.date);
                const loc = nextEvent.location || "";
                const mapBtn = loc ? `<br><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}" target="_blank" class="btn-yellow" style="margin-top:10px; font-size:0.8rem; padding:5px 10px; display:inline-block;">📍 GET DIRECTIONS</a>` : "";
                return `STATUS: 🏠 AT KITCHEN<br><strong>Next Stop:</strong> ${nextEvent.summary}<br>Arrival: Today at ${s.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}${mapBtn}`;
            }
        }
        return `STATUS: 🏠 AT KITCHEN<br>Preparing for the next run.`;
    } catch (e) {
        return `STATUS: 🏠 AT KITCHEN`;
    }
}

async function updateLiveStatus() {
    const status = await getTruckLocation();
    document.getElementById('status').innerHTML = status;
}

function openCalendar() { document.getElementById('calendar-modal').style.display = 'flex'; }
function closeCalendar() { document.getElementById('calendar-modal').style.display = 'none'; }
window.onclick = (e) => { if (e.target == document.getElementById('calendar-modal')) closeCalendar(); }