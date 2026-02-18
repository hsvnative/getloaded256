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
    const todayIndex = new Date().getDay();
    let targetDay = userMsg.includes("today") ? days[todayIndex] : userMsg.includes("tomorrow") ? days[(todayIndex + 1) % 7] : days.find(d => userMsg.includes(d)) || "";

    const timeMatch = userMsg.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
    let targetHour = timeMatch ? parseInt(timeMatch[1]) : null;
    const isPM = timeMatch && timeMatch[3] === 'pm';
    if (isPM && targetHour < 12) targetHour += 12;
    if (!isPM && targetHour === 12) targetHour = 0;

    const requestedTimeStr = timeMatch ? timeMatch[0].toUpperCase() : "ANYTIME";

    try {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}`;
        const r = await fetch(url);
        const d = await r.json();

        const dayEvents = d.items.filter(e => {
            const start = new Date(e.start.dateTime || e.start.date);
            return days[start.getDay()] === targetDay;
        });

        const conflict = dayEvents.find(e => {
            if (!e.start.dateTime) return true; 
            const s = new Date(e.start.dateTime).getHours();
            const f = new Date(e.end.dateTime).getHours();
            return targetHour >= s && targetHour < f;
        });

        if (conflict) {
            let suggestion = "";
            for (let h = (targetHour || 11) + 1; h <= 21; h++) {
                const isBusy = dayEvents.some(e => {
                    if (!e.start.dateTime) return true;
                    const s = new Date(e.start.dateTime).getHours();
                    const f = new Date(e.end.dateTime).getHours();
                    return h >= s && h < f;
                });
                if (!isBusy) {
                    const displayHour = h > 12 ? (h - 12) + "PM" : h + "AM";
                    suggestion = `<br><br><strong>SUGGESTION:</strong> We are free around <strong>${displayHour}</strong>!`;
                    break;
                }
            }
            return `That slot is occupied by "<strong>${conflict.summary}</strong>". ${suggestion}`;
        } else {
            // DYNAMIC EMAIL LINK GENERATION
            const emailSubject = encodeURIComponent(`Catering Inquiry: ${targetDay.toUpperCase()} at ${requestedTimeStr}`);
            const emailBody = encodeURIComponent(`Hello Get Loaded BBQ!\n\nI saw on your site that ${targetDay.toUpperCase()} at ${requestedTimeStr} is available.\n\nI'd like to book this for my event.\n\nEvent Location:\nEstimated Guest Count:\nContact Phone:`);
            const mailtoLink = `mailto:Getloaded256@gmail.com?subject=${emailSubject}&body=${emailBody}`;

            return `<strong>${targetDay.toUpperCase()}</strong> at <strong>${requestedTimeStr}</strong> looks clear! <br><br>• $500 min spend<br>• $100 deposit<br><br>
            <a href="${mailtoLink}" style="color:black; background:var(--neon-yellow); padding:10px 15px; text-decoration:none; font-weight:bold; border-radius:4px; display:inline-block; margin-top:5px;">📧 EMAIL TO BOOK THIS SLOT</a>`;
        }
    } catch (e) { return `Error reaching the calendar. Call (256) 652-9028!`; }
}