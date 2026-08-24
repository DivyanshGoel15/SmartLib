/* =========================================================
   SMARTLIB - LIBRARY ADMIN
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
    currentUser.role !== "library_admin" ||
    !isLoggedIn
) {

    window.location.href =
        "../landingpage/login.html";

}


/* =========================================================
   DATA
   ========================================================= */

const departments = [
    "CSE",
    "ECE",
    "Mechanical",
    "Civil",
    "Management"
];


let exams =
    JSON.parse(
        localStorage.getItem(
            "smartlibExams"
        ) || "[]"
    );


let users =
    JSON.parse(
        localStorage.getItem(
            "smartlibUsers"
        ) || "[]"
    );


/* =========================================================
   STORAGE
   ========================================================= */

function saveExams() {

    localStorage.setItem(
        "smartlibExams",
        JSON.stringify(exams)
    );

}


function saveUsers() {

    localStorage.setItem(
        "smartlibUsers",
        JSON.stringify(users)
    );

}


function getStudents() {

    users =
        JSON.parse(
            localStorage.getItem(
                "smartlibUsers"
            ) || "[]"
        );


    return users.filter(
        u => u.role === "student"
    );

}


/* =========================================================
   DATE FUNCTIONS
   ========================================================= */

function formatDate(value) {

    const d =
        new Date(value);


    return Number.isNaN(
        d.getTime()
    )
        ? "—"
        : d.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

}


function getStatus(exam) {

    const start =
        new Date(
            exam.startDate
        );


    const end =
        new Date(
            exam.endDate
        );


    if (
        Number.isNaN(
            start.getTime()
        ) ||
        Number.isNaN(
            end.getTime()
        )
    ) {

        return "Unknown";

    }


    const now =
        new Date();


    now.setHours(
        0,
        0,
        0,
        0
    );


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


    return now < start
        ? "Upcoming"
        : now <= end
            ? "Active"
            : "Finished";

}


/* =========================================================
   STUDENTS
   ========================================================= */

function studentsFor(
    department
) {

    return getStudents()
        .filter(
            u =>
                u.department ===
                department
        )
        .sort(
            (a, b) =>
                (a.year || "")
                    .localeCompare(
                        b.year || ""
                    ) ||
                (a.name || "")
                    .localeCompare(
                        b.name || ""
                    )
        );

}


/* =========================================================
   STATS
   ========================================================= */

function renderStats() {

    document.getElementById(
        "userCount"
    ).textContent =
        getStudents().length;


    document.getElementById(
        "activeExamCount"
    ).textContent =
        exams.filter(
            e =>
                getStatus(e) ===
                "Active"
        ).length;


    document.getElementById(
        "departmentCount"
    ).textContent =
        departments.length;

}


/* =========================================================
   DEPARTMENT STREAMS
   ========================================================= */

function renderStreams() {

    document.getElementById(
        "streamGrid"
    ).innerHTML =
        departments
            .map(
                d => {

                    const list =
                        studentsFor(d);


                    const active =
                        exams.filter(
                            e =>
                                e.department === d &&
                                getStatus(e) === "Active"
                        ).length;


                    return `
                        <article class="stream-card">

                            <div class="stream-top">

                                <span class="stream-code">
                                    ${d}
                                </span>

                                <span class="stream-count">
                                    ${list.length} students
                                </span>

                            </div>


                            <div class="stream-meta">

                                <span>
                                    ACTIVE EXAMS
                                </span>

                                <strong>
                                    ${active}
                                </strong>

                            </div>


                            <div class="stream-years">

                                ${
                                    [
                                        "1st Year",
                                        "2nd Year",
                                        "3rd Year",
                                        "4th Year"
                                    ]
                                    .map(
                                        y => `
                                            <span>
                                                ${y.replace(
                                                    " Year",
                                                    ""
                                                )}
                                                <b>
                                                    ${
                                                        list.filter(
                                                            u =>
                                                                u.year === y
                                                        ).length
                                                    }
                                                </b>
                                            </span>
                                        `
                                    )
                                    .join("")
                                }

                            </div>

                        </article>
                    `;

                }
            )
            .join("");

}


