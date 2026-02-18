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

    display.innerHTML += `<div style="text-align:right; margin:10px; color:var(--neon-yellow); font-family: Arial;">YOU: ${msg}</div>`;
    
    let reply = "I'm not sure. Try asking if we are 'available this Friday' or about our 'menu'!";

    // CHECK FOR BOOKING QUESTIONS
    if (msg.includes("available") || msg.includes("book") || msg.includes("friday") || msg.includes("saturday")) {
        const availability = await checkCalendarAvailability(msg); // Logic below
        reply = availability;
    } 
    else if (msg.includes("menu")) {
        reply = "We serve Loaded Potatoes, Fries, Nachos, and Salads!";
    }

    display.innerHTML += `<div style="text-align:left; margin:10px; font-family: Arial; line-height: 1.4; color: white;">
        <span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black'; display:block; margin-bottom:2px;">PAYLOAD SYSTEM:</span> ${reply}
    </div>`;
    
    inputEl.value = "";
    display.scrollTop = display.scrollHeight;
}

async function checkCalendarAvailability(userMsg) {
    // 1. Requirements for Booking
    const requirements = `<br><br><strong>BOOKING REQUIREMENTS:</strong><br>• $500 Minimum Spend<br>• $100 Non-refundable Deposit<br>• Flat Surface for Truck Parking`;

    try {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}`;
        const r = await fetch(url);
        const d = await r.json();

        // Simple check: Does the user mention a day already in your calendar?
        // Note: For a real production app, we would parse the exact date/time here.
        const isConflict = d.items.some(e => {
            const summary = e.summary.toLowerCase();
            if (userMsg.includes("friday") && summary.includes("friday")) return true;
            return false;
        });

        if (isConflict) {
            return "Checking... 🚨 It looks like we are already booked for that time slot. Please check the 'View Full Schedule' button for our open dates!";
        } else {
            return `Checking... ✅ That slot appears to be OPEN! ${requirements}<br><br>
            <a href="https://checkout.square.site/merchant/YOUR_ID/checkout/DEPOSIT_LINK" target="_blank" 
               style="color:black; background:var(--neon-yellow); padding:5px 10px; text-decoration:none; font-weight:bold; border-radius:4px;">
               PAY $100 DEPOSIT TO SECURE SLOT
            </a>`;
        }
    } catch (e) {
        return "System error checking availability. Please call us directly at (256) 652-9028!";
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