const CONFIG = {
    API_KEY: 'REPLACED_BY_GITHUB_ACTION', 
    CAL_ID: 'aee6168afa0d10e2d826bf94cca06f6ceb5226e6e42ccaf903b285aa403c4aad@group.calendar.google.com'
};

window.onload = () => { updateLiveStatus(); };

async function getTruckLocation() {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
        const url = `https://www.googleapis.com/calendar/v3/calendars/${CONFIG.CAL_ID}/events?timeMin=${startOfDay}&singleEvents=true&orderBy=startTime&key=${CONFIG.API_KEY}`;
        
        const r = await fetch(url);
        const d = await r.json();
        
        if (d.items && d.items.length > 0) {
            const liveEvent = d.items.find(e => {
                const s = new Date(e.start.dateTime || e.start.date);
                const n = new Date(e.end.dateTime || e.end.date);
                return now >= s && now <= n;
            });

            if (liveEvent) {
                return `STATUS: 🟢 LIVE<br><strong>${liveEvent.summary}</strong><br>${liveEvent.location || ""}`;
            }

            const nextEvent = d.items.find(e => {
                const s = new Date(e.start.dateTime || e.start.date);
                return s > now;
            });

            if (nextEvent) {
                const s = new Date(nextEvent.start.dateTime || nextEvent.start.date);
                return `STATUS: 🏠 AT KITCHEN<br><strong>Next Stop:</strong> ${nextEvent.summary}<br>Arrival: ${s.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            }
        }
        return `STATUS: 🏠 AT KITCHEN<br>Preparing for the next run.`;
    } catch (e) {
        return `STATUS: 🏠 AT KITCHEN`;
    }
}

async function updateLiveStatus() {
    const statusText = await getTruckLocation();
    document.getElementById('status').innerHTML = statusText;
}

function toggleChat() { document.getElementById('chat-box').classList.toggle('chat-hidden'); }
function openContact() { alert("Contact us at (256) 652-9028 or Getloaded256@gmail.com"); }