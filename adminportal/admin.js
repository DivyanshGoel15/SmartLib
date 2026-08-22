const currentUser = JSON.parse(sessionStorage.getItem("smartlibCurrentUser") || sessionStorage.getItem("currentUser") || "null");

if (!currentUser || currentUser.role !== "library_admin" || sessionStorage.getItem("smartlibLoggedIn") !== "true") {
    window.location.href = "landingpage/login.html";
}

const departments = ["CSE", "ECE", "Mechanical", "Civil", "Management"];
let exams = JSON.parse(localStorage.getItem("smartlibExams") || "[]");
let users = JSON.parse(localStorage.getItem("smartlibUsers") || "[]");

function saveExams() { localStorage.setItem("smartlibExams", JSON.stringify(exams)); }
function saveUsers() { localStorage.setItem("smartlibUsers", JSON.stringify(users)); }
function getStudents() {
    users = JSON.parse(localStorage.getItem("smartlibUsers") || "[]");
    return users.filter(u => u.role === "student");
}
function formatDate(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"numeric"});
}
function getStatus(exam) {
    const start = new Date(exam.startDate), end = new Date(exam.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Unknown";
    const now = new Date(); now.setHours(0,0,0,0);
    start.setHours(0,0,0,0); end.setHours(23,59,59,999);
    return now < start ? "Upcoming" : now <= end ? "Active" : "Finished";
}
function studentsFor(dept) {
    return getStudents().filter(u => u.department === dept)
        .sort((a,b) => (a.year||"").localeCompare(b.year||"") || (a.name||"").localeCompare(b.name||""));
}
function renderStats() {
    document.getElementById("userCount").textContent = getStudents().length;
    document.getElementById("activeExamCount").textContent = exams.filter(e => getStatus(e) === "Active").length;
    document.getElementById("departmentCount").textContent = departments.length;
}
function renderStreams() {
    document.getElementById("streamGrid").innerHTML = departments.map(d => {
        const list = studentsFor(d);
        const active = exams.filter(e => e.department === d && getStatus(e) === "Active").length;
        return `<article class="stream-card"><div class="stream-top"><span class="stream-code">${d}</span><span class="stream-count">${list.length} students</span></div><div class="stream-meta"><span>ACTIVE EXAMS</span><strong>${active}</strong></div><div class="stream-years">${["1st Year","2nd Year","3rd Year","4th Year"].map(y=>`<span>${y.replace(" Year","")} <b>${list.filter(u=>u.year===y).length}</b></span>`).join("")}</div></article>`;
    }).join("");
}
function renderExams() {
    const body=document.getElementById("examTableBody");
    const sorted=[...exams].sort((a,b)=>(a.department||"").localeCompare(b.department||"") || new Date(a.startDate)-new Date(b.startDate));
    body.innerHTML=sorted.length?sorted.map(e=>{
        const st=getStatus(e);
        return `<tr><td><strong>${e.department}</strong></td><td>${e.year}</td><td>${e.name}</td><td><small>${formatDate(e.startDate)}<br>${formatDate(e.endDate)}</small></td><td><span class="status ${st.toLowerCase()}">${st.toUpperCase()}</span></td><td><div class="actions"><button class="action edit-btn" data-id="${e.id}">Edit</button><button class="action delete-btn" data-id="${e.id}">Delete</button></div></td></tr>`;
    }).join(""):`<tr><td colspan="6">No examinations have been added yet.</td></tr>`;
}
function renderUsers() {
    const list=document.getElementById("userList");
    list.innerHTML=departments.map(d=>{
        const ds=studentsFor(d);
        return `<div class="stream-user-group"><div class="group-heading"><strong>${d}</strong><span>${ds.length} students</span></div>${ds.length?ds.map(u=>`<div class="user-item"><div class="user-main"><strong>${u.name}</strong><small>${u.email}</small><small>${u.year||"Year not specified"}</small></div><button class="remove-student" data-id="${u.id}">Remove</button></div>`).join(""):`<p class="exam-empty">No students registered.</p>`}</div>`;
    }).join("");
}
function openModal(exam=null) {
    document.getElementById("examModal").classList.remove("hidden");
    document.getElementById("modalEyebrow").textContent=exam?"EDIT EXAM":"ADD EXAM";
    document.getElementById("modalTitle").textContent=exam?"Update examination":"Add examination";
    document.getElementById("examId").value=exam?.id||"";
    document.getElementById("examDepartment").value=exam?.department||"";
    document.getElementById("examYear").value=exam?.year||"";
    document.getElementById("examName").value=exam?.name||"";
    document.getElementById("examStart").value=exam?.startDate||"";
    document.getElementById("examEnd").value=exam?.endDate||"";
    document.getElementById("modalError").textContent="";
}
function closeModal(){document.getElementById("examModal").classList.add("hidden");}
function openStudentModal(){document.getElementById("studentModal").classList.remove("hidden");document.getElementById("studentForm").reset();document.getElementById("studentModalError").textContent="";}
function closeStudentModal(){document.getElementById("studentModal").classList.add("hidden");}
function strongPassword(p){return p.length>=8&&/[A-Z]/.test(p)&&/[a-z]/.test(p)&&/\d/.test(p)&&/[^A-Za-z0-9]/.test(p);}

function renderStudentDirectory(){
    const c=document.getElementById("studentDirectory"); if(!c)return;
    const q=(document.getElementById("studentSearch")?.value||"").trim().toLowerCase();
    const d=document.getElementById("studentDepartmentFilter")?.value||"";
    const y=document.getElementById("studentYearFilter")?.value||"";
    const sort=document.getElementById("studentSort")?.value||"nameAsc";
    let list=getStudents().filter(u=>(!q||`${u.name||""} ${u.email||""}`.toLowerCase().includes(q))&&(!d||u.department===d)&&(!y||String(u.year||"").startsWith(y)));
    list.sort((a,b)=>{
        if(sort==="nameDesc")return(b.name||"").localeCompare(a.name||"");
        if(sort==="department")return(a.department||"").localeCompare(b.department||"");
        if(sort==="year")return(a.year||"").localeCompare(b.year||"");
        return(a.name||"").localeCompare(b.name||"");
    });
    c.innerHTML=list.length?list.map(u=>`<div class="student-row"><div><strong>${u.name||"Unnamed"}</strong><span>${u.email||""}</span></div><span>${u.department||"—"}</span><span>${u.year||"—"}</span><button type="button" data-directory-remove="${u.id}">Remove</button></div>`).join(""):`<div class="empty-state">No students match your search or filters.</div>`;
    c.querySelectorAll("[data-directory-remove]").forEach(btn=>btn.addEventListener("click",()=>{
        const id=String(btn.dataset.directoryRemove);
        users=getStudents().filter(u=>String(u.id)!==id);
        saveUsers(); renderStats(); renderStreams(); renderUsers(); renderStudentDirectory();
    }));
}
function populateDepartmentFilter(){
    const select=document.getElementById("studentDepartmentFilter"); if(!select)return;
    select.innerHTML='<option value="">All departments</option>'+departments.map(d=>`<option value="${d}">${d}</option>`).join("");
}
function addActivity(message){
    const log=JSON.parse(localStorage.getItem("smartlibActivity")||"[]");
    log.unshift({message,time:new Date().toISOString()});
    localStorage.setItem("smartlibActivity",JSON.stringify(log.slice(0,20)));
    renderActivity();
}
function renderActivity(){
    const feed=document.getElementById("activityFeed");if(!feed)return;
    const log=JSON.parse(localStorage.getItem("smartlibActivity")||"[]");
    feed.innerHTML=log.length?log.slice(0,10).map(x=>`<div class="activity-item"><span>${new Date(x.time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span><strong>${x.message}</strong></div>`).join(""):`<div class="empty-state">No recent activity.</div>`;
}

document.getElementById("adminName").textContent=currentUser.name||"Library Admin";
document.getElementById("addExamBtn").addEventListener("click",()=>openModal());
document.getElementById("closeModal").addEventListener("click",closeModal);
document.getElementById("examModal").addEventListener("click",e=>{if(e.target.id==="examModal")closeModal();});
document.getElementById("addStudentBtn").addEventListener("click",openStudentModal);
document.getElementById("closeStudentModal").addEventListener("click",closeStudentModal);
document.getElementById("studentModal").addEventListener("click",e=>{if(e.target.id==="studentModal")closeStudentModal();});

document.getElementById("examForm").addEventListener("submit",e=>{
    e.preventDefault();
    const id=document.getElementById("examId").value;
    const exam={id:id?Number(id):Date.now(),department:document.getElementById("examDepartment").value,year:document.getElementById("examYear").value,name:document.getElementById("examName").value.trim(),startDate:document.getElementById("examStart").value,endDate:document.getElementById("examEnd").value};
    const err=document.getElementById("modalError");
    if(!exam.department||!exam.year||!exam.name||!exam.startDate||!exam.endDate){err.textContent="Please complete all fields.";return;}
    if(new Date(exam.endDate)<new Date(exam.startDate)){err.textContent="End date cannot be before start date.";return;}
    if(id)exams=exams.map(x=>x.id===Number(id)?exam:x);else exams.push(exam);
    saveExams();renderExams();renderStats();renderStreams();closeModal();document.getElementById("examMessage").textContent=id?"Exam updated.":"Exam added.";addActivity(id?"Exam updated":"Exam added");
});
document.getElementById("studentForm").addEventListener("submit",e=>{
    e.preventDefault();
    const name=document.getElementById("studentName").value.trim(),email=document.getElementById("studentEmail").value.trim().toLowerCase(),department=document.getElementById("studentDepartment").value,year=document.getElementById("studentYear").value,password=document.getElementById("studentPassword").value,err=document.getElementById("studentModalError");
    if(!name||!department||!year){err.textContent="Please complete all fields.";return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){err.textContent="Enter a valid email address.";return;}
    if(getStudents().some(u=>u.email===email)||users.some(u=>u.email===email)){err.textContent="An account with this email already exists.";return;}
    if(!strongPassword(password)){err.textContent="Password must include 8+ characters, uppercase, lowercase, number and special character.";return;}
    users.push({id:Date.now(),name,email,department,year,role:"student",password,createdAt:new Date().toISOString(),addedBy:currentUser.id});
    saveUsers();renderStats();renderStreams();renderUsers();renderStudentDirectory();closeStudentModal();document.getElementById("examMessage").textContent="Student added.";addActivity("Student added");
});
document.getElementById("examTableBody").addEventListener("click",e=>{
    const id=Number(e.target.dataset.id);if(!id)return;const exam=exams.find(x=>x.id===id);
    if(e.target.classList.contains("edit-btn"))openModal(exam);
    if(e.target.classList.contains("delete-btn")&&confirm(`Delete ${exam.name}?`)){exams=exams.filter(x=>x.id!==id);saveExams();renderExams();renderStats();renderStreams();addActivity("Exam deleted");}
});
document.getElementById("userList").addEventListener("click",e=>{
    const id=Number(e.target.dataset.id);if(!id||!e.target.classList.contains("remove-student"))return;
    const student=getStudents().find(u=>u.id===id);if(!student)return;
    if(confirm(`Remove ${student.name} from SmartLib?`)){users=getStudents().filter(u=>u.id!==id);saveUsers();renderStats();renderStreams();renderUsers();renderStudentDirectory();addActivity("Student removed");}
});
document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("smartlibCurrentUser");
    sessionStorage.removeItem("smartlibLoggedIn");

    window.location.href = "../../landingpage/landingpage.html";
});
["studentSearch","studentDepartmentFilter","studentYearFilter","studentSort"].forEach(id=>{
    document.getElementById(id)?.addEventListener("input",renderStudentDirectory);
    document.getElementById(id)?.addEventListener("change",renderStudentDirectory);
});

populateDepartmentFilter();
renderStats();renderStreams();renderExams();renderUsers();renderStudentDirectory();renderActivity();
