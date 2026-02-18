const CONFIG = {
    API_KEY: 'REPLACED_BY_GITHUB_ACTION', 
    CAL_ID: 'aee6168afa0d10e2d826bf94cca06f6ceb5226e6e42ccaf903b285aa403c4aad@group.calendar.google.com'
};

window.onload = () => { updateLiveStatus(); };

// TRUCK STATUS LOGIC
async function getTruckLocation() {
    try {
        const now = new Date();
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?timeMin=${new Date().toISOString()}&singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}`;
        
        const r = await fetch(url);
        const d = await r.json();
        
        if (d.items && d.items.length > 0) {
            // Find the first event that hasn't ended yet
            const e = d.items.find(event => {
                const end = new Date(event.end.dateTime || event.end.date);
                return end > now;
            });

            if (e) {
                const startTime = new Date(e.start.dateTime || e.start.date);
                const endTime = new Date(e.end.dateTime || e.end.date);

                // Use a 5-minute buffer to prevent "Status Flickering"
                const isLive = now >= startTime && now <= endTime;

                if (isLive) {
                    return `STATUS: 🟢 LIVE<br><strong>${e.summary}</strong><br>${e.location || "Huntsville, AL"}`;
                } else {
                    // It's in the future
                    const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return `STATUS: 🏠 AT KITCHEN<br><strong>Next Stop:</strong> ${e.summary}<br>Arrival: ${timeStr}`;
                }
            }
        }
        return `STATUS: 🏠 AT KITCHEN<br>Check back soon!`;
    } catch (e) { 
        console.error("Location Error:", e);
        return `STATUS: 🏠 AT KITCHEN`; 
    }
}

// Add this URL to your CONFIG at the top
const ORDER_URL = "https://get-loaded-256.square.site/s/order";

async function updateLiveStatus() {
    const now = new Date();
    const orderBtn = document.getElementById('order-button');
    const orderMsg = document.getElementById('order-status-msg');
    
    const truckData = await getTruckLocationData(); // Helper function below
    
    if (truckData.activeEvent) {
        const e = truckData.activeEvent;
        const startTime = new Date(e.start.dateTime || e.start.date);
        const endTime = new Date(e.end.dateTime || e.end.date);
        
        // Calculate the "Order Window" (30 mins before start to 30 mins before end)
        const orderOpen = new Date(startTime.getTime() - (30 * 60000));
        const orderClose = new Date(endTime.getTime() - (30 * 60000));

        if (now >= orderOpen && now <= orderClose) {
            // WINDOW IS OPEN
            orderBtn.href = ORDER_URL;
            orderBtn.style.opacity = "1";
            orderBtn.style.pointerEvents = "auto";
            orderBtn.innerHTML = "🛒 ORDER FOR PICKUP";
            orderMsg.innerHTML = "Accepting orders until " + orderClose.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } else if (now < orderOpen) {
            // TOO EARLY
            orderBtn.href = "#";
            orderBtn.style.opacity = "0.5";
            orderBtn.style.pointerEvents = "none";
            orderBtn.innerHTML = "ORDERING OPENS SOON";
            orderMsg.innerHTML = "Orders open at " + orderOpen.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } else {
            // WINDOW CLOSED
            orderBtn.href = "#";
            orderBtn.style.opacity = "0.5";
            orderBtn.style.pointerEvents = "none";
            orderBtn.innerHTML = "ORDERING CLOSED";
            orderMsg.innerHTML = "We are no longer accepting online orders for this stop.";
        }
    } else {
        // No event scheduled
        orderBtn.style.opacity = "0.5";
        orderBtn.style.pointerEvents = "none";
        orderBtn.innerHTML = "ONLINE ORDERING OFF";
        orderMsg.innerHTML = "Check the schedule for our next stop!";
    }

    document.getElementById('status').innerHTML = truckData.statusText;
}

// Helper to get data without repeating code
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
                const statusText = isLive 
                    ? `STATUS: 🟢 LIVE<br><strong>${e.summary}</strong><br>${e.location || ""}`
                    : `STATUS: 🏠 AT KITCHEN<br><strong>Next Stop:</strong> ${e.summary}<br>Arrival: ${startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                
                return { activeEvent: e, statusText: statusText };
            }
        }
        return { activeEvent: null, statusText: `STATUS: 🏠 AT KITCHEN` };
    } catch (e) { return { activeEvent: null, statusText: `STATUS: 🏠 AT KITCHEN` }; }
}

