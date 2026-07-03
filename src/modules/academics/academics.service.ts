import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service';
import { Student, StudentDocument } from '../students/student.schema';
import { Assignment, AssignmentDocument } from './schemas/assignment.schema';
import { Submission, SubmissionDocument } from './schemas/submission.schema';
import { Test, TestDocument } from './schemas/test.schema';
import { TestScore, TestScoreDocument } from './schemas/test-score.schema';
import {
  CreateAssignmentDto,
  CreateTestDto,
  GradeSubmissionDto,
  RecordScoreDto,
  SubmitAssignmentDto,
} from './dto/academics.dto';

@Injectable()
export class AcademicsService {
  constructor(
    @InjectModel(Assignment.name) private readonly assignmentModel: Model<AssignmentDocument>,
    @InjectModel(Submission.name) private readonly submissionModel: Model<SubmissionDocument>,
    @InjectModel(Test.name) private readonly testModel: Model<TestDocument>,
    @InjectModel(TestScore.name) private readonly scoreModel: Model<TestScoreDocument>,
    @InjectModel(Student.name) private readonly studentModel: Model<StudentDocument>,
    private readonly notifications: NotificationsService,
  ) {}

  // ---- Assignments ----

  listAssignments(batchId?: string): Promise<Assignment[]> {
    const q = batchId ? { batchId: new Types.ObjectId(batchId) } : {};
    return this.assignmentModel.find(q).sort({ dueDate: -1 }).lean().exec();
  }

  async createAssignment(createdBy: string, dto: CreateAssignmentDto): Promise<Assignment> {
    return this.assignmentModel.create({
      batchId: new Types.ObjectId(dto.batchId),
      title: dto.title,
      description: dto.description,
      attachmentUrl: dto.attachmentUrl,
      dueDate: new Date(dto.dueDate),
      createdBy: new Types.ObjectId(createdBy),
    });
  }

  /** Student submits work. Upsert so a resubmission replaces the prior file. */
  async submit(assignmentId: string, dto: SubmitAssignmentDto): Promise<Submission> {
    const assignment = await this.assignmentModel.findById(assignmentId);
    if (!assignment) throw new NotFoundException('Assignment not found');

    const submission = await this.submissionModel.findOneAndUpdate(
      {
        assignmentId: assignment._id,
        studentId: new Types.ObjectId(dto.studentId),
      },
      {
        $set: { fileUrl: dto.fileUrl, submittedAt: new Date() },
        $unset: { grade: '', feedback: '' }, // resubmission clears prior grade
      },
      { new: true, upsert: true },
    );
    return submission;
  }

  listSubmissions(assignmentId: string): Promise<Submission[]> {
    return this.submissionModel
      .find({ assignmentId: new Types.ObjectId(assignmentId) })
      .lean()
      .exec();
  }

  /** Teacher grades a submission; notify the student. */
  async grade(submissionId: string, dto: GradeSubmissionDto): Promise<Submission> {
    const submission = await this.submissionModel.findByIdAndUpdate(
      submissionId,
      { grade: dto.grade, feedback: dto.feedback },
      { new: true },
    );
    if (!submission) throw new NotFoundException('Submission not found');

    const student = await this.studentModel.findById(submission.studentId).lean().exec();
    if (student) {
      await this.notifications.notify({
        userId: student.userId,
        type: 'graded',
        title: 'Assignment graded',
        body: `Your submission was graded: ${dto.grade}.`,
        data: { submissionId },
      });
    }
    return submission;
  }

  // ---- Tests & scores ----

  listTests(batchId?: string): Promise<Test[]> {
    const q = batchId ? { batchId: new Types.ObjectId(batchId) } : {};
    return this.testModel.find(q).sort({ date: -1 }).lean().exec();
  }

  createTest(dto: CreateTestDto): Promise<Test> {
    return this.testModel.create({
      batchId: new Types.ObjectId(dto.batchId),
      title: dto.title,
      maxMarks: dto.maxMarks,
      date: new Date(dto.date),
    });
  }

  /** Record/replace a student's score for a test. Validates against maxMarks. */
  async recordScore(testId: string, dto: RecordScoreDto): Promise<TestScore> {
    const test = await this.testModel.findById(testId);
    if (!test) throw new NotFoundException('Test not found');
    if (dto.marks > test.maxMarks) {
      throw new BadRequestException(`marks cannot exceed maxMarks (${test.maxMarks})`);
    }
    return this.scoreModel.findOneAndUpdate(
      { testId: test._id, studentId: new Types.ObjectId(dto.studentId) },
      { marks: dto.marks, remarks: dto.remarks },
      { new: true, upsert: true },
    );
  }

  listScores(testId: string): Promise<TestScore[]> {
    return this.scoreModel
      .find({ testId: new Types.ObjectId(testId) })
      .lean()
      .exec();
  }
}