/* =========================================================
   EXAMS
   ========================================================= */

function renderExams() {

    const body =
        document.getElementById(
            "examTableBody"
        );


    const sorted =
        [...exams].sort(
            (a, b) =>
                (a.department || "")
                    .localeCompare(
                        b.department || ""
                    ) ||
                new Date(a.startDate) -
                new Date(b.startDate)
        );


    body.innerHTML =
        sorted.length
            ? sorted
                .map(
                    e => {

                        const status =
                            getStatus(e);


                        return `
                            <tr>

                                <td>
                                    <strong>
                                        ${e.department}
                                    </strong>
                                </td>

                                <td>
                                    ${e.year}
                                </td>

                                <td>
                                    ${e.name}
                                </td>

                                <td>
                                    <small>
                                        ${formatDate(
                                            e.startDate
                                        )}
                                        <br>
                                        ${formatDate(
                                            e.endDate
                                        )}
                                    </small>
                                </td>

                                <td>

                                    <span
                                        class="status ${status.toLowerCase()}"
                                    >
                                        ${status.toUpperCase()}
                                    </span>

                                </td>

                                <td>

                                    <div class="actions">

                                        <button
                                            class="action edit-btn"
                                            data-id="${e.id}"
                                        >
                                            Edit
                                        </button>

                                        <button
                                            class="action delete-btn"
                                            data-id="${e.id}"
                                        >
                                            Delete
                                        </button>

                                    </div>

                                </td>

                            </tr>
                        `;

                    }
                )
                .join("")
            : `
                <tr>
                    <td colspan="6">
                        No examinations have been added yet.
                    </td>
                </tr>
            `;

}


/* =========================================================
   USERS
   ========================================================= */

function renderUsers() {

    const list =
        document.getElementById(
            "userList"
        );


    list.innerHTML =
        departments
            .map(
                d => {

                    const ds =
                        studentsFor(d);


                    return `
                        <div class="stream-user-group">

                            <div class="group-heading">

                                <strong>
                                    ${d}
                                </strong>

                                <span>
                                    ${ds.length} students
                                </span>

                            </div>


                            ${
                                ds.length
                                    ? ds
                                        .map(
                                            u => `
                                                <div class="user-item">

                                                    <div class="user-main">

                                                        <strong>
                                                            ${u.name}
                                                        </strong>

                                                        <small>
                                                            ${u.email}
                                                        </small>

                                                        <small>
                                                            ${
                                                                u.year ||
                                                                "Year not specified"
                                                            }
                                                        </small>

                                                    </div>


                                                    <button
                                                        class="remove-student"
                                                        data-id="${u.id}"
                                                    >
                                                        Remove
                                                    </button>

                                                </div>
                                            `
                                        )
                                        .join("")
                                    : `
                                        <p class="exam-empty">
                                            No students registered.
                                        </p>
                                    `
                            }

                        </div>
                    `;

                }
            )
            .join("");

}


/* =========================================================
   EXAM MODAL
   ========================================================= */

function openModal(
    exam = null
) {

    document.getElementById(
        "examModal"
    ).classList.remove(
        "hidden"
    );


    document.getElementById(
        "modalEyebrow"
    ).textContent =
        exam
            ? "EDIT EXAM"
            : "ADD EXAM";


    document.getElementById(
        "modalTitle"
    ).textContent =
        exam
            ? "Update examination"
            : "Add examination";


    document.getElementById(
        "examId"
    ).value =
        exam?.id || "";


    document.getElementById(
        "examDepartment"
    ).value =
        exam?.department || "";


    document.getElementById(
        "examYear"
    ).value =
        exam?.year || "";


    document.getElementById(
        "examName"
    ).value =
        exam?.name || "";


    document.getElementById(
        "examStart"
    ).value =
        exam?.startDate || "";


    document.getElementById(
        "examEnd"
    ).value =
        exam?.endDate || "";


    document.getElementById(
        "modalError"
    ).textContent =
        "";

}


