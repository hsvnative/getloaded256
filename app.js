const CONFIG = {
    API_KEY: 'YOUR_ACTUAL_API_KEY', 
    CAL_ID: 'aee6168afa0d10e2d826bf94cca06f6ceb5226e6e42ccaf903b285aa403c4aad@group.calendar.google.com'
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    manageTruckAndOrdering(); 
    
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

function sendInitialWelcome() {
    const welcomeText = `
        Welcome! How can I help you today?
        <br><br>
        <button onclick="triggerAvailability()" class="chat-btn" style="width:100%; justify-content:center; cursor:pointer;">
            📅 CHECK AVAILABILITY
        </button>
    `;
    renderPayloadReply(welcomeText);
}

// This is your Calendar Selection UI
function triggerAvailability() {
    const calendarHtml = `
        <div style="margin-top: 10px;">
            <label style="font-size: 0.7rem; color: var(--neon-yellow);">SELECT TARGET DATE:</label><br>
            <input type="date" id="chat-date-picker" class="industrial-date-input">
            <button onclick="handleCalendarSelection()" class="chat-btn" style="width:100%; margin-top:10px; justify-content:center; cursor:pointer;">
                CHECK DATE
            </button>
        </div>
    `;
    renderPayloadReply(calendarHtml);
}

// Processes the calendar click
async function handleCalendarSelection() {
    const dateInput = document.getElementById('chat-date-picker');
    if (!dateInput.value) return;

    const [year, month, day] = dateInput.value.split('-');
    const formattedDate = `${month}/${day}/${year}`;
    
    const display = document.getElementById('chat-display');
    const userDiv = document.createElement('div');
    userDiv.style.textAlign = "right";
    userDiv.style.color = "var(--neon-yellow)";
    userDiv.style.marginBottom = "10px";
    userDiv.innerText = `YOU SELECTED: ${formattedDate}`;
    display.appendChild(userDiv);

    const loadingId = "loading-" + Date.now();
    renderPayloadReply(`<span id="${loadingId}">Scanning coordinates for ${formattedDate}...</span>`);
    
    const reply = await checkCalendarAvailability(formattedDate);
    
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.parentElement.remove();
    renderPayloadReply(reply);
}

function renderPayloadReply(text) {
    const display = document.getElementById('chat-display');
    if (!display) return;
    const msgDiv = document.createElement('div');
    msgDiv.style.marginBottom = "15px";
    msgDiv.innerHTML = `<strong>PAYLOAD SYSTEM:</strong><br>${text}`;
    display.appendChild(msgDiv);
    display.scrollTop = display.scrollHeight;
}

// --- TRUCK STATUS & SQUARE LOGIC ---
async function manageTruckAndOrdering() {
    const truckStatusText = document.getElementById('status');
    
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}&timeMin=${startOfToday}`;
        
        const r = await fetch(url);
        const data = await r.json();
        const events = data.items || [];

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
                truckStatusText.innerHTML = `🚚 EN ROUTE TO: <br><span style="color:var(--neon-yellow)">${activeEvent.summary}</span>`;
                setOrderButtonState(false, "ORDERING OPENS 30M BEFORE ARRIVAL");
            } else {
                truckStatusText.innerHTML = `📍 CURRENTLY AT: <br><span style="color:var(--neon-yellow)">${activeEvent.summary}</span>`;
                const closeTime = new Date(end.getTime() - 30 * 60000);
                if (now <= closeTime) {
                    setOrderButtonState(true, "✅ ONLINE ORDERING ACTIVE");
                } else {
                    setOrderButtonState(false, "ORDERING CLOSED (LAST CALL PASSED)");
                }
            }
        } else {
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
    if (!btn || !status) return;

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
    } else if (msg.includes("catering") || msg.includes("contact") || msg.includes("call")) {
        renderPayloadReply("For catering quotes, use the CALL or EMAIL buttons below, or ask about a specific date!");
    } else {
        renderPayloadReply("I specialize in scheduling. Try asking if we are 'available Friday' or 'free today'.");
    }
}

async function checkCalendarAvailability(userMsg) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    let targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    let dayFound = false;

    if (userMsg.includes("today")) {
        dayFound = true;
    } 
    else if (userMsg.match(/(\d{1,2})\/(\d{1,2})/)) {
        const dateMatch = userMsg.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
        const month = parseInt(dateMatch[1]) - 1; 
        const day = parseInt(dateMatch[2]);
        let year = dateMatch[3] ? parseInt(dateMatch[3]) : now.getFullYear();
        if (dateMatch[3] && dateMatch[3].length === 2) year = 2000 + year;
        targetDate = new Date(year, month, day, 0, 0, 0, 0);
        dayFound = true;
    } 
    else {
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
    
    const dateLabel = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    try {
        const timeMin = new Date(targetDate).toISOString();
        const timeMax = new Date(targetDate.getTime() + 24 * 60 * 60000).toISOString();
        
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?singleEvents=true&timeMin=${timeMin}&timeMax=${timeMax}&key=${CONFIG.API_KEY}`;
        const r = await fetch(url);
        const data = await r.json();
        const events = data.items || [];
        
        let btnHtml = `Results for <strong>${dateLabel}</strong>:<br>`;
        let available = false;

        [{l:"11AM-1PM", h:11}, {l:"4PM-6PM", h:16}].forEach(s => {
            const isBooked = events.some(e => {
                const eventStart = new Date(e.start.dateTime || e.start.date);
                return eventStart.getHours() === s.h;
            });
            
            if (!isBooked) {
                available = true;
                const bodyLines = [
                    `I would like to request a booking for ${dateLabel} (${s.l}).`,
                    '',
                    'EVENT DETAILS:',
                    '1. Exact Address:',
                    '2. Guest Count:',
                    '3. Contact Name/Phone:',
                    '4. Event Type:',
                    '',
                    'BOOKING CRITERIA:',
                    '- 50 guest minimum for private events.',
                    '- 30ft x 15ft level ground required.',
                    '- Site access 1 hour prior to service.'
                ];
                const subjectText = `Booking Request: ${dateLabel} (${s.l})`;
                const bodyText = bodyLines.join('\r\n');
                const mailtoLink = `mailto:Getloaded256@gmail.com?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;
                
                btnHtml += `<br><a href="${mailtoLink}" class="chat-btn"><span class="check-box">✓</span> ${s.l}</a>`;
            } else {
                btnHtml += `<br><span style="color:#666;">❌ ${s.l} (BOOKED)</span>`;
            }
        });
        return available ? btnHtml : `Sorry, ${dateLabel} is fully booked!`;
    } catch (e) { return "Sync error. Call (256) 652-9028."; }
}

function openCalendar() { document.getElementById('calendar-modal').style.display = 'flex'; }
function closeCalendar() { document.getElementById('calendar-modal').style.display = 'none'; }