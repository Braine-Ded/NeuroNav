import { da } from "zod/locales";
import { prisma } from "../config/db.js";


const getUserReports = async (req, res) => {
    const reports = await prisma.report.findMany({
        where: { userId: req.user.id },
    });

    res.status(200).json({
        status: "success",
        data: {
            reports,
        }
    });
};

const getLocationReports = async (req, res) => {

    // verify location exists
    const location = await prisma.location.findUnique({
        where: { id: req.params.locationId },
    });

    if (!location) {
        return res
            .status(404)
            .json({ error: "Location not found" });
    }

    // get all reports for the location
    const reports = await prisma.report.findMany({
        where: { locationId: req.params.locationId },
    });

    res.status(200).json({
        status: "success",
        data: {
            name: location.name,
            reports,
        }
    });
};

const addReport = async (req, res) => {
    const { userId, locationId, sound, lighting, crowd, scent } = req.body;
    let { note } = req.body;

    if (note === "" || note === undefined || note === null){ 
        note = "";
    }
    // verify location exists
    const location = await prisma.location.findUnique({
        where: { id: locationId },
    });

    if (!location) {
        return res
            .status(404)
            .json({ error: "Location not found" });
    }

    const report = await prisma.report.create({
        data: {
            userId,
            locationId,
            sound,
            lighting,
            crowd,
            scent,
            note
        }
    });

    res.status(201).json({
        status: "success",
        data: {
            report,
        }
    });
};

const removeReport = async (req, res) => {
    // find report and verify ownership
    const report = await prisma.report.findUnique({
        where: { id: req.params.id },
    });

    if (!report) {
        return res
            .status(404)
            .json({ error: "Report not found" });
    }

    // ensure only owner can delete
    if (report.userId !== req.user.id) {
        return res
            .status(403)
            .json({ error: "Unauthorized to delete this report" });
    }

    // delete any dependent validations first because schema.prisma uses RESTRICT for ReportValidation.report relation
    await prisma.reportValidation.deleteMany({
        where: { reportId: req.params.id },
    });

    await prisma.report.delete({
        where: { id: req.params.id },
    });

    res.status(200).json({
        status: "success",
        message: "Report deleted successfully",
    });

};

const updateReport = async (req, res) => {
    const { sound, lighting, crowd, scent, note } = req.body;

    // verify report exists
    const report = await prisma.report.findUnique({
        where: { id: req.params.id },
    });

    if (!report) {
        return res
            .status(404)
            .json({ error: "Report not found" });
    }

    // ensure only owner can update
    if (report.userId !== req.user.id) {
        return res
            .status(403)
            .json({ error: "Unauthorized to update this report" });
    }

    // Build update data object
    const updateData = {};
    if (sound !== undefined) updateData.sound = sound;
    if (lighting !== undefined) updateData.lighting = lighting;
    if (crowd !== undefined) updateData.crowd = crowd;
    if (scent !== undefined) updateData.scent = scent;
    if (note !== undefined) updateData.note = note;

    //update the report
    const updatedReport = await prisma.report.update({
        where: { id: req.params.id },
        data: updateData,
    });

    res.status(200).json({
        status: "success",
        data: {
            report: updatedReport,
        }
    });
};

const validateReport = async (req, res) => {
    const reportId = req.params.id;
    const userId = req.user.id;

    // verify report exists
    const report = await prisma.report.findUnique({
        where: { id: reportId },
    });

    if (!report) {
        return res
            .status(404)
            .json({ error: "Report not found" });
    }

    

    // ensure user exists
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user) {
        return res
            .status(404)
            .json({ error: "User not found" });
    }

    // ensure user has not already validated this report
    const existingValidation = await prisma.reportValidation.findUnique({
        where: {
            userId_reportId: {
                userId,
                reportId,
            },
        },
    });

    if (existingValidation) {
        return res
            .status(400)
            .json({ error: "User has already validated this report" });
    }

    // create validation
    const validation = await prisma.reportValidation.create({
        data: {
            reportId,
            userId,
        },
    });

    res.status(200).json({
        status: "success",
        data: {
            validation,
        },
        message: "Report validated successfully",
    });
};

const getReportValidations = async (req, res) => {
    const reportId = req.params.id;

    const report = await prisma.report.findUnique({
        where: { id: reportId },
        select: {
            id: true,
            _count: {
                select: { validations: true },
            },
            validations: {
                select: {
                    id: true,
                    userId: true,
                    createdAt: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            },
        },
    });

    if (!report) {
        return res
            .status(404)
            .json({ error: "Report not found" });
    }

    res.status(200).json({
        status: "success",
        data: {
            reportId: report.id,
            validationCount: report._count.validations,
            validations: report.validations,
        },
    });
};

export { getUserReports, getLocationReports, addReport, removeReport, updateReport, validateReport, getReportValidations };