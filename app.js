const CONFIG = {
    API_KEY: 'YOUR_ACTUAL_API_KEY', 
    CAL_ID: 'aee6168afa0d10e2d826bf94cca06f6ceb5226e6e42ccaf903b285aa403c4aad@group.calendar.google.com'
};

// --- UI CONTROLS ---
function toggleChat() {
    const chatBox = document.getElementById('chat-box');
    const display = document.getElementById('chat-display');
    if (!chatBox) return;
    chatBox.classList.toggle('chat-hidden');
    if (!chatBox.classList.contains('chat-hidden') && display.innerHTML === "") {
        renderPayloadReply("Payload System Online. Ask 'Is Friday free?' or check a date like '2/24'.");
    }
}

function renderPayloadReply(text) {
    const display = document.getElementById('chat-display');
    if (!display) return;
    const msgDiv = document.createElement('div');
    msgDiv.style.marginBottom = "15px";
    msgDiv.innerHTML = `<span style="color:var(--neon-yellow); font-weight:bold;">PAYLOAD SYSTEM:</span><br>${text}`;
    display.appendChild(msgDiv);
    display.scrollTop = display.scrollHeight;
}

// --- MESSAGE HANDLING ---
async function handleChat() {
    const inputEl = document.getElementById('user-input');
    const display = document.getElementById('chat-display');
    if (!inputEl) return;
    const msg = inputEl.value.trim().toLowerCase();
    if (!msg) return;

    const userDiv = document.createElement('div');
    userDiv.style.textAlign = "right";
    userDiv.style.color = "var(--neon-yellow)";
    userDiv.style.marginBottom = "10px";
    userDiv.innerText = `YOU: ${msg}`;
    display.appendChild(userDiv);
    inputEl.value = "";

    // Expanded Intent Logic
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const isDateQuery = msg.includes("/") || msg.includes("free") || msg.includes("available") || 
                        msg.includes("today") || msg.includes("tomorrow") || 
                        dayNames.some(d => msg.includes(d));

    if (isDateQuery) {
        const loadingId = "loading-" + Date.now();
        renderPayloadReply(`<span id="${loadingId}">Scanning coordinates...</span>`);
        const reply = await checkCalendarAvailability(msg);
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.parentElement.remove();
        renderPayloadReply(reply);
    } else {
        renderPayloadReply("I specialize in bookings. Try asking 'Available this Friday?'");
    }
}

// --- CALENDAR LOGIC ---
async function checkCalendarAvailability(userMsg) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    let targetDate = new Date(todayLocal);
    let dayFound = false;

    // 1. Parse MM/DD
    const dateMatch = userMsg.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (dateMatch) {
        const month = parseInt(dateMatch[1]) - 1; 
        const day = parseInt(dateMatch[2]);
        let year = dateMatch[3] ? parseInt(dateMatch[3]) : now.getFullYear();
        if (dateMatch[3] && dateMatch[3].length === 2) year = 2000 + year;
        
        targetDate = new Date(year, month, day, 0, 0, 0, 0);
        if (!dateMatch[3] && targetDate < todayLocal) targetDate.setFullYear(now.getFullYear() + 1);
        dayFound = true;
    } 
    // 2. Parse Day Names (Friday, Tomorrow, etc.)
    else {
        if (userMsg.includes("today")) { dayFound = true; }
        else if (userMsg.includes("tomorrow")) { targetDate.setDate(now.getDate() + 1); dayFound = true; }
        else {
            const dayIndex = days.findIndex(d => userMsg.includes(d));
            if (dayIndex !== -1) {
                let daysAhead = (dayIndex - now.getDay() + 7) % 7;
                if (daysAhead === 0) daysAhead = 7; // Assume NEXT Friday if today is Friday
                targetDate.setDate(now.getDate() + daysAhead);
                dayFound = true;
            }
        }
    }

    if (!dayFound) return "Which day? (e.g., 'Friday' or '2/24')";
    if (targetDate.getTime() < todayLocal.getTime()) return "That date has passed! Try a future date.";
    if (targetDate.getDay() === 0 || targetDate.getDay() === 6) return "We are closed for private bookings on weekends.";

    const dateLabel = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    try {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}&t=${Date.now()}`;
        const r = await fetch(url);
        const data = await r.json();

        const isBusy = (hour) => (data.items || []).some(e => {
            const start = new Date(e.start.dateTime || e.start.date);
            return start.toDateString() === targetDate.toDateString() && 
                   new Date(e.start.dateTime).getHours() === hour &&
                   e.transparency !== 'transparent';
        });

        let btnHtml = `Results for <strong>${dateLabel}</strong>:<br>`;
        let availableCount = 0;

        const currentHour = now.getHours();
        const isToday = targetDate.toDateString() === now.toDateString();

        [{l:"11AM-1PM", h:11}, {l:"4PM-6PM", h:16}].forEach(s => {
            const booked = isBusy(s.h);
            const past = isToday && currentHour >= s.h;

            if (!booked && !past) {
                availableCount++;
                const mailto = `mailto:Getloaded256@gmail.com?subject=Booking Request: ${dateLabel} (${s.l})`;
                btnHtml += `<br><a href="${mailto}" style="display:inline-block; padding:10px; background:var(--neon-yellow); color:#000; text-decoration:none; font-weight:bold; border-radius:4px; margin-top:5px; border:1px solid #000;">✅ ${s.l}</a>`;
            } else {
                const status = booked ? "BOOKED" : "PASSED";
                btnHtml += `<br><span style="color:#666; font-size: 0.9rem;">❌ ${s.l} (${status})</span>`;
            }
        });

        return availableCount > 0 ? btnHtml : `Sorry, ${dateLabel} is fully booked!`;
    } catch (e) { return "Sync error. Call (256) 652-9028!"; }
}

function openCalendar() { document.getElementById('calendar-modal').style.display = 'flex'; }
function closeCalendar() { document.getElementById('calendar-modal').style.display = 'none'; }
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('user-input');
    if(input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChat(); });
});