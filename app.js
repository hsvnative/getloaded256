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
    
    // Check if the chat was just opened and is empty
    if (!chatBox.classList.contains('chat-hidden') && display.innerHTML === "") {
        sendInitialWelcome();
    }
}

function sendInitialWelcome() {
    const welcomeText = `
        <strong>PAYLOAD SYSTEM ONLINE</strong><br>
        Ask me about catering availability (e.g., 'free Friday') or event dates.<br><br>
        <strong>DIRECT CONTACT:</strong><br>
        📞 <a href="tel:2566529028" style="color:var(--neon-yellow); text-decoration:none;">(256) 652-9028</a><br>
        📧 <a href="mailto:Getloaded256@gmail.com" style="color:var(--neon-yellow); text-decoration:none;">Getloaded256@gmail.com</a>
    `;
    renderPayloadReply(welcomeText);
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
	
	if (isCalendarQuery) {
        // ... (your existing calendar logic) ...
    } else if (msg.includes("catering") || msg.includes("contact") || msg.includes("call")) {
        renderPayloadReply("For catering quotes and custom menus, call us at <a href='tel:2566529028' style='color:var(--neon-yellow);'>(256) 652-9028</a> or email <a href='mailto:Getloaded256@gmail.com' style='color:var(--neon-yellow);'>Getloaded256@gmail.com</a>!");
    } else if (msg.includes("menu")) {
        // ... (your menu logic) ...
    }

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

async function manageSquareOrdering() {
    const orderBtn = document.getElementById('order-button');
    const statusMsg = document.getElementById('order-status-msg');
    const truckStatus = document.getElementById('status'); // The 🚚 TRUCK STATUS div
    
    try {
        const now = new Date();
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}&timeMin=${new Date().toISOString()}`;
        
        const r = await fetch(url);
        const data = await r.json();
        const events = data.items || [];

        // 1. Find the "Current" or "Upcoming" event
        const activeEvent = events.find(e => {
            if (!e.start.dateTime) return false;
            const start = new Date(e.start.dateTime);
            const end = new Date(e.end.dateTime);
            
            // Traveling window: 1 hour before start
            const travelTime = new Date(start.getTime() - 60 * 60000);
            return now >= travelTime && now <= end;
        });

        if (activeEvent) {
            const start = new Date(activeEvent.start.dateTime);
            const end = new Date(activeEvent.end.dateTime);
            
            // Determine specific sub-status
            const isTraveling = now < start;
            const isServing = now >= start && now <= end;

            if (isTraveling) {
                // STATE: TRAVELING
                truckStatus.innerHTML = `🚚 EN ROUTE TO: <br><span style="color:var(--neon-yellow)">${activeEvent.summary}</span>`;
                orderBtn.style.pointerEvents = "none";
                orderBtn.style.background = "#222";
                statusMsg.innerText = "ORDERING OPENS 30M BEFORE ARRIVAL";
            } else if (isServing) {
                // STATE: AT EVENT
                truckStatus.innerHTML = `📍 CURRENTLY AT: <br><span style="color:var(--neon-yellow)">${activeEvent.summary}</span>`;
                
                // Square Button logic (Open 30m before end)
                const closeTime = new Date(end.getTime() - 30 * 60000);
                if (now <= closeTime) {
                    orderBtn.style.background = "var(--neon-yellow)";
                    orderBtn.style.color = "#000";
                    orderBtn.style.pointerEvents = "auto";
                    statusMsg.innerHTML = "✅ ONLINE ORDERING ACTIVE";
                } else {
                    orderBtn.style.pointerEvents = "none";
                    orderBtn.style.background = "#222";
                    statusMsg.innerText = "ORDERING CLOSED (LAST CALL PASSED)";
                }
            }
        } else {
            // STATE: PREPARING (No events found for today/now)
            truckStatus.innerHTML = `🔥 STATUS: PREPARING AT THE KITCHEN`;
            orderBtn.style.pointerEvents = "none";
            orderBtn.style.background = "#222";
            statusMsg.innerText = "OFFLINE - NO ACTIVE EVENTS";
        }

    } catch (e) {
        console.error("Sync Error:", e);
        truckStatus.innerText = "OFFLINE - CHECK FACEBOOK";
    }
}

// Call this function inside your existing DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {
    manageSquareOrdering(); // This kicks off the calendar check
    
    // Your existing input listener for the chatbot
    const inputEl = document.getElementById('user-input');
    if(inputEl) {
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleChat();
        });
    }
});