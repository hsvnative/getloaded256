const CONFIG = {
    API_KEY: 'AIzaSyD18G-d9Cc1BUHHBVBykTBtAY1_-YcdZBk',
    CAL_ID: 'aee6168afa0d10e2d826bf94cca06f6ceb5226e6e42ccaf903b285aa403c4aad@group.calendar.google.com',
    SQUARE_URL: 'https://get-loaded-256.square.site/s/order',
    BASE_ADDR: "1001 Ryland Pike Suite C, Huntsville, AL 35811"
};

let kbContent = "";
let hasGreeted = false;

window.onload = () => {
    fetch('knowledge_base.md').then(r => r.text()).then(d => { kbContent = d; });
    updateLiveStatus();
};

function toggleChat() {
    const box = document.getElementById('chat-box');
    const display = document.getElementById('chat-display');
    const launcher = document.getElementById('chat-launcher');
    
    box.classList.toggle('chat-hidden');

    if (!box.classList.contains('chat-hidden')) {
        launcher.style.animation = "none"; 
        
        if (!hasGreeted) {
            setTimeout(() => {
                display.innerHTML += `<div class="bot-msg"><strong>Bot:</strong> 🔥 Welcome to Get Loaded! How can I help you today?</div>`;
                display.scrollTop = display.scrollHeight;
                hasGreeted = true;
            }, 500);
        }
    }
}

function quickReply(text) {
    document.getElementById('user-input').value = text;
    handleChat();
}

async function handleChat() {
    const inputEl = document.getElementById('user-input');
    const input = inputEl.value.trim().toLowerCase();
    const display = document.getElementById('chat-display');
    if(!input) return;

    display.innerHTML += `<div class="user-msg">${input}</div>`;
    let res = "I'm not sure about that, but if it involves BBQ, I'm listening. Try asking about our 'menu', 'hours', or 'location'.";

    if (input.includes("menu") || input.includes("potato") || input.includes("fry") || input.includes("nacho") || input.includes("salad")) {
        res = "🔥 <strong>THE MENU:</strong><br>" + extractSection("## 3. Menu Details");
    } 
    else if (input.includes("hours") || input.includes("open") || input.includes("time") || input.includes("close")) {
        res = "🕒 <strong>HOURS:</strong><br>" + extractSection("## 1c. Hours");
    }
    else if (input.includes("area") || input.includes("radius") || input.includes("miles")) {
        res = "📍 <strong>SERVING AREA:</strong><br>" + extractSection("## 1b. Serving Area");
    }
    else if (input.includes("food") || input.includes("style") || input.includes("cuisine")) {
        res = "🍖 <strong>FOOD TYPE:</strong><br>" + extractSection("## 1a. Food Type");
    }
    else if (input.includes("order") || input.includes("hungry") || input.includes("buy")) {
        res = `Skip the line! <a href="${CONFIG.SQUARE_URL}" target="_blank" style="color:var(--get-loaded-yellow); font-weight:bold;">CLICK HERE TO ORDER</a>.`;
    }
    else if (input.includes("book") || input.includes("private") || input.includes("event")) {
        res = "<strong>Booking Info:</strong><br>" + extractSection("## 2. Private Booking Requirements");
    } 
    else if (input.includes("where") || input.includes("location") || input.includes("today") || input.includes("address")) {
        res = await getTruckLocation();
    }
	else if (input.includes("about") || input.includes("who are you") || input.includes("story") || input.includes("owner")) {
    res = "🍖 <strong>OUR STORY:</strong><br>" + extractSection("## 1d. About Us");
}

    display.innerHTML += `<div class="bot-msg"><strong>Bot:</strong> ${res}</div>`;
    inputEl.value = "";
    display.scrollTop = display.scrollHeight;
}

function extractSection(header) {
    if(!kbContent) return "System loading...";
    const lines = kbContent.split('\n');
    let out = "", active = false;
    for (let l of lines) {
        if (l.toLowerCase().includes(header.toLowerCase())) { active = true; continue; }
        if (active && (l.startsWith('##') || l.startsWith('###'))) break;
        if (active) out += l.replace(/\*/g, '').trim() + "<br>";
    }
    return out;
}

async function getTruckLocation() {
    try {
        const now = new Date();
        const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?timeMin=${now.toISOString()}&key=${CONFIG.API_KEY}&singleEvents=true&maxResults=1&orderBy=startTime`);
        const d = await r.json();
        
        if (d.items && d.items.length > 0) {
            const event = d.items[0];
            const startTime = new Date(event.start.dateTime || event.start.date);
            const location = event.location || "";
            
            // Map link ONLY for calendar events
            const mapBtn = location 
                ? `<br><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}" target="_blank" class="btn-yellow" style="margin-top:10px; font-size:0.8rem; padding:5px 10px;">📍 OPEN IN MAPS</a>` 
                : "";

            const diffInMinutes = Math.floor((startTime - now) / 1000 / 60);

            // 1. If the event is LIVE (Currently selling food)
            if (diffInMinutes <= 0) {
                return `🚚 <strong>TRUCK STATUS:</strong><br>We are LIVE at:<br><strong>${event.summary}</strong><br>${location}${mapBtn}`;
            }
            
            // 2. If the event starts within 60 minutes (On our way to sell food)
            if (diffInMinutes > 0 && diffInMinutes <= 60) {
                return `🚚 <strong>TRUCK STATUS:</strong><br><strong>On our way to:</strong><br>${event.summary}<br>Starts in ${diffInMinutes} mins!${mapBtn}`;
            }

            // 3. Event is later today (Directions provided so they can plan)
            return `🚚 <strong>TRUCK STATUS:</strong><br>The truck is currently at the kitchen.<br>Next stop: ${event.summary} at ${startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}${mapBtn}`;
        }
        
        // 4. Default: No selling events scheduled. No map button shown.
        return `🚚 <strong>TRUCK STATUS:</strong><br>The truck is currently at the kitchen preparing for the next run.<br>Check back soon for our next stop!`;
        
    } catch (error) {
        return `🚚 <strong>TRUCK STATUS:</strong><br>The truck is currently at the kitchen.`;
    }
}

async function updateLiveStatus() {
    document.getElementById('status').innerHTML = await getTruckLocation();
}