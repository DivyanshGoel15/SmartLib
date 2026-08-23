/* =========================================================
   SMARTLIB - STUDENT HOME
   ========================================================= */


/* =========================================================
   CURRENT USER
   ========================================================= */

const currentUser =
    JSON.parse(
        sessionStorage.getItem("smartlibCurrentUser") ||
        sessionStorage.getItem("currentUser") ||
        "null"
    );


/* =========================================================
   LOGIN CHECK
   ========================================================= */

const isLoggedIn =
    sessionStorage.getItem("smartlibLoggedIn") === "true" ||
    sessionStorage.getItem("currentUser") !== null ||
    sessionStorage.getItem("smartlibCurrentUser") !== null;


if (
    !currentUser ||
    !isLoggedIn
) {

    window.location.href =
        "../landingpage/login.html";

}


/* =========================================================
   DATA
   ========================================================= */

const users =
    JSON.parse(
        localStorage.getItem(
            "smartlibUsers"
        ) || "[]"
    );


const exams =
    JSON.parse(
        localStorage.getItem(
            "smartlibExams"
        ) || "[]"
    );


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const userName =
    document.getElementById(
        "userName"
    );


const welcomeName =
    document.getElementById(
        "welcomeName"
    );


const profileName =
    document.getElementById(
        "profileName"
    );


const profileDetails =
    document.getElementById(
        "profileDetails"
    );


const profileInitial =
    document.getElementById(
        "profileInitial"
    );


const departmentValue =
    document.getElementById(
        "departmentValue"
    );


const yearValue =
    document.getElementById(
        "yearValue"
    );


const reservationCount =
    document.getElementById(
        "reservationCount"
    );


/* =========================================================
   DISPLAY USER
   ========================================================= */

userName.textContent =
    currentUser.name;


welcomeName.textContent =
    currentUser.name.split(
        " "
    )[0];


profileName.textContent =
    currentUser.name;


profileDetails.textContent =
    `${currentUser.department} · ${currentUser.year}`;


profileInitial.textContent =
    currentUser.name
        .charAt(0)
        .toUpperCase();


departmentValue.textContent =
    currentUser.department;


yearValue.textContent =
    currentUser.year;


/* =========================================================
   RESERVATIONS
   ========================================================= */

function countReservations() {

    const possibleKeys = [

        "smartlibReservations",

        "reservations",

        "libraryReservations"

    ];


    for (
        const key of possibleKeys
    ) {

        const data =
            JSON.parse(
                localStorage.getItem(
                    key
                ) || "null"
            );


        if (
            Array.isArray(data)
        ) {

            return data.filter(
                item =>

                    item.userId ===
                    currentUser.id ||

                    item.email ===
                    currentUser.email

            ).length;

        }

    }


    return 0;

}


reservationCount.textContent =
    countReservations();


/* =========================================================
   DATE
   ========================================================= */

function parseDate(
    value
) {

    const date =
        new Date(value);


    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;

}


/* =========================================================
   STUDENT EXAMS
   ========================================================= */

function getStudentExams() {

    return exams.filter(
        exam => {

            const departmentMatches =
                exam.department ===
                currentUser.department;


            const yearMatches =
                exam.year ===
                currentUser.year;


            return (
                departmentMatches &&
                yearMatches
            );

        }
    );

}


/* =========================================================
   CURRENT EXAMS
   ========================================================= */

function getCurrentExams() {

    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    return getStudentExams()
        .filter(
            exam => {

                const start =
                    parseDate(
                        exam.startDate
                    );


                const end =
                    parseDate(
                        exam.endDate
                    );


                if (
                    !start ||
                    !end
                ) {

                    return false;

                }


                start.setHours(
                    0,
                    0,
                    0,
                    0
                );


                end.setHours(
                    23,
                    59,
                    59,
                    999
                );


                return (
                    today >= start &&
                    today <= end
                );

            }
        );

}


/* =========================================================
   UPCOMING EXAMS
   ========================================================= */

