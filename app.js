const CONFIG = {
    API_KEY: 'YOUR_ACTUAL_API_KEY', 
    CAL_ID: 'aee6168afa0d10e2d826bf94cca06f6ceb5226e6e42ccaf903b285aa403c4aad@group.calendar.google.com'
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    manageTruckAndOrdering(); // Handle Square button and Status Card
    
    const inputEl = document.getElementById('user-input');
    if(inputEl) {
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleChat();
        });
    }
});

// --- UI & CHAT CONTROLS ---
function toggleChat() {
    const chatBox = document.getElementById('chat-box');
    const display = document.getElementById('chat-display');
    if (!chatBox) return;

    chatBox.classList.toggle('chat-hidden');
    
    if (!chatBox.classList.contains('chat-hidden') && display.innerHTML === "") {
        sendInitialWelcome();
    }
}

// Updated Welcome
function sendInitialWelcome() {
    const welcomeText = `
        Welcome! How can I help you today?
        <br><br>
        <button onclick="triggerAvailability()" class="chat-btn" style="width:100%; justify-content:center;">
            📅 CHECK AVAILABILITY
        </button>
    `;
    renderPayloadReply(welcomeText);
}

// This function "fakes" a user message to get the bot moving
function triggerAvailability() {
    renderPayloadReply("Which day are you interested in? (e.g., 'Friday' or '2/24')");
}