function closeModal() {

    document.getElementById(
        "examModal"
    ).classList.add(
        "hidden"
    );

}


/* =========================================================
   STUDENT MODAL
   ========================================================= */

function openStudentModal() {

    document.getElementById(
        "studentModal"
    ).classList.remove(
        "hidden"
    );


    document.getElementById(
        "studentForm"
    ).reset();


    document.getElementById(
        "studentModalError"
    ).textContent =
        "";

}


function closeStudentModal() {

    document.getElementById(
        "studentModal"
    ).classList.add(
        "hidden"
    );

}


function strongPassword(
    password
) {

    return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    );

}


/* =========================================================
   STUDENT DIRECTORY
   ========================================================= */

function renderStudentDirectory() {

    const container =
        document.getElementById(
            "studentDirectory"
        );


    if (!container) {

        return;

    }


    const q =
        (
            document.getElementById(
                "studentSearch"
            )?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const department =
        document.getElementById(
            "studentDepartmentFilter"
        )?.value ||
        "";


    const year =
        document.getElementById(
            "studentYearFilter"
        )?.value ||
        "";


    const sort =
        document.getElementById(
            "studentSort"
        )?.value ||
        "nameAsc";


    let list =
        getStudents().filter(
            u =>
                (
                    !q ||
                    `${u.name || ""} ${u.email || ""}`
                        .toLowerCase()
                        .includes(q)
                ) &&
                (
                    !department ||
                    u.department === department
                ) &&
                (
                    !year ||
                    String(
                        u.year || ""
                    ).startsWith(year)
                )
        );


    list.sort(
        (a, b) => {

            if (
                sort ===
                "nameDesc"
            ) {

                return (
                    b.name || ""
                ).localeCompare(
                    a.name || ""
                );

            }


            if (
                sort ===
                "department"
            ) {

                return (
                    a.department || ""
                ).localeCompare(
                    b.department || ""
                );

            }


            if (
                sort ===
                "year"
            ) {

                return (
                    a.year || ""
                ).localeCompare(
                    b.year || ""
                );

            }


            return (
                a.name || ""
            ).localeCompare(
                b.name || ""
            );

        }
    );


    container.innerHTML =
        list.length
            ? list
                .map(
                    u => `
                        <div class="student-row">

                            <div>

                                <strong>
                                    ${u.name || "Unnamed"}
                                </strong>

                                <span>
                                    ${u.email || ""}
                                </span>

                            </div>

                            <span>
                                ${u.department || "—"}
                            </span>

                            <span>
                                ${u.year || "—"}
                            </span>

                            <button
                                type="button"
                                data-directory-remove="${u.id}"
                            >
                                Remove
                            </button>

                        </div>
                    `
                )
                .join("")
            : `
                <div class="empty-state">
                    No students match your search or filters.
                </div>
            `;


    container
        .querySelectorAll(
            "[data-directory-remove]"
        )
        .forEach(
            btn => {

                btn.addEventListener(
                    "click",
                    () => {

                        const id =
                            String(
                                btn.dataset
                                    .directoryRemove
                            );


                        users =
                            getStudents()
                                .filter(
                                    u =>
                                        String(
                                            u.id
                                        ) !== id
                                );


                        saveUsers();

                        renderStats();

                        renderStreams();

                        renderUsers();

                        renderStudentDirectory();

                    }
                );

            }
        );

}


/* =========================================================
   DEPARTMENT FILTER
   ========================================================= */

function populateDepartmentFilter() {

    const select =
        document.getElementById(
            "studentDepartmentFilter"
        );


    if (!select) {

        return;

    }


    select.innerHTML =
        '<option value="">All departments</option>' +
        departments
            .map(
                d =>
                    `<option value="${d}">${d}</option>`
            )
            .join("");

}


/* =========================================================
   ACTIVITY
   ========================================================= */

function addActivity(
    messageText
) {

    const log =
        JSON.parse(
            localStorage.getItem(
                "smartlibActivity"
            ) || "[]"
        );


    log.unshift(
        {
            message:
                messageText,

            time:
                new Date().toISOString()
        }
    );


    localStorage.setItem(
        "smartlibActivity",
        JSON.stringify(
            log.slice(
                0,
                20
            )
        )
    );


    renderActivity();

}


function renderActivity() {

    const feed =
        document.getElementById(
            "activityFeed"
        );


    if (!feed) {

        return;

    }


    const log =
        JSON.parse(
            localStorage.getItem(
                "smartlibActivity"
            ) || "[]"
        );


    feed.innerHTML =
        log.length
            ? log
                .slice(
                    0,
                    10
                )
                .map(
                    x =>
                        `
                        <div class="activity-item">

                            <span>
                                ${
                                    new Date(
                                        x.time
                                    ).toLocaleTimeString(
                                        [],
                                        {
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        }
                                    )
                                }
                            </span>

                            <strong>
                                ${x.message}
                            </strong>

                        </div>
                        `
                )
                .join("")
            : `
                <div class="empty-state">
                    No recent activity.
                </div>
            `;

}


/* =========================================================
   ADMIN NAME
   ========================================================= */

document.getElementById(
    "adminName"
).textContent =
    currentUser.name ||
    "Library Admin";


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

document.getElementById(
    "addExamBtn"
).addEventListener(
    "click",
    () => openModal()
);


document.getElementById(
    "closeModal"
).addEventListener(
    "click",
    closeModal
);


document.getElementById(
    "examModal"
).addEventListener(
    "click",
    event => {

        if (
            event.target.id ===
            "examModal"
        ) {

            closeModal();

        }

    }
);


document.getElementById(
    "addStudentBtn"
).addEventListener(
    "click",
    openStudentModal
);


document.getElementById(
    "closeStudentModal"
).addEventListener(
    "click",
    closeStudentModal
);


document.getElementById(
    "studentModal"
).addEventListener(
    "click",
    event => {

        if (
            event.target.id ===
            "studentModal"
        ) {

            closeStudentModal();

        }

    }
);


/* =========================================================
   EXAM FORM
   ========================================================= */

document.getElementById(
    "examForm"
).addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const id =
            document.getElementById(
                "examId"
            ).value;


        const exam = {

            id:
                id
                    ? Number(id)
                    : Date.now(),

            department:
                document.getElementById(
                    "examDepartment"
                ).value,

            year:
                document.getElementById(
                    "examYear"
                ).value,

            name:
                document.getElementById(
                    "examName"
                ).value
                    .trim(),

            startDate:
                document.getElementById(
                    "examStart"
                ).value,

            endDate:
                document.getElementById(
                    "examEnd"
                ).value

        };


        const error =
            document.getElementById(
                "modalError"
            );


        if (
            !exam.department ||
            !exam.year ||
            !exam.name ||
            !exam.startDate ||
            !exam.endDate
        ) {

            error.textContent =
                "Please complete all fields.";

            return;

        }


        if (
            new Date(
                exam.endDate
            ) <
            new Date(
                exam.startDate
            )
        ) {

            error.textContent =
                "End date cannot be before start date.";

            return;

        }


        if (id) {

            exams =
                exams.map(
                    x =>
                        x.id === Number(id)
                            ? exam
                            : x
                );

        } else {

            exams.push(
                exam
            );

        }


        saveExams();

        renderExams();

        renderStats();

        renderStreams();

        closeModal();


        document.getElementById(
            "examMessage"
        ).textContent =
            id
                ? "Exam updated."
                : "Exam added.";


        addActivity(
            id
                ? "Exam updated"
                : "Exam added"
        );

    }
);


