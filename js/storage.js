const SEATS_KEY = "smartlib_seats";


function saveSeats(seats) {

    localStorage.setItem(
        SEATS_KEY,
        JSON.stringify(seats)
    );

}


function getStoredSeats() {

    const storedSeats =
        localStorage.getItem(SEATS_KEY);


    if (storedSeats) {

        return JSON.parse(storedSeats);

    }


    return null;
}