function getUpcomingExams() {

    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    return getStudentExams()
        .filter(
            exam => {

                const start =
                    parseDate(
                        exam.startDate
                    );


                if (!start) {

                    return false;

                }


                start.setHours(
                    0,
                    0,
                    0,
                    0
                );


                return (
                    start >
                    today
                );

            }
        )
        .sort(
            (a, b) =>
                new Date(
                    a.startDate
                ) -
                new Date(
                    b.startDate
                )
        );

}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(
    value
) {

    const date =
        parseDate(value);


    return date
        ? date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        )
        : "—";

}


/* =========================================================
   EXAM STATUS
   ========================================================= */

function renderExamStatus() {

    const activeExams =
        getCurrentExams();


    const upcomingExams =
        getUpcomingExams();


    const badge =
        document.getElementById(
            "examBadge"
        );


    const content =
        document.getElementById(
            "examContent"
        );


    if (
        activeExams.length >
        0
    ) {

        badge.textContent =
            "EXAM PRIORITY ACTIVE";


        badge.className =
            "status-badge active";


        const activeHTML =
            activeExams
                .map(
                    exam => `
                        <div class="exam-row">

                            <div>

                                <strong>
                                    ${exam.name}
                                </strong>

                                <br>

                                <small>
                                    ${exam.department}
                                    ·
                                    ${exam.year}
                                </small>

                            </div>

                            <small>
                                ${formatDate(
                                    exam.startDate
                                )}
                                —
                                ${formatDate(
                                    exam.endDate
                                )}
                            </small>

                        </div>
                    `
                )
                .join("");


        const upcomingHTML =
            upcomingExams.length >
            0
                ? `
                    <div
                        style="margin-top: 22px;"
                    >

                        <p
                            class="eyebrow"
                            style="margin-bottom: 8px;"
                        >
                            UPCOMING EXAMS
                        </p>

                        ${
                            upcomingExams
                                .map(
                                    exam => `
                                        <div class="exam-row">

                                            <div>

                                                <strong>
                                                    ${exam.name}
                                                </strong>

                                                <br>

                                                <small>
                                                    ${exam.department}
                                                    ·
                                                    ${exam.year}
                                                </small>

                                            </div>

                                            <small>
                                                ${formatDate(
                                                    exam.startDate
                                                )}
                                                —
                                                ${formatDate(
                                                    exam.endDate
                                                )}
                                            </small>

                                        </div>
                                    `
                                )
                                .join("")
                        }

                    </div>
                `
                : "";


        content.innerHTML =
            activeHTML +
            upcomingHTML;


        return;

    }


    if (
        upcomingExams.length >
        0
    ) {

        badge.textContent =
            "UPCOMING";


        badge.className =
            "status-badge normal";


        content.innerHTML = `

            <div>

                <p
                    class="exam-empty"
                    style="margin-bottom: 12px;"
                >
                    No active examination currently.
                    Your upcoming examination schedule
                    is shown below.
                </p>


                ${
                    upcomingExams
                        .map(
                            exam => `
                                <div class="exam-row">

                                    <div>

                                        <strong>
                                            ${exam.name}
                                        </strong>

                                        <br>

                                        <small>
                                            ${exam.department}
                                            ·
                                            ${exam.year}
                                        </small>

                                    </div>

                                    <small>
                                        ${formatDate(
                                            exam.startDate
                                        )}
                                        —
                                        ${formatDate(
                                            exam.endDate
                                        )}
                                    </small>

                                </div>
                            `
                        )
                        .join("")
                }

            </div>

        `;


        return;

    }


    badge.textContent =
        "NORMAL";


    badge.className =
        "status-badge normal";


    content.innerHTML = `

        <p class="exam-empty">

            No active or upcoming examination
            has been recorded for

            ${currentUser.department}
            ${currentUser.year}.

            Your reservation requests will use
            the standard priority rules.

        </p>

    `;

}


/* =========================================================
   STUDENT EXTRAS
   ========================================================= */