/* =========================================================
   STUDENT FORM
   ========================================================= */

document.getElementById(
    "studentForm"
).addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const name =
            document.getElementById(
                "studentName"
            ).value.trim();


        const email =
            document.getElementById(
                "studentEmail"
            ).value
                .trim()
                .toLowerCase();


        const department =
            document.getElementById(
                "studentDepartment"
            ).value;


        const year =
            document.getElementById(
                "studentYear"
            ).value;


        const password =
            document.getElementById(
                "studentPassword"
            ).value;


        const error =
            document.getElementById(
                "studentModalError"
            );


        if (
            !name ||
            !department ||
            !year
        ) {

            error.textContent =
                "Please complete all fields.";

            return;

        }


        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(email)
        ) {

            error.textContent =
                "Enter a valid email address.";

            return;

        }


        if (
            getStudents().some(
                u =>
                    u.email ===
                    email
            ) ||
            users.some(
                u =>
                    u.email ===
                    email
            )
        ) {

            error.textContent =
                "An account with this email already exists.";

            return;

        }


        if (
            !strongPassword(
                password
            )
        ) {

            error.textContent =
                "Password must include 8+ characters, uppercase, lowercase, number and special character.";

            return;

        }


        users.push({

            id:
                Date.now(),

            name,

            email,

            department,

            year,

            role:
                "student",

            password,

            createdAt:
                new Date().toISOString(),

            addedBy:
                currentUser.id

        });


        saveUsers();

        renderStats();

        renderStreams();

        renderUsers();

        renderStudentDirectory();

        closeStudentModal();


        document.getElementById(
            "examMessage"
        ).textContent =
            "Student added.";


        addActivity(
            "Student added"
        );

    }
);


