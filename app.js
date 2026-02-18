// --- CONFIGURATION ---
const CONFIG = {
    API_KEY: 'REPLACED_BY_GITHUB_ACTION',
    CAL_ID: 'aee6168afa0d10e2d826bf94cca06f6ceb5226e6e42ccaf903b285aa403c4aad@group.calendar.google.com'
};

let lastQueriedDay = ""; 

// --- CHAT UI LOGIC ---
async function handleChat() {
    const inputEl = document.getElementById('user-input');
    const display = document.getElementById('chat-display');
    const msg = inputEl.value.trim().toLowerCase();
    if (!msg) return;

    // Display User Message
    display.innerHTML += `<div style="text-align:right; margin:10px; color:var(--neon-yellow); font-family: Arial; text-transform: uppercase;">YOU: ${msg}</div>`;
    inputEl.value = ""; 

    // Determine if it's a calendar/booking question
    const calendarKeywords = ["available", "book", "free", "today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "next", "schedule"];
    const isCalendarQuery = calendarKeywords.some(k => msg.includes(k)) || msg.match(/\d+/);

    if (isCalendarQuery) {
        display.innerHTML += `<div id="loading-msg" style="text-align:left; margin:10px; font-family: Arial; color: white;"><span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black';">PAYLOAD SYSTEM:</span> Scanning coordinates...</div>`;
        display.scrollTop = display.scrollHeight;
        
        const availabilityReply = await checkCalendarAvailability(msg);
        document.getElementById('loading-msg')?.remove();
        renderPayloadReply(availabilityReply); 
    } 
    else if (msg.includes("menu") || msg.includes("food") || msg.includes("eat")) {
        renderPayloadReply("We serve Loaded Potatoes, Fries, Nachos, and Salads. Everything is loaded... but our cooks!");
    }
    else {
        renderPayloadReply("I'm not sure about that. Try asking if we are 'available this Friday' or 'free on 2/24'!");
    }
    display.scrollTop = display.scrollHeight;
}

// --- CALENDAR & BOOKING LOGIC ---
async function checkCalendarAvailability(userMsg) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    now.setHours(0, 0, 0, 0); 
    
    let targetDate = new Date(now);
    let dayFound = false;

    // 1. DATE PARSING (Numeric 2/24)
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
    } 
    // 2. DAY PARSING (Today, Tomorrow, Day Name)
    else if (userMsg.includes("today")) {
        dayFound = true;
    } else if (userMsg.includes("tomorrow")) {
        targetDate.setDate(now.getDate() + 1);
        dayFound = true;
    } else {
        let dayIndex = days.findIndex(d => userMsg.includes(d));
        if (dayIndex !== -1) {
            dayFound = true;
            let daysAhead = (dayIndex - now.getDay() + 7) % 7;
            if (daysAhead === 0 && !userMsg.includes("today")) daysAhead = 7;
            if (userMsg.includes("next")) daysAhead += 7;
            targetDate.setDate(now.getDate() + daysAhead);
        }
    }

    if (!dayFound) {
        if (lastQueriedDay !== "") {
            // Use memory if they just ask for a time like "11am"
            const lastIndex = days.indexOf(lastQueriedDay);
            let daysAhead = (lastIndex - now.getDay() + 7) % 7;
            targetDate.setDate(now.getDate() + daysAhead);
        } else {
            return "Which day were you looking for? (e.g., '2/24', 'This Friday', or 'Next Tuesday')";
        }
    }

    // Update memory
    lastQueriedDay = days[targetDate.getDay()];

    // 3. PROTECTIONS
    if (targetDate < now) return "That date has already passed! Please pick a future date.";
    if (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
        return "We only book private events <strong>Monday - Friday</strong>. Check Facebook for our weekend public spots!";
    }

    const dateLabel = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    try {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}&t=${new Date().getTime()}`;
        const r = await fetch(url);
        const d = await r.json();

        const dayEvents = (d.items || []).filter(e => {
            const start = new Date(e.start.dateTime || e.start.date);
            return start.toDateString() === targetDate.toDateString() && e.transparency !== 'transparent';
        });

        const isBusy = (hour) => dayEvents.some(e => {
            if (!e.start.dateTime) return true; // All-day event blocks everything
            const s = new Date(e.start.dateTime).getHours();
            const f = new Date(e.end.dateTime).getHours();
            return hour >= s && hour < f;
        });

        // 4. CHECK SPECIFIC TIME IF PROVIDED
        const timeMatch = userMsg.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
        if (timeMatch && (userMsg.includes("am") || userMsg.includes("pm") || userMsg.includes(":"))) {
            let h = parseInt(timeMatch[1]);
            if (userMsg.includes("pm") && h < 12) h += 12;
            if (userMsg.includes("am") && h === 12) h = 0;

            const isLunch = h >= 11 && h < 13;
            const isDinner = h >= 16 && h < 18;

            if (!isLunch && !isDinner) return "We only book <strong>11AM-1PM</strong> and <strong>4PM-6PM</strong>.";
            if (isBusy(h)) return `Sorry, ${dateLabel} at ${timeMatch[0]} is already booked.`;
            
            return generateSuccessReply(dateLabel, timeMatch[0].toUpperCase());
        }

        // 5. SUGGESTION BUTTONS
        let btnHtml = `Checking <strong>${dateLabel}</strong>...<br>Click a window to book it:`;
        let slots = [{l:"11AM-1PM", h:11}, {l:"4PM-6PM", h:16}];
        let available = false;

        slots.forEach(s => {
            if (!isBusy(s.h)) {
                available = true;
                const mailto = generateMailto(dateLabel, s.l);
                btnHtml += `<br><a href="${mailto}" style="display:inline-block; margin-top:10px; padding:8px 12px; background:var(--neon-yellow); color:black; text-decoration:none; font-weight:bold; border-radius:4px; font-size:12px; border:1px solid black;">✅ ${s.l}</a>`;
            } else {
                btnHtml += `<br><span style="color:#666; font-size:12px; display:inline-block; margin-top:10px;">❌ ${s.l} (BOOKED)</span>`;
            }
        });

        return available ? btnHtml : `Sorry, ${dateLabel} is fully booked!`;

    } catch (e) { return "Schedule sync error. Please call (256) 652-9028!"; }
}

// --- EMAIL GENERATORS ---
function generateMailto(date, time) {
    const subject = encodeURIComponent(`Booking Request: ${date} at ${time}`);
    const body = encodeURIComponent(
        `Hello Get Loaded BBQ!\n\n` +
        `I'd like to book: ${date} (${time})\n\n` +
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

function generateSuccessReply(date, time) {
    const mailto = generateMailto(date, time);
    return `<strong>${date}</strong> at <strong>${time}</strong> is OPEN!<br><br>• $500 min<br>• $100 deposit<br><br><a href="${mailto}" style="color:black; background:var(--neon-yellow); padding:10px; text-decoration:none; font-weight:bold; border-radius:4px; display:inline-block; border:1px solid black;">📧 EMAIL TO BOOK</a>`;
}

// --- UTILS ---
function renderPayloadReply(text) {
    const display = document.getElementById('chat-display');
    display.innerHTML += `<div style="text-align:left; margin:10px; font-family: Arial; color: white;"><span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black';">PAYLOAD SYSTEM:</span><br>${text}</div>`;
    display.scrollTop = display.scrollHeight;
}