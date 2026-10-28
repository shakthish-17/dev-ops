export class MemoryStudentRepository {
  constructor() {
    this.students = new Map();
    this.sequence = 0;
  }

  async create(input) {
    if (this.students.has(input.studentId)) {
      const error = new Error('A student with this ID already exists.');
      error.code = 'DUPLICATE_STUDENT';
      throw error;
    }

    this.sequence += 1;
    const now = new Date().toISOString();
    const student = { id: String(this.sequence), ...input, createdAt: now, updatedAt: now };
    this.students.set(student.studentId, student);
    return student;
  }

  async listRecent(limit = 50) {
    return [...this.students.values()]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);
  }

  async clear() {
    this.students.clear();
    this.sequence = 0;
  }
}
