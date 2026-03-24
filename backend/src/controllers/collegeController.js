import College from '../models/College.js';
import { transformUpdate } from '../utils/queryHelper.js';

const getCollegeById = async (req, res) => {
    const college = await College.findById(req.params.id);
    if (college) { res.json(college); }
    else { res.status(404); throw new Error('College not found'); }
};

const createCollege = async (req, res) => {
    const { name } = req.body;
    const collegeExists = await College.findOne({ name });
    if (collegeExists) { res.status(400); throw new Error('College already exists'); }
    const college = await College.create({ name, adminUids: [], status: 'pending' });
    res.status(201).json(college);
};

const updateCollege = async (req, res) => {
    const college = await College.findById(req.params.id);
    if (college) {
        const mongoUpdate = transformUpdate(req.body);
        const updatedCollege = await College.findByIdAndUpdate(req.params.id, mongoUpdate, { new: true });
        res.json(updatedCollege);
    } else { res.status(404); throw new Error('College not found'); }
};

const getAllColleges = async (req, res) => {
    const colleges = await College.find({});
    res.json(colleges);
};

export { getCollegeById, createCollege, updateCollege, getAllColleges };
