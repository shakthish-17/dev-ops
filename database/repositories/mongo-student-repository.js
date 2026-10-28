import { Student } from '../models/student.js';

function serialize(document) {
  return {
    id: document._id.toString(),
    studentId: document.studentId,
    fullName: document.fullName,
    email: document.email,
    phone: document.phone,
    department: document.department,
    course: document.course,
    year: document.year,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  };
}

export class MongoStudentRepository {
  async create(input) {
    try {
      const student = await Student.create(input);
      return serialize(student);
    } catch (error) {
      if (error?.code === 11000) {
        const duplicateError = new Error('A student with this ID already exists.');
        duplicateError.code = 'DUPLICATE_STUDENT';
        throw duplicateError;
      }
      throw error;
    }
  }

  async listRecent(limit = 50) {
    const students = await Student.find().sort({ createdAt: -1 }).limit(limit).lean();
    return students.map((student) => ({
      id: student._id.toString(),
      studentId: student.studentId,
      fullName: student.fullName,
      email: student.email,
      phone: student.phone,
      department: student.department,
      course: student.course,
      year: student.year,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString()
    }));
  }
}
