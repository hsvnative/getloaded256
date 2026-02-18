const CONFIG = {
    API_KEY: 'REPLACED_BY_GITHUB_ACTION', 
    CAL_ID: 'aee6168afa0d10e2d826bf94cca06f6ceb5226e6e42ccaf903b285aa403c4aad@group.calendar.google.com'
};

const ORDER_URL = "https://get-loaded-256.square.site/s/order";

window.onload = () => { updateLiveStatus(); };

let lastQueriedDay = ""; // This stores the day so the user doesn't have to repeat it

async function updateLiveStatus() {
    const now = new Date();
    const orderBtn = document.getElementById('order-button');
    const orderMsg = document.getElementById('order-status-msg');
    const truckData = await getTruckLocationData();
    
    if (truckData.activeEvent) {
        const e = truckData.activeEvent;
        const startTime = new Date(e.start.dateTime || e.start.date);
        const endTime = new Date(e.end.dateTime || e.end.date);
        const orderOpen = new Date(startTime.getTime() - (30 * 60000));
        const orderClose = new Date(endTime.getTime() - (30 * 60000));

        if (now >= orderOpen && now <= orderClose) {
            orderBtn.href = ORDER_URL;
            orderBtn.style.opacity = "1";
            orderBtn.style.pointerEvents = "auto";
            orderBtn.innerHTML = "🛒 ORDER FOR PICKUP";
            orderMsg.innerHTML = "Accepting orders until " + orderClose.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } else {
            orderBtn.href = "#";
            orderBtn.style.opacity = "0.5";
            orderBtn.style.pointerEvents = "none";
            orderBtn.innerHTML = now < orderOpen ? "ORDERING OPENS SOON" : "ORDERING CLOSED";
            orderMsg.innerHTML = now < orderOpen ? "Orders open at " + orderOpen.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Online ordering closed for this stop.";
        }
    } else {
        orderBtn.style.opacity = "0.5";
        orderBtn.style.pointerEvents = "none";
        orderBtn.innerHTML = "ONLINE ORDERING OFF";
        orderMsg.innerHTML = "Check the schedule for our next stop!";
    }
    document.getElementById('status').innerHTML = truckData.statusText;
}

async function getTruckLocationData() {
    try {
        const now = new Date();
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?timeMin=${new Date().toISOString()}&singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}`;
        const r = await fetch(url);
        const d = await r.json();
        if (d.items && d.items.length > 0) {
            const e = d.items.find(event => new Date(event.end.dateTime || event.end.date) > now);
            if (e) {
                const startTime = new Date(e.start.dateTime || e.start.date);
                const isLive = now >= startTime;
                const statusText = isLive ? `STATUS: 🟢 LIVE<br><strong>${e.summary}</strong><br>${e.location || ""}` : `STATUS: 🏠 AT KITCHEN<br><strong>Next Stop:</strong> ${e.summary}<br>Arrival: ${startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                return { activeEvent: e, statusText: statusText };
            }
        }
        return { activeEvent: null, statusText: `STATUS: 🏠 AT KITCHEN` };
    } catch (e) { return { activeEvent: null, statusText: `STATUS: 🏠 AT KITCHEN` }; }
}

function openCalendar() { document.getElementById('calendar-modal').style.display = 'flex'; }
function closeCalendar() { document.getElementById('calendar-modal').style.display = 'none'; }

function toggleChat() {
    const chatBox = document.getElementById('chat-box');
    const display = document.getElementById('chat-display');
    chatBox.classList.toggle('chat-hidden');
    if (display.innerHTML === "") {
        renderPayloadReply("Welcome. Bookings, catering requests, and general questions can be asked right here. How can we get you loaded today?");
    }
}

async function handleChat() {
    const inputEl = document.getElementById('user-input');
    const display = document.getElementById('chat-display');
    const msg = inputEl.value.trim().toLowerCase();
    if (!msg) return;

    // 1. Display User Message
    display.innerHTML += `<div style="text-align:right; margin:10px; color:var(--neon-yellow); font-family: Arial; text-transform: uppercase;">YOU: ${msg}</div>`;
    inputEl.value = ""; 

    // 2. SEARCH LOGIC
    // We added "free", "mon", "tue", "wed", "thu", "fri" to the trigger list
    const calendarKeywords = ["available", "book", "free", "today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday"];
    const isCalendarQuery = calendarKeywords.some(keyword => msg.includes(keyword)) || msg.match(/\d+(am|pm)/);

    if (isCalendarQuery) {
        display.innerHTML += `<div id="loading-msg" style="text-align:left; margin:10px; font-family: Arial; color: white;"><span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black';">PAYLOAD SYSTEM:</span> Scanning coordinates...</div>`;
        display.scrollTop = display.scrollHeight;
        
        const availabilityReply = await checkCalendarAvailability(msg);
        const loading = document.getElementById('loading-msg');
        if(loading) loading.remove();
        
        renderPayloadReply(availabilityReply, true); 
    } 
    else if (msg.includes("menu") || msg.includes("food") || msg.includes("eat")) {
        renderPayloadReply("We serve Loaded Potatoes, Fries, Nachos, and Salads. Everything is loaded... but our cooks!");
    }
    else if (msg.includes("special") || msg.includes("deal")) {
        renderPayloadReply(`Check our Facebook for daily specials!<br><br><a href="https://www.facebook.com/getloaded256/" target="_blank" style="color:black; background:var(--neon-yellow); padding:5px 10px; text-decoration:none; font-weight:bold; border-radius:4px; font-size:12px;">VIEW SPECIALS</a>`, true);
    }
    else {
        renderPayloadReply("I'm not sure about that. Try asking if we are 'free this Friday' or ask about our 'menu'!");
    }

    display.scrollTop = display.scrollHeight;
}

