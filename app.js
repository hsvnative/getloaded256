const CONFIG = {
    API_KEY: 'REPLACED_BY_GITHUB_ACTION', 
    CAL_ID: 'aee6168afa0d10e2d826bf94cca06f6ceb5226e6e42ccaf903b285aa403c4aad@group.calendar.google.com'
};

const ORDER_URL = "https://get-loaded-256.square.site/s/order";

window.onload = () => { updateLiveStatus(); };

let lastQueriedDay = ""; 

async function handleChat() {
    const inputEl = document.getElementById('user-input');
    const display = document.getElementById('chat-display');
    const msg = inputEl.value.trim().toLowerCase();
    if (!msg) return;

    display.innerHTML += `<div style="text-align:right; margin:10px; color:var(--neon-yellow); font-family: Arial; text-transform: uppercase;">YOU: ${msg}</div>`;
    inputEl.value = ""; 

    // TRIGGER LIST: Added "free" and day names
    const calendarKeywords = ["available", "book", "free", "today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "next"];
    const isCalendarQuery = calendarKeywords.some(k => msg.includes(k)) || msg.match(/\d+/);

    if (isCalendarQuery) {
        display.innerHTML += `<div id="loading-msg" style="text-align:left; margin:10px; font-family: Arial; color: white;"><span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black';">PAYLOAD SYSTEM:</span> Scanning coordinates...</div>`;
        display.scrollTop = display.scrollHeight;
        
        const availabilityReply = await checkCalendarAvailability(msg);
        document.getElementById('loading-msg')?.remove();
        renderPayloadReply(availabilityReply, true); 
    } 
    else if (msg.includes("menu") || msg.includes("food")) {
        renderPayloadReply("We serve Loaded Potatoes, Fries, Nachos, and Salads.");
    }
    else {
        renderPayloadReply("I'm not sure. Try asking if we are 'free this Friday'!");
    }
    display.scrollTop = display.scrollHeight;
}

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
    let targetDate = new Date(now);
    let dayFound = false;

    // 1. DATE PARSING LOGIC
    // Check for MM/DD format (e.g., 2/24 or 02/24)
    const dateMatch = userMsg.match(/(\d{1,2})\/(\d{1,2})/);
    
    if (dateMatch) {
        const month = parseInt(dateMatch[1]) - 1; // JS months are 0-11
        const day = parseInt(dateMatch[2]);
        targetDate.setMonth(month);
        targetDate.setDate(day);
        targetDate.setFullYear(now.getFullYear());
        
        // If the date has already passed this year, assume next year
        if (targetDate < now && (now.getDate() !== day || now.getMonth() !== month)) {
            targetDate.setFullYear(now.getFullYear() + 1);
        }
        dayFound = true;
    } 
    // Fallback to "today", "tomorrow", or "Friday"
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

    if (!dayFound) return "Which day were you looking for? (e.g., '2/24', 'This Friday', or 'Next Tuesday')";

    // Set to midnight for clean comparison
    targetDate.setHours(0,0,0,0);
    const dateLabel = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    // ... Keep the rest of your Calendar API fetch and Suggestion logic ...
function generateSuccessReply(date, time) {
    const subject = encodeURIComponent(`Booking Request: ${date} at ${time}`);
    
    // This is the "Lead Form" that appears inside their email app
    const body = encodeURIComponent(
        `Hello Get Loaded BBQ!\n\n` +
        `I would like to request a booking for:\n` +
        `DATE: ${date}\n` +
        `TIME SLOT: ${time}\n\n` +
        `--- PLEASE PROVIDE DETAILS ---\n` +
        `EVENT ADDRESS:\n` +
        `ESTIMATED GUEST COUNT:\n` +
        `PHONE NUMBER:\n\n` +
        `--- BOOKING REQUIREMENTS ---\n` +
        `• $500 Minimum Spend\n` +
        `• $100 Non-refundable Deposit (Required to lock the date)\n` +
        `• Flat surface for truck parking\n\n` +
        `I understand the requirements and would like to proceed with a quote!`
    );

    const mailto = `mailto:Getloaded256@gmail.com?subject=${subject}&body=${body}`;
    
    return `<strong>${date}</strong> at <strong>${time}</strong> is OPEN! <br><br>` +
           `• $500 min spend<br>• $100 deposit<br><br>` +
           `<a href="${mailto}" style="color:black; background:var(--neon-yellow); padding:10px; text-decoration:none; font-weight:bold; border-radius:4px; display:inline-block;">📧 EMAIL TO BOOK THIS SLOT</a>`;
}