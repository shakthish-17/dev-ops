const form = document.querySelector('#student-form');
const message = document.querySelector('#form-message');
const submitButton = form.querySelector('button[type="submit"]');
const tableBody = document.querySelector('#student-table-body');
const count = document.querySelector('#student-count');
const refreshButton = document.querySelector('#refresh-button');
const status = document.querySelector('#system-status');
const dialog = document.querySelector('#success-dialog');
const dialogClose = document.querySelector('#dialog-close');
const dialogCopy = document.querySelector('#success-copy');
const summary = document.querySelector('#saved-student-summary');

function clearErrors() {
  form.querySelectorAll('.invalid').forEach((element) => element.classList.remove('invalid'));
  form.querySelectorAll('[data-error-for]').forEach((element) => {
    element.textContent = '';
  });
}

function showErrors(details = []) {
  for (const detail of details) {
    const input = form.elements.namedItem(detail.field);
    const error = form.querySelector(`[data-error-for="${detail.field}"]`);
    input?.classList.add('invalid');
    if (error) error.textContent = detail.message;
  }
}

function appendCell(row, content, className) {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  if (content instanceof Node) cell.append(content);
  else cell.textContent = content;
  row.append(cell);
}

function renderStudents(students) {
  tableBody.replaceChildren();
  count.textContent = String(students.length);

  if (students.length === 0) {
    const row = document.createElement('tr');
    row.className = 'empty-row';
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = 'No student records yet. Add the first registration.';
    row.append(cell);
    tableBody.append(row);
    return;
  }

  for (const student of students) {
    const row = document.createElement('tr');
    const identity = document.createElement('span');
    const name = document.createElement('span');
    const email = document.createElement('span');
    name.className = 'student-name';
    email.className = 'student-email';
    name.textContent = student.fullName;
    email.textContent = student.email;
    identity.append(name, email);

    const year = document.createElement('span');
    year.className = 'year-pill';
    year.textContent = `Year ${student.year}`;

    appendCell(row, identity);
    appendCell(row, student.studentId);
    appendCell(row, student.department);
    appendCell(row, year);
    tableBody.append(row);
  }
}

async function loadStudents() {
  refreshButton.disabled = true;
  try {
    const response = await fetch('/api/students', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Student records are unavailable.');
    const payload = await response.json();
    renderStudents(payload.students);
  } catch (error) {
    tableBody.innerHTML = `<tr class="empty-row"><td colspan="4">${error.message}</td></tr>`;
  } finally {
    refreshButton.disabled = false;
  }
}

async function checkHealth() {
  try {
    const response = await fetch('/api/health');
    if (!response.ok) throw new Error('offline');
    const health = await response.json();
    status.classList.add('online');
    status.classList.remove('offline');
    status.lastChild.textContent = ` Service online · ${health.database}`;
  } catch {
    status.classList.add('offline');
    status.classList.remove('online');
    status.lastChild.textContent = ' Service unavailable';
  }
}

function showSuccess(student) {
  dialogCopy.textContent = `${student.fullName} has been added to the student database.`;
  summary.replaceChildren();
  const values = [
    ['Student ID', student.studentId],
    ['Department', student.department],
    ['Course', student.course],
    ['Year', String(student.year)]
  ];
  for (const [term, value] of values) {
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = term;
    dd.textContent = value;
    summary.append(dt, dd);
  }
  dialog.showModal();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors();
  message.className = '';
  message.textContent = 'Saving student details…';
  submitButton.disabled = true;

  const payload = Object.fromEntries(new FormData(form).entries());
  payload.year = Number(payload.year);

  try {
    const response = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) {
      showErrors(result.details);
      throw new Error(result.message || 'Student details could not be saved.');
    }

    message.textContent = 'Student saved successfully.';
    showSuccess(result.student);
    form.reset();
    await loadStudents();
  } catch (error) {
    message.className = 'error';
    message.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

refreshButton.addEventListener('click', loadStudents);
dialogClose.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

await Promise.all([checkHealth(), loadStudents()]);
