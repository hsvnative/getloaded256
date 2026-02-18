const CONFIG = {
    API_KEY: 'REPLACED_BY_GITHUB_ACTION', 
    CAL_ID: 'aee6168afa0d10e2d826bf94cca06f6ceb5226e6e42ccaf903b285aa403c4aad@group.calendar.google.com'
};

window.onload = () => { updateLiveStatus(); };

// TRUCK STATUS LOGIC
async function getTruckLocation() {
    try {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?timeMin=${new Date().toISOString()}&singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}`;
        const r = await fetch(url);
        const d = await r.json();
        if (d.items && d.items.length > 0) {
            const e = d.items[0];
            return `STATUS: 🟢 LIVE<br><strong>${e.summary}</strong><br>${e.location || ""}`;
        }
        return `STATUS: 🏠 AT KITCHEN`;
    } catch (e) { return `STATUS: 🏠 AT KITCHEN`; }
}

async function updateLiveStatus() {
    const text = await getTruckLocation();
    document.getElementById('status').innerHTML = text;
}

// CALENDAR MODAL LOGIC
function openCalendar() { document.getElementById('calendar-modal').style.display = 'flex'; }
function closeCalendar() { document.getElementById('calendar-modal').style.display = 'none'; }

// CHATBOT LOGIC
function toggleChat() {
    document.getElementById('chat-box').classList.toggle('chat-hidden');
}

function handleChat() {
    const inputEl = document.getElementById('user-input');
    const display = document.getElementById('chat-display');
    const msg = inputEl.value.trim().toLowerCase();
    if (!msg) return;

    // Your message
    display.innerHTML += `<div style="text-align:right; margin:10px; color:var(--neon-yellow); font-family: Arial;">YOU: ${msg}</div>`;
    
    let reply = "I'm not sure. Try asking about our 'menu' or 'location'!";
    if (msg.includes("menu")) reply = "We have Loaded Potatoes, Fries, Nachos, and Salads!";
    if (msg.includes("location") || msg.includes("where")) reply = "Check the Truck Status box at the top of the page!";
    
    // PAYLOAD response with styled label
    display.innerHTML += `<div style="text-align:left; margin:10px; font-family: Arial; line-height: 1.4;">
        <span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black';">PAYLOAD SYSTEM:</span> ${reply}
    </div>`;
    
    inputEl.value = "";
    display.scrollTop = display.scrollHeight;
}

function openContact() {
    alert("Call us at (256) 652-9028 or Email: Getloaded256@gmail.com");
}