// --- CONFIGURATION ---
const CONFIG = {
    API_KEY: 'YOUR_ACTUAL_API_KEY_HERE', // Change this to your real key
    CAL_ID: 'aee6168afa0d10e2d826bf94cca06f6ceb5226e6e42ccaf903b285aa403c4aad@group.calendar.google.com'
};

let lastQueriedDay = ""; 

// --- 1. UI CONTROL FUNCTIONS ---
function toggleChat() {
    const chatBox = document.getElementById('chat-box');
    const display = document.getElementById('chat-display');
    chatBox.classList.toggle('chat-hidden');
    
    // If opening for the first time, show welcome message
    if (!chatBox.classList.contains('chat-hidden') && display.innerHTML === "") {
        renderPayloadReply("Welcome. Bookings, catering requests, and general questions can be asked right here. How can we get you loaded today?");
    }
}

function openCalendar() {
    document.getElementById('calendar-modal').style.display = 'flex';
}

function closeCalendar() {
    document.getElementById('calendar-modal').style.display = 'none';
}

// Listen for "Enter" key in the input box
document.addEventListener('DOMContentLoaded', () => {
    const inputEl = document.getElementById('user-input');
    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChat();
    });
});

// --- 2. RENDER MESSAGE ---
function renderPayloadReply(text) {
    const display = document.getElementById('chat-display');
    if (!display) return;
    display.innerHTML += `<div style="text-align:left; margin:10px; font-family: Arial; color: white;"><span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black';">PAYLOAD SYSTEM:</span><br>${text}</div>`;
    display.scrollTop = display.scrollHeight;
}

// --- 3. MAIN CHAT LOGIC ---
async function handleChat() {
    const inputEl = document.getElementById('user-input');
    const display = document.getElementById('chat-display');
    if (!inputEl || !display) return;

    const msg = inputEl.value.trim().toLowerCase();
    if (!msg) return;

    // Show User Message
    display.innerHTML += `<div style="text-align:right; margin:10px; color:var(--neon-yellow); font-family: Arial; text-transform: uppercase;">YOU: ${msg}</div>`;
    inputEl.value = ""; 
    display.scrollTop = display.scrollHeight;

    // Determine Intent
    const calendarKeywords = ["available", "book", "free", "today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "next", "schedule", "/"];
    const isCalendarQuery = calendarKeywords.some(k => msg.includes(k)) || msg.match(/\d+/);

    if (isCalendarQuery) {
        const loadingId = "loading-" + Date.now();
        display.innerHTML += `<div id="${loadingId}" style="text-align:left; margin:10px; font-family: Arial; color: white;"><span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black';">PAYLOAD SYSTEM:</span> Scanning coordinates...</div>`;
        
        try {
            const availabilityReply = await checkCalendarAvailability(msg);
            document.getElementById(loadingId)?.remove();
            renderPayloadReply(availabilityReply);
        } catch (err) {
            console.error("Chat Error:", err);
            document.getElementById(loadingId)?.remove();
            renderPayloadReply("System error. Please call (256) 652-9028.");
        }
    } else if (msg.includes("menu") || msg.includes("food")) {
        renderPayloadReply("We serve Loaded Potatoes, Fries, Nachos, and Salads!");
    } else {
        renderPayloadReply("I'm not sure. Try asking if we are 'free 2/24' or 'available this Friday'!");
    }
}

// --- 4. CALENDAR LOGIC ---
async function checkCalendarAvailability(userMsg) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    now.setHours(0, 0, 0, 0); 
    
    let targetDate = new Date(now);
    let dayFound = false;

    const dateMatch = userMsg.match(/(\d{1,2})\/(\d{1,2})/);
    if (dateMatch) {
        const month = parseInt(dateMatch[1]) - 1; 
        const day = parseInt(dateMatch[2]);
        targetDate.setMonth(month);
        targetDate.setDate(day);
        targetDate.setFullYear(now.getFullYear());
        if (targetDate < now && (now.getDate() !== day || now.getMonth() !== month)) {
            targetDate.setFullYear(now.getFullYear() + 1);
        }
        dayFound = true;
    } else {
        let dayIndex = days.findIndex(d => userMsg.includes(d));
        if (userMsg.includes("today")) { dayIndex = now.getDay(); dayFound = true; }
        else if (userMsg.includes("tomorrow")) { targetDate.setDate(now.getDate() + 1); dayFound = true; }
        else if (dayIndex !== -1) {
            dayFound = true;
            let daysAhead = (dayIndex - now.getDay() + 7) % 7;
            if (daysAhead === 0 && !userMsg.includes("today")) daysAhead = 7;
            if (userMsg.includes("next")) daysAhead += 7;
            targetDate.setDate(now.getDate() + daysAhead);
        }
    }

    if (!dayFound) {
        if (lastQueriedDay !== "") {
            const lastIndex = days.indexOf(lastQueriedDay);
            let daysAhead = (lastIndex - now.getDay() + 7) % 7;
            targetDate.setDate(now.getDate() + daysAhead);
        } else {
            return "Which day? (e.g., '2/24' or 'Friday')";
        }
    }

    lastQueriedDay = days[targetDate.getDay()];
    if (targetDate < now) return "That date has already passed!";
    if (targetDate.getDay() === 0 || targetDate.getDay() === 6) return "We only book Mon-Fri.";

    const dateLabel = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    // Fetch from Google
    const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}&t=${Date.now()}`;
    const r = await fetch(url);
    const d = await r.json();

    const dayEvents = (d.items || []).filter(e => {
        const start = new Date(e.start.dateTime || e.start.date);
        return start.toDateString() === targetDate.toDateString() && e.transparency !== 'transparent';
    });

    const isBusy = (hour) => dayEvents.some(e => {
        if (!e.start.dateTime) return true;
        const s = new Date(e.start.dateTime).getHours();
        const f = new Date(e.end.dateTime).getHours();
        return hour >= s && hour < f;
    });

    let btnHtml = `Checking <strong>${dateLabel}</strong>...<br>`;
    let slots = [{l:"11AM-1PM", h:11}, {l:"4PM-6PM", h:16}];
    let anyAvailable = false;

    // 5. SUGGESTION BUTTONS
    let btnHtml = `Checking <strong>${dateLabel}</strong>...<br>`;
    let slots = [{l:"11AM-1PM", h:11}, {l:"4PM-6PM", h:16}];
    let anyAvailable = false;

    // Get the current real-time hour
    const currentHour = new Date().getHours();
    const isToday = targetDate.toDateString() === new Date().toDateString();

    slots.forEach(s => {
        const slotIsPast = isToday && currentHour >= s.h;
        const slotIsBusy = isBusy(s.h);

        if (!slotIsBusy && !slotIsPast) {
            anyAvailable = true;
            const mailto = `mailto:Getloaded256@gmail.com?subject=Booking: ${dateLabel} (${s.l})&body=Address:%0AGuest Count:`;
            btnHtml += `<br><a href="${mailto}" style="display:inline-block; margin-top:5px; padding:8px; background:var(--neon-yellow); color:black; text-decoration:none; font-weight:bold; border-radius:4px; border:1px solid black;">✅ ${s.l}</a>`;
        } else {
            // Show why it's unavailable: either it's booked on the calendar or the time passed
            const reason = slotIsBusy ? "BOOKED" : "PASSED";
            btnHtml += `<br><span style="color:#666; font-size:12px;">❌ ${s.l} (${reason})</span>`;
        }
    });

    return anyAvailable ? btnHtml : `Sorry, ${dateLabel} has no remaining openings today!`;
}