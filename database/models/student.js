import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, default: '', trim: true, maxlength: 20 },
    department: { type: String, required: true, trim: true, maxlength: 100 },
    course: { type: String, required: true, trim: true, maxlength: 120 },
    year: { type: Number, required: true, min: 1, max: 4 }
  },
  {
    collection: 'students',
    timestamps: true,
    versionKey: false
  }
);

studentSchema.index({ createdAt: -1 });

export const Student = mongoose.models.Student ?? mongoose.model('Student', studentSchema);
