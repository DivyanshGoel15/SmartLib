const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createExam } = require('../controllers/examController');

describe('G. Cross-Portal Regression & Integration Tests', () => {

  test('1. Exam creation rejects unauthenticated callers before processing request data', async () => {
    const examPayload = {
      name: 'Advanced Algorithms Midterm',
      department: 'CSE',
      year: '3rd Year',
      startDate: '2026-11-10',
      endDate: '2026-11-15',
      facultyName: 'Dr. Alan Turing'
    };
    let statusCode = 200;
    let responseData;
    await createExam(
      { body: examPayload },
      {
        status(code) { statusCode = code; return this; },
        json(data) { responseData = data; return this; }
      },
      error => { throw error; }
    );
    assert.equal(statusCode, 401);
    assert.equal(responseData.success, false);
  });

  test('2. HTML files have exactly one footer per page and no duplicate stacked footers', () => {
    const rootDir = path.resolve(__dirname, '../..');
    const pagesToCheck = [
      'home/studentportal/home.html',
      'facultyportal/faculty.html',
      'seats.html',
      'resources/resources.html',
      'reservations/reservations.html'
    ];

    pagesToCheck.forEach(page => {
      const fullPath = path.join(rootDir, page);
      assert.ok(fs.existsSync(fullPath), `File ${page} must exist`);
      const html = fs.readFileSync(fullPath, 'utf8');

      // Count footer elements
      const footerMatches = html.match(/<footer[\s\S]*?<\/footer>/gi) || [];
      assert.equal(footerMatches.length, 1, `Page ${page} must have exactly one <footer> tag, found ${footerMatches.length}`);

      // Verify that the footer has the standard page-footer class
      assert.ok(html.includes('class="page-footer"'), `Page ${page} must include the standard page-footer class`);
    });
  });

  test('3. Student home.css .notice is styled as a distinct dashboard card, not an identical duplicate footer', () => {
    const cssPath = path.resolve(__dirname, '../../home/studentportal/home.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // .notice must not have charcoal background stacked above charcoal page-footer
    assert.ok(css.includes('.notice{margin-top:20px;padding:22px 28px;background:var(--light)'),
      '.notice must be styled as an informational card with light background');
  });

  test('4. Consistent topbar navigation exists on student, faculty, seats, resources, and reservations pages', () => {
    const rootDir = path.resolve(__dirname, '../..');
    const pages = [
      'home/studentportal/home.html',
      'facultyportal/faculty.html',
      'seats.html',
      'resources/resources.html',
      'reservations/reservations.html'
    ];

    pages.forEach(p => {
      const fullPath = path.join(rootDir, p);
      const html = fs.readFileSync(fullPath, 'utf8');
      assert.ok(html.includes('<header class="topbar">'), `${p} must include <header class="topbar">`);
      assert.ok(html.includes('class="user-area"'), `${p} must include user-area in topbar`);
      assert.ok(html.includes('id="logoutBtn"'), `${p} must include logout button`);
    });
  });

  test('5. Reservations page JS renders both seat reservations and resource reservations', () => {
    const jsPath = path.resolve(__dirname, '../../reservations/reservations.js');
    const js = fs.readFileSync(jsPath, 'utf8');

    assert.ok(js.includes('getUserReservedSeats'), 'reservations.js must define getUserReservedSeats');
    assert.ok(js.includes('SEAT RESERVATION'), 'reservations.js must render SEAT RESERVATION cards');
    assert.ok(js.includes('RESOURCE RESERVATION'), 'reservations.js must render RESOURCE RESERVATION cards');
    assert.ok(js.includes('SEAT QUEUE'), 'reservations.js must render SEAT QUEUE cards');
    assert.ok(js.includes('RESOURCE QUEUE'), 'reservations.js must render RESOURCE QUEUE cards');
    assert.ok(js.includes('releaseSeatFromReservations'), 'reservations.js must support seat release');
    assert.ok(js.includes('leaveSeatQueueFromReservations'), 'reservations.js must support leaving seat queue');
  });

  test('6. Admin dashboard JS fetches live resources, reservations, seats, and students from backend API', () => {
    const adminJsPath = path.resolve(__dirname, '../../adminportal/admin.js');
    const js = fs.readFileSync(adminJsPath, 'utf8');

    assert.ok(js.includes('adminFetchResources'), 'admin.js must define adminFetchResources()');
    assert.ok(js.includes('adminFetchReservations'), 'admin.js must define adminFetchReservations()');
    assert.ok(js.includes('adminFetchStudents'), 'admin.js must define adminFetchStudents()');
    assert.ok(js.includes('adminFetchExams'), 'admin.js must define adminFetchExams()');
    assert.ok(js.includes('window.adminSeatsGlobal'), 'admin.js must store live seat data in window.adminSeatsGlobal');

    // Check that all 8 stats are computed and updated in renderStats()
    assert.ok(js.includes('resourceCount.textContent = totalResourceTypes'), 'Updates total resources stat');
    assert.ok(js.includes('availableCount.textContent = totalAvailableCopies'), 'Updates available copies stat');
    assert.ok(js.includes('reservationCount.textContent = totalActiveReservations'), 'Updates active reservations stat');
    assert.ok(js.includes('studentCount.textContent = registeredStudents'), 'Updates registered students stat');
    assert.ok(js.includes('adminTotalSeats'), 'Updates total seats stat');
    assert.ok(js.includes('adminAvailableSeats'), 'Updates available seats stat');
    assert.ok(js.includes('adminOccupiedSeats'), 'Updates occupied seats stat');
    assert.ok(js.includes('adminWaitingStudents'), 'Updates waiting students stat');
  });

  test('7. Synchronized files in backend/public match the workspace frontend files', () => {
    const rootDir = path.resolve(__dirname, '../..');
    const publicDir = path.resolve(__dirname, '../public');

    const criticalFiles = [
      'adminportal/admin.html',
      'adminportal/admin.js',
      'facultyportal/faculty.html',
      'facultyportal/faculty.js',
      'home/studentportal/home.html',
      'home/studentportal/home.js',
      'reservations/reservations.html',
      'reservations/reservations.js',
      'resources/resources.html',
      'resources/resources.js',
      'seats.html'
    ];

    criticalFiles.forEach(f => {
      const rootContent = fs.readFileSync(path.join(rootDir, f), 'utf8');
      const publicContent = fs.readFileSync(path.join(publicDir, f), 'utf8');
      assert.equal(rootContent, publicContent, `backend/public/${f} must match root ${f}`);
    });
  });

  test('8. Exam names and metadata are HTML-escaped in student and faculty portals', () => {
    const rootDir = path.resolve(__dirname, '../..');
    const facultyJs = fs.readFileSync(path.join(rootDir, 'facultyportal/faculty.js'), 'utf8');
    const studentJs = fs.readFileSync(path.join(rootDir, 'home/studentportal/home.js'), 'utf8');

    assert.ok(facultyJs.includes('${escapeHTML(exam.name)}'));
    assert.ok(facultyJs.includes('${escapeHTML(exam.year || "All Years")}'));
    assert.ok(!facultyJs.includes('${exam.name}'));
    assert.ok(studentJs.includes('${escapeHTML(exam.name)}'));
    assert.ok(studentJs.includes('${escapeHTML(exam.department)}'));
    assert.ok(!studentJs.includes('${exam.name}'));
  });

  test('seat-list requests in each portal include the authenticated token headers', () => {
    const rootDir = path.resolve(__dirname, '../..');
    const studentJs = fs.readFileSync(path.join(rootDir, 'home/studentportal/home.js'), 'utf8');
    const reservationsJs = fs.readFileSync(path.join(rootDir, 'reservations/reservations.js'), 'utf8');
    const adminJs = fs.readFileSync(path.join(rootDir, 'adminportal/admin.js'), 'utf8');

    assert.match(studentJs, /fetch\(`\$\{API_BASE_URL\}\/seats`,\s*\{\s*headers:\s*authHeaders/);
    assert.match(reservationsJs, /fetch\(`\$\{API_BASE_URL\}\/seats`,\s*\{\s*headers:\s*getAuthHeaders\(\)/);
    assert.match(adminJs, /fetch\(SEATS_API,\s*\{\s*headers\s*\}\)/);
  });

});
