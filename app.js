const CONFIG = {
    API_KEY: 'AIzaSyD18G-d9Cc1BUHHBVBykTBtAY1_-YcdZBk', 
    CAL_ID: 'aee6168afa0d10e2d826bf94cca06f6ceb5226e6e42ccaf903b285aa403c4aad@group.calendar.google.com'
};

// --- KNOWLEDGE BASE CONFIGURATION ---
const KNOWLEDGE_BASE = {
    area: "We operate across Huntsville, Madison, and surrounding Madison County areas!",
    requirements: "Private event bookings require a $400 minimum spending guarantee and a 30x15 level parking area.",
    hours: "Our service hours depend on scheduled events. Check our calendar or ask about specific days!",
    about: "Get Loaded BBQ brings heavy-duty loaded potatoes, fries, nachos, and smoked meats to the Huntsville community!"
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

// --- TRUCK STATUS & LOCATION LOGIC ---
async function manageTruckAndOrdering() {
    const truckStatusText = document.getElementById('status');
    if (!truckStatusText) return;

    try {
        const now = new Date();
        const timeMin = new Date(now.getTime() - (12 * 60 * 60 * 1000)).toISOString();
        const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&key=${CONFIG.API_KEY}`;

        const r = await fetch(url);
        const data = await r.json();
        const events = data.items || [];

        const activeEvent = events.find(e => {
            const startStr = e.start.dateTime || e.start.date;
            const endStr = e.end.dateTime || e.end.date;
            if (!startStr) return false;

            const start = new Date(startStr);
            const end = new Date(endStr);
            
            const travelWindow = new Date(start.getTime() - (90 * 60000));
            return now >= travelWindow && now <= end;
        });

        if (activeEvent) {
            const startStr = activeEvent.start.dateTime || activeEvent.start.date;
            const endStr = activeEvent.end.dateTime || activeEvent.end.date;
            const start = new Date(startStr);
            const end = new Date(endStr);
            
            const eventLocation = activeEvent.location || "";
            let locationHtml = "";

            if (eventLocation) {
                const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventLocation)}`;
                locationHtml = `<br><a href="${mapUrl}" target="_blank" class="status-map-link">📍 ${eventLocation}</a>`;
            }

            if (now < start) {
                truckStatusText.innerHTML = `EN ROUTE TO: <br><span style="color:var(--neon-yellow)">${activeEvent.summary}</span>${locationHtml}`;
                setOrderButtonState(false, "ORDERING OPENS 30M BEFORE ARRIVAL");
            } else {
                truckStatusText.innerHTML = `CURRENTLY AT: <br><span style="color:var(--neon-yellow)">${activeEvent.summary}</span>${locationHtml}`;
                
                const closeTime = new Date(end.getTime() - 10 * 60000);
                if (now <= closeTime) {
                    setOrderButtonState(true, "✅ ONLINE ORDERING ACTIVE");
                } else {
                    setOrderButtonState(false, "ORDERING CLOSED (LAST CALL PASSED)");
                }
            }
        } else {
            const nextEventToday = events.find(e => new Date(e.start.dateTime || e.start.date) > now);
            
            if (nextEventToday) {
                const startTime = new Date(nextEventToday.start.dateTime || nextEventToday.start.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const loc = nextEventToday.location ? `<br>📍 ${nextEventToday.location}` : '';
                truckStatusText.innerHTML = `NEXT STOP AT ${startTime}: <br><span style="color:var(--neon-yellow)">${nextEventToday.summary}</span>${loc}`;
            } else {
                truckStatusText.innerHTML = `STATUS: PREPARING AT THE KITCHEN`;
            }
            setOrderButtonState(false, "OFFLINE - NO ACTIVE EVENTS");
        }
    } catch (e) {
        console.error("Truck status error:", e);
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

// --- CHAT LOGIC & KNOWLEDGE BASE INTEGRATION ---
async function handleChat() { 
    const inputEl = document.getElementById('user-input');
    const display = document.getElementById('chat-display');
    if (!inputEl || !display) return;

    const msg = inputEl.value.trim().toLowerCase(); 
    if (!msg) return; 

    // Render user message
    const userDiv = document.createElement('div');
    userDiv.style.textAlign = "right";
    userDiv.style.color = "var(--neon-yellow)";
    userDiv.style.marginBottom = "10px";
    userDiv.innerText = `YOU: ${msg}`;
    display.appendChild(userDiv);
    inputEl.value = "";

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']; 
    const isCalendarQuery = msg.includes("/") || 
                            msg.includes("free") || 
                            msg.includes("available") || 
                            msg.includes("today") || 
                            msg.includes("tomorrow") || 
                            days.some(day => msg.includes(day));

    // 1. CALENDAR AVAILABILITY CHECK
    if (isCalendarQuery) { 
        const loadingId = "loading-" + Date.now(); 
        renderPayloadReply(`<span id="${loadingId}">Scanning coordinates...</span>`); 
        const reply = await checkCalendarAvailability(msg); 
        const loadingEl = document.getElementById(loadingId); 
        if (loadingEl) loadingEl.parentElement.remove(); 
        return renderPayloadReply(reply); 
    } 

    // 2. GENERAL MENU OVERVIEW OR DIRECT MATCH
    if (msg === "menu" || msg.includes("what is on the menu") || msg.includes("full menu")) {
        return renderPayloadReply(
            "📋 <strong>OUR MENU CATEGORIES:</strong><br>" +
            "• Loaded Potatoes ($11 - $16)<br>" +
            "• Loaded Fries ($8 - $16)<br>" +
            "• Loaded Salads ($11 - $16)<br>" +
            "• Loaded Nachos ($8 - $16)<br><br>" +
            "<em>Ask about specific items like 'brisket fries', 'veggie potato', or 'drinks'!</em>"
        );
    }

    // 3. SPECIFIC MENU SEARCH FROM HTML DOM
    const menuQuery = checkMenuQuery(msg);
    if (menuQuery) {
        return renderPayloadReply(menuQuery);
    }

    // 4. KNOWLEDGE BASE MATCHING
    if (msg.includes("where") || msg.includes("area") || msg.includes("radius") || msg.includes("huntsville") || msg.includes("location")) { 
        return renderPayloadReply(KNOWLEDGE_BASE.area); 
    } 
    if (msg.includes("requirement") || msg.includes("cost") || msg.includes("minimum") || msg.includes("price") || msg.includes("guarantee")) { 
        return renderPayloadReply(KNOWLEDGE_BASE.requirements); 
    } 
    if (msg.includes("hour") || msg.includes("time") || msg.includes("lunch") || msg.includes("dinner") || msg.includes("open")) { 
        return renderPayloadReply(KNOWLEDGE_BASE.hours); 
    } 
    if (msg.includes("about") || msg.includes("who") || msg.includes("story") || msg.includes("owner")) { 
        return renderPayloadReply(KNOWLEDGE_BASE.about); 
    } 
    if (msg.includes("catering") || msg.includes("contact") || msg.includes("call") || msg.includes("book") || msg.includes("email")) { 
        return renderPayloadReply("For catering quotes, use the CALL or EMAIL buttons below. Private events require a $400 minimum guarantee and 2 weeks notice!"); 
    } 

    // 5. FALLBACK MESSAGE
    renderPayloadReply("I specialize in scheduling and general truck info. Try asking 'where do you deliver?', 'what are your hours?', 'how much is brisket?', or 'is the truck free Friday?'."); 
}

// Fixed Menu Item Search Routine
function checkMenuQuery(msg) {
    const items = document.querySelectorAll('.menu-item');
    let matches = [];

    // Filter out short stop words
    const searchTerms = msg.split(" ").filter(w => w.length > 2 && !["what", "have", "you", "does", "with", "from"].includes(w));

    if (searchTerms.length === 0) return null;

    items.forEach(item => {
        const headerText = item.querySelector('.item-header')?.innerText || "";
        const descText = item.querySelector('p')?.innerText || "";
        const fullText = (headerText + " " + descText).toLowerCase();

        if (searchTerms.some(term => fullText.includes(term))) {
            matches.push(`• <strong>${headerText.replace('\n', ' - ')}</strong>${descText ? `<br>&nbsp;&nbsp;<em>${descText}</em>` : ''}`);
        }
    });

    if (matches.length > 0) {
        return `Here is what I found on our menu matching your request:<br><br>${matches.slice(0, 4).join('<br><br>')}`;
    }

    return null;
}

async function checkCalendarAvailability(userMsg) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    let targetDate = new Date(todayMidnight);
    let dayFound = false;

    if (userMsg.includes("today")) { dayFound = true; } 
    else if (userMsg.match(/(\d{1,2})\/(\d{1,2})/)) {
        const dateMatch = userMsg.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
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
    if (targetDate < todayMidnight) return "The Payload System does not support retroactive bookings.";

    const dateLabel = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    try {
        const tMin = new Date(targetDate.getTime()).toISOString();
        const tMax = new Date(targetDate.getTime() + 24 * 60 * 60000).toISOString();
        
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?singleEvents=true&timeMin=${tMin}&timeMax=${tMax}&key=${CONFIG.API_KEY}`;
        const r = await fetch(url);
        const data = await r.json();
        const events = data.items || [];
        
        console.log("Calendar Scan for:", dateLabel, "Events found:", events);

        let btnHtml = `Results for <strong>${dateLabel}</strong>:<br>`;
        const slots = [{l:"11AM-1PM", h:11}, {l:"4PM-6PM", h:16}];

        slots.forEach(s => {
            const isToday = targetDate.toDateString() === now.toDateString();
            const isPastTime = isToday && now.getHours() >= s.h;

            const isBooked = events.some(e => {
                const eStartStr = e.start.dateTime || e.start.date;
                const eEndStr = e.end.dateTime || e.end.date;
                const eStart = new Date(eStartStr);
                const eEnd = new Date(eEndStr);

                const sStart = new Date(targetDate); sStart.setHours(s.h, 0, 0);
                const sEnd = new Date(targetDate); sEnd.setHours(s.h + 2, 0, 0);

                return (eStart < sEnd && eEnd > sStart);
            });
            
            if (isPastTime) {
                btnHtml += `<br><span style="color:#666;">⌛ ${s.l} (WINDOW CLOSED)</span>`;
            } else if (isBooked) {
                btnHtml += `<br><span style="color:#666;">❌ ${s.l} (BOOKED)</span>`;
            } else {
                const subject = encodeURIComponent(`Booking Request: ${dateLabel} (${s.l})`);
                const bodyLines = [
                    `I would like to request a booking for ${dateLabel} (${s.l}).`,
                    '', 'EVENT DETAILS:', '1. Address:', '2. Guest Count:', '3. Phone:', '4. Event Type:',
                    '', 'CRITERIA:', '- 50 guest min', '- 30x15 level ground', '- 1hr early access'
                ];
                const mailto = `mailto:Getloaded256@gmail.com?subject=${subject}&body=${encodeURIComponent(bodyLines.join('\r\n'))}`;
                btnHtml += `<br><a href="${mailto}" class="chat-btn"><span class="check-box">✓</span> ${s.l}</a>`;
            }
        });

        return btnHtml;
    } catch (e) { 
        console.error("Calendar Error:", e);
        return "Sync error. Call (256) 652-9028."; 
    }
}

// Added weekly schedule
async function renderWeeklySchedule() {
    const container = document.getElementById('weekly-schedule-container');
    if (!container) return;

    try {
        const now = new Date();
        // Start of today
        const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        // 7 days from now
        const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59).toISOString();

        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CONFIG.CAL_ID)}/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&key=${CONFIG.API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();
        const events = data.items || [];

        if (events.length === 0) {
            container.innerHTML = "<p>No public stops scheduled for this week. Contact us for private catering!</p>";
            return;
        }

        let html = '<div class="weekly-grid">';
        events.forEach(e => {
            const start = new Date(e.start.dateTime || e.start.date);
            const end = new Date(e.end.dateTime || e.end.date);

            const dayName = start.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            const dateStr = start.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
            const timeRange = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            
            const mapUrl = e.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}` : '#';

            html += `
                <div class="weekly-item">
                    <div class="weekly-date-badge">
                        <span class="day">${dayName}</span>
                        <span class="date">${dateStr}</span>
                    </div>
                    <div class="weekly-details">
                        <strong>${e.summary}</strong>
                        <span class="time">⏰ ${timeRange}</span>
                        ${e.location ? `<a href="${mapUrl}" target="_blank" class="map-link">📍 ${e.location}</a>` : ''}
                    </div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;
    } catch (e) {
        console.error("Error loading weekly schedule:", e);
        container.innerHTML = "<p>Unable to load schedule. Check Facebook for updates!</p>";
    }
}

// Call inside DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    manageTruckAndOrdering(); 
    renderWeeklySchedule(); // <--- ADD THIS
    
    const inputEl = document.getElementById('user-input');
    if (inputEl) {
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleChat();
        });
    }
});

function openCalendar() { document.getElementById('calendar-modal').style.display = 'flex'; }
function closeCalendar() { document.getElementById('calendar-modal').style.display = 'none'; }
