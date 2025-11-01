import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken'
import { UserPayload } from "../controller/authenticate.controller";

export const verifyToken = (req:Request, res:Response, next:NextFunction) => {
    try {
        const headers = req.headers.authorization;
        if(!headers) {
            return res.status(403).json({message:"You are not allowed to access the app, login to continue"});
        }
        const token = headers.split(" ")[1];
        if(!token) {
            return res.status(401).json({message:'You are not authorized to perfrom this action'})
        }
        const validateToken =  jwt.verify(token, process.env.JWT_SECRET as string);
        if(validateToken) {
            const decodeToken = jwt.decode(token) as UserPayload;
            req.CurrentUser = decodeToken;
            next();
        } else {
            return res.status(401).json({message:'You are not authorized to perfrom this action'})
        }
    } catch (error:any) {
        console.log(error);
        return res.status(500).json({message:error.mesasge});
    }   
}   