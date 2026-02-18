// --- CONFIGURATION ---
const CONFIG = {
    API_KEY: 'YOUR_ACTUAL_API_KEY_HERE', 
    CAL_ID: 'aee6168afa0d10e2d826bf94cca06f6ceb5226e6e42ccaf903b285aa403c4aad@group.calendar.google.com'
};

let lastQueriedDay = ""; 

// --- 1. UI CONTROL FUNCTIONS ---
function toggleChat() {
    const chatBox = document.getElementById('chat-box');
    const display = document.getElementById('chat-display');
    chatBox.classList.toggle('chat-hidden');
    
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

// Global listener for Enter key
document.addEventListener('DOMContentLoaded', () => {
    const inputEl = document.getElementById('user-input');
    if(inputEl) {
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleChat();
        });
    }
});

// --- 2. RENDER MESSAGE (Fixed to prevent text cut-off) ---
function renderPayloadReply(text) {
    const display = document.getElementById('chat-display');
    if (!display) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.style.margin = "10px 0";
    msgDiv.style.flexShrink = "0"; // Prevents clipping in flex containers
    msgDiv.innerHTML = `<span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black';">PAYLOAD SYSTEM:</span><br>${text}`;
    
    display.appendChild(msgDiv);
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
    const userDiv = document.createElement('div');
    userDiv.style.textAlign = "right";
    userDiv.style.margin = "10px";
    userDiv.style.color = "var(--neon-yellow)";
    userDiv.style.fontFamily = "Arial";
    userDiv.style.textTransform = "uppercase";
    userDiv.innerText = `YOU: ${msg}`;
    display.appendChild(userDiv);

    inputEl.value = ""; 
    display.scrollTop = display.scrollHeight;

    const calendarKeywords = ["available", "book", "free", "today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "next", "schedule", "/"];
    const isCalendarQuery = calendarKeywords.some(k => msg.includes(k)) || msg.match(/\d+/);

    if (isCalendarQuery) {
        const loadingId = "loading-" + Date.now();
        const loadingDiv = document.createElement('div');
        loadingDiv.id = loadingId;
        loadingDiv.style.margin = "10px 0";
        loadingDiv.innerHTML = `<span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black';">PAYLOAD SYSTEM:</span> Scanning coordinates...`;
        display.appendChild(loadingDiv);
        
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

// --- 4. CALENDAR LOGIC (Multi-Format Date Support) ---
async function checkCalendarAvailability(userMsg) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let targetDate = new Date(todayLocal);
    let dayFound = false;

    // A. Advanced Date Parser (MM/DD, MM/DD/YY, MM/DD/YYYY)
    const dateMatch = userMsg.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (dateMatch) {
        const month = parseInt(dateMatch[1]) - 1; 
        const day = parseInt(dateMatch[2]);
        let year = dateMatch[3] ? parseInt(dateMatch[3]) : now.getFullYear();
        
        // Convert 2-digit years to 2000s
        if (dateMatch[3] && dateMatch[3].length === 2) year = 2000 + year;
        
        targetDate = new Date(year, month, day);
        
        // Auto-Rollover: If no year provided and date is past, assume next year
        if (!dateMatch[3] && targetDate < todayLocal) {
            targetDate.setFullYear(now.getFullYear() + 1);
        }
        dayFound = true;
    } else {
        // Day Name Parsing
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
            return "Which day? (e.g., '2/24/2027' or 'Friday')";
        }
    }

    lastQueriedDay = days[targetDate.getDay()];

    // B. Protection Logic
    if (targetDate < todayLocal) return "That date has already passed! Please pick a future date.";
    if (targetDate.getDay() === 0 || targetDate.getDay() === 6) return "We only book private events <strong>Monday - Friday</strong>.";

    const dateLabel = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    // C. Fetch from Google Calendar
    try {
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

        // D. Render Availability Buttons
        let btnHtml = `Checking <strong>${dateLabel}</strong>...<br>`;
        let slots = [{l:"11AM-1PM", h:11}, {l:"4PM-6PM", h:16}];
        let anyAvailable = false;

        const realTime = new Date();
        const currentHour = realTime.getHours();
        const isToday = targetDate.toDateString() === realTime.toDateString();

        slots.forEach(s => {
            const slotIsBusy = isBusy(s.h);
            const slotIsPast = isToday && currentHour >= s.h;

            if (!slotIsBusy && !slotIsPast) {
                anyAvailable = true;
                const mailto = generateMailto(dateLabel, s.l);
                btnHtml += `<br><a href="${mailto}" style="display:inline-block; margin-top:5px; padding:8px; background:var(--neon-yellow); color:black; text-decoration:none; font-weight:bold; border-radius:4px; border:1px solid black;">✅ ${s.l}</a>`;
            } else {
                const reason = slotIsBusy ? "BOOKED" : "PASSED";
                btnHtml += `<br><span style="color:#666; font-size:12px;">❌ ${s.l} (${reason})</span>`;
            }
        });

        return anyAvailable ? btnHtml : `Sorry, ${dateLabel} has no remaining openings!`;
    } catch (e) { return "Sync error. Please call (256) 652-9028!"; }
}

// --- 5. MAILTO GENERATOR ---
function generateMailto(date, time) {
    const subject = encodeURIComponent(`Booking Request: ${date} at ${time}`);
    const body = encodeURIComponent(
        `Hello Get Loaded BBQ!\n\n` +
        `I'd like to book: ${date} during the ${time} slot.\n\n` +
        `--- EVENT DETAILS ---\n` +
        `ADDRESS:\n` +
        `GUEST COUNT:\n` +
        `PHONE:\n\n` +
        `--- REQUIREMENTS ---\n` +
        `• $500 Min Spend\n` +
        `• $100 Deposit\n` +
        `• Flat Parking Surface`
    );
    return `mailto:Getloaded256@gmail.com?subject=${subject}&body=${body}`;
}