import { Request, Response } from "express";
import User from "../models/user";
import bcrypt from 'bcrypt'
import { Model } from "sequelize";
import jwt from 'jsonwebtoken'

export interface UserPayload {
    id:string,
    firstName:string,
    lastName:string,
    email:string,
} 

export interface UserIT extends Model  {
    id:string,
    firstName:string,
    lastName:string,
    email:string,
    password:string
}

export const login = async  (req:Request, res:Response) => {
    try {
        const body = req.body;
        const user:UserIT | null = await User.findOne({where:{email:body.email}}) as UserIT;
        if(!user) {
            return res.status(404).json({message:'User not found...'})
        } 
        const validPassword:boolean = await bcrypt.compare(body.password, user.password);
        if(!validPassword) {
            return res.status(400).json({message:"Password does not match please try again"});
        }
    
        const payload:any = {
            id:user.id,
            firstName:user.firstName,
            lastName:user.lastName,
            email:user.email,
        };
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET as string, {expiresIn:'1day'});
        payload.accessToken = accessToken
        res.cookie('AccessToken', accessToken, { httpOnly:true, secure:true, sameSite:'lax', maxAge:24 * 60 * 60 * 1000 })
        return res.status(200).json({message:"Logged in successfully", user:payload});
    } catch(error:any) {
        return res.status(500).json({message:error.message});
    }
}

export const register = async (req:Request, res:Response) => {
    try {
        const body = req.body;
        console.log(body);
        const user = await User.findOne({where:{email:body.email}});
        if(user) {
            return res.status(400).json({message:"User with this email already exists"});
        }
        const hashedPassword = await bcrypt.hash(body.password, 16);
        
        body.password = hashedPassword;
        const newUser:UserIT = (await User.create(body) as UserIT).get({plain:true});
        const payload:any = {
            id:newUser.id,
            firstName:newUser.firstName,
            lastName:newUser.lastName,
            email:newUser.email,
        };
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET as string, {expiresIn:'1day'});
        payload.accessToken = accessToken;
        res.cookie('AccessToken', accessToken, { httpOnly:true, secure:true, sameSite:'lax', maxAge:24 * 60 * 60 * 1000 })
        return res.status(200).json({message:"Registered successfully...", user:payload})
    } catch (error:any) {
        return res.status(500).json({message:error.message});
    }
}