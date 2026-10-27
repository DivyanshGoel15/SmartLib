const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const app = require('../server');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (server) {
    server.close();
  }
});

describe('G. Cross-Portal Regression & Integration Tests', () => {

  test('1. Exam creation without "time" field validates and processes correctly', async () => {
    // Both Faculty and Admin forms submit exams without a 'time' field.
    const examPayload = {
      name: 'Advanced Algorithms Midterm',
      department: 'CSE',
      year: '3rd Year',
      startDate: '2026-11-10',
      endDate: '2026-11-15',
      facultyName: 'Dr. Alan Turing'
    };

    assert.equal(examPayload.time, undefined, 'Exam payload must not include a time field');

    const res = await fetch(`${baseUrl}/api/exams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': 'smartlib-internal-service-secret-2026'
      },
      body: JSON.stringify(examPayload)
    });

    if (require('mongoose').connection.readyState === 1) {
      assert.ok([200, 201].includes(res.status), `Server should accept exam without time field, got ${res.status}`);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.name, examPayload.name);
      assert.equal(body.data.department, 'CSE');
    } else {
      // Offline fallback status
      assert.equal(res.status, 503);
    }
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

});
