const CONFIG = {
    API_KEY: 'YOUR_ACTUAL_API_KEY', 
    CAL_ID: 'aee6168afa0d10e2d826bf94cca06f6ceb5226e6e42ccaf903b285aa403c4aad@group.calendar.google.com'
};

function toggleChat() {
    const chatBox = document.getElementById('chat-box');
    const display = document.getElementById('chat-display');
    if (!chatBox) return;
    chatBox.classList.toggle('chat-hidden');
    if (!chatBox.classList.contains('chat-hidden') && display.innerHTML === "") {
        renderPayloadReply("Welcome to the Payload System. Ask about availability (e.g., 'free Friday' or '2/24/27')!");
    }
}

function renderPayloadReply(text) {
    const display = document.getElementById('chat-display');
    if (!display) return;
    const msgDiv = document.createElement('div');
    msgDiv.innerHTML = `<span style="color:var(--neon-yellow); font-weight:bold;">PAYLOAD SYSTEM:</span><br>${text}`;
    display.appendChild(msgDiv);
    display.scrollTop = display.scrollHeight;
}

async function handleChat() {
    const inputEl = document.getElementById('user-input');
    const display = document.getElementById('chat-display');
    if (!inputEl) return;
    const msg = inputEl.value.trim().toLowerCase();
    if (!msg) return;

    const userDiv = document.createElement('div');
    userDiv.style.textAlign = "right";
    userDiv.style.color = "var(--neon-yellow)";
    userDiv.innerText = `YOU: ${msg}`;
    display.appendChild(userDiv);
    inputEl.value = "";

    if (msg.includes("/") || msg.includes("free") || msg.includes("available")) {
        const loadingId = "loading-" + Date.now();
        renderPayloadReply(`<span id="${loadingId}">Scanning coordinates...</span>`);
        const reply = await checkCalendarAvailability(msg);
        document.getElementById(loadingId).parentElement.remove();
        renderPayloadReply(reply);
    } else {
        renderPayloadReply("Ask me for a date like 'free 2/24/27'!");
    }
}

async function checkCalendarAvailability(userMsg) {
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    let targetDate = new Date(todayLocal);
    let dayFound = false;

    const dateMatch = userMsg.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (dateMatch) {
        const month = parseInt(dateMatch[1]) - 1; 
        const day = parseInt(dateMatch[2]);
        let year = now.getFullYear();
        if (dateMatch[3]) {
            year = parseInt(dateMatch[3]);
            if (dateMatch[3].length === 2) year = 2000 + year;
        }
        targetDate = new Date(year, month, day, 0, 0, 0, 0);
        if (!dateMatch[3] && targetDate < todayLocal) targetDate.setFullYear(now.getFullYear() + 1);
        dayFound = true;
    }

    if (!dayFound) return "Which day? (e.g., '2/24/27')";
    if (targetDate.getTime() < todayLocal.getTime()) return "That date has passed!";
    if (targetDate.getDay() === 0 || targetDate.getDay() === 6) return "We only book Mon-Fri.";

    const dateLabel = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    try {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}&t=${Date.now()}`;
        const r = await fetch(url);
        const data = await r.json();
        const isBusy = (hour) => (data.items || []).some(e => {
            const start = new Date(e.start.dateTime || e.start.date);
            return start.toDateString() === targetDate.toDateString() && new Date(e.start.dateTime).getHours() === hour;
        });

        let btnHtml = `Results for <strong>${dateLabel}</strong>:<br>`;
        [{l:"11AM-1PM", h:11}, {l:"4PM-6PM", h:16}].forEach(s => {
            if (!isBusy(s.h)) {
                const mailto = `mailto:Getloaded256@gmail.com?subject=Booking ${dateLabel}`;
                btnHtml += `<br><a href="${mailto}" style="display:inline-block; padding:10px; background:var(--neon-yellow); color:#000; text-decoration:none; font-weight:bold; border-radius:4px; margin-top:5px;">✅ ${s.l}</a>`;
            } else {
                btnHtml += `<br><span style="color:#666;">❌ ${s.l} (BOOKED)</span>`;
            }
        });
        return btnHtml;
    } catch (e) { return "Sync error. Call (256) 652-9028!"; }
}

function openCalendar() { document.getElementById('calendar-modal').style.display = 'flex'; }
function closeCalendar() { document.getElementById('calendar-modal').style.display = 'none'; }
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('user-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChat(); });
});