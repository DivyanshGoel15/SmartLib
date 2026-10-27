
const SEATS_API = (window.SMARTLIB_CONFIG && window.SMARTLIB_CONFIG.API_BASE_URL)
    ? `${window.SMARTLIB_CONFIG.API_BASE_URL}/seats`
    : "https://smartlib-sjya.onrender.com/api/seats";

// Fetch seats from MongoDB through the backend API.
async function getStoredSeats(department) {
    const url = department
        ? `${SEATS_API}/${encodeURIComponent(department)}`
        : SEATS_API;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to load seats: HTTP ${response.status}`);
    }

    return await response.json();
}

// Update an individual seat through the backend API.
async function saveSeats(seats) {
    console.warn(
        "saveSeats() is no longer supported for bulk updates. " +
        "Use the appropriate seat API endpoint instead.",
        seats
    );
}