// Updated Calendar Logic: Fixed button visibility
async function checkCalendarAvailability(userMsg) {
    // ... (Keep your existing date parsing logic at the top) ...
    
    // Replace the part where it builds the buttons (btnHtml) with this:
    let btnHtml = `Results for <strong>${dateLabel}</strong>:<br>`;
    let available = false;

    [{l:"11AM-1PM", h:11}, {l:"4PM-6PM", h:16}].forEach(s => {
        const booked = (data.items || []).some(e => {
            const start = new Date(e.start.dateTime || e.start.date);
            return start.toDateString() === targetDate.toDateString() && new Date(e.start.dateTime).getHours() === s.h;
        });
        
        if (!booked) {
            available = true;
            // The logic below ensures text is black on yellow background
            btnHtml += `<br><a href="mailto:Getloaded256@gmail.com?subject=Booking ${dateLabel}" class="chat-btn"><span class="check-box">✓</span> ${s.l}</a>`;
        } else {
            btnHtml += `<br><span style="color:#666;">❌ ${s.l} (BOOKED)</span>`;
        }
    });
    return available ? btnHtml : "Fully booked that day!";
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

// --- TRUCK STATUS & SQUARE LOGIC ---
async function manageTruckAndOrdering() {
    const orderBtn = document.getElementById('order-button');
    const statusMsg = document.getElementById('order-status-msg');
    const truckStatusText = document.getElementById('status');
    
    try {
        const now = new Date();
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}&timeMin=${now.toISOString()}`;
        
        const r = await fetch(url);
        const data = await r.json();
        const events = data.items || [];

        // Find event where (Start - 60m) <= Now <= End
        const activeEvent = events.find(e => {
            if (!e.start.dateTime) return false;
            const start = new Date(e.start.dateTime);
            const end = new Date(e.end.dateTime);
            const travelWindow = new Date(start.getTime() - 60 * 60000);
            return now >= travelWindow && now <= end;
        });

        if (activeEvent) {
            const start = new Date(activeEvent.start.dateTime);
            const end = new Date(activeEvent.end.dateTime);
            
            if (now < start) {
                // STATE: TRAVELING
                truckStatusText.innerHTML = `🚚 EN ROUTE TO: <br><span style="color:var(--neon-yellow)">${activeEvent.summary}</span>`;
                setOrderButtonState(false, "ORDERING OPENS 30M BEFORE ARRIVAL");
            } else {
                // STATE: SERVING
                truckStatusText.innerHTML = `📍 CURRENTLY AT: <br><span style="color:var(--neon-yellow)">${activeEvent.summary}</span>`;
                
                // Square Window: Open 30m before start until 30m before end
                const closeTime = new Date(end.getTime() - 30 * 60000);
                if (now <= closeTime) {
                    setOrderButtonState(true, "✅ ONLINE ORDERING ACTIVE");
                } else {
                    setOrderButtonState(false, "ORDERING CLOSED (LAST CALL PASSED)");
                }
            }
        } else {
            // STATE: PREPARING
            truckStatusText.innerHTML = `🔥 STATUS: PREPARING AT THE KITCHEN`;
            setOrderButtonState(false, "OFFLINE - NO ACTIVE EVENTS");
        }
    } catch (e) {
        truckStatusText.innerText = "OFFLINE - CHECK FACEBOOK";
    }
}

function setOrderButtonState(active, msg) {
    const btn = document.getElementById('order-button');
    const status = document.getElementById('order-status-msg');
    if (active) {
        btn.style.background = "var(--neon-yellow)";
        btn.style.color = "#000";
        btn.style.pointerEvents = "auto";
        btn.style.opacity = "1";
        status.style.color = "var(--neon-yellow)";
    } else {
        btn.style.background = "#222";
        btn.style.color = "#555";
        btn.style.pointerEvents = "none";
        btn.style.opacity = "0.7";
        status.style.color = "#666";
    }
    status.innerHTML = msg;
}

// --- CHAT LOGIC ---
async function handleChat() {
    const inputEl = document.getElementById('user-input');
    const display = document.getElementById('chat-display');
    if (!inputEl) return;
    const msg = inputEl.value.trim().toLowerCase();
    if (!msg) return;

    const userDiv = document.createElement('div');
    userDiv.style.textAlign = "right";
    userDiv.style.color = "var(--neon-yellow)";
    userDiv.style.marginBottom = "10px";
    userDiv.innerText = `YOU: ${msg}`;
    display.appendChild(userDiv);
    inputEl.value = "";

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const isCalendarQuery = msg.includes("/") || msg.includes("free") || msg.includes("available") || 
                            msg.includes("today") || msg.includes("tomorrow") || 
                            days.some(d => msg.includes(d));

    if (isCalendarQuery) {
        const loadingId = "loading-" + Date.now();
        renderPayloadReply(`<span id="${loadingId}">Scanning coordinates...</span>`);
        const reply = await checkCalendarAvailability(msg);
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.parentElement.remove();
        renderPayloadReply(reply);
    } else if (msg.includes("catering") || msg.includes("contact")) {
        renderPayloadReply("For catering quotes, call us at <a href='tel:2566529028'>(256) 652-9028</a>!");
    } else {
        renderPayloadReply("I specialize in scheduling. Try asking 'Available this Friday?'");
    }
}

async function checkCalendarAvailability(userMsg) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    let targetDate = new Date(todayLocal);
    let dayFound = false;

    const dateMatch = userMsg.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (dateMatch) {
        const month = parseInt(dateMatch[1]) - 1; 
        const day = parseInt(dateMatch[2]);
        let year = dateMatch[3] ? parseInt(dateMatch[3]) : now.getFullYear();
        targetDate = new Date(year, month, day, 0, 0, 0, 0);
        dayFound = true;
    } else {
        const dayIndex = days.findIndex(d => userMsg.includes(d));
        if (dayIndex !== -1) {
            let ahead = (dayIndex - now.getDay() + 7) % 7;
            if (ahead === 0) ahead = 7;
            targetDate.setDate(now.getDate() + ahead);
            dayFound = true;
        } else if (userMsg.includes("tomorrow")) {
            targetDate.setDate(now.getDate() + 1);
            dayFound = true;
        }
    }

    if (!dayFound) return "Which day? (e.g., 'Friday' or '2/24')";
    const dateLabel = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    try {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}`;
        const r = await fetch(url);
        const data = await r.json();
        
        let btnHtml = `Results for <strong>${dateLabel}</strong>:<br>`;
        let available = false;

        [{l:"11AM-1PM", h:11}, {l:"4PM-6PM", h:16}].forEach(s => {
            const booked = (data.items || []).some(e => {
                const start = new Date(e.start.dateTime || e.start.date);
                return start.toDateString() === targetDate.toDateString() && new Date(e.start.dateTime).getHours() === s.h;
            });
            if (!booked) {
                available = true;
                btnHtml += `<br><a href="mailto:Getloaded256@gmail.com?subject=Booking ${dateLabel}" class="chat-btn">✅ ${s.l}</a>`;
            } else {
                btnHtml += `<br><span style="color:#666;">❌ ${s.l} (BOOKED)</span>`;
            }
        });
        return available ? btnHtml : "Fully booked that day!";
    } catch (e) { return "Sync error. Call (256) 652-9028."; }
}

function openCalendar() { document.getElementById('calendar-modal').style.display = 'flex'; }
function closeCalendar() { document.getElementById('calendar-modal').style.display = 'none'; }