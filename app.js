const CONFIG = {
    API_KEY: 'REPLACED_BY_GITHUB_ACTION', 
    CAL_ID: 'aee6168afa0d10e2d826bf94cca06f6ceb5226e6e42ccaf903b285aa403c4aad@group.calendar.google.com',
    SQUARE_URL: 'https://get-loaded-256.square.site/s/order',
    BASE_ADDR: "1001 Ryland Pike Suite C, Huntsville, AL 35811"
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
            display.innerHTML += `<div class="bot-msg"><strong>PAYLOAD:</strong> 🚀 Comm-link established. Everything is loaded but our cooks. How can I assist your mission?</div>`;
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
    let res = "Coordinates not found. Try asking about our 'menu', 'hours', or 'location'.";

    if (input.includes("menu") || input.includes("potato") || input.includes("fry")) {
        res = "🔥 <strong>THE PAYLOAD MENU:</strong><br>" + extractSection("## 3. Menu Details");
    } else if (input.includes("order")) {
        res = `Initiating order sequence... <a href="${CONFIG.SQUARE_URL}" target="_blank" style="color:var(--get-loaded-yellow); font-weight:bold;">CLICK HERE TO ORDER</a>.`;
    } else if (input.includes("where") || input.includes("location") || input.includes("today")) {
        res = await getTruckLocation();
    } else if (input.includes("contact") || input.includes("phone") || input.includes("catering")) {
        res = `📞 Dispatch: <a href="tel:2566529028" style="color:var(--get-loaded-yellow)">(256) 652-9028</a><br>📧 Email: <a href="mailto:Getloaded256@gmail.com" style="color:var(--get-loaded-yellow)">Getloaded256@gmail.com</a>`;
    }

    display.innerHTML += `<div class="bot-msg"><strong>PAYLOAD:</strong> ${res}</div>`;
    inputEl.value = "";
    display.scrollTop = display.scrollHeight;
}

function openContact() {
    toggleChat();
    const display = document.getElementById('chat-display');
    display.innerHTML += `<div class="bot-msg"><strong>PAYLOAD:</strong> Mission Control is standing by. Call <strong>(256) 652-9028</strong> or email <strong>Getloaded256@gmail.com</strong>.</div>`;
    display.scrollTop = display.scrollHeight;
}

function extractSection(header) {
    if(!kbContent) return "Decrypting files...";
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
        const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?timeMin=${now.toISOString()}&key=${CONFIG.API_KEY}&singleEvents=true&maxResults=1&orderBy=startTime`);
        const d = await r.json();
        
        if (d.items && d.items.length > 0) {
            const event = d.items[0];
            const start = new Date(event.start.dateTime || event.start.date);
            const end = new Date(event.end.dateTime || event.end.date);
            const loc = event.location || "";
            const mapBtn = loc ? `<br><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}" target="_blank" class="btn-yellow" style="margin-top:10px; font-size:0.8rem; padding:5px 10px; display:inline-block;">📍 NAVIGATE TO PAYLOAD</a>` : "";

            if (now >= start && now <= end) {
                return `STATUS: 🟢 LIVE<br><strong>Location: ${event.summary}</strong><br>${loc}${mapBtn}`;
            }
            return `STATUS: 🏠 AT KITCHEN<br><strong>Next Drop:</strong> ${event.summary}<br>Arrival: Today at ${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}${mapBtn}`;
        }
        return `STATUS: 🏠 AT KITCHEN<br>Preparing for the next run. Check back soon!`;
    } catch (e) {
        return `Unable to reach truck. Check social media for updates!`;
    }
}

async function updateLiveStatus() {
    document.getElementById('status').innerHTML = await getTruckLocation();
}

function openCalendar() { document.getElementById('calendar-modal').style.display = 'flex'; }
function closeCalendar() { document.getElementById('calendar-modal').style.display = 'none'; }
window.onclick = (e) => { if (e.target == document.getElementById('calendar-modal')) closeCalendar(); }