// CALENDAR MODAL LOGIC
function openCalendar() { document.getElementById('calendar-modal').style.display = 'flex'; }
function closeCalendar() { document.getElementById('calendar-modal').style.display = 'none'; }

// CHATBOT LOGIC
function toggleChat() {
    const chatBox = document.getElementById('chat-box');
    const display = document.getElementById('chat-display');
    
    chatBox.classList.toggle('chat-hidden');

    // Only add the welcome message if the chat is empty
    if (display.innerHTML === "") {
        display.innerHTML += `
            <div style="text-align:left; margin:10px; font-family: Arial; line-height: 1.4; color: white;">
                <span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black'; display:block; margin-bottom:2px;">PAYLOAD SYSTEM:</span> 
                Welcome. Bookings, catering requests, and general questions can be asked right here. 
                How can we get you loaded today?
            </div>
        `;
    }
}

// Update handleChat to include a 'booking' keyword
async function handleChat() {
    const inputEl = document.getElementById('user-input');
    const display = document.getElementById('chat-display');
    const msg = inputEl.value.trim().toLowerCase();
    if (!msg) return;

    // 1. Display User Message
    display.innerHTML += `<div style="text-align:right; margin:10px; color:var(--neon-yellow); font-family: Arial; text-transform: uppercase;">YOU: ${msg}</div>`;
    inputEl.value = ""; // Clear input immediately

    // 2. SEARCH LOGIC CHAIN
    if (msg.includes("available") || msg.includes("book") || msg.includes("friday") || msg.includes("saturday") || msg.includes("today") || msg.includes("tomorrow")) {
        display.innerHTML += `<div id="loading-msg" style="text-align:left; margin:10px; font-family: Arial; color: white;"><span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black';">PAYLOAD SYSTEM:</span> Scanning coordinates and schedule...</div>`;
        display.scrollTop = display.scrollHeight;
        
        const availabilityReply = await checkCalendarAvailability(msg);
        const loading = document.getElementById('loading-msg');
        if(loading) loading.remove();
        
        renderPayloadReply(availabilityReply, true); // true means it's already formatted
    } 
    else if (msg.includes("menu") || msg.includes("food") || msg.includes("eat")) {
        renderPayloadReply("We serve Loaded Potatoes, Fries, Nachos, and Salads. Everything is loaded... but our cooks!");
    }
    else if (msg.includes("special") || msg.includes("deal") || msg.includes("discount")) {
        renderPayloadReply(`We post our daily specials on our Facebook page!<br><br><a href="https://www.facebook.com/getloaded256/" target="_blank" style="color:black; background:var(--neon-yellow); padding:5px 10px; text-decoration:none; font-weight:bold; border-radius:4px; font-size:12px;">VIEW TODAY'S SPECIALS</a>`, true);
    }
    else if (msg.includes("location") || msg.includes("where")) {
        renderPayloadReply("Our location changes daily! Check the 'Truck Status' box on the main page for live GPS coordinates.");
    }
    else if (msg.includes("hours") || msg.includes("time") || msg.includes("open")) {
        renderPayloadReply("Our hours vary by location. Click the 'VIEW FULL SCHEDULE' button to see exactly when we'll be serving today!");
    }
    else if (msg.includes("contact") || msg.includes("call") || msg.includes("phone")) {
        renderPayloadReply("You can reach us at (256) 652-9028 or email Getloaded256@gmail.com.");
    }
    else {
        renderPayloadReply("I'm not sure about that. Try asking if we are 'available this Friday' or use the **CONTACT** and **FACEBOOK** links at the top of the page!");
    }

    display.scrollTop = display.scrollHeight;
}

// Fixed Helper Function
function renderPayloadReply(text, isFormatted = false) {
    const display = document.getElementById('chat-display');
    const label = `<span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black'; display:block; margin-bottom:2px; text-transform: uppercase;">PAYLOAD SYSTEM:</span>`;
    
    // If the checkCalendarAvailability already provides the label, don't double it
    const finalContent = isFormatted && text.includes("PAYLOAD SYSTEM") ? text : label + text;

    display.innerHTML += `<div style="text-align:left; margin:10px; font-family: Arial; line-height: 1.4; color: white; text-transform: none;">
        ${finalContent}
    </div>`;
}}

