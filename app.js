// --- UPDATED RENDER FUNCTION ---
function renderPayloadReply(text) {
    const display = document.getElementById('chat-display');
    if (!display) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.style.margin = "5px 0";
    msgDiv.style.color = "white";
    msgDiv.style.fontFamily = "Arial";
    // Using a template literal with a clear structure to prevent clipping
    msgDiv.innerHTML = `
        <span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black';">PAYLOAD SYSTEM:</span><br>
        <div style="margin-top: 5px;">${text}</div>
    `;
    
    display.appendChild(msgDiv);
    display.scrollTop = display.scrollHeight;
}

// --- UPDATED CALENDAR LOGIC ---
async function checkCalendarAvailability(userMsg) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    // Set to start of today in local time
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let targetDate;
    let dayFound = false;

    // 1. DATE PARSING (Handles 2/17, 2/17/27, 2/17/2027)
    const dateMatch = userMsg.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    
    if (dateMatch) {
        const month = parseInt(dateMatch[1]) - 1; 
        const day = parseInt(dateMatch[2]);
        let year = dateMatch[3] ? parseInt(dateMatch[3]) : now.getFullYear();
        
        // Convert 26 to 2026, 27 to 2027
        if (dateMatch[3] && dateMatch[3].length === 2) {
            year = 2000 + year;
        }
        
        targetDate = new Date(year, month, day);

        // AUTO-ROLLOVER: If user typed "2/1" and today is "2/18", assume they mean NEXT year
        if (!dateMatch[3] && targetDate < todayLocal) {
            targetDate.setFullYear(now.getFullYear() + 1);
        }
        dayFound = true;
    } else {
        // Fallback to Day Names (Monday, Tomorrow, etc.)
        let dayIndex = days.findIndex(d => userMsg.includes(d));
        targetDate = new Date(todayLocal); // Default to today for manipulation
        
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

    if (!dayFound) return "Which day? (e.g., '2/24/27' or 'Friday')";

    // 2. PAST DATE PROTECTION (Double-check against todayLocal)
    // We only block if the final calculated date is still in the past
    if (targetDate < todayLocal) {
        return "That date has already passed! Please pick a future date.";
    }

    // 3. WEEKEND PROTECTION
    if (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
        return "We only book private events <strong>Monday - Friday</strong>.";
    }

    const dateLabel = targetDate.toLocaleDateString('en-US', { 
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
    });

    // 4. CALENDAR FETCH
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

        let btnHtml = `Checking <strong>${dateLabel}</strong>...<br>`;
        let slots = [{l:"11AM-1PM", h:11}, {l:"4PM-6PM", h:16}];
        let anyAvailable = false;

        const currentHour = now.getHours();
        const isToday = targetDate.toDateString() === now.toDateString();

        slots.forEach(s => {
            const slotIsBusy = isBusy(s.h);
            const slotIsPast = isToday && currentHour >= s.h;

            if (!slotIsBusy && !slotIsPast) {
                anyAvailable = true;
                const mailto = generateMailto(dateLabel, s.l);
                btnHtml += `<br><a href="${mailto}" style="display:inline-block; margin-top:8px; padding:10px; background:var(--neon-yellow); color:black; text-decoration:none; font-weight:bold; border-radius:4px; border:1px solid black; font-size:13px;">✅ ${s.l}</a>`;
            } else {
                const reason = slotIsBusy ? "BOOKED" : "PASSED";
                btnHtml += `<br><span style="color:#666; font-size:12px; display:inline-block; margin-top:8px;">❌ ${s.l} (${reason})</span>`;
            }
        });

        return anyAvailable ? btnHtml : `Sorry, ${dateLabel} has no remaining openings!`;

    } catch (e) {
        console.error(e);
        return "Sync error. Please call (256) 652-9028!";
    }
}