/* =========================================================
   EXAM TABLE ACTIONS
   ========================================================= */

document.getElementById(
    "examTableBody"
).addEventListener(
    "click",
    event => {

        const id =
            Number(
                event.target.dataset.id
            );


        if (!id) {

            return;

        }


        const exam =
            exams.find(
                x =>
                    x.id === id
            );


        if (
            event.target.classList
                .contains(
                    "edit-btn"
                )
        ) {

            openModal(
                exam
            );

        }


        if (
            event.target.classList
                .contains(
                    "delete-btn"
                )
        ) {

            if (
                confirm(
                    `Delete ${exam.name}?`
                )
            ) {

                exams =
                    exams.filter(
                        x =>
                            x.id !== id
                    );


                saveExams();

                renderExams();

                renderStats();

                renderStreams();

                addActivity(
                    "Exam deleted"
                );

            }

        }

    }
);


/* =========================================================
   STUDENT REMOVE
   ========================================================= */

document.getElementById(
    "userList"
).addEventListener(
    "click",
    event => {

        const id =
            Number(
                event.target.dataset.id
            );


        if (
            !id ||
            !event.target.classList
                .contains(
                    "remove-student"
                )
        ) {

            return;

        }


        const student =
            getStudents().find(
                u =>
                    u.id === id
            );


        if (!student) {

            return;

        }


        if (
            confirm(
                `Remove ${student.name} from SmartLib?`
            )
        ) {

            users =
                getStudents()
                    .filter(
                        u =>
                            u.id !== id
                    );


            saveUsers();

            renderStats();

            renderStreams();

            renderUsers();

            renderStudentDirectory();

            addActivity(
                "Student removed"
            );

        }

    }
);


/* =========================================================
   LOGOUT
   ========================================================= */

document.getElementById(
    "logoutBtn"
).addEventListener(
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


/* =========================================================
   DIRECTORY FILTERS
   ========================================================= */

[
    "studentSearch",
    "studentDepartmentFilter",
    "studentYearFilter",
    "studentSort"
]
.forEach(
    id => {

        document.getElementById(
            id
        )?.addEventListener(
            "input",
            renderStudentDirectory
        );


        document.getElementById(
            id
        )?.addEventListener(
            "change",
            renderStudentDirectory
        );

    }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

populateDepartmentFilter();

renderStats();

renderStreams();

renderExams();

renderUsers();

renderStudentDirectory();

renderActivity();