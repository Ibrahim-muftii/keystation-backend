import { Request, Response } from "express";
import TwilioNumbers from "../models/twilioNumbers";

export async function getTransferDestinations() {
    try {
        const numbers = await TwilioNumbers.findAll({
            attributes: ["id", "phoneNumber"],
            order: [['id', 'ASC']],
            raw: true
        }) as any[];

        if (!numbers || numbers.length === 0) {
            return null;
        }

        return numbers.map((num: any, index: number) => ({
            type: "number",
            number: num.phoneNumber,
            message: `Connecting you to our support specialist. Please hold.`,
            description: `Support Specialist ${index + 1}`
        }));
    } catch (error) {
        console.error("Error fetching transfer destinations:", error);
        return null;
    }
}

export const updateTransferPriority = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { priority } = req.body;

        const number = await TwilioNumbers.findByPk(id);

        if (!number) {
            return res.status(404).json({
                success: false,
                message: "Transfer number not found"
            });
        }

        await number.update({ priority });

        return res.status(200).json({
            success: true,
            message: "Priority updated successfully",
            number
        });
    } catch (error: any) {
        console.error("Error updating priority:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update priority"
        });
    }
};