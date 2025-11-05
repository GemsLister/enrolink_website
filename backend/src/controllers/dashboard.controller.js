import { getStudentModel } from '../models/Student.js';

export async function stats(req, res, next) {
  try {
    const Student = getStudentModel();
    const total = await Student.countDocuments();
    const interviewed = await Student.countDocuments({ status: { $in: ['INTERVIEWED', 'PASSED', 'FAILED', 'ENROLLED'] } });
    const passed = await Student.countDocuments({ status: 'PASSED' });
    const enrolled = await Student.countDocuments({ status: 'ENROLLED' });
    const awol = await Student.countDocuments({ status: 'AWOL' });
    res.json({ totals: { totalApplicants: total, interviewed, passedInterview: passed, enrolled, awol }, batchAnalytics: [] });
  } catch (e) { next(e); }
}
