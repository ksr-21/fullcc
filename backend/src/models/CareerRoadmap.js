import mongoose from 'mongoose';

const roadmapStepSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    resources: [{
        name: String,
        url: String
    }],
    duration: String
});

const careerRoadmapSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    steps: [roadmapStepSchema],
    avgSalary: String,
    difficulty: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: 'Beginner'
    },
    color: String
}, { timestamps: true });

const CareerRoadmap = mongoose.model('CareerRoadmap', careerRoadmapSchema);
export default CareerRoadmap;