// Helper function to keep the code clean and consistent
function renderPayloadReply(text) {
    const display = document.getElementById('chat-display');
    display.innerHTML += `<div style="text-align:left; margin:10px; font-family: Arial; line-height: 1.4; color: white; text-transform: none;">
        <span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black'; display:block; margin-bottom:2px; text-transform: uppercase;">PAYLOAD SYSTEM:</span> ${text}
    </div>`;
}

async function checkCalendarAvailability(userMsg) {
    const requirements = `<br>• $500 minimum spend<br>• $100 deposit<br>• Flat surface for parking`;
    
    // Get actual Day of Week for "today" / "tomorrow"
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayIndex = new Date().getDay();
    
    let targetDay = "";
    if (userMsg.includes("today")) targetDay = days[todayIndex];
    else if (userMsg.includes("tomorrow")) targetDay = days[(todayIndex + 1) % 7];
    else targetDay = days.find(d => userMsg.includes(d)) || "";

    try {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}`;
        const r = await fetch(url);
        const d = await r.json();

        // FUZZY CONFLICT CHECK
        const isConflict = d.items.some(e => {
            const summary = e.summary.toLowerCase();
            const eventDate = new Date(e.start.dateTime || e.start.date);
            const eventDayName = days[eventDate.getDay()];
            
            // Checks if the day names match OR if a specific date string is found
            return (targetDay !== "" && eventDayName === targetDay) || 
                   (userMsg.includes(summary)); 
        });

        if (isConflict) {
            return `<span style="color:var(--neon-yellow); font-weight:bold;">PAYLOAD SYSTEM:</span> That slot is currently occupied. Check our 'View Full Schedule' for other openings!`;
        } else {
            return `<span style="color:var(--neon-yellow); font-weight:bold;">PAYLOAD SYSTEM:</span> ${targetDay.toUpperCase()} looks clear! ${requirements}<br><br>
            <a href="YOUR_LINK" target="_blank" style="color:black; background:var(--neon-yellow); padding:8px; text-decoration:none; font-weight:bold; border-radius:4px; font-size:11px;">PAY DEPOSIT</a>`;
        }
    } catch (e) {
        return `<span style="color:var(--neon-yellow); font-weight:bold;">PAYLOAD SYSTEM:</span> I'm having trouble reaching the calendar. Call (256) 652-9028!`;
    }
}

function handleChat() {
    const inputEl = document.getElementById('user-input');
    const display = document.getElementById('chat-display');
    const msg = inputEl.value.trim().toLowerCase();
    if (!msg) return;

    // Display User Message
    display.innerHTML += `<div style="text-align:right; margin:10px; color:var(--neon-yellow); font-family: Arial;">YOU: ${msg}</div>`;
    
    let reply = "I'm not sure. Try asking about our 'menu', 'location', or 'hours'!";
    
    // NEW LOGIC FOR HOURS AND MENU
    if (msg.includes("menu") || msg.includes("eat") || msg.includes("food")) {
        reply = "We serve Loaded Potatoes, Fries, Nachos, and Salads. Everything is loaded... but our cooks!";
    } 
    else if (msg.includes("location") || msg.includes("where")) {
        reply = "Our location changes daily! Check the 'Truck Status' box on the main page for our live GPS coordinates.";
    }
    else if (msg.includes("hours") || msg.includes("time") || msg.includes("open")) {
        reply = "Our hours vary by location. Click the 'VIEW FULL SCHEDULE' button to see exactly when we'll be serving today!";
    }
    else if (msg.includes("contact") || msg.includes("call") || msg.includes("phone")) {
        reply = "You can reach us at (256) 652-9028 or email Getloaded256@gmail.com.";
    }
	
	else if (msg.includes("special") || msg.includes("deal") || msg.includes("discount")) {
    reply = `We post our daily specials and "Get Loaded" deals on our Facebook page! 
    <br><br><a href="https://www.facebook.com/getloaded256/" target="_blank" 
    style="color:black; background:var(--neon-yellow); padding:5px 10px; text-decoration:none; font-weight:bold; border-radius:4px; font-size:12px;">
    VIEW TODAY'S SPECIALS</a>`;
}

    // Styled PAYLOAD response
    display.innerHTML += `<div style="text-align:left; margin:10px; font-family: Arial; line-height: 1.4; color: white;">
        <span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black'; display:block; margin-bottom:2px;">PAYLOAD SYSTEM:</span> ${reply}
    </div>`;
    
    inputEl.value = "";
    display.scrollTop = display.scrollHeight;
}

function openContact() {
    alert("Call us at (256) 652-9028 or Email: Getloaded256@gmail.com");
}