function renderStudentExtras() {

    const u =
        JSON.parse(
            sessionStorage.getItem(
                "smartlibCurrentUser"
            ) ||
            sessionStorage.getItem(
                "currentUser"
            ) ||
            "null"
        );


    if (!u) {

        return;

    }


    const getElement =
        id =>
            document.getElementById(
                id
            );


    if (
        getElement(
            "profileName"
        )
    ) {

        getElement(
            "profileName"
        ).textContent =
            u.name ||
            "—";

    }


    if (
        getElement(
            "profileDepartment"
        )
    ) {

        getElement(
            "profileDepartment"
        ).textContent =
            u.department ||
            "—";

    }


    if (
        getElement(
            "profileYear"
        )
    ) {

        getElement(
            "profileYear"
        ).textContent =
            u.year
                ? u.year +
                  " Year"
                : "—";

    }


    /* =====================================================
       EXAM COUNTDOWN
       ===================================================== */

    const studentExams =
        JSON.parse(
            localStorage.getItem(
                "smartlibExams"
            ) || "[]"
        )
        .filter(
            exam =>
                exam.department ===
                u.department &&
                exam.year ===
                u.year
        );


    const now =
        new Date();


    const active =
        studentExams.find(
            exam => {

                const start =
                    new Date(
                        exam.startDate ||
                        exam.start
                    );


                const end =
                    new Date(
                        exam.endDate ||
                        exam.end
                    );


                return (
                    now >= start &&
                    now <= end
                );

            }
        );


    const next =
        studentExams
            .filter(
                exam => {

                    const start =
                        new Date(
                            exam.startDate ||
                            exam.start
                        );


                    return (
                        start >
                        now
                    );

                }
            )
            .sort(
                (a, b) =>
                    new Date(
                        a.startDate ||
                        a.start
                    ) -
                    new Date(
                        b.startDate ||
                        b.start
                    )
            )[0];


    if (
        getElement(
            "examCountdown"
        )
    ) {

        getElement(
            "examCountdown"
        ).innerHTML =
            active
                ? `
                    <strong>
                        ${active.name ||
                        "Examination"}
                    </strong>

                    <span>
                        Active now
                    </span>
                `
                : next
                    ? `
                        <strong>
                            ${next.name ||
                            "Upcoming examination"}
                        </strong>

                        <span>
                            Starts
                            ${
                                next.startDate ||
                                next.start
                            }
                        </span>
                    `
                    : `
                        <strong>
                            No upcoming exams
                        </strong>

                        <span>
                            Your department has
                            no scheduled examinations.
                        </span>
                    `;

    }


    /* =====================================================
       RESERVATION INFORMATION
       ===================================================== */

    const reservations =
        JSON.parse(
            localStorage.getItem(
                "smartlibReservations"
            ) ||
            localStorage.getItem(
                "libraryReservations"
            ) ||
            "[]"
        )
        .filter(
            reservation =>
                reservation.userId ===
                    u.id ||
                reservation.email ===
                    u.email
        );


    if (
        getElement(
            "activeReservations"
        )
    ) {

        getElement(
            "activeReservations"
        ).textContent =
            reservations.filter(
                reservation =>
                    (
                        reservation.status ||
                        "active"
                    ) ===
                    "active"
            ).length;

    }


    const queuedReservation =
        reservations.find(
            reservation =>
                reservation.status ===
                "queued"
        );


    if (
        getElement(
            "queuePosition"
        )
    ) {

        getElement(
            "queuePosition"
        ).textContent =
            queuedReservation?.position ??
            "—";

    }


    if (
        getElement(
            "nextReservation"
        )
    ) {

        getElement(
            "nextReservation"
        ).textContent =
            reservations[0]?.resourceName ||
            reservations[0]?.seatName ||
            "None";

    }

}


/* =========================================================
   LOGOUT
   ========================================================= */

const logoutButton =
    document.getElementById(
        "logoutBtn"
    );


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        () => {

            sessionStorage.removeItem(
                "smartlibCurrentUser"
            );

            sessionStorage.removeItem(
                "currentUser"
            );

            sessionStorage.removeItem(
                "smartlibLoggedIn"
            );


            window.location.href =
                "../landingpage/login.html";

        }
    );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

renderExamStatus();

renderStudentExtras();