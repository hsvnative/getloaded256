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

    // 1. Check for MM/DD format first
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
        if (!dateMatch[3] && targetDate < todayLocal) {
            targetDate.setFullYear(now.getFullYear() + 1);
        }
        dayFound = true;
    } 
    // 2. Fallback: Check for Day Names (e.g., "Friday")
    else {
        const dayIndex = days.findIndex(d => userMsg.includes(d));
        if (dayIndex !== -1) {
            let daysAhead = (dayIndex - now.getDay() + 7) % 7;
            // If they ask for "Friday" and today is Friday, assume they mean NEXT Friday
            if (daysAhead === 0) daysAhead = 7; 
            targetDate.setDate(now.getDate() + daysAhead);
            dayFound = true;
        } else if (userMsg.includes("tomorrow")) {
            targetDate.setDate(now.getDate() + 1);
            dayFound = true;
        } else if (userMsg.includes("today")) {
            dayFound = true;
        }
    }

    // 3. Validation
    if (!dayFound) return "Which day? (e.g., 'Friday' or '2/24/27')";

    if (targetDate.getTime() < todayLocal.getTime()) {
        return "That date has passed! Please pick a future date.";
    }

    if (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
        return "We only book private events <strong>Monday - Friday</strong>.";
    }

    const dateLabel = targetDate.toLocaleDateString('en-US', { 
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
    });

    // 4. Calendar API Fetch
    try {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}&t=${Date.now()}`;
        const r = await fetch(url);
        const data = await r.json();

        const dayEvents = (data.items || []).filter(e => {
            const start = new Date(e.start.dateTime || e.start.date);
            return start.toDateString() === targetDate.toDateString() && e.transparency !== 'transparent';
        });

        const isBusy = (hour) => dayEvents.some(e => {
            if (!e.start.dateTime) return true;
            const s = new Date(e.start.dateTime).getHours();
            const f = new Date(e.end.dateTime).getHours();
            return hour >= s && hour < f;
        });

        let btnHtml = `Results for <strong>${dateLabel}</strong>:<br>`;
        let slots = [{l:"11AM-1PM", h:11}, {l:"4PM-6PM", h:16}];
        let anyAvailable = false;

        const currentHour = now.getHours();
        const isActuallyToday = targetDate.toDateString() === now.toDateString();

        slots.forEach(s => {
            const slotIsBusy = isBusy(s.h);
            const slotIsPast = isActuallyToday && currentHour >= s.h;

            if (!slotIsBusy && !slotIsPast) {
                anyAvailable = true;
                const subject = encodeURIComponent(`Booking Request: ${dateLabel} (${s.l})`);
                const mailto = `mailto:Getloaded256@gmail.com?subject=${subject}`;
                btnHtml += `<br><a href="${mailto}" style="display:inline-block; margin-top:8px; padding:10px; background:var(--neon-yellow); color:black; text-decoration:none; font-weight:bold; border-radius:4px; border:1px solid black; font-size:13px;">✅ ${s.l}</a>`;
            } else {
                const reason = slotIsBusy ? "BOOKED" : "PASSED";
                btnHtml += `<br><span style="color:#666; font-size:12px; display:inline-block; margin-top:8px;">❌ ${s.l} (${reason})</span>`;
            }
        });

        return anyAvailable ? btnHtml : `Sorry, ${dateLabel} is fully booked!`;

    } catch (e) {
        return "Sync error. Please call (256) 652-9028!";
    }
}

function openCalendar() { document.getElementById('calendar-modal').style.display = 'flex'; }
function closeCalendar() { document.getElementById('calendar-modal').style.display = 'none'; }
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('user-input');
    if(input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChat(); });
});

function manageSquareOrdering() {
    const orderBtn = document.getElementById('order-button');
    const statusMsg = document.getElementById('order-status-msg');
    
    const now = new Date();
    const day = now.getDay(); // 0 = Sun, 1 = Mon, etc.
    const hour = now.getHours();

    // SET YOUR HOURS HERE (24-hour format)
    // Example: Mon-Fri, 10:00 AM (10) to 6:00 PM (18)
    const isWeekday = (day >= 1 && day <= 5);
    const isBusinessHours = (hour >= 10 && hour < 18);

    if (isWeekday && isBusinessHours) {
        // Truck is Active
        orderBtn.style.opacity = "1";
        orderBtn.style.pointerEvents = "auto";
        statusMsg.innerHTML = "✅ ONLINE ORDERING ACTIVE";
        statusMsg.style.color = "var(--neon-yellow)";
    } else {
        // Truck is Closed
        orderBtn.style.background = "#333";
        orderBtn.style.color = "#777";
        orderBtn.style.border = "2px solid #444";
        orderBtn.style.pointerEvents = "none"; // Makes button unclickable
        statusMsg.innerHTML = "🔒 ORDERING CLOSED (MON-FRI 10AM-6PM)";
        statusMsg.style.color = "#888";
    }
}

// Call this function inside your existing DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {
    manageSquareOrdering();
    // ... your other listeners (like user-input)
});