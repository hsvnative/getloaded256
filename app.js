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

async function updateLiveStatus() {
    const text = await getTruckLocation();
    document.getElementById('status').innerHTML = text;
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
function handleChat() {
    const inputEl = document.getElementById('user-input');
    const display = document.getElementById('chat-display');
    const msg = inputEl.value.trim().toLowerCase();
    if (!msg) return;

    display.innerHTML += `<div style="text-align:right; margin:10px; color:var(--neon-yellow); font-family: Arial;">YOU: ${msg}</div>`;
    
    let reply = "I'm not sure. Try asking about our 'menu', 'hours', or 'bookings'!";
    
    if (msg.includes("booking") || msg.includes("reserve") || msg.includes("event") || msg.includes("catering")) {
        reply = "To start a booking, please let us know the date, time, and location of your event. You can also use the links below to call us directly!";
    } 
    else if (msg.includes("menu")) {
        reply = "We serve Loaded Potatoes, Fries, Nachos, and Salads!";
    }
    else if (msg.includes("hours") || msg.includes("time")) {
        reply = "Check the 'VIEW FULL SCHEDULE' button for today's serving times!";
    }

    display.innerHTML += `<div style="text-align:left; margin:10px; font-family: Arial; line-height: 1.4; color: white;">
        <span style="color:var(--neon-yellow); font-weight:bold; font-family: 'Arial Black'; display:block; margin-bottom:2px;">PAYLOAD SYSTEM:</span> ${reply}
    </div>`;
    
    inputEl.value = "";
    display.scrollTop = display.scrollHeight;
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