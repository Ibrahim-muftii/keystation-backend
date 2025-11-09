import { Request, Response } from "express";
import path from "path";

export const sendFile = (req:Request,res:Response) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '../assets', filename);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.sendFile(filePath);
    } catch(error:any) {
        return res.status(500).json({message:error.message});
    }
}