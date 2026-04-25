import { prisma } from "../config/db.js";

const createLocation = async (req, res) => {
    const { name, latitude, longitude, address} = req.body;

    // Check if location already exists
    const existingLocation = await prisma.location.findUnique({
        where: {
            name: name
        },
    });

    if (existingLocation) {
        return res
            .status(400)
            .json({ error: "Location with the same name already exists." });
    }

    // Create the location
    const buildData = {
        name,
        latitude,
        longitude,
    };

    if (address) {
        buildData.address = address;
    }
    const location = await prisma.location.create({
        data: buildData,
    });

    res.status(201).json({
        status: "success",
        data: {
            location,
        },
    });
};

const getLocations = async (req, res) => {
    const locations = await prisma.location.findMany();

    res.status(200).json({
        status: "success",
        data: {
            locations,
        },
    });
};

const getLocationById = async (req, res) => {
    const location = await prisma.location.findUnique({
        where: { id: req.params.id },
        include: {
            reports: true,
            summaries: true,
        },
    });

    if (!location) {
        return res
            .status(404)
            .json({ error: "Location not found" });
    }

    res.status(200).json({
        status: "success",
        data: {
            location,
        },
    });
};

export { createLocation, getLocations, getLocationById };