import FAQ from "../models/faqs.js";

// GET ALL
const getFAQs = async (req, res) => {
    try {

        const faqs = await FAQ.find().sort({
            category: 1,
            question: 1
        });

        return res.status(200).json(faqs);

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            message: "Unable to fetch FAQs."
        });

    }
};


// CREATE
const createFAQ = async (req, res) => {

    try {

        const {
            question,
            answer,
            category
        } = req.body;

        if (!question?.trim() || !answer?.trim() || !category?.trim()) {
            return res.status(400).json({
                message: "Question, Answer and Category are required."
            });
        }

        const exists = await FAQ.findOne({
            question: {
                $regex: `^${question.trim()}$`,
                $options: "i"
            }
        });

        if (exists) {
            return res.status(400).json({
                message: "FAQ already exists."
            });
        }

        const faq = await FAQ.create({
            question: question.trim(),
            answer: answer.trim(),
            category: category.trim()
        });

        return res.status(201).json(faq);

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            message: "Unable to create FAQ."
        });

    }

};


// UPDATE
const updateFAQ = async (req, res) => {

    try {

        const { id } = req.params;

        const {
            question,
            answer,
            category
        } = req.body;

        if (!question?.trim() || !answer?.trim() || !category?.trim()) {
            return res.status(400).json({
                message: "Question, Answer and Category are required."
            });
        }

        const duplicate = await FAQ.findOne({
            _id: { $ne: id },
            question: {
                $regex: `^${question.trim()}$`,
                $options: "i"
            }
        });

        if (duplicate) {
            return res.status(400).json({
                message: "FAQ already exists."
            });
        }

        const updated = await FAQ.findByIdAndUpdate(
            id,
            {
                question: question.trim(),
                answer: answer.trim(),
                category: category.trim()
            },
            {
                new: true
            }
        );

        if (!updated) {
            return res.status(404).json({
                message: "FAQ not found."
            });
        }

        return res.status(200).json(updated);

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            message: "Unable to update FAQ."
        });

    }

};


// DELETE
const deleteFAQ = async (req, res) => {

    try {

        const deleted = await FAQ.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                message: "FAQ not found."
            });
        }

        return res.status(200).json({
            message: "FAQ deleted successfully."
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            message: "Unable to delete FAQ."
        });

    }

};

export {
    getFAQs,
    createFAQ,
    updateFAQ,
    deleteFAQ
};