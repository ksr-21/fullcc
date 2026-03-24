import CareerRoadmap from '../models/CareerRoadmap.js';
import Mentor from '../models/Mentor.js';

const getRoadmaps = async (req, res) => {
    const roadmaps = await CareerRoadmap.find({});
    res.json(roadmaps);
};

const createRoadmap = async (req, res) => {
    const roadmap = await CareerRoadmap.create(req.body);
    res.status(201).json(roadmap);
};

const getMentors = async (req, res) => {
    const mentors = await Mentor.find({});
    res.json(mentors);
};

const createMentor = async (req, res) => {
    const mentor = await Mentor.create(req.body);
    res.status(201).json(mentor);
};

export { getRoadmaps, createRoadmap, getMentors, createMentor };
