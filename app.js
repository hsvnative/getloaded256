// --- CONFIGURATION ---
const CONFIG = {
    API_KEY: 'YOUR_NEW_KEY_HERE', 
    CAL_ID: 'aee6168afa0d10e2d826bf94cca06f6ceb5226e6e42ccaf903b285aa403c4aad@group.calendar.google.com'
};

let lastQueriedDay = ""; 

function renderPayloadReply(text) {
    const display = document.getElementById('chat-display');
    if (!display) return;
    const msgDiv = document.createElement('div');
    msgDiv.style.margin = "10px 0";
    msgDiv.style.flexShrink = "0"; 
    msgDiv.innerHTML = `<span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black';">PAYLOAD SYSTEM:</span><br>${text}`;
    display.appendChild(msgDiv);
    display.scrollTop = display.scrollHeight;
}

async function checkCalendarAvailability(userMsg) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    // Normalize today to the VERY START of the day for clean comparison
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    
    let targetDate = new Date(todayLocal);
    let dayFound = false;
    let yearProvided = false;

    // 1. ADVANCED DATE PARSING
    const dateMatch = userMsg.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (dateMatch) {
        const month = parseInt(dateMatch[1]) - 1; 
        const day = parseInt(dateMatch[2]);
        let year = now.getFullYear();

        if (dateMatch[3]) {
            yearProvided = true;
            year = parseInt(dateMatch[3]);
            if (dateMatch[3].length === 2) year = 2000 + year;
        }
        
        targetDate = new Date(year, month, day, 0, 0, 0, 0);

        // AUTO-ROLLOVER: If no year provided and it's in the past, move to next year
        if (!yearProvided && targetDate < todayLocal) {
            targetDate.setFullYear(now.getFullYear() + 1);
        }
        dayFound = true;
    } else {
        // Fallback to day names
        let dayIndex = days.findIndex(d => userMsg.includes(d));
        if (userMsg.includes("today")) { dayFound = true; }
        else if (userMsg.includes("tomorrow")) { targetDate.setDate(now.getDate() + 1); dayFound = true; }
        else if (dayIndex !== -1) {
            dayFound = true;
            let daysAhead = (dayIndex - now.getDay() + 7) % 7;
            if (daysAhead === 0 && !userMsg.includes("today")) daysAhead = 7;
            if (userMsg.includes("next")) daysAhead += 7;
            targetDate.setDate(now.getDate() + daysAhead);
        }
    }

    if (!dayFound) return "Which day? (e.g., '2/24/27' or 'This Friday')";

    // 2. PAST DATE PROTECTION
    // We check time values to avoid millisecond errors
    if (targetDate.getTime() < todayLocal.getTime()) {
        return `The date ${targetDate.toLocaleDateString()} has already passed. Please pick a future date!`;
    }

    // 3. WEEKEND PROTECTION
    if (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
        return "We only book private events <strong>Monday - Friday</strong>.";
    }

    const dateLabel = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

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

        let btnHtml = `Checking <strong>${dateLabel}</strong>...<br>`;
        let slots = [{l:"11AM-1PM", h:11}, {l:"4PM-6PM", h:16}];
        let anyAvailable = false;

        const currentHour = now.getHours();
        const isActuallyToday = targetDate.toDateString() === now.toDateString();

        slots.forEach(s => {
            const slotIsBusy = isBusy(s.h);
            const slotIsPast = isActuallyToday && currentHour >= s.h;

            if (!slotIsBusy && !slotIsPast) {
                anyAvailable = true;
                const mailto = generateMailto(dateLabel, s.l);
                btnHtml += `<br><a href="${mailto}" style="display:inline-block; margin-top:8px; padding:10px; background:var(--neon-yellow); color:black; text-decoration:none; font-weight:bold; border-radius:4px; border:1px solid black; font-size:13px;">✅ ${s.l}</a>`;
            } else {
                const reason = slotIsBusy ? "BOOKED" : "PASSED";
                btnHtml += `<br><span style="color:#666; font-size:12px; display:inline-block; margin-top:8px;">❌ ${s.l} (${reason})</span>`;
            }
        });

        return anyAvailable ? btnHtml : `Sorry, ${dateLabel} is fully booked!`;
    } catch (e) { return "Sync error. Please call (256) 652-9028!"; }
}

function generateMailto(date, time) {
    const subject = encodeURIComponent(`Booking Request: ${date} (${time})`);
    const body = encodeURIComponent(`I'd like to book ${date} at ${time}.\n\nAddress:\nGuest Count:\nPhone:`);
    return `mailto:Getloaded256@gmail.com?subject=${subject}&body=${body}`;
}

// Add toggle and handleChat functions from previous steps...