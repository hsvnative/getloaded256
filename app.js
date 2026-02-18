const CONFIG = {
    API_KEY: 'REPLACED_BY_GITHUB_ACTION', 
    CAL_ID: 'aee6168afa0d10e2d826bf94cca06f6ceb5226e6e42ccaf903b285aa403c4aad@group.calendar.google.com'
};

const ORDER_URL = "https://get-loaded-256.square.site/s/order";

window.onload = () => { updateLiveStatus(); };

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

    display.innerHTML += `<div style="text-align:right; margin:10px; color:var(--neon-yellow); font-family: Arial; text-transform: uppercase;">YOU: ${msg}</div>`;
    inputEl.value = "";

    if (msg.includes("available") || msg.includes("book") || msg.includes("friday") || msg.includes("saturday") || msg.includes("today") || msg.includes("tomorrow")) {
        display.innerHTML += `<div id="loading-msg" style="text-align:left; margin:10px; font-family: Arial; color: white;"><span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black';">PAYLOAD SYSTEM:</span> Scanning coordinates...</div>`;
        const availabilityReply = await checkCalendarAvailability(msg);
        document.getElementById('loading-msg')?.remove();
        renderPayloadReply(availabilityReply, true);
    } 
    else if (msg.includes("menu") || msg.includes("food") || msg.includes("eat")) {
        renderPayloadReply("We serve Loaded Potatoes, Fries, Nachos, and Salads. Everything is loaded... but our cooks!");
    }
    else if (msg.includes("special") || msg.includes("deal")) {
        renderPayloadReply(`We post our daily specials on Facebook!<br><br><a href="https://www.facebook.com/getloaded256/" target="_blank" style="color:black; background:var(--neon-yellow); padding:5px 10px; text-decoration:none; font-weight:bold; border-radius:4px; font-size:12px;">VIEW SPECIALS</a>`, true);
    }
    else {
        renderPayloadReply("I'm not sure about that. Try asking if we are 'available this Friday' or use the **CONTACT** and **FACEBOOK** links at the top!");
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
    
    // 1. Identify Target Day
    let targetDayIndex = -1;
    if (userMsg.includes("today")) targetDayIndex = now.getDay();
    else if (userMsg.includes("tomorrow")) targetDayIndex = (now.getDay() + 1) % 7;
    else targetDayIndex = days.findIndex(d => userMsg.includes(d));

    if (targetDayIndex === -1) return "Which day were you looking for? (e.g., 'This Friday' or 'Next Tuesday')";

    // 2. Identify Target Time
    const timeMatch = userMsg.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
    if (!timeMatch) return `Please specify a time for ${days[targetDayIndex].toUpperCase()} (e.g., '11am' or '5pm').`;

    let targetHour = parseInt(timeMatch[1]);
    const isPM = timeMatch[3] === 'pm';
    if (isPM && targetHour < 12) targetHour += 12;
    if (!isPM && targetHour === 12) targetHour = 0;

    // 3. ENFORCE SERVICE WINDOWS (M-F, 11-1 and 4-6)
    const isWeekday = targetDayIndex >= 1 && targetDayIndex <= 5;
    const inLunchWindow = targetHour >= 11 && targetHour < 13;
    const inDinnerWindow = targetHour >= 16 && targetHour < 18;

    if (!isWeekday || (!inLunchWindow && !inDinnerWindow)) {
        return `We only book weekday slots during <strong>11AM-1PM</strong> and <strong>4PM-6PM</strong>. Would you like to check one of those times?`;
    }

    try {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}&t=${new Date().getTime()}`;
        const r = await fetch(url);
        const d = await r.json();

        // 4. CHECK FOR CALENDAR CONFLICTS
        const conflict = d.items.find(e => {
            const start = new Date(e.start.dateTime || e.start.date);
            const end = new Date(e.end.dateTime || e.end.date);
            
            // Match the day
            if (start.getDay() !== targetDayIndex) return false;
            
            // Check if our requested hour overlaps with an existing event
            const sH = start.getHours();
            const eH = end.getHours();
            
            // If it's an all-day event or the hour is within the event time
            return (!e.start.dateTime) || (targetHour >= sH && targetHour < eH);
        });

        if (conflict) {
            return `Sorry, that ${timeMatch[0]} slot is already booked for <strong>${conflict.summary}</strong>. Please check our full schedule for other openings!`;
        } else {
            const requestedTimeStr = timeMatch[0].toUpperCase();
            const emailSubject = encodeURIComponent(`Booking Request: ${days[targetDayIndex].toUpperCase()} at ${requestedTimeStr}`);
            const mailtoLink = `mailto:Getloaded256@gmail.com?subject=${emailSubject}`;

            return `<strong>${days[targetDayIndex].toUpperCase()} at ${requestedTimeStr}</strong> is OPEN! <br><br>• $500 min spend<br>• $100 deposit<br><br>
            <a href="${mailtoLink}" style="color:black; background:var(--neon-yellow); padding:10px; text-decoration:none; font-weight:bold; border-radius:4px; display:inline-block;">📧 EMAIL TO BOOK THIS SLOT</a>`;
        }
    } catch (e) { return `Error checking schedule. Call (256) 652-9028!`; }
}