function renderPayloadReply(text, isFormatted = false) {
    const display = document.getElementById('chat-display');
    const label = `<span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black'; display:block; margin-bottom:2px; text-transform: uppercase;">PAYLOAD SYSTEM:</span>`;
    const finalContent = isFormatted && text.includes("PAYLOAD SYSTEM") ? text : label + text;
    display.innerHTML += `<div style="text-align:left; margin:10px; font-family: Arial; line-height: 1.4; color: white;">${finalContent}</div>`;
}

async function checkCalendarAvailability(userMsg) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    
    // Check if the user mentioned a new day
    let dayIndex = days.findIndex(d => userMsg.includes(d));
    if (userMsg.includes("today")) dayIndex = now.getDay();
    if (userMsg.includes("tomorrow")) dayIndex = (now.getDay() + 1) % 7;

    // If they didn't mention a day, use the last one we talked about
    if (dayIndex !== -1) {
        lastQueriedDay = days[dayIndex];
    } else if (lastQueriedDay !== "") {
        dayIndex = days.indexOf(lastQueriedDay);
    } else {
        return "Which day were you looking for? (e.g., 'This Friday')";
    }
    
    // 1. CALCULATE TARGET DATE
    let targetDate = new Date(now);
    let dayIndex = -1;

    if (userMsg.includes("today")) {
        dayIndex = now.getDay();
    } else if (userMsg.includes("tomorrow")) {
        targetDate.setDate(now.getDate() + 1);
        dayIndex = targetDate.getDay();
    } else {
        dayIndex = days.findIndex(d => userMsg.includes(d));
        if (dayIndex !== -1) {
            let daysAhead = (dayIndex - now.getDay() + 7) % 7;
            // If they say "this Tuesday" and today is Tuesday, assume they mean next week
            // or if the day has already passed this week.
            if (daysAhead === 0 && !userMsg.includes("today")) daysAhead = 7;
            if (userMsg.includes("next")) daysAhead += 7;
            targetDate.setDate(now.getDate() + daysAhead);
        }
    }

    if (dayIndex === -1) return "Which day were you looking for? (e.g., 'This Friday' or 'Next Tuesday')";

    // 2. PARSE TIME
    const timeMatch = userMsg.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
    let requestedHour = null;
    if (timeMatch) {
        requestedHour = parseInt(timeMatch[1]);
        const isPM = timeMatch[3] === 'pm';
        if (isPM && requestedHour < 12) requestedHour += 12;
        if (!isPM && requestedHour === 12) requestedHour = 0;
    }

    // 3. SERVICE WINDOW DEFINITIONS
    const windows = [11, 16]; // Start hours for 11am-1pm and 4pm-6pm
    const isWeekday = dayIndex >= 1 && dayIndex <= 5;

    if (!isWeekday) return "We currently only book private events Monday through Friday.";

    try {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}&t=${new Date().getTime()}`;
        const r = await fetch(url);
        const d = await r.json();

        // Get events for specific date
        const dayEvents = (d.items || []).filter(e => {
            const start = new Date(e.start.dateTime || e.start.date);
            return start.toDateString() === targetDate.toDateString() && e.transparency !== 'transparent';
        });

        const checkSlotBusy = (hour) => dayEvents.some(e => {
            if (!e.start.dateTime) return true; // All day event
            const s = new Date(e.start.dateTime).getHours();
            const f = new Date(e.end.dateTime).getHours();
            return hour >= s && hour < f;
        });

        const dateLabel = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

        // 4. LOGIC: IF USER PROVIDED A SPECIFIC TIME
        if (requestedHour !== null) {
            const isLunch = requestedHour >= 11 && requestedHour < 13;
            const isDinner = requestedHour >= 16 && requestedHour < 18;

            if (!isLunch && !isDinner) {
                return `We only book weekday slots during <strong>11AM-1PM</strong> and <strong>4PM-6PM</strong>.`;
            }

            if (checkSlotBusy(requestedHour)) {
                return `Sorry, the ${timeMatch[0]} slot on ${dateLabel} is already booked.`;
            }

            return generateSuccessReply(dateLabel, timeMatch[0].toUpperCase());
        }

        // 5. LOGIC: IF USER ONLY PROVIDED A DAY (Suggest Windows)
        let availabilityHtml = `Checking <strong>${dateLabel}</strong>...<br>Available windows:`;
        let optionsFound = false;

        if (!checkSlotBusy(11)) {
            availabilityHtml += `<br>✅ 11AM - 1PM`;
            optionsFound = true;
        }
        if (!checkSlotBusy(16)) {
            availabilityHtml += `<br>✅ 4PM - 6PM`;
            optionsFound = true;
        }

        if (!optionsFound) return `Sorry, ${dateLabel} is completely booked up!`;

        return `${availabilityHtml}<br><br>Which time works best for you?`;

    } catch (e) { return "Error checking coordinates. Please call (256) 652-9028!"; }
}

function generateSuccessReply(date, time) {
    const subject = encodeURIComponent(`Booking Request: ${date} at ${time}`);
    const mailto = `mailto:Getloaded256@gmail.com?subject=${subject}`;
    return `<strong>${date}</strong> at <strong>${time}</strong> is OPEN! <br><br>• $500 min spend<br>• $100 deposit<br><br>
    <a href="${mailto}" style="color:black; background:var(--neon-yellow); padding:10px; text-decoration:none; font-weight:bold; border-radius:4px; display:inline-block;">📧 EMAIL TO BOOK THIS SLOT</a>`;
}