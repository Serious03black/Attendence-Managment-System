import { Course, Batch } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createCourse = asyncHandler(async (req, res) => {
  const { name, code, description, durationWeeks, category, fee, syllabus } = req.body;

  const existing = await Course.findOne({ code: code.toUpperCase() });
  if (existing) throw ApiError.conflict('A course with this code already exists.');

  const course = await Course.create({
    name,
    code,
    description,
    durationWeeks,
    category,
    fee,
    syllabus,
    createdBy: req.user._id,
  });

  return res.status(201).json(new ApiResponse(201, course, 'Course created.'));
});

export const getCourses = asyncHandler(async (req, res) => {
  const { category, isActive, search } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { code: new RegExp(search, 'i') }];

  const courses = await Course.find(filter).sort({ name: 1 });
  return res.status(200).json(new ApiResponse(200, courses, 'Courses fetched.'));
});

export const getCourseById = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found.');
  return res.status(200).json(new ApiResponse(200, course, 'Course fetched.'));
});

export const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found.');

  const editable = ['name', 'description', 'durationWeeks', 'category', 'fee', 'isActive'];
  editable.forEach((f) => {
    if (req.body[f] !== undefined) course[f] = req.body[f];
  });
  await course.save();

  return res.status(200).json(new ApiResponse(200, course, 'Course updated.'));
});

/** Add or update syllabus topics (drives the syllabusCompletionPercent virtual). */
export const updateSyllabus = asyncHandler(async (req, res) => {
  const { syllabus } = req.body; // full replacement array: [{ title, isCompleted, order }]
  const course = await Course.findByIdAndUpdate(req.params.id, { syllabus }, { new: true, runValidators: true });
  if (!course) throw ApiError.notFound('Course not found.');
  return res.status(200).json(new ApiResponse(200, course, 'Syllabus updated.'));
});

/** FACULTY: mark a specific syllabus topic complete for a course, from within their batch view. */
export const markTopicComplete = asyncHandler(async (req, res) => {
  const { topicId } = req.body;
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found.');

  const topic = course.syllabus.id(topicId);
  if (!topic) throw ApiError.notFound('Syllabus topic not found.');
  topic.isCompleted = true;
  await course.save();

  return res.status(200).json(new ApiResponse(200, course, 'Topic marked complete.'));
});

export const deleteCourse = asyncHandler(async (req, res) => {
  const activeBatchCount = await Batch.countDocuments({ course: req.params.id, status: { $in: ['upcoming', 'active'] } });
  if (activeBatchCount > 0) {
    throw ApiError.conflict(`Cannot delete a course with ${activeBatchCount} active/upcoming batch(es).`);
  }
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) throw ApiError.notFound('Course not found.');
  return res.status(200).json(new ApiResponse(200, null, 'Course deleted.'));
});
