import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import request from 'supertest';
import { createApp } from '../backend/app.js';
import { MemoryStudentRepository } from '../database/repositories/memory-student-repository.js';

const validStudent = {
  studentId: 'STU-2026-001',
  fullName: 'Aarav Sharma',
  email: 'aarav@example.edu',
  phone: '+91 98765 43210',
  department: 'Computer Science',
  course: 'B.Tech Computer Science',
  year: 3
};

describe('Student Registry API', () => {
  let repository;
  let app;

  beforeEach(() => {
    repository = new MemoryStudentRepository();
    app = createApp({ repository, databaseMode: 'memory' });
  });

  test('serves the frontend', async () => {
    const response = await request(app).get('/');
    assert.equal(response.status, 200);
    assert.match(response.text, /Student Registry/);
  });

  test('reports application and database health', async () => {
    const response = await request(app).get('/api/health');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { status: 'UP', database: 'memory' });
  });

  test('validates required student details', async () => {
    const response = await request(app).post('/api/students').send({ fullName: 'A' });
    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'VALIDATION_ERROR');
    assert.ok(response.body.details.length > 0);
  });

  test('accepts only course years 1 through 4', async () => {
    const response = await request(app).post('/api/students').send({ ...validStudent, year: 5 });
    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'VALIDATION_ERROR');
    assert.ok(response.body.details.some((detail) => detail.field === 'year'));
  });

  test('stores and lists a valid student', async () => {
    const created = await request(app).post('/api/students').send(validStudent);
    assert.equal(created.status, 201);
    assert.equal(created.body.student.studentId, validStudent.studentId);

    const listed = await request(app).get('/api/students');
    assert.equal(listed.status, 200);
    assert.equal(listed.body.students.length, 1);
    assert.equal(listed.body.students[0].email, validStudent.email);
  });

  test('prevents duplicate student IDs', async () => {
    await request(app).post('/api/students').send(validStudent);
    const duplicate = await request(app).post('/api/students').send(validStudent);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error, 'DUPLICATE_STUDENT');
  });
});
